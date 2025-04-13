import {
  arrayToMap,
  binarySearch,
  clearMap,
  closeFileWatcher,
  compareStringsCaseSensitive,
  createGetCanonicalFileName,
  Debug,
  emptyArray,
  emptyFileSystemEntries,
  ensureTrailingDirectorySeparator,
  Extension,
  fileExtensionIsOneOf,
  FileWatcherEventKind,
  find,
  forEachAncestorDirectory,
  getAllowJSCompilerOption,
  getBaseFileName,
  getDirectoryPath,
  getNormalizedAbsolutePath,
  getResolveJsonModule,
  hasExtension,
  identity,
  insertSorted,
  isArray,
  isBuilderProgram,
  isDeclarationFileName,
  isExcludedFile,
  isSupportedSourceFileName,
  map,
  matchesExclude,
  matchFiles,
  mutateMap,
  noop,
  normalizePath,
  removeFileExtension,
  removeIgnoredPath,
  returnNoopFileWatcher,
  ScriptKind,
  setSysLog,
  supportedJSExtensionsFlat,
  timestamp,
  toPath as ts_toPath,
  WatchDirectoryFlags,
  WatchFileKind,
} from "./_namespaces/ts.js";

/** @internal */
export function createCachedDirectoryStructureHost(host, currentDirectory, useCaseSensitiveFileNames) {
    if (!host.getDirectories || !host.readDirectory) {
        return undefined;
    }
    const cachedReadDirectoryResult = new Map();
    const getCanonicalFileName = createGetCanonicalFileName(useCaseSensitiveFileNames);
    return {
        useCaseSensitiveFileNames,
        fileExists,
        readFile: (path, encoding) => host.readFile(path, encoding),
        directoryExists: host.directoryExists && directoryExists,
        getDirectories,
        readDirectory,
        createDirectory: host.createDirectory && createDirectory,
        writeFile: host.writeFile && writeFile,
        addOrDeleteFileOrDirectory,
        addOrDeleteFile,
        clearCache,
        realpath: host.realpath && realpath,
    };
    function toPath(fileName) {
        return ts_toPath(fileName, currentDirectory, getCanonicalFileName);
    }
    function getCachedFileSystemEntries(rootDirPath) {
        return cachedReadDirectoryResult.get(ensureTrailingDirectorySeparator(rootDirPath));
    }
    function getCachedFileSystemEntriesForBaseDir(path) {
        const entries = getCachedFileSystemEntries(getDirectoryPath(path));
        if (!entries) {
            return entries;
        }
        // If we're looking for the base directory, we're definitely going to search the entries
        if (!entries.sortedAndCanonicalizedFiles) {
            entries.sortedAndCanonicalizedFiles = entries.files.map(getCanonicalFileName).sort();
            entries.sortedAndCanonicalizedDirectories = entries.directories.map(getCanonicalFileName).sort();
        }
        return entries;
    }
    function getBaseNameOfFileName(fileName) {
        return getBaseFileName(normalizePath(fileName));
    }
    function createCachedFileSystemEntries(rootDir, rootDirPath) {
        var _a;
        if (!host.realpath || ensureTrailingDirectorySeparator(toPath(host.realpath(rootDir))) === rootDirPath) {
            const resultFromHost = {
                files: map(host.readDirectory(rootDir, /*extensions*/ undefined, /*exclude*/ undefined, /*include*/ ["*.*"]), getBaseNameOfFileName) || [],
                directories: host.getDirectories(rootDir) || [],
            };
            cachedReadDirectoryResult.set(ensureTrailingDirectorySeparator(rootDirPath), resultFromHost);
            return resultFromHost;
        }
        // If the directory is symlink do not cache the result
        if ((_a = host.directoryExists) === null || _a === void 0 ? void 0 : _a.call(host, rootDir)) {
            cachedReadDirectoryResult.set(rootDirPath, false);
            return false;
        }
        // Non existing directory
        return undefined;
    }
    /**
     * If the readDirectory result was already cached, it returns that
     * Otherwise gets result from host and caches it.
     * The host request is done under try catch block to avoid caching incorrect result
     */
    function tryReadDirectory(rootDir, rootDirPath) {
        rootDirPath = ensureTrailingDirectorySeparator(rootDirPath);
        const cachedResult = getCachedFileSystemEntries(rootDirPath);
        if (cachedResult) {
            return cachedResult;
        }
        try {
            return createCachedFileSystemEntries(rootDir, rootDirPath);
        }
        catch (_a) {
            // If there is exception to read directories, dont cache the result and direct the calls to host
            Debug.assert(!cachedReadDirectoryResult.has(ensureTrailingDirectorySeparator(rootDirPath)));
            return undefined;
        }
    }
    function hasEntry(entries, name) {
        // Case-sensitive comparison since already canonicalized
        const index = binarySearch(entries, name, identity, compareStringsCaseSensitive);
        return index >= 0;
    }
    function writeFile(fileName, data, writeByteOrderMark) {
        const path = toPath(fileName);
        const result = getCachedFileSystemEntriesForBaseDir(path);
        if (result) {
            updateFilesOfFileSystemEntry(result, getBaseNameOfFileName(fileName), /*fileExists*/ true);
        }
        return host.writeFile(fileName, data, writeByteOrderMark);
    }
    function fileExists(fileName) {
        const path = toPath(fileName);
        const result = getCachedFileSystemEntriesForBaseDir(path);
        return result && hasEntry(result.sortedAndCanonicalizedFiles, getCanonicalFileName(getBaseNameOfFileName(fileName))) ||
            host.fileExists(fileName);
    }
    function directoryExists(dirPath) {
        const path = toPath(dirPath);
        return cachedReadDirectoryResult.has(ensureTrailingDirectorySeparator(path)) || host.directoryExists(dirPath);
    }
    function createDirectory(dirPath) {
        const path = toPath(dirPath);
        const result = getCachedFileSystemEntriesForBaseDir(path);
        if (result) {
            const baseName = getBaseNameOfFileName(dirPath);
            const canonicalizedBaseName = getCanonicalFileName(baseName);
            const canonicalizedDirectories = result.sortedAndCanonicalizedDirectories;
            // Case-sensitive comparison since already canonicalized
            if (insertSorted(canonicalizedDirectories, canonicalizedBaseName, compareStringsCaseSensitive)) {
                result.directories.push(baseName);
            }
        }
        host.createDirectory(dirPath);
    }
    function getDirectories(rootDir) {
        const rootDirPath = toPath(rootDir);
        const result = tryReadDirectory(rootDir, rootDirPath);
        if (result) {
            return result.directories.slice();
        }
        return host.getDirectories(rootDir);
    }
    function readDirectory(rootDir, extensions, excludes, includes, depth) {
        const rootDirPath = toPath(rootDir);
        const rootResult = tryReadDirectory(rootDir, rootDirPath);
        let rootSymLinkResult;
        if (rootResult !== undefined) {
            return matchFiles(rootDir, extensions, excludes, includes, useCaseSensitiveFileNames, currentDirectory, depth, getFileSystemEntries, realpath);
        }
        return host.readDirectory(rootDir, extensions, excludes, includes, depth);
        function getFileSystemEntries(dir) {
            const path = toPath(dir);
            if (path === rootDirPath) {
                return rootResult || getFileSystemEntriesFromHost(dir, path);
            }
            const result = tryReadDirectory(dir, path);
            return result !== undefined ?
                result || getFileSystemEntriesFromHost(dir, path) :
                emptyFileSystemEntries;
        }
        function getFileSystemEntriesFromHost(dir, path) {
            if (rootSymLinkResult && path === rootDirPath)
                return rootSymLinkResult;
            const result = {
                files: map(host.readDirectory(dir, /*extensions*/ undefined, /*exclude*/ undefined, /*include*/ ["*.*"]), getBaseNameOfFileName) || emptyArray,
                directories: host.getDirectories(dir) || emptyArray,
            };
            if (path === rootDirPath)
                rootSymLinkResult = result;
            return result;
        }
    }
    function realpath(s) {
        return host.realpath ? host.realpath(s) : s;
    }
    function clearFirstAncestorEntry(fileOrDirectoryPath) {
        forEachAncestorDirectory(getDirectoryPath(fileOrDirectoryPath), ancestor => cachedReadDirectoryResult.delete(ensureTrailingDirectorySeparator(ancestor)) ? true : undefined);
    }
    function addOrDeleteFileOrDirectory(fileOrDirectory, fileOrDirectoryPath) {
        const existingResult = getCachedFileSystemEntries(fileOrDirectoryPath);
        if (existingResult !== undefined) {
            // Just clear the cache for now
            // For now just clear the cache, since this could mean that multiple level entries might need to be re-evaluated
            clearCache();
            return undefined;
        }
        const parentResult = getCachedFileSystemEntriesForBaseDir(fileOrDirectoryPath);
        if (!parentResult) {
            clearFirstAncestorEntry(fileOrDirectoryPath);
            return undefined;
        }
        // This was earlier a file (hence not in cached directory contents)
        // or we never cached the directory containing it
        if (!host.directoryExists) {
            // Since host doesnt support directory exists, clear the cache as otherwise it might not be same
            clearCache();
            return undefined;
        }
        const baseName = getBaseNameOfFileName(fileOrDirectory);
        const fsQueryResult = {
            fileExists: host.fileExists(fileOrDirectory),
            directoryExists: host.directoryExists(fileOrDirectory),
        };
        if (fsQueryResult.directoryExists || hasEntry(parentResult.sortedAndCanonicalizedDirectories, getCanonicalFileName(baseName))) {
            // Folder added or removed, clear the cache instead of updating the folder and its structure
            clearCache();
        }
        else {
            // No need to update the directory structure, just files
            updateFilesOfFileSystemEntry(parentResult, baseName, fsQueryResult.fileExists);
        }
        return fsQueryResult;
    }
    function addOrDeleteFile(fileName, filePath, eventKind) {
        if (eventKind === FileWatcherEventKind.Changed) {
            return;
        }
        const parentResult = getCachedFileSystemEntriesForBaseDir(filePath);
        if (parentResult) {
            updateFilesOfFileSystemEntry(parentResult, getBaseNameOfFileName(fileName), eventKind === FileWatcherEventKind.Created);
        }
        else {
            clearFirstAncestorEntry(filePath);
        }
    }
    function updateFilesOfFileSystemEntry(parentResult, baseName, fileExists) {
        const canonicalizedFiles = parentResult.sortedAndCanonicalizedFiles;
        const canonicalizedBaseName = getCanonicalFileName(baseName);
        if (fileExists) {
            // Case-sensitive comparison since already canonicalized
            if (insertSorted(canonicalizedFiles, canonicalizedBaseName, compareStringsCaseSensitive)) {
                parentResult.files.push(baseName);
            }
        }
        else {
            // Case-sensitive comparison since already canonicalized
            const sortedIndex = binarySearch(canonicalizedFiles, canonicalizedBaseName, identity, compareStringsCaseSensitive);
            if (sortedIndex >= 0) {
                canonicalizedFiles.splice(sortedIndex, 1);
                const unsortedIndex = parentResult.files.findIndex(entry => getCanonicalFileName(entry) === canonicalizedBaseName);
                parentResult.files.splice(unsortedIndex, 1);
            }
        }
    }
    function clearCache() {
        cachedReadDirectoryResult.clear();
    }
}


//export enum ProgramUpdateLevel {
//    /** Program is updated with same root file names and options */
//    Update,
//    /** Loads program after updating root file names from the disk */
//    RootNamesAndUpdate,
//    /**
//     * Loads program completely, including:
//     *  - re-reading contents of config file from disk
//     *  - calculating root file names for the program
//     *  - Updating the program
//     */
//
//    Full,
//}
export var ProgramUpdateLevel;
(function (ProgramUpdateLevel) {
    /** Program is updated with same root file names and options */
    ProgramUpdateLevel[ProgramUpdateLevel["Update"] = 0] = "Update";
    /** Loads program after updating root file names from the disk */
    ProgramUpdateLevel[ProgramUpdateLevel["RootNamesAndUpdate"] = 1] = "RootNamesAndUpdate";
    /**
     * Loads program completely, including:
     *  - re-reading contents of config file from disk
     *  - calculating root file names for the program
     *  - Updating the program
     */
    ProgramUpdateLevel[ProgramUpdateLevel["Full"] = 2] = "Full";
})(ProgramUpdateLevel || (ProgramUpdateLevel = {}));

/**
 * Updates the map of shared extended config file watches with a new set of extended config files from a base config file of the project
 *
 * @internal
 */
export function updateSharedExtendedConfigFileWatcher(projectPath, options, extendedConfigFilesMap, createExtendedConfigFileWatch, toPath) {
    var _a;
    const extendedConfigs = arrayToMap(((_a = options === null || options === void 0 ? void 0 : options.configFile) === null || _a === void 0 ? void 0 : _a.extendedSourceFiles) || emptyArray, toPath);
    // remove project from all unrelated watchers
    extendedConfigFilesMap.forEach((watcher, extendedConfigFilePath) => {
        if (!extendedConfigs.has(extendedConfigFilePath)) {
            watcher.projects.delete(projectPath);
            watcher.close();
        }
    });
    // Update the extended config files watcher
    extendedConfigs.forEach((extendedConfigFileName, extendedConfigFilePath) => {
        const existing = extendedConfigFilesMap.get(extendedConfigFilePath);
        if (existing) {
            existing.projects.add(projectPath);
        }
        else {
            // start watching previously unseen extended config
            extendedConfigFilesMap.set(extendedConfigFilePath, {
                projects: new Set([projectPath]),
                watcher: createExtendedConfigFileWatch(extendedConfigFileName, extendedConfigFilePath),
                close: () => {
                    const existing = extendedConfigFilesMap.get(extendedConfigFilePath);
                    if (!existing || existing.projects.size !== 0)
                        return;
                    existing.watcher.close();
                    extendedConfigFilesMap.delete(extendedConfigFilePath);
                },
            });
        }
    });
}
/**
 * Remove the project from the extended config file watchers and close not needed watches
 *
 * @internal
 */
export function clearSharedExtendedConfigFileWatcher(projectPath, extendedConfigFilesMap) {
    extendedConfigFilesMap.forEach(watcher => {
        if (watcher.projects.delete(projectPath))
            watcher.close();
    });
}
/**
 * Clean the extendsConfigCache when extended config file has changed
 *
 * @internal
 */
export function cleanExtendedConfigCache(extendedConfigCache, extendedConfigFilePath, toPath) {
    if (!extendedConfigCache.delete(extendedConfigFilePath))
        return;
    extendedConfigCache.forEach(({ extendedResult }, key) => {
        var _a;
        if ((_a = extendedResult.extendedSourceFiles) === null || _a === void 0 ? void 0 : _a.some(extendedFile => toPath(extendedFile) === extendedConfigFilePath)) {
            cleanExtendedConfigCache(extendedConfigCache, key, toPath);
        }
    });
}
/**
 * Updates the existing missing file watches with the new set of missing files after new program is created
 *
 * @internal
 */
export function updateMissingFilePathsWatch(program, missingFileWatches, createMissingFileWatch) {
    // Update the missing file paths watcher
    mutateMap(missingFileWatches, program.getMissingFilePaths(), {
        // Watch the missing files
        createNewValue: createMissingFileWatch,
        // Files that are no longer missing (e.g. because they are no longer required)
        // should no longer be watched.
        onDeleteValue: closeFileWatcher,
    });
}
/**
 * Updates the existing wild card directory watches with the new set of wild card directories from the config file
 * after new program is created because the config file was reloaded or program was created first time from the config file
 * Note that there is no need to call this function when the program is updated with additional files without reloading config files,
 * as wildcard directories wont change unless reloading config file
 *
 * @internal
 */
export function updateWatchingWildcardDirectories(existingWatchedForWildcards, wildcardDirectories, watchDirectory) {
    if (wildcardDirectories) {
        mutateMap(existingWatchedForWildcards, new Map(Object.entries(wildcardDirectories)), {
            // Create new watch and recursive info
            createNewValue: createWildcardDirectoryWatcher,
            // Close existing watch thats not needed any more
            onDeleteValue: closeFileWatcherOf,
            // Close existing watch that doesnt match in the flags
            onExistingValue: updateWildcardDirectoryWatcher,
        });
    }
    else {
        clearMap(existingWatchedForWildcards, closeFileWatcherOf);
    }
    function createWildcardDirectoryWatcher(directory, flags) {
        // Create new watch and recursive info
        return {
            watcher: watchDirectory(directory, flags),
            flags,
        };
    }
    function updateWildcardDirectoryWatcher(existingWatcher, flags, directory) {
        // Watcher needs to be updated if the recursive flags dont match
        if (existingWatcher.flags === flags) {
            return;
        }
        existingWatcher.watcher.close();
        existingWatchedForWildcards.set(directory, createWildcardDirectoryWatcher(directory, flags));
    }
}
/** @internal */
export function isIgnoredFileFromWildCardWatching({ watchedDirPath, fileOrDirectory, fileOrDirectoryPath, configFileName, options, program, extraFileExtensions, currentDirectory, useCaseSensitiveFileNames, writeLog, toPath, getScriptKind, }) {
    const newPath = removeIgnoredPath(fileOrDirectoryPath);
    if (!newPath) {
        writeLog(`Project: ${configFileName} Detected ignored path: ${fileOrDirectory}`);
        return true;
    }
    fileOrDirectoryPath = newPath;
    if (fileOrDirectoryPath === watchedDirPath)
        return false;
    // If the the added or created file or directory is not supported file name, ignore the file
    if (hasExtension(fileOrDirectoryPath) && !(isSupportedSourceFileName(fileOrDirectory, options, extraFileExtensions) ||
        isSupportedScriptKind())) {
        writeLog(`Project: ${configFileName} Detected file add/remove of non supported extension: ${fileOrDirectory}`);
        return true;
    }
    if (isExcludedFile(fileOrDirectory, options.configFile.configFileSpecs, getNormalizedAbsolutePath(getDirectoryPath(configFileName), currentDirectory), useCaseSensitiveFileNames, currentDirectory)) {
        writeLog(`Project: ${configFileName} Detected excluded file: ${fileOrDirectory}`);
        return true;
    }
    if (!program)
        return false;
    // We want to ignore emit file check if file is not going to be emitted next to source file
    // In that case we follow config file inclusion rules
    if (options.outFile || options.outDir)
        return false;
    // File if emitted next to input needs to be ignored
    if (isDeclarationFileName(fileOrDirectoryPath)) {
        // If its declaration directory: its not ignored if not excluded by config
        if (options.declarationDir)
            return false;
    }
    else if (!fileExtensionIsOneOf(fileOrDirectoryPath, supportedJSExtensionsFlat)) {
        return false;
    }
    // just check if sourceFile with the name exists
    const filePathWithoutExtension = removeFileExtension(fileOrDirectoryPath);
    const realProgram = isArray(program) ? undefined : isBuilderProgram(program) ? program.getProgramOrUndefined() : program;
    const builderProgram = !realProgram && !isArray(program) ? program : undefined;
    if (hasSourceFile((filePathWithoutExtension + Extension.Ts)) ||
        hasSourceFile((filePathWithoutExtension + Extension.Tsx))) {
        writeLog(`Project: ${configFileName} Detected output file: ${fileOrDirectory}`);
        return true;
    }
    return false;
    function hasSourceFile(file) {
        return realProgram ?
            !!realProgram.getSourceFileByPath(file) :
            builderProgram ?
                builderProgram.state.fileInfos.has(file) :
                !!find(program, rootFile => toPath(rootFile) === file);
    }
    function isSupportedScriptKind() {
        if (!getScriptKind)
            return false;
        const scriptKind = getScriptKind(fileOrDirectory);
        switch (scriptKind) {
            case ScriptKind.TS:
            case ScriptKind.TSX:
            case ScriptKind.Deferred:
            case ScriptKind.External:
                return true;
            case ScriptKind.JS:
            case ScriptKind.JSX:
                return getAllowJSCompilerOption(options);
            case ScriptKind.JSON:
                return getResolveJsonModule(options);
            case ScriptKind.Unknown:
                return false;
        }
    }
}
/** @internal */
export function isEmittedFileOfProgram(program, file) {
    if (!program) {
        return false;
    }
    return program.isEmittedFile(file);
}

// /** @internal */
// export enum WatchLogLevel {
//     None,
//     TriggerOnly,
//     Verbose,
// }
/** @internal */
export var WatchLogLevel;
(function (WatchLogLevel) {
    WatchLogLevel[WatchLogLevel["None"] = 0] = "None";
    WatchLogLevel[WatchLogLevel["TriggerOnly"] = 1] = "TriggerOnly";
    WatchLogLevel[WatchLogLevel["Verbose"] = 2] = "Verbose";
})(WatchLogLevel || (WatchLogLevel = {}));

/** @internal */
export function getWatchFactory(host, watchLogLevel, log, getDetailWatchInfo) {
    setSysLog(watchLogLevel === WatchLogLevel.Verbose ? log : noop);
    const plainInvokeFactory = {
        watchFile: (file, callback, pollingInterval, options) => host.watchFile(file, callback, pollingInterval, options),
        watchDirectory: (directory, callback, flags, options) => host.watchDirectory(directory, callback, (flags & WatchDirectoryFlags.Recursive) !== 0, options),
    };
    const triggerInvokingFactory = watchLogLevel !== WatchLogLevel.None ?
        {
            watchFile: createTriggerLoggingAddWatch("watchFile"),
            watchDirectory: createTriggerLoggingAddWatch("watchDirectory"),
        } :
        undefined;
    const factory = watchLogLevel === WatchLogLevel.Verbose ?
        {
            watchFile: createFileWatcherWithLogging,
            watchDirectory: createDirectoryWatcherWithLogging,
        } :
        triggerInvokingFactory || plainInvokeFactory;
    const excludeWatcherFactory = watchLogLevel === WatchLogLevel.Verbose ?
        createExcludeWatcherWithLogging :
        returnNoopFileWatcher;
    return {
        watchFile: createExcludeHandlingAddWatch("watchFile"),
        watchDirectory: createExcludeHandlingAddWatch("watchDirectory"),
    };
    function createExcludeHandlingAddWatch(key) {
        return (file, cb, flags, options, detailInfo1, detailInfo2) => {
            var _a;
            return !matchesExclude(file, key === "watchFile" ? options === null || options === void 0 ? void 0 : options.excludeFiles : options === null || options === void 0 ? void 0 : options.excludeDirectories, useCaseSensitiveFileNames(), ((_a = host.getCurrentDirectory) === null || _a === void 0 ? void 0 : _a.call(host)) || "") ?
                factory[key].call(/*thisArgs*/ undefined, file, cb, flags, options, detailInfo1, detailInfo2) :
                excludeWatcherFactory(file, flags, options, detailInfo1, detailInfo2);
        };
    }
    function useCaseSensitiveFileNames() {
        return typeof host.useCaseSensitiveFileNames === "boolean" ?
            host.useCaseSensitiveFileNames :
            host.useCaseSensitiveFileNames();
    }
    function createExcludeWatcherWithLogging(file, flags, options, detailInfo1, detailInfo2) {
        log(`ExcludeWatcher:: Added:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`);
        return {
            close: () => log(`ExcludeWatcher:: Close:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`),
        };
    }
    function createFileWatcherWithLogging(file, cb, flags, options, detailInfo1, detailInfo2) {
        log(`FileWatcher:: Added:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`);
        const watcher = triggerInvokingFactory.watchFile(file, cb, flags, options, detailInfo1, detailInfo2);
        return {
            close: () => {
                log(`FileWatcher:: Close:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`);
                watcher.close();
            },
        };
    }
    function createDirectoryWatcherWithLogging(file, cb, flags, options, detailInfo1, detailInfo2) {
        const watchInfo = `DirectoryWatcher:: Added:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`;
        log(watchInfo);
        const start = timestamp();
        const watcher = triggerInvokingFactory.watchDirectory(file, cb, flags, options, detailInfo1, detailInfo2);
        const elapsed = timestamp() - start;
        log(`Elapsed:: ${elapsed}ms ${watchInfo}`);
        return {
            close: () => {
                const watchInfo = `DirectoryWatcher:: Close:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`;
                log(watchInfo);
                const start = timestamp();
                watcher.close();
                const elapsed = timestamp() - start;
                log(`Elapsed:: ${elapsed}ms ${watchInfo}`);
            },
        };
    }
    function createTriggerLoggingAddWatch(key) {
        return (file, cb, flags, options, detailInfo1, detailInfo2) => plainInvokeFactory[key].call(
        /*thisArgs*/ undefined, file, (...args) => {
            const triggerredInfo = `${key === "watchFile" ? "FileWatcher" : "DirectoryWatcher"}:: Triggered with ${args[0]} ${args[1] !== undefined ? args[1] : ""}:: ${getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo)}`;
            log(triggerredInfo);
            const start = timestamp();
            cb.call(/*thisArg*/ undefined, ...args);
            const elapsed = timestamp() - start;
            log(`Elapsed:: ${elapsed}ms ${triggerredInfo}`);
        }, flags, options, detailInfo1, detailInfo2);
    }
    function getWatchInfo(file, flags, options, detailInfo1, detailInfo2, getDetailWatchInfo) {
        return `WatchInfo: ${file} ${flags} ${JSON.stringify(options)} ${getDetailWatchInfo ? getDetailWatchInfo(detailInfo1, detailInfo2) : detailInfo2 === undefined ? detailInfo1 : `${detailInfo1} ${detailInfo2}`}`;
    }
}
/** @internal */
export function getFallbackOptions(options) {
    const fallbackPolling = options === null || options === void 0 ? void 0 : options.fallbackPolling;
    return {
        watchFile: fallbackPolling !== undefined ?
            fallbackPolling :
            WatchFileKind.PriorityPollingInterval,
    };
}
/** @internal */
export function closeFileWatcherOf(objWithWatcher) {
    objWithWatcher.watcher.close();
}
