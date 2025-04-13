import {
  arrayFrom,
  computeSignatureWithDiagnostics,
  Debug,
  EmitOnly,
  emptyArray,
  getDirectoryPath,
  getIsolatedModules,
  getSourceFileOfNode,
  isDeclarationFileName,
  isExternalOrCommonJsModule,
  isGlobalScopeAugmentation,
  isJsonSourceFile,
  isModuleWithStringLiteralName,
  isStringLiteral,
  mapDefined,
  mapDefinedIterator,
  ModuleKind,
  some,
  toPath,
} from "./_namespaces/ts.js";

/** @internal */
export function getFileEmitOutput(program, sourceFile, emitOnlyDtsFiles, cancellationToken, customTransformers, forceDtsEmit) {
    const outputFiles = [];
    const { emitSkipped, diagnostics } = program.emit(sourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers, forceDtsEmit);
    return { outputFiles, emitSkipped, diagnostics };
    function writeFile(fileName, text, writeByteOrderMark) {
        outputFiles.push({ name: fileName, writeByteOrderMark, text });
    }
}


/** @internal */
export var SignatureInfo;
(function (SignatureInfo) {
    SignatureInfo[SignatureInfo["ComputedDts"] = 0] = "ComputedDts";
    SignatureInfo[SignatureInfo["StoredSignatureAtEmit"] = 1] = "StoredSignatureAtEmit";
    SignatureInfo[SignatureInfo["UsedVersion"] = 2] = "UsedVersion";
})(SignatureInfo || (SignatureInfo = {}));

/** @internal */
export var BuilderState;
(function (BuilderState) {
    function createManyToManyPathMap() {
        function create(forward, reverse, deleted) {
            const map = {
                getKeys: v => reverse.get(v),
                getValues: k => forward.get(k),
                keys: () => forward.keys(),
                size: () => forward.size,
                deleteKey: k => {
                    (deleted || (deleted = new Set())).add(k);
                    const set = forward.get(k);
                    if (!set) {
                        return false;
                    }
                    set.forEach(v => deleteFromMultimap(reverse, v, k));
                    forward.delete(k);
                    return true;
                },
                set: (k, vSet) => {
                    deleted === null || deleted === void 0 ? void 0 : deleted.delete(k);
                    const existingVSet = forward.get(k);
                    forward.set(k, vSet);
                    existingVSet === null || existingVSet === void 0 ? void 0 : existingVSet.forEach(v => {
                        if (!vSet.has(v)) {
                            deleteFromMultimap(reverse, v, k);
                        }
                    });
                    vSet.forEach(v => {
                        if (!(existingVSet === null || existingVSet === void 0 ? void 0 : existingVSet.has(v))) {
                            addToMultimap(reverse, v, k);
                        }
                    });
                    return map;
                },
            };
            return map;
        }
        return create(new Map(), new Map(), /*deleted*/ undefined);
    }
    BuilderState.createManyToManyPathMap = createManyToManyPathMap;
    function addToMultimap(map, k, v) {
        let set = map.get(k);
        if (!set) {
            set = new Set();
            map.set(k, set);
        }
        set.add(v);
    }
    function deleteFromMultimap(map, k, v) {
        const set = map.get(k);
        if (set === null || set === void 0 ? void 0 : set.delete(v)) {
            if (!set.size) {
                map.delete(k);
            }
            return true;
        }
        return false;
    }
    function getReferencedFilesFromImportedModuleSymbol(symbol) {
        return mapDefined(symbol.declarations, declaration => { var _a; return (_a = getSourceFileOfNode(declaration)) === null || _a === void 0 ? void 0 : _a.resolvedPath; });
    }
    /**
     * Get the module source file and all augmenting files from the import name node from file
     */
    function getReferencedFilesFromImportLiteral(checker, importName) {
        const symbol = checker.getSymbolAtLocation(importName);
        return symbol && getReferencedFilesFromImportedModuleSymbol(symbol);
    }
    /**
     * Gets the path to reference file from file name, it could be resolvedPath if present otherwise path
     */
    function getReferencedFileFromFileName(program, fileName, sourceFileDirectory, getCanonicalFileName) {
        return toPath(program.getProjectReferenceRedirect(fileName) || fileName, sourceFileDirectory, getCanonicalFileName);
    }
    /**
     * Gets the referenced files for a file from the program with values for the keys as referenced file's path to be true
     */
    function getReferencedFiles(program, sourceFile, getCanonicalFileName) {
        let referencedFiles;
        // We need to use a set here since the code can contain the same import twice,
        // but that will only be one dependency.
        // To avoid invernal conversion, the key of the referencedFiles map must be of type Path
        if (sourceFile.imports && sourceFile.imports.length > 0) {
            const checker = program.getTypeChecker();
            for (const importName of sourceFile.imports) {
                const declarationSourceFilePaths = getReferencedFilesFromImportLiteral(checker, importName);
                declarationSourceFilePaths === null || declarationSourceFilePaths === void 0 ? void 0 : declarationSourceFilePaths.forEach(addReferencedFile);
            }
        }
        const sourceFileDirectory = getDirectoryPath(sourceFile.resolvedPath);
        // Handle triple slash references
        if (sourceFile.referencedFiles && sourceFile.referencedFiles.length > 0) {
            for (const referencedFile of sourceFile.referencedFiles) {
                const referencedPath = getReferencedFileFromFileName(program, referencedFile.fileName, sourceFileDirectory, getCanonicalFileName);
                addReferencedFile(referencedPath);
            }
        }
        // Handle type reference directives
        program.forEachResolvedTypeReferenceDirective(({ resolvedTypeReferenceDirective }) => {
            if (!resolvedTypeReferenceDirective) {
                return;
            }
            const fileName = resolvedTypeReferenceDirective.resolvedFileName; // TODO: GH#18217
            const typeFilePath = getReferencedFileFromFileName(program, fileName, sourceFileDirectory, getCanonicalFileName);
            addReferencedFile(typeFilePath);
        }, sourceFile);
        // Add module augmentation as references
        if (sourceFile.moduleAugmentations.length) {
            const checker = program.getTypeChecker();
            for (const moduleName of sourceFile.moduleAugmentations) {
                if (!isStringLiteral(moduleName))
                    continue;
                const symbol = checker.getSymbolAtLocation(moduleName);
                if (!symbol)
                    continue;
                // Add any file other than our own as reference
                addReferenceFromAmbientModule(symbol);
            }
        }
        // From ambient modules
        for (const ambientModule of program.getTypeChecker().getAmbientModules()) {
            if (ambientModule.declarations && ambientModule.declarations.length > 1) {
                addReferenceFromAmbientModule(ambientModule);
            }
        }
        return referencedFiles;
        function addReferenceFromAmbientModule(symbol) {
            if (!symbol.declarations) {
                return;
            }
            // Add any file other than our own as reference
            for (const declaration of symbol.declarations) {
                const declarationSourceFile = getSourceFileOfNode(declaration);
                if (declarationSourceFile &&
                    declarationSourceFile !== sourceFile) {
                    addReferencedFile(declarationSourceFile.resolvedPath);
                }
            }
        }
        function addReferencedFile(referencedPath) {
            (referencedFiles || (referencedFiles = new Set())).add(referencedPath);
        }
    }
    /**
     * Returns true if oldState is reusable, that is the emitKind = module/non module has not changed
     */
    function canReuseOldState(newReferencedMap, oldState) {
        return oldState && !oldState.referencedMap === !newReferencedMap;
    }
    BuilderState.canReuseOldState = canReuseOldState;
    function createReferencedMap(options) {
        return options.module !== ModuleKind.None && !options.outFile ?
            createManyToManyPathMap() :
            undefined;
    }
    BuilderState.createReferencedMap = createReferencedMap;
    /**
     * Creates the state of file references and signature for the new program from oldState if it is safe
     */
    function create(newProgram, oldState, disableUseFileVersionAsSignature) {
        var _a, _b;
        const fileInfos = new Map();
        const options = newProgram.getCompilerOptions();
        const referencedMap = createReferencedMap(options);
        const useOldState = canReuseOldState(referencedMap, oldState);
        // Ensure source files have parent pointers set
        newProgram.getTypeChecker();
        // Create the reference map, and set the file infos
        for (const sourceFile of newProgram.getSourceFiles()) {
            const version = Debug.checkDefined(sourceFile.version, "Program intended to be used with Builder should have source files with versions set");
            const oldUncommittedSignature = useOldState ? (_a = oldState.oldSignatures) === null || _a === void 0 ? void 0 : _a.get(sourceFile.resolvedPath) : undefined;
            const signature = oldUncommittedSignature === undefined ?
                useOldState ? (_b = oldState.fileInfos.get(sourceFile.resolvedPath)) === null || _b === void 0 ? void 0 : _b.signature : undefined :
                oldUncommittedSignature || undefined;
            if (referencedMap) {
                const newReferences = getReferencedFiles(newProgram, sourceFile, newProgram.getCanonicalFileName);
                if (newReferences) {
                    referencedMap.set(sourceFile.resolvedPath, newReferences);
                }
            }
            fileInfos.set(sourceFile.resolvedPath, {
                version,
                signature,
                // No need to calculate affectsGlobalScope with --out since its not used at all
                affectsGlobalScope: !options.outFile ? isFileAffectingGlobalScope(sourceFile) || undefined : undefined,
                impliedFormat: sourceFile.impliedNodeFormat,
            });
        }
        return {
            fileInfos,
            referencedMap,
            useFileVersionAsSignature: !disableUseFileVersionAsSignature && !useOldState,
        };
    }
    BuilderState.create = create;
    /**
     * Releases needed properties
     */
    function releaseCache(state) {
        state.allFilesExcludingDefaultLibraryFile = undefined;
        state.allFileNames = undefined;
    }
    BuilderState.releaseCache = releaseCache;
    /**
     * Gets the files affected by the path from the program
     */
    function getFilesAffectedBy(state, programOfThisState, path, cancellationToken, host) {
        var _a;
        const result = getFilesAffectedByWithOldState(state, programOfThisState, path, cancellationToken, host);
        (_a = state.oldSignatures) === null || _a === void 0 ? void 0 : _a.clear();
        return result;
    }
    BuilderState.getFilesAffectedBy = getFilesAffectedBy;
    function getFilesAffectedByWithOldState(state, programOfThisState, path, cancellationToken, host) {
        const sourceFile = programOfThisState.getSourceFileByPath(path);
        if (!sourceFile) {
            return emptyArray;
        }
        if (!updateShapeSignature(state, programOfThisState, sourceFile, cancellationToken, host)) {
            return [sourceFile];
        }
        return (state.referencedMap ? getFilesAffectedByUpdatedShapeWhenModuleEmit : getFilesAffectedByUpdatedShapeWhenNonModuleEmit)(state, programOfThisState, sourceFile, cancellationToken, host);
    }
    BuilderState.getFilesAffectedByWithOldState = getFilesAffectedByWithOldState;
    function updateSignatureOfFile(state, signature, path) {
        state.fileInfos.get(path).signature = signature;
        (state.hasCalledUpdateShapeSignature || (state.hasCalledUpdateShapeSignature = new Set())).add(path);
    }
    BuilderState.updateSignatureOfFile = updateSignatureOfFile;
    function computeDtsSignature(programOfThisState, sourceFile, cancellationToken, host, onNewSignature) {
        programOfThisState.emit(sourceFile, (fileName, text, _writeByteOrderMark, _onError, sourceFiles, data) => {
            Debug.assert(isDeclarationFileName(fileName), `File extension for signature expected to be dts: Got:: ${fileName}`);
            onNewSignature(computeSignatureWithDiagnostics(programOfThisState, sourceFile, text, host, data), sourceFiles);
        }, cancellationToken, EmitOnly.BuilderSignature, 
        /*customTransformers*/ undefined, 
        /*forceDtsEmit*/ true);
    }
    BuilderState.computeDtsSignature = computeDtsSignature;
    /**
     * Returns if the shape of the signature has changed since last emit
     */
    function updateShapeSignature(state, programOfThisState, sourceFile, cancellationToken, host, useFileVersionAsSignature = state.useFileVersionAsSignature) {
        var _a, _b;
        // If we have cached the result for this file, that means hence forth we should assume file shape is uptodate
        if ((_a = state.hasCalledUpdateShapeSignature) === null || _a === void 0 ? void 0 : _a.has(sourceFile.resolvedPath))
            return false;
        const info = state.fileInfos.get(sourceFile.resolvedPath);
        const prevSignature = info.signature;
        let latestSignature;
        if (!sourceFile.isDeclarationFile && !useFileVersionAsSignature) {
            computeDtsSignature(programOfThisState, sourceFile, cancellationToken, host, signature => {
                var _a;
                latestSignature = signature;
                if (host.storeSignatureInfo)
                    ((_a = state.signatureInfo) !== null && _a !== void 0 ? _a : (state.signatureInfo = new Map())).set(sourceFile.resolvedPath, SignatureInfo.ComputedDts);
            });
        }
        // Default is to use file version as signature
        if (latestSignature === undefined) {
            latestSignature = sourceFile.version;
            if (host.storeSignatureInfo)
                ((_b = state.signatureInfo) !== null && _b !== void 0 ? _b : (state.signatureInfo = new Map())).set(sourceFile.resolvedPath, SignatureInfo.UsedVersion);
        }
        (state.oldSignatures || (state.oldSignatures = new Map())).set(sourceFile.resolvedPath, prevSignature || false);
        (state.hasCalledUpdateShapeSignature || (state.hasCalledUpdateShapeSignature = new Set())).add(sourceFile.resolvedPath);
        info.signature = latestSignature;
        return latestSignature !== prevSignature;
    }
    BuilderState.updateShapeSignature = updateShapeSignature;
    /**
     * Get all the dependencies of the sourceFile
     */
    function getAllDependencies(state, programOfThisState, sourceFile) {
        const compilerOptions = programOfThisState.getCompilerOptions();
        // With --out or --outFile all outputs go into single file, all files depend on each other
        if (compilerOptions.outFile) {
            return getAllFileNames(state, programOfThisState);
        }
        // If this is non module emit, or its a global file, it depends on all the source files
        if (!state.referencedMap || isFileAffectingGlobalScope(sourceFile)) {
            return getAllFileNames(state, programOfThisState);
        }
        // Get the references, traversing deep from the referenceMap
        const seenMap = new Set();
        const queue = [sourceFile.resolvedPath];
        while (queue.length) {
            const path = queue.pop();
            if (!seenMap.has(path)) {
                seenMap.add(path);
                const references = state.referencedMap.getValues(path);
                if (references) {
                    for (const key of references.keys()) {
                        queue.push(key);
                    }
                }
            }
        }
        return arrayFrom(mapDefinedIterator(seenMap.keys(), path => { var _a, _b; return (_b = (_a = programOfThisState.getSourceFileByPath(path)) === null || _a === void 0 ? void 0 : _a.fileName) !== null && _b !== void 0 ? _b : path; }));
    }
    BuilderState.getAllDependencies = getAllDependencies;
    /**
     * Gets the names of all files from the program
     */
    function getAllFileNames(state, programOfThisState) {
        if (!state.allFileNames) {
            const sourceFiles = programOfThisState.getSourceFiles();
            state.allFileNames = sourceFiles === emptyArray ? emptyArray : sourceFiles.map(file => file.fileName);
        }
        return state.allFileNames;
    }
    /**
     * Gets the files referenced by the the file path
     */
    function getReferencedByPaths(state, referencedFilePath) {
        const keys = state.referencedMap.getKeys(referencedFilePath);
        return keys ? arrayFrom(keys.keys()) : [];
    }
    BuilderState.getReferencedByPaths = getReferencedByPaths;
    /**
     * For script files that contains only ambient external modules, although they are not actually external module files,
     * they can only be consumed via importing elements from them. Regular script files cannot consume them. Therefore,
     * there are no point to rebuild all script files if these special files have changed. However, if any statement
     * in the file is not ambient external module, we treat it as a regular script file.
     */
    function containsOnlyAmbientModules(sourceFile) {
        for (const statement of sourceFile.statements) {
            if (!isModuleWithStringLiteralName(statement)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Return true if file contains anything that augments to global scope we need to build them as if
     * they are global files as well as module
     */
    function containsGlobalScopeAugmentation(sourceFile) {
        return some(sourceFile.moduleAugmentations, augmentation => isGlobalScopeAugmentation(augmentation.parent));
    }
    /**
     * Return true if the file will invalidate all files because it affectes global scope
     */
    function isFileAffectingGlobalScope(sourceFile) {
        return containsGlobalScopeAugmentation(sourceFile) ||
            !isExternalOrCommonJsModule(sourceFile) && !isJsonSourceFile(sourceFile) && !containsOnlyAmbientModules(sourceFile);
    }
    /**
     * Gets all files of the program excluding the default library file
     */
    function getAllFilesExcludingDefaultLibraryFile(state, programOfThisState, firstSourceFile) {
        // Use cached result
        if (state.allFilesExcludingDefaultLibraryFile) {
            return state.allFilesExcludingDefaultLibraryFile;
        }
        let result;
        if (firstSourceFile)
            addSourceFile(firstSourceFile);
        for (const sourceFile of programOfThisState.getSourceFiles()) {
            if (sourceFile !== firstSourceFile) {
                addSourceFile(sourceFile);
            }
        }
        state.allFilesExcludingDefaultLibraryFile = result || emptyArray;
        return state.allFilesExcludingDefaultLibraryFile;
        function addSourceFile(sourceFile) {
            if (!programOfThisState.isSourceFileDefaultLibrary(sourceFile)) {
                (result || (result = [])).push(sourceFile);
            }
        }
    }
    BuilderState.getAllFilesExcludingDefaultLibraryFile = getAllFilesExcludingDefaultLibraryFile;
    /**
     * When program emits non modular code, gets the files affected by the sourceFile whose shape has changed
     */
    function getFilesAffectedByUpdatedShapeWhenNonModuleEmit(state, programOfThisState, sourceFileWithUpdatedShape) {
        const compilerOptions = programOfThisState.getCompilerOptions();
        // If `--out` or `--outFile` is specified, any new emit will result in re-emitting the entire project,
        // so returning the file itself is good enough.
        if (compilerOptions && compilerOptions.outFile) {
            return [sourceFileWithUpdatedShape];
        }
        return getAllFilesExcludingDefaultLibraryFile(state, programOfThisState, sourceFileWithUpdatedShape);
    }
    /**
     * When program emits modular code, gets the files affected by the sourceFile whose shape has changed
     */
    function getFilesAffectedByUpdatedShapeWhenModuleEmit(state, programOfThisState, sourceFileWithUpdatedShape, cancellationToken, host) {
        if (isFileAffectingGlobalScope(sourceFileWithUpdatedShape)) {
            return getAllFilesExcludingDefaultLibraryFile(state, programOfThisState, sourceFileWithUpdatedShape);
        }
        const compilerOptions = programOfThisState.getCompilerOptions();
        if (compilerOptions && (getIsolatedModules(compilerOptions) || compilerOptions.outFile)) {
            return [sourceFileWithUpdatedShape];
        }
        // Now we need to if each file in the referencedBy list has a shape change as well.
        // Because if so, its own referencedBy files need to be saved as well to make the
        // emitting result consistent with files on disk.
        const seenFileNamesMap = new Map();
        // Start with the paths this file was referenced by
        seenFileNamesMap.set(sourceFileWithUpdatedShape.resolvedPath, sourceFileWithUpdatedShape);
        const queue = getReferencedByPaths(state, sourceFileWithUpdatedShape.resolvedPath);
        while (queue.length > 0) {
            const currentPath = queue.pop();
            if (!seenFileNamesMap.has(currentPath)) {
                const currentSourceFile = programOfThisState.getSourceFileByPath(currentPath);
                seenFileNamesMap.set(currentPath, currentSourceFile);
                if (currentSourceFile && updateShapeSignature(state, programOfThisState, currentSourceFile, cancellationToken, host)) {
                    queue.push(...getReferencedByPaths(state, currentSourceFile.resolvedPath));
                }
            }
        }
        // Return array of values that needs emit
        return arrayFrom(mapDefinedIterator(seenFileNamesMap.values(), value => value));
    }
})(BuilderState || (BuilderState = {}));
