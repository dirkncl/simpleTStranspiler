import {
  addRange,
  chainDiagnosticMessages,
  CharacterCodes,
  combinePaths,
  contains,
  convertToRelativePath,
  copyProperties,
  countWhere,
  createCompilerDiagnostic,
  createEmitAndSemanticDiagnosticsBuilderProgram,
  createGetCanonicalFileName,
  createGetSourceFile,
  createIncrementalCompilerHost,
  createIncrementalProgram,
  createWriteFileMeasuringIO,
  Debug,
  DiagnosticCategory,
  Diagnostics,
  emptyArray,
  endsWith,
  ExitStatus,
  Extension,
  externalHelpersModuleNameText,
  fileExtensionIs,
  FileIncludeKind,
  filter,
  find,
  findIndex,
  flattenDiagnosticMessageText,
  forEach,
  ForegroundColorEscapeSequences,
  formatColorAndReset,
  formatDiagnostic,
  formatDiagnosticsWithColorAndContext,
  generateDjb2Hash,
  getDefaultLibFileName,
  getDirectoryPath,
  getEmitDeclarations,
  getEmitScriptTarget,
  getImpliedNodeFormatForEmitWorker,
  getLineAndCharacterOfPosition,
  getNameOfScriptTarget,
  getNewLineCharacter,
  getNormalizedAbsolutePath,
  getParsedCommandLineOfConfigFile,
  getPatternFromSpec,
  getReferencedFileLocation,
  getRegexFromPattern,
  getRelativePathFromDirectory,
  getWatchFactory,
  isExternalOrCommonJsModule,
  isLineBreak,
  isReferencedFile,
  isReferenceFileLocation,
  isString,
  last,
  maxBy,
  maybeBind,
  memoize,
  ModuleKind,
  noop,
  normalizePath,
  packageIdToString,
  pathIsAbsolute,
  sortAndDeduplicateDiagnostics,
  sourceMapCommentRegExp,
  sourceMapCommentRegExpDontCareLineStart,
  sys,
  WatchLogLevel,
  whitespaceOrMapCommentRegExp,
} from "./_namespaces/ts.js";

const sysFormatDiagnosticsHost = sys ? {
    getCurrentDirectory: () => sys.getCurrentDirectory(),
    getNewLine: () => sys.newLine,
    getCanonicalFileName: createGetCanonicalFileName(sys.useCaseSensitiveFileNames),
} : undefined;

/**
 * Create a function that reports error by writing to the system and handles the formatting of the diagnostic
 *
 * @internal
 */
export function createDiagnosticReporter(system, pretty) {
    const host = system === sys && sysFormatDiagnosticsHost ? sysFormatDiagnosticsHost : {
        getCurrentDirectory: () => system.getCurrentDirectory(),
        getNewLine: () => system.newLine,
        getCanonicalFileName: createGetCanonicalFileName(system.useCaseSensitiveFileNames),
    };
    if (!pretty) {
        return diagnostic => system.write(formatDiagnostic(diagnostic, host));
    }
    const diagnostics = new Array(1);
    return diagnostic => {
        diagnostics[0] = diagnostic;
        system.write(formatDiagnosticsWithColorAndContext(diagnostics, host) + host.getNewLine());
        diagnostics[0] = undefined; // TODO: GH#18217
    };
}

/**
 * @returns Whether the screen was cleared.
 */
function clearScreenIfNotWatchingForFileChanges(system, diagnostic, options) {
    if (system.clearScreen &&
        !options.preserveWatchOutput &&
        !options.extendedDiagnostics &&
        !options.diagnostics &&
        contains(screenStartingMessageCodes, diagnostic.code)) {
        system.clearScreen();
        return true;
    }
    return false;
}

const screenStartingMessageCodes = [
    Diagnostics.Starting_compilation_in_watch_mode.code,
    Diagnostics.File_change_detected_Starting_incremental_compilation.code,
];

function getPlainDiagnosticFollowingNewLines(diagnostic, newLine) {
    return contains(screenStartingMessageCodes, diagnostic.code)
        ? newLine + newLine
        : newLine;
}

/**
 * Get locale specific time based on whether we are in test mode
 *
 * @internal
 */
export function getLocaleTimeString(system) {
    return !system.now ?
        new Date().toLocaleTimeString() :
        // On some systems / builds of Node, there's a non-breaking space between the time and AM/PM.
        // This branch is solely for testing, so just switch it to a normal space for baseline stability.
        // See:
        //     - https://github.com/nodejs/node/issues/45171
        //     - https://github.com/nodejs/node/issues/45753
        system.now().toLocaleTimeString("en-US", { timeZone: "UTC" }).replace("\u202f", " ");
}

/**
 * Create a function that reports watch status by writing to the system and handles the formatting of the diagnostic
 *
 * @internal
 */
export function createWatchStatusReporter(system, pretty) {
    return pretty ?
        (diagnostic, newLine, options) => {
            clearScreenIfNotWatchingForFileChanges(system, diagnostic, options);
            let output = `[${formatColorAndReset(getLocaleTimeString(system), ForegroundColorEscapeSequences.Grey)}] `;
            output += `${flattenDiagnosticMessageText(diagnostic.messageText, system.newLine)}${newLine + newLine}`;
            system.write(output);
        } :
        (diagnostic, newLine, options) => {
            let output = "";
            if (!clearScreenIfNotWatchingForFileChanges(system, diagnostic, options)) {
                output += newLine;
            }
            output += `${getLocaleTimeString(system)} - `;
            output += `${flattenDiagnosticMessageText(diagnostic.messageText, system.newLine)}${getPlainDiagnosticFollowingNewLines(diagnostic, newLine)}`;
            system.write(output);
        };
}
/**
 * Parses config file using System interface
 *
 * @internal
 */
export function parseConfigFileWithSystem(configFileName, optionsToExtend, extendedConfigCache, watchOptionsToExtend, system, reportDiagnostic) {
    const host = system;
    host.onUnRecoverableConfigFileDiagnostic = diagnostic => reportUnrecoverableDiagnostic(system, reportDiagnostic, diagnostic);
    const result = getParsedCommandLineOfConfigFile(configFileName, optionsToExtend, host, extendedConfigCache, watchOptionsToExtend);
    host.onUnRecoverableConfigFileDiagnostic = undefined; // TODO: GH#18217
    return result;
}
/** @internal */
export function getErrorCountForSummary(diagnostics) {
    return countWhere(diagnostics, diagnostic => diagnostic.category === DiagnosticCategory.Error);
}
/** @internal */
export function getFilesInErrorForSummary(diagnostics) {
    const filesInError = filter(diagnostics, diagnostic => diagnostic.category === DiagnosticCategory.Error)
        .map(errorDiagnostic => {
        if (errorDiagnostic.file === undefined)
            return;
        return `${errorDiagnostic.file.fileName}`;
    });
    return filesInError.map(fileName => {
        if (fileName === undefined) {
            return undefined;
        }
        const diagnosticForFileName = find(diagnostics, diagnostic => diagnostic.file !== undefined && diagnostic.file.fileName === fileName);
        if (diagnosticForFileName !== undefined) {
            const { line } = getLineAndCharacterOfPosition(diagnosticForFileName.file, diagnosticForFileName.start);
            return {
                fileName,
                line: line + 1,
            };
        }
    });
}
/** @internal */
export function getWatchErrorSummaryDiagnosticMessage(errorCount) {
    return errorCount === 1 ?
        Diagnostics.Found_1_error_Watching_for_file_changes :
        Diagnostics.Found_0_errors_Watching_for_file_changes;
}
function prettyPathForFileError(error, cwd) {
    const line = formatColorAndReset(":" + error.line, ForegroundColorEscapeSequences.Grey);
    if (pathIsAbsolute(error.fileName) && pathIsAbsolute(cwd)) {
        return getRelativePathFromDirectory(cwd, error.fileName, /*ignoreCase*/ false) + line;
    }
    return error.fileName + line;
}
/** @internal */
export function getErrorSummaryText(errorCount, filesInError, newLine, host) {
    if (errorCount === 0)
        return "";
    const nonNilFiles = filesInError.filter(fileInError => fileInError !== undefined);
    const distinctFileNamesWithLines = nonNilFiles.map(fileInError => `${fileInError.fileName}:${fileInError.line}`)
        .filter((value, index, self) => self.indexOf(value) === index);
    const firstFileReference = nonNilFiles[0] && prettyPathForFileError(nonNilFiles[0], host.getCurrentDirectory());
    let messageAndArgs;
    if (errorCount === 1) {
        messageAndArgs = filesInError[0] !== undefined ? [Diagnostics.Found_1_error_in_0, firstFileReference] : [Diagnostics.Found_1_error];
    }
    else {
        messageAndArgs = distinctFileNamesWithLines.length === 0 ? [Diagnostics.Found_0_errors, errorCount] :
            distinctFileNamesWithLines.length === 1 ? [Diagnostics.Found_0_errors_in_the_same_file_starting_at_Colon_1, errorCount, firstFileReference] :
                [Diagnostics.Found_0_errors_in_1_files, errorCount, distinctFileNamesWithLines.length];
    }
    const d = createCompilerDiagnostic(...messageAndArgs);
    const suffix = distinctFileNamesWithLines.length > 1 ? createTabularErrorsDisplay(nonNilFiles, host) : "";
    return `${newLine}${flattenDiagnosticMessageText(d.messageText, newLine)}${newLine}${newLine}${suffix}`;
}
function createTabularErrorsDisplay(filesInError, host) {
    const distinctFiles = filesInError.filter((value, index, self) => index === self.findIndex(file => (file === null || file === void 0 ? void 0 : file.fileName) === (value === null || value === void 0 ? void 0 : value.fileName)));
    if (distinctFiles.length === 0)
        return "";
    const numberLength = (num) => Math.log(num) * Math.LOG10E + 1;
    const fileToErrorCount = distinctFiles.map(file => [file, countWhere(filesInError, fileInError => fileInError.fileName === file.fileName)]);
    const maxErrors = maxBy(fileToErrorCount, 0, value => value[1]);
    const headerRow = Diagnostics.Errors_Files.message;
    const leftColumnHeadingLength = headerRow.split(" ")[0].length;
    const leftPaddingGoal = Math.max(leftColumnHeadingLength, numberLength(maxErrors));
    const headerPadding = Math.max(numberLength(maxErrors) - leftColumnHeadingLength, 0);
    let tabularData = "";
    tabularData += " ".repeat(headerPadding) + headerRow + "\n";
    fileToErrorCount.forEach(row => {
        const [file, errorCount] = row;
        const errorCountDigitsLength = Math.log(errorCount) * Math.LOG10E + 1 | 0;
        const leftPadding = errorCountDigitsLength < leftPaddingGoal ?
            " ".repeat(leftPaddingGoal - errorCountDigitsLength)
            : "";
        const fileRef = prettyPathForFileError(file, host.getCurrentDirectory());
        tabularData += `${leftPadding}${errorCount}  ${fileRef}\n`;
    });
    return tabularData;
}
/** @internal */
export function isBuilderProgram(program) {
    return !!program.state;
}
function listFiles(program, write) {
    const options = program.getCompilerOptions();
    if (options.explainFiles) {
        explainFiles(isBuilderProgram(program) ? program.getProgram() : program, write);
    }
    else if (options.listFiles || options.listFilesOnly) {
        forEach(program.getSourceFiles(), file => {
            write(file.fileName);
        });
    }
}
/** @internal */
export function explainFiles(program, write) {
    var _a, _b;
    const reasons = program.getFileIncludeReasons();
    const relativeFileName = (fileName) => convertToRelativePath(fileName, program.getCurrentDirectory(), program.getCanonicalFileName);
    for (const file of program.getSourceFiles()) {
        write(`${toFileName(file, relativeFileName)}`);
        (_a = reasons.get(file.path)) === null || _a === void 0 ? void 0 : _a.forEach(reason => write(`  ${fileIncludeReasonToDiagnostics(program, reason, relativeFileName).messageText}`));
        (_b = explainIfFileIsRedirectAndImpliedFormat(file, program.getCompilerOptionsForFile(file), relativeFileName)) === null || _b === void 0 ? void 0 : _b.forEach(d => write(`  ${d.messageText}`));
    }
}
/** @internal */
export function explainIfFileIsRedirectAndImpliedFormat(file, options, fileNameConvertor) {
    var _a;
    let result;
    if (file.path !== file.resolvedPath) {
        (result !== null && result !== void 0 ? result : (result = [])).push(chainDiagnosticMessages(
        /*details*/ undefined, Diagnostics.File_is_output_of_project_reference_source_0, toFileName(file.originalFileName, fileNameConvertor)));
    }
    if (file.redirectInfo) {
        (result !== null && result !== void 0 ? result : (result = [])).push(chainDiagnosticMessages(
        /*details*/ undefined, Diagnostics.File_redirects_to_file_0, toFileName(file.redirectInfo.redirectTarget, fileNameConvertor)));
    }
    if (isExternalOrCommonJsModule(file)) {
        switch (getImpliedNodeFormatForEmitWorker(file, options)) {
            case ModuleKind.ESNext:
                if (file.packageJsonScope) {
                    (result !== null && result !== void 0 ? result : (result = [])).push(chainDiagnosticMessages(
                    /*details*/ undefined, Diagnostics.File_is_ECMAScript_module_because_0_has_field_type_with_value_module, toFileName(last(file.packageJsonLocations), fileNameConvertor)));
                }
                break;
            case ModuleKind.CommonJS:
                if (file.packageJsonScope) {
                    (result !== null && result !== void 0 ? result : (result = [])).push(chainDiagnosticMessages(
                    /*details*/ undefined, file.packageJsonScope.contents.packageJsonContent.type ?
                        Diagnostics.File_is_CommonJS_module_because_0_has_field_type_whose_value_is_not_module :
                        Diagnostics.File_is_CommonJS_module_because_0_does_not_have_field_type, toFileName(last(file.packageJsonLocations), fileNameConvertor)));
                }
                else if ((_a = file.packageJsonLocations) === null || _a === void 0 ? void 0 : _a.length) {
                    (result !== null && result !== void 0 ? result : (result = [])).push(chainDiagnosticMessages(
                    /*details*/ undefined, Diagnostics.File_is_CommonJS_module_because_package_json_was_not_found));
                }
                break;
        }
    }
    return result;
}
/** @internal */
export function getMatchedFileSpec(program, fileName) {
    var _a;
    const configFile = program.getCompilerOptions().configFile;
    if (!((_a = configFile === null || configFile === void 0 ? void 0 : configFile.configFileSpecs) === null || _a === void 0 ? void 0 : _a.validatedFilesSpec))
        return undefined;
    const filePath = program.getCanonicalFileName(fileName);
    const basePath = getDirectoryPath(getNormalizedAbsolutePath(configFile.fileName, program.getCurrentDirectory()));
    const index = findIndex(configFile.configFileSpecs.validatedFilesSpec, fileSpec => program.getCanonicalFileName(getNormalizedAbsolutePath(fileSpec, basePath)) === filePath);
    return index !== -1 ? configFile.configFileSpecs.validatedFilesSpecBeforeSubstitution[index] : undefined;
}
/** @internal */
export function getMatchedIncludeSpec(program, fileName) {
    var _a, _b;
    const configFile = program.getCompilerOptions().configFile;
    if (!((_a = configFile === null || configFile === void 0 ? void 0 : configFile.configFileSpecs) === null || _a === void 0 ? void 0 : _a.validatedIncludeSpecs))
        return undefined;
    // Return true if its default include spec
    if (configFile.configFileSpecs.isDefaultIncludeSpec)
        return true;
    const isJsonFile = fileExtensionIs(fileName, Extension.Json);
    const basePath = getDirectoryPath(getNormalizedAbsolutePath(configFile.fileName, program.getCurrentDirectory()));
    const useCaseSensitiveFileNames = program.useCaseSensitiveFileNames();
    const index = findIndex((_b = configFile === null || configFile === void 0 ? void 0 : configFile.configFileSpecs) === null || _b === void 0 ? void 0 : _b.validatedIncludeSpecs, includeSpec => {
        if (isJsonFile && !endsWith(includeSpec, Extension.Json))
            return false;
        const pattern = getPatternFromSpec(includeSpec, basePath, "files");
        return !!pattern && getRegexFromPattern(`(${pattern})$`, useCaseSensitiveFileNames).test(fileName);
    });
    return index !== -1 ? configFile.configFileSpecs.validatedIncludeSpecsBeforeSubstitution[index] : undefined;
}
/** @internal */
export function fileIncludeReasonToDiagnostics(program, reason, fileNameConvertor) {
    var _a, _b;
    const options = program.getCompilerOptions();
    if (isReferencedFile(reason)) {
        const referenceLocation = getReferencedFileLocation(program, reason);
        const referenceText = isReferenceFileLocation(referenceLocation) ? referenceLocation.file.text.substring(referenceLocation.pos, referenceLocation.end) : `"${referenceLocation.text}"`;
        let message;
        Debug.assert(isReferenceFileLocation(referenceLocation) || reason.kind === FileIncludeKind.Import, "Only synthetic references are imports");
        switch (reason.kind) {
            case FileIncludeKind.Import:
                if (isReferenceFileLocation(referenceLocation)) {
                    message = referenceLocation.packageId ?
                        Diagnostics.Imported_via_0_from_file_1_with_packageId_2 :
                        Diagnostics.Imported_via_0_from_file_1;
                }
                else if (referenceLocation.text === externalHelpersModuleNameText) {
                    message = referenceLocation.packageId ?
                        Diagnostics.Imported_via_0_from_file_1_with_packageId_2_to_import_importHelpers_as_specified_in_compilerOptions :
                        Diagnostics.Imported_via_0_from_file_1_to_import_importHelpers_as_specified_in_compilerOptions;
                }
                else {
                    message = referenceLocation.packageId ?
                        Diagnostics.Imported_via_0_from_file_1_with_packageId_2_to_import_jsx_and_jsxs_factory_functions :
                        Diagnostics.Imported_via_0_from_file_1_to_import_jsx_and_jsxs_factory_functions;
                }
                break;
            case FileIncludeKind.ReferenceFile:
                Debug.assert(!referenceLocation.packageId);
                message = Diagnostics.Referenced_via_0_from_file_1;
                break;
            case FileIncludeKind.TypeReferenceDirective:
                message = referenceLocation.packageId ?
                    Diagnostics.Type_library_referenced_via_0_from_file_1_with_packageId_2 :
                    Diagnostics.Type_library_referenced_via_0_from_file_1;
                break;
            case FileIncludeKind.LibReferenceDirective:
                Debug.assert(!referenceLocation.packageId);
                message = Diagnostics.Library_referenced_via_0_from_file_1;
                break;
            default:
                Debug.assertNever(reason);
        }
        return chainDiagnosticMessages(
        /*details*/ undefined, message, referenceText, toFileName(referenceLocation.file, fileNameConvertor), (referenceLocation.packageId && packageIdToString(referenceLocation.packageId)));
    }
    switch (reason.kind) {
        case FileIncludeKind.RootFile:
            if (!((_a = options.configFile) === null || _a === void 0 ? void 0 : _a.configFileSpecs))
                return chainDiagnosticMessages(/*details*/ undefined, Diagnostics.Root_file_specified_for_compilation);
            const fileName = getNormalizedAbsolutePath(program.getRootFileNames()[reason.index], program.getCurrentDirectory());
            const matchedByFiles = getMatchedFileSpec(program, fileName);
            if (matchedByFiles)
                return chainDiagnosticMessages(/*details*/ undefined, Diagnostics.Part_of_files_list_in_tsconfig_json);
            const matchedByInclude = getMatchedIncludeSpec(program, fileName);
            return isString(matchedByInclude) ?
                chainDiagnosticMessages(
                /*details*/ undefined, Diagnostics.Matched_by_include_pattern_0_in_1, matchedByInclude, toFileName(options.configFile, fileNameConvertor)) :
                // Could be additional files specified as roots or matched by default include
                chainDiagnosticMessages(
                /*details*/ undefined, matchedByInclude ?
                    Diagnostics.Matched_by_default_include_pattern_Asterisk_Asterisk_Slash_Asterisk :
                    Diagnostics.Root_file_specified_for_compilation);
        case FileIncludeKind.SourceFromProjectReference:
        case FileIncludeKind.OutputFromProjectReference:
            const isOutput = reason.kind === FileIncludeKind.OutputFromProjectReference;
            const referencedResolvedRef = Debug.checkDefined((_b = program.getResolvedProjectReferences()) === null || _b === void 0 ? void 0 : _b[reason.index]);
            return chainDiagnosticMessages(
            /*details*/ undefined, options.outFile ?
                isOutput ?
                    Diagnostics.Output_from_referenced_project_0_included_because_1_specified :
                    Diagnostics.Source_from_referenced_project_0_included_because_1_specified :
                isOutput ?
                    Diagnostics.Output_from_referenced_project_0_included_because_module_is_specified_as_none :
                    Diagnostics.Source_from_referenced_project_0_included_because_module_is_specified_as_none, toFileName(referencedResolvedRef.sourceFile.fileName, fileNameConvertor), options.outFile ? "--outFile" : "--out");
        case FileIncludeKind.AutomaticTypeDirectiveFile: {
            const messageAndArgs = options.types ?
                reason.packageId ?
                    [Diagnostics.Entry_point_of_type_library_0_specified_in_compilerOptions_with_packageId_1, reason.typeReference, packageIdToString(reason.packageId)] :
                    [Diagnostics.Entry_point_of_type_library_0_specified_in_compilerOptions, reason.typeReference] :
                reason.packageId ?
                    [Diagnostics.Entry_point_for_implicit_type_library_0_with_packageId_1, reason.typeReference, packageIdToString(reason.packageId)] :
                    [Diagnostics.Entry_point_for_implicit_type_library_0, reason.typeReference];
            return chainDiagnosticMessages(/*details*/ undefined, ...messageAndArgs);
        }
        case FileIncludeKind.LibFile: {
            if (reason.index !== undefined)
                return chainDiagnosticMessages(/*details*/ undefined, Diagnostics.Library_0_specified_in_compilerOptions, options.lib[reason.index]);
            const target = getNameOfScriptTarget(getEmitScriptTarget(options));
            const messageAndArgs = target ? [Diagnostics.Default_library_for_target_0, target] : [Diagnostics.Default_library];
            return chainDiagnosticMessages(/*details*/ undefined, ...messageAndArgs);
        }
        default:
            Debug.assertNever(reason);
    }
}
function toFileName(file, fileNameConvertor) {
    const fileName = isString(file) ? file : file.fileName;
    return fileNameConvertor ? fileNameConvertor(fileName) : fileName;
}
/**
 * Helper that emit files, report diagnostics and lists emitted and/or source files depending on compiler options
 *
 * @internal
 */
export function emitFilesAndReportErrors(program, reportDiagnostic, write, reportSummary, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) {
    const options = program.getCompilerOptions();
    // First get and report any syntactic errors.
    const allDiagnostics = program.getConfigFileParsingDiagnostics().slice();
    const configFileParsingDiagnosticsLength = allDiagnostics.length;
    addRange(allDiagnostics, program.getSyntacticDiagnostics(/*sourceFile*/ undefined, cancellationToken));
    // If we didn't have any syntactic errors, then also try getting the global and
    // semantic errors.
    if (allDiagnostics.length === configFileParsingDiagnosticsLength) {
        addRange(allDiagnostics, program.getOptionsDiagnostics(cancellationToken));
        if (!options.listFilesOnly) {
            addRange(allDiagnostics, program.getGlobalDiagnostics(cancellationToken));
            if (allDiagnostics.length === configFileParsingDiagnosticsLength) {
                addRange(allDiagnostics, program.getSemanticDiagnostics(/*sourceFile*/ undefined, cancellationToken));
            }
            if (options.noEmit &&
                getEmitDeclarations(options) &&
                allDiagnostics.length === configFileParsingDiagnosticsLength) {
                addRange(allDiagnostics, program.getDeclarationDiagnostics(/*sourceFile*/ undefined, cancellationToken));
            }
        }
    }
    // Emit and report any errors we ran into.
    const emitResult = options.listFilesOnly
        ? { emitSkipped: true, diagnostics: emptyArray }
        : program.emit(/*targetSourceFile*/ undefined, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    addRange(allDiagnostics, emitResult.diagnostics);
    const diagnostics = sortAndDeduplicateDiagnostics(allDiagnostics);
    diagnostics.forEach(reportDiagnostic);
    if (write) {
        const currentDir = program.getCurrentDirectory();
        forEach(emitResult.emittedFiles, file => {
            const filepath = getNormalizedAbsolutePath(file, currentDir);
            write(`TSFILE: ${filepath}`);
        });
        listFiles(program, write);
    }
    if (reportSummary) {
        reportSummary(getErrorCountForSummary(diagnostics), getFilesInErrorForSummary(diagnostics));
    }
    return {
        emitResult,
        diagnostics,
    };
}
/** @internal */
export function emitFilesAndReportErrorsAndGetExitStatus(program, reportDiagnostic, write, reportSummary, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) {
    const { emitResult, diagnostics } = emitFilesAndReportErrors(program, reportDiagnostic, write, reportSummary, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    if (emitResult.emitSkipped && diagnostics.length > 0) {
        // If the emitter didn't emit anything, then pass that value along.
        return ExitStatus.DiagnosticsPresent_OutputsSkipped;
    }
    else if (diagnostics.length > 0) {
        // The emitter emitted something, inform the caller if that happened in the presence
        // of diagnostics or not.
        return ExitStatus.DiagnosticsPresent_OutputsGenerated;
    }
    return ExitStatus.Success;
}
/** @internal */
export const noopFileWatcher = { close: noop };
/** @internal */
export const returnNoopFileWatcher = () => noopFileWatcher;
/** @internal */
export function createWatchHost(system = sys, reportWatchStatus) {
    const onWatchStatusChange = reportWatchStatus || createWatchStatusReporter(system);
    return {
        onWatchStatusChange,
        watchFile: maybeBind(system, system.watchFile) || returnNoopFileWatcher,
        watchDirectory: maybeBind(system, system.watchDirectory) || returnNoopFileWatcher,
        setTimeout: maybeBind(system, system.setTimeout) || noop,
        clearTimeout: maybeBind(system, system.clearTimeout) || noop,
        preferNonRecursiveWatch: system.preferNonRecursiveWatch,
    };
}
/** @internal */
export const WatchType = {
    ConfigFile: "Config file",
    ExtendedConfigFile: "Extended config file",
    SourceFile: "Source file",
    MissingFile: "Missing file",
    WildcardDirectory: "Wild card directory",
    FailedLookupLocations: "Failed Lookup Locations",
    AffectingFileLocation: "File location affecting resolution",
    TypeRoots: "Type roots",
    ConfigFileOfReferencedProject: "Config file of referened project",
    ExtendedConfigOfReferencedProject: "Extended config file of referenced project",
    WildcardDirectoryOfReferencedProject: "Wild card directory of referenced project",
    PackageJson: "package.json file",
    ClosedScriptInfo: "Closed Script info",
    ConfigFileForInferredRoot: "Config file for the inferred project root",
    NodeModules: "node_modules for closed script infos and package.jsons affecting module specifier cache",
    MissingSourceMapFile: "Missing source map file",
    NoopConfigFileForInferredRoot: "Noop Config file for the inferred project root",
    MissingGeneratedFile: "Missing generated file",
    NodeModulesForModuleSpecifierCache: "node_modules for module specifier cache invalidation",
    TypingInstallerLocationFile: "File location for typing installer",
    TypingInstallerLocationDirectory: "Directory location for typing installer",
};
/** @internal */
export function createWatchFactory(host, options) {
    const watchLogLevel = host.trace ? options.extendedDiagnostics ? WatchLogLevel.Verbose : options.diagnostics ? WatchLogLevel.TriggerOnly : WatchLogLevel.None : WatchLogLevel.None;
    const writeLog = watchLogLevel !== WatchLogLevel.None ? (s => host.trace(s)) : noop;
    const result = getWatchFactory(host, watchLogLevel, writeLog);
    result.writeLog = writeLog;
    return result;
}
/** @internal */
export function createCompilerHostFromProgramHost(host, getCompilerOptions, directoryStructureHost = host) {
    const useCaseSensitiveFileNames = host.useCaseSensitiveFileNames();
    const compilerHost = {
        getSourceFile: createGetSourceFile((fileName, encoding) => !encoding ? compilerHost.readFile(fileName) : host.readFile(fileName, encoding), 
        /*setParentNodes*/ undefined),
        getDefaultLibLocation: maybeBind(host, host.getDefaultLibLocation),
        getDefaultLibFileName: options => host.getDefaultLibFileName(options),
        writeFile: createWriteFileMeasuringIO((path, data, writeByteOrderMark) => host.writeFile(path, data, writeByteOrderMark), path => host.createDirectory(path), path => host.directoryExists(path)),
        getCurrentDirectory: memoize(() => host.getCurrentDirectory()),
        useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
        getCanonicalFileName: createGetCanonicalFileName(useCaseSensitiveFileNames),
        getNewLine: () => getNewLineCharacter(getCompilerOptions()),
        fileExists: f => host.fileExists(f),
        readFile: f => host.readFile(f),
        trace: maybeBind(host, host.trace),
        directoryExists: maybeBind(directoryStructureHost, directoryStructureHost.directoryExists),
        getDirectories: maybeBind(directoryStructureHost, directoryStructureHost.getDirectories),
        realpath: maybeBind(host, host.realpath),
        getEnvironmentVariable: maybeBind(host, host.getEnvironmentVariable) || (() => ""),
        createHash: maybeBind(host, host.createHash),
        readDirectory: maybeBind(host, host.readDirectory),
        storeSignatureInfo: host.storeSignatureInfo,
        jsDocParsingMode: host.jsDocParsingMode,
    };
    return compilerHost;
}
/** @internal */
export function getSourceFileVersionAsHashFromText(host, text) {
    // If text can contain the sourceMapUrl ignore sourceMapUrl for calcualting hash
    if (text.match(sourceMapCommentRegExpDontCareLineStart)) {
        let lineEnd = text.length;
        let lineStart = lineEnd;
        for (let pos = lineEnd - 1; pos >= 0; pos--) {
            const ch = text.charCodeAt(pos);
            switch (ch) {
                case CharacterCodes.lineFeed:
                    if (pos && text.charCodeAt(pos - 1) === CharacterCodes.carriageReturn) {
                        pos--;
                    }
                // falls through
                case CharacterCodes.carriageReturn:
                    break;
                default:
                    if (ch < CharacterCodes.maxAsciiCharacter || !isLineBreak(ch)) {
                        lineStart = pos;
                        continue;
                    }
                    break;
            }
            // This is start of the line
            const line = text.substring(lineStart, lineEnd);
            if (line.match(sourceMapCommentRegExp)) {
                text = text.substring(0, lineStart);
                break;
            }
            // If we see a non-whitespace/map comment-like line, break, to avoid scanning up the entire file
            else if (!line.match(whitespaceOrMapCommentRegExp)) {
                break;
            }
            lineEnd = lineStart;
        }
    }
    return (host.createHash || generateDjb2Hash)(text);
}
/** @internal */
export function setGetSourceFileAsHashVersioned(compilerHost) {
    const originalGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (...args) => {
        const result = originalGetSourceFile.call(compilerHost, ...args);
        if (result) {
            result.version = getSourceFileVersionAsHashFromText(compilerHost, result.text);
        }
        return result;
    };
}
/**
 * Creates the watch compiler host that can be extended with config file or root file names and options host
 *
 * @internal
 */
export function createProgramHost(system, createProgram) {
    const getDefaultLibLocation = memoize(() => getDirectoryPath(normalizePath(system.getExecutingFilePath())));
    return {
        useCaseSensitiveFileNames: () => system.useCaseSensitiveFileNames,
        getNewLine: () => system.newLine,
        getCurrentDirectory: memoize(() => system.getCurrentDirectory()),
        getDefaultLibLocation,
        getDefaultLibFileName: options => combinePaths(getDefaultLibLocation(), getDefaultLibFileName(options)),
        fileExists: path => system.fileExists(path),
        readFile: (path, encoding) => system.readFile(path, encoding),
        directoryExists: path => system.directoryExists(path),
        getDirectories: path => system.getDirectories(path),
        readDirectory: (path, extensions, exclude, include, depth) => system.readDirectory(path, extensions, exclude, include, depth),
        realpath: maybeBind(system, system.realpath),
        getEnvironmentVariable: maybeBind(system, system.getEnvironmentVariable),
        trace: s => system.write(s + system.newLine),
        createDirectory: path => system.createDirectory(path),
        writeFile: (path, data, writeByteOrderMark) => system.writeFile(path, data, writeByteOrderMark),
        createHash: maybeBind(system, system.createHash),
        createProgram: createProgram || createEmitAndSemanticDiagnosticsBuilderProgram,
        storeSignatureInfo: system.storeSignatureInfo,
        now: maybeBind(system, system.now),
    };
}
/**
 * Creates the watch compiler host that can be extended with config file or root file names and options host
 */
function createWatchCompilerHost(system = sys, createProgram, reportDiagnostic, reportWatchStatus) {
    const write = (s) => system.write(s + system.newLine);
    const result = createProgramHost(system, createProgram);
    copyProperties(result, createWatchHost(system, reportWatchStatus));
    result.afterProgramCreate = builderProgram => {
        const compilerOptions = builderProgram.getCompilerOptions();
        const newLine = getNewLineCharacter(compilerOptions);
        emitFilesAndReportErrors(builderProgram, reportDiagnostic, write, errorCount => result.onWatchStatusChange(createCompilerDiagnostic(getWatchErrorSummaryDiagnosticMessage(errorCount), errorCount), newLine, compilerOptions, errorCount));
    };
    return result;
}
/**
 * Report error and exit
 */
function reportUnrecoverableDiagnostic(system, reportDiagnostic, diagnostic) {
    reportDiagnostic(diagnostic);
    system.exit(ExitStatus.DiagnosticsPresent_OutputsSkipped);
}
/**
 * Creates the watch compiler host from system for config file in watch mode
 *
 * @internal
 */
export function createWatchCompilerHostOfConfigFile({ configFileName, optionsToExtend, watchOptionsToExtend, extraFileExtensions, system, createProgram, reportDiagnostic, reportWatchStatus, }) {
    const diagnosticReporter = reportDiagnostic || createDiagnosticReporter(system);
    const host = createWatchCompilerHost(system, createProgram, diagnosticReporter, reportWatchStatus);
    host.onUnRecoverableConfigFileDiagnostic = diagnostic => reportUnrecoverableDiagnostic(system, diagnosticReporter, diagnostic);
    host.configFileName = configFileName;
    host.optionsToExtend = optionsToExtend;
    host.watchOptionsToExtend = watchOptionsToExtend;
    host.extraFileExtensions = extraFileExtensions;
    return host;
}
/**
 * Creates the watch compiler host from system for compiling root files and options in watch mode
 *
 * @internal
 */
export function createWatchCompilerHostOfFilesAndCompilerOptions({ rootFiles, options, watchOptions, projectReferences, system, createProgram, reportDiagnostic, reportWatchStatus, }) {
    const host = createWatchCompilerHost(system, createProgram, reportDiagnostic || createDiagnosticReporter(system), reportWatchStatus);
    host.rootFiles = rootFiles;
    host.options = options;
    host.watchOptions = watchOptions;
    host.projectReferences = projectReferences;
    return host;
}
/** @internal */
export function performIncrementalCompilation(input) {
    const system = input.system || sys;
    const host = input.host || (input.host = createIncrementalCompilerHost(input.options, system));
    const builderProgram = createIncrementalProgram(input);
    const exitStatus = emitFilesAndReportErrorsAndGetExitStatus(builderProgram, input.reportDiagnostic || createDiagnosticReporter(system), s => host.trace && host.trace(s), input.reportErrorSummary || input.options.pretty ? (errorCount, filesInError) => system.write(getErrorSummaryText(errorCount, filesInError, system.newLine, host)) : undefined);
    if (input.afterProgramEmitAndDiagnostics)
        input.afterProgramEmitAndDiagnostics(builderProgram);
    return exitStatus;
}
