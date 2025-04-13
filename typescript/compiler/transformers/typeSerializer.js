import {
  Debug,
  findAncestor,
  getAllAccessorDeclarations,
  getEffectiveReturnTypeNode,
  getEmitScriptTarget,
  getFirstConstructorWithBody,
  getParseTreeNode,
  getRestParameterElementType,
  getSetAccessorTypeAnnotationNode,
  getStrictOptionValue,
  isAsyncFunction,
  isBinaryExpression,
  isClassLike,
  isConditionalExpression,
  isConditionalTypeNode,
  isFunctionLike,
  isGeneratedIdentifier,
  isIdentifier,
  isLiteralTypeNode,
  isNumericLiteral,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isStringLiteral,
  isTypeOfExpression,
  isVoidExpression,
  nodeIsPresent,
  parseNodeFactory,
  ScriptTarget,
  setParent,
  setTextRange,
  skipTypeParentheses,
  SyntaxKind,
  TypeReferenceSerializationKind,
} from "../namespaces/ts.js";


/** @internal */
export function createRuntimeTypeSerializer(context) {
    const { factory, hoistVariableDeclaration, } = context;
    const resolver = context.getEmitResolver();
    const compilerOptions = context.getCompilerOptions();
    const languageVersion = getEmitScriptTarget(compilerOptions);
    const strictNullChecks = getStrictOptionValue(compilerOptions, "strictNullChecks");
    let currentLexicalScope;
    let currentNameScope;
    return {
        serializeTypeNode: (serializerContext, node) => setSerializerContextAnd(serializerContext, serializeTypeNode, node),
        serializeTypeOfNode: (serializerContext, node, container) => setSerializerContextAnd(serializerContext, serializeTypeOfNode, node, container),
        serializeParameterTypesOfNode: (serializerContext, node, container) => setSerializerContextAnd(serializerContext, serializeParameterTypesOfNode, node, container),
        serializeReturnTypeOfNode: (serializerContext, node) => setSerializerContextAnd(serializerContext, serializeReturnTypeOfNode, node),
    };
    function setSerializerContextAnd(serializerContext, cb, node, arg) {
        const savedCurrentLexicalScope = currentLexicalScope;
        const savedCurrentNameScope = currentNameScope;
        currentLexicalScope = serializerContext.currentLexicalScope;
        currentNameScope = serializerContext.currentNameScope;
        const result = arg === undefined ? cb(node) : cb(node, arg);
        currentLexicalScope = savedCurrentLexicalScope;
        currentNameScope = savedCurrentNameScope;
        return result;
    }
    function getAccessorTypeNode(node, container) {
        const accessors = getAllAccessorDeclarations(container.members, node);
        return accessors.setAccessor && getSetAccessorTypeAnnotationNode(accessors.setAccessor)
            || accessors.getAccessor && getEffectiveReturnTypeNode(accessors.getAccessor);
    }
    /**
     * Serializes the type of a node for use with decorator type metadata.
     * @param node The node that should have its type serialized.
     */
    function serializeTypeOfNode(node, container) {
        switch (node.kind) {
            case SyntaxKind.PropertyDeclaration:
            case SyntaxKind.Parameter:
                return serializeTypeNode(node.type);
            case SyntaxKind.SetAccessor:
            case SyntaxKind.GetAccessor:
                return serializeTypeNode(getAccessorTypeNode(node, container));
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.ClassExpression:
            case SyntaxKind.MethodDeclaration:
                return factory.createIdentifier("Function");
            default:
                return factory.createVoidZero();
        }
    }
    /**
     * Serializes the type of a node for use with decorator type metadata.
     * @param node The node that should have its type serialized.
     */
    function serializeParameterTypesOfNode(node, container) {
        const valueDeclaration = isClassLike(node)
            ? getFirstConstructorWithBody(node)
            : isFunctionLike(node) && nodeIsPresent(node.body)
                ? node
                : undefined;
        const expressions = [];
        if (valueDeclaration) {
            const parameters = getParametersOfDecoratedDeclaration(valueDeclaration, container);
            const numParameters = parameters.length;
            for (let i = 0; i < numParameters; i++) {
                const parameter = parameters[i];
                if (i === 0 && isIdentifier(parameter.name) && parameter.name.escapedText === "this") {
                    continue;
                }
                if (parameter.dotDotDotToken) {
                    expressions.push(serializeTypeNode(getRestParameterElementType(parameter.type)));
                }
                else {
                    expressions.push(serializeTypeOfNode(parameter, container));
                }
            }
        }
        return factory.createArrayLiteralExpression(expressions);
    }
    function getParametersOfDecoratedDeclaration(node, container) {
        if (container && node.kind === SyntaxKind.GetAccessor) {
            const { setAccessor } = getAllAccessorDeclarations(container.members, node);
            if (setAccessor) {
                return setAccessor.parameters;
            }
        }
        return node.parameters;
    }
    /**
     * Serializes the return type of a node for use with decorator type metadata.
     * @param node The node that should have its return type serialized.
     */
    function serializeReturnTypeOfNode(node) {
        if (isFunctionLike(node) && node.type) {
            return serializeTypeNode(node.type);
        }
        else if (isAsyncFunction(node)) {
            return factory.createIdentifier("Promise");
        }
        return factory.createVoidZero();
    }
    /**
     * Serializes a type node for use with decorator type metadata.
     *
     * Types are serialized in the following fashion:
     * - Void types point to "undefined" (e.g. "void 0")
     * - Function and Constructor types point to the global "Function" constructor.
     * - Interface types with a call or construct signature types point to the global
     *   "Function" constructor.
     * - Array and Tuple types point to the global "Array" constructor.
     * - Type predicates and booleans point to the global "Boolean" constructor.
     * - String literal types and strings point to the global "String" constructor.
     * - Enum and number types point to the global "Number" constructor.
     * - Symbol types point to the global "Symbol" constructor.
     * - Type references to classes (or class-like variables) point to the constructor for the class.
     * - Anything else points to the global "Object" constructor.
     *
     * @param node The type node to serialize.
     */
    function serializeTypeNode(node) {
        if (node === undefined) {
            return factory.createIdentifier("Object");
        }
        node = skipTypeParentheses(node);
        switch (node.kind) {
            case SyntaxKind.VoidKeyword:
            case SyntaxKind.UndefinedKeyword:
            case SyntaxKind.NeverKeyword:
                return factory.createVoidZero();
            case SyntaxKind.FunctionType:
            case SyntaxKind.ConstructorType:
                return factory.createIdentifier("Function");
            case SyntaxKind.ArrayType:
            case SyntaxKind.TupleType:
                return factory.createIdentifier("Array");
            case SyntaxKind.TypePredicate:
                return node.assertsModifier ?
                    factory.createVoidZero() :
                    factory.createIdentifier("Boolean");
            case SyntaxKind.BooleanKeyword:
                return factory.createIdentifier("Boolean");
            case SyntaxKind.TemplateLiteralType:
            case SyntaxKind.StringKeyword:
                return factory.createIdentifier("String");
            case SyntaxKind.ObjectKeyword:
                return factory.createIdentifier("Object");
            case SyntaxKind.LiteralType:
                return serializeLiteralOfLiteralTypeNode(node.literal);
            case SyntaxKind.NumberKeyword:
                return factory.createIdentifier("Number");
            case SyntaxKind.BigIntKeyword:
                return getGlobalConstructor("BigInt", ScriptTarget.ES2020);
            case SyntaxKind.SymbolKeyword:
                return getGlobalConstructor("Symbol", ScriptTarget.ES2015);
            case SyntaxKind.TypeReference:
                return serializeTypeReferenceNode(node);
            case SyntaxKind.IntersectionType:
                return serializeUnionOrIntersectionConstituents(node.types, /*isIntersection*/ true);
            case SyntaxKind.UnionType:
                return serializeUnionOrIntersectionConstituents(node.types, /*isIntersection*/ false);
            case SyntaxKind.ConditionalType:
                return serializeUnionOrIntersectionConstituents([node.trueType, node.falseType], /*isIntersection*/ false);
            case SyntaxKind.TypeOperator:
                if (node.operator === SyntaxKind.ReadonlyKeyword) {
                    return serializeTypeNode(node.type);
                }
                break;
            case SyntaxKind.TypeQuery:
            case SyntaxKind.IndexedAccessType:
            case SyntaxKind.MappedType:
            case SyntaxKind.TypeLiteral:
            case SyntaxKind.AnyKeyword:
            case SyntaxKind.UnknownKeyword:
            case SyntaxKind.ThisType:
            case SyntaxKind.ImportType:
                break;
            // handle JSDoc types from an invalid parse
            case SyntaxKind.JSDocAllType:
            case SyntaxKind.JSDocUnknownType:
            case SyntaxKind.JSDocFunctionType:
            case SyntaxKind.JSDocVariadicType:
            case SyntaxKind.JSDocNamepathType:
                break;
            case SyntaxKind.JSDocNullableType:
            case SyntaxKind.JSDocNonNullableType:
            case SyntaxKind.JSDocOptionalType:
                return serializeTypeNode(node.type);
            default:
                return Debug.failBadSyntaxKind(node);
        }
        return factory.createIdentifier("Object");
    }
    function serializeLiteralOfLiteralTypeNode(node) {
        switch (node.kind) {
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NoSubstitutionTemplateLiteral:
                return factory.createIdentifier("String");
            case SyntaxKind.PrefixUnaryExpression: {
                const operand = node.operand;
                switch (operand.kind) {
                    case SyntaxKind.NumericLiteral:
                    case SyntaxKind.BigIntLiteral:
                        return serializeLiteralOfLiteralTypeNode(operand);
                    default:
                        return Debug.failBadSyntaxKind(operand);
                }
            }
            case SyntaxKind.NumericLiteral:
                return factory.createIdentifier("Number");
            case SyntaxKind.BigIntLiteral:
                return getGlobalConstructor("BigInt", ScriptTarget.ES2020);
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
                return factory.createIdentifier("Boolean");
            case SyntaxKind.NullKeyword:
                return factory.createVoidZero();
            default:
                return Debug.failBadSyntaxKind(node);
        }
    }
    function serializeUnionOrIntersectionConstituents(types, isIntersection) {
        // Note when updating logic here also update `getEntityNameForDecoratorMetadata` in checker.ts so that aliases can be marked as referenced
        let serializedType;
        for (let typeNode of types) {
            typeNode = skipTypeParentheses(typeNode);
            if (typeNode.kind === SyntaxKind.NeverKeyword) {
                if (isIntersection)
                    return factory.createVoidZero(); // Reduce to `never` in an intersection
                continue; // Elide `never` in a union
            }
            if (typeNode.kind === SyntaxKind.UnknownKeyword) {
                if (!isIntersection)
                    return factory.createIdentifier("Object"); // Reduce to `unknown` in a union
                continue; // Elide `unknown` in an intersection
            }
            if (typeNode.kind === SyntaxKind.AnyKeyword) {
                return factory.createIdentifier("Object"); // Reduce to `any` in a union or intersection
            }
            if (!strictNullChecks && ((isLiteralTypeNode(typeNode) && typeNode.literal.kind === SyntaxKind.NullKeyword) || typeNode.kind === SyntaxKind.UndefinedKeyword)) {
                continue; // Elide null and undefined from unions for metadata, just like what we did prior to the implementation of strict null checks
            }
            const serializedConstituent = serializeTypeNode(typeNode);
            if (isIdentifier(serializedConstituent) && serializedConstituent.escapedText === "Object") {
                // One of the individual is global object, return immediately
                return serializedConstituent;
            }
            // If there exists union that is not `void 0` expression, check if the the common type is identifier.
            // anything more complex and we will just default to Object
            if (serializedType) {
                // Different types
                if (!equateSerializedTypeNodes(serializedType, serializedConstituent)) {
                    return factory.createIdentifier("Object");
                }
            }
            else {
                // Initialize the union type
                serializedType = serializedConstituent;
            }
        }
        // If we were able to find common type, use it
        return serializedType !== null && serializedType !== void 0 ? serializedType : (factory.createVoidZero()); // Fallback is only hit if all union constituents are null/undefined/never
    }
    function equateSerializedTypeNodes(left, right) {
        return (
        // temp vars used in fallback
        isGeneratedIdentifier(left) ? isGeneratedIdentifier(right) :
            // entity names
            isIdentifier(left) ? isIdentifier(right)
                && left.escapedText === right.escapedText :
                isPropertyAccessExpression(left) ? isPropertyAccessExpression(right)
                    && equateSerializedTypeNodes(left.expression, right.expression)
                    && equateSerializedTypeNodes(left.name, right.name) :
                    // `void 0`
                    isVoidExpression(left) ? isVoidExpression(right)
                        && isNumericLiteral(left.expression) && left.expression.text === "0"
                        && isNumericLiteral(right.expression) && right.expression.text === "0" :
                        // `"undefined"` or `"function"` in `typeof` checks
                        isStringLiteral(left) ? isStringLiteral(right)
                            && left.text === right.text :
                            // used in `typeof` checks for fallback
                            isTypeOfExpression(left) ? isTypeOfExpression(right)
                                && equateSerializedTypeNodes(left.expression, right.expression) :
                                // parens in `typeof` checks with temps
                                isParenthesizedExpression(left) ? isParenthesizedExpression(right)
                                    && equateSerializedTypeNodes(left.expression, right.expression) :
                                    // conditionals used in fallback
                                    isConditionalExpression(left) ? isConditionalExpression(right)
                                        && equateSerializedTypeNodes(left.condition, right.condition)
                                        && equateSerializedTypeNodes(left.whenTrue, right.whenTrue)
                                        && equateSerializedTypeNodes(left.whenFalse, right.whenFalse) :
                                        // logical binary and assignments used in fallback
                                        isBinaryExpression(left) ? isBinaryExpression(right)
                                            && left.operatorToken.kind === right.operatorToken.kind
                                            && equateSerializedTypeNodes(left.left, right.left)
                                            && equateSerializedTypeNodes(left.right, right.right) :
                                            false);
    }
    /**
     * Serializes a TypeReferenceNode to an appropriate JS constructor value for use with decorator type metadata.
     * @param node The type reference node.
     */
    function serializeTypeReferenceNode(node) {
        const kind = resolver.getTypeReferenceSerializationKind(node.typeName, currentNameScope !== null && currentNameScope !== void 0 ? currentNameScope : currentLexicalScope);
        switch (kind) {
            case TypeReferenceSerializationKind.Unknown:
                // From conditional type type reference that cannot be resolved is Similar to any or unknown
                if (findAncestor(node, n => n.parent && isConditionalTypeNode(n.parent) && (n.parent.trueType === n || n.parent.falseType === n))) {
                    return factory.createIdentifier("Object");
                }
                const serialized = serializeEntityNameAsExpressionFallback(node.typeName);
                const temp = factory.createTempVariable(hoistVariableDeclaration);
                return factory.createConditionalExpression(factory.createTypeCheck(factory.createAssignment(temp, serialized), "function"), 
                /*questionToken*/ undefined, temp, 
                /*colonToken*/ undefined, factory.createIdentifier("Object"));
            case TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue:
                return serializeEntityNameAsExpression(node.typeName);
            case TypeReferenceSerializationKind.VoidNullableOrNeverType:
                return factory.createVoidZero();
            case TypeReferenceSerializationKind.BigIntLikeType:
                return getGlobalConstructor("BigInt", ScriptTarget.ES2020);
            case TypeReferenceSerializationKind.BooleanType:
                return factory.createIdentifier("Boolean");
            case TypeReferenceSerializationKind.NumberLikeType:
                return factory.createIdentifier("Number");
            case TypeReferenceSerializationKind.StringLikeType:
                return factory.createIdentifier("String");
            case TypeReferenceSerializationKind.ArrayLikeType:
                return factory.createIdentifier("Array");
            case TypeReferenceSerializationKind.ESSymbolType:
                return getGlobalConstructor("Symbol", ScriptTarget.ES2015);
            case TypeReferenceSerializationKind.TypeWithCallSignature:
                return factory.createIdentifier("Function");
            case TypeReferenceSerializationKind.Promise:
                return factory.createIdentifier("Promise");
            case TypeReferenceSerializationKind.ObjectType:
                return factory.createIdentifier("Object");
            default:
                return Debug.assertNever(kind);
        }
    }
    /**
     * Produces an expression that results in `right` if `left` is not undefined at runtime:
     *
     * ```
     * typeof left !== "undefined" && right
     * ```
     *
     * We use `typeof L !== "undefined"` (rather than `L !== undefined`) since `L` may not be declared.
     * It's acceptable for this expression to result in `false` at runtime, as the result is intended to be
     * further checked by any containing expression.
     */
    function createCheckedValue(left, right) {
        return factory.createLogicalAnd(factory.createStrictInequality(factory.createTypeOfExpression(left), factory.createStringLiteral("undefined")), right);
    }
    /**
     * Serializes an entity name which may not exist at runtime, but whose access shouldn't throw
     * @param node The entity name to serialize.
     */
    function serializeEntityNameAsExpressionFallback(node) {
        if (node.kind === SyntaxKind.Identifier) {
            // A -> typeof A !== "undefined" && A
            const copied = serializeEntityNameAsExpression(node);
            return createCheckedValue(copied, copied);
        }
        if (node.left.kind === SyntaxKind.Identifier) {
            // A.B -> typeof A !== "undefined" && A.B
            return createCheckedValue(serializeEntityNameAsExpression(node.left), serializeEntityNameAsExpression(node));
        }
        // A.B.C -> typeof A !== "undefined" && (_a = A.B) !== void 0 && _a.C
        const left = serializeEntityNameAsExpressionFallback(node.left);
        const temp = factory.createTempVariable(hoistVariableDeclaration);
        return factory.createLogicalAnd(factory.createLogicalAnd(left.left, factory.createStrictInequality(factory.createAssignment(temp, left.right), factory.createVoidZero())), factory.createPropertyAccessExpression(temp, node.right));
    }
    /**
     * Serializes an entity name as an expression for decorator type metadata.
     * @param node The entity name to serialize.
     */
    function serializeEntityNameAsExpression(node) {
        switch (node.kind) {
            case SyntaxKind.Identifier:
                // Create a clone of the name with a new parent, and treat it as if it were
                // a source tree node for the purposes of the checker.
                const name = setParent(setTextRange(parseNodeFactory.cloneNode(node), node), node.parent);
                name.original = undefined;
                setParent(name, getParseTreeNode(currentLexicalScope)); // ensure the parent is set to a parse tree node.
                return name;
            case SyntaxKind.QualifiedName:
                return serializeQualifiedNameAsExpression(node);
        }
    }
    /**
     * Serializes an qualified name as an expression for decorator type metadata.
     * @param node The qualified name to serialize.
     */
    function serializeQualifiedNameAsExpression(node) {
        return factory.createPropertyAccessExpression(serializeEntityNameAsExpression(node.left), node.right);
    }
    function getGlobalConstructorWithFallback(name) {
        return factory.createConditionalExpression(factory.createTypeCheck(factory.createIdentifier(name), "function"), 
        /*questionToken*/ undefined, factory.createIdentifier(name), 
        /*colonToken*/ undefined, factory.createIdentifier("Object"));
    }
    function getGlobalConstructor(name, minLanguageVersion) {
        return languageVersion < minLanguageVersion ?
            getGlobalConstructorWithFallback(name) :
            factory.createIdentifier(name);
    }
}
