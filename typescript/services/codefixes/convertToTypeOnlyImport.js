import {
  codeFixAll,
  createCodeFixAction,
  createCodeFixActionWithoutFixAll,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  Diagnostics,
  factory,
  FindAllReferences,
  getSynthesizedDeepClone,
  getSynthesizedDeepClones,
  getTokenAtPosition,
  isImportDeclaration,
  isImportSpecifier,
  isValidTypeOnlyAliasUseSite,
  sameMap,
  some,
  SyntaxKind,
  textChanges,
} from "../namespaces/ts.js";


const errorCodes = [
    Diagnostics._0_is_a_type_and_must_be_imported_using_a_type_only_import_when_verbatimModuleSyntax_is_enabled.code,
    Diagnostics._0_resolves_to_a_type_only_declaration_and_must_be_imported_using_a_type_only_import_when_verbatimModuleSyntax_is_enabled.code,
];

const fixId = "convertToTypeOnlyImport";

registerCodeFix({
    errorCodes,
    getCodeActions: function getCodeActionsToConvertToTypeOnlyImport(context) {
        var _a, _b;
        const declaration = getDeclaration(context.sourceFile, context.span.start);
        if (declaration) {
            const changes = textChanges.ChangeTracker.with(context, t => doChange(t, context.sourceFile, declaration));
            const importDeclarationChanges = declaration.kind === SyntaxKind.ImportSpecifier && isImportDeclaration(declaration.parent.parent.parent) && canConvertImportDeclarationForSpecifier(declaration, context.sourceFile, context.program)
                ? textChanges.ChangeTracker.with(context, t => doChange(t, context.sourceFile, declaration.parent.parent.parent))
                : undefined;
            const mainAction = createCodeFixAction(fixId, changes, declaration.kind === SyntaxKind.ImportSpecifier
                ? [Diagnostics.Use_type_0, (_b = (_a = declaration.propertyName) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : declaration.name.text]
                : Diagnostics.Use_import_type, fixId, Diagnostics.Fix_all_with_type_only_imports);
            if (some(importDeclarationChanges)) {
                return [
                    createCodeFixActionWithoutFixAll(fixId, importDeclarationChanges, Diagnostics.Use_import_type),
                    mainAction,
                ];
            }
            return [mainAction];
        }
        return undefined;
    },
    fixIds: [fixId],
    getAllCodeActions: function getAllCodeActionsToConvertToTypeOnlyImport(context) {
        const fixedImportDeclarations = new Set();
        return codeFixAll(context, errorCodes, (changes, diag) => {
            const errorDeclaration = getDeclaration(diag.file, diag.start);
            if ((errorDeclaration === null || errorDeclaration === void 0 ? void 0 : errorDeclaration.kind) === SyntaxKind.ImportDeclaration && !fixedImportDeclarations.has(errorDeclaration)) {
                doChange(changes, diag.file, errorDeclaration);
                fixedImportDeclarations.add(errorDeclaration);
            }
            else if ((errorDeclaration === null || errorDeclaration === void 0 ? void 0 : errorDeclaration.kind) === SyntaxKind.ImportSpecifier
                && isImportDeclaration(errorDeclaration.parent.parent.parent)
                && !fixedImportDeclarations.has(errorDeclaration.parent.parent.parent)
                && canConvertImportDeclarationForSpecifier(errorDeclaration, diag.file, context.program)) {
                doChange(changes, diag.file, errorDeclaration.parent.parent.parent);
                fixedImportDeclarations.add(errorDeclaration.parent.parent.parent);
            }
            else if ((errorDeclaration === null || errorDeclaration === void 0 ? void 0 : errorDeclaration.kind) === SyntaxKind.ImportSpecifier) {
                doChange(changes, diag.file, errorDeclaration);
            }
        });
    },
});
function getDeclaration(sourceFile, pos) {
    const { parent } = getTokenAtPosition(sourceFile, pos);
    return isImportSpecifier(parent) || isImportDeclaration(parent) && parent.importClause ? parent : undefined;
}
function canConvertImportDeclarationForSpecifier(specifier, sourceFile, program) {
    if (specifier.parent.parent.name) {
        // An import declaration with a default import and named bindings can't be type-only
        return false;
    }
    const nonTypeOnlySpecifiers = specifier.parent.elements.filter(e => !e.isTypeOnly);
    if (nonTypeOnlySpecifiers.length === 1) {
        // If the error specifier is on the only non-type-only specifier, we can convert the whole import
        return true;
    }
    // Otherwise, we need to check the usage of the other specifiers
    const checker = program.getTypeChecker();
    for (const specifier of nonTypeOnlySpecifiers) {
        const isUsedAsValue = FindAllReferences.Core.eachSymbolReferenceInFile(specifier.name, checker, sourceFile, usage => {
            const symbol = checker.getSymbolAtLocation(usage);
            return !!symbol && checker.symbolIsValue(symbol) || !isValidTypeOnlyAliasUseSite(usage);
        });
        if (isUsedAsValue) {
            return false;
        }
    }
    // No other specifiers are used as values, so we can convert the whole import
    return true;
}
function doChange(changes, sourceFile, declaration) {
    var _a;
    if (isImportSpecifier(declaration)) {
        changes.replaceNode(sourceFile, declaration, factory.updateImportSpecifier(declaration, /*isTypeOnly*/ true, declaration.propertyName, declaration.name));
    }
    else {
        const importClause = declaration.importClause;
        if (importClause.name && importClause.namedBindings) {
            changes.replaceNodeWithNodes(sourceFile, declaration, [
                factory.createImportDeclaration(getSynthesizedDeepClones(declaration.modifiers, /*includeTrivia*/ true), factory.createImportClause(/*isTypeOnly*/ true, getSynthesizedDeepClone(importClause.name, /*includeTrivia*/ true), /*namedBindings*/ undefined), getSynthesizedDeepClone(declaration.moduleSpecifier, /*includeTrivia*/ true), getSynthesizedDeepClone(declaration.attributes, /*includeTrivia*/ true)),
                factory.createImportDeclaration(getSynthesizedDeepClones(declaration.modifiers, /*includeTrivia*/ true), factory.createImportClause(/*isTypeOnly*/ true, /*name*/ undefined, getSynthesizedDeepClone(importClause.namedBindings, /*includeTrivia*/ true)), getSynthesizedDeepClone(declaration.moduleSpecifier, /*includeTrivia*/ true), getSynthesizedDeepClone(declaration.attributes, /*includeTrivia*/ true)),
            ]);
        }
        else {
            const newNamedBindings = ((_a = importClause.namedBindings) === null || _a === void 0 ? void 0 : _a.kind) === SyntaxKind.NamedImports
                ? factory.updateNamedImports(importClause.namedBindings, sameMap(importClause.namedBindings.elements, e => factory.updateImportSpecifier(e, /*isTypeOnly*/ false, e.propertyName, e.name)))
                : importClause.namedBindings;
            const importDeclaration = factory.updateImportDeclaration(declaration, declaration.modifiers, factory.updateImportClause(importClause, /*isTypeOnly*/ true, importClause.name, newNamedBindings), declaration.moduleSpecifier, declaration.attributes);
            changes.replaceNode(sourceFile, declaration, importDeclaration);
        }
    }
}
