import {
  chainBundle,
  isElementAccessExpression,
  isExpression,
  isPropertyAccessExpression,
  setTextRange,
  SyntaxKind,
  TransformFlags,
  visitEachChild,
  visitNode,
} from "../namespaces/ts.js";


/** @internal */
export function transformES2016(context) {
    const { factory, hoistVariableDeclaration, } = context;
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        return visitEachChild(node, visitor, context);
    }
    function visitor(node) {
        if ((node.transformFlags & TransformFlags.ContainsES2016) === 0) {
            return node;
        }
        switch (node.kind) {
            case SyntaxKind.BinaryExpression:
                return visitBinaryExpression(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    function visitBinaryExpression(node) {
        switch (node.operatorToken.kind) {
            case SyntaxKind.AsteriskAsteriskEqualsToken:
                return visitExponentiationAssignmentExpression(node);
            case SyntaxKind.AsteriskAsteriskToken:
                return visitExponentiationExpression(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    function visitExponentiationAssignmentExpression(node) {
        let target;
        let value;
        const left = visitNode(node.left, visitor, isExpression);
        const right = visitNode(node.right, visitor, isExpression);
        if (isElementAccessExpression(left)) {
            // Transforms `a[x] **= b` into `(_a = a)[_x = x] = Math.pow(_a[_x], b)`
            const expressionTemp = factory.createTempVariable(hoistVariableDeclaration);
            const argumentExpressionTemp = factory.createTempVariable(hoistVariableDeclaration);
            target = setTextRange(factory.createElementAccessExpression(setTextRange(factory.createAssignment(expressionTemp, left.expression), left.expression), setTextRange(factory.createAssignment(argumentExpressionTemp, left.argumentExpression), left.argumentExpression)), left);
            value = setTextRange(factory.createElementAccessExpression(expressionTemp, argumentExpressionTemp), left);
        }
        else if (isPropertyAccessExpression(left)) {
            // Transforms `a.x **= b` into `(_a = a).x = Math.pow(_a.x, b)`
            const expressionTemp = factory.createTempVariable(hoistVariableDeclaration);
            target = setTextRange(factory.createPropertyAccessExpression(setTextRange(factory.createAssignment(expressionTemp, left.expression), left.expression), left.name), left);
            value = setTextRange(factory.createPropertyAccessExpression(expressionTemp, left.name), left);
        }
        else {
            // Transforms `a **= b` into `a = Math.pow(a, b)`
            target = left;
            value = left;
        }
        return setTextRange(factory.createAssignment(target, setTextRange(factory.createGlobalMethodCall("Math", "pow", [value, right]), node)), node);
    }
    function visitExponentiationExpression(node) {
        // Transforms `a ** b` into `Math.pow(a, b)`
        const left = visitNode(node.left, visitor, isExpression);
        const right = visitNode(node.right, visitor, isExpression);
        return setTextRange(factory.createGlobalMethodCall("Math", "pow", [left, right]), node);
    }
}
