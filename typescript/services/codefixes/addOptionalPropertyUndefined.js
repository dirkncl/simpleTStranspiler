import {
  createCodeFixActionWithoutFixAll,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  Diagnostics,
  emptyArray,
  factory,
  getFixableErrorSpanExpression,
  getSourceFileOfNode,
  isBinaryExpression,
  isCallExpression,
  isExpression,
  isFunctionLikeKind,
  isIdentifier,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isPropertySignature,
  isShorthandPropertyAssignment,
  isVariableDeclaration,
  SyntaxKind,
  textChanges,
} from "../namespaces/ts.js";


const addOptionalPropertyUndefined = "addOptionalPropertyUndefined";

const errorCodes = [
    Diagnostics.Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_type_of_the_target.code,
    Diagnostics.Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties.code,
    Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties.code,
];

registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const typeChecker = context.program.getTypeChecker();
        const toAdd = getPropertiesToAdd(context.sourceFile, context.span, typeChecker);
        if (!toAdd.length) {
            return undefined;
        }
        const changes = textChanges.ChangeTracker.with(context, t => addUndefinedToOptionalProperty(t, toAdd));
        return [createCodeFixActionWithoutFixAll(addOptionalPropertyUndefined, changes, Diagnostics.Add_undefined_to_optional_property_type)];
    },
    fixIds: [addOptionalPropertyUndefined],
});
function getPropertiesToAdd(file, span, checker) {
    var _a, _b;
    const sourceTarget = getSourceTarget(getFixableErrorSpanExpression(file, span), checker);
    if (!sourceTarget) {
        return emptyArray;
    }
    const { source: sourceNode, target: targetNode } = sourceTarget;
    const target = shouldUseParentTypeOfProperty(sourceNode, targetNode, checker)
        ? checker.getTypeAtLocation(targetNode.expression)
        : checker.getTypeAtLocation(targetNode);
    if ((_b = (_a = target.symbol) === null || _a === void 0 ? void 0 : _a.declarations) === null || _b === void 0 ? void 0 : _b.some(d => getSourceFileOfNode(d).fileName.match(/\.d\.ts$/))) {
        return emptyArray;
    }
    return checker.getExactOptionalProperties(target);
}
function shouldUseParentTypeOfProperty(sourceNode, targetNode, checker) {
    return isPropertyAccessExpression(targetNode)
        && !!checker.getExactOptionalProperties(checker.getTypeAtLocation(targetNode.expression)).length
        && checker.getTypeAtLocation(sourceNode) === checker.getUndefinedType();
}
/**
 * Find the source and target of the incorrect assignment.
 * The call is recursive for property assignments.
 */
function getSourceTarget(errorNode, checker) {
    var _a;
    if (!errorNode) {
        return undefined;
    }
    else if (isBinaryExpression(errorNode.parent) && errorNode.parent.operatorToken.kind === SyntaxKind.EqualsToken) {
        return { source: errorNode.parent.right, target: errorNode.parent.left };
    }
    else if (isVariableDeclaration(errorNode.parent) && errorNode.parent.initializer) {
        return { source: errorNode.parent.initializer, target: errorNode.parent.name };
    }
    else if (isCallExpression(errorNode.parent)) {
        const n = checker.getSymbolAtLocation(errorNode.parent.expression);
        if (!(n === null || n === void 0 ? void 0 : n.valueDeclaration) || !isFunctionLikeKind(n.valueDeclaration.kind))
            return undefined;
        if (!isExpression(errorNode))
            return undefined;
        const i = errorNode.parent.arguments.indexOf(errorNode);
        if (i === -1)
            return undefined;
        const name = n.valueDeclaration.parameters[i].name;
        if (isIdentifier(name))
            return { source: errorNode, target: name };
    }
    else if (isPropertyAssignment(errorNode.parent) && isIdentifier(errorNode.parent.name) ||
        isShorthandPropertyAssignment(errorNode.parent)) {
        const parentTarget = getSourceTarget(errorNode.parent.parent, checker);
        if (!parentTarget)
            return undefined;
        const prop = checker.getPropertyOfType(checker.getTypeAtLocation(parentTarget.target), errorNode.parent.name.text);
        const declaration = (_a = prop === null || prop === void 0 ? void 0 : prop.declarations) === null || _a === void 0 ? void 0 : _a[0];
        if (!declaration)
            return undefined;
        return {
            source: isPropertyAssignment(errorNode.parent) ? errorNode.parent.initializer : errorNode.parent.name,
            target: declaration,
        };
    }
    return undefined;
}
function addUndefinedToOptionalProperty(changes, toAdd) {
    for (const add of toAdd) {
        const d = add.valueDeclaration;
        if (d && (isPropertySignature(d) || isPropertyDeclaration(d)) && d.type) {
            const t = factory.createUnionTypeNode([
                ...d.type.kind === SyntaxKind.UnionType ? d.type.types : [d.type],
                factory.createTypeReferenceNode("undefined"),
            ]);
            changes.replaceNode(d.getSourceFile(), d.type, t);
        }
    }
}
