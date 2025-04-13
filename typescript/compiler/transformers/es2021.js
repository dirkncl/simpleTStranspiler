import {
  chainBundle,
  getNonAssignmentOperatorForCompoundAssignment,
  isAccessExpression,
  isExpression,
  isLeftHandSideExpression,
  isLogicalOrCoalescingAssignmentExpression,
  isPropertyAccessExpression,
  isSimpleCopiableExpression,
  skipParentheses,
  TransformFlags,
  visitEachChild,
  visitNode,
} from "../_namespaces/ts.js";


/** @internal */
export function transformES2021(context) {
    const { hoistVariableDeclaration, factory, } = context;
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        return visitEachChild(node, visitor, context);
    }
    function visitor(node) {
        if ((node.transformFlags & TransformFlags.ContainsES2021) === 0) {
            return node;
        }
        if (isLogicalOrCoalescingAssignmentExpression(node)) {
            return transformLogicalAssignment(node);
        }
        return visitEachChild(node, visitor, context);
    }
    function transformLogicalAssignment(binaryExpression) {
        const operator = binaryExpression.operatorToken;
        const nonAssignmentOperator = getNonAssignmentOperatorForCompoundAssignment(operator.kind);
        let left = skipParentheses(visitNode(binaryExpression.left, visitor, isLeftHandSideExpression));
        let assignmentTarget = left;
        const right = skipParentheses(visitNode(binaryExpression.right, visitor, isExpression));
        if (isAccessExpression(left)) {
            const propertyAccessTargetSimpleCopiable = isSimpleCopiableExpression(left.expression);
            const propertyAccessTarget = propertyAccessTargetSimpleCopiable ? left.expression :
                factory.createTempVariable(hoistVariableDeclaration);
            const propertyAccessTargetAssignment = propertyAccessTargetSimpleCopiable ? left.expression : factory.createAssignment(propertyAccessTarget, left.expression);
            if (isPropertyAccessExpression(left)) {
                assignmentTarget = factory.createPropertyAccessExpression(propertyAccessTarget, left.name);
                left = factory.createPropertyAccessExpression(propertyAccessTargetAssignment, left.name);
            }
            else {
                const elementAccessArgumentSimpleCopiable = isSimpleCopiableExpression(left.argumentExpression);
                const elementAccessArgument = elementAccessArgumentSimpleCopiable ? left.argumentExpression :
                    factory.createTempVariable(hoistVariableDeclaration);
                assignmentTarget = factory.createElementAccessExpression(propertyAccessTarget, elementAccessArgument);
                left = factory.createElementAccessExpression(propertyAccessTargetAssignment, elementAccessArgumentSimpleCopiable ? left.argumentExpression : factory.createAssignment(elementAccessArgument, left.argumentExpression));
            }
        }
        return factory.createBinaryExpression(left, nonAssignmentOperator, factory.createParenthesizedExpression(factory.createAssignment(assignmentTarget, right)));
    }
}
