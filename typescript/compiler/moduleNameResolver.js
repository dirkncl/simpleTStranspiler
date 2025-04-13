import {
  append,
  appendIfUnique,
  arrayIsEqualTo,
  changeAnyExtension,
  changeFullExtension,
  CharacterCodes,
  combinePaths,
  comparePaths,
  Comparison,
  concatenate,
  contains,
  containsPath,
  createCompilerDiagnostic,
  Debug,
  deduplicate,
  Diagnostics,
  directoryProbablyExists,
  directorySeparator,
  emptyArray,
  endsWith,
  ensureTrailingDirectorySeparator,
  every,
  Extension,
  extensionIsTS,
  fileExtensionIs,
  fileExtensionIsOneOf,
  filter,
  firstDefined,
  forEach,
  forEachAncestorDirectory,
  formatMessage,
  getAllowImportingTsExtensions,
  getAllowJSCompilerOption,
  getAnyExtensionFromPath,
  getBaseFileName,
  getCommonSourceDirectory,
  getCompilerOptionValue,
  getDirectoryPath,
  getEmitModuleResolutionKind,
  getNormalizedAbsolutePath,
  getOwnKeys,
  getPathComponents,
  getPathFromPathComponents,
  getPathsBasePath,
  getPossibleOriginalInputExtensionForExtension,
  getRelativePathFromDirectory,
  getResolveJsonModule,
  getRootLength,
  hasProperty,
  hasTrailingDirectorySeparator,
  hostGetCanonicalFileName,
  inferredTypesContainingFile,
  isArray,
  isDeclarationFileName,
  isExternalModuleNameRelative,
  isRootedDiskPath,
  isString,
  lastOrUndefined,
  length,
  matchedText,
  matchPatternOrExact,
  ModuleKind,
  ModuleResolutionKind,
  moduleResolutionOptionDeclarations,
  moduleResolutionSupportsPackageJsonExportsAndImports,
  noop,
  normalizePath,
  normalizeSlashes,
  packageIdToString,
  pathIsRelative,
  patternText,
  readJson,
  removeExtension,
  removeFileExtension,
  removePrefix,
  replaceFirstStar,
  some,
  startsWith,
  supportedDeclarationExtensions,
  supportedJSExtensionsFlat,
  supportedTSImplementationExtensions,
  toPath,
  toSorted,
  tryExtractTSExtension,
  tryGetExtensionFromPath,
  tryParsePatterns,
  Version,
  version,
  versionMajorMinor,
  VersionRange,
} from "./namespaces/ts.js";


/** @internal */
export function trace(host, message, ...args) {
    host.trace(formatMessage(message, ...args));
}

/** @internal */
export function isTraceEnabled(compilerOptions, host) {
    return !!compilerOptions.traceResolution && host.trace !== undefined;
}

function withPackageId(packageInfo, r, state) {
    let packageId;
    if (r && packageInfo) {
        const packageJsonContent = packageInfo.contents.packageJsonContent;
        if (typeof packageJsonContent.name === "string" && typeof packageJsonContent.version === "string") {
            packageId = {
                name: packageJsonContent.name,
                subModuleName: r.path.slice(packageInfo.packageDirectory.length + directorySeparator.length),
                version: packageJsonContent.version,
                peerDependencies: getPeerDependenciesOfPackageJsonInfo(packageInfo, state),
            };
        }
    }
    return r && { path: r.path, extension: r.ext, packageId, resolvedUsingTsExtension: r.resolvedUsingTsExtension };
}
function noPackageId(r) {
    return withPackageId(/*packageInfo*/ undefined, r, /*state*/ undefined); // State will not be used so no need to pass
}
function removeIgnoredPackageId(r) {
    if (r) {
        Debug.assert(r.packageId === undefined);
        return { path: r.path, ext: r.extension, resolvedUsingTsExtension: r.resolvedUsingTsExtension };
    }
}

// // dprint-ignore
// /**
//  * Kinds of file that we are currently looking for.
//  */
// const enum Extensions {
//     TypeScript  = 1 << 0, // '.ts', '.tsx', '.mts', '.cts'
//     JavaScript  = 1 << 1, // '.js', '.jsx', '.mjs', '.cjs'
//     Declaration = 1 << 2, // '.d.ts', etc.
//     Json        = 1 << 3, // '.json'
// 
//     ImplementationFiles = TypeScript | JavaScript,
// }
// dprint-ignore
/**
 * Kinds of file that we are currently looking for.
 */
var Extensions;
(function (Extensions) {
    Extensions[Extensions["TypeScript"] = 1] = "TypeScript";
    Extensions[Extensions["JavaScript"] = 2] = "JavaScript";
    Extensions[Extensions["Declaration"] = 4] = "Declaration";
    Extensions[Extensions["Json"] = 8] = "Json";
    Extensions[Extensions["ImplementationFiles"] = 3] = "ImplementationFiles";
})(Extensions || (Extensions = {}));

function formatExtensions(extensions) {
    const result = [];
    if (extensions & 1 /* Extensions.TypeScript */)
        result.push("TypeScript");
    if (extensions & 2 /* Extensions.JavaScript */)
        result.push("JavaScript");
    if (extensions & 4 /* Extensions.Declaration */)
        result.push("Declaration");
    if (extensions & 8 /* Extensions.Json */)
        result.push("JSON");
    return result.join(", ");
}

function extensionsToExtensionsArray(extensions) {
    const result = [];
    if (extensions & 1 /* Extensions.TypeScript */)
        result.push(...supportedTSImplementationExtensions);
    if (extensions & 2 /* Extensions.JavaScript */)
        result.push(...supportedJSExtensionsFlat);
    if (extensions & 4 /* Extensions.Declaration */)
        result.push(...supportedDeclarationExtensions);
    if (extensions & 8 /* Extensions.Json */)
        result.push(Extension.Json);
    return result;
}

/** Used with `Extensions.DtsOnly` to extract the path from TypeScript results. */
function resolvedTypeScriptOnly(resolved) {
    if (!resolved) {
        return undefined;
    }
    Debug.assert(extensionIsTS(resolved.extension));
    return { fileName: resolved.path, packageId: resolved.packageId };
}

function createResolvedModuleWithFailedLookupLocationsHandlingSymlink(moduleName, resolved, isExternalLibraryImport, failedLookupLocations, affectingLocations, diagnostics, state, cache, alternateResult) {
    // If this is from node_modules for non relative name, always respect preserveSymlinks
    if (!state.resultFromCache &&
        !state.compilerOptions.preserveSymlinks &&
        resolved &&
        isExternalLibraryImport &&
        !resolved.originalPath &&
        !isExternalModuleNameRelative(moduleName)) {
        const { resolvedFileName, originalPath } = getOriginalAndResolvedFileName(resolved.path, state.host, state.traceEnabled);
        if (originalPath)
            resolved = Object.assign(Object.assign({}, resolved), { path: resolvedFileName, originalPath });
    }
    return createResolvedModuleWithFailedLookupLocations(resolved, isExternalLibraryImport, failedLookupLocations, affectingLocations, diagnostics, state.resultFromCache, cache, alternateResult);
}

function createResolvedModuleWithFailedLookupLocations(resolved, isExternalLibraryImport, failedLookupLocations, affectingLocations, diagnostics, resultFromCache, cache, alternateResult) {
    if (resultFromCache) {
        if (!(cache === null || cache === void 0 ? void 0 : cache.isReadonly)) {
            resultFromCache.failedLookupLocations = updateResolutionField(resultFromCache.failedLookupLocations, failedLookupLocations);
            resultFromCache.affectingLocations = updateResolutionField(resultFromCache.affectingLocations, affectingLocations);
            resultFromCache.resolutionDiagnostics = updateResolutionField(resultFromCache.resolutionDiagnostics, diagnostics);
            return resultFromCache;
        }
        else {
            return Object.assign(Object.assign({}, resultFromCache), { failedLookupLocations: initializeResolutionFieldForReadonlyCache(resultFromCache.failedLookupLocations, failedLookupLocations), affectingLocations: initializeResolutionFieldForReadonlyCache(resultFromCache.affectingLocations, affectingLocations), resolutionDiagnostics: initializeResolutionFieldForReadonlyCache(resultFromCache.resolutionDiagnostics, diagnostics) });
        }
    }
    return {
        resolvedModule: resolved && {
            resolvedFileName: resolved.path,
            originalPath: resolved.originalPath === true ? undefined : resolved.originalPath,
            extension: resolved.extension,
            isExternalLibraryImport,
            packageId: resolved.packageId,
            resolvedUsingTsExtension: !!resolved.resolvedUsingTsExtension,
        },
        failedLookupLocations: initializeResolutionField(failedLookupLocations),
        affectingLocations: initializeResolutionField(affectingLocations),
        resolutionDiagnostics: initializeResolutionField(diagnostics),
        alternateResult,
    };
}

function initializeResolutionField(value) {
    return value.length ? value : undefined;
}

/** @internal */
export function updateResolutionField(to, value) {
    if (!(value === null || value === void 0 ? void 0 : value.length))
        return to;
    if (!(to === null || to === void 0 ? void 0 : to.length))
        return value;
    to.push(...value);
    return to;
}

function initializeResolutionFieldForReadonlyCache(fromCache, value) {
    if (!(fromCache === null || fromCache === void 0 ? void 0 : fromCache.length))
        return initializeResolutionField(value);
    if (!value.length)
        return fromCache.slice();
    return [...fromCache, ...value];
}

function readPackageJsonField(jsonContent, fieldName, typeOfTag, state) {
    if (!hasProperty(jsonContent, fieldName)) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_does_not_have_a_0_field, fieldName);
        }
        return;
    }
    const value = jsonContent[fieldName];
    if (typeof value !== typeOfTag || value === null) { // eslint-disable-line no-restricted-syntax
        if (state.traceEnabled) {
            // eslint-disable-next-line no-restricted-syntax
            trace(state.host, Diagnostics.Expected_type_of_0_field_in_package_json_to_be_1_got_2, fieldName, typeOfTag, value === null ? "null" : typeof value);
        }
        return;
    }
    return value;
}
function readPackageJsonPathField(jsonContent, fieldName, baseDirectory, state) {
    const fileName = readPackageJsonField(jsonContent, fieldName, "string", state);
    if (fileName === undefined) {
        return;
    }
    if (!fileName) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_had_a_falsy_0_field, fieldName);
        }
        return;
    }
    const path = normalizePath(combinePaths(baseDirectory, fileName));
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.package_json_has_0_field_1_that_references_2, fieldName, fileName, path);
    }
    return path;
}
function readPackageJsonTypesFields(jsonContent, baseDirectory, state) {
    return readPackageJsonPathField(jsonContent, "typings", baseDirectory, state)
        || readPackageJsonPathField(jsonContent, "types", baseDirectory, state);
}
function readPackageJsonTSConfigField(jsonContent, baseDirectory, state) {
    return readPackageJsonPathField(jsonContent, "tsconfig", baseDirectory, state);
}
function readPackageJsonMainField(jsonContent, baseDirectory, state) {
    return readPackageJsonPathField(jsonContent, "main", baseDirectory, state);
}
function readPackageJsonTypesVersionsField(jsonContent, state) {
    const typesVersions = readPackageJsonField(jsonContent, "typesVersions", "object", state);
    if (typesVersions === undefined)
        return;
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.package_json_has_a_typesVersions_field_with_version_specific_path_mappings);
    }
    return typesVersions;
}
function readPackageJsonTypesVersionPaths(jsonContent, state) {
    const typesVersions = readPackageJsonTypesVersionsField(jsonContent, state);
    if (typesVersions === undefined)
        return;
    if (state.traceEnabled) {
        for (const key in typesVersions) {
            if (hasProperty(typesVersions, key) && !VersionRange.tryParse(key)) {
                trace(state.host, Diagnostics.package_json_has_a_typesVersions_entry_0_that_is_not_a_valid_semver_range, key);
            }
        }
    }
    const result = getPackageJsonTypesVersionsPaths(typesVersions);
    if (!result) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_does_not_have_a_typesVersions_entry_that_matches_version_0, versionMajorMinor);
        }
        return;
    }
    const { version: bestVersionKey, paths: bestVersionPaths } = result;
    if (typeof bestVersionPaths !== "object") {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Expected_type_of_0_field_in_package_json_to_be_1_got_2, `typesVersions['${bestVersionKey}']`, "object", typeof bestVersionPaths);
        }
        return;
    }
    return result;
}

let typeScriptVersion;

/** @internal */
export function getPackageJsonTypesVersionsPaths(typesVersions) {
    if (!typeScriptVersion)
        typeScriptVersion = new Version(version);
    for (const key in typesVersions) {
        if (!hasProperty(typesVersions, key))
            continue;
        const keyRange = VersionRange.tryParse(key);
        if (keyRange === undefined) {
            continue;
        }
        // return the first entry whose range matches the current compiler version.
        if (keyRange.test(typeScriptVersion)) {
            return { version: key, paths: typesVersions[key] };
        }
    }
}

export function getEffectiveTypeRoots(options, host) {
    if (options.typeRoots) {
        return options.typeRoots;
    }
    let currentDirectory;
    if (options.configFilePath) {
        currentDirectory = getDirectoryPath(options.configFilePath);
    }
    else if (host.getCurrentDirectory) {
        currentDirectory = host.getCurrentDirectory();
    }
    if (currentDirectory !== undefined) {
        return getDefaultTypeRoots(currentDirectory);
    }
}

/**
 * Returns the path to every node_modules/@types directory from some ancestor directory.
 * Returns undefined if there are none.
 */
function getDefaultTypeRoots(currentDirectory) {
    let typeRoots;
    forEachAncestorDirectory(normalizePath(currentDirectory), directory => {
        const atTypes = combinePaths(directory, nodeModulesAtTypes);
        (typeRoots !== null && typeRoots !== void 0 ? typeRoots : (typeRoots = [])).push(atTypes);
    });
    return typeRoots;
}

const nodeModulesAtTypes = combinePaths("node_modules", "@types");

function arePathsEqual(path1, path2, host) {
    const useCaseSensitiveFileNames = typeof host.useCaseSensitiveFileNames === "function" ? host.useCaseSensitiveFileNames() : host.useCaseSensitiveFileNames;
    return comparePaths(path1, path2, !useCaseSensitiveFileNames) === Comparison.EqualTo;
}

function getOriginalAndResolvedFileName(fileName, host, traceEnabled) {
    const resolvedFileName = realPath(fileName, host, traceEnabled);
    const pathsAreEqual = arePathsEqual(fileName, resolvedFileName, host);
    return {
        // If the fileName and realpath are differing only in casing prefer fileName so that we can issue correct errors for casing under forceConsistentCasingInFileNames
        resolvedFileName: pathsAreEqual ? fileName : resolvedFileName,
        originalPath: pathsAreEqual ? undefined : fileName,
    };
}

function getCandidateFromTypeRoot(typeRoot, typeReferenceDirectiveName, moduleResolutionState) {
    const nameForLookup = endsWith(typeRoot, "/node_modules/@types") || endsWith(typeRoot, "/node_modules/@types/") ?
        mangleScopedPackageNameWithTrace(typeReferenceDirectiveName, moduleResolutionState) :
        typeReferenceDirectiveName;
    return combinePaths(typeRoot, nameForLookup);
}

/**
 * @param {string | undefined} containingFile - file that contains type reference directive, can be undefined if containing file is unknown.
 * This is possible in case if resolution is performed for directives specified via 'types' parameter. In this case initial path for secondary lookups
 * is assumed to be the same as root directory of the project.
 */
export function resolveTypeReferenceDirective(typeReferenceDirectiveName, containingFile, options, host, redirectedReference, cache, resolutionMode) {
    Debug.assert(typeof typeReferenceDirectiveName === "string", "Non-string value passed to `ts.resolveTypeReferenceDirective`, likely by a wrapping package working with an outdated `resolveTypeReferenceDirectives` signature. This is probably not a problem in TS itself.");
    const traceEnabled = isTraceEnabled(options, host);
    if (redirectedReference) {
        options = redirectedReference.commandLine.options;
    }
    const containingDirectory = containingFile ? getDirectoryPath(containingFile) : undefined;
    let result = containingDirectory ? cache === null || cache === void 0 ? void 0 : cache.getFromDirectoryCache(typeReferenceDirectiveName, resolutionMode, containingDirectory, redirectedReference) : undefined;
    if (!result && containingDirectory && !isExternalModuleNameRelative(typeReferenceDirectiveName)) {
        result = cache === null || cache === void 0 ? void 0 : cache.getFromNonRelativeNameCache(typeReferenceDirectiveName, resolutionMode, containingDirectory, redirectedReference);
    }
    if (result) {
        if (traceEnabled) {
            trace(host, Diagnostics.Resolving_type_reference_directive_0_containing_file_1, typeReferenceDirectiveName, containingFile);
            if (redirectedReference)
                trace(host, Diagnostics.Using_compiler_options_of_project_reference_redirect_0, redirectedReference.sourceFile.fileName);
            trace(host, Diagnostics.Resolution_for_type_reference_directive_0_was_found_in_cache_from_location_1, typeReferenceDirectiveName, containingDirectory);
            traceResult(result);
        }
        return result;
    }
    const typeRoots = getEffectiveTypeRoots(options, host);
    if (traceEnabled) {
        if (containingFile === undefined) {
            if (typeRoots === undefined) {
                trace(host, Diagnostics.Resolving_type_reference_directive_0_containing_file_not_set_root_directory_not_set, typeReferenceDirectiveName);
            }
            else {
                trace(host, Diagnostics.Resolving_type_reference_directive_0_containing_file_not_set_root_directory_1, typeReferenceDirectiveName, typeRoots);
            }
        }
        else {
            if (typeRoots === undefined) {
                trace(host, Diagnostics.Resolving_type_reference_directive_0_containing_file_1_root_directory_not_set, typeReferenceDirectiveName, containingFile);
            }
            else {
                trace(host, Diagnostics.Resolving_type_reference_directive_0_containing_file_1_root_directory_2, typeReferenceDirectiveName, containingFile, typeRoots);
            }
        }
        if (redirectedReference) {
            trace(host, Diagnostics.Using_compiler_options_of_project_reference_redirect_0, redirectedReference.sourceFile.fileName);
        }
    }
    const failedLookupLocations = [];
    const affectingLocations = [];
    // Allow type reference directives to opt into `exports` resolution in any resolution mode
    // when a `resolution-mode` override is present.
    let features = getNodeResolutionFeatures(options);
    if (resolutionMode !== undefined) {
        features |= NodeResolutionFeatures.AllFeatures;
    }
    const moduleResolution = getEmitModuleResolutionKind(options);
    if (resolutionMode === ModuleKind.ESNext && (ModuleResolutionKind.Node16 <= moduleResolution && moduleResolution <= ModuleResolutionKind.NodeNext)) {
        features |= NodeResolutionFeatures.EsmMode;
    }
    const conditions = (features & NodeResolutionFeatures.Exports)
        ? getConditions(options, resolutionMode)
        : [];
    const diagnostics = [];
    const moduleResolutionState = {
        compilerOptions: options,
        host,
        traceEnabled,
        failedLookupLocations,
        affectingLocations,
        packageJsonInfoCache: cache,
        features,
        conditions,
        requestContainingDirectory: containingDirectory,
        reportDiagnostic: diag => void diagnostics.push(diag),
        isConfigLookup: false,
        candidateIsFromPackageJsonField: false,
        resolvedPackageDirectory: false,
    };
    let resolved = primaryLookup();
    let primary = true;
    if (!resolved) {
        resolved = secondaryLookup();
        primary = false;
    }
    let resolvedTypeReferenceDirective;
    if (resolved) {
        const { fileName, packageId } = resolved;
        let resolvedFileName = fileName, originalPath;
        if (!options.preserveSymlinks)
            ({ resolvedFileName, originalPath } = getOriginalAndResolvedFileName(fileName, host, traceEnabled));
        resolvedTypeReferenceDirective = {
            primary,
            resolvedFileName,
            originalPath,
            packageId,
            isExternalLibraryImport: pathContainsNodeModules(fileName),
        };
    }
    result = {
        resolvedTypeReferenceDirective,
        failedLookupLocations: initializeResolutionField(failedLookupLocations),
        affectingLocations: initializeResolutionField(affectingLocations),
        resolutionDiagnostics: initializeResolutionField(diagnostics),
    };
    if (containingDirectory && cache && !cache.isReadonly) {
        cache.getOrCreateCacheForDirectory(containingDirectory, redirectedReference).set(typeReferenceDirectiveName, /*mode*/ resolutionMode, result);
        if (!isExternalModuleNameRelative(typeReferenceDirectiveName)) {
            cache.getOrCreateCacheForNonRelativeName(typeReferenceDirectiveName, resolutionMode, redirectedReference).set(containingDirectory, result);
        }
    }
    if (traceEnabled)
        traceResult(result);
    return result;
    function traceResult(result) {
        var _a;
        if (!((_a = result.resolvedTypeReferenceDirective) === null || _a === void 0 ? void 0 : _a.resolvedFileName)) {
            trace(host, Diagnostics.Type_reference_directive_0_was_not_resolved, typeReferenceDirectiveName);
        }
        else if (result.resolvedTypeReferenceDirective.packageId) {
            trace(host, Diagnostics.Type_reference_directive_0_was_successfully_resolved_to_1_with_Package_ID_2_primary_Colon_3, typeReferenceDirectiveName, result.resolvedTypeReferenceDirective.resolvedFileName, packageIdToString(result.resolvedTypeReferenceDirective.packageId), result.resolvedTypeReferenceDirective.primary);
        }
        else {
            trace(host, Diagnostics.Type_reference_directive_0_was_successfully_resolved_to_1_primary_Colon_2, typeReferenceDirectiveName, result.resolvedTypeReferenceDirective.resolvedFileName, result.resolvedTypeReferenceDirective.primary);
        }
    }
    function primaryLookup() {
        // Check primary library paths
        if (typeRoots && typeRoots.length) {
            if (traceEnabled) {
                trace(host, Diagnostics.Resolving_with_primary_search_path_0, typeRoots.join(", "));
            }
            return firstDefined(typeRoots, typeRoot => {
                const candidate = getCandidateFromTypeRoot(typeRoot, typeReferenceDirectiveName, moduleResolutionState);
                const directoryExists = directoryProbablyExists(typeRoot, host);
                if (!directoryExists && traceEnabled) {
                    trace(host, Diagnostics.Directory_0_does_not_exist_skipping_all_lookups_in_it, typeRoot);
                }
                if (options.typeRoots) {
                    // Custom typeRoots resolve as file or directory just like we do modules
                    const resolvedFromFile = loadModuleFromFile(4 /* Extensions.Declaration */, candidate, !directoryExists, moduleResolutionState);
                    if (resolvedFromFile) {
                        const packageDirectory = parseNodeModuleFromPath(resolvedFromFile.path);
                        const packageInfo = packageDirectory ? getPackageJsonInfo(packageDirectory, /*onlyRecordFailures*/ false, moduleResolutionState) : undefined;
                        return resolvedTypeScriptOnly(withPackageId(packageInfo, resolvedFromFile, moduleResolutionState));
                    }
                }
                return resolvedTypeScriptOnly(loadNodeModuleFromDirectory(4 /* Extensions.Declaration */, candidate, !directoryExists, moduleResolutionState));
            });
        }
        else {
            if (traceEnabled) {
                trace(host, Diagnostics.Root_directory_cannot_be_determined_skipping_primary_search_paths);
            }
        }
    }
    function secondaryLookup() {
        const initialLocationForSecondaryLookup = containingFile && getDirectoryPath(containingFile);
        if (initialLocationForSecondaryLookup !== undefined) {
            let result;
            if (!options.typeRoots || !endsWith(containingFile, inferredTypesContainingFile)) {
                // check secondary locations
                if (traceEnabled) {
                    trace(host, Diagnostics.Looking_up_in_node_modules_folder_initial_location_0, initialLocationForSecondaryLookup);
                }
                if (!isExternalModuleNameRelative(typeReferenceDirectiveName)) {
                    const searchResult = loadModuleFromNearestNodeModulesDirectory(4 /* Extensions.Declaration */, typeReferenceDirectiveName, initialLocationForSecondaryLookup, moduleResolutionState, /*cache*/ undefined, /*redirectedReference*/ undefined);
                    result = searchResult && searchResult.value;
                }
                else {
                    const { path: candidate } = normalizePathForCJSResolution(initialLocationForSecondaryLookup, typeReferenceDirectiveName);
                    result = nodeLoadModuleByRelativeName(4 /* Extensions.Declaration */, candidate, /*onlyRecordFailures*/ false, moduleResolutionState, /*considerPackageJson*/ true);
                }
            }
            else if (traceEnabled) {
                trace(host, Diagnostics.Resolving_type_reference_directive_for_program_that_specifies_custom_typeRoots_skipping_lookup_in_node_modules_folder);
            }
            return resolvedTypeScriptOnly(result);
        }
        else {
            if (traceEnabled) {
                trace(host, Diagnostics.Containing_file_is_not_specified_and_root_directory_cannot_be_determined_skipping_lookup_in_node_modules_folder);
            }
        }
    }
}
function getNodeResolutionFeatures(options) {
    let features = NodeResolutionFeatures.None;
    switch (getEmitModuleResolutionKind(options)) {
        case ModuleResolutionKind.Node16:
            features = NodeResolutionFeatures.Node16Default;
            break;
        case ModuleResolutionKind.NodeNext:
            features = NodeResolutionFeatures.NodeNextDefault;
            break;
        case ModuleResolutionKind.Bundler:
            features = NodeResolutionFeatures.BundlerDefault;
            break;
    }
    if (options.resolvePackageJsonExports) {
        features |= NodeResolutionFeatures.Exports;
    }
    else if (options.resolvePackageJsonExports === false) {
        features &= ~NodeResolutionFeatures.Exports;
    }
    if (options.resolvePackageJsonImports) {
        features |= NodeResolutionFeatures.Imports;
    }
    else if (options.resolvePackageJsonImports === false) {
        features &= ~NodeResolutionFeatures.Imports;
    }
    return features;
}
/** @internal */
export function getConditions(options, resolutionMode) {
    const moduleResolution = getEmitModuleResolutionKind(options);
    if (resolutionMode === undefined) {
        if (moduleResolution === ModuleResolutionKind.Bundler) {
            // bundler always uses `import` unless explicitly overridden
            resolutionMode = ModuleKind.ESNext;
        }
        else if (moduleResolution === ModuleResolutionKind.Node10) {
            // node10 does not support package.json imports/exports without
            // an explicit resolution-mode override on a type-only import
            // (indicated by `esmMode` being set)
            return [];
        }
    }
    // conditions are only used by the node16/nodenext/bundler resolvers - there's no priority order in the list,
    // it's essentially a set (priority is determined by object insertion order in the object we look at).
    const conditions = resolutionMode === ModuleKind.ESNext
        ? ["import"]
        : ["require"];
    if (!options.noDtsResolution) {
        conditions.push("types");
    }
    if (moduleResolution !== ModuleResolutionKind.Bundler) {
        conditions.push("node");
    }
    return concatenate(conditions, options.customConditions);
}
/**
 * @internal
 * Does not try `@types/${packageName}` - use a second pass if needed.
 */
export function resolvePackageNameToPackageJson(packageName, containingDirectory, options, host, cache) {
    const moduleResolutionState = getTemporaryModuleResolutionState(cache === null || cache === void 0 ? void 0 : cache.getPackageJsonInfoCache(), host, options);
    return forEachAncestorDirectoryStoppingAtGlobalCache(host, containingDirectory, ancestorDirectory => {
        if (getBaseFileName(ancestorDirectory) !== "node_modules") {
            const nodeModulesFolder = combinePaths(ancestorDirectory, "node_modules");
            const candidate = combinePaths(nodeModulesFolder, packageName);
            return getPackageJsonInfo(candidate, /*onlyRecordFailures*/ false, moduleResolutionState);
        }
    });
}
/**
 * Given a set of options, returns the set of type directive names
 *   that should be included for this program automatically.
 * This list could either come from the config file,
 *   or from enumerating the types root + initial secondary types lookup location.
 * More type directives might appear in the program later as a result of loading actual source files;
 *   this list is only the set of defaults that are implicitly included.
 */
export function getAutomaticTypeDirectiveNames(options, host) {
    // Use explicit type list from tsconfig.json
    if (options.types) {
        return options.types;
    }
    // Walk the primary type lookup locations
    const result = [];
    if (host.directoryExists && host.getDirectories) {
        const typeRoots = getEffectiveTypeRoots(options, host);
        if (typeRoots) {
            for (const root of typeRoots) {
                if (host.directoryExists(root)) {
                    for (const typeDirectivePath of host.getDirectories(root)) {
                        const normalized = normalizePath(typeDirectivePath);
                        const packageJsonPath = combinePaths(root, normalized, "package.json");
                        // `types-publisher` sometimes creates packages with `"typings": null` for packages that don't provide their own types.
                        // See `createNotNeededPackageJSON` in the types-publisher` repo.
                        // eslint-disable-next-line no-restricted-syntax
                        const isNotNeededPackage = host.fileExists(packageJsonPath) && readJson(packageJsonPath, host).typings === null;
                        if (!isNotNeededPackage) {
                            const baseFileName = getBaseFileName(normalized);
                            // At this stage, skip results with leading dot.
                            if (baseFileName.charCodeAt(0) !== CharacterCodes.dot) {
                                // Return just the type directive names
                                result.push(baseFileName);
                            }
                        }
                    }
                }
            }
        }
    }
    return result;
}
/** @internal */
export function isPackageJsonInfo(entry) {
    return !!(entry === null || entry === void 0 ? void 0 : entry.contents);
}
/** @internal */
export function isMissingPackageJsonInfo(entry) {
    return !!entry && !entry.contents;
}
function compilerOptionValueToString(value) {
    var _a;
    if (value === null || typeof value !== "object") { // eslint-disable-line no-restricted-syntax
        return "" + value;
    }
    if (isArray(value)) {
        return `[${(_a = value.map(e => compilerOptionValueToString(e))) === null || _a === void 0 ? void 0 : _a.join(",")}]`;
    }
    let str = "{";
    for (const key in value) {
        if (hasProperty(value, key)) {
            str += `${key}: ${compilerOptionValueToString(value[key])}`;
        }
    }
    return str + "}";
}
/** @internal */
export function getKeyForCompilerOptions(options, affectingOptionDeclarations) {
    return affectingOptionDeclarations.map(option => compilerOptionValueToString(getCompilerOptionValue(options, option))).join("|") + `|${options.pathsBasePath}`;
}
function createCacheWithRedirects(ownOptions, optionsToRedirectsKey) {
    const redirectsMap = new Map();
    const redirectsKeyToMap = new Map();
    let ownMap = new Map();
    if (ownOptions)
        redirectsMap.set(ownOptions, ownMap);
    return {
        getMapOfCacheRedirects,
        getOrCreateMapOfCacheRedirects,
        update,
        clear,
        getOwnMap: () => ownMap,
    };
    function getMapOfCacheRedirects(redirectedReference) {
        return redirectedReference ?
            getOrCreateMap(redirectedReference.commandLine.options, /*create*/ false) :
            ownMap;
    }
    function getOrCreateMapOfCacheRedirects(redirectedReference) {
        return redirectedReference ?
            getOrCreateMap(redirectedReference.commandLine.options, /*create*/ true) :
            ownMap;
    }
    function update(newOptions) {
        if (ownOptions !== newOptions) {
            if (ownOptions)
                ownMap = getOrCreateMap(newOptions, /*create*/ true); // set new map for new options as ownMap
            else
                redirectsMap.set(newOptions, ownMap); // Use existing map if oldOptions = undefined
            ownOptions = newOptions;
        }
    }
    function getOrCreateMap(redirectOptions, create) {
        let result = redirectsMap.get(redirectOptions);
        if (result)
            return result;
        const key = getRedirectsCacheKey(redirectOptions);
        result = redirectsKeyToMap.get(key);
        if (!result) {
            if (ownOptions) {
                const ownKey = getRedirectsCacheKey(ownOptions);
                if (ownKey === key)
                    result = ownMap;
                else if (!redirectsKeyToMap.has(ownKey))
                    redirectsKeyToMap.set(ownKey, ownMap);
            }
            if (create)
                result !== null && result !== void 0 ? result : (result = new Map());
            if (result)
                redirectsKeyToMap.set(key, result);
        }
        if (result)
            redirectsMap.set(redirectOptions, result);
        return result;
    }
    function clear() {
        const ownKey = ownOptions && optionsToRedirectsKey.get(ownOptions);
        ownMap.clear();
        redirectsMap.clear();
        optionsToRedirectsKey.clear();
        redirectsKeyToMap.clear();
        if (ownOptions) {
            if (ownKey)
                optionsToRedirectsKey.set(ownOptions, ownKey);
            redirectsMap.set(ownOptions, ownMap);
        }
    }
    function getRedirectsCacheKey(options) {
        let result = optionsToRedirectsKey.get(options);
        if (!result) {
            optionsToRedirectsKey.set(options, result = getKeyForCompilerOptions(options, moduleResolutionOptionDeclarations));
        }
        return result;
    }
}
function createPackageJsonInfoCache(currentDirectory, getCanonicalFileName) {
    let cache;
    return { getPackageJsonInfo, setPackageJsonInfo, clear, getInternalMap };
    function getPackageJsonInfo(packageJsonPath) {
        return cache === null || cache === void 0 ? void 0 : cache.get(toPath(packageJsonPath, currentDirectory, getCanonicalFileName));
    }
    function setPackageJsonInfo(packageJsonPath, info) {
        (cache || (cache = new Map())).set(toPath(packageJsonPath, currentDirectory, getCanonicalFileName), info);
    }
    function clear() {
        cache = undefined;
    }
    function getInternalMap() {
        return cache;
    }
}
function getOrCreateCache(cacheWithRedirects, redirectedReference, key, create) {
    const cache = cacheWithRedirects.getOrCreateMapOfCacheRedirects(redirectedReference);
    let result = cache.get(key);
    if (!result) {
        result = create();
        cache.set(key, result);
    }
    return result;
}
function createPerDirectoryResolutionCache(currentDirectory, getCanonicalFileName, options, optionsToRedirectsKey) {
    const directoryToModuleNameMap = createCacheWithRedirects(options, optionsToRedirectsKey);
    return {
        getFromDirectoryCache,
        getOrCreateCacheForDirectory,
        clear,
        update,
        directoryToModuleNameMap,
    };
    function clear() {
        directoryToModuleNameMap.clear();
    }
    function update(options) {
        directoryToModuleNameMap.update(options);
    }
    function getOrCreateCacheForDirectory(directoryName, redirectedReference) {
        const path = toPath(directoryName, currentDirectory, getCanonicalFileName);
        return getOrCreateCache(directoryToModuleNameMap, redirectedReference, path, () => createModeAwareCache());
    }
    function getFromDirectoryCache(name, mode, directoryName, redirectedReference) {
        var _a, _b;
        const path = toPath(directoryName, currentDirectory, getCanonicalFileName);
        return (_b = (_a = directoryToModuleNameMap.getMapOfCacheRedirects(redirectedReference)) === null || _a === void 0 ? void 0 : _a.get(path)) === null || _b === void 0 ? void 0 : _b.get(name, mode);
    }
}
/** @internal */
export function createModeAwareCacheKey(specifier, mode) {
    return (mode === undefined ? specifier : `${mode}|${specifier}`);
}
/** @internal */
export function createModeAwareCache() {
    const underlying = new Map();
    const memoizedReverseKeys = new Map();
    const cache = {
        get(specifier, mode) {
            return underlying.get(getUnderlyingCacheKey(specifier, mode));
        },
        set(specifier, mode, value) {
            underlying.set(getUnderlyingCacheKey(specifier, mode), value);
            return cache;
        },
        delete(specifier, mode) {
            underlying.delete(getUnderlyingCacheKey(specifier, mode));
            return cache;
        },
        has(specifier, mode) {
            return underlying.has(getUnderlyingCacheKey(specifier, mode));
        },
        forEach(cb) {
            return underlying.forEach((elem, key) => {
                const [specifier, mode] = memoizedReverseKeys.get(key);
                return cb(elem, specifier, mode);
            });
        },
        size() {
            return underlying.size;
        },
    };
    return cache;
    function getUnderlyingCacheKey(specifier, mode) {
        const result = createModeAwareCacheKey(specifier, mode);
        memoizedReverseKeys.set(result, [specifier, mode]);
        return result;
    }
}
function getOriginalOrResolvedModuleFileName(result) {
    return result.resolvedModule && (result.resolvedModule.originalPath || result.resolvedModule.resolvedFileName);
}
function getOriginalOrResolvedTypeReferenceFileName(result) {
    return result.resolvedTypeReferenceDirective &&
        (result.resolvedTypeReferenceDirective.originalPath || result.resolvedTypeReferenceDirective.resolvedFileName);
}
function createNonRelativeNameResolutionCache(currentDirectory, getCanonicalFileName, options, getResolvedFileName, optionsToRedirectsKey) {
    const moduleNameToDirectoryMap = createCacheWithRedirects(options, optionsToRedirectsKey);
    return {
        getFromNonRelativeNameCache,
        getOrCreateCacheForNonRelativeName,
        clear,
        update,
    };
    function clear() {
        moduleNameToDirectoryMap.clear();
    }
    function update(options) {
        moduleNameToDirectoryMap.update(options);
    }
    function getFromNonRelativeNameCache(nonRelativeModuleName, mode, directoryName, redirectedReference) {
        var _a, _b;
        Debug.assert(!isExternalModuleNameRelative(nonRelativeModuleName));
        return (_b = (_a = moduleNameToDirectoryMap.getMapOfCacheRedirects(redirectedReference)) === null || _a === void 0 ? void 0 : _a.get(createModeAwareCacheKey(nonRelativeModuleName, mode))) === null || _b === void 0 ? void 0 : _b.get(directoryName);
    }
    function getOrCreateCacheForNonRelativeName(nonRelativeModuleName, mode, redirectedReference) {
        Debug.assert(!isExternalModuleNameRelative(nonRelativeModuleName));
        return getOrCreateCache(moduleNameToDirectoryMap, redirectedReference, createModeAwareCacheKey(nonRelativeModuleName, mode), createPerModuleNameCache);
    }
    function createPerModuleNameCache() {
        const directoryPathMap = new Map();
        return { get, set };
        function get(directory) {
            return directoryPathMap.get(toPath(directory, currentDirectory, getCanonicalFileName));
        }
        /**
         * At first this function add entry directory -> module resolution result to the table.
         * Then it computes the set of parent folders for 'directory' that should have the same module resolution result
         * and for every parent folder in set it adds entry: parent -> module resolution. .
         * Lets say we first directory name: /a/b/c/d/e and resolution result is: /a/b/bar.ts.
         * Set of parent folders that should have the same result will be:
         * [
         *     /a/b/c/d, /a/b/c, /a/b
         * ]
         * this means that request for module resolution from file in any of these folder will be immediately found in cache.
         */
        function set(directory, result) {
            const path = toPath(directory, currentDirectory, getCanonicalFileName);
            // if entry is already in cache do nothing
            if (directoryPathMap.has(path)) {
                return;
            }
            directoryPathMap.set(path, result);
            const resolvedFileName = getResolvedFileName(result);
            // find common prefix between directory and resolved file name
            // this common prefix should be the shortest path that has the same resolution
            // directory: /a/b/c/d/e
            // resolvedFileName: /a/b/foo.d.ts
            // commonPrefix: /a/b
            // for failed lookups cache the result for every directory up to root
            const commonPrefix = resolvedFileName && getCommonPrefix(path, resolvedFileName);
            let current = path;
            while (current !== commonPrefix) {
                const parent = getDirectoryPath(current);
                if (parent === current || directoryPathMap.has(parent)) {
                    break;
                }
                directoryPathMap.set(parent, result);
                current = parent;
            }
        }
        function getCommonPrefix(directory, resolution) {
            const resolutionDirectory = toPath(getDirectoryPath(resolution), currentDirectory, getCanonicalFileName);
            // find first position where directory and resolution differs
            let i = 0;
            const limit = Math.min(directory.length, resolutionDirectory.length);
            while (i < limit && directory.charCodeAt(i) === resolutionDirectory.charCodeAt(i)) {
                i++;
            }
            if (i === directory.length && (resolutionDirectory.length === i || resolutionDirectory[i] === directorySeparator)) {
                return directory;
            }
            const rootLength = getRootLength(directory);
            if (i < rootLength) {
                return undefined;
            }
            const sep = directory.lastIndexOf(directorySeparator, i - 1);
            if (sep === -1) {
                return undefined;
            }
            return directory.substr(0, Math.max(sep, rootLength));
        }
    }
}
function createModuleOrTypeReferenceResolutionCache(currentDirectory, getCanonicalFileName, options, packageJsonInfoCache, getResolvedFileName, optionsToRedirectsKey) {
    optionsToRedirectsKey !== null && optionsToRedirectsKey !== void 0 ? optionsToRedirectsKey : (optionsToRedirectsKey = new Map());
    const perDirectoryResolutionCache = createPerDirectoryResolutionCache(currentDirectory, getCanonicalFileName, options, optionsToRedirectsKey);
    const nonRelativeNameResolutionCache = createNonRelativeNameResolutionCache(currentDirectory, getCanonicalFileName, options, getResolvedFileName, optionsToRedirectsKey);
    packageJsonInfoCache !== null && packageJsonInfoCache !== void 0 ? packageJsonInfoCache : (packageJsonInfoCache = createPackageJsonInfoCache(currentDirectory, getCanonicalFileName));
    return Object.assign(Object.assign(Object.assign(Object.assign({}, packageJsonInfoCache), perDirectoryResolutionCache), nonRelativeNameResolutionCache), { clear,
        update, getPackageJsonInfoCache: () => packageJsonInfoCache, clearAllExceptPackageJsonInfoCache,
        optionsToRedirectsKey });
    function clear() {
        clearAllExceptPackageJsonInfoCache();
        packageJsonInfoCache.clear();
    }
    function clearAllExceptPackageJsonInfoCache() {
        perDirectoryResolutionCache.clear();
        nonRelativeNameResolutionCache.clear();
    }
    function update(options) {
        perDirectoryResolutionCache.update(options);
        nonRelativeNameResolutionCache.update(options);
    }
}
export function createModuleResolutionCache(currentDirectory, getCanonicalFileName, options, packageJsonInfoCache, optionsToRedirectsKey) {
    const result = createModuleOrTypeReferenceResolutionCache(currentDirectory, getCanonicalFileName, options, packageJsonInfoCache, getOriginalOrResolvedModuleFileName, optionsToRedirectsKey);
    result.getOrCreateCacheForModuleName = (nonRelativeName, mode, redirectedReference) => result.getOrCreateCacheForNonRelativeName(nonRelativeName, mode, redirectedReference);
    return result;
}
export function createTypeReferenceDirectiveResolutionCache(currentDirectory, getCanonicalFileName, options, packageJsonInfoCache, optionsToRedirectsKey) {
    return createModuleOrTypeReferenceResolutionCache(currentDirectory, getCanonicalFileName, options, packageJsonInfoCache, getOriginalOrResolvedTypeReferenceFileName, optionsToRedirectsKey);
}
/** @internal */
export function getOptionsForLibraryResolution(options) {
    return { moduleResolution: ModuleResolutionKind.Node10, traceResolution: options.traceResolution };
}
/** @internal */
export function resolveLibrary(libraryName, resolveFrom, compilerOptions, host, cache) {
    return resolveModuleName(libraryName, resolveFrom, getOptionsForLibraryResolution(compilerOptions), host, cache);
}
export function resolveModuleNameFromCache(moduleName, containingFile, cache, mode) {
    const containingDirectory = getDirectoryPath(containingFile);
    return cache.getFromDirectoryCache(moduleName, mode, containingDirectory, /*redirectedReference*/ undefined);
}
export function resolveModuleName(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode) {
    const traceEnabled = isTraceEnabled(compilerOptions, host);
    if (redirectedReference) {
        compilerOptions = redirectedReference.commandLine.options;
    }
    if (traceEnabled) {
        trace(host, Diagnostics.Resolving_module_0_from_1, moduleName, containingFile);
        if (redirectedReference) {
            trace(host, Diagnostics.Using_compiler_options_of_project_reference_redirect_0, redirectedReference.sourceFile.fileName);
        }
    }
    const containingDirectory = getDirectoryPath(containingFile);
    let result = cache === null || cache === void 0 ? void 0 : cache.getFromDirectoryCache(moduleName, resolutionMode, containingDirectory, redirectedReference);
    if (result) {
        if (traceEnabled) {
            trace(host, Diagnostics.Resolution_for_module_0_was_found_in_cache_from_location_1, moduleName, containingDirectory);
        }
    }
    else {
        let moduleResolution = compilerOptions.moduleResolution;
        if (moduleResolution === undefined) {
            moduleResolution = getEmitModuleResolutionKind(compilerOptions);
            if (traceEnabled) {
                trace(host, Diagnostics.Module_resolution_kind_is_not_specified_using_0, ModuleResolutionKind[moduleResolution]);
            }
        }
        else {
            if (traceEnabled) {
                trace(host, Diagnostics.Explicitly_specified_module_resolution_kind_Colon_0, ModuleResolutionKind[moduleResolution]);
            }
        }
        switch (moduleResolution) {
            case ModuleResolutionKind.Node16:
                result = node16ModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode);
                break;
            case ModuleResolutionKind.NodeNext:
                result = nodeNextModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode);
                break;
            case ModuleResolutionKind.Node10:
                result = nodeModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode ? getConditions(compilerOptions, resolutionMode) : undefined);
                break;
            case ModuleResolutionKind.Classic:
                result = classicNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference);
                break;
            case ModuleResolutionKind.Bundler:
                result = bundlerModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode ? getConditions(compilerOptions, resolutionMode) : undefined);
                break;
            default:
                return Debug.fail(`Unexpected moduleResolution: ${moduleResolution}`);
        }
        if (cache && !cache.isReadonly) {
            cache.getOrCreateCacheForDirectory(containingDirectory, redirectedReference).set(moduleName, resolutionMode, result);
            if (!isExternalModuleNameRelative(moduleName)) {
                // put result in per-module name cache
                cache.getOrCreateCacheForNonRelativeName(moduleName, resolutionMode, redirectedReference).set(containingDirectory, result);
            }
        }
    }
    if (traceEnabled) {
        if (result.resolvedModule) {
            if (result.resolvedModule.packageId) {
                trace(host, Diagnostics.Module_name_0_was_successfully_resolved_to_1_with_Package_ID_2, moduleName, result.resolvedModule.resolvedFileName, packageIdToString(result.resolvedModule.packageId));
            }
            else {
                trace(host, Diagnostics.Module_name_0_was_successfully_resolved_to_1, moduleName, result.resolvedModule.resolvedFileName);
            }
        }
        else {
            trace(host, Diagnostics.Module_name_0_was_not_resolved, moduleName);
        }
    }
    return result;
}
/**
 * Any module resolution kind can be augmented with optional settings: 'baseUrl', 'paths' and 'rootDirs' - they are used to
 * mitigate differences between design time structure of the project and its runtime counterpart so the same import name
 * can be resolved successfully by TypeScript compiler and runtime module loader.
 * If these settings are set then loading procedure will try to use them to resolve module name and it can of failure it will
 * fallback to standard resolution routine.
 *
 * - baseUrl - this setting controls how non-relative module names are resolved. If this setting is specified then non-relative
 * names will be resolved relative to baseUrl: i.e. if baseUrl is '/a/b' then candidate location to resolve module name 'c/d' will
 * be '/a/b/c/d'
 * - paths - this setting can only be used when baseUrl is specified. allows to tune how non-relative module names
 * will be resolved based on the content of the module name.
 * Structure of 'paths' compiler options
 * 'paths': {
 *    pattern-1: [...substitutions],
 *    pattern-2: [...substitutions],
 *    ...
 *    pattern-n: [...substitutions]
 * }
 * Pattern here is a string that can contain zero or one '*' character. During module resolution module name will be matched against
 * all patterns in the list. Matching for patterns that don't contain '*' means that module name must be equal to pattern respecting the case.
 * If pattern contains '*' then to match pattern "<prefix>*<suffix>" module name must start with the <prefix> and end with <suffix>.
 * <MatchedStar> denotes part of the module name between <prefix> and <suffix>.
 * If module name can be matches with multiple patterns then pattern with the longest prefix will be picked.
 * After selecting pattern we'll use list of substitutions to get candidate locations of the module and the try to load module
 * from the candidate location.
 * Substitution is a string that can contain zero or one '*'. To get candidate location from substitution we'll pick every
 * substitution in the list and replace '*' with <MatchedStar> string. If candidate location is not rooted it
 * will be converted to absolute using baseUrl.
 * For example:
 * baseUrl: /a/b/c
 * "paths": {
 *     // match all module names
 *     "*": [
 *         "*",        // use matched name as is,
 *                     // <matched name> will be looked as /a/b/c/<matched name>
 *
 *         "folder1/*" // substitution will convert matched name to 'folder1/<matched name>',
 *                     // since it is not rooted then final candidate location will be /a/b/c/folder1/<matched name>
 *     ],
 *     // match module names that start with 'components/'
 *     "components/*": [ "/root/components/*" ] // substitution will convert /components/folder1/<matched name> to '/root/components/folder1/<matched name>',
 *                                              // it is rooted so it will be final candidate location
 * }
 *
 * 'rootDirs' allows the project to be spreaded across multiple locations and resolve modules with relative names as if
 * they were in the same location. For example lets say there are two files
 * '/local/src/content/file1.ts'
 * '/shared/components/contracts/src/content/protocols/file2.ts'
 * After bundling content of '/shared/components/contracts/src' will be merged with '/local/src' so
 * if file1 has the following import 'import {x} from "./protocols/file2"' it will be resolved successfully in runtime.
 * 'rootDirs' provides the way to tell compiler that in order to get the whole project it should behave as if content of all
 * root dirs were merged together.
 * I.e. for the example above 'rootDirs' will have two entries: [ '/local/src', '/shared/components/contracts/src' ].
 * Compiler will first convert './protocols/file2' into absolute path relative to the location of containing file:
 * '/local/src/content/protocols/file2' and try to load it - failure.
 * Then it will search 'rootDirs' looking for a longest matching prefix of this absolute path and if such prefix is found - absolute path will
 * be converted to a path relative to found rootDir entry './content/protocols/file2' (*). As a last step compiler will check all remaining
 * entries in 'rootDirs', use them to build absolute path out of (*) and try to resolve module from this location.
 */
function tryLoadModuleUsingOptionalResolutionSettings(extensions, moduleName, containingDirectory, loader, state) {
    const resolved = tryLoadModuleUsingPathsIfEligible(extensions, moduleName, loader, state);
    if (resolved)
        return resolved.value;
    if (!isExternalModuleNameRelative(moduleName)) {
        return tryLoadModuleUsingBaseUrl(extensions, moduleName, loader, state);
    }
    else {
        return tryLoadModuleUsingRootDirs(extensions, moduleName, containingDirectory, loader, state);
    }
}
function tryLoadModuleUsingPathsIfEligible(extensions, moduleName, loader, state) {
    const { baseUrl, paths } = state.compilerOptions;
    if (paths && !pathIsRelative(moduleName)) {
        if (state.traceEnabled) {
            if (baseUrl) {
                trace(state.host, Diagnostics.baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1, baseUrl, moduleName);
            }
            trace(state.host, Diagnostics.paths_option_is_specified_looking_for_a_pattern_to_match_module_name_0, moduleName);
        }
        const baseDirectory = getPathsBasePath(state.compilerOptions, state.host); // Always defined when 'paths' is defined
        const pathPatterns = tryParsePatterns(paths);
        return tryLoadModuleUsingPaths(extensions, moduleName, baseDirectory, paths, pathPatterns, loader, /*onlyRecordFailures*/ false, state);
    }
}
function tryLoadModuleUsingRootDirs(extensions, moduleName, containingDirectory, loader, state) {
    if (!state.compilerOptions.rootDirs) {
        return undefined;
    }
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.rootDirs_option_is_set_using_it_to_resolve_relative_module_name_0, moduleName);
    }
    const candidate = normalizePath(combinePaths(containingDirectory, moduleName));
    let matchedRootDir;
    let matchedNormalizedPrefix;
    for (const rootDir of state.compilerOptions.rootDirs) {
        // rootDirs are expected to be absolute
        // in case of tsconfig.json this will happen automatically - compiler will expand relative names
        // using location of tsconfig.json as base location
        let normalizedRoot = normalizePath(rootDir);
        if (!endsWith(normalizedRoot, directorySeparator)) {
            normalizedRoot += directorySeparator;
        }
        const isLongestMatchingPrefix = startsWith(candidate, normalizedRoot) &&
            (matchedNormalizedPrefix === undefined || matchedNormalizedPrefix.length < normalizedRoot.length);
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Checking_if_0_is_the_longest_matching_prefix_for_1_2, normalizedRoot, candidate, isLongestMatchingPrefix);
        }
        if (isLongestMatchingPrefix) {
            matchedNormalizedPrefix = normalizedRoot;
            matchedRootDir = rootDir;
        }
    }
    if (matchedNormalizedPrefix) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Longest_matching_prefix_for_0_is_1, candidate, matchedNormalizedPrefix);
        }
        const suffix = candidate.substr(matchedNormalizedPrefix.length);
        // first - try to load from a initial location
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Loading_0_from_the_root_dir_1_candidate_location_2, suffix, matchedNormalizedPrefix, candidate);
        }
        const resolvedFileName = loader(extensions, candidate, !directoryProbablyExists(containingDirectory, state.host), state);
        if (resolvedFileName) {
            return resolvedFileName;
        }
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Trying_other_entries_in_rootDirs);
        }
        // then try to resolve using remaining entries in rootDirs
        for (const rootDir of state.compilerOptions.rootDirs) {
            if (rootDir === matchedRootDir) {
                // skip the initially matched entry
                continue;
            }
            const candidate = combinePaths(normalizePath(rootDir), suffix);
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.Loading_0_from_the_root_dir_1_candidate_location_2, suffix, rootDir, candidate);
            }
            const baseDirectory = getDirectoryPath(candidate);
            const resolvedFileName = loader(extensions, candidate, !directoryProbablyExists(baseDirectory, state.host), state);
            if (resolvedFileName) {
                return resolvedFileName;
            }
        }
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Module_resolution_using_rootDirs_has_failed);
        }
    }
    return undefined;
}
function tryLoadModuleUsingBaseUrl(extensions, moduleName, loader, state) {
    const { baseUrl } = state.compilerOptions;
    if (!baseUrl) {
        return undefined;
    }
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1, baseUrl, moduleName);
    }
    const candidate = normalizePath(combinePaths(baseUrl, moduleName));
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.Resolving_module_name_0_relative_to_base_url_1_2, moduleName, baseUrl, candidate);
    }
    return loader(extensions, candidate, !directoryProbablyExists(getDirectoryPath(candidate), state.host), state);
}
/**
 * Expose resolution logic to allow us to use Node module resolution logic from arbitrary locations.
 * No way to do this with `require()`: https://github.com/nodejs/node/issues/5963
 * Throws an error if the module can't be resolved.
 *
 * @internal
 */
export function resolveJSModule(moduleName, initialDir, host) {
    const { resolvedModule, failedLookupLocations } = tryResolveJSModuleWorker(moduleName, initialDir, host);
    if (!resolvedModule) {
        throw new Error(`Could not resolve JS module '${moduleName}' starting at '${initialDir}'. Looked in: ${failedLookupLocations === null || failedLookupLocations === void 0 ? void 0 : failedLookupLocations.join(", ")}`);
    }
    return resolvedModule.resolvedFileName;
}


// /** @internal */
// export enum NodeResolutionFeatures {
//     None = 0,
//     // resolving `#local` names in your own package.json
//     Imports = 1 << 1,
//     // resolving `your-own-name` from your own package.json
//     SelfName = 1 << 2,
//     // respecting the `.exports` member of packages' package.json files and its (conditional) mappings of export names
//     Exports = 1 << 3,
//     // allowing `*` in the LHS of an export to be followed by more content, eg `"./whatever/*.js"`
//     // not supported in node 12 - https://github.com/nodejs/Release/issues/690
//     ExportsPatternTrailers = 1 << 4,
//     AllFeatures = Imports | SelfName | Exports | ExportsPatternTrailers,
// 
//     Node16Default = Imports | SelfName | Exports | ExportsPatternTrailers,
// 
//     NodeNextDefault = AllFeatures,
// 
//     BundlerDefault = Imports | SelfName | Exports | ExportsPatternTrailers,
// 
//     EsmMode = 1 << 5,
// }
/** @internal */
export var NodeResolutionFeatures;
(function (NodeResolutionFeatures) {
    NodeResolutionFeatures[NodeResolutionFeatures["None"] = 0] = "None";
    // resolving `#local` names in your own package.json
    NodeResolutionFeatures[NodeResolutionFeatures["Imports"] = 2] = "Imports";
    // resolving `your-own-name` from your own package.json
    NodeResolutionFeatures[NodeResolutionFeatures["SelfName"] = 4] = "SelfName";
    // respecting the `.exports` member of packages' package.json files and its (conditional) mappings of export names
    NodeResolutionFeatures[NodeResolutionFeatures["Exports"] = 8] = "Exports";
    // allowing `*` in the LHS of an export to be followed by more content, eg `"./whatever/*.js"`
    // not supported in node 12 - https://github.com/nodejs/Release/issues/690
    NodeResolutionFeatures[NodeResolutionFeatures["ExportsPatternTrailers"] = 16] = "ExportsPatternTrailers";
    NodeResolutionFeatures[NodeResolutionFeatures["AllFeatures"] = 30] = "AllFeatures";
    NodeResolutionFeatures[NodeResolutionFeatures["Node16Default"] = 30] = "Node16Default";
    NodeResolutionFeatures[NodeResolutionFeatures["NodeNextDefault"] = 30] = "NodeNextDefault";
    NodeResolutionFeatures[NodeResolutionFeatures["BundlerDefault"] = 30] = "BundlerDefault";
    NodeResolutionFeatures[NodeResolutionFeatures["EsmMode"] = 32] = "EsmMode";
})(NodeResolutionFeatures || (NodeResolutionFeatures = {}));

function node16ModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode) {
    return nodeNextModuleNameResolverWorker(NodeResolutionFeatures.Node16Default, moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode);
}

function nodeNextModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode) {
    return nodeNextModuleNameResolverWorker(NodeResolutionFeatures.NodeNextDefault, moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode);
}

function nodeNextModuleNameResolverWorker(features, moduleName, containingFile, compilerOptions, host, cache, redirectedReference, resolutionMode, conditions) {
    const containingDirectory = getDirectoryPath(containingFile);
    // es module file or cjs-like input file, use a variant of the legacy cjs resolver that supports the selected modern features
    const esmMode = resolutionMode === ModuleKind.ESNext ? NodeResolutionFeatures.EsmMode : 0;
    let extensions = compilerOptions.noDtsResolution ? 3 /* Extensions.ImplementationFiles */ : 1 /* Extensions.TypeScript */ | 2 /* Extensions.JavaScript */ | 4 /* Extensions.Declaration */;
    if (getResolveJsonModule(compilerOptions)) {
        extensions |= 8 /* Extensions.Json */;
    }
    return nodeModuleNameResolverWorker(features | esmMode, moduleName, containingDirectory, compilerOptions, host, cache, extensions, /*isConfigLookup*/ false, redirectedReference, conditions);
}

function tryResolveJSModuleWorker(moduleName, initialDir, host) {
    return nodeModuleNameResolverWorker(NodeResolutionFeatures.None, moduleName, initialDir, { moduleResolution: ModuleResolutionKind.Node10, allowJs: true }, host, 
    /*cache*/ undefined, 2 /* Extensions.JavaScript */, 
    /*isConfigLookup*/ false, 
    /*redirectedReference*/ undefined, 
    /*conditions*/ undefined);
}
export function bundlerModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, conditions) {
    const containingDirectory = getDirectoryPath(containingFile);
    let extensions = compilerOptions.noDtsResolution ? 3 /* Extensions.ImplementationFiles */ : 1 /* Extensions.TypeScript */ | 2 /* Extensions.JavaScript */ | 4 /* Extensions.Declaration */;
    if (getResolveJsonModule(compilerOptions)) {
        extensions |= 8 /* Extensions.Json */;
    }
    return nodeModuleNameResolverWorker(getNodeResolutionFeatures(compilerOptions), moduleName, containingDirectory, compilerOptions, host, cache, extensions, /*isConfigLookup*/ false, redirectedReference, conditions);
}
export function nodeModuleNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference, conditions, isConfigLookup) {
    let extensions;
    if (isConfigLookup) {
        extensions = 8 /* Extensions.Json */;
    }
    else if (compilerOptions.noDtsResolution) {
        extensions = 3 /* Extensions.ImplementationFiles */;
        if (getResolveJsonModule(compilerOptions))
            extensions |= 8 /* Extensions.Json */;
    }
    else {
        extensions = getResolveJsonModule(compilerOptions)
            ? 1 /* Extensions.TypeScript */ | 2 /* Extensions.JavaScript */ | 4 /* Extensions.Declaration */ | 8 /* Extensions.Json */
            : 1 /* Extensions.TypeScript */ | 2 /* Extensions.JavaScript */ | 4 /* Extensions.Declaration */;
    }
    return nodeModuleNameResolverWorker(conditions ? NodeResolutionFeatures.AllFeatures : NodeResolutionFeatures.None, moduleName, getDirectoryPath(containingFile), compilerOptions, host, cache, extensions, !!isConfigLookup, redirectedReference, conditions);
}
/** @internal */
export function nodeNextJsonConfigResolver(moduleName, containingFile, host) {
    return nodeModuleNameResolverWorker(NodeResolutionFeatures.NodeNextDefault, moduleName, getDirectoryPath(containingFile), { moduleResolution: ModuleResolutionKind.NodeNext }, host, /*cache*/ undefined, 8 /* Extensions.Json */, /*isConfigLookup*/ true, /*redirectedReference*/ undefined, /*conditions*/ undefined);
}
function nodeModuleNameResolverWorker(features, moduleName, containingDirectory, compilerOptions, host, cache, extensions, isConfigLookup, redirectedReference, conditions) {
    var _a, _b, _c, _d, _e;
    const traceEnabled = isTraceEnabled(compilerOptions, host);
    const failedLookupLocations = [];
    const affectingLocations = [];
    const moduleResolution = getEmitModuleResolutionKind(compilerOptions);
    conditions !== null && conditions !== void 0 ? conditions : (conditions = getConditions(compilerOptions, moduleResolution === ModuleResolutionKind.Bundler || moduleResolution === ModuleResolutionKind.Node10
        ? undefined
        : (features & NodeResolutionFeatures.EsmMode) ? ModuleKind.ESNext : ModuleKind.CommonJS));
    const diagnostics = [];
    const state = {
        compilerOptions,
        host,
        traceEnabled,
        failedLookupLocations,
        affectingLocations,
        packageJsonInfoCache: cache,
        features,
        conditions: conditions !== null && conditions !== void 0 ? conditions : emptyArray,
        requestContainingDirectory: containingDirectory,
        reportDiagnostic: diag => void diagnostics.push(diag),
        isConfigLookup,
        candidateIsFromPackageJsonField: false,
        resolvedPackageDirectory: false,
    };
    if (traceEnabled && moduleResolutionSupportsPackageJsonExportsAndImports(moduleResolution)) {
        trace(host, Diagnostics.Resolving_in_0_mode_with_conditions_1, features & NodeResolutionFeatures.EsmMode ? "ESM" : "CJS", state.conditions.map(c => `'${c}'`).join(", "));
    }
    let result;
    if (moduleResolution === ModuleResolutionKind.Node10) {
        const priorityExtensions = extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */);
        const secondaryExtensions = extensions & ~(1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */);
        result = priorityExtensions && tryResolve(priorityExtensions, state) ||
            secondaryExtensions && tryResolve(secondaryExtensions, state) ||
            undefined;
    }
    else {
        result = tryResolve(extensions, state);
    }
    let alternateResult;
    if (state.resolvedPackageDirectory && !isConfigLookup && !isExternalModuleNameRelative(moduleName)) {
        const wantedTypesButGotJs = (result === null || result === void 0 ? void 0 : result.value)
            && extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */)
            && !extensionIsOk(1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */, result.value.resolved.extension);
        if (((_a = result === null || result === void 0 ? void 0 : result.value) === null || _a === void 0 ? void 0 : _a.isExternalLibraryImport)
            && wantedTypesButGotJs
            && features & NodeResolutionFeatures.Exports
            && (conditions === null || conditions === void 0 ? void 0 : conditions.includes("import"))) {
            traceIfEnabled(state, Diagnostics.Resolution_of_non_relative_name_failed_trying_with_modern_Node_resolution_features_disabled_to_see_if_npm_library_needs_configuration_update);
            const diagnosticState = Object.assign(Object.assign({}, state), { features: state.features & ~NodeResolutionFeatures.Exports, reportDiagnostic: noop });
            const diagnosticResult = tryResolve(extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */), diagnosticState);
            if ((_b = diagnosticResult === null || diagnosticResult === void 0 ? void 0 : diagnosticResult.value) === null || _b === void 0 ? void 0 : _b.isExternalLibraryImport) {
                alternateResult = diagnosticResult.value.resolved.path;
            }
        }
        else if ((!(result === null || result === void 0 ? void 0 : result.value) || wantedTypesButGotJs)
            && moduleResolution === ModuleResolutionKind.Node10) {
            traceIfEnabled(state, Diagnostics.Resolution_of_non_relative_name_failed_trying_with_moduleResolution_bundler_to_see_if_project_may_need_configuration_update);
            const diagnosticsCompilerOptions = Object.assign(Object.assign({}, state.compilerOptions), { moduleResolution: ModuleResolutionKind.Bundler });
            const diagnosticState = Object.assign(Object.assign({}, state), { compilerOptions: diagnosticsCompilerOptions, features: NodeResolutionFeatures.BundlerDefault, conditions: getConditions(diagnosticsCompilerOptions), reportDiagnostic: noop });
            const diagnosticResult = tryResolve(extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */), diagnosticState);
            if ((_c = diagnosticResult === null || diagnosticResult === void 0 ? void 0 : diagnosticResult.value) === null || _c === void 0 ? void 0 : _c.isExternalLibraryImport) {
                alternateResult = diagnosticResult.value.resolved.path;
            }
        }
    }
    return createResolvedModuleWithFailedLookupLocationsHandlingSymlink(moduleName, (_d = result === null || result === void 0 ? void 0 : result.value) === null || _d === void 0 ? void 0 : _d.resolved, (_e = result === null || result === void 0 ? void 0 : result.value) === null || _e === void 0 ? void 0 : _e.isExternalLibraryImport, failedLookupLocations, affectingLocations, diagnostics, state, cache, alternateResult);
    function tryResolve(extensions, state) {
        const loader = (extensions, candidate, onlyRecordFailures, state) => nodeLoadModuleByRelativeName(extensions, candidate, onlyRecordFailures, state, /*considerPackageJson*/ true);
        const resolved = tryLoadModuleUsingOptionalResolutionSettings(extensions, moduleName, containingDirectory, loader, state);
        if (resolved) {
            return toSearchResult({ resolved, isExternalLibraryImport: pathContainsNodeModules(resolved.path) });
        }
        if (!isExternalModuleNameRelative(moduleName)) {
            if (features & NodeResolutionFeatures.Imports && startsWith(moduleName, "#")) {
                const resolved = loadModuleFromImports(extensions, moduleName, containingDirectory, state, cache, redirectedReference);
                if (resolved) {
                    return resolved.value && { value: { resolved: resolved.value, isExternalLibraryImport: false } };
                }
            }
            if (features & NodeResolutionFeatures.SelfName) {
                const resolved = loadModuleFromSelfNameReference(extensions, moduleName, containingDirectory, state, cache, redirectedReference);
                if (resolved) {
                    return resolved.value && { value: { resolved: resolved.value, isExternalLibraryImport: false } };
                }
            }
            if (moduleName.includes(":")) {
                if (traceEnabled) {
                    trace(host, Diagnostics.Skipping_module_0_that_looks_like_an_absolute_URI_target_file_types_Colon_1, moduleName, formatExtensions(extensions));
                }
                return undefined;
            }
            if (traceEnabled) {
                trace(host, Diagnostics.Loading_module_0_from_node_modules_folder_target_file_types_Colon_1, moduleName, formatExtensions(extensions));
            }
            let resolved = loadModuleFromNearestNodeModulesDirectory(extensions, moduleName, containingDirectory, state, cache, redirectedReference);
            if (extensions & 4 /* Extensions.Declaration */) {
                resolved !== null && resolved !== void 0 ? resolved : (resolved = resolveFromTypeRoot(moduleName, state));
            }
            // For node_modules lookups, get the real path so that multiple accesses to an `npm link`-ed module do not create duplicate files.
            return resolved && { value: resolved.value && { resolved: resolved.value, isExternalLibraryImport: true } };
        }
        else {
            const { path: candidate, parts } = normalizePathForCJSResolution(containingDirectory, moduleName);
            const resolved = nodeLoadModuleByRelativeName(extensions, candidate, /*onlyRecordFailures*/ false, state, /*considerPackageJson*/ true);
            // Treat explicit "node_modules" import as an external library import.
            return resolved && toSearchResult({ resolved, isExternalLibraryImport: contains(parts, "node_modules") });
        }
    }
}
// If you import from "." inside a containing directory "/foo", the result of `normalizePath`
// would be "/foo", but this loses the information that `foo` is a directory and we intended
// to look inside of it. The Node CommonJS resolution algorithm doesn't call this out
// (https://nodejs.org/api/modules.html#all-together), but it seems that module paths ending
// in `.` are actually normalized to `./` before proceeding with the resolution algorithm.
function normalizePathForCJSResolution(containingDirectory, moduleName) {
    const combined = combinePaths(containingDirectory, moduleName);
    const parts = getPathComponents(combined);
    const lastPart = lastOrUndefined(parts);
    const path = lastPart === "." || lastPart === ".." ? ensureTrailingDirectorySeparator(normalizePath(combined)) : normalizePath(combined);
    return { path, parts };
}
function realPath(path, host, traceEnabled) {
    if (!host.realpath) {
        return path;
    }
    const real = normalizePath(host.realpath(path));
    if (traceEnabled) {
        trace(host, Diagnostics.Resolving_real_path_for_0_result_1, path, real);
    }
    return real;
}
function nodeLoadModuleByRelativeName(extensions, candidate, onlyRecordFailures, state, considerPackageJson) {
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.Loading_module_as_file_Slash_folder_candidate_module_location_0_target_file_types_Colon_1, candidate, formatExtensions(extensions));
    }
    if (!hasTrailingDirectorySeparator(candidate)) {
        if (!onlyRecordFailures) {
            const parentOfCandidate = getDirectoryPath(candidate);
            if (!directoryProbablyExists(parentOfCandidate, state.host)) {
                if (state.traceEnabled) {
                    trace(state.host, Diagnostics.Directory_0_does_not_exist_skipping_all_lookups_in_it, parentOfCandidate);
                }
                onlyRecordFailures = true;
            }
        }
        const resolvedFromFile = loadModuleFromFile(extensions, candidate, onlyRecordFailures, state);
        if (resolvedFromFile) {
            const packageDirectory = considerPackageJson ? parseNodeModuleFromPath(resolvedFromFile.path) : undefined;
            const packageInfo = packageDirectory ? getPackageJsonInfo(packageDirectory, /*onlyRecordFailures*/ false, state) : undefined;
            return withPackageId(packageInfo, resolvedFromFile, state);
        }
    }
    if (!onlyRecordFailures) {
        const candidateExists = directoryProbablyExists(candidate, state.host);
        if (!candidateExists) {
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.Directory_0_does_not_exist_skipping_all_lookups_in_it, candidate);
            }
            onlyRecordFailures = true;
        }
    }
    // esm mode relative imports shouldn't do any directory lookups (either inside `package.json`
    // files or implicit `index.js`es). This is a notable departure from cjs norms, where `./foo/pkg`
    // could have been redirected by `./foo/pkg/package.json` to an arbitrary location!
    if (!(state.features & NodeResolutionFeatures.EsmMode)) {
        return loadNodeModuleFromDirectory(extensions, candidate, onlyRecordFailures, state, considerPackageJson);
    }
    return undefined;
}
/** @internal */
export const nodeModulesPathPart = "/node_modules/";
/** @internal */
export function pathContainsNodeModules(path) {
    return path.includes(nodeModulesPathPart);
}
/**
 * This will be called on the successfully resolved path from `loadModuleFromFile`.
 * (Not needed for `loadModuleFromNodeModules` as that looks up the `package.json` as part of resolution.)
 *
 * packageDirectory is the directory of the package itself.
 *   For `blah/node_modules/foo/index.d.ts` this is packageDirectory: "foo"
 *   For `/node_modules/foo/bar.d.ts` this is packageDirectory: "foo"
 *   For `/node_modules/@types/foo/bar/index.d.ts` this is packageDirectory: "@types/foo"
 *   For `/node_modules/foo/bar/index.d.ts` this is packageDirectory: "foo"
 *
 * @internal
 */
export function parseNodeModuleFromPath(resolved, isFolder) {
    const path = normalizePath(resolved);
    const idx = path.lastIndexOf(nodeModulesPathPart);
    if (idx === -1) {
        return undefined;
    }
    const indexAfterNodeModules = idx + nodeModulesPathPart.length;
    let indexAfterPackageName = moveToNextDirectorySeparatorIfAvailable(path, indexAfterNodeModules, isFolder);
    if (path.charCodeAt(indexAfterNodeModules) === CharacterCodes.at) {
        indexAfterPackageName = moveToNextDirectorySeparatorIfAvailable(path, indexAfterPackageName, isFolder);
    }
    return path.slice(0, indexAfterPackageName);
}
function moveToNextDirectorySeparatorIfAvailable(path, prevSeparatorIndex, isFolder) {
    const nextSeparatorIndex = path.indexOf(directorySeparator, prevSeparatorIndex + 1);
    return nextSeparatorIndex === -1 ? isFolder ? path.length : prevSeparatorIndex : nextSeparatorIndex;
}
function loadModuleFromFileNoPackageId(extensions, candidate, onlyRecordFailures, state) {
    return noPackageId(loadModuleFromFile(extensions, candidate, onlyRecordFailures, state));
}
/**
 * @param {boolean} onlyRecordFailures - if true then function won't try to actually load files but instead record all attempts as failures. This flag is necessary
 * in cases when we know upfront that all load attempts will fail (because containing folder does not exists) however we still need to record all failed lookup locations.
 */
function loadModuleFromFile(extensions, candidate, onlyRecordFailures, state) {
    // ./foo.js -> ./foo.ts
    const resolvedByReplacingExtension = loadModuleFromFileNoImplicitExtensions(extensions, candidate, onlyRecordFailures, state);
    if (resolvedByReplacingExtension) {
        return resolvedByReplacingExtension;
    }
    // ./foo -> ./foo.ts
    if (!(state.features & NodeResolutionFeatures.EsmMode)) {
        // First, try adding an extension. An import of "foo" could be matched by a file "foo.ts", or "foo.js" by "foo.js.ts"
        const resolvedByAddingExtension = tryAddingExtensions(candidate, extensions, "", onlyRecordFailures, state);
        if (resolvedByAddingExtension) {
            return resolvedByAddingExtension;
        }
    }
}
function loadModuleFromFileNoImplicitExtensions(extensions, candidate, onlyRecordFailures, state) {
    const filename = getBaseFileName(candidate);
    if (!filename.includes(".")) {
        return undefined; // extensionless import, no lookups performed, since we don't support extensionless files
    }
    let extensionless = removeFileExtension(candidate);
    if (extensionless === candidate) {
        // Once TS native extensions are handled, handle arbitrary extensions for declaration file mapping
        extensionless = candidate.substring(0, candidate.lastIndexOf("."));
    }
    const extension = candidate.substring(extensionless.length);
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.File_name_0_has_a_1_extension_stripping_it, candidate, extension);
    }
    return tryAddingExtensions(extensionless, extensions, extension, onlyRecordFailures, state);
}
/**
 * This function is only ever called with paths written in package.json files - never
 * module specifiers written in source files - and so it always allows the
 * candidate to end with a TS extension (but will also try substituting a JS extension for a TS extension).
 */
function loadFileNameFromPackageJsonField(extensions, candidate, packageJsonValue, onlyRecordFailures, state) {
    if (extensions & 1 /* Extensions.TypeScript */ && fileExtensionIsOneOf(candidate, supportedTSImplementationExtensions) ||
        extensions & 4 /* Extensions.Declaration */ && fileExtensionIsOneOf(candidate, supportedDeclarationExtensions)) {
        const result = tryFile(candidate, onlyRecordFailures, state);
        const ext = tryExtractTSExtension(candidate);
        return result !== undefined ? { path: candidate, ext, resolvedUsingTsExtension: packageJsonValue ? !endsWith(packageJsonValue, ext) : undefined } : undefined;
    }
    if (state.isConfigLookup && extensions === 8 /* Extensions.Json */ && fileExtensionIs(candidate, Extension.Json)) {
        const result = tryFile(candidate, onlyRecordFailures, state);
        return result !== undefined ? { path: candidate, ext: Extension.Json, resolvedUsingTsExtension: undefined } : undefined;
    }
    return loadModuleFromFileNoImplicitExtensions(extensions, candidate, onlyRecordFailures, state);
}
/** Try to return an existing file that adds one of the `extensions` to `candidate`. */
function tryAddingExtensions(candidate, extensions, originalExtension, onlyRecordFailures, state) {
    if (!onlyRecordFailures) {
        // check if containing folder exists - if it doesn't then just record failures for all supported extensions without disk probing
        const directory = getDirectoryPath(candidate);
        if (directory) {
            onlyRecordFailures = !directoryProbablyExists(directory, state.host);
        }
    }
    switch (originalExtension) {
        case Extension.Mjs:
        case Extension.Mts:
        case Extension.Dmts:
            return extensions & 1 /* Extensions.TypeScript */ && tryExtension(Extension.Mts, originalExtension === Extension.Mts || originalExtension === Extension.Dmts)
                || extensions & 4 /* Extensions.Declaration */ && tryExtension(Extension.Dmts, originalExtension === Extension.Mts || originalExtension === Extension.Dmts)
                || extensions & 2 /* Extensions.JavaScript */ && tryExtension(Extension.Mjs)
                || undefined;
        case Extension.Cjs:
        case Extension.Cts:
        case Extension.Dcts:
            return extensions & 1 /* Extensions.TypeScript */ && tryExtension(Extension.Cts, originalExtension === Extension.Cts || originalExtension === Extension.Dcts)
                || extensions & 4 /* Extensions.Declaration */ && tryExtension(Extension.Dcts, originalExtension === Extension.Cts || originalExtension === Extension.Dcts)
                || extensions & 2 /* Extensions.JavaScript */ && tryExtension(Extension.Cjs)
                || undefined;
        case Extension.Json:
            return extensions & 4 /* Extensions.Declaration */ && tryExtension(".d.json.ts")
                || extensions & 8 /* Extensions.Json */ && tryExtension(Extension.Json)
                || undefined;
        case Extension.Tsx:
        case Extension.Jsx:
            // basically idendical to the ts/js case below, but prefers matching tsx and jsx files exactly before falling back to the ts or js file path
            // (historically, we disallow having both a a.ts and a.tsx file in the same compilation, since their outputs clash)
            // TODO: We should probably error if `"./a.tsx"` resolved to `"./a.ts"`, right?
            return extensions & 1 /* Extensions.TypeScript */ && (tryExtension(Extension.Tsx, originalExtension === Extension.Tsx) || tryExtension(Extension.Ts, originalExtension === Extension.Tsx))
                || extensions & 4 /* Extensions.Declaration */ && tryExtension(Extension.Dts, originalExtension === Extension.Tsx)
                || extensions & 2 /* Extensions.JavaScript */ && (tryExtension(Extension.Jsx) || tryExtension(Extension.Js))
                || undefined;
        case Extension.Ts:
        case Extension.Dts:
        case Extension.Js:
        case "":
            return extensions & 1 /* Extensions.TypeScript */ && (tryExtension(Extension.Ts, originalExtension === Extension.Ts || originalExtension === Extension.Dts) || tryExtension(Extension.Tsx, originalExtension === Extension.Ts || originalExtension === Extension.Dts))
                || extensions & 4 /* Extensions.Declaration */ && tryExtension(Extension.Dts, originalExtension === Extension.Ts || originalExtension === Extension.Dts)
                || extensions & 2 /* Extensions.JavaScript */ && (tryExtension(Extension.Js) || tryExtension(Extension.Jsx))
                || state.isConfigLookup && tryExtension(Extension.Json)
                || undefined;
        default:
            return extensions & 4 /* Extensions.Declaration */ && !isDeclarationFileName(candidate + originalExtension) && tryExtension(`.d${originalExtension}.ts`)
                || undefined;
    }
    function tryExtension(ext, resolvedUsingTsExtension) {
        const path = tryFile(candidate + ext, onlyRecordFailures, state);
        return path === undefined ? undefined : { path, ext, resolvedUsingTsExtension: !state.candidateIsFromPackageJsonField && resolvedUsingTsExtension };
    }
}
/** Return the file if it exists. */
function tryFile(fileName, onlyRecordFailures, state) {
    var _a, _b;
    if (!((_a = state.compilerOptions.moduleSuffixes) === null || _a === void 0 ? void 0 : _a.length)) {
        return tryFileLookup(fileName, onlyRecordFailures, state);
    }
    const ext = (_b = tryGetExtensionFromPath(fileName)) !== null && _b !== void 0 ? _b : "";
    const fileNameNoExtension = ext ? removeExtension(fileName, ext) : fileName;
    return forEach(state.compilerOptions.moduleSuffixes, suffix => tryFileLookup(fileNameNoExtension + suffix + ext, onlyRecordFailures, state));
}
function tryFileLookup(fileName, onlyRecordFailures, state) {
    var _a;
    if (!onlyRecordFailures) {
        if (state.host.fileExists(fileName)) {
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.File_0_exists_use_it_as_a_name_resolution_result, fileName);
            }
            return fileName;
        }
        else {
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.File_0_does_not_exist, fileName);
            }
        }
    }
    (_a = state.failedLookupLocations) === null || _a === void 0 ? void 0 : _a.push(fileName);
    return undefined;
}
function loadNodeModuleFromDirectory(extensions, candidate, onlyRecordFailures, state, considerPackageJson = true) {
    const packageInfo = considerPackageJson ? getPackageJsonInfo(candidate, onlyRecordFailures, state) : undefined;
    return withPackageId(packageInfo, loadNodeModuleFromDirectoryWorker(extensions, candidate, onlyRecordFailures, state, packageInfo), state);
}
/** @internal */
export function getEntrypointsFromPackageJsonInfo(packageJsonInfo, options, host, cache, resolveJs) {
    if (!resolveJs && packageJsonInfo.contents.resolvedEntrypoints !== undefined) {
        // Cached value excludes resolutions to JS files - those could be
        // cached separately, but they're used rarely.
        return packageJsonInfo.contents.resolvedEntrypoints;
    }
    let entrypoints;
    const extensions = 1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */ | (resolveJs ? 2 /* Extensions.JavaScript */ : 0);
    const features = getNodeResolutionFeatures(options);
    const loadPackageJsonMainState = getTemporaryModuleResolutionState(cache === null || cache === void 0 ? void 0 : cache.getPackageJsonInfoCache(), host, options);
    loadPackageJsonMainState.conditions = getConditions(options);
    loadPackageJsonMainState.requestContainingDirectory = packageJsonInfo.packageDirectory;
    const mainResolution = loadNodeModuleFromDirectoryWorker(extensions, packageJsonInfo.packageDirectory, 
    /*onlyRecordFailures*/ false, loadPackageJsonMainState, packageJsonInfo);
    entrypoints = append(entrypoints, mainResolution === null || mainResolution === void 0 ? void 0 : mainResolution.path);
    if (features & NodeResolutionFeatures.Exports && packageJsonInfo.contents.packageJsonContent.exports) {
        const conditionSets = deduplicate([getConditions(options, ModuleKind.ESNext), getConditions(options, ModuleKind.CommonJS)], arrayIsEqualTo);
        for (const conditions of conditionSets) {
            const loadPackageJsonExportsState = Object.assign(Object.assign({}, loadPackageJsonMainState), { failedLookupLocations: [], conditions, host });
            const exportResolutions = loadEntrypointsFromExportMap(packageJsonInfo, packageJsonInfo.contents.packageJsonContent.exports, loadPackageJsonExportsState, extensions);
            if (exportResolutions) {
                for (const resolution of exportResolutions) {
                    entrypoints = appendIfUnique(entrypoints, resolution.path);
                }
            }
        }
    }
    return packageJsonInfo.contents.resolvedEntrypoints = entrypoints || false;
}
function loadEntrypointsFromExportMap(scope, exports, state, extensions) {
    let entrypoints;
    if (isArray(exports)) {
        for (const target of exports) {
            loadEntrypointsFromTargetExports(target);
        }
    }
    // eslint-disable-next-line no-restricted-syntax
    else if (typeof exports === "object" && exports !== null && allKeysStartWithDot(exports)) {
        for (const key in exports) {
            loadEntrypointsFromTargetExports(exports[key]);
        }
    }
    else {
        loadEntrypointsFromTargetExports(exports);
    }
    return entrypoints;
    function loadEntrypointsFromTargetExports(target) {
        var _a, _b;
        if (typeof target === "string" && startsWith(target, "./")) {
            if (target.includes("*") && state.host.readDirectory) {
                if (target.indexOf("*") !== target.lastIndexOf("*")) {
                    return false;
                }
                state.host.readDirectory(scope.packageDirectory, extensionsToExtensionsArray(extensions), 
                /*excludes*/ undefined, [
                    changeFullExtension(replaceFirstStar(target, "**/*"), ".*"),
                ]).forEach(entry => {
                    entrypoints = appendIfUnique(entrypoints, {
                        path: entry,
                        ext: getAnyExtensionFromPath(entry),
                        resolvedUsingTsExtension: undefined,
                    });
                });
            }
            else {
                const partsAfterFirst = getPathComponents(target).slice(2);
                if (partsAfterFirst.includes("..") || partsAfterFirst.includes(".") || partsAfterFirst.includes("node_modules")) {
                    return false;
                }
                const resolvedTarget = combinePaths(scope.packageDirectory, target);
                const finalPath = getNormalizedAbsolutePath(resolvedTarget, (_b = (_a = state.host).getCurrentDirectory) === null || _b === void 0 ? void 0 : _b.call(_a));
                const result = loadFileNameFromPackageJsonField(extensions, finalPath, target, /*onlyRecordFailures*/ false, state);
                if (result) {
                    entrypoints = appendIfUnique(entrypoints, result, (a, b) => a.path === b.path);
                    return true;
                }
            }
        }
        else if (Array.isArray(target)) {
            for (const t of target) {
                const success = loadEntrypointsFromTargetExports(t);
                if (success) {
                    return true;
                }
            }
        }
        // eslint-disable-next-line no-restricted-syntax
        else if (typeof target === "object" && target !== null) {
            return forEach(getOwnKeys(target), key => {
                if (key === "default" || contains(state.conditions, key) || isApplicableVersionedTypesKey(state.conditions, key)) {
                    loadEntrypointsFromTargetExports(target[key]);
                    return true;
                }
            });
        }
    }
}
/** @internal */
export function getTemporaryModuleResolutionState(packageJsonInfoCache, host, options) {
    return {
        host,
        compilerOptions: options,
        traceEnabled: isTraceEnabled(options, host),
        failedLookupLocations: undefined,
        affectingLocations: undefined,
        packageJsonInfoCache,
        features: NodeResolutionFeatures.None,
        conditions: emptyArray,
        requestContainingDirectory: undefined,
        reportDiagnostic: noop,
        isConfigLookup: false,
        candidateIsFromPackageJsonField: false,
        resolvedPackageDirectory: false,
    };
}
/**
 * A function for locating the package.json scope for a given path
 *
 * @internal
 */
export function getPackageScopeForPath(directory, state) {
    return forEachAncestorDirectoryStoppingAtGlobalCache(state.host, directory, dir => getPackageJsonInfo(dir, /*onlyRecordFailures*/ false, state));
}
function getVersionPathsOfPackageJsonInfo(packageJsonInfo, state) {
    if (packageJsonInfo.contents.versionPaths === undefined) {
        packageJsonInfo.contents.versionPaths = readPackageJsonTypesVersionPaths(packageJsonInfo.contents.packageJsonContent, state) || false;
    }
    return packageJsonInfo.contents.versionPaths || undefined;
}
function getPeerDependenciesOfPackageJsonInfo(packageJsonInfo, state) {
    if (packageJsonInfo.contents.peerDependencies === undefined) {
        packageJsonInfo.contents.peerDependencies = readPackageJsonPeerDependencies(packageJsonInfo, state) || false;
    }
    return packageJsonInfo.contents.peerDependencies || undefined;
}
function readPackageJsonPeerDependencies(packageJsonInfo, state) {
    const peerDependencies = readPackageJsonField(packageJsonInfo.contents.packageJsonContent, "peerDependencies", "object", state);
    if (peerDependencies === undefined)
        return undefined;
    if (state.traceEnabled)
        trace(state.host, Diagnostics.package_json_has_a_peerDependencies_field);
    const packageDirectory = realPath(packageJsonInfo.packageDirectory, state.host, state.traceEnabled);
    const nodeModules = packageDirectory.substring(0, packageDirectory.lastIndexOf("node_modules") + "node_modules".length) + directorySeparator;
    let result = "";
    for (const key in peerDependencies) {
        if (hasProperty(peerDependencies, key)) {
            const peerPackageJson = getPackageJsonInfo(nodeModules + key, /*onlyRecordFailures*/ false, state);
            if (peerPackageJson) {
                const version = peerPackageJson.contents.packageJsonContent.version;
                result += `+${key}@${version}`;
                if (state.traceEnabled)
                    trace(state.host, Diagnostics.Found_peerDependency_0_with_1_version, key, version);
            }
            else {
                // Read the dependency version
                if (state.traceEnabled)
                    trace(state.host, Diagnostics.Failed_to_find_peerDependency_0, key);
            }
        }
    }
    return result;
}
function getPackageJsonInfo(packageDirectory, onlyRecordFailures, state) {
    var _a, _b, _c, _d, _e, _f;
    const { host, traceEnabled } = state;
    const packageJsonPath = combinePaths(packageDirectory, "package.json");
    if (onlyRecordFailures) {
        (_a = state.failedLookupLocations) === null || _a === void 0 ? void 0 : _a.push(packageJsonPath);
        return undefined;
    }
    const existing = (_b = state.packageJsonInfoCache) === null || _b === void 0 ? void 0 : _b.getPackageJsonInfo(packageJsonPath);
    if (existing !== undefined) {
        if (isPackageJsonInfo(existing)) {
            if (traceEnabled)
                trace(host, Diagnostics.File_0_exists_according_to_earlier_cached_lookups, packageJsonPath);
            (_c = state.affectingLocations) === null || _c === void 0 ? void 0 : _c.push(packageJsonPath);
            return existing.packageDirectory === packageDirectory ?
                existing :
                { packageDirectory, contents: existing.contents };
        }
        else {
            if (existing.directoryExists && traceEnabled)
                trace(host, Diagnostics.File_0_does_not_exist_according_to_earlier_cached_lookups, packageJsonPath);
            (_d = state.failedLookupLocations) === null || _d === void 0 ? void 0 : _d.push(packageJsonPath);
            return undefined;
        }
    }
    const directoryExists = directoryProbablyExists(packageDirectory, host);
    if (directoryExists && host.fileExists(packageJsonPath)) {
        const packageJsonContent = readJson(packageJsonPath, host);
        if (traceEnabled) {
            trace(host, Diagnostics.Found_package_json_at_0, packageJsonPath);
        }
        const result = { packageDirectory, contents: { packageJsonContent, versionPaths: undefined, resolvedEntrypoints: undefined, peerDependencies: undefined } };
        if (state.packageJsonInfoCache && !state.packageJsonInfoCache.isReadonly)
            state.packageJsonInfoCache.setPackageJsonInfo(packageJsonPath, result);
        (_e = state.affectingLocations) === null || _e === void 0 ? void 0 : _e.push(packageJsonPath);
        return result;
    }
    else {
        if (directoryExists && traceEnabled) {
            trace(host, Diagnostics.File_0_does_not_exist, packageJsonPath);
        }
        if (state.packageJsonInfoCache && !state.packageJsonInfoCache.isReadonly)
            state.packageJsonInfoCache.setPackageJsonInfo(packageJsonPath, { packageDirectory, directoryExists });
        // record package json as one of failed lookup locations - in the future if this file will appear it will invalidate resolution results
        (_f = state.failedLookupLocations) === null || _f === void 0 ? void 0 : _f.push(packageJsonPath);
    }
}
function loadNodeModuleFromDirectoryWorker(extensions, candidate, onlyRecordFailures, state, packageJson) {
    const versionPaths = packageJson && getVersionPathsOfPackageJsonInfo(packageJson, state);
    let packageFile;
    if (packageJson && arePathsEqual(packageJson === null || packageJson === void 0 ? void 0 : packageJson.packageDirectory, candidate, state.host)) {
        if (state.isConfigLookup) {
            packageFile = readPackageJsonTSConfigField(packageJson.contents.packageJsonContent, packageJson.packageDirectory, state);
        }
        else {
            packageFile = extensions & 4 /* Extensions.Declaration */ && readPackageJsonTypesFields(packageJson.contents.packageJsonContent, packageJson.packageDirectory, state) ||
                extensions & (3 /* Extensions.ImplementationFiles */ | 4 /* Extensions.Declaration */) && readPackageJsonMainField(packageJson.contents.packageJsonContent, packageJson.packageDirectory, state) ||
                undefined;
        }
    }
    const loader = (extensions, candidate, onlyRecordFailures, state) => {
        const fromFile = loadFileNameFromPackageJsonField(extensions, candidate, /*packageJsonValue*/ undefined, onlyRecordFailures, state);
        if (fromFile) {
            return noPackageId(fromFile);
        }
        // Even if extensions is DtsOnly, we can still look up a .ts file as a result of package.json "types"
        const expandedExtensions = extensions === 4 /* Extensions.Declaration */ ? 1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */ : extensions;
        // Don't do package.json lookup recursively, because Node.js' package lookup doesn't.
        // Disable `EsmMode` for the resolution of the package path for cjs-mode packages (so the `main` field can omit extensions)
        // (technically it only emits a deprecation warning in esm packages right now, but that's probably
        // enough to mean we don't need to support it)
        const features = state.features;
        const candidateIsFromPackageJsonField = state.candidateIsFromPackageJsonField;
        state.candidateIsFromPackageJsonField = true;
        if ((packageJson === null || packageJson === void 0 ? void 0 : packageJson.contents.packageJsonContent.type) !== "module") {
            state.features &= ~NodeResolutionFeatures.EsmMode;
        }
        const result = nodeLoadModuleByRelativeName(expandedExtensions, candidate, onlyRecordFailures, state, /*considerPackageJson*/ false);
        state.features = features;
        state.candidateIsFromPackageJsonField = candidateIsFromPackageJsonField;
        return result;
    };
    const onlyRecordFailuresForPackageFile = packageFile ? !directoryProbablyExists(getDirectoryPath(packageFile), state.host) : undefined;
    const onlyRecordFailuresForIndex = onlyRecordFailures || !directoryProbablyExists(candidate, state.host);
    const indexPath = combinePaths(candidate, state.isConfigLookup ? "tsconfig" : "index");
    if (versionPaths && (!packageFile || containsPath(candidate, packageFile))) {
        const moduleName = getRelativePathFromDirectory(candidate, packageFile || indexPath, /*ignoreCase*/ false);
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2, versionPaths.version, version, moduleName);
        }
        const pathPatterns = tryParsePatterns(versionPaths.paths);
        const result = tryLoadModuleUsingPaths(extensions, moduleName, candidate, versionPaths.paths, pathPatterns, loader, onlyRecordFailuresForPackageFile || onlyRecordFailuresForIndex, state);
        if (result) {
            return removeIgnoredPackageId(result.value);
        }
    }
    // It won't have a `packageId` set, because we disabled `considerPackageJson`.
    const packageFileResult = packageFile && removeIgnoredPackageId(loader(extensions, packageFile, onlyRecordFailuresForPackageFile, state));
    if (packageFileResult)
        return packageFileResult;
    // esm mode resolutions don't do package `index` lookups
    if (!(state.features & NodeResolutionFeatures.EsmMode)) {
        return loadModuleFromFile(extensions, indexPath, onlyRecordFailuresForIndex, state);
    }
}
/** True if `extension` is one of the supported `extensions`. */
function extensionIsOk(extensions, extension) {
    return extensions & 2 /* Extensions.JavaScript */ && (extension === Extension.Js || extension === Extension.Jsx || extension === Extension.Mjs || extension === Extension.Cjs)
        || extensions & 1 /* Extensions.TypeScript */ && (extension === Extension.Ts || extension === Extension.Tsx || extension === Extension.Mts || extension === Extension.Cts)
        || extensions & 4 /* Extensions.Declaration */ && (extension === Extension.Dts || extension === Extension.Dmts || extension === Extension.Dcts)
        || extensions & 8 /* Extensions.Json */ && extension === Extension.Json
        || false;
}
/** @internal */
export function parsePackageName(moduleName) {
    let idx = moduleName.indexOf(directorySeparator);
    if (moduleName[0] === "@") {
        idx = moduleName.indexOf(directorySeparator, idx + 1);
    }
    return idx === -1 ? { packageName: moduleName, rest: "" } : { packageName: moduleName.slice(0, idx), rest: moduleName.slice(idx + 1) };
}
/** @internal */
export function allKeysStartWithDot(obj) {
    return every(getOwnKeys(obj), k => startsWith(k, "."));
}
function noKeyStartsWithDot(obj) {
    return !some(getOwnKeys(obj), k => startsWith(k, "."));
}
function loadModuleFromSelfNameReference(extensions, moduleName, directory, state, cache, redirectedReference) {
    var _a, _b;
    const directoryPath = getNormalizedAbsolutePath(directory, (_b = (_a = state.host).getCurrentDirectory) === null || _b === void 0 ? void 0 : _b.call(_a));
    const scope = getPackageScopeForPath(directoryPath, state);
    if (!scope || !scope.contents.packageJsonContent.exports) {
        return undefined;
    }
    if (typeof scope.contents.packageJsonContent.name !== "string") {
        return undefined;
    }
    const parts = getPathComponents(moduleName); // unrooted paths should have `""` as their 0th entry
    const nameParts = getPathComponents(scope.contents.packageJsonContent.name);
    if (!every(nameParts, (p, i) => parts[i] === p)) {
        return undefined;
    }
    const trailingParts = parts.slice(nameParts.length);
    const subpath = !length(trailingParts) ? "." : `.${directorySeparator}${trailingParts.join(directorySeparator)}`;
    // Maybe TODO: splitting extensions into two priorities should be unnecessary, except
    // https://github.com/microsoft/TypeScript/issues/50762 makes the behavior different.
    // As long as that bug exists, we need to do two passes here in self-name loading
    // in order to be consistent with (non-self) library-name loading in
    // `loadModuleFromNearestNodeModulesDirectoryWorker`, which uses two passes in order
    // to prioritize `@types` packages higher up the directory tree over untyped
    // implementation packages. See the selfNameModuleAugmentation.ts test for why this
    // matters.
    //
    // However, there's an exception. If the user has `allowJs` and `declaration`, we need
    // to ensure that self-name imports of their own package can resolve back to their
    // input JS files via `tryLoadInputFileForPath` at a higher priority than their output
    // declaration files, so we need to do a single pass with all extensions for that case.
    if (getAllowJSCompilerOption(state.compilerOptions) && !pathContainsNodeModules(directory)) {
        return loadModuleFromExports(scope, extensions, subpath, state, cache, redirectedReference);
    }
    const priorityExtensions = extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */);
    const secondaryExtensions = extensions & ~(1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */);
    return loadModuleFromExports(scope, priorityExtensions, subpath, state, cache, redirectedReference)
        || loadModuleFromExports(scope, secondaryExtensions, subpath, state, cache, redirectedReference);
}
function loadModuleFromExports(scope, extensions, subpath, state, cache, redirectedReference) {
    if (!scope.contents.packageJsonContent.exports) {
        return undefined;
    }
    if (subpath === ".") {
        let mainExport;
        if (typeof scope.contents.packageJsonContent.exports === "string" || Array.isArray(scope.contents.packageJsonContent.exports) || (typeof scope.contents.packageJsonContent.exports === "object" && noKeyStartsWithDot(scope.contents.packageJsonContent.exports))) {
            mainExport = scope.contents.packageJsonContent.exports;
        }
        else if (hasProperty(scope.contents.packageJsonContent.exports, ".")) {
            mainExport = scope.contents.packageJsonContent.exports["."];
        }
        if (mainExport) {
            const loadModuleFromTargetExportOrImport = getLoadModuleFromTargetExportOrImport(extensions, state, cache, redirectedReference, subpath, scope, /*isImports*/ false);
            return loadModuleFromTargetExportOrImport(mainExport, "", /*pattern*/ false, ".");
        }
    }
    else if (allKeysStartWithDot(scope.contents.packageJsonContent.exports)) {
        if (typeof scope.contents.packageJsonContent.exports !== "object") {
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.Export_specifier_0_does_not_exist_in_package_json_scope_at_path_1, subpath, scope.packageDirectory);
            }
            return toSearchResult(/*value*/ undefined);
        }
        const result = loadModuleFromExportsOrImports(extensions, state, cache, redirectedReference, subpath, scope.contents.packageJsonContent.exports, scope, /*isImports*/ false);
        if (result) {
            return result;
        }
    }
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.Export_specifier_0_does_not_exist_in_package_json_scope_at_path_1, subpath, scope.packageDirectory);
    }
    return toSearchResult(/*value*/ undefined);
}
function loadModuleFromImports(extensions, moduleName, directory, state, cache, redirectedReference) {
    var _a, _b;
    if (moduleName === "#" || startsWith(moduleName, "#/")) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Invalid_import_specifier_0_has_no_possible_resolutions, moduleName);
        }
        return toSearchResult(/*value*/ undefined);
    }
    const directoryPath = getNormalizedAbsolutePath(directory, (_b = (_a = state.host).getCurrentDirectory) === null || _b === void 0 ? void 0 : _b.call(_a));
    const scope = getPackageScopeForPath(directoryPath, state);
    if (!scope) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Directory_0_has_no_containing_package_json_scope_Imports_will_not_resolve, directoryPath);
        }
        return toSearchResult(/*value*/ undefined);
    }
    if (!scope.contents.packageJsonContent.imports) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_scope_0_has_no_imports_defined, scope.packageDirectory);
        }
        return toSearchResult(/*value*/ undefined);
    }
    const result = loadModuleFromExportsOrImports(extensions, state, cache, redirectedReference, moduleName, scope.contents.packageJsonContent.imports, scope, /*isImports*/ true);
    if (result) {
        return result;
    }
    if (state.traceEnabled) {
        trace(state.host, Diagnostics.Import_specifier_0_does_not_exist_in_package_json_scope_at_path_1, moduleName, scope.packageDirectory);
    }
    return toSearchResult(/*value*/ undefined);
}
/**
 * @internal
 * From https://github.com/nodejs/node/blob/8f39f51cbbd3b2de14b9ee896e26421cc5b20121/lib/internal/modules/esm/resolve.js#L722 -
 * "longest" has some nuance as to what "longest" means in the presence of pattern trailers
 */
export function comparePatternKeys(a, b) {
    const aPatternIndex = a.indexOf("*");
    const bPatternIndex = b.indexOf("*");
    const baseLenA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
    const baseLenB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
    if (baseLenA > baseLenB)
        return Comparison.LessThan;
    if (baseLenB > baseLenA)
        return Comparison.GreaterThan;
    if (aPatternIndex === -1)
        return Comparison.GreaterThan;
    if (bPatternIndex === -1)
        return Comparison.LessThan;
    if (a.length > b.length)
        return Comparison.LessThan;
    if (b.length > a.length)
        return Comparison.GreaterThan;
    return Comparison.EqualTo;
}
function loadModuleFromExportsOrImports(extensions, state, cache, redirectedReference, moduleName, lookupTable, scope, isImports) {
    const loadModuleFromTargetExportOrImport = getLoadModuleFromTargetExportOrImport(extensions, state, cache, redirectedReference, moduleName, scope, isImports);
    if (!endsWith(moduleName, directorySeparator) && !moduleName.includes("*") && hasProperty(lookupTable, moduleName)) {
        const target = lookupTable[moduleName];
        return loadModuleFromTargetExportOrImport(target, /*subpath*/ "", /*pattern*/ false, moduleName);
    }
    const expandingKeys = toSorted(filter(getOwnKeys(lookupTable), k => hasOneAsterisk(k) || endsWith(k, "/")), comparePatternKeys);
    for (const potentialTarget of expandingKeys) {
        if (state.features & NodeResolutionFeatures.ExportsPatternTrailers && matchesPatternWithTrailer(potentialTarget, moduleName)) {
            const target = lookupTable[potentialTarget];
            const starPos = potentialTarget.indexOf("*");
            const subpath = moduleName.substring(potentialTarget.substring(0, starPos).length, moduleName.length - (potentialTarget.length - 1 - starPos));
            return loadModuleFromTargetExportOrImport(target, subpath, /*pattern*/ true, potentialTarget);
        }
        else if (endsWith(potentialTarget, "*") && startsWith(moduleName, potentialTarget.substring(0, potentialTarget.length - 1))) {
            const target = lookupTable[potentialTarget];
            const subpath = moduleName.substring(potentialTarget.length - 1);
            return loadModuleFromTargetExportOrImport(target, subpath, /*pattern*/ true, potentialTarget);
        }
        else if (startsWith(moduleName, potentialTarget)) {
            const target = lookupTable[potentialTarget];
            const subpath = moduleName.substring(potentialTarget.length);
            return loadModuleFromTargetExportOrImport(target, subpath, /*pattern*/ false, potentialTarget);
        }
    }
    function matchesPatternWithTrailer(target, name) {
        if (endsWith(target, "*"))
            return false; // handled by next case in loop
        const starPos = target.indexOf("*");
        if (starPos === -1)
            return false; // handled by last case in loop
        return startsWith(name, target.substring(0, starPos)) && endsWith(name, target.substring(starPos + 1));
    }
}
function hasOneAsterisk(patternKey) {
    const firstStar = patternKey.indexOf("*");
    return firstStar !== -1 && firstStar === patternKey.lastIndexOf("*");
}
/**
 * Gets the self-recursive function specialized to retrieving the targeted import/export element for the given resolution configuration
 */
function getLoadModuleFromTargetExportOrImport(extensions, state, cache, redirectedReference, moduleName, scope, isImports) {
    return loadModuleFromTargetExportOrImport;
    function loadModuleFromTargetExportOrImport(target, subpath, pattern, key) {
        var _a, _b, _c, _d;
        if (typeof target === "string") {
            if (!pattern && subpath.length > 0 && !endsWith(target, "/")) {
                if (state.traceEnabled) {
                    trace(state.host, Diagnostics.package_json_scope_0_has_invalid_type_for_target_of_specifier_1, scope.packageDirectory, moduleName);
                }
                return toSearchResult(/*value*/ undefined);
            }
            if (!startsWith(target, "./")) {
                if (isImports && !startsWith(target, "../") && !startsWith(target, "/") && !isRootedDiskPath(target)) {
                    const combinedLookup = pattern ? target.replace(/\*/g, subpath) : target + subpath;
                    traceIfEnabled(state, Diagnostics.Using_0_subpath_1_with_target_2, "imports", key, combinedLookup);
                    traceIfEnabled(state, Diagnostics.Resolving_module_0_from_1, combinedLookup, scope.packageDirectory + "/");
                    const result = nodeModuleNameResolverWorker(state.features, combinedLookup, scope.packageDirectory + "/", state.compilerOptions, state.host, cache, extensions, /*isConfigLookup*/ false, redirectedReference, state.conditions);
                    // Note: we cannot safely reassign `state.failedLookupLocations` during a request;
                    // `nodeModuleNameResolverWorker` relies on the `state` property remaining reference-equal
                    // to the one it initializes.
                    (_a = state.failedLookupLocations) === null || _a === void 0 ? void 0 : _a.push(...(_b = result.failedLookupLocations) !== null && _b !== void 0 ? _b : emptyArray);
                    (_c = state.affectingLocations) === null || _c === void 0 ? void 0 : _c.push(...(_d = result.affectingLocations) !== null && _d !== void 0 ? _d : emptyArray);
                    return toSearchResult(result.resolvedModule ? {
                        path: result.resolvedModule.resolvedFileName,
                        extension: result.resolvedModule.extension,
                        packageId: result.resolvedModule.packageId,
                        originalPath: result.resolvedModule.originalPath,
                        resolvedUsingTsExtension: result.resolvedModule.resolvedUsingTsExtension,
                    } : undefined);
                }
                if (state.traceEnabled) {
                    trace(state.host, Diagnostics.package_json_scope_0_has_invalid_type_for_target_of_specifier_1, scope.packageDirectory, moduleName);
                }
                return toSearchResult(/*value*/ undefined);
            }
            const parts = pathIsRelative(target) ? getPathComponents(target).slice(1) : getPathComponents(target);
            const partsAfterFirst = parts.slice(1);
            if (partsAfterFirst.includes("..") || partsAfterFirst.includes(".") || partsAfterFirst.includes("node_modules")) {
                if (state.traceEnabled) {
                    trace(state.host, Diagnostics.package_json_scope_0_has_invalid_type_for_target_of_specifier_1, scope.packageDirectory, moduleName);
                }
                return toSearchResult(/*value*/ undefined);
            }
            const resolvedTarget = combinePaths(scope.packageDirectory, target);
            // TODO: Assert that `resolvedTarget` is actually within the package directory? That's what the spec says.... but I'm not sure we need
            // to be in the business of validating everyone's import and export map correctness.
            const subpathParts = getPathComponents(subpath);
            if (subpathParts.includes("..") || subpathParts.includes(".") || subpathParts.includes("node_modules")) {
                if (state.traceEnabled) {
                    trace(state.host, Diagnostics.package_json_scope_0_has_invalid_type_for_target_of_specifier_1, scope.packageDirectory, moduleName);
                }
                return toSearchResult(/*value*/ undefined);
            }
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.Using_0_subpath_1_with_target_2, isImports ? "imports" : "exports", key, pattern ? target.replace(/\*/g, subpath) : target + subpath);
            }
            const finalPath = toAbsolutePath(pattern ? resolvedTarget.replace(/\*/g, subpath) : resolvedTarget + subpath);
            const inputLink = tryLoadInputFileForPath(finalPath, subpath, combinePaths(scope.packageDirectory, "package.json"), isImports);
            if (inputLink)
                return inputLink;
            return toSearchResult(withPackageId(scope, loadFileNameFromPackageJsonField(extensions, finalPath, target, /*onlyRecordFailures*/ false, state), state));
        }
        else if (typeof target === "object" && target !== null) { // eslint-disable-line no-restricted-syntax
            if (!Array.isArray(target)) {
                traceIfEnabled(state, Diagnostics.Entering_conditional_exports);
                for (const condition of getOwnKeys(target)) {
                    if (condition === "default" || state.conditions.includes(condition) || isApplicableVersionedTypesKey(state.conditions, condition)) {
                        traceIfEnabled(state, Diagnostics.Matched_0_condition_1, isImports ? "imports" : "exports", condition);
                        const subTarget = target[condition];
                        const result = loadModuleFromTargetExportOrImport(subTarget, subpath, pattern, key);
                        if (result) {
                            traceIfEnabled(state, Diagnostics.Resolved_under_condition_0, condition);
                            traceIfEnabled(state, Diagnostics.Exiting_conditional_exports);
                            return result;
                        }
                        else {
                            traceIfEnabled(state, Diagnostics.Failed_to_resolve_under_condition_0, condition);
                        }
                    }
                    else {
                        traceIfEnabled(state, Diagnostics.Saw_non_matching_condition_0, condition);
                    }
                }
                traceIfEnabled(state, Diagnostics.Exiting_conditional_exports);
                return undefined;
            }
            else {
                if (!length(target)) {
                    if (state.traceEnabled) {
                        trace(state.host, Diagnostics.package_json_scope_0_has_invalid_type_for_target_of_specifier_1, scope.packageDirectory, moduleName);
                    }
                    return toSearchResult(/*value*/ undefined);
                }
                for (const elem of target) {
                    const result = loadModuleFromTargetExportOrImport(elem, subpath, pattern, key);
                    if (result) {
                        return result;
                    }
                }
            }
        }
        else if (target === null) { // eslint-disable-line no-restricted-syntax
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.package_json_scope_0_explicitly_maps_specifier_1_to_null, scope.packageDirectory, moduleName);
            }
            return toSearchResult(/*value*/ undefined);
        }
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_scope_0_has_invalid_type_for_target_of_specifier_1, scope.packageDirectory, moduleName);
        }
        return toSearchResult(/*value*/ undefined);
        function toAbsolutePath(path) {
            var _a, _b;
            if (path === undefined)
                return path;
            return getNormalizedAbsolutePath(path, (_b = (_a = state.host).getCurrentDirectory) === null || _b === void 0 ? void 0 : _b.call(_a));
        }
        function combineDirectoryPath(root, dir) {
            return ensureTrailingDirectorySeparator(combinePaths(root, dir));
        }
        function tryLoadInputFileForPath(finalPath, entry, packagePath, isImports) {
            var _a, _b, _c, _d;
            // Replace any references to outputs for files in the program with the input files to support package self-names used with outDir
            // PROBLEM: We don't know how to calculate the output paths yet, because the "common source directory" we use as the base of the file structure
            // we reproduce into the output directory is based on the set of input files, which we're still in the process of traversing and resolving!
            // _Given that_, we have to guess what the base of the output directory is (obviously the user wrote the export map, so has some idea what it is!).
            // We are going to probe _so many_ possible paths. We limit where we'll do this to try to reduce the possibilities of false positive lookups.
            if (!state.isConfigLookup
                && (state.compilerOptions.declarationDir || state.compilerOptions.outDir)
                && !finalPath.includes("/node_modules/")
                && (state.compilerOptions.configFile ? containsPath(scope.packageDirectory, toAbsolutePath(state.compilerOptions.configFile.fileName), !useCaseSensitiveFileNames(state)) : true)) {
                // So that all means we'll only try these guesses for files outside `node_modules` in a directory where the `package.json` and `tsconfig.json` are siblings.
                // Even with all that, we still don't know if the root of the output file structure will be (relative to the package file)
                // `.`, `./src` or any other deeper directory structure. (If project references are used, it's definitely `.` by fiat, so that should be pretty common.)
                const getCanonicalFileName = hostGetCanonicalFileName({ useCaseSensitiveFileNames: () => useCaseSensitiveFileNames(state) });
                const commonSourceDirGuesses = [];
                // A `rootDir` compiler option strongly indicates the root location
                // A `composite` project is using project references and has it's common src dir set to `.`, so it shouldn't need to check any other locations
                if (state.compilerOptions.rootDir || (state.compilerOptions.composite && state.compilerOptions.configFilePath)) {
                    const commonDir = toAbsolutePath(getCommonSourceDirectory(state.compilerOptions, () => [], ((_b = (_a = state.host).getCurrentDirectory) === null || _b === void 0 ? void 0 : _b.call(_a)) || "", getCanonicalFileName));
                    commonSourceDirGuesses.push(commonDir);
                }
                else if (state.requestContainingDirectory) {
                    // However without either of those set we're in the dark. Let's say you have
                    //
                    // ./tools/index.ts
                    // ./src/index.ts
                    // ./dist/index.js
                    // ./package.json <-- references ./dist/index.js
                    // ./tsconfig.json <-- loads ./src/index.ts
                    //
                    // How do we know `./src` is the common src dir, and not `./tools`, given only the `./dist` out dir and `./dist/index.js` filename?
                    // Answer: We... don't. We know we're looking for an `index.ts` input file, but we have _no clue_ which subfolder it's supposed to be loaded from
                    // without more context.
                    // But we do have more context! Just a tiny bit more! We're resolving an import _for some other input file_! And that input file, too
                    // must be inside the common source directory! So we propagate that tidbit of info all the way to here via state.requestContainingDirectory
                    const requestingFile = toAbsolutePath(combinePaths(state.requestContainingDirectory, "index.ts"));
                    // And we can try every folder above the common folder for the request folder and the config/package base directory
                    // This technically can be wrong - we may load ./src/index.ts when ./src/sub/index.ts was right because we don't
                    // know if only `./src/sub` files were loaded by the program; but this has the best chance to be right of just about anything
                    // else we have. And, given that we're about to load `./src/index.ts` because we choose it as likely correct, there will then
                    // be a file outside of `./src/sub` in the program (the file we resolved to), making us de-facto right. So this fallback lookup
                    // logic may influence what files are pulled in by self-names, which in turn influences the output path shape, but it's all
                    // internally consistent so the paths should be stable so long as we prefer the "most general" (meaning: top-most-level directory) possible results first.
                    const commonDir = toAbsolutePath(getCommonSourceDirectory(state.compilerOptions, () => [requestingFile, toAbsolutePath(packagePath)], ((_d = (_c = state.host).getCurrentDirectory) === null || _d === void 0 ? void 0 : _d.call(_c)) || "", getCanonicalFileName));
                    commonSourceDirGuesses.push(commonDir);
                    let fragment = ensureTrailingDirectorySeparator(commonDir);
                    while (fragment && fragment.length > 1) {
                        const parts = getPathComponents(fragment);
                        parts.pop(); // remove a directory
                        const commonDir = getPathFromPathComponents(parts);
                        commonSourceDirGuesses.unshift(commonDir);
                        fragment = ensureTrailingDirectorySeparator(commonDir);
                    }
                }
                if (commonSourceDirGuesses.length > 1) {
                    state.reportDiagnostic(createCompilerDiagnostic(isImports
                        ? Diagnostics.The_project_root_is_ambiguous_but_is_required_to_resolve_import_map_entry_0_in_file_1_Supply_the_rootDir_compiler_option_to_disambiguate
                        : Diagnostics.The_project_root_is_ambiguous_but_is_required_to_resolve_export_map_entry_0_in_file_1_Supply_the_rootDir_compiler_option_to_disambiguate, entry === "" ? "." : entry, // replace empty string with `.` - the reverse of the operation done when entries are built - so main entrypoint errors don't look weird
                    packagePath));
                }
                for (const commonSourceDirGuess of commonSourceDirGuesses) {
                    const candidateDirectories = getOutputDirectoriesForBaseDirectory(commonSourceDirGuess);
                    for (const candidateDir of candidateDirectories) {
                        if (containsPath(candidateDir, finalPath, !useCaseSensitiveFileNames(state))) {
                            // The matched export is looking up something in either the out declaration or js dir, now map the written path back into the source dir and source extension
                            const pathFragment = finalPath.slice(candidateDir.length + 1); // +1 to also remove directory seperator
                            const possibleInputBase = combinePaths(commonSourceDirGuess, pathFragment);
                            const jsAndDtsExtensions = [Extension.Mjs, Extension.Cjs, Extension.Js, Extension.Json, Extension.Dmts, Extension.Dcts, Extension.Dts];
                            for (const ext of jsAndDtsExtensions) {
                                if (fileExtensionIs(possibleInputBase, ext)) {
                                    const inputExts = getPossibleOriginalInputExtensionForExtension(possibleInputBase);
                                    for (const possibleExt of inputExts) {
                                        if (!extensionIsOk(extensions, possibleExt))
                                            continue;
                                        const possibleInputWithInputExtension = changeAnyExtension(possibleInputBase, possibleExt, ext, !useCaseSensitiveFileNames(state));
                                        if (state.host.fileExists(possibleInputWithInputExtension)) {
                                            return toSearchResult(withPackageId(scope, loadFileNameFromPackageJsonField(extensions, possibleInputWithInputExtension, /*packageJsonValue*/ undefined, /*onlyRecordFailures*/ false, state), state));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return undefined;
            function getOutputDirectoriesForBaseDirectory(commonSourceDirGuess) {
                var _a, _b;
                // Config file ouput paths are processed to be relative to the host's current directory, while
                // otherwise the paths are resolved relative to the common source dir the compiler puts together
                const currentDir = state.compilerOptions.configFile ? ((_b = (_a = state.host).getCurrentDirectory) === null || _b === void 0 ? void 0 : _b.call(_a)) || "" : commonSourceDirGuess;
                const candidateDirectories = [];
                if (state.compilerOptions.declarationDir) {
                    candidateDirectories.push(toAbsolutePath(combineDirectoryPath(currentDir, state.compilerOptions.declarationDir)));
                }
                if (state.compilerOptions.outDir && state.compilerOptions.outDir !== state.compilerOptions.declarationDir) {
                    candidateDirectories.push(toAbsolutePath(combineDirectoryPath(currentDir, state.compilerOptions.outDir)));
                }
                return candidateDirectories;
            }
        }
    }
}
/** @internal */
export function isApplicableVersionedTypesKey(conditions, key) {
    if (!conditions.includes("types"))
        return false; // only apply versioned types conditions if the types condition is applied
    if (!startsWith(key, "types@"))
        return false;
    const range = VersionRange.tryParse(key.substring("types@".length));
    if (!range)
        return false;
    return range.test(version);
}
function loadModuleFromNearestNodeModulesDirectory(extensions, moduleName, directory, state, cache, redirectedReference) {
    return loadModuleFromNearestNodeModulesDirectoryWorker(extensions, moduleName, directory, state, /*typesScopeOnly*/ false, cache, redirectedReference);
}
function loadModuleFromNearestNodeModulesDirectoryTypesScope(moduleName, directory, state) {
    // Extensions parameter here doesn't actually matter, because typesOnly ensures we're just doing @types lookup, which is always DtsOnly.
    return loadModuleFromNearestNodeModulesDirectoryWorker(4 /* Extensions.Declaration */, moduleName, directory, state, /*typesScopeOnly*/ true, /*cache*/ undefined, /*redirectedReference*/ undefined);
}
function loadModuleFromNearestNodeModulesDirectoryWorker(extensions, moduleName, directory, state, typesScopeOnly, cache, redirectedReference) {
    const mode = state.features === 0 ? undefined : (state.features & NodeResolutionFeatures.EsmMode || state.conditions.includes("import")) ? ModuleKind.ESNext : ModuleKind.CommonJS;
    // Do (up to) two passes through node_modules:
    //   1. For each ancestor node_modules directory, try to find:
    //      i.  TS/DTS files in the implementation package
    //      ii. DTS files in the @types package
    //   2. For each ancestor node_modules directory, try to find:
    //      i.  JS files in the implementation package
    const priorityExtensions = extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */);
    const secondaryExtensions = extensions & ~(1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */);
    // (1)
    if (priorityExtensions) {
        traceIfEnabled(state, Diagnostics.Searching_all_ancestor_node_modules_directories_for_preferred_extensions_Colon_0, formatExtensions(priorityExtensions));
        const result = lookup(priorityExtensions);
        if (result)
            return result;
    }
    // (2)
    if (secondaryExtensions && !typesScopeOnly) {
        traceIfEnabled(state, Diagnostics.Searching_all_ancestor_node_modules_directories_for_fallback_extensions_Colon_0, formatExtensions(secondaryExtensions));
        return lookup(secondaryExtensions);
    }
    function lookup(extensions) {
        return forEachAncestorDirectoryStoppingAtGlobalCache(state.host, normalizeSlashes(directory), ancestorDirectory => {
            // Dont go past global cache location
            if (getBaseFileName(ancestorDirectory) !== "node_modules") {
                const resolutionFromCache = tryFindNonRelativeModuleNameInCache(cache, moduleName, mode, ancestorDirectory, redirectedReference, state);
                if (resolutionFromCache) {
                    return resolutionFromCache;
                }
                return toSearchResult(loadModuleFromImmediateNodeModulesDirectory(extensions, moduleName, ancestorDirectory, state, typesScopeOnly, cache, redirectedReference));
            }
        });
    }
}
/**
 * Calls `callback` on `directory` and every ancestor directory it has, returning the first defined result.
 * Stops at global cache location
 * @internal
 */
export function forEachAncestorDirectoryStoppingAtGlobalCache(host, directory, callback) {
    var _a;
    const globalCache = (_a = host === null || host === void 0 ? void 0 : host.getGlobalTypingsCacheLocation) === null || _a === void 0 ? void 0 : _a.call(host);
    return forEachAncestorDirectory(directory, ancestorDirectory => {
        const result = callback(ancestorDirectory);
        if (result !== undefined)
            return result;
        if (ancestorDirectory === globalCache)
            return false;
    }) || undefined;
}
function loadModuleFromImmediateNodeModulesDirectory(extensions, moduleName, directory, state, typesScopeOnly, cache, redirectedReference) {
    const nodeModulesFolder = combinePaths(directory, "node_modules");
    const nodeModulesFolderExists = directoryProbablyExists(nodeModulesFolder, state.host);
    if (!nodeModulesFolderExists && state.traceEnabled) {
        trace(state.host, Diagnostics.Directory_0_does_not_exist_skipping_all_lookups_in_it, nodeModulesFolder);
    }
    if (!typesScopeOnly) {
        const packageResult = loadModuleFromSpecificNodeModulesDirectory(extensions, moduleName, nodeModulesFolder, nodeModulesFolderExists, state, cache, redirectedReference);
        if (packageResult) {
            return packageResult;
        }
    }
    if (extensions & 4 /* Extensions.Declaration */) {
        const nodeModulesAtTypes = combinePaths(nodeModulesFolder, "@types");
        let nodeModulesAtTypesExists = nodeModulesFolderExists;
        if (nodeModulesFolderExists && !directoryProbablyExists(nodeModulesAtTypes, state.host)) {
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.Directory_0_does_not_exist_skipping_all_lookups_in_it, nodeModulesAtTypes);
            }
            nodeModulesAtTypesExists = false;
        }
        return loadModuleFromSpecificNodeModulesDirectory(4 /* Extensions.Declaration */, mangleScopedPackageNameWithTrace(moduleName, state), nodeModulesAtTypes, nodeModulesAtTypesExists, state, cache, redirectedReference);
    }
}
function loadModuleFromSpecificNodeModulesDirectory(extensions, moduleName, nodeModulesDirectory, nodeModulesDirectoryExists, state, cache, redirectedReference) {
    var _a, _b, _c;
    const candidate = normalizePath(combinePaths(nodeModulesDirectory, moduleName));
    const { packageName, rest } = parsePackageName(moduleName);
    const packageDirectory = combinePaths(nodeModulesDirectory, packageName);
    let rootPackageInfo;
    // First look for a nested package.json, as in `node_modules/foo/bar/package.json`.
    let packageInfo = getPackageJsonInfo(candidate, !nodeModulesDirectoryExists, state);
    // But only if we're not respecting export maps (if we are, we might redirect around this location)
    if (rest !== "" && packageInfo && (!(state.features & NodeResolutionFeatures.Exports) ||
        !hasProperty((_b = (_a = (rootPackageInfo = getPackageJsonInfo(packageDirectory, !nodeModulesDirectoryExists, state))) === null || _a === void 0 ? void 0 : _a.contents.packageJsonContent) !== null && _b !== void 0 ? _b : emptyArray, "exports"))) {
        const fromFile = loadModuleFromFile(extensions, candidate, !nodeModulesDirectoryExists, state);
        if (fromFile) {
            return noPackageId(fromFile);
        }
        const fromDirectory = loadNodeModuleFromDirectoryWorker(extensions, candidate, !nodeModulesDirectoryExists, state, packageInfo);
        return withPackageId(packageInfo, fromDirectory, state);
    }
    const loader = (extensions, candidate, onlyRecordFailures, state) => {
        let pathAndExtension = (rest || !(state.features & NodeResolutionFeatures.EsmMode)) && loadModuleFromFile(extensions, candidate, onlyRecordFailures, state) ||
            loadNodeModuleFromDirectoryWorker(extensions, candidate, onlyRecordFailures, state, packageInfo);
        if (!pathAndExtension && !rest && packageInfo
            // eslint-disable-next-line no-restricted-syntax
            && (packageInfo.contents.packageJsonContent.exports === undefined || packageInfo.contents.packageJsonContent.exports === null)
            && state.features & NodeResolutionFeatures.EsmMode) {
            // EsmMode disables index lookup in `loadNodeModuleFromDirectoryWorker` generally, however non-relative package resolutions still assume
            // a default `index.js` entrypoint if no `main` or `exports` are present
            pathAndExtension = loadModuleFromFile(extensions, combinePaths(candidate, "index.js"), onlyRecordFailures, state);
        }
        return withPackageId(packageInfo, pathAndExtension, state);
    };
    if (rest !== "") {
        // Previous `packageInfo` may have been from a nested package.json; ensure we have the one from the package root now.
        packageInfo = rootPackageInfo !== null && rootPackageInfo !== void 0 ? rootPackageInfo : getPackageJsonInfo(packageDirectory, !nodeModulesDirectoryExists, state);
    }
    if (packageInfo) {
        state.resolvedPackageDirectory = true;
    }
    // package exports are higher priority than file/directory/typesVersions lookups and (and, if there's exports present, blocks them)
    if (packageInfo && packageInfo.contents.packageJsonContent.exports && state.features & NodeResolutionFeatures.Exports) {
        return (_c = loadModuleFromExports(packageInfo, extensions, combinePaths(".", rest), state, cache, redirectedReference)) === null || _c === void 0 ? void 0 : _c.value;
    }
    const versionPaths = rest !== "" && packageInfo ? getVersionPathsOfPackageJsonInfo(packageInfo, state) : undefined;
    if (versionPaths) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2, versionPaths.version, version, rest);
        }
        const packageDirectoryExists = nodeModulesDirectoryExists && directoryProbablyExists(packageDirectory, state.host);
        const pathPatterns = tryParsePatterns(versionPaths.paths);
        const fromPaths = tryLoadModuleUsingPaths(extensions, rest, packageDirectory, versionPaths.paths, pathPatterns, loader, !packageDirectoryExists, state);
        if (fromPaths) {
            return fromPaths.value;
        }
    }
    return loader(extensions, candidate, !nodeModulesDirectoryExists, state);
}
function tryLoadModuleUsingPaths(extensions, moduleName, baseDirectory, paths, pathPatterns, loader, onlyRecordFailures, state) {
    const matchedPattern = matchPatternOrExact(pathPatterns, moduleName);
    if (matchedPattern) {
        const matchedStar = isString(matchedPattern) ? undefined : matchedText(matchedPattern, moduleName);
        const matchedPatternText = isString(matchedPattern) ? matchedPattern : patternText(matchedPattern);
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Module_name_0_matched_pattern_1, moduleName, matchedPatternText);
        }
        const resolved = forEach(paths[matchedPatternText], subst => {
            const path = matchedStar ? replaceFirstStar(subst, matchedStar) : subst;
            // When baseUrl is not specified, the command line parser resolves relative paths to the config file location.
            const candidate = normalizePath(combinePaths(baseDirectory, path));
            if (state.traceEnabled) {
                trace(state.host, Diagnostics.Trying_substitution_0_candidate_module_location_Colon_1, subst, path);
            }
            // A path mapping may have an extension, in contrast to an import, which should omit it.
            const extension = tryGetExtensionFromPath(subst);
            if (extension !== undefined) {
                const path = tryFile(candidate, onlyRecordFailures, state);
                if (path !== undefined) {
                    return noPackageId({ path, ext: extension, resolvedUsingTsExtension: undefined });
                }
            }
            return loader(extensions, candidate, onlyRecordFailures || !directoryProbablyExists(getDirectoryPath(candidate), state.host), state);
        });
        return { value: resolved };
    }
}
/** Double underscores are used in DefinitelyTyped to delimit scoped packages. */
const mangledScopedPackageSeparator = "__";
/** For a scoped package, we must look in `@types/foo__bar` instead of `@types/@foo/bar`. */
function mangleScopedPackageNameWithTrace(packageName, state) {
    const mangled = mangleScopedPackageName(packageName);
    if (state.traceEnabled && mangled !== packageName) {
        trace(state.host, Diagnostics.Scoped_package_detected_looking_in_0, mangled);
    }
    return mangled;
}
/** @internal */
export function getTypesPackageName(packageName) {
    return `@types/${mangleScopedPackageName(packageName)}`;
}
/** @internal */
export function mangleScopedPackageName(packageName) {
    if (startsWith(packageName, "@")) {
        const replaceSlash = packageName.replace(directorySeparator, mangledScopedPackageSeparator);
        if (replaceSlash !== packageName) {
            return replaceSlash.slice(1); // Take off the "@"
        }
    }
    return packageName;
}
/** @internal */
export function getPackageNameFromTypesPackageName(mangledName) {
    const withoutAtTypePrefix = removePrefix(mangledName, "@types/");
    if (withoutAtTypePrefix !== mangledName) {
        return unmangleScopedPackageName(withoutAtTypePrefix);
    }
    return mangledName;
}
/** @internal */
export function unmangleScopedPackageName(typesPackageName) {
    return typesPackageName.includes(mangledScopedPackageSeparator) ?
        "@" + typesPackageName.replace(mangledScopedPackageSeparator, directorySeparator) :
        typesPackageName;
}
function tryFindNonRelativeModuleNameInCache(cache, moduleName, mode, containingDirectory, redirectedReference, state) {
    const result = cache && cache.getFromNonRelativeNameCache(moduleName, mode, containingDirectory, redirectedReference);
    if (result) {
        if (state.traceEnabled) {
            trace(state.host, Diagnostics.Resolution_for_module_0_was_found_in_cache_from_location_1, moduleName, containingDirectory);
        }
        state.resultFromCache = result;
        return {
            value: result.resolvedModule && {
                path: result.resolvedModule.resolvedFileName,
                originalPath: result.resolvedModule.originalPath || true,
                extension: result.resolvedModule.extension,
                packageId: result.resolvedModule.packageId,
                resolvedUsingTsExtension: result.resolvedModule.resolvedUsingTsExtension,
            },
        };
    }
}
export function classicNameResolver(moduleName, containingFile, compilerOptions, host, cache, redirectedReference) {
    const traceEnabled = isTraceEnabled(compilerOptions, host);
    const failedLookupLocations = [];
    const affectingLocations = [];
    const containingDirectory = getDirectoryPath(containingFile);
    const diagnostics = [];
    const state = {
        compilerOptions,
        host,
        traceEnabled,
        failedLookupLocations,
        affectingLocations,
        packageJsonInfoCache: cache,
        features: NodeResolutionFeatures.None,
        conditions: [],
        requestContainingDirectory: containingDirectory,
        reportDiagnostic: diag => void diagnostics.push(diag),
        isConfigLookup: false,
        candidateIsFromPackageJsonField: false,
        resolvedPackageDirectory: false,
    };
    const resolved = tryResolve(1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */) ||
        tryResolve(2 /* Extensions.JavaScript */ | (compilerOptions.resolveJsonModule ? 8 /* Extensions.Json */ : 0));
    // No originalPath because classic resolution doesn't resolve realPath
    return createResolvedModuleWithFailedLookupLocationsHandlingSymlink(moduleName, resolved && resolved.value, (resolved === null || resolved === void 0 ? void 0 : resolved.value) && pathContainsNodeModules(resolved.value.path), failedLookupLocations, affectingLocations, diagnostics, state, cache);
    function tryResolve(extensions) {
        const resolvedUsingSettings = tryLoadModuleUsingOptionalResolutionSettings(extensions, moduleName, containingDirectory, loadModuleFromFileNoPackageId, state);
        if (resolvedUsingSettings) {
            return { value: resolvedUsingSettings };
        }
        if (!isExternalModuleNameRelative(moduleName)) {
            // Climb up parent directories looking for a module.
            const resolved = forEachAncestorDirectoryStoppingAtGlobalCache(state.host, containingDirectory, directory => {
                const resolutionFromCache = tryFindNonRelativeModuleNameInCache(cache, moduleName, /*mode*/ undefined, directory, redirectedReference, state);
                if (resolutionFromCache) {
                    return resolutionFromCache;
                }
                const searchName = normalizePath(combinePaths(directory, moduleName));
                return toSearchResult(loadModuleFromFileNoPackageId(extensions, searchName, /*onlyRecordFailures*/ false, state));
            });
            if (resolved)
                return resolved;
            if (extensions & (1 /* Extensions.TypeScript */ | 4 /* Extensions.Declaration */)) {
                // If we didn't find the file normally, look it up in @types.
                let resolved = loadModuleFromNearestNodeModulesDirectoryTypesScope(moduleName, containingDirectory, state);
                if (extensions & 4 /* Extensions.Declaration */)
                    resolved !== null && resolved !== void 0 ? resolved : (resolved = resolveFromTypeRoot(moduleName, state));
                return resolved;
            }
        }
        else {
            const candidate = normalizePath(combinePaths(containingDirectory, moduleName));
            return toSearchResult(loadModuleFromFileNoPackageId(extensions, candidate, /*onlyRecordFailures*/ false, state));
        }
    }
}
function resolveFromTypeRoot(moduleName, state) {
    if (!state.compilerOptions.typeRoots)
        return;
    for (const typeRoot of state.compilerOptions.typeRoots) {
        const candidate = getCandidateFromTypeRoot(typeRoot, moduleName, state);
        const directoryExists = directoryProbablyExists(typeRoot, state.host);
        if (!directoryExists && state.traceEnabled) {
            trace(state.host, Diagnostics.Directory_0_does_not_exist_skipping_all_lookups_in_it, typeRoot);
        }
        const resolvedFromFile = loadModuleFromFile(4 /* Extensions.Declaration */, candidate, !directoryExists, state);
        if (resolvedFromFile) {
            const packageDirectory = parseNodeModuleFromPath(resolvedFromFile.path);
            const packageInfo = packageDirectory ? getPackageJsonInfo(packageDirectory, /*onlyRecordFailures*/ false, state) : undefined;
            return toSearchResult(withPackageId(packageInfo, resolvedFromFile, state));
        }
        const resolved = loadNodeModuleFromDirectory(4 /* Extensions.Declaration */, candidate, !directoryExists, state);
        if (resolved)
            return toSearchResult(resolved);
    }
}
// Program errors validate that `noEmit` or `emitDeclarationOnly` is also set,
// so this function doesn't check them to avoid propagating errors.
/** @internal */
export function shouldAllowImportingTsExtension(compilerOptions, fromFileName) {
    return getAllowImportingTsExtensions(compilerOptions) || !!fromFileName && isDeclarationFileName(fromFileName);
}
/**
 * A host may load a module from a global cache of typings.
 * This is the minumum code needed to expose that functionality; the rest is in the host.
 *
 * @internal
 */
export function loadModuleFromGlobalCache(moduleName, projectName, compilerOptions, host, globalCache, packageJsonInfoCache) {
    const traceEnabled = isTraceEnabled(compilerOptions, host);
    if (traceEnabled) {
        trace(host, Diagnostics.Auto_discovery_for_typings_is_enabled_in_project_0_Running_extra_resolution_pass_for_module_1_using_cache_location_2, projectName, moduleName, globalCache);
    }
    const failedLookupLocations = [];
    const affectingLocations = [];
    const diagnostics = [];
    const state = {
        compilerOptions,
        host,
        traceEnabled,
        failedLookupLocations,
        affectingLocations,
        packageJsonInfoCache,
        features: NodeResolutionFeatures.None,
        conditions: [],
        requestContainingDirectory: undefined,
        reportDiagnostic: diag => void diagnostics.push(diag),
        isConfigLookup: false,
        candidateIsFromPackageJsonField: false,
        resolvedPackageDirectory: false,
    };
    const resolved = loadModuleFromImmediateNodeModulesDirectory(4 /* Extensions.Declaration */, moduleName, globalCache, state, /*typesScopeOnly*/ false, /*cache*/ undefined, /*redirectedReference*/ undefined);
    return createResolvedModuleWithFailedLookupLocations(resolved, 
    /*isExternalLibraryImport*/ true, failedLookupLocations, affectingLocations, diagnostics, state.resultFromCache, 
    /*cache*/ undefined);
}
/**
 * Wraps value to SearchResult.
 * @returns undefined if value is undefined or { value } otherwise
 */
function toSearchResult(value) {
    return value !== undefined ? { value } : undefined;
}
function traceIfEnabled(state, diagnostic, ...args) {
    if (state.traceEnabled) {
        trace(state.host, diagnostic, ...args);
    }
}
function useCaseSensitiveFileNames(state) {
    return !state.host.useCaseSensitiveFileNames ? true :
        typeof state.host.useCaseSensitiveFileNames === "boolean" ? state.host.useCaseSensitiveFileNames :
            state.host.useCaseSensitiveFileNames();
}
