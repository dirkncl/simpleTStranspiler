import {
  cast,
  Debug,
  getModifiers,
  getStartsOnNewLine,
  isArrayBindingPattern,
  isArrayLiteralExpression,
  isBindingElement,
  isBindingPattern,
  isBlock,
  isDefaultModifier,
  isExportModifier,
  isExpression,
  isIdentifier,
  isObjectBindingPattern,
  isObjectLiteralElementLike,
  isObjectLiteralExpression,
  map,
  notImplemented,
  setOriginalNode,
  setStartsOnNewLine,
  setTextRange,
  SyntaxKind,
} from "../namespaces/ts.js";

/** @internal */
export function createNodeConverters(factory) {
    return {
        convertToFunctionBlock,
        convertToFunctionExpression,
        convertToClassExpression,
        convertToArrayAssignmentElement,
        convertToObjectAssignmentElement,
        convertToAssignmentPattern,
        convertToObjectAssignmentPattern,
        convertToArrayAssignmentPattern,
        convertToAssignmentElementTarget,
    };
    function convertToFunctionBlock(node, multiLine) {
        if (isBlock(node))
            return node;
        const returnStatement = factory.createReturnStatement(node);
        setTextRange(returnStatement, node);
        const body = factory.createBlock([returnStatement], multiLine);
        setTextRange(body, node);
        return body;
    }
    function convertToFunctionExpression(node) {
        var _a;
        if (!node.body)
            return Debug.fail(`Cannot convert a FunctionDeclaration without a body`);
        const updated = factory.createFunctionExpression((_a = getModifiers(node)) === null || _a === void 0 ? void 0 : _a.filter(modifier => !isExportModifier(modifier) && !isDefaultModifier(modifier)), node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body);
        setOriginalNode(updated, node);
        setTextRange(updated, node);
        if (getStartsOnNewLine(node)) {
            setStartsOnNewLine(updated, /*newLine*/ true);
        }
        return updated;
    }
    function convertToClassExpression(node) {
        var _a;
        const updated = factory.createClassExpression((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.filter(modifier => !isExportModifier(modifier) && !isDefaultModifier(modifier)), node.name, node.typeParameters, node.heritageClauses, node.members);
        setOriginalNode(updated, node);
        setTextRange(updated, node);
        if (getStartsOnNewLine(node)) {
            setStartsOnNewLine(updated, /*newLine*/ true);
        }
        return updated;
    }
    function convertToArrayAssignmentElement(element) {
        if (isBindingElement(element)) {
            if (element.dotDotDotToken) {
                Debug.assertNode(element.name, isIdentifier);
                return setOriginalNode(setTextRange(factory.createSpreadElement(element.name), element), element);
            }
            const expression = convertToAssignmentElementTarget(element.name);
            return element.initializer
                ? setOriginalNode(setTextRange(factory.createAssignment(expression, element.initializer), element), element)
                : expression;
        }
        return cast(element, isExpression);
    }
    function convertToObjectAssignmentElement(element) {
        if (isBindingElement(element)) {
            if (element.dotDotDotToken) {
                Debug.assertNode(element.name, isIdentifier);
                return setOriginalNode(setTextRange(factory.createSpreadAssignment(element.name), element), element);
            }
            if (element.propertyName) {
                const expression = convertToAssignmentElementTarget(element.name);
                return setOriginalNode(setTextRange(factory.createPropertyAssignment(element.propertyName, element.initializer ? factory.createAssignment(expression, element.initializer) : expression), element), element);
            }
            Debug.assertNode(element.name, isIdentifier);
            return setOriginalNode(setTextRange(factory.createShorthandPropertyAssignment(element.name, element.initializer), element), element);
        }
        return cast(element, isObjectLiteralElementLike);
    }
    function convertToAssignmentPattern(node) {
        switch (node.kind) {
            case SyntaxKind.ArrayBindingPattern:
            case SyntaxKind.ArrayLiteralExpression:
                return convertToArrayAssignmentPattern(node);
            case SyntaxKind.ObjectBindingPattern:
            case SyntaxKind.ObjectLiteralExpression:
                return convertToObjectAssignmentPattern(node);
        }
    }
    function convertToObjectAssignmentPattern(node) {
        if (isObjectBindingPattern(node)) {
            return setOriginalNode(setTextRange(factory.createObjectLiteralExpression(map(node.elements, convertToObjectAssignmentElement)), node), node);
        }
        return cast(node, isObjectLiteralExpression);
    }
    function convertToArrayAssignmentPattern(node) {
        if (isArrayBindingPattern(node)) {
            return setOriginalNode(setTextRange(factory.createArrayLiteralExpression(map(node.elements, convertToArrayAssignmentElement)), node), node);
        }
        return cast(node, isArrayLiteralExpression);
    }
    function convertToAssignmentElementTarget(node) {
        if (isBindingPattern(node)) {
            return convertToAssignmentPattern(node);
        }
        return cast(node, isExpression);
    }
}
/** @internal */
export const nullNodeConverters = {
    convertToFunctionBlock: notImplemented,
    convertToFunctionExpression: notImplemented,
    convertToClassExpression: notImplemented,
    convertToArrayAssignmentElement: notImplemented,
    convertToObjectAssignmentElement: notImplemented,
    convertToAssignmentPattern: notImplemented,
    convertToObjectAssignmentPattern: notImplemented,
    convertToArrayAssignmentPattern: notImplemented,
    convertToAssignmentElementTarget: notImplemented,
};
