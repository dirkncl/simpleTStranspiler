import {
  assign,
  clear,
  closeFileWatcherOf,
  computeLineAndCharacterOfPosition,
  computeLineStarts,
  computePositionOfLineAndCharacter,
  contains,
  createTextSpanFromBounds,
  Debug,
  directorySeparator,
  emptyOptions,
  FileWatcherEventKind,
  forEach,
  getBaseFileName,
  getDefaultFormatCodeSettings,
  getLineInfo,
  getScriptKindFromFileName,
  getSnapshotText,
  hasTSFileExtension,
  isString,
  missingFileModifiedTime,
  orderedRemoveItem,
  ScriptKind,
  ScriptSnapshot,
  some,
} from "./namespaces/ts.js";

import {
  Errors,
  isBackgroundProject,
  isConfiguredProject,
  isExternalProject,
  isInferredProject,
  isProjectDeferredClose,
  maxFileSize,
  ScriptVersionCache,
} from "./namespaces/ts.server.js";

/** @internal */
export class TextStorage {
    constructor(host, info, initialVersion) {
        this.host = host;
        this.info = info;
        /**
         * True if the text is for the file thats open in the editor
         */
        this.isOpen = false;
        /**
         * True if the text present is the text from the file on the disk
         */
        this.ownFileText = false;
        /**
         * True when reloading contents of file from the disk is pending
         */
        this.pendingReloadFromDisk = false;
        this.version = initialVersion || 0;
    }
    getVersion() {
        return this.svc
            ? `SVC-${this.version}-${this.svc.getSnapshotVersion()}`
            : `Text-${this.version}`;
    }
    hasScriptVersionCache_TestOnly() {
        return this.svc !== undefined;
    }
    resetSourceMapInfo() {
        this.info.sourceFileLike = undefined;
        this.info.closeSourceMapFileWatcher();
        this.info.sourceMapFilePath = undefined;
        this.info.declarationInfoPath = undefined;
        this.info.sourceInfos = undefined;
        this.info.documentPositionMapper = undefined;
    }
    /** Public for testing */
    useText(newText) {
        this.svc = undefined;
        this.text = newText;
        this.textSnapshot = undefined;
        this.lineMap = undefined;
        this.fileSize = undefined;
        this.resetSourceMapInfo();
        this.version++;
    }
    edit(start, end, newText) {
        this.switchToScriptVersionCache().edit(start, end - start, newText);
        this.ownFileText = false;
        this.text = undefined;
        this.textSnapshot = undefined;
        this.lineMap = undefined;
        this.fileSize = undefined;
        this.resetSourceMapInfo();
    }
    /**
     * Set the contents as newText
     * returns true if text changed
     */
    reload(newText) {
        Debug.assert(newText !== undefined);
        // Reload always has fresh content
        this.pendingReloadFromDisk = false;
        // If text changed set the text
        // This also ensures that if we had switched to version cache,
        // we are switching back to text.
        // The change to version cache will happen when needed
        // Thus avoiding the computation if there are no changes
        if (!this.text && this.svc) {
            // Ensure we have text representing current state
            this.text = getSnapshotText(this.svc.getSnapshot());
        }
        if (this.text !== newText) {
            // Update the text
            this.useText(newText);
            // We cant guarantee new text is own file text
            this.ownFileText = false;
            return true;
        }
        return false;
    }
    /**
     * Reads the contents from tempFile(if supplied) or own file and sets it as contents
     * returns true if text changed
     */
    reloadWithFileText(tempFileName) {
        const { text: newText, fileSize } = tempFileName || !this.info.isDynamicOrHasMixedContent() ?
            this.getFileTextAndSize(tempFileName) :
            { text: "", fileSize: undefined };
        const reloaded = this.reload(newText);
        this.fileSize = fileSize; // NB: after reload since reload clears it
        this.ownFileText = !tempFileName || tempFileName === this.info.fileName;
        // In case we update this text before mTime gets updated to present file modified time
        // because its schedule to do that later, update the mTime so we dont re-update the text
        // Eg. with npm ci where file gets created and editor calls say get error request before
        // the timeout to update the file stamps in node_modules is run
        // Test:: watching npm install in codespaces where workspaces folder is hosted at root
        if (this.ownFileText && this.info.mTime === missingFileModifiedTime.getTime()) {
            this.info.mTime = (this.host.getModifiedTime(this.info.fileName) || missingFileModifiedTime).getTime();
        }
        return reloaded;
    }
    /**
     * Schedule reload from the disk if its not already scheduled and its not own text
     * returns true when scheduling reload
     */
    scheduleReloadIfNeeded() {
        return !this.pendingReloadFromDisk && !this.ownFileText ?
            this.pendingReloadFromDisk = true :
            false;
    }
    delayReloadFromFileIntoText() {
        this.pendingReloadFromDisk = true;
    }
    /**
     * For telemetry purposes, we would like to be able to report the size of the file.
     * However, we do not want telemetry to require extra file I/O so we report a size
     * that may be stale (e.g. may not reflect change made on disk since the last reload).
     * NB: Will read from disk if the file contents have never been loaded because
     * telemetry falsely indicating size 0 would be counter-productive.
     */
    getTelemetryFileSize() {
        return !!this.fileSize
            ? this.fileSize
            : !!this.text // Check text before svc because its length is cheaper
                ? this.text.length // Could be wrong if this.pendingReloadFromDisk
                : !!this.svc
                    ? this.svc.getSnapshot().getLength() // Could be wrong if this.pendingReloadFromDisk
                    : this.getSnapshot().getLength(); // Should be strictly correct
    }
    getSnapshot() {
        var _a, _b;
        return ((_a = this.tryUseScriptVersionCache()) === null || _a === void 0 ? void 0 : _a.getSnapshot()) ||
            ((_b = this.textSnapshot) !== null && _b !== void 0 ? _b : (this.textSnapshot = ScriptSnapshot.fromString(Debug.checkDefined(this.text))));
    }
    getAbsolutePositionAndLineText(oneBasedLine) {
        const svc = this.tryUseScriptVersionCache();
        if (svc)
            return svc.getAbsolutePositionAndLineText(oneBasedLine);
        const lineMap = this.getLineMap();
        return oneBasedLine <= lineMap.length ?
            {
                absolutePosition: lineMap[oneBasedLine - 1],
                lineText: this.text.substring(lineMap[oneBasedLine - 1], lineMap[oneBasedLine]),
            } :
            {
                absolutePosition: this.text.length,
                lineText: undefined,
            };
    }
    /**
     *  @param line 0 based index
     */
    lineToTextSpan(line) {
        const svc = this.tryUseScriptVersionCache();
        if (svc)
            return svc.lineToTextSpan(line);
        const lineMap = this.getLineMap();
        const start = lineMap[line]; // -1 since line is 1-based
        const end = line + 1 < lineMap.length ? lineMap[line + 1] : this.text.length;
        return createTextSpanFromBounds(start, end);
    }
    /**
     * @param line 1 based index
     * @param offset 1 based index
     */
    lineOffsetToPosition(line, offset, allowEdits) {
        const svc = this.tryUseScriptVersionCache();
        return svc ?
            svc.lineOffsetToPosition(line, offset) :
            computePositionOfLineAndCharacter(this.getLineMap(), line - 1, offset - 1, this.text, allowEdits);
    }
    positionToLineOffset(position) {
        const svc = this.tryUseScriptVersionCache();
        if (svc)
            return svc.positionToLineOffset(position);
        const { line, character } = computeLineAndCharacterOfPosition(this.getLineMap(), position);
        return { line: line + 1, offset: character + 1 };
    }
    getFileTextAndSize(tempFileName) {
        let text;
        const fileName = tempFileName || this.info.fileName;
        const getText = () => text === undefined ? (text = this.host.readFile(fileName) || "") : text;
        // Only non typescript files have size limitation
        if (!hasTSFileExtension(this.info.fileName)) {
            const fileSize = this.host.getFileSize ? this.host.getFileSize(fileName) : getText().length;
            if (fileSize > maxFileSize) {
                Debug.assert(!!this.info.containingProjects.length);
                const service = this.info.containingProjects[0].projectService;
                service.logger.info(`Skipped loading contents of large file ${fileName} for info ${this.info.fileName}: fileSize: ${fileSize}`);
                this.info.containingProjects[0].projectService.sendLargeFileReferencedEvent(fileName, fileSize);
                return { text: "", fileSize };
            }
        }
        return { text: getText() };
    }
    /** @internal */
    switchToScriptVersionCache() {
        if (!this.svc || this.pendingReloadFromDisk) {
            this.svc = ScriptVersionCache.fromString(this.getOrLoadText());
            this.textSnapshot = undefined;
            this.version++;
        }
        return this.svc;
    }
    tryUseScriptVersionCache() {
        if (!this.svc || this.pendingReloadFromDisk) {
            // Ensure updated text
            this.getOrLoadText();
        }
        // If this is open script, use the cache
        if (this.isOpen) {
            if (!this.svc && !this.textSnapshot) {
                this.svc = ScriptVersionCache.fromString(Debug.checkDefined(this.text));
                this.textSnapshot = undefined;
            }
            return this.svc;
        }
        // At this point if svc is present it's valid
        return this.svc;
    }
    getOrLoadText() {
        if (this.text === undefined || this.pendingReloadFromDisk) {
            Debug.assert(!this.svc || this.pendingReloadFromDisk, "ScriptVersionCache should not be set when reloading from disk");
            this.reloadWithFileText();
        }
        return this.text;
    }
    getLineMap() {
        Debug.assert(!this.svc, "ScriptVersionCache should not be set");
        return this.lineMap || (this.lineMap = computeLineStarts(Debug.checkDefined(this.text)));
    }
    getLineInfo() {
        const svc = this.tryUseScriptVersionCache();
        if (svc) {
            return {
                getLineCount: () => svc.getLineCount(),
                getLineText: line => svc.getAbsolutePositionAndLineText(line + 1).lineText,
            };
        }
        const lineMap = this.getLineMap();
        return getLineInfo(this.text, lineMap);
    }
}
export function isDynamicFileName(fileName) {
    return fileName[0] === "^" ||
        ((fileName.includes("walkThroughSnippet:/") || fileName.includes("untitled:/")) &&
            getBaseFileName(fileName)[0] === "^") ||
        (fileName.includes(":^") && !fileName.includes(directorySeparator));
}
export class ScriptInfo {
    constructor(host, fileName, scriptKind, hasMixedContent, path, initialVersion) {
        this.host = host;
        this.fileName = fileName;
        this.scriptKind = scriptKind;
        this.hasMixedContent = hasMixedContent;
        this.path = path;
        /**
         * All projects that include this file
         */
        this.containingProjects = [];
        this.isDynamic = isDynamicFileName(fileName);
        this.textStorage = new TextStorage(host, this, initialVersion);
        if (hasMixedContent || this.isDynamic) {
            this.realpath = this.path;
        }
        this.scriptKind = scriptKind
            ? scriptKind
            : getScriptKindFromFileName(fileName);
    }
    /** @internal */
    isDynamicOrHasMixedContent() {
        return this.hasMixedContent || this.isDynamic;
    }
    isScriptOpen() {
        return this.textStorage.isOpen;
    }
    open(newText) {
        this.textStorage.isOpen = true;
        if (newText !== undefined &&
            this.textStorage.reload(newText)) {
            // reload new contents only if the existing contents changed
            this.markContainingProjectsAsDirty();
        }
    }
    close(fileExists = true) {
        this.textStorage.isOpen = false;
        if (fileExists && this.textStorage.scheduleReloadIfNeeded()) {
            this.markContainingProjectsAsDirty();
        }
    }
    getSnapshot() {
        return this.textStorage.getSnapshot();
    }
    ensureRealPath() {
        if (this.realpath === undefined) {
            // Default is just the path
            this.realpath = this.path;
            if (this.host.realpath) {
                Debug.assert(!!this.containingProjects.length);
                const project = this.containingProjects[0];
                const realpath = this.host.realpath(this.path);
                if (realpath) {
                    this.realpath = project.toPath(realpath);
                    // If it is different from this.path, add to the map
                    if (this.realpath !== this.path) {
                        project.projectService.realpathToScriptInfos.add(this.realpath, this); // TODO: GH#18217
                    }
                }
            }
        }
    }
    /** @internal */
    getRealpathIfDifferent() {
        return this.realpath && this.realpath !== this.path ? this.realpath : undefined;
    }
    /**
     * @internal
     * Does not compute realpath; uses precomputed result. Use `ensureRealPath`
     * first if a definite result is needed.
     */
    isSymlink() {
        return this.realpath && this.realpath !== this.path;
    }
    getFormatCodeSettings() {
        return this.formatSettings;
    }
    getPreferences() {
        return this.preferences;
    }
    attachToProject(project) {
        const isNew = !this.isAttached(project);
        if (isNew) {
            this.containingProjects.push(project);
            if (!project.getCompilerOptions().preserveSymlinks) {
                this.ensureRealPath();
            }
            project.onFileAddedOrRemoved(this.isSymlink());
        }
        return isNew;
    }
    isAttached(project) {
        // unrolled for common cases
        switch (this.containingProjects.length) {
            case 0:
                return false;
            case 1:
                return this.containingProjects[0] === project;
            case 2:
                return this.containingProjects[0] === project || this.containingProjects[1] === project;
            default:
                return contains(this.containingProjects, project);
        }
    }
    detachFromProject(project) {
        // unrolled for common cases
        switch (this.containingProjects.length) {
            case 0:
                return;
            case 1:
                if (this.containingProjects[0] === project) {
                    project.onFileAddedOrRemoved(this.isSymlink());
                    this.containingProjects.pop();
                }
                break;
            case 2:
                if (this.containingProjects[0] === project) {
                    project.onFileAddedOrRemoved(this.isSymlink());
                    this.containingProjects[0] = this.containingProjects.pop();
                }
                else if (this.containingProjects[1] === project) {
                    project.onFileAddedOrRemoved(this.isSymlink());
                    this.containingProjects.pop();
                }
                break;
            default:
                // We use first configured project as default so we shouldnt change the order of the containing projects
                if (orderedRemoveItem(this.containingProjects, project)) {
                    project.onFileAddedOrRemoved(this.isSymlink());
                }
                break;
        }
    }
    detachAllProjects() {
        for (const p of this.containingProjects) {
            if (isConfiguredProject(p)) {
                p.getCachedDirectoryStructureHost().addOrDeleteFile(this.fileName, this.path, FileWatcherEventKind.Deleted);
            }
            const existingRoot = p.getRootFilesMap().get(this.path);
            // detach is unnecessary since we'll clean the list of containing projects anyways
            p.removeFile(this, /*fileExists*/ false, /*detachFromProject*/ false);
            p.onFileAddedOrRemoved(this.isSymlink());
            // If the info was for the external or configured project's root,
            // add missing file as the root
            if (existingRoot && !isInferredProject(p)) {
                p.addMissingFileRoot(existingRoot.fileName);
            }
        }
        clear(this.containingProjects);
    }
    getDefaultProject() {
        var _a;
        switch (this.containingProjects.length) {
            case 0:
                return Errors.ThrowNoProject();
            case 1:
                return isProjectDeferredClose(this.containingProjects[0]) || isBackgroundProject(this.containingProjects[0]) ?
                    Errors.ThrowNoProject() :
                    this.containingProjects[0];
            default:
                // If this file belongs to multiple projects, below is the order in which default project is used
                // - first external project
                // - for open script info, its default configured project during opening is default if info is part of it
                // - first configured project of which script info is not a source of project reference redirect
                // - first configured project
                // - first inferred project
                let firstConfiguredProject;
                let firstInferredProject;
                let firstNonSourceOfProjectReferenceRedirect;
                let defaultConfiguredProject;
                for (let index = 0; index < this.containingProjects.length; index++) {
                    const project = this.containingProjects[index];
                    if (isConfiguredProject(project)) {
                        if (project.deferredClose)
                            continue;
                        if (!project.isSourceOfProjectReferenceRedirect(this.fileName)) {
                            // If we havent found default configuredProject and
                            // its not the last one, find it and use that one if there
                            if (defaultConfiguredProject === undefined &&
                                index !== this.containingProjects.length - 1) {
                                defaultConfiguredProject = project.projectService.findDefaultConfiguredProject(this) || false;
                            }
                            if (defaultConfiguredProject === project)
                                return project;
                            if (!firstNonSourceOfProjectReferenceRedirect)
                                firstNonSourceOfProjectReferenceRedirect = project;
                        }
                        if (!firstConfiguredProject)
                            firstConfiguredProject = project;
                    }
                    else if (isExternalProject(project)) {
                        return project;
                    }
                    else if (!firstInferredProject && isInferredProject(project)) {
                        firstInferredProject = project;
                    }
                }
                return (_a = (defaultConfiguredProject ||
                    firstNonSourceOfProjectReferenceRedirect ||
                    firstConfiguredProject ||
                    firstInferredProject)) !== null && _a !== void 0 ? _a : Errors.ThrowNoProject();
        }
    }
    registerFileUpdate() {
        for (const p of this.containingProjects) {
            p.registerFileUpdate(this.path);
        }
    }
    setOptions(formatSettings, preferences) {
        if (formatSettings) {
            if (!this.formatSettings) {
                this.formatSettings = getDefaultFormatCodeSettings(this.host.newLine);
                assign(this.formatSettings, formatSettings);
            }
            else {
                this.formatSettings = Object.assign(Object.assign({}, this.formatSettings), formatSettings);
            }
        }
        if (preferences) {
            if (!this.preferences) {
                this.preferences = emptyOptions;
            }
            this.preferences = Object.assign(Object.assign({}, this.preferences), preferences);
        }
    }
    getLatestVersion() {
        // Ensure we have updated snapshot to give back latest version
        this.textStorage.getSnapshot();
        return this.textStorage.getVersion();
    }
    saveTo(fileName) {
        this.host.writeFile(fileName, getSnapshotText(this.textStorage.getSnapshot()));
    }
    /** @internal */
    delayReloadNonMixedContentFile() {
        Debug.assert(!this.isDynamicOrHasMixedContent());
        this.textStorage.delayReloadFromFileIntoText();
        this.markContainingProjectsAsDirty();
    }
    reloadFromFile(tempFileName) {
        if (this.textStorage.reloadWithFileText(tempFileName)) {
            this.markContainingProjectsAsDirty();
            return true;
        }
        return false;
    }
    editContent(start, end, newText) {
        this.textStorage.edit(start, end, newText);
        this.markContainingProjectsAsDirty();
    }
    markContainingProjectsAsDirty() {
        for (const p of this.containingProjects) {
            p.markFileAsDirty(this.path);
        }
    }
    isOrphan() {
        return this.deferredDelete || !forEach(this.containingProjects, p => !p.isOrphan());
    }
    /**
     *  @param line 1 based index
     */
    lineToTextSpan(line) {
        return this.textStorage.lineToTextSpan(line);
    }
    lineOffsetToPosition(line, offset, allowEdits) {
        return this.textStorage.lineOffsetToPosition(line, offset, allowEdits);
    }
    positionToLineOffset(position) {
        failIfInvalidPosition(position);
        const location = this.textStorage.positionToLineOffset(position);
        failIfInvalidLocation(location);
        return location;
    }
    isJavaScript() {
        return this.scriptKind === ScriptKind.JS || this.scriptKind === ScriptKind.JSX;
    }
    /** @internal */
    closeSourceMapFileWatcher() {
        if (this.sourceMapFilePath && !isString(this.sourceMapFilePath)) {
            closeFileWatcherOf(this.sourceMapFilePath);
            this.sourceMapFilePath = undefined;
        }
    }
}
function failIfInvalidPosition(position) {
    Debug.assert(typeof position === "number", `Expected position ${position} to be a number.`);
    Debug.assert(position >= 0, `Expected position to be non-negative.`);
}
function failIfInvalidLocation(location) {
    Debug.assert(typeof location.line === "number", `Expected line ${location.line} to be a number.`);
    Debug.assert(typeof location.offset === "number", `Expected offset ${location.offset} to be a number.`);
    Debug.assert(location.line > 0, `Expected line to be non-${location.line === 0 ? "zero" : "negative"}`);
    Debug.assert(location.offset > 0, `Expected offset to be non-${location.offset === 0 ? "zero" : "negative"}`);
}
/** @internal */
export function scriptInfoIsContainedByBackgroundProject(info) {
    return some(info.containingProjects, isBackgroundProject);
}
/** @internal */
export function scriptInfoIsContainedByDeferredClosedProject(info) {
    return some(info.containingProjects, isProjectDeferredClose);
}
