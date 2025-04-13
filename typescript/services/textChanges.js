import {
  CharacterCodes,
  concatenate,
  contains,
  createMultiMap,
  createNodeFactory,
  createPrinter,
  createRange,
  createSourceFile,
  createTextChange,
  createTextRangeFromSpan,
  createTextSpan,
  createTextSpanFromRange,
  createTextWriter,
  Debug,
  EmitHint,
  endsWith,
  factory,
  filter,
  find,
  findChildOfKind,
  findLastIndex,
  findNextToken,
  findPrecedingToken,
  first,
  firstOrUndefined,
  flatMap,
  flatMapToMutable,
  formatting,
  getAncestor,
  getFirstNonSpaceCharacterPosition,
  getFormatCodeSettingsForWriting,
  getJSDocCommentRanges,
  getLeadingCommentRanges,
  getLineAndCharacterOfPosition,
  getLineOfLocalPosition,
  getLineStartPositionForPosition,
  getNewLineKind,
  getNewLineOrDefaultFromHost,
  getNodeId,
  getOriginalNode,
  getPrecedingNonSpaceCharacterPosition,
  getScriptKindFromFileName,
  getShebang,
  getSourceFileOfNode,
  getStartPositionOfLine,
  getTokenAtPosition,
  getTouchingToken,
  getTrailingCommentRanges,
  group,
  hasJSDocNodes,
  indexOfNode,
  intersperse,
  isAnyImportSyntax,
  isArray,
  isArrowFunction,
  isCallExpression,
  isClassElement,
  isClassOrTypeElement,
  isExpressionStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isFunctionLike,
  isIdentifier,
  isImportClause,
  isImportDeclaration,
  isImportSpecifier,
  isInComment,
  isInJSXText,
  isInString,
  isInTemplateString,
  isInterfaceDeclaration,
  isJsonSourceFile,
  isLineBreak,
  isNamedImports,
  isObjectLiteralExpression,
  isParameter,
  isPinnedComment,
  isPrologueDirective,
  isPropertyDeclaration,
  isPropertySignature,
  isRecognizedTripleSlashComment,
  isStatement,
  isStatementButNotDeclaration,
  isString,
  isStringLiteral,
  isSuperCall,
  isVariableDeclaration,
  isWhiteSpaceLike,
  isWhiteSpaceSingleLine,
  JSDocParsingMode,
  last,
  lastOrUndefined,
  length,
  mapDefined,
  NodeFactoryFlags,
  nodeIsSynthesized,
  nullTransformationContext,
  positionsAreOnSameLine,
  rangeContainsPosition,
  rangeContainsRangeExclusive,
  rangeOfNode,
  rangeOfTypeParameters,
  rangeStartPositionsAreOnSameLine,
  removeSuffix,
  ScriptTarget,
  setTextRangePosEnd,
  singleOrUndefined,
  skipTrivia,
  stringContainsAt,
  SyntaxKind,
  textSpanEnd,
  tokenToString,
  toSorted,
  visitEachChild,
  visitNodes,
} from "./namespaces/ts.js";

/**
 * Currently for simplicity we store recovered positions on the node itself.
 * It can be changed to side-table later if we decide that current design is too invasive.
 */
function getPos(n) {
    const result = n.__pos;
    Debug.assert(typeof result === "number");
    return result;
}
function setPos(n, pos) {
    Debug.assert(typeof pos === "number");
    n.__pos = pos;
}
function getEnd(n) {
    const result = n.__end;
    Debug.assert(typeof result === "number");
    return result;
}
function setEnd(n, end) {
    Debug.assert(typeof end === "number");
    n.__end = end;
}
/** @internal */
export var LeadingTriviaOption;
(function (LeadingTriviaOption) {
    /** Exclude all leading trivia (use getStart()) */
    LeadingTriviaOption[LeadingTriviaOption["Exclude"] = 0] = "Exclude";
    /** Include leading trivia and,
     * if there are no line breaks between the node and the previous token,
     * include all trivia between the node and the previous token
     */
    LeadingTriviaOption[LeadingTriviaOption["IncludeAll"] = 1] = "IncludeAll";
    /**
     * Include attached JSDoc comments
     */
    LeadingTriviaOption[LeadingTriviaOption["JSDoc"] = 2] = "JSDoc";
    /**
     * Only delete trivia on the same line as getStart().
     * Used to avoid deleting leading comments
     */
    LeadingTriviaOption[LeadingTriviaOption["StartLine"] = 3] = "StartLine";
})(LeadingTriviaOption || (LeadingTriviaOption = {}));
/** @internal */
export var TrailingTriviaOption;
(function (TrailingTriviaOption) {
    /** Exclude all trailing trivia (use getEnd()) */
    TrailingTriviaOption[TrailingTriviaOption["Exclude"] = 0] = "Exclude";
    /** Doesn't include whitespace, but does strip comments */
    TrailingTriviaOption[TrailingTriviaOption["ExcludeWhitespace"] = 1] = "ExcludeWhitespace";
    /** Include trailing trivia */
    TrailingTriviaOption[TrailingTriviaOption["Include"] = 2] = "Include";
})(TrailingTriviaOption || (TrailingTriviaOption = {}));
function skipWhitespacesAndLineBreaks(text, start) {
    return skipTrivia(text, start, /*stopAfterLineBreak*/ false, /*stopAtComments*/ true);
}
function hasCommentsBeforeLineBreak(text, start) {
    let i = start;
    while (i < text.length) {
        const ch = text.charCodeAt(i);
        if (isWhiteSpaceSingleLine(ch)) {
            i++;
            continue;
        }
        return ch === CharacterCodes.slash;
    }
    return false;
}
const useNonAdjustedPositions = {
    leadingTriviaOption: LeadingTriviaOption.Exclude,
    trailingTriviaOption: TrailingTriviaOption.Exclude,
};
var ChangeKind;
(function (ChangeKind) {
    ChangeKind[ChangeKind["Remove"] = 0] = "Remove";
    ChangeKind[ChangeKind["ReplaceWithSingleNode"] = 1] = "ReplaceWithSingleNode";
    ChangeKind[ChangeKind["ReplaceWithMultipleNodes"] = 2] = "ReplaceWithMultipleNodes";
    ChangeKind[ChangeKind["Text"] = 3] = "Text";
})(ChangeKind || (ChangeKind = {}));
function getAdjustedRange(sourceFile, startNode, endNode, options) {
    return { pos: getAdjustedStartPosition(sourceFile, startNode, options), end: getAdjustedEndPosition(sourceFile, endNode, options) };
}
function getAdjustedStartPosition(sourceFile, node, options, hasTrailingComment = false) {
    var _a, _b;
    const { leadingTriviaOption } = options;
    if (leadingTriviaOption === LeadingTriviaOption.Exclude) {
        return node.getStart(sourceFile);
    }
    if (leadingTriviaOption === LeadingTriviaOption.StartLine) {
        const startPos = node.getStart(sourceFile);
        const pos = getLineStartPositionForPosition(startPos, sourceFile);
        return rangeContainsPosition(node, pos) ? pos : startPos;
    }
    if (leadingTriviaOption === LeadingTriviaOption.JSDoc) {
        const JSDocComments = getJSDocCommentRanges(node, sourceFile.text);
        if (JSDocComments === null || JSDocComments === void 0 ? void 0 : JSDocComments.length) {
            return getLineStartPositionForPosition(JSDocComments[0].pos, sourceFile);
        }
    }
    const fullStart = node.getFullStart();
    const start = node.getStart(sourceFile);
    if (fullStart === start) {
        return start;
    }
    const fullStartLine = getLineStartPositionForPosition(fullStart, sourceFile);
    const startLine = getLineStartPositionForPosition(start, sourceFile);
    if (startLine === fullStartLine) {
        // full start and start of the node are on the same line
        //   a,     b;
        //    ^     ^
        //    |   start
        // fullstart
        // when b is replaced - we usually want to keep the leading trvia
        // when b is deleted - we delete it
        return leadingTriviaOption === LeadingTriviaOption.IncludeAll ? fullStart : start;
    }
    // if node has a trailing comments, use comment end position as the text has already been included.
    if (hasTrailingComment) {
        // Check first for leading comments as if the node is the first import, we want to exclude the trivia;
        // otherwise we get the trailing comments.
        const comment = ((_a = getLeadingCommentRanges(sourceFile.text, fullStart)) === null || _a === void 0 ? void 0 : _a[0]) || ((_b = getTrailingCommentRanges(sourceFile.text, fullStart)) === null || _b === void 0 ? void 0 : _b[0]);
        if (comment) {
            return skipTrivia(sourceFile.text, comment.end, /*stopAfterLineBreak*/ true, /*stopAtComments*/ true);
        }
    }
    // get start position of the line following the line that contains fullstart position
    // (but only if the fullstart isn't the very beginning of the file)
    const nextLineStart = fullStart > 0 ? 1 : 0;
    let adjustedStartPosition = getStartPositionOfLine(getLineOfLocalPosition(sourceFile, fullStartLine) + nextLineStart, sourceFile);
    // skip whitespaces/newlines
    adjustedStartPosition = skipWhitespacesAndLineBreaks(sourceFile.text, adjustedStartPosition);
    return getStartPositionOfLine(getLineOfLocalPosition(sourceFile, adjustedStartPosition), sourceFile);
}
/** Return the end position of a multiline comment of it is on another line; otherwise returns `undefined`; */
function getEndPositionOfMultilineTrailingComment(sourceFile, node, options) {
    const { end } = node;
    const { trailingTriviaOption } = options;
    if (trailingTriviaOption === TrailingTriviaOption.Include) {
        // If the trailing comment is a multiline comment that extends to the next lines,
        // return the end of the comment and track it for the next nodes to adjust.
        const comments = getTrailingCommentRanges(sourceFile.text, end);
        if (comments) {
            const nodeEndLine = getLineOfLocalPosition(sourceFile, node.end);
            for (const comment of comments) {
                // Single line can break the loop as trivia will only be this line.
                // Comments on subsequest lines are also ignored.
                if (comment.kind === SyntaxKind.SingleLineCommentTrivia || getLineOfLocalPosition(sourceFile, comment.pos) > nodeEndLine) {
                    break;
                }
                // Get the end line of the comment and compare against the end line of the node.
                // If the comment end line position and the multiline comment extends to multiple lines,
                // then is safe to return the end position.
                const commentEndLine = getLineOfLocalPosition(sourceFile, comment.end);
                if (commentEndLine > nodeEndLine) {
                    return skipTrivia(sourceFile.text, comment.end, /*stopAfterLineBreak*/ true, /*stopAtComments*/ true);
                }
            }
        }
    }
    return undefined;
}
/** @internal */
export function getAdjustedEndPosition(sourceFile, node, options) {
    var _a;
    const { end } = node;
    const { trailingTriviaOption } = options;
    if (trailingTriviaOption === TrailingTriviaOption.Exclude) {
        return end;
    }
    if (trailingTriviaOption === TrailingTriviaOption.ExcludeWhitespace) {
        const comments = concatenate(getTrailingCommentRanges(sourceFile.text, end), getLeadingCommentRanges(sourceFile.text, end));
        const realEnd = (_a = comments === null || comments === void 0 ? void 0 : comments[comments.length - 1]) === null || _a === void 0 ? void 0 : _a.end;
        if (realEnd) {
            return realEnd;
        }
        return end;
    }
    const multilineEndPosition = getEndPositionOfMultilineTrailingComment(sourceFile, node, options);
    if (multilineEndPosition) {
        return multilineEndPosition;
    }
    const newEnd = skipTrivia(sourceFile.text, end, /*stopAfterLineBreak*/ true);
    return newEnd !== end && (trailingTriviaOption === TrailingTriviaOption.Include || isLineBreak(sourceFile.text.charCodeAt(newEnd - 1)))
        ? newEnd
        : end;
}
/**
 * Checks if 'candidate' argument is a legal separator in the list that contains 'node' as an element
 */
function isSeparator(node, candidate) {
    return !!candidate && !!node.parent && (candidate.kind === SyntaxKind.CommaToken || (candidate.kind === SyntaxKind.SemicolonToken && node.parent.kind === SyntaxKind.ObjectLiteralExpression));
}
/** @internal */
export function isThisTypeAnnotatable(containingFunction) {
    return isFunctionExpression(containingFunction) || isFunctionDeclaration(containingFunction);
}
/** @internal */
export class ChangeTracker {
    static fromContext(context) {
        return new ChangeTracker(getNewLineOrDefaultFromHost(context.host, context.formatContext.options), context.formatContext);
    }
    static with(context, cb) {
        const tracker = ChangeTracker.fromContext(context);
        cb(tracker);
        return tracker.getChanges();
    }
    /** Public for tests only. Other callers should use `ChangeTracker.with`. */
    constructor(newLineCharacter, formatContext) {
        this.newLineCharacter = newLineCharacter;
        this.formatContext = formatContext;
        this.changes = [];
        this.classesWithNodesInsertedAtStart = new Map(); // Set<ClassDeclaration> implemented as Map<node id, ClassDeclaration>
        this.deletedNodes = [];
    }
    pushRaw(sourceFile, change) {
        Debug.assertEqual(sourceFile.fileName, change.fileName);
        for (const c of change.textChanges) {
            this.changes.push({
                kind: ChangeKind.Text,
                sourceFile,
                text: c.newText,
                range: createTextRangeFromSpan(c.span),
            });
        }
    }
    deleteRange(sourceFile, range) {
        this.changes.push({ kind: ChangeKind.Remove, sourceFile, range });
    }
    delete(sourceFile, node) {
        this.deletedNodes.push({ sourceFile, node });
    }
    /** Stop! Consider using `delete` instead, which has logic for deleting nodes from delimited lists. */
    deleteNode(sourceFile, node, options = { leadingTriviaOption: LeadingTriviaOption.IncludeAll }) {
        this.deleteRange(sourceFile, getAdjustedRange(sourceFile, node, node, options));
    }
    deleteNodes(sourceFile, nodes, options = { leadingTriviaOption: LeadingTriviaOption.IncludeAll }, hasTrailingComment) {
        // When deleting multiple nodes we need to track if the end position is including multiline trailing comments.
        for (const node of nodes) {
            const pos = getAdjustedStartPosition(sourceFile, node, options, hasTrailingComment);
            const end = getAdjustedEndPosition(sourceFile, node, options);
            this.deleteRange(sourceFile, { pos, end });
            hasTrailingComment = !!getEndPositionOfMultilineTrailingComment(sourceFile, node, options);
        }
    }
    deleteModifier(sourceFile, modifier) {
        this.deleteRange(sourceFile, { pos: modifier.getStart(sourceFile), end: skipTrivia(sourceFile.text, modifier.end, /*stopAfterLineBreak*/ true) });
    }
    deleteNodeRange(sourceFile, startNode, endNode, options = { leadingTriviaOption: LeadingTriviaOption.IncludeAll }) {
        const startPosition = getAdjustedStartPosition(sourceFile, startNode, options);
        const endPosition = getAdjustedEndPosition(sourceFile, endNode, options);
        this.deleteRange(sourceFile, { pos: startPosition, end: endPosition });
    }
    deleteNodeRangeExcludingEnd(sourceFile, startNode, afterEndNode, options = { leadingTriviaOption: LeadingTriviaOption.IncludeAll }) {
        const startPosition = getAdjustedStartPosition(sourceFile, startNode, options);
        const endPosition = afterEndNode === undefined ? sourceFile.text.length : getAdjustedStartPosition(sourceFile, afterEndNode, options);
        this.deleteRange(sourceFile, { pos: startPosition, end: endPosition });
    }
    replaceRange(sourceFile, range, newNode, options = {}) {
        this.changes.push({ kind: ChangeKind.ReplaceWithSingleNode, sourceFile, range, options, node: newNode });
    }
    replaceNode(sourceFile, oldNode, newNode, options = useNonAdjustedPositions) {
        this.replaceRange(sourceFile, getAdjustedRange(sourceFile, oldNode, oldNode, options), newNode, options);
    }
    replaceNodeRange(sourceFile, startNode, endNode, newNode, options = useNonAdjustedPositions) {
        this.replaceRange(sourceFile, getAdjustedRange(sourceFile, startNode, endNode, options), newNode, options);
    }
    replaceRangeWithNodes(sourceFile, range, newNodes, options = {}) {
        this.changes.push({ kind: ChangeKind.ReplaceWithMultipleNodes, sourceFile, range, options, nodes: newNodes });
    }
    replaceNodeWithNodes(sourceFile, oldNode, newNodes, options = useNonAdjustedPositions) {
        this.replaceRangeWithNodes(sourceFile, getAdjustedRange(sourceFile, oldNode, oldNode, options), newNodes, options);
    }
    replaceNodeWithText(sourceFile, oldNode, text) {
        this.replaceRangeWithText(sourceFile, getAdjustedRange(sourceFile, oldNode, oldNode, useNonAdjustedPositions), text);
    }
    replaceNodeRangeWithNodes(sourceFile, startNode, endNode, newNodes, options = useNonAdjustedPositions) {
        this.replaceRangeWithNodes(sourceFile, getAdjustedRange(sourceFile, startNode, endNode, options), newNodes, options);
    }
    nodeHasTrailingComment(sourceFile, oldNode, configurableEnd = useNonAdjustedPositions) {
        return !!getEndPositionOfMultilineTrailingComment(sourceFile, oldNode, configurableEnd);
    }
    nextCommaToken(sourceFile, node) {
        const next = findNextToken(node, node.parent, sourceFile);
        return next && next.kind === SyntaxKind.CommaToken ? next : undefined;
    }
    replacePropertyAssignment(sourceFile, oldNode, newNode) {
        const suffix = this.nextCommaToken(sourceFile, oldNode) ? "" : ("," + this.newLineCharacter);
        this.replaceNode(sourceFile, oldNode, newNode, { suffix });
    }
    insertNodeAt(sourceFile, pos, newNode, options = {}) {
        this.replaceRange(sourceFile, createRange(pos), newNode, options);
    }
    insertNodesAt(sourceFile, pos, newNodes, options = {}) {
        this.replaceRangeWithNodes(sourceFile, createRange(pos), newNodes, options);
    }
    insertNodeAtTopOfFile(sourceFile, newNode, blankLineBetween) {
        this.insertAtTopOfFile(sourceFile, newNode, blankLineBetween);
    }
    insertNodesAtTopOfFile(sourceFile, newNodes, blankLineBetween) {
        this.insertAtTopOfFile(sourceFile, newNodes, blankLineBetween);
    }
    insertAtTopOfFile(sourceFile, insert, blankLineBetween) {
        const pos = getInsertionPositionAtSourceFileTop(sourceFile);
        const options = {
            prefix: pos === 0 ? undefined : this.newLineCharacter,
            suffix: (isLineBreak(sourceFile.text.charCodeAt(pos)) ? "" : this.newLineCharacter) + (blankLineBetween ? this.newLineCharacter : ""),
        };
        if (isArray(insert)) {
            this.insertNodesAt(sourceFile, pos, insert, options);
        }
        else {
            this.insertNodeAt(sourceFile, pos, insert, options);
        }
    }
    insertNodesAtEndOfFile(sourceFile, newNodes, blankLineBetween) {
        this.insertAtEndOfFile(sourceFile, newNodes, blankLineBetween);
    }
    insertAtEndOfFile(sourceFile, insert, blankLineBetween) {
        const pos = sourceFile.end + 1;
        const options = {
            prefix: this.newLineCharacter,
            suffix: this.newLineCharacter + (blankLineBetween ? this.newLineCharacter : ""),
        };
        this.insertNodesAt(sourceFile, pos, insert, options);
    }
    insertStatementsInNewFile(fileName, statements, oldFile) {
        if (!this.newFileChanges) {
            this.newFileChanges = createMultiMap();
        }
        this.newFileChanges.add(fileName, { oldFile, statements });
    }
    insertFirstParameter(sourceFile, parameters, newParam) {
        const p0 = firstOrUndefined(parameters);
        if (p0) {
            this.insertNodeBefore(sourceFile, p0, newParam);
        }
        else {
            this.insertNodeAt(sourceFile, parameters.pos, newParam);
        }
    }
    insertNodeBefore(sourceFile, before, newNode, blankLineBetween = false, options = {}) {
        this.insertNodeAt(sourceFile, getAdjustedStartPosition(sourceFile, before, options), newNode, this.getOptionsForInsertNodeBefore(before, newNode, blankLineBetween));
    }
    insertNodesBefore(sourceFile, before, newNodes, blankLineBetween = false, options = {}) {
        this.insertNodesAt(sourceFile, getAdjustedStartPosition(sourceFile, before, options), newNodes, this.getOptionsForInsertNodeBefore(before, first(newNodes), blankLineBetween));
    }
    insertModifierAt(sourceFile, pos, modifier, options = {}) {
        this.insertNodeAt(sourceFile, pos, factory.createToken(modifier), options);
    }
    insertModifierBefore(sourceFile, modifier, before) {
        return this.insertModifierAt(sourceFile, before.getStart(sourceFile), modifier, { suffix: " " });
    }
    insertCommentBeforeLine(sourceFile, lineNumber, position, commentText) {
        const lineStartPosition = getStartPositionOfLine(lineNumber, sourceFile);
        const startPosition = getFirstNonSpaceCharacterPosition(sourceFile.text, lineStartPosition);
        // First try to see if we can put the comment on the previous line.
        // We need to make sure that we are not in the middle of a string literal or a comment.
        // If so, we do not want to separate the node from its comment if we can.
        // Otherwise, add an extra new line immediately before the error span.
        const insertAtLineStart = isValidLocationToAddComment(sourceFile, startPosition);
        const token = getTouchingToken(sourceFile, insertAtLineStart ? startPosition : position);
        const indent = sourceFile.text.slice(lineStartPosition, startPosition);
        const text = `${insertAtLineStart ? "" : this.newLineCharacter}//${commentText}${this.newLineCharacter}${indent}`;
        this.insertText(sourceFile, token.getStart(sourceFile), text);
    }
    insertJsdocCommentBefore(sourceFile, node, tag) {
        const fnStart = node.getStart(sourceFile);
        if (node.jsDoc) {
            for (const jsdoc of node.jsDoc) {
                this.deleteRange(sourceFile, {
                    pos: getLineStartPositionForPosition(jsdoc.getStart(sourceFile), sourceFile),
                    end: getAdjustedEndPosition(sourceFile, jsdoc, /*options*/ {}),
                });
            }
        }
        const startPosition = getPrecedingNonSpaceCharacterPosition(sourceFile.text, fnStart - 1);
        const indent = sourceFile.text.slice(startPosition, fnStart);
        this.insertNodeAt(sourceFile, fnStart, tag, { suffix: this.newLineCharacter + indent });
    }
    createJSDocText(sourceFile, node) {
        const comments = flatMap(node.jsDoc, jsDoc => isString(jsDoc.comment) ? factory.createJSDocText(jsDoc.comment) : jsDoc.comment);
        const jsDoc = singleOrUndefined(node.jsDoc);
        return jsDoc && positionsAreOnSameLine(jsDoc.pos, jsDoc.end, sourceFile) && length(comments) === 0 ? undefined :
            factory.createNodeArray(intersperse(comments, factory.createJSDocText("\n")));
    }
    replaceJSDocComment(sourceFile, node, tags) {
        this.insertJsdocCommentBefore(sourceFile, updateJSDocHost(node), factory.createJSDocComment(this.createJSDocText(sourceFile, node), factory.createNodeArray(tags)));
    }
    addJSDocTags(sourceFile, parent, newTags) {
        const oldTags = flatMapToMutable(parent.jsDoc, j => j.tags);
        const unmergedNewTags = newTags.filter(newTag => !oldTags.some((tag, i) => {
            const merged = tryMergeJsdocTags(tag, newTag);
            if (merged)
                oldTags[i] = merged;
            return !!merged;
        }));
        this.replaceJSDocComment(sourceFile, parent, [...oldTags, ...unmergedNewTags]);
    }
    filterJSDocTags(sourceFile, parent, predicate) {
        this.replaceJSDocComment(sourceFile, parent, filter(flatMapToMutable(parent.jsDoc, j => j.tags), predicate));
    }
    replaceRangeWithText(sourceFile, range, text) {
        this.changes.push({ kind: ChangeKind.Text, sourceFile, range, text });
    }
    insertText(sourceFile, pos, text) {
        this.replaceRangeWithText(sourceFile, createRange(pos), text);
    }
    /** Prefer this over replacing a node with another that has a type annotation, as it avoids reformatting the other parts of the node. */
    tryInsertTypeAnnotation(sourceFile, node, type) {
        var _a;
        let endNode;
        if (isFunctionLike(node)) {
            endNode = findChildOfKind(node, SyntaxKind.CloseParenToken, sourceFile);
            if (!endNode) {
                if (!isArrowFunction(node))
                    return false; // Function missing parentheses, give up
                // If no `)`, is an arrow function `x => x`, so use the end of the first parameter
                endNode = first(node.parameters);
            }
        }
        else {
            endNode = (_a = (node.kind === SyntaxKind.VariableDeclaration ? node.exclamationToken : node.questionToken)) !== null && _a !== void 0 ? _a : node.name;
        }
        this.insertNodeAt(sourceFile, endNode.end, type, { prefix: ": " });
        return true;
    }
    tryInsertThisTypeAnnotation(sourceFile, node, type) {
        const start = findChildOfKind(node, SyntaxKind.OpenParenToken, sourceFile).getStart(sourceFile) + 1;
        const suffix = node.parameters.length ? ", " : "";
        this.insertNodeAt(sourceFile, start, type, { prefix: "this: ", suffix });
    }
    insertTypeParameters(sourceFile, node, typeParameters) {
        // If no `(`, is an arrow function `x => x`, so use the pos of the first parameter
        const start = (findChildOfKind(node, SyntaxKind.OpenParenToken, sourceFile) || first(node.parameters)).getStart(sourceFile);
        this.insertNodesAt(sourceFile, start, typeParameters, { prefix: "<", suffix: ">", joiner: ", " });
    }
    getOptionsForInsertNodeBefore(before, inserted, blankLineBetween) {
        if (isStatement(before) || isClassElement(before)) {
            return { suffix: blankLineBetween ? this.newLineCharacter + this.newLineCharacter : this.newLineCharacter };
        }
        else if (isVariableDeclaration(before)) { // insert `x = 1, ` into `const x = 1, y = 2;
            return { suffix: ", " };
        }
        else if (isParameter(before)) {
            return isParameter(inserted) ? { suffix: ", " } : {};
        }
        else if (isStringLiteral(before) && isImportDeclaration(before.parent) || isNamedImports(before)) {
            return { suffix: ", " };
        }
        else if (isImportSpecifier(before)) {
            return { suffix: "," + (blankLineBetween ? this.newLineCharacter : " ") };
        }
        return Debug.failBadSyntaxKind(before); // We haven't handled this kind of node yet -- add it
    }
    insertNodeAtConstructorStart(sourceFile, ctr, newStatement) {
        const firstStatement = firstOrUndefined(ctr.body.statements);
        if (!firstStatement || !ctr.body.multiLine) {
            this.replaceConstructorBody(sourceFile, ctr, [newStatement, ...ctr.body.statements]);
        }
        else {
            this.insertNodeBefore(sourceFile, firstStatement, newStatement);
        }
    }
    insertNodeAtConstructorStartAfterSuperCall(sourceFile, ctr, newStatement) {
        const superCallStatement = find(ctr.body.statements, stmt => isExpressionStatement(stmt) && isSuperCall(stmt.expression));
        if (!superCallStatement || !ctr.body.multiLine) {
            this.replaceConstructorBody(sourceFile, ctr, [...ctr.body.statements, newStatement]);
        }
        else {
            this.insertNodeAfter(sourceFile, superCallStatement, newStatement);
        }
    }
    insertNodeAtConstructorEnd(sourceFile, ctr, newStatement) {
        const lastStatement = lastOrUndefined(ctr.body.statements);
        if (!lastStatement || !ctr.body.multiLine) {
            this.replaceConstructorBody(sourceFile, ctr, [...ctr.body.statements, newStatement]);
        }
        else {
            this.insertNodeAfter(sourceFile, lastStatement, newStatement);
        }
    }
    replaceConstructorBody(sourceFile, ctr, statements) {
        this.replaceNode(sourceFile, ctr.body, factory.createBlock(statements, /*multiLine*/ true));
    }
    insertNodeAtEndOfScope(sourceFile, scope, newNode) {
        const pos = getAdjustedStartPosition(sourceFile, scope.getLastToken(), {});
        this.insertNodeAt(sourceFile, pos, newNode, {
            prefix: isLineBreak(sourceFile.text.charCodeAt(scope.getLastToken().pos)) ? this.newLineCharacter : this.newLineCharacter + this.newLineCharacter,
            suffix: this.newLineCharacter,
        });
    }
    insertMemberAtStart(sourceFile, node, newElement) {
        this.insertNodeAtStartWorker(sourceFile, node, newElement);
    }
    insertNodeAtObjectStart(sourceFile, obj, newElement) {
        this.insertNodeAtStartWorker(sourceFile, obj, newElement);
    }
    insertNodeAtStartWorker(sourceFile, node, newElement) {
        var _a;
        const indentation = (_a = this.guessIndentationFromExistingMembers(sourceFile, node)) !== null && _a !== void 0 ? _a : this.computeIndentationForNewMember(sourceFile, node);
        this.insertNodeAt(sourceFile, getMembersOrProperties(node).pos, newElement, this.getInsertNodeAtStartInsertOptions(sourceFile, node, indentation));
    }
    /**
     * Tries to guess the indentation from the existing members of a class/interface/object. All members must be on
     * new lines and must share the same indentation.
     */
    guessIndentationFromExistingMembers(sourceFile, node) {
        let indentation;
        let lastRange = node;
        for (const member of getMembersOrProperties(node)) {
            if (rangeStartPositionsAreOnSameLine(lastRange, member, sourceFile)) {
                // each indented member must be on a new line
                return undefined;
            }
            const memberStart = member.getStart(sourceFile);
            const memberIndentation = formatting.SmartIndenter.findFirstNonWhitespaceColumn(getLineStartPositionForPosition(memberStart, sourceFile), memberStart, sourceFile, this.formatContext.options);
            if (indentation === undefined) {
                indentation = memberIndentation;
            }
            else if (memberIndentation !== indentation) {
                // indentation of multiple members is not consistent
                return undefined;
            }
            lastRange = member;
        }
        return indentation;
    }
    computeIndentationForNewMember(sourceFile, node) {
        var _a;
        const nodeStart = node.getStart(sourceFile);
        return formatting.SmartIndenter.findFirstNonWhitespaceColumn(getLineStartPositionForPosition(nodeStart, sourceFile), nodeStart, sourceFile, this.formatContext.options)
            + ((_a = this.formatContext.options.indentSize) !== null && _a !== void 0 ? _a : 4);
    }
    getInsertNodeAtStartInsertOptions(sourceFile, node, indentation) {
        // Rules:
        // - Always insert leading newline.
        // - For object literals:
        //   - Add a trailing comma if there are existing members in the node, or the source file is not a JSON file
        //     (because trailing commas are generally illegal in a JSON file).
        //   - Add a leading comma if the source file is not a JSON file, there are existing insertions,
        //     and the node is empty (because we didn't add a trailing comma per the previous rule).
        // - Only insert a trailing newline if body is single-line and there are no other insertions for the node.
        //   NOTE: This is handled in `finishClassesWithNodesInsertedAtStart`.
        const members = getMembersOrProperties(node);
        const isEmpty = members.length === 0;
        const isFirstInsertion = !this.classesWithNodesInsertedAtStart.has(getNodeId(node));
        if (isFirstInsertion) {
            this.classesWithNodesInsertedAtStart.set(getNodeId(node), { node, sourceFile });
        }
        const insertTrailingComma = isObjectLiteralExpression(node) && (!isJsonSourceFile(sourceFile) || !isEmpty);
        const insertLeadingComma = isObjectLiteralExpression(node) && isJsonSourceFile(sourceFile) && isEmpty && !isFirstInsertion;
        return {
            indentation,
            prefix: (insertLeadingComma ? "," : "") + this.newLineCharacter,
            suffix: insertTrailingComma ? "," : isInterfaceDeclaration(node) && isEmpty ? ";" : "",
        };
    }
    insertNodeAfterComma(sourceFile, after, newNode) {
        const endPosition = this.insertNodeAfterWorker(sourceFile, this.nextCommaToken(sourceFile, after) || after, newNode);
        this.insertNodeAt(sourceFile, endPosition, newNode, this.getInsertNodeAfterOptions(sourceFile, after));
    }
    insertNodeAfter(sourceFile, after, newNode) {
        const endPosition = this.insertNodeAfterWorker(sourceFile, after, newNode);
        this.insertNodeAt(sourceFile, endPosition, newNode, this.getInsertNodeAfterOptions(sourceFile, after));
    }
    insertNodeAtEndOfList(sourceFile, list, newNode) {
        this.insertNodeAt(sourceFile, list.end, newNode, { prefix: ", " });
    }
    insertNodesAfter(sourceFile, after, newNodes) {
        const endPosition = this.insertNodeAfterWorker(sourceFile, after, first(newNodes));
        this.insertNodesAt(sourceFile, endPosition, newNodes, this.getInsertNodeAfterOptions(sourceFile, after));
    }
    insertNodeAfterWorker(sourceFile, after, newNode) {
        if (needSemicolonBetween(after, newNode)) {
            // check if previous statement ends with semicolon
            // if not - insert semicolon to preserve the code from changing the meaning due to ASI
            if (sourceFile.text.charCodeAt(after.end - 1) !== CharacterCodes.semicolon) {
                this.replaceRange(sourceFile, createRange(after.end), factory.createToken(SyntaxKind.SemicolonToken));
            }
        }
        const endPosition = getAdjustedEndPosition(sourceFile, after, {});
        return endPosition;
    }
    getInsertNodeAfterOptions(sourceFile, after) {
        const options = this.getInsertNodeAfterOptionsWorker(after);
        return Object.assign(Object.assign({}, options), { prefix: after.end === sourceFile.end && isStatement(after) ? (options.prefix ? `\n${options.prefix}` : "\n") : options.prefix });
    }
    getInsertNodeAfterOptionsWorker(node) {
        switch (node.kind) {
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.ModuleDeclaration:
                return { prefix: this.newLineCharacter, suffix: this.newLineCharacter };
            case SyntaxKind.VariableDeclaration:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.Identifier:
                return { prefix: ", " };
            case SyntaxKind.PropertyAssignment:
                return { suffix: "," + this.newLineCharacter };
            case SyntaxKind.ExportKeyword:
                return { prefix: " " };
            case SyntaxKind.Parameter:
                return {};
            default:
                Debug.assert(isStatement(node) || isClassOrTypeElement(node)); // Else we haven't handled this kind of node yet -- add it
                return { suffix: this.newLineCharacter };
        }
    }
    insertName(sourceFile, node, name) {
        Debug.assert(!node.name);
        if (node.kind === SyntaxKind.ArrowFunction) {
            const arrow = findChildOfKind(node, SyntaxKind.EqualsGreaterThanToken, sourceFile);
            const lparen = findChildOfKind(node, SyntaxKind.OpenParenToken, sourceFile);
            if (lparen) {
                // `() => {}` --> `function f() {}`
                this.insertNodesAt(sourceFile, lparen.getStart(sourceFile), [factory.createToken(SyntaxKind.FunctionKeyword), factory.createIdentifier(name)], { joiner: " " });
                deleteNode(this, sourceFile, arrow);
            }
            else {
                // `x => {}` -> `function f(x) {}`
                this.insertText(sourceFile, first(node.parameters).getStart(sourceFile), `function ${name}(`);
                // Replacing full range of arrow to get rid of the leading space -- replace ` =>` with `)`
                this.replaceRange(sourceFile, arrow, factory.createToken(SyntaxKind.CloseParenToken));
            }
            if (node.body.kind !== SyntaxKind.Block) {
                // `() => 0` => `function f() { return 0; }`
                this.insertNodesAt(sourceFile, node.body.getStart(sourceFile), [factory.createToken(SyntaxKind.OpenBraceToken), factory.createToken(SyntaxKind.ReturnKeyword)], { joiner: " ", suffix: " " });
                this.insertNodesAt(sourceFile, node.body.end, [factory.createToken(SyntaxKind.SemicolonToken), factory.createToken(SyntaxKind.CloseBraceToken)], { joiner: " " });
            }
        }
        else {
            const pos = findChildOfKind(node, node.kind === SyntaxKind.FunctionExpression ? SyntaxKind.FunctionKeyword : SyntaxKind.ClassKeyword, sourceFile).end;
            this.insertNodeAt(sourceFile, pos, factory.createIdentifier(name), { prefix: " " });
        }
    }
    insertExportModifier(sourceFile, node) {
        this.insertText(sourceFile, node.getStart(sourceFile), "export ");
    }
    insertImportSpecifierAtIndex(sourceFile, importSpecifier, namedImports, index) {
        const prevSpecifier = namedImports.elements[index - 1];
        if (prevSpecifier) {
            this.insertNodeInListAfter(sourceFile, prevSpecifier, importSpecifier);
        }
        else {
            this.insertNodeBefore(sourceFile, namedImports.elements[0], importSpecifier, !positionsAreOnSameLine(namedImports.elements[0].getStart(), namedImports.parent.parent.getStart(), sourceFile));
        }
    }
    /**
     * This function should be used to insert nodes in lists when nodes don't carry separators as the part of the node range,
     * i.e. arguments in arguments lists, parameters in parameter lists etc.
     * Note that separators are part of the node in statements and class elements.
     */
    insertNodeInListAfter(sourceFile, after, newNode, containingList = formatting.SmartIndenter.getContainingList(after, sourceFile)) {
        if (!containingList) {
            Debug.fail("node is not a list element");
            return;
        }
        const index = indexOfNode(containingList, after);
        if (index < 0) {
            return;
        }
        const end = after.getEnd();
        if (index !== containingList.length - 1) {
            // any element except the last one
            // use next sibling as an anchor
            const nextToken = getTokenAtPosition(sourceFile, after.end);
            if (nextToken && isSeparator(after, nextToken)) {
                // for list
                // a, b, c
                // create change for adding 'e' after 'a' as
                // - find start of next element after a (it is b)
                // - use next element start as start and end position in final change
                // - build text of change by formatting the text of node + whitespace trivia of b
                // in multiline case it will work as
                //   a,
                //   b,
                //   c,
                // result - '*' denotes leading trivia that will be inserted after new text (displayed as '#')
                //   a,
                //   insertedtext<separator>#
                // ###b,
                //   c,
                const nextNode = containingList[index + 1];
                const startPos = skipWhitespacesAndLineBreaks(sourceFile.text, nextNode.getFullStart());
                // write separator and leading trivia of the next element as suffix
                const suffix = `${tokenToString(nextToken.kind)}${sourceFile.text.substring(nextToken.end, startPos)}`;
                this.insertNodesAt(sourceFile, startPos, [newNode], { suffix });
            }
        }
        else {
            const afterStart = after.getStart(sourceFile);
            const afterStartLinePosition = getLineStartPositionForPosition(afterStart, sourceFile);
            let separator;
            let multilineList = false;
            // insert element after the last element in the list that has more than one item
            // pick the element preceding the after element to:
            // - pick the separator
            // - determine if list is a multiline
            if (containingList.length === 1) {
                // if list has only one element then we'll format is as multiline if node has comment in trailing trivia, or as singleline otherwise
                // i.e. var x = 1 // this is x
                //     | new element will be inserted at this position
                separator = SyntaxKind.CommaToken;
            }
            else {
                // element has more than one element, pick separator from the list
                const tokenBeforeInsertPosition = findPrecedingToken(after.pos, sourceFile);
                separator = isSeparator(after, tokenBeforeInsertPosition) ? tokenBeforeInsertPosition.kind : SyntaxKind.CommaToken;
                // determine if list is multiline by checking lines of after element and element that precedes it.
                const afterMinusOneStartLinePosition = getLineStartPositionForPosition(containingList[index - 1].getStart(sourceFile), sourceFile);
                multilineList = afterMinusOneStartLinePosition !== afterStartLinePosition;
            }
            if (hasCommentsBeforeLineBreak(sourceFile.text, after.end)
                || !positionsAreOnSameLine(containingList.pos, containingList.end, sourceFile)) {
                // in this case we'll always treat containing list as multiline
                multilineList = true;
            }
            if (multilineList) {
                // insert separator immediately following the 'after' node to preserve comments in trailing trivia
                this.replaceRange(sourceFile, createRange(end), factory.createToken(separator));
                // use the same indentation as 'after' item
                const indentation = formatting.SmartIndenter.findFirstNonWhitespaceColumn(afterStartLinePosition, afterStart, sourceFile, this.formatContext.options);
                // insert element before the line break on the line that contains 'after' element
                let insertPos = skipTrivia(sourceFile.text, end, /*stopAfterLineBreak*/ true, /*stopAtComments*/ false);
                // find position before "\n" or "\r\n"
                while (insertPos !== end && isLineBreak(sourceFile.text.charCodeAt(insertPos - 1))) {
                    insertPos--;
                }
                this.replaceRange(sourceFile, createRange(insertPos), newNode, { indentation, prefix: this.newLineCharacter });
            }
            else {
                this.replaceRange(sourceFile, createRange(end), newNode, { prefix: `${tokenToString(separator)} ` });
            }
        }
    }
    parenthesizeExpression(sourceFile, expression) {
        this.replaceRange(sourceFile, rangeOfNode(expression), factory.createParenthesizedExpression(expression));
    }
    finishClassesWithNodesInsertedAtStart() {
        this.classesWithNodesInsertedAtStart.forEach(({ node, sourceFile }) => {
            const [openBraceEnd, closeBraceEnd] = getClassOrObjectBraceEnds(node, sourceFile);
            if (openBraceEnd !== undefined && closeBraceEnd !== undefined) {
                const isEmpty = getMembersOrProperties(node).length === 0;
                const isSingleLine = positionsAreOnSameLine(openBraceEnd, closeBraceEnd, sourceFile);
                if (isEmpty && isSingleLine && openBraceEnd !== closeBraceEnd - 1) {
                    // For `class C { }` remove the whitespace inside the braces.
                    this.deleteRange(sourceFile, createRange(openBraceEnd, closeBraceEnd - 1));
                }
                if (isSingleLine) {
                    this.insertText(sourceFile, closeBraceEnd - 1, this.newLineCharacter);
                }
            }
        });
    }
    finishDeleteDeclarations() {
        const deletedNodesInLists = new Set(); // Stores nodes in lists that we already deleted. Used to avoid deleting `, ` twice in `a, b`.
        for (const { sourceFile, node } of this.deletedNodes) {
            if (!this.deletedNodes.some(d => d.sourceFile === sourceFile && rangeContainsRangeExclusive(d.node, node))) {
                if (isArray(node)) {
                    this.deleteRange(sourceFile, rangeOfTypeParameters(sourceFile, node));
                }
                else {
                    deleteDeclaration.deleteDeclaration(this, deletedNodesInLists, sourceFile, node);
                }
            }
        }
        deletedNodesInLists.forEach(node => {
            const sourceFile = node.getSourceFile();
            const list = formatting.SmartIndenter.getContainingList(node, sourceFile);
            if (node !== last(list))
                return;
            const lastNonDeletedIndex = findLastIndex(list, n => !deletedNodesInLists.has(n), list.length - 2);
            if (lastNonDeletedIndex !== -1) {
                this.deleteRange(sourceFile, { pos: list[lastNonDeletedIndex].end, end: startPositionToDeleteNodeInList(sourceFile, list[lastNonDeletedIndex + 1]) });
            }
        });
    }
    /**
     * Note: after calling this, the TextChanges object must be discarded!
     * @param validate only for tests
     *    The reason we must validate as part of this method is that `getNonFormattedText` changes the node's positions,
     *    so we can only call this once and can't get the non-formatted text separately.
     */
    getChanges(validate) {
        this.finishDeleteDeclarations();
        this.finishClassesWithNodesInsertedAtStart();
        const changes = changesToText.getTextChangesFromChanges(this.changes, this.newLineCharacter, this.formatContext, validate);
        if (this.newFileChanges) {
            this.newFileChanges.forEach((insertions, fileName) => {
                changes.push(changesToText.newFileChanges(fileName, insertions, this.newLineCharacter, this.formatContext));
            });
        }
        return changes;
    }
    createNewFile(oldFile, fileName, statements) {
        this.insertStatementsInNewFile(fileName, statements, oldFile);
    }
}
function updateJSDocHost(parent) {
    if (parent.kind !== SyntaxKind.ArrowFunction) {
        return parent;
    }
    const jsDocNode = parent.parent.kind === SyntaxKind.PropertyDeclaration ?
        parent.parent :
        parent.parent.parent;
    jsDocNode.jsDoc = parent.jsDoc;
    return jsDocNode;
}
function tryMergeJsdocTags(oldTag, newTag) {
    if (oldTag.kind !== newTag.kind) {
        return undefined;
    }
    switch (oldTag.kind) {
        case SyntaxKind.JSDocParameterTag: {
            const oldParam = oldTag;
            const newParam = newTag;
            return isIdentifier(oldParam.name) && isIdentifier(newParam.name) && oldParam.name.escapedText === newParam.name.escapedText
                ? factory.createJSDocParameterTag(/*tagName*/ undefined, newParam.name, /*isBracketed*/ false, newParam.typeExpression, newParam.isNameFirst, oldParam.comment)
                : undefined;
        }
        case SyntaxKind.JSDocReturnTag:
            return factory.createJSDocReturnTag(/*tagName*/ undefined, newTag.typeExpression, oldTag.comment);
        case SyntaxKind.JSDocTypeTag:
            return factory.createJSDocTypeTag(/*tagName*/ undefined, newTag.typeExpression, oldTag.comment);
    }
}
// find first non-whitespace position in the leading trivia of the node
function startPositionToDeleteNodeInList(sourceFile, node) {
    return skipTrivia(sourceFile.text, getAdjustedStartPosition(sourceFile, node, { leadingTriviaOption: LeadingTriviaOption.IncludeAll }), /*stopAfterLineBreak*/ false, /*stopAtComments*/ true);
}
function endPositionToDeleteNodeInList(sourceFile, node, prevNode, nextNode) {
    const end = startPositionToDeleteNodeInList(sourceFile, nextNode);
    if (prevNode === undefined || positionsAreOnSameLine(getAdjustedEndPosition(sourceFile, node, {}), end, sourceFile)) {
        return end;
    }
    const token = findPrecedingToken(nextNode.getStart(sourceFile), sourceFile);
    if (isSeparator(node, token)) {
        const prevToken = findPrecedingToken(node.getStart(sourceFile), sourceFile);
        if (isSeparator(prevNode, prevToken)) {
            const pos = skipTrivia(sourceFile.text, token.getEnd(), /*stopAfterLineBreak*/ true, /*stopAtComments*/ true);
            if (positionsAreOnSameLine(prevToken.getStart(sourceFile), token.getStart(sourceFile), sourceFile)) {
                return isLineBreak(sourceFile.text.charCodeAt(pos - 1)) ? pos - 1 : pos;
            }
            if (isLineBreak(sourceFile.text.charCodeAt(pos))) {
                return pos;
            }
        }
    }
    return end;
}
function getClassOrObjectBraceEnds(cls, sourceFile) {
    const open = findChildOfKind(cls, SyntaxKind.OpenBraceToken, sourceFile);
    const close = findChildOfKind(cls, SyntaxKind.CloseBraceToken, sourceFile);
    return [open === null || open === void 0 ? void 0 : open.end, close === null || close === void 0 ? void 0 : close.end];
}
function getMembersOrProperties(node) {
    return isObjectLiteralExpression(node) ? node.properties : node.members;
}
var changesToText;
(function (changesToText) {
    function getTextChangesFromChanges(changes, newLineCharacter, formatContext, validate) {
        return mapDefined(group(changes, c => c.sourceFile.path), changesInFile => {
            const sourceFile = changesInFile[0].sourceFile;
            // order changes by start position
            // If the start position is the same, put the shorter range first, since an empty range (x, x) may precede (x, y) but not vice-versa.
            const normalized = toSorted(changesInFile, (a, b) => (a.range.pos - b.range.pos) || (a.range.end - b.range.end));
            // verify that change intervals do not overlap, except possibly at end points.
            for (let i = 0; i < normalized.length - 1; i++) {
                Debug.assert(normalized[i].range.end <= normalized[i + 1].range.pos, "Changes overlap", () => `${JSON.stringify(normalized[i].range)} and ${JSON.stringify(normalized[i + 1].range)}`);
            }
            const textChanges = mapDefined(normalized, c => {
                var _a, _b;
                const span = createTextSpanFromRange(c.range);
                const targetSourceFile = c.kind === ChangeKind.ReplaceWithSingleNode ? (_a = getSourceFileOfNode(getOriginalNode(c.node))) !== null && _a !== void 0 ? _a : c.sourceFile :
                    c.kind === ChangeKind.ReplaceWithMultipleNodes ? (_b = getSourceFileOfNode(getOriginalNode(c.nodes[0]))) !== null && _b !== void 0 ? _b : c.sourceFile :
                        c.sourceFile;
                const newText = computeNewText(c, targetSourceFile, sourceFile, newLineCharacter, formatContext, validate);
                // Filter out redundant changes.
                if (span.length === newText.length && stringContainsAt(targetSourceFile.text, newText, span.start)) {
                    return undefined;
                }
                return createTextChange(span, newText);
            });
            return textChanges.length > 0 ? { fileName: sourceFile.fileName, textChanges } : undefined;
        });
    }
    changesToText.getTextChangesFromChanges = getTextChangesFromChanges;
    function newFileChanges(fileName, insertions, newLineCharacter, formatContext) {
        const text = newFileChangesWorker(getScriptKindFromFileName(fileName), insertions, newLineCharacter, formatContext);
        return { fileName, textChanges: [createTextChange(createTextSpan(0, 0), text)], isNewFile: true };
    }
    changesToText.newFileChanges = newFileChanges;
    function newFileChangesWorker(scriptKind, insertions, newLineCharacter, formatContext) {
        // TODO: this emits the file, parses it back, then formats it that -- may be a less roundabout way to do this
        const nonFormattedText = flatMap(insertions, insertion => insertion.statements.map(s => s === SyntaxKind.NewLineTrivia ? "" : getNonformattedText(s, insertion.oldFile, newLineCharacter).text)).join(newLineCharacter);
        const sourceFile = createSourceFile("any file name", nonFormattedText, { languageVersion: ScriptTarget.ESNext, jsDocParsingMode: JSDocParsingMode.ParseNone }, /*setParentNodes*/ true, scriptKind);
        const changes = formatting.formatDocument(sourceFile, formatContext);
        return applyChanges(nonFormattedText, changes) + newLineCharacter;
    }
    changesToText.newFileChangesWorker = newFileChangesWorker;
    function computeNewText(change, targetSourceFile, sourceFile, newLineCharacter, formatContext, validate) {
        var _a;
        if (change.kind === ChangeKind.Remove) {
            return "";
        }
        if (change.kind === ChangeKind.Text) {
            return change.text;
        }
        const { options = {}, range: { pos } } = change;
        const format = (n) => getFormattedTextOfNode(n, targetSourceFile, sourceFile, pos, options, newLineCharacter, formatContext, validate);
        const text = change.kind === ChangeKind.ReplaceWithMultipleNodes
            ? change.nodes.map(n => removeSuffix(format(n), newLineCharacter)).join(((_a = change.options) === null || _a === void 0 ? void 0 : _a.joiner) || newLineCharacter)
            : format(change.node);
        // strip initial indentation (spaces or tabs) if text will be inserted in the middle of the line
        const noIndent = (options.indentation !== undefined || getLineStartPositionForPosition(pos, targetSourceFile) === pos) ? text : text.replace(/^\s+/, "");
        return (options.prefix || "") + noIndent
            + ((!options.suffix || endsWith(noIndent, options.suffix))
                ? "" : options.suffix);
    }
    /** Note: this may mutate `nodeIn`. */
    function getFormattedTextOfNode(nodeIn, targetSourceFile, sourceFile, pos, { indentation, prefix, delta }, newLineCharacter, formatContext, validate) {
        const { node, text } = getNonformattedText(nodeIn, targetSourceFile, newLineCharacter);
        if (validate)
            validate(node, text);
        const formatOptions = getFormatCodeSettingsForWriting(formatContext, targetSourceFile);
        const initialIndentation = indentation !== undefined
            ? indentation
            : formatting.SmartIndenter.getIndentation(pos, sourceFile, formatOptions, prefix === newLineCharacter || getLineStartPositionForPosition(pos, targetSourceFile) === pos);
        if (delta === undefined) {
            delta = formatting.SmartIndenter.shouldIndentChildNode(formatOptions, nodeIn) ? (formatOptions.indentSize || 0) : 0;
        }
        const file = {
            text,
            getLineAndCharacterOfPosition(pos) {
                return getLineAndCharacterOfPosition(this, pos);
            },
        };
        const changes = formatting.formatNodeGivenIndentation(node, file, targetSourceFile.languageVariant, initialIndentation, delta, Object.assign(Object.assign({}, formatContext), { options: formatOptions }));
        return applyChanges(text, changes);
    }
    /** Note: output node may be mutated input node. */
    function getNonformattedText(node, sourceFile, newLineCharacter) {
        const writer = createWriter(newLineCharacter);
        const newLine = getNewLineKind(newLineCharacter);
        createPrinter({
            newLine,
            neverAsciiEscape: true,
            preserveSourceNewlines: true,
            terminateUnterminatedLiterals: true,
        }, writer).writeNode(EmitHint.Unspecified, node, sourceFile, writer);
        return { text: writer.getText(), node: assignPositionsToNode(node) };
    }
    changesToText.getNonformattedText = getNonformattedText;
})(changesToText || (changesToText = {}));
/** @internal */
export function applyChanges(text, changes) {
    for (let i = changes.length - 1; i >= 0; i--) {
        const { span, newText } = changes[i];
        text = `${text.substring(0, span.start)}${newText}${text.substring(textSpanEnd(span))}`;
    }
    return text;
}
function isTrivia(s) {
    return skipTrivia(s, 0) === s.length;
}
// A transformation context that won't perform parenthesization, as some parenthesization rules
// are more aggressive than is strictly necessary.
const textChangesTransformationContext = Object.assign(Object.assign({}, nullTransformationContext), { factory: createNodeFactory(nullTransformationContext.factory.flags | NodeFactoryFlags.NoParenthesizerRules, nullTransformationContext.factory.baseFactory) });
/** @internal */
export function assignPositionsToNode(node) {
    const visited = visitEachChild(node, assignPositionsToNode, textChangesTransformationContext, assignPositionsToNodeArray, assignPositionsToNode);
    // create proxy node for non synthesized nodes
    const newNode = nodeIsSynthesized(visited) ? visited : Object.create(visited);
    setTextRangePosEnd(newNode, getPos(node), getEnd(node));
    return newNode;
}
function assignPositionsToNodeArray(nodes, visitor, test, start, count) {
    const visited = visitNodes(nodes, visitor, test, start, count);
    if (!visited) {
        return visited;
    }
    Debug.assert(nodes);
    // clone nodearray if necessary
    const nodeArray = visited === nodes ? factory.createNodeArray(visited.slice(0)) : visited;
    setTextRangePosEnd(nodeArray, getPos(nodes), getEnd(nodes));
    return nodeArray;
}
/** @internal */
export function createWriter(newLine) {
    let lastNonTriviaPosition = 0;
    const writer = createTextWriter(newLine);
    const onBeforeEmitNode = node => {
        if (node) {
            setPos(node, lastNonTriviaPosition);
        }
    };
    const onAfterEmitNode = node => {
        if (node) {
            setEnd(node, lastNonTriviaPosition);
        }
    };
    const onBeforeEmitNodeArray = nodes => {
        if (nodes) {
            setPos(nodes, lastNonTriviaPosition);
        }
    };
    const onAfterEmitNodeArray = nodes => {
        if (nodes) {
            setEnd(nodes, lastNonTriviaPosition);
        }
    };
    const onBeforeEmitToken = node => {
        if (node) {
            setPos(node, lastNonTriviaPosition);
        }
    };
    const onAfterEmitToken = node => {
        if (node) {
            setEnd(node, lastNonTriviaPosition);
        }
    };
    function setLastNonTriviaPosition(s, force) {
        if (force || !isTrivia(s)) {
            lastNonTriviaPosition = writer.getTextPos();
            let i = 0;
            while (isWhiteSpaceLike(s.charCodeAt(s.length - i - 1))) {
                i++;
            }
            // trim trailing whitespaces
            lastNonTriviaPosition -= i;
        }
    }
    function write(s) {
        writer.write(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeComment(s) {
        writer.writeComment(s);
    }
    function writeKeyword(s) {
        writer.writeKeyword(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeOperator(s) {
        writer.writeOperator(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writePunctuation(s) {
        writer.writePunctuation(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeTrailingSemicolon(s) {
        writer.writeTrailingSemicolon(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeParameter(s) {
        writer.writeParameter(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeProperty(s) {
        writer.writeProperty(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeSpace(s) {
        writer.writeSpace(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeStringLiteral(s) {
        writer.writeStringLiteral(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeSymbol(s, sym) {
        writer.writeSymbol(s, sym);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeLine(force) {
        writer.writeLine(force);
    }
    function increaseIndent() {
        writer.increaseIndent();
    }
    function decreaseIndent() {
        writer.decreaseIndent();
    }
    function getText() {
        return writer.getText();
    }
    function rawWrite(s) {
        writer.rawWrite(s);
        setLastNonTriviaPosition(s, /*force*/ false);
    }
    function writeLiteral(s) {
        writer.writeLiteral(s);
        setLastNonTriviaPosition(s, /*force*/ true);
    }
    function getTextPos() {
        return writer.getTextPos();
    }
    function getLine() {
        return writer.getLine();
    }
    function getColumn() {
        return writer.getColumn();
    }
    function getIndent() {
        return writer.getIndent();
    }
    function isAtStartOfLine() {
        return writer.isAtStartOfLine();
    }
    function clear() {
        writer.clear();
        lastNonTriviaPosition = 0;
    }
    return {
        onBeforeEmitNode,
        onAfterEmitNode,
        onBeforeEmitNodeArray,
        onAfterEmitNodeArray,
        onBeforeEmitToken,
        onAfterEmitToken,
        write,
        writeComment,
        writeKeyword,
        writeOperator,
        writePunctuation,
        writeTrailingSemicolon,
        writeParameter,
        writeProperty,
        writeSpace,
        writeStringLiteral,
        writeSymbol,
        writeLine,
        increaseIndent,
        decreaseIndent,
        getText,
        rawWrite,
        writeLiteral,
        getTextPos,
        getLine,
        getColumn,
        getIndent,
        isAtStartOfLine,
        hasTrailingComment: () => writer.hasTrailingComment(),
        hasTrailingWhitespace: () => writer.hasTrailingWhitespace(),
        clear,
    };
}
function getInsertionPositionAtSourceFileTop(sourceFile) {
    let lastPrologue;
    for (const node of sourceFile.statements) {
        if (isPrologueDirective(node)) {
            lastPrologue = node;
        }
        else {
            break;
        }
    }
    let position = 0;
    const text = sourceFile.text;
    if (lastPrologue) {
        position = lastPrologue.end;
        advancePastLineBreak();
        return position;
    }
    const shebang = getShebang(text);
    if (shebang !== undefined) {
        position = shebang.length;
        advancePastLineBreak();
    }
    const ranges = getLeadingCommentRanges(text, position);
    if (!ranges)
        return position;
    // Find the first attached comment to the first node and add before it
    let lastComment;
    let firstNodeLine;
    for (const range of ranges) {
        if (range.kind === SyntaxKind.MultiLineCommentTrivia) {
            if (isPinnedComment(text, range.pos)) {
                lastComment = { range, pinnedOrTripleSlash: true };
                continue;
            }
        }
        else if (isRecognizedTripleSlashComment(text, range.pos, range.end)) {
            lastComment = { range, pinnedOrTripleSlash: true };
            continue;
        }
        if (lastComment) {
            // Always insert after pinned or triple slash comments
            if (lastComment.pinnedOrTripleSlash)
                break;
            // There was a blank line between the last comment and this comment.
            // This comment is not part of the copyright comments
            const commentLine = sourceFile.getLineAndCharacterOfPosition(range.pos).line;
            const lastCommentEndLine = sourceFile.getLineAndCharacterOfPosition(lastComment.range.end).line;
            if (commentLine >= lastCommentEndLine + 2)
                break;
        }
        if (sourceFile.statements.length) {
            if (firstNodeLine === undefined)
                firstNodeLine = sourceFile.getLineAndCharacterOfPosition(sourceFile.statements[0].getStart()).line;
            const commentEndLine = sourceFile.getLineAndCharacterOfPosition(range.end).line;
            if (firstNodeLine < commentEndLine + 2)
                break;
        }
        lastComment = { range, pinnedOrTripleSlash: false };
    }
    if (lastComment) {
        position = lastComment.range.end;
        advancePastLineBreak();
    }
    return position;
    function advancePastLineBreak() {
        if (position < text.length) {
            const charCode = text.charCodeAt(position);
            if (isLineBreak(charCode)) {
                position++;
                if (position < text.length && charCode === CharacterCodes.carriageReturn && text.charCodeAt(position) === CharacterCodes.lineFeed) {
                    position++;
                }
            }
        }
    }
}
/** @internal */
export function isValidLocationToAddComment(sourceFile, position) {
    return !isInComment(sourceFile, position) && !isInString(sourceFile, position) && !isInTemplateString(sourceFile, position) && !isInJSXText(sourceFile, position);
}
function needSemicolonBetween(a, b) {
    return (isPropertySignature(a) || isPropertyDeclaration(a)) && isClassOrTypeElement(b) && b.name.kind === SyntaxKind.ComputedPropertyName
        || isStatementButNotDeclaration(a) && isStatementButNotDeclaration(b); // TODO: only if b would start with a `(` or `[`
}
var deleteDeclaration;
(function (deleteDeclaration_1) {
    function deleteDeclaration(changes, deletedNodesInLists, sourceFile, node) {
        switch (node.kind) {
            case SyntaxKind.Parameter: {
                const oldFunction = node.parent;
                if (isArrowFunction(oldFunction) &&
                    oldFunction.parameters.length === 1 &&
                    !findChildOfKind(oldFunction, SyntaxKind.OpenParenToken, sourceFile)) {
                    // Lambdas with exactly one parameter are special because, after removal, there
                    // must be an empty parameter list (i.e. `()`) and this won't necessarily be the
                    // case if the parameter is simply removed (e.g. in `x => 1`).
                    changes.replaceNodeWithText(sourceFile, node, "()");
                }
                else {
                    deleteNodeInList(changes, deletedNodesInLists, sourceFile, node);
                }
                break;
            }
            case SyntaxKind.ImportDeclaration:
            case SyntaxKind.ImportEqualsDeclaration:
                const isFirstImport = sourceFile.imports.length && node === first(sourceFile.imports).parent || node === find(sourceFile.statements, isAnyImportSyntax);
                // For first import, leave header comment in place, otherwise only delete JSDoc comments
                deleteNode(changes, sourceFile, node, {
                    leadingTriviaOption: isFirstImport ? LeadingTriviaOption.Exclude : hasJSDocNodes(node) ? LeadingTriviaOption.JSDoc : LeadingTriviaOption.StartLine,
                });
                break;
            case SyntaxKind.BindingElement:
                const pattern = node.parent;
                const preserveComma = pattern.kind === SyntaxKind.ArrayBindingPattern && node !== last(pattern.elements);
                if (preserveComma) {
                    deleteNode(changes, sourceFile, node);
                }
                else {
                    deleteNodeInList(changes, deletedNodesInLists, sourceFile, node);
                }
                break;
            case SyntaxKind.VariableDeclaration:
                deleteVariableDeclaration(changes, deletedNodesInLists, sourceFile, node);
                break;
            case SyntaxKind.TypeParameter:
                deleteNodeInList(changes, deletedNodesInLists, sourceFile, node);
                break;
            case SyntaxKind.ImportSpecifier:
                const namedImports = node.parent;
                if (namedImports.elements.length === 1) {
                    deleteImportBinding(changes, sourceFile, namedImports);
                }
                else {
                    deleteNodeInList(changes, deletedNodesInLists, sourceFile, node);
                }
                break;
            case SyntaxKind.NamespaceImport:
                deleteImportBinding(changes, sourceFile, node);
                break;
            case SyntaxKind.SemicolonToken:
                deleteNode(changes, sourceFile, node, { trailingTriviaOption: TrailingTriviaOption.Exclude });
                break;
            case SyntaxKind.FunctionKeyword:
                deleteNode(changes, sourceFile, node, { leadingTriviaOption: LeadingTriviaOption.Exclude });
                break;
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.FunctionDeclaration:
                deleteNode(changes, sourceFile, node, { leadingTriviaOption: hasJSDocNodes(node) ? LeadingTriviaOption.JSDoc : LeadingTriviaOption.StartLine });
                break;
            default:
                if (!node.parent) {
                    // a misbehaving client can reach here with the SourceFile node
                    deleteNode(changes, sourceFile, node);
                }
                else if (isImportClause(node.parent) && node.parent.name === node) {
                    deleteDefaultImport(changes, sourceFile, node.parent);
                }
                else if (isCallExpression(node.parent) && contains(node.parent.arguments, node)) {
                    deleteNodeInList(changes, deletedNodesInLists, sourceFile, node);
                }
                else {
                    deleteNode(changes, sourceFile, node);
                }
        }
    }
    deleteDeclaration_1.deleteDeclaration = deleteDeclaration;
    function deleteDefaultImport(changes, sourceFile, importClause) {
        if (!importClause.namedBindings) {
            // Delete the whole import
            deleteNode(changes, sourceFile, importClause.parent);
        }
        else {
            // import |d,| * as ns from './file'
            const start = importClause.name.getStart(sourceFile);
            const nextToken = getTokenAtPosition(sourceFile, importClause.name.end);
            if (nextToken && nextToken.kind === SyntaxKind.CommaToken) {
                // shift first non-whitespace position after comma to the start position of the node
                const end = skipTrivia(sourceFile.text, nextToken.end, /*stopAfterLineBreak*/ false, /*stopAtComments*/ true);
                changes.deleteRange(sourceFile, { pos: start, end });
            }
            else {
                deleteNode(changes, sourceFile, importClause.name);
            }
        }
    }
    function deleteImportBinding(changes, sourceFile, node) {
        if (node.parent.name) {
            // Delete named imports while preserving the default import
            // import d|, * as ns| from './file'
            // import d|, { a }| from './file'
            const previousToken = Debug.checkDefined(getTokenAtPosition(sourceFile, node.pos - 1));
            changes.deleteRange(sourceFile, { pos: previousToken.getStart(sourceFile), end: node.end });
        }
        else {
            // Delete the entire import declaration
            // |import * as ns from './file'|
            // |import { a } from './file'|
            const importDecl = getAncestor(node, SyntaxKind.ImportDeclaration);
            deleteNode(changes, sourceFile, importDecl);
        }
    }
    function deleteVariableDeclaration(changes, deletedNodesInLists, sourceFile, node) {
        const { parent } = node;
        if (parent.kind === SyntaxKind.CatchClause) {
            // TODO: There's currently no unused diagnostic for this, could be a suggestion
            changes.deleteNodeRange(sourceFile, findChildOfKind(parent, SyntaxKind.OpenParenToken, sourceFile), findChildOfKind(parent, SyntaxKind.CloseParenToken, sourceFile));
            return;
        }
        if (parent.declarations.length !== 1) {
            deleteNodeInList(changes, deletedNodesInLists, sourceFile, node);
            return;
        }
        const gp = parent.parent;
        switch (gp.kind) {
            case SyntaxKind.ForOfStatement:
            case SyntaxKind.ForInStatement:
                changes.replaceNode(sourceFile, node, factory.createObjectLiteralExpression());
                break;
            case SyntaxKind.ForStatement:
                deleteNode(changes, sourceFile, parent);
                break;
            case SyntaxKind.VariableStatement:
                deleteNode(changes, sourceFile, gp, { leadingTriviaOption: hasJSDocNodes(gp) ? LeadingTriviaOption.JSDoc : LeadingTriviaOption.StartLine });
                break;
            default:
                Debug.assertNever(gp);
        }
    }
})(deleteDeclaration || (deleteDeclaration = {}));
// Exported for tests only! (TODO: improve tests to not need this)
/**
 * Warning: This deletes comments too. See `copyComments` in `convertFunctionToEs6Class`.
 *
 * @internal
 */
export function deleteNode(changes, sourceFile, node, options = { leadingTriviaOption: LeadingTriviaOption.IncludeAll }) {
    const startPosition = getAdjustedStartPosition(sourceFile, node, options);
    const endPosition = getAdjustedEndPosition(sourceFile, node, options);
    changes.deleteRange(sourceFile, { pos: startPosition, end: endPosition });
}
function deleteNodeInList(changes, deletedNodesInLists, sourceFile, node) {
    const containingList = Debug.checkDefined(formatting.SmartIndenter.getContainingList(node, sourceFile));
    const index = indexOfNode(containingList, node);
    Debug.assert(index !== -1);
    if (containingList.length === 1) {
        deleteNode(changes, sourceFile, node);
        return;
    }
    // Note: We will only delete a comma *after* a node. This will leave a trailing comma if we delete the last node.
    // That's handled in the end by `finishTrailingCommaAfterDeletingNodesInList`.
    Debug.assert(!deletedNodesInLists.has(node), "Deleting a node twice");
    deletedNodesInLists.add(node);
    changes.deleteRange(sourceFile, {
        pos: startPositionToDeleteNodeInList(sourceFile, node),
        end: index === containingList.length - 1 ? getAdjustedEndPosition(sourceFile, node, {}) : endPositionToDeleteNodeInList(sourceFile, node, containingList[index - 1], containingList[index + 1]),
    });
}
