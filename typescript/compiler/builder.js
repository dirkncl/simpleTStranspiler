import {
  addRange,
  append,
  arrayFrom,
  arrayToMap,
  BuilderState,
  compareStringsCaseSensitive,
  compareValues,
  compilerOptionsAffectDeclarationPath,
  compilerOptionsAffectEmit,
  compilerOptionsAffectSemanticDiagnostics,
  concatenate,
  convertToOptionsWithAbsolutePaths,
  createGetCanonicalFileName,
  createModeMismatchDetails,
  createModuleNotFoundChain,
  createProgram,
  Debug,
  DiagnosticCategory,
  EmitOnly,
  emitSkippedWithNoDiagnostics,
  emptyArray,
  ensurePathIsNonModuleName,
  FileIncludeKind,
  filterSemanticDiagnostics,
  forEach,
  forEachEntry,
  forEachKey,
  generateDjb2Hash,
  getDirectoryPath,
  getEmitDeclarations,
  getIsolatedModules,
  getNormalizedAbsolutePath,
  getOptionsNameMap,
  getOwnKeys,
  getRelativePathFromDirectory,
  getSourceFileOfNode,
  getTsBuildInfoEmitOutputFilePath,
  handleNoEmitOptions,
  isArray,
  isDeclarationFileName,
  isIncrementalCompilation,
  isJsonSourceFile,
  isNumber,
  isString,
  map,
  mapDefinedIterator,
  maybeBind,
  noop,
  notImplemented,
  returnFalse,
  returnUndefined,
  sameMap,
  SignatureInfo,
  skipAlias,
  skipTypeCheckingIgnoringNoCheck,
  some,
  sourceFileMayBeEmitted,
  SymbolFlags,
  toPath,
  tryAddToSet,
  version,
} from "./namespaces/ts.js";

// // dprint-ignore
// /** @internal */
// export const enum BuilderFileEmit {
//     None                = 0,
//     Js                  = 1 << 0,                       // emit js file
//     JsMap               = 1 << 1,                       // emit js.map file
//     JsInlineMap         = 1 << 2,                       // emit inline source map in js file
//     DtsErrors           = 1 << 3,                       // emit dts errors
//     DtsEmit             = 1 << 4,                       // emit d.ts file
//     DtsMap              = 1 << 5,                       // emit d.ts.map file
// 
//     Dts                 = DtsErrors | DtsEmit,
//     AllJs               = Js | JsMap | JsInlineMap,
//     AllDtsEmit          = DtsEmit | DtsMap,
//     AllDts              = Dts | DtsMap,
//     All                 = AllJs | AllDts,
// }
// dprint-ignore
/** @internal */
export var BuilderFileEmit;
(function (BuilderFileEmit) {
    BuilderFileEmit[BuilderFileEmit["None"] = 0] = "None";
    BuilderFileEmit[BuilderFileEmit["Js"] = 1] = "Js";
    BuilderFileEmit[BuilderFileEmit["JsMap"] = 2] = "JsMap";
    BuilderFileEmit[BuilderFileEmit["JsInlineMap"] = 4] = "JsInlineMap";
    BuilderFileEmit[BuilderFileEmit["DtsErrors"] = 8] = "DtsErrors";
    BuilderFileEmit[BuilderFileEmit["DtsEmit"] = 16] = "DtsEmit";
    BuilderFileEmit[BuilderFileEmit["DtsMap"] = 32] = "DtsMap";
    BuilderFileEmit[BuilderFileEmit["Dts"] = 24] = "Dts";
    BuilderFileEmit[BuilderFileEmit["AllJs"] = 7] = "AllJs";
    BuilderFileEmit[BuilderFileEmit["AllDtsEmit"] = 48] = "AllDtsEmit";
    BuilderFileEmit[BuilderFileEmit["AllDts"] = 56] = "AllDts";
    BuilderFileEmit[BuilderFileEmit["All"] = 63] = "All";
})(BuilderFileEmit || (BuilderFileEmit = {}));

function isBuilderProgramStateWithDefinedProgram(state) {
    return state.program !== undefined;
}

function toBuilderProgramStateWithDefinedProgram(state) {
    Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
    return state;
}
/**
 * Get flags determining what all needs to be emitted
 *
 * @internal
 */
export function getBuilderFileEmit(options) {
    let result = 1 /* BuilderFileEmit.Js */;
    if (options.sourceMap)
        result = result | 2 /* BuilderFileEmit.JsMap */;
    if (options.inlineSourceMap)
        result = result | 4 /* BuilderFileEmit.JsInlineMap */;
    if (getEmitDeclarations(options))
        result = result | 24 /* BuilderFileEmit.Dts */;
    if (options.declarationMap)
        result = result | 32 /* BuilderFileEmit.DtsMap */;
    if (options.emitDeclarationOnly)
        result = result & 56 /* BuilderFileEmit.AllDts */;
    return result;
}
function getPendingEmitKind(optionsOrEmitKind, oldOptionsOrEmitKind) {
    const oldEmitKind = oldOptionsOrEmitKind && (isNumber(oldOptionsOrEmitKind) ? oldOptionsOrEmitKind : getBuilderFileEmit(oldOptionsOrEmitKind));
    const emitKind = isNumber(optionsOrEmitKind) ? optionsOrEmitKind : getBuilderFileEmit(optionsOrEmitKind);
    if (oldEmitKind === emitKind)
        return 0 /* BuilderFileEmit.None */;
    if (!oldEmitKind || !emitKind)
        return emitKind;
    const diff = oldEmitKind ^ emitKind;
    let result = 0 /* BuilderFileEmit.None */;
    // If there is diff in Js emit, pending emit is js emit flags
    if (diff & 7 /* BuilderFileEmit.AllJs */)
        result = emitKind & 7 /* BuilderFileEmit.AllJs */;
    // If dts errors pending, add dts errors flag
    if (diff & 8 /* BuilderFileEmit.DtsErrors */)
        result = result | (emitKind & 8 /* BuilderFileEmit.DtsErrors */);
    // If there is diff in Dts emit, pending emit is dts emit flags
    if (diff & 48 /* BuilderFileEmit.AllDtsEmit */)
        result = result | (emitKind & 48 /* BuilderFileEmit.AllDtsEmit */);
    return result;
}
function hasSameKeys(map1, map2) {
    // Has same size and every key is present in both maps
    return map1 === map2 || map1 !== undefined && map2 !== undefined && map1.size === map2.size && !forEachKey(map1, key => !map2.has(key));
}
/**
 * Create the state so that we can iterate on changedFiles/affected files
 */
function createBuilderProgramState(newProgram, oldState) {
    var _a, _b;
    const state = BuilderState.create(newProgram, oldState, /*disableUseFileVersionAsSignature*/ false);
    state.program = newProgram;
    const compilerOptions = newProgram.getCompilerOptions();
    state.compilerOptions = compilerOptions;
    const outFilePath = compilerOptions.outFile;
    state.semanticDiagnosticsPerFile = new Map();
    if (outFilePath && compilerOptions.composite && (oldState === null || oldState === void 0 ? void 0 : oldState.outSignature) && outFilePath === oldState.compilerOptions.outFile) {
        state.outSignature = oldState.outSignature && getEmitSignatureFromOldSignature(compilerOptions, oldState.compilerOptions, oldState.outSignature);
    }
    state.changedFilesSet = new Set();
    state.latestChangedDtsFile = compilerOptions.composite ? oldState === null || oldState === void 0 ? void 0 : oldState.latestChangedDtsFile : undefined;
    state.checkPending = state.compilerOptions.noCheck ? true : undefined;
    const useOldState = BuilderState.canReuseOldState(state.referencedMap, oldState);
    const oldCompilerOptions = useOldState ? oldState.compilerOptions : undefined;
    let canCopySemanticDiagnostics = useOldState &&
        !compilerOptionsAffectSemanticDiagnostics(compilerOptions, oldCompilerOptions);
    // We can only reuse emit signatures (i.e. .d.ts signatures) if the .d.ts file is unchanged,
    // which will eg be depedent on change in options like declarationDir and outDir options are unchanged.
    // We need to look in oldState.compilerOptions, rather than oldCompilerOptions (i.e.we need to disregard useOldState) because
    // oldCompilerOptions can be undefined if there was change in say module from None to some other option
    // which would make useOldState as false since we can now use reference maps that are needed to track what to emit, what to check etc
    // but that option change does not affect d.ts file name so emitSignatures should still be reused.
    const canCopyEmitSignatures = compilerOptions.composite &&
        (oldState === null || oldState === void 0 ? void 0 : oldState.emitSignatures) &&
        !outFilePath &&
        !compilerOptionsAffectDeclarationPath(compilerOptions, oldState.compilerOptions);
    let canCopyEmitDiagnostics = true;
    if (useOldState) {
        // Copy old state's changed files set
        (_a = oldState.changedFilesSet) === null || _a === void 0 ? void 0 : _a.forEach(value => state.changedFilesSet.add(value));
        if (!outFilePath && ((_b = oldState.affectedFilesPendingEmit) === null || _b === void 0 ? void 0 : _b.size)) {
            state.affectedFilesPendingEmit = new Map(oldState.affectedFilesPendingEmit);
            state.seenAffectedFiles = new Set();
        }
        state.programEmitPending = oldState.programEmitPending;
        // If there is changeSet with --outFile, cannot copy semantic diagnsotics or emitDiagnostics
        // as they all need to be calculated again all together since we dont know whats the affected file set because of the way d.ts works
        if (outFilePath && state.changedFilesSet.size) {
            canCopySemanticDiagnostics = false;
            canCopyEmitDiagnostics = false;
        }
        state.hasErrorsFromOldState = oldState.hasErrors;
    }
    else {
        // We arent using old state, so atleast emit buildInfo with current information
        state.buildInfoEmitPending = isIncrementalCompilation(compilerOptions);
    }
    // Update changed files and copy semantic diagnostics if we can
    const referencedMap = state.referencedMap;
    const oldReferencedMap = useOldState ? oldState.referencedMap : undefined;
    const copyDeclarationFileDiagnostics = canCopySemanticDiagnostics && !compilerOptions.skipLibCheck === !oldCompilerOptions.skipLibCheck;
    const copyLibFileDiagnostics = copyDeclarationFileDiagnostics && !compilerOptions.skipDefaultLibCheck === !oldCompilerOptions.skipDefaultLibCheck;
    state.fileInfos.forEach((info, sourceFilePath) => {
        var _a, _b, _c, _d;
        let oldInfo;
        let newReferences;
        // if not using old state, every file is changed
        if (!useOldState ||
            // File wasn't present in old state
            !(oldInfo = oldState.fileInfos.get(sourceFilePath)) ||
            // versions dont match
            oldInfo.version !== info.version ||
            // Implied formats dont match
            oldInfo.impliedFormat !== info.impliedFormat ||
            // Referenced files changed
            !hasSameKeys(newReferences = referencedMap && referencedMap.getValues(sourceFilePath), oldReferencedMap && oldReferencedMap.getValues(sourceFilePath)) ||
            // Referenced file was deleted in the new program
            newReferences && forEachKey(newReferences, path => !state.fileInfos.has(path) && oldState.fileInfos.has(path))) {
            // Register file as changed file and do not copy semantic diagnostics, since all changed files need to be re-evaluated
            addFileToChangeSet(sourceFilePath);
        }
        else {
            const sourceFile = newProgram.getSourceFileByPath(sourceFilePath);
            const emitDiagnostics = canCopyEmitDiagnostics ?
                (_a = oldState.emitDiagnosticsPerFile) === null || _a === void 0 ? void 0 : _a.get(sourceFilePath) : undefined;
            if (emitDiagnostics) {
                ((_b = state.emitDiagnosticsPerFile) !== null && _b !== void 0 ? _b : (state.emitDiagnosticsPerFile = new Map())).set(sourceFilePath, oldState.hasReusableDiagnostic ?
                    convertToDiagnostics(emitDiagnostics, sourceFilePath, newProgram) :
                    repopulateDiagnostics(emitDiagnostics, newProgram));
            }
            if (canCopySemanticDiagnostics) {
                if (sourceFile.isDeclarationFile && !copyDeclarationFileDiagnostics)
                    return;
                if (sourceFile.hasNoDefaultLib && !copyLibFileDiagnostics)
                    return;
                // Unchanged file copy diagnostics
                const diagnostics = oldState.semanticDiagnosticsPerFile.get(sourceFilePath);
                if (diagnostics) {
                    state.semanticDiagnosticsPerFile.set(sourceFilePath, oldState.hasReusableDiagnostic ?
                        convertToDiagnostics(diagnostics, sourceFilePath, newProgram) :
                        repopulateDiagnostics(diagnostics, newProgram));
                    ((_c = state.semanticDiagnosticsFromOldState) !== null && _c !== void 0 ? _c : (state.semanticDiagnosticsFromOldState = new Set())).add(sourceFilePath);
                }
            }
        }
        if (canCopyEmitSignatures) {
            const oldEmitSignature = oldState.emitSignatures.get(sourceFilePath);
            if (oldEmitSignature) {
                ((_d = state.emitSignatures) !== null && _d !== void 0 ? _d : (state.emitSignatures = new Map())).set(sourceFilePath, getEmitSignatureFromOldSignature(compilerOptions, oldState.compilerOptions, oldEmitSignature));
            }
        }
    });
    // If the global file is removed, add all files as changed
    if (useOldState && forEachEntry(oldState.fileInfos, (info, sourceFilePath) => {
        if (state.fileInfos.has(sourceFilePath))
            return false;
        if (info.affectsGlobalScope)
            return true;
        // if file is deleted we need to write buildInfo again
        state.buildInfoEmitPending = true;
        return !!outFilePath;
    })) {
        BuilderState.getAllFilesExcludingDefaultLibraryFile(state, newProgram, /*firstSourceFile*/ undefined)
            .forEach(file => addFileToChangeSet(file.resolvedPath));
    }
    else if (oldCompilerOptions) {
        // If options affect emit, then we need to do complete emit per compiler options
        // otherwise only the js or dts that needs to emitted because its different from previously emitted options
        const pendingEmitKind = compilerOptionsAffectEmit(compilerOptions, oldCompilerOptions) ?
            getBuilderFileEmit(compilerOptions) :
            getPendingEmitKind(compilerOptions, oldCompilerOptions);
        if (pendingEmitKind !== 0 /* BuilderFileEmit.None */) {
            if (!outFilePath) {
                // Add all files to affectedFilesPendingEmit since emit changed
                newProgram.getSourceFiles().forEach(f => {
                    // Add to affectedFilesPending emit only if not changed since any changed file will do full emit
                    if (!state.changedFilesSet.has(f.resolvedPath)) {
                        addToAffectedFilesPendingEmit(state, f.resolvedPath, pendingEmitKind);
                    }
                });
                Debug.assert(!state.seenAffectedFiles || !state.seenAffectedFiles.size);
                state.seenAffectedFiles = state.seenAffectedFiles || new Set();
            }
            else if (!state.changedFilesSet.size) {
                state.programEmitPending = state.programEmitPending ?
                    state.programEmitPending | pendingEmitKind :
                    pendingEmitKind;
            }
            state.buildInfoEmitPending = true;
        }
    }
    if (useOldState &&
        state.semanticDiagnosticsPerFile.size !== state.fileInfos.size &&
        oldState.checkPending !== state.checkPending)
        state.buildInfoEmitPending = true;
    return state;
    function addFileToChangeSet(path) {
        state.changedFilesSet.add(path);
        if (outFilePath) {
            // If there is changeSet with --outFile, cannot copy semantic diagnsotics or emitDiagnostics
            // as they all need to be calculated again all together since we dont know whats the affected file set because of the way d.ts works
            canCopySemanticDiagnostics = false;
            canCopyEmitDiagnostics = false;
            state.semanticDiagnosticsFromOldState = undefined;
            state.semanticDiagnosticsPerFile.clear();
            state.emitDiagnosticsPerFile = undefined;
        }
        state.buildInfoEmitPending = true;
        // Setting this to undefined as changed files means full emit so no need to track emit explicitly
        state.programEmitPending = undefined;
    }
}
/**
 * Covert to Emit signature based on oldOptions and EmitSignature format
 * If d.ts map options differ then swap the format, otherwise use as is
 */
function getEmitSignatureFromOldSignature(options, oldOptions, oldEmitSignature) {
    return !!options.declarationMap === !!oldOptions.declarationMap ?
        // Use same format of signature
        oldEmitSignature :
        // Convert to different format
        isString(oldEmitSignature) ? [oldEmitSignature] : oldEmitSignature[0];
}
function repopulateDiagnostics(diagnostics, newProgram) {
    if (!diagnostics.length)
        return diagnostics;
    return sameMap(diagnostics, diag => {
        if (isString(diag.messageText))
            return diag;
        const repopulatedChain = convertOrRepopulateDiagnosticMessageChain(diag.messageText, diag.file, newProgram, chain => { var _a; return (_a = chain.repopulateInfo) === null || _a === void 0 ? void 0 : _a.call(chain); });
        return repopulatedChain === diag.messageText ?
            diag : Object.assign(Object.assign({}, diag), { messageText: repopulatedChain });
    });
}
function convertOrRepopulateDiagnosticMessageChain(chain, sourceFile, newProgram, repopulateInfo) {
    const info = repopulateInfo(chain);
    if (info === true) {
        return Object.assign(Object.assign({}, createModeMismatchDetails(sourceFile)), { next: convertOrRepopulateDiagnosticMessageChainArray(chain.next, sourceFile, newProgram, repopulateInfo) });
    }
    else if (info) {
        return Object.assign(Object.assign({}, createModuleNotFoundChain(sourceFile, newProgram, info.moduleReference, info.mode, info.packageName || info.moduleReference)), { next: convertOrRepopulateDiagnosticMessageChainArray(chain.next, sourceFile, newProgram, repopulateInfo) });
    }
    const next = convertOrRepopulateDiagnosticMessageChainArray(chain.next, sourceFile, newProgram, repopulateInfo);
    return next === chain.next ? chain : Object.assign(Object.assign({}, chain), { next });
}
function convertOrRepopulateDiagnosticMessageChainArray(array, sourceFile, newProgram, repopulateInfo) {
    return sameMap(array, chain => convertOrRepopulateDiagnosticMessageChain(chain, sourceFile, newProgram, repopulateInfo));
}
function convertToDiagnostics(diagnostics, diagnosticFilePath, newProgram) {
    if (!diagnostics.length)
        return emptyArray;
    let buildInfoDirectory;
    return diagnostics.map(diagnostic => {
        const result = convertToDiagnosticRelatedInformation(diagnostic, diagnosticFilePath, newProgram, toPathInBuildInfoDirectory);
        result.reportsUnnecessary = diagnostic.reportsUnnecessary;
        result.reportsDeprecated = diagnostic.reportDeprecated;
        result.source = diagnostic.source;
        result.skippedOn = diagnostic.skippedOn;
        const { relatedInformation } = diagnostic;
        result.relatedInformation = relatedInformation ?
            relatedInformation.length ?
                relatedInformation.map(r => convertToDiagnosticRelatedInformation(r, diagnosticFilePath, newProgram, toPathInBuildInfoDirectory)) :
                [] :
            undefined;
        return result;
    });
    function toPathInBuildInfoDirectory(path) {
        buildInfoDirectory !== null && buildInfoDirectory !== void 0 ? buildInfoDirectory : (buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(getTsBuildInfoEmitOutputFilePath(newProgram.getCompilerOptions()), newProgram.getCurrentDirectory())));
        return toPath(path, buildInfoDirectory, newProgram.getCanonicalFileName);
    }
}
function convertToDiagnosticRelatedInformation(diagnostic, diagnosticFilePath, newProgram, toPath) {
    const { file } = diagnostic;
    const sourceFile = file !== false ?
        newProgram.getSourceFileByPath(file ? toPath(file) : diagnosticFilePath) :
        undefined;
    return Object.assign(Object.assign({}, diagnostic), { file: sourceFile, messageText: isString(diagnostic.messageText) ?
            diagnostic.messageText :
            convertOrRepopulateDiagnosticMessageChain(diagnostic.messageText, sourceFile, newProgram, chain => chain.info) });
}
/**
 * Releases program and other related not needed properties
 */
function releaseCache(state) {
    BuilderState.releaseCache(state);
    state.program = undefined;
}
/**
 * Verifies that source file is ok to be used in calls that arent handled by next
 */
function assertSourceFileOkWithoutNextAffectedCall(state, sourceFile) {
    Debug.assert(!sourceFile || !state.affectedFiles || state.affectedFiles[state.affectedFilesIndex - 1] !== sourceFile || !state.semanticDiagnosticsPerFile.has(sourceFile.resolvedPath));
}
/**
 * This function returns the next affected file to be processed.
 * Note that until doneAffected is called it would keep reporting same result
 * This is to allow the callers to be able to actually remove affected file only when the operation is complete
 * eg. if during diagnostics check cancellation token ends up cancelling the request, the affected file should be retained
 */
function getNextAffectedFile(state, cancellationToken, host) {
    var _a;
    while (true) {
        const { affectedFiles } = state;
        if (affectedFiles) {
            const seenAffectedFiles = state.seenAffectedFiles;
            let affectedFilesIndex = state.affectedFilesIndex; // TODO: GH#18217
            while (affectedFilesIndex < affectedFiles.length) {
                const affectedFile = affectedFiles[affectedFilesIndex];
                if (!seenAffectedFiles.has(affectedFile.resolvedPath)) {
                    // Set the next affected file as seen and remove the cached semantic diagnostics
                    state.affectedFilesIndex = affectedFilesIndex;
                    addToAffectedFilesPendingEmit(state, affectedFile.resolvedPath, getBuilderFileEmit(state.compilerOptions));
                    handleDtsMayChangeOfAffectedFile(state, affectedFile, cancellationToken, host);
                    return affectedFile;
                }
                affectedFilesIndex++;
            }
            // Remove the changed file from the change set
            state.changedFilesSet.delete(state.currentChangedFilePath);
            state.currentChangedFilePath = undefined;
            // Commit the changes in file signature
            (_a = state.oldSignatures) === null || _a === void 0 ? void 0 : _a.clear();
            state.affectedFiles = undefined;
        }
        // Get next changed file
        const nextKey = state.changedFilesSet.keys().next();
        if (nextKey.done) {
            // Done
            return undefined;
        }
        // With --out or --outFile all outputs go into single file
        // so operations are performed directly on program, return program
        const compilerOptions = state.program.getCompilerOptions();
        if (compilerOptions.outFile)
            return state.program;
        // Get next batch of affected files
        state.affectedFiles = BuilderState.getFilesAffectedByWithOldState(state, state.program, nextKey.value, cancellationToken, host);
        state.currentChangedFilePath = nextKey.value;
        state.affectedFilesIndex = 0;
        if (!state.seenAffectedFiles)
            state.seenAffectedFiles = new Set();
    }
}
function clearAffectedFilesPendingEmit(state, emitOnlyDtsFiles, isForDtsErrors) {
    var _a, _b;
    if (!((_a = state.affectedFilesPendingEmit) === null || _a === void 0 ? void 0 : _a.size) && !state.programEmitPending)
        return;
    if (!emitOnlyDtsFiles && !isForDtsErrors) {
        state.affectedFilesPendingEmit = undefined;
        state.programEmitPending = undefined;
    }
    (_b = state.affectedFilesPendingEmit) === null || _b === void 0 ? void 0 : _b.forEach((emitKind, path) => {
        // Mark the files as pending only if they are pending on js files, remove the dts emit pending flag
        const pending = !isForDtsErrors ?
            emitKind & 7 /* BuilderFileEmit.AllJs */ :
            emitKind & (7 /* BuilderFileEmit.AllJs */ | 48 /* BuilderFileEmit.AllDtsEmit */);
        if (!pending)
            state.affectedFilesPendingEmit.delete(path);
        else
            state.affectedFilesPendingEmit.set(path, pending);
    });
    // Mark the program as pending only if its pending on js files, remove the dts emit pending flag
    if (state.programEmitPending) {
        const pending = !isForDtsErrors ?
            state.programEmitPending & 7 /* BuilderFileEmit.AllJs */ :
            state.programEmitPending & (7 /* BuilderFileEmit.AllJs */ | 48 /* BuilderFileEmit.AllDtsEmit */);
        if (!pending)
            state.programEmitPending = undefined;
        else
            state.programEmitPending = pending;
    }
}
/**
 * Determining what all is pending to be emitted based on previous options or previous file emit flags
 *  @internal
 */
export function getPendingEmitKindWithSeen(optionsOrEmitKind, seenOldOptionsOrEmitKind, emitOnlyDtsFiles, isForDtsErrors) {
    let pendingKind = getPendingEmitKind(optionsOrEmitKind, seenOldOptionsOrEmitKind);
    if (emitOnlyDtsFiles)
        pendingKind = pendingKind & 56 /* BuilderFileEmit.AllDts */;
    if (isForDtsErrors)
        pendingKind = pendingKind & 8 /* BuilderFileEmit.DtsErrors */;
    return pendingKind;
}
function getBuilderFileEmitAllDts(isForDtsErrors) {
    return !isForDtsErrors ? 56 /* BuilderFileEmit.AllDts */ : 8 /* BuilderFileEmit.DtsErrors */;
}
/**
 * Returns next file to be emitted from files that retrieved semantic diagnostics but did not emit yet
 */
function getNextAffectedFilePendingEmit(state, emitOnlyDtsFiles, isForDtsErrors) {
    var _a;
    if (!((_a = state.affectedFilesPendingEmit) === null || _a === void 0 ? void 0 : _a.size))
        return undefined;
    return forEachEntry(state.affectedFilesPendingEmit, (emitKind, path) => {
        var _a;
        const affectedFile = state.program.getSourceFileByPath(path);
        if (!affectedFile || !sourceFileMayBeEmitted(affectedFile, state.program)) {
            state.affectedFilesPendingEmit.delete(path);
            return undefined;
        }
        const seenKind = (_a = state.seenEmittedFiles) === null || _a === void 0 ? void 0 : _a.get(affectedFile.resolvedPath);
        const pendingKind = getPendingEmitKindWithSeen(emitKind, seenKind, emitOnlyDtsFiles, isForDtsErrors);
        if (pendingKind)
            return { affectedFile, emitKind: pendingKind };
    });
}
function getNextPendingEmitDiagnosticsFile(state, isForDtsErrors) {
    var _a;
    if (!((_a = state.emitDiagnosticsPerFile) === null || _a === void 0 ? void 0 : _a.size))
        return undefined;
    return forEachEntry(state.emitDiagnosticsPerFile, (diagnostics, path) => {
        var _a;
        const affectedFile = state.program.getSourceFileByPath(path);
        if (!affectedFile || !sourceFileMayBeEmitted(affectedFile, state.program)) {
            state.emitDiagnosticsPerFile.delete(path);
            return undefined;
        }
        const seenKind = ((_a = state.seenEmittedFiles) === null || _a === void 0 ? void 0 : _a.get(affectedFile.resolvedPath)) || 0 /* BuilderFileEmit.None */;
        if (!(seenKind & getBuilderFileEmitAllDts(isForDtsErrors)))
            return { affectedFile, diagnostics, seenKind };
    });
}
function removeDiagnosticsOfLibraryFiles(state) {
    if (!state.cleanedDiagnosticsOfLibFiles) {
        state.cleanedDiagnosticsOfLibFiles = true;
        const options = state.program.getCompilerOptions();
        forEach(state.program.getSourceFiles(), f => state.program.isSourceFileDefaultLibrary(f) &&
            !skipTypeCheckingIgnoringNoCheck(f, options, state.program) &&
            removeSemanticDiagnosticsOf(state, f.resolvedPath));
    }
}
/**
 *  Handles semantic diagnostics and dts emit for affectedFile and files, that are referencing modules that export entities from affected file
 *  This is because even though js emit doesnt change, dts emit / type used can change resulting in need for dts emit and js change
 */
function handleDtsMayChangeOfAffectedFile(state, affectedFile, cancellationToken, host) {
    removeSemanticDiagnosticsOf(state, affectedFile.resolvedPath);
    // If affected files is everything except default library, then nothing more to do
    if (state.allFilesExcludingDefaultLibraryFile === state.affectedFiles) {
        removeDiagnosticsOfLibraryFiles(state);
        // When a change affects the global scope, all files are considered to be affected without updating their signature
        // That means when affected file is handled, its signature can be out of date
        // To avoid this, ensure that we update the signature for any affected file in this scenario.
        BuilderState.updateShapeSignature(state, state.program, affectedFile, cancellationToken, host);
        return;
    }
    if (state.compilerOptions.assumeChangesOnlyAffectDirectDependencies)
        return;
    handleDtsMayChangeOfReferencingExportOfAffectedFile(state, affectedFile, cancellationToken, host);
}
/**
 * Handle the dts may change, so they need to be added to pending emit if dts emit is enabled,
 * Also we need to make sure signature is updated for these files
 */
function handleDtsMayChangeOf(state, path, invalidateJsFiles, cancellationToken, host) {
    removeSemanticDiagnosticsOf(state, path);
    if (!state.changedFilesSet.has(path)) {
        const sourceFile = state.program.getSourceFileByPath(path);
        if (sourceFile) {
            // Even though the js emit doesnt change and we are already handling dts emit and semantic diagnostics
            // we need to update the signature to reflect correctness of the signature(which is output d.ts emit) of this file
            // This ensures that we dont later during incremental builds considering wrong signature.
            // Eg where this also is needed to ensure that .tsbuildinfo generated by incremental build should be same as if it was first fresh build
            // But we avoid expensive full shape computation, as using file version as shape is enough for correctness.
            BuilderState.updateShapeSignature(state, state.program, sourceFile, cancellationToken, host, 
            /*useFileVersionAsSignature*/ true);
            // If not dts emit, nothing more to do
            if (invalidateJsFiles) {
                addToAffectedFilesPendingEmit(state, path, getBuilderFileEmit(state.compilerOptions));
            }
            else if (getEmitDeclarations(state.compilerOptions)) {
                addToAffectedFilesPendingEmit(state, path, state.compilerOptions.declarationMap ? 56 /* BuilderFileEmit.AllDts */ : 24 /* BuilderFileEmit.Dts */);
            }
        }
    }
}
/**
 * Removes semantic diagnostics for path and
 * returns true if there are no more semantic diagnostics from the old state
 */
function removeSemanticDiagnosticsOf(state, path) {
    if (!state.semanticDiagnosticsFromOldState) {
        return true;
    }
    state.semanticDiagnosticsFromOldState.delete(path);
    state.semanticDiagnosticsPerFile.delete(path);
    return !state.semanticDiagnosticsFromOldState.size;
}
function isChangedSignature(state, path) {
    const oldSignature = Debug.checkDefined(state.oldSignatures).get(path) || undefined;
    const newSignature = Debug.checkDefined(state.fileInfos.get(path)).signature;
    return newSignature !== oldSignature;
}
function handleDtsMayChangeOfGlobalScope(state, filePath, invalidateJsFiles, cancellationToken, host) {
    var _a;
    if (!((_a = state.fileInfos.get(filePath)) === null || _a === void 0 ? void 0 : _a.affectsGlobalScope))
        return false;
    // Every file needs to be handled
    BuilderState.getAllFilesExcludingDefaultLibraryFile(state, state.program, 
    /*firstSourceFile*/ undefined).forEach(file => handleDtsMayChangeOf(state, file.resolvedPath, invalidateJsFiles, cancellationToken, host));
    removeDiagnosticsOfLibraryFiles(state);
    return true;
}
/**
 * Iterate on referencing modules that export entities from affected file and delete diagnostics and add pending emit
 */
function handleDtsMayChangeOfReferencingExportOfAffectedFile(state, affectedFile, cancellationToken, host) {
    var _a, _b;
    // If there was change in signature (dts output) for the changed file,
    // then only we need to handle pending file emit
    if (!state.referencedMap || !state.changedFilesSet.has(affectedFile.resolvedPath))
        return;
    if (!isChangedSignature(state, affectedFile.resolvedPath))
        return;
    // Since isolated modules dont change js files, files affected by change in signature is itself
    // But we need to cleanup semantic diagnostics and queue dts emit for affected files
    if (getIsolatedModules(state.compilerOptions)) {
        const seenFileNamesMap = new Map();
        seenFileNamesMap.set(affectedFile.resolvedPath, true);
        const queue = BuilderState.getReferencedByPaths(state, affectedFile.resolvedPath);
        while (queue.length > 0) {
            const currentPath = queue.pop();
            if (!seenFileNamesMap.has(currentPath)) {
                seenFileNamesMap.set(currentPath, true);
                if (handleDtsMayChangeOfGlobalScope(state, currentPath, 
                /*invalidateJsFiles*/ false, cancellationToken, host))
                    return;
                handleDtsMayChangeOf(state, currentPath, /*invalidateJsFiles*/ false, cancellationToken, host);
                if (isChangedSignature(state, currentPath)) {
                    const currentSourceFile = state.program.getSourceFileByPath(currentPath);
                    queue.push(...BuilderState.getReferencedByPaths(state, currentSourceFile.resolvedPath));
                }
            }
        }
    }
    const seenFileAndExportsOfFile = new Set();
    // If exported const enum, we need to ensure that js files are emitted as well since the const enum value changed
    const invalidateJsFiles = !!((_a = affectedFile.symbol) === null || _a === void 0 ? void 0 : _a.exports) && !!forEachEntry(affectedFile.symbol.exports, exported => {
        if ((exported.flags & SymbolFlags.ConstEnum) !== 0)
            return true;
        const aliased = skipAlias(exported, state.program.getTypeChecker());
        if (aliased === exported)
            return false;
        return (aliased.flags & SymbolFlags.ConstEnum) !== 0 &&
            some(aliased.declarations, d => getSourceFileOfNode(d) === affectedFile);
    });
    // Go through files that reference affected file and handle dts emit and semantic diagnostics for them and their references
    (_b = state.referencedMap.getKeys(affectedFile.resolvedPath)) === null || _b === void 0 ? void 0 : _b.forEach(exportedFromPath => {
        if (handleDtsMayChangeOfGlobalScope(state, exportedFromPath, invalidateJsFiles, cancellationToken, host))
            return true;
        const references = state.referencedMap.getKeys(exportedFromPath);
        return references && forEachKey(references, filePath => handleDtsMayChangeOfFileAndExportsOfFile(state, filePath, invalidateJsFiles, seenFileAndExportsOfFile, cancellationToken, host));
    });
}
/**
 * handle dts and semantic diagnostics on file and iterate on anything that exports this file
 * return true when all work is done and we can exit handling dts emit and semantic diagnostics
 */
function handleDtsMayChangeOfFileAndExportsOfFile(state, filePath, invalidateJsFiles, seenFileAndExportsOfFile, cancellationToken, host) {
    var _a;
    if (!tryAddToSet(seenFileAndExportsOfFile, filePath))
        return undefined;
    if (handleDtsMayChangeOfGlobalScope(state, filePath, invalidateJsFiles, cancellationToken, host))
        return true;
    handleDtsMayChangeOf(state, filePath, invalidateJsFiles, cancellationToken, host);
    // Remove the diagnostics of files that import this file and handle all its exports too
    (_a = state.referencedMap.getKeys(filePath)) === null || _a === void 0 ? void 0 : _a.forEach(referencingFilePath => handleDtsMayChangeOfFileAndExportsOfFile(state, referencingFilePath, invalidateJsFiles, seenFileAndExportsOfFile, cancellationToken, host));
    return undefined;
}
/**
 * Gets semantic diagnostics for the file which are
 * bindAndCheckDiagnostics (from cache) and program diagnostics
 */
function getSemanticDiagnosticsOfFile(state, sourceFile, cancellationToken, semanticDiagnosticsPerFile) {
    if (state.compilerOptions.noCheck)
        return emptyArray;
    return concatenate(getBinderAndCheckerDiagnosticsOfFile(state, sourceFile, cancellationToken, semanticDiagnosticsPerFile), state.program.getProgramDiagnostics(sourceFile));
}
/**
 * Gets the binder and checker diagnostics either from cache if present, or otherwise from program and caches it
 * Note that it is assumed that when asked about binder and checker diagnostics, the file has been taken out of affected files/changed file set
 */
function getBinderAndCheckerDiagnosticsOfFile(state, sourceFile, cancellationToken, semanticDiagnosticsPerFile) {
    semanticDiagnosticsPerFile !== null && semanticDiagnosticsPerFile !== void 0 ? semanticDiagnosticsPerFile : (semanticDiagnosticsPerFile = state.semanticDiagnosticsPerFile);
    const path = sourceFile.resolvedPath;
    const cachedDiagnostics = semanticDiagnosticsPerFile.get(path);
    // Report the bind and check diagnostics from the cache if we already have those diagnostics present
    if (cachedDiagnostics) {
        return filterSemanticDiagnostics(cachedDiagnostics, state.compilerOptions);
    }
    // Diagnostics werent cached, get them from program, and cache the result
    const diagnostics = state.program.getBindAndCheckDiagnostics(sourceFile, cancellationToken);
    semanticDiagnosticsPerFile.set(path, diagnostics);
    state.buildInfoEmitPending = true;
    return filterSemanticDiagnostics(diagnostics, state.compilerOptions);
}
/** @internal */
export function isIncrementalBundleEmitBuildInfo(info) {
    var _a;
    return !!((_a = info.options) === null || _a === void 0 ? void 0 : _a.outFile);
}
/** @internal */
export function isIncrementalBuildInfo(info) {
    return !!info.fileNames;
}
function isNonIncrementalBuildInfo(info) {
    return !isIncrementalBuildInfo(info) && !!info.root;
}
function ensureHasErrorsForState(state) {
    if (state.hasErrors !== undefined)
        return;
    if (isIncrementalCompilation(state.compilerOptions)) {
        // Because semantic diagnostics are recorded as is we dont need to get them from program
        state.hasErrors = !some(state.program.getSourceFiles(), f => {
            var _a, _b;
            const bindAndCheckDiagnostics = state.semanticDiagnosticsPerFile.get(f.resolvedPath);
            return bindAndCheckDiagnostics === undefined || // Missing semantic diagnostics in cache will be encoded in buildInfo
                !!bindAndCheckDiagnostics.length || // cached semantic diagnostics will be encoded in buildInfo
                !!((_b = (_a = state.emitDiagnosticsPerFile) === null || _a === void 0 ? void 0 : _a.get(f.resolvedPath)) === null || _b === void 0 ? void 0 : _b.length); // emit diagnostics will be encoded in buildInfo;
        }) && (hasSyntaxOrGlobalErrors(state) ||
            some(state.program.getSourceFiles(), f => !!state.program.getProgramDiagnostics(f).length));
    }
    else {
        state.hasErrors = some(state.program.getSourceFiles(), f => {
            var _a, _b;
            const bindAndCheckDiagnostics = state.semanticDiagnosticsPerFile.get(f.resolvedPath);
            return !!(bindAndCheckDiagnostics === null || bindAndCheckDiagnostics === void 0 ? void 0 : bindAndCheckDiagnostics.length) || // If has semantic diagnostics
                !!((_b = (_a = state.emitDiagnosticsPerFile) === null || _a === void 0 ? void 0 : _a.get(f.resolvedPath)) === null || _b === void 0 ? void 0 : _b.length); // emit diagnostics will be encoded in buildInfo;
        }) ||
            hasSyntaxOrGlobalErrors(state);
    }
}
function hasSyntaxOrGlobalErrors(state) {
    return !!state.program.getConfigFileParsingDiagnostics().length ||
        !!state.program.getSyntacticDiagnostics().length ||
        !!state.program.getOptionsDiagnostics().length ||
        !!state.program.getGlobalDiagnostics().length;
}
function getBuildInfoEmitPending(state) {
    var _a;
    ensureHasErrorsForState(state);
    return (_a = state.buildInfoEmitPending) !== null && _a !== void 0 ? _a : (state.buildInfoEmitPending = !!state.hasErrorsFromOldState !== !!state.hasErrors);
}
/**
 * Gets the program information to be emitted in buildInfo so that we can use it to create new program
 */
function getBuildInfo(state) {
    var _a, _b;
    const currentDirectory = state.program.getCurrentDirectory();
    const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(getTsBuildInfoEmitOutputFilePath(state.compilerOptions), currentDirectory));
    // Convert the file name to Path here if we set the fileName instead to optimize multiple d.ts file emits and having to compute Canonical path
    const latestChangedDtsFile = state.latestChangedDtsFile ? relativeToBuildInfoEnsuringAbsolutePath(state.latestChangedDtsFile) : undefined;
    const fileNames = [];
    const fileNameToFileId = new Map();
    const rootFileNames = new Set(state.program.getRootFileNames().map(f => toPath(f, currentDirectory, state.program.getCanonicalFileName)));
    ensureHasErrorsForState(state);
    if (!isIncrementalCompilation(state.compilerOptions)) {
        const buildInfo = {
            root: arrayFrom(rootFileNames, r => relativeToBuildInfo(r)),
            errors: state.hasErrors ? true : undefined,
            checkPending: state.checkPending,
            version,
        };
        return buildInfo;
    }
    const root = [];
    if (state.compilerOptions.outFile) {
        // Copy all fileInfo, version and impliedFormat
        // Affects global scope and signature doesnt matter because with --out they arent calculated or needed to determine upto date ness
        const fileInfos = arrayFrom(state.fileInfos.entries(), ([key, value]) => {
            // Ensure fileId
            const fileId = toFileId(key);
            tryAddRoot(key, fileId);
            return value.impliedFormat ?
                { version: value.version, impliedFormat: value.impliedFormat, signature: undefined, affectsGlobalScope: undefined } :
                value.version;
        });
        const buildInfo = {
            fileNames,
            fileInfos,
            root,
            resolvedRoot: toResolvedRoot(),
            options: toIncrementalBuildInfoCompilerOptions(state.compilerOptions),
            semanticDiagnosticsPerFile: !state.changedFilesSet.size ? toIncrementalBuildInfoDiagnostics() : undefined,
            emitDiagnosticsPerFile: toIncrementalBuildInfoEmitDiagnostics(),
            changeFileSet: toChangeFileSet(),
            outSignature: state.outSignature,
            latestChangedDtsFile,
            pendingEmit: !state.programEmitPending ?
                undefined : // Pending is undefined or None is encoded as undefined
                state.programEmitPending === getBuilderFileEmit(state.compilerOptions) ?
                    false : // Pending emit is same as deteremined by compilerOptions
                    state.programEmitPending, // Actual value
            errors: state.hasErrors ? true : undefined,
            checkPending: state.checkPending,
            version,
        };
        return buildInfo;
    }
    let fileIdsList;
    let fileNamesToFileIdListId;
    let emitSignatures;
    const fileInfos = arrayFrom(state.fileInfos.entries(), ([key, value]) => {
        var _a, _b;
        // Ensure fileId
        const fileId = toFileId(key);
        tryAddRoot(key, fileId);
        Debug.assert(fileNames[fileId - 1] === relativeToBuildInfo(key));
        const oldSignature = (_a = state.oldSignatures) === null || _a === void 0 ? void 0 : _a.get(key);
        const actualSignature = oldSignature !== undefined ? oldSignature || undefined : value.signature;
        if (state.compilerOptions.composite) {
            const file = state.program.getSourceFileByPath(key);
            if (!isJsonSourceFile(file) && sourceFileMayBeEmitted(file, state.program)) {
                const emitSignature = (_b = state.emitSignatures) === null || _b === void 0 ? void 0 : _b.get(key);
                if (emitSignature !== actualSignature) {
                    emitSignatures = append(emitSignatures, emitSignature === undefined ?
                        fileId : // There is no emit, encode as false
                        // fileId, signature: emptyArray if signature only differs in dtsMap option than our own compilerOptions otherwise EmitSignature
                        [fileId, !isString(emitSignature) && emitSignature[0] === actualSignature ? emptyArray : emitSignature]);
                }
            }
        }
        return value.version === actualSignature ?
            value.affectsGlobalScope || value.impliedFormat ?
                // If file version is same as signature, dont serialize signature
                { version: value.version, signature: undefined, affectsGlobalScope: value.affectsGlobalScope, impliedFormat: value.impliedFormat } :
                // If file info only contains version and signature and both are same we can just write string
                value.version :
            actualSignature !== undefined ? // If signature is not same as version, encode signature in the fileInfo
                oldSignature === undefined ?
                    // If we havent computed signature, use fileInfo as is
                    value :
                    // Serialize fileInfo with new updated signature
                    { version: value.version, signature: actualSignature, affectsGlobalScope: value.affectsGlobalScope, impliedFormat: value.impliedFormat } :
                // Signature of the FileInfo is undefined, serialize it as false
                { version: value.version, signature: false, affectsGlobalScope: value.affectsGlobalScope, impliedFormat: value.impliedFormat };
    });
    let referencedMap;
    if ((_a = state.referencedMap) === null || _a === void 0 ? void 0 : _a.size()) {
        referencedMap = arrayFrom(state.referencedMap.keys()).sort(compareStringsCaseSensitive).map(key => [
            toFileId(key),
            toFileIdListId(state.referencedMap.getValues(key)),
        ]);
    }
    const semanticDiagnosticsPerFile = toIncrementalBuildInfoDiagnostics();
    let affectedFilesPendingEmit;
    if ((_b = state.affectedFilesPendingEmit) === null || _b === void 0 ? void 0 : _b.size) {
        const fullEmitForOptions = getBuilderFileEmit(state.compilerOptions);
        const seenFiles = new Set();
        for (const path of arrayFrom(state.affectedFilesPendingEmit.keys()).sort(compareStringsCaseSensitive)) {
            if (tryAddToSet(seenFiles, path)) {
                const file = state.program.getSourceFileByPath(path);
                if (!file || !sourceFileMayBeEmitted(file, state.program))
                    continue;
                const fileId = toFileId(path), pendingEmit = state.affectedFilesPendingEmit.get(path);
                affectedFilesPendingEmit = append(affectedFilesPendingEmit, pendingEmit === fullEmitForOptions ?
                    fileId : // Pending full emit per options
                    pendingEmit === 24 /* BuilderFileEmit.Dts */ ?
                        [fileId] : // Pending on Dts only
                        [fileId, pendingEmit]);
            }
        }
    }
    const buildInfo = {
        fileNames,
        fileIdsList,
        fileInfos,
        root,
        resolvedRoot: toResolvedRoot(),
        options: toIncrementalBuildInfoCompilerOptions(state.compilerOptions),
        referencedMap,
        semanticDiagnosticsPerFile,
        emitDiagnosticsPerFile: toIncrementalBuildInfoEmitDiagnostics(),
        changeFileSet: toChangeFileSet(),
        affectedFilesPendingEmit,
        emitSignatures,
        latestChangedDtsFile,
        errors: state.hasErrors ? true : undefined,
        checkPending: state.checkPending,
        version,
    };
    return buildInfo;
    function relativeToBuildInfoEnsuringAbsolutePath(path) {
        return relativeToBuildInfo(getNormalizedAbsolutePath(path, currentDirectory));
    }
    function relativeToBuildInfo(path) {
        return ensurePathIsNonModuleName(getRelativePathFromDirectory(buildInfoDirectory, path, state.program.getCanonicalFileName));
    }
    function toFileId(path) {
        let fileId = fileNameToFileId.get(path);
        if (fileId === undefined) {
            fileNames.push(relativeToBuildInfo(path));
            fileNameToFileId.set(path, fileId = fileNames.length);
        }
        return fileId;
    }
    function toFileIdListId(set) {
        const fileIds = arrayFrom(set.keys(), toFileId).sort(compareValues);
        const key = fileIds.join();
        let fileIdListId = fileNamesToFileIdListId === null || fileNamesToFileIdListId === void 0 ? void 0 : fileNamesToFileIdListId.get(key);
        if (fileIdListId === undefined) {
            fileIdsList = append(fileIdsList, fileIds);
            (fileNamesToFileIdListId !== null && fileNamesToFileIdListId !== void 0 ? fileNamesToFileIdListId : (fileNamesToFileIdListId = new Map())).set(key, fileIdListId = fileIdsList.length);
        }
        return fileIdListId;
    }
    function tryAddRoot(path, fileId) {
        const file = state.program.getSourceFile(path);
        if (!state.program.getFileIncludeReasons().get(file.path).some(r => r.kind === FileIncludeKind.RootFile))
            return;
        // First fileId as is
        if (!root.length)
            return root.push(fileId);
        const last = root[root.length - 1];
        const isLastStartEnd = isArray(last);
        // If its [..., last = [start, end = fileId - 1]], update last to [start, fileId]
        if (isLastStartEnd && last[1] === fileId - 1)
            return last[1] = fileId;
        // If its [..., last = [start, end !== fileId - 1]] or [last] or [..., last !== fileId - 1], push the fileId
        if (isLastStartEnd || root.length === 1 || last !== fileId - 1)
            return root.push(fileId);
        const lastButOne = root[root.length - 2];
        // If [..., lastButOne = [start, end], lastFileId] or [..., lastButOne !== lastFileId - 1, lastFileId], push the fileId
        if (!isNumber(lastButOne) || lastButOne !== last - 1)
            return root.push(fileId);
        // Convert lastButOne as [lastButOne, fileId]
        root[root.length - 2] = [lastButOne, fileId];
        return root.length = root.length - 1;
    }
    function toResolvedRoot() {
        let result;
        rootFileNames.forEach(path => {
            const file = state.program.getSourceFileByPath(path);
            if (file && path !== file.resolvedPath) {
                result = append(result, [toFileId(file.resolvedPath), toFileId(path)]);
            }
        });
        return result;
    }
    /**
     * @param optionKey key of CommandLineOption to use to determine if the option should be serialized in tsbuildinfo
     */
    function toIncrementalBuildInfoCompilerOptions(options) {
        let result;
        const { optionsNameMap } = getOptionsNameMap();
        for (const name of getOwnKeys(options).sort(compareStringsCaseSensitive)) {
            const optionInfo = optionsNameMap.get(name.toLowerCase());
            if (optionInfo === null || optionInfo === void 0 ? void 0 : optionInfo.affectsBuildInfo) {
                (result || (result = {}))[name] = toReusableCompilerOptionValue(optionInfo, options[name]);
            }
        }
        return result;
    }
    function toReusableCompilerOptionValue(option, value) {
        if (option) {
            Debug.assert(option.type !== "listOrElement");
            if (option.type === "list") {
                const values = value;
                if (option.element.isFilePath && values.length) {
                    return values.map(relativeToBuildInfoEnsuringAbsolutePath);
                }
            }
            else if (option.isFilePath) {
                return relativeToBuildInfoEnsuringAbsolutePath(value);
            }
        }
        return value;
    }
    function toIncrementalBuildInfoDiagnostics() {
        let result;
        state.fileInfos.forEach((_value, key) => {
            const value = state.semanticDiagnosticsPerFile.get(key);
            if (!value) {
                if (!state.changedFilesSet.has(key))
                    result = append(result, toFileId(key));
            }
            else if (value.length) {
                result = append(result, [
                    toFileId(key),
                    toReusableDiagnostic(value, key),
                ]);
            }
        });
        return result;
    }
    function toIncrementalBuildInfoEmitDiagnostics() {
        var _a;
        let result;
        if (!((_a = state.emitDiagnosticsPerFile) === null || _a === void 0 ? void 0 : _a.size))
            return result;
        for (const key of arrayFrom(state.emitDiagnosticsPerFile.keys()).sort(compareStringsCaseSensitive)) {
            const value = state.emitDiagnosticsPerFile.get(key);
            result = append(result, [
                toFileId(key),
                toReusableDiagnostic(value, key),
            ]);
        }
        return result;
    }
    function toReusableDiagnostic(diagnostics, diagnosticFilePath) {
        Debug.assert(!!diagnostics.length);
        return diagnostics.map(diagnostic => {
            const result = toReusableDiagnosticRelatedInformation(diagnostic, diagnosticFilePath);
            result.reportsUnnecessary = diagnostic.reportsUnnecessary;
            result.reportDeprecated = diagnostic.reportsDeprecated;
            result.source = diagnostic.source;
            result.skippedOn = diagnostic.skippedOn;
            const { relatedInformation } = diagnostic;
            result.relatedInformation = relatedInformation ?
                relatedInformation.length ?
                    relatedInformation.map(r => toReusableDiagnosticRelatedInformation(r, diagnosticFilePath)) :
                    [] :
                undefined;
            return result;
        });
    }
    function toReusableDiagnosticRelatedInformation(diagnostic, diagnosticFilePath) {
        const { file } = diagnostic;
        return Object.assign(Object.assign({}, diagnostic), { file: file ?
                file.resolvedPath === diagnosticFilePath ?
                    undefined :
                    relativeToBuildInfo(file.resolvedPath) :
                false, messageText: isString(diagnostic.messageText) ? diagnostic.messageText : toReusableDiagnosticMessageChain(diagnostic.messageText) });
    }
    function toReusableDiagnosticMessageChain(chain) {
        if (chain.repopulateInfo) {
            return {
                info: chain.repopulateInfo(),
                next: toReusableDiagnosticMessageChainArray(chain.next),
            };
        }
        const next = toReusableDiagnosticMessageChainArray(chain.next);
        return next === chain.next ? chain : Object.assign(Object.assign({}, chain), { next });
    }
    function toReusableDiagnosticMessageChainArray(array) {
        if (!array)
            return array;
        return forEach(array, (chain, index) => {
            const reusable = toReusableDiagnosticMessageChain(chain);
            if (chain === reusable)
                return undefined;
            const result = index > 0 ? array.slice(0, index - 1) : [];
            result.push(reusable);
            for (let i = index + 1; i < array.length; i++) {
                result.push(toReusableDiagnosticMessageChain(array[i]));
            }
            return result;
        }) || array;
    }
    function toChangeFileSet() {
        let changeFileSet;
        if (state.changedFilesSet.size) {
            for (const path of arrayFrom(state.changedFilesSet.keys()).sort(compareStringsCaseSensitive)) {
                changeFileSet = append(changeFileSet, toFileId(path));
            }
        }
        return changeFileSet;
    }
}
/** @internal */
export var BuilderProgramKind;
(function (BuilderProgramKind) {
    BuilderProgramKind[BuilderProgramKind["SemanticDiagnosticsBuilderProgram"] = 0] = "SemanticDiagnosticsBuilderProgram";
    BuilderProgramKind[BuilderProgramKind["EmitAndSemanticDiagnosticsBuilderProgram"] = 1] = "EmitAndSemanticDiagnosticsBuilderProgram";
})(BuilderProgramKind || (BuilderProgramKind = {}));
/** @internal */
export function getBuilderCreationParameters(newProgramOrRootNames, hostOrOptions, oldProgramOrHost, configFileParsingDiagnosticsOrOldProgram, configFileParsingDiagnostics, projectReferences) {
    let host;
    let newProgram;
    let oldProgram;
    if (newProgramOrRootNames === undefined) {
        Debug.assert(hostOrOptions === undefined);
        host = oldProgramOrHost;
        oldProgram = configFileParsingDiagnosticsOrOldProgram;
        Debug.assert(!!oldProgram);
        newProgram = oldProgram.getProgram();
    }
    else if (isArray(newProgramOrRootNames)) {
        oldProgram = configFileParsingDiagnosticsOrOldProgram;
        newProgram = createProgram({
            rootNames: newProgramOrRootNames,
            options: hostOrOptions,
            host: oldProgramOrHost,
            oldProgram: oldProgram && oldProgram.getProgramOrUndefined(),
            configFileParsingDiagnostics,
            projectReferences,
        });
        host = oldProgramOrHost;
    }
    else {
        newProgram = newProgramOrRootNames;
        host = hostOrOptions;
        oldProgram = oldProgramOrHost;
        configFileParsingDiagnostics = configFileParsingDiagnosticsOrOldProgram;
    }
    return { host, newProgram, oldProgram, configFileParsingDiagnostics: configFileParsingDiagnostics || emptyArray };
}
function getTextHandlingSourceMapForSignature(text, data) {
    return (data === null || data === void 0 ? void 0 : data.sourceMapUrlPos) !== undefined ? text.substring(0, data.sourceMapUrlPos) : text;
}
/** @internal */
export function computeSignatureWithDiagnostics(program, sourceFile, text, host, data) {
    var _a, _b;
    text = getTextHandlingSourceMapForSignature(text, data);
    let sourceFileDirectory;
    if ((_a = data === null || data === void 0 ? void 0 : data.diagnostics) === null || _a === void 0 ? void 0 : _a.length) {
        text += data.diagnostics.map(diagnostic => `${locationInfo(diagnostic)}${DiagnosticCategory[diagnostic.category]}${diagnostic.code}: ${flattenDiagnosticMessageText(diagnostic.messageText)}`).join("\n");
    }
    return ((_b = host.createHash) !== null && _b !== void 0 ? _b : generateDjb2Hash)(text);
    function flattenDiagnosticMessageText(diagnostic) {
        return isString(diagnostic) ?
            diagnostic :
            diagnostic === undefined ?
                "" :
                !diagnostic.next ?
                    diagnostic.messageText :
                    diagnostic.messageText + diagnostic.next.map(flattenDiagnosticMessageText).join("\n");
    }
    function locationInfo(diagnostic) {
        if (diagnostic.file.resolvedPath === sourceFile.resolvedPath)
            return `(${diagnostic.start},${diagnostic.length})`;
        if (sourceFileDirectory === undefined)
            sourceFileDirectory = getDirectoryPath(sourceFile.resolvedPath);
        return `${ensurePathIsNonModuleName(getRelativePathFromDirectory(sourceFileDirectory, diagnostic.file.resolvedPath, program.getCanonicalFileName))}(${diagnostic.start},${diagnostic.length})`;
    }
}
function computeSignature(text, host, data) {
    var _a;
    return ((_a = host.createHash) !== null && _a !== void 0 ? _a : generateDjb2Hash)(getTextHandlingSourceMapForSignature(text, data));
}
/** @internal */
export function createBuilderProgram(kind, { newProgram, host, oldProgram, configFileParsingDiagnostics }) {
    // Return same program if underlying program doesnt change
    let oldState = oldProgram && oldProgram.state;
    if (oldState && newProgram === oldState.program && configFileParsingDiagnostics === newProgram.getConfigFileParsingDiagnostics()) {
        newProgram = undefined;
        oldState = undefined;
        return oldProgram;
    }
    const state = createBuilderProgramState(newProgram, oldState);
    newProgram.getBuildInfo = () => getBuildInfo(toBuilderProgramStateWithDefinedProgram(state));
    // To ensure that we arent storing any references to old program or new program without state
    newProgram = undefined;
    oldProgram = undefined;
    oldState = undefined;
    const builderProgram = createRedirectedBuilderProgram(state, configFileParsingDiagnostics);
    builderProgram.state = state;
    builderProgram.hasChangedEmitSignature = () => !!state.hasChangedEmitSignature;
    builderProgram.getAllDependencies = sourceFile => BuilderState.getAllDependencies(state, Debug.checkDefined(state.program), sourceFile);
    builderProgram.getSemanticDiagnostics = getSemanticDiagnostics;
    builderProgram.getDeclarationDiagnostics = getDeclarationDiagnostics;
    builderProgram.emit = emit;
    builderProgram.releaseProgram = () => releaseCache(state);
    if (kind === BuilderProgramKind.SemanticDiagnosticsBuilderProgram) {
        builderProgram.getSemanticDiagnosticsOfNextAffectedFile = getSemanticDiagnosticsOfNextAffectedFile;
    }
    else if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
        builderProgram.getSemanticDiagnosticsOfNextAffectedFile = getSemanticDiagnosticsOfNextAffectedFile;
        builderProgram.emitNextAffectedFile = emitNextAffectedFile;
        builderProgram.emitBuildInfo = emitBuildInfo;
    }
    else {
        notImplemented();
    }
    return builderProgram;
    function emitBuildInfo(writeFile, cancellationToken) {
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        if (getBuildInfoEmitPending(state)) {
            const result = state.program.emitBuildInfo(writeFile || maybeBind(host, host.writeFile), cancellationToken);
            state.buildInfoEmitPending = false;
            return result;
        }
        return emitSkippedWithNoDiagnostics;
    }
    /**
     * Emits the next affected file's emit result (EmitResult and sourceFiles emitted) or returns undefined if iteration is complete
     * The first of writeFile if provided, writeFile of BuilderProgramHost if provided, writeFile of compiler host
     * in that order would be used to write the files
     */
    function emitNextAffectedFileOrDtsErrors(writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers, isForDtsErrors) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        let affected = getNextAffectedFile(state, cancellationToken, host);
        const programEmitKind = getBuilderFileEmit(state.compilerOptions);
        let emitKind = !isForDtsErrors ?
            emitOnlyDtsFiles ?
                programEmitKind & 56 /* BuilderFileEmit.AllDts */ :
                programEmitKind :
            8 /* BuilderFileEmit.DtsErrors */;
        if (!affected) {
            if (!state.compilerOptions.outFile) {
                const pendingAffectedFile = getNextAffectedFilePendingEmit(state, emitOnlyDtsFiles, isForDtsErrors);
                if (pendingAffectedFile) {
                    // Emit pending affected file
                    ({ affectedFile: affected, emitKind } = pendingAffectedFile);
                }
                else {
                    const pendingForDiagnostics = getNextPendingEmitDiagnosticsFile(state, isForDtsErrors);
                    if (pendingForDiagnostics) {
                        ((_a = state.seenEmittedFiles) !== null && _a !== void 0 ? _a : (state.seenEmittedFiles = new Map())).set(pendingForDiagnostics.affectedFile.resolvedPath, pendingForDiagnostics.seenKind | getBuilderFileEmitAllDts(isForDtsErrors));
                        return {
                            result: { emitSkipped: true, diagnostics: pendingForDiagnostics.diagnostics },
                            affected: pendingForDiagnostics.affectedFile,
                        };
                    }
                }
            }
            else {
                // Emit program if it was pending emit
                if (state.programEmitPending) {
                    emitKind = getPendingEmitKindWithSeen(state.programEmitPending, state.seenProgramEmit, emitOnlyDtsFiles, isForDtsErrors);
                    if (emitKind)
                        affected = state.program;
                }
                // Pending emit diagnostics
                if (!affected && ((_b = state.emitDiagnosticsPerFile) === null || _b === void 0 ? void 0 : _b.size)) {
                    const seenKind = state.seenProgramEmit || 0 /* BuilderFileEmit.None */;
                    if (!(seenKind & getBuilderFileEmitAllDts(isForDtsErrors))) {
                        state.seenProgramEmit = getBuilderFileEmitAllDts(isForDtsErrors) | seenKind;
                        const diagnostics = [];
                        state.emitDiagnosticsPerFile.forEach(d => addRange(diagnostics, d));
                        return {
                            result: { emitSkipped: true, diagnostics },
                            affected: state.program,
                        };
                    }
                }
            }
            if (!affected) {
                // Emit buildinfo if pending
                if (isForDtsErrors || !getBuildInfoEmitPending(state))
                    return undefined;
                const affected = state.program;
                const result = affected.emitBuildInfo(writeFile || maybeBind(host, host.writeFile), cancellationToken);
                state.buildInfoEmitPending = false;
                return { result, affected };
            }
        }
        // Determine if we can do partial emit
        let emitOnly;
        if (emitKind & 7 /* BuilderFileEmit.AllJs */)
            emitOnly = EmitOnly.Js;
        if (emitKind & 56 /* BuilderFileEmit.AllDts */)
            emitOnly = emitOnly === undefined ? EmitOnly.Dts : undefined;
        // Actual emit without buildInfo as we want to emit it later so the state is updated
        const result = !isForDtsErrors ?
            state.program.emit(affected === state.program ? undefined : affected, getWriteFileCallback(writeFile, customTransformers), cancellationToken, emitOnly, customTransformers, 
            /*forceDtsEmit*/ undefined, 
            /*skipBuildInfo*/ true) :
            {
                emitSkipped: true,
                diagnostics: state.program.getDeclarationDiagnostics(affected === state.program ? undefined : affected, cancellationToken),
            };
        if (affected !== state.program) {
            // update affected files
            const affectedSourceFile = affected;
            state.seenAffectedFiles.add(affectedSourceFile.resolvedPath);
            if (state.affectedFilesIndex !== undefined)
                state.affectedFilesIndex++;
            // Change in changeSet/affectedFilesPendingEmit, buildInfo needs to be emitted
            state.buildInfoEmitPending = true;
            // Update the pendingEmit for the file
            const existing = ((_c = state.seenEmittedFiles) === null || _c === void 0 ? void 0 : _c.get(affectedSourceFile.resolvedPath)) || 0 /* BuilderFileEmit.None */;
            ((_d = state.seenEmittedFiles) !== null && _d !== void 0 ? _d : (state.seenEmittedFiles = new Map())).set(affectedSourceFile.resolvedPath, emitKind | existing);
            const existingPending = ((_e = state.affectedFilesPendingEmit) === null || _e === void 0 ? void 0 : _e.get(affectedSourceFile.resolvedPath)) || programEmitKind;
            const pendingKind = getPendingEmitKind(existingPending, emitKind | existing);
            if (pendingKind)
                ((_f = state.affectedFilesPendingEmit) !== null && _f !== void 0 ? _f : (state.affectedFilesPendingEmit = new Map())).set(affectedSourceFile.resolvedPath, pendingKind);
            else
                (_g = state.affectedFilesPendingEmit) === null || _g === void 0 ? void 0 : _g.delete(affectedSourceFile.resolvedPath);
            if (result.diagnostics.length)
                ((_h = state.emitDiagnosticsPerFile) !== null && _h !== void 0 ? _h : (state.emitDiagnosticsPerFile = new Map())).set(affectedSourceFile.resolvedPath, result.diagnostics);
        }
        else {
            // No more changes remaining to emit
            state.changedFilesSet.clear();
            // Update program emit kind
            state.programEmitPending = state.changedFilesSet.size ?
                getPendingEmitKind(programEmitKind, emitKind) :
                state.programEmitPending ?
                    getPendingEmitKind(state.programEmitPending, emitKind) :
                    undefined;
            state.seenProgramEmit = emitKind | (state.seenProgramEmit || 0 /* BuilderFileEmit.None */);
            setEmitDiagnosticsPerFile(result.diagnostics);
            state.buildInfoEmitPending = true;
        }
        return { result, affected };
    }
    function setEmitDiagnosticsPerFile(diagnostics) {
        // Update the d.ts diagnostics since they always come with Location, skip diagnsotics without file,
        // they could be semantic diagnsotic with noEmitOnError or other kind of diagnostics
        let emitDiagnosticsPerFile;
        diagnostics.forEach(d => {
            if (!d.file)
                return; // Dont cache without fileName
            let diagnostics = emitDiagnosticsPerFile === null || emitDiagnosticsPerFile === void 0 ? void 0 : emitDiagnosticsPerFile.get(d.file.resolvedPath);
            if (!diagnostics)
                (emitDiagnosticsPerFile !== null && emitDiagnosticsPerFile !== void 0 ? emitDiagnosticsPerFile : (emitDiagnosticsPerFile = new Map())).set(d.file.resolvedPath, diagnostics = []);
            diagnostics.push(d);
        });
        if (emitDiagnosticsPerFile)
            state.emitDiagnosticsPerFile = emitDiagnosticsPerFile;
    }
    /**
     * Emits the next affected file's emit result (EmitResult and sourceFiles emitted) or returns undefined if iteration is complete
     * The first of writeFile if provided, writeFile of BuilderProgramHost if provided, writeFile of compiler host
     * in that order would be used to write the files
     */
    function emitNextAffectedFile(writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) {
        return emitNextAffectedFileOrDtsErrors(writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers, 
        /*isForDtsErrors*/ false);
    }
    function getWriteFileCallback(writeFile, customTransformers) {
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        if (!getEmitDeclarations(state.compilerOptions))
            return writeFile || maybeBind(host, host.writeFile);
        return (fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
            var _a, _b, _c, _d, _e, _f;
            if (isDeclarationFileName(fileName)) {
                if (!state.compilerOptions.outFile) {
                    Debug.assert((sourceFiles === null || sourceFiles === void 0 ? void 0 : sourceFiles.length) === 1);
                    let emitSignature;
                    if (!customTransformers) {
                        const file = sourceFiles[0];
                        const info = state.fileInfos.get(file.resolvedPath);
                        if (info.signature === file.version) {
                            const signature = computeSignatureWithDiagnostics(state.program, file, text, host, data);
                            // With d.ts diagnostics they are also part of the signature so emitSignature will be different from it since its just hash of d.ts
                            if (!((_a = data === null || data === void 0 ? void 0 : data.diagnostics) === null || _a === void 0 ? void 0 : _a.length))
                                emitSignature = signature;
                            if (signature !== file.version) { // Update it
                                if (host.storeSignatureInfo)
                                    ((_b = state.signatureInfo) !== null && _b !== void 0 ? _b : (state.signatureInfo = new Map())).set(file.resolvedPath, SignatureInfo.StoredSignatureAtEmit);
                                if (state.affectedFiles) {
                                    // Keep old signature so we know what to undo if cancellation happens
                                    const existing = (_c = state.oldSignatures) === null || _c === void 0 ? void 0 : _c.get(file.resolvedPath);
                                    if (existing === undefined)
                                        ((_d = state.oldSignatures) !== null && _d !== void 0 ? _d : (state.oldSignatures = new Map())).set(file.resolvedPath, info.signature || false);
                                    info.signature = signature;
                                }
                                else {
                                    // These are directly committed
                                    info.signature = signature;
                                }
                            }
                        }
                    }
                    // Store d.ts emit hash so later can be compared to check if d.ts has changed.
                    // Currently we do this only for composite projects since these are the only projects that can be referenced by other projects
                    // and would need their d.ts change time in --build mode
                    if (state.compilerOptions.composite) {
                        const filePath = sourceFiles[0].resolvedPath;
                        emitSignature = handleNewSignature((_e = state.emitSignatures) === null || _e === void 0 ? void 0 : _e.get(filePath), emitSignature);
                        if (!emitSignature)
                            return data.skippedDtsWrite = true;
                        ((_f = state.emitSignatures) !== null && _f !== void 0 ? _f : (state.emitSignatures = new Map())).set(filePath, emitSignature);
                    }
                }
                else if (state.compilerOptions.composite) {
                    const newSignature = handleNewSignature(state.outSignature, /*newSignature*/ undefined);
                    if (!newSignature)
                        return data.skippedDtsWrite = true;
                    state.outSignature = newSignature;
                }
            }
            if (writeFile)
                writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
            else if (host.writeFile)
                host.writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
            else
                state.program.writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
            /**
             * Compare to existing computed signature and store it or handle the changes in d.ts map option from before
             * returning undefined means that, we dont need to emit this d.ts file since its contents didnt change
             */
            function handleNewSignature(oldSignatureFormat, newSignature) {
                const oldSignature = !oldSignatureFormat || isString(oldSignatureFormat) ? oldSignatureFormat : oldSignatureFormat[0];
                newSignature !== null && newSignature !== void 0 ? newSignature : (newSignature = computeSignature(text, host, data));
                // Dont write dts files if they didn't change
                if (newSignature === oldSignature) {
                    // If the signature was encoded as string the dts map options match so nothing to do
                    if (oldSignatureFormat === oldSignature)
                        return undefined;
                    // Mark as differsOnlyInMap so that --build can reverse the timestamp so that
                    // the downstream projects dont detect this as change in d.ts file
                    else if (data)
                        data.differsOnlyInMap = true;
                    else
                        data = { differsOnlyInMap: true };
                }
                else {
                    state.hasChangedEmitSignature = true;
                    state.latestChangedDtsFile = fileName;
                }
                return newSignature;
            }
        };
    }
    /**
     * Emits the JavaScript and declaration files.
     * When targetSource file is specified, emits the files corresponding to that source file,
     * otherwise for the whole program.
     * In case of EmitAndSemanticDiagnosticsBuilderProgram, when targetSourceFile is specified,
     * it is assumed that that file is handled from affected file list. If targetSourceFile is not specified,
     * it will only emit all the affected files instead of whole program
     *
     * The first of writeFile if provided, writeFile of BuilderProgramHost if provided, writeFile of compiler host
     * in that order would be used to write the files
     */
    function emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) {
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
            assertSourceFileOkWithoutNextAffectedCall(state, targetSourceFile);
        }
        const result = handleNoEmitOptions(builderProgram, targetSourceFile, writeFile, cancellationToken);
        if (result)
            return result;
        // Emit only affected files if using builder for emit
        if (!targetSourceFile) {
            if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
                // Emit and report any errors we ran into.
                let sourceMaps = [];
                let emitSkipped = false;
                let diagnostics;
                let emittedFiles = [];
                let affectedEmitResult;
                while (affectedEmitResult = emitNextAffectedFile(writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers)) {
                    emitSkipped = emitSkipped || affectedEmitResult.result.emitSkipped;
                    diagnostics = addRange(diagnostics, affectedEmitResult.result.diagnostics);
                    emittedFiles = addRange(emittedFiles, affectedEmitResult.result.emittedFiles);
                    sourceMaps = addRange(sourceMaps, affectedEmitResult.result.sourceMaps);
                }
                return {
                    emitSkipped,
                    diagnostics: diagnostics || emptyArray,
                    emittedFiles,
                    sourceMaps,
                };
            }
            // In non Emit builder, clear affected files pending emit
            else {
                clearAffectedFilesPendingEmit(state, emitOnlyDtsFiles, 
                /*isForDtsErrors*/ false);
            }
        }
        const emitResult = state.program.emit(targetSourceFile, getWriteFileCallback(writeFile, customTransformers), cancellationToken, emitOnlyDtsFiles, customTransformers);
        handleNonEmitBuilderWithEmitOrDtsErrors(targetSourceFile, emitOnlyDtsFiles, 
        /*isForDtsErrors*/ false, emitResult.diagnostics);
        return emitResult;
    }
    function handleNonEmitBuilderWithEmitOrDtsErrors(targetSourceFile, emitOnlyDtsFiles, isForDtsErrors, diagnostics) {
        if (!targetSourceFile && kind !== BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
            clearAffectedFilesPendingEmit(state, emitOnlyDtsFiles, isForDtsErrors);
            setEmitDiagnosticsPerFile(diagnostics);
        }
    }
    function getDeclarationDiagnostics(sourceFile, cancellationToken) {
        var _a;
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
            assertSourceFileOkWithoutNextAffectedCall(state, sourceFile);
            let affectedEmitResult;
            let diagnostics;
            while (affectedEmitResult = emitNextAffectedFileOrDtsErrors(
            /*writeFile*/ undefined, cancellationToken, 
            /*emitOnlyDtsFiles*/ undefined, 
            /*customTransformers*/ undefined, 
            /*isForDtsErrors*/ true)) {
                if (!sourceFile)
                    diagnostics = addRange(diagnostics, affectedEmitResult.result.diagnostics);
            }
            return (!sourceFile ? diagnostics : (_a = state.emitDiagnosticsPerFile) === null || _a === void 0 ? void 0 : _a.get(sourceFile.resolvedPath)) || emptyArray;
        }
        else {
            const result = state.program.getDeclarationDiagnostics(sourceFile, cancellationToken);
            handleNonEmitBuilderWithEmitOrDtsErrors(sourceFile, 
            /*emitOnlyDtsFiles*/ undefined, 
            /*isForDtsErrors*/ true, result);
            return result;
        }
    }
    /**
     * Return the semantic diagnostics for the next affected file or undefined if iteration is complete
     * If provided ignoreSourceFile would be called before getting the diagnostics and would ignore the sourceFile if the returned value was true
     */
    function getSemanticDiagnosticsOfNextAffectedFile(cancellationToken, ignoreSourceFile) {
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        while (true) {
            const affected = getNextAffectedFile(state, cancellationToken, host);
            let result;
            if (!affected) {
                if (state.checkPending && !state.compilerOptions.noCheck) {
                    state.checkPending = undefined;
                    state.buildInfoEmitPending = true;
                }
                return undefined; // Done
            }
            else if (affected !== state.program) {
                // Get diagnostics for the affected file if its not ignored
                const affectedSourceFile = affected;
                if (!ignoreSourceFile || !ignoreSourceFile(affectedSourceFile)) {
                    result = getSemanticDiagnosticsOfFile(state, affectedSourceFile, cancellationToken);
                }
                state.seenAffectedFiles.add(affectedSourceFile.resolvedPath);
                state.affectedFilesIndex++;
                // Change in changeSet, buildInfo needs to be emitted
                state.buildInfoEmitPending = true;
                if (!result)
                    continue;
            }
            else {
                // When whole program is affected, get all semantic diagnostics (eg when --out or --outFile is specified)
                let diagnostics;
                const semanticDiagnosticsPerFile = new Map();
                state.program.getSourceFiles().forEach(sourceFile => diagnostics = addRange(diagnostics, getSemanticDiagnosticsOfFile(state, sourceFile, cancellationToken, semanticDiagnosticsPerFile)));
                state.semanticDiagnosticsPerFile = semanticDiagnosticsPerFile;
                result = diagnostics || emptyArray;
                state.changedFilesSet.clear();
                state.programEmitPending = getBuilderFileEmit(state.compilerOptions);
                if (!state.compilerOptions.noCheck)
                    state.checkPending = undefined;
                state.buildInfoEmitPending = true;
            }
            return { result, affected };
        }
    }
    /**
     * Gets the semantic diagnostics from the program corresponding to this state of file (if provided) or whole program
     * The semantic diagnostics are cached and managed here
     * Note that it is assumed that when asked about semantic diagnostics through this API,
     * the file has been taken out of affected files so it is safe to use cache or get from program and cache the diagnostics
     * In case of SemanticDiagnosticsBuilderProgram if the source file is not provided,
     * it will iterate through all the affected files, to ensure that cache stays valid and yet provide a way to get all semantic diagnostics
     */
    function getSemanticDiagnostics(sourceFile, cancellationToken) {
        Debug.assert(isBuilderProgramStateWithDefinedProgram(state));
        assertSourceFileOkWithoutNextAffectedCall(state, sourceFile);
        if (sourceFile) {
            return getSemanticDiagnosticsOfFile(state, sourceFile, cancellationToken);
        }
        // When semantic builder asks for diagnostics of the whole program,
        // ensure that all the affected files are handled
        while (true) {
            const affectedResult = getSemanticDiagnosticsOfNextAffectedFile(cancellationToken);
            if (!affectedResult)
                break;
            // If we already calculated diagnostics for all files, return them
            if (affectedResult.affected === state.program)
                return affectedResult.result;
        }
        let diagnostics;
        for (const sourceFile of state.program.getSourceFiles()) {
            diagnostics = addRange(diagnostics, getSemanticDiagnosticsOfFile(state, sourceFile, cancellationToken));
        }
        if (state.checkPending && !state.compilerOptions.noCheck) {
            state.checkPending = undefined;
            state.buildInfoEmitPending = true;
        }
        return diagnostics || emptyArray;
    }
}
function addToAffectedFilesPendingEmit(state, affectedFilePendingEmit, kind) {
    var _a, _b, _c;
    const existingKind = ((_a = state.affectedFilesPendingEmit) === null || _a === void 0 ? void 0 : _a.get(affectedFilePendingEmit)) || 0 /* BuilderFileEmit.None */;
    ((_b = state.affectedFilesPendingEmit) !== null && _b !== void 0 ? _b : (state.affectedFilesPendingEmit = new Map())).set(affectedFilePendingEmit, existingKind | kind);
    (_c = state.emitDiagnosticsPerFile) === null || _c === void 0 ? void 0 : _c.delete(affectedFilePendingEmit);
}
/** @internal */
export function toBuilderStateFileInfoForMultiEmit(fileInfo) {
    return isString(fileInfo) ?
        { version: fileInfo, signature: fileInfo, affectsGlobalScope: undefined, impliedFormat: undefined } :
        isString(fileInfo.signature) ?
            fileInfo :
            { version: fileInfo.version, signature: fileInfo.signature === false ? undefined : fileInfo.version, affectsGlobalScope: fileInfo.affectsGlobalScope, impliedFormat: fileInfo.impliedFormat };
}
/** @internal */
export function toBuilderFileEmit(value, fullEmitForOptions) {
    return isNumber(value) ? fullEmitForOptions : value[1] || 24 /* BuilderFileEmit.Dts */;
}
/** @internal */
export function toProgramEmitPending(value, options) {
    return !value ? getBuilderFileEmit(options || {}) : value;
}
/** @internal */
export function createBuilderProgramUsingIncrementalBuildInfo(buildInfo, buildInfoPath, host) {
    var _a, _b, _c, _d, _e;
    const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(buildInfoPath, host.getCurrentDirectory()));
    const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
    let state;
    const filePaths = (_a = buildInfo.fileNames) === null || _a === void 0 ? void 0 : _a.map(toPathInBuildInfoDirectory);
    let filePathsSetList;
    const latestChangedDtsFile = buildInfo.latestChangedDtsFile ? toAbsolutePath(buildInfo.latestChangedDtsFile) : undefined;
    const fileInfos = new Map();
    const changedFilesSet = new Set(map(buildInfo.changeFileSet, toFilePath));
    if (isIncrementalBundleEmitBuildInfo(buildInfo)) {
        buildInfo.fileInfos.forEach((fileInfo, index) => {
            const path = toFilePath(index + 1);
            fileInfos.set(path, isString(fileInfo) ? { version: fileInfo, signature: undefined, affectsGlobalScope: undefined, impliedFormat: undefined } : fileInfo);
        });
        state = {
            fileInfos,
            compilerOptions: buildInfo.options ? convertToOptionsWithAbsolutePaths(buildInfo.options, toAbsolutePath) : {},
            semanticDiagnosticsPerFile: toPerFileSemanticDiagnostics(buildInfo.semanticDiagnosticsPerFile),
            emitDiagnosticsPerFile: toPerFileEmitDiagnostics(buildInfo.emitDiagnosticsPerFile),
            hasReusableDiagnostic: true,
            changedFilesSet,
            latestChangedDtsFile,
            outSignature: buildInfo.outSignature,
            programEmitPending: buildInfo.pendingEmit === undefined ? undefined : toProgramEmitPending(buildInfo.pendingEmit, buildInfo.options),
            hasErrors: buildInfo.errors,
            checkPending: buildInfo.checkPending,
        };
    }
    else {
        filePathsSetList = (_b = buildInfo.fileIdsList) === null || _b === void 0 ? void 0 : _b.map(fileIds => new Set(fileIds.map(toFilePath)));
        const emitSignatures = ((_c = buildInfo.options) === null || _c === void 0 ? void 0 : _c.composite) && !buildInfo.options.outFile ? new Map() : undefined;
        buildInfo.fileInfos.forEach((fileInfo, index) => {
            const path = toFilePath(index + 1);
            const stateFileInfo = toBuilderStateFileInfoForMultiEmit(fileInfo);
            fileInfos.set(path, stateFileInfo);
            if (emitSignatures && stateFileInfo.signature)
                emitSignatures.set(path, stateFileInfo.signature);
        });
        (_d = buildInfo.emitSignatures) === null || _d === void 0 ? void 0 : _d.forEach(value => {
            if (isNumber(value))
                emitSignatures.delete(toFilePath(value));
            else {
                const key = toFilePath(value[0]);
                emitSignatures.set(key, !isString(value[1]) && !value[1].length ?
                    // File signature is emit signature but differs in map
                    [emitSignatures.get(key)] :
                    value[1]);
            }
        });
        const fullEmitForOptions = buildInfo.affectedFilesPendingEmit ? getBuilderFileEmit(buildInfo.options || {}) : undefined;
        state = {
            fileInfos,
            compilerOptions: buildInfo.options ? convertToOptionsWithAbsolutePaths(buildInfo.options, toAbsolutePath) : {},
            referencedMap: toManyToManyPathMap(buildInfo.referencedMap, (_e = buildInfo.options) !== null && _e !== void 0 ? _e : {}),
            semanticDiagnosticsPerFile: toPerFileSemanticDiagnostics(buildInfo.semanticDiagnosticsPerFile),
            emitDiagnosticsPerFile: toPerFileEmitDiagnostics(buildInfo.emitDiagnosticsPerFile),
            hasReusableDiagnostic: true,
            changedFilesSet,
            affectedFilesPendingEmit: buildInfo.affectedFilesPendingEmit && arrayToMap(buildInfo.affectedFilesPendingEmit, value => toFilePath(isNumber(value) ? value : value[0]), value => toBuilderFileEmit(value, fullEmitForOptions)),
            latestChangedDtsFile,
            emitSignatures: (emitSignatures === null || emitSignatures === void 0 ? void 0 : emitSignatures.size) ? emitSignatures : undefined,
            hasErrors: buildInfo.errors,
            checkPending: buildInfo.checkPending,
        };
    }
    return {
        state,
        getProgram: notImplemented,
        getProgramOrUndefined: returnUndefined,
        releaseProgram: noop,
        getCompilerOptions: () => state.compilerOptions,
        getSourceFile: notImplemented,
        getSourceFiles: notImplemented,
        getOptionsDiagnostics: notImplemented,
        getGlobalDiagnostics: notImplemented,
        getConfigFileParsingDiagnostics: notImplemented,
        getSyntacticDiagnostics: notImplemented,
        getDeclarationDiagnostics: notImplemented,
        getSemanticDiagnostics: notImplemented,
        emit: notImplemented,
        getAllDependencies: notImplemented,
        getCurrentDirectory: notImplemented,
        emitNextAffectedFile: notImplemented,
        getSemanticDiagnosticsOfNextAffectedFile: notImplemented,
        emitBuildInfo: notImplemented,
        close: noop,
        hasChangedEmitSignature: returnFalse,
    };
    function toPathInBuildInfoDirectory(path) {
        return toPath(path, buildInfoDirectory, getCanonicalFileName);
    }
    function toAbsolutePath(path) {
        return getNormalizedAbsolutePath(path, buildInfoDirectory);
    }
    function toFilePath(fileId) {
        return filePaths[fileId - 1];
    }
    function toFilePathsSet(fileIdsListId) {
        return filePathsSetList[fileIdsListId - 1];
    }
    function toManyToManyPathMap(referenceMap, options) {
        const map = BuilderState.createReferencedMap(options);
        if (!map || !referenceMap)
            return map;
        referenceMap.forEach(([fileId, fileIdListId]) => map.set(toFilePath(fileId), toFilePathsSet(fileIdListId)));
        return map;
    }
    function toPerFileSemanticDiagnostics(diagnostics) {
        const semanticDiagnostics = new Map(mapDefinedIterator(fileInfos.keys(), key => !changedFilesSet.has(key) ? [key, emptyArray] : undefined));
        diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.forEach(value => {
            if (isNumber(value))
                semanticDiagnostics.delete(toFilePath(value));
            else
                semanticDiagnostics.set(toFilePath(value[0]), value[1]);
        });
        return semanticDiagnostics;
    }
    function toPerFileEmitDiagnostics(diagnostics) {
        return diagnostics && arrayToMap(diagnostics, value => toFilePath(value[0]), value => value[1]);
    }
}
/** @internal */
export function getBuildInfoFileVersionMap(program, buildInfoPath, host) {
    const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(buildInfoPath, host.getCurrentDirectory()));
    const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
    const fileInfos = new Map();
    let rootIndex = 0;
    // Root name to resolved
    const roots = new Map();
    const resolvedRoots = new Map(program.resolvedRoot);
    program.fileInfos.forEach((fileInfo, index) => {
        const path = toPath(program.fileNames[index], buildInfoDirectory, getCanonicalFileName);
        const version = isString(fileInfo) ? fileInfo : fileInfo.version;
        fileInfos.set(path, version);
        if (rootIndex < program.root.length) {
            const current = program.root[rootIndex];
            const fileId = (index + 1);
            if (isArray(current)) {
                if (current[0] <= fileId && fileId <= current[1]) {
                    addRoot(fileId, path);
                    if (current[1] === fileId)
                        rootIndex++;
                }
            }
            else if (current === fileId) {
                addRoot(fileId, path);
                rootIndex++;
            }
        }
    });
    return { fileInfos, roots };
    function addRoot(fileId, path) {
        const root = resolvedRoots.get(fileId);
        if (root) {
            roots.set(toPath(program.fileNames[root - 1], buildInfoDirectory, getCanonicalFileName), path);
        }
        else {
            roots.set(path, undefined);
        }
    }
}
/** @internal */
export function getNonIncrementalBuildInfoRoots(buildInfo, buildInfoPath, host) {
    if (!isNonIncrementalBuildInfo(buildInfo))
        return undefined;
    const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(buildInfoPath, host.getCurrentDirectory()));
    const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
    return buildInfo.root.map(r => toPath(r, buildInfoDirectory, getCanonicalFileName));
}
/** @internal */
export function createRedirectedBuilderProgram(state, configFileParsingDiagnostics) {
    return {
        state: undefined,
        getProgram,
        getProgramOrUndefined: () => state.program,
        releaseProgram: () => state.program = undefined,
        getCompilerOptions: () => state.compilerOptions,
        getSourceFile: fileName => getProgram().getSourceFile(fileName),
        getSourceFiles: () => getProgram().getSourceFiles(),
        getOptionsDiagnostics: cancellationToken => getProgram().getOptionsDiagnostics(cancellationToken),
        getGlobalDiagnostics: cancellationToken => getProgram().getGlobalDiagnostics(cancellationToken),
        getConfigFileParsingDiagnostics: () => configFileParsingDiagnostics,
        getSyntacticDiagnostics: (sourceFile, cancellationToken) => getProgram().getSyntacticDiagnostics(sourceFile, cancellationToken),
        getDeclarationDiagnostics: (sourceFile, cancellationToken) => getProgram().getDeclarationDiagnostics(sourceFile, cancellationToken),
        getSemanticDiagnostics: (sourceFile, cancellationToken) => getProgram().getSemanticDiagnostics(sourceFile, cancellationToken),
        emit: (sourceFile, writeFile, cancellationToken, emitOnlyDts, customTransformers) => getProgram().emit(sourceFile, writeFile, cancellationToken, emitOnlyDts, customTransformers),
        emitBuildInfo: (writeFile, cancellationToken) => getProgram().emitBuildInfo(writeFile, cancellationToken),
        getAllDependencies: notImplemented,
        getCurrentDirectory: () => getProgram().getCurrentDirectory(),
        close: noop,
    };
    function getProgram() {
        return Debug.checkDefined(state.program);
    }
}
