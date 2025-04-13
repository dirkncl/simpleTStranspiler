import {
  countWhere,
  Debug,
  EmitFlags,
  factory,
  findAncestor,
  forEachReturnStatement,
  FunctionFlags,
  getEffectiveReturnTypeNode,
  getEffectiveSetAccessorTypeAnnotationNode,
  getEffectiveTypeAnnotationNode,
  getEmitFlags,
  getEmitScriptTarget,
  getFunctionFlags,
  getJSDocType,
  getJSDocTypeAssertionType,
  getSourceFileOfNode,
  getStrictOptionValue,
  hasDynamicName,
  isAsExpression,
  isBlock,
  isCallExpression,
  isComputedPropertyName,
  isConditionalTypeNode,
  isConstTypeReference,
  isDeclaration,
  isDeclarationReadonly,
  isEntityName,
  isEntityNameExpression,
  isExpressionWithTypeArguments,
  isFunctionLike,
  isFunctionLikeDeclaration,
  isGetAccessor,
  isIdentifier,
  isIdentifierText,
  isImportAttributes,
  isImportTypeNode,
  isIndexedAccessTypeNode,
  isInJSFile,
  isJSDocAllType,
  isJSDocConstructSignature,
  isJSDocFunctionType,
  isJSDocIndexSignature,
  isJSDocNonNullableType,
  isJSDocNullableType,
  isJSDocOptionalType,
  isJSDocTypeAssertion,
  isJSDocTypeExpression,
  isJSDocTypeLiteral,
  isJSDocUnknownType,
  isJSDocVariadicType,
  isJsxElement,
  isJsxExpression,
  isKeyword,
  isLiteralImportTypeNode,
  isLiteralTypeNode,
  isMappedTypeNode,
  isModifier,
  isNamedDeclaration,
  isNewScopeNode,
  isOptionalDeclaration,
  isParameter,
  isPrimitiveLiteralValue,
  isPropertyDeclaration,
  isPropertySignature,
  isShorthandPropertyAssignment,
  isSpreadAssignment,
  isStringLiteral,
  isThisTypeNode,
  isTupleTypeNode,
  isTypeAssertionExpression,
  isTypeLiteralNode,
  isTypeNode,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypePredicateNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  isValueSignatureDeclaration,
  isVarConstLike,
  isVariableDeclaration,
  map,
  mapDefined,
  NodeBuilderFlags,
  NodeFlags,
  nodeIsMissing,
  setCommentRange,
  setEmitFlags,
  setOriginalNode,
  setTextRangePosEnd,
  skipTypeParentheses,
  SyntaxKind,
  visitEachChild as visitEachChildWorker,
  visitNode,
  visitNodes,
  walkUpParenthesizedExpressions,
} from "./_namespaces/ts.js";


function syntacticResult(type, reportFallback = true) {
    return { type, reportFallback };
}

const notImplemented = syntacticResult(/*type*/ undefined, /*reportFallback*/ false);
const alreadyReported = syntacticResult(/*type*/ undefined, /*reportFallback*/ false);
const failed = syntacticResult(/*type*/ undefined, /*reportFallback*/ true);

/** @internal */
export function createSyntacticTypeNodeBuilder(options, resolver) {
    const strictNullChecks = getStrictOptionValue(options, "strictNullChecks");
    return {
        serializeTypeOfDeclaration,
        serializeReturnTypeForSignature,
        serializeTypeOfExpression,
        serializeTypeOfAccessor,
        tryReuseExistingTypeNode(context, existing) {
            if (!resolver.canReuseTypeNode(context, existing)) {
                return undefined;
            }
            return tryReuseExistingTypeNode(context, existing);
        },
    };
    function reuseNode(context, node, range = node) {
        return node === undefined ? undefined : resolver.markNodeReuse(context, node.flags & NodeFlags.Synthesized ? node : factory.cloneNode(node), range !== null && range !== void 0 ? range : node);
    }
    function tryReuseExistingTypeNode(context, existing) {
        const { finalizeBoundary, startRecoveryScope, hadError, markError } = resolver.createRecoveryBoundary(context);
        const transformed = visitNode(existing, visitExistingNodeTreeSymbols, isTypeNode);
        if (!finalizeBoundary()) {
            return undefined;
        }
        context.approximateLength += existing.end - existing.pos;
        return transformed;
        function visitExistingNodeTreeSymbols(node) {
            // If there was an error in a sibling node bail early, the result will be discarded anyway
            if (hadError())
                return node;
            const recover = startRecoveryScope();
            const onExitNewScope = isNewScopeNode(node) ? resolver.enterNewScope(context, node) : undefined;
            const result = visitExistingNodeTreeSymbolsWorker(node);
            onExitNewScope === null || onExitNewScope === void 0 ? void 0 : onExitNewScope();
            // If there was an error, maybe we can recover by serializing the actual type of the node
            if (hadError()) {
                if (isTypeNode(node) && !isTypePredicateNode(node)) {
                    recover();
                    return resolver.serializeExistingTypeNode(context, node);
                }
                return node;
            }
            // We want to clone the subtree, so when we mark it up with __pos and __end in quickfixes,
            //  we don't get odd behavior because of reused nodes. We also need to clone to _remove_
            //  the position information if the node comes from a different file than the one the node builder
            //  is set to build for (even though we are reusing the node structure, the position information
            //  would make the printer print invalid spans for literals and identifiers, and the formatter would
            //  choke on the mismatched positonal spans between a parent and an injected child from another file).
            return result ? resolver.markNodeReuse(context, result, node) : undefined;
        }
        function tryVisitSimpleTypeNode(node) {
            const innerNode = skipTypeParentheses(node);
            switch (innerNode.kind) {
                case SyntaxKind.TypeReference:
                    return tryVisitTypeReference(innerNode);
                case SyntaxKind.TypeQuery:
                    return tryVisitTypeQuery(innerNode);
                case SyntaxKind.IndexedAccessType:
                    return tryVisitIndexedAccess(innerNode);
                case SyntaxKind.TypeOperator:
                    const typeOperatorNode = innerNode;
                    if (typeOperatorNode.operator === SyntaxKind.KeyOfKeyword) {
                        return tryVisitKeyOf(typeOperatorNode);
                    }
            }
            return visitNode(node, visitExistingNodeTreeSymbols, isTypeNode);
        }
        function tryVisitIndexedAccess(node) {
            const resultObjectType = tryVisitSimpleTypeNode(node.objectType);
            if (resultObjectType === undefined) {
                return undefined;
            }
            return factory.updateIndexedAccessTypeNode(node, resultObjectType, visitNode(node.indexType, visitExistingNodeTreeSymbols, isTypeNode));
        }
        function tryVisitKeyOf(node) {
            Debug.assertEqual(node.operator, SyntaxKind.KeyOfKeyword);
            const type = tryVisitSimpleTypeNode(node.type);
            if (type === undefined) {
                return undefined;
            }
            return factory.updateTypeOperatorNode(node, type);
        }
        function tryVisitTypeQuery(node) {
            const { introducesError, node: exprName } = resolver.trackExistingEntityName(context, node.exprName);
            if (!introducesError) {
                return factory.updateTypeQueryNode(node, exprName, visitNodes(node.typeArguments, visitExistingNodeTreeSymbols, isTypeNode));
            }
            const serializedName = resolver.serializeTypeName(context, node.exprName, /*isTypeOf*/ true);
            if (serializedName) {
                return resolver.markNodeReuse(context, serializedName, node.exprName);
            }
        }
        function tryVisitTypeReference(node) {
            if (resolver.canReuseTypeNode(context, node)) {
                const { introducesError, node: newName } = resolver.trackExistingEntityName(context, node.typeName);
                const typeArguments = visitNodes(node.typeArguments, visitExistingNodeTreeSymbols, isTypeNode);
                if (!introducesError) {
                    const updated = factory.updateTypeReferenceNode(node, newName, typeArguments);
                    return resolver.markNodeReuse(context, updated, node);
                }
                else {
                    const serializedName = resolver.serializeTypeName(context, node.typeName, /*isTypeOf*/ false, typeArguments);
                    if (serializedName) {
                        return resolver.markNodeReuse(context, serializedName, node.typeName);
                    }
                }
            }
        }
        function visitExistingNodeTreeSymbolsWorker(node) {
            var _a;
            if (isJSDocTypeExpression(node)) {
                // Unwrap JSDocTypeExpressions
                return visitNode(node.type, visitExistingNodeTreeSymbols, isTypeNode);
            }
            // We don't _actually_ support jsdoc namepath types, emit `any` instead
            if (isJSDocAllType(node) || node.kind === SyntaxKind.JSDocNamepathType) {
                return factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
            }
            if (isJSDocUnknownType(node)) {
                return factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword);
            }
            if (isJSDocNullableType(node)) {
                return factory.createUnionTypeNode([visitNode(node.type, visitExistingNodeTreeSymbols, isTypeNode), factory.createLiteralTypeNode(factory.createNull())]);
            }
            if (isJSDocOptionalType(node)) {
                return factory.createUnionTypeNode([visitNode(node.type, visitExistingNodeTreeSymbols, isTypeNode), factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)]);
            }
            if (isJSDocNonNullableType(node)) {
                return visitNode(node.type, visitExistingNodeTreeSymbols);
            }
            if (isJSDocVariadicType(node)) {
                return factory.createArrayTypeNode(visitNode(node.type, visitExistingNodeTreeSymbols, isTypeNode));
            }
            if (isJSDocTypeLiteral(node)) {
                return factory.createTypeLiteralNode(map(node.jsDocPropertyTags, t => {
                    const name = visitNode(isIdentifier(t.name) ? t.name : t.name.right, visitExistingNodeTreeSymbols, isIdentifier);
                    const overrideTypeNode = resolver.getJsDocPropertyOverride(context, node, t);
                    return factory.createPropertySignature(
                    /*modifiers*/ undefined, name, t.isBracketed || t.typeExpression && isJSDocOptionalType(t.typeExpression.type) ? factory.createToken(SyntaxKind.QuestionToken) : undefined, overrideTypeNode || (t.typeExpression && visitNode(t.typeExpression.type, visitExistingNodeTreeSymbols, isTypeNode)) || factory.createKeywordTypeNode(SyntaxKind.AnyKeyword));
                }));
            }
            if (isTypeReferenceNode(node) && isIdentifier(node.typeName) && node.typeName.escapedText === "") {
                return setOriginalNode(factory.createKeywordTypeNode(SyntaxKind.AnyKeyword), node);
            }
            if ((isExpressionWithTypeArguments(node) || isTypeReferenceNode(node)) && isJSDocIndexSignature(node)) {
                return factory.createTypeLiteralNode([factory.createIndexSignature(
                    /*modifiers*/ undefined, [factory.createParameterDeclaration(
                        /*modifiers*/ undefined, 
                        /*dotDotDotToken*/ undefined, "x", 
                        /*questionToken*/ undefined, visitNode(node.typeArguments[0], visitExistingNodeTreeSymbols, isTypeNode))], visitNode(node.typeArguments[1], visitExistingNodeTreeSymbols, isTypeNode))]);
            }
            if (isJSDocFunctionType(node)) {
                if (isJSDocConstructSignature(node)) {
                    let newTypeNode;
                    return factory.createConstructorTypeNode(
                    /*modifiers*/ undefined, visitNodes(node.typeParameters, visitExistingNodeTreeSymbols, isTypeParameterDeclaration), mapDefined(node.parameters, (p, i) => p.name && isIdentifier(p.name) && p.name.escapedText === "new" ? (newTypeNode = p.type, undefined) : factory.createParameterDeclaration(
                    /*modifiers*/ undefined, getEffectiveDotDotDotForParameter(p), resolver.markNodeReuse(context, factory.createIdentifier(getNameForJSDocFunctionParameter(p, i)), p), factory.cloneNode(p.questionToken), visitNode(p.type, visitExistingNodeTreeSymbols, isTypeNode), 
                    /*initializer*/ undefined)), visitNode(newTypeNode || node.type, visitExistingNodeTreeSymbols, isTypeNode) || factory.createKeywordTypeNode(SyntaxKind.AnyKeyword));
                }
                else {
                    return factory.createFunctionTypeNode(visitNodes(node.typeParameters, visitExistingNodeTreeSymbols, isTypeParameterDeclaration), map(node.parameters, (p, i) => factory.createParameterDeclaration(
                    /*modifiers*/ undefined, getEffectiveDotDotDotForParameter(p), resolver.markNodeReuse(context, factory.createIdentifier(getNameForJSDocFunctionParameter(p, i)), p), factory.cloneNode(p.questionToken), visitNode(p.type, visitExistingNodeTreeSymbols, isTypeNode), 
                    /*initializer*/ undefined)), visitNode(node.type, visitExistingNodeTreeSymbols, isTypeNode) || factory.createKeywordTypeNode(SyntaxKind.AnyKeyword));
                }
            }
            if (isThisTypeNode(node)) {
                if (resolver.canReuseTypeNode(context, node)) {
                    return node;
                }
                markError();
                return node;
            }
            if (isTypeParameterDeclaration(node)) {
                const { node: newName } = resolver.trackExistingEntityName(context, node.name);
                return factory.updateTypeParameterDeclaration(node, visitNodes(node.modifiers, visitExistingNodeTreeSymbols, isModifier), 
                // resolver.markNodeReuse(context, typeParameterToName(getDeclaredTypeOfSymbol(getSymbolOfDeclaration(node)), context), node),
                newName, visitNode(node.constraint, visitExistingNodeTreeSymbols, isTypeNode), visitNode(node.default, visitExistingNodeTreeSymbols, isTypeNode));
            }
            if (isIndexedAccessTypeNode(node)) {
                const result = tryVisitIndexedAccess(node);
                if (!result) {
                    markError();
                    return node;
                }
                return result;
            }
            if (isTypeReferenceNode(node)) {
                const result = tryVisitTypeReference(node);
                if (result) {
                    return result;
                }
                markError();
                return node;
            }
            if (isLiteralImportTypeNode(node)) {
                // assert keyword in imported attributes is deprecated, so we don't reuse types that contain it
                // Ex: import("pkg", { assert: {} }
                if (((_a = node.attributes) === null || _a === void 0 ? void 0 : _a.token) === SyntaxKind.AssertKeyword) {
                    markError();
                    return node;
                }
                if (!resolver.canReuseTypeNode(context, node)) {
                    return resolver.serializeExistingTypeNode(context, node);
                }
                const specifier = rewriteModuleSpecifier(node, node.argument.literal);
                const literal = specifier === node.argument.literal ? reuseNode(context, node.argument.literal) : specifier;
                return factory.updateImportTypeNode(node, literal === node.argument.literal ? reuseNode(context, node.argument) : factory.createLiteralTypeNode(literal), visitNode(node.attributes, visitExistingNodeTreeSymbols, isImportAttributes), visitNode(node.qualifier, visitExistingNodeTreeSymbols, isEntityName), visitNodes(node.typeArguments, visitExistingNodeTreeSymbols, isTypeNode), node.isTypeOf);
            }
            if (isNamedDeclaration(node) && node.name.kind === SyntaxKind.ComputedPropertyName && !resolver.hasLateBindableName(node)) {
                if (!hasDynamicName(node)) {
                    return visitEachChild(node, visitExistingNodeTreeSymbols);
                }
                if (resolver.shouldRemoveDeclaration(context, node)) {
                    return undefined;
                }
            }
            if ((isFunctionLike(node) && !node.type)
                || (isPropertyDeclaration(node) && !node.type && !node.initializer)
                || (isPropertySignature(node) && !node.type && !node.initializer)
                || (isParameter(node) && !node.type && !node.initializer)) {
                let visited = visitEachChild(node, visitExistingNodeTreeSymbols);
                if (visited === node) {
                    visited = resolver.markNodeReuse(context, factory.cloneNode(node), node);
                }
                visited.type = factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
                if (isParameter(node)) {
                    visited.modifiers = undefined;
                }
                return visited;
            }
            if (isTypeQueryNode(node)) {
                const result = tryVisitTypeQuery(node);
                if (!result) {
                    markError();
                    return node;
                }
                return result;
            }
            if (isComputedPropertyName(node) && isEntityNameExpression(node.expression)) {
                const { node: result, introducesError } = resolver.trackExistingEntityName(context, node.expression);
                if (!introducesError) {
                    return factory.updateComputedPropertyName(node, result);
                }
                else {
                    const computedPropertyNameType = resolver.serializeTypeOfExpression(context, node.expression);
                    let literal;
                    if (isLiteralTypeNode(computedPropertyNameType)) {
                        literal = computedPropertyNameType.literal;
                    }
                    else {
                        const evaluated = resolver.evaluateEntityNameExpression(node.expression);
                        const literalNode = typeof evaluated.value === "string" ? factory.createStringLiteral(evaluated.value, /*isSingleQuote*/ undefined) :
                            typeof evaluated.value === "number" ? factory.createNumericLiteral(evaluated.value, /*numericLiteralFlags*/ 0) :
                                undefined;
                        if (!literalNode) {
                            if (isImportTypeNode(computedPropertyNameType)) {
                                resolver.trackComputedName(context, node.expression);
                            }
                            return node;
                        }
                        literal = literalNode;
                    }
                    if (literal.kind === SyntaxKind.StringLiteral && isIdentifierText(literal.text, getEmitScriptTarget(options))) {
                        return factory.createIdentifier(literal.text);
                    }
                    if (literal.kind === SyntaxKind.NumericLiteral && !literal.text.startsWith("-")) {
                        return literal;
                    }
                    return factory.updateComputedPropertyName(node, literal);
                }
            }
            if (isTypePredicateNode(node)) {
                let parameterName;
                if (isIdentifier(node.parameterName)) {
                    const { node: result, introducesError } = resolver.trackExistingEntityName(context, node.parameterName);
                    // Should not usually happen the only case is when a type predicate comes from a JSDoc type annotation with it's own parameter symbol definition.
                    // /** @type {(v: unknown) => v is undefined} */
                    // const isUndef = v => v === undefined;
                    if (introducesError)
                        markError();
                    parameterName = result;
                }
                else {
                    parameterName = factory.cloneNode(node.parameterName);
                }
                return factory.updateTypePredicateNode(node, factory.cloneNode(node.assertsModifier), parameterName, visitNode(node.type, visitExistingNodeTreeSymbols, isTypeNode));
            }
            if (isTupleTypeNode(node) || isTypeLiteralNode(node) || isMappedTypeNode(node)) {
                const visited = visitEachChild(node, visitExistingNodeTreeSymbols);
                const clone = resolver.markNodeReuse(context, visited === node ? factory.cloneNode(node) : visited, node);
                const flags = getEmitFlags(clone);
                setEmitFlags(clone, flags | (context.flags & NodeBuilderFlags.MultilineObjectLiterals && isTypeLiteralNode(node) ? 0 : EmitFlags.SingleLine));
                return clone;
            }
            if (isStringLiteral(node) && !!(context.flags & NodeBuilderFlags.UseSingleQuotesForStringLiteralType) && !node.singleQuote) {
                const clone = factory.cloneNode(node);
                clone.singleQuote = true;
                return clone;
            }
            if (isConditionalTypeNode(node)) {
                const checkType = visitNode(node.checkType, visitExistingNodeTreeSymbols, isTypeNode);
                const disposeScope = resolver.enterNewScope(context, node);
                const extendType = visitNode(node.extendsType, visitExistingNodeTreeSymbols, isTypeNode);
                const trueType = visitNode(node.trueType, visitExistingNodeTreeSymbols, isTypeNode);
                disposeScope();
                const falseType = visitNode(node.falseType, visitExistingNodeTreeSymbols, isTypeNode);
                return factory.updateConditionalTypeNode(node, checkType, extendType, trueType, falseType);
            }
            if (isTypeOperatorNode(node)) {
                if (node.operator === SyntaxKind.UniqueKeyword && node.type.kind === SyntaxKind.SymbolKeyword) {
                    if (!resolver.canReuseTypeNode(context, node)) {
                        markError();
                        return node;
                    }
                }
                else if (node.operator === SyntaxKind.KeyOfKeyword) {
                    const result = tryVisitKeyOf(node);
                    if (!result) {
                        markError();
                        return node;
                    }
                    return result;
                }
            }
            return visitEachChild(node, visitExistingNodeTreeSymbols);
            function visitEachChild(node, visitor) {
                const nonlocalNode = !context.enclosingFile || context.enclosingFile !== getSourceFileOfNode(node);
                return visitEachChildWorker(node, visitor, /*context*/ undefined, nonlocalNode ? visitNodesWithoutCopyingPositions : undefined);
            }
            function visitNodesWithoutCopyingPositions(nodes, visitor, test, start, count) {
                let result = visitNodes(nodes, visitor, test, start, count);
                if (result) {
                    if (result.pos !== -1 || result.end !== -1) {
                        if (result === nodes) {
                            result = factory.createNodeArray(nodes.slice(), nodes.hasTrailingComma);
                        }
                        setTextRangePosEnd(result, -1, -1);
                    }
                }
                return result;
            }
            function getEffectiveDotDotDotForParameter(p) {
                return p.dotDotDotToken || (p.type && isJSDocVariadicType(p.type) ? factory.createToken(SyntaxKind.DotDotDotToken) : undefined);
            }
            /** Note that `new:T` parameters are not handled, but should be before calling this function. */
            function getNameForJSDocFunctionParameter(p, index) {
                return p.name && isIdentifier(p.name) && p.name.escapedText === "this" ? "this"
                    : getEffectiveDotDotDotForParameter(p) ? `args`
                        : `arg${index}`;
            }
            function rewriteModuleSpecifier(parent, lit) {
                const newName = resolver.getModuleSpecifierOverride(context, parent, lit);
                return newName ? setOriginalNode(factory.createStringLiteral(newName), lit) : lit;
            }
        }
    }
    function serializeExistingTypeNode(typeNode, context, addUndefined) {
        if (!typeNode)
            return undefined;
        let result;
        if ((!addUndefined || canAddUndefined(typeNode)) && resolver.canReuseTypeNode(context, typeNode)) {
            result = tryReuseExistingTypeNode(context, typeNode);
            if (result !== undefined) {
                result = addUndefinedIfNeeded(result, addUndefined, /*owner*/ undefined, context);
            }
        }
        return result;
    }
    function serializeTypeAnnotationOfDeclaration(declaredType, context, node, symbol, requiresAddingUndefined, useFallback = requiresAddingUndefined !== undefined) {
        var _a;
        if (!declaredType)
            return undefined;
        if (!resolver.canReuseTypeNodeAnnotation(context, node, declaredType, symbol, requiresAddingUndefined)) {
            // If we need to add undefined, can add undefined, and the resolver says we can reuse the type, we reuse the type
            // If we don't know syntactically that we can add the undefined, we will report the fallback below.
            if (!requiresAddingUndefined || !resolver.canReuseTypeNodeAnnotation(context, node, declaredType, symbol, /*requiresAddingUndefined*/ false)) {
                return undefined;
            }
        }
        let result;
        if (!requiresAddingUndefined || canAddUndefined(declaredType)) {
            result = serializeExistingTypeNode(declaredType, context, requiresAddingUndefined);
        }
        if (result !== undefined || !useFallback) {
            return result;
        }
        context.tracker.reportInferenceFallback(node);
        return (_a = resolver.serializeExistingTypeNode(context, declaredType, requiresAddingUndefined)) !== null && _a !== void 0 ? _a : factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
    function serializeExistingTypeNodeWithFallback(typeNode, context, addUndefined, targetNode) {
        var _a;
        if (!typeNode)
            return undefined;
        const result = serializeExistingTypeNode(typeNode, context, addUndefined);
        if (result !== undefined) {
            return result;
        }
        context.tracker.reportInferenceFallback(targetNode !== null && targetNode !== void 0 ? targetNode : typeNode);
        return (_a = resolver.serializeExistingTypeNode(context, typeNode, addUndefined)) !== null && _a !== void 0 ? _a : factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
    function serializeTypeOfAccessor(accessor, symbol, context) {
        var _a;
        return (_a = typeFromAccessor(accessor, symbol, context)) !== null && _a !== void 0 ? _a : inferAccessorType(accessor, resolver.getAllAccessorDeclarations(accessor), context, symbol);
    }
    function serializeTypeOfExpression(expr, context, addUndefined, preserveLiterals) {
        const result = typeFromExpression(expr, context, /*isConstContext*/ false, addUndefined, preserveLiterals);
        return result.type !== undefined ? result.type : inferExpressionType(expr, context, result.reportFallback);
    }
    function serializeTypeOfDeclaration(node, symbol, context) {
        switch (node.kind) {
            case SyntaxKind.Parameter:
            case SyntaxKind.JSDocParameterTag:
                return typeFromParameter(node, symbol, context);
            case SyntaxKind.VariableDeclaration:
                return typeFromVariable(node, symbol, context);
            case SyntaxKind.PropertySignature:
            case SyntaxKind.JSDocPropertyTag:
            case SyntaxKind.PropertyDeclaration:
                return typeFromProperty(node, symbol, context);
            case SyntaxKind.BindingElement:
                return inferTypeOfDeclaration(node, symbol, context);
            case SyntaxKind.ExportAssignment:
                return serializeTypeOfExpression(node.expression, context, /*addUndefined*/ undefined, /*preserveLiterals*/ true);
            case SyntaxKind.PropertyAccessExpression:
            case SyntaxKind.ElementAccessExpression:
            case SyntaxKind.BinaryExpression:
                return typeFromExpandoProperty(node, symbol, context);
            case SyntaxKind.PropertyAssignment:
            case SyntaxKind.ShorthandPropertyAssignment:
                return typeFromPropertyAssignment(node, symbol, context);
            default:
                Debug.assertNever(node, `Node needs to be an inferrable node, found ${Debug.formatSyntaxKind(node.kind)}`);
        }
    }
    function typeFromPropertyAssignment(node, symbol, context) {
        const typeAnnotation = getEffectiveTypeAnnotationNode(node);
        let result;
        if (typeAnnotation && resolver.canReuseTypeNodeAnnotation(context, node, typeAnnotation, symbol)) {
            result = serializeExistingTypeNode(typeAnnotation, context);
        }
        if (!result && node.kind === SyntaxKind.PropertyAssignment) {
            const initializer = node.initializer;
            const assertionNode = isJSDocTypeAssertion(initializer) ? getJSDocTypeAssertionType(initializer) :
                initializer.kind === SyntaxKind.AsExpression || initializer.kind === SyntaxKind.TypeAssertionExpression ? initializer.type :
                    undefined;
            if (assertionNode && !isConstTypeReference(assertionNode) && resolver.canReuseTypeNodeAnnotation(context, node, assertionNode, symbol)) {
                result = serializeExistingTypeNode(assertionNode, context);
            }
        }
        return result !== null && result !== void 0 ? result : inferTypeOfDeclaration(node, symbol, context, /*reportFallback*/ false);
    }
    function serializeReturnTypeForSignature(node, symbol, context) {
        switch (node.kind) {
            case SyntaxKind.GetAccessor:
                return serializeTypeOfAccessor(node, symbol, context);
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.ConstructSignature:
            case SyntaxKind.MethodSignature:
            case SyntaxKind.CallSignature:
            case SyntaxKind.Constructor:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.IndexSignature:
            case SyntaxKind.FunctionType:
            case SyntaxKind.ConstructorType:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.JSDocFunctionType:
            case SyntaxKind.JSDocSignature:
                return createReturnFromSignature(node, symbol, context);
            default:
                Debug.assertNever(node, `Node needs to be an inferrable node, found ${Debug.formatSyntaxKind(node.kind)}`);
        }
    }
    function getTypeAnnotationFromAccessor(accessor) {
        if (accessor) {
            return accessor.kind === SyntaxKind.GetAccessor
                ? (isInJSFile(accessor) && getJSDocType(accessor)) || getEffectiveReturnTypeNode(accessor)
                : getEffectiveSetAccessorTypeAnnotationNode(accessor);
        }
    }
    function getTypeAnnotationFromAllAccessorDeclarations(node, accessors) {
        let accessorType = getTypeAnnotationFromAccessor(node);
        if (!accessorType && node !== accessors.firstAccessor) {
            accessorType = getTypeAnnotationFromAccessor(accessors.firstAccessor);
        }
        if (!accessorType && accessors.secondAccessor && node !== accessors.secondAccessor) {
            accessorType = getTypeAnnotationFromAccessor(accessors.secondAccessor);
        }
        return accessorType;
    }
    function typeFromAccessor(node, symbol, context) {
        const accessorDeclarations = resolver.getAllAccessorDeclarations(node);
        const accessorType = getTypeAnnotationFromAllAccessorDeclarations(node, accessorDeclarations);
        if (accessorType && !isTypePredicateNode(accessorType)) {
            return withNewScope(context, node, () => { var _a; return (_a = serializeTypeAnnotationOfDeclaration(accessorType, context, node, symbol)) !== null && _a !== void 0 ? _a : inferTypeOfDeclaration(node, symbol, context); });
        }
        if (accessorDeclarations.getAccessor) {
            return withNewScope(context, accessorDeclarations.getAccessor, () => createReturnFromSignature(accessorDeclarations.getAccessor, symbol, context));
        }
        return undefined;
    }
    function typeFromVariable(node, symbol, context) {
        var _a;
        const declaredType = getEffectiveTypeAnnotationNode(node);
        let resultType = failed;
        if (declaredType) {
            resultType = syntacticResult(serializeTypeAnnotationOfDeclaration(declaredType, context, node, symbol));
        }
        else if (node.initializer && (((_a = symbol.declarations) === null || _a === void 0 ? void 0 : _a.length) === 1 || countWhere(symbol.declarations, isVariableDeclaration) === 1)) {
            if (!resolver.isExpandoFunctionDeclaration(node) && !isContextuallyTyped(node)) {
                resultType = typeFromExpression(node.initializer, context, /*isConstContext*/ undefined, /*requiresAddingUndefined*/ undefined, isVarConstLike(node));
            }
        }
        return resultType.type !== undefined ? resultType.type : inferTypeOfDeclaration(node, symbol, context, resultType.reportFallback);
    }
    function typeFromParameter(node, symbol, context) {
        const parent = node.parent;
        if (parent.kind === SyntaxKind.SetAccessor) {
            return serializeTypeOfAccessor(parent, /*symbol*/ undefined, context);
        }
        const declaredType = getEffectiveTypeAnnotationNode(node);
        const addUndefined = resolver.requiresAddingImplicitUndefined(node, symbol, context.enclosingDeclaration);
        let resultType = failed;
        if (declaredType) {
            resultType = syntacticResult(serializeTypeAnnotationOfDeclaration(declaredType, context, node, symbol, addUndefined));
        }
        else if (isParameter(node) && node.initializer && isIdentifier(node.name) && !isContextuallyTyped(node)) {
            resultType = typeFromExpression(node.initializer, context, /*isConstContext*/ undefined, addUndefined);
        }
        return resultType.type !== undefined ? resultType.type : inferTypeOfDeclaration(node, symbol, context, resultType.reportFallback);
    }
    /**
     * While expando poperies are errors in TSC, in JS we try to extract the type from the binary expression;
     */
    function typeFromExpandoProperty(node, symbol, context) {
        const declaredType = getEffectiveTypeAnnotationNode(node);
        let result;
        if (declaredType) {
            result = serializeTypeAnnotationOfDeclaration(declaredType, context, node, symbol);
        }
        const oldSuppressReportInferenceFallback = context.suppressReportInferenceFallback;
        context.suppressReportInferenceFallback = true;
        const resultType = result !== null && result !== void 0 ? result : inferTypeOfDeclaration(node, symbol, context, /*reportFallback*/ false);
        context.suppressReportInferenceFallback = oldSuppressReportInferenceFallback;
        return resultType;
    }
    function typeFromProperty(node, symbol, context) {
        const declaredType = getEffectiveTypeAnnotationNode(node);
        const requiresAddingUndefined = resolver.requiresAddingImplicitUndefined(node, symbol, context.enclosingDeclaration);
        let resultType = failed;
        if (declaredType) {
            resultType = syntacticResult(serializeTypeAnnotationOfDeclaration(declaredType, context, node, symbol, requiresAddingUndefined));
        }
        else {
            const initializer = isPropertyDeclaration(node) ? node.initializer : undefined;
            if (initializer && !isContextuallyTyped(node)) {
                const isReadonly = isDeclarationReadonly(node);
                resultType = typeFromExpression(initializer, context, /*isConstContext*/ undefined, requiresAddingUndefined, isReadonly);
            }
        }
        return resultType.type !== undefined ? resultType.type : inferTypeOfDeclaration(node, symbol, context, resultType.reportFallback);
    }
    function inferTypeOfDeclaration(node, symbol, context, reportFallback = true) {
        if (reportFallback) {
            context.tracker.reportInferenceFallback(node);
        }
        if (context.noInferenceFallback === true) {
            return factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
        }
        return resolver.serializeTypeOfDeclaration(context, node, symbol);
    }
    function inferExpressionType(node, context, reportFallback = true, requiresAddingUndefined) {
        var _a;
        Debug.assert(!requiresAddingUndefined);
        if (reportFallback) {
            context.tracker.reportInferenceFallback(node);
        }
        if (context.noInferenceFallback === true) {
            return factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
        }
        return (_a = resolver.serializeTypeOfExpression(context, node)) !== null && _a !== void 0 ? _a : factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
    function inferReturnTypeOfSignatureSignature(node, context, symbol, reportFallback) {
        var _a;
        if (reportFallback) {
            context.tracker.reportInferenceFallback(node);
        }
        if (context.noInferenceFallback === true) {
            return factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
        }
        return (_a = resolver.serializeReturnTypeForSignature(context, node, symbol)) !== null && _a !== void 0 ? _a : factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
    function inferAccessorType(node, allAccessors, context, symbol, reportFallback = true) {
        var _a;
        if (node.kind === SyntaxKind.GetAccessor) {
            return createReturnFromSignature(node, symbol, context, reportFallback);
        }
        else {
            if (reportFallback) {
                context.tracker.reportInferenceFallback(node);
            }
            const result = allAccessors.getAccessor && createReturnFromSignature(allAccessors.getAccessor, symbol, context, reportFallback);
            return (_a = result !== null && result !== void 0 ? result : resolver.serializeTypeOfDeclaration(context, node, symbol)) !== null && _a !== void 0 ? _a : factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
        }
    }
    function withNewScope(context, node, fn) {
        const cleanup = resolver.enterNewScope(context, node);
        const result = fn();
        cleanup();
        return result;
    }
    function typeFromTypeAssertion(expression, type, context, requiresAddingUndefined) {
        if (isConstTypeReference(type)) {
            return typeFromExpression(expression, context, /*isConstContext*/ true, requiresAddingUndefined);
        }
        return syntacticResult(serializeExistingTypeNodeWithFallback(type, context, requiresAddingUndefined));
    }
    function typeFromExpression(node, context, isConstContext = false, requiresAddingUndefined = false, preserveLiterals = false) {
        switch (node.kind) {
            case SyntaxKind.ParenthesizedExpression:
                if (isJSDocTypeAssertion(node)) {
                    return typeFromTypeAssertion(node.expression, getJSDocTypeAssertionType(node), context, requiresAddingUndefined);
                }
                return typeFromExpression(node.expression, context, isConstContext, requiresAddingUndefined);
            case SyntaxKind.Identifier:
                if (resolver.isUndefinedIdentifierExpression(node)) {
                    return syntacticResult(createUndefinedTypeNode());
                }
                break;
            case SyntaxKind.NullKeyword:
                if (strictNullChecks) {
                    return syntacticResult(addUndefinedIfNeeded(factory.createLiteralTypeNode(factory.createNull()), requiresAddingUndefined, node, context));
                }
                else {
                    return syntacticResult(factory.createKeywordTypeNode(SyntaxKind.AnyKeyword));
                }
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionExpression:
                Debug.type(node);
                return withNewScope(context, node, () => typeFromFunctionLikeExpression(node, context));
            case SyntaxKind.TypeAssertionExpression:
            case SyntaxKind.AsExpression:
                const asExpression = node;
                return typeFromTypeAssertion(asExpression.expression, asExpression.type, context, requiresAddingUndefined);
            case SyntaxKind.PrefixUnaryExpression:
                const unaryExpression = node;
                if (isPrimitiveLiteralValue(unaryExpression)) {
                    return typeFromPrimitiveLiteral(unaryExpression.operator === SyntaxKind.PlusToken ? unaryExpression.operand : unaryExpression, unaryExpression.operand.kind === SyntaxKind.BigIntLiteral ? SyntaxKind.BigIntKeyword : SyntaxKind.NumberKeyword, context, isConstContext || preserveLiterals, requiresAddingUndefined);
                }
                break;
            case SyntaxKind.ArrayLiteralExpression:
                return typeFromArrayLiteral(node, context, isConstContext, requiresAddingUndefined);
            case SyntaxKind.ObjectLiteralExpression:
                return typeFromObjectLiteral(node, context, isConstContext, requiresAddingUndefined);
            case SyntaxKind.ClassExpression:
                return syntacticResult(inferExpressionType(node, context, /*reportFallback*/ true, requiresAddingUndefined));
            case SyntaxKind.TemplateExpression:
                if (!isConstContext && !preserveLiterals) {
                    return syntacticResult(factory.createKeywordTypeNode(SyntaxKind.StringKeyword));
                }
                break;
            default:
                let typeKind;
                let primitiveNode = node;
                switch (node.kind) {
                    case SyntaxKind.NumericLiteral:
                        typeKind = SyntaxKind.NumberKeyword;
                        break;
                    case SyntaxKind.NoSubstitutionTemplateLiteral:
                        primitiveNode = factory.createStringLiteral(node.text);
                        typeKind = SyntaxKind.StringKeyword;
                        break;
                    case SyntaxKind.StringLiteral:
                        typeKind = SyntaxKind.StringKeyword;
                        break;
                    case SyntaxKind.BigIntLiteral:
                        typeKind = SyntaxKind.BigIntKeyword;
                        break;
                    case SyntaxKind.TrueKeyword:
                    case SyntaxKind.FalseKeyword:
                        typeKind = SyntaxKind.BooleanKeyword;
                        break;
                }
                if (typeKind) {
                    return typeFromPrimitiveLiteral(primitiveNode, typeKind, context, isConstContext || preserveLiterals, requiresAddingUndefined);
                }
        }
        return failed;
    }
    function typeFromFunctionLikeExpression(fnNode, context) {
        const returnType = createReturnFromSignature(fnNode, /*symbol*/ undefined, context);
        const typeParameters = reuseTypeParameters(fnNode.typeParameters, context);
        const parameters = fnNode.parameters.map(p => ensureParameter(p, context));
        return syntacticResult(factory.createFunctionTypeNode(typeParameters, parameters, returnType));
    }
    function canGetTypeFromArrayLiteral(arrayLiteral, context, isConstContext) {
        if (!isConstContext) {
            context.tracker.reportInferenceFallback(arrayLiteral);
            return false;
        }
        for (const element of arrayLiteral.elements) {
            if (element.kind === SyntaxKind.SpreadElement) {
                context.tracker.reportInferenceFallback(element);
                return false;
            }
        }
        return true;
    }
    function typeFromArrayLiteral(arrayLiteral, context, isConstContext, requiresAddingUndefined) {
        if (!canGetTypeFromArrayLiteral(arrayLiteral, context, isConstContext)) {
            if (requiresAddingUndefined || isDeclaration(walkUpParenthesizedExpressions(arrayLiteral).parent)) {
                return alreadyReported;
            }
            return syntacticResult(inferExpressionType(arrayLiteral, context, /*reportFallback*/ false, requiresAddingUndefined));
        }
        // Disable any inference fallback since we won't actually use the resulting type and we don't want to generate errors
        const oldNoInferenceFallback = context.noInferenceFallback;
        context.noInferenceFallback = true;
        const elementTypesInfo = [];
        for (const element of arrayLiteral.elements) {
            Debug.assert(element.kind !== SyntaxKind.SpreadElement);
            if (element.kind === SyntaxKind.OmittedExpression) {
                elementTypesInfo.push(createUndefinedTypeNode());
            }
            else {
                const expressionType = typeFromExpression(element, context, isConstContext);
                const elementType = expressionType.type !== undefined ? expressionType.type : inferExpressionType(element, context, expressionType.reportFallback);
                elementTypesInfo.push(elementType);
            }
        }
        const tupleType = factory.createTupleTypeNode(elementTypesInfo);
        tupleType.emitNode = { flags: 1, autoGenerate: undefined, internalFlags: 0 };
        context.noInferenceFallback = oldNoInferenceFallback;
        return notImplemented;
    }
    function canGetTypeFromObjectLiteral(objectLiteral, context) {
        let result = true;
        for (const prop of objectLiteral.properties) {
            if (prop.flags & NodeFlags.ThisNodeHasError) {
                result = false;
                break; // Bail if parse errors
            }
            if (prop.kind === SyntaxKind.ShorthandPropertyAssignment || prop.kind === SyntaxKind.SpreadAssignment) {
                context.tracker.reportInferenceFallback(prop);
                result = false;
            }
            else if (prop.name.flags & NodeFlags.ThisNodeHasError) {
                result = false;
                break; // Bail if parse errors
            }
            else if (prop.name.kind === SyntaxKind.PrivateIdentifier) {
                // Not valid in object literals but the compiler will complain about this, we just ignore it here.
                result = false;
            }
            else if (prop.name.kind === SyntaxKind.ComputedPropertyName) {
                const expression = prop.name.expression;
                if (!isPrimitiveLiteralValue(expression, /*includeBigInt*/ false) && !resolver.isDefinitelyReferenceToGlobalSymbolObject(expression)) {
                    context.tracker.reportInferenceFallback(prop.name);
                    result = false;
                }
            }
        }
        return result;
    }
    function typeFromObjectLiteral(objectLiteral, context, isConstContext, requiresAddingUndefined) {
        if (!canGetTypeFromObjectLiteral(objectLiteral, context)) {
            if (requiresAddingUndefined || isDeclaration(walkUpParenthesizedExpressions(objectLiteral).parent)) {
                return alreadyReported;
            }
            return syntacticResult(inferExpressionType(objectLiteral, context, /*reportFallback*/ false, requiresAddingUndefined));
        }
        // Disable any inference fallback since we won't actually use the resulting type and we don't want to generate errors
        const oldNoInferenceFallback = context.noInferenceFallback;
        context.noInferenceFallback = true;
        const properties = [];
        const oldFlags = context.flags;
        context.flags |= NodeBuilderFlags.InObjectTypeLiteral;
        for (const prop of objectLiteral.properties) {
            Debug.assert(!isShorthandPropertyAssignment(prop) && !isSpreadAssignment(prop));
            const name = prop.name;
            let newProp;
            switch (prop.kind) {
                case SyntaxKind.MethodDeclaration:
                    newProp = withNewScope(context, prop, () => typeFromObjectLiteralMethod(prop, name, context, isConstContext));
                    break;
                case SyntaxKind.PropertyAssignment:
                    newProp = typeFromObjectLiteralPropertyAssignment(prop, name, context, isConstContext);
                    break;
                case SyntaxKind.SetAccessor:
                case SyntaxKind.GetAccessor:
                    newProp = typeFromObjectLiteralAccessor(prop, name, context);
                    break;
            }
            if (newProp) {
                setCommentRange(newProp, prop);
                properties.push(newProp);
            }
        }
        context.flags = oldFlags;
        const typeNode = factory.createTypeLiteralNode(properties);
        if (!(context.flags & NodeBuilderFlags.MultilineObjectLiterals)) {
            setEmitFlags(typeNode, EmitFlags.SingleLine);
        }
        context.noInferenceFallback = oldNoInferenceFallback;
        return notImplemented;
    }
    function typeFromObjectLiteralPropertyAssignment(prop, name, context, isConstContext) {
        const modifiers = isConstContext ?
            [factory.createModifier(SyntaxKind.ReadonlyKeyword)] :
            [];
        const expressionResult = typeFromExpression(prop.initializer, context, isConstContext);
        const typeNode = expressionResult.type !== undefined ? expressionResult.type : inferTypeOfDeclaration(prop, /*symbol*/ undefined, context, expressionResult.reportFallback);
        return factory.createPropertySignature(modifiers, reuseNode(context, name), 
        /*questionToken*/ undefined, typeNode);
    }
    function ensureParameter(p, context) {
        return factory.updateParameterDeclaration(p, [], reuseNode(context, p.dotDotDotToken), resolver.serializeNameOfParameter(context, p), resolver.isOptionalParameter(p) ? factory.createToken(SyntaxKind.QuestionToken) : undefined, typeFromParameter(p, /*symbol*/ undefined, context), // Ignore private param props, since this type is going straight back into a param
        /*initializer*/ undefined);
    }
    function reuseTypeParameters(typeParameters, context) {
        return typeParameters === null || typeParameters === void 0 ? void 0 : typeParameters.map(tp => {
            var _a;
            const { node: tpName } = resolver.trackExistingEntityName(context, tp.name);
            return factory.updateTypeParameterDeclaration(tp, (_a = tp.modifiers) === null || _a === void 0 ? void 0 : _a.map(m => reuseNode(context, m)), tpName, serializeExistingTypeNodeWithFallback(tp.constraint, context), serializeExistingTypeNodeWithFallback(tp.default, context));
        });
    }
    function typeFromObjectLiteralMethod(method, name, context, isConstContext) {
        const returnType = createReturnFromSignature(method, /*symbol*/ undefined, context);
        const typeParameters = reuseTypeParameters(method.typeParameters, context);
        const parameters = method.parameters.map(p => ensureParameter(p, context));
        if (isConstContext) {
            return factory.createPropertySignature([factory.createModifier(SyntaxKind.ReadonlyKeyword)], reuseNode(context, name), reuseNode(context, method.questionToken), factory.createFunctionTypeNode(typeParameters, parameters, returnType));
        }
        else {
            if (isIdentifier(name) && name.escapedText === "new") {
                name = factory.createStringLiteral("new");
            }
            return factory.createMethodSignature([], reuseNode(context, name), reuseNode(context, method.questionToken), typeParameters, parameters, returnType);
        }
    }
    function typeFromObjectLiteralAccessor(accessor, name, context) {
        const allAccessors = resolver.getAllAccessorDeclarations(accessor);
        const getAccessorType = allAccessors.getAccessor && getTypeAnnotationFromAccessor(allAccessors.getAccessor);
        const setAccessorType = allAccessors.setAccessor && getTypeAnnotationFromAccessor(allAccessors.setAccessor);
        // We have types for both accessors, we can't know if they are the same type so we keep both accessors
        if (getAccessorType !== undefined && setAccessorType !== undefined) {
            return withNewScope(context, accessor, () => {
                const parameters = accessor.parameters.map(p => ensureParameter(p, context));
                if (isGetAccessor(accessor)) {
                    return factory.updateGetAccessorDeclaration(accessor, [], reuseNode(context, name), parameters, serializeExistingTypeNodeWithFallback(getAccessorType, context), 
                    /*body*/ undefined);
                }
                else {
                    return factory.updateSetAccessorDeclaration(accessor, [], reuseNode(context, name), parameters, 
                    /*body*/ undefined);
                }
            });
        }
        else if (allAccessors.firstAccessor === accessor) {
            const foundType = getAccessorType ? withNewScope(context, allAccessors.getAccessor, () => serializeExistingTypeNodeWithFallback(getAccessorType, context)) :
                setAccessorType ? withNewScope(context, allAccessors.setAccessor, () => serializeExistingTypeNodeWithFallback(setAccessorType, context)) :
                    undefined;
            const propertyType = foundType !== null && foundType !== void 0 ? foundType : inferAccessorType(accessor, allAccessors, context, /*symbol*/ undefined);
            const propertySignature = factory.createPropertySignature(allAccessors.setAccessor === undefined ? [factory.createModifier(SyntaxKind.ReadonlyKeyword)] : [], reuseNode(context, name), 
            /*questionToken*/ undefined, propertyType);
            return propertySignature;
        }
    }
    function createUndefinedTypeNode() {
        if (strictNullChecks) {
            return factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword);
        }
        else {
            return factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
        }
    }
    function typeFromPrimitiveLiteral(node, baseType, context, preserveLiterals, requiresAddingUndefined) {
        let result;
        if (preserveLiterals) {
            if (node.kind === SyntaxKind.PrefixUnaryExpression && node.operator === SyntaxKind.PlusToken) {
                result = factory.createLiteralTypeNode(reuseNode(context, node.operand));
            }
            result = factory.createLiteralTypeNode(reuseNode(context, node));
        }
        else {
            result = factory.createKeywordTypeNode(baseType);
        }
        return syntacticResult(addUndefinedIfNeeded(result, requiresAddingUndefined, node, context));
    }
    function addUndefinedIfNeeded(node, addUndefined, owner, context) {
        const parentDeclaration = owner && walkUpParenthesizedExpressions(owner).parent;
        const optionalDeclaration = parentDeclaration && isDeclaration(parentDeclaration) && isOptionalDeclaration(parentDeclaration);
        if (!strictNullChecks || !(addUndefined || optionalDeclaration))
            return node;
        if (!canAddUndefined(node)) {
            context.tracker.reportInferenceFallback(node);
        }
        if (isUnionTypeNode(node)) {
            return factory.createUnionTypeNode([...node.types, factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)]);
        }
        return factory.createUnionTypeNode([node, factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)]);
    }
    function canAddUndefined(node) {
        if (!strictNullChecks)
            return true;
        if (isKeyword(node.kind)
            || node.kind === SyntaxKind.LiteralType
            || node.kind === SyntaxKind.FunctionType
            || node.kind === SyntaxKind.ConstructorType
            || node.kind === SyntaxKind.ArrayType
            || node.kind === SyntaxKind.TupleType
            || node.kind === SyntaxKind.TypeLiteral
            || node.kind === SyntaxKind.TemplateLiteralType
            || node.kind === SyntaxKind.ThisType) {
            return true;
        }
        if (node.kind === SyntaxKind.ParenthesizedType) {
            return canAddUndefined(node.type);
        }
        if (node.kind === SyntaxKind.UnionType || node.kind === SyntaxKind.IntersectionType) {
            return node.types.every(canAddUndefined);
        }
        return false;
    }
    function createReturnFromSignature(fn, symbol, context, reportFallback = true) {
        let returnType = failed;
        const returnTypeNode = isJSDocConstructSignature(fn) ? getEffectiveTypeAnnotationNode(fn.parameters[0]) : getEffectiveReturnTypeNode(fn);
        if (returnTypeNode) {
            returnType = syntacticResult(serializeTypeAnnotationOfDeclaration(returnTypeNode, context, fn, symbol));
        }
        else if (isValueSignatureDeclaration(fn)) {
            returnType = typeFromSingleReturnExpression(fn, context);
        }
        return returnType.type !== undefined ? returnType.type : inferReturnTypeOfSignatureSignature(fn, context, symbol, reportFallback && returnType.reportFallback && !returnTypeNode);
    }
    function typeFromSingleReturnExpression(declaration, context) {
        let candidateExpr;
        if (declaration && !nodeIsMissing(declaration.body)) {
            const flags = getFunctionFlags(declaration);
            if (flags & FunctionFlags.AsyncGenerator)
                return failed;
            const body = declaration.body;
            if (body && isBlock(body)) {
                forEachReturnStatement(body, s => {
                    if (s.parent !== body) {
                        candidateExpr = undefined;
                        return true;
                    }
                    if (!candidateExpr) {
                        candidateExpr = s.expression;
                    }
                    else {
                        candidateExpr = undefined;
                        return true;
                    }
                });
            }
            else {
                candidateExpr = body;
            }
        }
        if (candidateExpr) {
            if (isContextuallyTyped(candidateExpr)) {
                const type = isJSDocTypeAssertion(candidateExpr) ? getJSDocTypeAssertionType(candidateExpr) :
                    isAsExpression(candidateExpr) || isTypeAssertionExpression(candidateExpr) ? candidateExpr.type :
                        undefined;
                if (type && !isConstTypeReference(type)) {
                    return syntacticResult(serializeExistingTypeNode(type, context));
                }
            }
            else {
                return typeFromExpression(candidateExpr, context);
            }
        }
        return failed;
    }
    function isContextuallyTyped(node) {
        return findAncestor(node.parent, n => {
            // Functions calls or parent type annotations (but not the return type of a function expression) may impact the inferred type and local inference is unreliable
            return isCallExpression(n) || (!isFunctionLikeDeclaration(n) && !!getEffectiveTypeAnnotationNode(n)) || isJsxElement(n) || isJsxExpression(n);
        });
    }
}
