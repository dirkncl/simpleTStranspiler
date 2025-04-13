import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../_namespaces/ts.codefix.js";

import {
  Debug,
  Diagnostics,
  factory,
  findAncestor,
  getEffectiveBaseTypeNode,
  getEmitScriptTarget,
  getMeaningFromLocation,
  getTextOfNode,
  getTokenAtPosition,
  hasOverrideModifier,
  isBinaryExpression,
  isClassElement,
  isClassLike,
  isIdentifier,
  isIdentifierText,
  isImportDeclaration,
  isImportSpecifier,
  isJsxAttribute,
  isJsxOpeningLikeElement,
  isMemberName,
  isNamedDeclaration,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  isQualifiedName,
  isStringLiteralLike,
  NodeFlags,
  SemanticMeaning,
  SymbolFlags,
  symbolName,
  SyntaxKind,
  textChanges,
} from "../_namespaces/ts.js";


const fixId = "fixSpelling";

const errorCodes = [
    Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
    Diagnostics.Property_0_may_not_exist_on_type_1_Did_you_mean_2.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_1.code,
    Diagnostics.Could_not_find_name_0_Did_you_mean_1.code,
    Diagnostics.Cannot_find_namespace_0_Did_you_mean_1.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0.code,
    Diagnostics.Cannot_find_name_0_Did_you_mean_the_static_member_1_0.code,
    Diagnostics._0_has_no_exported_member_named_1_Did_you_mean_2.code,
    Diagnostics.This_member_cannot_have_an_override_modifier_because_it_is_not_declared_in_the_base_class_0_Did_you_mean_1.code,
    Diagnostics.This_member_cannot_have_a_JSDoc_comment_with_an_override_tag_because_it_is_not_declared_in_the_base_class_0_Did_you_mean_1.code,
    // for JSX class components
    Diagnostics.No_overload_matches_this_call.code,
    // for JSX FC
    Diagnostics.Type_0_is_not_assignable_to_type_1.code,
];
registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { sourceFile, errorCode } = context;
        const info = getInfo(sourceFile, context.span.start, context, errorCode);
        if (!info)
            return undefined;
        const { node, suggestedSymbol } = info;
        const target = getEmitScriptTarget(context.host.getCompilationSettings());
        const changes = textChanges.ChangeTracker.with(context, t => doChange(t, sourceFile, node, suggestedSymbol, target));
        return [createCodeFixAction("spelling", changes, [Diagnostics.Change_spelling_to_0, symbolName(suggestedSymbol)], fixId, Diagnostics.Fix_all_detected_spelling_errors)];
    },
    fixIds: [fixId],
    getAllCodeActions: context => codeFixAll(context, errorCodes, (changes, diag) => {
        const info = getInfo(diag.file, diag.start, context, diag.code);
        const target = getEmitScriptTarget(context.host.getCompilationSettings());
        if (info)
            doChange(changes, context.sourceFile, info.node, info.suggestedSymbol, target);
    }),
});
function getInfo(sourceFile, pos, context, errorCode) {
    // This is the identifier of the misspelled word. eg:
    // this.speling = 1;
    //      ^^^^^^^
    const node = getTokenAtPosition(sourceFile, pos);
    const parent = node.parent;
    // Only fix spelling for No_overload_matches_this_call emitted on the React class component
    if ((errorCode === Diagnostics.No_overload_matches_this_call.code ||
        errorCode === Diagnostics.Type_0_is_not_assignable_to_type_1.code) &&
        !isJsxAttribute(parent))
        return undefined;
    const checker = context.program.getTypeChecker();
    let suggestedSymbol;
    if (isPropertyAccessExpression(parent) && parent.name === node) {
        Debug.assert(isMemberName(node), "Expected an identifier for spelling (property access)");
        let containingType = checker.getTypeAtLocation(parent.expression);
        if (parent.flags & NodeFlags.OptionalChain) {
            containingType = checker.getNonNullableType(containingType);
        }
        suggestedSymbol = checker.getSuggestedSymbolForNonexistentProperty(node, containingType);
    }
    else if (isBinaryExpression(parent) && parent.operatorToken.kind === SyntaxKind.InKeyword && parent.left === node && isPrivateIdentifier(node)) {
        const receiverType = checker.getTypeAtLocation(parent.right);
        suggestedSymbol = checker.getSuggestedSymbolForNonexistentProperty(node, receiverType);
    }
    else if (isQualifiedName(parent) && parent.right === node) {
        const symbol = checker.getSymbolAtLocation(parent.left);
        if (symbol && symbol.flags & SymbolFlags.Module) {
            suggestedSymbol = checker.getSuggestedSymbolForNonexistentModule(parent.right, symbol);
        }
    }
    else if (isImportSpecifier(parent) && parent.name === node) {
        Debug.assertNode(node, isIdentifier, "Expected an identifier for spelling (import)");
        const importDeclaration = findAncestor(node, isImportDeclaration);
        const resolvedSourceFile = getResolvedSourceFileFromImportDeclaration(context, importDeclaration, sourceFile);
        if (resolvedSourceFile && resolvedSourceFile.symbol) {
            suggestedSymbol = checker.getSuggestedSymbolForNonexistentModule(node, resolvedSourceFile.symbol);
        }
    }
    else if (isJsxAttribute(parent) && parent.name === node) {
        Debug.assertNode(node, isIdentifier, "Expected an identifier for JSX attribute");
        const tag = findAncestor(node, isJsxOpeningLikeElement);
        const props = checker.getContextualTypeForArgumentAtIndex(tag, 0);
        suggestedSymbol = checker.getSuggestedSymbolForNonexistentJSXAttribute(node, props);
    }
    else if (hasOverrideModifier(parent) && isClassElement(parent) && parent.name === node) {
        const baseDeclaration = findAncestor(node, isClassLike);
        const baseTypeNode = baseDeclaration ? getEffectiveBaseTypeNode(baseDeclaration) : undefined;
        const baseType = baseTypeNode ? checker.getTypeAtLocation(baseTypeNode) : undefined;
        if (baseType) {
            suggestedSymbol = checker.getSuggestedSymbolForNonexistentClassMember(getTextOfNode(node), baseType);
        }
    }
    else {
        const meaning = getMeaningFromLocation(node);
        const name = getTextOfNode(node);
        Debug.assert(name !== undefined, "name should be defined");
        suggestedSymbol = checker.getSuggestedSymbolForNonexistentSymbol(node, name, convertSemanticMeaningToSymbolFlags(meaning));
    }
    return suggestedSymbol === undefined ? undefined : { node, suggestedSymbol };
}
function doChange(changes, sourceFile, node, suggestedSymbol, target) {
    const suggestion = symbolName(suggestedSymbol);
    if (!isIdentifierText(suggestion, target) && isPropertyAccessExpression(node.parent)) {
        const valDecl = suggestedSymbol.valueDeclaration;
        if (valDecl && isNamedDeclaration(valDecl) && isPrivateIdentifier(valDecl.name)) {
            changes.replaceNode(sourceFile, node, factory.createIdentifier(suggestion));
        }
        else {
            changes.replaceNode(sourceFile, node.parent, factory.createElementAccessExpression(node.parent.expression, factory.createStringLiteral(suggestion)));
        }
    }
    else {
        changes.replaceNode(sourceFile, node, factory.createIdentifier(suggestion));
    }
}
function convertSemanticMeaningToSymbolFlags(meaning) {
    let flags = 0;
    if (meaning & SemanticMeaning.Namespace) {
        flags |= SymbolFlags.Namespace;
    }
    if (meaning & SemanticMeaning.Type) {
        flags |= SymbolFlags.Type;
    }
    if (meaning & SemanticMeaning.Value) {
        flags |= SymbolFlags.Value;
    }
    return flags;
}
function getResolvedSourceFileFromImportDeclaration(context, importDeclaration, importingFile) {
    var _a;
    if (!importDeclaration || !isStringLiteralLike(importDeclaration.moduleSpecifier))
        return undefined;
    const resolvedModule = (_a = context.program.getResolvedModuleFromModuleSpecifier(importDeclaration.moduleSpecifier, importingFile)) === null || _a === void 0 ? void 0 : _a.resolvedModule;
    if (!resolvedModule)
        return undefined;
    return context.program.getSourceFile(resolvedModule.resolvedFileName);
}
