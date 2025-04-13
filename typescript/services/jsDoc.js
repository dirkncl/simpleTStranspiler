import {
  arrayIsEqualTo,
  AssignmentDeclarationKind,
  buildLinkParts,
  Completions,
  concatenate,
  contains,
  emptyArray,
  find,
  findAncestor,
  flatMap,
  flatten,
  forEach,
  forEachAncestor,
  forEachReturnStatement,
  forEachUnique,
  getAssignmentDeclarationKind,
  getJSDocCommentsAndTags,
  getJSDocTags,
  getLineStartPositionForPosition,
  getTokenAtPosition,
  hasJSDocNodes,
  hasJSFileExtension,
  intersperse,
  isArrowFunction,
  isBlock,
  isConstructorDeclaration,
  isExpression,
  isFunctionExpression,
  isFunctionLike,
  isFunctionLikeDeclaration,
  isFunctionTypeNode,
  isIdentifier,
  isJSDoc,
  isJSDocOverloadTag,
  isJSDocParameterTag,
  isJSDocPropertyLikeTag,
  isJSDocTypeLiteral,
  isWhiteSpaceSingleLine,
  lastOrUndefined,
  length,
  lineBreakPart,
  map,
  mapDefined,
  parameterNamePart,
  propertyNamePart,
  punctuationPart,
  ScriptElementKind,
  spacePart,
  startsWith,
  SyntaxKind,
  textPart,
  typeAliasNamePart,
  typeParameterNamePart,
} from "./_namespaces/ts.js";


const jsDocTagNames = [
    "abstract",
    "access",
    "alias",
    "argument",
    "async",
    "augments",
    "author",
    "borrows",
    "callback",
    "class",
    "classdesc",
    "constant",
    "constructor",
    "constructs",
    "copyright",
    "default",
    "deprecated",
    "description",
    "emits",
    "enum",
    "event",
    "example",
    "exports",
    "extends",
    "external",
    "field",
    "file",
    "fileoverview",
    "fires",
    "function",
    "generator",
    "global",
    "hideconstructor",
    "host",
    "ignore",
    "implements",
    "import",
    "inheritdoc",
    "inner",
    "instance",
    "interface",
    "kind",
    "lends",
    "license",
    "link",
    "linkcode",
    "linkplain",
    "listens",
    "member",
    "memberof",
    "method",
    "mixes",
    "module",
    "name",
    "namespace",
    "overload",
    "override",
    "package",
    "param",
    "private",
    "prop",
    "property",
    "protected",
    "public",
    "readonly",
    "requires",
    "returns",
    "satisfies",
    "see",
    "since",
    "static",
    "summary",
    "template",
    "this",
    "throws",
    "todo",
    "tutorial",
    "type",
    "typedef",
    "var",
    "variation",
    "version",
    "virtual",
    "yields",
];
let jsDocTagNameCompletionEntries;
let jsDocTagCompletionEntries;
/** @internal */
export function getJsDocCommentsFromDeclarations(declarations, checker) {
    // Only collect doc comments from duplicate declarations once:
    // In case of a union property there might be same declaration multiple times
    // which only varies in type parameter
    // Eg. const a: Array<string> | Array<number>; a.length
    // The property length will have two declarations of property length coming
    // from Array<T> - Array<string> and Array<number>
    const parts = [];
    forEachUnique(declarations, declaration => {
        for (const jsdoc of getCommentHavingNodes(declaration)) {
            const inheritDoc = isJSDoc(jsdoc) && jsdoc.tags && find(jsdoc.tags, t => t.kind === SyntaxKind.JSDocTag && (t.tagName.escapedText === "inheritDoc" || t.tagName.escapedText === "inheritdoc"));
            // skip comments containing @typedefs since they're not associated with particular declarations
            // Exceptions:
            // - @typedefs are themselves declarations with associated comments
            // - @param or @return indicate that the author thinks of it as a 'local' @typedef that's part of the function documentation
            if (jsdoc.comment === undefined && !inheritDoc
                || isJSDoc(jsdoc)
                    && declaration.kind !== SyntaxKind.JSDocTypedefTag && declaration.kind !== SyntaxKind.JSDocCallbackTag
                    && jsdoc.tags
                    && jsdoc.tags.some(t => t.kind === SyntaxKind.JSDocTypedefTag || t.kind === SyntaxKind.JSDocCallbackTag)
                    && !jsdoc.tags.some(t => t.kind === SyntaxKind.JSDocParameterTag || t.kind === SyntaxKind.JSDocReturnTag)) {
                continue;
            }
            let newparts = jsdoc.comment ? getDisplayPartsFromComment(jsdoc.comment, checker) : [];
            if (inheritDoc && inheritDoc.comment) {
                newparts = newparts.concat(getDisplayPartsFromComment(inheritDoc.comment, checker));
            }
            if (!contains(parts, newparts, isIdenticalListOfDisplayParts)) {
                parts.push(newparts);
            }
        }
    });
    return flatten(intersperse(parts, [lineBreakPart()]));
}
function isIdenticalListOfDisplayParts(parts1, parts2) {
    return arrayIsEqualTo(parts1, parts2, (p1, p2) => p1.kind === p2.kind && p1.text === p2.text);
}
function getCommentHavingNodes(declaration) {
    switch (declaration.kind) {
        case SyntaxKind.JSDocParameterTag:
        case SyntaxKind.JSDocPropertyTag:
            return [declaration];
        case SyntaxKind.JSDocCallbackTag:
        case SyntaxKind.JSDocTypedefTag:
            return [declaration, declaration.parent];
        case SyntaxKind.JSDocSignature:
            if (isJSDocOverloadTag(declaration.parent)) {
                return [declaration.parent.parent];
            }
        // falls through
        default:
            return getJSDocCommentsAndTags(declaration);
    }
}
/** @internal */
export function getJsDocTagsFromDeclarations(declarations, checker) {
    // Only collect doc comments from duplicate declarations once.
    const infos = [];
    forEachUnique(declarations, declaration => {
        const tags = getJSDocTags(declaration);
        // skip comments containing @typedefs since they're not associated with particular declarations
        // Exceptions:
        // - @param or @return indicate that the author thinks of it as a 'local' @typedef that's part of the function documentation
        if (tags.some(t => t.kind === SyntaxKind.JSDocTypedefTag || t.kind === SyntaxKind.JSDocCallbackTag)
            && !tags.some(t => t.kind === SyntaxKind.JSDocParameterTag || t.kind === SyntaxKind.JSDocReturnTag)) {
            return;
        }
        for (const tag of tags) {
            infos.push({ name: tag.tagName.text, text: getCommentDisplayParts(tag, checker) });
            infos.push(...getJSDocPropertyTagsInfo(tryGetJSDocPropertyTags(tag), checker));
        }
    });
    return infos;
}
function getJSDocPropertyTagsInfo(nodes, checker) {
    return flatMap(nodes, propTag => concatenate([{ name: propTag.tagName.text, text: getCommentDisplayParts(propTag, checker) }], getJSDocPropertyTagsInfo(tryGetJSDocPropertyTags(propTag), checker)));
}
function tryGetJSDocPropertyTags(node) {
    return isJSDocPropertyLikeTag(node) && node.isNameFirst && node.typeExpression &&
        isJSDocTypeLiteral(node.typeExpression.type) ? node.typeExpression.type.jsDocPropertyTags : undefined;
}
function getDisplayPartsFromComment(comment, checker) {
    if (typeof comment === "string") {
        return [textPart(comment)];
    }
    return flatMap(comment, node => node.kind === SyntaxKind.JSDocText ? [textPart(node.text)] : buildLinkParts(node, checker));
}
function getCommentDisplayParts(tag, checker) {
    const { comment, kind } = tag;
    const namePart = getTagNameDisplayPart(kind);
    switch (kind) {
        case SyntaxKind.JSDocThrowsTag:
            const typeExpression = tag.typeExpression;
            return typeExpression ? withNode(typeExpression) :
                comment === undefined ? undefined : getDisplayPartsFromComment(comment, checker);
        case SyntaxKind.JSDocImplementsTag:
            return withNode(tag.class);
        case SyntaxKind.JSDocAugmentsTag:
            return withNode(tag.class);
        case SyntaxKind.JSDocTemplateTag:
            const templateTag = tag;
            const displayParts = [];
            if (templateTag.constraint) {
                displayParts.push(textPart(templateTag.constraint.getText()));
            }
            if (length(templateTag.typeParameters)) {
                if (length(displayParts)) {
                    displayParts.push(spacePart());
                }
                const lastTypeParameter = templateTag.typeParameters[templateTag.typeParameters.length - 1];
                forEach(templateTag.typeParameters, tp => {
                    displayParts.push(namePart(tp.getText()));
                    if (lastTypeParameter !== tp) {
                        displayParts.push(...[punctuationPart(SyntaxKind.CommaToken), spacePart()]);
                    }
                });
            }
            if (comment) {
                displayParts.push(...[spacePart(), ...getDisplayPartsFromComment(comment, checker)]);
            }
            return displayParts;
        case SyntaxKind.JSDocTypeTag:
        case SyntaxKind.JSDocSatisfiesTag:
            return withNode(tag.typeExpression);
        case SyntaxKind.JSDocTypedefTag:
        case SyntaxKind.JSDocCallbackTag:
        case SyntaxKind.JSDocPropertyTag:
        case SyntaxKind.JSDocParameterTag:
        case SyntaxKind.JSDocSeeTag:
            const { name } = tag;
            return name ? withNode(name)
                : comment === undefined ? undefined
                    : getDisplayPartsFromComment(comment, checker);
        default:
            return comment === undefined ? undefined : getDisplayPartsFromComment(comment, checker);
    }
    function withNode(node) {
        return addComment(node.getText());
    }
    function addComment(s) {
        if (comment) {
            if (s.match(/^https?$/)) {
                return [textPart(s), ...getDisplayPartsFromComment(comment, checker)];
            }
            else {
                return [namePart(s), spacePart(), ...getDisplayPartsFromComment(comment, checker)];
            }
        }
        else {
            return [textPart(s)];
        }
    }
}
function getTagNameDisplayPart(kind) {
    switch (kind) {
        case SyntaxKind.JSDocParameterTag:
            return parameterNamePart;
        case SyntaxKind.JSDocPropertyTag:
            return propertyNamePart;
        case SyntaxKind.JSDocTemplateTag:
            return typeParameterNamePart;
        case SyntaxKind.JSDocTypedefTag:
        case SyntaxKind.JSDocCallbackTag:
            return typeAliasNamePart;
        default:
            return textPart;
    }
}
/** @internal */
export function getJSDocTagNameCompletions() {
    return jsDocTagNameCompletionEntries || (jsDocTagNameCompletionEntries = map(jsDocTagNames, tagName => {
        return {
            name: tagName,
            kind: ScriptElementKind.keyword,
            kindModifiers: "",
            sortText: Completions.SortText.LocationPriority,
        };
    }));
}
/** @internal */
export const getJSDocTagNameCompletionDetails = getJSDocTagCompletionDetails;
/** @internal */
export function getJSDocTagCompletions() {
    return jsDocTagCompletionEntries || (jsDocTagCompletionEntries = map(jsDocTagNames, tagName => {
        return {
            name: `@${tagName}`,
            kind: ScriptElementKind.keyword,
            kindModifiers: "",
            sortText: Completions.SortText.LocationPriority,
        };
    }));
}
/** @internal */
export function getJSDocTagCompletionDetails(name) {
    return {
        name,
        kind: ScriptElementKind.unknown, // TODO: should have its own kind?
        kindModifiers: "",
        displayParts: [textPart(name)],
        documentation: emptyArray,
        tags: undefined,
        codeActions: undefined,
    };
}
/** @internal */
export function getJSDocParameterNameCompletions(tag) {
    if (!isIdentifier(tag.name)) {
        return emptyArray;
    }
    const nameThusFar = tag.name.text;
    const jsdoc = tag.parent;
    const fn = jsdoc.parent;
    if (!isFunctionLike(fn))
        return [];
    return mapDefined(fn.parameters, param => {
        if (!isIdentifier(param.name))
            return undefined;
        const name = param.name.text;
        if (jsdoc.tags.some(t => t !== tag && isJSDocParameterTag(t) && isIdentifier(t.name) && t.name.escapedText === name) // TODO: GH#18217
            || nameThusFar !== undefined && !startsWith(name, nameThusFar)) {
            return undefined;
        }
        return { name, kind: ScriptElementKind.parameterElement, kindModifiers: "", sortText: Completions.SortText.LocationPriority };
    });
}
/** @internal */
export function getJSDocParameterNameCompletionDetails(name) {
    return {
        name,
        kind: ScriptElementKind.parameterElement,
        kindModifiers: "",
        displayParts: [textPart(name)],
        documentation: emptyArray,
        tags: undefined,
        codeActions: undefined,
    };
}
/**
 * Checks if position points to a valid position to add JSDoc comments, and if so,
 * returns the appropriate template. Otherwise returns an empty string.
 * Valid positions are
 *      - outside of comments, statements, and expressions, and
 *      - preceding a:
 *          - function/constructor/method declaration
 *          - class declarations
 *          - variable statements
 *          - namespace declarations
 *          - interface declarations
 *          - method signatures
 *          - type alias declarations
 *
 * Hosts should ideally check that:
 * - The line is all whitespace up to 'position' before performing the insertion.
 * - If the keystroke sequence "/\*\*" induced the call, we also check that the next
 * non-whitespace character is '*', which (approximately) indicates whether we added
 * the second '*' to complete an existing (JSDoc) comment.
 * @param fileName The file in which to perform the check.
 * @param position The (character-indexed) position in the file where the check should
 * be performed.
 *
 * @internal
 */
export function getDocCommentTemplateAtPosition(newLine, sourceFile, position, options) {
    const tokenAtPos = getTokenAtPosition(sourceFile, position);
    const existingDocComment = findAncestor(tokenAtPos, isJSDoc);
    if (existingDocComment && (existingDocComment.comment !== undefined || length(existingDocComment.tags))) {
        // Non-empty comment already exists.
        return undefined;
    }
    const tokenStart = tokenAtPos.getStart(sourceFile);
    // Don't provide a doc comment template based on a *previous* node. (But an existing empty jsdoc comment will likely start before `position`.)
    if (!existingDocComment && tokenStart < position) {
        return undefined;
    }
    const commentOwnerInfo = getCommentOwnerInfo(tokenAtPos, options);
    if (!commentOwnerInfo) {
        return undefined;
    }
    const { commentOwner, parameters, hasReturn } = commentOwnerInfo;
    const commentOwnerJsDoc = hasJSDocNodes(commentOwner) && commentOwner.jsDoc ? commentOwner.jsDoc : undefined;
    const lastJsDoc = lastOrUndefined(commentOwnerJsDoc);
    if (commentOwner.getStart(sourceFile) < position
        || lastJsDoc
            && existingDocComment
            && lastJsDoc !== existingDocComment) {
        return undefined;
    }
    const indentationStr = getIndentationStringAtPosition(sourceFile, position);
    const isJavaScriptFile = hasJSFileExtension(sourceFile.fileName);
    const tags = (parameters ? parameterDocComments(parameters || [], isJavaScriptFile, indentationStr, newLine) : "") +
        (hasReturn ? returnsDocComment(indentationStr, newLine) : "");
    // A doc comment consists of the following
    // * The opening comment line
    // * the first line (without a param) for the object's untagged info (this is also where the caret ends up)
    // * the '@param'-tagged lines
    // * the '@returns'-tag
    // * TODO: other tags.
    // * the closing comment line
    // * if the caret was directly in front of the object, then we add an extra line and indentation.
    const openComment = "/**";
    const closeComment = " */";
    const hasTag = length(getJSDocTags(commentOwner)) > 0;
    if (tags && !hasTag) {
        const preamble = openComment + newLine + indentationStr + " * ";
        const endLine = tokenStart === position ? newLine + indentationStr : "";
        const result = preamble + newLine + tags + indentationStr + closeComment + endLine;
        return { newText: result, caretOffset: preamble.length };
    }
    return { newText: openComment + closeComment, caretOffset: 3 };
}
function getIndentationStringAtPosition(sourceFile, position) {
    const { text } = sourceFile;
    const lineStart = getLineStartPositionForPosition(position, sourceFile);
    let pos = lineStart;
    for (; pos <= position && isWhiteSpaceSingleLine(text.charCodeAt(pos)); pos++)
        ;
    return text.slice(lineStart, pos);
}
function parameterDocComments(parameters, isJavaScriptFile, indentationStr, newLine) {
    return parameters.map(({ name, dotDotDotToken }, i) => {
        const paramName = name.kind === SyntaxKind.Identifier ? name.text : "param" + i;
        const type = isJavaScriptFile ? (dotDotDotToken ? "{...any} " : "{any} ") : "";
        return `${indentationStr} * @param ${type}${paramName}${newLine}`;
    }).join("");
}
function returnsDocComment(indentationStr, newLine) {
    return `${indentationStr} * @returns${newLine}`;
}
function getCommentOwnerInfo(tokenAtPos, options) {
    return forEachAncestor(tokenAtPos, n => getCommentOwnerInfoWorker(n, options));
}
function getCommentOwnerInfoWorker(commentOwner, options) {
    switch (commentOwner.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.Constructor:
        case SyntaxKind.MethodSignature:
        case SyntaxKind.ArrowFunction:
            const host = commentOwner;
            return { commentOwner, parameters: host.parameters, hasReturn: hasReturn(host, options) };
        case SyntaxKind.PropertyAssignment:
            return getCommentOwnerInfoWorker(commentOwner.initializer, options);
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.EnumMember:
        case SyntaxKind.TypeAliasDeclaration:
            return { commentOwner };
        case SyntaxKind.PropertySignature: {
            const host = commentOwner;
            return host.type && isFunctionTypeNode(host.type)
                ? { commentOwner, parameters: host.type.parameters, hasReturn: hasReturn(host.type, options) }
                : { commentOwner };
        }
        case SyntaxKind.VariableStatement: {
            const varStatement = commentOwner;
            const varDeclarations = varStatement.declarationList.declarations;
            const host = varDeclarations.length === 1 && varDeclarations[0].initializer
                ? getRightHandSideOfAssignment(varDeclarations[0].initializer)
                : undefined;
            return host
                ? { commentOwner, parameters: host.parameters, hasReturn: hasReturn(host, options) }
                : { commentOwner };
        }
        case SyntaxKind.SourceFile:
            return "quit";
        case SyntaxKind.ModuleDeclaration:
            // If in walking up the tree, we hit a a nested namespace declaration,
            // then we must be somewhere within a dotted namespace name; however we don't
            // want to give back a JSDoc template for the 'b' or 'c' in 'namespace a.b.c { }'.
            return commentOwner.parent.kind === SyntaxKind.ModuleDeclaration ? undefined : { commentOwner };
        case SyntaxKind.ExpressionStatement:
            return getCommentOwnerInfoWorker(commentOwner.expression, options);
        case SyntaxKind.BinaryExpression: {
            const be = commentOwner;
            if (getAssignmentDeclarationKind(be) === AssignmentDeclarationKind.None) {
                return "quit";
            }
            return isFunctionLike(be.right)
                ? { commentOwner, parameters: be.right.parameters, hasReturn: hasReturn(be.right, options) }
                : { commentOwner };
        }
        case SyntaxKind.PropertyDeclaration:
            const init = commentOwner.initializer;
            if (init && (isFunctionExpression(init) || isArrowFunction(init))) {
                return { commentOwner, parameters: init.parameters, hasReturn: hasReturn(init, options) };
            }
    }
}
function hasReturn(node, options) {
    return !!(options === null || options === void 0 ? void 0 : options.generateReturnInDocTemplate) &&
        (isFunctionTypeNode(node) || isArrowFunction(node) && isExpression(node.body)
            || isFunctionLikeDeclaration(node) && node.body && isBlock(node.body) && !!forEachReturnStatement(node.body, n => n));
}
function getRightHandSideOfAssignment(rightHandSide) {
    while (rightHandSide.kind === SyntaxKind.ParenthesizedExpression) {
        rightHandSide = rightHandSide.expression;
    }
    switch (rightHandSide.kind) {
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
            return rightHandSide;
        case SyntaxKind.ClassExpression:
            return find(rightHandSide.members, isConstructorDeclaration);
    }
}
