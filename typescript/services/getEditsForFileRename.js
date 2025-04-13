import {
  combinePaths,
  createGetCanonicalFileName,
  createModuleSpecifierResolutionHost,
  createRange,
  Debug,
  emptyArray,
  endsWith,
  ensurePathIsNonModuleName,
  factory,
  find,
  forEach,
  getDirectoryPath,
  getFileMatcherPatterns,
  getOptionFromName,
  getRegexFromPattern,
  getRelativePathFromDirectory,
  getRelativePathFromFile,
  getTsConfigObjectLiteralExpression,
  hostUsesCaseSensitiveFileNames,
  isAmbientModule,
  isArrayLiteralExpression,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isSourceFile,
  isStringLiteral,
  last,
  mapDefined,
  moduleSpecifiers,
  normalizePath,
  pathIsRelative,
  resolveModuleName,
  textChanges,
  tryRemoveDirectoryPrefix,
} from "./_namespaces/ts.js";


/** @internal */
export function getEditsForFileRename(program, oldFileOrDirPath, newFileOrDirPath, host, formatContext, preferences, sourceMapper) {
    const useCaseSensitiveFileNames = hostUsesCaseSensitiveFileNames(host);
    const getCanonicalFileName = createGetCanonicalFileName(useCaseSensitiveFileNames);
    const oldToNew = getPathUpdater(oldFileOrDirPath, newFileOrDirPath, getCanonicalFileName, sourceMapper);
    const newToOld = getPathUpdater(newFileOrDirPath, oldFileOrDirPath, getCanonicalFileName, sourceMapper);
    return textChanges.ChangeTracker.with({ host, formatContext, preferences }, changeTracker => {
        updateTsconfigFiles(program, changeTracker, oldToNew, oldFileOrDirPath, newFileOrDirPath, host.getCurrentDirectory(), useCaseSensitiveFileNames);
        updateImports(program, changeTracker, oldToNew, newToOld, host, getCanonicalFileName);
    });
}

// exported for tests
/** @internal */
export function getPathUpdater(oldFileOrDirPath, newFileOrDirPath, getCanonicalFileName, sourceMapper) {
    const canonicalOldPath = getCanonicalFileName(oldFileOrDirPath);
    return path => {
        const originalPath = sourceMapper && sourceMapper.tryGetSourcePosition({ fileName: path, pos: 0 });
        const updatedPath = getUpdatedPath(originalPath ? originalPath.fileName : path);
        return originalPath
            ? updatedPath === undefined ? undefined : makeCorrespondingRelativeChange(originalPath.fileName, updatedPath, path, getCanonicalFileName)
            : updatedPath;
    };
    function getUpdatedPath(pathToUpdate) {
        if (getCanonicalFileName(pathToUpdate) === canonicalOldPath)
            return newFileOrDirPath;
        const suffix = tryRemoveDirectoryPrefix(pathToUpdate, canonicalOldPath, getCanonicalFileName);
        return suffix === undefined ? undefined : newFileOrDirPath + "/" + suffix;
    }
}
// Relative path from a0 to b0 should be same as relative path from a1 to b1. Returns b1.
function makeCorrespondingRelativeChange(a0, b0, a1, getCanonicalFileName) {
    const rel = getRelativePathFromFile(a0, b0, getCanonicalFileName);
    return combinePathsSafe(getDirectoryPath(a1), rel);
}
function updateTsconfigFiles(program, changeTracker, oldToNew, oldFileOrDirPath, newFileOrDirPath, currentDirectory, useCaseSensitiveFileNames) {
    const { configFile } = program.getCompilerOptions();
    if (!configFile)
        return;
    const configDir = getDirectoryPath(configFile.fileName);
    const jsonObjectLiteral = getTsConfigObjectLiteralExpression(configFile);
    if (!jsonObjectLiteral)
        return;
    forEachProperty(jsonObjectLiteral, (property, propertyName) => {
        switch (propertyName) {
            case "files":
            case "include":
            case "exclude": {
                const foundExactMatch = updatePaths(property);
                if (foundExactMatch || propertyName !== "include" || !isArrayLiteralExpression(property.initializer))
                    return;
                const includes = mapDefined(property.initializer.elements, e => isStringLiteral(e) ? e.text : undefined);
                if (includes.length === 0)
                    return;
                const matchers = getFileMatcherPatterns(configDir, /*excludes*/ [], includes, useCaseSensitiveFileNames, currentDirectory);
                // If there isn't some include for this, add a new one.
                if (getRegexFromPattern(Debug.checkDefined(matchers.includeFilePattern), useCaseSensitiveFileNames).test(oldFileOrDirPath) &&
                    !getRegexFromPattern(Debug.checkDefined(matchers.includeFilePattern), useCaseSensitiveFileNames).test(newFileOrDirPath)) {
                    changeTracker.insertNodeAfter(configFile, last(property.initializer.elements), factory.createStringLiteral(relativePath(newFileOrDirPath)));
                }
                return;
            }
            case "compilerOptions":
                forEachProperty(property.initializer, (property, propertyName) => {
                    const option = getOptionFromName(propertyName);
                    Debug.assert((option === null || option === void 0 ? void 0 : option.type) !== "listOrElement");
                    if (option && (option.isFilePath || option.type === "list" && option.element.isFilePath)) {
                        updatePaths(property);
                    }
                    else if (propertyName === "paths") {
                        forEachProperty(property.initializer, pathsProperty => {
                            if (!isArrayLiteralExpression(pathsProperty.initializer))
                                return;
                            for (const e of pathsProperty.initializer.elements) {
                                tryUpdateString(e);
                            }
                        });
                    }
                });
                return;
        }
    });
    function updatePaths(property) {
        const elements = isArrayLiteralExpression(property.initializer) ? property.initializer.elements : [property.initializer];
        let foundExactMatch = false;
        for (const element of elements) {
            foundExactMatch = tryUpdateString(element) || foundExactMatch;
        }
        return foundExactMatch;
    }
    function tryUpdateString(element) {
        if (!isStringLiteral(element))
            return false;
        const elementFileName = combinePathsSafe(configDir, element.text);
        const updated = oldToNew(elementFileName);
        if (updated !== undefined) {
            changeTracker.replaceRangeWithText(configFile, createStringRange(element, configFile), relativePath(updated));
            return true;
        }
        return false;
    }
    function relativePath(path) {
        return getRelativePathFromDirectory(configDir, path, /*ignoreCase*/ !useCaseSensitiveFileNames);
    }
}
function updateImports(program, changeTracker, oldToNew, newToOld, host, getCanonicalFileName) {
    const allFiles = program.getSourceFiles();
    for (const sourceFile of allFiles) {
        const newFromOld = oldToNew(sourceFile.fileName);
        const newImportFromPath = newFromOld !== null && newFromOld !== void 0 ? newFromOld : sourceFile.fileName;
        const newImportFromDirectory = getDirectoryPath(newImportFromPath);
        const oldFromNew = newToOld(sourceFile.fileName);
        const oldImportFromPath = oldFromNew || sourceFile.fileName;
        const oldImportFromDirectory = getDirectoryPath(oldImportFromPath);
        const importingSourceFileMoved = newFromOld !== undefined || oldFromNew !== undefined;
        updateImportsWorker(sourceFile, changeTracker, referenceText => {
            if (!pathIsRelative(referenceText))
                return undefined;
            const oldAbsolute = combinePathsSafe(oldImportFromDirectory, referenceText);
            const newAbsolute = oldToNew(oldAbsolute);
            return newAbsolute === undefined ? undefined : ensurePathIsNonModuleName(getRelativePathFromDirectory(newImportFromDirectory, newAbsolute, getCanonicalFileName));
        }, importLiteral => {
            const importedModuleSymbol = program.getTypeChecker().getSymbolAtLocation(importLiteral);
            // No need to update if it's an ambient module^M
            if ((importedModuleSymbol === null || importedModuleSymbol === void 0 ? void 0 : importedModuleSymbol.declarations) && importedModuleSymbol.declarations.some(d => isAmbientModule(d)))
                return undefined;
            const toImport = oldFromNew !== undefined
                // If we're at the new location (file was already renamed), need to redo module resolution starting from the old location.
                // TODO:GH#18217
                ? getSourceFileToImportFromResolved(importLiteral, resolveModuleName(importLiteral.text, oldImportFromPath, program.getCompilerOptions(), host), oldToNew, allFiles)
                : getSourceFileToImport(importedModuleSymbol, importLiteral, sourceFile, program, host, oldToNew);
            // Need an update if the imported file moved, or the importing file moved and was using a relative path.
            return toImport !== undefined && (toImport.updated || (importingSourceFileMoved && pathIsRelative(importLiteral.text)))
                ? moduleSpecifiers.updateModuleSpecifier(program.getCompilerOptions(), sourceFile, newImportFromPath, toImport.newFileName, createModuleSpecifierResolutionHost(program, host), importLiteral.text)
                : undefined;
        });
    }
}
function combineNormal(pathA, pathB) {
    return normalizePath(combinePaths(pathA, pathB));
}
function combinePathsSafe(pathA, pathB) {
    return ensurePathIsNonModuleName(combineNormal(pathA, pathB));
}
function getSourceFileToImport(importedModuleSymbol, importLiteral, importingSourceFile, program, host, oldToNew) {
    if (importedModuleSymbol) {
        // `find` should succeed because we checked for ambient modules before calling this function.
        const oldFileName = find(importedModuleSymbol.declarations, isSourceFile).fileName;
        const newFileName = oldToNew(oldFileName);
        return newFileName === undefined ? { newFileName: oldFileName, updated: false } : { newFileName, updated: true };
    }
    else {
        const mode = program.getModeForUsageLocation(importingSourceFile, importLiteral);
        const resolved = host.resolveModuleNameLiterals || !host.resolveModuleNames ?
            program.getResolvedModuleFromModuleSpecifier(importLiteral, importingSourceFile) :
            host.getResolvedModuleWithFailedLookupLocationsFromCache && host.getResolvedModuleWithFailedLookupLocationsFromCache(importLiteral.text, importingSourceFile.fileName, mode);
        return getSourceFileToImportFromResolved(importLiteral, resolved, oldToNew, program.getSourceFiles());
    }
}
function getSourceFileToImportFromResolved(importLiteral, resolved, oldToNew, sourceFiles) {
    // Search through all locations looking for a moved file, and only then test already existing files.
    // This is because if `a.ts` is compiled to `a.js` and `a.ts` is moved, we don't want to resolve anything to `a.js`, but to `a.ts`'s new location.
    if (!resolved)
        return undefined;
    // First try resolved module
    if (resolved.resolvedModule) {
        const result = tryChange(resolved.resolvedModule.resolvedFileName);
        if (result)
            return result;
    }
    // Then failed lookups that are in the list of sources
    const result = forEach(resolved.failedLookupLocations, tryChangeWithIgnoringPackageJsonExisting)
        // Then failed lookups except package.json since we dont want to touch them (only included ts/js files).
        // At this point, the confidence level of this fix being correct is too low to change bare specifiers or absolute paths.
        || pathIsRelative(importLiteral.text) && forEach(resolved.failedLookupLocations, tryChangeWithIgnoringPackageJson);
    if (result)
        return result;
    // If nothing changed, then result is resolved module file thats not updated
    return resolved.resolvedModule && { newFileName: resolved.resolvedModule.resolvedFileName, updated: false };
    function tryChangeWithIgnoringPackageJsonExisting(oldFileName) {
        const newFileName = oldToNew(oldFileName);
        return newFileName && find(sourceFiles, src => src.fileName === newFileName)
            ? tryChangeWithIgnoringPackageJson(oldFileName) : undefined;
    }
    function tryChangeWithIgnoringPackageJson(oldFileName) {
        return !endsWith(oldFileName, "/package.json") ? tryChange(oldFileName) : undefined;
    }
    function tryChange(oldFileName) {
        const newFileName = oldToNew(oldFileName);
        return newFileName && { newFileName, updated: true };
    }
}
function updateImportsWorker(sourceFile, changeTracker, updateRef, updateImport) {
    for (const ref of sourceFile.referencedFiles || emptyArray) { // TODO: GH#26162
        const updated = updateRef(ref.fileName);
        if (updated !== undefined && updated !== sourceFile.text.slice(ref.pos, ref.end))
            changeTracker.replaceRangeWithText(sourceFile, ref, updated);
    }
    for (const importStringLiteral of sourceFile.imports) {
        const updated = updateImport(importStringLiteral);
        if (updated !== undefined && updated !== importStringLiteral.text)
            changeTracker.replaceRangeWithText(sourceFile, createStringRange(importStringLiteral, sourceFile), updated);
    }
}
function createStringRange(node, sourceFile) {
    return createRange(node.getStart(sourceFile) + 1, node.end - 1);
}
function forEachProperty(objectLiteral, cb) {
    if (!isObjectLiteralExpression(objectLiteral))
        return;
    for (const property of objectLiteral.properties) {
        if (isPropertyAssignment(property) && isStringLiteral(property.name)) {
            cb(property, property.name.text);
        }
    }
}
