import {
  cast,
  findIndex,
  getOrCreateEmitNode,
  getOriginalNode,
  hasSyntacticModifier,
  isCallToHelper,
  isClassDeclaration,
  isClassExpression,
  isClassStaticBlockDeclaration,
  isClassThisAssignmentBlock,
  isEmptyStringLiteral,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isPrivateIdentifier,
  isPropertyNameLiteral,
  isStringLiteral,
  ModifierFlags,
  setSourceMapRange,
  setTextRange,
  skipOuterExpressions,
  some,
  SyntaxKind,
} from "../namespaces/ts.js";


/**
 * Gets a string literal to use as the assigned name of an anonymous class or function declaration.
 */
function getAssignedNameOfIdentifier(factory, name, expression) {
    const original = getOriginalNode(skipOuterExpressions(expression));
    if ((isClassDeclaration(original) || isFunctionDeclaration(original)) &&
        !original.name && hasSyntacticModifier(original, ModifierFlags.Default)) {
        return factory.createStringLiteral("default");
    }
    return factory.createStringLiteralFromNode(name);
}
function getAssignedNameOfPropertyName(context, name, assignedNameText) {
    const { factory } = context;
    if (assignedNameText !== undefined) {
        const assignedName = factory.createStringLiteral(assignedNameText);
        return { assignedName, name };
    }
    if (isPropertyNameLiteral(name) || isPrivateIdentifier(name)) {
        const assignedName = factory.createStringLiteralFromNode(name);
        return { assignedName, name };
    }
    if (isPropertyNameLiteral(name.expression) && !isIdentifier(name.expression)) {
        const assignedName = factory.createStringLiteralFromNode(name.expression);
        return { assignedName, name };
    }
    const assignedName = factory.getGeneratedNameForNode(name);
    context.hoistVariableDeclaration(assignedName);
    const key = context.getEmitHelperFactory().createPropKeyHelper(name.expression);
    const assignment = factory.createAssignment(assignedName, key);
    const updatedName = factory.updateComputedPropertyName(name, assignment);
    return { assignedName, name: updatedName };
}
/**
 * Creates a class `static {}` block used to dynamically set the name of a class.
 *
 * @param assignedName The expression used to resolve the assigned name at runtime. This expression should not produce
 * side effects.
 * @param thisExpression Overrides the expression to use for the actual `this` reference. This can be used to provide an
 * expression that has already had its `EmitFlags` set or may have been tracked to prevent substitution.
 */
function createClassNamedEvaluationHelperBlock(context, assignedName, thisExpression = context.factory.createThis()) {
    // produces:
    //
    //  static { __setFunctionName(this, "C"); }
    //
    const { factory } = context;
    const expression = context.getEmitHelperFactory().createSetFunctionNameHelper(thisExpression, assignedName);
    const statement = factory.createExpressionStatement(expression);
    const body = factory.createBlock([statement], /*multiLine*/ false);
    const block = factory.createClassStaticBlockDeclaration(body);
    // We use `emitNode.assignedName` to indicate this is a NamedEvaluation helper block
    // and to stash the expression used to resolve the assigned name.
    getOrCreateEmitNode(block).assignedName = assignedName;
    return block;
}
/**
 * Gets whether a node is a `static {}` block containing only a single call to the `__setFunctionName` helper where that
 * call's second argument is the value stored in the `assignedName` property of the block's `EmitNode`.
 * @internal
 */
export function isClassNamedEvaluationHelperBlock(node) {
    var _a;
    if (!isClassStaticBlockDeclaration(node) || node.body.statements.length !== 1) {
        return false;
    }
    const statement = node.body.statements[0];
    return isExpressionStatement(statement) &&
        isCallToHelper(statement.expression, "___setFunctionName") &&
        statement.expression.arguments.length >= 2 &&
        statement.expression.arguments[1] === ((_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.assignedName);
}
/**
 * Gets whether a `ClassLikeDeclaration` has a `static {}` block containing only a single call to the
 * `__setFunctionName` helper.
 * @internal
 */
export function classHasExplicitlyAssignedName(node) {
    var _a;
    return !!((_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.assignedName) && some(node.members, isClassNamedEvaluationHelperBlock);
}
/**
 * Gets whether a `ClassLikeDeclaration` has a declared name or contains a `static {}` block containing only a single
 * call to the `__setFunctionName` helper.
 * @internal
 */
export function classHasDeclaredOrExplicitlyAssignedName(node) {
    return !!node.name || classHasExplicitlyAssignedName(node);
}
export function injectClassNamedEvaluationHelperBlockIfMissing(context, node, assignedName, thisExpression) {
    // given:
    //
    //  let C = class {
    //  };
    //
    // produces:
    //
    //  let C = class {
    //      static { __setFunctionName(this, "C"); }
    //  };
    // NOTE: If the class has a `_classThis` assignment block, this helper will be injected after that block.
    if (classHasExplicitlyAssignedName(node)) {
        return node;
    }
    const { factory } = context;
    const namedEvaluationBlock = createClassNamedEvaluationHelperBlock(context, assignedName, thisExpression);
    if (node.name) {
        setSourceMapRange(namedEvaluationBlock.body.statements[0], node.name);
    }
    const insertionIndex = findIndex(node.members, isClassThisAssignmentBlock) + 1;
    const leading = node.members.slice(0, insertionIndex);
    const trailing = node.members.slice(insertionIndex);
    const members = factory.createNodeArray([...leading, namedEvaluationBlock, ...trailing]);
    setTextRange(members, node.members);
    node = isClassDeclaration(node) ?
        factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, members) :
        factory.updateClassExpression(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, members);
    getOrCreateEmitNode(node).assignedName = assignedName;
    return node;
}
function finishTransformNamedEvaluation(context, expression, assignedName, ignoreEmptyStringLiteral) {
    if (ignoreEmptyStringLiteral && isStringLiteral(assignedName) && isEmptyStringLiteral(assignedName)) {
        return expression;
    }
    const { factory } = context;
    const innerExpression = skipOuterExpressions(expression);
    const updatedExpression = isClassExpression(innerExpression) ?
        cast(injectClassNamedEvaluationHelperBlockIfMissing(context, innerExpression, assignedName), isClassExpression) :
        context.getEmitHelperFactory().createSetFunctionNameHelper(innerExpression, assignedName);
    return factory.restoreOuterExpressions(expression, updatedExpression);
}
function transformNamedEvaluationOfPropertyAssignment(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 13.2.5.5 RS: PropertyDefinitionEvaluation
    //   PropertyAssignment : PropertyName `:` AssignmentExpression
    //     ...
    //     5. If IsAnonymousFunctionDefinition(|AssignmentExpression|) is *true* and _isProtoSetter_ is *false*, then
    //        a. Let _popValue_ be ? NamedEvaluation of |AssignmentExpression| with argument _propKey_.
    //     ...
    const { factory } = context;
    const { assignedName, name } = getAssignedNameOfPropertyName(context, node.name, assignedNameText);
    const initializer = finishTransformNamedEvaluation(context, node.initializer, assignedName, ignoreEmptyStringLiteral);
    return factory.updatePropertyAssignment(node, name, initializer);
}
function transformNamedEvaluationOfShorthandAssignmentProperty(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 13.15.5.3 RS: PropertyDestructuringAssignmentEvaluation
    //   AssignmentProperty : IdentifierReference Initializer?
    //     ...
    //     4. If |Initializer?| is present and _v_ is *undefined*, then
    //        a. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //           i. Set _v_ to ? NamedEvaluation of |Initializer| with argument _P_.
    //     ...
    const { factory } = context;
    const assignedName = assignedNameText !== undefined ? factory.createStringLiteral(assignedNameText) :
        getAssignedNameOfIdentifier(factory, node.name, node.objectAssignmentInitializer);
    const objectAssignmentInitializer = finishTransformNamedEvaluation(context, node.objectAssignmentInitializer, assignedName, ignoreEmptyStringLiteral);
    return factory.updateShorthandPropertyAssignment(node, node.name, objectAssignmentInitializer);
}
function transformNamedEvaluationOfVariableDeclaration(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 14.3.1.2 RS: Evaluation
    //   LexicalBinding : BindingIdentifier Initializer
    //     ...
    //     3. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //        a. Let _value_ be ? NamedEvaluation of |Initializer| with argument _bindingId_.
    //     ...
    //
    // 14.3.2.1 RS: Evaluation
    //   VariableDeclaration : BindingIdentifier Initializer
    //     ...
    //     3. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //        a. Let _value_ be ? NamedEvaluation of |Initializer| with argument _bindingId_.
    //     ...
    const { factory } = context;
    const assignedName = assignedNameText !== undefined ? factory.createStringLiteral(assignedNameText) :
        getAssignedNameOfIdentifier(factory, node.name, node.initializer);
    const initializer = finishTransformNamedEvaluation(context, node.initializer, assignedName, ignoreEmptyStringLiteral);
    return factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, initializer);
}
function transformNamedEvaluationOfParameterDeclaration(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 8.6.3 RS: IteratorBindingInitialization
    //   SingleNameBinding : BindingIdentifier Initializer?
    //     ...
    //     5. If |Initializer| is present and _v_ is *undefined*, then
    //        a. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //           i. Set _v_ to ? NamedEvaluation of |Initializer| with argument _bindingId_.
    //     ...
    //
    // 14.3.3.3 RS: KeyedBindingInitialization
    //   SingleNameBinding : BindingIdentifier Initializer?
    //     ...
    //     4. If |Initializer| is present and _v_ is *undefined*, then
    //        a. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //           i. Set _v_ to ? NamedEvaluation of |Initializer| with argument _bindingId_.
    //     ...
    const { factory } = context;
    const assignedName = assignedNameText !== undefined ? factory.createStringLiteral(assignedNameText) :
        getAssignedNameOfIdentifier(factory, node.name, node.initializer);
    const initializer = finishTransformNamedEvaluation(context, node.initializer, assignedName, ignoreEmptyStringLiteral);
    return factory.updateParameterDeclaration(node, node.modifiers, node.dotDotDotToken, node.name, node.questionToken, node.type, initializer);
}
function transformNamedEvaluationOfBindingElement(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 8.6.3 RS: IteratorBindingInitialization
    //   SingleNameBinding : BindingIdentifier Initializer?
    //     ...
    //     5. If |Initializer| is present and _v_ is *undefined*, then
    //        a. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //           i. Set _v_ to ? NamedEvaluation of |Initializer| with argument _bindingId_.
    //     ...
    //
    // 14.3.3.3 RS: KeyedBindingInitialization
    //   SingleNameBinding : BindingIdentifier Initializer?
    //     ...
    //     4. If |Initializer| is present and _v_ is *undefined*, then
    //        a. If IsAnonymousFunctionDefinition(|Initializer|) is *true*, then
    //           i. Set _v_ to ? NamedEvaluation of |Initializer| with argument _bindingId_.
    //     ...
    const { factory } = context;
    const assignedName = assignedNameText !== undefined ? factory.createStringLiteral(assignedNameText) :
        getAssignedNameOfIdentifier(factory, node.name, node.initializer);
    const initializer = finishTransformNamedEvaluation(context, node.initializer, assignedName, ignoreEmptyStringLiteral);
    return factory.updateBindingElement(node, node.dotDotDotToken, node.propertyName, node.name, initializer);
}
function transformNamedEvaluationOfPropertyDeclaration(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 10.2.1.3 RS: EvaluateBody
    //   Initializer : `=` AssignmentExpression
    //     ...
    //     3. If IsAnonymousFunctionDefinition(|AssignmentExpression|) is *true*, then
    //        a. Let _value_ be ? NamedEvaluation of |Initializer| with argument _functionObject_.[[ClassFieldInitializerName]].
    //     ...
    var _a;
    const { factory } = context;
    const { assignedName, name } = getAssignedNameOfPropertyName(context, node.name, assignedNameText);
    const initializer = finishTransformNamedEvaluation(context, node.initializer, assignedName, ignoreEmptyStringLiteral);
    return factory.updatePropertyDeclaration(node, node.modifiers, name, (_a = node.questionToken) !== null && _a !== void 0 ? _a : node.exclamationToken, node.type, initializer);
}
function transformNamedEvaluationOfAssignmentExpression(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 13.15.2 RS: Evaluation
    //   AssignmentExpression : LeftHandSideExpression `=` AssignmentExpression
    //     1. If |LeftHandSideExpression| is neither an |ObjectLiteral| nor an |ArrayLiteral|, then
    //        a. Let _lref_ be ? Evaluation of |LeftHandSideExpression|.
    //        b. If IsAnonymousFunctionDefinition(|AssignmentExpression|) and IsIdentifierRef of |LeftHandSideExpression| are both *true*, then
    //           i. Let _rval_ be ? NamedEvaluation of |AssignmentExpression| with argument _lref_.[[ReferencedName]].
    //     ...
    //
    //   AssignmentExpression : LeftHandSideExpression `&&=` AssignmentExpression
    //     ...
    //     5. If IsAnonymousFunctionDefinition(|AssignmentExpression|) is *true* and IsIdentifierRef of |LeftHandSideExpression| is *true*, then
    //        a. Let _rval_ be ? NamedEvaluation of |AssignmentExpression| with argument _lref_.[[ReferencedName]].
    //     ...
    //
    //   AssignmentExpression : LeftHandSideExpression `||=` AssignmentExpression
    //     ...
    //     5. If IsAnonymousFunctionDefinition(|AssignmentExpression|) is *true* and IsIdentifierRef of |LeftHandSideExpression| is *true*, then
    //        a. Let _rval_ be ? NamedEvaluation of |AssignmentExpression| with argument _lref_.[[ReferencedName]].
    //     ...
    //
    //   AssignmentExpression : LeftHandSideExpression `??=` AssignmentExpression
    //     ...
    //     4. If IsAnonymousFunctionDefinition(|AssignmentExpression|) is *true* and IsIdentifierRef of |LeftHandSideExpression| is *true*, then
    //        a. Let _rval_ be ? NamedEvaluation of |AssignmentExpression| with argument _lref_.[[ReferencedName]].
    //     ...
    const { factory } = context;
    const assignedName = assignedNameText !== undefined ? factory.createStringLiteral(assignedNameText) :
        getAssignedNameOfIdentifier(factory, node.left, node.right);
    const right = finishTransformNamedEvaluation(context, node.right, assignedName, ignoreEmptyStringLiteral);
    return factory.updateBinaryExpression(node, node.left, node.operatorToken, right);
}
function transformNamedEvaluationOfExportAssignment(context, node, ignoreEmptyStringLiteral, assignedNameText) {
    // 16.2.3.7 RS: Evaluation
    //   ExportDeclaration : `export` `default` AssignmentExpression `;`
    //     1. If IsAnonymousFunctionDefinition(|AssignmentExpression|) is *true*, then
    //        a. Let _value_ be ? NamedEvaluation of |AssignmentExpression| with argument `"default"`.
    //     ...
    // NOTE: Since emit for `export =` translates to `module.exports = ...`, the assigned name of the class or function
    // is `""`.
    const { factory } = context;
    const assignedName = assignedNameText !== undefined ? factory.createStringLiteral(assignedNameText) :
        factory.createStringLiteral(node.isExportEquals ? "" : "default");
    const expression = finishTransformNamedEvaluation(context, node.expression, assignedName, ignoreEmptyStringLiteral);
    return factory.updateExportAssignment(node, node.modifiers, expression);
}
export function transformNamedEvaluation(context, node, ignoreEmptyStringLiteral, assignedName) {
    switch (node.kind) {
        case SyntaxKind.PropertyAssignment:
            return transformNamedEvaluationOfPropertyAssignment(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.ShorthandPropertyAssignment:
            return transformNamedEvaluationOfShorthandAssignmentProperty(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.VariableDeclaration:
            return transformNamedEvaluationOfVariableDeclaration(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.Parameter:
            return transformNamedEvaluationOfParameterDeclaration(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.BindingElement:
            return transformNamedEvaluationOfBindingElement(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.PropertyDeclaration:
            return transformNamedEvaluationOfPropertyDeclaration(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.BinaryExpression:
            return transformNamedEvaluationOfAssignmentExpression(context, node, ignoreEmptyStringLiteral, assignedName);
        case SyntaxKind.ExportAssignment:
            return transformNamedEvaluationOfExportAssignment(context, node, ignoreEmptyStringLiteral, assignedName);
    }
}
