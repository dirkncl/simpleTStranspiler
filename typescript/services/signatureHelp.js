import {
  canHaveSymbol,
  CheckFlags,
  contains,
  createPrinterWithRemoveComments,
  createTextSpan,
  createTextSpanFromBounds,
  createTextSpanFromNode,
  Debug,
  ElementFlags,
  EmitHint,
  emptyArray,
  factory,
  findAncestor,
  findContainingList,
  findIndex,
  findPrecedingToken,
  findTokenOnLeftOfPosition,
  first,
  firstDefined,
  flatMapToMutable,
  getInvokedExpression,
  getPossibleGenericSignatures,
  getPossibleTypeArgumentsInfo,
  identity,
  InternalSymbolName,
  isArrayBindingPattern,
  isBinaryExpression,
  isBindingElement,
  isBlock,
  isCallOrNewExpression,
  isFunctionTypeNode,
  isIdentifier,
  isInComment,
  isInsideTemplateLiteral,
  isInString,
  isJsxOpeningLikeElement,
  isMethodDeclaration,
  isNoSubstitutionTemplateLiteral,
  isObjectBindingPattern,
  isParameter,
  isPropertyAccessExpression,
  isSourceFile,
  isSourceFileJS,
  isSpreadElement,
  isTaggedTemplateExpression,
  isTemplateHead,
  isTemplateLiteralToken,
  isTemplateSpan,
  isTemplateTail,
  isTransientSymbol,
  last,
  lastOrUndefined,
  ListFormat,
  map,
  mapToDisplayParts,
  NodeBuilderFlags,
  punctuationPart,
  rangeContainsRange,
  skipTrivia,
  spacePart,
  symbolToDisplayParts,
  SyntaxKind,
  tryCast,
} from "./namespaces/ts.js";


var InvocationKind;
(function (InvocationKind) {
    InvocationKind[InvocationKind["Call"] = 0] = "Call";
    InvocationKind[InvocationKind["TypeArgs"] = 1] = "TypeArgs";
    InvocationKind[InvocationKind["Contextual"] = 2] = "Contextual";
})(InvocationKind || (InvocationKind = {}));

/** @internal */
export function getSignatureHelpItems(program, sourceFile, position, triggerReason, cancellationToken) {
    const typeChecker = program.getTypeChecker();
    // Decide whether to show signature help
    const startingToken = findTokenOnLeftOfPosition(sourceFile, position);
    if (!startingToken) {
        // We are at the beginning of the file
        return undefined;
    }
    // Only need to be careful if the user typed a character and signature help wasn't showing.
    const onlyUseSyntacticOwners = !!triggerReason && triggerReason.kind === "characterTyped";
    // Bail out quickly in the middle of a string or comment, don't provide signature help unless the user explicitly requested it.
    if (onlyUseSyntacticOwners && (isInString(sourceFile, position, startingToken) || isInComment(sourceFile, position))) {
        return undefined;
    }
    const isManuallyInvoked = !!triggerReason && triggerReason.kind === "invoked";
    const argumentInfo = getContainingArgumentInfo(startingToken, position, sourceFile, typeChecker, isManuallyInvoked);
    if (!argumentInfo)
        return undefined;
    cancellationToken.throwIfCancellationRequested();
    // Extra syntactic and semantic filtering of signature help
    const candidateInfo = getCandidateOrTypeInfo(argumentInfo, typeChecker, sourceFile, startingToken, onlyUseSyntacticOwners);
    cancellationToken.throwIfCancellationRequested();
    if (!candidateInfo) {
        // We didn't have any sig help items produced by the TS compiler.  If this is a JS
        // file, then see if we can figure out anything better.
        return isSourceFileJS(sourceFile) ? createJSSignatureHelpItems(argumentInfo, program, cancellationToken) : undefined;
    }
    return typeChecker.runWithCancellationToken(cancellationToken, typeChecker => candidateInfo.kind === 0 /* CandidateOrTypeKind.Candidate */
        ? createSignatureHelpItems(candidateInfo.candidates, candidateInfo.resolvedSignature, argumentInfo, sourceFile, typeChecker)
        : createTypeHelpItems(candidateInfo.symbol, argumentInfo, sourceFile, typeChecker));
}

var CandidateOrTypeKind;
(function (CandidateOrTypeKind) {
    CandidateOrTypeKind[CandidateOrTypeKind["Candidate"] = 0] = "Candidate";
    CandidateOrTypeKind[CandidateOrTypeKind["Type"] = 1] = "Type";
})(CandidateOrTypeKind || (CandidateOrTypeKind = {}));

function getCandidateOrTypeInfo({ invocation, argumentCount }, checker, sourceFile, startingToken, onlyUseSyntacticOwners) {
    switch (invocation.kind) {
        case 0 /* InvocationKind.Call */: {
            if (onlyUseSyntacticOwners && !isSyntacticOwner(startingToken, invocation.node, sourceFile)) {
                return undefined;
            }
            const candidates = [];
            const resolvedSignature = checker.getResolvedSignatureForSignatureHelp(invocation.node, candidates, argumentCount); // TODO: GH#18217
            return candidates.length === 0 ? undefined : { kind: 0 /* CandidateOrTypeKind.Candidate */, candidates, resolvedSignature };
        }
        case 1 /* InvocationKind.TypeArgs */: {
            const { called } = invocation;
            if (onlyUseSyntacticOwners && !containsPrecedingToken(startingToken, sourceFile, isIdentifier(called) ? called.parent : called)) {
                return undefined;
            }
            const candidates = getPossibleGenericSignatures(called, argumentCount, checker);
            if (candidates.length !== 0)
                return { kind: 0 /* CandidateOrTypeKind.Candidate */, candidates, resolvedSignature: first(candidates) };
            const symbol = checker.getSymbolAtLocation(called);
            return symbol && { kind: 1 /* CandidateOrTypeKind.Type */, symbol };
        }
        case 2 /* InvocationKind.Contextual */:
            return { kind: 0 /* CandidateOrTypeKind.Candidate */, candidates: [invocation.signature], resolvedSignature: invocation.signature };
        default:
            return Debug.assertNever(invocation);
    }
}

function isSyntacticOwner(startingToken, node, sourceFile) {
    if (!isCallOrNewExpression(node))
        return false;
    const invocationChildren = node.getChildren(sourceFile);
    switch (startingToken.kind) {
        case SyntaxKind.OpenParenToken:
            return contains(invocationChildren, startingToken);
        case SyntaxKind.CommaToken: {
            const containingList = findContainingList(startingToken);
            return !!containingList && contains(invocationChildren, containingList);
        }
        case SyntaxKind.LessThanToken:
            return containsPrecedingToken(startingToken, sourceFile, node.expression);
        default:
            return false;
    }
}

function createJSSignatureHelpItems(argumentInfo, program, cancellationToken) {
    if (argumentInfo.invocation.kind === 2 /* InvocationKind.Contextual */)
        return undefined;
    // See if we can find some symbol with the call expression name that has call signatures.
    const expression = getExpressionFromInvocation(argumentInfo.invocation);
    const name = isPropertyAccessExpression(expression) ? expression.name.text : undefined;
    const typeChecker = program.getTypeChecker();
    return name === undefined ? undefined : firstDefined(program.getSourceFiles(), sourceFile => firstDefined(sourceFile.getNamedDeclarations().get(name), declaration => {
        const type = declaration.symbol && typeChecker.getTypeOfSymbolAtLocation(declaration.symbol, declaration);
        const callSignatures = type && type.getCallSignatures();
        if (callSignatures && callSignatures.length) {
            return typeChecker.runWithCancellationToken(cancellationToken, typeChecker => createSignatureHelpItems(callSignatures, callSignatures[0], argumentInfo, sourceFile, typeChecker, 
            /*useFullPrefix*/ true));
        }
    }));
}
function containsPrecedingToken(startingToken, sourceFile, container) {
    const pos = startingToken.getFullStart();
    // There's a possibility that `startingToken.parent` contains only `startingToken` and
    // missing nodes, none of which are valid to be returned by `findPrecedingToken`. In that
    // case, the preceding token we want is actually higher up the tree—almost definitely the
    // next parent, but theoretically the situation with missing nodes might be happening on
    // multiple nested levels.
    let currentParent = startingToken.parent;
    while (currentParent) {
        const precedingToken = findPrecedingToken(pos, sourceFile, currentParent, /*excludeJsdoc*/ true);
        if (precedingToken) {
            return rangeContainsRange(container, precedingToken);
        }
        currentParent = currentParent.parent;
    }
    return Debug.fail("Could not find preceding token");
}
/** @internal */
export function getArgumentInfoForCompletions(node, position, sourceFile, checker) {
    const info = getImmediatelyContainingArgumentInfo(node, position, sourceFile, checker);
    return !info || info.isTypeParameterList || info.invocation.kind !== 0 /* InvocationKind.Call */ ? undefined
        : { invocation: info.invocation.node, argumentCount: info.argumentCount, argumentIndex: info.argumentIndex };
}
function getArgumentOrParameterListInfo(node, position, sourceFile, checker) {
    const info = getArgumentOrParameterListAndIndex(node, sourceFile, checker);
    if (!info)
        return undefined;
    const { list, argumentIndex } = info;
    const argumentCount = getArgumentCount(checker, list);
    const argumentsSpan = getApplicableSpanForArguments(list, sourceFile);
    return { list, argumentIndex, argumentCount, argumentsSpan };
}
function getArgumentOrParameterListAndIndex(node, sourceFile, checker) {
    if (node.kind === SyntaxKind.LessThanToken || node.kind === SyntaxKind.OpenParenToken) {
        // Find the list that starts right *after* the < or ( token.
        // If the user has just opened a list, consider this item 0.
        return { list: getChildListThatStartsWithOpenerToken(node.parent, node, sourceFile), argumentIndex: 0 };
    }
    else {
        // findListItemInfo can return undefined if we are not in parent's argument list
        // or type argument list. This includes cases where the cursor is:
        //   - To the right of the closing parenthesis, non-substitution template, or template tail.
        //   - Between the type arguments and the arguments (greater than token)
        //   - On the target of the call (parent.func)
        //   - On the 'new' keyword in a 'new' expression
        const list = findContainingList(node);
        return list && { list, argumentIndex: getArgumentIndex(checker, list, node) };
    }
}
/**
 * Returns relevant information for the argument list and the current argument if we are
 * in the argument of an invocation; returns undefined otherwise.
 */
function getImmediatelyContainingArgumentInfo(node, position, sourceFile, checker) {
    const { parent } = node;
    if (isCallOrNewExpression(parent)) {
        const invocation = parent;
        // There are 3 cases to handle:
        //   1. The token introduces a list, and should begin a signature help session
        //   2. The token is either not associated with a list, or ends a list, so the session should end
        //   3. The token is buried inside a list, and should give signature help
        //
        // The following are examples of each:
        //
        //    Case 1:
        //          foo<#T, U>(#a, b)    -> The token introduces a list, and should begin a signature help session
        //    Case 2:
        //          fo#o<T, U>#(a, b)#   -> The token is either not associated with a list, or ends a list, so the session should end
        //    Case 3:
        //          foo<T#, U#>(a#, #b#) -> The token is buried inside a list, and should give signature help
        // Find out if 'node' is an argument, a type argument, or neither
        const info = getArgumentOrParameterListInfo(node, position, sourceFile, checker);
        if (!info)
            return undefined;
        const { list, argumentIndex, argumentCount, argumentsSpan } = info;
        const isTypeParameterList = !!parent.typeArguments && parent.typeArguments.pos === list.pos;
        return { isTypeParameterList, invocation: { kind: 0 /* InvocationKind.Call */, node: invocation }, argumentsSpan, argumentIndex, argumentCount };
    }
    else if (isNoSubstitutionTemplateLiteral(node) && isTaggedTemplateExpression(parent)) {
        // Check if we're actually inside the template;
        // otherwise we'll fall out and return undefined.
        if (isInsideTemplateLiteral(node, position, sourceFile)) {
            return getArgumentListInfoForTemplate(parent, /*argumentIndex*/ 0, sourceFile);
        }
        return undefined;
    }
    else if (isTemplateHead(node) && parent.parent.kind === SyntaxKind.TaggedTemplateExpression) {
        const templateExpression = parent;
        const tagExpression = templateExpression.parent;
        Debug.assert(templateExpression.kind === SyntaxKind.TemplateExpression);
        const argumentIndex = isInsideTemplateLiteral(node, position, sourceFile) ? 0 : 1;
        return getArgumentListInfoForTemplate(tagExpression, argumentIndex, sourceFile);
    }
    else if (isTemplateSpan(parent) && isTaggedTemplateExpression(parent.parent.parent)) {
        const templateSpan = parent;
        const tagExpression = parent.parent.parent;
        // If we're just after a template tail, don't show signature help.
        if (isTemplateTail(node) && !isInsideTemplateLiteral(node, position, sourceFile)) {
            return undefined;
        }
        const spanIndex = templateSpan.parent.templateSpans.indexOf(templateSpan);
        const argumentIndex = getArgumentIndexForTemplatePiece(spanIndex, node, position, sourceFile);
        return getArgumentListInfoForTemplate(tagExpression, argumentIndex, sourceFile);
    }
    else if (isJsxOpeningLikeElement(parent)) {
        // Provide a signature help for JSX opening element or JSX self-closing element.
        // This is not guarantee that JSX tag-name is resolved into stateless function component. (that is done in "getSignatureHelpItems")
        // i.e
        //      export function MainButton(props: ButtonProps, context: any): JSX.Element { ... }
        //      <MainButton /*signatureHelp*/
        const attributeSpanStart = parent.attributes.pos;
        const attributeSpanEnd = skipTrivia(sourceFile.text, parent.attributes.end, /*stopAfterLineBreak*/ false);
        return {
            isTypeParameterList: false,
            invocation: { kind: 0 /* InvocationKind.Call */, node: parent },
            argumentsSpan: createTextSpan(attributeSpanStart, attributeSpanEnd - attributeSpanStart),
            argumentIndex: 0,
            argumentCount: 1,
        };
    }
    else {
        const typeArgInfo = getPossibleTypeArgumentsInfo(node, sourceFile);
        if (typeArgInfo) {
            const { called, nTypeArguments } = typeArgInfo;
            const invocation = { kind: 1 /* InvocationKind.TypeArgs */, called };
            const argumentsSpan = createTextSpanFromBounds(called.getStart(sourceFile), node.end);
            return { isTypeParameterList: true, invocation, argumentsSpan, argumentIndex: nTypeArguments, argumentCount: nTypeArguments + 1 };
        }
        return undefined;
    }
}
function getImmediatelyContainingArgumentOrContextualParameterInfo(node, position, sourceFile, checker) {
    return tryGetParameterInfo(node, position, sourceFile, checker) || getImmediatelyContainingArgumentInfo(node, position, sourceFile, checker);
}
function getHighestBinary(b) {
    return isBinaryExpression(b.parent) ? getHighestBinary(b.parent) : b;
}
function countBinaryExpressionParameters(b) {
    return isBinaryExpression(b.left) ? countBinaryExpressionParameters(b.left) + 1 : 2;
}
function tryGetParameterInfo(startingToken, position, sourceFile, checker) {
    const node = getAdjustedNode(startingToken);
    if (node === undefined)
        return undefined;
    const info = getContextualSignatureLocationInfo(node, sourceFile, position, checker);
    if (info === undefined)
        return undefined;
    const { contextualType, argumentIndex, argumentCount, argumentsSpan } = info;
    // for optional function condition.
    const nonNullableContextualType = contextualType.getNonNullableType();
    const symbol = nonNullableContextualType.symbol;
    if (symbol === undefined)
        return undefined;
    const signature = lastOrUndefined(nonNullableContextualType.getCallSignatures());
    if (signature === undefined)
        return undefined;
    const invocation = { kind: 2 /* InvocationKind.Contextual */, signature, node: startingToken, symbol: chooseBetterSymbol(symbol) };
    return { isTypeParameterList: false, invocation, argumentsSpan, argumentIndex, argumentCount };
}
function getAdjustedNode(node) {
    switch (node.kind) {
        case SyntaxKind.OpenParenToken:
        case SyntaxKind.CommaToken:
            return node;
        default:
            return findAncestor(node.parent, n => isParameter(n) ? true : isBindingElement(n) || isObjectBindingPattern(n) || isArrayBindingPattern(n) ? false : "quit");
    }
}
function getContextualSignatureLocationInfo(node, sourceFile, position, checker) {
    const { parent } = node;
    switch (parent.kind) {
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
            const info = getArgumentOrParameterListInfo(node, position, sourceFile, checker);
            if (!info)
                return undefined;
            const { argumentIndex, argumentCount, argumentsSpan } = info;
            const contextualType = isMethodDeclaration(parent) ? checker.getContextualTypeForObjectLiteralElement(parent) : checker.getContextualType(parent);
            return contextualType && { contextualType, argumentIndex, argumentCount, argumentsSpan };
        case SyntaxKind.BinaryExpression: {
            const highestBinary = getHighestBinary(parent);
            const contextualType = checker.getContextualType(highestBinary);
            const argumentIndex = node.kind === SyntaxKind.OpenParenToken ? 0 : countBinaryExpressionParameters(parent) - 1;
            const argumentCount = countBinaryExpressionParameters(highestBinary);
            return contextualType && { contextualType, argumentIndex, argumentCount, argumentsSpan: createTextSpanFromNode(parent) };
        }
        default:
            return undefined;
    }
}
// The type of a function type node has a symbol at that node, but it's better to use the symbol for a parameter or type alias.
function chooseBetterSymbol(s) {
    return s.name === InternalSymbolName.Type
        ? firstDefined(s.declarations, d => { var _a; return isFunctionTypeNode(d) ? (_a = tryCast(d.parent, canHaveSymbol)) === null || _a === void 0 ? void 0 : _a.symbol : undefined; }) || s
        : s;
}
function getSpreadElementCount(node, checker) {
    const spreadType = checker.getTypeAtLocation(node.expression);
    if (checker.isTupleType(spreadType)) {
        const { elementFlags, fixedLength } = spreadType.target;
        if (fixedLength === 0) {
            return 0;
        }
        const firstOptionalIndex = findIndex(elementFlags, f => !(f & ElementFlags.Required));
        return firstOptionalIndex < 0 ? fixedLength : firstOptionalIndex;
    }
    return 0;
}
function getArgumentIndex(checker, argumentsList, node) {
    return getArgumentIndexOrCount(checker, argumentsList, node);
}
function getArgumentCount(checker, argumentsList) {
    return getArgumentIndexOrCount(checker, argumentsList, /*node*/ undefined);
}
function getArgumentIndexOrCount(checker, argumentsList, node) {
    // The list we got back can include commas. In the presence of errors it may
    // also just have nodes without commas. For example "Foo(a b c)" will have 3
    // args without commas.
    const args = argumentsList.getChildren();
    let argumentIndex = 0;
    let skipComma = false;
    for (const child of args) {
        if (node && child === node) {
            if (!skipComma && child.kind === SyntaxKind.CommaToken) {
                argumentIndex++;
            }
            return argumentIndex;
        }
        if (isSpreadElement(child)) {
            argumentIndex += getSpreadElementCount(child, checker);
            skipComma = true;
            continue;
        }
        if (child.kind !== SyntaxKind.CommaToken) {
            argumentIndex++;
            skipComma = true;
            continue;
        }
        if (skipComma) {
            skipComma = false;
            continue;
        }
        argumentIndex++;
    }
    if (node) {
        return argumentIndex;
    }
    // The argument count for a list is normally the number of non-comma children it has.
    // For example, if you have "Foo(a,b)" then there will be three children of the arg
    // list 'a' '<comma>' 'b'. So, in this case the arg count will be 2. However, there
    // is a small subtlety. If you have "Foo(a,)", then the child list will just have
    // 'a' '<comma>'. So, in the case where the last child is a comma, we increase the
    // arg count by one to compensate.
    return args.length && last(args).kind === SyntaxKind.CommaToken ? argumentIndex + 1 : argumentIndex;
}
// spanIndex is either the index for a given template span.
// This does not give appropriate results for a NoSubstitutionTemplateLiteral
function getArgumentIndexForTemplatePiece(spanIndex, node, position, sourceFile) {
    // Because the TemplateStringsArray is the first argument, we have to offset each substitution expression by 1.
    // There are three cases we can encounter:
    //      1. We are precisely in the template literal (argIndex = 0).
    //      2. We are in or to the right of the substitution expression (argIndex = spanIndex + 1).
    //      3. We are directly to the right of the template literal, but because we look for the token on the left,
    //          not enough to put us in the substitution expression; we should consider ourselves part of
    //          the *next* span's expression by offsetting the index (argIndex = (spanIndex + 1) + 1).
    //
    // Example: f  `# abcd $#{#  1 + 1#  }# efghi ${ #"#hello"#  }  #  `
    //              ^       ^ ^       ^   ^          ^ ^      ^     ^
    // Case:        1       1 3       2   1          3 2      2     1
    Debug.assert(position >= node.getStart(), "Assumed 'position' could not occur before node.");
    if (isTemplateLiteralToken(node)) {
        if (isInsideTemplateLiteral(node, position, sourceFile)) {
            return 0;
        }
        return spanIndex + 2;
    }
    return spanIndex + 1;
}
function getArgumentListInfoForTemplate(tagExpression, argumentIndex, sourceFile) {
    // argumentCount is either 1 or (numSpans + 1) to account for the template strings array argument.
    const argumentCount = isNoSubstitutionTemplateLiteral(tagExpression.template) ? 1 : tagExpression.template.templateSpans.length + 1;
    if (argumentIndex !== 0) {
        Debug.assertLessThan(argumentIndex, argumentCount);
    }
    return {
        isTypeParameterList: false,
        invocation: { kind: 0 /* InvocationKind.Call */, node: tagExpression },
        argumentsSpan: getApplicableSpanForTaggedTemplate(tagExpression, sourceFile),
        argumentIndex,
        argumentCount,
    };
}
function getApplicableSpanForArguments(argumentsList, sourceFile) {
    // We use full start and skip trivia on the end because we want to include trivia on
    // both sides. For example,
    //
    //    foo(   /*comment */     a, b, c      /*comment*/     )
    //        |                                               |
    //
    // The applicable span is from the first bar to the second bar (inclusive,
    // but not including parentheses)
    const applicableSpanStart = argumentsList.getFullStart();
    const applicableSpanEnd = skipTrivia(sourceFile.text, argumentsList.getEnd(), /*stopAfterLineBreak*/ false);
    return createTextSpan(applicableSpanStart, applicableSpanEnd - applicableSpanStart);
}
function getApplicableSpanForTaggedTemplate(taggedTemplate, sourceFile) {
    const template = taggedTemplate.template;
    const applicableSpanStart = template.getStart();
    let applicableSpanEnd = template.getEnd();
    // We need to adjust the end position for the case where the template does not have a tail.
    // Otherwise, we will not show signature help past the expression.
    // For example,
    //
    //      ` ${ 1 + 1 foo(10)
    //       |       |
    // This is because a Missing node has no width. However, what we actually want is to include trivia
    // leading up to the next token in case the user is about to type in a TemplateMiddle or TemplateTail.
    if (template.kind === SyntaxKind.TemplateExpression) {
        const lastSpan = last(template.templateSpans);
        if (lastSpan.literal.getFullWidth() === 0) {
            applicableSpanEnd = skipTrivia(sourceFile.text, applicableSpanEnd, /*stopAfterLineBreak*/ false);
        }
    }
    return createTextSpan(applicableSpanStart, applicableSpanEnd - applicableSpanStart);
}
function getContainingArgumentInfo(node, position, sourceFile, checker, isManuallyInvoked) {
    for (let n = node; !isSourceFile(n) && (isManuallyInvoked || !isBlock(n)); n = n.parent) {
        // If the node is not a subspan of its parent, this is a big problem.
        // There have been crashes that might be caused by this violation.
        Debug.assert(rangeContainsRange(n.parent, n), "Not a subspan", () => `Child: ${Debug.formatSyntaxKind(n.kind)}, parent: ${Debug.formatSyntaxKind(n.parent.kind)}`);
        const argumentInfo = getImmediatelyContainingArgumentOrContextualParameterInfo(n, position, sourceFile, checker);
        if (argumentInfo) {
            return argumentInfo;
        }
    }
    return undefined;
}
function getChildListThatStartsWithOpenerToken(parent, openerToken, sourceFile) {
    const children = parent.getChildren(sourceFile);
    const indexOfOpenerToken = children.indexOf(openerToken);
    Debug.assert(indexOfOpenerToken >= 0 && children.length > indexOfOpenerToken + 1);
    return children[indexOfOpenerToken + 1];
}
function getExpressionFromInvocation(invocation) {
    return invocation.kind === 0 /* InvocationKind.Call */ ? getInvokedExpression(invocation.node) : invocation.called;
}
function getEnclosingDeclarationFromInvocation(invocation) {
    return invocation.kind === 0 /* InvocationKind.Call */ ? invocation.node : invocation.kind === 1 /* InvocationKind.TypeArgs */ ? invocation.called : invocation.node;
}
const signatureHelpNodeBuilderFlags = NodeBuilderFlags.OmitParameterModifiers | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
function createSignatureHelpItems(candidates, resolvedSignature, { isTypeParameterList, argumentCount, argumentsSpan: applicableSpan, invocation, argumentIndex }, sourceFile, typeChecker, useFullPrefix) {
    var _a;
    const enclosingDeclaration = getEnclosingDeclarationFromInvocation(invocation);
    const callTargetSymbol = invocation.kind === 2 /* InvocationKind.Contextual */ ? invocation.symbol : (typeChecker.getSymbolAtLocation(getExpressionFromInvocation(invocation)) || useFullPrefix && ((_a = resolvedSignature.declaration) === null || _a === void 0 ? void 0 : _a.symbol));
    const callTargetDisplayParts = callTargetSymbol ? symbolToDisplayParts(typeChecker, callTargetSymbol, useFullPrefix ? sourceFile : undefined, /*meaning*/ undefined) : emptyArray;
    const items = map(candidates, candidateSignature => getSignatureHelpItem(candidateSignature, callTargetDisplayParts, isTypeParameterList, typeChecker, enclosingDeclaration, sourceFile));
    let selectedItemIndex = 0;
    let itemsSeen = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (candidates[i] === resolvedSignature) {
            selectedItemIndex = itemsSeen;
            if (item.length > 1) {
                // check to see if any items in the list better match than the first one, as the checker isn't filtering the nested lists
                // (those come from tuple parameter expansion)
                let count = 0;
                for (const i of item) {
                    if (i.isVariadic || i.parameters.length >= argumentCount) {
                        selectedItemIndex = itemsSeen + count;
                        break;
                    }
                    count++;
                }
            }
        }
        itemsSeen += item.length;
    }
    Debug.assert(selectedItemIndex !== -1); // If candidates is non-empty it should always include bestSignature. We check for an empty candidates before calling this function.
    const help = { items: flatMapToMutable(items, identity), applicableSpan, selectedItemIndex, argumentIndex, argumentCount };
    const selected = help.items[selectedItemIndex];
    if (selected.isVariadic) {
        const firstRest = findIndex(selected.parameters, p => !!p.isRest);
        if (-1 < firstRest && firstRest < selected.parameters.length - 1) {
            // We don't have any code to get this correct; instead, don't highlight a current parameter AT ALL
            help.argumentIndex = selected.parameters.length;
        }
        else {
            help.argumentIndex = Math.min(help.argumentIndex, selected.parameters.length - 1);
        }
    }
    return help;
}
function createTypeHelpItems(symbol, { argumentCount, argumentsSpan: applicableSpan, invocation, argumentIndex }, sourceFile, checker) {
    const typeParameters = checker.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
    if (!typeParameters)
        return undefined;
    const items = [getTypeHelpItem(symbol, typeParameters, checker, getEnclosingDeclarationFromInvocation(invocation), sourceFile)];
    return { items, applicableSpan, selectedItemIndex: 0, argumentIndex, argumentCount };
}
function getTypeHelpItem(symbol, typeParameters, checker, enclosingDeclaration, sourceFile) {
    const typeSymbolDisplay = symbolToDisplayParts(checker, symbol);
    const printer = createPrinterWithRemoveComments();
    const parameters = typeParameters.map(t => createSignatureHelpParameterForTypeParameter(t, checker, enclosingDeclaration, sourceFile, printer));
    const documentation = symbol.getDocumentationComment(checker);
    const tags = symbol.getJsDocTags(checker);
    const prefixDisplayParts = [...typeSymbolDisplay, punctuationPart(SyntaxKind.LessThanToken)];
    return { isVariadic: false, prefixDisplayParts, suffixDisplayParts: [punctuationPart(SyntaxKind.GreaterThanToken)], separatorDisplayParts, parameters, documentation, tags };
}
const separatorDisplayParts = [punctuationPart(SyntaxKind.CommaToken), spacePart()];
function getSignatureHelpItem(candidateSignature, callTargetDisplayParts, isTypeParameterList, checker, enclosingDeclaration, sourceFile) {
    const infos = (isTypeParameterList ? itemInfoForTypeParameters : itemInfoForParameters)(candidateSignature, checker, enclosingDeclaration, sourceFile);
    return map(infos, ({ isVariadic, parameters, prefix, suffix }) => {
        const prefixDisplayParts = [...callTargetDisplayParts, ...prefix];
        const suffixDisplayParts = [...suffix, ...returnTypeToDisplayParts(candidateSignature, enclosingDeclaration, checker)];
        const documentation = candidateSignature.getDocumentationComment(checker);
        const tags = candidateSignature.getJsDocTags();
        return { isVariadic, prefixDisplayParts, suffixDisplayParts, separatorDisplayParts, parameters, documentation, tags };
    });
}
function returnTypeToDisplayParts(candidateSignature, enclosingDeclaration, checker) {
    return mapToDisplayParts(writer => {
        writer.writePunctuation(":");
        writer.writeSpace(" ");
        const predicate = checker.getTypePredicateOfSignature(candidateSignature);
        if (predicate) {
            checker.writeTypePredicate(predicate, enclosingDeclaration, /*flags*/ undefined, writer);
        }
        else {
            checker.writeType(checker.getReturnTypeOfSignature(candidateSignature), enclosingDeclaration, /*flags*/ undefined, writer);
        }
    });
}
function itemInfoForTypeParameters(candidateSignature, checker, enclosingDeclaration, sourceFile) {
    const typeParameters = (candidateSignature.target || candidateSignature).typeParameters;
    const printer = createPrinterWithRemoveComments();
    const parameters = (typeParameters || emptyArray).map(t => createSignatureHelpParameterForTypeParameter(t, checker, enclosingDeclaration, sourceFile, printer));
    const thisParameter = candidateSignature.thisParameter ? [checker.symbolToParameterDeclaration(candidateSignature.thisParameter, enclosingDeclaration, signatureHelpNodeBuilderFlags)] : [];
    return checker.getExpandedParameters(candidateSignature).map(paramList => {
        const params = factory.createNodeArray([...thisParameter, ...map(paramList, param => checker.symbolToParameterDeclaration(param, enclosingDeclaration, signatureHelpNodeBuilderFlags))]);
        const parameterParts = mapToDisplayParts(writer => {
            printer.writeList(ListFormat.CallExpressionArguments, params, sourceFile, writer);
        });
        return { isVariadic: false, parameters, prefix: [punctuationPart(SyntaxKind.LessThanToken)], suffix: [punctuationPart(SyntaxKind.GreaterThanToken), ...parameterParts] };
    });
}
function itemInfoForParameters(candidateSignature, checker, enclosingDeclaration, sourceFile) {
    const printer = createPrinterWithRemoveComments();
    const typeParameterParts = mapToDisplayParts(writer => {
        if (candidateSignature.typeParameters && candidateSignature.typeParameters.length) {
            const args = factory.createNodeArray(candidateSignature.typeParameters.map(p => checker.typeParameterToDeclaration(p, enclosingDeclaration, signatureHelpNodeBuilderFlags)));
            printer.writeList(ListFormat.TypeParameters, args, sourceFile, writer);
        }
    });
    const lists = checker.getExpandedParameters(candidateSignature);
    const isVariadic = !checker.hasEffectiveRestParameter(candidateSignature) ? _ => false
        : lists.length === 1 ? _ => true
            : pList => { var _a; return !!(pList.length && ((_a = tryCast(pList[pList.length - 1], isTransientSymbol)) === null || _a === void 0 ? void 0 : _a.links.checkFlags) & CheckFlags.RestParameter); };
    return lists.map(parameterList => ({
        isVariadic: isVariadic(parameterList),
        parameters: parameterList.map(p => createSignatureHelpParameterForParameter(p, checker, enclosingDeclaration, sourceFile, printer)),
        prefix: [...typeParameterParts, punctuationPart(SyntaxKind.OpenParenToken)],
        suffix: [punctuationPart(SyntaxKind.CloseParenToken)],
    }));
}
function createSignatureHelpParameterForParameter(parameter, checker, enclosingDeclaration, sourceFile, printer) {
    const displayParts = mapToDisplayParts(writer => {
        const param = checker.symbolToParameterDeclaration(parameter, enclosingDeclaration, signatureHelpNodeBuilderFlags);
        printer.writeNode(EmitHint.Unspecified, param, sourceFile, writer);
    });
    const isOptional = checker.isOptionalParameter(parameter.valueDeclaration);
    const isRest = isTransientSymbol(parameter) && !!(parameter.links.checkFlags & CheckFlags.RestParameter);
    return { name: parameter.name, documentation: parameter.getDocumentationComment(checker), displayParts, isOptional, isRest };
}
function createSignatureHelpParameterForTypeParameter(typeParameter, checker, enclosingDeclaration, sourceFile, printer) {
    const displayParts = mapToDisplayParts(writer => {
        const param = checker.typeParameterToDeclaration(typeParameter, enclosingDeclaration, signatureHelpNodeBuilderFlags);
        printer.writeNode(EmitHint.Unspecified, param, sourceFile, writer);
    });
    return { name: typeParameter.symbol.name, documentation: typeParameter.symbol.getDocumentationComment(checker), displayParts, isOptional: false, isRest: false };
}
