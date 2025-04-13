import {
  copyTrailingAsLeadingComments,
  copyTrailingComments,
  Debug,
  Diagnostics,
  emptyArray,
  factory,
  findAncestor,
  getLocaleSpecificMessage,
  getTextOfNode,
  getTokenAtPosition,
  getTrailingCommentRanges,
  isBinaryExpression,
  isExpressionNode,
  isNoSubstitutionTemplateLiteral,
  isParenthesizedExpression,
  isStringLiteral,
  isStringLiteralLike,
  isTemplateExpression,
  isTemplateHead,
  isTemplateMiddle,
  map,
  SyntaxKind,
  textChanges,
} from "../namespaces/ts.js";

import { registerRefactor } from "../namespaces/ts.refactor.js";

const refactorName = "Convert to template string";
const refactorDescription = getLocaleSpecificMessage(Diagnostics.Convert_to_template_string);

const convertStringAction = {
    name: refactorName,
    description: refactorDescription,
    kind: "refactor.rewrite.string",
};
registerRefactor(refactorName, {
    kinds: [convertStringAction.kind],
    getEditsForAction: getRefactorEditsToConvertToTemplateString,
    getAvailableActions: getRefactorActionsToConvertToTemplateString,
});
function getRefactorActionsToConvertToTemplateString(context) {
    const { file, startPosition } = context;
    const node = getNodeOrParentOfParentheses(file, startPosition);
    const maybeBinary = getParentBinaryExpression(node);
    const nodeIsStringLiteral = isStringLiteral(maybeBinary);
    const refactorInfo = { name: refactorName, description: refactorDescription, actions: [] };
    if (nodeIsStringLiteral && context.triggerReason !== "invoked") {
        return emptyArray;
    }
    if (isExpressionNode(maybeBinary) && (nodeIsStringLiteral || isBinaryExpression(maybeBinary) && treeToArray(maybeBinary).isValidConcatenation)) {
        refactorInfo.actions.push(convertStringAction);
        return [refactorInfo];
    }
    else if (context.preferences.provideRefactorNotApplicableReason) {
        refactorInfo.actions.push(Object.assign(Object.assign({}, convertStringAction), { notApplicableReason: getLocaleSpecificMessage(Diagnostics.Can_only_convert_string_concatenations_and_string_literals) }));
        return [refactorInfo];
    }
    return emptyArray;
}
function getNodeOrParentOfParentheses(file, startPosition) {
    const node = getTokenAtPosition(file, startPosition);
    const nestedBinary = getParentBinaryExpression(node);
    const isNonStringBinary = !treeToArray(nestedBinary).isValidConcatenation;
    if (isNonStringBinary &&
        isParenthesizedExpression(nestedBinary.parent) &&
        isBinaryExpression(nestedBinary.parent.parent)) {
        return nestedBinary.parent.parent;
    }
    return node;
}
function getRefactorEditsToConvertToTemplateString(context, actionName) {
    const { file, startPosition } = context;
    const node = getNodeOrParentOfParentheses(file, startPosition);
    switch (actionName) {
        case refactorDescription:
            return { edits: getEditsForToTemplateLiteral(context, node) };
        default:
            return Debug.fail("invalid action");
    }
}
function getEditsForToTemplateLiteral(context, node) {
    const maybeBinary = getParentBinaryExpression(node);
    const file = context.file;
    const templateLiteral = nodesToTemplate(treeToArray(maybeBinary), file);
    const trailingCommentRanges = getTrailingCommentRanges(file.text, maybeBinary.end);
    if (trailingCommentRanges) {
        const lastComment = trailingCommentRanges[trailingCommentRanges.length - 1];
        const trailingRange = { pos: trailingCommentRanges[0].pos, end: lastComment.end };
        // since suppressTrailingTrivia(maybeBinary) does not work, the trailing comment is removed manually
        // otherwise it would have the trailing comment twice
        return textChanges.ChangeTracker.with(context, t => {
            t.deleteRange(file, trailingRange);
            t.replaceNode(file, maybeBinary, templateLiteral);
        });
    }
    else {
        return textChanges.ChangeTracker.with(context, t => t.replaceNode(file, maybeBinary, templateLiteral));
    }
}
function isNotEqualsOperator(node) {
    return !(node.operatorToken.kind === SyntaxKind.EqualsToken || node.operatorToken.kind === SyntaxKind.PlusEqualsToken);
}
function getParentBinaryExpression(expr) {
    const container = findAncestor(expr.parent, n => {
        switch (n.kind) {
            case SyntaxKind.PropertyAccessExpression:
            case SyntaxKind.ElementAccessExpression:
                return false;
            case SyntaxKind.TemplateExpression:
            case SyntaxKind.BinaryExpression:
                return !(isBinaryExpression(n.parent) && isNotEqualsOperator(n.parent));
            default:
                return "quit";
        }
    });
    return (container || expr);
}
function treeToArray(current) {
    const loop = (current) => {
        if (!isBinaryExpression(current)) {
            return { nodes: [current], operators: [], validOperators: true, hasString: isStringLiteral(current) || isNoSubstitutionTemplateLiteral(current) };
        }
        const { nodes, operators, hasString: leftHasString, validOperators: leftOperatorValid } = loop(current.left);
        if (!(leftHasString || isStringLiteral(current.right) || isTemplateExpression(current.right))) {
            return { nodes: [current], operators: [], hasString: false, validOperators: true };
        }
        const currentOperatorValid = current.operatorToken.kind === SyntaxKind.PlusToken;
        const validOperators = leftOperatorValid && currentOperatorValid;
        nodes.push(current.right);
        operators.push(current.operatorToken);
        return { nodes, operators, hasString: true, validOperators };
    };
    const { nodes, operators, validOperators, hasString } = loop(current);
    return { nodes, operators, isValidConcatenation: validOperators && hasString };
}
// to copy comments following the operator
// "foo" + /* comment */ "bar"
const copyTrailingOperatorComments = (operators, file) => (index, targetNode) => {
    if (index < operators.length) {
        copyTrailingComments(operators[index], targetNode, file, SyntaxKind.MultiLineCommentTrivia, /*hasTrailingNewLine*/ false);
    }
};
// to copy comments following the string
// "foo" /* comment */ + "bar" /* comment */ + "bar2"
const copyCommentFromMultiNode = (nodes, file, copyOperatorComments) => (indexes, targetNode) => {
    while (indexes.length > 0) {
        const index = indexes.shift();
        copyTrailingComments(nodes[index], targetNode, file, SyntaxKind.MultiLineCommentTrivia, /*hasTrailingNewLine*/ false);
        copyOperatorComments(index, targetNode);
    }
};
function escapeRawStringForTemplate(s) {
    // Escaping for $s in strings that are to be used in template strings
    // Naive implementation: replace \x by itself and otherwise $ and ` by \$ and \`.
    // But to complicate it a bit, this should work for raw strings too.
    return s.replace(/\\.|[$`]/g, m => m[0] === "\\" ? m : "\\" + m);
    // Finally, a less-backslash-happy version can work too, doing only ${ instead of all $s:
    //     s.replace(/\\.|\${|`/g, m => m[0] === "\\" ? m : "\\" + m);
    // but `\$${foo}` is likely more clear than the more-confusing-but-still-working `$${foo}`.
}
function getRawTextOfTemplate(node) {
    // in these cases the right side is ${
    const rightShaving = isTemplateHead(node) || isTemplateMiddle(node) ? -2 : -1;
    return getTextOfNode(node).slice(1, rightShaving);
}
function concatConsecutiveString(index, nodes) {
    const indexes = [];
    let text = "", rawText = "";
    while (index < nodes.length) {
        const node = nodes[index];
        if (isStringLiteralLike(node)) { // includes isNoSubstitutionTemplateLiteral(node)
            text += node.text;
            rawText += escapeRawStringForTemplate(getTextOfNode(node).slice(1, -1));
            indexes.push(index);
            index++;
        }
        else if (isTemplateExpression(node)) {
            text += node.head.text;
            rawText += getRawTextOfTemplate(node.head);
            break;
        }
        else {
            break;
        }
    }
    return [index, text, rawText, indexes];
}
function nodesToTemplate({ nodes, operators }, file) {
    const copyOperatorComments = copyTrailingOperatorComments(operators, file);
    const copyCommentFromStringLiterals = copyCommentFromMultiNode(nodes, file, copyOperatorComments);
    const [begin, headText, rawHeadText, headIndexes] = concatConsecutiveString(0, nodes);
    if (begin === nodes.length) {
        const noSubstitutionTemplateLiteral = factory.createNoSubstitutionTemplateLiteral(headText, rawHeadText);
        copyCommentFromStringLiterals(headIndexes, noSubstitutionTemplateLiteral);
        return noSubstitutionTemplateLiteral;
    }
    const templateSpans = [];
    const templateHead = factory.createTemplateHead(headText, rawHeadText);
    copyCommentFromStringLiterals(headIndexes, templateHead);
    for (let i = begin; i < nodes.length; i++) {
        const currentNode = getExpressionFromParenthesesOrExpression(nodes[i]);
        copyOperatorComments(i, currentNode);
        const [newIndex, subsequentText, rawSubsequentText, stringIndexes] = concatConsecutiveString(i + 1, nodes);
        i = newIndex - 1;
        const isLast = i === nodes.length - 1;
        if (isTemplateExpression(currentNode)) {
            const spans = map(currentNode.templateSpans, (span, index) => {
                copyExpressionComments(span);
                const isLastSpan = index === currentNode.templateSpans.length - 1;
                const text = span.literal.text + (isLastSpan ? subsequentText : "");
                const rawText = getRawTextOfTemplate(span.literal) + (isLastSpan ? rawSubsequentText : "");
                return factory.createTemplateSpan(span.expression, isLast && isLastSpan
                    ? factory.createTemplateTail(text, rawText)
                    : factory.createTemplateMiddle(text, rawText));
            });
            templateSpans.push(...spans);
        }
        else {
            const templatePart = isLast
                ? factory.createTemplateTail(subsequentText, rawSubsequentText)
                : factory.createTemplateMiddle(subsequentText, rawSubsequentText);
            copyCommentFromStringLiterals(stringIndexes, templatePart);
            templateSpans.push(factory.createTemplateSpan(currentNode, templatePart));
        }
    }
    return factory.createTemplateExpression(templateHead, templateSpans);
}
// to copy comments following the opening & closing parentheses
// "foo" + ( /* comment */ 5 + 5 ) /* comment */ + "bar"
function copyExpressionComments(node) {
    const file = node.getSourceFile();
    copyTrailingComments(node, node.expression, file, SyntaxKind.MultiLineCommentTrivia, /*hasTrailingNewLine*/ false);
    copyTrailingAsLeadingComments(node.expression, node.expression, file, SyntaxKind.MultiLineCommentTrivia, /*hasTrailingNewLine*/ false);
}
function getExpressionFromParenthesesOrExpression(node) {
    if (isParenthesizedExpression(node)) {
        copyExpressionComments(node);
        node = node.expression;
    }
    return node;
}
