import { objectAllocator, } from "../namespaces/ts.js";

/**
 * Creates a `BaseNodeFactory` which can be used to create `Node` instances from the constructors provided by the object allocator.
 *
 * @internal
 */
export function createBaseNodeFactory() {
    let NodeConstructor;
    let TokenConstructor;
    let IdentifierConstructor;
    let PrivateIdentifierConstructor;
    let SourceFileConstructor;
    return {
        createBaseSourceFileNode,
        createBaseIdentifierNode,
        createBasePrivateIdentifierNode,
        createBaseTokenNode,
        createBaseNode,
    };
    function createBaseSourceFileNode(kind) {
        return new (SourceFileConstructor || (SourceFileConstructor = objectAllocator.getSourceFileConstructor()))(kind, /*pos*/ -1, /*end*/ -1);
    }
    function createBaseIdentifierNode(kind) {
        return new (IdentifierConstructor || (IdentifierConstructor = objectAllocator.getIdentifierConstructor()))(kind, /*pos*/ -1, /*end*/ -1);
    }
    function createBasePrivateIdentifierNode(kind) {
        return new (PrivateIdentifierConstructor || (PrivateIdentifierConstructor = objectAllocator.getPrivateIdentifierConstructor()))(kind, /*pos*/ -1, /*end*/ -1);
    }
    function createBaseTokenNode(kind) {
        return new (TokenConstructor || (TokenConstructor = objectAllocator.getTokenConstructor()))(kind, /*pos*/ -1, /*end*/ -1);
    }
    function createBaseNode(kind) {
        return new (NodeConstructor || (NodeConstructor = objectAllocator.getNodeConstructor()))(kind, /*pos*/ -1, /*end*/ -1);
    }
}
