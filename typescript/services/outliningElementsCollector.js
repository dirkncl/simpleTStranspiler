import {
  createTextSpanFromBounds,
  createTextSpanFromNode,
  createTextSpanFromRange,
  Debug,
  findChildOfKind,
  getLeadingCommentRanges,
  isAnyImportSyntax,
  isArrayLiteralExpression,
  isBinaryExpression,
  isBindingElement,
  isBlock,
  isCallExpression,
  isCallOrNewExpression,
  isClassLike,
  isDeclaration,
  isFunctionLike,
  isIfStatement,
  isInComment,
  isInterfaceDeclaration,
  isJsxText,
  isModuleBlock,
  isNodeArrayMultiLine,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isReturnStatement,
  isTupleTypeNode,
  isVariableStatement,
  OutliningSpanKind,
  positionsAreOnSameLine,
  startsWith,
  SyntaxKind,
} from "./namespaces/ts.js";

/** @internal */
export function collectElements(sourceFile, cancellationToken) {
    const res = [];
    addNodeOutliningSpans(sourceFile, cancellationToken, res);
    addRegionOutliningSpans(sourceFile, res);
    res.sort((span1, span2) => span1.textSpan.start - span2.textSpan.start);
    return res;
}
function addNodeOutliningSpans(sourceFile, cancellationToken, out) {
    let depthRemaining = 40;
    let current = 0;
    // Includes the EOF Token so that comments which aren't attached to statements are included
    const statements = [...sourceFile.statements, sourceFile.endOfFileToken];
    const n = statements.length;
    while (current < n) {
        while (current < n && !isAnyImportSyntax(statements[current])) {
            visitNode(statements[current]);
            current++;
        }
        if (current === n)
            break;
        const firstImport = current;
        while (current < n && isAnyImportSyntax(statements[current])) {
            visitNode(statements[current]);
            current++;
        }
        const lastImport = current - 1;
        if (lastImport !== firstImport) {
            out.push(createOutliningSpanFromBounds(findChildOfKind(statements[firstImport], SyntaxKind.ImportKeyword, sourceFile).getStart(sourceFile), statements[lastImport].getEnd(), OutliningSpanKind.Imports));
        }
    }
    function visitNode(n) {
        var _a;
        if (depthRemaining === 0)
            return;
        cancellationToken.throwIfCancellationRequested();
        if (isDeclaration(n) || isVariableStatement(n) || isReturnStatement(n) || isCallOrNewExpression(n) || n.kind === SyntaxKind.EndOfFileToken) {
            addOutliningForLeadingCommentsForNode(n, sourceFile, cancellationToken, out);
        }
        if (isFunctionLike(n) && isBinaryExpression(n.parent) && isPropertyAccessExpression(n.parent.left)) {
            addOutliningForLeadingCommentsForNode(n.parent.left, sourceFile, cancellationToken, out);
        }
        if (isBlock(n) || isModuleBlock(n)) {
            addOutliningForLeadingCommentsForPos(n.statements.end, sourceFile, cancellationToken, out);
        }
        if (isClassLike(n) || isInterfaceDeclaration(n)) {
            addOutliningForLeadingCommentsForPos(n.members.end, sourceFile, cancellationToken, out);
        }
        const span = getOutliningSpanForNode(n, sourceFile);
        if (span)
            out.push(span);
        depthRemaining--;
        if (isCallExpression(n)) {
            depthRemaining++;
            visitNode(n.expression);
            depthRemaining--;
            n.arguments.forEach(visitNode);
            (_a = n.typeArguments) === null || _a === void 0 ? void 0 : _a.forEach(visitNode);
        }
        else if (isIfStatement(n) && n.elseStatement && isIfStatement(n.elseStatement)) {
            // Consider an 'else if' to be on the same depth as the 'if'.
            visitNode(n.expression);
            visitNode(n.thenStatement);
            depthRemaining++;
            visitNode(n.elseStatement);
            depthRemaining--;
        }
        else {
            n.forEachChild(visitNode);
        }
        depthRemaining++;
    }
}
function addRegionOutliningSpans(sourceFile, out) {
    const regions = [];
    const lineStarts = sourceFile.getLineStarts();
    for (const currentLineStart of lineStarts) {
        const lineEnd = sourceFile.getLineEndOfPosition(currentLineStart);
        const lineText = sourceFile.text.substring(currentLineStart, lineEnd);
        const result = parseRegionDelimiter(lineText);
        if (!result || isInComment(sourceFile, currentLineStart)) {
            continue;
        }
        if (result.isStart) {
            const span = createTextSpanFromBounds(sourceFile.text.indexOf("//", currentLineStart), lineEnd);
            regions.push(createOutliningSpan(span, OutliningSpanKind.Region, span, /*autoCollapse*/ false, result.name || "#region"));
        }
        else {
            const region = regions.pop();
            if (region) {
                region.textSpan.length = lineEnd - region.textSpan.start;
                region.hintSpan.length = lineEnd - region.textSpan.start;
                out.push(region);
            }
        }
    }
}
const regionDelimiterRegExp = /^#(end)?region(.*)\r?$/;
function parseRegionDelimiter(lineText) {
    // We trim the leading whitespace and // without the regex since the
    // multiple potential whitespace matches can make for some gnarly backtracking behavior
    lineText = lineText.trimStart();
    if (!startsWith(lineText, "//")) {
        return null; // eslint-disable-line no-restricted-syntax
    }
    lineText = lineText.slice(2).trim();
    const result = regionDelimiterRegExp.exec(lineText);
    if (result) {
        return { isStart: !result[1], name: result[2].trim() };
    }
    return undefined;
}
function addOutliningForLeadingCommentsForPos(pos, sourceFile, cancellationToken, out) {
    const comments = getLeadingCommentRanges(sourceFile.text, pos);
    if (!comments)
        return;
    let firstSingleLineCommentStart = -1;
    let lastSingleLineCommentEnd = -1;
    let singleLineCommentCount = 0;
    const sourceText = sourceFile.getFullText();
    for (const { kind, pos, end } of comments) {
        cancellationToken.throwIfCancellationRequested();
        switch (kind) {
            case SyntaxKind.SingleLineCommentTrivia:
                // never fold region delimiters into single-line comment regions
                const commentText = sourceText.slice(pos, end);
                if (parseRegionDelimiter(commentText)) {
                    combineAndAddMultipleSingleLineComments();
                    singleLineCommentCount = 0;
                    break;
                }
                // For single line comments, combine consecutive ones (2 or more) into
                // a single span from the start of the first till the end of the last
                if (singleLineCommentCount === 0) {
                    firstSingleLineCommentStart = pos;
                }
                lastSingleLineCommentEnd = end;
                singleLineCommentCount++;
                break;
            case SyntaxKind.MultiLineCommentTrivia:
                combineAndAddMultipleSingleLineComments();
                out.push(createOutliningSpanFromBounds(pos, end, OutliningSpanKind.Comment));
                singleLineCommentCount = 0;
                break;
            default:
                Debug.assertNever(kind);
        }
    }
    combineAndAddMultipleSingleLineComments();
    function combineAndAddMultipleSingleLineComments() {
        // Only outline spans of two or more consecutive single line comments
        if (singleLineCommentCount > 1) {
            out.push(createOutliningSpanFromBounds(firstSingleLineCommentStart, lastSingleLineCommentEnd, OutliningSpanKind.Comment));
        }
    }
}
function addOutliningForLeadingCommentsForNode(n, sourceFile, cancellationToken, out) {
    if (isJsxText(n))
        return;
    addOutliningForLeadingCommentsForPos(n.pos, sourceFile, cancellationToken, out);
}
function createOutliningSpanFromBounds(pos, end, kind) {
    return createOutliningSpan(createTextSpanFromBounds(pos, end), kind);
}
function getOutliningSpanForNode(n, sourceFile) {
    switch (n.kind) {
        case SyntaxKind.Block:
            if (isFunctionLike(n.parent)) {
                return functionSpan(n.parent, n, sourceFile);
            }
            // Check if the block is standalone, or 'attached' to some parent statement.
            // If the latter, we want to collapse the block, but consider its hint span
            // to be the entire span of the parent.
            switch (n.parent.kind) {
                case SyntaxKind.DoStatement:
                case SyntaxKind.ForInStatement:
                case SyntaxKind.ForOfStatement:
                case SyntaxKind.ForStatement:
                case SyntaxKind.IfStatement:
                case SyntaxKind.WhileStatement:
                case SyntaxKind.WithStatement:
                case SyntaxKind.CatchClause:
                    return spanForNode(n.parent);
                case SyntaxKind.TryStatement:
                    // Could be the try-block, or the finally-block.
                    const tryStatement = n.parent;
                    if (tryStatement.tryBlock === n) {
                        return spanForNode(n.parent);
                    }
                    else if (tryStatement.finallyBlock === n) {
                        const node = findChildOfKind(tryStatement, SyntaxKind.FinallyKeyword, sourceFile);
                        if (node)
                            return spanForNode(node);
                    }
                // falls through
                default:
                    // Block was a standalone block.  In this case we want to only collapse
                    // the span of the block, independent of any parent span.
                    return createOutliningSpan(createTextSpanFromNode(n, sourceFile), OutliningSpanKind.Code);
            }
        case SyntaxKind.ModuleBlock:
            return spanForNode(n.parent);
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ClassExpression:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.CaseBlock:
        case SyntaxKind.TypeLiteral:
        case SyntaxKind.ObjectBindingPattern:
            return spanForNode(n);
        case SyntaxKind.TupleType:
            return spanForNode(n, /*autoCollapse*/ false, /*useFullStart*/ !isTupleTypeNode(n.parent), SyntaxKind.OpenBracketToken);
        case SyntaxKind.CaseClause:
        case SyntaxKind.DefaultClause:
            return spanForNodeArray(n.statements);
        case SyntaxKind.ObjectLiteralExpression:
            return spanForObjectOrArrayLiteral(n);
        case SyntaxKind.ArrayLiteralExpression:
            return spanForObjectOrArrayLiteral(n, SyntaxKind.OpenBracketToken);
        case SyntaxKind.JsxElement:
            return spanForJSXElement(n);
        case SyntaxKind.JsxFragment:
            return spanForJSXFragment(n);
        case SyntaxKind.JsxSelfClosingElement:
        case SyntaxKind.JsxOpeningElement:
            return spanForJSXAttributes(n.attributes);
        case SyntaxKind.TemplateExpression:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
            return spanForTemplateLiteral(n);
        case SyntaxKind.ArrayBindingPattern:
            return spanForNode(n, /*autoCollapse*/ false, /*useFullStart*/ !isBindingElement(n.parent), SyntaxKind.OpenBracketToken);
        case SyntaxKind.ArrowFunction:
            return spanForArrowFunction(n);
        case SyntaxKind.CallExpression:
            return spanForCallExpression(n);
        case SyntaxKind.ParenthesizedExpression:
            return spanForParenthesizedExpression(n);
        case SyntaxKind.NamedImports:
        case SyntaxKind.NamedExports:
        case SyntaxKind.ImportAttributes:
            return spanForImportExportElements(n);
    }
    function spanForImportExportElements(node) {
        if (!node.elements.length) {
            return undefined;
        }
        const openToken = findChildOfKind(node, SyntaxKind.OpenBraceToken, sourceFile);
        const closeToken = findChildOfKind(node, SyntaxKind.CloseBraceToken, sourceFile);
        if (!openToken || !closeToken || positionsAreOnSameLine(openToken.pos, closeToken.pos, sourceFile)) {
            return undefined;
        }
        return spanBetweenTokens(openToken, closeToken, node, sourceFile, /*autoCollapse*/ false, /*useFullStart*/ false);
    }
    function spanForCallExpression(node) {
        if (!node.arguments.length) {
            return undefined;
        }
        const openToken = findChildOfKind(node, SyntaxKind.OpenParenToken, sourceFile);
        const closeToken = findChildOfKind(node, SyntaxKind.CloseParenToken, sourceFile);
        if (!openToken || !closeToken || positionsAreOnSameLine(openToken.pos, closeToken.pos, sourceFile)) {
            return undefined;
        }
        return spanBetweenTokens(openToken, closeToken, node, sourceFile, /*autoCollapse*/ false, /*useFullStart*/ true);
    }
    function spanForArrowFunction(node) {
        if (isBlock(node.body) || isParenthesizedExpression(node.body) || positionsAreOnSameLine(node.body.getFullStart(), node.body.getEnd(), sourceFile)) {
            return undefined;
        }
        const textSpan = createTextSpanFromBounds(node.body.getFullStart(), node.body.getEnd());
        return createOutliningSpan(textSpan, OutliningSpanKind.Code, createTextSpanFromNode(node));
    }
    function spanForJSXElement(node) {
        const textSpan = createTextSpanFromBounds(node.openingElement.getStart(sourceFile), node.closingElement.getEnd());
        const tagName = node.openingElement.tagName.getText(sourceFile);
        const bannerText = "<" + tagName + ">...</" + tagName + ">";
        return createOutliningSpan(textSpan, OutliningSpanKind.Code, textSpan, /*autoCollapse*/ false, bannerText);
    }
    function spanForJSXFragment(node) {
        const textSpan = createTextSpanFromBounds(node.openingFragment.getStart(sourceFile), node.closingFragment.getEnd());
        const bannerText = "<>...</>";
        return createOutliningSpan(textSpan, OutliningSpanKind.Code, textSpan, /*autoCollapse*/ false, bannerText);
    }
    function spanForJSXAttributes(node) {
        if (node.properties.length === 0) {
            return undefined;
        }
        return createOutliningSpanFromBounds(node.getStart(sourceFile), node.getEnd(), OutliningSpanKind.Code);
    }
    function spanForTemplateLiteral(node) {
        if (node.kind === SyntaxKind.NoSubstitutionTemplateLiteral && node.text.length === 0) {
            return undefined;
        }
        return createOutliningSpanFromBounds(node.getStart(sourceFile), node.getEnd(), OutliningSpanKind.Code);
    }
    function spanForObjectOrArrayLiteral(node, open = SyntaxKind.OpenBraceToken) {
        // If the block has no leading keywords and is inside an array literal or call expression,
        // we only want to collapse the span of the block.
        // Otherwise, the collapsed section will include the end of the previous line.
        return spanForNode(node, /*autoCollapse*/ false, /*useFullStart*/ !isArrayLiteralExpression(node.parent) && !isCallExpression(node.parent), open);
    }
    function spanForNode(hintSpanNode, autoCollapse = false, useFullStart = true, open = SyntaxKind.OpenBraceToken, close = open === SyntaxKind.OpenBraceToken ? SyntaxKind.CloseBraceToken : SyntaxKind.CloseBracketToken) {
        const openToken = findChildOfKind(n, open, sourceFile);
        const closeToken = findChildOfKind(n, close, sourceFile);
        return openToken && closeToken && spanBetweenTokens(openToken, closeToken, hintSpanNode, sourceFile, autoCollapse, useFullStart);
    }
    function spanForNodeArray(nodeArray) {
        return nodeArray.length ? createOutliningSpan(createTextSpanFromRange(nodeArray), OutliningSpanKind.Code) : undefined;
    }
    function spanForParenthesizedExpression(node) {
        if (positionsAreOnSameLine(node.getStart(), node.getEnd(), sourceFile))
            return undefined;
        const textSpan = createTextSpanFromBounds(node.getStart(), node.getEnd());
        return createOutliningSpan(textSpan, OutliningSpanKind.Code, createTextSpanFromNode(node));
    }
}
function functionSpan(node, body, sourceFile) {
    const openToken = tryGetFunctionOpenToken(node, body, sourceFile);
    const closeToken = findChildOfKind(body, SyntaxKind.CloseBraceToken, sourceFile);
    return openToken && closeToken && spanBetweenTokens(openToken, closeToken, node, sourceFile, /*autoCollapse*/ node.kind !== SyntaxKind.ArrowFunction);
}
function spanBetweenTokens(openToken, closeToken, hintSpanNode, sourceFile, autoCollapse = false, useFullStart = true) {
    const textSpan = createTextSpanFromBounds(useFullStart ? openToken.getFullStart() : openToken.getStart(sourceFile), closeToken.getEnd());
    return createOutliningSpan(textSpan, OutliningSpanKind.Code, createTextSpanFromNode(hintSpanNode, sourceFile), autoCollapse);
}
function createOutliningSpan(textSpan, kind, hintSpan = textSpan, autoCollapse = false, bannerText = "...") {
    return { textSpan, kind, hintSpan, bannerText, autoCollapse };
}
function tryGetFunctionOpenToken(node, body, sourceFile) {
    if (isNodeArrayMultiLine(node.parameters, sourceFile)) {
        const openParenToken = findChildOfKind(node, SyntaxKind.OpenParenToken, sourceFile);
        if (openParenToken) {
            return openParenToken;
        }
    }
    return findChildOfKind(body, SyntaxKind.OpenBraceToken, sourceFile);
}
