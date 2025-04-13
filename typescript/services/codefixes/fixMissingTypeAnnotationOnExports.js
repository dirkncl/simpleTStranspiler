import {
  createCodeFixAction,
  createCombinedCodeActions,
  createImportAdder,
  eachDiagnostic,
  registerCodeFix,
  typeNodeToAutoImportableTypeNode,
  typePredicateToAutoImportableTypeNode,
  typeToMinimizedReferenceType,
} from "../_namespaces/ts.codefix.js";

import {
  createPrinter,
  Debug,
  defaultMaximumTruncationLength,
  Diagnostics,
  EmitFlags,
  EmitHint,
  factory,
  findAncestor,
  GeneratedIdentifierFlags,
  getEmitScriptTarget,
  getSourceFileOfNode,
  getSynthesizedDeepClone,
  getTokenAtPosition,
  getTrailingCommentRanges,
  hasInitializer,
  hasSyntacticModifier,
  InternalNodeBuilderFlags,
  isArrayBindingPattern,
  isArrayLiteralExpression,
  isAssertionExpression,
  isBinaryExpression,
  isBindingPattern,
  isCallExpression,
  isComputedPropertyName,
  isConditionalExpression,
  isConstTypeReference,
  isDeclaration,
  isEntityNameExpression,
  isEnumMember,
  isExpandoPropertyDeclaration,
  isExpression,
  isFunctionDeclaration,
  isFunctionExpressionOrArrowFunction,
  isHeritageClause,
  isIdentifier,
  isIdentifierText,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isOmittedExpression,
  isParameter,
  isPropertyAssignment,
  isPropertyDeclaration,
  isShorthandPropertyAssignment,
  isSpreadAssignment,
  isSpreadElement,
  isStatement,
  isTypeNode,
  isValueSignatureDeclaration,
  isVariableDeclaration,
  ModifierFlags,
  NodeBuilderFlags,
  NodeFlags,
  setEmitFlags,
  some,
  SyntaxKind,
  textChanges,
  TypeFlags,
  UnionReduction,
  walkUpParenthesizedExpressions,
} from "../_namespaces/ts.js";

import { getIdentifierForNode } from "../_namespaces/ts.refactor.js";

const fixId = "fixMissingTypeAnnotationOnExports";
const addAnnotationFix = "add-annotation";
const addInlineTypeAssertion = "add-type-assertion";
const extractExpression = "extract-expression";

const errorCodes = [
    Diagnostics.Function_must_have_an_explicit_return_type_annotation_with_isolatedDeclarations.code,
    Diagnostics.Method_must_have_an_explicit_return_type_annotation_with_isolatedDeclarations.code,
    Diagnostics.At_least_one_accessor_must_have_an_explicit_type_annotation_with_isolatedDeclarations.code,
    Diagnostics.Variable_must_have_an_explicit_type_annotation_with_isolatedDeclarations.code,
    Diagnostics.Parameter_must_have_an_explicit_type_annotation_with_isolatedDeclarations.code,
    Diagnostics.Property_must_have_an_explicit_type_annotation_with_isolatedDeclarations.code,
    Diagnostics.Expression_type_can_t_be_inferred_with_isolatedDeclarations.code,
    Diagnostics.Binding_elements_can_t_be_exported_directly_with_isolatedDeclarations.code,
    Diagnostics.Computed_property_names_on_class_or_object_literals_cannot_be_inferred_with_isolatedDeclarations.code,
    Diagnostics.Computed_properties_must_be_number_or_string_literals_variables_or_dotted_expressions_with_isolatedDeclarations.code,
    Diagnostics.Enum_member_initializers_must_be_computable_without_references_to_external_symbols_with_isolatedDeclarations.code,
    Diagnostics.Extends_clause_can_t_contain_an_expression_with_isolatedDeclarations.code,
    Diagnostics.Objects_that_contain_shorthand_properties_can_t_be_inferred_with_isolatedDeclarations.code,
    Diagnostics.Objects_that_contain_spread_assignments_can_t_be_inferred_with_isolatedDeclarations.code,
    Diagnostics.Arrays_with_spread_elements_can_t_inferred_with_isolatedDeclarations.code,
    Diagnostics.Default_exports_can_t_be_inferred_with_isolatedDeclarations.code,
    Diagnostics.Only_const_arrays_can_be_inferred_with_isolatedDeclarations.code,
    Diagnostics.Assigning_properties_to_functions_without_declaring_them_is_not_supported_with_isolatedDeclarations_Add_an_explicit_declaration_for_the_properties_assigned_to_this_function.code,
    Diagnostics.Declaration_emit_for_this_parameter_requires_implicitly_adding_undefined_to_its_type_This_is_not_supported_with_isolatedDeclarations.code,
    Diagnostics.Type_containing_private_name_0_can_t_be_used_with_isolatedDeclarations.code,
    Diagnostics.Add_satisfies_and_a_type_assertion_to_this_expression_satisfies_T_as_T_to_make_the_type_explicit.code,
];
const canHaveTypeAnnotation = new Set([
    SyntaxKind.GetAccessor,
    SyntaxKind.MethodDeclaration,
    SyntaxKind.PropertyDeclaration,
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.FunctionExpression,
    SyntaxKind.ArrowFunction,
    SyntaxKind.VariableDeclaration,
    SyntaxKind.Parameter,
    SyntaxKind.ExportAssignment,
    SyntaxKind.ClassDeclaration,
    SyntaxKind.ObjectBindingPattern,
    SyntaxKind.ArrayBindingPattern,
]);
const declarationEmitNodeBuilderFlags = NodeBuilderFlags.MultilineObjectLiterals
    | NodeBuilderFlags.WriteClassExpressionAsTypeLiteral
    | NodeBuilderFlags.UseTypeOfFunction
    | NodeBuilderFlags.UseStructuralFallback
    | NodeBuilderFlags.AllowEmptyTuple
    | NodeBuilderFlags.GenerateNamesForShadowedTypeParams
    | NodeBuilderFlags.NoTruncation;
const declarationEmitInternalNodeBuilderFlags = InternalNodeBuilderFlags.WriteComputedProps;

var TypePrintMode;
(function (TypePrintMode) {
    // Prints its fully spelled out type
    TypePrintMode[TypePrintMode["Full"] = 0] = "Full";
    // Prints a relative type i.e. typeof X
    TypePrintMode[TypePrintMode["Relative"] = 1] = "Relative";
    // Prints a widened type in case the expression is known to
    // e.g. export const a = Math.random() ? "0" : "1"; the type will be `string` in d.ts files
    TypePrintMode[TypePrintMode["Widened"] = 2] = "Widened";
})(TypePrintMode || (TypePrintMode = {}));

registerCodeFix({
    errorCodes,
    fixIds: [fixId],
    getCodeActions(context) {
        const fixes = [];
        addCodeAction(addAnnotationFix, fixes, context, TypePrintMode.Full, f => f.addTypeAnnotation(context.span));
        addCodeAction(addAnnotationFix, fixes, context, TypePrintMode.Relative, f => f.addTypeAnnotation(context.span));
        addCodeAction(addAnnotationFix, fixes, context, TypePrintMode.Widened, f => f.addTypeAnnotation(context.span));
        addCodeAction(addInlineTypeAssertion, fixes, context, TypePrintMode.Full, f => f.addInlineAssertion(context.span));
        addCodeAction(addInlineTypeAssertion, fixes, context, TypePrintMode.Relative, f => f.addInlineAssertion(context.span));
        addCodeAction(addInlineTypeAssertion, fixes, context, TypePrintMode.Widened, f => f.addInlineAssertion(context.span));
        addCodeAction(extractExpression, fixes, context, TypePrintMode.Full, f => f.extractAsVariable(context.span));
        return fixes;
    },
    getAllCodeActions: context => {
        const changes = withContext(context, TypePrintMode.Full, f => {
            eachDiagnostic(context, errorCodes, diag => {
                f.addTypeAnnotation(diag);
            });
        });
        return createCombinedCodeActions(changes.textChanges);
    },
});

function addCodeAction(fixName, fixes, context, typePrintMode, cb) {
    const changes = withContext(context, typePrintMode, cb);
    if (changes.result && changes.textChanges.length) {
        fixes.push(createCodeFixAction(fixName, changes.textChanges, changes.result, fixId, Diagnostics.Add_all_missing_type_annotations));
    }
}

function withContext(context, typePrintMode, cb) {
    const emptyInferenceResult = { typeNode: undefined, mutatedTarget: false };
    const changeTracker = textChanges.ChangeTracker.fromContext(context);
    const sourceFile = context.sourceFile;
    const program = context.program;
    const typeChecker = program.getTypeChecker();
    const scriptTarget = getEmitScriptTarget(program.getCompilerOptions());
    const importAdder = createImportAdder(context.sourceFile, context.program, context.preferences, context.host);
    const fixedNodes = new Set();
    const expandoPropertiesAdded = new Set();
    const typePrinter = createPrinter({
        preserveSourceNewlines: false,
    });
    const result = cb({ addTypeAnnotation, addInlineAssertion, extractAsVariable });
    importAdder.writeFixes(changeTracker);
    return {
        result,
        textChanges: changeTracker.getChanges(),
    };
    function addTypeAnnotation(span) {
        context.cancellationToken.throwIfCancellationRequested();
        const nodeWithDiag = getTokenAtPosition(sourceFile, span.start);
        const expandoFunction = findExpandoFunction(nodeWithDiag);
        if (expandoFunction) {
            if (isFunctionDeclaration(expandoFunction)) {
                return createNamespaceForExpandoProperties(expandoFunction);
            }
            return fixIsolatedDeclarationError(expandoFunction);
        }
        const nodeMissingType = findAncestorWithMissingType(nodeWithDiag);
        if (nodeMissingType) {
            return fixIsolatedDeclarationError(nodeMissingType);
        }
        return undefined;
    }
    function createNamespaceForExpandoProperties(expandoFunc) {
        var _a;
        if (expandoPropertiesAdded === null || expandoPropertiesAdded === void 0 ? void 0 : expandoPropertiesAdded.has(expandoFunc))
            return undefined;
        expandoPropertiesAdded === null || expandoPropertiesAdded === void 0 ? void 0 : expandoPropertiesAdded.add(expandoFunc);
        const type = typeChecker.getTypeAtLocation(expandoFunc);
        const elements = typeChecker.getPropertiesOfType(type);
        if (!expandoFunc.name || elements.length === 0)
            return undefined;
        const newProperties = [];
        for (const symbol of elements) {
            // non-valid names will not end up in declaration emit
            if (!isIdentifierText(symbol.name, getEmitScriptTarget(program.getCompilerOptions())))
                continue;
            // already has an existing declaration
            if (symbol.valueDeclaration && isVariableDeclaration(symbol.valueDeclaration))
                continue;
            newProperties.push(factory.createVariableStatement([factory.createModifier(SyntaxKind.ExportKeyword)], factory.createVariableDeclarationList([factory.createVariableDeclaration(symbol.name, 
                /*exclamationToken*/ undefined, typeToTypeNode(typeChecker.getTypeOfSymbol(symbol), expandoFunc), 
                /*initializer*/ undefined)])));
        }
        if (newProperties.length === 0)
            return undefined;
        const modifiers = [];
        if ((_a = expandoFunc.modifiers) === null || _a === void 0 ? void 0 : _a.some(modifier => modifier.kind === SyntaxKind.ExportKeyword)) {
            modifiers.push(factory.createModifier(SyntaxKind.ExportKeyword));
        }
        modifiers.push(factory.createModifier(SyntaxKind.DeclareKeyword));
        const namespace = factory.createModuleDeclaration(modifiers, expandoFunc.name, factory.createModuleBlock(newProperties), 
        /*flags*/ NodeFlags.Namespace | NodeFlags.ExportContext | NodeFlags.Ambient | NodeFlags.ContextFlags);
        changeTracker.insertNodeAfter(sourceFile, expandoFunc, namespace);
        return [Diagnostics.Annotate_types_of_properties_expando_function_in_a_namespace];
    }
    function needsParenthesizedExpressionForAssertion(node) {
        return !isEntityNameExpression(node) && !isCallExpression(node) && !isObjectLiteralExpression(node) && !isArrayLiteralExpression(node);
    }
    function createAsExpression(node, type) {
        if (needsParenthesizedExpressionForAssertion(node)) {
            node = factory.createParenthesizedExpression(node);
        }
        return factory.createAsExpression(node, type);
    }
    function createSatisfiesAsExpression(node, type) {
        if (needsParenthesizedExpressionForAssertion(node)) {
            node = factory.createParenthesizedExpression(node);
        }
        return factory.createAsExpression(factory.createSatisfiesExpression(node, getSynthesizedDeepClone(type)), type);
    }
    function addInlineAssertion(span) {
        context.cancellationToken.throwIfCancellationRequested();
        const nodeWithDiag = getTokenAtPosition(sourceFile, span.start);
        const expandoFunction = findExpandoFunction(nodeWithDiag);
        // No inline assertions for expando members
        if (expandoFunction)
            return;
        const targetNode = findBestFittingNode(nodeWithDiag, span);
        if (!targetNode || isValueSignatureDeclaration(targetNode) || isValueSignatureDeclaration(targetNode.parent))
            return;
        const isExpressionTarget = isExpression(targetNode);
        const isShorthandPropertyAssignmentTarget = isShorthandPropertyAssignment(targetNode);
        if (!isShorthandPropertyAssignmentTarget && isDeclaration(targetNode)) {
            return undefined;
        }
        // No inline assertions on binding patterns
        if (findAncestor(targetNode, isBindingPattern)) {
            return undefined;
        }
        // No inline assertions on enum members
        if (findAncestor(targetNode, isEnumMember)) {
            return undefined;
        }
        // No support for typeof in extends clauses
        if (isExpressionTarget && (findAncestor(targetNode, isHeritageClause) || findAncestor(targetNode, isTypeNode))) {
            return undefined;
        }
        // Can't inline type spread elements. Whatever you do isolated declarations will not infer from them
        if (isSpreadElement(targetNode)) {
            return undefined;
        }
        const variableDeclaration = findAncestor(targetNode, isVariableDeclaration);
        const type = variableDeclaration && typeChecker.getTypeAtLocation(variableDeclaration);
        // We can't use typeof un an unique symbol. Would result in either
        // const s = Symbol("") as unique symbol
        // const s = Symbol("") as typeof s
        // both of which are not correct
        if (type && type.flags & TypeFlags.UniqueESSymbol) {
            return undefined;
        }
        if (!(isExpressionTarget || isShorthandPropertyAssignmentTarget))
            return undefined;
        const { typeNode, mutatedTarget } = inferType(targetNode, type);
        if (!typeNode || mutatedTarget)
            return undefined;
        if (isShorthandPropertyAssignmentTarget) {
            changeTracker.insertNodeAt(sourceFile, targetNode.end, createAsExpression(getSynthesizedDeepClone(targetNode.name), typeNode), {
                prefix: ": ",
            });
        }
        else if (isExpressionTarget) {
            changeTracker.replaceNode(sourceFile, targetNode, createSatisfiesAsExpression(getSynthesizedDeepClone(targetNode), typeNode));
        }
        else {
            Debug.assertNever(targetNode);
        }
        return [Diagnostics.Add_satisfies_and_an_inline_type_assertion_with_0, typeToStringForDiag(typeNode)];
    }
    function extractAsVariable(span) {
        context.cancellationToken.throwIfCancellationRequested();
        const nodeWithDiag = getTokenAtPosition(sourceFile, span.start);
        const targetNode = findBestFittingNode(nodeWithDiag, span);
        if (!targetNode || isValueSignatureDeclaration(targetNode) || isValueSignatureDeclaration(targetNode.parent))
            return;
        const isExpressionTarget = isExpression(targetNode);
        // Only extract expressions
        if (!isExpressionTarget)
            return;
        // Before any extracting array literals must be const
        if (isArrayLiteralExpression(targetNode)) {
            changeTracker.replaceNode(sourceFile, targetNode, createAsExpression(targetNode, factory.createTypeReferenceNode("const")));
            return [Diagnostics.Mark_array_literal_as_const];
        }
        const parentPropertyAssignment = findAncestor(targetNode, isPropertyAssignment);
        if (parentPropertyAssignment) {
            // identifiers or entity names can already just be typeof-ed
            if (parentPropertyAssignment === targetNode.parent && isEntityNameExpression(targetNode))
                return;
            const tempName = factory.createUniqueName(getIdentifierForNode(targetNode, sourceFile, typeChecker, sourceFile), GeneratedIdentifierFlags.Optimistic);
            let replacementTarget = targetNode;
            let initializationNode = targetNode;
            if (isSpreadElement(replacementTarget)) {
                replacementTarget = walkUpParenthesizedExpressions(replacementTarget.parent);
                if (isConstAssertion(replacementTarget.parent)) {
                    initializationNode = replacementTarget = replacementTarget.parent;
                }
                else {
                    initializationNode = createAsExpression(replacementTarget, factory.createTypeReferenceNode("const"));
                }
            }
            if (isEntityNameExpression(replacementTarget))
                return undefined;
            const variableDefinition = factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([
                factory.createVariableDeclaration(tempName, 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, initializationNode),
            ], NodeFlags.Const));
            const statement = findAncestor(targetNode, isStatement);
            changeTracker.insertNodeBefore(sourceFile, statement, variableDefinition);
            changeTracker.replaceNode(sourceFile, replacementTarget, factory.createAsExpression(factory.cloneNode(tempName), factory.createTypeQueryNode(factory.cloneNode(tempName))));
            return [Diagnostics.Extract_to_variable_and_replace_with_0_as_typeof_0, typeToStringForDiag(tempName)];
        }
    }
    function findExpandoFunction(node) {
        const expandoDeclaration = findAncestor(node, n => isStatement(n) ? "quit" : isExpandoPropertyDeclaration(n));
        if (expandoDeclaration && isExpandoPropertyDeclaration(expandoDeclaration)) {
            let assignmentTarget = expandoDeclaration;
            // Some late bound expando members use thw whole expression as the declaration.
            if (isBinaryExpression(assignmentTarget)) {
                assignmentTarget = assignmentTarget.left;
                if (!isExpandoPropertyDeclaration(assignmentTarget))
                    return undefined;
            }
            const targetType = typeChecker.getTypeAtLocation(assignmentTarget.expression);
            if (!targetType)
                return;
            const properties = typeChecker.getPropertiesOfType(targetType);
            if (some(properties, p => p.valueDeclaration === expandoDeclaration || p.valueDeclaration === expandoDeclaration.parent)) {
                const fn = targetType.symbol.valueDeclaration;
                if (fn) {
                    if (isFunctionExpressionOrArrowFunction(fn) && isVariableDeclaration(fn.parent)) {
                        return fn.parent;
                    }
                    if (isFunctionDeclaration(fn)) {
                        return fn;
                    }
                }
            }
        }
        return undefined;
    }
    function fixIsolatedDeclarationError(node) {
        // Different --isolatedDeclarion errors might result in annotating type on the same node
        // avoid creating a duplicated fix in those cases
        if (fixedNodes === null || fixedNodes === void 0 ? void 0 : fixedNodes.has(node))
            return undefined;
        fixedNodes === null || fixedNodes === void 0 ? void 0 : fixedNodes.add(node);
        switch (node.kind) {
            case SyntaxKind.Parameter:
            case SyntaxKind.PropertyDeclaration:
            case SyntaxKind.VariableDeclaration:
                return addTypeToVariableLike(node);
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.GetAccessor:
                return addTypeToSignatureDeclaration(node, sourceFile);
            case SyntaxKind.ExportAssignment:
                return transformExportAssignment(node);
            case SyntaxKind.ClassDeclaration:
                return transformExtendsClauseWithExpression(node);
            case SyntaxKind.ObjectBindingPattern:
            case SyntaxKind.ArrayBindingPattern:
                return transformDestructuringPatterns(node);
            default:
                throw new Error(`Cannot find a fix for the given node ${node.kind}`);
        }
    }
    function addTypeToSignatureDeclaration(func, sourceFile) {
        if (func.type) {
            return;
        }
        const { typeNode } = inferType(func);
        if (typeNode) {
            changeTracker.tryInsertTypeAnnotation(sourceFile, func, typeNode);
            return [Diagnostics.Add_return_type_0, typeToStringForDiag(typeNode)];
        }
    }
    function transformExportAssignment(defaultExport) {
        if (defaultExport.isExportEquals) {
            return;
        }
        const { typeNode } = inferType(defaultExport.expression);
        if (!typeNode)
            return undefined;
        const defaultIdentifier = factory.createUniqueName("_default");
        changeTracker.replaceNodeWithNodes(sourceFile, defaultExport, [
            factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(defaultIdentifier, 
                /*exclamationToken*/ undefined, typeNode, defaultExport.expression)], NodeFlags.Const)),
            factory.updateExportAssignment(defaultExport, defaultExport === null || defaultExport === void 0 ? void 0 : defaultExport.modifiers, defaultIdentifier),
        ]);
        return [
            Diagnostics.Extract_default_export_to_variable,
        ];
    }
    /**
     * Factor out expressions used extends clauses in classs definitions as a
     * variable and annotate type on the new variable.
     */
    function transformExtendsClauseWithExpression(classDecl) {
        var _a, _b, _c;
        const extendsClause = (_a = classDecl.heritageClauses) === null || _a === void 0 ? void 0 : _a.find(p => p.token === SyntaxKind.ExtendsKeyword);
        const heritageExpression = extendsClause === null || extendsClause === void 0 ? void 0 : extendsClause.types[0];
        if (!heritageExpression) {
            return undefined;
        }
        const { typeNode: heritageTypeNode } = inferType(heritageExpression.expression);
        if (!heritageTypeNode) {
            return undefined;
        }
        const baseClassName = factory.createUniqueName(classDecl.name ? classDecl.name.text + "Base" : "Anonymous", GeneratedIdentifierFlags.Optimistic);
        // e.g. const Point3DBase: typeof Point2D = mixin(Point2D);
        const heritageVariable = factory.createVariableStatement(
        /*modifiers*/ undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(baseClassName, 
            /*exclamationToken*/ undefined, heritageTypeNode, heritageExpression.expression)], NodeFlags.Const));
        // const touchingToken = getTouchingToken(heritageExpression);
        changeTracker.insertNodeBefore(sourceFile, classDecl, heritageVariable);
        const trailingComments = getTrailingCommentRanges(sourceFile.text, heritageExpression.end);
        const realEnd = (_c = (_b = trailingComments === null || trailingComments === void 0 ? void 0 : trailingComments[trailingComments.length - 1]) === null || _b === void 0 ? void 0 : _b.end) !== null && _c !== void 0 ? _c : heritageExpression.end;
        changeTracker.replaceRange(sourceFile, {
            pos: heritageExpression.getFullStart(),
            end: realEnd,
        }, baseClassName, {
            prefix: " ",
        });
        return [Diagnostics.Extract_base_class_to_variable];
    }
    let ExpressionType;
    (function (ExpressionType) {
        ExpressionType[ExpressionType["Text"] = 0] = "Text";
        ExpressionType[ExpressionType["Computed"] = 1] = "Computed";
        ExpressionType[ExpressionType["ArrayAccess"] = 2] = "ArrayAccess";
        ExpressionType[ExpressionType["Identifier"] = 3] = "Identifier";
    })(ExpressionType || (ExpressionType = {}));
    function transformDestructuringPatterns(bindingPattern) {
        var _a;
        const enclosingVariableDeclaration = bindingPattern.parent;
        const enclosingVarStmt = bindingPattern.parent.parent.parent;
        if (!enclosingVariableDeclaration.initializer)
            return undefined;
        let baseExpr;
        const newNodes = [];
        if (!isIdentifier(enclosingVariableDeclaration.initializer)) {
            // For complex expressions we want to create a temporary variable
            const tempHolderForReturn = factory.createUniqueName("dest", GeneratedIdentifierFlags.Optimistic);
            baseExpr = { expression: { kind: 3 /* ExpressionType.Identifier */, identifier: tempHolderForReturn } };
            newNodes.push(factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(tempHolderForReturn, 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, enclosingVariableDeclaration.initializer)], NodeFlags.Const)));
        }
        else {
            // If we are destructuring an identifier, just use that. No need for temp var.
            baseExpr = { expression: { kind: 3 /* ExpressionType.Identifier */, identifier: enclosingVariableDeclaration.initializer } };
        }
        const bindingElements = [];
        if (isArrayBindingPattern(bindingPattern)) {
            addArrayBindingPatterns(bindingPattern, bindingElements, baseExpr);
        }
        else {
            addObjectBindingPatterns(bindingPattern, bindingElements, baseExpr);
        }
        const expressionToVar = new Map();
        for (const bindingElement of bindingElements) {
            if (bindingElement.element.propertyName && isComputedPropertyName(bindingElement.element.propertyName)) {
                const computedExpression = bindingElement.element.propertyName.expression;
                const identifierForComputedProperty = factory.getGeneratedNameForNode(computedExpression);
                const variableDecl = factory.createVariableDeclaration(identifierForComputedProperty, 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, computedExpression);
                const variableList = factory.createVariableDeclarationList([variableDecl], NodeFlags.Const);
                const variableStatement = factory.createVariableStatement(/*modifiers*/ undefined, variableList);
                newNodes.push(variableStatement);
                expressionToVar.set(computedExpression, identifierForComputedProperty);
            }
            // Name is the RHS of : in case colon exists, otherwise it's just the name of the destructuring
            const name = bindingElement.element.name;
            // isBindingPattern
            if (isArrayBindingPattern(name)) {
                addArrayBindingPatterns(name, bindingElements, bindingElement);
            }
            else if (isObjectBindingPattern(name)) {
                addObjectBindingPatterns(name, bindingElements, bindingElement);
            }
            else {
                const { typeNode } = inferType(name);
                let variableInitializer = createChainedExpression(bindingElement, expressionToVar);
                if (bindingElement.element.initializer) {
                    const propertyName = (_a = bindingElement.element) === null || _a === void 0 ? void 0 : _a.propertyName;
                    const tempName = factory.createUniqueName(propertyName && isIdentifier(propertyName) ? propertyName.text : "temp", GeneratedIdentifierFlags.Optimistic);
                    newNodes.push(factory.createVariableStatement(
                    /*modifiers*/ undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(tempName, 
                        /*exclamationToken*/ undefined, 
                        /*type*/ undefined, variableInitializer)], NodeFlags.Const)));
                    variableInitializer = factory.createConditionalExpression(factory.createBinaryExpression(tempName, factory.createToken(SyntaxKind.EqualsEqualsEqualsToken), factory.createIdentifier("undefined")), factory.createToken(SyntaxKind.QuestionToken), bindingElement.element.initializer, factory.createToken(SyntaxKind.ColonToken), variableInitializer);
                }
                const exportModifier = hasSyntacticModifier(enclosingVarStmt, ModifierFlags.Export) ?
                    [factory.createToken(SyntaxKind.ExportKeyword)] :
                    undefined;
                newNodes.push(factory.createVariableStatement(exportModifier, factory.createVariableDeclarationList([factory.createVariableDeclaration(name, 
                    /*exclamationToken*/ undefined, typeNode, variableInitializer)], NodeFlags.Const)));
            }
        }
        if (enclosingVarStmt.declarationList.declarations.length > 1) {
            newNodes.push(factory.updateVariableStatement(enclosingVarStmt, enclosingVarStmt.modifiers, factory.updateVariableDeclarationList(enclosingVarStmt.declarationList, enclosingVarStmt.declarationList.declarations.filter(node => node !== bindingPattern.parent))));
        }
        changeTracker.replaceNodeWithNodes(sourceFile, enclosingVarStmt, newNodes);
        return [
            Diagnostics.Extract_binding_expressions_to_variable,
        ];
    }
    function addArrayBindingPatterns(bindingPattern, bindingElements, parent) {
        for (let i = 0; i < bindingPattern.elements.length; ++i) {
            const element = bindingPattern.elements[i];
            if (isOmittedExpression(element)) {
                continue;
            }
            bindingElements.push({
                element,
                parent,
                expression: { kind: 2 /* ExpressionType.ArrayAccess */, arrayIndex: i },
            });
        }
    }
    function addObjectBindingPatterns(bindingPattern, bindingElements, parent) {
        for (const bindingElement of bindingPattern.elements) {
            let name;
            if (bindingElement.propertyName) {
                if (isComputedPropertyName(bindingElement.propertyName)) {
                    bindingElements.push({
                        element: bindingElement,
                        parent,
                        expression: { kind: 1 /* ExpressionType.Computed */, computed: bindingElement.propertyName.expression },
                    });
                    continue;
                }
                else {
                    name = bindingElement.propertyName.text;
                }
            }
            else {
                name = bindingElement.name.text;
            }
            bindingElements.push({
                element: bindingElement,
                parent,
                expression: { kind: 0 /* ExpressionType.Text */, text: name },
            });
        }
    }
    function createChainedExpression(expression, expressionToVar) {
        const reverseTraverse = [expression];
        while (expression.parent) {
            expression = expression.parent;
            reverseTraverse.push(expression);
        }
        let chainedExpression = reverseTraverse[reverseTraverse.length - 1].expression.identifier;
        for (let i = reverseTraverse.length - 2; i >= 0; --i) {
            const nextSubExpr = reverseTraverse[i].expression;
            if (nextSubExpr.kind === 0 /* ExpressionType.Text */) {
                chainedExpression = factory.createPropertyAccessChain(chainedExpression, 
                /*questionDotToken*/ undefined, factory.createIdentifier(nextSubExpr.text));
            }
            else if (nextSubExpr.kind === 1 /* ExpressionType.Computed */) {
                chainedExpression = factory.createElementAccessExpression(chainedExpression, expressionToVar.get(nextSubExpr.computed));
            }
            else if (nextSubExpr.kind === 2 /* ExpressionType.ArrayAccess */) {
                chainedExpression = factory.createElementAccessExpression(chainedExpression, nextSubExpr.arrayIndex);
            }
        }
        return chainedExpression;
    }
    function inferType(node, variableType) {
        var _a, _b;
        if (typePrintMode === TypePrintMode.Relative) {
            return relativeType(node);
        }
        let type;
        if (isValueSignatureDeclaration(node)) {
            const signature = typeChecker.getSignatureFromDeclaration(node);
            if (signature) {
                const typePredicate = typeChecker.getTypePredicateOfSignature(signature);
                if (typePredicate) {
                    if (!typePredicate.type) {
                        return emptyInferenceResult;
                    }
                    return {
                        typeNode: typePredicateToTypeNode(typePredicate, (_a = findAncestor(node, isDeclaration)) !== null && _a !== void 0 ? _a : sourceFile, getFlags(typePredicate.type)),
                        mutatedTarget: false,
                    };
                }
                type = typeChecker.getReturnTypeOfSignature(signature);
            }
        }
        else {
            type = typeChecker.getTypeAtLocation(node);
        }
        if (!type) {
            return emptyInferenceResult;
        }
        if (typePrintMode === TypePrintMode.Widened) {
            if (variableType) {
                type = variableType;
            }
            // Widening of types can happen on union of type literals on
            // declaration emit so we query it.
            const widenedType = typeChecker.getWidenedLiteralType(type);
            if (typeChecker.isTypeAssignableTo(widenedType, type)) {
                return emptyInferenceResult;
            }
            type = widenedType;
        }
        const enclosingDeclaration = (_b = findAncestor(node, isDeclaration)) !== null && _b !== void 0 ? _b : sourceFile;
        if (isParameter(node) && typeChecker.requiresAddingImplicitUndefined(node, enclosingDeclaration)) {
            type = typeChecker.getUnionType([typeChecker.getUndefinedType(), type], UnionReduction.None);
        }
        return {
            typeNode: typeToTypeNode(type, enclosingDeclaration, getFlags(type)),
            mutatedTarget: false,
        };
        function getFlags(type) {
            return (isVariableDeclaration(node) ||
                (isPropertyDeclaration(node) && hasSyntacticModifier(node, ModifierFlags.Static | ModifierFlags.Readonly))) && type.flags & TypeFlags.UniqueESSymbol ?
                NodeBuilderFlags.AllowUniqueESSymbolType : NodeBuilderFlags.None;
        }
    }
    function createTypeOfFromEntityNameExpression(node) {
        return factory.createTypeQueryNode(getSynthesizedDeepClone(node));
    }
    function typeFromArraySpreadElements(node, name = "temp") {
        const isConstContext = !!findAncestor(node, isConstAssertion);
        if (!isConstContext)
            return emptyInferenceResult;
        return typeFromSpreads(node, name, isConstContext, n => n.elements, isSpreadElement, factory.createSpreadElement, props => factory.createArrayLiteralExpression(props, /*multiLine*/ true), types => factory.createTupleTypeNode(types.map(factory.createRestTypeNode)));
    }
    function typeFromObjectSpreadAssignment(node, name = "temp") {
        const isConstContext = !!findAncestor(node, isConstAssertion);
        return typeFromSpreads(node, name, isConstContext, n => n.properties, isSpreadAssignment, factory.createSpreadAssignment, props => factory.createObjectLiteralExpression(props, /*multiLine*/ true), factory.createIntersectionTypeNode);
    }
    function typeFromSpreads(node, name, isConstContext, getChildren, isSpread, createSpread, makeNodeOfKind, finalType) {
        const intersectionTypes = [];
        const newSpreads = [];
        let currentVariableProperties;
        const statement = findAncestor(node, isStatement);
        for (const prop of getChildren(node)) {
            if (isSpread(prop)) {
                finalizesVariablePart();
                if (isEntityNameExpression(prop.expression)) {
                    intersectionTypes.push(createTypeOfFromEntityNameExpression(prop.expression));
                    newSpreads.push(prop);
                }
                else {
                    makeVariable(prop.expression);
                }
            }
            else {
                (currentVariableProperties !== null && currentVariableProperties !== void 0 ? currentVariableProperties : (currentVariableProperties = [])).push(prop);
            }
        }
        if (newSpreads.length === 0) {
            return emptyInferenceResult;
        }
        finalizesVariablePart();
        changeTracker.replaceNode(sourceFile, node, makeNodeOfKind(newSpreads));
        return {
            typeNode: finalType(intersectionTypes),
            mutatedTarget: true,
        };
        function makeVariable(expression) {
            const tempName = factory.createUniqueName(name + "_Part" + (newSpreads.length + 1), GeneratedIdentifierFlags.Optimistic);
            const initializer = !isConstContext ? expression : factory.createAsExpression(expression, factory.createTypeReferenceNode("const"));
            const variableDefinition = factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([
                factory.createVariableDeclaration(tempName, 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, initializer),
            ], NodeFlags.Const));
            changeTracker.insertNodeBefore(sourceFile, statement, variableDefinition);
            intersectionTypes.push(createTypeOfFromEntityNameExpression(tempName));
            newSpreads.push(createSpread(tempName));
        }
        function finalizesVariablePart() {
            if (currentVariableProperties) {
                makeVariable(makeNodeOfKind(currentVariableProperties));
                currentVariableProperties = undefined;
            }
        }
    }
    function isConstAssertion(location) {
        return isAssertionExpression(location) && isConstTypeReference(location.type);
    }
    function relativeType(node) {
        if (isParameter(node)) {
            return emptyInferenceResult;
        }
        if (isShorthandPropertyAssignment(node)) {
            return {
                typeNode: createTypeOfFromEntityNameExpression(node.name),
                mutatedTarget: false,
            };
        }
        if (isEntityNameExpression(node)) {
            return {
                typeNode: createTypeOfFromEntityNameExpression(node),
                mutatedTarget: false,
            };
        }
        if (isConstAssertion(node)) {
            return relativeType(node.expression);
        }
        if (isArrayLiteralExpression(node)) {
            const variableDecl = findAncestor(node, isVariableDeclaration);
            const partName = variableDecl && isIdentifier(variableDecl.name) ? variableDecl.name.text : undefined;
            return typeFromArraySpreadElements(node, partName);
        }
        if (isObjectLiteralExpression(node)) {
            const variableDecl = findAncestor(node, isVariableDeclaration);
            const partName = variableDecl && isIdentifier(variableDecl.name) ? variableDecl.name.text : undefined;
            return typeFromObjectSpreadAssignment(node, partName);
        }
        if (isVariableDeclaration(node) && node.initializer) {
            return relativeType(node.initializer);
        }
        if (isConditionalExpression(node)) {
            const { typeNode: trueType, mutatedTarget: mTrue } = relativeType(node.whenTrue);
            if (!trueType)
                return emptyInferenceResult;
            const { typeNode: falseType, mutatedTarget: mFalse } = relativeType(node.whenFalse);
            if (!falseType)
                return emptyInferenceResult;
            return {
                typeNode: factory.createUnionTypeNode([trueType, falseType]),
                mutatedTarget: mTrue || mFalse,
            };
        }
        return emptyInferenceResult;
    }
    function typeToTypeNode(type, enclosingDeclaration, flags = NodeBuilderFlags.None) {
        let isTruncated = false;
        const minimizedTypeNode = typeToMinimizedReferenceType(typeChecker, type, enclosingDeclaration, declarationEmitNodeBuilderFlags | flags, declarationEmitInternalNodeBuilderFlags, {
            moduleResolverHost: program,
            trackSymbol() {
                return true;
            },
            reportTruncationError() {
                isTruncated = true;
            },
        });
        if (!minimizedTypeNode) {
            return undefined;
        }
        const result = typeNodeToAutoImportableTypeNode(minimizedTypeNode, importAdder, scriptTarget);
        return isTruncated ? factory.createKeywordTypeNode(SyntaxKind.AnyKeyword) : result;
    }
    function typePredicateToTypeNode(typePredicate, enclosingDeclaration, flags = NodeBuilderFlags.None) {
        let isTruncated = false;
        const result = typePredicateToAutoImportableTypeNode(typeChecker, importAdder, typePredicate, enclosingDeclaration, scriptTarget, declarationEmitNodeBuilderFlags | flags, declarationEmitInternalNodeBuilderFlags, {
            moduleResolverHost: program,
            trackSymbol() {
                return true;
            },
            reportTruncationError() {
                isTruncated = true;
            },
        });
        return isTruncated ? factory.createKeywordTypeNode(SyntaxKind.AnyKeyword) : result;
    }
    function addTypeToVariableLike(decl) {
        const { typeNode } = inferType(decl);
        if (typeNode) {
            if (decl.type) {
                changeTracker.replaceNode(getSourceFileOfNode(decl), decl.type, typeNode);
            }
            else {
                changeTracker.tryInsertTypeAnnotation(getSourceFileOfNode(decl), decl, typeNode);
            }
            return [Diagnostics.Add_annotation_of_type_0, typeToStringForDiag(typeNode)];
        }
    }
    function typeToStringForDiag(node) {
        setEmitFlags(node, EmitFlags.SingleLine);
        const result = typePrinter.printNode(EmitHint.Unspecified, node, sourceFile);
        if (result.length > defaultMaximumTruncationLength) {
            return result.substring(0, defaultMaximumTruncationLength - "...".length) + "...";
        }
        setEmitFlags(node, EmitFlags.None);
        return result;
    }
    // Some --isolatedDeclarations errors are not present on the node that directly needs type annotation, so look in the
    // ancestors to look for node that needs type annotation. This function can return undefined if the AST is ill-formed.
    function findAncestorWithMissingType(node) {
        return findAncestor(node, n => {
            return canHaveTypeAnnotation.has(n.kind) &&
                ((!isObjectBindingPattern(n) && !isArrayBindingPattern(n)) || isVariableDeclaration(n.parent));
        });
    }
    function findBestFittingNode(node, span) {
        while (node && node.end < span.start + span.length) {
            node = node.parent;
        }
        while (node.parent.pos === node.pos && node.parent.end === node.end) {
            node = node.parent;
        }
        if (isIdentifier(node) && hasInitializer(node.parent) && node.parent.initializer) {
            return node.parent.initializer;
        }
        return node;
    }
}
