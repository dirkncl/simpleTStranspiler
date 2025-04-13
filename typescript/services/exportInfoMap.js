import {
  addToSeen,
  append,
  arrayIsEqualTo,
  consumesNodeCoreModules,
  createMultiMap,
  Debug,
  emptyArray,
  ensureTrailingDirectorySeparator,
  findIndex,
  forEachAncestorDirectoryStoppingAtGlobalCache,
  forEachEntry,
  getBaseFileName,
  getDefaultLikeExportNameFromDeclaration,
  getDirectoryPath,
  getLocalSymbolForExportDefault,
  getNodeModulePathParts,
  getPackageNameFromTypesPackageName,
  getRegexFromPattern,
  getSubPatternFromSpec,
  getSymbolId,
  hostGetCanonicalFileName,
  hostUsesCaseSensitiveFileNames,
  InternalSymbolName,
  isExternalModuleNameRelative,
  isExternalModuleSymbol,
  isExternalOrCommonJsModule,
  isKnownSymbol,
  isNonGlobalAmbientModule,
  isPrivateIdentifierSymbol,
  mapDefined,
  moduleSpecifiers,
  moduleSymbolToValidIdentifier,
  nodeCoreModules,
  nodeModulesPathPart,
  pathContainsNodeModules,
  shouldUseUriStyleNodeCoreModules,
  skipAlias,
  startsWith,
  stripQuotes,
  SymbolFlags,
  timestamp,
  unescapeLeadingUnderscores,
  unmangleScopedPackageName,
} from "./namespaces/ts.js";

/** @internal */
export var ImportKind;
(function (ImportKind) {
    ImportKind[ImportKind["Named"] = 0] = "Named";
    ImportKind[ImportKind["Default"] = 1] = "Default";
    ImportKind[ImportKind["Namespace"] = 2] = "Namespace";
    ImportKind[ImportKind["CommonJS"] = 3] = "CommonJS";
})(ImportKind || (ImportKind = {}));

/** @internal */
export var ExportKind;
(function (ExportKind) {
    ExportKind[ExportKind["Named"] = 0] = "Named";
    ExportKind[ExportKind["Default"] = 1] = "Default";
    ExportKind[ExportKind["ExportEquals"] = 2] = "ExportEquals";
    ExportKind[ExportKind["UMD"] = 3] = "UMD";
    ExportKind[ExportKind["Module"] = 4] = "Module";
})(ExportKind || (ExportKind = {}));

/** @internal */
export function createCacheableExportInfoMap(host) {
    let exportInfoId = 1;
    const exportInfo = createMultiMap();
    const symbols = new Map();
    /**
     * Key: node_modules package name (no @types).
     * Value: path to deepest node_modules folder seen that is
     * both visible to `usableByFileName` and contains the package.
     *
     * Later, we can see if a given SymbolExportInfo is shadowed by
     * a another installation of the same package in a deeper
     * node_modules folder by seeing if its path starts with the
     * value stored here.
     */
    const packages = new Map();
    let usableByFileName;
    const cache = {
        isUsableByFile: importingFile => importingFile === usableByFileName,
        isEmpty: () => !exportInfo.size,
        clear: () => {
            exportInfo.clear();
            symbols.clear();
            usableByFileName = undefined;
        },
        add: (importingFile, symbol, symbolTableKey, moduleSymbol, moduleFile, exportKind, isFromPackageJson, checker) => {
            if (importingFile !== usableByFileName) {
                cache.clear();
                usableByFileName = importingFile;
            }
            let packageName;
            if (moduleFile) {
                const nodeModulesPathParts = getNodeModulePathParts(moduleFile.fileName);
                if (nodeModulesPathParts) {
                    const { topLevelNodeModulesIndex, topLevelPackageNameIndex, packageRootIndex } = nodeModulesPathParts;
                    packageName = unmangleScopedPackageName(getPackageNameFromTypesPackageName(moduleFile.fileName.substring(topLevelPackageNameIndex + 1, packageRootIndex)));
                    if (startsWith(importingFile, moduleFile.path.substring(0, topLevelNodeModulesIndex))) {
                        const prevDeepestNodeModulesPath = packages.get(packageName);
                        const nodeModulesPath = moduleFile.fileName.substring(0, topLevelPackageNameIndex + 1);
                        if (prevDeepestNodeModulesPath) {
                            const prevDeepestNodeModulesIndex = prevDeepestNodeModulesPath.indexOf(nodeModulesPathPart);
                            if (topLevelNodeModulesIndex > prevDeepestNodeModulesIndex) {
                                packages.set(packageName, nodeModulesPath);
                            }
                        }
                        else {
                            packages.set(packageName, nodeModulesPath);
                        }
                    }
                }
            }
            const isDefault = exportKind === 1 /* ExportKind.Default */;
            const namedSymbol = isDefault && getLocalSymbolForExportDefault(symbol) || symbol;
            // 1. A named export must be imported by its key in `moduleSymbol.exports` or `moduleSymbol.members`.
            // 2. A re-export merged with an export from a module augmentation can result in `symbol`
            //    being an external module symbol; the name it is re-exported by will be `symbolTableKey`
            //    (which comes from the keys of `moduleSymbol.exports`.)
            // 3. Otherwise, we have a default/namespace import that can be imported by any name, and
            //    `symbolTableKey` will be something undesirable like `export=` or `default`, so we try to
            //    get a better name.
            const names = exportKind === 0 /* ExportKind.Named */ || isExternalModuleSymbol(namedSymbol)
                ? unescapeLeadingUnderscores(symbolTableKey)
                : getNamesForExportedSymbol(namedSymbol, checker, /*scriptTarget*/ undefined);
            const symbolName = typeof names === "string" ? names : names[0];
            const capitalizedSymbolName = typeof names === "string" ? undefined : names[1];
            const moduleName = stripQuotes(moduleSymbol.name);
            const id = exportInfoId++;
            const target = skipAlias(symbol, checker);
            const storedSymbol = symbol.flags & SymbolFlags.Transient ? undefined : symbol;
            const storedModuleSymbol = moduleSymbol.flags & SymbolFlags.Transient ? undefined : moduleSymbol;
            if (!storedSymbol || !storedModuleSymbol)
                symbols.set(id, [symbol, moduleSymbol]);
            exportInfo.add(key(symbolName, symbol, isExternalModuleNameRelative(moduleName) ? undefined : moduleName, checker), {
                id,
                symbolTableKey,
                symbolName,
                capitalizedSymbolName,
                moduleName,
                moduleFile,
                moduleFileName: moduleFile === null || moduleFile === void 0 ? void 0 : moduleFile.fileName,
                packageName,
                exportKind,
                targetFlags: target.flags,
                isFromPackageJson,
                symbol: storedSymbol,
                moduleSymbol: storedModuleSymbol,
            });
        },
        get: (importingFile, key) => {
            if (importingFile !== usableByFileName)
                return;
            const result = exportInfo.get(key);
            return result === null || result === void 0 ? void 0 : result.map(rehydrateCachedInfo);
        },
        search: (importingFile, preferCapitalized, matches, action) => {
            if (importingFile !== usableByFileName)
                return;
            return forEachEntry(exportInfo, (info, key) => {
                const { symbolName, ambientModuleName } = parseKey(key);
                const name = preferCapitalized && info[0].capitalizedSymbolName || symbolName;
                if (matches(name, info[0].targetFlags)) {
                    const rehydrated = info.map(rehydrateCachedInfo);
                    const filtered = rehydrated.filter((r, i) => isNotShadowedByDeeperNodeModulesPackage(r, info[i].packageName));
                    if (filtered.length) {
                        const res = action(filtered, name, !!ambientModuleName, key);
                        if (res !== undefined)
                            return res;
                    }
                }
            });
        },
        releaseSymbols: () => {
            symbols.clear();
        },
        onFileChanged: (oldSourceFile, newSourceFile, typeAcquisitionEnabled) => {
            if (fileIsGlobalOnly(oldSourceFile) && fileIsGlobalOnly(newSourceFile)) {
                // File is purely global; doesn't affect export map
                return false;
            }
            if (usableByFileName && usableByFileName !== newSourceFile.path ||
                // If ATA is enabled, auto-imports uses existing imports to guess whether you want auto-imports from node.
                // Adding or removing imports from node could change the outcome of that guess, so could change the suggestions list.
                typeAcquisitionEnabled && consumesNodeCoreModules(oldSourceFile) !== consumesNodeCoreModules(newSourceFile) ||
                // Module agumentation and ambient module changes can add or remove exports available to be auto-imported.
                // Changes elsewhere in the file can change the *type* of an export in a module augmentation,
                // but type info is gathered in getCompletionEntryDetails, which doesn't use the cache.
                !arrayIsEqualTo(oldSourceFile.moduleAugmentations, newSourceFile.moduleAugmentations) ||
                !ambientModuleDeclarationsAreEqual(oldSourceFile, newSourceFile)) {
                cache.clear();
                return true;
            }
            usableByFileName = newSourceFile.path;
            return false;
        },
    };
    if (Debug.isDebugging) {
        Object.defineProperty(cache, "__cache", { value: exportInfo });
    }
    return cache;
    function rehydrateCachedInfo(info) {
        if (info.symbol && info.moduleSymbol)
            return info;
        const { id, exportKind, targetFlags, isFromPackageJson, moduleFileName } = info;
        const [cachedSymbol, cachedModuleSymbol] = symbols.get(id) || emptyArray;
        if (cachedSymbol && cachedModuleSymbol) {
            return {
                symbol: cachedSymbol,
                moduleSymbol: cachedModuleSymbol,
                moduleFileName,
                exportKind,
                targetFlags,
                isFromPackageJson,
            };
        }
        const checker = (isFromPackageJson
            ? host.getPackageJsonAutoImportProvider()
            : host.getCurrentProgram()).getTypeChecker();
        const moduleSymbol = info.moduleSymbol || cachedModuleSymbol || Debug.checkDefined(info.moduleFile
            ? checker.getMergedSymbol(info.moduleFile.symbol)
            : checker.tryFindAmbientModule(info.moduleName));
        const symbol = info.symbol || cachedSymbol || Debug.checkDefined(exportKind === 2 /* ExportKind.ExportEquals */
            ? checker.resolveExternalModuleSymbol(moduleSymbol)
            : checker.tryGetMemberInModuleExportsAndProperties(unescapeLeadingUnderscores(info.symbolTableKey), moduleSymbol), `Could not find symbol '${info.symbolName}' by key '${info.symbolTableKey}' in module ${moduleSymbol.name}`);
        symbols.set(id, [symbol, moduleSymbol]);
        return {
            symbol,
            moduleSymbol,
            moduleFileName,
            exportKind,
            targetFlags,
            isFromPackageJson,
        };
    }
    function key(importedName, symbol, ambientModuleName, checker) {
        const moduleKey = ambientModuleName || "";
        return `${importedName.length} ${getSymbolId(skipAlias(symbol, checker))} ${importedName} ${moduleKey}`;
    }
    function parseKey(key) {
        const firstSpace = key.indexOf(" ");
        const secondSpace = key.indexOf(" ", firstSpace + 1);
        const symbolNameLength = parseInt(key.substring(0, firstSpace), 10);
        const data = key.substring(secondSpace + 1);
        const symbolName = data.substring(0, symbolNameLength);
        const moduleKey = data.substring(symbolNameLength + 1);
        const ambientModuleName = moduleKey === "" ? undefined : moduleKey;
        return { symbolName, ambientModuleName };
    }
    function fileIsGlobalOnly(file) {
        return !file.commonJsModuleIndicator && !file.externalModuleIndicator && !file.moduleAugmentations && !file.ambientModuleNames;
    }
    function ambientModuleDeclarationsAreEqual(oldSourceFile, newSourceFile) {
        if (!arrayIsEqualTo(oldSourceFile.ambientModuleNames, newSourceFile.ambientModuleNames)) {
            return false;
        }
        let oldFileStatementIndex = -1;
        let newFileStatementIndex = -1;
        for (const ambientModuleName of newSourceFile.ambientModuleNames) {
            const isMatchingModuleDeclaration = (node) => isNonGlobalAmbientModule(node) && node.name.text === ambientModuleName;
            oldFileStatementIndex = findIndex(oldSourceFile.statements, isMatchingModuleDeclaration, oldFileStatementIndex + 1);
            newFileStatementIndex = findIndex(newSourceFile.statements, isMatchingModuleDeclaration, newFileStatementIndex + 1);
            if (oldSourceFile.statements[oldFileStatementIndex] !== newSourceFile.statements[newFileStatementIndex]) {
                return false;
            }
        }
        return true;
    }
    function isNotShadowedByDeeperNodeModulesPackage(info, packageName) {
        if (!packageName || !info.moduleFileName)
            return true;
        const typingsCacheLocation = host.getGlobalTypingsCacheLocation();
        if (typingsCacheLocation && startsWith(info.moduleFileName, typingsCacheLocation))
            return true;
        const packageDeepestNodeModulesPath = packages.get(packageName);
        return !packageDeepestNodeModulesPath || startsWith(info.moduleFileName, packageDeepestNodeModulesPath);
    }
}
/** @internal */
export function isImportable(program, fromFile, toFile, toModule, preferences, packageJsonFilter, moduleSpecifierResolutionHost, moduleSpecifierCache) {
    var _a;
    if (!toFile) {
        // Ambient module
        let useNodePrefix;
        const moduleName = stripQuotes(toModule.name);
        if (nodeCoreModules.has(moduleName) && (useNodePrefix = shouldUseUriStyleNodeCoreModules(fromFile, program)) !== undefined) {
            return useNodePrefix === startsWith(moduleName, "node:");
        }
        return !packageJsonFilter
            || packageJsonFilter.allowsImportingAmbientModule(toModule, moduleSpecifierResolutionHost)
            || fileContainsPackageImport(fromFile, moduleName);
    }
    Debug.assertIsDefined(toFile);
    if (fromFile === toFile)
        return false;
    const cachedResult = moduleSpecifierCache === null || moduleSpecifierCache === void 0 ? void 0 : moduleSpecifierCache.get(fromFile.path, toFile.path, preferences, {});
    if ((cachedResult === null || cachedResult === void 0 ? void 0 : cachedResult.isBlockedByPackageJsonDependencies) !== undefined) {
        return !cachedResult.isBlockedByPackageJsonDependencies || !!cachedResult.packageName && fileContainsPackageImport(fromFile, cachedResult.packageName);
    }
    const getCanonicalFileName = hostGetCanonicalFileName(moduleSpecifierResolutionHost);
    const globalTypingsCache = (_a = moduleSpecifierResolutionHost.getGlobalTypingsCacheLocation) === null || _a === void 0 ? void 0 : _a.call(moduleSpecifierResolutionHost);
    const hasImportablePath = !!moduleSpecifiers.forEachFileNameOfModule(fromFile.fileName, toFile.fileName, moduleSpecifierResolutionHost, 
    /*preferSymlinks*/ false, toPath => {
        const file = program.getSourceFile(toPath);
        // Determine to import using toPath only if toPath is what we were looking at
        // or there doesnt exist the file in the program by the symlink
        return (file === toFile || !file) &&
            isImportablePath(fromFile.fileName, toPath, getCanonicalFileName, globalTypingsCache, moduleSpecifierResolutionHost);
    });
    if (packageJsonFilter) {
        const importInfo = hasImportablePath ? packageJsonFilter.getSourceFileInfo(toFile, moduleSpecifierResolutionHost) : undefined;
        moduleSpecifierCache === null || moduleSpecifierCache === void 0 ? void 0 : moduleSpecifierCache.setBlockedByPackageJsonDependencies(fromFile.path, toFile.path, preferences, {}, importInfo === null || importInfo === void 0 ? void 0 : importInfo.packageName, !(importInfo === null || importInfo === void 0 ? void 0 : importInfo.importable));
        return !!(importInfo === null || importInfo === void 0 ? void 0 : importInfo.importable) || hasImportablePath && !!(importInfo === null || importInfo === void 0 ? void 0 : importInfo.packageName) && fileContainsPackageImport(fromFile, importInfo.packageName);
    }
    return hasImportablePath;
}
function fileContainsPackageImport(sourceFile, packageName) {
    return sourceFile.imports && sourceFile.imports.some(i => i.text === packageName || i.text.startsWith(packageName + "/"));
}
/**
 * Don't include something from a `node_modules` that isn't actually reachable by a global import.
 * A relative import to node_modules is usually a bad idea.
 */
function isImportablePath(fromPath, toPath, getCanonicalFileName, globalCachePath, host) {
    // If it's in a `node_modules` but is not reachable from here via a global import, don't bother.
    const toNodeModules = forEachAncestorDirectoryStoppingAtGlobalCache(host, toPath, ancestor => getBaseFileName(ancestor) === "node_modules" ? ancestor : undefined);
    const toNodeModulesParent = toNodeModules && getDirectoryPath(getCanonicalFileName(toNodeModules));
    return toNodeModulesParent === undefined
        || startsWith(getCanonicalFileName(fromPath), toNodeModulesParent)
        || (!!globalCachePath && startsWith(getCanonicalFileName(globalCachePath), toNodeModulesParent));
}
/** @internal */
export function forEachExternalModuleToImportFrom(program, host, preferences, useAutoImportProvider, cb) {
    var _a, _b;
    const useCaseSensitiveFileNames = hostUsesCaseSensitiveFileNames(host);
    const excludePatterns = preferences.autoImportFileExcludePatterns && getIsExcludedPatterns(preferences, useCaseSensitiveFileNames);
    forEachExternalModule(program.getTypeChecker(), program.getSourceFiles(), excludePatterns, host, (module, file) => cb(module, file, program, /*isFromPackageJson*/ false));
    const autoImportProvider = useAutoImportProvider && ((_a = host.getPackageJsonAutoImportProvider) === null || _a === void 0 ? void 0 : _a.call(host));
    if (autoImportProvider) {
        const start = timestamp();
        const checker = program.getTypeChecker();
        forEachExternalModule(autoImportProvider.getTypeChecker(), autoImportProvider.getSourceFiles(), excludePatterns, host, (module, file) => {
            if (file && !program.getSourceFile(file.fileName) || !file && !checker.resolveName(module.name, /*location*/ undefined, SymbolFlags.Module, /*excludeGlobals*/ false)) {
                // The AutoImportProvider filters files already in the main program out of its *root* files,
                // but non-root files can still be present in both programs, and already in the export info map
                // at this point. This doesn't create any incorrect behavior, but is a waste of time and memory,
                // so we filter them out here.
                cb(module, file, autoImportProvider, /*isFromPackageJson*/ true);
            }
        });
        (_b = host.log) === null || _b === void 0 ? void 0 : _b.call(host, `forEachExternalModuleToImportFrom autoImportProvider: ${timestamp() - start}`);
    }
}
function getIsExcludedPatterns(preferences, useCaseSensitiveFileNames) {
    return mapDefined(preferences.autoImportFileExcludePatterns, spec => {
        // The client is expected to send rooted path specs since we don't know
        // what directory a relative path is relative to.
        const pattern = getSubPatternFromSpec(spec, "", "exclude");
        return pattern ? getRegexFromPattern(pattern, useCaseSensitiveFileNames) : undefined;
    });
}
function forEachExternalModule(checker, allSourceFiles, excludePatterns, host, cb) {
    var _a;
    const isExcluded = excludePatterns && getIsExcluded(excludePatterns, host);
    for (const ambient of checker.getAmbientModules()) {
        if (!ambient.name.includes("*") && !(excludePatterns && ((_a = ambient.declarations) === null || _a === void 0 ? void 0 : _a.every(d => isExcluded(d.getSourceFile()))))) {
            cb(ambient, /*sourceFile*/ undefined);
        }
    }
    for (const sourceFile of allSourceFiles) {
        if (isExternalOrCommonJsModule(sourceFile) && !(isExcluded === null || isExcluded === void 0 ? void 0 : isExcluded(sourceFile))) {
            cb(checker.getMergedSymbol(sourceFile.symbol), sourceFile);
        }
    }
}
function getIsExcluded(excludePatterns, host) {
    var _a;
    const realpathsWithSymlinks = (_a = host.getSymlinkCache) === null || _a === void 0 ? void 0 : _a.call(host).getSymlinkedDirectoriesByRealpath();
    return (({ fileName, path }) => {
        var _a;
        if (excludePatterns.some(p => p.test(fileName)))
            return true;
        if ((realpathsWithSymlinks === null || realpathsWithSymlinks === void 0 ? void 0 : realpathsWithSymlinks.size) && pathContainsNodeModules(fileName)) {
            let dir = getDirectoryPath(fileName);
            return (_a = forEachAncestorDirectoryStoppingAtGlobalCache(host, getDirectoryPath(path), dirPath => {
                const symlinks = realpathsWithSymlinks.get(ensureTrailingDirectorySeparator(dirPath));
                if (symlinks) {
                    return symlinks.some(s => excludePatterns.some(p => p.test(fileName.replace(dir, s))));
                }
                dir = getDirectoryPath(dir);
            })) !== null && _a !== void 0 ? _a : false;
        }
        return false;
    });
}
/** @internal */
export function getIsFileExcluded(host, preferences) {
    if (!preferences.autoImportFileExcludePatterns)
        return () => false;
    return getIsExcluded(getIsExcludedPatterns(preferences, hostUsesCaseSensitiveFileNames(host)), host);
}
/** @internal */
export function getExportInfoMap(importingFile, host, program, preferences, cancellationToken) {
    var _a, _b, _c, _d, _e;
    const start = timestamp();
    // Pulling the AutoImportProvider project will trigger its updateGraph if pending,
    // which will invalidate the export map cache if things change, so pull it before
    // checking the cache.
    (_a = host.getPackageJsonAutoImportProvider) === null || _a === void 0 ? void 0 : _a.call(host);
    const cache = ((_b = host.getCachedExportInfoMap) === null || _b === void 0 ? void 0 : _b.call(host)) || createCacheableExportInfoMap({
        getCurrentProgram: () => program,
        getPackageJsonAutoImportProvider: () => { var _a; return (_a = host.getPackageJsonAutoImportProvider) === null || _a === void 0 ? void 0 : _a.call(host); },
        getGlobalTypingsCacheLocation: () => { var _a; return (_a = host.getGlobalTypingsCacheLocation) === null || _a === void 0 ? void 0 : _a.call(host); },
    });
    if (cache.isUsableByFile(importingFile.path)) {
        (_c = host.log) === null || _c === void 0 ? void 0 : _c.call(host, "getExportInfoMap: cache hit");
        return cache;
    }
    (_d = host.log) === null || _d === void 0 ? void 0 : _d.call(host, "getExportInfoMap: cache miss or empty; calculating new results");
    let moduleCount = 0;
    try {
        forEachExternalModuleToImportFrom(program, host, preferences, /*useAutoImportProvider*/ true, (moduleSymbol, moduleFile, program, isFromPackageJson) => {
            if (++moduleCount % 100 === 0)
                cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.throwIfCancellationRequested();
            const seenExports = new Set();
            const checker = program.getTypeChecker();
            const defaultInfo = getDefaultLikeExportInfo(moduleSymbol, checker);
            // Note: I think we shouldn't actually see resolved module symbols here, but weird merges
            // can cause it to happen: see 'completionsImport_mergedReExport.ts'
            if (defaultInfo && isImportableSymbol(defaultInfo.symbol, checker)) {
                cache.add(importingFile.path, defaultInfo.symbol, defaultInfo.exportKind === 1 /* ExportKind.Default */ ? InternalSymbolName.Default : InternalSymbolName.ExportEquals, moduleSymbol, moduleFile, defaultInfo.exportKind, isFromPackageJson, checker);
            }
            checker.forEachExportAndPropertyOfModule(moduleSymbol, (exported, key) => {
                if (exported !== (defaultInfo === null || defaultInfo === void 0 ? void 0 : defaultInfo.symbol) && isImportableSymbol(exported, checker) && addToSeen(seenExports, key)) {
                    cache.add(importingFile.path, exported, key, moduleSymbol, moduleFile, 0 /* ExportKind.Named */, isFromPackageJson, checker);
                }
            });
        });
    }
    catch (err) {
        // Ensure cache is reset if operation is cancelled
        cache.clear();
        throw err;
    }
    (_e = host.log) === null || _e === void 0 ? void 0 : _e.call(host, `getExportInfoMap: done in ${timestamp() - start} ms`);
    return cache;
}
/** @internal */
export function getDefaultLikeExportInfo(moduleSymbol, checker) {
    const exportEquals = checker.resolveExternalModuleSymbol(moduleSymbol);
    if (exportEquals !== moduleSymbol) {
        const defaultExport = checker.tryGetMemberInModuleExports(InternalSymbolName.Default, exportEquals);
        if (defaultExport)
            return { symbol: defaultExport, exportKind: 1 /* ExportKind.Default */ };
        return { symbol: exportEquals, exportKind: 2 /* ExportKind.ExportEquals */ };
    }
    const defaultExport = checker.tryGetMemberInModuleExports(InternalSymbolName.Default, moduleSymbol);
    if (defaultExport)
        return { symbol: defaultExport, exportKind: 1 /* ExportKind.Default */ };
}
function isImportableSymbol(symbol, checker) {
    return !checker.isUndefinedSymbol(symbol) && !checker.isUnknownSymbol(symbol) && !isKnownSymbol(symbol) && !isPrivateIdentifierSymbol(symbol);
}
function getNamesForExportedSymbol(defaultExport, checker, scriptTarget) {
    let names;
    forEachNameOfDefaultExport(defaultExport, checker, scriptTarget, (name, capitalizedName) => {
        names = capitalizedName ? [name, capitalizedName] : name;
        return true;
    });
    return Debug.checkDefined(names);
}
/**
 * @internal
 * May call `cb` multiple times with the same name.
 * Terminates when `cb` returns a truthy value.
 */
export function forEachNameOfDefaultExport(defaultExport, checker, scriptTarget, cb) {
    let chain;
    let current = defaultExport;
    const seen = new Set();
    while (current) {
        // The predecessor to this function also looked for a name on the `localSymbol`
        // of default exports, but I think `getDefaultLikeExportNameFromDeclaration`
        // accomplishes the same thing via syntax - no tests failed when I removed it.
        const fromDeclaration = getDefaultLikeExportNameFromDeclaration(current);
        if (fromDeclaration) {
            const final = cb(fromDeclaration);
            if (final)
                return final;
        }
        if (current.escapedName !== InternalSymbolName.Default && current.escapedName !== InternalSymbolName.ExportEquals) {
            const final = cb(current.name);
            if (final)
                return final;
        }
        chain = append(chain, current);
        if (!addToSeen(seen, current))
            break;
        current = current.flags & SymbolFlags.Alias ? checker.getImmediateAliasedSymbol(current) : undefined;
    }
    for (const symbol of chain !== null && chain !== void 0 ? chain : emptyArray) {
        if (symbol.parent && isExternalModuleSymbol(symbol.parent)) {
            const final = cb(moduleSymbolToValidIdentifier(symbol.parent, scriptTarget, /*forceCapitalize*/ false), moduleSymbolToValidIdentifier(symbol.parent, scriptTarget, /*forceCapitalize*/ true));
            if (final)
                return final;
        }
    }
}
