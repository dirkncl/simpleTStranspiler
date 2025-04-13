import {
  arrayFrom,
  arrayReverseIterator,
  cast,
  computeLineAndCharacterOfPosition,
  computeLineStarts,
  concatenate,
  createQueue,
  createSet,
  createTextSpan,
  createTextSpanFromBounds,
  Debug,
  decodedTextSpanIntersectsWith,
  deduplicate,
  diagnosticCategoryName,
  displayPartsToString,
  documentSpansEqual,
  equateValues,
  filter,
  find,
  FindAllReferences,
  first,
  firstIterator,
  firstOrUndefined,
  flatMap,
  flatMapToMutable,
  flattenDiagnosticMessageText,
  forEachNameInAccessChainWalkingLeft,
  formatting,
  getDeclarationFromName,
  getDeclarationOfKind,
  getDocumentSpansEqualityComparer,
  getEmitDeclarations,
  getEntrypointsFromPackageJsonInfo,
  getLineAndCharacterOfPosition,
  getMappedContextSpan,
  getMappedDocumentSpan,
  getMappedLocation,
  getNodeModulePathParts,
  getNormalizedAbsolutePath,
  getPackageNameFromTypesPackageName,
  getPackageScopeForPath,
  getSnapshotText,
  getSupportedCodeFixes,
  getTemporaryModuleResolutionState,
  getTextOfIdentifierOrLiteral,
  getTouchingPropertyName,
  GoToDefinition,
  identity,
  isAccessExpression,
  isArray,
  isDeclarationFileName,
  isIdentifier,
  isString,
  isStringLiteralLike,
  LanguageServiceMode,
  map,
  mapDefined,
  mapDefinedIterator,
  mapIterator,
  mapOneOrMany,
  memoize,
  ModuleResolutionKind,
  nodeModulesPathPart,
  normalizePath,
  OperationCanceledException,
  OrganizeImportsMode,
  removeFileExtension,
  SemanticClassificationFormat,
  singleIterator,
  some,
  startsWith,
  SyntaxKind,
  textSpanEnd,
  timestamp,
  toArray,
  toFileNameLowerCase,
  tracing,
  unmangleScopedPackageName,
  version,
} from "./namespaces/ts.js";

import {
  CloseFileWatcherEvent,
  ConfigFileDiagEvent,
  ConfiguredProjectLoadKind,
  convertFormatOptions,
  convertScriptKindName,
  convertUserPreferences,
  CreateDirectoryWatcherEvent,
  CreateFileWatcherEvent,
  emptyArray,
  Errors,
  GcTimer,
  indent,
  isConfigFile,
  isConfiguredProject,
  isDynamicFileName,
  isExternalProject,
  isInferredProject,
  LargeFileReferencedEvent,
  LogLevel,
  Msg,
  nullTypingsInstaller,
  ProjectInfoTelemetryEvent,
  ProjectKind,
  ProjectLanguageServiceStateEvent,
  ProjectLoadingFinishEvent,
  ProjectLoadingStartEvent,
  ProjectService,
  ProjectsUpdatedInBackgroundEvent,
  stringifyIndented,
  toNormalizedPath,
  updateProjectIfDirty,
} from "./namespaces/ts.server.js";

import * as protocol from "./protocol.js";

export const nullCancellationToken = {
    isCancellationRequested: () => false,
    setRequest: () => void 0,
    resetRequest: () => void 0,
};

function hrTimeToMilliseconds(time) {
    const seconds = time[0];
    const nanoseconds = time[1];
    return ((1e9 * seconds) + nanoseconds) / 1000000.0;
}

function isDeclarationFileInJSOnlyNonConfiguredProject(project, file) {
    // Checking for semantic diagnostics is an expensive process. We want to avoid it if we
    // know for sure it is not needed.
    // For instance, .d.ts files injected by ATA automatically do not produce any relevant
    // errors to a JS- only project.
    //
    // Note that configured projects can set skipLibCheck (on by default in jsconfig.json) to
    // disable checking for declaration files. We only need to verify for inferred projects (e.g.
    // miscellaneous context in VS) and external projects(e.g.VS.csproj project) with only JS
    // files.
    //
    // We still want to check .js files in a JS-only inferred or external project (e.g. if the
    // file has '// @ts-check').
    if ((isInferredProject(project) || isExternalProject(project)) &&
        project.isJsOnlyProject()) {
        const scriptInfo = project.getScriptInfoForNormalizedPath(file);
        return scriptInfo && !scriptInfo.isJavaScript();
    }
    return false;
}

function dtsChangeCanAffectEmit(compilationSettings) {
    return getEmitDeclarations(compilationSettings) || !!compilationSettings.emitDecoratorMetadata;
}

function formatDiag(fileName, project, diag) {
    const scriptInfo = project.getScriptInfoForNormalizedPath(fileName); // TODO: GH#18217
    return {
        start: scriptInfo.positionToLineOffset(diag.start),
        end: scriptInfo.positionToLineOffset(diag.start + diag.length), // TODO: GH#18217
        text: flattenDiagnosticMessageText(diag.messageText, "\n"),
        code: diag.code,
        category: diagnosticCategoryName(diag),
        reportsUnnecessary: diag.reportsUnnecessary,
        reportsDeprecated: diag.reportsDeprecated,
        source: diag.source,
        relatedInformation: map(diag.relatedInformation, formatRelatedInformation),
    };
}
function formatRelatedInformation(info) {
    if (!info.file) {
        return {
            message: flattenDiagnosticMessageText(info.messageText, "\n"),
            category: diagnosticCategoryName(info),
            code: info.code,
        };
    }
    return {
        span: {
            start: convertToLocation(getLineAndCharacterOfPosition(info.file, info.start)),
            end: convertToLocation(getLineAndCharacterOfPosition(info.file, info.start + info.length)), // TODO: GH#18217
            file: info.file.fileName,
        },
        message: flattenDiagnosticMessageText(info.messageText, "\n"),
        category: diagnosticCategoryName(info),
        code: info.code,
    };
}

function convertToLocation(lineAndCharacter) {
    return { line: lineAndCharacter.line + 1, offset: lineAndCharacter.character + 1 };
}

/** @internal */
export function formatDiagnosticToProtocol(diag, includeFileName) {
    const start = (diag.file && convertToLocation(getLineAndCharacterOfPosition(diag.file, diag.start))); // TODO: GH#18217
    const end = (diag.file && convertToLocation(getLineAndCharacterOfPosition(diag.file, diag.start + diag.length))); // TODO: GH#18217
    const text = flattenDiagnosticMessageText(diag.messageText, "\n");
    const { code, source } = diag;
    const category = diagnosticCategoryName(diag);
    const common = {
        start,
        end,
        text,
        code,
        category,
        reportsUnnecessary: diag.reportsUnnecessary,
        reportsDeprecated: diag.reportsDeprecated,
        source,
        relatedInformation: map(diag.relatedInformation, formatRelatedInformation),
    };
    return includeFileName
        ? { ...common, fileName: diag.file && diag.file.fileName }
        : common;
}

function allEditsBeforePos(edits, pos) {
    return edits.every(edit => textSpanEnd(edit.span) < pos);
}

/** @deprecated use ts.server.protocol.CommandTypes */
export const CommandNames = protocol.CommandTypes;

export function formatMessage(msg, logger, byteLength, newLine) {
    const verboseLogging = logger.hasLevel(LogLevel.verbose);
    const json = JSON.stringify(msg);
    if (verboseLogging) {
        logger.info(`${msg.type}:${stringifyIndented(msg)}`);
    }
    const len = byteLength(json, "utf8");
    return `Content-Length: ${1 + len}\r\n\r\n${json}${newLine}`;
}

/**
 * Represents operation that can schedule its next step to be executed later.
 * Scheduling is done via instance of NextStep. If on current step subsequent step was not scheduled - operation is assumed to be completed.
 */
class MultistepOperation {
    constructor(operationHost) {
        this.operationHost = operationHost;
    }
    startNew(action) {
        this.complete();
        this.requestId = this.operationHost.getCurrentRequestId();
        this.executeAction(action);
    }
    complete() {
        if (this.requestId !== undefined) {
            this.operationHost.sendRequestCompletedEvent(this.requestId, this.performanceData);
            this.requestId = undefined;
        }
        this.setTimerHandle(undefined);
        this.setImmediateId(undefined);
        this.performanceData = undefined;
    }
    immediate(actionType, action) {
        const requestId = this.requestId;
        Debug.assert(requestId === this.operationHost.getCurrentRequestId(), "immediate: incorrect request id");
        this.setImmediateId(this.operationHost.getServerHost().setImmediate(() => {
            this.immediateId = undefined;
            this.operationHost.executeWithRequestId(requestId, () => this.executeAction(action), this.performanceData);
        }, actionType));
    }
    delay(actionType, ms, action) {
        const requestId = this.requestId;
        Debug.assert(requestId === this.operationHost.getCurrentRequestId(), "delay: incorrect request id");
        this.setTimerHandle(this.operationHost.getServerHost().setTimeout(() => {
            this.timerHandle = undefined;
            this.operationHost.executeWithRequestId(requestId, () => this.executeAction(action), this.performanceData);
        }, ms, actionType));
    }
    executeAction(action) {
        let stop = false;
        try {
            if (this.operationHost.isCancellationRequested()) {
                stop = true;
                tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "stepCanceled", { seq: this.requestId, early: true });
            }
            else {
                tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "stepAction", { seq: this.requestId });
                action(this);
                tracing === null || tracing === void 0 ? void 0 : tracing.pop();
            }
        }
        catch (e) {
            // Cancellation or an error may have left incomplete events on the tracing stack.
            tracing === null || tracing === void 0 ? void 0 : tracing.popAll();
            stop = true;
            // ignore cancellation request
            if (e instanceof OperationCanceledException) {
                tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "stepCanceled", { seq: this.requestId });
            }
            else {
                tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "stepError", { seq: this.requestId, message: e.message });
                this.operationHost.logError(e, `delayed processing of request ${this.requestId}`);
            }
        }
        this.performanceData = this.operationHost.getPerformanceData();
        if (stop || !this.hasPendingWork()) {
            this.complete();
        }
    }
    setTimerHandle(timerHandle) {
        if (this.timerHandle !== undefined) {
            this.operationHost.getServerHost().clearTimeout(this.timerHandle);
        }
        this.timerHandle = timerHandle;
    }
    setImmediateId(immediateId) {
        if (this.immediateId !== undefined) {
            this.operationHost.getServerHost().clearImmediate(this.immediateId);
        }
        this.immediateId = immediateId;
    }
    hasPendingWork() {
        return !!this.timerHandle || !!this.immediateId;
    }
}

/** @internal */
export function toEvent(eventName, body) {
    return {
        seq: 0,
        type: "event",
        event: eventName,
        body,
    };
}

/**
 * This helper function processes a list of projects and return the concatenated, sortd and deduplicated output of processing each project.
 */
function combineProjectOutput(defaultValue, getValue, projects, action) {
    const outputs = flatMapToMutable(isArray(projects) ? projects : projects.projects, project => action(project, defaultValue));
    if (!isArray(projects) && projects.symLinkedProjects) {
        projects.symLinkedProjects.forEach((projects, path) => {
            const value = getValue(path);
            outputs.push(...flatMap(projects, project => action(project, value)));
        });
    }
    return deduplicate(outputs, equateValues);
}

function createDocumentSpanSet(useCaseSensitiveFileNames) {
    return createSet(({ textSpan }) => textSpan.start + 100003 * textSpan.length, getDocumentSpansEqualityComparer(useCaseSensitiveFileNames));
}

function getRenameLocationsWorker(projects, defaultProject, initialLocation, findInStrings, findInComments, preferences, useCaseSensitiveFileNames) {
    const perProjectResults = getPerProjectReferences(projects, defaultProject, initialLocation, getDefinitionLocation(defaultProject, initialLocation, /*isForRename*/ true), mapDefinitionInProject, (project, position) => project.getLanguageService().findRenameLocations(position.fileName, position.pos, findInStrings, findInComments, preferences), (renameLocation, cb) => cb(documentSpanLocation(renameLocation)));
    // No filtering or dedup'ing is required if there's exactly one project
    if (isArray(perProjectResults)) {
        return perProjectResults;
    }
    const results = [];
    const seen = createDocumentSpanSet(useCaseSensitiveFileNames);
    perProjectResults.forEach((projectResults, project) => {
        for (const result of projectResults) {
            // If there's a mapped location, it'll appear in the results for another project
            if (!seen.has(result) && !getMappedLocationForProject(documentSpanLocation(result), project)) {
                results.push(result);
                seen.add(result);
            }
        }
    });
    return results;
}

function getDefinitionLocation(defaultProject, initialLocation, isForRename) {
    const infos = defaultProject.getLanguageService().getDefinitionAtPosition(initialLocation.fileName, initialLocation.pos, /*searchOtherFilesOnly*/ false, /*stopAtAlias*/ isForRename);
    const info = infos && firstOrUndefined(infos);
    // Note that the value of `isLocal` may depend on whether or not the checker has run on the containing file
    // (implying that FAR cascading behavior may depend on request order)
    return info && !info.isLocal ? { fileName: info.fileName, pos: info.textSpan.start } : undefined;
}

function getReferencesWorker(projects, defaultProject, initialLocation, useCaseSensitiveFileNames, logger) {
    var _a, _b;
    const perProjectResults = getPerProjectReferences(projects, defaultProject, initialLocation, getDefinitionLocation(defaultProject, initialLocation, /*isForRename*/ false), mapDefinitionInProject, (project, position) => {
        logger.info(`Finding references to ${position.fileName} position ${position.pos} in project ${project.getProjectName()}`);
        return project.getLanguageService().findReferences(position.fileName, position.pos);
    }, (referencedSymbol, cb) => {
        cb(documentSpanLocation(referencedSymbol.definition));
        for (const ref of referencedSymbol.references) {
            cb(documentSpanLocation(ref));
        }
    });
    // No re-mapping or isDefinition updatses are required if there's exactly one project
    if (isArray(perProjectResults)) {
        return perProjectResults;
    }
    // `isDefinition` is only (definitely) correct in `defaultProject` because we might
    // have started the other project searches from related symbols.  Propagate the
    // correct results to all other projects.
    const defaultProjectResults = perProjectResults.get(defaultProject);
    if (((_b = (_a = defaultProjectResults === null || defaultProjectResults === void 0 ? void 0 : defaultProjectResults[0]) === null || _a === void 0 ? void 0 : _a.references[0]) === null || _b === void 0 ? void 0 : _b.isDefinition) === undefined) {
        // Clear all isDefinition properties
        perProjectResults.forEach(projectResults => {
            for (const referencedSymbol of projectResults) {
                for (const ref of referencedSymbol.references) {
                    delete ref.isDefinition;
                }
            }
        });
    }
    else {
        // Correct isDefinition properties from projects other than defaultProject
        const knownSymbolSpans = createDocumentSpanSet(useCaseSensitiveFileNames);
        for (const referencedSymbol of defaultProjectResults) {
            for (const ref of referencedSymbol.references) {
                if (ref.isDefinition) {
                    knownSymbolSpans.add(ref);
                    // One is enough - updateIsDefinitionOfReferencedSymbols will fill out the set based on symbols
                    break;
                }
            }
        }
        const updatedProjects = new Set();
        while (true) {
            let progress = false;
            perProjectResults.forEach((referencedSymbols, project) => {
                if (updatedProjects.has(project))
                    return;
                const updated = project.getLanguageService().updateIsDefinitionOfReferencedSymbols(referencedSymbols, knownSymbolSpans);
                if (updated) {
                    updatedProjects.add(project);
                    progress = true;
                }
            });
            if (!progress)
                break;
        }
        perProjectResults.forEach((referencedSymbols, project) => {
            if (updatedProjects.has(project))
                return;
            for (const referencedSymbol of referencedSymbols) {
                for (const ref of referencedSymbol.references) {
                    ref.isDefinition = false;
                }
            }
        });
    }
    // We need to de-duplicate and aggregate the results by choosing an authoritative version
    // of each definition and merging references from all the projects where they appear.
    const results = [];
    const seenRefs = createDocumentSpanSet(useCaseSensitiveFileNames); // It doesn't make sense to have a reference in two definition lists, so we de-dup globally
    // TODO: We might end up with a more logical allocation of refs to defs if we pre-sorted the defs by descending ref-count.
    // Otherwise, it just ends up attached to the first corresponding def we happen to process.  The others may or may not be
    // dropped later when we check for defs with ref-count 0.
    perProjectResults.forEach((projectResults, project) => {
        for (const referencedSymbol of projectResults) {
            const mappedDefinitionFile = getMappedLocationForProject(documentSpanLocation(referencedSymbol.definition), project);
            const definition = mappedDefinitionFile === undefined ?
                referencedSymbol.definition :
                {
                    ...referencedSymbol.definition,
                    textSpan: createTextSpan(mappedDefinitionFile.pos, referencedSymbol.definition.textSpan.length), // Why would the length be the same in the original?
                    fileName: mappedDefinitionFile.fileName,
                    contextSpan: getMappedContextSpanForProject(referencedSymbol.definition, project),
                };
            let symbolToAddTo = find(results, o => documentSpansEqual(o.definition, definition, useCaseSensitiveFileNames));
            if (!symbolToAddTo) {
                symbolToAddTo = { definition, references: [] };
                results.push(symbolToAddTo);
            }
            for (const ref of referencedSymbol.references) {
                if (!seenRefs.has(ref) && !getMappedLocationForProject(documentSpanLocation(ref), project)) {
                    seenRefs.add(ref);
                    symbolToAddTo.references.push(ref);
                }
            }
        }
    });
    return results.filter(o => o.references.length !== 0);
}
function forEachProjectInProjects(projects, path, cb) {
    for (const project of isArray(projects) ? projects : projects.projects) {
        cb(project, path);
    }
    if (!isArray(projects) && projects.symLinkedProjects) {
        projects.symLinkedProjects.forEach((symlinkedProjects, symlinkedPath) => {
            for (const project of symlinkedProjects) {
                cb(project, symlinkedPath);
            }
        });
    }
}
/**
 * @param projects Projects initially known to contain {@link initialLocation}
 * @param defaultProject The default project containing {@link initialLocation}
 * @param initialLocation Where the search operation was triggered
 * @param getResultsForPosition This is where you plug in `findReferences`, `renameLocation`, etc
 * @param forPositionInResult Given an item returned by {@link getResultsForPosition} enumerate the positions referred to by that result
 * @returns In the common case where there's only one project, returns an array of results from {@link getResultsForPosition}.
 * If multiple projects were searched - even if they didn't return results - the result will be a map from project to per-project results.
 */
function getPerProjectReferences(projects, defaultProject, initialLocation, defaultDefinition, mapDefinitionInProject, getResultsForPosition, forPositionInResult) {
    // If `getResultsForPosition` returns results for a project, they go in here
    const resultsMap = new Map();
    const queue = createQueue();
    // In order to get accurate isDefinition values for `defaultProject`,
    // we need to ensure that it is searched from `initialLocation`.
    // The easiest way to do this is to search it first.
    queue.enqueue({ project: defaultProject, location: initialLocation });
    // This will queue `defaultProject` a second time, but it will be dropped
    // as a dup when it is dequeued.
    forEachProjectInProjects(projects, initialLocation.fileName, (project, path) => {
        const location = { fileName: path, pos: initialLocation.pos };
        queue.enqueue({ project, location });
    });
    const projectService = defaultProject.projectService;
    const cancellationToken = defaultProject.getCancellationToken();
    // Don't call these unless !!defaultDefinition
    const getGeneratedDefinition = memoize(() => defaultProject.isSourceOfProjectReferenceRedirect(defaultDefinition.fileName) ?
        defaultDefinition :
        defaultProject.getLanguageService().getSourceMapper().tryGetGeneratedPosition(defaultDefinition));
    const getSourceDefinition = memoize(() => defaultProject.isSourceOfProjectReferenceRedirect(defaultDefinition.fileName) ?
        defaultDefinition :
        defaultProject.getLanguageService().getSourceMapper().tryGetSourcePosition(defaultDefinition));
    // The keys of resultsMap allow us to check which projects have already been searched, but we also
    // maintain a set of strings because that's what `loadAncestorProjectTree` wants.
    const searchedProjectKeys = new Set();
    onCancellation: while (!queue.isEmpty()) {
        while (!queue.isEmpty()) {
            if (cancellationToken.isCancellationRequested())
                break onCancellation;
            const { project, location } = queue.dequeue();
            if (resultsMap.has(project))
                continue;
            if (isLocationProjectReferenceRedirect(project, location))
                continue;
            // The project could be dirty and could no longer contain the location's file after it's updated,
            // so we need to update the project and check if it still contains the file.
            updateProjectIfDirty(project);
            if (!project.containsFile(toNormalizedPath(location.fileName))) {
                continue;
            }
            const projectResults = searchPosition(project, location);
            resultsMap.set(project, projectResults !== null && projectResults !== void 0 ? projectResults : emptyArray);
            searchedProjectKeys.add(getProjectKey(project));
        }
        // At this point, we know about all projects passed in as arguments and any projects in which
        // `getResultsForPosition` has returned results.  We expand that set to include any projects
        // downstream from any of these and then queue new initial-position searches for any new project
        // containing `initialLocation`.
        if (defaultDefinition) {
            // This seems to mean "load all projects downstream from any member of `seenProjects`".
            projectService.loadAncestorProjectTree(searchedProjectKeys);
            projectService.forEachEnabledProject(project => {
                if (cancellationToken.isCancellationRequested())
                    return; // There's no mechanism for skipping the remaining projects
                if (resultsMap.has(project))
                    return; // Can loop forever without this (enqueue here, dequeue above, repeat)
                const location = mapDefinitionInProject(defaultDefinition, project, getGeneratedDefinition, getSourceDefinition);
                if (location) {
                    queue.enqueue({ project, location });
                }
            });
        }
    }
    // In the common case where there's only one project, return a simpler result to make
    // it easier for the caller to skip post-processing.
    if (resultsMap.size === 1) {
        return firstIterator(resultsMap.values());
    }
    return resultsMap;
    function searchPosition(project, location) {
        const projectResults = getResultsForPosition(project, location);
        if (!projectResults || !forPositionInResult)
            return projectResults;
        for (const result of projectResults) {
            forPositionInResult(result, position => {
                // This may trigger a search for a tsconfig, but there are several layers of caching that make it inexpensive
                const originalLocation = projectService.getOriginalLocationEnsuringConfiguredProject(project, position);
                if (!originalLocation)
                    return;
                const originalScriptInfo = projectService.getScriptInfo(originalLocation.fileName);
                for (const project of originalScriptInfo.containingProjects) {
                    if (!project.isOrphan() && !resultsMap.has(project)) { // Optimization: don't enqueue if will be discarded
                        queue.enqueue({ project, location: originalLocation });
                    }
                }
                const symlinkedProjectsMap = projectService.getSymlinkedProjects(originalScriptInfo);
                if (symlinkedProjectsMap) {
                    symlinkedProjectsMap.forEach((symlinkedProjects, symlinkedPath) => {
                        for (const symlinkedProject of symlinkedProjects) {
                            if (!symlinkedProject.isOrphan() && !resultsMap.has(symlinkedProject)) { // Optimization: don't enqueue if will be discarded
                                queue.enqueue({ project: symlinkedProject, location: { fileName: symlinkedPath, pos: originalLocation.pos } });
                            }
                        }
                    });
                }
            });
        }
        return projectResults;
    }
}
function mapDefinitionInProjectIfFileInProject(definition, project) {
    // If the definition is actually from the project, definition is correct as is
    if (project.containsFile(toNormalizedPath(definition.fileName)) &&
        !isLocationProjectReferenceRedirect(project, definition)) {
        return definition;
    }
}
function mapDefinitionInProject(definition, project, getGeneratedDefinition, getSourceDefinition) {
    // If the definition is actually from the project, definition is correct as is
    const result = mapDefinitionInProjectIfFileInProject(definition, project);
    if (result)
        return result;
    const generatedDefinition = getGeneratedDefinition();
    if (generatedDefinition && project.containsFile(toNormalizedPath(generatedDefinition.fileName)))
        return generatedDefinition;
    const sourceDefinition = getSourceDefinition();
    return sourceDefinition && project.containsFile(toNormalizedPath(sourceDefinition.fileName)) ? sourceDefinition : undefined;
}
function isLocationProjectReferenceRedirect(project, location) {
    if (!location)
        return false;
    const program = project.getLanguageService().getProgram();
    if (!program)
        return false;
    const sourceFile = program.getSourceFile(location.fileName);
    // It is possible that location is attached to project but
    // the program actually includes its redirect instead.
    // This happens when rootFile in project is one of the file from referenced project
    // Thus root is attached but program doesnt have the actual .ts file but .d.ts
    // If this is not the file we were actually looking, return rest of the toDo
    return !!sourceFile &&
        sourceFile.resolvedPath !== sourceFile.path &&
        sourceFile.resolvedPath !== project.toPath(location.fileName);
}
function getProjectKey(project) {
    return isConfiguredProject(project) ? project.canonicalConfigFilePath : project.getProjectName();
}
function documentSpanLocation({ fileName, textSpan }) {
    return { fileName, pos: textSpan.start };
}
function getMappedLocationForProject(location, project) {
    return getMappedLocation(location, project.getSourceMapper(), p => project.projectService.fileExists(p));
}
function getMappedDocumentSpanForProject(documentSpan, project) {
    return getMappedDocumentSpan(documentSpan, project.getSourceMapper(), p => project.projectService.fileExists(p));
}
function getMappedContextSpanForProject(documentSpan, project) {
    return getMappedContextSpan(documentSpan, project.getSourceMapper(), p => project.projectService.fileExists(p));
}
const invalidPartialSemanticModeCommands = [
    protocol.CommandTypes.OpenExternalProject,
    protocol.CommandTypes.OpenExternalProjects,
    protocol.CommandTypes.CloseExternalProject,
    protocol.CommandTypes.SynchronizeProjectList,
    protocol.CommandTypes.EmitOutput,
    protocol.CommandTypes.CompileOnSaveAffectedFileList,
    protocol.CommandTypes.CompileOnSaveEmitFile,
    protocol.CommandTypes.CompilerOptionsDiagnosticsFull,
    protocol.CommandTypes.EncodedSemanticClassificationsFull,
    protocol.CommandTypes.SemanticDiagnosticsSync,
    protocol.CommandTypes.SuggestionDiagnosticsSync,
    protocol.CommandTypes.GeterrForProject,
    protocol.CommandTypes.Reload,
    protocol.CommandTypes.ReloadProjects,
    protocol.CommandTypes.GetCodeFixes,
    protocol.CommandTypes.GetCodeFixesFull,
    protocol.CommandTypes.GetCombinedCodeFix,
    protocol.CommandTypes.GetCombinedCodeFixFull,
    protocol.CommandTypes.ApplyCodeActionCommand,
    protocol.CommandTypes.GetSupportedCodeFixes,
    protocol.CommandTypes.GetApplicableRefactors,
    protocol.CommandTypes.GetMoveToRefactoringFileSuggestions,
    protocol.CommandTypes.GetEditsForRefactor,
    protocol.CommandTypes.GetEditsForRefactorFull,
    protocol.CommandTypes.OrganizeImports,
    protocol.CommandTypes.OrganizeImportsFull,
    protocol.CommandTypes.GetEditsForFileRename,
    protocol.CommandTypes.GetEditsForFileRenameFull,
    protocol.CommandTypes.PrepareCallHierarchy,
    protocol.CommandTypes.ProvideCallHierarchyIncomingCalls,
    protocol.CommandTypes.ProvideCallHierarchyOutgoingCalls,
    protocol.CommandTypes.GetPasteEdits,
    protocol.CommandTypes.CopilotRelated,
];
const invalidSyntacticModeCommands = [
    ...invalidPartialSemanticModeCommands,
    protocol.CommandTypes.Definition,
    protocol.CommandTypes.DefinitionFull,
    protocol.CommandTypes.DefinitionAndBoundSpan,
    protocol.CommandTypes.DefinitionAndBoundSpanFull,
    protocol.CommandTypes.TypeDefinition,
    protocol.CommandTypes.Implementation,
    protocol.CommandTypes.ImplementationFull,
    protocol.CommandTypes.References,
    protocol.CommandTypes.ReferencesFull,
    protocol.CommandTypes.Rename,
    protocol.CommandTypes.RenameLocationsFull,
    protocol.CommandTypes.RenameInfoFull,
    protocol.CommandTypes.Quickinfo,
    protocol.CommandTypes.QuickinfoFull,
    protocol.CommandTypes.CompletionInfo,
    protocol.CommandTypes.Completions,
    protocol.CommandTypes.CompletionsFull,
    protocol.CommandTypes.CompletionDetails,
    protocol.CommandTypes.CompletionDetailsFull,
    protocol.CommandTypes.SignatureHelp,
    protocol.CommandTypes.SignatureHelpFull,
    protocol.CommandTypes.Navto,
    protocol.CommandTypes.NavtoFull,
    protocol.CommandTypes.DocumentHighlights,
    protocol.CommandTypes.DocumentHighlightsFull,
    protocol.CommandTypes.PreparePasteEdits,
];
export class Session {
    constructor(opts) {
        this.changeSeq = 0;
        // Minimum number of lines for attempting to use region diagnostics for a file.
        /** @internal */
        this.regionDiagLineCountThreshold = 500;
        this.handlers = new Map(Object.entries({
            [protocol.CommandTypes.Status]: () => {
                const response = { version };
                return this.requiredResponse(response);
            },
            [protocol.CommandTypes.OpenExternalProject]: (request) => {
                this.projectService.openExternalProject(request.arguments, /*cleanupAfter*/ true);
                // TODO: GH#20447 report errors
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.OpenExternalProjects]: (request) => {
                this.projectService.openExternalProjects(request.arguments.projects);
                // TODO: GH#20447 report errors
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.CloseExternalProject]: (request) => {
                this.projectService.closeExternalProject(request.arguments.projectFileName, /*cleanupAfter*/ true);
                // TODO: GH#20447 report errors
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.SynchronizeProjectList]: (request) => {
                const result = this.projectService.synchronizeProjectList(request.arguments.knownProjects, request.arguments.includeProjectReferenceRedirectInfo);
                if (!result.some(p => p.projectErrors && p.projectErrors.length !== 0)) {
                    return this.requiredResponse(result);
                }
                const converted = map(result, p => {
                    if (!p.projectErrors || p.projectErrors.length === 0) {
                        return p;
                    }
                    return {
                        info: p.info,
                        changes: p.changes,
                        files: p.files,
                        projectErrors: this.convertToDiagnosticsWithLinePosition(p.projectErrors, /*scriptInfo*/ undefined),
                    };
                });
                return this.requiredResponse(converted);
            },
            [protocol.CommandTypes.UpdateOpen]: (request) => {
                this.changeSeq++;
                this.projectService.applyChangesInOpenFiles(request.arguments.openFiles && mapIterator(request.arguments.openFiles, file => ({
                    fileName: file.file,
                    content: file.fileContent,
                    scriptKind: file.scriptKindName,
                    projectRootPath: file.projectRootPath,
                })), request.arguments.changedFiles && mapIterator(request.arguments.changedFiles, file => ({
                    fileName: file.fileName,
                    changes: mapDefinedIterator(arrayReverseIterator(file.textChanges), change => {
                        const scriptInfo = Debug.checkDefined(this.projectService.getScriptInfo(file.fileName));
                        const start = scriptInfo.lineOffsetToPosition(change.start.line, change.start.offset);
                        const end = scriptInfo.lineOffsetToPosition(change.end.line, change.end.offset);
                        return start >= 0 ? { span: { start, length: end - start }, newText: change.newText } : undefined;
                    }),
                })), request.arguments.closedFiles);
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.ApplyChangedToOpenFiles]: (request) => {
                this.changeSeq++;
                this.projectService.applyChangesInOpenFiles(request.arguments.openFiles, request.arguments.changedFiles && mapIterator(request.arguments.changedFiles, file => ({
                    fileName: file.fileName,
                    // apply changes in reverse order
                    changes: arrayReverseIterator(file.changes),
                })), request.arguments.closedFiles);
                // TODO: report errors
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.Exit]: () => {
                this.exit();
                return this.notRequired(/*request*/ undefined);
            },
            [protocol.CommandTypes.Definition]: (request) => {
                return this.requiredResponse(this.getDefinition(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.DefinitionFull]: (request) => {
                return this.requiredResponse(this.getDefinition(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.DefinitionAndBoundSpan]: (request) => {
                return this.requiredResponse(this.getDefinitionAndBoundSpan(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.DefinitionAndBoundSpanFull]: (request) => {
                return this.requiredResponse(this.getDefinitionAndBoundSpan(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.FindSourceDefinition]: (request) => {
                return this.requiredResponse(this.findSourceDefinition(request.arguments));
            },
            [protocol.CommandTypes.EmitOutput]: (request) => {
                return this.requiredResponse(this.getEmitOutput(request.arguments));
            },
            [protocol.CommandTypes.TypeDefinition]: (request) => {
                return this.requiredResponse(this.getTypeDefinition(request.arguments));
            },
            [protocol.CommandTypes.Implementation]: (request) => {
                return this.requiredResponse(this.getImplementation(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.ImplementationFull]: (request) => {
                return this.requiredResponse(this.getImplementation(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.References]: (request) => {
                return this.requiredResponse(this.getReferences(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.ReferencesFull]: (request) => {
                return this.requiredResponse(this.getReferences(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.Rename]: (request) => {
                return this.requiredResponse(this.getRenameLocations(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.RenameLocationsFull]: (request) => {
                return this.requiredResponse(this.getRenameLocations(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.RenameInfoFull]: (request) => {
                return this.requiredResponse(this.getRenameInfo(request.arguments));
            },
            [protocol.CommandTypes.Open]: (request) => {
                this.openClientFile(toNormalizedPath(request.arguments.file), request.arguments.fileContent, convertScriptKindName(request.arguments.scriptKindName), // TODO: GH#18217
                request.arguments.projectRootPath ? toNormalizedPath(request.arguments.projectRootPath) : undefined);
                return this.notRequired(request);
            },
            [protocol.CommandTypes.Quickinfo]: (request) => {
                return this.requiredResponse(this.getQuickInfoWorker(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.QuickinfoFull]: (request) => {
                return this.requiredResponse(this.getQuickInfoWorker(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.GetOutliningSpans]: (request) => {
                return this.requiredResponse(this.getOutliningSpans(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.GetOutliningSpansFull]: (request) => {
                return this.requiredResponse(this.getOutliningSpans(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.TodoComments]: (request) => {
                return this.requiredResponse(this.getTodoComments(request.arguments));
            },
            [protocol.CommandTypes.Indentation]: (request) => {
                return this.requiredResponse(this.getIndentation(request.arguments));
            },
            [protocol.CommandTypes.NameOrDottedNameSpan]: (request) => {
                return this.requiredResponse(this.getNameOrDottedNameSpan(request.arguments));
            },
            [protocol.CommandTypes.BreakpointStatement]: (request) => {
                return this.requiredResponse(this.getBreakpointStatement(request.arguments));
            },
            [protocol.CommandTypes.BraceCompletion]: (request) => {
                return this.requiredResponse(this.isValidBraceCompletion(request.arguments));
            },
            [protocol.CommandTypes.DocCommentTemplate]: (request) => {
                return this.requiredResponse(this.getDocCommentTemplate(request.arguments));
            },
            [protocol.CommandTypes.GetSpanOfEnclosingComment]: (request) => {
                return this.requiredResponse(this.getSpanOfEnclosingComment(request.arguments));
            },
            [protocol.CommandTypes.FileReferences]: (request) => {
                return this.requiredResponse(this.getFileReferences(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.FileReferencesFull]: (request) => {
                return this.requiredResponse(this.getFileReferences(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.Format]: (request) => {
                return this.requiredResponse(this.getFormattingEditsForRange(request.arguments));
            },
            [protocol.CommandTypes.Formatonkey]: (request) => {
                return this.requiredResponse(this.getFormattingEditsAfterKeystroke(request.arguments));
            },
            [protocol.CommandTypes.FormatFull]: (request) => {
                return this.requiredResponse(this.getFormattingEditsForDocumentFull(request.arguments));
            },
            [protocol.CommandTypes.FormatonkeyFull]: (request) => {
                return this.requiredResponse(this.getFormattingEditsAfterKeystrokeFull(request.arguments));
            },
            [protocol.CommandTypes.FormatRangeFull]: (request) => {
                return this.requiredResponse(this.getFormattingEditsForRangeFull(request.arguments));
            },
            [protocol.CommandTypes.CompletionInfo]: (request) => {
                return this.requiredResponse(this.getCompletions(request.arguments, protocol.CommandTypes.CompletionInfo));
            },
            [protocol.CommandTypes.Completions]: (request) => {
                return this.requiredResponse(this.getCompletions(request.arguments, protocol.CommandTypes.Completions));
            },
            [protocol.CommandTypes.CompletionsFull]: (request) => {
                return this.requiredResponse(this.getCompletions(request.arguments, protocol.CommandTypes.CompletionsFull));
            },
            [protocol.CommandTypes.CompletionDetails]: (request) => {
                return this.requiredResponse(this.getCompletionEntryDetails(request.arguments, /*fullResult*/ false));
            },
            [protocol.CommandTypes.CompletionDetailsFull]: (request) => {
                return this.requiredResponse(this.getCompletionEntryDetails(request.arguments, /*fullResult*/ true));
            },
            [protocol.CommandTypes.CompileOnSaveAffectedFileList]: (request) => {
                return this.requiredResponse(this.getCompileOnSaveAffectedFileList(request.arguments));
            },
            [protocol.CommandTypes.CompileOnSaveEmitFile]: (request) => {
                return this.requiredResponse(this.emitFile(request.arguments));
            },
            [protocol.CommandTypes.SignatureHelp]: (request) => {
                return this.requiredResponse(this.getSignatureHelpItems(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.SignatureHelpFull]: (request) => {
                return this.requiredResponse(this.getSignatureHelpItems(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.CompilerOptionsDiagnosticsFull]: (request) => {
                return this.requiredResponse(this.getCompilerOptionsDiagnostics(request.arguments));
            },
            [protocol.CommandTypes.EncodedSyntacticClassificationsFull]: (request) => {
                return this.requiredResponse(this.getEncodedSyntacticClassifications(request.arguments));
            },
            [protocol.CommandTypes.EncodedSemanticClassificationsFull]: (request) => {
                return this.requiredResponse(this.getEncodedSemanticClassifications(request.arguments));
            },
            [protocol.CommandTypes.Cleanup]: () => {
                this.cleanup();
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.SemanticDiagnosticsSync]: (request) => {
                return this.requiredResponse(this.getSemanticDiagnosticsSync(request.arguments));
            },
            [protocol.CommandTypes.SyntacticDiagnosticsSync]: (request) => {
                return this.requiredResponse(this.getSyntacticDiagnosticsSync(request.arguments));
            },
            [protocol.CommandTypes.SuggestionDiagnosticsSync]: (request) => {
                return this.requiredResponse(this.getSuggestionDiagnosticsSync(request.arguments));
            },
            [protocol.CommandTypes.Geterr]: (request) => {
                this.errorCheck.startNew(next => this.getDiagnostics(next, request.arguments.delay, request.arguments.files));
                return this.notRequired(/*request*/ undefined);
            },
            [protocol.CommandTypes.GeterrForProject]: (request) => {
                this.errorCheck.startNew(next => this.getDiagnosticsForProject(next, request.arguments.delay, request.arguments.file));
                return this.notRequired(/*request*/ undefined);
            },
            [protocol.CommandTypes.Change]: (request) => {
                this.change(request.arguments);
                return this.notRequired(request);
            },
            [protocol.CommandTypes.Configure]: (request) => {
                this.projectService.setHostConfiguration(request.arguments);
                return this.notRequired(request);
            },
            [protocol.CommandTypes.Reload]: (request) => {
                this.reload(request.arguments);
                return this.requiredResponse({ reloadFinished: true });
            },
            [protocol.CommandTypes.Saveto]: (request) => {
                const savetoArgs = request.arguments;
                this.saveToTmp(savetoArgs.file, savetoArgs.tmpfile);
                return this.notRequired(request);
            },
            [protocol.CommandTypes.Close]: (request) => {
                const closeArgs = request.arguments;
                this.closeClientFile(closeArgs.file);
                return this.notRequired(request);
            },
            [protocol.CommandTypes.Navto]: (request) => {
                return this.requiredResponse(this.getNavigateToItems(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.NavtoFull]: (request) => {
                return this.requiredResponse(this.getNavigateToItems(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.Brace]: (request) => {
                return this.requiredResponse(this.getBraceMatching(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.BraceFull]: (request) => {
                return this.requiredResponse(this.getBraceMatching(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.NavBar]: (request) => {
                return this.requiredResponse(this.getNavigationBarItems(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.NavBarFull]: (request) => {
                return this.requiredResponse(this.getNavigationBarItems(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.NavTree]: (request) => {
                return this.requiredResponse(this.getNavigationTree(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.NavTreeFull]: (request) => {
                return this.requiredResponse(this.getNavigationTree(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.DocumentHighlights]: (request) => {
                return this.requiredResponse(this.getDocumentHighlights(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.DocumentHighlightsFull]: (request) => {
                return this.requiredResponse(this.getDocumentHighlights(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.CompilerOptionsForInferredProjects]: (request) => {
                this.setCompilerOptionsForInferredProjects(request.arguments);
                return this.requiredResponse(/*response*/ true);
            },
            [protocol.CommandTypes.ProjectInfo]: (request) => {
                return this.requiredResponse(this.getProjectInfo(request.arguments));
            },
            [protocol.CommandTypes.ReloadProjects]: request => {
                this.projectService.reloadProjects();
                return this.notRequired(request);
            },
            [protocol.CommandTypes.JsxClosingTag]: (request) => {
                return this.requiredResponse(this.getJsxClosingTag(request.arguments));
            },
            [protocol.CommandTypes.LinkedEditingRange]: (request) => {
                return this.requiredResponse(this.getLinkedEditingRange(request.arguments));
            },
            [protocol.CommandTypes.GetCodeFixes]: (request) => {
                return this.requiredResponse(this.getCodeFixes(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.GetCodeFixesFull]: (request) => {
                return this.requiredResponse(this.getCodeFixes(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.GetCombinedCodeFix]: (request) => {
                return this.requiredResponse(this.getCombinedCodeFix(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.GetCombinedCodeFixFull]: (request) => {
                return this.requiredResponse(this.getCombinedCodeFix(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.ApplyCodeActionCommand]: (request) => {
                return this.requiredResponse(this.applyCodeActionCommand(request.arguments));
            },
            [protocol.CommandTypes.GetSupportedCodeFixes]: (request) => {
                return this.requiredResponse(this.getSupportedCodeFixes(request.arguments));
            },
            [protocol.CommandTypes.GetApplicableRefactors]: (request) => {
                return this.requiredResponse(this.getApplicableRefactors(request.arguments));
            },
            [protocol.CommandTypes.GetEditsForRefactor]: (request) => {
                return this.requiredResponse(this.getEditsForRefactor(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.GetMoveToRefactoringFileSuggestions]: (request) => {
                return this.requiredResponse(this.getMoveToRefactoringFileSuggestions(request.arguments));
            },
            [protocol.CommandTypes.PreparePasteEdits]: (request) => {
                return this.requiredResponse(this.preparePasteEdits(request.arguments));
            },
            [protocol.CommandTypes.GetPasteEdits]: (request) => {
                return this.requiredResponse(this.getPasteEdits(request.arguments));
            },
            [protocol.CommandTypes.GetEditsForRefactorFull]: (request) => {
                return this.requiredResponse(this.getEditsForRefactor(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.OrganizeImports]: (request) => {
                return this.requiredResponse(this.organizeImports(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.OrganizeImportsFull]: (request) => {
                return this.requiredResponse(this.organizeImports(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.GetEditsForFileRename]: (request) => {
                return this.requiredResponse(this.getEditsForFileRename(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.GetEditsForFileRenameFull]: (request) => {
                return this.requiredResponse(this.getEditsForFileRename(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.ConfigurePlugin]: (request) => {
                this.configurePlugin(request.arguments);
                return this.notRequired(request);
            },
            [protocol.CommandTypes.SelectionRange]: (request) => {
                return this.requiredResponse(this.getSmartSelectionRange(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.SelectionRangeFull]: (request) => {
                return this.requiredResponse(this.getSmartSelectionRange(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.PrepareCallHierarchy]: (request) => {
                return this.requiredResponse(this.prepareCallHierarchy(request.arguments));
            },
            [protocol.CommandTypes.ProvideCallHierarchyIncomingCalls]: (request) => {
                return this.requiredResponse(this.provideCallHierarchyIncomingCalls(request.arguments));
            },
            [protocol.CommandTypes.ProvideCallHierarchyOutgoingCalls]: (request) => {
                return this.requiredResponse(this.provideCallHierarchyOutgoingCalls(request.arguments));
            },
            [protocol.CommandTypes.ToggleLineComment]: (request) => {
                return this.requiredResponse(this.toggleLineComment(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.ToggleLineCommentFull]: (request) => {
                return this.requiredResponse(this.toggleLineComment(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.ToggleMultilineComment]: (request) => {
                return this.requiredResponse(this.toggleMultilineComment(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.ToggleMultilineCommentFull]: (request) => {
                return this.requiredResponse(this.toggleMultilineComment(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.CommentSelection]: (request) => {
                return this.requiredResponse(this.commentSelection(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.CommentSelectionFull]: (request) => {
                return this.requiredResponse(this.commentSelection(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.UncommentSelection]: (request) => {
                return this.requiredResponse(this.uncommentSelection(request.arguments, /*simplifiedResult*/ true));
            },
            [protocol.CommandTypes.UncommentSelectionFull]: (request) => {
                return this.requiredResponse(this.uncommentSelection(request.arguments, /*simplifiedResult*/ false));
            },
            [protocol.CommandTypes.ProvideInlayHints]: (request) => {
                return this.requiredResponse(this.provideInlayHints(request.arguments));
            },
            [protocol.CommandTypes.MapCode]: (request) => {
                return this.requiredResponse(this.mapCode(request.arguments));
            },
            [protocol.CommandTypes.CopilotRelated]: () => {
                return this.requiredResponse(this.getCopilotRelatedInfo());
            },
        }));
        this.host = opts.host;
        this.cancellationToken = opts.cancellationToken;
        this.typingsInstaller = opts.typingsInstaller || nullTypingsInstaller;
        this.byteLength = opts.byteLength;
        this.hrtime = opts.hrtime;
        this.logger = opts.logger;
        this.canUseEvents = opts.canUseEvents;
        this.suppressDiagnosticEvents = opts.suppressDiagnosticEvents;
        this.noGetErrOnBackgroundUpdate = opts.noGetErrOnBackgroundUpdate;
        const { throttleWaitMilliseconds } = opts;
        this.eventHandler = this.canUseEvents
            ? opts.eventHandler || (event => this.defaultEventHandler(event))
            : undefined;
        const multistepOperationHost = {
            executeWithRequestId: (requestId, action, performanceData) => this.executeWithRequestId(requestId, action, performanceData),
            getCurrentRequestId: () => this.currentRequestId,
            getPerformanceData: () => this.performanceData,
            getServerHost: () => this.host,
            logError: (err, cmd) => this.logError(err, cmd),
            sendRequestCompletedEvent: (requestId, performanceData) => this.sendRequestCompletedEvent(requestId, performanceData),
            isCancellationRequested: () => this.cancellationToken.isCancellationRequested(),
        };
        this.errorCheck = new MultistepOperation(multistepOperationHost);
        const settings = {
            host: this.host,
            logger: this.logger,
            cancellationToken: this.cancellationToken,
            useSingleInferredProject: opts.useSingleInferredProject,
            useInferredProjectPerProjectRoot: opts.useInferredProjectPerProjectRoot,
            typingsInstaller: this.typingsInstaller,
            throttleWaitMilliseconds,
            eventHandler: this.eventHandler,
            suppressDiagnosticEvents: this.suppressDiagnosticEvents,
            globalPlugins: opts.globalPlugins,
            pluginProbeLocations: opts.pluginProbeLocations,
            allowLocalPluginLoads: opts.allowLocalPluginLoads,
            typesMapLocation: opts.typesMapLocation,
            serverMode: opts.serverMode,
            session: this,
            canUseWatchEvents: opts.canUseWatchEvents,
            incrementalVerifier: opts.incrementalVerifier,
        };
        this.projectService = new ProjectService(settings);
        this.projectService.setPerformanceEventHandler(this.performanceEventHandler.bind(this));
        this.gcTimer = new GcTimer(this.host, /*delay*/ 7000, this.logger);
        // Make sure to setup handlers to throw error for not allowed commands on syntax server
        switch (this.projectService.serverMode) {
            case LanguageServiceMode.Semantic:
                break;
            case LanguageServiceMode.PartialSemantic:
                invalidPartialSemanticModeCommands.forEach(commandName => this.handlers.set(commandName, request => {
                    throw new Error(`Request: ${request.command} not allowed in LanguageServiceMode.PartialSemantic`);
                }));
                break;
            case LanguageServiceMode.Syntactic:
                invalidSyntacticModeCommands.forEach(commandName => this.handlers.set(commandName, request => {
                    throw new Error(`Request: ${request.command} not allowed in LanguageServiceMode.Syntactic`);
                }));
                break;
            default:
                Debug.assertNever(this.projectService.serverMode);
        }
    }
    sendRequestCompletedEvent(requestId, performanceData) {
        this.event({
            request_seq: requestId,
            performanceData: performanceData && toProtocolPerformanceData(performanceData),
        }, "requestCompleted");
    }
    addPerformanceData(key, value) {
        var _a;
        if (!this.performanceData) {
            this.performanceData = {};
        }
        this.performanceData[key] = ((_a = this.performanceData[key]) !== null && _a !== void 0 ? _a : 0) + value;
    }
    addDiagnosticsPerformanceData(file, kind, duration) {
        var _a, _b;
        var _c;
        if (!this.performanceData) {
            this.performanceData = {};
        }
        let fileDiagnosticDuration = (_a = this.performanceData.diagnosticsDuration) === null || _a === void 0 ? void 0 : _a.get(file);
        if (!fileDiagnosticDuration)
            ((_b = (_c = this.performanceData).diagnosticsDuration) !== null && _b !== void 0 ? _b : (_c.diagnosticsDuration = new Map())).set(file, fileDiagnosticDuration = {});
        fileDiagnosticDuration[kind] = duration;
    }
    performanceEventHandler(event) {
        switch (event.kind) {
            case "UpdateGraph":
                this.addPerformanceData("updateGraphDurationMs", event.durationMs);
                break;
            case "CreatePackageJsonAutoImportProvider":
                this.addPerformanceData("createAutoImportProviderProgramDurationMs", event.durationMs);
                break;
        }
    }
    defaultEventHandler(event) {
        switch (event.eventName) {
            case ProjectsUpdatedInBackgroundEvent:
                this.projectsUpdatedInBackgroundEvent(event.data.openFiles);
                break;
            case ProjectLoadingStartEvent:
                this.event({
                    projectName: event.data.project.getProjectName(),
                    reason: event.data.reason,
                }, event.eventName);
                break;
            case ProjectLoadingFinishEvent:
                this.event({
                    projectName: event.data.project.getProjectName(),
                }, event.eventName);
                break;
            case LargeFileReferencedEvent:
            case CreateFileWatcherEvent:
            case CreateDirectoryWatcherEvent:
            case CloseFileWatcherEvent:
                this.event(event.data, event.eventName);
                break;
            case ConfigFileDiagEvent:
                this.event({
                    triggerFile: event.data.triggerFile,
                    configFile: event.data.configFileName,
                    diagnostics: map(event.data.diagnostics, diagnostic => formatDiagnosticToProtocol(diagnostic, /*includeFileName*/ true)),
                }, event.eventName);
                break;
            case ProjectLanguageServiceStateEvent: {
                this.event({
                    projectName: event.data.project.getProjectName(),
                    languageServiceEnabled: event.data.languageServiceEnabled,
                }, event.eventName);
                break;
            }
            case ProjectInfoTelemetryEvent: {
                const eventName = "telemetry";
                this.event({
                    telemetryEventName: event.eventName,
                    payload: event.data,
                }, eventName);
                break;
            }
        }
    }
    projectsUpdatedInBackgroundEvent(openFiles) {
        this.projectService.logger.info(`got projects updated in background ${openFiles}`);
        if (openFiles.length) {
            if (!this.suppressDiagnosticEvents && !this.noGetErrOnBackgroundUpdate) {
                this.projectService.logger.info(`Queueing diagnostics update for ${openFiles}`);
                // For now only queue error checking for open files. We can change this to include non open files as well
                this.errorCheck.startNew(next => this.updateErrorCheck(next, openFiles, 100, /*requireOpen*/ true));
            }
            // Send project changed event
            this.event({
                openFiles,
            }, ProjectsUpdatedInBackgroundEvent);
        }
    }
    logError(err, cmd) {
        this.logErrorWorker(err, cmd);
    }
    logErrorWorker(err, cmd, fileRequest) {
        let msg = "Exception on executing command " + cmd;
        if (err.message) {
            msg += ":\n" + indent(err.message);
            if (err.stack) {
                msg += "\n" + indent(err.stack);
            }
        }
        if (this.logger.hasLevel(LogLevel.verbose)) {
            if (fileRequest) {
                try {
                    const { file, project } = this.getFileAndProject(fileRequest);
                    const scriptInfo = project.getScriptInfoForNormalizedPath(file);
                    if (scriptInfo) {
                        const text = getSnapshotText(scriptInfo.getSnapshot());
                        msg += `\n\nFile text of ${fileRequest.file}:${indent(text)}\n`;
                    }
                }
                catch (_a) { } // eslint-disable-line no-empty
            }
            if (err.ProgramFiles) {
                msg += `\n\nProgram files: ${JSON.stringify(err.ProgramFiles)}\n`;
                msg += `\n\nProjects::\n`;
                let counter = 0;
                const addProjectInfo = (project) => {
                    msg += `\nProject '${project.projectName}' (${ProjectKind[project.projectKind]}) ${counter}\n`;
                    msg += project.filesToString(/*writeProjectFileNames*/ true);
                    msg += "\n-----------------------------------------------\n";
                    counter++;
                };
                this.projectService.externalProjects.forEach(addProjectInfo);
                this.projectService.configuredProjects.forEach(addProjectInfo);
                this.projectService.inferredProjects.forEach(addProjectInfo);
            }
        }
        this.logger.msg(msg, Msg.Err);
    }
    send(msg) {
        if (msg.type === "event" && !this.canUseEvents) {
            if (this.logger.hasLevel(LogLevel.verbose)) {
                this.logger.info(`Session does not support events: ignored event: ${stringifyIndented(msg)}`);
            }
            return;
        }
        this.writeMessage(msg);
    }
    writeMessage(msg) {
        const msgText = formatMessage(msg, this.logger, this.byteLength, this.host.newLine);
        this.host.write(msgText);
    }
    event(body, eventName) {
        this.send(toEvent(eventName, body));
    }
    /** @internal */
    doOutput(info, cmdName, reqSeq, success, performanceData, message) {
        const res = {
            seq: 0,
            type: "response",
            command: cmdName,
            request_seq: reqSeq,
            success,
            performanceData: performanceData && toProtocolPerformanceData(performanceData),
        };
        if (success) {
            let metadata;
            if (isArray(info)) {
                res.body = info;
                metadata = info.metadata;
                delete info.metadata;
            }
            else if (typeof info === "object") {
                if (info.metadata) {
                    const { metadata: infoMetadata, ...body } = info;
                    res.body = body;
                    metadata = infoMetadata;
                }
                else {
                    res.body = info;
                }
            }
            else {
                res.body = info;
            }
            if (metadata)
                res.metadata = metadata;
        }
        else {
            Debug.assert(info === undefined);
        }
        if (message) {
            res.message = message;
        }
        this.send(res);
    }
    semanticCheck(file, project) {
        const diagnosticsStartTime = timestamp();
        tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "semanticCheck", { file, configFilePath: project.canonicalConfigFilePath }); // undefined is fine if the cast fails
        const diags = isDeclarationFileInJSOnlyNonConfiguredProject(project, file)
            ? emptyArray
            : project.getLanguageService().getSemanticDiagnostics(file).filter(d => !!d.file);
        this.sendDiagnosticsEvent(file, project, diags, "semanticDiag", diagnosticsStartTime);
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
    }
    syntacticCheck(file, project) {
        const diagnosticsStartTime = timestamp();
        tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "syntacticCheck", { file, configFilePath: project.canonicalConfigFilePath }); // undefined is fine if the cast fails
        this.sendDiagnosticsEvent(file, project, project.getLanguageService().getSyntacticDiagnostics(file), "syntaxDiag", diagnosticsStartTime);
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
    }
    suggestionCheck(file, project) {
        const diagnosticsStartTime = timestamp();
        tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "suggestionCheck", { file, configFilePath: project.canonicalConfigFilePath }); // undefined is fine if the cast fails
        this.sendDiagnosticsEvent(file, project, project.getLanguageService().getSuggestionDiagnostics(file), "suggestionDiag", diagnosticsStartTime);
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
    }
    regionSemanticCheck(file, project, ranges) {
        const diagnosticsStartTime = timestamp();
        tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "regionSemanticCheck", { file, configFilePath: project.canonicalConfigFilePath }); // undefined is fine if the cast fails
        let diagnosticsResult;
        if (!this.shouldDoRegionCheck(file) || !(diagnosticsResult = project.getLanguageService().getRegionSemanticDiagnostics(file, ranges))) {
            tracing === null || tracing === void 0 ? void 0 : tracing.pop();
            return;
        }
        this.sendDiagnosticsEvent(file, project, diagnosticsResult.diagnostics, "regionSemanticDiag", diagnosticsStartTime, diagnosticsResult.spans);
        tracing === null || tracing === void 0 ? void 0 : tracing.pop();
        return;
    }
    // We should only do the region-based semantic check if we think it would be
    // considerably faster than a whole-file semantic check.
    /** @internal */
    shouldDoRegionCheck(file) {
        var _a;
        const lineCount = (_a = this.projectService.getScriptInfoForNormalizedPath(file)) === null || _a === void 0 ? void 0 : _a.textStorage.getLineInfo().getLineCount();
        return !!(lineCount && lineCount >= this.regionDiagLineCountThreshold);
    }
    sendDiagnosticsEvent(file, project, diagnostics, kind, diagnosticsStartTime, spans) {
        try {
            const scriptInfo = Debug.checkDefined(project.getScriptInfo(file));
            const duration = timestamp() - diagnosticsStartTime;
            const body = {
                file,
                diagnostics: diagnostics.map(diag => formatDiag(file, project, diag)),
                spans: spans === null || spans === void 0 ? void 0 : spans.map(span => toProtocolTextSpan(span, scriptInfo)),
            };
            this.event(body, kind);
            this.addDiagnosticsPerformanceData(file, kind, duration);
        }
        catch (err) {
            this.logError(err, kind);
        }
    }
    /** It is the caller's responsibility to verify that `!this.suppressDiagnosticEvents`. */
    updateErrorCheck(next, checkList, ms, requireOpen = true) {
        if (checkList.length === 0) {
            return;
        }
        Debug.assert(!this.suppressDiagnosticEvents); // Caller's responsibility
        const seq = this.changeSeq;
        const followMs = Math.min(ms, 200);
        let index = 0;
        const goNext = () => {
            index++;
            if (checkList.length > index) {
                return next.delay("checkOne", followMs, checkOne);
            }
        };
        const doSemanticCheck = (fileName, project) => {
            this.semanticCheck(fileName, project);
            if (this.changeSeq !== seq) {
                return;
            }
            if (this.getPreferences(fileName).disableSuggestions) {
                return goNext();
            }
            next.immediate("suggestionCheck", () => {
                this.suggestionCheck(fileName, project);
                goNext();
            });
        };
        const checkOne = () => {
            if (this.changeSeq !== seq) {
                return;
            }
            let ranges;
            let item = checkList[index];
            if (isString(item)) {
                item = this.toPendingErrorCheck(item);
            }
            // eslint-disable-next-line local/no-in-operator
            else if ("ranges" in item) {
                ranges = item.ranges;
                item = this.toPendingErrorCheck(item.file);
            }
            if (!item) {
                return goNext();
            }
            const { fileName, project } = item;
            // Ensure the project is up to date before checking if this file is present in the project.
            updateProjectIfDirty(project);
            if (!project.containsFile(fileName, requireOpen)) {
                return;
            }
            this.syntacticCheck(fileName, project);
            if (this.changeSeq !== seq) {
                return;
            }
            // Don't provide semantic diagnostics unless we're in full semantic mode.
            if (project.projectService.serverMode !== LanguageServiceMode.Semantic) {
                return goNext();
            }
            if (ranges) {
                return next.immediate("regionSemanticCheck", () => {
                    const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(fileName);
                    if (scriptInfo) {
                        this.regionSemanticCheck(fileName, project, ranges.map(range => this.getRange({ file: fileName, ...range }, scriptInfo)));
                    }
                    if (this.changeSeq !== seq) {
                        return;
                    }
                    next.immediate("semanticCheck", () => doSemanticCheck(fileName, project));
                });
            }
            next.immediate("semanticCheck", () => doSemanticCheck(fileName, project));
        };
        if (checkList.length > index && this.changeSeq === seq) {
            next.delay("checkOne", ms, checkOne);
        }
    }
    cleanProjects(caption, projects) {
        if (!projects) {
            return;
        }
        this.logger.info(`cleaning ${caption}`);
        for (const p of projects) {
            p.getLanguageService(/*ensureSynchronized*/ false).cleanupSemanticCache();
            p.cleanupProgram();
        }
    }
    cleanup() {
        this.cleanProjects("inferred projects", this.projectService.inferredProjects);
        this.cleanProjects("configured projects", arrayFrom(this.projectService.configuredProjects.values()));
        this.cleanProjects("external projects", this.projectService.externalProjects);
        if (this.host.gc) {
            this.logger.info(`host.gc()`);
            this.host.gc();
        }
    }
    getEncodedSyntacticClassifications(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        return languageService.getEncodedSyntacticClassifications(file, args);
    }
    getEncodedSemanticClassifications(args) {
        const { file, project } = this.getFileAndProject(args);
        const format = args.format === "2020" ? SemanticClassificationFormat.TwentyTwenty : SemanticClassificationFormat.Original;
        return project.getLanguageService().getEncodedSemanticClassifications(file, args, format);
    }
    getProject(projectFileName) {
        return projectFileName === undefined ? undefined : this.projectService.findProject(projectFileName);
    }
    getConfigFileAndProject(args) {
        const project = this.getProject(args.projectFileName);
        const file = toNormalizedPath(args.file);
        return {
            configFile: project && project.hasConfigFile(file) ? file : undefined,
            project,
        };
    }
    getConfigFileDiagnostics(configFile, project, includeLinePosition) {
        const projectErrors = project.getAllProjectErrors();
        const optionsErrors = project.getLanguageService().getCompilerOptionsDiagnostics();
        const diagnosticsForConfigFile = filter(concatenate(projectErrors, optionsErrors), diagnostic => !!diagnostic.file && diagnostic.file.fileName === configFile);
        return includeLinePosition ?
            this.convertToDiagnosticsWithLinePositionFromDiagnosticFile(diagnosticsForConfigFile) :
            map(diagnosticsForConfigFile, diagnostic => formatDiagnosticToProtocol(diagnostic, /*includeFileName*/ false));
    }
    convertToDiagnosticsWithLinePositionFromDiagnosticFile(diagnostics) {
        return diagnostics.map(d => ({
            message: flattenDiagnosticMessageText(d.messageText, this.host.newLine),
            start: d.start, // TODO: GH#18217
            length: d.length, // TODO: GH#18217
            category: diagnosticCategoryName(d),
            code: d.code,
            source: d.source,
            startLocation: (d.file && convertToLocation(getLineAndCharacterOfPosition(d.file, d.start))), // TODO: GH#18217
            endLocation: (d.file && convertToLocation(getLineAndCharacterOfPosition(d.file, d.start + d.length))), // TODO: GH#18217
            reportsUnnecessary: d.reportsUnnecessary,
            reportsDeprecated: d.reportsDeprecated,
            relatedInformation: map(d.relatedInformation, formatRelatedInformation),
        }));
    }
    getCompilerOptionsDiagnostics(args) {
        const project = this.getProject(args.projectFileName);
        // Get diagnostics that dont have associated file with them
        // The diagnostics which have file would be in config file and
        // would be reported as part of configFileDiagnostics
        return this.convertToDiagnosticsWithLinePosition(filter(project.getLanguageService().getCompilerOptionsDiagnostics(), diagnostic => !diagnostic.file), 
        /*scriptInfo*/ undefined);
    }
    convertToDiagnosticsWithLinePosition(diagnostics, scriptInfo) {
        return diagnostics.map(d => ({
            message: flattenDiagnosticMessageText(d.messageText, this.host.newLine),
            start: d.start,
            length: d.length,
            category: diagnosticCategoryName(d),
            code: d.code,
            source: d.source,
            startLocation: scriptInfo && scriptInfo.positionToLineOffset(d.start), // TODO: GH#18217
            endLocation: scriptInfo && scriptInfo.positionToLineOffset(d.start + d.length),
            reportsUnnecessary: d.reportsUnnecessary,
            reportsDeprecated: d.reportsDeprecated,
            relatedInformation: map(d.relatedInformation, formatRelatedInformation),
        }));
    }
    getDiagnosticsWorker(args, isSemantic, selector, includeLinePosition) {
        const { project, file } = this.getFileAndProject(args);
        if (isSemantic && isDeclarationFileInJSOnlyNonConfiguredProject(project, file)) {
            return emptyArray;
        }
        const scriptInfo = project.getScriptInfoForNormalizedPath(file);
        const diagnostics = selector(project, file);
        return includeLinePosition
            ? this.convertToDiagnosticsWithLinePosition(diagnostics, scriptInfo)
            : diagnostics.map(d => formatDiag(file, project, d));
    }
    getDefinition(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const definitions = this.mapDefinitionInfoLocations(project.getLanguageService().getDefinitionAtPosition(file, position) || emptyArray, project);
        return simplifiedResult ? this.mapDefinitionInfo(definitions, project) : definitions.map(Session.mapToOriginalLocation);
    }
    mapDefinitionInfoLocations(definitions, project) {
        return definitions.map((info) => {
            const newDocumentSpan = getMappedDocumentSpanForProject(info, project);
            return !newDocumentSpan ? info : {
                ...newDocumentSpan,
                containerKind: info.containerKind,
                containerName: info.containerName,
                kind: info.kind,
                name: info.name,
                failedAliasResolution: info.failedAliasResolution,
                ...info.unverified && { unverified: info.unverified },
            };
        });
    }
    getDefinitionAndBoundSpan(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const scriptInfo = Debug.checkDefined(project.getScriptInfo(file));
        const unmappedDefinitionAndBoundSpan = project.getLanguageService().getDefinitionAndBoundSpan(file, position);
        if (!unmappedDefinitionAndBoundSpan || !unmappedDefinitionAndBoundSpan.definitions) {
            return {
                definitions: emptyArray,
                textSpan: undefined, // TODO: GH#18217
            };
        }
        const definitions = this.mapDefinitionInfoLocations(unmappedDefinitionAndBoundSpan.definitions, project);
        const { textSpan } = unmappedDefinitionAndBoundSpan;
        if (simplifiedResult) {
            return {
                definitions: this.mapDefinitionInfo(definitions, project),
                textSpan: toProtocolTextSpan(textSpan, scriptInfo),
            };
        }
        return {
            definitions: definitions.map(Session.mapToOriginalLocation),
            textSpan,
        };
    }
    findSourceDefinition(args) {
        var _a;
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const unmappedDefinitions = project.getLanguageService().getDefinitionAtPosition(file, position);
        let definitions = this.mapDefinitionInfoLocations(unmappedDefinitions || emptyArray, project).slice();
        const needsJsResolution = this.projectService.serverMode === LanguageServiceMode.Semantic && (!some(definitions, d => toNormalizedPath(d.fileName) !== file && !d.isAmbient) ||
            some(definitions, d => !!d.failedAliasResolution));
        if (needsJsResolution) {
            const definitionSet = createSet(d => d.textSpan.start, getDocumentSpansEqualityComparer(this.host.useCaseSensitiveFileNames));
            definitions === null || definitions === void 0 ? void 0 : definitions.forEach(d => definitionSet.add(d));
            const noDtsProject = project.getNoDtsResolutionProject(file);
            const ls = noDtsProject.getLanguageService();
            const jsDefinitions = (_a = ls.getDefinitionAtPosition(file, position, /*searchOtherFilesOnly*/ true, /*stopAtAlias*/ false)) === null || _a === void 0 ? void 0 : _a.filter(d => toNormalizedPath(d.fileName) !== file);
            if (some(jsDefinitions)) {
                for (const jsDefinition of jsDefinitions) {
                    if (jsDefinition.unverified) {
                        const refined = tryRefineDefinition(jsDefinition, project.getLanguageService().getProgram(), ls.getProgram());
                        if (some(refined)) {
                            for (const def of refined) {
                                definitionSet.add(def);
                            }
                            continue;
                        }
                    }
                    definitionSet.add(jsDefinition);
                }
            }
            else {
                const ambientCandidates = definitions.filter(d => toNormalizedPath(d.fileName) !== file && d.isAmbient);
                for (const candidate of some(ambientCandidates) ? ambientCandidates : getAmbientCandidatesByClimbingAccessChain()) {
                    const fileNameToSearch = findImplementationFileFromDtsFileName(candidate.fileName, file, noDtsProject);
                    if (!fileNameToSearch)
                        continue;
                    const info = this.projectService.getOrCreateScriptInfoNotOpenedByClient(fileNameToSearch, noDtsProject.currentDirectory, noDtsProject.directoryStructureHost, 
                    /*deferredDeleteOk*/ false);
                    if (!info)
                        continue;
                    if (!noDtsProject.containsScriptInfo(info)) {
                        noDtsProject.addRoot(info);
                        noDtsProject.updateGraph();
                    }
                    const noDtsProgram = ls.getProgram();
                    const fileToSearch = Debug.checkDefined(noDtsProgram.getSourceFile(fileNameToSearch));
                    for (const match of searchForDeclaration(candidate.name, fileToSearch, noDtsProgram)) {
                        definitionSet.add(match);
                    }
                }
            }
            definitions = arrayFrom(definitionSet.values());
        }
        definitions = definitions.filter(d => !d.isAmbient && !d.failedAliasResolution);
        return this.mapDefinitionInfo(definitions, project);
        function findImplementationFileFromDtsFileName(fileName, resolveFromFile, auxiliaryProject) {
            var _a, _b, _c;
            const nodeModulesPathParts = getNodeModulePathParts(fileName);
            if (nodeModulesPathParts && fileName.lastIndexOf(nodeModulesPathPart) === nodeModulesPathParts.topLevelNodeModulesIndex) {
                // Second check ensures the fileName only contains one `/node_modules/`. If there's more than one I give up.
                const packageDirectory = fileName.substring(0, nodeModulesPathParts.packageRootIndex);
                const packageJsonCache = (_a = project.getModuleResolutionCache()) === null || _a === void 0 ? void 0 : _a.getPackageJsonInfoCache();
                const compilerOptions = project.getCompilationSettings();
                const packageJson = getPackageScopeForPath(getNormalizedAbsolutePath(packageDirectory, project.getCurrentDirectory()), getTemporaryModuleResolutionState(packageJsonCache, project, compilerOptions));
                if (!packageJson)
                    return undefined;
                // Use fake options instead of actual compiler options to avoid following export map if the project uses node16 or nodenext -
                // Mapping from an export map entry across packages is out of scope for now. Returned entrypoints will only be what can be
                // resolved from the package root under --moduleResolution node
                const entrypoints = getEntrypointsFromPackageJsonInfo(packageJson, { moduleResolution: ModuleResolutionKind.Node10 }, project, project.getModuleResolutionCache());
                // This substring is correct only because we checked for a single `/node_modules/` at the top.
                const packageNamePathPart = fileName.substring(nodeModulesPathParts.topLevelPackageNameIndex + 1, nodeModulesPathParts.packageRootIndex);
                const packageName = getPackageNameFromTypesPackageName(unmangleScopedPackageName(packageNamePathPart));
                const path = project.toPath(fileName);
                if (entrypoints && some(entrypoints, e => project.toPath(e) === path)) {
                    // This file was the main entrypoint of a package. Try to resolve that same package name with
                    // the auxiliary project that only resolves to implementation files.
                    return (_b = auxiliaryProject.resolutionCache.resolveSingleModuleNameWithoutWatching(packageName, resolveFromFile).resolvedModule) === null || _b === void 0 ? void 0 : _b.resolvedFileName;
                }
                else {
                    // It wasn't the main entrypoint but we are in node_modules. Try a subpath into the package.
                    const pathToFileInPackage = fileName.substring(nodeModulesPathParts.packageRootIndex + 1);
                    const specifier = `${packageName}/${removeFileExtension(pathToFileInPackage)}`;
                    return (_c = auxiliaryProject.resolutionCache.resolveSingleModuleNameWithoutWatching(specifier, resolveFromFile).resolvedModule) === null || _c === void 0 ? void 0 : _c.resolvedFileName;
                }
            }
            // We're not in node_modules, and we only get to this function if non-dts module resolution failed.
            // I'm not sure what else I can do here that isn't already covered by that module resolution.
            return undefined;
        }
        // In 'foo.bar./**/baz', if we got not results on 'baz', see if we can get an ambient definition
        // for 'bar' or 'foo' (in that order) so we can search for declarations of 'baz' later.
        function getAmbientCandidatesByClimbingAccessChain() {
            const ls = project.getLanguageService();
            const program = ls.getProgram();
            const initialNode = getTouchingPropertyName(program.getSourceFile(file), position);
            if ((isStringLiteralLike(initialNode) || isIdentifier(initialNode)) && isAccessExpression(initialNode.parent)) {
                return forEachNameInAccessChainWalkingLeft(initialNode, nameInChain => {
                    var _a;
                    if (nameInChain === initialNode)
                        return undefined;
                    const candidates = (_a = ls.getDefinitionAtPosition(file, nameInChain.getStart(), /*searchOtherFilesOnly*/ true, /*stopAtAlias*/ false)) === null || _a === void 0 ? void 0 : _a.filter(d => toNormalizedPath(d.fileName) !== file && d.isAmbient).map(d => ({
                        fileName: d.fileName,
                        name: getTextOfIdentifierOrLiteral(initialNode),
                    }));
                    if (some(candidates)) {
                        return candidates;
                    }
                }) || emptyArray;
            }
            return emptyArray;
        }
        function tryRefineDefinition(definition, program, noDtsProgram) {
            var _a;
            const fileToSearch = noDtsProgram.getSourceFile(definition.fileName);
            if (!fileToSearch) {
                return undefined;
            }
            const initialNode = getTouchingPropertyName(program.getSourceFile(file), position);
            const symbol = program.getTypeChecker().getSymbolAtLocation(initialNode);
            const importSpecifier = symbol && getDeclarationOfKind(symbol, SyntaxKind.ImportSpecifier);
            if (!importSpecifier)
                return undefined;
            const nameToSearch = ((_a = importSpecifier.propertyName) === null || _a === void 0 ? void 0 : _a.text) || importSpecifier.name.text;
            return searchForDeclaration(nameToSearch, fileToSearch, noDtsProgram);
        }
        function searchForDeclaration(declarationName, fileToSearch, noDtsProgram) {
            const matches = FindAllReferences.Core.getTopMostDeclarationNamesInFile(declarationName, fileToSearch);
            return mapDefined(matches, match => {
                const symbol = noDtsProgram.getTypeChecker().getSymbolAtLocation(match);
                const decl = getDeclarationFromName(match);
                if (symbol && decl) {
                    // I think the last argument to this is supposed to be the start node, but it doesn't seem important.
                    // Callers internal to GoToDefinition already get confused about this.
                    return GoToDefinition.createDefinitionInfo(decl, noDtsProgram.getTypeChecker(), symbol, decl, /*unverified*/ true);
                }
            });
        }
    }
    getEmitOutput(args) {
        const { file, project } = this.getFileAndProject(args);
        if (!project.shouldEmitFile(project.getScriptInfo(file))) {
            return { emitSkipped: true, outputFiles: [], diagnostics: [] };
        }
        const result = project.getLanguageService().getEmitOutput(file);
        return args.richResponse ?
            {
                ...result,
                diagnostics: args.includeLinePosition ?
                    this.convertToDiagnosticsWithLinePositionFromDiagnosticFile(result.diagnostics) :
                    result.diagnostics.map(d => formatDiagnosticToProtocol(d, /*includeFileName*/ true)),
            } :
            result;
    }
    mapJSDocTagInfo(tags, project, richResponse) {
        return tags ? tags.map(tag => {
            var _a;
            return ({
                ...tag,
                text: richResponse ? this.mapDisplayParts(tag.text, project) : (_a = tag.text) === null || _a === void 0 ? void 0 : _a.map(part => part.text).join(""),
            });
        }) : [];
    }
    mapDisplayParts(parts, project) {
        if (!parts) {
            return [];
        }
        return parts.map(part => part.kind !== "linkName" ? part : {
            ...part,
            target: this.toFileSpan(part.target.fileName, part.target.textSpan, project),
        });
    }
    mapSignatureHelpItems(items, project, richResponse) {
        return items.map(item => ({
            ...item,
            documentation: this.mapDisplayParts(item.documentation, project),
            parameters: item.parameters.map(p => ({ ...p, documentation: this.mapDisplayParts(p.documentation, project) })),
            tags: this.mapJSDocTagInfo(item.tags, project, richResponse),
        }));
    }
    mapDefinitionInfo(definitions, project) {
        return definitions.map(def => ({ ...this.toFileSpanWithContext(def.fileName, def.textSpan, def.contextSpan, project), ...def.unverified && { unverified: def.unverified } }));
    }
    /*
     * When we map a .d.ts location to .ts, Visual Studio gets confused because there's no associated Roslyn Document in
     * the same project which corresponds to the file. VS Code has no problem with this, and luckily we have two protocols.
     * This retains the existing behavior for the "simplified" (VS Code) protocol but stores the .d.ts location in a
     * set of additional fields, and does the reverse for VS (store the .d.ts location where
     * it used to be and stores the .ts location in the additional fields).
     */
    static mapToOriginalLocation(def) {
        if (def.originalFileName) {
            Debug.assert(def.originalTextSpan !== undefined, "originalTextSpan should be present if originalFileName is");
            return {
                ...def,
                fileName: def.originalFileName,
                textSpan: def.originalTextSpan,
                targetFileName: def.fileName,
                targetTextSpan: def.textSpan,
                contextSpan: def.originalContextSpan,
                targetContextSpan: def.contextSpan,
            };
        }
        return def;
    }
    toFileSpan(fileName, textSpan, project) {
        const ls = project.getLanguageService();
        const start = ls.toLineColumnOffset(fileName, textSpan.start); // TODO: GH#18217
        const end = ls.toLineColumnOffset(fileName, textSpanEnd(textSpan));
        return {
            file: fileName,
            start: { line: start.line + 1, offset: start.character + 1 },
            end: { line: end.line + 1, offset: end.character + 1 },
        };
    }
    toFileSpanWithContext(fileName, textSpan, contextSpan, project) {
        const fileSpan = this.toFileSpan(fileName, textSpan, project);
        const context = contextSpan && this.toFileSpan(fileName, contextSpan, project);
        return context ?
            { ...fileSpan, contextStart: context.start, contextEnd: context.end } :
            fileSpan;
    }
    getTypeDefinition(args) {
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const definitions = this.mapDefinitionInfoLocations(project.getLanguageService().getTypeDefinitionAtPosition(file, position) || emptyArray, project);
        return this.mapDefinitionInfo(definitions, project);
    }
    mapImplementationLocations(implementations, project) {
        return implementations.map((info) => {
            const newDocumentSpan = getMappedDocumentSpanForProject(info, project);
            return !newDocumentSpan ? info : {
                ...newDocumentSpan,
                kind: info.kind,
                displayParts: info.displayParts,
            };
        });
    }
    getImplementation(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const implementations = this.mapImplementationLocations(project.getLanguageService().getImplementationAtPosition(file, position) || emptyArray, project);
        return simplifiedResult ?
            implementations.map(({ fileName, textSpan, contextSpan }) => this.toFileSpanWithContext(fileName, textSpan, contextSpan, project)) :
            implementations.map(Session.mapToOriginalLocation);
    }
    getSyntacticDiagnosticsSync(args) {
        const { configFile } = this.getConfigFileAndProject(args);
        if (configFile) {
            // all the config file errors are reported as part of semantic check so nothing to report here
            return emptyArray;
        }
        return this.getDiagnosticsWorker(args, /*isSemantic*/ false, (project, file) => project.getLanguageService().getSyntacticDiagnostics(file), !!args.includeLinePosition);
    }
    getSemanticDiagnosticsSync(args) {
        const { configFile, project } = this.getConfigFileAndProject(args);
        if (configFile) {
            return this.getConfigFileDiagnostics(configFile, project, !!args.includeLinePosition); // TODO: GH#18217
        }
        return this.getDiagnosticsWorker(args, /*isSemantic*/ true, (project, file) => project.getLanguageService().getSemanticDiagnostics(file).filter(d => !!d.file), !!args.includeLinePosition);
    }
    getSuggestionDiagnosticsSync(args) {
        const { configFile } = this.getConfigFileAndProject(args);
        if (configFile) {
            // Currently there are no info diagnostics for config files.
            return emptyArray;
        }
        // isSemantic because we don't want to info diagnostics in declaration files for JS-only users
        return this.getDiagnosticsWorker(args, /*isSemantic*/ true, (project, file) => project.getLanguageService().getSuggestionDiagnostics(file), !!args.includeLinePosition);
    }
    getJsxClosingTag(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        const tag = languageService.getJsxClosingTagAtPosition(file, position);
        return tag === undefined ? undefined : { newText: tag.newText, caretOffset: 0 };
    }
    getLinkedEditingRange(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        const linkedEditInfo = languageService.getLinkedEditingRangeAtPosition(file, position);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        if (scriptInfo === undefined || linkedEditInfo === undefined)
            return undefined;
        return convertLinkedEditInfoToRanges(linkedEditInfo, scriptInfo);
    }
    getDocumentHighlights(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const documentHighlights = project.getLanguageService().getDocumentHighlights(file, position, args.filesToSearch);
        if (!documentHighlights)
            return emptyArray;
        if (!simplifiedResult)
            return documentHighlights;
        return documentHighlights.map(({ fileName, highlightSpans }) => {
            const scriptInfo = project.getScriptInfo(fileName);
            return {
                file: fileName,
                highlightSpans: highlightSpans.map(({ textSpan, kind, contextSpan }) => ({
                    ...toProtocolTextSpanWithContext(textSpan, contextSpan, scriptInfo),
                    kind,
                })),
            };
        });
    }
    provideInlayHints(args) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const hints = project.getLanguageService().provideInlayHints(file, args, this.getPreferences(file));
        return hints.map(hint => {
            const { position, displayParts } = hint;
            return {
                ...hint,
                position: scriptInfo.positionToLineOffset(position),
                displayParts: displayParts === null || displayParts === void 0 ? void 0 : displayParts.map(({ text, span, file }) => {
                    if (span) {
                        Debug.assertIsDefined(file, "Target file should be defined together with its span.");
                        const scriptInfo = this.projectService.getScriptInfo(file);
                        return {
                            text,
                            span: {
                                start: scriptInfo.positionToLineOffset(span.start),
                                end: scriptInfo.positionToLineOffset(span.start + span.length),
                                file,
                            },
                        };
                    }
                    else {
                        return { text };
                    }
                }),
            };
        });
    }
    mapCode(args) {
        var _a;
        const formatOptions = this.getHostFormatOptions();
        const preferences = this.getHostPreferences();
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const focusLocations = (_a = args.mapping.focusLocations) === null || _a === void 0 ? void 0 : _a.map(spans => {
            return spans.map(loc => {
                const start = scriptInfo.lineOffsetToPosition(loc.start.line, loc.start.offset);
                const end = scriptInfo.lineOffsetToPosition(loc.end.line, loc.end.offset);
                return {
                    start,
                    length: end - start,
                };
            });
        });
        const changes = languageService.mapCode(file, args.mapping.contents, focusLocations, formatOptions, preferences);
        return this.mapTextChangesToCodeEdits(changes);
    }
    getCopilotRelatedInfo() {
        return {
            relatedFiles: [],
        };
    }
    setCompilerOptionsForInferredProjects(args) {
        this.projectService.setCompilerOptionsForInferredProjects(args.options, args.projectRootPath);
    }
    getProjectInfo(args) {
        return this.getProjectInfoWorker(args.file, args.projectFileName, args.needFileNameList, args.needDefaultConfiguredProjectInfo, 
        /*excludeConfigFiles*/ false);
    }
    getProjectInfoWorker(uncheckedFileName, projectFileName, needFileNameList, needDefaultConfiguredProjectInfo, excludeConfigFiles) {
        const { project } = this.getFileAndProjectWorker(uncheckedFileName, projectFileName);
        updateProjectIfDirty(project);
        const projectInfo = {
            configFileName: project.getProjectName(),
            languageServiceDisabled: !project.languageServiceEnabled,
            fileNames: needFileNameList ? project.getFileNames(/*excludeFilesFromExternalLibraries*/ false, excludeConfigFiles) : undefined,
            configuredProjectInfo: needDefaultConfiguredProjectInfo ? this.getDefaultConfiguredProjectInfo(uncheckedFileName) : undefined,
        };
        return projectInfo;
    }
    getDefaultConfiguredProjectInfo(uncheckedFileName) {
        var _a;
        const info = this.projectService.getScriptInfo(uncheckedFileName);
        if (!info)
            return;
        // Find default project for the info
        const result = this.projectService.findDefaultConfiguredProjectWorker(info, ConfiguredProjectLoadKind.CreateReplay);
        if (!result)
            return undefined;
        let notMatchedByConfig;
        let notInProject;
        result.seenProjects.forEach((kind, project) => {
            if (project !== result.defaultProject) {
                if (kind !== ConfiguredProjectLoadKind.CreateReplay) {
                    (notMatchedByConfig !== null && notMatchedByConfig !== void 0 ? notMatchedByConfig : (notMatchedByConfig = [])).push(toNormalizedPath(project.getConfigFilePath()));
                }
                else {
                    (notInProject !== null && notInProject !== void 0 ? notInProject : (notInProject = [])).push(toNormalizedPath(project.getConfigFilePath()));
                }
            }
        });
        (_a = result.seenConfigs) === null || _a === void 0 ? void 0 : _a.forEach(config => (notMatchedByConfig !== null && notMatchedByConfig !== void 0 ? notMatchedByConfig : (notMatchedByConfig = [])).push(config));
        return {
            notMatchedByConfig,
            notInProject,
            defaultProject: result.defaultProject && toNormalizedPath(result.defaultProject.getConfigFilePath()),
        };
    }
    getRenameInfo(args) {
        const { file, project } = this.getFileAndProject(args);
        const position = this.getPositionInFile(args, file);
        const preferences = this.getPreferences(file);
        return project.getLanguageService().getRenameInfo(file, position, preferences);
    }
    getProjects(args, getScriptInfoEnsuringProjectsUptoDate, ignoreNoProjectError) {
        var _a;
        let projects;
        let symLinkedProjects;
        if (args.projectFileName) {
            const project = this.getProject(args.projectFileName);
            if (project) {
                projects = [project];
            }
        }
        else {
            const scriptInfo = getScriptInfoEnsuringProjectsUptoDate ?
                this.projectService.getScriptInfoEnsuringProjectsUptoDate(args.file) :
                this.projectService.getScriptInfo(args.file);
            if (!scriptInfo) {
                if (ignoreNoProjectError)
                    return emptyArray;
                this.projectService.logErrorForScriptInfoNotFound(args.file);
                return Errors.ThrowNoProject();
            }
            else if (!getScriptInfoEnsuringProjectsUptoDate) {
                // Ensure there are containing projects are present
                this.projectService.ensureDefaultProjectForFile(scriptInfo);
            }
            projects = scriptInfo.containingProjects;
            symLinkedProjects = this.projectService.getSymlinkedProjects(scriptInfo);
        }
        // filter handles case when 'projects' is undefined
        projects = filter(projects, p => p.languageServiceEnabled && !p.isOrphan());
        if (!ignoreNoProjectError && (!projects || !projects.length) && !symLinkedProjects) {
            this.projectService.logErrorForScriptInfoNotFound((_a = args.file) !== null && _a !== void 0 ? _a : args.projectFileName);
            return Errors.ThrowNoProject();
        }
        return symLinkedProjects ? { projects: projects, symLinkedProjects } : projects; // TODO: GH#18217
    }
    getDefaultProject(args) {
        if (args.projectFileName) {
            const project = this.getProject(args.projectFileName);
            if (project) {
                return project;
            }
            if (!args.file) {
                return Errors.ThrowNoProject();
            }
        }
        const info = this.projectService.getScriptInfo(args.file);
        return info.getDefaultProject();
    }
    getRenameLocations(args, simplifiedResult) {
        const file = toNormalizedPath(args.file);
        const position = this.getPositionInFile(args, file);
        const projects = this.getProjects(args);
        const defaultProject = this.getDefaultProject(args);
        const preferences = this.getPreferences(file);
        const renameInfo = this.mapRenameInfo(defaultProject.getLanguageService().getRenameInfo(file, position, preferences), Debug.checkDefined(this.projectService.getScriptInfo(file)));
        if (!renameInfo.canRename)
            return simplifiedResult ? { info: renameInfo, locs: [] } : [];
        const locations = getRenameLocationsWorker(projects, defaultProject, { fileName: args.file, pos: position }, !!args.findInStrings, !!args.findInComments, preferences, this.host.useCaseSensitiveFileNames);
        if (!simplifiedResult)
            return locations;
        return { info: renameInfo, locs: this.toSpanGroups(locations) };
    }
    mapRenameInfo(info, scriptInfo) {
        if (info.canRename) {
            const { canRename, fileToRename, displayName, fullDisplayName, kind, kindModifiers, triggerSpan } = info;
            return identity({ canRename, fileToRename, displayName, fullDisplayName, kind, kindModifiers, triggerSpan: toProtocolTextSpan(triggerSpan, scriptInfo) });
        }
        else {
            return info;
        }
    }
    toSpanGroups(locations) {
        const map = new Map();
        for (const { fileName, textSpan, contextSpan, originalContextSpan: _2, originalTextSpan: _, originalFileName: _1, ...prefixSuffixText } of locations) {
            let group = map.get(fileName);
            if (!group)
                map.set(fileName, group = { file: fileName, locs: [] });
            const scriptInfo = Debug.checkDefined(this.projectService.getScriptInfo(fileName));
            group.locs.push({ ...toProtocolTextSpanWithContext(textSpan, contextSpan, scriptInfo), ...prefixSuffixText });
        }
        return arrayFrom(map.values());
    }
    getReferences(args, simplifiedResult) {
        const file = toNormalizedPath(args.file);
        const projects = this.getProjects(args);
        const position = this.getPositionInFile(args, file);
        const references = getReferencesWorker(projects, this.getDefaultProject(args), { fileName: args.file, pos: position }, this.host.useCaseSensitiveFileNames, this.logger);
        if (!simplifiedResult)
            return references;
        const preferences = this.getPreferences(file);
        const defaultProject = this.getDefaultProject(args);
        const scriptInfo = defaultProject.getScriptInfoForNormalizedPath(file);
        const nameInfo = defaultProject.getLanguageService().getQuickInfoAtPosition(file, position);
        const symbolDisplayString = nameInfo ? displayPartsToString(nameInfo.displayParts) : "";
        const nameSpan = nameInfo && nameInfo.textSpan;
        const symbolStartOffset = nameSpan ? scriptInfo.positionToLineOffset(nameSpan.start).offset : 0;
        const symbolName = nameSpan ? scriptInfo.getSnapshot().getText(nameSpan.start, textSpanEnd(nameSpan)) : "";
        const refs = flatMap(references, referencedSymbol => {
            return referencedSymbol.references.map(entry => referenceEntryToReferencesResponseItem(this.projectService, entry, preferences));
        });
        return { refs, symbolName, symbolStartOffset, symbolDisplayString };
    }
    getFileReferences(args, simplifiedResult) {
        const projects = this.getProjects(args);
        const fileName = toNormalizedPath(args.file);
        const preferences = this.getPreferences(fileName);
        const initialLocation = { fileName, pos: 0 };
        const perProjectResults = getPerProjectReferences(projects, this.getDefaultProject(args), initialLocation, initialLocation, mapDefinitionInProjectIfFileInProject, project => {
            this.logger.info(`Finding references to file ${fileName} in project ${project.getProjectName()}`);
            return project.getLanguageService().getFileReferences(fileName);
        });
        // No re-mapping or isDefinition updatses are required if there's exactly one project
        let references;
        if (isArray(perProjectResults)) {
            references = perProjectResults;
        }
        else {
            references = [];
            const seen = createDocumentSpanSet(this.host.useCaseSensitiveFileNames);
            perProjectResults.forEach(projectOutputs => {
                for (const referenceEntry of projectOutputs) {
                    if (!seen.has(referenceEntry)) {
                        references.push(referenceEntry);
                        seen.add(referenceEntry);
                    }
                }
            });
        }
        if (!simplifiedResult)
            return references;
        const refs = references.map(entry => referenceEntryToReferencesResponseItem(this.projectService, entry, preferences));
        return {
            refs,
            symbolName: `"${args.file}"`,
        };
    }
    /**
     * @param fileName is the name of the file to be opened
     * @param fileContent is a version of the file content that is known to be more up to date than the one on disk
     */
    openClientFile(fileName, fileContent, scriptKind, projectRootPath) {
        this.projectService.openClientFileWithNormalizedPath(fileName, fileContent, scriptKind, /*hasMixedContent*/ false, projectRootPath);
    }
    getPosition(args, scriptInfo) {
        return args.position !== undefined ? args.position : scriptInfo.lineOffsetToPosition(args.line, args.offset);
    }
    getPositionInFile(args, file) {
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        return this.getPosition(args, scriptInfo);
    }
    getFileAndProject(args) {
        return this.getFileAndProjectWorker(args.file, args.projectFileName);
    }
    getFileAndLanguageServiceForSyntacticOperation(args) {
        const { file, project } = this.getFileAndProject(args);
        return {
            file,
            languageService: project.getLanguageService(/*ensureSynchronized*/ false),
        };
    }
    getFileAndProjectWorker(uncheckedFileName, projectFileName) {
        const file = toNormalizedPath(uncheckedFileName);
        const project = this.getProject(projectFileName) || this.projectService.ensureDefaultProjectForFile(file);
        return { file, project };
    }
    getOutliningSpans(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const spans = languageService.getOutliningSpans(file);
        if (simplifiedResult) {
            const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
            return spans.map(s => ({
                textSpan: toProtocolTextSpan(s.textSpan, scriptInfo),
                hintSpan: toProtocolTextSpan(s.hintSpan, scriptInfo),
                bannerText: s.bannerText,
                autoCollapse: s.autoCollapse,
                kind: s.kind,
            }));
        }
        else {
            return spans;
        }
    }
    getTodoComments(args) {
        const { file, project } = this.getFileAndProject(args);
        return project.getLanguageService().getTodoComments(file, args.descriptors);
    }
    getDocCommentTemplate(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        return languageService.getDocCommentTemplateAtPosition(file, position, this.getPreferences(file), this.getFormatOptions(file));
    }
    getSpanOfEnclosingComment(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const onlyMultiLine = args.onlyMultiLine;
        const position = this.getPositionInFile(args, file);
        return languageService.getSpanOfEnclosingComment(file, position, onlyMultiLine);
    }
    getIndentation(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        const options = args.options ? convertFormatOptions(args.options) : this.getFormatOptions(file);
        const indentation = languageService.getIndentationAtPosition(file, position, options);
        return { position, indentation };
    }
    getBreakpointStatement(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        return languageService.getBreakpointStatementAtPosition(file, position);
    }
    getNameOrDottedNameSpan(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        return languageService.getNameOrDottedNameSpan(file, position, position);
    }
    isValidBraceCompletion(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const position = this.getPositionInFile(args, file);
        return languageService.isValidBraceCompletionAtPosition(file, position, args.openingBrace.charCodeAt(0));
    }
    getQuickInfoWorker(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const quickInfo = project.getLanguageService().getQuickInfoAtPosition(file, this.getPosition(args, scriptInfo));
        if (!quickInfo) {
            return undefined;
        }
        const useDisplayParts = !!this.getPreferences(file).displayPartsForJSDoc;
        if (simplifiedResult) {
            const displayString = displayPartsToString(quickInfo.displayParts);
            return {
                kind: quickInfo.kind,
                kindModifiers: quickInfo.kindModifiers,
                start: scriptInfo.positionToLineOffset(quickInfo.textSpan.start),
                end: scriptInfo.positionToLineOffset(textSpanEnd(quickInfo.textSpan)),
                displayString,
                documentation: useDisplayParts ? this.mapDisplayParts(quickInfo.documentation, project) : displayPartsToString(quickInfo.documentation),
                tags: this.mapJSDocTagInfo(quickInfo.tags, project, useDisplayParts),
            };
        }
        else {
            return useDisplayParts ? quickInfo : {
                ...quickInfo,
                tags: this.mapJSDocTagInfo(quickInfo.tags, project, /*richResponse*/ false),
            };
        }
    }
    getFormattingEditsForRange(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const startPosition = scriptInfo.lineOffsetToPosition(args.line, args.offset);
        const endPosition = scriptInfo.lineOffsetToPosition(args.endLine, args.endOffset);
        // TODO: avoid duplicate code (with formatonkey)
        const edits = languageService.getFormattingEditsForRange(file, startPosition, endPosition, this.getFormatOptions(file));
        if (!edits) {
            return undefined;
        }
        return edits.map(edit => this.convertTextChangeToCodeEdit(edit, scriptInfo));
    }
    getFormattingEditsForRangeFull(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const options = args.options ? convertFormatOptions(args.options) : this.getFormatOptions(file);
        return languageService.getFormattingEditsForRange(file, args.position, args.endPosition, options); // TODO: GH#18217
    }
    getFormattingEditsForDocumentFull(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const options = args.options ? convertFormatOptions(args.options) : this.getFormatOptions(file);
        return languageService.getFormattingEditsForDocument(file, options);
    }
    getFormattingEditsAfterKeystrokeFull(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const options = args.options ? convertFormatOptions(args.options) : this.getFormatOptions(file);
        return languageService.getFormattingEditsAfterKeystroke(file, args.position, args.key, options); // TODO: GH#18217
    }
    getFormattingEditsAfterKeystroke(args) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const position = scriptInfo.lineOffsetToPosition(args.line, args.offset);
        const formatOptions = this.getFormatOptions(file);
        const edits = languageService.getFormattingEditsAfterKeystroke(file, position, args.key, formatOptions);
        // Check whether we should auto-indent. This will be when
        // the position is on a line containing only whitespace.
        // This should leave the edits returned from
        // getFormattingEditsAfterKeystroke either empty or pertaining
        // only to the previous line.  If all this is true, then
        // add edits necessary to properly indent the current line.
        if ((args.key === "\n") && ((!edits) || (edits.length === 0) || allEditsBeforePos(edits, position))) {
            const { lineText, absolutePosition } = scriptInfo.textStorage.getAbsolutePositionAndLineText(args.line);
            if (lineText && lineText.search("\\S") < 0) {
                const preferredIndent = languageService.getIndentationAtPosition(file, position, formatOptions);
                let hasIndent = 0;
                let i, len;
                for (i = 0, len = lineText.length; i < len; i++) {
                    if (lineText.charAt(i) === " ") {
                        hasIndent++;
                    }
                    else if (lineText.charAt(i) === "\t") {
                        hasIndent += formatOptions.tabSize; // TODO: GH#18217
                    }
                    else {
                        break;
                    }
                }
                // i points to the first non whitespace character
                if (preferredIndent !== hasIndent) {
                    const firstNoWhiteSpacePosition = absolutePosition + i;
                    edits.push({
                        span: createTextSpanFromBounds(absolutePosition, firstNoWhiteSpacePosition),
                        newText: formatting.getIndentationString(preferredIndent, formatOptions),
                    });
                }
            }
        }
        if (!edits) {
            return undefined;
        }
        return edits.map(edit => {
            return {
                start: scriptInfo.positionToLineOffset(edit.span.start),
                end: scriptInfo.positionToLineOffset(textSpanEnd(edit.span)),
                newText: edit.newText ? edit.newText : "",
            };
        });
    }
    getCompletions(args, kind) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const position = this.getPosition(args, scriptInfo);
        const completions = project.getLanguageService().getCompletionsAtPosition(file, position, {
            ...convertUserPreferences(this.getPreferences(file)),
            triggerCharacter: args.triggerCharacter,
            triggerKind: args.triggerKind,
            includeExternalModuleExports: args.includeExternalModuleExports,
            includeInsertTextCompletions: args.includeInsertTextCompletions,
        }, project.projectService.getFormatCodeOptions(file));
        if (completions === undefined)
            return undefined;
        if (kind === protocol.CommandTypes.CompletionsFull)
            return completions;
        const prefix = args.prefix || "";
        const entries = mapDefined(completions.entries, entry => {
            if (completions.isMemberCompletion || startsWith(entry.name.toLowerCase(), prefix.toLowerCase())) {
                const convertedSpan = entry.replacementSpan ? toProtocolTextSpan(entry.replacementSpan, scriptInfo) : undefined;
                // Use `hasAction || undefined` to avoid serializing `false`.
                return {
                    ...entry,
                    replacementSpan: convertedSpan,
                    hasAction: entry.hasAction || undefined,
                    symbol: undefined,
                };
            }
        });
        if (kind === protocol.CommandTypes.Completions) {
            if (completions.metadata)
                entries.metadata = completions.metadata;
            return entries;
        }
        const res = {
            ...completions,
            optionalReplacementSpan: completions.optionalReplacementSpan && toProtocolTextSpan(completions.optionalReplacementSpan, scriptInfo),
            entries,
        };
        return res;
    }
    getCompletionEntryDetails(args, fullResult) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const position = this.getPosition(args, scriptInfo);
        const formattingOptions = project.projectService.getFormatCodeOptions(file);
        const useDisplayParts = !!this.getPreferences(file).displayPartsForJSDoc;
        const result = mapDefined(args.entryNames, entryName => {
            const { name, source, data } = typeof entryName === "string" ? { name: entryName, source: undefined, data: undefined } : entryName;
            return project.getLanguageService().getCompletionEntryDetails(file, position, name, formattingOptions, source, this.getPreferences(file), data ? cast(data, isCompletionEntryData) : undefined);
        });
        return fullResult
            ? (useDisplayParts ? result : result.map(details => ({ ...details, tags: this.mapJSDocTagInfo(details.tags, project, /*richResponse*/ false) })))
            : result.map(details => ({
                ...details,
                codeActions: map(details.codeActions, action => this.mapCodeAction(action)),
                documentation: this.mapDisplayParts(details.documentation, project),
                tags: this.mapJSDocTagInfo(details.tags, project, useDisplayParts),
            }));
    }
    getCompileOnSaveAffectedFileList(args) {
        const projects = this.getProjects(args, /*getScriptInfoEnsuringProjectsUptoDate*/ true, /*ignoreNoProjectError*/ true);
        const info = this.projectService.getScriptInfo(args.file);
        if (!info) {
            return emptyArray;
        }
        return combineProjectOutput(info, path => this.projectService.getScriptInfoForPath(path), projects, (project, info) => {
            if (!project.compileOnSaveEnabled || !project.languageServiceEnabled || project.isOrphan()) {
                return undefined;
            }
            const compilationSettings = project.getCompilationSettings();
            if (!!compilationSettings.noEmit || isDeclarationFileName(info.fileName) && !dtsChangeCanAffectEmit(compilationSettings)) {
                // avoid triggering emit when a change is made in a .d.ts when declaration emit and decorator metadata emit are disabled
                return undefined;
            }
            return {
                projectFileName: project.getProjectName(),
                fileNames: project.getCompileOnSaveAffectedFileList(info),
                projectUsesOutFile: !!compilationSettings.outFile,
            };
        });
    }
    emitFile(args) {
        const { file, project } = this.getFileAndProject(args);
        if (!project) {
            Errors.ThrowNoProject();
        }
        if (!project.languageServiceEnabled) {
            return args.richResponse ? { emitSkipped: true, diagnostics: [] } : false;
        }
        const scriptInfo = project.getScriptInfo(file);
        const { emitSkipped, diagnostics } = project.emitFile(scriptInfo, (path, data, writeByteOrderMark) => this.host.writeFile(path, data, writeByteOrderMark));
        return args.richResponse ?
            {
                emitSkipped,
                diagnostics: args.includeLinePosition ?
                    this.convertToDiagnosticsWithLinePositionFromDiagnosticFile(diagnostics) :
                    diagnostics.map(d => formatDiagnosticToProtocol(d, /*includeFileName*/ true)),
            } :
            !emitSkipped;
    }
    getSignatureHelpItems(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const position = this.getPosition(args, scriptInfo);
        const helpItems = project.getLanguageService().getSignatureHelpItems(file, position, args);
        const useDisplayParts = !!this.getPreferences(file).displayPartsForJSDoc;
        if (helpItems && simplifiedResult) {
            const span = helpItems.applicableSpan;
            return {
                ...helpItems,
                applicableSpan: {
                    start: scriptInfo.positionToLineOffset(span.start),
                    end: scriptInfo.positionToLineOffset(span.start + span.length),
                },
                items: this.mapSignatureHelpItems(helpItems.items, project, useDisplayParts),
            };
        }
        else if (useDisplayParts || !helpItems) {
            return helpItems;
        }
        else {
            return {
                ...helpItems,
                items: helpItems.items.map(item => ({ ...item, tags: this.mapJSDocTagInfo(item.tags, project, /*richResponse*/ false) })),
            };
        }
    }
    toPendingErrorCheck(uncheckedFileName) {
        const fileName = toNormalizedPath(uncheckedFileName);
        const project = this.projectService.tryGetDefaultProjectForFile(fileName);
        return project && { fileName, project };
    }
    getDiagnostics(next, delay, fileArgs) {
        if (this.suppressDiagnosticEvents) {
            return;
        }
        if (fileArgs.length > 0) {
            this.updateErrorCheck(next, fileArgs, delay);
        }
    }
    change(args) {
        const scriptInfo = this.projectService.getScriptInfo(args.file);
        Debug.assert(!!scriptInfo);
        // Because we are going to apply edits, its better to switch to svc now instead of computing line map
        scriptInfo.textStorage.switchToScriptVersionCache();
        const start = scriptInfo.lineOffsetToPosition(args.line, args.offset);
        const end = scriptInfo.lineOffsetToPosition(args.endLine, args.endOffset);
        if (start >= 0) {
            this.changeSeq++;
            this.projectService.applyChangesToFile(scriptInfo, singleIterator({
                span: { start, length: end - start },
                newText: args.insertString, // TODO: GH#18217
            }));
        }
    }
    reload(args) {
        const file = toNormalizedPath(args.file);
        const tempFileName = args.tmpfile === undefined ? undefined : toNormalizedPath(args.tmpfile);
        const info = this.projectService.getScriptInfoForNormalizedPath(file);
        if (info) {
            this.changeSeq++;
            // make sure no changes happen before this one is finished
            info.reloadFromFile(tempFileName);
        }
    }
    saveToTmp(fileName, tempFileName) {
        const scriptInfo = this.projectService.getScriptInfo(fileName);
        if (scriptInfo) {
            scriptInfo.saveTo(tempFileName);
        }
    }
    closeClientFile(fileName) {
        if (!fileName) {
            return;
        }
        const file = normalizePath(fileName);
        this.projectService.closeClientFile(file);
    }
    mapLocationNavigationBarItems(items, scriptInfo) {
        return map(items, item => ({
            text: item.text,
            kind: item.kind,
            kindModifiers: item.kindModifiers,
            spans: item.spans.map(span => toProtocolTextSpan(span, scriptInfo)),
            childItems: this.mapLocationNavigationBarItems(item.childItems, scriptInfo),
            indent: item.indent,
        }));
    }
    getNavigationBarItems(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const items = languageService.getNavigationBarItems(file);
        return !items
            ? undefined
            : simplifiedResult
                ? this.mapLocationNavigationBarItems(items, this.projectService.getScriptInfoForNormalizedPath(file))
                : items;
    }
    toLocationNavigationTree(tree, scriptInfo) {
        return {
            text: tree.text,
            kind: tree.kind,
            kindModifiers: tree.kindModifiers,
            spans: tree.spans.map(span => toProtocolTextSpan(span, scriptInfo)),
            nameSpan: tree.nameSpan && toProtocolTextSpan(tree.nameSpan, scriptInfo),
            childItems: map(tree.childItems, item => this.toLocationNavigationTree(item, scriptInfo)),
        };
    }
    getNavigationTree(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const tree = languageService.getNavigationTree(file);
        return !tree
            ? undefined
            : simplifiedResult
                ? this.toLocationNavigationTree(tree, this.projectService.getScriptInfoForNormalizedPath(file))
                : tree;
    }
    getNavigateToItems(args, simplifiedResult) {
        const full = this.getFullNavigateToItems(args);
        return !simplifiedResult ?
            flatMap(full, ({ navigateToItems }) => navigateToItems) :
            flatMap(full, ({ project, navigateToItems }) => navigateToItems.map(navItem => {
                const scriptInfo = project.getScriptInfo(navItem.fileName);
                const bakedItem = {
                    name: navItem.name,
                    kind: navItem.kind,
                    kindModifiers: navItem.kindModifiers,
                    isCaseSensitive: navItem.isCaseSensitive,
                    matchKind: navItem.matchKind,
                    file: navItem.fileName,
                    start: scriptInfo.positionToLineOffset(navItem.textSpan.start),
                    end: scriptInfo.positionToLineOffset(textSpanEnd(navItem.textSpan)),
                };
                if (navItem.kindModifiers && (navItem.kindModifiers !== "")) {
                    bakedItem.kindModifiers = navItem.kindModifiers;
                }
                if (navItem.containerName && (navItem.containerName.length > 0)) {
                    bakedItem.containerName = navItem.containerName;
                }
                if (navItem.containerKind && (navItem.containerKind.length > 0)) {
                    bakedItem.containerKind = navItem.containerKind;
                }
                return bakedItem;
            }));
    }
    getFullNavigateToItems(args) {
        const { currentFileOnly, searchValue, maxResultCount, projectFileName } = args;
        if (currentFileOnly) {
            Debug.assertIsDefined(args.file);
            const { file, project } = this.getFileAndProject(args);
            return [{ project, navigateToItems: project.getLanguageService().getNavigateToItems(searchValue, maxResultCount, file) }];
        }
        const preferences = this.getHostPreferences();
        const outputs = [];
        // This is effectively a hashset with `name` as the custom hash and `navigateToItemIsEqualTo` as the custom equals.
        // `name` is a very cheap hash function, but we could incorporate other properties to reduce collisions.
        const seenItems = new Map(); // name to items with that name
        if (!args.file && !projectFileName) {
            // VS Code's `Go to symbol in workspaces` sends request like this by default.
            // There's a setting to have it send a file name (reverting to older behavior).
            // TODO (https://github.com/microsoft/TypeScript/issues/47839)
            // This appears to have been intended to search all projects but, in practice, it seems to only search
            // those that are downstream from already-loaded projects.
            // Filtering by !isSourceOfProjectReferenceRedirect is new, but seems appropriate and consistent with
            // the case below.
            this.projectService.loadAncestorProjectTree();
            this.projectService.forEachEnabledProject(project => addItemsForProject(project));
        }
        else {
            // VS's `Go to symbol` sends requests with just a project and doesn't want cascading since it will
            // send a separate request for each project of interest
            // TODO (https://github.com/microsoft/TypeScript/issues/47839)
            // This doesn't really make sense unless it's a single project matching `projectFileName`
            const projects = this.getProjects(args);
            forEachProjectInProjects(projects, /*path*/ undefined, project => addItemsForProject(project));
        }
        return outputs;
        // Mutates `outputs`
        function addItemsForProject(project) {
            const projectItems = project.getLanguageService().getNavigateToItems(searchValue, maxResultCount, 
            /*fileName*/ undefined, 
            /*excludeDts*/ project.isNonTsProject(), 
            /*excludeLibFiles*/ preferences.excludeLibrarySymbolsInNavTo);
            const unseenItems = filter(projectItems, item => tryAddSeenItem(item) && !getMappedLocationForProject(documentSpanLocation(item), project));
            if (unseenItems.length) {
                outputs.push({ project, navigateToItems: unseenItems });
            }
        }
        // Returns true if the item had not been seen before
        // Mutates `seenItems`
        function tryAddSeenItem(item) {
            const name = item.name;
            if (!seenItems.has(name)) {
                seenItems.set(name, [item]);
                return true;
            }
            const seen = seenItems.get(name);
            for (const seenItem of seen) {
                if (navigateToItemIsEqualTo(seenItem, item)) {
                    return false;
                }
            }
            seen.push(item);
            return true;
        }
        function navigateToItemIsEqualTo(a, b) {
            if (a === b) {
                return true;
            }
            if (!a || !b) {
                return false;
            }
            return a.containerKind === b.containerKind &&
                a.containerName === b.containerName &&
                a.fileName === b.fileName &&
                a.isCaseSensitive === b.isCaseSensitive &&
                a.kind === b.kind &&
                a.kindModifiers === b.kindModifiers &&
                a.matchKind === b.matchKind &&
                a.name === b.name &&
                a.textSpan.start === b.textSpan.start &&
                a.textSpan.length === b.textSpan.length;
        }
    }
    getSupportedCodeFixes(args) {
        if (!args)
            return getSupportedCodeFixes(); // Compatibility
        if (args.file) {
            const { file, project } = this.getFileAndProject(args);
            return project.getLanguageService().getSupportedCodeFixes(file);
        }
        const project = this.getProject(args.projectFileName);
        if (!project)
            Errors.ThrowNoProject();
        return project.getLanguageService().getSupportedCodeFixes();
    }
    isLocation(locationOrSpan) {
        return locationOrSpan.line !== undefined;
    }
    extractPositionOrRange(args, scriptInfo) {
        let position;
        let textRange;
        if (this.isLocation(args)) {
            position = getPosition(args);
        }
        else {
            textRange = this.getRange(args, scriptInfo);
        }
        return Debug.checkDefined(position === undefined ? textRange : position);
        function getPosition(loc) {
            return loc.position !== undefined ? loc.position : scriptInfo.lineOffsetToPosition(loc.line, loc.offset);
        }
    }
    getRange(args, scriptInfo) {
        const { startPosition, endPosition } = this.getStartAndEndPosition(args, scriptInfo);
        return { pos: startPosition, end: endPosition };
    }
    getApplicableRefactors(args) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = project.getScriptInfoForNormalizedPath(file);
        const result = project.getLanguageService().getApplicableRefactors(file, this.extractPositionOrRange(args, scriptInfo), this.getPreferences(file), args.triggerReason, args.kind, args.includeInteractiveActions);
        return result.map(result => ({ ...result, actions: result.actions.map(action => ({ ...action, range: action.range ? { start: convertToLocation({ line: action.range.start.line, character: action.range.start.offset }), end: convertToLocation({ line: action.range.end.line, character: action.range.end.offset }) } : undefined })) }));
    }
    getEditsForRefactor(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = project.getScriptInfoForNormalizedPath(file);
        const result = project.getLanguageService().getEditsForRefactor(file, this.getFormatOptions(file), this.extractPositionOrRange(args, scriptInfo), args.refactor, args.action, this.getPreferences(file), args.interactiveRefactorArguments);
        if (result === undefined) {
            return {
                edits: [],
            };
        }
        if (simplifiedResult) {
            const { renameFilename, renameLocation, edits } = result;
            let mappedRenameLocation;
            if (renameFilename !== undefined && renameLocation !== undefined) {
                const renameScriptInfo = project.getScriptInfoForNormalizedPath(toNormalizedPath(renameFilename));
                mappedRenameLocation = getLocationInNewDocument(getSnapshotText(renameScriptInfo.getSnapshot()), renameFilename, renameLocation, edits);
            }
            return {
                renameLocation: mappedRenameLocation,
                renameFilename,
                edits: this.mapTextChangesToCodeEdits(edits),
                notApplicableReason: result.notApplicableReason,
            };
        }
        return result;
    }
    getMoveToRefactoringFileSuggestions(args) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = project.getScriptInfoForNormalizedPath(file);
        return project.getLanguageService().getMoveToRefactoringFileSuggestions(file, this.extractPositionOrRange(args, scriptInfo), this.getPreferences(file));
    }
    preparePasteEdits(args) {
        const { file, project } = this.getFileAndProject(args);
        return project.getLanguageService().preparePasteEditsForFile(file, args.copiedTextSpan.map(copies => this.getRange({ file, startLine: copies.start.line, startOffset: copies.start.offset, endLine: copies.end.line, endOffset: copies.end.offset }, this.projectService.getScriptInfoForNormalizedPath(file))));
    }
    getPasteEdits(args) {
        const { file, project } = this.getFileAndProject(args);
        if (isDynamicFileName(file))
            return undefined;
        const copiedFrom = args.copiedFrom
            ? { file: args.copiedFrom.file, range: args.copiedFrom.spans.map(copies => this.getRange({ file: args.copiedFrom.file, startLine: copies.start.line, startOffset: copies.start.offset, endLine: copies.end.line, endOffset: copies.end.offset }, project.getScriptInfoForNormalizedPath(toNormalizedPath(args.copiedFrom.file)))) }
            : undefined;
        const result = project.getLanguageService().getPasteEdits({
            targetFile: file,
            pastedText: args.pastedText,
            pasteLocations: args.pasteLocations.map(paste => this.getRange({ file, startLine: paste.start.line, startOffset: paste.start.offset, endLine: paste.end.line, endOffset: paste.end.offset }, project.getScriptInfoForNormalizedPath(file))),
            copiedFrom,
            preferences: this.getPreferences(file),
        }, this.getFormatOptions(file));
        return result && this.mapPasteEditsAction(result);
    }
    organizeImports(args, simplifiedResult) {
        var _a;
        Debug.assert(args.scope.type === "file");
        const { file, project } = this.getFileAndProject(args.scope.args);
        const changes = project.getLanguageService().organizeImports({
            fileName: file,
            mode: (_a = args.mode) !== null && _a !== void 0 ? _a : (args.skipDestructiveCodeActions ? OrganizeImportsMode.SortAndCombine : undefined),
            type: "file",
        }, this.getFormatOptions(file), this.getPreferences(file));
        if (simplifiedResult) {
            return this.mapTextChangesToCodeEdits(changes);
        }
        else {
            return changes;
        }
    }
    getEditsForFileRename(args, simplifiedResult) {
        const oldPath = toNormalizedPath(args.oldFilePath);
        const newPath = toNormalizedPath(args.newFilePath);
        const formatOptions = this.getHostFormatOptions();
        const preferences = this.getHostPreferences();
        const seenFiles = new Set();
        const textChanges = [];
        // TODO (https://github.com/microsoft/TypeScript/issues/47839)
        // This appears to have been intended to search all projects but, in practice, it seems to only search
        // those that are downstream from already-loaded projects.
        this.projectService.loadAncestorProjectTree();
        this.projectService.forEachEnabledProject(project => {
            const projectTextChanges = project.getLanguageService().getEditsForFileRename(oldPath, newPath, formatOptions, preferences);
            const projectFiles = [];
            for (const textChange of projectTextChanges) {
                if (!seenFiles.has(textChange.fileName)) {
                    textChanges.push(textChange);
                    projectFiles.push(textChange.fileName);
                }
            }
            for (const file of projectFiles) {
                seenFiles.add(file);
            }
        });
        return simplifiedResult ? textChanges.map(c => this.mapTextChangeToCodeEdit(c)) : textChanges;
    }
    getCodeFixes(args, simplifiedResult) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = project.getScriptInfoForNormalizedPath(file);
        const { startPosition, endPosition } = this.getStartAndEndPosition(args, scriptInfo);
        let codeActions;
        try {
            codeActions = project.getLanguageService().getCodeFixesAtPosition(file, startPosition, endPosition, args.errorCodes, this.getFormatOptions(file), this.getPreferences(file));
        }
        catch (e) {
            const error = e instanceof Error ? e : new Error(e);
            const ls = project.getLanguageService();
            const existingDiagCodes = [
                ...ls.getSyntacticDiagnostics(file),
                ...ls.getSemanticDiagnostics(file),
                ...ls.getSuggestionDiagnostics(file),
            ]
                .filter(d => decodedTextSpanIntersectsWith(startPosition, endPosition - startPosition, d.start, d.length))
                .map(d => d.code);
            const badCode = args.errorCodes.find(c => !existingDiagCodes.includes(c));
            if (badCode !== undefined) {
                error.message += `\nAdditional information: BADCLIENT: Bad error code, ${badCode} not found in range ${startPosition}..${endPosition} (found: ${existingDiagCodes.join(", ")})`;
            }
            throw error;
        }
        return simplifiedResult ? codeActions.map(codeAction => this.mapCodeFixAction(codeAction)) : codeActions;
    }
    getCombinedCodeFix({ scope, fixId }, simplifiedResult) {
        Debug.assert(scope.type === "file");
        const { file, project } = this.getFileAndProject(scope.args);
        const res = project.getLanguageService().getCombinedCodeFix({ type: "file", fileName: file }, fixId, this.getFormatOptions(file), this.getPreferences(file));
        if (simplifiedResult) {
            return { changes: this.mapTextChangesToCodeEdits(res.changes), commands: res.commands };
        }
        else {
            return res;
        }
    }
    applyCodeActionCommand(args) {
        const commands = args.command; // They should be sending back the command we sent them.
        for (const command of toArray(commands)) {
            const { file, project } = this.getFileAndProject(command);
            project.getLanguageService().applyCodeActionCommand(command, this.getFormatOptions(file)).then(_result => { }, _error => { });
        }
        return {};
    }
    getStartAndEndPosition(args, scriptInfo) {
        let startPosition, endPosition;
        if (args.startPosition !== undefined) {
            startPosition = args.startPosition;
        }
        else {
            startPosition = scriptInfo.lineOffsetToPosition(args.startLine, args.startOffset);
            // save the result so we don't always recompute
            args.startPosition = startPosition;
        }
        if (args.endPosition !== undefined) {
            endPosition = args.endPosition;
        }
        else {
            endPosition = scriptInfo.lineOffsetToPosition(args.endLine, args.endOffset);
            args.endPosition = endPosition;
        }
        return { startPosition, endPosition };
    }
    mapCodeAction({ description, changes, commands }) {
        return { description, changes: this.mapTextChangesToCodeEdits(changes), commands };
    }
    mapCodeFixAction({ fixName, description, changes, commands, fixId, fixAllDescription }) {
        return { fixName, description, changes: this.mapTextChangesToCodeEdits(changes), commands, fixId, fixAllDescription };
    }
    mapPasteEditsAction({ edits, fixId }) {
        return { edits: this.mapTextChangesToCodeEdits(edits), fixId };
    }
    mapTextChangesToCodeEdits(textChanges) {
        return textChanges.map(change => this.mapTextChangeToCodeEdit(change));
    }
    mapTextChangeToCodeEdit(textChanges) {
        const scriptInfo = this.projectService.getScriptInfoOrConfig(textChanges.fileName);
        if (!!textChanges.isNewFile === !!scriptInfo) {
            if (!scriptInfo) { // and !isNewFile
                this.projectService.logErrorForScriptInfoNotFound(textChanges.fileName);
            }
            Debug.fail("Expected isNewFile for (only) new files. " + JSON.stringify({ isNewFile: !!textChanges.isNewFile, hasScriptInfo: !!scriptInfo }));
        }
        return scriptInfo
            ? { fileName: textChanges.fileName, textChanges: textChanges.textChanges.map(textChange => convertTextChangeToCodeEdit(textChange, scriptInfo)) }
            : convertNewFileTextChangeToCodeEdit(textChanges);
    }
    convertTextChangeToCodeEdit(change, scriptInfo) {
        return {
            start: scriptInfo.positionToLineOffset(change.span.start),
            end: scriptInfo.positionToLineOffset(change.span.start + change.span.length),
            newText: change.newText ? change.newText : "",
        };
    }
    getBraceMatching(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const position = this.getPosition(args, scriptInfo);
        const spans = languageService.getBraceMatchingAtPosition(file, position);
        return !spans
            ? undefined
            : simplifiedResult
                ? spans.map(span => toProtocolTextSpan(span, scriptInfo))
                : spans;
    }
    getDiagnosticsForProject(next, delay, fileName) {
        if (this.suppressDiagnosticEvents) {
            return;
        }
        const { fileNames, languageServiceDisabled } = this.getProjectInfoWorker(fileName, 
        /*projectFileName*/ undefined, 
        /*needFileNameList*/ true, 
        /*needDefaultConfiguredProjectInfo*/ undefined, 
        /*excludeConfigFiles*/ true);
        if (languageServiceDisabled)
            return;
        // No need to analyze lib.d.ts
        const fileNamesInProject = fileNames.filter(value => !value.includes("lib.d.ts")); // TODO: GH#18217
        if (fileNamesInProject.length === 0)
            return;
        // Sort the file name list to make the recently touched files come first
        const highPriorityFiles = [];
        const mediumPriorityFiles = [];
        const lowPriorityFiles = [];
        const veryLowPriorityFiles = [];
        const normalizedFileName = toNormalizedPath(fileName);
        const project = this.projectService.ensureDefaultProjectForFile(normalizedFileName);
        for (const fileNameInProject of fileNamesInProject) {
            if (this.getCanonicalFileName(fileNameInProject) === this.getCanonicalFileName(fileName)) {
                highPriorityFiles.push(fileNameInProject);
            }
            else {
                const info = this.projectService.getScriptInfo(fileNameInProject); // TODO: GH#18217
                if (!info.isScriptOpen()) {
                    if (isDeclarationFileName(fileNameInProject)) {
                        veryLowPriorityFiles.push(fileNameInProject);
                    }
                    else {
                        lowPriorityFiles.push(fileNameInProject);
                    }
                }
                else {
                    mediumPriorityFiles.push(fileNameInProject);
                }
            }
        }
        const sortedFiles = [...highPriorityFiles, ...mediumPriorityFiles, ...lowPriorityFiles, ...veryLowPriorityFiles];
        const checkList = sortedFiles.map(fileName => ({ fileName, project }));
        // Project level error analysis runs on background files too, therefore
        // doesn't require the file to be opened
        this.updateErrorCheck(next, checkList, delay, /*requireOpen*/ false);
    }
    configurePlugin(args) {
        this.projectService.configurePlugin(args);
    }
    getSmartSelectionRange(args, simplifiedResult) {
        const { locations } = args;
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = Debug.checkDefined(this.projectService.getScriptInfo(file));
        return map(locations, location => {
            const pos = this.getPosition(location, scriptInfo);
            const selectionRange = languageService.getSmartSelectionRange(file, pos);
            return simplifiedResult ? this.mapSelectionRange(selectionRange, scriptInfo) : selectionRange;
        });
    }
    toggleLineComment(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfo(file);
        const textRange = this.getRange(args, scriptInfo);
        const textChanges = languageService.toggleLineComment(file, textRange);
        if (simplifiedResult) {
            const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
            return textChanges.map(textChange => this.convertTextChangeToCodeEdit(textChange, scriptInfo));
        }
        return textChanges;
    }
    toggleMultilineComment(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const textRange = this.getRange(args, scriptInfo);
        const textChanges = languageService.toggleMultilineComment(file, textRange);
        if (simplifiedResult) {
            const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
            return textChanges.map(textChange => this.convertTextChangeToCodeEdit(textChange, scriptInfo));
        }
        return textChanges;
    }
    commentSelection(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const textRange = this.getRange(args, scriptInfo);
        const textChanges = languageService.commentSelection(file, textRange);
        if (simplifiedResult) {
            const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
            return textChanges.map(textChange => this.convertTextChangeToCodeEdit(textChange, scriptInfo));
        }
        return textChanges;
    }
    uncommentSelection(args, simplifiedResult) {
        const { file, languageService } = this.getFileAndLanguageServiceForSyntacticOperation(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        const textRange = this.getRange(args, scriptInfo);
        const textChanges = languageService.uncommentSelection(file, textRange);
        if (simplifiedResult) {
            const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
            return textChanges.map(textChange => this.convertTextChangeToCodeEdit(textChange, scriptInfo));
        }
        return textChanges;
    }
    mapSelectionRange(selectionRange, scriptInfo) {
        const result = {
            textSpan: toProtocolTextSpan(selectionRange.textSpan, scriptInfo),
        };
        if (selectionRange.parent) {
            result.parent = this.mapSelectionRange(selectionRange.parent, scriptInfo);
        }
        return result;
    }
    getScriptInfoFromProjectService(file) {
        const normalizedFile = toNormalizedPath(file);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(normalizedFile);
        if (!scriptInfo) {
            this.projectService.logErrorForScriptInfoNotFound(normalizedFile);
            return Errors.ThrowNoProject();
        }
        return scriptInfo;
    }
    toProtocolCallHierarchyItem(item) {
        const scriptInfo = this.getScriptInfoFromProjectService(item.file);
        return {
            name: item.name,
            kind: item.kind,
            kindModifiers: item.kindModifiers,
            file: item.file,
            containerName: item.containerName,
            span: toProtocolTextSpan(item.span, scriptInfo),
            selectionSpan: toProtocolTextSpan(item.selectionSpan, scriptInfo),
        };
    }
    toProtocolCallHierarchyIncomingCall(incomingCall) {
        const scriptInfo = this.getScriptInfoFromProjectService(incomingCall.from.file);
        return {
            from: this.toProtocolCallHierarchyItem(incomingCall.from),
            fromSpans: incomingCall.fromSpans.map(fromSpan => toProtocolTextSpan(fromSpan, scriptInfo)),
        };
    }
    toProtocolCallHierarchyOutgoingCall(outgoingCall, scriptInfo) {
        return {
            to: this.toProtocolCallHierarchyItem(outgoingCall.to),
            fromSpans: outgoingCall.fromSpans.map(fromSpan => toProtocolTextSpan(fromSpan, scriptInfo)),
        };
    }
    prepareCallHierarchy(args) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file);
        if (scriptInfo) {
            const position = this.getPosition(args, scriptInfo);
            const result = project.getLanguageService().prepareCallHierarchy(file, position);
            return result && mapOneOrMany(result, item => this.toProtocolCallHierarchyItem(item));
        }
        return undefined;
    }
    provideCallHierarchyIncomingCalls(args) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.getScriptInfoFromProjectService(file);
        const incomingCalls = project.getLanguageService().provideCallHierarchyIncomingCalls(file, this.getPosition(args, scriptInfo));
        return incomingCalls.map(call => this.toProtocolCallHierarchyIncomingCall(call));
    }
    provideCallHierarchyOutgoingCalls(args) {
        const { file, project } = this.getFileAndProject(args);
        const scriptInfo = this.getScriptInfoFromProjectService(file);
        const outgoingCalls = project.getLanguageService().provideCallHierarchyOutgoingCalls(file, this.getPosition(args, scriptInfo));
        return outgoingCalls.map(call => this.toProtocolCallHierarchyOutgoingCall(call, scriptInfo));
    }
    getCanonicalFileName(fileName) {
        const name = this.host.useCaseSensitiveFileNames ? fileName : toFileNameLowerCase(fileName);
        return normalizePath(name);
    }
    exit() { }
    notRequired(request) {
        if (request)
            this.doOutput(/*info*/ undefined, request.command, request.seq, /*success*/ true, this.performanceData);
        return { responseRequired: false, performanceData: this.performanceData };
    }
    requiredResponse(response) {
        return { response, responseRequired: true, performanceData: this.performanceData };
    }
    addProtocolHandler(command, handler) {
        if (this.handlers.has(command)) {
            throw new Error(`Protocol handler already exists for command "${command}"`);
        }
        this.handlers.set(command, handler);
    }
    setCurrentRequest(requestId) {
        Debug.assert(this.currentRequestId === undefined);
        this.currentRequestId = requestId;
        this.cancellationToken.setRequest(requestId);
    }
    resetCurrentRequest(requestId) {
        Debug.assert(this.currentRequestId === requestId);
        this.currentRequestId = undefined; // TODO: GH#18217
        this.cancellationToken.resetRequest(requestId);
    }
    executeWithRequestId(requestId, f, perfomanceData) {
        const currentPerformanceData = this.performanceData;
        try {
            this.performanceData = perfomanceData;
            this.setCurrentRequest(requestId);
            return f();
        }
        finally {
            this.resetCurrentRequest(requestId);
            this.performanceData = currentPerformanceData;
        }
    }
    executeCommand(request) {
        const handler = this.handlers.get(request.command);
        if (handler) {
            const response = this.executeWithRequestId(request.seq, () => handler(request), /*perfomanceData*/ undefined);
            this.projectService.enableRequestedPlugins();
            return response;
        }
        else {
            this.logger.msg(`Unrecognized JSON command:${stringifyIndented(request)}`, Msg.Err);
            this.doOutput(/*info*/ undefined, protocol.CommandTypes.Unknown, request.seq, /*success*/ false, /*performanceData*/ undefined, `Unrecognized JSON command: ${request.command}`);
            return { responseRequired: false };
        }
    }
    onMessage(message) {
        this.gcTimer.scheduleCollect();
        let start;
        const currentPerformanceData = this.performanceData;
        if (this.logger.hasLevel(LogLevel.requestTime)) {
            start = this.hrtime();
            if (this.logger.hasLevel(LogLevel.verbose)) {
                this.logger.info(`request:${indent(this.toStringMessage(message))}`);
            }
        }
        let request;
        let relevantFile;
        try {
            request = this.parseMessage(message);
            relevantFile = request.arguments && request.arguments.file ? request.arguments : undefined;
            tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "request", { seq: request.seq, command: request.command });
            tracing === null || tracing === void 0 ? void 0 : tracing.push(tracing.Phase.Session, "executeCommand", { seq: request.seq, command: request.command }, /*separateBeginAndEnd*/ true);
            const { response, responseRequired, performanceData } = this.executeCommand(request);
            tracing === null || tracing === void 0 ? void 0 : tracing.pop();
            if (this.logger.hasLevel(LogLevel.requestTime)) {
                const elapsedTime = hrTimeToMilliseconds(this.hrtime(start)).toFixed(4);
                if (responseRequired) {
                    this.logger.perftrc(`${request.seq}::${request.command}: elapsed time (in milliseconds) ${elapsedTime}`);
                }
                else {
                    this.logger.perftrc(`${request.seq}::${request.command}: async elapsed time (in milliseconds) ${elapsedTime}`);
                }
            }
            // Note: Log before writing the response, else the editor can complete its activity before the server does
            tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "response", { seq: request.seq, command: request.command, success: !!response });
            if (response) {
                this.doOutput(response, request.command, request.seq, 
                /*success*/ true, performanceData);
            }
            else if (responseRequired) {
                this.doOutput(
                /*info*/ undefined, request.command, request.seq, 
                /*success*/ false, performanceData, "No content available.");
            }
        }
        catch (err) {
            // Cancellation or an error may have left incomplete events on the tracing stack.
            tracing === null || tracing === void 0 ? void 0 : tracing.popAll();
            if (err instanceof OperationCanceledException) {
                // Handle cancellation exceptions
                tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "commandCanceled", { seq: request === null || request === void 0 ? void 0 : request.seq, command: request === null || request === void 0 ? void 0 : request.command });
                this.doOutput({ canceled: true }, request.command, request.seq, /*success*/ true, this.performanceData);
                return;
            }
            this.logErrorWorker(err, this.toStringMessage(message), relevantFile);
            tracing === null || tracing === void 0 ? void 0 : tracing.instant(tracing.Phase.Session, "commandError", { seq: request === null || request === void 0 ? void 0 : request.seq, command: request === null || request === void 0 ? void 0 : request.command, message: err.message });
            this.doOutput(
            /*info*/ undefined, request ? request.command : protocol.CommandTypes.Unknown, request ? request.seq : 0, 
            /*success*/ false, this.performanceData, "Error processing request. " + err.message + "\n" + err.stack);
        }
        finally {
            this.performanceData = currentPerformanceData;
        }
    }
    parseMessage(message) {
        return JSON.parse(message);
    }
    toStringMessage(message) {
        return message;
    }
    getFormatOptions(file) {
        return this.projectService.getFormatCodeOptions(file);
    }
    getPreferences(file) {
        return this.projectService.getPreferences(file);
    }
    getHostFormatOptions() {
        return this.projectService.getHostFormatCodeOptions();
    }
    getHostPreferences() {
        return this.projectService.getHostPreferences();
    }
}
function toProtocolPerformanceData(performanceData) {
    const diagnosticsDuration = performanceData.diagnosticsDuration &&
        arrayFrom(performanceData.diagnosticsDuration, ([file, data]) => ({ ...data, file }));
    return { ...performanceData, diagnosticsDuration };
}
function toProtocolTextSpan(textSpan, scriptInfo) {
    return {
        start: scriptInfo.positionToLineOffset(textSpan.start),
        end: scriptInfo.positionToLineOffset(textSpanEnd(textSpan)),
    };
}
function toProtocolTextSpanWithContext(span, contextSpan, scriptInfo) {
    const textSpan = toProtocolTextSpan(span, scriptInfo);
    const contextTextSpan = contextSpan && toProtocolTextSpan(contextSpan, scriptInfo);
    return contextTextSpan ?
        { ...textSpan, contextStart: contextTextSpan.start, contextEnd: contextTextSpan.end } :
        textSpan;
}
function convertTextChangeToCodeEdit(change, scriptInfo) {
    return { start: positionToLineOffset(scriptInfo, change.span.start), end: positionToLineOffset(scriptInfo, textSpanEnd(change.span)), newText: change.newText };
}
function positionToLineOffset(info, position) {
    return isConfigFile(info) ? locationFromLineAndCharacter(info.getLineAndCharacterOfPosition(position)) : info.positionToLineOffset(position);
}
function convertLinkedEditInfoToRanges(linkedEdit, scriptInfo) {
    const ranges = linkedEdit.ranges.map(r => {
        return {
            start: scriptInfo.positionToLineOffset(r.start),
            end: scriptInfo.positionToLineOffset(r.start + r.length),
        };
    });
    if (!linkedEdit.wordPattern)
        return { ranges };
    return { ranges, wordPattern: linkedEdit.wordPattern };
}
function locationFromLineAndCharacter(lc) {
    return { line: lc.line + 1, offset: lc.character + 1 };
}
function convertNewFileTextChangeToCodeEdit(textChanges) {
    Debug.assert(textChanges.textChanges.length === 1);
    const change = first(textChanges.textChanges);
    Debug.assert(change.span.start === 0 && change.span.length === 0);
    return { fileName: textChanges.fileName, textChanges: [{ start: { line: 0, offset: 0 }, end: { line: 0, offset: 0 }, newText: change.newText }] };
}
/** @internal */
// Exported only for tests
export function getLocationInNewDocument(oldText, renameFilename, renameLocation, edits) {
    const newText = applyEdits(oldText, renameFilename, edits);
    const { line, character } = computeLineAndCharacterOfPosition(computeLineStarts(newText), renameLocation);
    return { line: line + 1, offset: character + 1 };
}
function applyEdits(text, textFilename, edits) {
    for (const { fileName, textChanges } of edits) {
        if (fileName !== textFilename) {
            continue;
        }
        for (let i = textChanges.length - 1; i >= 0; i--) {
            const { newText, span: { start, length } } = textChanges[i];
            text = text.slice(0, start) + newText + text.slice(start + length);
        }
    }
    return text;
}
function referenceEntryToReferencesResponseItem(projectService, { fileName, textSpan, contextSpan, isWriteAccess, isDefinition }, { disableLineTextInReferences }) {
    const scriptInfo = Debug.checkDefined(projectService.getScriptInfo(fileName));
    const span = toProtocolTextSpanWithContext(textSpan, contextSpan, scriptInfo);
    const lineText = disableLineTextInReferences ? undefined : getLineText(scriptInfo, span);
    return {
        file: fileName,
        ...span,
        lineText,
        isWriteAccess,
        isDefinition,
    };
}
function getLineText(scriptInfo, span) {
    const lineSpan = scriptInfo.lineToTextSpan(span.start.line - 1);
    return scriptInfo.getSnapshot().getText(lineSpan.start, textSpanEnd(lineSpan)).replace(/\r|\n/g, "");
}
function isCompletionEntryData(data) {
    return data === undefined || data && typeof data === "object"
        && typeof data.exportName === "string"
        && (data.fileName === undefined || typeof data.fileName === "string")
        && (data.ambientModuleName === undefined || typeof data.ambientModuleName === "string"
            && (data.isPackageJsonImport === undefined || typeof data.isPackageJsonImport === "boolean"));
}
