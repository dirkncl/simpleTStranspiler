import {
  createCodeFixActionWithoutFixAll,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  append,
  Diagnostics,
  emptyArray,
  find,
  forEachImportClauseDeclaration,
  getTokenAtPosition,
  isIdentifier,
  isImportClause,
  isImportEqualsDeclaration,
  isImportSpecifier,
  or,
  refactor,
  skipAlias,
  SymbolFlags,
  SyntaxKind,
  textChanges,
  tryCast,
} from "../namespaces/ts.js";


const fixId = "fixUnreferenceableDecoratorMetadata";
const errorCodes = [
  Diagnostics.A_type_referenced_in_a_decorated_signature_must_be_imported_with_import_type_or_a_namespace_import_when_isolatedModules_and_emitDecoratorMetadata_are_enabled.code
];

registerCodeFix({
    errorCodes,
    getCodeActions: context => {
        const importDeclaration = getImportDeclaration(context.sourceFile, context.program, context.span.start);
        if (!importDeclaration)
            return;
        const namespaceChanges = textChanges.ChangeTracker.with(context, t => importDeclaration.kind === SyntaxKind.ImportSpecifier && doNamespaceImportChange(t, context.sourceFile, importDeclaration, context.program));
        const typeOnlyChanges = textChanges.ChangeTracker.with(context, t => doTypeOnlyImportChange(t, context.sourceFile, importDeclaration, context.program));
        let actions;
        if (namespaceChanges.length) {
            actions = append(actions, createCodeFixActionWithoutFixAll(fixId, namespaceChanges, Diagnostics.Convert_named_imports_to_namespace_import));
        }
        if (typeOnlyChanges.length) {
            actions = append(actions, createCodeFixActionWithoutFixAll(fixId, typeOnlyChanges, Diagnostics.Use_import_type));
        }
        return actions;
    },
    fixIds: [fixId],
});
function getImportDeclaration(sourceFile, program, start) {
    const identifier = tryCast(getTokenAtPosition(sourceFile, start), isIdentifier);
    if (!identifier || identifier.parent.kind !== SyntaxKind.TypeReference)
        return;
    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(identifier);
    return find((symbol === null || symbol === void 0 ? void 0 : symbol.declarations) || emptyArray, or(isImportClause, isImportSpecifier, isImportEqualsDeclaration));
}
// Converts the import declaration of the offending import to a type-only import,
// only if it can be done without affecting other imported names. If the conversion
// cannot be done cleanly, we could offer to *extract* the offending import to a
// new type-only import declaration, but honestly I doubt anyone will ever use this
// codefix at all, so it's probably not worth the lines of code.
function doTypeOnlyImportChange(changes, sourceFile, importDeclaration, program) {
    if (importDeclaration.kind === SyntaxKind.ImportEqualsDeclaration) {
        changes.insertModifierBefore(sourceFile, SyntaxKind.TypeKeyword, importDeclaration.name);
        return;
    }
    const importClause = importDeclaration.kind === SyntaxKind.ImportClause ? importDeclaration : importDeclaration.parent.parent;
    if (importClause.name && importClause.namedBindings) {
        // Cannot convert an import with a default import and named bindings to type-only
        // (it's a grammar error).
        return;
    }
    const checker = program.getTypeChecker();
    const importsValue = !!forEachImportClauseDeclaration(importClause, decl => {
        if (skipAlias(decl.symbol, checker).flags & SymbolFlags.Value)
            return true;
    });
    if (importsValue) {
        // Assume that if someone wrote a non-type-only import that includes some values,
        // they intend to use those values in value positions, even if they haven't yet.
        // Don't convert it to type-only.
        return;
    }
    changes.insertModifierBefore(sourceFile, SyntaxKind.TypeKeyword, importClause);
}
function doNamespaceImportChange(changes, sourceFile, importDeclaration, program) {
    refactor.doChangeNamedToNamespaceOrDefault(sourceFile, program, changes, importDeclaration.parent);
}
