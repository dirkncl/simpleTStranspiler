import {
  arrayFrom,
  AssignmentDeclarationKind,
  canHaveDecorators,
  canHaveModifiers,
  canHaveSymbol,
  cast,
  codefix,
  combinePaths,
  Comparison,
  concatenate,
  contains,
  createFutureSourceFile,
  createModuleSpecifierResolutionHost,
  createTextRangeFromSpan,
  Debug,
  Diagnostics,
  emptyArray,
  escapeLeadingUnderscores,
  every,
  ExportKind,
  extensionFromPath,
  factory,
  fileShouldUseJavaScriptRequire,
  filter,
  find,
  FindAllReferences,
  findAncestor,
  findIndex,
  findLast,
  firstDefined,
  flatMap,
  forEachKey,
  getAssignmentDeclarationKind,
  getDecorators,
  getDirectoryPath,
  getEmitScriptTarget,
  getLineAndCharacterOfPosition,
  getLocaleSpecificMessage,
  getModifiers,
  getNameForExportedSymbol,
  getNormalizedAbsolutePath,
  getPropertySymbolFromBindingElement,
  getQuotePreference,
  getRangesWhere,
  getRefactorContextSpan,
  getRelativePathFromFile,
  getSourceFileOfNode,
  getStringComparer,
  getSynthesizedDeepClone,
  getTokenAtPosition,
  getUniqueName,
  hasJSFileExtension,
  hasSyntacticModifier,
  hasTSFileExtension,
  hostGetCanonicalFileName,
  importFromModuleSpecifier,
  isArrayLiteralExpression,
  isBinaryExpression,
  isBindingElement,
  isBlockLike,
  isDeclarationName,
  isExportDeclaration,
  isExportSpecifier,
  isExpressionStatement,
  isExternalModuleReference,
  isFullSourceFile,
  isFunctionLikeDeclaration,
  isIdentifier,
  isImportClause,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportSpecifier,
  isNamedExports,
  isNamedImports,
  isNamespaceImport,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isOmittedExpression,
  isPrologueDirective,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isRequireCall,
  isSourceFile,
  isStatement,
  isStringLiteral,
  isStringLiteralLike,
  isValidTypeOnlyAliasUseSite,
  isVariableDeclaration,
  isVariableDeclarationInitializedToRequire,
  isVariableStatement,
  last,
  length,
  makeStringLiteral,
  mapDefined,
  ModifierFlags,
  ModuleKind,
  moduleSpecifiers,
  moduleSpecifierToValidIdentifier,
  NodeFlags,
  nodeSeenTracker,
  normalizePath,
  rangeContainsRange,
  resolvePath,
  ScriptTarget,
  skipAlias,
  some,
  SymbolFlags,
  symbolNameNoDefault,
  SyntaxKind,
  takeWhile,
  textChanges,
  TransformFlags,
  tryCast,
} from "../_namespaces/ts.js";

import {
  addTargetFileImports,
  registerRefactor,
} from "../_namespaces/ts.refactor.js";


const refactorNameForMoveToFile = "Move to file";
const description = getLocaleSpecificMessage(Diagnostics.Move_to_file);

const moveToFileAction = {
    name: "Move to file",
    description,
    kind: "refactor.move.file",
};
registerRefactor(refactorNameForMoveToFile, {
    kinds: [moveToFileAction.kind],
    getAvailableActions: function getRefactorActionsToMoveToFile(context, interactiveRefactorArguments) {
        const file = context.file;
        const statements = getStatementsToMove(context);
        if (!interactiveRefactorArguments) {
            return emptyArray;
        }
        /** If the start/end nodes of the selection are inside a block like node do not show the `Move to file` code action
         *  This condition is used in order to show less often the `Move to file` code action */
        if (context.triggerReason === "implicit" && context.endPosition !== undefined) {
            const startNodeAncestor = findAncestor(getTokenAtPosition(file, context.startPosition), isBlockLike);
            const endNodeAncestor = findAncestor(getTokenAtPosition(file, context.endPosition), isBlockLike);
            if (startNodeAncestor && !isSourceFile(startNodeAncestor) && endNodeAncestor && !isSourceFile(endNodeAncestor)) {
                return emptyArray;
            }
        }
        if (context.preferences.allowTextChangesInNewFiles && statements) {
            const affectedTextRange = {
                start: { line: getLineAndCharacterOfPosition(file, statements.all[0].getStart(file)).line, offset: getLineAndCharacterOfPosition(file, statements.all[0].getStart(file)).character },
                end: { line: getLineAndCharacterOfPosition(file, last(statements.all).end).line, offset: getLineAndCharacterOfPosition(file, last(statements.all).end).character },
            };
            return [{ name: refactorNameForMoveToFile, description, actions: [Object.assign(Object.assign({}, moveToFileAction), { range: affectedTextRange })] }];
        }
        if (context.preferences.provideRefactorNotApplicableReason) {
            return [{ name: refactorNameForMoveToFile, description, actions: [Object.assign(Object.assign({}, moveToFileAction), { notApplicableReason: getLocaleSpecificMessage(Diagnostics.Selection_is_not_a_valid_statement_or_statements) })] }];
        }
        return emptyArray;
    },
    getEditsForAction: function getRefactorEditsToMoveToFile(context, actionName, interactiveRefactorArguments) {
        Debug.assert(actionName === refactorNameForMoveToFile, "Wrong refactor invoked");
        const statements = Debug.checkDefined(getStatementsToMove(context));
        const { host, program } = context;
        Debug.assert(interactiveRefactorArguments, "No interactive refactor arguments available");
        const targetFile = interactiveRefactorArguments.targetFile;
        if (hasJSFileExtension(targetFile) || hasTSFileExtension(targetFile)) {
            if (host.fileExists(targetFile) && program.getSourceFile(targetFile) === undefined) {
                return error(getLocaleSpecificMessage(Diagnostics.Cannot_move_statements_to_the_selected_file));
            }
            const edits = textChanges.ChangeTracker.with(context, t => doChange(context, context.file, interactiveRefactorArguments.targetFile, context.program, statements, t, context.host, context.preferences));
            return { edits, renameFilename: undefined, renameLocation: undefined };
        }
        return error(getLocaleSpecificMessage(Diagnostics.Cannot_move_to_file_selected_file_is_invalid));
    },
});
function error(notApplicableReason) {
    return { edits: [], renameFilename: undefined, renameLocation: undefined, notApplicableReason };
}
function doChange(context, oldFile, targetFile, program, toMove, changes, host, preferences) {
    const checker = program.getTypeChecker();
    const isForNewFile = !host.fileExists(targetFile);
    const targetSourceFile = isForNewFile
        ? createFutureSourceFile(targetFile, oldFile.externalModuleIndicator ? ModuleKind.ESNext : oldFile.commonJsModuleIndicator ? ModuleKind.CommonJS : undefined, program, host)
        : Debug.checkDefined(program.getSourceFile(targetFile));
    const importAdderForOldFile = codefix.createImportAdder(oldFile, context.program, context.preferences, context.host);
    const importAdderForNewFile = codefix.createImportAdder(targetSourceFile, context.program, context.preferences, context.host);
    getNewStatementsAndRemoveFromOldFile(oldFile, targetSourceFile, getUsageInfo(oldFile, toMove.all, checker, isForNewFile ? undefined : getExistingLocals(targetSourceFile, toMove.all, checker)), changes, toMove, program, host, preferences, importAdderForNewFile, importAdderForOldFile);
    if (isForNewFile) {
        addNewFileToTsconfig(program, changes, oldFile.fileName, targetFile, hostGetCanonicalFileName(host));
    }
}
/** @internal */
export function getNewStatementsAndRemoveFromOldFile(oldFile, targetFile, usage, changes, toMove, program, host, preferences, importAdderForNewFile, importAdderForOldFile) {
    const checker = program.getTypeChecker();
    const prologueDirectives = takeWhile(oldFile.statements, isPrologueDirective);
    const useEsModuleSyntax = !fileShouldUseJavaScriptRequire(targetFile.fileName, program, host, !!oldFile.commonJsModuleIndicator);
    const quotePreference = getQuotePreference(oldFile, preferences);
    addImportsForMovedSymbols(usage.oldFileImportsFromTargetFile, targetFile.fileName, importAdderForOldFile, program);
    deleteUnusedOldImports(oldFile, toMove.all, usage.unusedImportsFromOldFile, importAdderForOldFile);
    importAdderForOldFile.writeFixes(changes, quotePreference);
    deleteMovedStatements(oldFile, toMove.ranges, changes);
    updateImportsInOtherFiles(changes, program, host, oldFile, usage.movedSymbols, targetFile.fileName, quotePreference);
    addExportsInOldFile(oldFile, usage.targetFileImportsFromOldFile, changes, useEsModuleSyntax);
    addTargetFileImports(oldFile, usage.oldImportsNeededByTargetFile, usage.targetFileImportsFromOldFile, checker, program, importAdderForNewFile);
    if (!isFullSourceFile(targetFile) && prologueDirectives.length) {
        // Ensure prologue directives come before imports
        changes.insertStatementsInNewFile(targetFile.fileName, prologueDirectives, oldFile);
    }
    importAdderForNewFile.writeFixes(changes, quotePreference);
    const body = addExports(oldFile, toMove.all, arrayFrom(usage.oldFileImportsFromTargetFile.keys()), useEsModuleSyntax);
    if (isFullSourceFile(targetFile) && targetFile.statements.length > 0) {
        moveStatementsToTargetFile(changes, program, body, targetFile, toMove);
    }
    else if (isFullSourceFile(targetFile)) {
        changes.insertNodesAtEndOfFile(targetFile, body, /*blankLineBetween*/ false);
    }
    else {
        changes.insertStatementsInNewFile(targetFile.fileName, importAdderForNewFile.hasFixes() ? [SyntaxKind.NewLineTrivia, ...body] : body, oldFile);
    }
}
/** @internal */
export function addNewFileToTsconfig(program, changes, oldFileName, newFileNameWithExtension, getCanonicalFileName) {
    const cfg = program.getCompilerOptions().configFile;
    if (!cfg)
        return;
    const newFileAbsolutePath = normalizePath(combinePaths(oldFileName, "..", newFileNameWithExtension));
    const newFilePath = getRelativePathFromFile(cfg.fileName, newFileAbsolutePath, getCanonicalFileName);
    const cfgObject = cfg.statements[0] && tryCast(cfg.statements[0].expression, isObjectLiteralExpression);
    const filesProp = cfgObject && find(cfgObject.properties, (prop) => isPropertyAssignment(prop) && isStringLiteral(prop.name) && prop.name.text === "files");
    if (filesProp && isArrayLiteralExpression(filesProp.initializer)) {
        changes.insertNodeInListAfter(cfg, last(filesProp.initializer.elements), factory.createStringLiteral(newFilePath), filesProp.initializer.elements);
    }
}
function deleteMovedStatements(sourceFile, moved, changes) {
    for (const { first, afterLast } of moved) {
        changes.deleteNodeRangeExcludingEnd(sourceFile, first, afterLast);
    }
}
function deleteUnusedOldImports(oldFile, toMove, toDelete, importAdder) {
    for (const statement of oldFile.statements) {
        if (contains(toMove, statement))
            continue;
        forEachImportInStatement(statement, i => {
            forEachAliasDeclarationInImportOrRequire(i, decl => {
                if (toDelete.has(decl.symbol)) {
                    importAdder.removeExistingImport(decl);
                }
            });
        });
    }
}
/** @internal */
export function addExportsInOldFile(oldFile, targetFileImportsFromOldFile, changes, useEsModuleSyntax) {
    const markSeenTop = nodeSeenTracker(); // Needed because multiple declarations may appear in `const x = 0, y = 1;`.
    targetFileImportsFromOldFile.forEach((_, symbol) => {
        if (!symbol.declarations) {
            return;
        }
        for (const decl of symbol.declarations) {
            if (!isTopLevelDeclaration(decl))
                continue;
            const name = nameOfTopLevelDeclaration(decl);
            if (!name)
                continue;
            const top = getTopLevelDeclarationStatement(decl);
            if (markSeenTop(top)) {
                addExportToChanges(oldFile, top, name, changes, useEsModuleSyntax);
            }
        }
    });
}
function updateImportsInOtherFiles(changes, program, host, oldFile, movedSymbols, targetFileName, quotePreference) {
    const checker = program.getTypeChecker();
    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile === oldFile)
            continue;
        for (const statement of sourceFile.statements) {
            forEachImportInStatement(statement, importNode => {
                if (checker.getSymbolAtLocation(moduleSpecifierFromImport(importNode)) !== oldFile.symbol)
                    return;
                const shouldMove = (name) => {
                    const symbol = isBindingElement(name.parent)
                        ? getPropertySymbolFromBindingElement(checker, name.parent)
                        : skipAlias(checker.getSymbolAtLocation(name), checker);
                    return !!symbol && movedSymbols.has(symbol);
                };
                deleteUnusedImports(sourceFile, importNode, changes, shouldMove); // These will be changed to imports from the new file
                const pathToTargetFileWithExtension = resolvePath(getDirectoryPath(getNormalizedAbsolutePath(oldFile.fileName, program.getCurrentDirectory())), targetFileName);
                // no self-imports
                if (getStringComparer(!program.useCaseSensitiveFileNames())(pathToTargetFileWithExtension, sourceFile.fileName) === Comparison.EqualTo)
                    return;
                const newModuleSpecifier = moduleSpecifiers.getModuleSpecifier(program.getCompilerOptions(), sourceFile, sourceFile.fileName, pathToTargetFileWithExtension, createModuleSpecifierResolutionHost(program, host));
                const newImportDeclaration = filterImport(importNode, makeStringLiteral(newModuleSpecifier, quotePreference), shouldMove);
                if (newImportDeclaration)
                    changes.insertNodeAfter(sourceFile, statement, newImportDeclaration);
                const ns = getNamespaceLikeImport(importNode);
                if (ns)
                    updateNamespaceLikeImport(changes, sourceFile, checker, movedSymbols, newModuleSpecifier, ns, importNode, quotePreference);
            });
        }
    }
}
function getNamespaceLikeImport(node) {
    switch (node.kind) {
        case SyntaxKind.ImportDeclaration:
            return node.importClause && node.importClause.namedBindings && node.importClause.namedBindings.kind === SyntaxKind.NamespaceImport ?
                node.importClause.namedBindings.name : undefined;
        case SyntaxKind.ImportEqualsDeclaration:
            return node.name;
        case SyntaxKind.VariableDeclaration:
            return tryCast(node.name, isIdentifier);
        default:
            return Debug.assertNever(node, `Unexpected node kind ${node.kind}`);
    }
}
function updateNamespaceLikeImport(changes, sourceFile, checker, movedSymbols, newModuleSpecifier, oldImportId, oldImportNode, quotePreference) {
    const preferredNewNamespaceName = moduleSpecifierToValidIdentifier(newModuleSpecifier, ScriptTarget.ESNext);
    let needUniqueName = false;
    const toChange = [];
    FindAllReferences.Core.eachSymbolReferenceInFile(oldImportId, checker, sourceFile, ref => {
        if (!isPropertyAccessExpression(ref.parent))
            return;
        needUniqueName = needUniqueName || !!checker.resolveName(preferredNewNamespaceName, ref, SymbolFlags.All, /*excludeGlobals*/ true);
        if (movedSymbols.has(checker.getSymbolAtLocation(ref.parent.name))) {
            toChange.push(ref);
        }
    });
    if (toChange.length) {
        const newNamespaceName = needUniqueName ? getUniqueName(preferredNewNamespaceName, sourceFile) : preferredNewNamespaceName;
        for (const ref of toChange) {
            changes.replaceNode(sourceFile, ref, factory.createIdentifier(newNamespaceName));
        }
        changes.insertNodeAfter(sourceFile, oldImportNode, updateNamespaceLikeImportNode(oldImportNode, preferredNewNamespaceName, newModuleSpecifier, quotePreference));
    }
}
function updateNamespaceLikeImportNode(node, newNamespaceName, newModuleSpecifier, quotePreference) {
    const newNamespaceId = factory.createIdentifier(newNamespaceName);
    const newModuleString = makeStringLiteral(newModuleSpecifier, quotePreference);
    switch (node.kind) {
        case SyntaxKind.ImportDeclaration:
            return factory.createImportDeclaration(
            /*modifiers*/ undefined, factory.createImportClause(/*isTypeOnly*/ false, /*name*/ undefined, factory.createNamespaceImport(newNamespaceId)), newModuleString, 
            /*attributes*/ undefined);
        case SyntaxKind.ImportEqualsDeclaration:
            return factory.createImportEqualsDeclaration(/*modifiers*/ undefined, /*isTypeOnly*/ false, newNamespaceId, factory.createExternalModuleReference(newModuleString));
        case SyntaxKind.VariableDeclaration:
            return factory.createVariableDeclaration(newNamespaceId, /*exclamationToken*/ undefined, /*type*/ undefined, createRequireCall(newModuleString));
        default:
            return Debug.assertNever(node, `Unexpected node kind ${node.kind}`);
    }
}
function createRequireCall(moduleSpecifier) {
    return factory.createCallExpression(factory.createIdentifier("require"), /*typeArguments*/ undefined, [moduleSpecifier]);
}
function moduleSpecifierFromImport(i) {
    return (i.kind === SyntaxKind.ImportDeclaration ? i.moduleSpecifier
        : i.kind === SyntaxKind.ImportEqualsDeclaration ? i.moduleReference.expression
            : i.initializer.arguments[0]);
}
function forEachImportInStatement(statement, cb) {
    if (isImportDeclaration(statement)) {
        if (isStringLiteral(statement.moduleSpecifier))
            cb(statement);
    }
    else if (isImportEqualsDeclaration(statement)) {
        if (isExternalModuleReference(statement.moduleReference) && isStringLiteralLike(statement.moduleReference.expression)) {
            cb(statement);
        }
    }
    else if (isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
            if (decl.initializer && isRequireCall(decl.initializer, /*requireStringLiteralLikeArgument*/ true)) {
                cb(decl);
            }
        }
    }
}
function forEachAliasDeclarationInImportOrRequire(importOrRequire, cb) {
    var _a, _b, _c, _d, _e;
    if (importOrRequire.kind === SyntaxKind.ImportDeclaration) {
        if ((_a = importOrRequire.importClause) === null || _a === void 0 ? void 0 : _a.name) {
            cb(importOrRequire.importClause);
        }
        if (((_c = (_b = importOrRequire.importClause) === null || _b === void 0 ? void 0 : _b.namedBindings) === null || _c === void 0 ? void 0 : _c.kind) === SyntaxKind.NamespaceImport) {
            cb(importOrRequire.importClause.namedBindings);
        }
        if (((_e = (_d = importOrRequire.importClause) === null || _d === void 0 ? void 0 : _d.namedBindings) === null || _e === void 0 ? void 0 : _e.kind) === SyntaxKind.NamedImports) {
            for (const element of importOrRequire.importClause.namedBindings.elements) {
                cb(element);
            }
        }
    }
    else if (importOrRequire.kind === SyntaxKind.ImportEqualsDeclaration) {
        cb(importOrRequire);
    }
    else if (importOrRequire.kind === SyntaxKind.VariableDeclaration) {
        if (importOrRequire.name.kind === SyntaxKind.Identifier) {
            cb(importOrRequire);
        }
        else if (importOrRequire.name.kind === SyntaxKind.ObjectBindingPattern) {
            for (const element of importOrRequire.name.elements) {
                if (isIdentifier(element.name)) {
                    cb(element);
                }
            }
        }
    }
}
/** @internal */
export function addImportsForMovedSymbols(symbols, targetFileName, importAdder, program) {
    for (const [symbol, isValidTypeOnlyUseSite] of symbols) {
        const symbolName = getNameForExportedSymbol(symbol, getEmitScriptTarget(program.getCompilerOptions()));
        const exportKind = symbol.name === "default" && symbol.parent ? ExportKind.Default : ExportKind.Named;
        importAdder.addImportForNonExistentExport(symbolName, targetFileName, exportKind, symbol.flags, isValidTypeOnlyUseSite);
    }
}
function makeVariableStatement(name, type, initializer, flags = NodeFlags.Const) {
    return factory.createVariableStatement(/*modifiers*/ undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(name, /*exclamationToken*/ undefined, type, initializer)], flags));
}
function addExports(sourceFile, toMove, needExport, useEs6Exports) {
    return flatMap(toMove, statement => {
        if (isTopLevelDeclarationStatement(statement) &&
            !isExported(sourceFile, statement, useEs6Exports) &&
            forEachTopLevelDeclaration(statement, d => { var _a; return needExport.includes(Debug.checkDefined((_a = tryCast(d, canHaveSymbol)) === null || _a === void 0 ? void 0 : _a.symbol)); })) {
            const exports = addExport(getSynthesizedDeepClone(statement), useEs6Exports);
            if (exports)
                return exports;
        }
        return getSynthesizedDeepClone(statement);
    });
}
function isExported(sourceFile, decl, useEs6Exports, name) {
    var _a;
    if (useEs6Exports) {
        return !isExpressionStatement(decl) && hasSyntacticModifier(decl, ModifierFlags.Export) || !!(name && sourceFile.symbol && ((_a = sourceFile.symbol.exports) === null || _a === void 0 ? void 0 : _a.has(name.escapedText)));
    }
    return !!sourceFile.symbol && !!sourceFile.symbol.exports &&
        getNamesToExportInCommonJS(decl).some(name => sourceFile.symbol.exports.has(escapeLeadingUnderscores(name)));
}
function deleteUnusedImports(sourceFile, importDecl, changes, isUnused) {
    if (importDecl.kind === SyntaxKind.ImportDeclaration && importDecl.importClause) {
        const { name, namedBindings } = importDecl.importClause;
        if ((!name || isUnused(name)) && (!namedBindings || namedBindings.kind === SyntaxKind.NamedImports && namedBindings.elements.length !== 0 && namedBindings.elements.every(e => isUnused(e.name)))) {
            return changes.delete(sourceFile, importDecl);
        }
    }
    forEachAliasDeclarationInImportOrRequire(importDecl, i => {
        if (i.name && isIdentifier(i.name) && isUnused(i.name)) {
            changes.delete(sourceFile, i);
        }
    });
}
function isTopLevelDeclarationStatement(node) {
    Debug.assert(isSourceFile(node.parent), "Node parent should be a SourceFile");
    return isNonVariableTopLevelDeclaration(node) || isVariableStatement(node);
}
function addExport(decl, useEs6Exports) {
    return useEs6Exports ? [addEs6Export(decl)] : addCommonjsExport(decl);
}
function addEs6Export(d) {
    const modifiers = canHaveModifiers(d) ? concatenate([factory.createModifier(SyntaxKind.ExportKeyword)], getModifiers(d)) : undefined;
    switch (d.kind) {
        case SyntaxKind.FunctionDeclaration:
            return factory.updateFunctionDeclaration(d, modifiers, d.asteriskToken, d.name, d.typeParameters, d.parameters, d.type, d.body);
        case SyntaxKind.ClassDeclaration:
            const decorators = canHaveDecorators(d) ? getDecorators(d) : undefined;
            return factory.updateClassDeclaration(d, concatenate(decorators, modifiers), d.name, d.typeParameters, d.heritageClauses, d.members);
        case SyntaxKind.VariableStatement:
            return factory.updateVariableStatement(d, modifiers, d.declarationList);
        case SyntaxKind.ModuleDeclaration:
            return factory.updateModuleDeclaration(d, modifiers, d.name, d.body);
        case SyntaxKind.EnumDeclaration:
            return factory.updateEnumDeclaration(d, modifiers, d.name, d.members);
        case SyntaxKind.TypeAliasDeclaration:
            return factory.updateTypeAliasDeclaration(d, modifiers, d.name, d.typeParameters, d.type);
        case SyntaxKind.InterfaceDeclaration:
            return factory.updateInterfaceDeclaration(d, modifiers, d.name, d.typeParameters, d.heritageClauses, d.members);
        case SyntaxKind.ImportEqualsDeclaration:
            return factory.updateImportEqualsDeclaration(d, modifiers, d.isTypeOnly, d.name, d.moduleReference);
        case SyntaxKind.ExpressionStatement:
            // Shouldn't try to add 'export' keyword to `exports.x = ...`
            return Debug.fail();
        default:
            return Debug.assertNever(d, `Unexpected declaration kind ${d.kind}`);
    }
}
function addCommonjsExport(decl) {
    return [decl, ...getNamesToExportInCommonJS(decl).map(createExportAssignment)];
}
/** Creates `exports.x = x;` */
function createExportAssignment(name) {
    return factory.createExpressionStatement(factory.createBinaryExpression(factory.createPropertyAccessExpression(factory.createIdentifier("exports"), factory.createIdentifier(name)), SyntaxKind.EqualsToken, factory.createIdentifier(name)));
}
function getNamesToExportInCommonJS(decl) {
    switch (decl.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.ClassDeclaration:
            return [decl.name.text]; // TODO: GH#18217
        case SyntaxKind.VariableStatement:
            return mapDefined(decl.declarationList.declarations, d => isIdentifier(d.name) ? d.name.text : undefined);
        case SyntaxKind.ModuleDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.TypeAliasDeclaration:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.ImportEqualsDeclaration:
            return emptyArray;
        case SyntaxKind.ExpressionStatement:
            // Shouldn't try to add 'export' keyword to `exports.x = ...`
            return Debug.fail("Can't export an ExpressionStatement");
        default:
            return Debug.assertNever(decl, `Unexpected decl kind ${decl.kind}`);
    }
}
function filterImport(i, moduleSpecifier, keep) {
    switch (i.kind) {
        case SyntaxKind.ImportDeclaration: {
            const clause = i.importClause;
            if (!clause)
                return undefined;
            const defaultImport = clause.name && keep(clause.name) ? clause.name : undefined;
            const namedBindings = clause.namedBindings && filterNamedBindings(clause.namedBindings, keep);
            return defaultImport || namedBindings
                ? factory.createImportDeclaration(/*modifiers*/ undefined, factory.createImportClause(clause.isTypeOnly, defaultImport, namedBindings), getSynthesizedDeepClone(moduleSpecifier), /*attributes*/ undefined)
                : undefined;
        }
        case SyntaxKind.ImportEqualsDeclaration:
            return keep(i.name) ? i : undefined;
        case SyntaxKind.VariableDeclaration: {
            const name = filterBindingName(i.name, keep);
            return name ? makeVariableStatement(name, i.type, createRequireCall(moduleSpecifier), i.parent.flags) : undefined;
        }
        default:
            return Debug.assertNever(i, `Unexpected import kind ${i.kind}`);
    }
}
function filterNamedBindings(namedBindings, keep) {
    if (namedBindings.kind === SyntaxKind.NamespaceImport) {
        return keep(namedBindings.name) ? namedBindings : undefined;
    }
    else {
        const newElements = namedBindings.elements.filter(e => keep(e.name));
        return newElements.length ? factory.createNamedImports(newElements) : undefined;
    }
}
function filterBindingName(name, keep) {
    switch (name.kind) {
        case SyntaxKind.Identifier:
            return keep(name) ? name : undefined;
        case SyntaxKind.ArrayBindingPattern:
            return name;
        case SyntaxKind.ObjectBindingPattern: {
            // We can't handle nested destructurings or property names well here, so just copy them all.
            const newElements = name.elements.filter(prop => prop.propertyName || !isIdentifier(prop.name) || keep(prop.name));
            return newElements.length ? factory.createObjectBindingPattern(newElements) : undefined;
        }
    }
}
function nameOfTopLevelDeclaration(d) {
    return isExpressionStatement(d) ? tryCast(d.expression.left.name, isIdentifier) : tryCast(d.name, isIdentifier);
}
function getTopLevelDeclarationStatement(d) {
    switch (d.kind) {
        case SyntaxKind.VariableDeclaration:
            return d.parent.parent;
        case SyntaxKind.BindingElement:
            return getTopLevelDeclarationStatement(cast(d.parent.parent, (p) => isVariableDeclaration(p) || isBindingElement(p)));
        default:
            return d;
    }
}
function addExportToChanges(sourceFile, decl, name, changes, useEs6Exports) {
    if (isExported(sourceFile, decl, useEs6Exports, name))
        return;
    if (useEs6Exports) {
        if (!isExpressionStatement(decl))
            changes.insertExportModifier(sourceFile, decl);
    }
    else {
        const names = getNamesToExportInCommonJS(decl);
        if (names.length !== 0)
            changes.insertNodesAfter(sourceFile, decl, names.map(createExportAssignment));
    }
}
/** @internal */
export function createNewFileName(oldFile, program, host, toMove) {
    const checker = program.getTypeChecker();
    if (toMove) {
        const usage = getUsageInfo(oldFile, toMove.all, checker);
        const currentDirectory = getDirectoryPath(oldFile.fileName);
        const extension = extensionFromPath(oldFile.fileName);
        const newFileName = combinePaths(
        // new file is always placed in the same directory as the old file
        currentDirectory, 
        // ensures the filename computed below isn't already taken
        makeUniqueFilename(
        // infers a name for the new file from the symbols being moved
        inferNewFileName(usage.oldFileImportsFromTargetFile, usage.movedSymbols), extension, currentDirectory, host))
            // new file has same extension as old file
            + extension;
        return newFileName;
    }
    return "";
}
function getRangeToMove(context) {
    const { file } = context;
    const range = createTextRangeFromSpan(getRefactorContextSpan(context));
    const { statements } = file;
    let startNodeIndex = findIndex(statements, s => s.end > range.pos);
    if (startNodeIndex === -1)
        return undefined;
    const startStatement = statements[startNodeIndex];
    const overloadRangeToMove = getOverloadRangeToMove(file, startStatement);
    if (overloadRangeToMove) {
        startNodeIndex = overloadRangeToMove.start;
    }
    let endNodeIndex = findIndex(statements, s => s.end >= range.end, startNodeIndex);
    /**
     * [|const a = 2;
     * function foo() {
     * }
     * |]
     */
    if (endNodeIndex !== -1 && range.end <= statements[endNodeIndex].getStart()) {
        endNodeIndex--;
    }
    const endingOverloadRangeToMove = getOverloadRangeToMove(file, statements[endNodeIndex]);
    if (endingOverloadRangeToMove) {
        endNodeIndex = endingOverloadRangeToMove.end;
    }
    return {
        toMove: statements.slice(startNodeIndex, endNodeIndex === -1 ? statements.length : endNodeIndex + 1),
        afterLast: endNodeIndex === -1 ? undefined : statements[endNodeIndex + 1],
    };
}
/** @internal */
export function getStatementsToMove(context) {
    const rangeToMove = getRangeToMove(context);
    if (rangeToMove === undefined)
        return undefined;
    const all = [];
    const ranges = [];
    const { toMove, afterLast } = rangeToMove;
    getRangesWhere(toMove, isAllowedStatementToMove, (start, afterEndIndex) => {
        for (let i = start; i < afterEndIndex; i++)
            all.push(toMove[i]);
        ranges.push({ first: toMove[start], afterLast });
    });
    return all.length === 0 ? undefined : { all, ranges };
}
/** @internal */
export function containsJsx(statements) {
    return find(statements, statement => !!(statement.transformFlags & TransformFlags.ContainsJsx));
}
function isAllowedStatementToMove(statement) {
    // Filters imports and prologue directives out of the range of statements to move.
    // Imports will be copied to the new file anyway, and may still be needed in the old file.
    // Prologue directives will be copied to the new file and should be left in the old file.
    return !isPureImport(statement) && !isPrologueDirective(statement);
}
function isPureImport(node) {
    switch (node.kind) {
        case SyntaxKind.ImportDeclaration:
            return true;
        case SyntaxKind.ImportEqualsDeclaration:
            return !hasSyntacticModifier(node, ModifierFlags.Export);
        case SyntaxKind.VariableStatement:
            return node.declarationList.declarations.every(d => !!d.initializer && isRequireCall(d.initializer, /*requireStringLiteralLikeArgument*/ true));
        default:
            return false;
    }
}
/** @internal */
export function getUsageInfo(oldFile, toMove, checker, existingTargetLocals = new Set(), enclosingRange) {
    var _a;
    const movedSymbols = new Set();
    const oldImportsNeededByTargetFile = new Map();
    const targetFileImportsFromOldFile = new Map();
    const jsxNamespaceSymbol = getJsxNamespaceSymbol(containsJsx(toMove));
    if (jsxNamespaceSymbol) { // Might not exist (e.g. in non-compiling code)
        oldImportsNeededByTargetFile.set(jsxNamespaceSymbol, [false, tryCast((_a = jsxNamespaceSymbol.declarations) === null || _a === void 0 ? void 0 : _a[0], (d) => isImportSpecifier(d) || isImportClause(d) || isNamespaceImport(d) || isImportEqualsDeclaration(d) || isBindingElement(d) || isVariableDeclaration(d))]);
    }
    for (const statement of toMove) {
        forEachTopLevelDeclaration(statement, decl => {
            movedSymbols.add(Debug.checkDefined(isExpressionStatement(decl) ? checker.getSymbolAtLocation(decl.expression.left) : decl.symbol, "Need a symbol here"));
        });
    }
    const unusedImportsFromOldFile = new Set();
    for (const statement of toMove) {
        forEachReference(statement, checker, enclosingRange, (symbol, isValidTypeOnlyUseSite) => {
            if (!some(symbol.declarations)) {
                return;
            }
            if (existingTargetLocals.has(skipAlias(symbol, checker))) {
                unusedImportsFromOldFile.add(symbol);
                return;
            }
            const importedDeclaration = find(symbol.declarations, isInImport);
            if (importedDeclaration) {
                const prevIsTypeOnly = oldImportsNeededByTargetFile.get(symbol);
                oldImportsNeededByTargetFile.set(symbol, [
                    prevIsTypeOnly === undefined ? isValidTypeOnlyUseSite : prevIsTypeOnly && isValidTypeOnlyUseSite,
                    tryCast(importedDeclaration, (d) => isImportSpecifier(d) || isImportClause(d) || isNamespaceImport(d) || isImportEqualsDeclaration(d) || isBindingElement(d) || isVariableDeclaration(d)),
                ]);
            }
            else if (!movedSymbols.has(symbol) && every(symbol.declarations, decl => isTopLevelDeclaration(decl) && sourceFileOfTopLevelDeclaration(decl) === oldFile)) {
                targetFileImportsFromOldFile.set(symbol, isValidTypeOnlyUseSite);
            }
        });
    }
    for (const unusedImport of oldImportsNeededByTargetFile.keys()) {
        unusedImportsFromOldFile.add(unusedImport);
    }
    const oldFileImportsFromTargetFile = new Map();
    for (const statement of oldFile.statements) {
        if (contains(toMove, statement))
            continue;
        // jsxNamespaceSymbol will only be set iff it is in oldImportsNeededByTargetFile.
        if (jsxNamespaceSymbol && !!(statement.transformFlags & TransformFlags.ContainsJsx)) {
            unusedImportsFromOldFile.delete(jsxNamespaceSymbol);
        }
        forEachReference(statement, checker, enclosingRange, (symbol, isValidTypeOnlyUseSite) => {
            if (movedSymbols.has(symbol))
                oldFileImportsFromTargetFile.set(symbol, isValidTypeOnlyUseSite);
            unusedImportsFromOldFile.delete(symbol);
        });
    }
    return { movedSymbols, targetFileImportsFromOldFile, oldFileImportsFromTargetFile, oldImportsNeededByTargetFile, unusedImportsFromOldFile };
    function getJsxNamespaceSymbol(containsJsx) {
        if (containsJsx === undefined) {
            return undefined;
        }
        const jsxNamespace = checker.getJsxNamespace(containsJsx);
        // Strictly speaking, this could resolve to a symbol other than the JSX namespace.
        // This will produce erroneous output (probably, an incorrectly copied import) but
        // is expected to be very rare and easily reversible.
        const jsxNamespaceSymbol = checker.resolveName(jsxNamespace, containsJsx, SymbolFlags.Namespace, /*excludeGlobals*/ true);
        return !!jsxNamespaceSymbol && some(jsxNamespaceSymbol.declarations, isInImport)
            ? jsxNamespaceSymbol
            : undefined;
    }
}
function makeUniqueFilename(proposedFilename, extension, inDirectory, host) {
    let newFilename = proposedFilename;
    for (let i = 1;; i++) {
        const name = combinePaths(inDirectory, newFilename + extension);
        if (!host.fileExists(name))
            return newFilename;
        newFilename = `${proposedFilename}.${i}`;
    }
}
function inferNewFileName(importsFromNewFile, movedSymbols) {
    return forEachKey(importsFromNewFile, symbolNameNoDefault) || forEachKey(movedSymbols, symbolNameNoDefault) || "newFile";
}
function forEachReference(node, checker, enclosingRange, onReference) {
    node.forEachChild(function cb(node) {
        if (isIdentifier(node) && !isDeclarationName(node)) {
            if (enclosingRange && !rangeContainsRange(enclosingRange, node)) {
                return;
            }
            const sym = checker.getSymbolAtLocation(node);
            if (sym)
                onReference(sym, isValidTypeOnlyAliasUseSite(node));
        }
        else {
            node.forEachChild(cb);
        }
    });
}
function forEachTopLevelDeclaration(statement, cb) {
    switch (statement.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ModuleDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.TypeAliasDeclaration:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.ImportEqualsDeclaration:
            return cb(statement);
        case SyntaxKind.VariableStatement:
            return firstDefined(statement.declarationList.declarations, decl => forEachTopLevelDeclarationInBindingName(decl.name, cb));
        case SyntaxKind.ExpressionStatement: {
            const { expression } = statement;
            return isBinaryExpression(expression) && getAssignmentDeclarationKind(expression) === AssignmentDeclarationKind.ExportsProperty
                ? cb(statement)
                : undefined;
        }
    }
}
/** @internal */
export function isInImport(decl) {
    switch (decl.kind) {
        case SyntaxKind.ImportEqualsDeclaration:
        case SyntaxKind.ImportSpecifier:
        case SyntaxKind.ImportClause:
        case SyntaxKind.NamespaceImport:
            return true;
        case SyntaxKind.VariableDeclaration:
            return isVariableDeclarationInImport(decl);
        case SyntaxKind.BindingElement:
            return isVariableDeclaration(decl.parent.parent) && isVariableDeclarationInImport(decl.parent.parent);
        default:
            return false;
    }
}
function isVariableDeclarationInImport(decl) {
    return isSourceFile(decl.parent.parent.parent) &&
        !!decl.initializer && isRequireCall(decl.initializer, /*requireStringLiteralLikeArgument*/ true);
}
function isTopLevelDeclaration(node) {
    return isNonVariableTopLevelDeclaration(node) && isSourceFile(node.parent) || isVariableDeclaration(node) && isSourceFile(node.parent.parent.parent);
}
function sourceFileOfTopLevelDeclaration(node) {
    return isVariableDeclaration(node) ? node.parent.parent.parent : node.parent;
}
function forEachTopLevelDeclarationInBindingName(name, cb) {
    switch (name.kind) {
        case SyntaxKind.Identifier:
            return cb(cast(name.parent, (x) => isVariableDeclaration(x) || isBindingElement(x)));
        case SyntaxKind.ArrayBindingPattern:
        case SyntaxKind.ObjectBindingPattern:
            return firstDefined(name.elements, em => isOmittedExpression(em) ? undefined : forEachTopLevelDeclarationInBindingName(em.name, cb));
        default:
            return Debug.assertNever(name, `Unexpected name kind ${name.kind}`);
    }
}
function isNonVariableTopLevelDeclaration(node) {
    switch (node.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ModuleDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.TypeAliasDeclaration:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.ImportEqualsDeclaration:
            return true;
        default:
            return false;
    }
}
function moveStatementsToTargetFile(changes, program, statements, targetFile, toMove) {
    var _a;
    const removedExports = new Set();
    const targetExports = (_a = targetFile.symbol) === null || _a === void 0 ? void 0 : _a.exports;
    if (targetExports) {
        const checker = program.getTypeChecker();
        const targetToSourceExports = new Map();
        for (const node of toMove.all) {
            if (isTopLevelDeclarationStatement(node) && hasSyntacticModifier(node, ModifierFlags.Export)) {
                forEachTopLevelDeclaration(node, declaration => {
                    var _a;
                    const targetDeclarations = canHaveSymbol(declaration) ? (_a = targetExports.get(declaration.symbol.escapedName)) === null || _a === void 0 ? void 0 : _a.declarations : undefined;
                    const exportDeclaration = firstDefined(targetDeclarations, d => isExportDeclaration(d) ? d :
                        isExportSpecifier(d) ? tryCast(d.parent.parent, isExportDeclaration) : undefined);
                    if (exportDeclaration && exportDeclaration.moduleSpecifier) {
                        targetToSourceExports.set(exportDeclaration, (targetToSourceExports.get(exportDeclaration) || new Set()).add(declaration));
                    }
                });
            }
        }
        for (const [exportDeclaration, topLevelDeclarations] of arrayFrom(targetToSourceExports)) {
            if (exportDeclaration.exportClause && isNamedExports(exportDeclaration.exportClause) && length(exportDeclaration.exportClause.elements)) {
                const elements = exportDeclaration.exportClause.elements;
                const updatedElements = filter(elements, elem => find(skipAlias(elem.symbol, checker).declarations, d => isTopLevelDeclaration(d) && topLevelDeclarations.has(d)) === undefined);
                if (length(updatedElements) === 0) {
                    changes.deleteNode(targetFile, exportDeclaration);
                    removedExports.add(exportDeclaration);
                    continue;
                }
                if (length(updatedElements) < length(elements)) {
                    changes.replaceNode(targetFile, exportDeclaration, factory.updateExportDeclaration(exportDeclaration, exportDeclaration.modifiers, exportDeclaration.isTypeOnly, factory.updateNamedExports(exportDeclaration.exportClause, factory.createNodeArray(updatedElements, elements.hasTrailingComma)), exportDeclaration.moduleSpecifier, exportDeclaration.attributes));
                }
            }
        }
    }
    const lastReExport = findLast(targetFile.statements, n => isExportDeclaration(n) && !!n.moduleSpecifier && !removedExports.has(n));
    if (lastReExport) {
        changes.insertNodesBefore(targetFile, lastReExport, statements, /*blankLineBetween*/ true);
    }
    else {
        changes.insertNodesAfter(targetFile, targetFile.statements[targetFile.statements.length - 1], statements);
    }
}
function getOverloadRangeToMove(sourceFile, statement) {
    if (isFunctionLikeDeclaration(statement)) {
        const declarations = statement.symbol.declarations;
        if (declarations === undefined || length(declarations) <= 1 || !contains(declarations, statement)) {
            return undefined;
        }
        const firstDecl = declarations[0];
        const lastDecl = declarations[length(declarations) - 1];
        const statementsToMove = mapDefined(declarations, d => getSourceFileOfNode(d) === sourceFile && isStatement(d) ? d : undefined);
        const end = findIndex(sourceFile.statements, s => s.end >= lastDecl.end);
        const start = findIndex(sourceFile.statements, s => s.end >= firstDecl.end);
        return { toMove: statementsToMove, start, end };
    }
    return undefined;
}
/** @internal */
export function getExistingLocals(sourceFile, statements, checker) {
    const existingLocals = new Set();
    for (const moduleSpecifier of sourceFile.imports) {
        const declaration = importFromModuleSpecifier(moduleSpecifier);
        if (isImportDeclaration(declaration) && declaration.importClause &&
            declaration.importClause.namedBindings && isNamedImports(declaration.importClause.namedBindings)) {
            for (const e of declaration.importClause.namedBindings.elements) {
                const symbol = checker.getSymbolAtLocation(e.propertyName || e.name);
                if (symbol) {
                    existingLocals.add(skipAlias(symbol, checker));
                }
            }
        }
        if (isVariableDeclarationInitializedToRequire(declaration.parent) && isObjectBindingPattern(declaration.parent.name)) {
            for (const e of declaration.parent.name.elements) {
                const symbol = checker.getSymbolAtLocation(e.propertyName || e.name);
                if (symbol) {
                    existingLocals.add(skipAlias(symbol, checker));
                }
            }
        }
    }
    for (const statement of statements) {
        forEachReference(statement, checker, /*enclosingRange*/ undefined, s => {
            const symbol = skipAlias(s, checker);
            if (symbol.valueDeclaration && getSourceFileOfNode(symbol.valueDeclaration).path === sourceFile.path) {
                existingLocals.add(symbol);
            }
        });
    }
    return existingLocals;
}
