import {
  append,
  appendIfUnique,
  Debug,
  EmitFlags,
  getParseTreeNode,
  getSourceFileOfNode,
  InternalEmitFlags,
  isParseTreeNode,
  orderedRemoveItem,
  some,
  SyntaxKind,
} from "../namespaces/ts.js";

/**
 * Associates a node with the current transformation, initializing
 * various transient transformation properties.
 * @internal
 */
export function getOrCreateEmitNode(node) {
    var _a;
    if (!node.emitNode) {
        if (isParseTreeNode(node)) {
            // To avoid holding onto transformation artifacts, we keep track of any
            // parse tree node we are annotating. This allows us to clean them up after
            // all transformations have completed.
            if (node.kind === SyntaxKind.SourceFile) {
                return node.emitNode = { annotatedNodes: [node] };
            }
            const sourceFile = (_a = getSourceFileOfNode(getParseTreeNode(getSourceFileOfNode(node)))) !== null && _a !== void 0 ? _a : Debug.fail("Could not determine parsed source file.");
            getOrCreateEmitNode(sourceFile).annotatedNodes.push(node);
        }
        node.emitNode = {};
    }
    else {
        Debug.assert(!(node.emitNode.internalFlags & InternalEmitFlags.Immutable), "Invalid attempt to mutate an immutable node.");
    }
    return node.emitNode;
}
/**
 * Clears any `EmitNode` entries from parse-tree nodes.
 * @param sourceFile A source file.
 */
export function disposeEmitNodes(sourceFile) {
    var _a, _b;
    // During transformation we may need to annotate a parse tree node with transient
    // transformation properties. As parse tree nodes live longer than transformation
    // nodes, we need to make sure we reclaim any memory allocated for custom ranges
    // from these nodes to ensure we do not hold onto entire subtrees just for position
    // information. We also need to reset these nodes to a pre-transformation state
    // for incremental parsing scenarios so that we do not impact later emit.
    const annotatedNodes = (_b = (_a = getSourceFileOfNode(getParseTreeNode(sourceFile))) === null || _a === void 0 ? void 0 : _a.emitNode) === null || _b === void 0 ? void 0 : _b.annotatedNodes;
    if (annotatedNodes) {
        for (const node of annotatedNodes) {
            node.emitNode = undefined;
        }
    }
}
/**
 * Sets `EmitFlags.NoComments` on a node and removes any leading and trailing synthetic comments.
 * @internal
 */
export function removeAllComments(node) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags |= EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return node;
}
/**
 * Sets flags that control emit behavior of a node.
 */
export function setEmitFlags(node, emitFlags) {
    getOrCreateEmitNode(node).flags = emitFlags;
    return node;
}
/**
 * Sets flags that control emit behavior of a node.
 *
 * @internal
 */
export function addEmitFlags(node, emitFlags) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags = emitNode.flags | emitFlags;
    return node;
}
/**
 * Sets flags that control emit behavior of a node.
 *
 * @internal
 */
export function setInternalEmitFlags(node, emitFlags) {
    getOrCreateEmitNode(node).internalFlags = emitFlags;
    return node;
}
/**
 * Sets flags that control emit behavior of a node.
 *
 * @internal
 */
export function addInternalEmitFlags(node, emitFlags) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.internalFlags = emitNode.internalFlags | emitFlags;
    return node;
}
/**
 * Gets a custom text range to use when emitting source maps.
 */
export function getSourceMapRange(node) {
    var _a, _b;
    return (_b = (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.sourceMapRange) !== null && _b !== void 0 ? _b : node;
}
/**
 * Sets a custom text range to use when emitting source maps.
 */
export function setSourceMapRange(node, range) {
    getOrCreateEmitNode(node).sourceMapRange = range;
    return node;
}
/**
 * Gets the TextRange to use for source maps for a token of a node.
 */
export function getTokenSourceMapRange(node, token) {
    var _a, _b;
    return (_b = (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.tokenSourceMapRanges) === null || _b === void 0 ? void 0 : _b[token];
}
/**
 * Sets the TextRange to use for source maps for a token of a node.
 */
export function setTokenSourceMapRange(node, token, range) {
    var _a;
    const emitNode = getOrCreateEmitNode(node);
    const tokenSourceMapRanges = (_a = emitNode.tokenSourceMapRanges) !== null && _a !== void 0 ? _a : (emitNode.tokenSourceMapRanges = []);
    tokenSourceMapRanges[token] = range;
    return node;
}
/**
 * Gets a custom text range to use when emitting comments.
 *
 * @internal
 */
export function getStartsOnNewLine(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.startsOnNewLine;
}
/**
 * Sets a custom text range to use when emitting comments.
 *
 * @internal
 */
export function setStartsOnNewLine(node, newLine) {
    getOrCreateEmitNode(node).startsOnNewLine = newLine;
    return node;
}
/**
 * Gets a custom text range to use when emitting comments.
 */
export function getCommentRange(node) {
    var _a, _b;
    return (_b = (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.commentRange) !== null && _b !== void 0 ? _b : node;
}
/**
 * Sets a custom text range to use when emitting comments.
 */
export function setCommentRange(node, range) {
    getOrCreateEmitNode(node).commentRange = range;
    return node;
}
export function getSyntheticLeadingComments(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.leadingComments;
}
export function setSyntheticLeadingComments(node, comments) {
    getOrCreateEmitNode(node).leadingComments = comments;
    return node;
}
export function addSyntheticLeadingComment(node, kind, text, hasTrailingNewLine) {
    return setSyntheticLeadingComments(node, append(getSyntheticLeadingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text }));
}
export function getSyntheticTrailingComments(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.trailingComments;
}
export function setSyntheticTrailingComments(node, comments) {
    getOrCreateEmitNode(node).trailingComments = comments;
    return node;
}
export function addSyntheticTrailingComment(node, kind, text, hasTrailingNewLine) {
    return setSyntheticTrailingComments(node, append(getSyntheticTrailingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text }));
}
export function moveSyntheticComments(node, original) {
    setSyntheticLeadingComments(node, getSyntheticLeadingComments(original));
    setSyntheticTrailingComments(node, getSyntheticTrailingComments(original));
    const emit = getOrCreateEmitNode(original);
    emit.leadingComments = undefined;
    emit.trailingComments = undefined;
    return node;
}
/**
 * Gets the constant value to emit for an expression representing an enum.
 */
export function getConstantValue(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.constantValue;
}
/**
 * Sets the constant value to emit for an expression.
 */
export function setConstantValue(node, value) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.constantValue = value;
    return node;
}
/**
 * Adds an EmitHelper to a node.
 */
export function addEmitHelper(node, helper) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.helpers = append(emitNode.helpers, helper);
    return node;
}
/**
 * Add EmitHelpers to a node.
 */
export function addEmitHelpers(node, helpers) {
    if (some(helpers)) {
        const emitNode = getOrCreateEmitNode(node);
        for (const helper of helpers) {
            emitNode.helpers = appendIfUnique(emitNode.helpers, helper);
        }
    }
    return node;
}
/**
 * Removes an EmitHelper from a node.
 */
export function removeEmitHelper(node, helper) {
    var _a;
    const helpers = (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.helpers;
    if (helpers) {
        return orderedRemoveItem(helpers, helper);
    }
    return false;
}
/**
 * Gets the EmitHelpers of a node.
 */
export function getEmitHelpers(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.helpers;
}
/**
 * Moves matching emit helpers from a source node to a target node.
 */
export function moveEmitHelpers(source, target, predicate) {
    const sourceEmitNode = source.emitNode;
    const sourceEmitHelpers = sourceEmitNode && sourceEmitNode.helpers;
    if (!some(sourceEmitHelpers))
        return;
    const targetEmitNode = getOrCreateEmitNode(target);
    let helpersRemoved = 0;
    for (let i = 0; i < sourceEmitHelpers.length; i++) {
        const helper = sourceEmitHelpers[i];
        if (predicate(helper)) {
            helpersRemoved++;
            targetEmitNode.helpers = appendIfUnique(targetEmitNode.helpers, helper);
        }
        else if (helpersRemoved > 0) {
            sourceEmitHelpers[i - helpersRemoved] = helper;
        }
    }
    if (helpersRemoved > 0) {
        sourceEmitHelpers.length -= helpersRemoved;
    }
}
/**
 * Gets the SnippetElement of a node.
 *
 * @internal
 */
export function getSnippetElement(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.snippetElement;
}
/**
 * Sets the SnippetElement of a node.
 *
 * @internal
 */
export function setSnippetElement(node, snippet) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.snippetElement = snippet;
    return node;
}
/** @internal */
export function ignoreSourceNewlines(node) {
    getOrCreateEmitNode(node).internalFlags |= InternalEmitFlags.IgnoreSourceNewlines;
    return node;
}
/** @internal */
export function setTypeNode(node, type) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.typeNode = type;
    return node;
}
/** @internal */
export function getTypeNode(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.typeNode;
}
/** @internal */
export function setIdentifierTypeArguments(node, typeArguments) {
    getOrCreateEmitNode(node).identifierTypeArguments = typeArguments;
    return node;
}
/** @internal */
export function getIdentifierTypeArguments(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.identifierTypeArguments;
}
/** @internal */
export function setIdentifierAutoGenerate(node, autoGenerate) {
    getOrCreateEmitNode(node).autoGenerate = autoGenerate;
    return node;
}
/** @internal @knipignore */
export function getIdentifierAutoGenerate(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.autoGenerate;
}
/** @internal */
export function setIdentifierGeneratedImportReference(node, value) {
    getOrCreateEmitNode(node).generatedImportReference = value;
    return node;
}
/** @internal */
export function getIdentifierGeneratedImportReference(node) {
    var _a;
    return (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.generatedImportReference;
}
