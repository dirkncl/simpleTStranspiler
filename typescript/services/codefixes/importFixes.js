import {
  createCodeFixAction,
  createCombinedCodeActions,
  eachDiagnostic,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  arrayFrom,
  cast,
  changeAnyExtension,
  combine,
  compareBooleans,
  compareNumberOfDirectorySeparators,
  compareValues,
  Comparison,
  createFutureSourceFile,
  createModuleSpecifierResolutionHost,
  createMultiMap,
  createPackageJsonImportFilter,
  Debug,
  Diagnostics,
  emptyArray,
  every,
  ExportKind,
  factory,
  findAncestor,
  first,
  firstDefined,
  flatMap,
  flatMapIterator,
  forEachExternalModuleToImportFrom,
  forEachNameOfDefaultExport,
  getAllowSyntheticDefaultImports,
  getBaseFileName,
  getDeclarationOfKind,
  getDefaultLikeExportInfo,
  getDirectoryPath,
  getEmitModuleFormatOfFileWorker,
  getEmitModuleKind,
  getEmitModuleResolutionKind,
  getEmitScriptTarget,
  getExportInfoMap,
  getImpliedNodeFormatForEmitWorker,
  getIsFileExcluded,
  getMeaningFromLocation,
  getNameForExportedSymbol,
  getOutputExtension,
  getQuoteFromPreference,
  getQuotePreference,
  getSourceFileOfNode,
  getSymbolId,
  getSynthesizedDeepClone,
  getTokenAtPosition,
  getTokenPosOfNode,
  getTypeKeywordOfTypeOnlyImport,
  getUniqueSymbolId,
  hasJSFileExtension,
  hostGetCanonicalFileName,
  identity,
  importFromModuleSpecifier,
  ImportKind,
  insertImports,
  InternalSymbolName,
  isDefaultImport,
  isExternalModuleReference,
  isFullSourceFile,
  isIdentifier,
  isImportable,
  isImportClause,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportSpecifier,
  isIntrinsicJsxName,
  isJSDocImportTag,
  isJsxClosingElement,
  isJsxOpeningFragment,
  isJsxOpeningLikeElement,
  isJSXTagName,
  isNamedImports,
  isNamespaceImport,
  isRequireVariableStatement,
  isSourceFileJS,
  isStringLiteral,
  isStringLiteralLike,
  isTypeOnlyImportDeclaration,
  isTypeOnlyImportOrExportDeclaration,
  isUMDExportSymbol,
  isValidTypeOnlyAliasUseSite,
  isVariableDeclarationInitializedToRequire,
  jsxModeNeedsExplicitImport,
  last,
  makeImport,
  makeStringLiteral,
  mapDefined,
  memoizeOne,
  ModuleKind,
  moduleResolutionUsesNodeModules,
  moduleSpecifiers,
  moduleSymbolToValidIdentifier,
  NodeFlags,
  nodeIsMissing,
  OrganizeImports,
  pathContainsNodeModules,
  pathIsBareSpecifier,
  sameMap,
  SemanticMeaning,
  shouldUseUriStyleNodeCoreModules,
  single,
  skipAlias,
  some,
  startsWith,
  stripQuotes,
  SymbolFlags,
  SyntaxKind,
  textChanges,
  toPath,
  toSorted,
  tryCast,
  tryGetModuleSpecifierFromDeclaration,
} from "../namespaces/ts.js";


/** @internal */
export const importFixName = "import";

const importFixId = "fixMissingImport";
const errorCodes = [
    Diagnostics.Cannot_find_name_0.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_1.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_the_static_member_1_0.code,
    Diagnostics.Cannot_find_namespace_0.code,
    Diagnostics._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead.code,
    Diagnostics._0_only_refers_to_a_type_but_is_being_used_as_a_value_here.code,
    Diagnostics.No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer.code,
    Diagnostics._0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_save_dev_types_Slashjquery.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_1_or_later.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_include_dom.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_save_dev_types_Slashjest_or_npm_i_save_dev_types_Slashmocha_and_then_add_jest_or_mocha_to_the_types_field_in_your_tsconfig.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_to_write_this_in_an_async_function.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_save_dev_types_Slashjquery_and_then_add_jquery_to_the_types_field_in_your_tsconfig.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_save_dev_types_Slashjest_or_npm_i_save_dev_types_Slashmocha.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_save_dev_types_Slashnode.code,
    Diagnostics.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_save_dev_types_Slashnode_and_then_add_node_to_the_types_field_in_your_tsconfig.code,
    Diagnostics.Cannot_find_namespace_0_Did_you_mean_1.code,
    Diagnostics.Cannot_extend_an_interface_0_Did_you_mean_implements.code,
    Diagnostics.This_JSX_tag_requires_0_to_be_in_scope_but_it_could_not_be_found.code,
];
registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { errorCode, preferences, sourceFile, span, program } = context;
        const info = getFixInfos(context, errorCode, span.start, /*useAutoImportProvider*/ true);
        if (!info)
            return undefined;
        return info.map(({ fix, symbolName, errorIdentifierText }) => codeActionForFix(context, sourceFile, symbolName, fix, 
        /*includeSymbolNameInDescription*/ symbolName !== errorIdentifierText, program, preferences));
    },
    fixIds: [importFixId],
    getAllCodeActions: context => {
        const { sourceFile, program, preferences, host, cancellationToken } = context;
        const importAdder = createImportAdderWorker(sourceFile, program, /*useAutoImportProvider*/ true, preferences, host, cancellationToken);
        eachDiagnostic(context, errorCodes, diag => importAdder.addImportFromDiagnostic(diag, context));
        return createCombinedCodeActions(textChanges.ChangeTracker.with(context, importAdder.writeFixes));
    },
});
/** @internal */
export function createImportAdder(sourceFile, program, preferences, host, cancellationToken) {
    return createImportAdderWorker(sourceFile, program, /*useAutoImportProvider*/ false, preferences, host, cancellationToken);
}
function createImportAdderWorker(sourceFile, program, useAutoImportProvider, preferences, host, cancellationToken) {
    const compilerOptions = program.getCompilerOptions();
    // Namespace fixes don't conflict, so just build a list.
    const addToNamespace = [];
    const importType = [];
    const addToExisting = new Map();
    const removeExisting = new Set();
    const verbatimImports = new Set();
    /** Use `getNewImportEntry` for access */
    const newImports = new Map();
    return { addImportFromDiagnostic, addImportFromExportedSymbol, addImportForModuleSymbol, writeFixes, hasFixes, addImportForUnresolvedIdentifier, addImportForNonExistentExport, removeExistingImport, addVerbatimImport };
    function addVerbatimImport(declaration) {
        verbatimImports.add(declaration);
    }
    function addImportForUnresolvedIdentifier(context, symbolToken, useAutoImportProvider) {
        const info = getFixInfosWithoutDiagnostic(context, symbolToken, useAutoImportProvider);
        if (!info || !info.length)
            return;
        addImport(first(info));
    }
    function addImportFromDiagnostic(diagnostic, context) {
        const info = getFixInfos(context, diagnostic.code, diagnostic.start, useAutoImportProvider);
        if (!info || !info.length)
            return;
        addImport(first(info));
    }
    function addImportFromExportedSymbol(exportedSymbol, isValidTypeOnlyUseSite, referenceImport) {
        var _a, _b, _c;
        const moduleSymbol = Debug.checkDefined(exportedSymbol.parent, "Expected exported symbol to have module symbol as parent");
        const symbolName = getNameForExportedSymbol(exportedSymbol, getEmitScriptTarget(compilerOptions));
        const checker = program.getTypeChecker();
        const symbol = checker.getMergedSymbol(skipAlias(exportedSymbol, checker));
        const exportInfo = getAllExportInfoForSymbol(sourceFile, symbol, symbolName, moduleSymbol, /*preferCapitalized*/ false, program, host, preferences, cancellationToken);
        if (!exportInfo) {
            // If no exportInfo is found, this means export could not be resolved when we have filtered for autoImportFileExcludePatterns,
            //     so we should not generate an import.
            Debug.assert((_a = preferences.autoImportFileExcludePatterns) === null || _a === void 0 ? void 0 : _a.length);
            return;
        }
        const useRequire = shouldUseRequire(sourceFile, program);
        let fix = getImportFixForSymbol(sourceFile, exportInfo, program, /*position*/ undefined, !!isValidTypeOnlyUseSite, useRequire, host, preferences);
        if (fix) {
            const localName = (_c = (_b = tryCast(referenceImport === null || referenceImport === void 0 ? void 0 : referenceImport.name, isIdentifier)) === null || _b === void 0 ? void 0 : _b.text) !== null && _c !== void 0 ? _c : symbolName;
            let addAsTypeOnly;
            let propertyName;
            if (referenceImport
                && isTypeOnlyImportDeclaration(referenceImport)
                && (fix.kind === 3 /* ImportFixKind.AddNew */ || fix.kind === 2 /* ImportFixKind.AddToExisting */)
                && fix.addAsTypeOnly === 1 /* AddAsTypeOnly.Allowed */) {
                // Copy the type-only status from the reference import
                addAsTypeOnly = 2 /* AddAsTypeOnly.Required */;
            }
            if (exportedSymbol.name !== localName) {
                // checks if the symbol was aliased at the referenced import
                propertyName = exportedSymbol.name;
            }
            fix = Object.assign(Object.assign(Object.assign({}, fix), (addAsTypeOnly === undefined ? {} : { addAsTypeOnly })), (propertyName === undefined ? {} : { propertyName }));
            addImport({ fix, symbolName: localName !== null && localName !== void 0 ? localName : symbolName, errorIdentifierText: undefined });
        }
    }
    function addImportForModuleSymbol(symbolAlias, isValidTypeOnlyUseSite, referenceImport) {
        var _a, _b, _c;
        // Adds import for module, import alias will be symbolAlias.name
        const checker = program.getTypeChecker();
        const moduleSymbol = checker.getAliasedSymbol(symbolAlias);
        Debug.assert(moduleSymbol.flags & SymbolFlags.Module, "Expected symbol to be a module");
        const moduleSpecifierResolutionHost = createModuleSpecifierResolutionHost(program, host);
        const moduleSpecifierResult = moduleSpecifiers.getModuleSpecifiersWithCacheInfo(moduleSymbol, checker, compilerOptions, sourceFile, moduleSpecifierResolutionHost, preferences, /*options*/ undefined, /*forAutoImport*/ true);
        const useRequire = shouldUseRequire(sourceFile, program);
        // Copy the type-only status from the reference import
        let addAsTypeOnly = getAddAsTypeOnly(isValidTypeOnlyUseSite, 
        /*isForNewImportDeclaration*/ true, 
        /*symbol*/ undefined, symbolAlias.flags, program.getTypeChecker(), compilerOptions);
        addAsTypeOnly = addAsTypeOnly === 1 /* AddAsTypeOnly.Allowed */ && isTypeOnlyImportDeclaration(referenceImport) ? 2 /* AddAsTypeOnly.Required */ : 1 /* AddAsTypeOnly.Allowed */;
        // Copy the kind of import
        const importKind = isImportDeclaration(referenceImport) ?
            isDefaultImport(referenceImport) ? ImportKind.Default : ImportKind.Namespace :
            isImportSpecifier(referenceImport) ? ImportKind.Named :
                isImportClause(referenceImport) && !!referenceImport.name ? ImportKind.Default : ImportKind.Namespace;
        const exportInfo = [{
                symbol: symbolAlias,
                moduleSymbol,
                moduleFileName: (_c = (_b = (_a = moduleSymbol.declarations) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.getSourceFile()) === null || _c === void 0 ? void 0 : _c.fileName,
                exportKind: ExportKind.Module,
                targetFlags: symbolAlias.flags,
                isFromPackageJson: false,
            }];
        const existingFix = getImportFixForSymbol(sourceFile, exportInfo, program, 
        /*position*/ undefined, !!isValidTypeOnlyUseSite, useRequire, host, preferences);
        let fix;
        if (existingFix && importKind !== ImportKind.Namespace) {
            fix = Object.assign(Object.assign({}, existingFix), { addAsTypeOnly,
                importKind });
        }
        else {
            fix = {
                kind: 3 /* ImportFixKind.AddNew */,
                moduleSpecifierKind: existingFix !== undefined ? existingFix.moduleSpecifierKind : moduleSpecifierResult.kind,
                moduleSpecifier: existingFix !== undefined ? existingFix.moduleSpecifier : first(moduleSpecifierResult.moduleSpecifiers),
                importKind,
                addAsTypeOnly,
                useRequire,
            };
        }
        addImport({ fix, symbolName: symbolAlias.name, errorIdentifierText: undefined });
    }
    function addImportForNonExistentExport(exportName, exportingFileName, exportKind, exportedMeanings, isImportUsageValidAsTypeOnly) {
        const exportingSourceFile = program.getSourceFile(exportingFileName);
        const useRequire = shouldUseRequire(sourceFile, program);
        if (exportingSourceFile && exportingSourceFile.symbol) {
            const { fixes } = getImportFixes([{
                    exportKind,
                    isFromPackageJson: false,
                    moduleFileName: exportingFileName,
                    moduleSymbol: exportingSourceFile.symbol,
                    targetFlags: exportedMeanings,
                }], 
            /*usagePosition*/ undefined, isImportUsageValidAsTypeOnly, useRequire, program, sourceFile, host, preferences);
            if (fixes.length) {
                addImport({ fix: fixes[0], symbolName: exportName, errorIdentifierText: exportName });
            }
        }
        else {
            // File does not exist yet or has no exports, so all imports added will be "new"
            const futureExportingSourceFile = createFutureSourceFile(exportingFileName, ModuleKind.ESNext, program, host);
            const moduleSpecifier = moduleSpecifiers.getLocalModuleSpecifierBetweenFileNames(sourceFile, exportingFileName, compilerOptions, createModuleSpecifierResolutionHost(program, host), preferences);
            const importKind = getImportKind(futureExportingSourceFile, exportKind, program);
            const addAsTypeOnly = getAddAsTypeOnly(isImportUsageValidAsTypeOnly, 
            /*isForNewImportDeclaration*/ true, 
            /*symbol*/ undefined, exportedMeanings, program.getTypeChecker(), compilerOptions);
            const fix = {
                kind: 3 /* ImportFixKind.AddNew */,
                moduleSpecifierKind: "relative",
                moduleSpecifier,
                importKind,
                addAsTypeOnly,
                useRequire,
            };
            addImport({ fix, symbolName: exportName, errorIdentifierText: exportName });
        }
    }
    function removeExistingImport(declaration) {
        if (declaration.kind === SyntaxKind.ImportClause) {
            Debug.assertIsDefined(declaration.name, "ImportClause should have a name if it's being removed");
        }
        removeExisting.add(declaration);
    }
    function addImport(info) {
        var _a, _b, _c;
        const { fix, symbolName } = info;
        switch (fix.kind) {
            case 0 /* ImportFixKind.UseNamespace */:
                addToNamespace.push(fix);
                break;
            case 1 /* ImportFixKind.JsdocTypeImport */:
                importType.push(fix);
                break;
            case 2 /* ImportFixKind.AddToExisting */: {
                const { importClauseOrBindingPattern, importKind, addAsTypeOnly, propertyName } = fix;
                let entry = addToExisting.get(importClauseOrBindingPattern);
                if (!entry) {
                    addToExisting.set(importClauseOrBindingPattern, entry = { importClauseOrBindingPattern, defaultImport: undefined, namedImports: new Map() });
                }
                if (importKind === ImportKind.Named) {
                    const prevTypeOnly = (_a = entry === null || entry === void 0 ? void 0 : entry.namedImports.get(symbolName)) === null || _a === void 0 ? void 0 : _a.addAsTypeOnly;
                    entry.namedImports.set(symbolName, { addAsTypeOnly: reduceAddAsTypeOnlyValues(prevTypeOnly, addAsTypeOnly), propertyName });
                }
                else {
                    Debug.assert(entry.defaultImport === undefined || entry.defaultImport.name === symbolName, "(Add to Existing) Default import should be missing or match symbolName");
                    entry.defaultImport = {
                        name: symbolName,
                        addAsTypeOnly: reduceAddAsTypeOnlyValues((_b = entry.defaultImport) === null || _b === void 0 ? void 0 : _b.addAsTypeOnly, addAsTypeOnly),
                    };
                }
                break;
            }
            case 3 /* ImportFixKind.AddNew */: {
                const { moduleSpecifier, importKind, useRequire, addAsTypeOnly, propertyName } = fix;
                const entry = getNewImportEntry(moduleSpecifier, importKind, useRequire, addAsTypeOnly);
                Debug.assert(entry.useRequire === useRequire, "(Add new) Tried to add an `import` and a `require` for the same module");
                switch (importKind) {
                    case ImportKind.Default:
                        Debug.assert(entry.defaultImport === undefined || entry.defaultImport.name === symbolName, "(Add new) Default import should be missing or match symbolName");
                        entry.defaultImport = { name: symbolName, addAsTypeOnly: reduceAddAsTypeOnlyValues((_c = entry.defaultImport) === null || _c === void 0 ? void 0 : _c.addAsTypeOnly, addAsTypeOnly) };
                        break;
                    case ImportKind.Named:
                        const prevValue = (entry.namedImports || (entry.namedImports = new Map())).get(symbolName);
                        entry.namedImports.set(symbolName, [reduceAddAsTypeOnlyValues(prevValue, addAsTypeOnly), propertyName]);
                        break;
                    case ImportKind.CommonJS:
                        if (compilerOptions.verbatimModuleSyntax) {
                            const prevValue = (entry.namedImports || (entry.namedImports = new Map())).get(symbolName);
                            entry.namedImports.set(symbolName, [reduceAddAsTypeOnlyValues(prevValue, addAsTypeOnly), propertyName]);
                        }
                        else {
                            Debug.assert(entry.namespaceLikeImport === undefined || entry.namespaceLikeImport.name === symbolName, "Namespacelike import shoudl be missing or match symbolName");
                            entry.namespaceLikeImport = { importKind, name: symbolName, addAsTypeOnly };
                        }
                        break;
                    case ImportKind.Namespace:
                        Debug.assert(entry.namespaceLikeImport === undefined || entry.namespaceLikeImport.name === symbolName, "Namespacelike import shoudl be missing or match symbolName");
                        entry.namespaceLikeImport = { importKind, name: symbolName, addAsTypeOnly };
                        break;
                }
                break;
            }
            case 4 /* ImportFixKind.PromoteTypeOnly */:
                // Excluding from fix-all
                break;
            default:
                Debug.assertNever(fix, `fix wasn't never - got kind ${fix.kind}`);
        }
        function reduceAddAsTypeOnlyValues(prevValue, newValue) {
            // `NotAllowed` overrides `Required` because one addition of a new import might be required to be type-only
            // because of `--importsNotUsedAsValues=error`, but if a second addition of the same import is `NotAllowed`
            // to be type-only, the reason the first one was `Required` - the unused runtime dependency - is now moot.
            // Alternatively, if one addition is `Required` because it has no value meaning under `--preserveValueImports`
            // and `--isolatedModules`, it should be impossible for another addition to be `NotAllowed` since that would
            // mean a type is being referenced in a value location.
            return Math.max(prevValue !== null && prevValue !== void 0 ? prevValue : 0, newValue);
        }
        function getNewImportEntry(moduleSpecifier, importKind, useRequire, addAsTypeOnly) {
            // A default import that requires type-only makes the whole import type-only.
            // (We could add `default` as a named import, but that style seems undesirable.)
            // Under `--preserveValueImports` and `--importsNotUsedAsValues=error`, if a
            // module default-exports a type but named-exports some values (weird), you would
            // have to use a type-only default import and non-type-only named imports. These
            // require two separate import declarations, so we build this into the map key.
            const typeOnlyKey = newImportsKey(moduleSpecifier, /*topLevelTypeOnly*/ true);
            const nonTypeOnlyKey = newImportsKey(moduleSpecifier, /*topLevelTypeOnly*/ false);
            const typeOnlyEntry = newImports.get(typeOnlyKey);
            const nonTypeOnlyEntry = newImports.get(nonTypeOnlyKey);
            const newEntry = {
                defaultImport: undefined,
                namedImports: undefined,
                namespaceLikeImport: undefined,
                useRequire,
            };
            if (importKind === ImportKind.Default && addAsTypeOnly === 2 /* AddAsTypeOnly.Required */) {
                if (typeOnlyEntry)
                    return typeOnlyEntry;
                newImports.set(typeOnlyKey, newEntry);
                return newEntry;
            }
            if (addAsTypeOnly === 1 /* AddAsTypeOnly.Allowed */ && (typeOnlyEntry || nonTypeOnlyEntry)) {
                return (typeOnlyEntry || nonTypeOnlyEntry);
            }
            if (nonTypeOnlyEntry) {
                return nonTypeOnlyEntry;
            }
            newImports.set(nonTypeOnlyKey, newEntry);
            return newEntry;
        }
        function newImportsKey(moduleSpecifier, topLevelTypeOnly) {
            return `${topLevelTypeOnly ? 1 : 0}|${moduleSpecifier}`;
        }
    }
    function writeFixes(changeTracker, oldFileQuotePreference) {
        var _a, _b;
        let quotePreference;
        if (sourceFile.imports !== undefined && sourceFile.imports.length === 0 && oldFileQuotePreference !== undefined) {
            // If the target file (including future files) has no imports, we must use the same quote preference as the file we are importing from.
            quotePreference = oldFileQuotePreference;
        }
        else {
            quotePreference = getQuotePreference(sourceFile, preferences);
        }
        for (const fix of addToNamespace) {
            // Any modifications to existing syntax imply SourceFile already exists
            addNamespaceQualifier(changeTracker, sourceFile, fix);
        }
        for (const fix of importType) {
            // Any modifications to existing syntax imply SourceFile already exists
            addImportType(changeTracker, sourceFile, fix, quotePreference);
        }
        let importSpecifiersToRemoveWhileAdding;
        if (removeExisting.size) {
            Debug.assert(isFullSourceFile(sourceFile), "Cannot remove imports from a future source file");
            const importDeclarationsWithRemovals = new Set(mapDefined([...removeExisting], d => findAncestor(d, isImportDeclaration)));
            const variableDeclarationsWithRemovals = new Set(mapDefined([...removeExisting], d => findAncestor(d, isVariableDeclarationInitializedToRequire)));
            const emptyImportDeclarations = [...importDeclarationsWithRemovals].filter(d => {
                var _a, _b, _c;
                // nothing added to the import declaration
                return !addToExisting.has(d.importClause) &&
                    // no default, or default is being removed
                    (!((_a = d.importClause) === null || _a === void 0 ? void 0 : _a.name) || removeExisting.has(d.importClause)) &&
                    // no namespace import, or namespace import is being removed
                    (!tryCast((_b = d.importClause) === null || _b === void 0 ? void 0 : _b.namedBindings, isNamespaceImport) || removeExisting.has(d.importClause.namedBindings)) &&
                    // no named imports, or all named imports are being removed
                    (!tryCast((_c = d.importClause) === null || _c === void 0 ? void 0 : _c.namedBindings, isNamedImports) || every(d.importClause.namedBindings.elements, e => removeExisting.has(e)));
            });
            const emptyVariableDeclarations = [...variableDeclarationsWithRemovals].filter(d => 
            // no binding elements being added to the variable declaration
            (d.name.kind !== SyntaxKind.ObjectBindingPattern || !addToExisting.has(d.name)) &&
                // no binding elements, or all binding elements are being removed
                (d.name.kind !== SyntaxKind.ObjectBindingPattern || every(d.name.elements, e => removeExisting.has(e))));
            const namedBindingsToDelete = [...importDeclarationsWithRemovals].filter(d => {
                var _a, _b;
                // has named bindings
                return ((_a = d.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings) &&
                    // is not being fully removed
                    emptyImportDeclarations.indexOf(d) === -1 &&
                    // is not gaining named imports
                    !((_b = addToExisting.get(d.importClause)) === null || _b === void 0 ? void 0 : _b.namedImports) &&
                    // all named imports are being removed
                    (d.importClause.namedBindings.kind === SyntaxKind.NamespaceImport || every(d.importClause.namedBindings.elements, e => removeExisting.has(e)));
            });
            for (const declaration of [...emptyImportDeclarations, ...emptyVariableDeclarations]) {
                changeTracker.delete(sourceFile, declaration);
            }
            for (const declaration of namedBindingsToDelete) {
                changeTracker.replaceNode(sourceFile, declaration.importClause, factory.updateImportClause(declaration.importClause, declaration.importClause.isTypeOnly, declaration.importClause.name, 
                /*namedBindings*/ undefined));
            }
            for (const declaration of removeExisting) {
                const importDeclaration = findAncestor(declaration, isImportDeclaration);
                if (importDeclaration &&
                    emptyImportDeclarations.indexOf(importDeclaration) === -1 &&
                    namedBindingsToDelete.indexOf(importDeclaration) === -1) {
                    if (declaration.kind === SyntaxKind.ImportClause) {
                        changeTracker.delete(sourceFile, declaration.name);
                    }
                    else {
                        Debug.assert(declaration.kind === SyntaxKind.ImportSpecifier, "NamespaceImport should have been handled earlier");
                        if ((_a = addToExisting.get(importDeclaration.importClause)) === null || _a === void 0 ? void 0 : _a.namedImports) {
                            // Handle combined inserts/deletes in `doAddExistingFix`
                            (importSpecifiersToRemoveWhileAdding !== null && importSpecifiersToRemoveWhileAdding !== void 0 ? importSpecifiersToRemoveWhileAdding : (importSpecifiersToRemoveWhileAdding = new Set())).add(declaration);
                        }
                        else {
                            changeTracker.delete(sourceFile, declaration);
                        }
                    }
                }
                else if (declaration.kind === SyntaxKind.BindingElement) {
                    if ((_b = addToExisting.get(declaration.parent)) === null || _b === void 0 ? void 0 : _b.namedImports) {
                        // Handle combined inserts/deletes in `doAddExistingFix`
                        (importSpecifiersToRemoveWhileAdding !== null && importSpecifiersToRemoveWhileAdding !== void 0 ? importSpecifiersToRemoveWhileAdding : (importSpecifiersToRemoveWhileAdding = new Set())).add(declaration);
                    }
                    else {
                        changeTracker.delete(sourceFile, declaration);
                    }
                }
                else if (declaration.kind === SyntaxKind.ImportEqualsDeclaration) {
                    changeTracker.delete(sourceFile, declaration);
                }
            }
        }
        addToExisting.forEach(({ importClauseOrBindingPattern, defaultImport, namedImports }) => {
            doAddExistingFix(changeTracker, sourceFile, importClauseOrBindingPattern, defaultImport, arrayFrom(namedImports.entries(), ([name, { addAsTypeOnly, propertyName }]) => ({ addAsTypeOnly, propertyName, name })), importSpecifiersToRemoveWhileAdding, preferences);
        });
        let newDeclarations;
        newImports.forEach(({ useRequire, defaultImport, namedImports, namespaceLikeImport }, key) => {
            const moduleSpecifier = key.slice(2); // From `${0 | 1}|${moduleSpecifier}` format
            const getDeclarations = useRequire ? getNewRequires : getNewImports;
            const declarations = getDeclarations(moduleSpecifier, quotePreference, defaultImport, namedImports && arrayFrom(namedImports.entries(), ([name, [addAsTypeOnly, propertyName]]) => ({ addAsTypeOnly, propertyName, name })), namespaceLikeImport, compilerOptions, preferences);
            newDeclarations = combine(newDeclarations, declarations);
        });
        newDeclarations = combine(newDeclarations, getCombinedVerbatimImports());
        if (newDeclarations) {
            insertImports(changeTracker, sourceFile, newDeclarations, /*blankLineBetween*/ true, preferences);
        }
    }
    function getCombinedVerbatimImports() {
        if (!verbatimImports.size)
            return undefined;
        const importDeclarations = new Set(mapDefined([...verbatimImports], d => findAncestor(d, isImportDeclaration)));
        const requireStatements = new Set(mapDefined([...verbatimImports], d => findAncestor(d, isRequireVariableStatement)));
        return [
            ...mapDefined([...verbatimImports], d => d.kind === SyntaxKind.ImportEqualsDeclaration
                ? getSynthesizedDeepClone(d, /*includeTrivia*/ true)
                : undefined),
            ...[...importDeclarations].map(d => {
                var _a;
                if (verbatimImports.has(d)) {
                    return getSynthesizedDeepClone(d, /*includeTrivia*/ true);
                }
                return getSynthesizedDeepClone(factory.updateImportDeclaration(d, d.modifiers, d.importClause && factory.updateImportClause(d.importClause, d.importClause.isTypeOnly, verbatimImports.has(d.importClause) ? d.importClause.name : undefined, verbatimImports.has(d.importClause.namedBindings)
                    ? d.importClause.namedBindings :
                    ((_a = tryCast(d.importClause.namedBindings, isNamedImports)) === null || _a === void 0 ? void 0 : _a.elements.some(e => verbatimImports.has(e)))
                        ? factory.updateNamedImports(d.importClause.namedBindings, d.importClause.namedBindings.elements.filter(e => verbatimImports.has(e)))
                        : undefined), d.moduleSpecifier, d.attributes), 
                /*includeTrivia*/ true);
            }),
            ...[...requireStatements].map(s => {
                if (verbatimImports.has(s)) {
                    return getSynthesizedDeepClone(s, /*includeTrivia*/ true);
                }
                return getSynthesizedDeepClone(factory.updateVariableStatement(s, s.modifiers, factory.updateVariableDeclarationList(s.declarationList, mapDefined(s.declarationList.declarations, d => {
                    if (verbatimImports.has(d)) {
                        return d;
                    }
                    return factory.updateVariableDeclaration(d, d.name.kind === SyntaxKind.ObjectBindingPattern
                        ? factory.updateObjectBindingPattern(d.name, d.name.elements.filter(e => verbatimImports.has(e))) : d.name, d.exclamationToken, d.type, d.initializer);
                }))), 
                /*includeTrivia*/ true);
            }),
        ];
    }
    function hasFixes() {
        return addToNamespace.length > 0 || importType.length > 0 || addToExisting.size > 0 || newImports.size > 0 || verbatimImports.size > 0 || removeExisting.size > 0;
    }
}
/** @internal */
export function createImportSpecifierResolver(importingFile, program, host, preferences) {
    const packageJsonImportFilter = createPackageJsonImportFilter(importingFile, preferences, host);
    const importMap = createExistingImportMap(importingFile, program);
    return { getModuleSpecifierForBestExportInfo };
    function getModuleSpecifierForBestExportInfo(exportInfo, position, isValidTypeOnlyUseSite, fromCacheOnly) {
        const { fixes, computedWithoutCacheCount } = getImportFixes(exportInfo, position, isValidTypeOnlyUseSite, 
        /*useRequire*/ false, program, importingFile, host, preferences, importMap, fromCacheOnly);
        const result = getBestFix(fixes, importingFile, program, packageJsonImportFilter, host, preferences);
        return result && Object.assign(Object.assign({}, result), { computedWithoutCacheCount });
    }
}
// Sorted with the preferred fix coming first.
var ImportFixKind;
(function (ImportFixKind) {
    ImportFixKind[ImportFixKind["UseNamespace"] = 0] = "UseNamespace";
    ImportFixKind[ImportFixKind["JsdocTypeImport"] = 1] = "JsdocTypeImport";
    ImportFixKind[ImportFixKind["AddToExisting"] = 2] = "AddToExisting";
    ImportFixKind[ImportFixKind["AddNew"] = 3] = "AddNew";
    ImportFixKind[ImportFixKind["PromoteTypeOnly"] = 4] = "PromoteTypeOnly";
})(ImportFixKind || (ImportFixKind = {}));
// These should not be combined as bitflags, but are given powers of 2 values to
// easily detect conflicts between `NotAllowed` and `Required` by giving them a unique sum.
// They're also ordered in terms of increasing priority for a fix-all scenario (see
// `reduceAddAsTypeOnlyValues`).
var AddAsTypeOnly;
(function (AddAsTypeOnly) {
    AddAsTypeOnly[AddAsTypeOnly["Allowed"] = 1] = "Allowed";
    AddAsTypeOnly[AddAsTypeOnly["Required"] = 2] = "Required";
    AddAsTypeOnly[AddAsTypeOnly["NotAllowed"] = 4] = "NotAllowed";
})(AddAsTypeOnly || (AddAsTypeOnly = {}));
/** @internal */
export function getImportCompletionAction(targetSymbol, moduleSymbol, exportMapKey, sourceFile, symbolName, isJsxTagName, host, program, formatContext, position, preferences, cancellationToken) {
    let exportInfos;
    if (exportMapKey) {
        // The new way: `exportMapKey` should be in the `data` of each auto-import completion entry and
        // sent back when asking for details.
        exportInfos = getExportInfoMap(sourceFile, host, program, preferences, cancellationToken).get(sourceFile.path, exportMapKey);
        Debug.assertIsDefined(exportInfos, "Some exportInfo should match the specified exportMapKey");
    }
    else {
        // The old way, kept alive for super old editors that don't give us `data` back.
        exportInfos = pathIsBareSpecifier(stripQuotes(moduleSymbol.name))
            ? [getSingleExportInfoForSymbol(targetSymbol, symbolName, moduleSymbol, program, host)]
            : getAllExportInfoForSymbol(sourceFile, targetSymbol, symbolName, moduleSymbol, isJsxTagName, program, host, preferences, cancellationToken);
        Debug.assertIsDefined(exportInfos, "Some exportInfo should match the specified symbol / moduleSymbol");
    }
    const useRequire = shouldUseRequire(sourceFile, program);
    const isValidTypeOnlyUseSite = isValidTypeOnlyAliasUseSite(getTokenAtPosition(sourceFile, position));
    const fix = Debug.checkDefined(getImportFixForSymbol(sourceFile, exportInfos, program, position, isValidTypeOnlyUseSite, useRequire, host, preferences));
    return {
        moduleSpecifier: fix.moduleSpecifier,
        codeAction: codeFixActionToCodeAction(codeActionForFix({ host, formatContext, preferences }, sourceFile, symbolName, fix, 
        /*includeSymbolNameInDescription*/ false, program, preferences)),
    };
}
/** @internal */
export function getPromoteTypeOnlyCompletionAction(sourceFile, symbolToken, program, host, formatContext, preferences) {
    const compilerOptions = program.getCompilerOptions();
    const symbolName = single(getSymbolNamesToImport(sourceFile, program.getTypeChecker(), symbolToken, compilerOptions));
    const fix = getTypeOnlyPromotionFix(sourceFile, symbolToken, symbolName, program);
    const includeSymbolNameInDescription = symbolName !== symbolToken.text;
    return fix && codeFixActionToCodeAction(codeActionForFix({ host, formatContext, preferences }, sourceFile, symbolName, fix, includeSymbolNameInDescription, program, preferences));
}
function getImportFixForSymbol(sourceFile, exportInfos, program, position, isValidTypeOnlyUseSite, useRequire, host, preferences) {
    const packageJsonImportFilter = createPackageJsonImportFilter(sourceFile, preferences, host);
    return getBestFix(getImportFixes(exportInfos, position, isValidTypeOnlyUseSite, useRequire, program, sourceFile, host, preferences).fixes, sourceFile, program, packageJsonImportFilter, host, preferences);
}
function codeFixActionToCodeAction({ description, changes, commands }) {
    return { description, changes, commands };
}
function getAllExportInfoForSymbol(importingFile, symbol, symbolName, moduleSymbol, preferCapitalized, program, host, preferences, cancellationToken) {
    const getChecker = createGetChecker(program, host);
    const isFileExcluded = preferences.autoImportFileExcludePatterns && getIsFileExcluded(host, preferences);
    const mergedModuleSymbol = program.getTypeChecker().getMergedSymbol(moduleSymbol);
    const moduleSourceFile = isFileExcluded && mergedModuleSymbol.declarations && getDeclarationOfKind(mergedModuleSymbol, SyntaxKind.SourceFile);
    const moduleSymbolExcluded = moduleSourceFile && isFileExcluded(moduleSourceFile);
    return getExportInfoMap(importingFile, host, program, preferences, cancellationToken)
        .search(importingFile.path, preferCapitalized, name => name === symbolName, info => {
        const checker = getChecker(info[0].isFromPackageJson);
        if (checker.getMergedSymbol(skipAlias(info[0].symbol, checker)) === symbol
            && (moduleSymbolExcluded || info.some(i => checker.getMergedSymbol(i.moduleSymbol) === moduleSymbol || i.symbol.parent === moduleSymbol))) {
            return info;
        }
    });
}
function getSingleExportInfoForSymbol(symbol, symbolName, moduleSymbol, program, host) {
    var _a, _b;
    const mainProgramInfo = getInfoWithChecker(program.getTypeChecker(), /*isFromPackageJson*/ false);
    if (mainProgramInfo) {
        return mainProgramInfo;
    }
    const autoImportProvider = (_b = (_a = host.getPackageJsonAutoImportProvider) === null || _a === void 0 ? void 0 : _a.call(host)) === null || _b === void 0 ? void 0 : _b.getTypeChecker();
    return Debug.checkDefined(autoImportProvider && getInfoWithChecker(autoImportProvider, /*isFromPackageJson*/ true), `Could not find symbol in specified module for code actions`);
    function getInfoWithChecker(checker, isFromPackageJson) {
        const defaultInfo = getDefaultLikeExportInfo(moduleSymbol, checker);
        if (defaultInfo && skipAlias(defaultInfo.symbol, checker) === symbol) {
            return { symbol: defaultInfo.symbol, moduleSymbol, moduleFileName: undefined, exportKind: defaultInfo.exportKind, targetFlags: skipAlias(symbol, checker).flags, isFromPackageJson };
        }
        const named = checker.tryGetMemberInModuleExportsAndProperties(symbolName, moduleSymbol);
        if (named && skipAlias(named, checker) === symbol) {
            return { symbol: named, moduleSymbol, moduleFileName: undefined, exportKind: ExportKind.Named, targetFlags: skipAlias(symbol, checker).flags, isFromPackageJson };
        }
    }
}
function getImportFixes(exportInfos, usagePosition, isValidTypeOnlyUseSite, useRequire, program, sourceFile, host, preferences, importMap = isFullSourceFile(sourceFile) ? createExistingImportMap(sourceFile, program) : undefined, fromCacheOnly) {
    const checker = program.getTypeChecker();
    const existingImports = importMap ? flatMap(exportInfos, importMap.getImportsForExportInfo) : emptyArray;
    const useNamespace = usagePosition !== undefined && tryUseExistingNamespaceImport(existingImports, usagePosition);
    const addToExisting = tryAddToExistingImport(existingImports, isValidTypeOnlyUseSite, checker, program.getCompilerOptions());
    if (addToExisting) {
        // Don't bother providing an action to add a new import if we can add to an existing one.
        return {
            computedWithoutCacheCount: 0,
            fixes: [...(useNamespace ? [useNamespace] : emptyArray), addToExisting],
        };
    }
    const { fixes, computedWithoutCacheCount = 0 } = getFixesForAddImport(exportInfos, existingImports, program, sourceFile, usagePosition, isValidTypeOnlyUseSite, useRequire, host, preferences, fromCacheOnly);
    return {
        computedWithoutCacheCount,
        fixes: [...(useNamespace ? [useNamespace] : emptyArray), ...fixes],
    };
}
function tryUseExistingNamespaceImport(existingImports, position) {
    // It is possible that multiple import statements with the same specifier exist in the file.
    // e.g.
    //
    //     import * as ns from "foo";
    //     import { member1, member2 } from "foo";
    //
    //     member3/**/ <-- cusor here
    //
    // in this case we should provie 2 actions:
    //     1. change "member3" to "ns.member3"
    //     2. add "member3" to the second import statement's import list
    // and it is up to the user to decide which one fits best.
    return firstDefined(existingImports, ({ declaration, importKind }) => {
        var _a;
        if (importKind !== ImportKind.Named)
            return undefined;
        const namespacePrefix = getNamespaceLikeImportText(declaration);
        const moduleSpecifier = namespacePrefix && ((_a = tryGetModuleSpecifierFromDeclaration(declaration)) === null || _a === void 0 ? void 0 : _a.text);
        if (moduleSpecifier) {
            return { kind: 0 /* ImportFixKind.UseNamespace */, namespacePrefix, usagePosition: position, moduleSpecifierKind: undefined, moduleSpecifier };
        }
    });
}
function getNamespaceLikeImportText(declaration) {
    var _a, _b, _c;
    switch (declaration.kind) {
        case SyntaxKind.VariableDeclaration:
            return (_a = tryCast(declaration.name, isIdentifier)) === null || _a === void 0 ? void 0 : _a.text;
        case SyntaxKind.ImportEqualsDeclaration:
            return declaration.name.text;
        case SyntaxKind.JSDocImportTag:
        case SyntaxKind.ImportDeclaration:
            return (_c = tryCast((_b = declaration.importClause) === null || _b === void 0 ? void 0 : _b.namedBindings, isNamespaceImport)) === null || _c === void 0 ? void 0 : _c.name.text;
        default:
            return Debug.assertNever(declaration);
    }
}
function getAddAsTypeOnly(isValidTypeOnlyUseSite, isForNewImportDeclaration, symbol, targetFlags, checker, compilerOptions) {
    if (!isValidTypeOnlyUseSite) {
        // Can't use a type-only import if the usage is an emitting position
        return 4 /* AddAsTypeOnly.NotAllowed */;
    }
    if (symbol &&
        compilerOptions.verbatimModuleSyntax &&
        (!(targetFlags & SymbolFlags.Value) || !!checker.getTypeOnlyAliasDeclaration(symbol))) {
        // A type-only import is required for this symbol if under these settings if the symbol will
        // be erased, which will happen if the target symbol is purely a type or if it was exported/imported
        // as type-only already somewhere between this import and the target.
        return 2 /* AddAsTypeOnly.Required */;
    }
    return 1 /* AddAsTypeOnly.Allowed */;
}
function tryAddToExistingImport(existingImports, isValidTypeOnlyUseSite, checker, compilerOptions) {
    let best;
    for (const existingImport of existingImports) {
        const fix = getAddToExistingImportFix(existingImport);
        if (!fix)
            continue;
        const isTypeOnly = isTypeOnlyImportDeclaration(fix.importClauseOrBindingPattern);
        if (fix.addAsTypeOnly !== 4 /* AddAsTypeOnly.NotAllowed */ && isTypeOnly ||
            fix.addAsTypeOnly === 4 /* AddAsTypeOnly.NotAllowed */ && !isTypeOnly) {
            // Give preference to putting types in existing type-only imports and avoiding conversions
            // of import statements to/from type-only.
            return fix;
        }
        best !== null && best !== void 0 ? best : (best = fix);
    }
    return best;
    function getAddToExistingImportFix({ declaration, importKind, symbol, targetFlags }) {
        if (importKind === ImportKind.CommonJS || importKind === ImportKind.Namespace || declaration.kind === SyntaxKind.ImportEqualsDeclaration) {
            // These kinds of imports are not combinable with anything
            return undefined;
        }
        if (declaration.kind === SyntaxKind.VariableDeclaration) {
            return (importKind === ImportKind.Named || importKind === ImportKind.Default) && declaration.name.kind === SyntaxKind.ObjectBindingPattern
                ? { kind: 2 /* ImportFixKind.AddToExisting */, importClauseOrBindingPattern: declaration.name, importKind, moduleSpecifierKind: undefined, moduleSpecifier: declaration.initializer.arguments[0].text, addAsTypeOnly: 4 /* AddAsTypeOnly.NotAllowed */ }
                : undefined;
        }
        const { importClause } = declaration;
        if (!importClause || !isStringLiteralLike(declaration.moduleSpecifier)) {
            return undefined;
        }
        const { name, namedBindings } = importClause;
        // A type-only import may not have both a default and named imports, so the only way a name can
        // be added to an existing type-only import is adding a named import to existing named bindings.
        if (importClause.isTypeOnly && !(importKind === ImportKind.Named && namedBindings)) {
            return undefined;
        }
        // N.B. we don't have to figure out whether to use the main program checker
        // or the AutoImportProvider checker because we're adding to an existing import; the existence of
        // the import guarantees the symbol came from the main program.
        const addAsTypeOnly = getAddAsTypeOnly(isValidTypeOnlyUseSite, /*isForNewImportDeclaration*/ false, symbol, targetFlags, checker, compilerOptions);
        if (importKind === ImportKind.Default && (name || // Cannot add a default import to a declaration that already has one
            addAsTypeOnly === 2 /* AddAsTypeOnly.Required */ && namedBindings // Cannot add a default import as type-only if the import already has named bindings
        )) {
            return undefined;
        }
        if (importKind === ImportKind.Named &&
            (namedBindings === null || namedBindings === void 0 ? void 0 : namedBindings.kind) === SyntaxKind.NamespaceImport // Cannot add a named import to a declaration that has a namespace import
        ) {
            return undefined;
        }
        return {
            kind: 2 /* ImportFixKind.AddToExisting */,
            importClauseOrBindingPattern: importClause,
            importKind,
            moduleSpecifierKind: undefined,
            moduleSpecifier: declaration.moduleSpecifier.text,
            addAsTypeOnly,
        };
    }
}
function createExistingImportMap(importingFile, program) {
    const checker = program.getTypeChecker();
    let importMap;
    for (const moduleSpecifier of importingFile.imports) {
        const i = importFromModuleSpecifier(moduleSpecifier);
        if (isVariableDeclarationInitializedToRequire(i.parent)) {
            const moduleSymbol = checker.resolveExternalModuleName(moduleSpecifier);
            if (moduleSymbol) {
                (importMap || (importMap = createMultiMap())).add(getSymbolId(moduleSymbol), i.parent);
            }
        }
        else if (i.kind === SyntaxKind.ImportDeclaration || i.kind === SyntaxKind.ImportEqualsDeclaration || i.kind === SyntaxKind.JSDocImportTag) {
            const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
            if (moduleSymbol) {
                (importMap || (importMap = createMultiMap())).add(getSymbolId(moduleSymbol), i);
            }
        }
    }
    return {
        getImportsForExportInfo: ({ moduleSymbol, exportKind, targetFlags, symbol }) => {
            const matchingDeclarations = importMap === null || importMap === void 0 ? void 0 : importMap.get(getSymbolId(moduleSymbol));
            if (!matchingDeclarations)
                return emptyArray;
            // Can't use an es6 import for a type in JS.
            if (isSourceFileJS(importingFile)
                && !(targetFlags & SymbolFlags.Value)
                && !every(matchingDeclarations, isJSDocImportTag))
                return emptyArray;
            const importKind = getImportKind(importingFile, exportKind, program);
            return matchingDeclarations.map(declaration => ({ declaration, importKind, symbol, targetFlags }));
        },
    };
}
function shouldUseRequire(sourceFile, program) {
    // 1. TypeScript files don't use require variable declarations
    if (!hasJSFileExtension(sourceFile.fileName)) {
        return false;
    }
    // 2. If the current source file is unambiguously CJS or ESM, go with that
    if (sourceFile.commonJsModuleIndicator && !sourceFile.externalModuleIndicator)
        return true;
    if (sourceFile.externalModuleIndicator && !sourceFile.commonJsModuleIndicator)
        return false;
    // 3. If there's a tsconfig/jsconfig, use its module setting
    const compilerOptions = program.getCompilerOptions();
    if (compilerOptions.configFile) {
        return getEmitModuleKind(compilerOptions) < ModuleKind.ES2015;
    }
    // 4. In --module nodenext, assume we're not emitting JS -> JS, so use
    //    whatever syntax Node expects based on the detected module kind
    //    TODO: consider removing `impliedNodeFormatForEmit`
    if (getImpliedNodeFormatForEmit(sourceFile, program) === ModuleKind.CommonJS)
        return true;
    if (getImpliedNodeFormatForEmit(sourceFile, program) === ModuleKind.ESNext)
        return false;
    // 5. Match the first other JS file in the program that's unambiguously CJS or ESM
    for (const otherFile of program.getSourceFiles()) {
        if (otherFile === sourceFile || !isSourceFileJS(otherFile) || program.isSourceFileFromExternalLibrary(otherFile))
            continue;
        if (otherFile.commonJsModuleIndicator && !otherFile.externalModuleIndicator)
            return true;
        if (otherFile.externalModuleIndicator && !otherFile.commonJsModuleIndicator)
            return false;
    }
    // 6. Literally nothing to go on
    return true;
}
function createGetChecker(program, host) {
    return memoizeOne((isFromPackageJson) => isFromPackageJson ? host.getPackageJsonAutoImportProvider().getTypeChecker() : program.getTypeChecker());
}
function getNewImportFixes(program, sourceFile, usagePosition, isValidTypeOnlyUseSite, useRequire, exportInfo, host, preferences, fromCacheOnly) {
    const isJs = hasJSFileExtension(sourceFile.fileName);
    const compilerOptions = program.getCompilerOptions();
    const moduleSpecifierResolutionHost = createModuleSpecifierResolutionHost(program, host);
    const getChecker = createGetChecker(program, host);
    const moduleResolution = getEmitModuleResolutionKind(compilerOptions);
    const rejectNodeModulesRelativePaths = moduleResolutionUsesNodeModules(moduleResolution);
    const getModuleSpecifiers = fromCacheOnly
        ? (exportInfo) => moduleSpecifiers.tryGetModuleSpecifiersFromCache(exportInfo.moduleSymbol, sourceFile, moduleSpecifierResolutionHost, preferences)
        : (exportInfo, checker) => moduleSpecifiers.getModuleSpecifiersWithCacheInfo(exportInfo.moduleSymbol, checker, compilerOptions, sourceFile, moduleSpecifierResolutionHost, preferences, /*options*/ undefined, /*forAutoImport*/ true);
    let computedWithoutCacheCount = 0;
    const fixes = flatMap(exportInfo, (exportInfo, i) => {
        var _a;
        const checker = getChecker(exportInfo.isFromPackageJson);
        const { computedWithoutCache, moduleSpecifiers, kind: moduleSpecifierKind } = (_a = getModuleSpecifiers(exportInfo, checker)) !== null && _a !== void 0 ? _a : {};
        const importedSymbolHasValueMeaning = !!(exportInfo.targetFlags & SymbolFlags.Value);
        const addAsTypeOnly = getAddAsTypeOnly(isValidTypeOnlyUseSite, /*isForNewImportDeclaration*/ true, exportInfo.symbol, exportInfo.targetFlags, checker, compilerOptions);
        computedWithoutCacheCount += computedWithoutCache ? 1 : 0;
        return mapDefined(moduleSpecifiers, (moduleSpecifier) => {
            if (rejectNodeModulesRelativePaths && pathContainsNodeModules(moduleSpecifier)) {
                return undefined;
            }
            if (!importedSymbolHasValueMeaning && isJs && usagePosition !== undefined) {
                // `position` should only be undefined at a missing jsx namespace, in which case we shouldn't be looking for pure types.
                return { kind: 1 /* ImportFixKind.JsdocTypeImport */, moduleSpecifierKind, moduleSpecifier, usagePosition, exportInfo, isReExport: i > 0 };
            }
            const importKind = getImportKind(sourceFile, exportInfo.exportKind, program);
            let qualification;
            if (usagePosition !== undefined && importKind === ImportKind.CommonJS && exportInfo.exportKind === ExportKind.Named) {
                // Compiler options are restricting our import options to a require, but we need to access
                // a named export or property of the exporting module. We need to import the entire module
                // and insert a property access, e.g. `writeFile` becomes
                //
                // import fs = require("fs"); // or const in JS
                // fs.writeFile
                const exportEquals = checker.resolveExternalModuleSymbol(exportInfo.moduleSymbol);
                let namespacePrefix;
                if (exportEquals !== exportInfo.moduleSymbol) {
                    namespacePrefix = forEachNameOfDefaultExport(exportEquals, checker, getEmitScriptTarget(compilerOptions), identity);
                }
                namespacePrefix || (namespacePrefix = moduleSymbolToValidIdentifier(exportInfo.moduleSymbol, getEmitScriptTarget(compilerOptions), 
                /*forceCapitalize*/ false));
                qualification = { namespacePrefix, usagePosition };
            }
            return {
                kind: 3 /* ImportFixKind.AddNew */,
                moduleSpecifierKind,
                moduleSpecifier,
                importKind,
                useRequire,
                addAsTypeOnly,
                exportInfo,
                isReExport: i > 0,
                qualification,
            };
        });
    });
    return { computedWithoutCacheCount, fixes };
}
function getFixesForAddImport(exportInfos, existingImports, program, sourceFile, usagePosition, isValidTypeOnlyUseSite, useRequire, host, preferences, fromCacheOnly) {
    const existingDeclaration = firstDefined(existingImports, info => newImportInfoFromExistingSpecifier(info, isValidTypeOnlyUseSite, useRequire, program.getTypeChecker(), program.getCompilerOptions()));
    return existingDeclaration ? { fixes: [existingDeclaration] } : getNewImportFixes(program, sourceFile, usagePosition, isValidTypeOnlyUseSite, useRequire, exportInfos, host, preferences, fromCacheOnly);
}
function newImportInfoFromExistingSpecifier({ declaration, importKind, symbol, targetFlags }, isValidTypeOnlyUseSite, useRequire, checker, compilerOptions) {
    var _a;
    const moduleSpecifier = (_a = tryGetModuleSpecifierFromDeclaration(declaration)) === null || _a === void 0 ? void 0 : _a.text;
    if (moduleSpecifier) {
        const addAsTypeOnly = useRequire
            ? 4 /* AddAsTypeOnly.NotAllowed */
            : getAddAsTypeOnly(isValidTypeOnlyUseSite, /*isForNewImportDeclaration*/ true, symbol, targetFlags, checker, compilerOptions);
        return { kind: 3 /* ImportFixKind.AddNew */, moduleSpecifierKind: undefined, moduleSpecifier, importKind, addAsTypeOnly, useRequire };
    }
}
function getFixInfos(context, errorCode, pos, useAutoImportProvider) {
    const symbolToken = getTokenAtPosition(context.sourceFile, pos);
    let info;
    if (errorCode === Diagnostics._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead.code) {
        info = getFixesInfoForUMDImport(context, symbolToken);
    }
    else if (!isIdentifier(symbolToken)) {
        return undefined;
    }
    else if (errorCode === Diagnostics._0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type.code) {
        const symbolName = single(getSymbolNamesToImport(context.sourceFile, context.program.getTypeChecker(), symbolToken, context.program.getCompilerOptions()));
        const fix = getTypeOnlyPromotionFix(context.sourceFile, symbolToken, symbolName, context.program);
        return fix && [{ fix, symbolName, errorIdentifierText: symbolToken.text }];
    }
    else {
        info = getFixesInfoForNonUMDImport(context, symbolToken, useAutoImportProvider);
    }
    const packageJsonImportFilter = createPackageJsonImportFilter(context.sourceFile, context.preferences, context.host);
    return info && sortFixInfo(info, context.sourceFile, context.program, packageJsonImportFilter, context.host, context.preferences);
}
function sortFixInfo(fixes, sourceFile, program, packageJsonImportFilter, host, preferences) {
    const _toPath = (fileName) => toPath(fileName, host.getCurrentDirectory(), hostGetCanonicalFileName(host));
    return toSorted(fixes, (a, b) => compareBooleans(!!a.isJsxNamespaceFix, !!b.isJsxNamespaceFix) ||
        compareValues(a.fix.kind, b.fix.kind) ||
        compareModuleSpecifiers(a.fix, b.fix, sourceFile, program, preferences, packageJsonImportFilter.allowsImportingSpecifier, _toPath));
}
function getFixInfosWithoutDiagnostic(context, symbolToken, useAutoImportProvider) {
    const info = getFixesInfoForNonUMDImport(context, symbolToken, useAutoImportProvider);
    const packageJsonImportFilter = createPackageJsonImportFilter(context.sourceFile, context.preferences, context.host);
    return info && sortFixInfo(info, context.sourceFile, context.program, packageJsonImportFilter, context.host, context.preferences);
}
function getBestFix(fixes, sourceFile, program, packageJsonImportFilter, host, preferences) {
    if (!some(fixes))
        return;
    // These will always be placed first if available, and are better than other kinds
    if (fixes[0].kind === 0 /* ImportFixKind.UseNamespace */ || fixes[0].kind === 2 /* ImportFixKind.AddToExisting */) {
        return fixes[0];
    }
    return fixes.reduce((best, fix) => 
    // Takes true branch of conditional if `fix` is better than `best`
    compareModuleSpecifiers(fix, best, sourceFile, program, preferences, packageJsonImportFilter.allowsImportingSpecifier, fileName => toPath(fileName, host.getCurrentDirectory(), hostGetCanonicalFileName(host))) === Comparison.LessThan ? fix : best);
}
/** @returns `Comparison.LessThan` if `a` is better than `b`. */
function compareModuleSpecifiers(a, b, importingFile, program, preferences, allowsImportingSpecifier, toPath) {
    if (a.kind !== 0 /* ImportFixKind.UseNamespace */ && b.kind !== 0 /* ImportFixKind.UseNamespace */) {
        return compareBooleans(b.moduleSpecifierKind !== "node_modules" || allowsImportingSpecifier(b.moduleSpecifier), a.moduleSpecifierKind !== "node_modules" || allowsImportingSpecifier(a.moduleSpecifier))
            || compareModuleSpecifierRelativity(a, b, preferences)
            || compareNodeCoreModuleSpecifiers(a.moduleSpecifier, b.moduleSpecifier, importingFile, program)
            || compareBooleans(isFixPossiblyReExportingImportingFile(a, importingFile.path, toPath), isFixPossiblyReExportingImportingFile(b, importingFile.path, toPath))
            || compareNumberOfDirectorySeparators(a.moduleSpecifier, b.moduleSpecifier);
    }
    return Comparison.EqualTo;
}
function compareModuleSpecifierRelativity(a, b, preferences) {
    if (preferences.importModuleSpecifierPreference === "non-relative" || preferences.importModuleSpecifierPreference === "project-relative") {
        return compareBooleans(a.moduleSpecifierKind === "relative", b.moduleSpecifierKind === "relative");
    }
    return Comparison.EqualTo;
}
// This is a simple heuristic to try to avoid creating an import cycle with a barrel re-export.
// E.g., do not `import { Foo } from ".."` when you could `import { Foo } from "../Foo"`.
// This can produce false positives or negatives if re-exports cross into sibling directories
// (e.g. `export * from "../whatever"`) or are not named "index".
function isFixPossiblyReExportingImportingFile(fix, importingFilePath, toPath) {
    var _a;
    if (fix.isReExport &&
        ((_a = fix.exportInfo) === null || _a === void 0 ? void 0 : _a.moduleFileName) &&
        isIndexFileName(fix.exportInfo.moduleFileName)) {
        const reExportDir = toPath(getDirectoryPath(fix.exportInfo.moduleFileName));
        return startsWith(importingFilePath, reExportDir);
    }
    return false;
}
function isIndexFileName(fileName) {
    return getBaseFileName(fileName, [".js", ".jsx", ".d.ts", ".ts", ".tsx"], /*ignoreCase*/ true) === "index";
}
function compareNodeCoreModuleSpecifiers(a, b, importingFile, program) {
    if (startsWith(a, "node:") && !startsWith(b, "node:"))
        return shouldUseUriStyleNodeCoreModules(importingFile, program) ? Comparison.LessThan : Comparison.GreaterThan;
    if (startsWith(b, "node:") && !startsWith(a, "node:"))
        return shouldUseUriStyleNodeCoreModules(importingFile, program) ? Comparison.GreaterThan : Comparison.LessThan;
    return Comparison.EqualTo;
}
function getFixesInfoForUMDImport({ sourceFile, program, host, preferences }, token) {
    const checker = program.getTypeChecker();
    const umdSymbol = getUmdSymbol(token, checker);
    if (!umdSymbol)
        return undefined;
    const symbol = checker.getAliasedSymbol(umdSymbol);
    const symbolName = umdSymbol.name;
    const exportInfo = [{ symbol: umdSymbol, moduleSymbol: symbol, moduleFileName: undefined, exportKind: ExportKind.UMD, targetFlags: symbol.flags, isFromPackageJson: false }];
    const useRequire = shouldUseRequire(sourceFile, program);
    // `usagePosition` is undefined because `token` may not actually be a usage of the symbol we're importing.
    // For example, we might need to import `React` in order to use an arbitrary JSX tag. We could send a position
    // for other UMD imports, but `usagePosition` is currently only used to insert a namespace qualification
    // before a named import, like converting `writeFile` to `fs.writeFile` (whether `fs` is already imported or
    // not), and this function will only be called for UMD symbols, which are necessarily an `export =`, not a
    // named export.
    const fixes = getImportFixes(exportInfo, /*usagePosition*/ undefined, /*isValidTypeOnlyUseSite*/ false, useRequire, program, sourceFile, host, preferences).fixes;
    return fixes.map(fix => { var _a; return ({ fix, symbolName, errorIdentifierText: (_a = tryCast(token, isIdentifier)) === null || _a === void 0 ? void 0 : _a.text }); });
}
function getUmdSymbol(token, checker) {
    // try the identifier to see if it is the umd symbol
    const umdSymbol = isIdentifier(token) ? checker.getSymbolAtLocation(token) : undefined;
    if (isUMDExportSymbol(umdSymbol))
        return umdSymbol;
    // The error wasn't for the symbolAtLocation, it was for the JSX tag itself, which needs access to e.g. `React`.
    const { parent } = token;
    if ((isJsxOpeningLikeElement(parent) && parent.tagName === token) || isJsxOpeningFragment(parent)) {
        const parentSymbol = checker.resolveName(checker.getJsxNamespace(parent), isJsxOpeningLikeElement(parent) ? token : parent, SymbolFlags.Value, /*excludeGlobals*/ false);
        if (isUMDExportSymbol(parentSymbol)) {
            return parentSymbol;
        }
    }
    return undefined;
}
/**
 * @param forceImportKeyword Indicates that the user has already typed `import`, so the result must start with `import`.
 * (In other words, do not allow `const x = require("...")` for JS files.)
 *
 * @internal
 */
export function getImportKind(importingFile, exportKind, program, forceImportKeyword) {
    if (program.getCompilerOptions().verbatimModuleSyntax && getEmitModuleFormatOfFile(importingFile, program) === ModuleKind.CommonJS) {
        // TODO: if the exporting file is ESM under nodenext, or `forceImport` is given in a JS file, this is impossible
        return ImportKind.CommonJS;
    }
    switch (exportKind) {
        case ExportKind.Named:
            return ImportKind.Named;
        case ExportKind.Default:
            return ImportKind.Default;
        case ExportKind.ExportEquals:
            return getExportEqualsImportKind(importingFile, program.getCompilerOptions(), !!forceImportKeyword);
        case ExportKind.UMD:
            return getUmdImportKind(importingFile, program, !!forceImportKeyword);
        case ExportKind.Module:
            return ImportKind.Namespace;
        default:
            return Debug.assertNever(exportKind);
    }
}
function getUmdImportKind(importingFile, program, forceImportKeyword) {
    // Import a synthetic `default` if enabled.
    if (getAllowSyntheticDefaultImports(program.getCompilerOptions())) {
        return ImportKind.Default;
    }
    // When a synthetic `default` is unavailable, use `import..require` if the module kind supports it.
    const moduleKind = getEmitModuleKind(program.getCompilerOptions());
    switch (moduleKind) {
        case ModuleKind.AMD:
        case ModuleKind.CommonJS:
        case ModuleKind.UMD:
            if (hasJSFileExtension(importingFile.fileName)) {
                return importingFile.externalModuleIndicator || forceImportKeyword ? ImportKind.Namespace : ImportKind.CommonJS;
            }
            return ImportKind.CommonJS;
        case ModuleKind.System:
        case ModuleKind.ES2015:
        case ModuleKind.ES2020:
        case ModuleKind.ES2022:
        case ModuleKind.ESNext:
        case ModuleKind.None:
        case ModuleKind.Preserve:
            // Fall back to the `import * as ns` style import.
            return ImportKind.Namespace;
        case ModuleKind.Node16:
        case ModuleKind.Node18:
        case ModuleKind.NodeNext:
            return getImpliedNodeFormatForEmit(importingFile, program) === ModuleKind.ESNext ? ImportKind.Namespace : ImportKind.CommonJS;
        default:
            return Debug.assertNever(moduleKind, `Unexpected moduleKind ${moduleKind}`);
    }
}
function getFixesInfoForNonUMDImport({ sourceFile, program, cancellationToken, host, preferences }, symbolToken, useAutoImportProvider) {
    const checker = program.getTypeChecker();
    const compilerOptions = program.getCompilerOptions();
    return flatMap(getSymbolNamesToImport(sourceFile, checker, symbolToken, compilerOptions), symbolName => {
        // "default" is a keyword and not a legal identifier for the import, but appears as an identifier.
        if (symbolName === InternalSymbolName.Default) {
            return undefined;
        }
        const isValidTypeOnlyUseSite = isValidTypeOnlyAliasUseSite(symbolToken);
        const useRequire = shouldUseRequire(sourceFile, program);
        const exportInfo = getExportInfos(symbolName, isJSXTagName(symbolToken), getMeaningFromLocation(symbolToken), cancellationToken, sourceFile, program, useAutoImportProvider, host, preferences);
        return arrayFrom(flatMapIterator(exportInfo.values(), exportInfos => getImportFixes(exportInfos, symbolToken.getStart(sourceFile), isValidTypeOnlyUseSite, useRequire, program, sourceFile, host, preferences).fixes), fix => ({ fix, symbolName, errorIdentifierText: symbolToken.text, isJsxNamespaceFix: symbolName !== symbolToken.text }));
    });
}
function getTypeOnlyPromotionFix(sourceFile, symbolToken, symbolName, program) {
    const checker = program.getTypeChecker();
    const symbol = checker.resolveName(symbolName, symbolToken, SymbolFlags.Value, /*excludeGlobals*/ true);
    if (!symbol)
        return undefined;
    const typeOnlyAliasDeclaration = checker.getTypeOnlyAliasDeclaration(symbol);
    if (!typeOnlyAliasDeclaration || getSourceFileOfNode(typeOnlyAliasDeclaration) !== sourceFile)
        return undefined;
    return { kind: 4 /* ImportFixKind.PromoteTypeOnly */, typeOnlyAliasDeclaration };
}
function getSymbolNamesToImport(sourceFile, checker, symbolToken, compilerOptions) {
    const parent = symbolToken.parent;
    if ((isJsxOpeningLikeElement(parent) || isJsxClosingElement(parent)) && parent.tagName === symbolToken && jsxModeNeedsExplicitImport(compilerOptions.jsx)) {
        const jsxNamespace = checker.getJsxNamespace(sourceFile);
        if (needsJsxNamespaceFix(jsxNamespace, symbolToken, checker)) {
            const needsComponentNameFix = !isIntrinsicJsxName(symbolToken.text) && !checker.resolveName(symbolToken.text, symbolToken, SymbolFlags.Value, /*excludeGlobals*/ false);
            return needsComponentNameFix ? [symbolToken.text, jsxNamespace] : [jsxNamespace];
        }
    }
    return [symbolToken.text];
}
function needsJsxNamespaceFix(jsxNamespace, symbolToken, checker) {
    if (isIntrinsicJsxName(symbolToken.text))
        return true; // If we were triggered by a matching error code on an intrinsic, the error must have been about missing the JSX factory
    const namespaceSymbol = checker.resolveName(jsxNamespace, symbolToken, SymbolFlags.Value, /*excludeGlobals*/ true);
    return !namespaceSymbol || some(namespaceSymbol.declarations, isTypeOnlyImportOrExportDeclaration) && !(namespaceSymbol.flags & SymbolFlags.Value);
}
// Returns a map from an exported symbol's ID to a list of every way it's (re-)exported.
function getExportInfos(symbolName, isJsxTagName, currentTokenMeaning, cancellationToken, fromFile, program, useAutoImportProvider, host, preferences) {
    var _a;
    // For each original symbol, keep all re-exports of that symbol together so we can call `getCodeActionsForImport` on the whole group at once.
    // Maps symbol id to info for modules providing that symbol (original export + re-exports).
    const originalSymbolToExportInfos = createMultiMap();
    const packageJsonFilter = createPackageJsonImportFilter(fromFile, preferences, host);
    const moduleSpecifierCache = (_a = host.getModuleSpecifierCache) === null || _a === void 0 ? void 0 : _a.call(host);
    const getModuleSpecifierResolutionHost = memoizeOne((isFromPackageJson) => {
        return createModuleSpecifierResolutionHost(isFromPackageJson ? host.getPackageJsonAutoImportProvider() : program, host);
    });
    function addSymbol(moduleSymbol, toFile, exportedSymbol, exportKind, program, isFromPackageJson) {
        const moduleSpecifierResolutionHost = getModuleSpecifierResolutionHost(isFromPackageJson);
        if (isImportable(program, fromFile, toFile, moduleSymbol, preferences, packageJsonFilter, moduleSpecifierResolutionHost, moduleSpecifierCache)) {
            const checker = program.getTypeChecker();
            originalSymbolToExportInfos.add(getUniqueSymbolId(exportedSymbol, checker).toString(), { symbol: exportedSymbol, moduleSymbol, moduleFileName: toFile === null || toFile === void 0 ? void 0 : toFile.fileName, exportKind, targetFlags: skipAlias(exportedSymbol, checker).flags, isFromPackageJson });
        }
    }
    forEachExternalModuleToImportFrom(program, host, preferences, useAutoImportProvider, (moduleSymbol, sourceFile, program, isFromPackageJson) => {
        const checker = program.getTypeChecker();
        cancellationToken.throwIfCancellationRequested();
        const compilerOptions = program.getCompilerOptions();
        const defaultInfo = getDefaultLikeExportInfo(moduleSymbol, checker);
        if (defaultInfo
            && symbolFlagsHaveMeaning(checker.getSymbolFlags(defaultInfo.symbol), currentTokenMeaning)
            && forEachNameOfDefaultExport(defaultInfo.symbol, checker, getEmitScriptTarget(compilerOptions), (name, capitalizedName) => (isJsxTagName ? capitalizedName !== null && capitalizedName !== void 0 ? capitalizedName : name : name) === symbolName)) {
            addSymbol(moduleSymbol, sourceFile, defaultInfo.symbol, defaultInfo.exportKind, program, isFromPackageJson);
        }
        // check exports with the same name
        const exportSymbolWithIdenticalName = checker.tryGetMemberInModuleExportsAndProperties(symbolName, moduleSymbol);
        if (exportSymbolWithIdenticalName && symbolFlagsHaveMeaning(checker.getSymbolFlags(exportSymbolWithIdenticalName), currentTokenMeaning)) {
            addSymbol(moduleSymbol, sourceFile, exportSymbolWithIdenticalName, ExportKind.Named, program, isFromPackageJson);
        }
    });
    return originalSymbolToExportInfos;
}
function getExportEqualsImportKind(importingFile, compilerOptions, forceImportKeyword) {
    var _a;
    const allowSyntheticDefaults = getAllowSyntheticDefaultImports(compilerOptions);
    const isJS = hasJSFileExtension(importingFile.fileName);
    // 1. 'import =' will not work in es2015+ TS files, so the decision is between a default
    //    and a namespace import, based on allowSyntheticDefaultImports/esModuleInterop.
    if (!isJS && getEmitModuleKind(compilerOptions) >= ModuleKind.ES2015) {
        return allowSyntheticDefaults ? ImportKind.Default : ImportKind.Namespace;
    }
    // 2. 'import =' will not work in JavaScript, so the decision is between a default import,
    //    a namespace import, and const/require.
    if (isJS) {
        return importingFile.externalModuleIndicator || forceImportKeyword
            ? allowSyntheticDefaults ? ImportKind.Default : ImportKind.Namespace
            : ImportKind.CommonJS;
    }
    // 3. At this point the most correct choice is probably 'import =', but people
    //    really hate that, so look to see if the importing file has any precedent
    //    on how to handle it.
    for (const statement of (_a = importingFile.statements) !== null && _a !== void 0 ? _a : emptyArray) {
        // `import foo` parses as an ImportEqualsDeclaration even though it could be an ImportDeclaration
        if (isImportEqualsDeclaration(statement) && !nodeIsMissing(statement.moduleReference)) {
            return ImportKind.CommonJS;
        }
    }
    // 4. We have no precedent to go on, so just use a default import if
    //    allowSyntheticDefaultImports/esModuleInterop is enabled.
    return allowSyntheticDefaults ? ImportKind.Default : ImportKind.CommonJS;
}
function codeActionForFix(context, sourceFile, symbolName, fix, includeSymbolNameInDescription, program, preferences) {
    let diag;
    const changes = textChanges.ChangeTracker.with(context, tracker => {
        diag = codeActionForFixWorker(tracker, sourceFile, symbolName, fix, includeSymbolNameInDescription, program, preferences);
    });
    return createCodeFixAction(importFixName, changes, diag, importFixId, Diagnostics.Add_all_missing_imports);
}
function codeActionForFixWorker(changes, sourceFile, symbolName, fix, includeSymbolNameInDescription, program, preferences) {
    const quotePreference = getQuotePreference(sourceFile, preferences);
    switch (fix.kind) {
        case 0 /* ImportFixKind.UseNamespace */:
            addNamespaceQualifier(changes, sourceFile, fix);
            return [Diagnostics.Change_0_to_1, symbolName, `${fix.namespacePrefix}.${symbolName}`];
        case 1 /* ImportFixKind.JsdocTypeImport */:
            addImportType(changes, sourceFile, fix, quotePreference);
            return [Diagnostics.Change_0_to_1, symbolName, getImportTypePrefix(fix.moduleSpecifier, quotePreference) + symbolName];
        case 2 /* ImportFixKind.AddToExisting */: {
            const { importClauseOrBindingPattern, importKind, addAsTypeOnly, moduleSpecifier } = fix;
            doAddExistingFix(changes, sourceFile, importClauseOrBindingPattern, importKind === ImportKind.Default ? { name: symbolName, addAsTypeOnly } : undefined, importKind === ImportKind.Named ? [{ name: symbolName, addAsTypeOnly }] : emptyArray, 
            /*removeExistingImportSpecifiers*/ undefined, preferences);
            const moduleSpecifierWithoutQuotes = stripQuotes(moduleSpecifier);
            return includeSymbolNameInDescription
                ? [Diagnostics.Import_0_from_1, symbolName, moduleSpecifierWithoutQuotes]
                : [Diagnostics.Update_import_from_0, moduleSpecifierWithoutQuotes];
        }
        case 3 /* ImportFixKind.AddNew */: {
            const { importKind, moduleSpecifier, addAsTypeOnly, useRequire, qualification } = fix;
            const getDeclarations = useRequire ? getNewRequires : getNewImports;
            const defaultImport = importKind === ImportKind.Default ? { name: symbolName, addAsTypeOnly } : undefined;
            const namedImports = importKind === ImportKind.Named ? [{ name: symbolName, addAsTypeOnly }] : undefined;
            const namespaceLikeImport = importKind === ImportKind.Namespace || importKind === ImportKind.CommonJS
                ? { importKind, name: (qualification === null || qualification === void 0 ? void 0 : qualification.namespacePrefix) || symbolName, addAsTypeOnly }
                : undefined;
            insertImports(changes, sourceFile, getDeclarations(moduleSpecifier, quotePreference, defaultImport, namedImports, namespaceLikeImport, program.getCompilerOptions(), preferences), 
            /*blankLineBetween*/ true, preferences);
            if (qualification) {
                addNamespaceQualifier(changes, sourceFile, qualification);
            }
            return includeSymbolNameInDescription
                ? [Diagnostics.Import_0_from_1, symbolName, moduleSpecifier]
                : [Diagnostics.Add_import_from_0, moduleSpecifier];
        }
        case 4 /* ImportFixKind.PromoteTypeOnly */: {
            const { typeOnlyAliasDeclaration } = fix;
            const promotedDeclaration = promoteFromTypeOnly(changes, typeOnlyAliasDeclaration, program, sourceFile, preferences);
            return promotedDeclaration.kind === SyntaxKind.ImportSpecifier
                ? [Diagnostics.Remove_type_from_import_of_0_from_1, symbolName, getModuleSpecifierText(promotedDeclaration.parent.parent)]
                : [Diagnostics.Remove_type_from_import_declaration_from_0, getModuleSpecifierText(promotedDeclaration)];
        }
        default:
            return Debug.assertNever(fix, `Unexpected fix kind ${fix.kind}`);
    }
}
function getModuleSpecifierText(promotedDeclaration) {
    var _a, _b;
    return promotedDeclaration.kind === SyntaxKind.ImportEqualsDeclaration
        ? ((_b = tryCast((_a = tryCast(promotedDeclaration.moduleReference, isExternalModuleReference)) === null || _a === void 0 ? void 0 : _a.expression, isStringLiteralLike)) === null || _b === void 0 ? void 0 : _b.text) || promotedDeclaration.moduleReference.getText()
        : cast(promotedDeclaration.parent.moduleSpecifier, isStringLiteral).text;
}
function promoteFromTypeOnly(changes, aliasDeclaration, program, sourceFile, preferences) {
    var _a;
    const compilerOptions = program.getCompilerOptions();
    // See comment in `doAddExistingFix` on constant with the same name.
    const convertExistingToTypeOnly = compilerOptions.verbatimModuleSyntax;
    switch (aliasDeclaration.kind) {
        case SyntaxKind.ImportSpecifier:
            if (aliasDeclaration.isTypeOnly) {
                if (aliasDeclaration.parent.elements.length > 1) {
                    const newSpecifier = factory.updateImportSpecifier(aliasDeclaration, /*isTypeOnly*/ false, aliasDeclaration.propertyName, aliasDeclaration.name);
                    const { specifierComparer } = OrganizeImports.getNamedImportSpecifierComparerWithDetection(aliasDeclaration.parent.parent.parent, preferences, sourceFile);
                    const insertionIndex = OrganizeImports.getImportSpecifierInsertionIndex(aliasDeclaration.parent.elements, newSpecifier, specifierComparer);
                    if (insertionIndex !== aliasDeclaration.parent.elements.indexOf(aliasDeclaration)) {
                        changes.delete(sourceFile, aliasDeclaration);
                        changes.insertImportSpecifierAtIndex(sourceFile, newSpecifier, aliasDeclaration.parent, insertionIndex);
                        return aliasDeclaration;
                    }
                }
                changes.deleteRange(sourceFile, { pos: getTokenPosOfNode(aliasDeclaration.getFirstToken()), end: getTokenPosOfNode((_a = aliasDeclaration.propertyName) !== null && _a !== void 0 ? _a : aliasDeclaration.name) });
                return aliasDeclaration;
            }
            else {
                Debug.assert(aliasDeclaration.parent.parent.isTypeOnly);
                promoteImportClause(aliasDeclaration.parent.parent);
                return aliasDeclaration.parent.parent;
            }
        case SyntaxKind.ImportClause:
            promoteImportClause(aliasDeclaration);
            return aliasDeclaration;
        case SyntaxKind.NamespaceImport:
            promoteImportClause(aliasDeclaration.parent);
            return aliasDeclaration.parent;
        case SyntaxKind.ImportEqualsDeclaration:
            changes.deleteRange(sourceFile, aliasDeclaration.getChildAt(1));
            return aliasDeclaration;
        default:
            Debug.failBadSyntaxKind(aliasDeclaration);
    }
    function promoteImportClause(importClause) {
        var _a;
        changes.delete(sourceFile, getTypeKeywordOfTypeOnlyImport(importClause, sourceFile));
        // Change .ts extension to .js if necessary
        if (!compilerOptions.allowImportingTsExtensions) {
            const moduleSpecifier = tryGetModuleSpecifierFromDeclaration(importClause.parent);
            const resolvedModule = moduleSpecifier && ((_a = program.getResolvedModuleFromModuleSpecifier(moduleSpecifier, sourceFile)) === null || _a === void 0 ? void 0 : _a.resolvedModule);
            if (resolvedModule === null || resolvedModule === void 0 ? void 0 : resolvedModule.resolvedUsingTsExtension) {
                const changedExtension = changeAnyExtension(moduleSpecifier.text, getOutputExtension(moduleSpecifier.text, compilerOptions));
                changes.replaceNode(sourceFile, moduleSpecifier, factory.createStringLiteral(changedExtension));
            }
        }
        if (convertExistingToTypeOnly) {
            const namedImports = tryCast(importClause.namedBindings, isNamedImports);
            if (namedImports && namedImports.elements.length > 1) {
                const sortState = OrganizeImports.getNamedImportSpecifierComparerWithDetection(importClause.parent, preferences, sourceFile);
                if ((sortState.isSorted !== false) &&
                    aliasDeclaration.kind === SyntaxKind.ImportSpecifier &&
                    namedImports.elements.indexOf(aliasDeclaration) !== 0) {
                    // The import specifier being promoted will be the only non-type-only,
                    //  import in the NamedImports, so it should be moved to the front.
                    changes.delete(sourceFile, aliasDeclaration);
                    changes.insertImportSpecifierAtIndex(sourceFile, aliasDeclaration, namedImports, 0);
                }
                for (const element of namedImports.elements) {
                    if (element !== aliasDeclaration && !element.isTypeOnly) {
                        changes.insertModifierBefore(sourceFile, SyntaxKind.TypeKeyword, element);
                    }
                }
            }
        }
    }
}
function doAddExistingFix(changes, sourceFile, clause, defaultImport, namedImports, removeExistingImportSpecifiers, preferences) {
    var _a;
    if (clause.kind === SyntaxKind.ObjectBindingPattern) {
        if (removeExistingImportSpecifiers && clause.elements.some(e => removeExistingImportSpecifiers.has(e))) {
            // If we're both adding and removing elements, just replace and reprint the whole
            // node. The change tracker doesn't understand all the operations and can insert or
            // leave behind stray commas.
            changes.replaceNode(sourceFile, clause, factory.createObjectBindingPattern([
                ...clause.elements.filter(e => !removeExistingImportSpecifiers.has(e)),
                ...defaultImport ? [factory.createBindingElement(/*dotDotDotToken*/ undefined, /*propertyName*/ "default", defaultImport.name)] : emptyArray,
                ...namedImports.map(i => factory.createBindingElement(/*dotDotDotToken*/ undefined, i.propertyName, i.name)),
            ]));
            return;
        }
        if (defaultImport) {
            addElementToBindingPattern(clause, defaultImport.name, "default");
        }
        for (const specifier of namedImports) {
            addElementToBindingPattern(clause, specifier.name, specifier.propertyName);
        }
        return;
    }
    // promoteFromTypeOnly = true if we need to promote the entire original clause from type only
    const promoteFromTypeOnly = clause.isTypeOnly && some([defaultImport, ...namedImports], i => (i === null || i === void 0 ? void 0 : i.addAsTypeOnly) === 4 /* AddAsTypeOnly.NotAllowed */);
    const existingSpecifiers = clause.namedBindings && ((_a = tryCast(clause.namedBindings, isNamedImports)) === null || _a === void 0 ? void 0 : _a.elements);
    if (defaultImport) {
        Debug.assert(!clause.name, "Cannot add a default import to an import clause that already has one");
        changes.insertNodeAt(sourceFile, clause.getStart(sourceFile), factory.createIdentifier(defaultImport.name), { suffix: ", " });
    }
    if (namedImports.length) {
        const { specifierComparer, isSorted } = OrganizeImports.getNamedImportSpecifierComparerWithDetection(clause.parent, preferences, sourceFile);
        const newSpecifiers = toSorted(namedImports.map(namedImport => factory.createImportSpecifier((!clause.isTypeOnly || promoteFromTypeOnly) && shouldUseTypeOnly(namedImport, preferences), namedImport.propertyName === undefined ? undefined : factory.createIdentifier(namedImport.propertyName), factory.createIdentifier(namedImport.name))), specifierComparer);
        if (removeExistingImportSpecifiers) {
            // If we're both adding and removing specifiers, just replace and reprint the whole
            // node. The change tracker doesn't understand all the operations and can insert or
            // leave behind stray commas.
            changes.replaceNode(sourceFile, clause.namedBindings, factory.updateNamedImports(clause.namedBindings, toSorted([...existingSpecifiers.filter(s => !removeExistingImportSpecifiers.has(s)), ...newSpecifiers], specifierComparer)));
        }
        // The sorting preference computed earlier may or may not have validated that these particular
        // import specifiers are sorted. If they aren't, `getImportSpecifierInsertionIndex` will return
        // nonsense. So if there are existing specifiers, even if we know the sorting preference, we
        // need to ensure that the existing specifiers are sorted according to the preference in order
        // to do a sorted insertion.
        // changed to check if existing specifiers are sorted
        else if ((existingSpecifiers === null || existingSpecifiers === void 0 ? void 0 : existingSpecifiers.length) && isSorted !== false) {
            // if we're promoting the clause from type-only, we need to transform the existing imports before attempting to insert the new named imports
            const transformedExistingSpecifiers = (promoteFromTypeOnly && existingSpecifiers) ? factory.updateNamedImports(clause.namedBindings, sameMap(existingSpecifiers, e => factory.updateImportSpecifier(e, /*isTypeOnly*/ true, e.propertyName, e.name))).elements : existingSpecifiers;
            for (const spec of newSpecifiers) {
                const insertionIndex = OrganizeImports.getImportSpecifierInsertionIndex(transformedExistingSpecifiers, spec, specifierComparer);
                changes.insertImportSpecifierAtIndex(sourceFile, spec, clause.namedBindings, insertionIndex);
            }
        }
        else if (existingSpecifiers === null || existingSpecifiers === void 0 ? void 0 : existingSpecifiers.length) {
            for (const spec of newSpecifiers) {
                changes.insertNodeInListAfter(sourceFile, last(existingSpecifiers), spec, existingSpecifiers);
            }
        }
        else {
            if (newSpecifiers.length) {
                const namedImports = factory.createNamedImports(newSpecifiers);
                if (clause.namedBindings) {
                    changes.replaceNode(sourceFile, clause.namedBindings, namedImports);
                }
                else {
                    changes.insertNodeAfter(sourceFile, Debug.checkDefined(clause.name, "Import clause must have either named imports or a default import"), namedImports);
                }
            }
        }
    }
    if (promoteFromTypeOnly) {
        changes.delete(sourceFile, getTypeKeywordOfTypeOnlyImport(clause, sourceFile));
        if (existingSpecifiers) {
            // We used to convert existing specifiers to type-only only if compiler options indicated that
            // would be meaningful (see the `importNameElisionDisabled` utility function), but user
            // feedback indicated a preference for preserving the type-onlyness of existing specifiers
            // regardless of whether it would make a difference in emit.
            for (const specifier of existingSpecifiers) {
                changes.insertModifierBefore(sourceFile, SyntaxKind.TypeKeyword, specifier);
            }
        }
    }
    function addElementToBindingPattern(bindingPattern, name, propertyName) {
        const element = factory.createBindingElement(/*dotDotDotToken*/ undefined, propertyName, name);
        if (bindingPattern.elements.length) {
            changes.insertNodeInListAfter(sourceFile, last(bindingPattern.elements), element);
        }
        else {
            changes.replaceNode(sourceFile, bindingPattern, factory.createObjectBindingPattern([element]));
        }
    }
}
function addNamespaceQualifier(changes, sourceFile, { namespacePrefix, usagePosition }) {
    changes.insertText(sourceFile, usagePosition, namespacePrefix + ".");
}
function addImportType(changes, sourceFile, { moduleSpecifier, usagePosition: position }, quotePreference) {
    changes.insertText(sourceFile, position, getImportTypePrefix(moduleSpecifier, quotePreference));
}
function getImportTypePrefix(moduleSpecifier, quotePreference) {
    const quote = getQuoteFromPreference(quotePreference);
    return `import(${quote}${moduleSpecifier}${quote}).`;
}
function needsTypeOnly({ addAsTypeOnly }) {
    return addAsTypeOnly === 2 /* AddAsTypeOnly.Required */;
}
function shouldUseTypeOnly(info, preferences) {
    return needsTypeOnly(info) || !!preferences.preferTypeOnlyAutoImports && info.addAsTypeOnly !== 4 /* AddAsTypeOnly.NotAllowed */;
}
function getNewImports(moduleSpecifier, quotePreference, defaultImport, namedImports, namespaceLikeImport, compilerOptions, preferences) {
    const quotedModuleSpecifier = makeStringLiteral(moduleSpecifier, quotePreference);
    let statements;
    if (defaultImport !== undefined || (namedImports === null || namedImports === void 0 ? void 0 : namedImports.length)) {
        // `verbatimModuleSyntax` should prefer top-level `import type` -
        // even though it's not an error, it would add unnecessary runtime emit.
        const topLevelTypeOnly = (!defaultImport || needsTypeOnly(defaultImport)) && every(namedImports, needsTypeOnly) ||
            (compilerOptions.verbatimModuleSyntax || preferences.preferTypeOnlyAutoImports) &&
                (defaultImport === null || defaultImport === void 0 ? void 0 : defaultImport.addAsTypeOnly) !== 4 /* AddAsTypeOnly.NotAllowed */ &&
                !some(namedImports, i => i.addAsTypeOnly === 4 /* AddAsTypeOnly.NotAllowed */);
        statements = combine(statements, makeImport(defaultImport && factory.createIdentifier(defaultImport.name), namedImports === null || namedImports === void 0 ? void 0 : namedImports.map(namedImport => factory.createImportSpecifier(!topLevelTypeOnly && shouldUseTypeOnly(namedImport, preferences), namedImport.propertyName === undefined ? undefined : factory.createIdentifier(namedImport.propertyName), factory.createIdentifier(namedImport.name))), moduleSpecifier, quotePreference, topLevelTypeOnly));
    }
    if (namespaceLikeImport) {
        const declaration = namespaceLikeImport.importKind === ImportKind.CommonJS
            ? factory.createImportEqualsDeclaration(
            /*modifiers*/ undefined, shouldUseTypeOnly(namespaceLikeImport, preferences), factory.createIdentifier(namespaceLikeImport.name), factory.createExternalModuleReference(quotedModuleSpecifier))
            : factory.createImportDeclaration(
            /*modifiers*/ undefined, factory.createImportClause(shouldUseTypeOnly(namespaceLikeImport, preferences), 
            /*name*/ undefined, factory.createNamespaceImport(factory.createIdentifier(namespaceLikeImport.name))), quotedModuleSpecifier, 
            /*attributes*/ undefined);
        statements = combine(statements, declaration);
    }
    return Debug.checkDefined(statements);
}
function getNewRequires(moduleSpecifier, quotePreference, defaultImport, namedImports, namespaceLikeImport) {
    const quotedModuleSpecifier = makeStringLiteral(moduleSpecifier, quotePreference);
    let statements;
    // const { default: foo, bar, etc } = require('./mod');
    if (defaultImport || (namedImports === null || namedImports === void 0 ? void 0 : namedImports.length)) {
        const bindingElements = (namedImports === null || namedImports === void 0 ? void 0 : namedImports.map(({ name, propertyName }) => factory.createBindingElement(/*dotDotDotToken*/ undefined, propertyName, name))) || [];
        if (defaultImport) {
            bindingElements.unshift(factory.createBindingElement(/*dotDotDotToken*/ undefined, "default", defaultImport.name));
        }
        const declaration = createConstEqualsRequireDeclaration(factory.createObjectBindingPattern(bindingElements), quotedModuleSpecifier);
        statements = combine(statements, declaration);
    }
    // const foo = require('./mod');
    if (namespaceLikeImport) {
        const declaration = createConstEqualsRequireDeclaration(namespaceLikeImport.name, quotedModuleSpecifier);
        statements = combine(statements, declaration);
    }
    return Debug.checkDefined(statements);
}
function createConstEqualsRequireDeclaration(name, quotedModuleSpecifier) {
    return factory.createVariableStatement(
    /*modifiers*/ undefined, factory.createVariableDeclarationList([
        factory.createVariableDeclaration(typeof name === "string" ? factory.createIdentifier(name) : name, 
        /*exclamationToken*/ undefined, 
        /*type*/ undefined, factory.createCallExpression(factory.createIdentifier("require"), /*typeArguments*/ undefined, [quotedModuleSpecifier])),
    ], NodeFlags.Const));
}
function symbolFlagsHaveMeaning(flags, meaning) {
    return meaning === SemanticMeaning.All ? true :
        meaning & SemanticMeaning.Value ? !!(flags & SymbolFlags.Value) :
            meaning & SemanticMeaning.Type ? !!(flags & SymbolFlags.Type) :
                meaning & SemanticMeaning.Namespace ? !!(flags & SymbolFlags.Namespace) :
                    false;
}
function getImpliedNodeFormatForEmit(file, program) {
    return isFullSourceFile(file) ? program.getImpliedNodeFormatForEmit(file) : getImpliedNodeFormatForEmitWorker(file, program.getCompilerOptions());
}
function getEmitModuleFormatOfFile(file, program) {
    return isFullSourceFile(file) ? program.getEmitModuleFormatOfFile(file) : getEmitModuleFormatOfFileWorker(file, program.getCompilerOptions());
}
