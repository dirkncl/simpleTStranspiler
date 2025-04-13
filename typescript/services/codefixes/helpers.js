import {
  append,
  arrayFrom,
  CharacterCodes,
  CheckFlags,
  combine,
  Debug,
  Diagnostics,
  emptyArray,
  factory,
  find,
  firstOrUndefined,
  flatMap,
  getAllAccessorDeclarations,
  getCheckFlags,
  getEffectiveModifierFlags,
  getEmitScriptTarget,
  getFirstIdentifier,
  getModuleSpecifierResolverHost,
  getNameForExportedSymbol,
  getNameOfDeclaration,
  getPropertyNameFromType,
  getQuotePreference,
  getSetAccessorValueParameter,
  getSynthesizedDeepClone,
  getTokenAtPosition,
  getTsConfigObjectLiteralExpression,
  hasAbstractModifier,
  idText,
  InternalNodeBuilderFlags,
  isArrowFunction,
  isAutoAccessorPropertyDeclaration,
  isFunctionDeclaration,
  isFunctionExpression,
  isGetAccessorDeclaration,
  isIdentifier,
  isImportTypeNode,
  isInJSFile,
  isLiteralImportTypeNode,
  isMethodDeclaration,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isSetAccessorDeclaration,
  isStringLiteral,
  isTypeNode,
  isTypeReferenceNode,
  isTypeUsableAsPropertyName,
  isYieldExpression,
  length,
  map,
  ModifierFlags,
  NodeBuilderFlags,
  NodeFlags,
  ObjectFlags,
  QuotePreference,
  sameMap,
  setTextRange,
  signatureHasRestParameter,
  some,
  SymbolFlags,
  SyntaxKind,
  textSpanEnd,
  tryCast,
  TypeFlags,
  unescapeLeadingUnderscores,
  visitEachChild,
  visitNode,
  visitNodes,
} from "../_namespaces/ts.js";

/**
 * Finds members of the resolved type that are missing in the class pointed to by class decl
 * and generates source code for the missing members.
 * @param possiblyMissingSymbols The collection of symbols to filter and then get insertions for.
 * @param importAdder If provided, type annotations will use identifier type references instead of ImportTypeNodes, and the missing imports will be added to the importAdder.
 * @returns Empty string iff there are no member insertions.
 *
 * @internal
 */
export function createMissingMemberNodes(classDeclaration, possiblyMissingSymbols, sourceFile, context, preferences, importAdder, addClassElement) {
    const classMembers = classDeclaration.symbol.members;
    for (const symbol of possiblyMissingSymbols) {
        if (!classMembers.has(symbol.escapedName)) {
            addNewNodeForMemberSymbol(symbol, classDeclaration, sourceFile, context, preferences, importAdder, addClassElement, /*body*/ undefined);
        }
    }
}

/** @internal */
export function getNoopSymbolTrackerWithResolver(context) {
    return {
        trackSymbol: () => false,
        moduleResolverHost: getModuleSpecifierResolverHost(context.program, context.host),
    };
}

/** @internal */
export var PreserveOptionalFlags;
(function (PreserveOptionalFlags) {
    PreserveOptionalFlags[PreserveOptionalFlags["Method"] = 1] = "Method";
    PreserveOptionalFlags[PreserveOptionalFlags["Property"] = 2] = "Property";
    PreserveOptionalFlags[PreserveOptionalFlags["All"] = 3] = "All";
})(PreserveOptionalFlags || (PreserveOptionalFlags = {}));

/**
 * `addClassElement` will not be called if we can't figure out a representation for `symbol` in `enclosingDeclaration`.
 * @param body If defined, this will be the body of the member node passed to `addClassElement`. Otherwise, the body will default to a stub.
 *
 * @internal
 */
export function addNewNodeForMemberSymbol(symbol, enclosingDeclaration, sourceFile, context, preferences, importAdder, addClassElement, body, preserveOptional = 3 /* PreserveOptionalFlags.All */, isAmbient = false) {
    var _a;
    const declarations = symbol.getDeclarations();
    const declaration = firstOrUndefined(declarations);
    const checker = context.program.getTypeChecker();
    const scriptTarget = getEmitScriptTarget(context.program.getCompilerOptions());
    /**
     * (#49811)
     * Note that there are cases in which the symbol declaration is not present. For example, in the code below both
     * `MappedIndirect.ax` and `MappedIndirect.ay` have no declaration node attached (due to their mapped-type
     * parent):
     *
     * ```ts
     * type Base = { ax: number; ay: string };
     * type BaseKeys = keyof Base;
     * type MappedIndirect = { [K in BaseKeys]: boolean };
     * ```
     *
     * In such cases, we assume the declaration to be a `PropertySignature`.
     */
    const kind = (_a = declaration === null || declaration === void 0 ? void 0 : declaration.kind) !== null && _a !== void 0 ? _a : SyntaxKind.PropertySignature;
    const declarationName = createDeclarationName(symbol, declaration);
    const effectiveModifierFlags = declaration ? getEffectiveModifierFlags(declaration) : ModifierFlags.None;
    let modifierFlags = effectiveModifierFlags & ModifierFlags.Static;
    modifierFlags |= effectiveModifierFlags & ModifierFlags.Public ? ModifierFlags.Public :
        effectiveModifierFlags & ModifierFlags.Protected ? ModifierFlags.Protected :
            ModifierFlags.None;
    if (declaration && isAutoAccessorPropertyDeclaration(declaration)) {
        modifierFlags |= ModifierFlags.Accessor;
    }
    const modifiers = createModifiers();
    const type = checker.getWidenedType(checker.getTypeOfSymbolAtLocation(symbol, enclosingDeclaration));
    const optional = !!(symbol.flags & SymbolFlags.Optional);
    const ambient = !!(enclosingDeclaration.flags & NodeFlags.Ambient) || isAmbient;
    const quotePreference = getQuotePreference(sourceFile, preferences);
    const flags = NodeBuilderFlags.NoTruncation
        | (quotePreference === QuotePreference.Single ? NodeBuilderFlags.UseSingleQuotesForStringLiteralType : NodeBuilderFlags.None);
    switch (kind) {
        case SyntaxKind.PropertySignature:
        case SyntaxKind.PropertyDeclaration:
            let typeNode = checker.typeToTypeNode(type, enclosingDeclaration, flags, InternalNodeBuilderFlags.AllowUnresolvedNames, getNoopSymbolTrackerWithResolver(context));
            if (importAdder) {
                const importableReference = tryGetAutoImportableReferenceFromTypeNode(typeNode, scriptTarget);
                if (importableReference) {
                    typeNode = importableReference.typeNode;
                    importSymbols(importAdder, importableReference.symbols);
                }
            }
            addClassElement(factory.createPropertyDeclaration(modifiers, declaration ? createName(declarationName) : symbol.getName(), optional && (preserveOptional & 2 /* PreserveOptionalFlags.Property */) ? factory.createToken(SyntaxKind.QuestionToken) : undefined, typeNode, 
            /*initializer*/ undefined));
            break;
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor: {
            Debug.assertIsDefined(declarations);
            let typeNode = checker.typeToTypeNode(type, enclosingDeclaration, flags, /*internalFlags*/ undefined, getNoopSymbolTrackerWithResolver(context));
            const allAccessors = getAllAccessorDeclarations(declarations, declaration);
            const orderedAccessors = allAccessors.secondAccessor
                ? [allAccessors.firstAccessor, allAccessors.secondAccessor]
                : [allAccessors.firstAccessor];
            if (importAdder) {
                const importableReference = tryGetAutoImportableReferenceFromTypeNode(typeNode, scriptTarget);
                if (importableReference) {
                    typeNode = importableReference.typeNode;
                    importSymbols(importAdder, importableReference.symbols);
                }
            }
            for (const accessor of orderedAccessors) {
                if (isGetAccessorDeclaration(accessor)) {
                    addClassElement(factory.createGetAccessorDeclaration(modifiers, createName(declarationName), emptyArray, createTypeNode(typeNode), createBody(body, quotePreference, ambient)));
                }
                else {
                    Debug.assertNode(accessor, isSetAccessorDeclaration, "The counterpart to a getter should be a setter");
                    const parameter = getSetAccessorValueParameter(accessor);
                    const parameterName = parameter && isIdentifier(parameter.name) ? idText(parameter.name) : undefined;
                    addClassElement(factory.createSetAccessorDeclaration(modifiers, createName(declarationName), createDummyParameters(1, [parameterName], [createTypeNode(typeNode)], 1, /*inJs*/ false), createBody(body, quotePreference, ambient)));
                }
            }
            break;
        }
        case SyntaxKind.MethodSignature:
        case SyntaxKind.MethodDeclaration:
            // The signature for the implementation appears as an entry in `signatures` iff
            // there is only one signature.
            // If there are overloads and an implementation signature, it appears as an
            // extra declaration that isn't a signature for `type`.
            // If there is more than one overload but no implementation signature
            // (eg: an abstract method or interface declaration), there is a 1-1
            // correspondence of declarations and signatures.
            Debug.assertIsDefined(declarations);
            const signatures = type.isUnion() ? flatMap(type.types, t => t.getCallSignatures()) : type.getCallSignatures();
            if (!some(signatures)) {
                break;
            }
            if (declarations.length === 1) {
                Debug.assert(signatures.length === 1, "One declaration implies one signature");
                const signature = signatures[0];
                outputMethod(quotePreference, signature, modifiers, createName(declarationName), createBody(body, quotePreference, ambient));
                break;
            }
            for (const signature of signatures) {
                if (signature.declaration && (signature.declaration.flags & NodeFlags.Ambient)) {
                    continue;
                }
                // Ensure nodes are fresh so they can have different positions when going through formatting.
                outputMethod(quotePreference, signature, modifiers, createName(declarationName));
            }
            if (!ambient) {
                if (declarations.length > signatures.length) {
                    const signature = checker.getSignatureFromDeclaration(declarations[declarations.length - 1]);
                    outputMethod(quotePreference, signature, modifiers, createName(declarationName), createBody(body, quotePreference));
                }
                else {
                    Debug.assert(declarations.length === signatures.length, "Declarations and signatures should match count");
                    addClassElement(createMethodImplementingSignatures(checker, context, enclosingDeclaration, signatures, createName(declarationName), optional && !!(preserveOptional & 1 /* PreserveOptionalFlags.Method */), modifiers, quotePreference, body));
                }
            }
            break;
    }
    function outputMethod(quotePreference, signature, modifiers, name, body) {
        const method = createSignatureDeclarationFromSignature(SyntaxKind.MethodDeclaration, context, quotePreference, signature, body, name, modifiers, optional && !!(preserveOptional & 1 /* PreserveOptionalFlags.Method */), enclosingDeclaration, importAdder);
        if (method)
            addClassElement(method);
    }
    function createModifiers() {
        let modifiers;
        if (modifierFlags) {
            modifiers = combine(modifiers, factory.createModifiersFromModifierFlags(modifierFlags));
        }
        if (shouldAddOverrideKeyword()) {
            modifiers = append(modifiers, factory.createToken(SyntaxKind.OverrideKeyword));
        }
        return modifiers && factory.createNodeArray(modifiers);
    }
    function shouldAddOverrideKeyword() {
        return !!(context.program.getCompilerOptions().noImplicitOverride && declaration && hasAbstractModifier(declaration));
    }
    function createName(node) {
        if (isIdentifier(node) && node.escapedText === "constructor") {
            return factory.createComputedPropertyName(factory.createStringLiteral(idText(node), quotePreference === QuotePreference.Single));
        }
        return getSynthesizedDeepClone(node, /*includeTrivia*/ false);
    }
    function createBody(block, quotePreference, ambient) {
        return ambient ? undefined :
            getSynthesizedDeepClone(block, /*includeTrivia*/ false) || createStubbedMethodBody(quotePreference);
    }
    function createTypeNode(typeNode) {
        return getSynthesizedDeepClone(typeNode, /*includeTrivia*/ false);
    }
    function createDeclarationName(symbol, declaration) {
        if (getCheckFlags(symbol) & CheckFlags.Mapped) {
            const nameType = symbol.links.nameType;
            if (nameType && isTypeUsableAsPropertyName(nameType)) {
                return factory.createIdentifier(unescapeLeadingUnderscores(getPropertyNameFromType(nameType)));
            }
        }
        return getSynthesizedDeepClone(getNameOfDeclaration(declaration), /*includeTrivia*/ false);
    }
}
/** @internal */
export function createSignatureDeclarationFromSignature(kind, context, quotePreference, signature, body, name, modifiers, optional, enclosingDeclaration, importAdder) {
    const program = context.program;
    const checker = program.getTypeChecker();
    const scriptTarget = getEmitScriptTarget(program.getCompilerOptions());
    const isJs = isInJSFile(enclosingDeclaration);
    const flags = NodeBuilderFlags.NoTruncation
        | NodeBuilderFlags.SuppressAnyReturnType
        | NodeBuilderFlags.AllowEmptyTuple
        | (quotePreference === QuotePreference.Single ? NodeBuilderFlags.UseSingleQuotesForStringLiteralType : NodeBuilderFlags.None);
    const signatureDeclaration = checker.signatureToSignatureDeclaration(signature, kind, enclosingDeclaration, flags, InternalNodeBuilderFlags.AllowUnresolvedNames, getNoopSymbolTrackerWithResolver(context));
    if (!signatureDeclaration) {
        return undefined;
    }
    let typeParameters = isJs ? undefined : signatureDeclaration.typeParameters;
    let parameters = signatureDeclaration.parameters;
    let type = isJs ? undefined : getSynthesizedDeepClone(signatureDeclaration.type);
    if (importAdder) {
        if (typeParameters) {
            const newTypeParameters = sameMap(typeParameters, typeParameterDecl => {
                let constraint = typeParameterDecl.constraint;
                let defaultType = typeParameterDecl.default;
                if (constraint) {
                    const importableReference = tryGetAutoImportableReferenceFromTypeNode(constraint, scriptTarget);
                    if (importableReference) {
                        constraint = importableReference.typeNode;
                        importSymbols(importAdder, importableReference.symbols);
                    }
                }
                if (defaultType) {
                    const importableReference = tryGetAutoImportableReferenceFromTypeNode(defaultType, scriptTarget);
                    if (importableReference) {
                        defaultType = importableReference.typeNode;
                        importSymbols(importAdder, importableReference.symbols);
                    }
                }
                return factory.updateTypeParameterDeclaration(typeParameterDecl, typeParameterDecl.modifiers, typeParameterDecl.name, constraint, defaultType);
            });
            if (typeParameters !== newTypeParameters) {
                typeParameters = setTextRange(factory.createNodeArray(newTypeParameters, typeParameters.hasTrailingComma), typeParameters);
            }
        }
        const newParameters = sameMap(parameters, parameterDecl => {
            let type = isJs ? undefined : parameterDecl.type;
            if (type) {
                const importableReference = tryGetAutoImportableReferenceFromTypeNode(type, scriptTarget);
                if (importableReference) {
                    type = importableReference.typeNode;
                    importSymbols(importAdder, importableReference.symbols);
                }
            }
            return factory.updateParameterDeclaration(parameterDecl, parameterDecl.modifiers, parameterDecl.dotDotDotToken, parameterDecl.name, isJs ? undefined : parameterDecl.questionToken, type, parameterDecl.initializer);
        });
        if (parameters !== newParameters) {
            parameters = setTextRange(factory.createNodeArray(newParameters, parameters.hasTrailingComma), parameters);
        }
        if (type) {
            const importableReference = tryGetAutoImportableReferenceFromTypeNode(type, scriptTarget);
            if (importableReference) {
                type = importableReference.typeNode;
                importSymbols(importAdder, importableReference.symbols);
            }
        }
    }
    const questionToken = optional ? factory.createToken(SyntaxKind.QuestionToken) : undefined;
    const asteriskToken = signatureDeclaration.asteriskToken;
    if (isFunctionExpression(signatureDeclaration)) {
        return factory.updateFunctionExpression(signatureDeclaration, modifiers, signatureDeclaration.asteriskToken, tryCast(name, isIdentifier), typeParameters, parameters, type, body !== null && body !== void 0 ? body : signatureDeclaration.body);
    }
    if (isArrowFunction(signatureDeclaration)) {
        return factory.updateArrowFunction(signatureDeclaration, modifiers, typeParameters, parameters, type, signatureDeclaration.equalsGreaterThanToken, body !== null && body !== void 0 ? body : signatureDeclaration.body);
    }
    if (isMethodDeclaration(signatureDeclaration)) {
        return factory.updateMethodDeclaration(signatureDeclaration, modifiers, asteriskToken, name !== null && name !== void 0 ? name : factory.createIdentifier(""), questionToken, typeParameters, parameters, type, body);
    }
    if (isFunctionDeclaration(signatureDeclaration)) {
        return factory.updateFunctionDeclaration(signatureDeclaration, modifiers, signatureDeclaration.asteriskToken, tryCast(name, isIdentifier), typeParameters, parameters, type, body !== null && body !== void 0 ? body : signatureDeclaration.body);
    }
    return undefined;
}
/** @internal */
export function createSignatureDeclarationFromCallExpression(kind, context, importAdder, call, name, modifierFlags, contextNode) {
    const quotePreference = getQuotePreference(context.sourceFile, context.preferences);
    const scriptTarget = getEmitScriptTarget(context.program.getCompilerOptions());
    const tracker = getNoopSymbolTrackerWithResolver(context);
    const checker = context.program.getTypeChecker();
    const isJs = isInJSFile(contextNode);
    const { typeArguments, arguments: args, parent } = call;
    const contextualType = isJs ? undefined : checker.getContextualType(call);
    const names = map(args, arg => isIdentifier(arg) ? arg.text : isPropertyAccessExpression(arg) && isIdentifier(arg.name) ? arg.name.text : undefined);
    const instanceTypes = isJs ? [] : map(args, arg => checker.getTypeAtLocation(arg));
    const { argumentTypeNodes, argumentTypeParameters } = getArgumentTypesAndTypeParameters(checker, importAdder, instanceTypes, contextNode, scriptTarget, NodeBuilderFlags.NoTruncation, InternalNodeBuilderFlags.AllowUnresolvedNames, tracker);
    const modifiers = modifierFlags
        ? factory.createNodeArray(factory.createModifiersFromModifierFlags(modifierFlags))
        : undefined;
    const asteriskToken = isYieldExpression(parent)
        ? factory.createToken(SyntaxKind.AsteriskToken)
        : undefined;
    const typeParameters = isJs ? undefined : createTypeParametersForArguments(checker, argumentTypeParameters, typeArguments);
    const parameters = createDummyParameters(args.length, names, argumentTypeNodes, /*minArgumentCount*/ undefined, isJs);
    const type = isJs || contextualType === undefined
        ? undefined
        : checker.typeToTypeNode(contextualType, contextNode, /*flags*/ undefined, /*internalFlags*/ undefined, tracker);
    switch (kind) {
        case SyntaxKind.MethodDeclaration:
            return factory.createMethodDeclaration(modifiers, asteriskToken, name, 
            /*questionToken*/ undefined, typeParameters, parameters, type, createStubbedMethodBody(quotePreference));
        case SyntaxKind.MethodSignature:
            return factory.createMethodSignature(modifiers, name, 
            /*questionToken*/ undefined, typeParameters, parameters, type === undefined ? factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword) : type);
        case SyntaxKind.FunctionDeclaration:
            Debug.assert(typeof name === "string" || isIdentifier(name), "Unexpected name");
            return factory.createFunctionDeclaration(modifiers, asteriskToken, name, typeParameters, parameters, type, createStubbedBody(Diagnostics.Function_not_implemented.message, quotePreference));
        default:
            Debug.fail("Unexpected kind");
    }
}
function createTypeParametersForArguments(checker, argumentTypeParameters, typeArguments) {
    const usedNames = new Set(argumentTypeParameters.map(pair => pair[0]));
    const constraintsByName = new Map(argumentTypeParameters);
    if (typeArguments) {
        const typeArgumentsWithNewTypes = typeArguments.filter(typeArgument => !argumentTypeParameters.some(pair => { var _a; return checker.getTypeAtLocation(typeArgument) === ((_a = pair[1]) === null || _a === void 0 ? void 0 : _a.argumentType); }));
        const targetSize = usedNames.size + typeArgumentsWithNewTypes.length;
        for (let i = 0; usedNames.size < targetSize; i += 1) {
            usedNames.add(createTypeParameterName(i));
        }
    }
    return arrayFrom(usedNames.values(), usedName => { var _a; return factory.createTypeParameterDeclaration(/*modifiers*/ undefined, usedName, (_a = constraintsByName.get(usedName)) === null || _a === void 0 ? void 0 : _a.constraint); });
}
function createTypeParameterName(index) {
    return CharacterCodes.T + index <= CharacterCodes.Z
        ? String.fromCharCode(CharacterCodes.T + index)
        : `T${index}`;
}
/** @internal */
export function typeToAutoImportableTypeNode(checker, importAdder, type, contextNode, scriptTarget, flags, internalFlags, tracker) {
    const typeNode = checker.typeToTypeNode(type, contextNode, flags, internalFlags, tracker);
    if (!typeNode) {
        return undefined;
    }
    return typeNodeToAutoImportableTypeNode(typeNode, importAdder, scriptTarget);
}
/** @internal */
export function typeNodeToAutoImportableTypeNode(typeNode, importAdder, scriptTarget) {
    const importableReference = tryGetAutoImportableReferenceFromTypeNode(typeNode, scriptTarget);
    if (importableReference) {
        importSymbols(importAdder, importableReference.symbols);
        typeNode = importableReference.typeNode;
    }
    // Ensure nodes are fresh so they can have different positions when going through formatting.
    return getSynthesizedDeepClone(typeNode);
}
function endOfRequiredTypeParameters(checker, type) {
    var _a;
    Debug.assert(type.typeArguments);
    const fullTypeArguments = type.typeArguments;
    const target = type.target;
    for (let cutoff = 0; cutoff < fullTypeArguments.length; cutoff++) {
        if (((_a = target.localTypeParameters) === null || _a === void 0 ? void 0 : _a[cutoff].constraint) === undefined) {
            continue;
        }
        const typeArguments = fullTypeArguments.slice(0, cutoff);
        const filledIn = checker.fillMissingTypeArguments(typeArguments, target.typeParameters, cutoff, /*isJavaScriptImplicitAny*/ false);
        if (filledIn.every((fill, i) => fill === fullTypeArguments[i])) {
            return cutoff;
        }
    }
    // If we make it all the way here, all the type arguments are required.
    return fullTypeArguments.length;
}
/** @internal */
export function typeToMinimizedReferenceType(checker, type, contextNode, flags, internalFlags, tracker) {
    let typeNode = checker.typeToTypeNode(type, contextNode, flags, internalFlags, tracker);
    if (!typeNode) {
        return undefined;
    }
    if (isTypeReferenceNode(typeNode)) {
        const genericType = type;
        if (genericType.typeArguments && typeNode.typeArguments) {
            const cutoff = endOfRequiredTypeParameters(checker, genericType);
            if (cutoff < typeNode.typeArguments.length) {
                const newTypeArguments = factory.createNodeArray(typeNode.typeArguments.slice(0, cutoff));
                typeNode = factory.updateTypeReferenceNode(typeNode, typeNode.typeName, newTypeArguments);
            }
        }
    }
    return typeNode;
}
/** @internal */
export function typePredicateToAutoImportableTypeNode(checker, importAdder, typePredicate, contextNode, scriptTarget, flags, internalFlags, tracker) {
    let typePredicateNode = checker.typePredicateToTypePredicateNode(typePredicate, contextNode, flags, internalFlags, tracker);
    if ((typePredicateNode === null || typePredicateNode === void 0 ? void 0 : typePredicateNode.type) && isImportTypeNode(typePredicateNode.type)) {
        const importableReference = tryGetAutoImportableReferenceFromTypeNode(typePredicateNode.type, scriptTarget);
        if (importableReference) {
            importSymbols(importAdder, importableReference.symbols);
            typePredicateNode = factory.updateTypePredicateNode(typePredicateNode, typePredicateNode.assertsModifier, typePredicateNode.parameterName, importableReference.typeNode);
        }
    }
    // Ensure nodes are fresh so they can have different positions when going through formatting.
    return getSynthesizedDeepClone(typePredicateNode);
}
function typeContainsTypeParameter(type) {
    if (type.isUnionOrIntersection()) {
        return type.types.some(typeContainsTypeParameter);
    }
    return type.flags & TypeFlags.TypeParameter;
}
function getArgumentTypesAndTypeParameters(checker, importAdder, instanceTypes, contextNode, scriptTarget, flags, internalFlags, tracker) {
    // Types to be used as the types of the parameters in the new function
    // E.g. from this source:
    //   added("", 0)
    // The value will look like:
    //   [{ typeName: { text: "string" } }, { typeName: { text: "number" }]
    // And in the output function will generate:
    //   function added(a: string, b: number) { ... }
    const argumentTypeNodes = [];
    // Names of type parameters provided as arguments to the call
    // E.g. from this source:
    //   added<T, U>(value);
    // The value will look like:
    //   [
    //     ["T", { argumentType: { typeName: { text: "T" } } } ],
    //     ["U", { argumentType: { typeName: { text: "U" } } } ],
    //   ]
    // And in the output function will generate:
    //   function added<T, U>() { ... }
    const argumentTypeParameters = new Map();
    for (let i = 0; i < instanceTypes.length; i += 1) {
        const instanceType = instanceTypes[i];
        // If the instance type contains a deep reference to an existing type parameter,
        // instead of copying the full union or intersection, create a new type parameter
        // E.g. from this source:
        //   function existing<T, U>(value: T | U & string) {
        //     added/*1*/(value);
        // We don't want to output this:
        //    function added<T>(value: T | U & string) { ... }
        // We instead want to output:
        //    function added<T>(value: T) { ... }
        if (instanceType.isUnionOrIntersection() && instanceType.types.some(typeContainsTypeParameter)) {
            const synthesizedTypeParameterName = createTypeParameterName(i);
            argumentTypeNodes.push(factory.createTypeReferenceNode(synthesizedTypeParameterName));
            argumentTypeParameters.set(synthesizedTypeParameterName, undefined);
            continue;
        }
        // Widen the type so we don't emit nonsense annotations like "function fn(x: 3) {"
        const widenedInstanceType = checker.getBaseTypeOfLiteralType(instanceType);
        const argumentTypeNode = typeToAutoImportableTypeNode(checker, importAdder, widenedInstanceType, contextNode, scriptTarget, flags, internalFlags, tracker);
        if (!argumentTypeNode) {
            continue;
        }
        argumentTypeNodes.push(argumentTypeNode);
        const argumentTypeParameter = getFirstTypeParameterName(instanceType);
        // If the instance type is a type parameter with a constraint (other than an anonymous object),
        // remember that constraint for when we create the new type parameter
        // E.g. from this source:
        //   function existing<T extends string>(value: T) {
        //     added/*1*/(value);
        // We don't want to output this:
        //    function added<T>(value: T) { ... }
        // We instead want to output:
        //    function added<T extends string>(value: T) { ... }
        const instanceTypeConstraint = instanceType.isTypeParameter() && instanceType.constraint && !isAnonymousObjectConstraintType(instanceType.constraint)
            ? typeToAutoImportableTypeNode(checker, importAdder, instanceType.constraint, contextNode, scriptTarget, flags, internalFlags, tracker)
            : undefined;
        if (argumentTypeParameter) {
            argumentTypeParameters.set(argumentTypeParameter, { argumentType: instanceType, constraint: instanceTypeConstraint });
        }
    }
    return { argumentTypeNodes, argumentTypeParameters: arrayFrom(argumentTypeParameters.entries()) };
}
function isAnonymousObjectConstraintType(type) {
    return (type.flags & TypeFlags.Object) && type.objectFlags === ObjectFlags.Anonymous;
}
function getFirstTypeParameterName(type) {
    var _a;
    if (type.flags & (TypeFlags.Union | TypeFlags.Intersection)) {
        for (const subType of type.types) {
            const subTypeName = getFirstTypeParameterName(subType);
            if (subTypeName) {
                return subTypeName;
            }
        }
    }
    return type.flags & TypeFlags.TypeParameter
        ? (_a = type.getSymbol()) === null || _a === void 0 ? void 0 : _a.getName()
        : undefined;
}
function createDummyParameters(argCount, names, types, minArgumentCount, inJs) {
    const parameters = [];
    const parameterNameCounts = new Map();
    for (let i = 0; i < argCount; i++) {
        const parameterName = (names === null || names === void 0 ? void 0 : names[i]) || `arg${i}`;
        const parameterNameCount = parameterNameCounts.get(parameterName);
        parameterNameCounts.set(parameterName, (parameterNameCount || 0) + 1);
        const newParameter = factory.createParameterDeclaration(
        /*modifiers*/ undefined, 
        /*dotDotDotToken*/ undefined, 
        /*name*/ parameterName + (parameterNameCount || ""), 
        /*questionToken*/ minArgumentCount !== undefined && i >= minArgumentCount ? factory.createToken(SyntaxKind.QuestionToken) : undefined, 
        /*type*/ inJs ? undefined : (types === null || types === void 0 ? void 0 : types[i]) || factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword), 
        /*initializer*/ undefined);
        parameters.push(newParameter);
    }
    return parameters;
}
function createMethodImplementingSignatures(checker, context, enclosingDeclaration, signatures, name, optional, modifiers, quotePreference, body) {
    /** This is *a* signature with the maximal number of arguments,
     * such that if there is a "maximal" signature without rest arguments,
     * this is one of them.
     */
    let maxArgsSignature = signatures[0];
    let minArgumentCount = signatures[0].minArgumentCount;
    let someSigHasRestParameter = false;
    for (const sig of signatures) {
        minArgumentCount = Math.min(sig.minArgumentCount, minArgumentCount);
        if (signatureHasRestParameter(sig)) {
            someSigHasRestParameter = true;
        }
        if (sig.parameters.length >= maxArgsSignature.parameters.length && (!signatureHasRestParameter(sig) || signatureHasRestParameter(maxArgsSignature))) {
            maxArgsSignature = sig;
        }
    }
    const maxNonRestArgs = maxArgsSignature.parameters.length - (signatureHasRestParameter(maxArgsSignature) ? 1 : 0);
    const maxArgsParameterSymbolNames = maxArgsSignature.parameters.map(symbol => symbol.name);
    const parameters = createDummyParameters(maxNonRestArgs, maxArgsParameterSymbolNames, /*types*/ undefined, minArgumentCount, /*inJs*/ false);
    if (someSigHasRestParameter) {
        const restParameter = factory.createParameterDeclaration(
        /*modifiers*/ undefined, factory.createToken(SyntaxKind.DotDotDotToken), maxArgsParameterSymbolNames[maxNonRestArgs] || "rest", 
        /*questionToken*/ maxNonRestArgs >= minArgumentCount ? factory.createToken(SyntaxKind.QuestionToken) : undefined, factory.createArrayTypeNode(factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword)), 
        /*initializer*/ undefined);
        parameters.push(restParameter);
    }
    return createStubbedMethod(modifiers, name, optional, 
    /*typeParameters*/ undefined, parameters, getReturnTypeFromSignatures(signatures, checker, context, enclosingDeclaration), quotePreference, body);
}
function getReturnTypeFromSignatures(signatures, checker, context, enclosingDeclaration) {
    if (length(signatures)) {
        const type = checker.getUnionType(map(signatures, checker.getReturnTypeOfSignature));
        return checker.typeToTypeNode(type, enclosingDeclaration, NodeBuilderFlags.NoTruncation, InternalNodeBuilderFlags.AllowUnresolvedNames, getNoopSymbolTrackerWithResolver(context));
    }
}
function createStubbedMethod(modifiers, name, optional, typeParameters, parameters, returnType, quotePreference, body) {
    return factory.createMethodDeclaration(modifiers, 
    /*asteriskToken*/ undefined, name, optional ? factory.createToken(SyntaxKind.QuestionToken) : undefined, typeParameters, parameters, returnType, body || createStubbedMethodBody(quotePreference));
}
function createStubbedMethodBody(quotePreference) {
    return createStubbedBody(Diagnostics.Method_not_implemented.message, quotePreference);
}
/** @internal */
export function createStubbedBody(text, quotePreference) {
    return factory.createBlock([factory.createThrowStatement(factory.createNewExpression(factory.createIdentifier("Error"), 
        /*typeArguments*/ undefined, 
        // TODO Handle auto quote preference.
        [factory.createStringLiteral(text, /*isSingleQuote*/ quotePreference === QuotePreference.Single)]))], 
    /*multiLine*/ true);
}
/** @internal */
export function setJsonCompilerOptionValues(changeTracker, configFile, options) {
    const tsconfigObjectLiteral = getTsConfigObjectLiteralExpression(configFile);
    if (!tsconfigObjectLiteral)
        return undefined;
    const compilerOptionsProperty = findJsonProperty(tsconfigObjectLiteral, "compilerOptions");
    if (compilerOptionsProperty === undefined) {
        changeTracker.insertNodeAtObjectStart(configFile, tsconfigObjectLiteral, createJsonPropertyAssignment("compilerOptions", factory.createObjectLiteralExpression(options.map(([optionName, optionValue]) => createJsonPropertyAssignment(optionName, optionValue)), /*multiLine*/ true)));
        return;
    }
    const compilerOptions = compilerOptionsProperty.initializer;
    if (!isObjectLiteralExpression(compilerOptions)) {
        return;
    }
    for (const [optionName, optionValue] of options) {
        const optionProperty = findJsonProperty(compilerOptions, optionName);
        if (optionProperty === undefined) {
            changeTracker.insertNodeAtObjectStart(configFile, compilerOptions, createJsonPropertyAssignment(optionName, optionValue));
        }
        else {
            changeTracker.replaceNode(configFile, optionProperty.initializer, optionValue);
        }
    }
}
/** @internal */
export function setJsonCompilerOptionValue(changeTracker, configFile, optionName, optionValue) {
    setJsonCompilerOptionValues(changeTracker, configFile, [[optionName, optionValue]]);
}
function createJsonPropertyAssignment(name, initializer) {
    return factory.createPropertyAssignment(factory.createStringLiteral(name), initializer);
}
function findJsonProperty(obj, name) {
    return find(obj.properties, (p) => isPropertyAssignment(p) && !!p.name && isStringLiteral(p.name) && p.name.text === name);
}
/**
 * Given a type node containing 'import("./a").SomeType<import("./b").OtherType<...>>',
 * returns an equivalent type reference node with any nested ImportTypeNodes also replaced
 * with type references, and a list of symbols that must be imported to use the type reference.
 *
 * @internal
 */
export function tryGetAutoImportableReferenceFromTypeNode(importTypeNode, scriptTarget) {
    let symbols;
    const typeNode = visitNode(importTypeNode, visit, isTypeNode);
    if (symbols && typeNode) {
        return { typeNode, symbols };
    }
    function visit(node) {
        if (isLiteralImportTypeNode(node) && node.qualifier) {
            // Symbol for the left-most thing after the dot
            const firstIdentifier = getFirstIdentifier(node.qualifier);
            if (!firstIdentifier.symbol) {
                // if symbol is missing then this doesn't come from a synthesized import type node
                // it has to be an import type node authored by the user and thus it has to be valid
                // it can't refer to reserved internal symbol names and such
                return visitEachChild(node, visit, /*context*/ undefined);
            }
            const name = getNameForExportedSymbol(firstIdentifier.symbol, scriptTarget);
            const qualifier = name !== firstIdentifier.text
                ? replaceFirstIdentifierOfEntityName(node.qualifier, factory.createIdentifier(name))
                : node.qualifier;
            symbols = append(symbols, firstIdentifier.symbol);
            const typeArguments = visitNodes(node.typeArguments, visit, isTypeNode);
            return factory.createTypeReferenceNode(qualifier, typeArguments);
        }
        return visitEachChild(node, visit, /*context*/ undefined);
    }
}
function replaceFirstIdentifierOfEntityName(name, newIdentifier) {
    if (name.kind === SyntaxKind.Identifier) {
        return newIdentifier;
    }
    return factory.createQualifiedName(replaceFirstIdentifierOfEntityName(name.left, newIdentifier), name.right);
}
/** @internal */
export function importSymbols(importAdder, symbols) {
    symbols.forEach(s => importAdder.addImportFromExportedSymbol(s, /*isValidTypeOnlyUseSite*/ true));
}
/** @internal */
export function findAncestorMatchingSpan(sourceFile, span) {
    const end = textSpanEnd(span);
    let token = getTokenAtPosition(sourceFile, span.start);
    while (token.end < end) {
        token = token.parent;
    }
    return token;
}
