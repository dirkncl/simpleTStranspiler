import {
  Debug,
  emptyArray,
  isNodeKind,
  SyntaxKind,
} from "../namespaces/ts.js";


const sourceFileToNodeChildren = new WeakMap();

/** @internal */
export function getNodeChildren(node, sourceFile) {
    var _a;
    const kind = node.kind;
    if (!isNodeKind(kind)) {
        return emptyArray;
    }
    if (kind === SyntaxKind.SyntaxList) {
        return node._children;
    }
    return (_a = sourceFileToNodeChildren.get(sourceFile)) === null || _a === void 0 ? void 0 : _a.get(node);
}

/** @internal */
export function setNodeChildren(node, sourceFile, children) {
    if (node.kind === SyntaxKind.SyntaxList) {
        // SyntaxList children are always eagerly created in the process of
        // creating their parent's `children` list. We shouldn't need to set them here.
        Debug.fail("Should not need to re-set the children of a SyntaxList.");
    }
    let map = sourceFileToNodeChildren.get(sourceFile);
    if (map === undefined) {
        map = new WeakMap();
        sourceFileToNodeChildren.set(sourceFile, map);
    }
    map.set(node, children);
    return children;
}
/** @internal */
export function unsetNodeChildren(node, origSourceFile) {
    var _a;
    if (node.kind === SyntaxKind.SyntaxList) {
        // Syntax lists are synthesized and we store their children directly on them.
        // They are a special case where we expect incremental parsing to toss them away entirely
        // if a change intersects with their containing parents.
        Debug.fail("Did not expect to unset the children of a SyntaxList.");
    }
    (_a = sourceFileToNodeChildren.get(origSourceFile)) === null || _a === void 0 ? void 0 : _a.delete(node);
}
/** @internal */
export function transferSourceFileChildren(sourceFile, targetSourceFile) {
    const map = sourceFileToNodeChildren.get(sourceFile);
    if (map !== undefined) {
        sourceFileToNodeChildren.delete(sourceFile);
        sourceFileToNodeChildren.set(targetSourceFile, map);
    }
}
