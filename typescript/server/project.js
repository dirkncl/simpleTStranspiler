import * as ts from "./namespaces/ts.js";
import {
  addRange,
  append,
  arrayFrom,
  arrayIsEqualTo,
  arrayToMap,
  BuilderState,
  canJsonReportNoInputFiles,
  canWatchDirectoryOrFilePath,
  changeExtension,
  changesAffectModuleResolution,
  clearMap,
  cloneCompilerOptions,
  closeFileWatcher,
  closeFileWatcherOf,
  combinePaths,
  comparePaths,
  containsPath,
  createCacheableExportInfoMap,
  createLanguageService,
  createResolutionCache,
  createSymlinkCache,
  Debug,
  directorySeparator,
  ensureTrailingDirectorySeparator,
  enumerateInsertsAndDeletes,
  every,
  explainFiles,
  Extension,
  fileExtensionIs,
  FileWatcherEventKind,
  filter,
  flatMap,
  forEach,
  forEachEntry,
  forEachKey,
  generateDjb2Hash,
  getAllowJSCompilerOption,
  getAutomaticTypeDirectiveNames,
  getBaseFileName,
  getCommonSourceDirectoryOfConfig,
  getDeclarationEmitOutputFilePathWorker,
  getDefaultCompilerOptions,
  getDefaultLibFileName,
  getDefaultLibFilePath,
  getDirectoryPath,
  getEffectiveTypeRoots,
  getEmitDeclarations,
  getEntrypointsFromPackageJsonInfo,
  getNormalizedAbsolutePath,
  getOrUpdate,
  getOutputDeclarationFileName,
  getStringComparer,
  inferredTypesContainingFile,
  isDeclarationFileName,
  isExternalModuleNameRelative,
  isInsideNodeModules,
  JsTyping,
  LanguageServiceMode,
  map,
  mapDefined,
  maybeBind,
  memoize,
  noop,
  noopFileWatcher,
  normalizePath,
  normalizeSlashes,
  PackageJsonAutoImportPreference,
  parsePackageName,
  PollingInterval,
  ProgramUpdateLevel,
  removeFileExtension,
  resolutionExtensionIsTSOrJson,
  resolvePackageNameToPackageJson,
  returnFalse,
  ScriptKind,
  some,
  sortAndDeduplicate,
  startsWith,
  stripQuotes,
  StructureIsReused,
  ThrottledCancellationToken,
  timestamp,
  toPath,
  toSorted,
  tracing,
  updateErrorForNoInputFiles,
  updateMissingFilePathsWatch,
  WatchDirectoryFlags,
  WatchType,
} from "./namespaces/ts.js";

import {
  ActionInvalidate,
  asNormalizedPath,
  createModuleSpecifierCache,
  emptyArray,
  Errors,
  getDetailWatchInfo,
  LogLevel,
  Msg,
  nullTypingsInstaller,
  toNormalizedPath,
  updateProjectIfDirty,
} from "./namespaces/ts.server.js";

// export enum ProjectKind {
//     Inferred,
//     Configured,
//     External,
//     AutoImportProvider,
//     Auxiliary,
// }
export var ProjectKind;
(function (ProjectKind) {
    ProjectKind[ProjectKind["Inferred"] = 0] = "Inferred";
    ProjectKind[ProjectKind["Configured"] = 1] = "Configured";
    ProjectKind[ProjectKind["External"] = 2] = "External";
    ProjectKind[ProjectKind["AutoImportProvider"] = 3] = "AutoImportProvider";
    ProjectKind[ProjectKind["Auxiliary"] = 4] = "Auxiliary";
})(ProjectKind || (ProjectKind = {}));

/** @internal */
export function countEachFileTypes(infos, includeSizes = false) {
    const result = {
        js: 0,
        jsSize: 0,
        jsx: 0,
        jsxSize: 0,
        ts: 0,
        tsSize: 0,
        tsx: 0,
        tsxSize: 0,
        dts: 0,
        dtsSize: 0,
        deferred: 0,
        deferredSize: 0,
    };
    for (const info of infos) {
        const fileSize = includeSizes ? info.textStorage.getTelemetryFileSize() : 0;
        switch (info.scriptKind) {
            case ScriptKind.JS:
                result.js += 1;
                result.jsSize += fileSize;
                break;
            case ScriptKind.JSX:
                result.jsx += 1;
                result.jsxSize += fileSize;
                break;
            case ScriptKind.TS:
                if (isDeclarationFileName(info.fileName)) {
                    result.dts += 1;
                    result.dtsSize += fileSize;
                }
                else {
                    result.ts += 1;
                    result.tsSize += fileSize;
                }
                break;
            case ScriptKind.TSX:
                result.tsx += 1;
                result.tsxSize += fileSize;
                break;
            case ScriptKind.Deferred:
                result.deferred += 1;
                result.deferredSize += fileSize;
                break;
        }
    }
    return result;
}
function hasOneOrMoreJsAndNoTsFiles(project) {
    const counts = countEachFileTypes(project.getScriptInfos());
    return counts.js > 0 && counts.ts === 0 && counts.tsx === 0;
}
export function allRootFilesAreJsOrDts(project) {
    const counts = countEachFileTypes(project.getRootScriptInfos());
    return counts.ts === 0 && counts.tsx === 0;
}
export function allFilesAreJsOrDts(project) {
    const counts = countEachFileTypes(project.getScriptInfos());
    return counts.ts === 0 && counts.tsx === 0;
}
/** @internal */
export function hasNoTypeScriptSource(fileNames) {
    return !fileNames.some(fileName => (fileExtensionIs(fileName, Extension.Ts) && !isDeclarationFileName(fileName)) || fileExtensionIs(fileName, Extension.Tsx));
}
function isGeneratedFileWatcher(watch) {
    return watch.generatedFilePath !== undefined;
}

// const enum TypingWatcherType {
//     FileWatcher = "FileWatcher",
//     DirectoryWatcher = "DirectoryWatcher",
// }
var TypingWatcherType;
(function (TypingWatcherType) {
    TypingWatcherType["FileWatcher"] = "FileWatcher";
    TypingWatcherType["DirectoryWatcher"] = "DirectoryWatcher";
})(TypingWatcherType || (TypingWatcherType = {}));

function setIsEqualTo(arr1, arr2) {
    if (arr1 === arr2) {
        return true;
    }
    if ((arr1 || emptyArray).length === 0 && (arr2 || emptyArray).length === 0) {
        return true;
    }
    const set = new Map();
    let unique = 0;
    for (const v of arr1) {
        if (set.get(v) !== true) {
            set.set(v, true);
            unique++;
        }
    }
    for (const v of arr2) {
        const isSet = set.get(v);
        if (isSet === undefined) {
            return false;
        }
        if (isSet === true) {
            set.set(v, false);
            unique--;
        }
    }
    return unique === 0;
}
function typeAcquisitionChanged(opt1, opt2) {
    return opt1.enable !== opt2.enable ||
        !setIsEqualTo(opt1.include, opt2.include) ||
        !setIsEqualTo(opt1.exclude, opt2.exclude);
}
function compilerOptionsChanged(opt1, opt2) {
    // TODO: add more relevant properties
    return getAllowJSCompilerOption(opt1) !== getAllowJSCompilerOption(opt2);
}
function unresolvedImportsChanged(imports1, imports2) {
    if (imports1 === imports2) {
        return false;
    }
    return !arrayIsEqualTo(imports1, imports2);
}
export class Project {
    /** @internal */
    getResolvedProjectReferenceToRedirect(_fileName) {
        return undefined;
    }
    isNonTsProject() {
        updateProjectIfDirty(this);
        return allFilesAreJsOrDts(this);
    }
    isJsOnlyProject() {
        updateProjectIfDirty(this);
        return hasOneOrMoreJsAndNoTsFiles(this);
    }
    static resolveModule(moduleName, initialDir, host, log) {
        return Project.importServicePluginSync({ name: moduleName }, [initialDir], host, log).resolvedModule;
    }
    /** @internal */
    static importServicePluginSync(pluginConfigEntry, searchPaths, host, log) {
        Debug.assertIsDefined(host.require);
        let errorLogs;
        let resolvedModule;
        for (const initialDir of searchPaths) {
            const resolvedPath = normalizeSlashes(host.resolvePath(combinePaths(initialDir, "node_modules")));
            log(`Loading ${pluginConfigEntry.name} from ${initialDir} (resolved to ${resolvedPath})`);
            const result = host.require(resolvedPath, pluginConfigEntry.name); // TODO: GH#18217
            if (!result.error) {
                resolvedModule = result.module;
                break;
            }
            const err = result.error.stack || result.error.message || JSON.stringify(result.error);
            (errorLogs !== null && errorLogs !== void 0 ? errorLogs : (errorLogs = [])).push(`Failed to load module '${pluginConfigEntry.name}' from ${resolvedPath}: ${err}`);
        }
        return { pluginConfigEntry, resolvedModule, errorLogs };
    }
    /** @internal */
    static async importServicePluginAsync(pluginConfigEntry, searchPaths, host, log) {
        Debug.assertIsDefined(host.importPlugin);
        let errorLogs;
        let resolvedModule;
        for (const initialDir of searchPaths) {
            const resolvedPath = combinePaths(initialDir, "node_modules");
            log(`Dynamically importing ${pluginConfigEntry.name} from ${initialDir} (resolved to ${resolvedPath})`);
            let result;
            try {
                result = await host.importPlugin(resolvedPath, pluginConfigEntry.name);
            }
            catch (e) {
                result = { module: undefined, error: e };
            }
            if (!result.error) {
                resolvedModule = result.module;
                break;
            }
            const err = result.error.stack || result.error.message || JSON.stringify(result.error);
            (errorLogs !== null && errorLogs !== void 0 ? errorLogs : (errorLogs = [])).push(`Failed to dynamically import module '${pluginConfigEntry.name}' from ${resolvedPath}: ${err}`);
        }
        return { pluginConfigEntry, resolvedModule, errorLogs };
    }
    /** @internal */
    constructor(projectName, projectKind, projectService, hasExplicitListOfFiles, lastFileExceededProgramSize, compilerOptions, compileOnSaveEnabled, watchOptions, directoryStructureHost, currentDirectory) {
        this.projectKind = projectKind;
        this.projectService = projectService;
        this.compilerOptions = compilerOptions;
        this.compileOnSaveEnabled = compileOnSaveEnabled;
        this.watchOptions = watchOptions;
        this.rootFilesMap = new Map();
        /** @internal */
        this.plugins = [];
        /**
         * This is map from files to unresolved imports in it
         * Maop does not contain entries for files that do not have unresolved imports
         * This helps in containing the set of files to invalidate
         *
         * @internal
         */
        this.cachedUnresolvedImportsPerFile = new Map();
        this.hasAddedorRemovedFiles = false;
        this.hasAddedOrRemovedSymlinks = false;
        /**
         * Last version that was reported.
         */
        this.lastReportedVersion = 0;
        /**
         * Current project's program version. (incremented everytime new program is created that is not complete reuse from the old one)
         * This property is changed in 'updateGraph' based on the set of files in program
         * @internal
         */
        this.projectProgramVersion = 0;
        /**
         * Current version of the project state. It is changed when:
         * - new root file was added/removed
         * - edit happen in some file that is currently included in the project.
         * This property is different from projectStructureVersion since in most cases edits don't affect set of files in the project
         * @internal
         */
        this.projectStateVersion = 0;
        /** @internal */
        this.initialLoadPending = false;
        /** @internal */
        this.dirty = false;
        /** @internal */
        this.typingFiles = emptyArray;
        this.moduleSpecifierCache = createModuleSpecifierCache(this);
        /** @internal */
        this.createHash = maybeBind(this.projectService.host, this.projectService.host.createHash);
        /** @internal */
        this.globalCacheResolutionModuleName = JsTyping.nonRelativeModuleNameForTypingCache;
        /** @internal */
        this.updateFromProjectInProgress = false;
        projectService.logger.info(`Creating ${ProjectKind[projectKind]}Project: ${projectName}, currentDirectory: ${currentDirectory}`);
        this.projectName = projectName;
        this.directoryStructureHost = directoryStructureHost;
        this.currentDirectory = this.projectService.getNormalizedAbsolutePath(currentDirectory);
        this.getCanonicalFileName = this.projectService.toCanonicalFileName;
        this.jsDocParsingMode = this.projectService.jsDocParsingMode;
        this.cancellationToken = new ThrottledCancellationToken(this.projectService.cancellationToken, this.projectService.throttleWaitMilliseconds);
        if (!this.compilerOptions) {
            this.compilerOptions = getDefaultCompilerOptions();
            this.compilerOptions.allowNonTsExtensions = true;
            this.compilerOptions.allowJs = true;
        }
        else if (hasExplicitListOfFiles || getAllowJSCompilerOption(this.compilerOptions) || this.projectService.hasDeferredExtension()) {
            // If files are listed explicitly or allowJs is specified, allow all extensions
            this.compilerOptions.allowNonTsExtensions = true;
        }
        switch (projectService.serverMode) {
            case LanguageServiceMode.Semantic:
                this.languageServiceEnabled = true;
                break;
            case LanguageServiceMode.PartialSemantic:
                this.languageServiceEnabled = true;
                this.compilerOptions.noResolve = true;
                this.compilerOptions.types = [];
                break;
            case LanguageServiceMode.Syntactic:
                this.languageServiceEnabled = false;
                this.compilerOptions.noResolve = true;
                this.compilerOptions.types = [];
                break;
            default:
                Debug.assertNever(projectService.serverMode);
        }
        this.setInternalCompilerOptionsForEmittingJsFiles();
        const host = this.projectService.host;
        if (this.projectService.logger.loggingEnabled()) {
            this.trace = s => this.writeLog(s);
        }
        else if (host.trace) {
            this.trace = s => host.trace(s);
        }
        this.realpath = maybeBind(host, host.realpath);
        this.preferNonRecursiveWatch = this.projectService.canUseWatchEvents || host.preferNonRecursiveWatch;
        // Use the current directory as resolution root only if the project created using current directory string
        this.resolutionCache = createResolutionCache(this, this.currentDirectory, 
        /*logChangesWhenResolvingModule*/ true);
        this.languageService = createLanguageService(this, this.projectService.documentRegistry, this.projectService.serverMode);
        if (lastFileExceededProgramSize) {
            this.disableLanguageService(lastFileExceededProgramSize);
        }
        this.markAsDirty();
        if (!isBackgroundProject(this)) {
            this.projectService.pendingEnsureProjectForOpenFiles = true;
        }
        this.projectService.onProjectCreation(this);
    }
    isKnownTypesPackageName(name) {
        return this.projectService.typingsInstaller.isKnownTypesPackageName(name);
    }
    installPackage(options) {
        return this.projectService.typingsInstaller.installPackage(Object.assign(Object.assign({}, options), { projectName: this.projectName, projectRootPath: this.toPath(this.currentDirectory) }));
    }
    /** @internal */
    getGlobalTypingsCacheLocation() {
        return this.getTypeAcquisition().enable ? this.projectService.typingsInstaller.globalTypingsCacheLocation : undefined;
    }
    /** @internal */
    getSymlinkCache() {
        if (!this.symlinks) {
            this.symlinks = createSymlinkCache(this.getCurrentDirectory(), this.getCanonicalFileName);
        }
        if (this.program && !this.symlinks.hasProcessedResolutions()) {
            this.symlinks.setSymlinksFromResolutions(this.program.forEachResolvedModule, this.program.forEachResolvedTypeReferenceDirective, this.program.getAutomaticTypeDirectiveResolutions());
        }
        return this.symlinks;
    }
    // Method of LanguageServiceHost
    getCompilationSettings() {
        return this.compilerOptions;
    }
    // Method to support public API
    getCompilerOptions() {
        return this.getCompilationSettings();
    }
    getNewLine() {
        return this.projectService.host.newLine;
    }
    getProjectVersion() {
        return this.projectStateVersion.toString();
    }
    getProjectReferences() {
        return undefined;
    }
    getScriptFileNames() {
        if (!this.rootFilesMap.size) {
            return ts.emptyArray;
        }
        let result;
        this.rootFilesMap.forEach(value => {
            if (this.languageServiceEnabled || (value.info && value.info.isScriptOpen())) {
                // if language service is disabled - process only files that are open
                (result || (result = [])).push(value.fileName);
            }
        });
        return addRange(result, this.typingFiles) || ts.emptyArray;
    }
    getOrCreateScriptInfoAndAttachToProject(fileName) {
        const scriptInfo = this.projectService.getOrCreateScriptInfoNotOpenedByClient(fileName, this.currentDirectory, this.directoryStructureHost, 
        /*deferredDeleteOk*/ false);
        if (scriptInfo) {
            const existingValue = this.rootFilesMap.get(scriptInfo.path);
            if (existingValue && existingValue.info !== scriptInfo) {
                // This was missing path earlier but now the file exists. Update the root
                existingValue.info = scriptInfo;
            }
            scriptInfo.attachToProject(this);
        }
        return scriptInfo;
    }
    getScriptKind(fileName) {
        const info = this.projectService.getScriptInfoForPath(this.toPath(fileName));
        return (info && info.scriptKind); // TODO: GH#18217
    }
    getScriptVersion(filename) {
        // Don't attach to the project if version is asked
        const info = this.projectService.getOrCreateScriptInfoNotOpenedByClient(filename, this.currentDirectory, this.directoryStructureHost, 
        /*deferredDeleteOk*/ false);
        return (info && info.getLatestVersion()); // TODO: GH#18217
    }
    getScriptSnapshot(filename) {
        const scriptInfo = this.getOrCreateScriptInfoAndAttachToProject(filename);
        if (scriptInfo) {
            return scriptInfo.getSnapshot();
        }
    }
    getCancellationToken() {
        return this.cancellationToken;
    }
    getCurrentDirectory() {
        return this.currentDirectory;
    }
    getDefaultLibFileName() {
        const nodeModuleBinDir = getDirectoryPath(normalizePath(this.projectService.getExecutingFilePath()));
        return combinePaths(nodeModuleBinDir, getDefaultLibFileName(this.compilerOptions));
    }
    useCaseSensitiveFileNames() {
        return this.projectService.host.useCaseSensitiveFileNames;
    }
    readDirectory(path, extensions, exclude, include, depth) {
        return this.directoryStructureHost.readDirectory(path, extensions, exclude, include, depth);
    }
    readFile(fileName) {
        return this.projectService.host.readFile(fileName);
    }
    writeFile(fileName, content) {
        return this.projectService.host.writeFile(fileName, content);
    }
    fileExists(file) {
        // As an optimization, don't hit the disks for files we already know don't exist
        // (because we're watching for their creation).
        const path = this.toPath(file);
        return !!this.projectService.getScriptInfoForPath(path) ||
            (!this.isWatchedMissingFile(path) && this.directoryStructureHost.fileExists(file));
    }
    /** @internal */
    resolveModuleNameLiterals(moduleLiterals, containingFile, redirectedReference, options, containingSourceFile, reusedNames) {
        return this.resolutionCache.resolveModuleNameLiterals(moduleLiterals, containingFile, redirectedReference, options, containingSourceFile, reusedNames);
    }
    /** @internal */
    getModuleResolutionCache() {
        return this.resolutionCache.getModuleResolutionCache();
    }
    /** @internal */
    resolveTypeReferenceDirectiveReferences(typeDirectiveReferences, containingFile, redirectedReference, options, containingSourceFile, reusedNames) {
        return this.resolutionCache.resolveTypeReferenceDirectiveReferences(typeDirectiveReferences, containingFile, redirectedReference, options, containingSourceFile, reusedNames);
    }
    /** @internal */
    resolveLibrary(libraryName, resolveFrom, options, libFileName) {
        return this.resolutionCache.resolveLibrary(libraryName, resolveFrom, options, libFileName);
    }
    directoryExists(path) {
        return this.directoryStructureHost.directoryExists(path); // TODO: GH#18217
    }
    getDirectories(path) {
        return this.directoryStructureHost.getDirectories(path); // TODO: GH#18217
    }
    /** @internal */
    getCachedDirectoryStructureHost() {
        return undefined; // TODO: GH#18217
    }
    /** @internal */
    toPath(fileName) {
        return toPath(fileName, this.currentDirectory, this.projectService.toCanonicalFileName);
    }
    /** @internal */
    watchDirectoryOfFailedLookupLocation(directory, cb, flags) {
        return this.projectService.watchFactory.watchDirectory(directory, cb, flags, this.projectService.getWatchOptions(this), WatchType.FailedLookupLocations, this);
    }
    /** @internal */
    watchAffectingFileLocation(file, cb) {
        return this.projectService.watchFactory.watchFile(file, cb, PollingInterval.High, this.projectService.getWatchOptions(this), WatchType.AffectingFileLocation, this);
    }
    /** @internal */
    clearInvalidateResolutionOfFailedLookupTimer() {
        return this.projectService.throttledOperations.cancel(`${this.getProjectName()}FailedLookupInvalidation`);
    }
    /** @internal */
    scheduleInvalidateResolutionsOfFailedLookupLocations() {
        this.projectService.throttledOperations.schedule(`${this.getProjectName()}FailedLookupInvalidation`, /*delay*/ 1000, () => {
            if (this.resolutionCache.invalidateResolutionsOfFailedLookupLocations()) {
                this.projectService.delayUpdateProjectGraphAndEnsureProjectStructureForOpenFiles(this);
            }
        });
    }
    /** @internal */
    invalidateResolutionsOfFailedLookupLocations() {
        if (this.clearInvalidateResolutionOfFailedLookupTimer() &&
            this.resolutionCache.invalidateResolutionsOfFailedLookupLocations()) {
            this.markAsDirty();
            this.projectService.delayEnsureProjectForOpenFiles();
        }
    }
    /** @internal */
    onInvalidatedResolution() {
        this.projectService.delayUpdateProjectGraphAndEnsureProjectStructureForOpenFiles(this);
    }
    /** @internal */
    watchTypeRootsDirectory(directory, cb, flags) {
        return this.projectService.watchFactory.watchDirectory(directory, cb, flags, this.projectService.getWatchOptions(this), WatchType.TypeRoots, this);
    }
    /** @internal */
    hasChangedAutomaticTypeDirectiveNames() {
        return this.resolutionCache.hasChangedAutomaticTypeDirectiveNames();
    }
    /** @internal */
    onChangedAutomaticTypeDirectiveNames() {
        this.projectService.delayUpdateProjectGraphAndEnsureProjectStructureForOpenFiles(this);
    }
    /** @internal */
    fileIsOpen(filePath) {
        return this.projectService.openFiles.has(filePath);
    }
    /** @internal */
    writeLog(s) {
        this.projectService.logger.info(s);
    }
    log(s) {
        this.writeLog(s);
    }
    error(s) {
        this.projectService.logger.msg(s, Msg.Err);
    }
    setInternalCompilerOptionsForEmittingJsFiles() {
        if (this.projectKind === ProjectKind.Inferred || this.projectKind === ProjectKind.External) {
            this.compilerOptions.noEmitForJsFiles = true;
        }
    }
    /**
     * Get the errors that dont have any file name associated
     */
    getGlobalProjectErrors() {
        return filter(this.projectErrors, diagnostic => !diagnostic.file) || emptyArray;
    }
    /**
     * Get all the project errors
     */
    getAllProjectErrors() {
        return this.projectErrors || emptyArray;
    }
    setProjectErrors(projectErrors) {
        this.projectErrors = projectErrors;
    }
    getLanguageService(ensureSynchronized = true) {
        if (ensureSynchronized) {
            updateProjectIfDirty(this);
        }
        return this.languageService;
    }
    /** @internal */
    getSourceMapper() {
        return this.getLanguageService().getSourceMapper();
    }
    /** @internal */
    clearSourceMapperCache() {
        this.languageService.clearSourceMapperCache();
    }
    /** @internal */
    getDocumentPositionMapper(generatedFileName, sourceFileName) {
        return this.projectService.getDocumentPositionMapper(this, generatedFileName, sourceFileName);
    }
    /** @internal */
    getSourceFileLike(fileName) {
        return this.projectService.getSourceFileLike(fileName, this);
    }
    /** @internal */
    shouldEmitFile(scriptInfo) {
        return scriptInfo &&
            !scriptInfo.isDynamicOrHasMixedContent() &&
            !this.program.isSourceOfProjectReferenceRedirect(scriptInfo.path);
    }
    getCompileOnSaveAffectedFileList(scriptInfo) {
        if (!this.languageServiceEnabled) {
            return [];
        }
        updateProjectIfDirty(this);
        this.builderState = BuilderState.create(this.program, this.builderState, /*disableUseFileVersionAsSignature*/ true);
        return mapDefined(BuilderState.getFilesAffectedBy(this.builderState, this.program, scriptInfo.path, this.cancellationToken, this.projectService.host), sourceFile => this.shouldEmitFile(this.projectService.getScriptInfoForPath(sourceFile.path)) ? sourceFile.fileName : undefined);
    }
    /**
     * Returns true if emit was conducted
     */
    emitFile(scriptInfo, writeFile) {
        if (!this.languageServiceEnabled || !this.shouldEmitFile(scriptInfo)) {
            return { emitSkipped: true, diagnostics: emptyArray };
        }
        const { emitSkipped, diagnostics, outputFiles } = this.getLanguageService().getEmitOutput(scriptInfo.fileName);
        if (!emitSkipped) {
            for (const outputFile of outputFiles) {
                const outputFileAbsoluteFileName = getNormalizedAbsolutePath(outputFile.name, this.currentDirectory);
                writeFile(outputFileAbsoluteFileName, outputFile.text, outputFile.writeByteOrderMark);
            }
            // Update the signature
            if (this.builderState && getEmitDeclarations(this.compilerOptions)) {
                const dtsFiles = outputFiles.filter(f => isDeclarationFileName(f.name));
                if (dtsFiles.length === 1) {
                    const sourceFile = this.program.getSourceFile(scriptInfo.fileName);
                    const signature = this.projectService.host.createHash ?
                        this.projectService.host.createHash(dtsFiles[0].text) :
                        generateDjb2Hash(dtsFiles[0].text);
                    BuilderState.updateSignatureOfFile(this.builderState, signature, sourceFile.resolvedPath);
                }
            }
        }
        return { emitSkipped, diagnostics };
    }
    enableLanguageService() {
        if (this.languageServiceEnabled || this.projectService.serverMode === LanguageServiceMode.Syntactic) {
            return;
        }
        this.languageServiceEnabled = true;
        this.lastFileExceededProgramSize = undefined;
        this.projectService.onUpdateLanguageServiceStateForProject(this, /*languageServiceEnabled*/ true);
    }
    /** @internal */
    cleanupProgram() {
        if (this.program) {
            // Root files are always attached to the project irrespective of program
            for (const f of this.program.getSourceFiles()) {
                this.detachScriptInfoIfNotRoot(f.fileName);
            }
            this.program.forEachResolvedProjectReference(ref => this.detachScriptInfoFromProject(ref.sourceFile.fileName));
            this.program = undefined;
        }
    }
    disableLanguageService(lastFileExceededProgramSize) {
        if (!this.languageServiceEnabled) {
            return;
        }
        Debug.assert(this.projectService.serverMode !== LanguageServiceMode.Syntactic);
        this.languageService.cleanupSemanticCache();
        this.languageServiceEnabled = false;
        this.cleanupProgram();
        this.lastFileExceededProgramSize = lastFileExceededProgramSize;
        this.builderState = undefined;
        if (this.autoImportProviderHost) {
            this.autoImportProviderHost.close();
        }
        this.autoImportProviderHost = undefined;
        this.resolutionCache.closeTypeRootsWatch();
        this.clearGeneratedFileWatch();
        this.projectService.verifyDocumentRegistry();
        this.projectService.onUpdateLanguageServiceStateForProject(this, /*languageServiceEnabled*/ false);
    }
    getProjectName() {
        return this.projectName;
    }
    removeLocalTypingsFromTypeAcquisition(newTypeAcquisition) {
        if (!newTypeAcquisition.enable || !newTypeAcquisition.include) {
            // Nothing to filter out, so just return as-is
            return newTypeAcquisition;
        }
        return Object.assign(Object.assign({}, newTypeAcquisition), { include: this.removeExistingTypings(newTypeAcquisition.include) });
    }
    getExternalFiles(updateLevel) {
        return toSorted(flatMap(this.plugins, plugin => {
            if (typeof plugin.module.getExternalFiles !== "function")
                return;
            try {
                return plugin.module.getExternalFiles(this, updateLevel || ProgramUpdateLevel.Update);
            }
            catch (e) {
                this.projectService.logger.info(`A plugin threw an exception in getExternalFiles: ${e}`);
                if (e.stack) {
                    this.projectService.logger.info(e.stack);
                }
            }
        }));
    }
    getSourceFile(path) {
        if (!this.program) {
            return undefined;
        }
        return this.program.getSourceFileByPath(path);
    }
    /** @internal */
    getSourceFileOrConfigFile(path) {
        const options = this.program.getCompilerOptions();
        return path === options.configFilePath ? options.configFile : this.getSourceFile(path);
    }
    close() {
        var _a;
        if (this.typingsCache)
            this.projectService.typingsInstaller.onProjectClosed(this);
        this.typingsCache = undefined;
        this.closeWatchingTypingLocations();
        // if we have a program - release all files that are enlisted in program but arent root
        // The releasing of the roots happens later
        // The project could have pending update remaining and hence the info could be in the files but not in program graph
        this.cleanupProgram();
        // Release external files
        forEach(this.externalFiles, externalFile => this.detachScriptInfoIfNotRoot(externalFile));
        // Always remove root files from the project
        this.rootFilesMap.forEach(root => { var _a; return (_a = root.info) === null || _a === void 0 ? void 0 : _a.detachFromProject(this); });
        this.projectService.pendingEnsureProjectForOpenFiles = true;
        this.rootFilesMap = undefined;
        this.externalFiles = undefined;
        this.program = undefined;
        this.builderState = undefined;
        this.resolutionCache.clear();
        this.resolutionCache = undefined;
        this.cachedUnresolvedImportsPerFile = undefined;
        (_a = this.packageJsonWatches) === null || _a === void 0 ? void 0 : _a.forEach(watcher => {
            watcher.projects.delete(this);
            watcher.close();
        });
        this.packageJsonWatches = undefined;
        this.moduleSpecifierCache.clear();
        this.moduleSpecifierCache = undefined;
        this.directoryStructureHost = undefined;
        this.exportMapCache = undefined;
        this.projectErrors = undefined;
        this.plugins.length = 0;
        // Clean up file watchers waiting for missing files
        if (this.missingFilesMap) {
            clearMap(this.missingFilesMap, closeFileWatcher);
            this.missingFilesMap = undefined;
        }
        this.clearGeneratedFileWatch();
        this.clearInvalidateResolutionOfFailedLookupTimer();
        if (this.autoImportProviderHost) {
            this.autoImportProviderHost.close();
        }
        this.autoImportProviderHost = undefined;
        if (this.noDtsResolutionProject) {
            this.noDtsResolutionProject.close();
        }
        this.noDtsResolutionProject = undefined;
        // signal language service to release source files acquired from document registry
        this.languageService.dispose();
        this.languageService = undefined;
    }
    detachScriptInfoIfNotRoot(uncheckedFilename) {
        const info = this.projectService.getScriptInfo(uncheckedFilename);
        // We might not find the script info in case its not associated with the project any more
        // and project graph was not updated (eg delayed update graph in case of files changed/deleted on the disk)
        if (info && !this.isRoot(info)) {
            info.detachFromProject(this);
        }
    }
    isClosed() {
        return this.rootFilesMap === undefined;
    }
    hasRoots() {
        var _a;
        return !!((_a = this.rootFilesMap) === null || _a === void 0 ? void 0 : _a.size);
    }
    /** @internal */
    isOrphan() {
        return false;
    }
    getRootFiles() {
        return this.rootFilesMap && arrayFrom(ts.mapDefinedIterator(this.rootFilesMap.values(), value => { var _a; return (_a = value.info) === null || _a === void 0 ? void 0 : _a.fileName; }));
    }
    /** @internal */
    getRootFilesMap() {
        return this.rootFilesMap;
    }
    getRootScriptInfos() {
        return arrayFrom(ts.mapDefinedIterator(this.rootFilesMap.values(), value => value.info));
    }
    getScriptInfos() {
        if (!this.languageServiceEnabled) {
            // if language service is not enabled - return just root files
            return this.getRootScriptInfos();
        }
        return map(this.program.getSourceFiles(), sourceFile => {
            const scriptInfo = this.projectService.getScriptInfoForPath(sourceFile.resolvedPath);
            Debug.assert(!!scriptInfo, "getScriptInfo", () => `scriptInfo for a file '${sourceFile.fileName}' Path: '${sourceFile.path}' / '${sourceFile.resolvedPath}' is missing.`);
            return scriptInfo;
        });
    }
    getExcludedFiles() {
        return emptyArray;
    }
    getFileNames(excludeFilesFromExternalLibraries, excludeConfigFiles) {
        if (!this.program) {
            return [];
        }
        if (!this.languageServiceEnabled) {
            // if language service is disabled assume that all files in program are root files + default library
            let rootFiles = this.getRootFiles();
            if (this.compilerOptions) {
                const defaultLibrary = getDefaultLibFilePath(this.compilerOptions);
                if (defaultLibrary) {
                    (rootFiles || (rootFiles = [])).push(asNormalizedPath(defaultLibrary));
                }
            }
            return rootFiles;
        }
        const result = [];
        for (const f of this.program.getSourceFiles()) {
            if (excludeFilesFromExternalLibraries && this.program.isSourceFileFromExternalLibrary(f)) {
                continue;
            }
            result.push(asNormalizedPath(f.fileName));
        }
        if (!excludeConfigFiles) {
            const configFile = this.program.getCompilerOptions().configFile;
            if (configFile) {
                result.push(asNormalizedPath(configFile.fileName));
                if (configFile.extendedSourceFiles) {
                    for (const f of configFile.extendedSourceFiles) {
                        result.push(asNormalizedPath(f));
                    }
                }
            }
        }
        return result;
    }
    /** @internal */
    getFileNamesWithRedirectInfo(includeProjectReferenceRedirectInfo) {
        return this.getFileNames().map((fileName) => ({
            fileName,
            isSourceOfProjectReferenceRedirect: includeProjectReferenceRedirectInfo && this.isSourceOfProjectReferenceRedirect(fileName),
        }));
    }
    hasConfigFile(configFilePath) {
        if (this.program && this.languageServiceEnabled) {
            const configFile = this.program.getCompilerOptions().configFile;
            if (configFile) {
                if (configFilePath === asNormalizedPath(configFile.fileName)) {
                    return true;
                }
                if (configFile.extendedSourceFiles) {
                    for (const f of configFile.extendedSourceFiles) {
                        if (configFilePath === asNormalizedPath(f)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    containsScriptInfo(info) {
        if (this.isRoot(info))
            return true;
        if (!this.program)
            return false;
        const file = this.program.getSourceFileByPath(info.path);
        return !!file && file.resolvedPath === info.path;
    }
    containsFile(filename, requireOpen) {
        const info = this.projectService.getScriptInfoForNormalizedPath(filename);
        if (info && (info.isScriptOpen() || !requireOpen)) {
            return this.containsScriptInfo(info);
        }
        return false;
    }
    isRoot(info) {
        var _a, _b;
        return ((_b = (_a = this.rootFilesMap) === null || _a === void 0 ? void 0 : _a.get(info.path)) === null || _b === void 0 ? void 0 : _b.info) === info;
    }
    // add a root file to project
    addRoot(info, fileName) {
        Debug.assert(!this.isRoot(info));
        this.rootFilesMap.set(info.path, { fileName: fileName || info.fileName, info });
        info.attachToProject(this);
        this.markAsDirty();
    }
    // add a root file that doesnt exist on host
    addMissingFileRoot(fileName) {
        const path = this.projectService.toPath(fileName);
        this.rootFilesMap.set(path, { fileName });
        this.markAsDirty();
    }
    removeFile(info, fileExists, detachFromProject) {
        if (this.isRoot(info)) {
            this.removeRoot(info);
        }
        if (fileExists) {
            // If file is present, just remove the resolutions for the file
            this.resolutionCache.removeResolutionsOfFile(info.path);
        }
        else {
            this.resolutionCache.invalidateResolutionOfFile(info.path);
        }
        this.cachedUnresolvedImportsPerFile.delete(info.path);
        if (detachFromProject) {
            info.detachFromProject(this);
        }
        this.markAsDirty();
    }
    registerFileUpdate(fileName) {
        (this.updatedFileNames || (this.updatedFileNames = new Set())).add(fileName);
    }
    /** @internal */
    markFileAsDirty(changedFile) {
        this.markAsDirty();
        if (this.exportMapCache && !this.exportMapCache.isEmpty()) {
            (this.changedFilesForExportMapCache || (this.changedFilesForExportMapCache = new Set())).add(changedFile);
        }
    }
    /** @internal */
    markAsDirty() {
        if (!this.dirty) {
            this.projectStateVersion++;
            this.dirty = true;
        }
    }
    /** @internal */
    markAutoImportProviderAsDirty() {
        var _a;
        if (!this.autoImportProviderHost)
            this.autoImportProviderHost = undefined;
        (_a = this.autoImportProviderHost) === null || _a === void 0 ? void 0 : _a.markAsDirty();
    }
    /** @internal */
    onAutoImportProviderSettingsChanged() {
        this.markAutoImportProviderAsDirty();
    }
    /** @internal */
    onPackageJsonChange() {
        this.moduleSpecifierCache.clear();
        this.markAutoImportProviderAsDirty();
    }
    /** @internal */
    onFileAddedOrRemoved(isSymlink) {
        this.hasAddedorRemovedFiles = true;
        if (isSymlink) {
            this.hasAddedOrRemovedSymlinks = true;
        }
    }
    /** @internal */
    onDiscoveredSymlink() {
        this.hasAddedOrRemovedSymlinks = true;
    }
    /** @internal */
    onReleaseOldSourceFile(oldSourceFile, _oldOptions, hasSourceFileByPath, newSourceFileByResolvedPath) {
        if (!newSourceFileByResolvedPath ||
            (oldSourceFile.resolvedPath === oldSourceFile.path && newSourceFileByResolvedPath.resolvedPath !== oldSourceFile.path)) {
            // new program does not contain this file - detach it from the project
            // - remove resolutions only if the new program doesnt contain source file by the path
            //   (not resolvedPath since path is used for resolution)
            this.detachScriptInfoFromProject(oldSourceFile.fileName, hasSourceFileByPath);
        }
    }
    /** @internal */
    updateFromProject() {
        updateProjectIfDirty(this);
    }
    /**
     * Updates set of files that contribute to this project
     * @returns: true if set of files in the project stays the same and false - otherwise.
     */
    updateGraph() {
        tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "updateGraph", { name: this.projectName, kind: ProjectKind[this.projectKind] });
        this.resolutionCache.startRecordingFilesWithChangedResolutions();
        const hasNewProgram = this.updateGraphWorker();
        const hasAddedorRemovedFiles = this.hasAddedorRemovedFiles;
        this.hasAddedorRemovedFiles = false;
        this.hasAddedOrRemovedSymlinks = false;
        const changedFiles = this.resolutionCache.finishRecordingFilesWithChangedResolutions() || emptyArray;
        for (const file of changedFiles) {
            // delete cached information for changed files
            this.cachedUnresolvedImportsPerFile.delete(file);
        }
        // update builder only if language service is enabled
        // otherwise tell it to drop its internal state
        if (this.languageServiceEnabled && this.projectService.serverMode === LanguageServiceMode.Semantic && !this.isOrphan()) {
            // 1. no changes in structure, no changes in unresolved imports - do nothing
            // 2. no changes in structure, unresolved imports were changed - collect unresolved imports for all files
            // (can reuse cached imports for files that were not changed)
            // 3. new files were added/removed, but compilation settings stays the same - collect unresolved imports for all new/modified files
            // (can reuse cached imports for files that were not changed)
            // 4. compilation settings were changed in the way that might affect module resolution - drop all caches and collect all data from the scratch
            if (hasNewProgram || changedFiles.length) {
                this.lastCachedUnresolvedImportsList = getUnresolvedImports(this.program, this.cachedUnresolvedImportsPerFile);
            }
            this.enqueueInstallTypingsForProject(hasAddedorRemovedFiles);
        }
        else {
            this.lastCachedUnresolvedImportsList = undefined;
        }
        const isFirstProgramLoad = this.projectProgramVersion === 0 && hasNewProgram;
        if (hasNewProgram) {
            this.projectProgramVersion++;
        }
        if (hasAddedorRemovedFiles) {
            this.markAutoImportProviderAsDirty();
        }
        if (isFirstProgramLoad) {
            // Preload auto import provider so it's not created during completions request
            this.getPackageJsonAutoImportProvider();
        }
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
        return !hasNewProgram;
    }
    /** @internal */
    enqueueInstallTypingsForProject(forceRefresh) {
        const typeAcquisition = this.getTypeAcquisition();
        if (!typeAcquisition || !typeAcquisition.enable || this.projectService.typingsInstaller === nullTypingsInstaller) {
            return;
        }
        const entry = this.typingsCache;
        if (forceRefresh ||
            !entry ||
            typeAcquisitionChanged(typeAcquisition, entry.typeAcquisition) ||
            compilerOptionsChanged(this.getCompilationSettings(), entry.compilerOptions) ||
            unresolvedImportsChanged(this.lastCachedUnresolvedImportsList, entry.unresolvedImports)) {
            // Note: entry is now poisoned since it does not really contain typings for a given combination of compiler options\typings options.
            // instead it acts as a placeholder to prevent issuing multiple requests
            this.typingsCache = {
                compilerOptions: this.getCompilationSettings(),
                typeAcquisition,
                unresolvedImports: this.lastCachedUnresolvedImportsList,
            };
            // something has been changed, issue a request to update typings
            this.projectService.typingsInstaller.enqueueInstallTypingsRequest(this, typeAcquisition, this.lastCachedUnresolvedImportsList);
        }
    }
    /** @internal */
    updateTypingFiles(compilerOptions, typeAcquisition, unresolvedImports, newTypings) {
        this.typingsCache = {
            compilerOptions,
            typeAcquisition,
            unresolvedImports,
        };
        const typingFiles = !typeAcquisition || !typeAcquisition.enable ? emptyArray : toSorted(newTypings);
        if (enumerateInsertsAndDeletes(typingFiles, this.typingFiles, getStringComparer(!this.useCaseSensitiveFileNames()), /*inserted*/ noop, removed => this.detachScriptInfoFromProject(removed))) {
            // If typing files changed, then only schedule project update
            this.typingFiles = typingFiles;
            // Invalidate files with unresolved imports
            this.resolutionCache.setFilesWithInvalidatedNonRelativeUnresolvedImports(this.cachedUnresolvedImportsPerFile);
            this.projectService.delayUpdateProjectGraphAndEnsureProjectStructureForOpenFiles(this);
        }
    }
    closeWatchingTypingLocations() {
        if (this.typingWatchers)
            clearMap(this.typingWatchers, closeFileWatcher);
        this.typingWatchers = undefined;
    }
    onTypingInstallerWatchInvoke() {
        this.typingWatchers.isInvoked = true;
        this.projectService.updateTypingsForProject({ projectName: this.getProjectName(), kind: ActionInvalidate });
    }
    /** @internal */
    watchTypingLocations(files) {
        if (!files) {
            this.typingWatchers.isInvoked = false;
            return;
        }
        if (!files.length) {
            // shut down existing watchers
            this.closeWatchingTypingLocations();
            return;
        }
        const toRemove = new Map(this.typingWatchers);
        if (!this.typingWatchers)
            this.typingWatchers = new Map();
        // handler should be invoked once for the entire set of files since it will trigger full rediscovery of typings
        this.typingWatchers.isInvoked = false;
        const createProjectWatcher = (path, typingsWatcherType) => {
            const canonicalPath = this.toPath(path);
            toRemove.delete(canonicalPath);
            if (!this.typingWatchers.has(canonicalPath)) {
                const watchType = typingsWatcherType === "FileWatcher" /* TypingWatcherType.FileWatcher */ ?
                    WatchType.TypingInstallerLocationFile :
                    WatchType.TypingInstallerLocationDirectory;
                this.typingWatchers.set(canonicalPath, canWatchDirectoryOrFilePath(canonicalPath) ?
                    typingsWatcherType === "FileWatcher" /* TypingWatcherType.FileWatcher */ ?
                        this.projectService.watchFactory.watchFile(path, () => !this.typingWatchers.isInvoked ?
                            this.onTypingInstallerWatchInvoke() :
                            this.writeLog(`TypingWatchers already invoked`), PollingInterval.High, this.projectService.getWatchOptions(this), watchType, this) :
                        this.projectService.watchFactory.watchDirectory(path, f => {
                            if (this.typingWatchers.isInvoked)
                                return this.writeLog(`TypingWatchers already invoked`);
                            if (!fileExtensionIs(f, Extension.Json))
                                return this.writeLog(`Ignoring files that are not *.json`);
                            if (comparePaths(f, combinePaths(this.projectService.typingsInstaller.globalTypingsCacheLocation, "package.json"), !this.useCaseSensitiveFileNames()))
                                return this.writeLog(`Ignoring package.json change at global typings location`);
                            this.onTypingInstallerWatchInvoke();
                        }, WatchDirectoryFlags.Recursive, this.projectService.getWatchOptions(this), watchType, this) :
                    (this.writeLog(`Skipping watcher creation at ${path}:: ${getDetailWatchInfo(watchType, this)}`), noopFileWatcher));
            }
        };
        // Create watches from list of files
        for (const file of files) {
            const basename = getBaseFileName(file);
            if (basename === "package.json" || basename === "bower.json") {
                // package.json or bower.json exists, watch the file to detect changes and update typings
                createProjectWatcher(file, "FileWatcher" /* TypingWatcherType.FileWatcher */);
                continue;
            }
            // path in projectRoot, watch project root
            if (containsPath(this.currentDirectory, file, this.currentDirectory, !this.useCaseSensitiveFileNames())) {
                const subDirectory = file.indexOf(directorySeparator, this.currentDirectory.length + 1);
                if (subDirectory !== -1) {
                    // Watch subDirectory
                    createProjectWatcher(file.substr(0, subDirectory), "DirectoryWatcher" /* TypingWatcherType.DirectoryWatcher */);
                }
                else {
                    // Watch the directory itself
                    createProjectWatcher(file, "DirectoryWatcher" /* TypingWatcherType.DirectoryWatcher */);
                }
                continue;
            }
            // path in global cache, watch global cache
            if (containsPath(this.projectService.typingsInstaller.globalTypingsCacheLocation, file, this.currentDirectory, !this.useCaseSensitiveFileNames())) {
                createProjectWatcher(this.projectService.typingsInstaller.globalTypingsCacheLocation, "DirectoryWatcher" /* TypingWatcherType.DirectoryWatcher */);
                continue;
            }
            // watch node_modules or bower_components
            createProjectWatcher(file, "DirectoryWatcher" /* TypingWatcherType.DirectoryWatcher */);
        }
        // Remove unused watches
        toRemove.forEach((watch, path) => {
            watch.close();
            this.typingWatchers.delete(path);
        });
    }
    /** @internal */
    getCurrentProgram() {
        return this.program;
    }
    removeExistingTypings(include) {
        if (!include.length)
            return include;
        const existing = getAutomaticTypeDirectiveNames(this.getCompilerOptions(), this);
        return filter(include, i => !existing.includes(i));
    }
    updateGraphWorker() {
        const oldProgram = this.languageService.getCurrentProgram();
        Debug.assert(oldProgram === this.program);
        Debug.assert(!this.isClosed(), "Called update graph worker of closed project");
        this.writeLog(`Starting updateGraphWorker: Project: ${this.getProjectName()}`);
        const start = timestamp();
        const { hasInvalidatedResolutions, hasInvalidatedLibResolutions } = this.resolutionCache.createHasInvalidatedResolutions(returnFalse, returnFalse);
        this.hasInvalidatedResolutions = hasInvalidatedResolutions;
        this.hasInvalidatedLibResolutions = hasInvalidatedLibResolutions;
        this.resolutionCache.startCachingPerDirectoryResolution();
        this.dirty = false;
        this.updateFromProjectInProgress = true;
        this.program = this.languageService.getProgram(); // TODO: GH#18217
        this.updateFromProjectInProgress = false;
        tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "finishCachingPerDirectoryResolution");
        this.resolutionCache.finishCachingPerDirectoryResolution(this.program, oldProgram);
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
        Debug.assert(oldProgram === undefined || this.program !== undefined);
        // bump up the version if
        // - oldProgram is not set - this is a first time updateGraph is called
        // - newProgram is different from the old program and structure of the old program was not reused.
        let hasNewProgram = false;
        if (this.program && (!oldProgram || (this.program !== oldProgram && this.program.structureIsReused !== StructureIsReused.Completely))) {
            hasNewProgram = true;
            // Update roots
            this.rootFilesMap.forEach((value, path) => {
                var _a;
                const file = this.program.getSourceFileByPath(path);
                const info = value.info;
                if (!file || ((_a = value.info) === null || _a === void 0 ? void 0 : _a.path) === file.resolvedPath)
                    return;
                value.info = this.projectService.getScriptInfo(file.fileName);
                Debug.assert(value.info.isAttached(this));
                info === null || info === void 0 ? void 0 : info.detachFromProject(this);
            });
            // Update the missing file paths watcher
            updateMissingFilePathsWatch(this.program, this.missingFilesMap || (this.missingFilesMap = new Map()), 
            // Watch the missing files
            (missingFilePath, missingFileName) => this.addMissingFileWatcher(missingFilePath, missingFileName));
            if (this.generatedFilesMap) {
                const outPath = this.compilerOptions.outFile;
                if (isGeneratedFileWatcher(this.generatedFilesMap)) {
                    // --out
                    if (!outPath || !this.isValidGeneratedFileWatcher(removeFileExtension(outPath) + Extension.Dts, this.generatedFilesMap)) {
                        this.clearGeneratedFileWatch();
                    }
                }
                else {
                    // MultiFile
                    if (outPath) {
                        this.clearGeneratedFileWatch();
                    }
                    else {
                        this.generatedFilesMap.forEach((watcher, source) => {
                            const sourceFile = this.program.getSourceFileByPath(source);
                            if (!sourceFile ||
                                sourceFile.resolvedPath !== source ||
                                !this.isValidGeneratedFileWatcher(getDeclarationEmitOutputFilePathWorker(sourceFile.fileName, this.compilerOptions, this.program), watcher)) {
                                closeFileWatcherOf(watcher);
                                this.generatedFilesMap.delete(source);
                            }
                        });
                    }
                }
            }
            // Watch the type locations that would be added to program as part of automatic type resolutions
            if (this.languageServiceEnabled && this.projectService.serverMode === LanguageServiceMode.Semantic) {
                this.resolutionCache.updateTypeRootsWatch();
            }
        }
        this.projectService.verifyProgram(this);
        if (this.exportMapCache && !this.exportMapCache.isEmpty()) {
            this.exportMapCache.releaseSymbols();
            if (this.hasAddedorRemovedFiles || oldProgram && !this.program.structureIsReused) {
                this.exportMapCache.clear();
            }
            else if (this.changedFilesForExportMapCache && oldProgram && this.program) {
                forEachKey(this.changedFilesForExportMapCache, fileName => {
                    const oldSourceFile = oldProgram.getSourceFileByPath(fileName);
                    const sourceFile = this.program.getSourceFileByPath(fileName);
                    if (!oldSourceFile || !sourceFile) {
                        this.exportMapCache.clear();
                        return true;
                    }
                    return this.exportMapCache.onFileChanged(oldSourceFile, sourceFile, !!this.getTypeAcquisition().enable);
                });
            }
        }
        if (this.changedFilesForExportMapCache) {
            this.changedFilesForExportMapCache.clear();
        }
        if (this.hasAddedOrRemovedSymlinks || this.program && !this.program.structureIsReused && this.getCompilerOptions().preserveSymlinks) {
            // With --preserveSymlinks, we may not determine that a file is a symlink, so we never set `hasAddedOrRemovedSymlinks`
            this.symlinks = undefined;
            this.moduleSpecifierCache.clear();
        }
        const oldExternalFiles = this.externalFiles || emptyArray;
        this.externalFiles = this.getExternalFiles();
        enumerateInsertsAndDeletes(this.externalFiles, oldExternalFiles, getStringComparer(!this.useCaseSensitiveFileNames()), // Ensure a ScriptInfo is created for new external files. This is performed indirectly
        // by the host for files in the program when the program is retrieved above but
        // the program doesn't contain external files so this must be done explicitly.
        // Ensure a ScriptInfo is created for new external files. This is performed indirectly
        inserted => {
            const scriptInfo = this.projectService.getOrCreateScriptInfoNotOpenedByClient(inserted, this.currentDirectory, this.directoryStructureHost, 
            /*deferredDeleteOk*/ false);
            scriptInfo === null || scriptInfo === void 0 ? void 0 : scriptInfo.attachToProject(this);
        }, removed => this.detachScriptInfoFromProject(removed));
        const elapsed = timestamp() - start;
        this.sendPerformanceEvent("UpdateGraph", elapsed);
        this.writeLog(`Finishing updateGraphWorker: Project: ${this.getProjectName()} projectStateVersion: ${this.projectStateVersion} projectProgramVersion: ${this.projectProgramVersion} structureChanged: ${hasNewProgram}${this.program ? ` structureIsReused:: ${ts.StructureIsReused[this.program.structureIsReused]}` : ""} Elapsed: ${elapsed}ms`);
        if (this.projectService.logger.isTestLogger) {
            if (this.program !== oldProgram) {
                this.print(/*writeProjectFileNames*/ true, this.hasAddedorRemovedFiles, /*writeFileVersionAndText*/ true);
            }
            else {
                this.writeLog(`Same program as before`);
            }
        }
        else if (this.hasAddedorRemovedFiles) {
            this.print(/*writeProjectFileNames*/ true, /*writeFileExplaination*/ true, /*writeFileVersionAndText*/ false);
        }
        else if (this.program !== oldProgram) {
            this.writeLog(`Different program with same set of files`);
        }
        // Verify the document registry count
        this.projectService.verifyDocumentRegistry();
        return hasNewProgram;
    }
    /** @internal */
    sendPerformanceEvent(kind, durationMs) {
        this.projectService.sendPerformanceEvent(kind, durationMs);
    }
    detachScriptInfoFromProject(uncheckedFileName, noRemoveResolution) {
        const scriptInfoToDetach = this.projectService.getScriptInfo(uncheckedFileName);
        if (scriptInfoToDetach) {
            scriptInfoToDetach.detachFromProject(this);
            if (!noRemoveResolution) {
                this.resolutionCache.removeResolutionsOfFile(scriptInfoToDetach.path);
            }
        }
    }
    addMissingFileWatcher(missingFilePath, missingFileName) {
        var _a;
        if (isConfiguredProject(this)) {
            // If this file is referenced config file, we are already watching it, no need to watch again
            const configFileExistenceInfo = this.projectService.configFileExistenceInfoCache.get(missingFilePath);
            if ((_a = configFileExistenceInfo === null || configFileExistenceInfo === void 0 ? void 0 : configFileExistenceInfo.config) === null || _a === void 0 ? void 0 : _a.projects.has(this.canonicalConfigFilePath))
                return noopFileWatcher;
        }
        const fileWatcher = this.projectService.watchFactory.watchFile(getNormalizedAbsolutePath(missingFileName, this.currentDirectory), (fileName, eventKind) => {
            if (isConfiguredProject(this)) {
                this.getCachedDirectoryStructureHost().addOrDeleteFile(fileName, missingFilePath, eventKind);
            }
            if (eventKind === FileWatcherEventKind.Created && this.missingFilesMap.has(missingFilePath)) {
                this.missingFilesMap.delete(missingFilePath);
                fileWatcher.close();
                // When a missing file is created, we should update the graph.
                this.projectService.delayUpdateProjectGraphAndEnsureProjectStructureForOpenFiles(this);
            }
        }, PollingInterval.Medium, this.projectService.getWatchOptions(this), WatchType.MissingFile, this);
        return fileWatcher;
    }
    isWatchedMissingFile(path) {
        return !!this.missingFilesMap && this.missingFilesMap.has(path);
    }
    /** @internal */
    addGeneratedFileWatch(generatedFile, sourceFile) {
        if (this.compilerOptions.outFile) {
            // Single watcher
            if (!this.generatedFilesMap) {
                this.generatedFilesMap = this.createGeneratedFileWatcher(generatedFile);
            }
        }
        else {
            // Map
            const path = this.toPath(sourceFile);
            if (this.generatedFilesMap) {
                if (isGeneratedFileWatcher(this.generatedFilesMap)) {
                    Debug.fail(`${this.projectName} Expected to not have --out watcher for generated file with options: ${JSON.stringify(this.compilerOptions)}`);
                    return;
                }
                if (this.generatedFilesMap.has(path))
                    return;
            }
            else {
                this.generatedFilesMap = new Map();
            }
            this.generatedFilesMap.set(path, this.createGeneratedFileWatcher(generatedFile));
        }
    }
    createGeneratedFileWatcher(generatedFile) {
        return {
            generatedFilePath: this.toPath(generatedFile),
            watcher: this.projectService.watchFactory.watchFile(generatedFile, () => {
                this.clearSourceMapperCache();
                this.projectService.delayUpdateProjectGraphAndEnsureProjectStructureForOpenFiles(this);
            }, PollingInterval.High, this.projectService.getWatchOptions(this), WatchType.MissingGeneratedFile, this),
        };
    }
    isValidGeneratedFileWatcher(generateFile, watcher) {
        return this.toPath(generateFile) === watcher.generatedFilePath;
    }
    clearGeneratedFileWatch() {
        if (this.generatedFilesMap) {
            if (isGeneratedFileWatcher(this.generatedFilesMap)) {
                closeFileWatcherOf(this.generatedFilesMap);
            }
            else {
                clearMap(this.generatedFilesMap, closeFileWatcherOf);
            }
            this.generatedFilesMap = undefined;
        }
    }
    getScriptInfoForNormalizedPath(fileName) {
        const scriptInfo = this.projectService.getScriptInfoForPath(this.toPath(fileName));
        if (scriptInfo && !scriptInfo.isAttached(this)) {
            return Errors.ThrowProjectDoesNotContainDocument(fileName, this);
        }
        return scriptInfo;
    }
    getScriptInfo(uncheckedFileName) {
        return this.projectService.getScriptInfo(uncheckedFileName);
    }
    filesToString(writeProjectFileNames) {
        return this.filesToStringWorker(writeProjectFileNames, /*writeFileExplaination*/ true, /*writeFileVersionAndText*/ false);
    }
    filesToStringWorker(writeProjectFileNames, writeFileExplaination, writeFileVersionAndText) {
        if (this.initialLoadPending)
            return "\tFiles (0) InitialLoadPending\n";
        if (!this.program)
            return "\tFiles (0) NoProgram\n";
        const sourceFiles = this.program.getSourceFiles();
        let strBuilder = `\tFiles (${sourceFiles.length})\n`;
        if (writeProjectFileNames) {
            for (const file of sourceFiles) {
                strBuilder += `\t${file.fileName}${writeFileVersionAndText ? ` ${file.version} ${JSON.stringify(file.text)}` : ""}\n`;
            }
            if (writeFileExplaination) {
                strBuilder += "\n\n";
                explainFiles(this.program, s => strBuilder += `\t${s}\n`);
            }
        }
        return strBuilder;
    }
    /** @internal */
    print(writeProjectFileNames, writeFileExplaination, writeFileVersionAndText) {
        var _a;
        this.writeLog(`Project '${this.projectName}' (${ProjectKind[this.projectKind]})`);
        this.writeLog(this.filesToStringWorker(writeProjectFileNames && this.projectService.logger.hasLevel(LogLevel.verbose), writeFileExplaination && this.projectService.logger.hasLevel(LogLevel.verbose), writeFileVersionAndText && this.projectService.logger.hasLevel(LogLevel.verbose)));
        this.writeLog("-----------------------------------------------");
        if (this.autoImportProviderHost) {
            this.autoImportProviderHost.print(/*writeProjectFileNames*/ false, /*writeFileExplaination*/ false, /*writeFileVersionAndText*/ false);
        }
        (_a = this.noDtsResolutionProject) === null || _a === void 0 ? void 0 : _a.print(/*writeProjectFileNames*/ false, /*writeFileExplaination*/ false, /*writeFileVersionAndText*/ false);
    }
    setCompilerOptions(compilerOptions) {
        var _a;
        if (compilerOptions) {
            compilerOptions.allowNonTsExtensions = true;
            const oldOptions = this.compilerOptions;
            this.compilerOptions = compilerOptions;
            this.setInternalCompilerOptionsForEmittingJsFiles();
            (_a = this.noDtsResolutionProject) === null || _a === void 0 ? void 0 : _a.setCompilerOptions(this.getCompilerOptionsForNoDtsResolutionProject());
            if (changesAffectModuleResolution(oldOptions, compilerOptions)) {
                // reset cached unresolved imports if changes in compiler options affected module resolution
                this.cachedUnresolvedImportsPerFile.clear();
                this.lastCachedUnresolvedImportsList = undefined;
                this.resolutionCache.onChangesAffectModuleResolution();
                this.moduleSpecifierCache.clear();
            }
            this.markAsDirty();
        }
    }
    /** @internal */
    setWatchOptions(watchOptions) {
        this.watchOptions = watchOptions;
    }
    /** @internal */
    getWatchOptions() {
        return this.watchOptions;
    }
    setTypeAcquisition(newTypeAcquisition) {
        if (newTypeAcquisition) {
            this.typeAcquisition = this.removeLocalTypingsFromTypeAcquisition(newTypeAcquisition);
        }
    }
    getTypeAcquisition() {
        return this.typeAcquisition || {};
    }
    /** @internal */
    getChangesSinceVersion(lastKnownVersion, includeProjectReferenceRedirectInfo) {
        var _a, _b;
        const includeProjectReferenceRedirectInfoIfRequested = includeProjectReferenceRedirectInfo
            ? (files) => arrayFrom(files.entries(), ([fileName, isSourceOfProjectReferenceRedirect]) => ({
                fileName,
                isSourceOfProjectReferenceRedirect,
            }))
            : (files) => arrayFrom(files.keys());
        // Update the graph only if initial configured project load is not pending
        if (!this.initialLoadPending) {
            updateProjectIfDirty(this);
        }
        const info = {
            projectName: this.getProjectName(),
            version: this.projectProgramVersion,
            isInferred: isInferredProject(this),
            options: this.getCompilationSettings(),
            languageServiceDisabled: !this.languageServiceEnabled,
            lastFileExceededProgramSize: this.lastFileExceededProgramSize,
        };
        const updatedFileNames = this.updatedFileNames;
        this.updatedFileNames = undefined;
        // check if requested version is the same that we have reported last time
        if (this.lastReportedFileNames && lastKnownVersion === this.lastReportedVersion) {
            // if current structure version is the same - return info without any changes
            if (this.projectProgramVersion === this.lastReportedVersion && !updatedFileNames) {
                return { info, projectErrors: this.getGlobalProjectErrors() };
            }
            // compute and return the difference
            const lastReportedFileNames = this.lastReportedFileNames;
            const externalFiles = ((_a = this.externalFiles) === null || _a === void 0 ? void 0 : _a.map((f) => ({
                fileName: toNormalizedPath(f),
                isSourceOfProjectReferenceRedirect: false,
            }))) || emptyArray;
            const currentFiles = arrayToMap(this.getFileNamesWithRedirectInfo(!!includeProjectReferenceRedirectInfo).concat(externalFiles), info => info.fileName, info => info.isSourceOfProjectReferenceRedirect);
            const added = new Map();
            const removed = new Map();
            const updated = updatedFileNames ? arrayFrom(updatedFileNames.keys()) : [];
            const updatedRedirects = [];
            forEachEntry(currentFiles, (isSourceOfProjectReferenceRedirect, fileName) => {
                if (!lastReportedFileNames.has(fileName)) {
                    added.set(fileName, isSourceOfProjectReferenceRedirect);
                }
                else if (includeProjectReferenceRedirectInfo && isSourceOfProjectReferenceRedirect !== lastReportedFileNames.get(fileName)) {
                    updatedRedirects.push({
                        fileName,
                        isSourceOfProjectReferenceRedirect,
                    });
                }
            });
            forEachEntry(lastReportedFileNames, (isSourceOfProjectReferenceRedirect, fileName) => {
                if (!currentFiles.has(fileName)) {
                    removed.set(fileName, isSourceOfProjectReferenceRedirect);
                }
            });
            this.lastReportedFileNames = currentFiles;
            this.lastReportedVersion = this.projectProgramVersion;
            return {
                info,
                changes: {
                    added: includeProjectReferenceRedirectInfoIfRequested(added),
                    removed: includeProjectReferenceRedirectInfoIfRequested(removed),
                    updated: includeProjectReferenceRedirectInfo
                        ? updated.map((fileName) => ({
                            fileName,
                            isSourceOfProjectReferenceRedirect: this.isSourceOfProjectReferenceRedirect(fileName),
                        }))
                        : updated,
                    updatedRedirects: includeProjectReferenceRedirectInfo ? updatedRedirects : undefined,
                },
                projectErrors: this.getGlobalProjectErrors(),
            };
        }
        else {
            // unknown version - return everything
            const projectFileNames = this.getFileNamesWithRedirectInfo(!!includeProjectReferenceRedirectInfo);
            const externalFiles = ((_b = this.externalFiles) === null || _b === void 0 ? void 0 : _b.map((f) => ({
                fileName: toNormalizedPath(f),
                isSourceOfProjectReferenceRedirect: false,
            }))) || emptyArray;
            const allFiles = projectFileNames.concat(externalFiles);
            this.lastReportedFileNames = arrayToMap(allFiles, info => info.fileName, info => info.isSourceOfProjectReferenceRedirect);
            this.lastReportedVersion = this.projectProgramVersion;
            return {
                info,
                files: includeProjectReferenceRedirectInfo ? allFiles : allFiles.map(f => f.fileName),
                projectErrors: this.getGlobalProjectErrors(),
            };
        }
    }
    // remove a root file from project
    removeRoot(info) {
        this.rootFilesMap.delete(info.path);
    }
    /** @internal */
    isSourceOfProjectReferenceRedirect(fileName) {
        return !!this.program && this.program.isSourceOfProjectReferenceRedirect(fileName);
    }
    /** @internal */
    getGlobalPluginSearchPaths() {
        // Search any globally-specified probe paths, then our peer node_modules
        return [
            ...this.projectService.pluginProbeLocations,
            // ../../.. to walk from X/node_modules/typescript/lib/tsserver.js to X/node_modules/
            combinePaths(this.projectService.getExecutingFilePath(), "../../.."),
        ];
    }
    enableGlobalPlugins(options) {
        if (!this.projectService.globalPlugins.length)
            return;
        const host = this.projectService.host;
        if (!host.require && !host.importPlugin) {
            this.projectService.logger.info("Plugins were requested but not running in environment that supports 'require'. Nothing will be loaded");
            return;
        }
        // Enable global plugins with synthetic configuration entries
        const searchPaths = this.getGlobalPluginSearchPaths();
        for (const globalPluginName of this.projectService.globalPlugins) {
            // Skip empty names from odd commandline parses
            if (!globalPluginName)
                continue;
            // Skip already-locally-loaded plugins
            if (options.plugins && options.plugins.some(p => p.name === globalPluginName))
                continue;
            // Provide global: true so plugins can detect why they can't find their config
            this.projectService.logger.info(`Loading global plugin ${globalPluginName}`);
            this.enablePlugin({ name: globalPluginName, global: true }, searchPaths);
        }
    }
    enablePlugin(pluginConfigEntry, searchPaths) {
        this.projectService.requestEnablePlugin(this, pluginConfigEntry, searchPaths);
    }
    /** @internal */
    enableProxy(pluginModuleFactory, configEntry) {
        try {
            if (typeof pluginModuleFactory !== "function") {
                this.projectService.logger.info(`Skipped loading plugin ${configEntry.name} because it did not expose a proper factory function`);
                return;
            }
            const info = {
                config: configEntry,
                project: this,
                languageService: this.languageService,
                languageServiceHost: this,
                serverHost: this.projectService.host,
                session: this.projectService.session,
            };
            const pluginModule = pluginModuleFactory({ typescript: ts });
            const newLS = pluginModule.create(info);
            for (const k of Object.keys(this.languageService)) {
                // eslint-disable-next-line local/no-in-operator
                if (!(k in newLS)) {
                    this.projectService.logger.info(`Plugin activation warning: Missing proxied method ${k} in created LS. Patching.`);
                    newLS[k] = this.languageService[k];
                }
            }
            this.projectService.logger.info(`Plugin validation succeeded`);
            this.languageService = newLS;
            this.plugins.push({ name: configEntry.name, module: pluginModule });
        }
        catch (e) {
            this.projectService.logger.info(`Plugin activation failed: ${e}`);
        }
    }
    /** @internal */
    onPluginConfigurationChanged(pluginName, configuration) {
        this.plugins.filter(plugin => plugin.name === pluginName).forEach(plugin => {
            if (plugin.module.onConfigurationChanged) {
                plugin.module.onConfigurationChanged(configuration);
            }
        });
    }
    /** Starts a new check for diagnostics. Call this if some file has updated that would cause diagnostics to be changed. */
    refreshDiagnostics() {
        this.projectService.sendProjectsUpdatedInBackgroundEvent();
    }
    /** @internal */
    getPackageJsonsVisibleToFile(fileName, rootDir) {
        if (this.projectService.serverMode !== LanguageServiceMode.Semantic)
            return emptyArray;
        return this.projectService.getPackageJsonsVisibleToFile(fileName, this, rootDir);
    }
    /** @internal */
    getNearestAncestorDirectoryWithPackageJson(fileName) {
        return this.projectService.getNearestAncestorDirectoryWithPackageJson(fileName, this);
    }
    /** @internal */
    getPackageJsonsForAutoImport(rootDir) {
        return this.getPackageJsonsVisibleToFile(combinePaths(this.currentDirectory, inferredTypesContainingFile), rootDir);
    }
    /** @internal */
    getPackageJsonCache() {
        return this.projectService.packageJsonCache;
    }
    /** @internal */
    getCachedExportInfoMap() {
        return this.exportMapCache || (this.exportMapCache = createCacheableExportInfoMap(this));
    }
    /** @internal */
    clearCachedExportInfoMap() {
        var _a;
        (_a = this.exportMapCache) === null || _a === void 0 ? void 0 : _a.clear();
    }
    /** @internal */
    getModuleSpecifierCache() {
        return this.moduleSpecifierCache;
    }
    /** @internal */
    includePackageJsonAutoImports() {
        if (this.projectService.includePackageJsonAutoImports() === PackageJsonAutoImportPreference.Off ||
            !this.languageServiceEnabled ||
            isInsideNodeModules(this.currentDirectory) ||
            !this.isDefaultProjectForOpenFiles()) {
            return PackageJsonAutoImportPreference.Off;
        }
        return this.projectService.includePackageJsonAutoImports();
    }
    /** @internal */
    getHostForAutoImportProvider() {
        var _a, _b;
        if (this.program) {
            return {
                fileExists: this.program.fileExists,
                directoryExists: this.program.directoryExists,
                realpath: this.program.realpath || ((_a = this.projectService.host.realpath) === null || _a === void 0 ? void 0 : _a.bind(this.projectService.host)),
                getCurrentDirectory: this.getCurrentDirectory.bind(this),
                readFile: this.projectService.host.readFile.bind(this.projectService.host),
                getDirectories: this.projectService.host.getDirectories.bind(this.projectService.host),
                trace: (_b = this.projectService.host.trace) === null || _b === void 0 ? void 0 : _b.bind(this.projectService.host),
                useCaseSensitiveFileNames: this.program.useCaseSensitiveFileNames(),
                readDirectory: this.projectService.host.readDirectory.bind(this.projectService.host),
            };
        }
        return this.projectService.host;
    }
    /** @internal */
    getPackageJsonAutoImportProvider() {
        var _a;
        if (this.autoImportProviderHost === false) {
            return undefined;
        }
        if (this.projectService.serverMode !== LanguageServiceMode.Semantic) {
            this.autoImportProviderHost = false;
            return undefined;
        }
        if (this.autoImportProviderHost) {
            updateProjectIfDirty(this.autoImportProviderHost);
            if (this.autoImportProviderHost.isEmpty()) {
                this.autoImportProviderHost.close();
                this.autoImportProviderHost = undefined;
                return undefined;
            }
            return this.autoImportProviderHost.getCurrentProgram();
        }
        const dependencySelection = this.includePackageJsonAutoImports();
        if (dependencySelection) {
            tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "getPackageJsonAutoImportProvider");
            const start = timestamp();
            this.autoImportProviderHost = (_a = AutoImportProviderProject.create(dependencySelection, this, this.getHostForAutoImportProvider())) !== null && _a !== void 0 ? _a : false;
            if (this.autoImportProviderHost) {
                updateProjectIfDirty(this.autoImportProviderHost);
                this.sendPerformanceEvent("CreatePackageJsonAutoImportProvider", timestamp() - start);
                tracing === null || tracing === void 0 ? void 0 : tracing.pop();
                return this.autoImportProviderHost.getCurrentProgram();
            }
            tracing === null || tracing === void 0 ? void 0 : tracing.pop();
        }
    }
    isDefaultProjectForOpenFiles() {
        return !!forEachEntry(this.projectService.openFiles, (_projectRootPath, path) => this.projectService.tryGetDefaultProjectForFile(this.projectService.getScriptInfoForPath(path)) === this);
    }
    /** @internal */
    watchNodeModulesForPackageJsonChanges(directoryPath) {
        return this.projectService.watchPackageJsonsInNodeModules(directoryPath, this);
    }
    /** @internal */
    getIncompleteCompletionsCache() {
        return this.projectService.getIncompleteCompletionsCache();
    }
    /** @internal */
    getNoDtsResolutionProject(rootFile) {
        var _a;
        Debug.assert(this.projectService.serverMode === LanguageServiceMode.Semantic);
        (_a = this.noDtsResolutionProject) !== null && _a !== void 0 ? _a : (this.noDtsResolutionProject = new AuxiliaryProject(this));
        if (this.noDtsResolutionProject.rootFile !== rootFile) {
            this.projectService.setFileNamesOfAutoImportProviderOrAuxillaryProject(this.noDtsResolutionProject, [rootFile]);
            this.noDtsResolutionProject.rootFile = rootFile;
        }
        return this.noDtsResolutionProject;
    }
    /** @internal */
    runWithTemporaryFileUpdate(rootFile, updatedText, cb) {
        var _a, _b, _c, _d;
        const originalProgram = this.program;
        const rootSourceFile = Debug.checkDefined((_a = this.program) === null || _a === void 0 ? void 0 : _a.getSourceFile(rootFile), "Expected file to be part of program");
        const originalText = Debug.checkDefined(rootSourceFile.getFullText());
        (_b = this.getScriptInfo(rootFile)) === null || _b === void 0 ? void 0 : _b.editContent(0, originalText.length, updatedText);
        this.updateGraph();
        try {
            cb(this.program, originalProgram, ((_c = this.program) === null || _c === void 0 ? void 0 : _c.getSourceFile(rootFile)));
        }
        finally {
            (_d = this.getScriptInfo(rootFile)) === null || _d === void 0 ? void 0 : _d.editContent(0, updatedText.length, originalText);
        }
    }
    /** @internal */
    getCompilerOptionsForNoDtsResolutionProject() {
        return Object.assign(Object.assign({}, this.getCompilerOptions()), { noDtsResolution: true, allowJs: true, maxNodeModuleJsDepth: 3, diagnostics: false, skipLibCheck: true, sourceMap: false, types: ts.emptyArray, lib: ts.emptyArray, noLib: true });
    }
}
function getUnresolvedImports(program, cachedUnresolvedImportsPerFile) {
    const sourceFiles = program.getSourceFiles();
    tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "getUnresolvedImports", { count: sourceFiles.length });
    const ambientModules = program.getTypeChecker().getAmbientModules().map(mod => stripQuotes(mod.getName()));
    const result = sortAndDeduplicate(flatMap(sourceFiles, sourceFile => extractUnresolvedImportsFromSourceFile(program, sourceFile, ambientModules, cachedUnresolvedImportsPerFile)));
    tracing === null || tracing === void 0 ? void 0 : tracing.pop();
    return result;
}
function extractUnresolvedImportsFromSourceFile(program, file, ambientModules, cachedUnresolvedImportsPerFile) {
    return getOrUpdate(cachedUnresolvedImportsPerFile, file.path, () => {
        let unresolvedImports;
        program.forEachResolvedModule(({ resolvedModule }, name) => {
            // pick unresolved non-relative names
            if ((!resolvedModule || !resolutionExtensionIsTSOrJson(resolvedModule.extension)) &&
                !isExternalModuleNameRelative(name) &&
                !ambientModules.some(m => m === name)) {
                unresolvedImports = append(unresolvedImports, parsePackageName(name).packageName);
            }
        }, file);
        return unresolvedImports || emptyArray;
    });
}
/**
 * If a file is opened and no tsconfig (or jsconfig) is found,
 * the file and its imports/references are put into an InferredProject.
 */
export class InferredProject extends Project {
    toggleJsInferredProject(isJsInferredProject) {
        if (isJsInferredProject !== this._isJsInferredProject) {
            this._isJsInferredProject = isJsInferredProject;
            this.setCompilerOptions();
        }
    }
    setCompilerOptions(options) {
        // Avoid manipulating the given options directly
        if (!options && !this.getCompilationSettings()) {
            return;
        }
        const newOptions = cloneCompilerOptions(options || this.getCompilationSettings());
        if (this._isJsInferredProject && typeof newOptions.maxNodeModuleJsDepth !== "number") {
            newOptions.maxNodeModuleJsDepth = 2;
        }
        else if (!this._isJsInferredProject) {
            newOptions.maxNodeModuleJsDepth = undefined;
        }
        newOptions.allowJs = true;
        super.setCompilerOptions(newOptions);
    }
    /** @internal */
    constructor(projectService, compilerOptions, watchOptions, projectRootPath, currentDirectory, typeAcquisition) {
        super(projectService.newInferredProjectName(), ProjectKind.Inferred, projectService, 
        /*hasExplicitListOfFiles*/ false, 
        /*lastFileExceededProgramSize*/ undefined, compilerOptions, 
        /*compileOnSaveEnabled*/ false, watchOptions, projectService.host, currentDirectory);
        this._isJsInferredProject = false;
        this.typeAcquisition = typeAcquisition;
        this.projectRootPath = projectRootPath && projectService.toCanonicalFileName(projectRootPath);
        if (!projectRootPath && !projectService.useSingleInferredProject) {
            this.canonicalCurrentDirectory = projectService.toCanonicalFileName(this.currentDirectory);
        }
        this.enableGlobalPlugins(this.getCompilerOptions());
    }
    addRoot(info) {
        Debug.assert(info.isScriptOpen());
        this.projectService.startWatchingConfigFilesForInferredProjectRoot(info);
        if (!this._isJsInferredProject && info.isJavaScript()) {
            this.toggleJsInferredProject(/*isJsInferredProject*/ true);
        }
        else if (this.isOrphan() && this._isJsInferredProject && !info.isJavaScript()) {
            this.toggleJsInferredProject(/*isJsInferredProject*/ false);
        }
        super.addRoot(info);
    }
    removeRoot(info) {
        this.projectService.stopWatchingConfigFilesForScriptInfo(info);
        super.removeRoot(info);
        // Delay toggling to isJsInferredProject = false till we actually need it again
        if (!this.isOrphan() && this._isJsInferredProject && info.isJavaScript()) {
            if (every(this.getRootScriptInfos(), rootInfo => !rootInfo.isJavaScript())) {
                this.toggleJsInferredProject(/*isJsInferredProject*/ false);
            }
        }
    }
    /** @internal */
    isOrphan() {
        return !this.hasRoots();
    }
    isProjectWithSingleRoot() {
        // - when useSingleInferredProject is not set and projectRootPath is not set,
        //   we can guarantee that this will be the only root
        // - other wise it has single root if it has single root script info
        return (!this.projectRootPath && !this.projectService.useSingleInferredProject) ||
            this.getRootScriptInfos().length === 1;
    }
    close() {
        forEach(this.getRootScriptInfos(), info => this.projectService.stopWatchingConfigFilesForScriptInfo(info));
        super.close();
    }
    getTypeAcquisition() {
        return this.typeAcquisition || {
            enable: allRootFilesAreJsOrDts(this),
            include: ts.emptyArray,
            exclude: ts.emptyArray,
        };
    }
}
/** @internal */
export class AuxiliaryProject extends Project {
    constructor(hostProject) {
        super(hostProject.projectService.newAuxiliaryProjectName(), ProjectKind.Auxiliary, hostProject.projectService, 
        /*hasExplicitListOfFiles*/ false, 
        /*lastFileExceededProgramSize*/ undefined, hostProject.getCompilerOptionsForNoDtsResolutionProject(), 
        /*compileOnSaveEnabled*/ false, 
        /*watchOptions*/ undefined, hostProject.projectService.host, hostProject.currentDirectory);
    }
    isOrphan() {
        return true;
    }
    scheduleInvalidateResolutionsOfFailedLookupLocations() {
        // Invalidation will happen on-demand as part of updateGraph
        return;
    }
}
export class AutoImportProviderProject extends Project {
    /** @internal */
    static getRootFileNames(dependencySelection, hostProject, host, compilerOptions) {
        var _a, _b;
        if (!dependencySelection) {
            return ts.emptyArray;
        }
        const program = hostProject.getCurrentProgram();
        if (!program) {
            return ts.emptyArray;
        }
        const start = timestamp();
        let dependencyNames;
        let rootNames;
        const rootFileName = combinePaths(hostProject.currentDirectory, inferredTypesContainingFile);
        const packageJsons = hostProject.getPackageJsonsForAutoImport(combinePaths(hostProject.currentDirectory, rootFileName));
        for (const packageJson of packageJsons) {
            (_a = packageJson.dependencies) === null || _a === void 0 ? void 0 : _a.forEach((_, dependenyName) => addDependency(dependenyName));
            (_b = packageJson.peerDependencies) === null || _b === void 0 ? void 0 : _b.forEach((_, dependencyName) => addDependency(dependencyName));
        }
        let dependenciesAdded = 0;
        if (dependencyNames) {
            const symlinkCache = hostProject.getSymlinkCache();
            for (const name of arrayFrom(dependencyNames.keys())) {
                // Avoid creating a large project that would significantly slow down time to editor interactivity
                if (dependencySelection === PackageJsonAutoImportPreference.Auto && dependenciesAdded >= this.maxDependencies) {
                    hostProject.log(`AutoImportProviderProject: attempted to add more than ${this.maxDependencies} dependencies. Aborting.`);
                    return ts.emptyArray;
                }
                // 1. Try to load from the implementation package. For many dependencies, the
                //    package.json will exist, but the package will not contain any typings,
                //    so `entrypoints` will be undefined. In that case, or if the dependency
                //    is missing altogether, we will move on to trying the @types package (2).
                const packageJson = resolvePackageNameToPackageJson(name, hostProject.currentDirectory, compilerOptions, host, program.getModuleResolutionCache());
                if (packageJson) {
                    const entrypoints = getRootNamesFromPackageJson(packageJson, program, symlinkCache);
                    if (entrypoints) {
                        dependenciesAdded += addRootNames(entrypoints);
                        continue;
                    }
                }
                // 2. Try to load from the @types package in the tree and in the global
                //    typings cache location, if enabled.
                const done = forEach([hostProject.currentDirectory, hostProject.getGlobalTypingsCacheLocation()], directory => {
                    if (directory) {
                        const typesPackageJson = resolvePackageNameToPackageJson(`@types/${name}`, directory, compilerOptions, host, program.getModuleResolutionCache());
                        if (typesPackageJson) {
                            const entrypoints = getRootNamesFromPackageJson(typesPackageJson, program, symlinkCache);
                            dependenciesAdded += addRootNames(entrypoints);
                            return true;
                        }
                    }
                });
                if (done)
                    continue;
                // 3. If the @types package did not exist and the user has settings that
                //    allow processing JS from node_modules, go back to the implementation
                //    package and load the JS.
                if (packageJson && compilerOptions.allowJs && compilerOptions.maxNodeModuleJsDepth) {
                    const entrypoints = getRootNamesFromPackageJson(packageJson, program, symlinkCache, /*resolveJs*/ true);
                    dependenciesAdded += addRootNames(entrypoints);
                }
            }
        }
        const references = program.getResolvedProjectReferences();
        let referencesAddded = 0;
        if ((references === null || references === void 0 ? void 0 : references.length) && hostProject.projectService.getHostPreferences().includeCompletionsForModuleExports) {
            // Add direct referenced projects to rootFiles names
            references.forEach(ref => {
                if (ref === null || ref === void 0 ? void 0 : ref.commandLine.options.outFile) {
                    referencesAddded += addRootNames(filterEntrypoints([
                        changeExtension(ref.commandLine.options.outFile, ".d.ts"),
                    ]));
                }
                else if (ref) {
                    const getCommonSourceDirectory = memoize(() => getCommonSourceDirectoryOfConfig(ref.commandLine, !hostProject.useCaseSensitiveFileNames()));
                    referencesAddded += addRootNames(filterEntrypoints(mapDefined(ref.commandLine.fileNames, fileName => !isDeclarationFileName(fileName) &&
                        !fileExtensionIs(fileName, Extension.Json) &&
                        !program.getSourceFile(fileName) ?
                        getOutputDeclarationFileName(fileName, ref.commandLine, !hostProject.useCaseSensitiveFileNames(), getCommonSourceDirectory) : undefined)));
                }
            });
        }
        if (rootNames === null || rootNames === void 0 ? void 0 : rootNames.size) {
            hostProject.log(`AutoImportProviderProject: found ${rootNames.size} root files in ${dependenciesAdded} dependencies ${referencesAddded} referenced projects in ${timestamp() - start} ms`);
        }
        return rootNames ? arrayFrom(rootNames.values()) : ts.emptyArray;
        function addRootNames(entrypoints) {
            if (!(entrypoints === null || entrypoints === void 0 ? void 0 : entrypoints.length))
                return 0;
            rootNames !== null && rootNames !== void 0 ? rootNames : (rootNames = new Set());
            entrypoints.forEach(entry => rootNames.add(entry));
            return 1;
        }
        function addDependency(dependency) {
            if (!startsWith(dependency, "@types/")) {
                (dependencyNames || (dependencyNames = new Set())).add(dependency);
            }
        }
        function getRootNamesFromPackageJson(packageJson, program, symlinkCache, resolveJs) {
            var _a;
            const entrypoints = getEntrypointsFromPackageJsonInfo(packageJson, compilerOptions, host, program.getModuleResolutionCache(), resolveJs);
            if (entrypoints) {
                const real = (_a = host.realpath) === null || _a === void 0 ? void 0 : _a.call(host, packageJson.packageDirectory);
                const realPath = real ? hostProject.toPath(real) : undefined;
                const isSymlink = realPath && realPath !== hostProject.toPath(packageJson.packageDirectory);
                if (isSymlink) {
                    symlinkCache.setSymlinkedDirectory(packageJson.packageDirectory, {
                        real: ensureTrailingDirectorySeparator(real),
                        realPath: ensureTrailingDirectorySeparator(realPath),
                    });
                }
                return filterEntrypoints(entrypoints, isSymlink ? entrypoint => entrypoint.replace(packageJson.packageDirectory, real) : undefined);
            }
        }
        function filterEntrypoints(entrypoints, symlinkName) {
            return mapDefined(entrypoints, entrypoint => {
                const resolvedFileName = symlinkName ? symlinkName(entrypoint) : entrypoint;
                if (!program.getSourceFile(resolvedFileName) && !(symlinkName && program.getSourceFile(entrypoint))) {
                    return resolvedFileName;
                }
            });
        }
    }
    /** @internal */
    static create(dependencySelection, hostProject, host) {
        if (dependencySelection === PackageJsonAutoImportPreference.Off) {
            return undefined;
        }
        const compilerOptions = Object.assign(Object.assign({}, hostProject.getCompilerOptions()), this.compilerOptionsOverrides);
        const rootNames = this.getRootFileNames(dependencySelection, hostProject, host, compilerOptions);
        if (!rootNames.length) {
            return undefined;
        }
        return new AutoImportProviderProject(hostProject, rootNames, compilerOptions);
    }
    /** @internal */
    constructor(hostProject, initialRootNames, compilerOptions) {
        super(hostProject.projectService.newAutoImportProviderProjectName(), ProjectKind.AutoImportProvider, hostProject.projectService, 
        /*hasExplicitListOfFiles*/ false, 
        /*lastFileExceededProgramSize*/ undefined, compilerOptions, 
        /*compileOnSaveEnabled*/ false, hostProject.getWatchOptions(), hostProject.projectService.host, hostProject.currentDirectory);
        this.hostProject = hostProject;
        this.rootFileNames = initialRootNames;
        this.useSourceOfProjectReferenceRedirect = maybeBind(this.hostProject, this.hostProject.useSourceOfProjectReferenceRedirect);
        this.getParsedCommandLine = maybeBind(this.hostProject, this.hostProject.getParsedCommandLine);
    }
    /** @internal */
    isEmpty() {
        return !some(this.rootFileNames);
    }
    /** @internal */
    isOrphan() {
        return true;
    }
    updateGraph() {
        let rootFileNames = this.rootFileNames;
        if (!rootFileNames) {
            rootFileNames = AutoImportProviderProject.getRootFileNames(this.hostProject.includePackageJsonAutoImports(), this.hostProject, this.hostProject.getHostForAutoImportProvider(), this.getCompilationSettings());
        }
        this.projectService.setFileNamesOfAutoImportProviderOrAuxillaryProject(this, rootFileNames);
        this.rootFileNames = rootFileNames;
        const oldProgram = this.getCurrentProgram();
        const hasSameSetOfFiles = super.updateGraph();
        if (oldProgram && oldProgram !== this.getCurrentProgram()) {
            this.hostProject.clearCachedExportInfoMap();
        }
        return hasSameSetOfFiles;
    }
    /** @internal */
    scheduleInvalidateResolutionsOfFailedLookupLocations() {
        // Invalidation will happen on-demand as part of updateGraph
        return;
    }
    hasRoots() {
        var _a;
        return !!((_a = this.rootFileNames) === null || _a === void 0 ? void 0 : _a.length);
    }
    /** @internal */
    markAsDirty() {
        this.rootFileNames = undefined;
        super.markAsDirty();
    }
    getScriptFileNames() {
        return this.rootFileNames || ts.emptyArray;
    }
    getLanguageService() {
        throw new Error("AutoImportProviderProject language service should never be used. To get the program, use `project.getCurrentProgram()`.");
    }
    /** @internal */
    onAutoImportProviderSettingsChanged() {
        throw new Error("AutoImportProviderProject is an auto import provider; use `markAsDirty()` instead.");
    }
    /** @internal */
    onPackageJsonChange() {
        throw new Error("package.json changes should be notified on an AutoImportProvider's host project");
    }
    getHostForAutoImportProvider() {
        throw new Error("AutoImportProviderProject cannot provide its own host; use `hostProject.getModuleResolutionHostForAutomImportProvider()` instead.");
    }
    getProjectReferences() {
        return this.hostProject.getProjectReferences();
    }
    /** @internal */
    includePackageJsonAutoImports() {
        return PackageJsonAutoImportPreference.Off;
    }
    /** @internal */
    getSymlinkCache() {
        return this.hostProject.getSymlinkCache();
    }
    /** @internal */
    getModuleResolutionCache() {
        var _a;
        return (_a = this.hostProject.getCurrentProgram()) === null || _a === void 0 ? void 0 : _a.getModuleResolutionCache();
    }
}
AutoImportProviderProject.maxDependencies = 10;
/** @internal */
AutoImportProviderProject.compilerOptionsOverrides = {
    diagnostics: false,
    skipLibCheck: true,
    sourceMap: false,
    types: ts.emptyArray,
    lib: ts.emptyArray,
    noLib: true,
};
/**
 * If a file is opened, the server will look for a tsconfig (or jsconfig)
 * and if successful create a ConfiguredProject for it.
 * Otherwise it will create an InferredProject.
 */
export class ConfiguredProject extends Project {
    /** @internal */
    constructor(configFileName, canonicalConfigFilePath, projectService, cachedDirectoryStructureHost, pendingUpdateReason) {
        super(configFileName, ProjectKind.Configured, projectService, 
        /*hasExplicitListOfFiles*/ false, 
        /*lastFileExceededProgramSize*/ undefined, 
        /*compilerOptions*/ {}, 
        /*compileOnSaveEnabled*/ false, 
        /*watchOptions*/ undefined, cachedDirectoryStructureHost, getDirectoryPath(configFileName));
        this.canonicalConfigFilePath = canonicalConfigFilePath;
        /** @internal */
        this.openFileWatchTriggered = new Map();
        /** @internal */
        this.initialLoadPending = true;
        /** @internal */
        this.sendLoadingProjectFinish = false;
        this.pendingUpdateLevel = ProgramUpdateLevel.Full;
        this.pendingUpdateReason = pendingUpdateReason;
    }
    /** @internal */
    setCompilerHost(host) {
        this.compilerHost = host;
    }
    /** @internal */
    getCompilerHost() {
        return this.compilerHost;
    }
    /** @internal */
    useSourceOfProjectReferenceRedirect() {
        return this.languageServiceEnabled;
    }
    /** @internal */
    getParsedCommandLine(fileName) {
        const configFileName = toNormalizedPath(fileName);
        const canonicalConfigFilePath = asNormalizedPath(this.projectService.toCanonicalFileName(configFileName));
        // Ensure the config file existience info is cached
        let configFileExistenceInfo = this.projectService.configFileExistenceInfoCache.get(canonicalConfigFilePath);
        if (!configFileExistenceInfo) {
            this.projectService.configFileExistenceInfoCache.set(canonicalConfigFilePath, configFileExistenceInfo = { exists: this.projectService.host.fileExists(configFileName) });
        }
        // Ensure we have upto date parsed command line
        this.projectService.ensureParsedConfigUptoDate(configFileName, canonicalConfigFilePath, configFileExistenceInfo, this);
        // Watch wild cards if LS is enabled
        if (this.languageServiceEnabled && this.projectService.serverMode === LanguageServiceMode.Semantic) {
            this.projectService.watchWildcards(configFileName, configFileExistenceInfo, this);
        }
        return configFileExistenceInfo.exists ? configFileExistenceInfo.config.parsedCommandLine : undefined;
    }
    /** @internal */
    onReleaseParsedCommandLine(fileName) {
        this.releaseParsedConfig(asNormalizedPath(this.projectService.toCanonicalFileName(toNormalizedPath(fileName))));
    }
    releaseParsedConfig(canonicalConfigFilePath) {
        this.projectService.stopWatchingWildCards(canonicalConfigFilePath, this);
        this.projectService.releaseParsedConfig(canonicalConfigFilePath, this);
    }
    /**
     * If the project has reload from disk pending, it reloads (and then updates graph as part of that) instead of just updating the graph
     * @returns: true if set of files in the project stays the same and false - otherwise.
     */
    updateGraph() {
        if (this.deferredClose)
            return false;
        const isDirty = this.dirty;
        this.initialLoadPending = false;
        const updateLevel = this.pendingUpdateLevel;
        this.pendingUpdateLevel = ProgramUpdateLevel.Update;
        let result;
        switch (updateLevel) {
            case ProgramUpdateLevel.RootNamesAndUpdate:
                this.openFileWatchTriggered.clear();
                result = this.projectService.reloadFileNamesOfConfiguredProject(this);
                break;
            case ProgramUpdateLevel.Full:
                this.openFileWatchTriggered.clear();
                const reason = Debug.checkDefined(this.pendingUpdateReason);
                this.projectService.reloadConfiguredProject(this, reason);
                result = true;
                break;
            default:
                result = super.updateGraph();
        }
        this.compilerHost = undefined;
        this.projectService.sendProjectLoadingFinishEvent(this);
        this.projectService.sendProjectTelemetry(this);
        if (updateLevel === ProgramUpdateLevel.Full || ( // Already sent event through reload
        result && ( // Not new program
        !isDirty ||
            !this.triggerFileForConfigFileDiag ||
            this.getCurrentProgram().structureIsReused === StructureIsReused.Completely))) {
            // Dont send the configFileDiag
            this.triggerFileForConfigFileDiag = undefined;
        }
        else if (!this.triggerFileForConfigFileDiag) {
            // If we arent tracking to send configFileDiag, send event if diagnostics presence has changed
            this.projectService.sendConfigFileDiagEvent(this, /*triggerFile*/ undefined, /*force*/ false);
        }
        return result;
    }
    /** @internal */
    getCachedDirectoryStructureHost() {
        return this.directoryStructureHost;
    }
    getConfigFilePath() {
        return asNormalizedPath(this.getProjectName());
    }
    getProjectReferences() {
        return this.projectReferences;
    }
    updateReferences(refs) {
        this.projectReferences = refs;
        this.potentialProjectReferences = undefined;
    }
    /** @internal */
    setPotentialProjectReference(canonicalConfigPath) {
        Debug.assert(this.initialLoadPending);
        (this.potentialProjectReferences || (this.potentialProjectReferences = new Set())).add(canonicalConfigPath);
    }
    /** @internal */
    getResolvedProjectReferenceToRedirect(fileName) {
        const program = this.getCurrentProgram();
        return program && program.getResolvedProjectReferenceToRedirect(fileName);
    }
    /** @internal */
    forEachResolvedProjectReference(cb) {
        var _a;
        return (_a = this.getCurrentProgram()) === null || _a === void 0 ? void 0 : _a.forEachResolvedProjectReference(cb);
    }
    /** @internal */
    enablePluginsWithOptions(options) {
        var _a;
        this.plugins.length = 0;
        if (!((_a = options.plugins) === null || _a === void 0 ? void 0 : _a.length) && !this.projectService.globalPlugins.length)
            return;
        const host = this.projectService.host;
        if (!host.require && !host.importPlugin) {
            this.projectService.logger.info("Plugins were requested but not running in environment that supports 'require'. Nothing will be loaded");
            return;
        }
        const searchPaths = this.getGlobalPluginSearchPaths();
        if (this.projectService.allowLocalPluginLoads) {
            const local = getDirectoryPath(this.canonicalConfigFilePath);
            this.projectService.logger.info(`Local plugin loading enabled; adding ${local} to search paths`);
            searchPaths.unshift(local);
        }
        // Enable tsconfig-specified plugins
        if (options.plugins) {
            for (const pluginConfigEntry of options.plugins) {
                this.enablePlugin(pluginConfigEntry, searchPaths);
            }
        }
        return this.enableGlobalPlugins(options);
    }
    /**
     * Get the errors that dont have any file name associated
     */
    getGlobalProjectErrors() {
        return filter(this.projectErrors, diagnostic => !diagnostic.file) || emptyArray;
    }
    /**
     * Get all the project errors
     */
    getAllProjectErrors() {
        return this.projectErrors || emptyArray;
    }
    setProjectErrors(projectErrors) {
        this.projectErrors = projectErrors;
    }
    close() {
        this.projectService.configFileExistenceInfoCache.forEach((_configFileExistenceInfo, canonicalConfigFilePath) => this.releaseParsedConfig(canonicalConfigFilePath));
        this.projectErrors = undefined;
        this.openFileWatchTriggered.clear();
        this.compilerHost = undefined;
        super.close();
    }
    /** @internal */
    markAsDirty() {
        if (this.deferredClose)
            return;
        super.markAsDirty();
    }
    /** @internal */
    isOrphan() {
        return !!this.deferredClose;
    }
    getEffectiveTypeRoots() {
        return getEffectiveTypeRoots(this.getCompilationSettings(), this) || [];
    }
    /** @internal */
    updateErrorOnNoInputFiles(parsedCommandLine) {
        this.parsedCommandLine = parsedCommandLine;
        updateErrorForNoInputFiles(parsedCommandLine.fileNames, this.getConfigFilePath(), this.getCompilerOptions().configFile.configFileSpecs, this.projectErrors, canJsonReportNoInputFiles(parsedCommandLine.raw));
    }
}
/**
 * Project whose configuration is handled externally, such as in a '.csproj'.
 * These are created only if a host explicitly calls `openExternalProject`.
 */
export class ExternalProject extends Project {
    /** @internal */
    constructor(externalProjectName, projectService, compilerOptions, lastFileExceededProgramSize, compileOnSaveEnabled, projectFilePath, watchOptions) {
        super(externalProjectName, ProjectKind.External, projectService, 
        /*hasExplicitListOfFiles*/ true, lastFileExceededProgramSize, compilerOptions, compileOnSaveEnabled, watchOptions, projectService.host, getDirectoryPath(projectFilePath || normalizeSlashes(externalProjectName)));
        this.externalProjectName = externalProjectName;
        this.compileOnSaveEnabled = compileOnSaveEnabled;
        this.excludedFiles = [];
        this.enableGlobalPlugins(this.getCompilerOptions());
    }
    updateGraph() {
        const result = super.updateGraph();
        this.projectService.sendProjectTelemetry(this);
        return result;
    }
    getExcludedFiles() {
        return this.excludedFiles;
    }
}
/** @internal */
export function isInferredProject(project) {
    return project.projectKind === ProjectKind.Inferred;
}
/** @internal */
export function isConfiguredProject(project) {
    return project.projectKind === ProjectKind.Configured;
}
/** @internal */
export function isExternalProject(project) {
    return project.projectKind === ProjectKind.External;
}
/**@internal */
export function isBackgroundProject(project) {
    return project.projectKind === ProjectKind.AutoImportProvider || project.projectKind === ProjectKind.Auxiliary;
}
/** @internal */
export function isProjectDeferredClose(project) {
    return isConfiguredProject(project) && !!project.deferredClose;
}
