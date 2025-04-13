import {
  chainBundle,
  isBlock,
  SyntaxKind,
  TransformFlags,
  visitEachChild,
  visitNode,
} from "../namespaces/ts.js";


/** @internal */
export function transformES2019(context) {
    const factory = context.factory;
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        return visitEachChild(node, visitor, context);
    }
    function visitor(node) {
        if ((node.transformFlags & TransformFlags.ContainsES2019) === 0) {
            return node;
        }
        switch (node.kind) {
            case SyntaxKind.CatchClause:
                return visitCatchClause(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    function visitCatchClause(node) {
        if (!node.variableDeclaration) {
            return factory.updateCatchClause(node, factory.createVariableDeclaration(factory.createTempVariable(/*recordTempVariable*/ undefined)), visitNode(node.block, visitor, isBlock));
        }
        return visitEachChild(node, visitor, context);
    }
}
