import {
  getOrCreateEmitNode,
  isAssignmentExpression,
  isClassDeclaration,
  isClassStaticBlockDeclaration,
  isExpressionStatement,
  isIdentifier,
  setSourceMapRange,
  setTextRange,
  some,
  SyntaxKind,
} from "../namespaces/ts.js";

/**
 * Creates a class `static {}` block used to assign the static `this` to a `_classThis` (or similar) variable.
 *
 * @param classThis The identifier to use for the captured static `this` reference, usually with the name `_classThis`.
 * @param thisExpression Overrides the expression to use for the actual `this` reference. This can be used to provide an
 * expression that has already had its `EmitFlags` set or may have been tracked to prevent substitution.
 */
function createClassThisAssignmentBlock(factory, classThis, thisExpression = factory.createThis()) {
    // produces:
    //
    //  static { _classThis = this; }
    //
    const expression = factory.createAssignment(classThis, thisExpression);
    const statement = factory.createExpressionStatement(expression);
    const body = factory.createBlock([statement], /*multiLine*/ false);
    const block = factory.createClassStaticBlockDeclaration(body);
    // We use `emitNode.classThis` to indicate this is a `_classThis` assignment helper block
    // and to stash the variable used for `_classThis`.
    getOrCreateEmitNode(block).classThis = classThis;
    return block;
}
/**
 * Gets whether a node is a `static {}` block containing only a single assignment of the static `this` to the `_classThis`
 * (or similar) variable stored in the `classthis` property of the block's `EmitNode`.
 * @internal
 */
export function isClassThisAssignmentBlock(node) {
    var _a;
    if (!isClassStaticBlockDeclaration(node) || node.body.statements.length !== 1) {
        return false;
    }
    const statement = node.body.statements[0];
    return isExpressionStatement(statement) &&
        isAssignmentExpression(statement.expression, /*excludeCompoundAssignment*/ true) &&
        isIdentifier(statement.expression.left) &&
        ((_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.classThis) === statement.expression.left &&
        statement.expression.right.kind === SyntaxKind.ThisKeyword;
}
/**
 * Gets whether a `ClassLikeDeclaration` has a `static {}` block containing only a single assignment to a
 * `_classThis` (or similar) variable.
 * @internal
 */
export function classHasClassThisAssignment(node) {
    var _a;
    return !!((_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.classThis) && some(node.members, isClassThisAssignmentBlock);
}

export function injectClassThisAssignmentIfMissing(factory, node, classThis, thisExpression) {
    // given:
    //
    //  class C {
    //  }
    //
    // produces:
    //
    //  class C {
    //      static { _classThis = this; }
    //  }
    if (classHasClassThisAssignment(node)) {
        return node;
    }
    const staticBlock = createClassThisAssignmentBlock(factory, classThis, thisExpression);
    if (node.name) {
        setSourceMapRange(staticBlock.body.statements[0], node.name);
    }
    const members = factory.createNodeArray([staticBlock, ...node.members]);
    setTextRange(members, node.members);
    const updatedNode = isClassDeclaration(node) ?
        factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, members) :
        factory.updateClassExpression(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, members);
    getOrCreateEmitNode(updatedNode).classThis = classThis;
    return updatedNode;
}
