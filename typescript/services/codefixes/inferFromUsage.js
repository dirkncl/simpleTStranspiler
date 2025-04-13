import {
  codeFixAll,
  createCodeFixAction,
  createImportAdder,
  registerCodeFix,
  tryGetAutoImportableReferenceFromTypeNode,
} from "../_namespaces/ts.codefix.js";

import {
  cast,
  createMultiMap,
  createSymbolTable,
  Debug,
  Diagnostics,
  EmitFlags,
  emptyArray,
  escapeLeadingUnderscores,
  factory,
  FindAllReferences,
  findChildOfKind,
  first,
  firstOrUndefined,
  flatMap,
  forEach,
  forEachEntry,
  getContainingFunction,
  getEmitScriptTarget,
  getJSDocType,
  getNameOfDeclaration,
  getObjectFlags,
  getSourceFileOfNode,
  getTextOfNode,
  getTokenAtPosition,
  getTypeNodeIfAccessible,
  IndexKind,
  isArrowFunction,
  isAssignmentExpression,
  isCallExpression,
  isExpressionNode,
  isExpressionStatement,
  isFunctionExpression,
  isGetAccessorDeclaration,
  isIdentifier,
  isInJSFile,
  isParameter,
  isParameterPropertyModifier,
  isPropertyAccessExpression,
  isPropertyDeclaration,
  isPropertySignature,
  isRestParameter,
  isRightSideOfQualifiedNameOrPropertyAccess,
  isSetAccessorDeclaration,
  isTransientSymbol,
  isVariableDeclaration,
  isVariableStatement,
  last,
  length,
  map,
  mapDefined,
  mapEntries,
  nodeSeenTracker,
  ObjectFlags,
  returnTrue,
  setEmitFlags,
  SignatureFlags,
  SignatureKind,
  singleOrUndefined,
  SymbolFlags,
  SyntaxKind,
  textChanges,
  tryCast,
  TypeFlags,
  UnionReduction,
} from "../_namespaces/ts.js";


const fixId = "inferFromUsage";

const errorCodes = [
    // Variable declarations
    Diagnostics.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined.code,
    // Variable uses
    Diagnostics.Variable_0_implicitly_has_an_1_type.code,
    // Parameter declarations
    Diagnostics.Parameter_0_implicitly_has_an_1_type.code,
    Diagnostics.Rest_parameter_0_implicitly_has_an_any_type.code,
    // Get Accessor declarations
    Diagnostics.Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation.code,
    Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code,
    // Set Accessor declarations
    Diagnostics.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation.code,
    // Property declarations
    Diagnostics.Member_0_implicitly_has_an_1_type.code,
    //// Suggestions
    // Variable declarations
    Diagnostics.Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage.code,
    // Variable uses
    Diagnostics.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code,
    // Parameter declarations
    Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code,
    Diagnostics.Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage.code,
    // Get Accessor declarations
    Diagnostics.Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage.code,
    Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage.code,
    // Set Accessor declarations
    Diagnostics.Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage.code,
    // Property declarations
    Diagnostics.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code,
    // Function expressions and declarations
    Diagnostics.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation.code,
];
registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { sourceFile, program, span: { start }, errorCode, cancellationToken, host, preferences } = context;
        const token = getTokenAtPosition(sourceFile, start);
        let declaration;
        const changes = textChanges.ChangeTracker.with(context, changes => {
            declaration = doChange(changes, sourceFile, token, errorCode, program, cancellationToken, /*markSeen*/ returnTrue, host, preferences);
        });
        const name = declaration && getNameOfDeclaration(declaration);
        return !name || changes.length === 0 ? undefined
            : [createCodeFixAction(fixId, changes, [getDiagnostic(errorCode, token), getTextOfNode(name)], fixId, Diagnostics.Infer_all_types_from_usage)];
    },
    fixIds: [fixId],
    getAllCodeActions(context) {
        const { sourceFile, program, cancellationToken, host, preferences } = context;
        const markSeen = nodeSeenTracker();
        return codeFixAll(context, errorCodes, (changes, err) => {
            doChange(changes, sourceFile, getTokenAtPosition(err.file, err.start), err.code, program, cancellationToken, markSeen, host, preferences);
        });
    },
});
function getDiagnostic(errorCode, token) {
    switch (errorCode) {
        case Diagnostics.Parameter_0_implicitly_has_an_1_type.code:
        case Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code:
            return isSetAccessorDeclaration(getContainingFunction(token)) ? Diagnostics.Infer_type_of_0_from_usage : Diagnostics.Infer_parameter_types_from_usage; // TODO: GH#18217
        case Diagnostics.Rest_parameter_0_implicitly_has_an_any_type.code:
        case Diagnostics.Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics.Infer_parameter_types_from_usage;
        case Diagnostics.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation.code:
            return Diagnostics.Infer_this_type_of_0_from_usage;
        default:
            return Diagnostics.Infer_type_of_0_from_usage;
    }
}
/** Map suggestion code to error code */
function mapSuggestionDiagnostic(errorCode) {
    switch (errorCode) {
        case Diagnostics.Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined.code;
        case Diagnostics.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics.Variable_0_implicitly_has_an_1_type.code;
        case Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics.Parameter_0_implicitly_has_an_1_type.code;
        case Diagnostics.Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics.Rest_parameter_0_implicitly_has_an_any_type.code;
        case Diagnostics.Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage.code:
            return Diagnostics.Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation.code;
        case Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code;
        case Diagnostics.Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage.code:
            return Diagnostics.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation.code;
        case Diagnostics.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code:
            return Diagnostics.Member_0_implicitly_has_an_1_type.code;
    }
    return errorCode;
}
function doChange(changes, sourceFile, token, errorCode, program, cancellationToken, markSeen, host, preferences) {
    if (!isParameterPropertyModifier(token.kind) && token.kind !== SyntaxKind.Identifier && token.kind !== SyntaxKind.DotDotDotToken && token.kind !== SyntaxKind.ThisKeyword) {
        return undefined;
    }
    const { parent } = token;
    const importAdder = createImportAdder(sourceFile, program, preferences, host);
    errorCode = mapSuggestionDiagnostic(errorCode);
    switch (errorCode) {
        // Variable and Property declarations
        case Diagnostics.Member_0_implicitly_has_an_1_type.code:
        case Diagnostics.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined.code:
            if ((isVariableDeclaration(parent) && markSeen(parent)) || isPropertyDeclaration(parent) || isPropertySignature(parent)) { // handle bad location
                annotateVariableDeclaration(changes, importAdder, sourceFile, parent, program, host, cancellationToken);
                importAdder.writeFixes(changes);
                return parent;
            }
            if (isPropertyAccessExpression(parent)) {
                const type = inferTypeForVariableFromUsage(parent.name, program, cancellationToken);
                const typeNode = getTypeNodeIfAccessible(type, parent, program, host);
                if (typeNode) {
                    // Note that the codefix will never fire with an existing `@type` tag, so there is no need to merge tags
                    const typeTag = factory.createJSDocTypeTag(/*tagName*/ undefined, factory.createJSDocTypeExpression(typeNode), /*comment*/ undefined);
                    changes.addJSDocTags(sourceFile, cast(parent.parent.parent, isExpressionStatement), [typeTag]);
                }
                importAdder.writeFixes(changes);
                return parent;
            }
            return undefined;
        case Diagnostics.Variable_0_implicitly_has_an_1_type.code: {
            const symbol = program.getTypeChecker().getSymbolAtLocation(token);
            if (symbol && symbol.valueDeclaration && isVariableDeclaration(symbol.valueDeclaration) && markSeen(symbol.valueDeclaration)) {
                annotateVariableDeclaration(changes, importAdder, getSourceFileOfNode(symbol.valueDeclaration), symbol.valueDeclaration, program, host, cancellationToken);
                importAdder.writeFixes(changes);
                return symbol.valueDeclaration;
            }
            return undefined;
        }
    }
    const containingFunction = getContainingFunction(token);
    if (containingFunction === undefined) {
        return undefined;
    }
    let declaration;
    switch (errorCode) {
        // Parameter declarations
        case Diagnostics.Parameter_0_implicitly_has_an_1_type.code:
            if (isSetAccessorDeclaration(containingFunction)) {
                annotateSetAccessor(changes, importAdder, sourceFile, containingFunction, program, host, cancellationToken);
                declaration = containingFunction;
                break;
            }
        // falls through
        case Diagnostics.Rest_parameter_0_implicitly_has_an_any_type.code:
            if (markSeen(containingFunction)) {
                const param = cast(parent, isParameter);
                annotateParameters(changes, importAdder, sourceFile, param, containingFunction, program, host, cancellationToken);
                declaration = param;
            }
            break;
        // Get Accessor declarations
        case Diagnostics.Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation.code:
        case Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code:
            if (isGetAccessorDeclaration(containingFunction) && isIdentifier(containingFunction.name)) {
                annotate(changes, importAdder, sourceFile, containingFunction, inferTypeForVariableFromUsage(containingFunction.name, program, cancellationToken), program, host);
                declaration = containingFunction;
            }
            break;
        // Set Accessor declarations
        case Diagnostics.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation.code:
            if (isSetAccessorDeclaration(containingFunction)) {
                annotateSetAccessor(changes, importAdder, sourceFile, containingFunction, program, host, cancellationToken);
                declaration = containingFunction;
            }
            break;
        // Function 'this'
        case Diagnostics.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation.code:
            if (textChanges.isThisTypeAnnotatable(containingFunction) && markSeen(containingFunction)) {
                annotateThis(changes, sourceFile, containingFunction, program, host, cancellationToken);
                declaration = containingFunction;
            }
            break;
        default:
            return Debug.fail(String(errorCode));
    }
    importAdder.writeFixes(changes);
    return declaration;
}
function annotateVariableDeclaration(changes, importAdder, sourceFile, declaration, program, host, cancellationToken) {
    if (isIdentifier(declaration.name)) {
        annotate(changes, importAdder, sourceFile, declaration, inferTypeForVariableFromUsage(declaration.name, program, cancellationToken), program, host);
    }
}
function annotateParameters(changes, importAdder, sourceFile, parameterDeclaration, containingFunction, program, host, cancellationToken) {
    if (!isIdentifier(parameterDeclaration.name)) {
        return;
    }
    const parameterInferences = inferTypeForParametersFromUsage(containingFunction, sourceFile, program, cancellationToken);
    Debug.assert(containingFunction.parameters.length === parameterInferences.length, "Parameter count and inference count should match");
    if (isInJSFile(containingFunction)) {
        annotateJSDocParameters(changes, sourceFile, parameterInferences, program, host);
    }
    else {
        const needParens = isArrowFunction(containingFunction) && !findChildOfKind(containingFunction, SyntaxKind.OpenParenToken, sourceFile);
        if (needParens)
            changes.insertNodeBefore(sourceFile, first(containingFunction.parameters), factory.createToken(SyntaxKind.OpenParenToken));
        for (const { declaration, type } of parameterInferences) {
            if (declaration && !declaration.type && !declaration.initializer) {
                annotate(changes, importAdder, sourceFile, declaration, type, program, host);
            }
        }
        if (needParens)
            changes.insertNodeAfter(sourceFile, last(containingFunction.parameters), factory.createToken(SyntaxKind.CloseParenToken));
    }
}
function annotateThis(changes, sourceFile, containingFunction, program, host, cancellationToken) {
    const references = getFunctionReferences(containingFunction, sourceFile, program, cancellationToken);
    if (!references || !references.length) {
        return;
    }
    const thisInference = inferTypeFromReferences(program, references, cancellationToken).thisParameter();
    const typeNode = getTypeNodeIfAccessible(thisInference, containingFunction, program, host);
    if (!typeNode) {
        return;
    }
    if (isInJSFile(containingFunction)) {
        annotateJSDocThis(changes, sourceFile, containingFunction, typeNode);
    }
    else {
        changes.tryInsertThisTypeAnnotation(sourceFile, containingFunction, typeNode);
    }
}
function annotateJSDocThis(changes, sourceFile, containingFunction, typeNode) {
    changes.addJSDocTags(sourceFile, containingFunction, [
        factory.createJSDocThisTag(/*tagName*/ undefined, factory.createJSDocTypeExpression(typeNode)),
    ]);
}
function annotateSetAccessor(changes, importAdder, sourceFile, setAccessorDeclaration, program, host, cancellationToken) {
    const param = firstOrUndefined(setAccessorDeclaration.parameters);
    if (param && isIdentifier(setAccessorDeclaration.name) && isIdentifier(param.name)) {
        let type = inferTypeForVariableFromUsage(setAccessorDeclaration.name, program, cancellationToken);
        if (type === program.getTypeChecker().getAnyType()) {
            type = inferTypeForVariableFromUsage(param.name, program, cancellationToken);
        }
        if (isInJSFile(setAccessorDeclaration)) {
            annotateJSDocParameters(changes, sourceFile, [{ declaration: param, type }], program, host);
        }
        else {
            annotate(changes, importAdder, sourceFile, param, type, program, host);
        }
    }
}
function annotate(changes, importAdder, sourceFile, declaration, type, program, host) {
    const typeNode = getTypeNodeIfAccessible(type, declaration, program, host);
    if (typeNode) {
        if (isInJSFile(sourceFile) && declaration.kind !== SyntaxKind.PropertySignature) {
            const parent = isVariableDeclaration(declaration) ? tryCast(declaration.parent.parent, isVariableStatement) : declaration;
            if (!parent) {
                return;
            }
            const typeExpression = factory.createJSDocTypeExpression(typeNode);
            const typeTag = isGetAccessorDeclaration(declaration) ? factory.createJSDocReturnTag(/*tagName*/ undefined, typeExpression, /*comment*/ undefined) : factory.createJSDocTypeTag(/*tagName*/ undefined, typeExpression, /*comment*/ undefined);
            changes.addJSDocTags(sourceFile, parent, [typeTag]);
        }
        else if (!tryReplaceImportTypeNodeWithAutoImport(typeNode, declaration, sourceFile, changes, importAdder, getEmitScriptTarget(program.getCompilerOptions()))) {
            changes.tryInsertTypeAnnotation(sourceFile, declaration, typeNode);
        }
    }
}
function tryReplaceImportTypeNodeWithAutoImport(typeNode, declaration, sourceFile, changes, importAdder, scriptTarget) {
    const importableReference = tryGetAutoImportableReferenceFromTypeNode(typeNode, scriptTarget);
    if (importableReference && changes.tryInsertTypeAnnotation(sourceFile, declaration, importableReference.typeNode)) {
        forEach(importableReference.symbols, s => importAdder.addImportFromExportedSymbol(s, /*isValidTypeOnlyUseSite*/ true));
        return true;
    }
    return false;
}
function annotateJSDocParameters(changes, sourceFile, parameterInferences, program, host) {
    const signature = parameterInferences.length && parameterInferences[0].declaration.parent;
    if (!signature) {
        return;
    }
    const inferences = mapDefined(parameterInferences, inference => {
        const param = inference.declaration;
        // only infer parameters that have (1) no type and (2) an accessible inferred type
        if (param.initializer || getJSDocType(param) || !isIdentifier(param.name)) {
            return;
        }
        const typeNode = inference.type && getTypeNodeIfAccessible(inference.type, param, program, host);
        if (typeNode) {
            const name = factory.cloneNode(param.name);
            setEmitFlags(name, EmitFlags.NoComments | EmitFlags.NoNestedComments);
            return { name: factory.cloneNode(param.name), param, isOptional: !!inference.isOptional, typeNode };
        }
    });
    if (!inferences.length) {
        return;
    }
    if (isArrowFunction(signature) || isFunctionExpression(signature)) {
        const needParens = isArrowFunction(signature) && !findChildOfKind(signature, SyntaxKind.OpenParenToken, sourceFile);
        if (needParens) {
            changes.insertNodeBefore(sourceFile, first(signature.parameters), factory.createToken(SyntaxKind.OpenParenToken));
        }
        forEach(inferences, ({ typeNode, param }) => {
            const typeTag = factory.createJSDocTypeTag(/*tagName*/ undefined, factory.createJSDocTypeExpression(typeNode));
            const jsDoc = factory.createJSDocComment(/*comment*/ undefined, [typeTag]);
            changes.insertNodeAt(sourceFile, param.getStart(sourceFile), jsDoc, { suffix: " " });
        });
        if (needParens) {
            changes.insertNodeAfter(sourceFile, last(signature.parameters), factory.createToken(SyntaxKind.CloseParenToken));
        }
    }
    else {
        const paramTags = map(inferences, ({ name, typeNode, isOptional }) => factory.createJSDocParameterTag(/*tagName*/ undefined, name, /*isBracketed*/ !!isOptional, factory.createJSDocTypeExpression(typeNode), /*isNameFirst*/ false, /*comment*/ undefined));
        changes.addJSDocTags(sourceFile, signature, paramTags);
    }
}
function getReferences(token, program, cancellationToken) {
    // Position shouldn't matter since token is not a SourceFile.
    return mapDefined(FindAllReferences.getReferenceEntriesForNode(-1, token, program, program.getSourceFiles(), cancellationToken), entry => entry.kind !== FindAllReferences.EntryKind.Span ? tryCast(entry.node, isIdentifier) : undefined);
}
function inferTypeForVariableFromUsage(token, program, cancellationToken) {
    const references = getReferences(token, program, cancellationToken);
    return inferTypeFromReferences(program, references, cancellationToken).single();
}
function inferTypeForParametersFromUsage(func, sourceFile, program, cancellationToken) {
    const references = getFunctionReferences(func, sourceFile, program, cancellationToken);
    return references && inferTypeFromReferences(program, references, cancellationToken).parameters(func) ||
        func.parameters.map(p => ({
            declaration: p,
            type: isIdentifier(p.name) ? inferTypeForVariableFromUsage(p.name, program, cancellationToken) : program.getTypeChecker().getAnyType(),
        }));
}
function getFunctionReferences(containingFunction, sourceFile, program, cancellationToken) {
    let searchToken;
    switch (containingFunction.kind) {
        case SyntaxKind.Constructor:
            searchToken = findChildOfKind(containingFunction, SyntaxKind.ConstructorKeyword, sourceFile);
            break;
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.FunctionExpression:
            const parent = containingFunction.parent;
            searchToken = (isVariableDeclaration(parent) || isPropertyDeclaration(parent)) && isIdentifier(parent.name) ?
                parent.name :
                containingFunction.name;
            break;
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.MethodSignature:
            searchToken = containingFunction.name;
            break;
    }
    if (!searchToken) {
        return undefined;
    }
    return getReferences(searchToken, program, cancellationToken);
}
function inferTypeFromReferences(program, references, cancellationToken) {
    const checker = program.getTypeChecker();
    const builtinConstructors = {
        string: () => checker.getStringType(),
        number: () => checker.getNumberType(),
        Array: t => checker.createArrayType(t),
        Promise: t => checker.createPromiseType(t),
    };
    const builtins = [
        checker.getStringType(),
        checker.getNumberType(),
        checker.createArrayType(checker.getAnyType()),
        checker.createPromiseType(checker.getAnyType()),
    ];
    return {
        single,
        parameters,
        thisParameter,
    };
    function createEmptyUsage() {
        return {
            isNumber: undefined,
            isString: undefined,
            isNumberOrString: undefined,
            candidateTypes: undefined,
            properties: undefined,
            calls: undefined,
            constructs: undefined,
            numberIndex: undefined,
            stringIndex: undefined,
            candidateThisTypes: undefined,
            inferredTypes: undefined,
        };
    }
    function combineUsages(usages) {
        const combinedProperties = new Map();
        for (const u of usages) {
            if (u.properties) {
                u.properties.forEach((p, name) => {
                    if (!combinedProperties.has(name)) {
                        combinedProperties.set(name, []);
                    }
                    combinedProperties.get(name).push(p);
                });
            }
        }
        const properties = new Map();
        combinedProperties.forEach((ps, name) => {
            properties.set(name, combineUsages(ps));
        });
        return {
            isNumber: usages.some(u => u.isNumber),
            isString: usages.some(u => u.isString),
            isNumberOrString: usages.some(u => u.isNumberOrString),
            candidateTypes: flatMap(usages, u => u.candidateTypes),
            properties,
            calls: flatMap(usages, u => u.calls),
            constructs: flatMap(usages, u => u.constructs),
            numberIndex: forEach(usages, u => u.numberIndex),
            stringIndex: forEach(usages, u => u.stringIndex),
            candidateThisTypes: flatMap(usages, u => u.candidateThisTypes),
            inferredTypes: undefined, // clear type cache
        };
    }
    function single() {
        return combineTypes(inferTypesFromReferencesSingle(references));
    }
    function parameters(declaration) {
        if (references.length === 0 || !declaration.parameters) {
            return undefined;
        }
        const usage = createEmptyUsage();
        for (const reference of references) {
            cancellationToken.throwIfCancellationRequested();
            calculateUsageOfNode(reference, usage);
        }
        const calls = [...usage.constructs || [], ...usage.calls || []];
        return declaration.parameters.map((parameter, parameterIndex) => {
            const types = [];
            const isRest = isRestParameter(parameter);
            let isOptional = false;
            for (const call of calls) {
                if (call.argumentTypes.length <= parameterIndex) {
                    isOptional = isInJSFile(declaration);
                    types.push(checker.getUndefinedType());
                }
                else if (isRest) {
                    for (let i = parameterIndex; i < call.argumentTypes.length; i++) {
                        types.push(checker.getBaseTypeOfLiteralType(call.argumentTypes[i]));
                    }
                }
                else {
                    types.push(checker.getBaseTypeOfLiteralType(call.argumentTypes[parameterIndex]));
                }
            }
            if (isIdentifier(parameter.name)) {
                const inferred = inferTypesFromReferencesSingle(getReferences(parameter.name, program, cancellationToken));
                types.push(...(isRest ? mapDefined(inferred, checker.getElementTypeOfArrayType) : inferred));
            }
            const type = combineTypes(types);
            return {
                type: isRest ? checker.createArrayType(type) : type,
                isOptional: isOptional && !isRest,
                declaration: parameter,
            };
        });
    }
    function thisParameter() {
        const usage = createEmptyUsage();
        for (const reference of references) {
            cancellationToken.throwIfCancellationRequested();
            calculateUsageOfNode(reference, usage);
        }
        return combineTypes(usage.candidateThisTypes || emptyArray);
    }
    function inferTypesFromReferencesSingle(references) {
        const usage = createEmptyUsage();
        for (const reference of references) {
            cancellationToken.throwIfCancellationRequested();
            calculateUsageOfNode(reference, usage);
        }
        return inferTypes(usage);
    }
    function calculateUsageOfNode(node, usage) {
        while (isRightSideOfQualifiedNameOrPropertyAccess(node)) {
            node = node.parent;
        }
        switch (node.parent.kind) {
            case SyntaxKind.ExpressionStatement:
                inferTypeFromExpressionStatement(node, usage);
                break;
            case SyntaxKind.PostfixUnaryExpression:
                usage.isNumber = true;
                break;
            case SyntaxKind.PrefixUnaryExpression:
                inferTypeFromPrefixUnaryExpression(node.parent, usage);
                break;
            case SyntaxKind.BinaryExpression:
                inferTypeFromBinaryExpression(node, node.parent, usage);
                break;
            case SyntaxKind.CaseClause:
            case SyntaxKind.DefaultClause:
                inferTypeFromSwitchStatementLabel(node.parent, usage);
                break;
            case SyntaxKind.CallExpression:
            case SyntaxKind.NewExpression:
                if (node.parent.expression === node) {
                    inferTypeFromCallExpression(node.parent, usage);
                }
                else {
                    inferTypeFromContextualType(node, usage);
                }
                break;
            case SyntaxKind.PropertyAccessExpression:
                inferTypeFromPropertyAccessExpression(node.parent, usage);
                break;
            case SyntaxKind.ElementAccessExpression:
                inferTypeFromPropertyElementExpression(node.parent, node, usage);
                break;
            case SyntaxKind.PropertyAssignment:
            case SyntaxKind.ShorthandPropertyAssignment:
                inferTypeFromPropertyAssignment(node.parent, usage);
                break;
            case SyntaxKind.PropertyDeclaration:
                inferTypeFromPropertyDeclaration(node.parent, usage);
                break;
            case SyntaxKind.VariableDeclaration: {
                const { name, initializer } = node.parent;
                if (node === name) {
                    if (initializer) { // This can happen for `let x = null;` which still has an implicit-any error.
                        addCandidateType(usage, checker.getTypeAtLocation(initializer));
                    }
                    break;
                }
            }
            // falls through
            default:
                return inferTypeFromContextualType(node, usage);
        }
    }
    function inferTypeFromContextualType(node, usage) {
        if (isExpressionNode(node)) {
            addCandidateType(usage, checker.getContextualType(node));
        }
    }
    function inferTypeFromExpressionStatement(node, usage) {
        addCandidateType(usage, isCallExpression(node) ? checker.getVoidType() : checker.getAnyType());
    }
    function inferTypeFromPrefixUnaryExpression(node, usage) {
        switch (node.operator) {
            case SyntaxKind.PlusPlusToken:
            case SyntaxKind.MinusMinusToken:
            case SyntaxKind.MinusToken:
            case SyntaxKind.TildeToken:
                usage.isNumber = true;
                break;
            case SyntaxKind.PlusToken:
                usage.isNumberOrString = true;
                break;
            // case SyntaxKind.ExclamationToken:
            // no inferences here;
        }
    }
    function inferTypeFromBinaryExpression(node, parent, usage) {
        switch (parent.operatorToken.kind) {
            // ExponentiationOperator
            case SyntaxKind.AsteriskAsteriskToken:
            // MultiplicativeOperator
            // falls through
            case SyntaxKind.AsteriskToken:
            case SyntaxKind.SlashToken:
            case SyntaxKind.PercentToken:
            // ShiftOperator
            // falls through
            case SyntaxKind.LessThanLessThanToken:
            case SyntaxKind.GreaterThanGreaterThanToken:
            case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            // BitwiseOperator
            // falls through
            case SyntaxKind.AmpersandToken:
            case SyntaxKind.BarToken:
            case SyntaxKind.CaretToken:
            // CompoundAssignmentOperator
            // falls through
            case SyntaxKind.MinusEqualsToken:
            case SyntaxKind.AsteriskAsteriskEqualsToken:
            case SyntaxKind.AsteriskEqualsToken:
            case SyntaxKind.SlashEqualsToken:
            case SyntaxKind.PercentEqualsToken:
            case SyntaxKind.AmpersandEqualsToken:
            case SyntaxKind.BarEqualsToken:
            case SyntaxKind.CaretEqualsToken:
            case SyntaxKind.LessThanLessThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanEqualsToken:
            // AdditiveOperator
            // falls through
            case SyntaxKind.MinusToken:
            // RelationalOperator
            // falls through
            case SyntaxKind.LessThanToken:
            case SyntaxKind.LessThanEqualsToken:
            case SyntaxKind.GreaterThanToken:
            case SyntaxKind.GreaterThanEqualsToken:
                const operandType = checker.getTypeAtLocation(parent.left === node ? parent.right : parent.left);
                if (operandType.flags & TypeFlags.EnumLike) {
                    addCandidateType(usage, operandType);
                }
                else {
                    usage.isNumber = true;
                }
                break;
            case SyntaxKind.PlusEqualsToken:
            case SyntaxKind.PlusToken:
                const otherOperandType = checker.getTypeAtLocation(parent.left === node ? parent.right : parent.left);
                if (otherOperandType.flags & TypeFlags.EnumLike) {
                    addCandidateType(usage, otherOperandType);
                }
                else if (otherOperandType.flags & TypeFlags.NumberLike) {
                    usage.isNumber = true;
                }
                else if (otherOperandType.flags & TypeFlags.StringLike) {
                    usage.isString = true;
                }
                else if (otherOperandType.flags & TypeFlags.Any) {
                    // do nothing, maybe we'll learn something elsewhere
                }
                else {
                    usage.isNumberOrString = true;
                }
                break;
            //  AssignmentOperators
            case SyntaxKind.EqualsToken:
            case SyntaxKind.EqualsEqualsToken:
            case SyntaxKind.EqualsEqualsEqualsToken:
            case SyntaxKind.ExclamationEqualsEqualsToken:
            case SyntaxKind.ExclamationEqualsToken:
            case SyntaxKind.AmpersandAmpersandEqualsToken:
            case SyntaxKind.QuestionQuestionEqualsToken:
            case SyntaxKind.BarBarEqualsToken:
                addCandidateType(usage, checker.getTypeAtLocation(parent.left === node ? parent.right : parent.left));
                break;
            case SyntaxKind.InKeyword:
                if (node === parent.left) {
                    usage.isString = true;
                }
                break;
            // LogicalOperator Or NullishCoalescing
            case SyntaxKind.BarBarToken:
            case SyntaxKind.QuestionQuestionToken:
                if (node === parent.left &&
                    (node.parent.parent.kind === SyntaxKind.VariableDeclaration || isAssignmentExpression(node.parent.parent, /*excludeCompoundAssignment*/ true))) {
                    // var x = x || {};
                    // TODO: use getFalsyflagsOfType
                    addCandidateType(usage, checker.getTypeAtLocation(parent.right));
                }
                break;
            case SyntaxKind.AmpersandAmpersandToken:
            case SyntaxKind.CommaToken:
            case SyntaxKind.InstanceOfKeyword:
                // nothing to infer here
                break;
        }
    }
    function inferTypeFromSwitchStatementLabel(parent, usage) {
        addCandidateType(usage, checker.getTypeAtLocation(parent.parent.parent.expression));
    }
    function inferTypeFromCallExpression(parent, usage) {
        const call = {
            argumentTypes: [],
            return_: createEmptyUsage(),
        };
        if (parent.arguments) {
            for (const argument of parent.arguments) {
                call.argumentTypes.push(checker.getTypeAtLocation(argument));
            }
        }
        calculateUsageOfNode(parent, call.return_);
        if (parent.kind === SyntaxKind.CallExpression) {
            (usage.calls || (usage.calls = [])).push(call);
        }
        else {
            (usage.constructs || (usage.constructs = [])).push(call);
        }
    }
    function inferTypeFromPropertyAccessExpression(parent, usage) {
        const name = escapeLeadingUnderscores(parent.name.text);
        if (!usage.properties) {
            usage.properties = new Map();
        }
        const propertyUsage = usage.properties.get(name) || createEmptyUsage();
        calculateUsageOfNode(parent, propertyUsage);
        usage.properties.set(name, propertyUsage);
    }
    function inferTypeFromPropertyElementExpression(parent, node, usage) {
        if (node === parent.argumentExpression) {
            usage.isNumberOrString = true;
            return;
        }
        else {
            const indexType = checker.getTypeAtLocation(parent.argumentExpression);
            const indexUsage = createEmptyUsage();
            calculateUsageOfNode(parent, indexUsage);
            if (indexType.flags & TypeFlags.NumberLike) {
                usage.numberIndex = indexUsage;
            }
            else {
                usage.stringIndex = indexUsage;
            }
        }
    }
    function inferTypeFromPropertyAssignment(assignment, usage) {
        const nodeWithRealType = isVariableDeclaration(assignment.parent.parent) ?
            assignment.parent.parent :
            assignment.parent;
        addCandidateThisType(usage, checker.getTypeAtLocation(nodeWithRealType));
    }
    function inferTypeFromPropertyDeclaration(declaration, usage) {
        addCandidateThisType(usage, checker.getTypeAtLocation(declaration.parent));
    }
    function removeLowPriorityInferences(inferences, priorities) {
        const toRemove = [];
        for (const i of inferences) {
            for (const { high, low } of priorities) {
                if (high(i)) {
                    Debug.assert(!low(i), "Priority can't have both low and high");
                    toRemove.push(low);
                }
            }
        }
        return inferences.filter(i => toRemove.every(f => !f(i)));
    }
    function combineFromUsage(usage) {
        return combineTypes(inferTypes(usage));
    }
    function combineTypes(inferences) {
        if (!inferences.length)
            return checker.getAnyType();
        // 1. string or number individually override string | number
        // 2. non-any, non-void overrides any or void
        // 3. non-nullable, non-any, non-void, non-anonymous overrides anonymous types
        const stringNumber = checker.getUnionType([checker.getStringType(), checker.getNumberType()]);
        const priorities = [
            {
                high: t => t === checker.getStringType() || t === checker.getNumberType(),
                low: t => t === stringNumber,
            },
            {
                high: t => !(t.flags & (TypeFlags.Any | TypeFlags.Void)),
                low: t => !!(t.flags & (TypeFlags.Any | TypeFlags.Void)),
            },
            {
                high: t => !(t.flags & (TypeFlags.Nullable | TypeFlags.Any | TypeFlags.Void)) && !(getObjectFlags(t) & ObjectFlags.Anonymous),
                low: t => !!(getObjectFlags(t) & ObjectFlags.Anonymous),
            },
        ];
        let good = removeLowPriorityInferences(inferences, priorities);
        const anons = good.filter(i => getObjectFlags(i) & ObjectFlags.Anonymous);
        if (anons.length) {
            good = good.filter(i => !(getObjectFlags(i) & ObjectFlags.Anonymous));
            good.push(combineAnonymousTypes(anons));
        }
        return checker.getWidenedType(checker.getUnionType(good.map(checker.getBaseTypeOfLiteralType), UnionReduction.Subtype));
    }
    function combineAnonymousTypes(anons) {
        if (anons.length === 1) {
            return anons[0];
        }
        const calls = [];
        const constructs = [];
        const stringIndices = [];
        const numberIndices = [];
        let stringIndexReadonly = false;
        let numberIndexReadonly = false;
        const props = createMultiMap();
        for (const anon of anons) {
            for (const p of checker.getPropertiesOfType(anon)) {
                props.add(p.escapedName, p.valueDeclaration ? checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration) : checker.getAnyType());
            }
            calls.push(...checker.getSignaturesOfType(anon, SignatureKind.Call));
            constructs.push(...checker.getSignaturesOfType(anon, SignatureKind.Construct));
            const stringIndexInfo = checker.getIndexInfoOfType(anon, IndexKind.String);
            if (stringIndexInfo) {
                stringIndices.push(stringIndexInfo.type);
                stringIndexReadonly = stringIndexReadonly || stringIndexInfo.isReadonly;
            }
            const numberIndexInfo = checker.getIndexInfoOfType(anon, IndexKind.Number);
            if (numberIndexInfo) {
                numberIndices.push(numberIndexInfo.type);
                numberIndexReadonly = numberIndexReadonly || numberIndexInfo.isReadonly;
            }
        }
        const members = mapEntries(props, (name, types) => {
            const isOptional = types.length < anons.length ? SymbolFlags.Optional : 0;
            const s = checker.createSymbol(SymbolFlags.Property | isOptional, name);
            s.links.type = checker.getUnionType(types);
            return [name, s];
        });
        const indexInfos = [];
        if (stringIndices.length)
            indexInfos.push(checker.createIndexInfo(checker.getStringType(), checker.getUnionType(stringIndices), stringIndexReadonly));
        if (numberIndices.length)
            indexInfos.push(checker.createIndexInfo(checker.getNumberType(), checker.getUnionType(numberIndices), numberIndexReadonly));
        return checker.createAnonymousType(anons[0].symbol, members, calls, constructs, indexInfos);
    }
    function inferTypes(usage) {
        var _a, _b, _c;
        const types = [];
        if (usage.isNumber) {
            types.push(checker.getNumberType());
        }
        if (usage.isString) {
            types.push(checker.getStringType());
        }
        if (usage.isNumberOrString) {
            types.push(checker.getUnionType([checker.getStringType(), checker.getNumberType()]));
        }
        if (usage.numberIndex) {
            types.push(checker.createArrayType(combineFromUsage(usage.numberIndex)));
        }
        if (((_a = usage.properties) === null || _a === void 0 ? void 0 : _a.size) || ((_b = usage.constructs) === null || _b === void 0 ? void 0 : _b.length) || usage.stringIndex) {
            types.push(inferStructuralType(usage));
        }
        const candidateTypes = (usage.candidateTypes || []).map(t => checker.getBaseTypeOfLiteralType(t));
        const callsType = ((_c = usage.calls) === null || _c === void 0 ? void 0 : _c.length) ? inferStructuralType(usage) : undefined;
        if (callsType && candidateTypes) { // TODO: should this be `some(candidateTypes)`?
            types.push(checker.getUnionType([callsType, ...candidateTypes], UnionReduction.Subtype));
        }
        else {
            if (callsType) {
                types.push(callsType);
            }
            if (length(candidateTypes)) {
                types.push(...candidateTypes);
            }
        }
        types.push(...inferNamedTypesFromProperties(usage));
        return types;
    }
    function inferStructuralType(usage) {
        const members = new Map();
        if (usage.properties) {
            usage.properties.forEach((u, name) => {
                const symbol = checker.createSymbol(SymbolFlags.Property, name);
                symbol.links.type = combineFromUsage(u);
                members.set(name, symbol);
            });
        }
        const callSignatures = usage.calls ? [getSignatureFromCalls(usage.calls)] : [];
        const constructSignatures = usage.constructs ? [getSignatureFromCalls(usage.constructs)] : [];
        const indexInfos = usage.stringIndex ? [checker.createIndexInfo(checker.getStringType(), combineFromUsage(usage.stringIndex), /*isReadonly*/ false)] : [];
        return checker.createAnonymousType(/*symbol*/ undefined, members, callSignatures, constructSignatures, indexInfos);
    }
    function inferNamedTypesFromProperties(usage) {
        if (!usage.properties || !usage.properties.size)
            return [];
        const types = builtins.filter(t => allPropertiesAreAssignableToUsage(t, usage));
        if (0 < types.length && types.length < 3) {
            return types.map(t => inferInstantiationFromUsage(t, usage));
        }
        return [];
    }
    function allPropertiesAreAssignableToUsage(type, usage) {
        if (!usage.properties)
            return false;
        return !forEachEntry(usage.properties, (propUsage, name) => {
            const source = checker.getTypeOfPropertyOfType(type, name);
            if (!source) {
                return true;
            }
            if (propUsage.calls) {
                const sigs = checker.getSignaturesOfType(source, SignatureKind.Call);
                return !sigs.length || !checker.isTypeAssignableTo(source, getFunctionFromCalls(propUsage.calls));
            }
            else {
                return !checker.isTypeAssignableTo(source, combineFromUsage(propUsage));
            }
        });
    }
    /**
     * inference is limited to
     * 1. generic types with a single parameter
     * 2. inference to/from calls with a single signature
     */
    function inferInstantiationFromUsage(type, usage) {
        if (!(getObjectFlags(type) & ObjectFlags.Reference) || !usage.properties) {
            return type;
        }
        const generic = type.target;
        const singleTypeParameter = singleOrUndefined(generic.typeParameters);
        if (!singleTypeParameter)
            return type;
        const types = [];
        usage.properties.forEach((propUsage, name) => {
            const genericPropertyType = checker.getTypeOfPropertyOfType(generic, name);
            Debug.assert(!!genericPropertyType, "generic should have all the properties of its reference.");
            types.push(...inferTypeParameters(genericPropertyType, combineFromUsage(propUsage), singleTypeParameter));
        });
        return builtinConstructors[type.symbol.escapedName](combineTypes(types));
    }
    function inferTypeParameters(genericType, usageType, typeParameter) {
        if (genericType === typeParameter) {
            return [usageType];
        }
        else if (genericType.flags & TypeFlags.UnionOrIntersection) {
            return flatMap(genericType.types, t => inferTypeParameters(t, usageType, typeParameter));
        }
        else if (getObjectFlags(genericType) & ObjectFlags.Reference && getObjectFlags(usageType) & ObjectFlags.Reference) {
            // this is wrong because we need a reference to the targetType to, so we can check that it's also a reference
            const genericArgs = checker.getTypeArguments(genericType);
            const usageArgs = checker.getTypeArguments(usageType);
            const types = [];
            if (genericArgs && usageArgs) {
                for (let i = 0; i < genericArgs.length; i++) {
                    if (usageArgs[i]) {
                        types.push(...inferTypeParameters(genericArgs[i], usageArgs[i], typeParameter));
                    }
                }
            }
            return types;
        }
        const genericSigs = checker.getSignaturesOfType(genericType, SignatureKind.Call);
        const usageSigs = checker.getSignaturesOfType(usageType, SignatureKind.Call);
        if (genericSigs.length === 1 && usageSigs.length === 1) {
            return inferFromSignatures(genericSigs[0], usageSigs[0], typeParameter);
        }
        return [];
    }
    function inferFromSignatures(genericSig, usageSig, typeParameter) {
        var _a;
        const types = [];
        for (let i = 0; i < genericSig.parameters.length; i++) {
            const genericParam = genericSig.parameters[i];
            const usageParam = usageSig.parameters[i];
            const isRest = genericSig.declaration && isRestParameter(genericSig.declaration.parameters[i]);
            if (!usageParam) {
                break;
            }
            let genericParamType = genericParam.valueDeclaration ? checker.getTypeOfSymbolAtLocation(genericParam, genericParam.valueDeclaration) : checker.getAnyType();
            const elementType = isRest && checker.getElementTypeOfArrayType(genericParamType);
            if (elementType) {
                genericParamType = elementType;
            }
            const targetType = ((_a = tryCast(usageParam, isTransientSymbol)) === null || _a === void 0 ? void 0 : _a.links.type)
                || (usageParam.valueDeclaration ? checker.getTypeOfSymbolAtLocation(usageParam, usageParam.valueDeclaration) : checker.getAnyType());
            types.push(...inferTypeParameters(genericParamType, targetType, typeParameter));
        }
        const genericReturn = checker.getReturnTypeOfSignature(genericSig);
        const usageReturn = checker.getReturnTypeOfSignature(usageSig);
        types.push(...inferTypeParameters(genericReturn, usageReturn, typeParameter));
        return types;
    }
    function getFunctionFromCalls(calls) {
        return checker.createAnonymousType(/*symbol*/ undefined, createSymbolTable(), [getSignatureFromCalls(calls)], emptyArray, emptyArray);
    }
    function getSignatureFromCalls(calls) {
        const parameters = [];
        const length = Math.max(...calls.map(c => c.argumentTypes.length));
        for (let i = 0; i < length; i++) {
            const symbol = checker.createSymbol(SymbolFlags.FunctionScopedVariable, escapeLeadingUnderscores(`arg${i}`));
            symbol.links.type = combineTypes(calls.map(call => call.argumentTypes[i] || checker.getUndefinedType()));
            if (calls.some(call => call.argumentTypes[i] === undefined)) {
                symbol.flags |= SymbolFlags.Optional;
            }
            parameters.push(symbol);
        }
        const returnType = combineFromUsage(combineUsages(calls.map(call => call.return_)));
        return checker.createSignature(/*declaration*/ undefined, /*typeParameters*/ undefined, /*thisParameter*/ undefined, parameters, returnType, /*typePredicate*/ undefined, length, SignatureFlags.None);
    }
    function addCandidateType(usage, type) {
        if (type && !(type.flags & TypeFlags.Any) && !(type.flags & TypeFlags.Never)) {
            (usage.candidateTypes || (usage.candidateTypes = [])).push(type);
        }
    }
    function addCandidateThisType(usage, type) {
        if (type && !(type.flags & TypeFlags.Any) && !(type.flags & TypeFlags.Never)) {
            (usage.candidateThisTypes || (usage.candidateThisTypes = [])).push(type);
        }
    }
}
