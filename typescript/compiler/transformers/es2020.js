import {
  addEmitFlags,
  cast,
  chainBundle,
  Debug,
  EmitFlags,
  isCallChain,
  isExpression,
  isGeneratedIdentifier,
  isIdentifier,
  isNonNullChain,
  isOptionalChain,
  isParenthesizedExpression,
  isSimpleCopiableExpression,
  isSyntheticReference,
  isTaggedTemplateExpression,
  OuterExpressionKinds,
  setOriginalNode,
  setTextRange,
  skipParentheses,
  skipPartiallyEmittedExpressions,
  SyntaxKind,
  TransformFlags,
  visitEachChild,
  visitNode,
  visitNodes,
} from "../_namespaces/ts.js";


/** @internal */
export function transformES2020(context) {
    const { factory, hoistVariableDeclaration, } = context;
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        return visitEachChild(node, visitor, context);
    }
    function visitor(node) {
        if ((node.transformFlags & TransformFlags.ContainsES2020) === 0) {
            return node;
        }
        switch (node.kind) {
            case SyntaxKind.CallExpression: {
                const updated = visitNonOptionalCallExpression(node, /*captureThisArg*/ false);
                Debug.assertNotNode(updated, isSyntheticReference);
                return updated;
            }
            case SyntaxKind.PropertyAccessExpression:
            case SyntaxKind.ElementAccessExpression:
                if (isOptionalChain(node)) {
                    const updated = visitOptionalExpression(node, /*captureThisArg*/ false, /*isDelete*/ false);
                    Debug.assertNotNode(updated, isSyntheticReference);
                    return updated;
                }
                return visitEachChild(node, visitor, context);
            case SyntaxKind.BinaryExpression:
                if (node.operatorToken.kind === SyntaxKind.QuestionQuestionToken) {
                    return transformNullishCoalescingExpression(node);
                }
                return visitEachChild(node, visitor, context);
            case SyntaxKind.DeleteExpression:
                return visitDeleteExpression(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    function flattenChain(chain) {
        Debug.assertNotNode(chain, isNonNullChain);
        const links = [chain];
        while (!chain.questionDotToken && !isTaggedTemplateExpression(chain)) {
            chain = cast(skipPartiallyEmittedExpressions(chain.expression), isOptionalChain);
            Debug.assertNotNode(chain, isNonNullChain);
            links.unshift(chain);
        }
        return { expression: chain.expression, chain: links };
    }
    function visitNonOptionalParenthesizedExpression(node, captureThisArg, isDelete) {
        const expression = visitNonOptionalExpression(node.expression, captureThisArg, isDelete);
        if (isSyntheticReference(expression)) {
            // `(a.b)` -> { expression `((_a = a).b)`, thisArg: `_a` }
            // `(a[b])` -> { expression `((_a = a)[b])`, thisArg: `_a` }
            return factory.createSyntheticReferenceExpression(factory.updateParenthesizedExpression(node, expression.expression), expression.thisArg);
        }
        return factory.updateParenthesizedExpression(node, expression);
    }
    function visitNonOptionalPropertyOrElementAccessExpression(node, captureThisArg, isDelete) {
        if (isOptionalChain(node)) {
            // If `node` is an optional chain, then it is the outermost chain of an optional expression.
            return visitOptionalExpression(node, captureThisArg, isDelete);
        }
        let expression = visitNode(node.expression, visitor, isExpression);
        Debug.assertNotNode(expression, isSyntheticReference);
        let thisArg;
        if (captureThisArg) {
            if (!isSimpleCopiableExpression(expression)) {
                thisArg = factory.createTempVariable(hoistVariableDeclaration);
                expression = factory.createAssignment(thisArg, expression);
            }
            else {
                thisArg = expression;
            }
        }
        expression = node.kind === SyntaxKind.PropertyAccessExpression
            ? factory.updatePropertyAccessExpression(node, expression, visitNode(node.name, visitor, isIdentifier))
            : factory.updateElementAccessExpression(node, expression, visitNode(node.argumentExpression, visitor, isExpression));
        return thisArg ? factory.createSyntheticReferenceExpression(expression, thisArg) : expression;
    }
    function visitNonOptionalCallExpression(node, captureThisArg) {
        if (isOptionalChain(node)) {
            // If `node` is an optional chain, then it is the outermost chain of an optional expression.
            return visitOptionalExpression(node, captureThisArg, /*isDelete*/ false);
        }
        if (isParenthesizedExpression(node.expression) && isOptionalChain(skipParentheses(node.expression))) {
            // capture thisArg for calls of parenthesized optional chains like `(foo?.bar)()`
            const expression = visitNonOptionalParenthesizedExpression(node.expression, /*captureThisArg*/ true, /*isDelete*/ false);
            const args = visitNodes(node.arguments, visitor, isExpression);
            if (isSyntheticReference(expression)) {
                return setTextRange(factory.createFunctionCallCall(expression.expression, expression.thisArg, args), node);
            }
            return factory.updateCallExpression(node, expression, /*typeArguments*/ undefined, args);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitNonOptionalExpression(node, captureThisArg, isDelete) {
        switch (node.kind) {
            case SyntaxKind.ParenthesizedExpression:
                return visitNonOptionalParenthesizedExpression(node, captureThisArg, isDelete);
            case SyntaxKind.PropertyAccessExpression:
            case SyntaxKind.ElementAccessExpression:
                return visitNonOptionalPropertyOrElementAccessExpression(node, captureThisArg, isDelete);
            case SyntaxKind.CallExpression:
                return visitNonOptionalCallExpression(node, captureThisArg);
            default:
                return visitNode(node, visitor, isExpression);
        }
    }
    function visitOptionalExpression(node, captureThisArg, isDelete) {
        const { expression, chain } = flattenChain(node);
        const left = visitNonOptionalExpression(skipPartiallyEmittedExpressions(expression), isCallChain(chain[0]), /*isDelete*/ false);
        let leftThisArg = isSyntheticReference(left) ? left.thisArg : undefined;
        let capturedLeft = isSyntheticReference(left) ? left.expression : left;
        let leftExpression = factory.restoreOuterExpressions(expression, capturedLeft, OuterExpressionKinds.PartiallyEmittedExpressions);
        if (!isSimpleCopiableExpression(capturedLeft)) {
            capturedLeft = factory.createTempVariable(hoistVariableDeclaration);
            leftExpression = factory.createAssignment(capturedLeft, leftExpression);
        }
        let rightExpression = capturedLeft;
        let thisArg;
        for (let i = 0; i < chain.length; i++) {
            const segment = chain[i];
            switch (segment.kind) {
                case SyntaxKind.PropertyAccessExpression:
                case SyntaxKind.ElementAccessExpression:
                    if (i === chain.length - 1 && captureThisArg) {
                        if (!isSimpleCopiableExpression(rightExpression)) {
                            thisArg = factory.createTempVariable(hoistVariableDeclaration);
                            rightExpression = factory.createAssignment(thisArg, rightExpression);
                        }
                        else {
                            thisArg = rightExpression;
                        }
                    }
                    rightExpression = segment.kind === SyntaxKind.PropertyAccessExpression
                        ? factory.createPropertyAccessExpression(rightExpression, visitNode(segment.name, visitor, isIdentifier))
                        : factory.createElementAccessExpression(rightExpression, visitNode(segment.argumentExpression, visitor, isExpression));
                    break;
                case SyntaxKind.CallExpression:
                    if (i === 0 && leftThisArg) {
                        if (!isGeneratedIdentifier(leftThisArg)) {
                            leftThisArg = factory.cloneNode(leftThisArg);
                            addEmitFlags(leftThisArg, EmitFlags.NoComments);
                        }
                        rightExpression = factory.createFunctionCallCall(rightExpression, leftThisArg.kind === SyntaxKind.SuperKeyword ? factory.createThis() : leftThisArg, visitNodes(segment.arguments, visitor, isExpression));
                    }
                    else {
                        rightExpression = factory.createCallExpression(rightExpression, 
                        /*typeArguments*/ undefined, visitNodes(segment.arguments, visitor, isExpression));
                    }
                    break;
            }
            setOriginalNode(rightExpression, segment);
        }
        const target = isDelete
            ? factory.createConditionalExpression(createNotNullCondition(leftExpression, capturedLeft, /*invert*/ true), /*questionToken*/ undefined, factory.createTrue(), /*colonToken*/ undefined, factory.createDeleteExpression(rightExpression))
            : factory.createConditionalExpression(createNotNullCondition(leftExpression, capturedLeft, /*invert*/ true), /*questionToken*/ undefined, factory.createVoidZero(), /*colonToken*/ undefined, rightExpression);
        setTextRange(target, node);
        return thisArg ? factory.createSyntheticReferenceExpression(target, thisArg) : target;
    }
    function createNotNullCondition(left, right, invert) {
        return factory.createBinaryExpression(factory.createBinaryExpression(left, factory.createToken(invert ? SyntaxKind.EqualsEqualsEqualsToken : SyntaxKind.ExclamationEqualsEqualsToken), factory.createNull()), factory.createToken(invert ? SyntaxKind.BarBarToken : SyntaxKind.AmpersandAmpersandToken), factory.createBinaryExpression(right, factory.createToken(invert ? SyntaxKind.EqualsEqualsEqualsToken : SyntaxKind.ExclamationEqualsEqualsToken), factory.createVoidZero()));
    }
    function transformNullishCoalescingExpression(node) {
        let left = visitNode(node.left, visitor, isExpression);
        let right = left;
        if (!isSimpleCopiableExpression(left)) {
            right = factory.createTempVariable(hoistVariableDeclaration);
            left = factory.createAssignment(right, left);
        }
        return setTextRange(factory.createConditionalExpression(createNotNullCondition(left, right), 
        /*questionToken*/ undefined, right, 
        /*colonToken*/ undefined, visitNode(node.right, visitor, isExpression)), node);
    }
    function visitDeleteExpression(node) {
        return isOptionalChain(skipParentheses(node.expression))
            ? setOriginalNode(visitNonOptionalExpression(node.expression, /*captureThisArg*/ false, /*isDelete*/ true), node)
            : factory.updateDeleteExpression(node, visitNode(node.expression, visitor, isExpression));
    }
}
