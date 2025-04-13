import {
  binarySearch,
  compareBooleans,
  compareStringsCaseInsensitiveEslintCompatible,
  compareStringsCaseSensitive,
  compareValues,
  createScanner,
  EmitFlags,
  emptyArray,
  factory,
  FindAllReferences,
  firstOrUndefined,
  flatMap,
  getNewLineOrDefaultFromHost,
  getUILocale,
  group,
  groupBy,
  identity,
  isAmbientModule,
  isExportDeclaration,
  isExternalModuleNameRelative,
  isExternalModuleReference,
  isImportDeclaration,
  isNamedExports,
  isNamedImports,
  isNamespaceImport,
  isString,
  isStringLiteral,
  isStringLiteralLike,
  jsxModeNeedsExplicitImport,
  length,
  map,
  moduleExportNameTextEscaped,
  OrganizeImportsMode,
  rangeIsOnSingleLine,
  setEmitFlags,
  some,
  SyntaxKind,
  textChanges,
  toSorted,
  TransformFlags,
  tryCast,
} from "./_namespaces/ts.js";

/**
 * Organize imports by:
 *   1) Removing unused imports
 *   2) Coalescing imports from the same module
 *   3) Sorting imports
 *
 * @internal
 */
export function organizeImports(sourceFile, formatContext, host, program, preferences, mode) {
    var _a, _b;
    const changeTracker = textChanges.ChangeTracker.fromContext({ host, formatContext, preferences });
    const shouldSort = mode === OrganizeImportsMode.SortAndCombine || mode === OrganizeImportsMode.All;
    // These are currently inseparable, but I draw a distinction for clarity and in case we add modes in the future.
    const shouldCombine = shouldSort;
    const shouldRemove = mode === OrganizeImportsMode.RemoveUnused || mode === OrganizeImportsMode.All;
    // All of the old ImportDeclarations in the file, in syntactic order.
    const topLevelImportDecls = sourceFile.statements.filter(isImportDeclaration);
    const topLevelImportGroupDecls = groupByNewlineContiguous(sourceFile, topLevelImportDecls);
    const { comparersToTest, typeOrdersToTest } = getDetectionLists(preferences);
    const defaultComparer = comparersToTest[0];
    // If case sensitivity is specified (true/false), then use the same setting for both.
    const comparer = {
        moduleSpecifierComparer: typeof preferences.organizeImportsIgnoreCase === "boolean" ? defaultComparer : undefined,
        namedImportComparer: typeof preferences.organizeImportsIgnoreCase === "boolean" ? defaultComparer : undefined,
        typeOrder: preferences.organizeImportsTypeOrder,
    };
    if (typeof preferences.organizeImportsIgnoreCase !== "boolean") {
        // Otherwise, we must test for case-sensitivity. Named import case sensitivity will be tested with type order
        ({ comparer: comparer.moduleSpecifierComparer } = detectModuleSpecifierCaseBySort(topLevelImportGroupDecls, comparersToTest));
    }
    if (!comparer.typeOrder || typeof preferences.organizeImportsIgnoreCase !== "boolean") {
        // Through getDetectionLists, the set of orders returned will be compatible
        const namedImportSort = detectNamedImportOrganizationBySort(topLevelImportDecls, comparersToTest, typeOrdersToTest);
        if (namedImportSort) {
            const { namedImportComparer, typeOrder } = namedImportSort;
            comparer.namedImportComparer = (_a = comparer.namedImportComparer) !== null && _a !== void 0 ? _a : namedImportComparer;
            comparer.typeOrder = (_b = comparer.typeOrder) !== null && _b !== void 0 ? _b : typeOrder;
        }
    }
    topLevelImportGroupDecls.forEach(importGroupDecl => organizeImportsWorker(importGroupDecl, comparer));
    // Exports are always used
    if (mode !== OrganizeImportsMode.RemoveUnused) {
        // All of the old ExportDeclarations in the file, in syntactic order.
        getTopLevelExportGroups(sourceFile).forEach(exportGroupDecl => organizeExportsWorker(exportGroupDecl, comparer.namedImportComparer));
    }
    for (const ambientModule of sourceFile.statements.filter(isAmbientModule)) {
        if (!ambientModule.body)
            continue;
        const ambientModuleImportGroupDecls = groupByNewlineContiguous(sourceFile, ambientModule.body.statements.filter(isImportDeclaration));
        ambientModuleImportGroupDecls.forEach(importGroupDecl => organizeImportsWorker(importGroupDecl, comparer));
        // Exports are always used
        if (mode !== OrganizeImportsMode.RemoveUnused) {
            const ambientModuleExportDecls = ambientModule.body.statements.filter(isExportDeclaration);
            organizeExportsWorker(ambientModuleExportDecls, comparer.namedImportComparer);
        }
    }
    return changeTracker.getChanges();
    function organizeDeclsWorker(oldImportDecls, coalesce) {
        if (length(oldImportDecls) === 0) {
            return;
        }
        // Special case: normally, we'd expect leading and trailing trivia to follow each import
        // around as it's sorted.  However, we do not want this to happen for leading trivia
        // on the first import because it is probably the header comment for the file.
        // Consider: we could do a more careful check that this trivia is actually a header,
        // but the consequences of being wrong are very minor.
        setEmitFlags(oldImportDecls[0], EmitFlags.NoLeadingComments);
        const oldImportGroups = shouldCombine
            ? group(oldImportDecls, importDecl => getExternalModuleName(importDecl.moduleSpecifier))
            : [oldImportDecls];
        const sortedImportGroups = shouldSort
            ? toSorted(oldImportGroups, (group1, group2) => { var _a; return compareModuleSpecifiersWorker(group1[0].moduleSpecifier, group2[0].moduleSpecifier, (_a = comparer.moduleSpecifierComparer) !== null && _a !== void 0 ? _a : defaultComparer); })
            : oldImportGroups;
        const newImportDecls = flatMap(sortedImportGroups, importGroup => getExternalModuleName(importGroup[0].moduleSpecifier) || importGroup[0].moduleSpecifier === undefined
            ? coalesce(importGroup)
            : importGroup);
        // Delete all nodes if there are no imports.
        if (newImportDecls.length === 0) {
            // Consider the first node to have trailingTrivia as we want to exclude the
            // "header" comment.
            changeTracker.deleteNodes(sourceFile, oldImportDecls, {
                leadingTriviaOption: textChanges.LeadingTriviaOption.Exclude,
                trailingTriviaOption: textChanges.TrailingTriviaOption.Include,
            }, /*hasTrailingComment*/ true);
        }
        else {
            // Note: Delete the surrounding trivia because it will have been retained in newImportDecls.
            const replaceOptions = {
                leadingTriviaOption: textChanges.LeadingTriviaOption.Exclude, // Leave header comment in place
                trailingTriviaOption: textChanges.TrailingTriviaOption.Include,
                suffix: getNewLineOrDefaultFromHost(host, formatContext.options),
            };
            changeTracker.replaceNodeWithNodes(sourceFile, oldImportDecls[0], newImportDecls, replaceOptions);
            const hasTrailingComment = changeTracker.nodeHasTrailingComment(sourceFile, oldImportDecls[0], replaceOptions);
            changeTracker.deleteNodes(sourceFile, oldImportDecls.slice(1), {
                trailingTriviaOption: textChanges.TrailingTriviaOption.Include,
            }, hasTrailingComment);
        }
    }
    function organizeImportsWorker(oldImportDecls, comparer) {
        var _a, _b, _c;
        const detectedModuleCaseComparer = (_a = comparer.moduleSpecifierComparer) !== null && _a !== void 0 ? _a : defaultComparer;
        const detectedNamedImportCaseComparer = (_b = comparer.namedImportComparer) !== null && _b !== void 0 ? _b : defaultComparer;
        const detectedTypeOrder = (_c = comparer.typeOrder) !== null && _c !== void 0 ? _c : "last";
        const specifierComparer = getNamedImportSpecifierComparer({ organizeImportsTypeOrder: detectedTypeOrder }, detectedNamedImportCaseComparer);
        const processImportsOfSameModuleSpecifier = (importGroup) => {
            if (shouldRemove)
                importGroup = removeUnusedImports(importGroup, sourceFile, program);
            if (shouldCombine)
                importGroup = coalesceImportsWorker(importGroup, detectedModuleCaseComparer, specifierComparer, sourceFile);
            if (shouldSort)
                importGroup = toSorted(importGroup, (s1, s2) => compareImportsOrRequireStatements(s1, s2, detectedModuleCaseComparer));
            return importGroup;
        };
        organizeDeclsWorker(oldImportDecls, processImportsOfSameModuleSpecifier);
    }
    function organizeExportsWorker(oldExportDecls, specifierCaseComparer) {
        const useComparer = getNamedImportSpecifierComparer(preferences, specifierCaseComparer);
        organizeDeclsWorker(oldExportDecls, group => coalesceExportsWorker(group, useComparer));
    }
}
function getDetectionLists(preferences) {
    // Returns the possible detection outcomes, given the user's preferences. The earlier in the list, the higher the priority.
    return {
        comparersToTest: typeof preferences.organizeImportsIgnoreCase === "boolean"
            ? [getOrganizeImportsStringComparer(preferences, preferences.organizeImportsIgnoreCase)]
            : [getOrganizeImportsStringComparer(preferences, /*ignoreCase*/ true), getOrganizeImportsStringComparer(preferences, /*ignoreCase*/ false)],
        typeOrdersToTest: preferences.organizeImportsTypeOrder ? [preferences.organizeImportsTypeOrder] : ["last", "inline", "first"],
    };
}
function groupByNewlineContiguous(sourceFile, decls) {
    const scanner = createScanner(sourceFile.languageVersion, /*skipTrivia*/ false, sourceFile.languageVariant);
    const group = [];
    let groupIndex = 0;
    for (const decl of decls) {
        if (group[groupIndex] && isNewGroup(sourceFile, decl, scanner)) {
            groupIndex++;
        }
        if (!group[groupIndex]) {
            group[groupIndex] = [];
        }
        group[groupIndex].push(decl);
    }
    return group;
}
// a new group is created if an import/export includes at least two new line
// new line from multi-line comment doesn't count
function isNewGroup(sourceFile, decl, scanner) {
    const startPos = decl.getFullStart();
    const endPos = decl.getStart();
    scanner.setText(sourceFile.text, startPos, endPos - startPos);
    let numberOfNewLines = 0;
    while (scanner.getTokenStart() < endPos) {
        const tokenKind = scanner.scan();
        if (tokenKind === SyntaxKind.NewLineTrivia) {
            numberOfNewLines++;
            if (numberOfNewLines >= 2) {
                return true;
            }
        }
    }
    return false;
}
function getTopLevelExportGroups(sourceFile) {
    const topLevelExportGroups = [];
    const statements = sourceFile.statements;
    const len = length(statements);
    let i = 0;
    let groupIndex = 0;
    while (i < len) {
        if (isExportDeclaration(statements[i])) {
            if (topLevelExportGroups[groupIndex] === undefined) {
                topLevelExportGroups[groupIndex] = [];
            }
            const exportDecl = statements[i];
            if (exportDecl.moduleSpecifier) {
                topLevelExportGroups[groupIndex].push(exportDecl);
                i++;
            }
            else {
                while (i < len && isExportDeclaration(statements[i])) {
                    topLevelExportGroups[groupIndex].push(statements[i++]);
                }
                groupIndex++;
            }
        }
        else {
            i++;
        }
    }
    return flatMap(topLevelExportGroups, exportGroupDecls => groupByNewlineContiguous(sourceFile, exportGroupDecls));
}
function removeUnusedImports(oldImports, sourceFile, program) {
    const typeChecker = program.getTypeChecker();
    const compilerOptions = program.getCompilerOptions();
    const jsxNamespace = typeChecker.getJsxNamespace(sourceFile);
    const jsxFragmentFactory = typeChecker.getJsxFragmentFactory(sourceFile);
    const jsxElementsPresent = !!(sourceFile.transformFlags & TransformFlags.ContainsJsx);
    const usedImports = [];
    for (const importDecl of oldImports) {
        const { importClause, moduleSpecifier } = importDecl;
        if (!importClause) {
            // Imports without import clauses are assumed to be included for their side effects and are not removed.
            usedImports.push(importDecl);
            continue;
        }
        let { name, namedBindings } = importClause;
        // Default import
        if (name && !isDeclarationUsed(name)) {
            name = undefined;
        }
        if (namedBindings) {
            if (isNamespaceImport(namedBindings)) {
                // Namespace import
                if (!isDeclarationUsed(namedBindings.name)) {
                    namedBindings = undefined;
                }
            }
            else {
                // List of named imports
                const newElements = namedBindings.elements.filter(e => isDeclarationUsed(e.name));
                if (newElements.length < namedBindings.elements.length) {
                    namedBindings = newElements.length
                        ? factory.updateNamedImports(namedBindings, newElements)
                        : undefined;
                }
            }
        }
        if (name || namedBindings) {
            usedImports.push(updateImportDeclarationAndClause(importDecl, name, namedBindings));
        }
        // If a module is imported to be augmented, it's used
        else if (hasModuleDeclarationMatchingSpecifier(sourceFile, moduleSpecifier)) {
            // If we're in a declaration file, it's safe to remove the import clause from it
            if (sourceFile.isDeclarationFile) {
                usedImports.push(factory.createImportDeclaration(importDecl.modifiers, 
                /*importClause*/ undefined, moduleSpecifier, 
                /*attributes*/ undefined));
            }
            // If we're not in a declaration file, we can't remove the import clause even though
            // the imported symbols are unused, because removing them makes it look like the import
            // declaration has side effects, which will cause it to be preserved in the JS emit.
            else {
                usedImports.push(importDecl);
            }
        }
    }
    return usedImports;
    function isDeclarationUsed(identifier) {
        // The JSX factory symbol is always used if JSX elements are present - even if they are not allowed.
        return jsxElementsPresent && (identifier.text === jsxNamespace || jsxFragmentFactory && identifier.text === jsxFragmentFactory) && jsxModeNeedsExplicitImport(compilerOptions.jsx) ||
            FindAllReferences.Core.isSymbolReferencedInFile(identifier, typeChecker, sourceFile);
    }
}
function getExternalModuleName(specifier) {
    return specifier !== undefined && isStringLiteralLike(specifier)
        ? specifier.text
        : undefined;
}
/*
 * Returns entire import declarations because they may already have been rewritten and
 * may lack parent pointers.  The desired parts can easily be recovered based on the
 * categorization.
 *
 * NB: There may be overlap between `defaultImports` and `namespaceImports`/`namedImports`.
 */
function getCategorizedImports(importGroup) {
    let importWithoutClause;
    const typeOnlyImports = { defaultImports: [], namespaceImports: [], namedImports: [] };
    const regularImports = { defaultImports: [], namespaceImports: [], namedImports: [] };
    for (const importDeclaration of importGroup) {
        if (importDeclaration.importClause === undefined) {
            // Only the first such import is interesting - the others are redundant.
            // Note: Unfortunately, we will lose trivia that was on this node.
            importWithoutClause = importWithoutClause || importDeclaration;
            continue;
        }
        const group = importDeclaration.importClause.isTypeOnly ? typeOnlyImports : regularImports;
        const { name, namedBindings } = importDeclaration.importClause;
        if (name) {
            group.defaultImports.push(importDeclaration);
        }
        if (namedBindings) {
            if (isNamespaceImport(namedBindings)) {
                group.namespaceImports.push(importDeclaration);
            }
            else {
                group.namedImports.push(importDeclaration);
            }
        }
    }
    return {
        importWithoutClause,
        typeOnlyImports,
        regularImports,
    };
}
function coalesceImportsWorker(importGroup, comparer, specifierComparer, sourceFile) {
    if (importGroup.length === 0) {
        return importGroup;
    }
    const importGroupsByAttributes = groupBy(importGroup, decl => {
        if (decl.attributes) {
            let attrs = decl.attributes.token + " ";
            for (const x of toSorted(decl.attributes.elements, (x, y) => compareStringsCaseSensitive(x.name.text, y.name.text))) {
                attrs += x.name.text + ":";
                attrs += isStringLiteralLike(x.value) ? `"${x.value.text}"` : x.value.getText() + " ";
            }
            return attrs;
        }
        return "";
    });
    const coalescedImports = [];
    for (const attribute in importGroupsByAttributes) {
        const importGroupSameAttrs = importGroupsByAttributes[attribute];
        const { importWithoutClause, typeOnlyImports, regularImports } = getCategorizedImports(importGroupSameAttrs);
        if (importWithoutClause) {
            coalescedImports.push(importWithoutClause);
        }
        for (const group of [regularImports, typeOnlyImports]) {
            const isTypeOnly = group === typeOnlyImports;
            const { defaultImports, namespaceImports, namedImports } = group;
            // Normally, we don't combine default and namespace imports, but it would be silly to
            // produce two import declarations in this special case.
            if (!isTypeOnly && defaultImports.length === 1 && namespaceImports.length === 1 && namedImports.length === 0) {
                // Add the namespace import to the existing default ImportDeclaration.
                const defaultImport = defaultImports[0];
                coalescedImports.push(updateImportDeclarationAndClause(defaultImport, defaultImport.importClause.name, namespaceImports[0].importClause.namedBindings));
                continue;
            }
            const sortedNamespaceImports = toSorted(namespaceImports, (i1, i2) => comparer(i1.importClause.namedBindings.name.text, i2.importClause.namedBindings.name.text));
            for (const namespaceImport of sortedNamespaceImports) {
                // Drop the name, if any
                coalescedImports.push(updateImportDeclarationAndClause(namespaceImport, /*name*/ undefined, namespaceImport.importClause.namedBindings));
            }
            const firstDefaultImport = firstOrUndefined(defaultImports);
            const firstNamedImport = firstOrUndefined(namedImports);
            const importDecl = firstDefaultImport !== null && firstDefaultImport !== void 0 ? firstDefaultImport : firstNamedImport;
            if (!importDecl) {
                continue;
            }
            let newDefaultImport;
            const newImportSpecifiers = [];
            if (defaultImports.length === 1) {
                newDefaultImport = defaultImports[0].importClause.name;
            }
            else {
                for (const defaultImport of defaultImports) {
                    newImportSpecifiers.push(factory.createImportSpecifier(/*isTypeOnly*/ false, factory.createIdentifier("default"), defaultImport.importClause.name));
                }
            }
            newImportSpecifiers.push(...getNewImportSpecifiers(namedImports));
            const sortedImportSpecifiers = factory.createNodeArray(toSorted(newImportSpecifiers, specifierComparer), firstNamedImport === null || firstNamedImport === void 0 ? void 0 : firstNamedImport.importClause.namedBindings.elements.hasTrailingComma);
            const newNamedImports = sortedImportSpecifiers.length === 0
                ? newDefaultImport
                    ? undefined
                    : factory.createNamedImports(emptyArray)
                : firstNamedImport
                    ? factory.updateNamedImports(firstNamedImport.importClause.namedBindings, sortedImportSpecifiers)
                    : factory.createNamedImports(sortedImportSpecifiers);
            if (sourceFile &&
                newNamedImports &&
                (firstNamedImport === null || firstNamedImport === void 0 ? void 0 : firstNamedImport.importClause.namedBindings) &&
                !rangeIsOnSingleLine(firstNamedImport.importClause.namedBindings, sourceFile)) {
                setEmitFlags(newNamedImports, EmitFlags.MultiLine);
            }
            // Type-only imports are not allowed to mix default, namespace, and named imports in any combination.
            // We could rewrite a default import as a named import (`import { default as name }`), but we currently
            // choose not to as a stylistic preference.
            if (isTypeOnly && newDefaultImport && newNamedImports) {
                coalescedImports.push(updateImportDeclarationAndClause(importDecl, newDefaultImport, /*namedBindings*/ undefined));
                coalescedImports.push(updateImportDeclarationAndClause(firstNamedImport !== null && firstNamedImport !== void 0 ? firstNamedImport : importDecl, /*name*/ undefined, newNamedImports));
            }
            else {
                coalescedImports.push(updateImportDeclarationAndClause(importDecl, newDefaultImport, newNamedImports));
            }
        }
    }
    return coalescedImports;
}
function coalesceExportsWorker(exportGroup, specifierComparer) {
    if (exportGroup.length === 0) {
        return exportGroup;
    }
    const { exportWithoutClause, namedExports, typeOnlyExports } = getCategorizedExports(exportGroup);
    const coalescedExports = [];
    if (exportWithoutClause) {
        coalescedExports.push(exportWithoutClause);
    }
    for (const exportGroup of [namedExports, typeOnlyExports]) {
        if (exportGroup.length === 0) {
            continue;
        }
        const newExportSpecifiers = [];
        newExportSpecifiers.push(...flatMap(exportGroup, i => i.exportClause && isNamedExports(i.exportClause) ? i.exportClause.elements : emptyArray));
        const sortedExportSpecifiers = toSorted(newExportSpecifiers, specifierComparer);
        const exportDecl = exportGroup[0];
        coalescedExports.push(factory.updateExportDeclaration(exportDecl, exportDecl.modifiers, exportDecl.isTypeOnly, exportDecl.exportClause && (isNamedExports(exportDecl.exportClause) ?
            factory.updateNamedExports(exportDecl.exportClause, sortedExportSpecifiers) :
            factory.updateNamespaceExport(exportDecl.exportClause, exportDecl.exportClause.name)), exportDecl.moduleSpecifier, exportDecl.attributes));
    }
    return coalescedExports;
    /*
     * Returns entire export declarations because they may already have been rewritten and
     * may lack parent pointers.  The desired parts can easily be recovered based on the
     * categorization.
     */
    function getCategorizedExports(exportGroup) {
        let exportWithoutClause;
        const namedExports = [];
        const typeOnlyExports = [];
        for (const exportDeclaration of exportGroup) {
            if (exportDeclaration.exportClause === undefined) {
                // Only the first such export is interesting - the others are redundant.
                // Note: Unfortunately, we will lose trivia that was on this node.
                exportWithoutClause = exportWithoutClause || exportDeclaration;
            }
            else if (exportDeclaration.isTypeOnly) {
                typeOnlyExports.push(exportDeclaration);
            }
            else {
                namedExports.push(exportDeclaration);
            }
        }
        return {
            exportWithoutClause,
            namedExports,
            typeOnlyExports,
        };
    }
}
function updateImportDeclarationAndClause(importDeclaration, name, namedBindings) {
    return factory.updateImportDeclaration(importDeclaration, importDeclaration.modifiers, factory.updateImportClause(importDeclaration.importClause, importDeclaration.importClause.isTypeOnly, name, namedBindings), // TODO: GH#18217
    importDeclaration.moduleSpecifier, importDeclaration.attributes);
}
function compareImportOrExportSpecifiers(s1, s2, comparer, preferences) {
    switch (preferences === null || preferences === void 0 ? void 0 : preferences.organizeImportsTypeOrder) {
        case "first":
            return compareBooleans(s2.isTypeOnly, s1.isTypeOnly) || comparer(s1.name.text, s2.name.text);
        case "inline":
            return comparer(s1.name.text, s2.name.text);
        default:
            return compareBooleans(s1.isTypeOnly, s2.isTypeOnly) || comparer(s1.name.text, s2.name.text);
    }
}
function compareModuleSpecifiersWorker(m1, m2, comparer) {
    const name1 = m1 === undefined ? undefined : getExternalModuleName(m1);
    const name2 = m2 === undefined ? undefined : getExternalModuleName(m2);
    return compareBooleans(name1 === undefined, name2 === undefined) ||
        compareBooleans(isExternalModuleNameRelative(name1), isExternalModuleNameRelative(name2)) ||
        comparer(name1, name2);
}
function getModuleNamesFromDecls(decls) {
    return decls.map(s => getExternalModuleName(getModuleSpecifierExpression(s)) || "");
}
function getModuleSpecifierExpression(declaration) {
    var _a;
    switch (declaration.kind) {
        case SyntaxKind.ImportEqualsDeclaration:
            return (_a = tryCast(declaration.moduleReference, isExternalModuleReference)) === null || _a === void 0 ? void 0 : _a.expression;
        case SyntaxKind.ImportDeclaration:
            return declaration.moduleSpecifier;
        case SyntaxKind.VariableStatement:
            return declaration.declarationList.declarations[0].initializer.arguments[0];
    }
}
function hasModuleDeclarationMatchingSpecifier(sourceFile, moduleSpecifier) {
    const moduleSpecifierText = isStringLiteral(moduleSpecifier) && moduleSpecifier.text;
    return isString(moduleSpecifierText) && some(sourceFile.moduleAugmentations, moduleName => isStringLiteral(moduleName)
        && moduleName.text === moduleSpecifierText);
}
function getNewImportSpecifiers(namedImports) {
    return flatMap(namedImports, namedImport => map(tryGetNamedBindingElements(namedImport), importSpecifier => importSpecifier.name && importSpecifier.propertyName && moduleExportNameTextEscaped(importSpecifier.name) === moduleExportNameTextEscaped(importSpecifier.propertyName)
        ? factory.updateImportSpecifier(importSpecifier, importSpecifier.isTypeOnly, /*propertyName*/ undefined, importSpecifier.name)
        : importSpecifier));
}
function tryGetNamedBindingElements(namedImport) {
    var _a;
    return ((_a = namedImport.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings) && isNamedImports(namedImport.importClause.namedBindings)
        ? namedImport.importClause.namedBindings.elements
        : undefined;
}
function detectModuleSpecifierCaseBySort(importDeclsByGroup, comparersToTest) {
    const moduleSpecifiersByGroup = [];
    importDeclsByGroup.forEach(importGroup => {
        // Turns importDeclsByGroup into string[][] of module specifiers grouped by declGroup
        moduleSpecifiersByGroup.push(getModuleNamesFromDecls(importGroup));
    });
    return detectCaseSensitivityBySort(moduleSpecifiersByGroup, comparersToTest);
}
function detectNamedImportOrganizationBySort(originalGroups, comparersToTest, typesToTest) {
    var _a;
    // Filter for import declarations with named imports. Will be a flat array of import declarations without separations by group
    let bothNamedImports = false;
    const importDeclsWithNamed = originalGroups.filter(i => {
        var _a, _b;
        const namedImports = (_b = tryCast((_a = i.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings, isNamedImports)) === null || _b === void 0 ? void 0 : _b.elements;
        if (!(namedImports === null || namedImports === void 0 ? void 0 : namedImports.length))
            return false;
        if (!bothNamedImports && namedImports.some(n => n.isTypeOnly) && namedImports.some(n => !n.isTypeOnly)) {
            bothNamedImports = true;
        }
        return true;
    });
    // No need for more detection, if no named imports
    if (importDeclsWithNamed.length === 0)
        return;
    // Formats into lists of named imports, grouped by declaration
    const namedImportsByDecl = importDeclsWithNamed.map(importDecl => {
        var _a, _b;
        return (_b = tryCast((_a = importDecl.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings, isNamedImports)) === null || _b === void 0 ? void 0 : _b.elements;
    }).filter(elements => elements !== undefined);
    // If we don't have any import statements with both named regular and type imports, we do not need to detect a type ordering
    if (!bothNamedImports || typesToTest.length === 0) {
        const sortState = detectCaseSensitivityBySort(namedImportsByDecl.map(i => i.map(n => n.name.text)), comparersToTest);
        return {
            namedImportComparer: sortState.comparer,
            typeOrder: typesToTest.length === 1 ? typesToTest[0] : undefined,
            isSorted: sortState.isSorted,
        };
    }
    const bestDiff = { first: Infinity, last: Infinity, inline: Infinity };
    const bestComparer = { first: comparersToTest[0], last: comparersToTest[0], inline: comparersToTest[0] };
    for (const curComparer of comparersToTest) {
        const currDiff = { first: 0, last: 0, inline: 0 };
        for (const importDecl of namedImportsByDecl) {
            for (const typeOrder of typesToTest) {
                currDiff[typeOrder] = ((_a = currDiff[typeOrder]) !== null && _a !== void 0 ? _a : 0) + measureSortedness(importDecl, (n1, n2) => compareImportOrExportSpecifiers(n1, n2, curComparer, { organizeImportsTypeOrder: typeOrder }));
            }
        }
        for (const key of typesToTest) {
            const typeOrder = key;
            if (currDiff[typeOrder] < bestDiff[typeOrder]) {
                bestDiff[typeOrder] = currDiff[typeOrder];
                bestComparer[typeOrder] = curComparer;
            }
        }
    }
    outer: for (const bestKey of typesToTest) {
        const bestTypeOrder = bestKey;
        for (const testKey of typesToTest) {
            const testTypeOrder = testKey;
            if (bestDiff[testTypeOrder] < bestDiff[bestTypeOrder])
                continue outer;
        }
        return { namedImportComparer: bestComparer[bestTypeOrder], typeOrder: bestTypeOrder, isSorted: bestDiff[bestTypeOrder] === 0 };
    }
    // Default behavior. It shouldn't be hit if typesToTest.length > 0
    return { namedImportComparer: bestComparer.last, typeOrder: "last", isSorted: bestDiff.last === 0 };
}
function measureSortedness(arr, comparer) {
    let i = 0;
    for (let j = 0; j < arr.length - 1; j++) {
        if (comparer(arr[j], arr[j + 1]) > 0) {
            i++;
        }
    }
    return i;
}
function detectCaseSensitivityBySort(originalGroups, comparersToTest) {
    // Each entry in originalGroups will be sorted and compared against the original entry.
    // The total diff of each comparison is the sum of the diffs over all groups
    let bestComparer;
    let bestDiff = Infinity;
    for (const curComparer of comparersToTest) {
        let diffOfCurrentComparer = 0;
        for (const listToSort of originalGroups) {
            if (listToSort.length <= 1)
                continue;
            const diff = measureSortedness(listToSort, curComparer);
            diffOfCurrentComparer += diff;
        }
        if (diffOfCurrentComparer < bestDiff) {
            bestDiff = diffOfCurrentComparer;
            bestComparer = curComparer;
        }
    }
    return {
        comparer: bestComparer !== null && bestComparer !== void 0 ? bestComparer : comparersToTest[0],
        isSorted: bestDiff === 0,
    };
}
function compareImportKind(s1, s2) {
    return compareValues(getImportKindOrder(s1), getImportKindOrder(s2));
}
// 1. Side-effect imports
// 2. Type-only imports
// 3. Namespace imports
// 4. Default imports
// 5. Named imports
// 6. ImportEqualsDeclarations
// 7. Require variable statements
function getImportKindOrder(s1) {
    var _a;
    switch (s1.kind) {
        case SyntaxKind.ImportDeclaration:
            if (!s1.importClause)
                return 0;
            if (s1.importClause.isTypeOnly)
                return 1;
            if (((_a = s1.importClause.namedBindings) === null || _a === void 0 ? void 0 : _a.kind) === SyntaxKind.NamespaceImport)
                return 2;
            if (s1.importClause.name)
                return 3;
            return 4;
        case SyntaxKind.ImportEqualsDeclaration:
            return 5;
        case SyntaxKind.VariableStatement:
            return 6;
    }
}
function getOrganizeImportsOrdinalStringComparer(ignoreCase) {
    return ignoreCase ? compareStringsCaseInsensitiveEslintCompatible : compareStringsCaseSensitive;
}
function getOrganizeImportsUnicodeStringComparer(ignoreCase, preferences) {
    var _a, _b, _c;
    const resolvedLocale = getOrganizeImportsLocale(preferences);
    const caseFirst = (_a = preferences.organizeImportsCaseFirst) !== null && _a !== void 0 ? _a : false;
    const numeric = (_b = preferences.organizeImportsNumericCollation) !== null && _b !== void 0 ? _b : false;
    const accents = (_c = preferences.organizeImportsAccentCollation) !== null && _c !== void 0 ? _c : true;
    const sensitivity = ignoreCase ?
        accents ? "accent" : "base" :
        accents ? "variant" : "case";
    const collator = new Intl.Collator(resolvedLocale, {
        usage: "sort",
        caseFirst: caseFirst || "false",
        sensitivity,
        numeric,
    });
    // `compare` is a bound method, so we do not need to close over `collator`.
    return collator.compare;
}
function getOrganizeImportsLocale(preferences) {
    let locale = preferences.organizeImportsLocale;
    if (locale === "auto")
        locale = getUILocale();
    if (locale === undefined)
        locale = "en";
    const supportedLocales = Intl.Collator.supportedLocalesOf(locale);
    const resolvedLocale = supportedLocales.length ? supportedLocales[0] : "en";
    return resolvedLocale;
}
function getOrganizeImportsStringComparer(preferences, ignoreCase) {
    var _a;
    const collation = (_a = preferences.organizeImportsCollation) !== null && _a !== void 0 ? _a : "ordinal";
    return collation === "unicode" ?
        getOrganizeImportsUnicodeStringComparer(ignoreCase, preferences) :
        getOrganizeImportsOrdinalStringComparer(ignoreCase);
}
/** @internal */
export function getOrganizeImportsStringComparerWithDetection(originalImportDecls, preferences) {
    return detectModuleSpecifierCaseBySort([originalImportDecls], getDetectionLists(preferences).comparersToTest);
}
function getNamedImportSpecifierComparer(preferences, comparer) {
    const stringComparer = comparer !== null && comparer !== void 0 ? comparer : getOrganizeImportsOrdinalStringComparer(!!preferences.organizeImportsIgnoreCase);
    return (s1, s2) => compareImportOrExportSpecifiers(s1, s2, stringComparer, preferences);
}
/** @internal */
export function getNamedImportSpecifierComparerWithDetection(importDecl, preferences, sourceFile) {
    // sort case sensitivity:
    // - if the user preference is explicit, use that
    // - otherwise, if there are enough existing import specifiers in this import to detect unambiguously, use that
    // - otherwise, detect from other imports in the file
    const { comparersToTest, typeOrdersToTest } = getDetectionLists(preferences);
    const detectFromDecl = detectNamedImportOrganizationBySort([importDecl], comparersToTest, typeOrdersToTest);
    let specifierComparer = getNamedImportSpecifierComparer(preferences, comparersToTest[0]);
    let isSorted;
    if (typeof preferences.organizeImportsIgnoreCase !== "boolean" || !preferences.organizeImportsTypeOrder) {
        if (detectFromDecl) {
            const { namedImportComparer, typeOrder, isSorted: isDetectedSorted } = detectFromDecl;
            isSorted = isDetectedSorted;
            specifierComparer = getNamedImportSpecifierComparer({ organizeImportsTypeOrder: typeOrder }, namedImportComparer);
        }
        else if (sourceFile) {
            // If a sourceFile is specified, we can also try detecting using the other import statements
            const detectFromFile = detectNamedImportOrganizationBySort(sourceFile.statements.filter(isImportDeclaration), comparersToTest, typeOrdersToTest);
            if (detectFromFile) {
                const { namedImportComparer, typeOrder, isSorted: isDetectedSorted } = detectFromFile;
                isSorted = isDetectedSorted;
                specifierComparer = getNamedImportSpecifierComparer({ organizeImportsTypeOrder: typeOrder }, namedImportComparer);
            }
        }
    }
    return { specifierComparer, isSorted };
}
/** @internal */
export function getImportDeclarationInsertionIndex(sortedImports, newImport, comparer) {
    const index = binarySearch(sortedImports, newImport, identity, (a, b) => compareImportsOrRequireStatements(a, b, comparer));
    return index < 0 ? ~index : index;
}
/** @internal */
export function getImportSpecifierInsertionIndex(sortedImports, newImport, comparer) {
    const index = binarySearch(sortedImports, newImport, identity, comparer);
    return index < 0 ? ~index : index;
}
/** @internal */
export function compareImportsOrRequireStatements(s1, s2, comparer) {
    return compareModuleSpecifiersWorker(getModuleSpecifierExpression(s1), getModuleSpecifierExpression(s2), comparer) || compareImportKind(s1, s2);
}
/* ======== Functions that are internal for testing ======== */
/**
 * @param importGroup a list of ImportDeclarations, all with the same module name.
 *
 * @deprecated Only used for testing
 * @internal
 */
export function testCoalesceImports(importGroup, ignoreCase, sourceFile, preferences) {
    const comparer = getOrganizeImportsOrdinalStringComparer(ignoreCase);
    const specifierComparer = getNamedImportSpecifierComparer({ organizeImportsTypeOrder: preferences === null || preferences === void 0 ? void 0 : preferences.organizeImportsTypeOrder }, comparer);
    return coalesceImportsWorker(importGroup, comparer, specifierComparer, sourceFile);
}
/**
 * @param exportGroup a list of ExportDeclarations, all with the same module name.
 *
 * @deprecated Only used for testing
 * @internal
 */
export function testCoalesceExports(exportGroup, ignoreCase, preferences) {
    const comparer = (s1, s2) => { var _a; return compareImportOrExportSpecifiers(s1, s2, getOrganizeImportsOrdinalStringComparer(ignoreCase), { organizeImportsTypeOrder: (_a = preferences === null || preferences === void 0 ? void 0 : preferences.organizeImportsTypeOrder) !== null && _a !== void 0 ? _a : "last" }); };
    return coalesceExportsWorker(exportGroup, comparer);
}
/**
 * @deprecated Only used for testing
 * @internal
 */
export function compareModuleSpecifiers(m1, m2, ignoreCase) {
    const comparer = getOrganizeImportsOrdinalStringComparer(!!ignoreCase);
    return compareModuleSpecifiersWorker(m1, m2, comparer);
}
