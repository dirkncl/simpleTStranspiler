import {
  addRange,
  append,
  Debug,
  every,
  forEach,
  getElementsOfBindingOrAssignmentPattern,
  getInitializerOfBindingOrAssignmentElement,
  getPropertyNameOfBindingOrAssignmentElement,
  getRestIndicatorOfBindingOrAssignmentElement,
  getTargetOfBindingOrAssignmentElement,
  idText,
  isArrayBindingElement,
  isArrayBindingOrAssignmentElement,
  isArrayBindingOrAssignmentPattern,
  isBigIntLiteral,
  isBindingElement,
  isBindingName,
  isBindingOrAssignmentElement,
  isBindingOrAssignmentPattern,
  isComputedPropertyName,
  isDeclarationBindingElement,
  isDestructuringAssignment,
  isEmptyArrayLiteral,
  isEmptyObjectLiteral,
  isExpression,
  isIdentifier,
  isLiteralExpression,
  isObjectBindingOrAssignmentElement,
  isObjectBindingOrAssignmentPattern,
  isOmittedExpression,
  isPropertyNameLiteral,
  isSimpleInlineableExpression,
  isStringOrNumericLiteralLike,
  isVariableDeclaration,
  last,
  map,
  nodeIsSynthesized,
  setTextRange,
  some,
  TransformFlags,
  tryGetPropertyNameOfBindingOrAssignmentElement,
  visitNode,
} from "../_namespaces/ts.js";

/** @internal */
export var FlattenLevel;
(function (FlattenLevel) {
    FlattenLevel[FlattenLevel["All"] = 0] = "All";
    FlattenLevel[FlattenLevel["ObjectRest"] = 1] = "ObjectRest";
})(FlattenLevel || (FlattenLevel = {}));
/**
 * Flattens a DestructuringAssignment or a VariableDeclaration to an expression.
 *
 * @param node The node to flatten.
 * @param visitor An optional visitor used to visit initializers.
 * @param context The transformation context.
 * @param level Indicates the extent to which flattening should occur.
 * @param needsValue An optional value indicating whether the value from the right-hand-side of
 * the destructuring assignment is needed as part of a larger expression.
 * @param createAssignmentCallback An optional callback used to create the assignment expression.
 *
 * @internal
 */
export function flattenDestructuringAssignment(node, visitor, context, level, needsValue, createAssignmentCallback) {
    let location = node;
    let value;
    if (isDestructuringAssignment(node)) {
        value = node.right;
        while (isEmptyArrayLiteral(node.left) || isEmptyObjectLiteral(node.left)) {
            if (isDestructuringAssignment(value)) {
                location = node = value;
                value = node.right;
            }
            else {
                return Debug.checkDefined(visitNode(value, visitor, isExpression));
            }
        }
    }
    let expressions;
    const flattenContext = {
        context,
        level,
        downlevelIteration: !!context.getCompilerOptions().downlevelIteration,
        hoistTempVariables: true,
        emitExpression,
        emitBindingOrAssignment,
        createArrayBindingOrAssignmentPattern: elements => makeArrayAssignmentPattern(context.factory, elements),
        createObjectBindingOrAssignmentPattern: elements => makeObjectAssignmentPattern(context.factory, elements),
        createArrayBindingOrAssignmentElement: makeAssignmentElement,
        visitor,
    };
    if (value) {
        value = visitNode(value, visitor, isExpression);
        Debug.assert(value);
        if (isIdentifier(value) && bindingOrAssignmentElementAssignsToName(node, value.escapedText) ||
            bindingOrAssignmentElementContainsNonLiteralComputedName(node)) {
            // If the right-hand value of the assignment is also an assignment target then
            // we need to cache the right-hand value.
            value = ensureIdentifier(flattenContext, value, /*reuseIdentifierExpressions*/ false, location);
        }
        else if (needsValue) {
            // If the right-hand value of the destructuring assignment needs to be preserved (as
            // is the case when the destructuring assignment is part of a larger expression),
            // then we need to cache the right-hand value.
            //
            // The source map location for the assignment should point to the entire binary
            // expression.
            value = ensureIdentifier(flattenContext, value, /*reuseIdentifierExpressions*/ true, location);
        }
        else if (nodeIsSynthesized(node)) {
            // Generally, the source map location for a destructuring assignment is the root
            // expression.
            //
            // However, if the root expression is synthesized (as in the case
            // of the initializer when transforming a ForOfStatement), then the source map
            // location should point to the right-hand value of the expression.
            location = value;
        }
    }
    flattenBindingOrAssignmentElement(flattenContext, node, value, location, /*skipInitializer*/ isDestructuringAssignment(node));
    if (value && needsValue) {
        if (!some(expressions)) {
            return value;
        }
        expressions.push(value);
    }
    return context.factory.inlineExpressions(expressions) || context.factory.createOmittedExpression();
    function emitExpression(expression) {
        expressions = append(expressions, expression);
    }
    function emitBindingOrAssignment(target, value, location, original) {
        Debug.assertNode(target, createAssignmentCallback ? isIdentifier : isExpression);
        const expression = createAssignmentCallback
            ? createAssignmentCallback(target, value, location)
            : setTextRange(context.factory.createAssignment(Debug.checkDefined(visitNode(target, visitor, isExpression)), value), location);
        expression.original = original;
        emitExpression(expression);
    }
}
function bindingOrAssignmentElementAssignsToName(element, escapedName) {
    const target = getTargetOfBindingOrAssignmentElement(element); // TODO: GH#18217
    if (isBindingOrAssignmentPattern(target)) {
        return bindingOrAssignmentPatternAssignsToName(target, escapedName);
    }
    else if (isIdentifier(target)) {
        return target.escapedText === escapedName;
    }
    return false;
}
function bindingOrAssignmentPatternAssignsToName(pattern, escapedName) {
    const elements = getElementsOfBindingOrAssignmentPattern(pattern);
    for (const element of elements) {
        if (bindingOrAssignmentElementAssignsToName(element, escapedName)) {
            return true;
        }
    }
    return false;
}
function bindingOrAssignmentElementContainsNonLiteralComputedName(element) {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(element);
    if (propertyName && isComputedPropertyName(propertyName) && !isLiteralExpression(propertyName.expression)) {
        return true;
    }
    const target = getTargetOfBindingOrAssignmentElement(element);
    return !!target && isBindingOrAssignmentPattern(target) && bindingOrAssignmentPatternContainsNonLiteralComputedName(target);
}
function bindingOrAssignmentPatternContainsNonLiteralComputedName(pattern) {
    return !!forEach(getElementsOfBindingOrAssignmentPattern(pattern), bindingOrAssignmentElementContainsNonLiteralComputedName);
}
/**
 * Flattens a VariableDeclaration or ParameterDeclaration to one or more variable declarations.
 *
 * @param node The node to flatten.
 * @param visitor An optional visitor used to visit initializers.
 * @param context The transformation context.
 * @param boundValue The value bound to the declaration.
 * @param skipInitializer A value indicating whether to ignore the initializer of `node`.
 * @param hoistTempVariables Indicates whether temporary variables should not be recorded in-line.
 * @param level Indicates the extent to which flattening should occur.
 *
 * @internal
 */
export function flattenDestructuringBinding(node, visitor, context, level, rval, hoistTempVariables = false, skipInitializer) {
    let pendingExpressions;
    const pendingDeclarations = [];
    const declarations = [];
    const flattenContext = {
        context,
        level,
        downlevelIteration: !!context.getCompilerOptions().downlevelIteration,
        hoistTempVariables,
        emitExpression,
        emitBindingOrAssignment,
        createArrayBindingOrAssignmentPattern: elements => makeArrayBindingPattern(context.factory, elements),
        createObjectBindingOrAssignmentPattern: elements => makeObjectBindingPattern(context.factory, elements),
        createArrayBindingOrAssignmentElement: name => makeBindingElement(context.factory, name),
        visitor,
    };
    if (isVariableDeclaration(node)) {
        let initializer = getInitializerOfBindingOrAssignmentElement(node);
        if (initializer && (isIdentifier(initializer) && bindingOrAssignmentElementAssignsToName(node, initializer.escapedText) ||
            bindingOrAssignmentElementContainsNonLiteralComputedName(node))) {
            // If the right-hand value of the assignment is also an assignment target then
            // we need to cache the right-hand value.
            initializer = ensureIdentifier(flattenContext, Debug.checkDefined(visitNode(initializer, flattenContext.visitor, isExpression)), /*reuseIdentifierExpressions*/ false, initializer);
            node = context.factory.updateVariableDeclaration(node, node.name, /*exclamationToken*/ undefined, /*type*/ undefined, initializer);
        }
    }
    flattenBindingOrAssignmentElement(flattenContext, node, rval, node, skipInitializer);
    if (pendingExpressions) {
        const temp = context.factory.createTempVariable(/*recordTempVariable*/ undefined);
        if (hoistTempVariables) {
            const value = context.factory.inlineExpressions(pendingExpressions);
            pendingExpressions = undefined;
            emitBindingOrAssignment(temp, value, /*location*/ undefined, /*original*/ undefined);
        }
        else {
            context.hoistVariableDeclaration(temp);
            const pendingDeclaration = last(pendingDeclarations);
            pendingDeclaration.pendingExpressions = append(pendingDeclaration.pendingExpressions, context.factory.createAssignment(temp, pendingDeclaration.value));
            addRange(pendingDeclaration.pendingExpressions, pendingExpressions);
            pendingDeclaration.value = temp;
        }
    }
    for (const { pendingExpressions, name, value, location, original } of pendingDeclarations) {
        const variable = context.factory.createVariableDeclaration(name, 
        /*exclamationToken*/ undefined, 
        /*type*/ undefined, pendingExpressions ? context.factory.inlineExpressions(append(pendingExpressions, value)) : value);
        variable.original = original;
        setTextRange(variable, location);
        declarations.push(variable);
    }
    return declarations;
    function emitExpression(value) {
        pendingExpressions = append(pendingExpressions, value);
    }
    function emitBindingOrAssignment(target, value, location, original) {
        Debug.assertNode(target, isBindingName);
        if (pendingExpressions) {
            value = context.factory.inlineExpressions(append(pendingExpressions, value));
            pendingExpressions = undefined;
        }
        pendingDeclarations.push({ pendingExpressions, name: target, value, location, original });
    }
}
/**
 * Flattens a BindingOrAssignmentElement into zero or more bindings or assignments.
 *
 * @param flattenContext Options used to control flattening.
 * @param element The element to flatten.
 * @param value The current RHS value to assign to the element.
 * @param location The location to use for source maps and comments.
 * @param skipInitializer An optional value indicating whether to include the initializer
 * for the element.
 */
function flattenBindingOrAssignmentElement(flattenContext, element, value, location, skipInitializer) {
    const bindingTarget = getTargetOfBindingOrAssignmentElement(element); // TODO: GH#18217
    if (!skipInitializer) {
        const initializer = visitNode(getInitializerOfBindingOrAssignmentElement(element), flattenContext.visitor, isExpression);
        if (initializer) {
            // Combine value and initializer
            if (value) {
                value = createDefaultValueCheck(flattenContext, value, initializer, location);
                // If 'value' is not a simple expression, it could contain side-effecting code that should evaluate before an object or array binding pattern.
                if (!isSimpleInlineableExpression(initializer) && isBindingOrAssignmentPattern(bindingTarget)) {
                    value = ensureIdentifier(flattenContext, value, /*reuseIdentifierExpressions*/ true, location);
                }
            }
            else {
                value = initializer;
            }
        }
        else if (!value) {
            // Use 'void 0' in absence of value and initializer
            value = flattenContext.context.factory.createVoidZero();
        }
    }
    if (isObjectBindingOrAssignmentPattern(bindingTarget)) {
        flattenObjectBindingOrAssignmentPattern(flattenContext, element, bindingTarget, value, location);
    }
    else if (isArrayBindingOrAssignmentPattern(bindingTarget)) {
        flattenArrayBindingOrAssignmentPattern(flattenContext, element, bindingTarget, value, location);
    }
    else {
        flattenContext.emitBindingOrAssignment(bindingTarget, value, location, /*original*/ element); // TODO: GH#18217
    }
}
/**
 * Flattens an ObjectBindingOrAssignmentPattern into zero or more bindings or assignments.
 *
 * @param flattenContext Options used to control flattening.
 * @param parent The parent element of the pattern.
 * @param pattern The ObjectBindingOrAssignmentPattern to flatten.
 * @param value The current RHS value to assign to the element.
 * @param location The location to use for source maps and comments.
 */
function flattenObjectBindingOrAssignmentPattern(flattenContext, parent, pattern, value, location) {
    const elements = getElementsOfBindingOrAssignmentPattern(pattern);
    const numElements = elements.length;
    if (numElements !== 1) {
        // For anything other than a single-element destructuring we need to generate a temporary
        // to ensure value is evaluated exactly once. Additionally, if we have zero elements
        // we need to emit *something* to ensure that in case a 'var' keyword was already emitted,
        // so in that case, we'll intentionally create that temporary.
        const reuseIdentifierExpressions = !isDeclarationBindingElement(parent) || numElements !== 0;
        value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
    }
    let bindingElements;
    let computedTempVariables;
    for (let i = 0; i < numElements; i++) {
        const element = elements[i];
        if (!getRestIndicatorOfBindingOrAssignmentElement(element)) {
            const propertyName = getPropertyNameOfBindingOrAssignmentElement(element);
            if (flattenContext.level >= 1 /* FlattenLevel.ObjectRest */
                && !(element.transformFlags & (TransformFlags.ContainsRestOrSpread | TransformFlags.ContainsObjectRestOrSpread))
                && !(getTargetOfBindingOrAssignmentElement(element).transformFlags & (TransformFlags.ContainsRestOrSpread | TransformFlags.ContainsObjectRestOrSpread))
                && !isComputedPropertyName(propertyName)) {
                bindingElements = append(bindingElements, visitNode(element, flattenContext.visitor, isBindingOrAssignmentElement));
            }
            else {
                if (bindingElements) {
                    flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElements), value, location, pattern);
                    bindingElements = undefined;
                }
                const rhsValue = createDestructuringPropertyAccess(flattenContext, value, propertyName);
                if (isComputedPropertyName(propertyName)) {
                    computedTempVariables = append(computedTempVariables, rhsValue.argumentExpression);
                }
                flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, /*location*/ element);
            }
        }
        else if (i === numElements - 1) {
            if (bindingElements) {
                flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElements), value, location, pattern);
                bindingElements = undefined;
            }
            const rhsValue = flattenContext.context.getEmitHelperFactory().createRestHelper(value, elements, computedTempVariables, pattern);
            flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, element);
        }
    }
    if (bindingElements) {
        flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElements), value, location, pattern);
    }
}
/**
 * Flattens an ArrayBindingOrAssignmentPattern into zero or more bindings or assignments.
 *
 * @param flattenContext Options used to control flattening.
 * @param parent The parent element of the pattern.
 * @param pattern The ArrayBindingOrAssignmentPattern to flatten.
 * @param value The current RHS value to assign to the element.
 * @param location The location to use for source maps and comments.
 */
function flattenArrayBindingOrAssignmentPattern(flattenContext, parent, pattern, value, location) {
    const elements = getElementsOfBindingOrAssignmentPattern(pattern);
    const numElements = elements.length;
    if (flattenContext.level < 1 /* FlattenLevel.ObjectRest */ && flattenContext.downlevelIteration) {
        // Read the elements of the iterable into an array
        value = ensureIdentifier(flattenContext, setTextRange(flattenContext.context.getEmitHelperFactory().createReadHelper(value, numElements > 0 && getRestIndicatorOfBindingOrAssignmentElement(elements[numElements - 1])
            ? undefined
            : numElements), location), 
        /*reuseIdentifierExpressions*/ false, location);
    }
    else if (numElements !== 1 && (flattenContext.level < 1 /* FlattenLevel.ObjectRest */ || numElements === 0)
        || every(elements, isOmittedExpression)) {
        // For anything other than a single-element destructuring we need to generate a temporary
        // to ensure value is evaluated exactly once. Additionally, if we have zero elements
        // we need to emit *something* to ensure that in case a 'var' keyword was already emitted,
        // so in that case, we'll intentionally create that temporary.
        // Or all the elements of the binding pattern are omitted expression such as "var [,] = [1,2]",
        // then we will create temporary variable.
        const reuseIdentifierExpressions = !isDeclarationBindingElement(parent) || numElements !== 0;
        value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
    }
    let bindingElements;
    let restContainingElements;
    for (let i = 0; i < numElements; i++) {
        const element = elements[i];
        if (flattenContext.level >= 1 /* FlattenLevel.ObjectRest */) {
            // If an array pattern contains an ObjectRest, we must cache the result so that we
            // can perform the ObjectRest destructuring in a different declaration
            if (element.transformFlags & TransformFlags.ContainsObjectRestOrSpread || flattenContext.hasTransformedPriorElement && !isSimpleBindingOrAssignmentElement(element)) {
                flattenContext.hasTransformedPriorElement = true;
                const temp = flattenContext.context.factory.createTempVariable(/*recordTempVariable*/ undefined);
                if (flattenContext.hoistTempVariables) {
                    flattenContext.context.hoistVariableDeclaration(temp);
                }
                restContainingElements = append(restContainingElements, [temp, element]);
                bindingElements = append(bindingElements, flattenContext.createArrayBindingOrAssignmentElement(temp));
            }
            else {
                bindingElements = append(bindingElements, element);
            }
        }
        else if (isOmittedExpression(element)) {
            continue;
        }
        else if (!getRestIndicatorOfBindingOrAssignmentElement(element)) {
            const rhsValue = flattenContext.context.factory.createElementAccessExpression(value, i);
            flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, /*location*/ element);
        }
        else if (i === numElements - 1) {
            const rhsValue = flattenContext.context.factory.createArraySliceCall(value, i);
            flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, /*location*/ element);
        }
    }
    if (bindingElements) {
        flattenContext.emitBindingOrAssignment(flattenContext.createArrayBindingOrAssignmentPattern(bindingElements), value, location, pattern);
    }
    if (restContainingElements) {
        for (const [id, element] of restContainingElements) {
            flattenBindingOrAssignmentElement(flattenContext, element, id, element);
        }
    }
}
function isSimpleBindingOrAssignmentElement(element) {
    const target = getTargetOfBindingOrAssignmentElement(element);
    if (!target || isOmittedExpression(target))
        return true;
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(element);
    if (propertyName && !isPropertyNameLiteral(propertyName))
        return false;
    const initializer = getInitializerOfBindingOrAssignmentElement(element);
    if (initializer && !isSimpleInlineableExpression(initializer))
        return false;
    if (isBindingOrAssignmentPattern(target))
        return every(getElementsOfBindingOrAssignmentPattern(target), isSimpleBindingOrAssignmentElement);
    return isIdentifier(target);
}
/**
 * Creates an expression used to provide a default value if a value is `undefined` at runtime.
 *
 * @param flattenContext Options used to control flattening.
 * @param value The RHS value to test.
 * @param defaultValue The default value to use if `value` is `undefined` at runtime.
 * @param location The location to use for source maps and comments.
 */
function createDefaultValueCheck(flattenContext, value, defaultValue, location) {
    value = ensureIdentifier(flattenContext, value, /*reuseIdentifierExpressions*/ true, location);
    return flattenContext.context.factory.createConditionalExpression(flattenContext.context.factory.createTypeCheck(value, "undefined"), /*questionToken*/ undefined, defaultValue, /*colonToken*/ undefined, value);
}
/**
 * Creates either a PropertyAccessExpression or an ElementAccessExpression for the
 * right-hand side of a transformed destructuring assignment.
 *
 * @link https://tc39.github.io/ecma262/#sec-runtime-semantics-keyeddestructuringassignmentevaluation
 *
 * @param flattenContext Options used to control flattening.
 * @param value The RHS value that is the source of the property.
 * @param propertyName The destructuring property name.
 */
function createDestructuringPropertyAccess(flattenContext, value, propertyName) {
    const { factory } = flattenContext.context;
    if (isComputedPropertyName(propertyName)) {
        const argumentExpression = ensureIdentifier(flattenContext, Debug.checkDefined(visitNode(propertyName.expression, flattenContext.visitor, isExpression)), /*reuseIdentifierExpressions*/ false, /*location*/ propertyName);
        return flattenContext.context.factory.createElementAccessExpression(value, argumentExpression);
    }
    else if (isStringOrNumericLiteralLike(propertyName) || isBigIntLiteral(propertyName)) {
        const argumentExpression = factory.cloneNode(propertyName);
        return flattenContext.context.factory.createElementAccessExpression(value, argumentExpression);
    }
    else {
        const name = flattenContext.context.factory.createIdentifier(idText(propertyName));
        return flattenContext.context.factory.createPropertyAccessExpression(value, name);
    }
}
/**
 * Ensures that there exists a declared identifier whose value holds the given expression.
 * This function is useful to ensure that the expression's value can be read from in subsequent expressions.
 * Unless 'reuseIdentifierExpressions' is false, 'value' will be returned if it is just an identifier.
 *
 * @param flattenContext Options used to control flattening.
 * @param value the expression whose value needs to be bound.
 * @param reuseIdentifierExpressions true if identifier expressions can simply be returned;
 * false if it is necessary to always emit an identifier.
 * @param location The location to use for source maps and comments.
 */
function ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location) {
    if (isIdentifier(value) && reuseIdentifierExpressions) {
        return value;
    }
    else {
        const temp = flattenContext.context.factory.createTempVariable(/*recordTempVariable*/ undefined);
        if (flattenContext.hoistTempVariables) {
            flattenContext.context.hoistVariableDeclaration(temp);
            flattenContext.emitExpression(setTextRange(flattenContext.context.factory.createAssignment(temp, value), location));
        }
        else {
            flattenContext.emitBindingOrAssignment(temp, value, location, /*original*/ undefined);
        }
        return temp;
    }
}
function makeArrayBindingPattern(factory, elements) {
    Debug.assertEachNode(elements, isArrayBindingElement);
    return factory.createArrayBindingPattern(elements);
}
function makeArrayAssignmentPattern(factory, elements) {
    Debug.assertEachNode(elements, isArrayBindingOrAssignmentElement);
    return factory.createArrayLiteralExpression(map(elements, factory.converters.convertToArrayAssignmentElement));
}
function makeObjectBindingPattern(factory, elements) {
    Debug.assertEachNode(elements, isBindingElement);
    return factory.createObjectBindingPattern(elements);
}
function makeObjectAssignmentPattern(factory, elements) {
    Debug.assertEachNode(elements, isObjectBindingOrAssignmentElement);
    return factory.createObjectLiteralExpression(map(elements, factory.converters.convertToObjectAssignmentElement));
}
function makeBindingElement(factory, name) {
    return factory.createBindingElement(/*dotDotDotToken*/ undefined, /*propertyName*/ undefined, name);
}
function makeAssignmentElement(name) {
    return name;
}
