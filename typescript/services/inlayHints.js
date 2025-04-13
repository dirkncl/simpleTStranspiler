import {
  CharacterCodes,
  createPrinterWithRemoveComments,
  createTextSpanFromNode,
  Debug,
  ElementFlags,
  EmitHint,
  equateStringsCaseInsensitive,
  escapeString,
  escapeTemplateSubstitution,
  findChildOfKind,
  findIndex,
  forEachChild,
  getEffectiveReturnTypeNode,
  getEffectiveTypeAnnotationNode,
  getEmitScriptTarget,
  getLanguageVariant,
  getLeadingCommentRanges,
  getNameOfDeclaration,
  getQuotePreference,
  hasContextSensitiveParameters,
  idText,
  InlayHintKind,
  isArrayBindingPattern,
  isArrayTypeNode,
  isArrowFunction,
  isAssertionExpression,
  isBindingElement,
  isBindingPattern,
  isCallExpression,
  isCallSignatureDeclaration,
  isConditionalTypeNode,
  isConstructorTypeNode,
  isEnumMember,
  isExpressionWithTypeArguments,
  isFunctionDeclaration,
  isFunctionExpression,
  isFunctionLikeDeclaration,
  isFunctionTypeNode,
  isGetAccessorDeclaration,
  isIdentifier,
  isIdentifierText,
  isImportTypeNode,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInferTypeNode,
  isInfinityOrNaNString,
  isIntersectionTypeNode,
  isLiteralExpression,
  isLiteralTypeNode,
  isMappedTypeNode,
  isMethodDeclaration,
  isMethodSignature,
  isNamedTupleMember,
  isNewExpression,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isOptionalTypeNode,
  isParameter,
  isParenthesizedTypeNode,
  isPartOfParameterDeclaration,
  isPrefixUnaryExpression,
  isPropertyAccessExpression,
  isPropertyDeclaration,
  isPropertySignature,
  isQualifiedName,
  isRestTypeNode,
  isSpreadElement,
  isTemplateHead,
  isTemplateLiteralTypeNode,
  isTemplateLiteralTypeSpan,
  isTemplateMiddle,
  isTemplateTail,
  isThisTypeNode,
  isTupleTypeNode,
  isTypeLiteralNode,
  isTypeNode,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypePredicateNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  isVarConst,
  isVariableDeclaration,
  NodeBuilderFlags,
  parameterIsThisKeyword,
  QuotePreference,
  skipParentheses,
  some,
  SymbolFlags,
  SyntaxKind,
  textSpanIntersectsWith,
  tokenToString,
  TypeFlags,
  unescapeLeadingUnderscores,
  usingSingleLineStringWriter,
} from "./namespaces/ts.js";


const leadingParameterNameCommentRegexFactory = (name) => {
    return new RegExp(`^\\s?/\\*\\*?\\s?${name}\\s?\\*\\/\\s?$`);
};
function shouldShowParameterNameHints(preferences) {
    return preferences.includeInlayParameterNameHints === "literals" || preferences.includeInlayParameterNameHints === "all";
}
function shouldShowLiteralParameterNameHintsOnly(preferences) {
    return preferences.includeInlayParameterNameHints === "literals";
}
function shouldUseInteractiveInlayHints(preferences) {
    return preferences.interactiveInlayHints === true;
}
/** @internal */
export function provideInlayHints(context) {
    const { file, program, span, cancellationToken, preferences } = context;
    const sourceFileText = file.text;
    const compilerOptions = program.getCompilerOptions();
    const quotePreference = getQuotePreference(file, preferences);
    const checker = program.getTypeChecker();
    const result = [];
    visitor(file);
    return result;
    function visitor(node) {
        if (!node || node.getFullWidth() === 0) {
            return;
        }
        switch (node.kind) {
            case SyntaxKind.ModuleDeclaration:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.ClassExpression:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.ArrowFunction:
                cancellationToken.throwIfCancellationRequested();
        }
        if (!textSpanIntersectsWith(span, node.pos, node.getFullWidth())) {
            return;
        }
        if (isTypeNode(node) && !isExpressionWithTypeArguments(node)) {
            return;
        }
        if (preferences.includeInlayVariableTypeHints && isVariableDeclaration(node)) {
            visitVariableLikeDeclaration(node);
        }
        else if (preferences.includeInlayPropertyDeclarationTypeHints && isPropertyDeclaration(node)) {
            visitVariableLikeDeclaration(node);
        }
        else if (preferences.includeInlayEnumMemberValueHints && isEnumMember(node)) {
            visitEnumMember(node);
        }
        else if (shouldShowParameterNameHints(preferences) && (isCallExpression(node) || isNewExpression(node))) {
            visitCallOrNewExpression(node);
        }
        else {
            if (preferences.includeInlayFunctionParameterTypeHints && isFunctionLikeDeclaration(node) && hasContextSensitiveParameters(node)) {
                visitFunctionLikeForParameterType(node);
            }
            if (preferences.includeInlayFunctionLikeReturnTypeHints && isSignatureSupportingReturnAnnotation(node)) {
                visitFunctionDeclarationLikeForReturnType(node);
            }
        }
        return forEachChild(node, visitor);
    }
    function isSignatureSupportingReturnAnnotation(node) {
        return isArrowFunction(node) || isFunctionExpression(node) || isFunctionDeclaration(node) || isMethodDeclaration(node) || isGetAccessorDeclaration(node);
    }
    function addParameterHints(text, parameter, position, isFirstVariadicArgument) {
        let hintText = `${isFirstVariadicArgument ? "..." : ""}${text}`;
        let displayParts;
        if (shouldUseInteractiveInlayHints(preferences)) {
            displayParts = [getNodeDisplayPart(hintText, parameter), { text: ":" }];
            hintText = "";
        }
        else {
            hintText += ":";
        }
        result.push({
            text: hintText,
            position,
            kind: InlayHintKind.Parameter,
            whitespaceAfter: true,
            displayParts,
        });
    }
    function addTypeHints(hintText, position) {
        result.push({
            text: typeof hintText === "string" ? `: ${hintText}` : "",
            displayParts: typeof hintText === "string" ? undefined : [{ text: ": " }, ...hintText],
            position,
            kind: InlayHintKind.Type,
            whitespaceBefore: true,
        });
    }
    function addEnumMemberValueHints(text, position) {
        result.push({
            text: `= ${text}`,
            position,
            kind: InlayHintKind.Enum,
            whitespaceBefore: true,
        });
    }
    function visitEnumMember(member) {
        if (member.initializer) {
            return;
        }
        const enumValue = checker.getConstantValue(member);
        if (enumValue !== undefined) {
            addEnumMemberValueHints(enumValue.toString(), member.end);
        }
    }
    function isModuleReferenceType(type) {
        return type.symbol && (type.symbol.flags & SymbolFlags.Module);
    }
    function visitVariableLikeDeclaration(decl) {
        if (decl.initializer === undefined && !(isPropertyDeclaration(decl) && !(checker.getTypeAtLocation(decl).flags & TypeFlags.Any)) ||
            isBindingPattern(decl.name) || (isVariableDeclaration(decl) && !isHintableDeclaration(decl))) {
            return;
        }
        const effectiveTypeAnnotation = getEffectiveTypeAnnotationNode(decl);
        if (effectiveTypeAnnotation) {
            return;
        }
        const declarationType = checker.getTypeAtLocation(decl);
        if (isModuleReferenceType(declarationType)) {
            return;
        }
        const hintParts = typeToInlayHintParts(declarationType);
        if (hintParts) {
            const hintText = typeof hintParts === "string" ? hintParts : hintParts.map(part => part.text).join("");
            const isVariableNameMatchesType = preferences.includeInlayVariableTypeHintsWhenTypeMatchesName === false && equateStringsCaseInsensitive(decl.name.getText(), hintText);
            if (isVariableNameMatchesType) {
                return;
            }
            addTypeHints(hintParts, decl.name.end);
        }
    }
    function visitCallOrNewExpression(expr) {
        const args = expr.arguments;
        if (!args || !args.length) {
            return;
        }
        const signature = checker.getResolvedSignature(expr);
        if (signature === undefined)
            return;
        let signatureParamPos = 0;
        for (const originalArg of args) {
            const arg = skipParentheses(originalArg);
            if (shouldShowLiteralParameterNameHintsOnly(preferences) && !isHintableLiteral(arg)) {
                signatureParamPos++;
                continue;
            }
            let spreadArgs = 0;
            if (isSpreadElement(arg)) {
                const spreadType = checker.getTypeAtLocation(arg.expression);
                if (checker.isTupleType(spreadType)) {
                    const { elementFlags, fixedLength } = spreadType.target;
                    if (fixedLength === 0) {
                        continue;
                    }
                    const firstOptionalIndex = findIndex(elementFlags, f => !(f & ElementFlags.Required));
                    const requiredArgs = firstOptionalIndex < 0 ? fixedLength : firstOptionalIndex;
                    if (requiredArgs > 0) {
                        spreadArgs = firstOptionalIndex < 0 ? fixedLength : firstOptionalIndex;
                    }
                }
            }
            const identifierInfo = checker.getParameterIdentifierInfoAtPosition(signature, signatureParamPos);
            signatureParamPos = signatureParamPos + (spreadArgs || 1);
            if (identifierInfo) {
                const { parameter, parameterName, isRestParameter: isFirstVariadicArgument } = identifierInfo;
                const isParameterNameNotSameAsArgument = preferences.includeInlayParameterNameHintsWhenArgumentMatchesName || !identifierOrAccessExpressionPostfixMatchesParameterName(arg, parameterName);
                if (!isParameterNameNotSameAsArgument && !isFirstVariadicArgument) {
                    continue;
                }
                const name = unescapeLeadingUnderscores(parameterName);
                if (leadingCommentsContainsParameterName(arg, name)) {
                    continue;
                }
                addParameterHints(name, parameter, originalArg.getStart(), isFirstVariadicArgument);
            }
        }
    }
    function identifierOrAccessExpressionPostfixMatchesParameterName(expr, parameterName) {
        if (isIdentifier(expr)) {
            return expr.text === parameterName;
        }
        if (isPropertyAccessExpression(expr)) {
            return expr.name.text === parameterName;
        }
        return false;
    }
    function leadingCommentsContainsParameterName(node, name) {
        if (!isIdentifierText(name, getEmitScriptTarget(compilerOptions), getLanguageVariant(file.scriptKind))) {
            return false;
        }
        const ranges = getLeadingCommentRanges(sourceFileText, node.pos);
        if (!(ranges === null || ranges === void 0 ? void 0 : ranges.length)) {
            return false;
        }
        const regex = leadingParameterNameCommentRegexFactory(name);
        return some(ranges, range => regex.test(sourceFileText.substring(range.pos, range.end)));
    }
    function isHintableLiteral(node) {
        switch (node.kind) {
            case SyntaxKind.PrefixUnaryExpression: {
                const operand = node.operand;
                return isLiteralExpression(operand) || isIdentifier(operand) && isInfinityOrNaNString(operand.escapedText);
            }
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
            case SyntaxKind.NullKeyword:
            case SyntaxKind.NoSubstitutionTemplateLiteral:
            case SyntaxKind.TemplateExpression:
                return true;
            case SyntaxKind.Identifier: {
                const name = node.escapedText;
                return isUndefined(name) || isInfinityOrNaNString(name);
            }
        }
        return isLiteralExpression(node);
    }
    function visitFunctionDeclarationLikeForReturnType(decl) {
        if (isArrowFunction(decl)) {
            if (!findChildOfKind(decl, SyntaxKind.OpenParenToken, file)) {
                return;
            }
        }
        const effectiveTypeAnnotation = getEffectiveReturnTypeNode(decl);
        if (effectiveTypeAnnotation || !decl.body) {
            return;
        }
        const signature = checker.getSignatureFromDeclaration(decl);
        if (!signature) {
            return;
        }
        const typePredicate = checker.getTypePredicateOfSignature(signature);
        if (typePredicate === null || typePredicate === void 0 ? void 0 : typePredicate.type) {
            const hintParts = typePredicateToInlayHintParts(typePredicate);
            if (hintParts) {
                addTypeHints(hintParts, getTypeAnnotationPosition(decl));
                return;
            }
        }
        const returnType = checker.getReturnTypeOfSignature(signature);
        if (isModuleReferenceType(returnType)) {
            return;
        }
        const hintParts = typeToInlayHintParts(returnType);
        if (hintParts) {
            addTypeHints(hintParts, getTypeAnnotationPosition(decl));
        }
    }
    function getTypeAnnotationPosition(decl) {
        const closeParenToken = findChildOfKind(decl, SyntaxKind.CloseParenToken, file);
        if (closeParenToken) {
            return closeParenToken.end;
        }
        return decl.parameters.end;
    }
    function visitFunctionLikeForParameterType(node) {
        const signature = checker.getSignatureFromDeclaration(node);
        if (!signature) {
            return;
        }
        let pos = 0;
        for (const param of node.parameters) {
            if (isHintableDeclaration(param)) {
                addParameterTypeHint(param, parameterIsThisKeyword(param) ? signature.thisParameter : signature.parameters[pos]);
            }
            if (parameterIsThisKeyword(param)) {
                continue;
            }
            pos++;
        }
    }
    function addParameterTypeHint(node, symbol) {
        const effectiveTypeAnnotation = getEffectiveTypeAnnotationNode(node);
        if (effectiveTypeAnnotation || symbol === undefined)
            return;
        const typeHints = getParameterDeclarationTypeHints(symbol);
        if (typeHints === undefined)
            return;
        addTypeHints(typeHints, node.questionToken ? node.questionToken.end : node.name.end);
    }
    function getParameterDeclarationTypeHints(symbol) {
        const valueDeclaration = symbol.valueDeclaration;
        if (!valueDeclaration || !isParameter(valueDeclaration)) {
            return undefined;
        }
        const signatureParamType = checker.getTypeOfSymbolAtLocation(symbol, valueDeclaration);
        if (isModuleReferenceType(signatureParamType)) {
            return undefined;
        }
        return typeToInlayHintParts(signatureParamType);
    }
    function printTypeInSingleLine(type) {
        const flags = NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.AllowUniqueESSymbolType | NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
        const printer = createPrinterWithRemoveComments();
        return usingSingleLineStringWriter(writer => {
            const typeNode = checker.typeToTypeNode(type, /*enclosingDeclaration*/ undefined, flags);
            Debug.assertIsDefined(typeNode, "should always get typenode");
            printer.writeNode(EmitHint.Unspecified, typeNode, /*sourceFile*/ file, writer);
        });
    }
    function printTypePredicateInSingleLine(typePredicate) {
        const flags = NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.AllowUniqueESSymbolType | NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
        const printer = createPrinterWithRemoveComments();
        return usingSingleLineStringWriter(writer => {
            const typePredicateNode = checker.typePredicateToTypePredicateNode(typePredicate, /*enclosingDeclaration*/ undefined, flags);
            Debug.assertIsDefined(typePredicateNode, "should always get typePredicateNode");
            printer.writeNode(EmitHint.Unspecified, typePredicateNode, /*sourceFile*/ file, writer);
        });
    }
    function typeToInlayHintParts(type) {
        if (!shouldUseInteractiveInlayHints(preferences)) {
            return printTypeInSingleLine(type);
        }
        const flags = NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.AllowUniqueESSymbolType | NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
        const typeNode = checker.typeToTypeNode(type, /*enclosingDeclaration*/ undefined, flags);
        Debug.assertIsDefined(typeNode, "should always get typeNode");
        return getInlayHintDisplayParts(typeNode);
    }
    function typePredicateToInlayHintParts(typePredicate) {
        if (!shouldUseInteractiveInlayHints(preferences)) {
            return printTypePredicateInSingleLine(typePredicate);
        }
        const flags = NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.AllowUniqueESSymbolType | NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
        const typeNode = checker.typePredicateToTypePredicateNode(typePredicate, /*enclosingDeclaration*/ undefined, flags);
        Debug.assertIsDefined(typeNode, "should always get typenode");
        return getInlayHintDisplayParts(typeNode);
    }
    function getInlayHintDisplayParts(node) {
        const parts = [];
        visitForDisplayParts(node);
        return parts;
        function visitForDisplayParts(node) {
            var _a, _b;
            if (!node) {
                return;
            }
            const tokenString = tokenToString(node.kind);
            if (tokenString) {
                parts.push({ text: tokenString });
                return;
            }
            if (isLiteralExpression(node)) {
                parts.push({ text: getLiteralText(node) });
                return;
            }
            switch (node.kind) {
                case SyntaxKind.Identifier:
                    Debug.assertNode(node, isIdentifier);
                    const identifierText = idText(node);
                    const name = node.symbol && node.symbol.declarations && node.symbol.declarations.length && getNameOfDeclaration(node.symbol.declarations[0]);
                    if (name) {
                        parts.push(getNodeDisplayPart(identifierText, name));
                    }
                    else {
                        parts.push({ text: identifierText });
                    }
                    break;
                case SyntaxKind.QualifiedName:
                    Debug.assertNode(node, isQualifiedName);
                    visitForDisplayParts(node.left);
                    parts.push({ text: "." });
                    visitForDisplayParts(node.right);
                    break;
                case SyntaxKind.TypePredicate:
                    Debug.assertNode(node, isTypePredicateNode);
                    if (node.assertsModifier) {
                        parts.push({ text: "asserts " });
                    }
                    visitForDisplayParts(node.parameterName);
                    if (node.type) {
                        parts.push({ text: " is " });
                        visitForDisplayParts(node.type);
                    }
                    break;
                case SyntaxKind.TypeReference:
                    Debug.assertNode(node, isTypeReferenceNode);
                    visitForDisplayParts(node.typeName);
                    if (node.typeArguments) {
                        parts.push({ text: "<" });
                        visitDisplayPartList(node.typeArguments, ", ");
                        parts.push({ text: ">" });
                    }
                    break;
                case SyntaxKind.TypeParameter:
                    Debug.assertNode(node, isTypeParameterDeclaration);
                    if (node.modifiers) {
                        visitDisplayPartList(node.modifiers, " ");
                    }
                    visitForDisplayParts(node.name);
                    if (node.constraint) {
                        parts.push({ text: " extends " });
                        visitForDisplayParts(node.constraint);
                    }
                    if (node.default) {
                        parts.push({ text: " = " });
                        visitForDisplayParts(node.default);
                    }
                    break;
                case SyntaxKind.Parameter:
                    Debug.assertNode(node, isParameter);
                    if (node.modifiers) {
                        visitDisplayPartList(node.modifiers, " ");
                    }
                    if (node.dotDotDotToken) {
                        parts.push({ text: "..." });
                    }
                    visitForDisplayParts(node.name);
                    if (node.questionToken) {
                        parts.push({ text: "?" });
                    }
                    if (node.type) {
                        parts.push({ text: ": " });
                        visitForDisplayParts(node.type);
                    }
                    break;
                case SyntaxKind.ConstructorType:
                    Debug.assertNode(node, isConstructorTypeNode);
                    parts.push({ text: "new " });
                    visitParametersAndTypeParameters(node);
                    parts.push({ text: " => " });
                    visitForDisplayParts(node.type);
                    break;
                case SyntaxKind.TypeQuery:
                    Debug.assertNode(node, isTypeQueryNode);
                    parts.push({ text: "typeof " });
                    visitForDisplayParts(node.exprName);
                    if (node.typeArguments) {
                        parts.push({ text: "<" });
                        visitDisplayPartList(node.typeArguments, ", ");
                        parts.push({ text: ">" });
                    }
                    break;
                case SyntaxKind.TypeLiteral:
                    Debug.assertNode(node, isTypeLiteralNode);
                    parts.push({ text: "{" });
                    if (node.members.length) {
                        parts.push({ text: " " });
                        visitDisplayPartList(node.members, "; ");
                        parts.push({ text: " " });
                    }
                    parts.push({ text: "}" });
                    break;
                case SyntaxKind.ArrayType:
                    Debug.assertNode(node, isArrayTypeNode);
                    visitForDisplayParts(node.elementType);
                    parts.push({ text: "[]" });
                    break;
                case SyntaxKind.TupleType:
                    Debug.assertNode(node, isTupleTypeNode);
                    parts.push({ text: "[" });
                    visitDisplayPartList(node.elements, ", ");
                    parts.push({ text: "]" });
                    break;
                case SyntaxKind.NamedTupleMember:
                    Debug.assertNode(node, isNamedTupleMember);
                    if (node.dotDotDotToken) {
                        parts.push({ text: "..." });
                    }
                    visitForDisplayParts(node.name);
                    if (node.questionToken) {
                        parts.push({ text: "?" });
                    }
                    parts.push({ text: ": " });
                    visitForDisplayParts(node.type);
                    break;
                case SyntaxKind.OptionalType:
                    Debug.assertNode(node, isOptionalTypeNode);
                    visitForDisplayParts(node.type);
                    parts.push({ text: "?" });
                    break;
                case SyntaxKind.RestType:
                    Debug.assertNode(node, isRestTypeNode);
                    parts.push({ text: "..." });
                    visitForDisplayParts(node.type);
                    break;
                case SyntaxKind.UnionType:
                    Debug.assertNode(node, isUnionTypeNode);
                    visitDisplayPartList(node.types, " | ");
                    break;
                case SyntaxKind.IntersectionType:
                    Debug.assertNode(node, isIntersectionTypeNode);
                    visitDisplayPartList(node.types, " & ");
                    break;
                case SyntaxKind.ConditionalType:
                    Debug.assertNode(node, isConditionalTypeNode);
                    visitForDisplayParts(node.checkType);
                    parts.push({ text: " extends " });
                    visitForDisplayParts(node.extendsType);
                    parts.push({ text: " ? " });
                    visitForDisplayParts(node.trueType);
                    parts.push({ text: " : " });
                    visitForDisplayParts(node.falseType);
                    break;
                case SyntaxKind.InferType:
                    Debug.assertNode(node, isInferTypeNode);
                    parts.push({ text: "infer " });
                    visitForDisplayParts(node.typeParameter);
                    break;
                case SyntaxKind.ParenthesizedType:
                    Debug.assertNode(node, isParenthesizedTypeNode);
                    parts.push({ text: "(" });
                    visitForDisplayParts(node.type);
                    parts.push({ text: ")" });
                    break;
                case SyntaxKind.TypeOperator:
                    Debug.assertNode(node, isTypeOperatorNode);
                    parts.push({ text: `${tokenToString(node.operator)} ` });
                    visitForDisplayParts(node.type);
                    break;
                case SyntaxKind.IndexedAccessType:
                    Debug.assertNode(node, isIndexedAccessTypeNode);
                    visitForDisplayParts(node.objectType);
                    parts.push({ text: "[" });
                    visitForDisplayParts(node.indexType);
                    parts.push({ text: "]" });
                    break;
                case SyntaxKind.MappedType:
                    Debug.assertNode(node, isMappedTypeNode);
                    parts.push({ text: "{ " });
                    if (node.readonlyToken) {
                        if (node.readonlyToken.kind === SyntaxKind.PlusToken) {
                            parts.push({ text: "+" });
                        }
                        else if (node.readonlyToken.kind === SyntaxKind.MinusToken) {
                            parts.push({ text: "-" });
                        }
                        parts.push({ text: "readonly " });
                    }
                    parts.push({ text: "[" });
                    visitForDisplayParts(node.typeParameter);
                    if (node.nameType) {
                        parts.push({ text: " as " });
                        visitForDisplayParts(node.nameType);
                    }
                    parts.push({ text: "]" });
                    if (node.questionToken) {
                        if (node.questionToken.kind === SyntaxKind.PlusToken) {
                            parts.push({ text: "+" });
                        }
                        else if (node.questionToken.kind === SyntaxKind.MinusToken) {
                            parts.push({ text: "-" });
                        }
                        parts.push({ text: "?" });
                    }
                    parts.push({ text: ": " });
                    if (node.type) {
                        visitForDisplayParts(node.type);
                    }
                    parts.push({ text: "; }" });
                    break;
                case SyntaxKind.LiteralType:
                    Debug.assertNode(node, isLiteralTypeNode);
                    visitForDisplayParts(node.literal);
                    break;
                case SyntaxKind.FunctionType:
                    Debug.assertNode(node, isFunctionTypeNode);
                    visitParametersAndTypeParameters(node);
                    parts.push({ text: " => " });
                    visitForDisplayParts(node.type);
                    break;
                case SyntaxKind.ImportType:
                    Debug.assertNode(node, isImportTypeNode);
                    if (node.isTypeOf) {
                        parts.push({ text: "typeof " });
                    }
                    parts.push({ text: "import(" });
                    visitForDisplayParts(node.argument);
                    if (node.assertions) {
                        parts.push({ text: ", { assert: " });
                        visitDisplayPartList(node.assertions.assertClause.elements, ", ");
                        parts.push({ text: " }" });
                    }
                    parts.push({ text: ")" });
                    if (node.qualifier) {
                        parts.push({ text: "." });
                        visitForDisplayParts(node.qualifier);
                    }
                    if (node.typeArguments) {
                        parts.push({ text: "<" });
                        visitDisplayPartList(node.typeArguments, ", ");
                        parts.push({ text: ">" });
                    }
                    break;
                case SyntaxKind.PropertySignature:
                    Debug.assertNode(node, isPropertySignature);
                    if ((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.length) {
                        visitDisplayPartList(node.modifiers, " ");
                        parts.push({ text: " " });
                    }
                    visitForDisplayParts(node.name);
                    if (node.questionToken) {
                        parts.push({ text: "?" });
                    }
                    if (node.type) {
                        parts.push({ text: ": " });
                        visitForDisplayParts(node.type);
                    }
                    break;
                case SyntaxKind.IndexSignature:
                    Debug.assertNode(node, isIndexSignatureDeclaration);
                    parts.push({ text: "[" });
                    visitDisplayPartList(node.parameters, ", ");
                    parts.push({ text: "]" });
                    if (node.type) {
                        parts.push({ text: ": " });
                        visitForDisplayParts(node.type);
                    }
                    break;
                case SyntaxKind.MethodSignature:
                    Debug.assertNode(node, isMethodSignature);
                    if ((_b = node.modifiers) === null || _b === void 0 ? void 0 : _b.length) {
                        visitDisplayPartList(node.modifiers, " ");
                        parts.push({ text: " " });
                    }
                    visitForDisplayParts(node.name);
                    if (node.questionToken) {
                        parts.push({ text: "?" });
                    }
                    visitParametersAndTypeParameters(node);
                    if (node.type) {
                        parts.push({ text: ": " });
                        visitForDisplayParts(node.type);
                    }
                    break;
                case SyntaxKind.CallSignature:
                    Debug.assertNode(node, isCallSignatureDeclaration);
                    visitParametersAndTypeParameters(node);
                    if (node.type) {
                        parts.push({ text: ": " });
                        visitForDisplayParts(node.type);
                    }
                    break;
                case SyntaxKind.ArrayBindingPattern:
                    Debug.assertNode(node, isArrayBindingPattern);
                    parts.push({ text: "[" });
                    visitDisplayPartList(node.elements, ", ");
                    parts.push({ text: "]" });
                    break;
                case SyntaxKind.ObjectBindingPattern:
                    Debug.assertNode(node, isObjectBindingPattern);
                    parts.push({ text: "{" });
                    if (node.elements.length) {
                        parts.push({ text: " " });
                        visitDisplayPartList(node.elements, ", ");
                        parts.push({ text: " " });
                    }
                    parts.push({ text: "}" });
                    break;
                case SyntaxKind.BindingElement:
                    Debug.assertNode(node, isBindingElement);
                    visitForDisplayParts(node.name);
                    break;
                case SyntaxKind.PrefixUnaryExpression:
                    Debug.assertNode(node, isPrefixUnaryExpression);
                    parts.push({ text: tokenToString(node.operator) });
                    visitForDisplayParts(node.operand);
                    break;
                case SyntaxKind.TemplateLiteralType:
                    Debug.assertNode(node, isTemplateLiteralTypeNode);
                    visitForDisplayParts(node.head);
                    node.templateSpans.forEach(visitForDisplayParts);
                    break;
                case SyntaxKind.TemplateHead:
                    Debug.assertNode(node, isTemplateHead);
                    parts.push({ text: getLiteralText(node) });
                    break;
                case SyntaxKind.TemplateLiteralTypeSpan:
                    Debug.assertNode(node, isTemplateLiteralTypeSpan);
                    visitForDisplayParts(node.type);
                    visitForDisplayParts(node.literal);
                    break;
                case SyntaxKind.TemplateMiddle:
                    Debug.assertNode(node, isTemplateMiddle);
                    parts.push({ text: getLiteralText(node) });
                    break;
                case SyntaxKind.TemplateTail:
                    Debug.assertNode(node, isTemplateTail);
                    parts.push({ text: getLiteralText(node) });
                    break;
                case SyntaxKind.ThisType:
                    Debug.assertNode(node, isThisTypeNode);
                    parts.push({ text: "this" });
                    break;
                default:
                    Debug.failBadSyntaxKind(node);
            }
        }
        /**
         * Visits the type parameters and parameters, returning something like:
         *   <T1, T2>(p1: t1, p2: t2)
         * which can be used for signature declaration nodes.
         * @param signatureDeclaration Node to visit.
         */
        function visitParametersAndTypeParameters(signatureDeclaration) {
            if (signatureDeclaration.typeParameters) {
                parts.push({ text: "<" });
                visitDisplayPartList(signatureDeclaration.typeParameters, ", ");
                parts.push({ text: ">" });
            }
            parts.push({ text: "(" });
            visitDisplayPartList(signatureDeclaration.parameters, ", ");
            parts.push({ text: ")" });
        }
        function visitDisplayPartList(nodes, separator) {
            nodes.forEach((node, index) => {
                if (index > 0) {
                    parts.push({ text: separator });
                }
                visitForDisplayParts(node);
            });
        }
        function getLiteralText(node) {
            var _a;
            switch (node.kind) {
                case SyntaxKind.StringLiteral:
                    return quotePreference === QuotePreference.Single ? `'${escapeString(node.text, CharacterCodes.singleQuote)}'` : `"${escapeString(node.text, CharacterCodes.doubleQuote)}"`;
                case SyntaxKind.TemplateHead:
                case SyntaxKind.TemplateMiddle:
                case SyntaxKind.TemplateTail: {
                    const rawText = (_a = node.rawText) !== null && _a !== void 0 ? _a : escapeTemplateSubstitution(escapeString(node.text, CharacterCodes.backtick));
                    switch (node.kind) {
                        case SyntaxKind.TemplateHead:
                            return "`" + rawText + "${";
                        case SyntaxKind.TemplateMiddle:
                            return "}" + rawText + "${";
                        case SyntaxKind.TemplateTail:
                            return "}" + rawText + "`";
                    }
                }
            }
            return node.text;
        }
    }
    function isUndefined(name) {
        return name === "undefined";
    }
    function isHintableDeclaration(node) {
        if ((isPartOfParameterDeclaration(node) || isVariableDeclaration(node) && isVarConst(node)) && node.initializer) {
            const initializer = skipParentheses(node.initializer);
            return !(isHintableLiteral(initializer) || isNewExpression(initializer) || isObjectLiteralExpression(initializer) || isAssertionExpression(initializer));
        }
        return true;
    }
    function getNodeDisplayPart(text, node) {
        const sourceFile = node.getSourceFile();
        return {
            text,
            span: createTextSpanFromNode(node, sourceFile),
            file: sourceFile.fileName,
        };
    }
}
