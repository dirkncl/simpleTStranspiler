import {
  addEmitFlags,
  addInternalEmitFlags,
  AssertionLevel,
  CharacterCodes,
  compareStringsCaseSensitive,
  Debug,
  EmitFlags,
  externalHelpersModuleNameText,
  filter,
  first,
  firstOrUndefined,
  GeneratedIdentifierFlags,
  getAllAccessorDeclarations,
  getEmitFlags,
  getEmitHelpers,
  getEmitModuleFormatOfFileWorker,
  getEmitModuleKind,
  getESModuleInterop,
  getExternalModuleName,
  getExternalModuleNameFromPath,
  getImpliedNodeFormatForEmitWorker,
  getJSDocType,
  getJSDocTypeTag,
  getModifiers,
  getNamespaceDeclarationNode,
  getOrCreateEmitNode,
  getOriginalNode,
  getParseTreeNode,
  getSourceTextOfNodeFromSourceFile,
  idText,
  InternalEmitFlags,
  isAssignmentExpression,
  isAssignmentOperator,
  isAssignmentPattern,
  isCommaListExpression,
  isComputedPropertyName,
  isDeclarationBindingElement,
  isDefaultImport,
  isEffectiveExternalModule,
  isExclamationToken,
  isExportNamespaceAsDefaultDeclaration,
  isFileLevelUniqueName,
  isGeneratedIdentifier,
  isGeneratedPrivateIdentifier,
  isIdentifier,
  isInJSFile,
  isMemberName,
  isMinusToken,
  isObjectLiteralElementLike,
  isParenthesizedExpression,
  isPlusToken,
  isPostfixUnaryExpression,
  isPrefixUnaryExpression,
  isPrivateIdentifier,
  isPrologueDirective,
  isPropertyAssignment,
  isPropertyName,
  isQualifiedName,
  isQuestionToken,
  isReadonlyKeyword,
  isShorthandPropertyAssignment,
  isSourceFile,
  isSpreadAssignment,
  isSpreadElement,
  isStringLiteral,
  isThisTypeNode,
  isVariableDeclarationList,
  last,
  map,
  ModuleKind,
  nodeIsSynthesized,
  OuterExpressionKinds,
  parseNodeFactory,
  pushIfUnique,
  setOriginalNode,
  setParent,
  setStartsOnNewLine,
  setTextRange,
  some,
  SyntaxKind,
  TransformFlags,
} from "../_namespaces/ts.js";

// Compound nodes
/** @internal */
export function createEmptyExports(factory) {
    return factory.createExportDeclaration(/*modifiers*/ undefined, /*isTypeOnly*/ false, factory.createNamedExports([]), /*moduleSpecifier*/ undefined);
}

/** @internal */
export function createMemberAccessForPropertyName(factory, target, memberName, location) {
    if (isComputedPropertyName(memberName)) {
        return setTextRange(factory.createElementAccessExpression(target, memberName.expression), location);
    }
    else {
        const expression = setTextRange(isMemberName(memberName)
            ? factory.createPropertyAccessExpression(target, memberName)
            : factory.createElementAccessExpression(target, memberName), memberName);
        addEmitFlags(expression, EmitFlags.NoNestedSourceMaps);
        return expression;
    }
}
function createReactNamespace(reactNamespace, parent) {
    // To ensure the emit resolver can properly resolve the namespace, we need to
    // treat this identifier as if it were a source tree node by clearing the `Synthesized`
    // flag and setting a parent node.
    const react = parseNodeFactory.createIdentifier(reactNamespace || "React");
    // Set the parent that is in parse tree
    // this makes sure that parent chain is intact for checker to traverse complete scope tree
    setParent(react, getParseTreeNode(parent));
    return react;
}
function createJsxFactoryExpressionFromEntityName(factory, jsxFactory, parent) {
    if (isQualifiedName(jsxFactory)) {
        const left = createJsxFactoryExpressionFromEntityName(factory, jsxFactory.left, parent);
        const right = factory.createIdentifier(idText(jsxFactory.right));
        right.escapedText = jsxFactory.right.escapedText;
        return factory.createPropertyAccessExpression(left, right);
    }
    else {
        return createReactNamespace(idText(jsxFactory), parent);
    }
}
/** @internal */
export function createJsxFactoryExpression(factory, jsxFactoryEntity, reactNamespace, parent) {
    return jsxFactoryEntity ?
        createJsxFactoryExpressionFromEntityName(factory, jsxFactoryEntity, parent) :
        factory.createPropertyAccessExpression(createReactNamespace(reactNamespace, parent), "createElement");
}
function createJsxFragmentFactoryExpression(factory, jsxFragmentFactoryEntity, reactNamespace, parent) {
    return jsxFragmentFactoryEntity ?
        createJsxFactoryExpressionFromEntityName(factory, jsxFragmentFactoryEntity, parent) :
        factory.createPropertyAccessExpression(createReactNamespace(reactNamespace, parent), "Fragment");
}
/** @internal */
export function createExpressionForJsxElement(factory, callee, tagName, props, children, location) {
    const argumentsList = [tagName];
    if (props) {
        argumentsList.push(props);
    }
    if (children && children.length > 0) {
        if (!props) {
            argumentsList.push(factory.createNull());
        }
        if (children.length > 1) {
            for (const child of children) {
                startOnNewLine(child);
                argumentsList.push(child);
            }
        }
        else {
            argumentsList.push(children[0]);
        }
    }
    return setTextRange(factory.createCallExpression(callee, 
    /*typeArguments*/ undefined, argumentsList), location);
}
/** @internal */
export function createExpressionForJsxFragment(factory, jsxFactoryEntity, jsxFragmentFactoryEntity, reactNamespace, children, parentElement, location) {
    const tagName = createJsxFragmentFactoryExpression(factory, jsxFragmentFactoryEntity, reactNamespace, parentElement);
    const argumentsList = [tagName, factory.createNull()];
    if (children && children.length > 0) {
        if (children.length > 1) {
            for (const child of children) {
                startOnNewLine(child);
                argumentsList.push(child);
            }
        }
        else {
            argumentsList.push(children[0]);
        }
    }
    return setTextRange(factory.createCallExpression(createJsxFactoryExpression(factory, jsxFactoryEntity, reactNamespace, parentElement), 
    /*typeArguments*/ undefined, argumentsList), location);
}
// Utilities
/** @internal */
export function createForOfBindingStatement(factory, node, boundValue) {
    if (isVariableDeclarationList(node)) {
        const firstDeclaration = first(node.declarations);
        const updatedDeclaration = factory.updateVariableDeclaration(firstDeclaration, firstDeclaration.name, 
        /*exclamationToken*/ undefined, 
        /*type*/ undefined, boundValue);
        return setTextRange(factory.createVariableStatement(
        /*modifiers*/ undefined, factory.updateVariableDeclarationList(node, [updatedDeclaration])), 
        /*location*/ node);
    }
    else {
        const updatedExpression = setTextRange(factory.createAssignment(node, boundValue), /*location*/ node);
        return setTextRange(factory.createExpressionStatement(updatedExpression), /*location*/ node);
    }
}
/** @internal */
export function createExpressionFromEntityName(factory, node) {
    if (isQualifiedName(node)) {
        const left = createExpressionFromEntityName(factory, node.left);
        // TODO(rbuckton): Does this need to be parented?
        const right = setParent(setTextRange(factory.cloneNode(node.right), node.right), node.right.parent);
        return setTextRange(factory.createPropertyAccessExpression(left, right), node);
    }
    else {
        // TODO(rbuckton): Does this need to be parented?
        return setParent(setTextRange(factory.cloneNode(node), node), node.parent);
    }
}
/** @internal */
export function createExpressionForPropertyName(factory, memberName) {
    if (isIdentifier(memberName)) {
        return factory.createStringLiteralFromNode(memberName);
    }
    else if (isComputedPropertyName(memberName)) {
        // TODO(rbuckton): Does this need to be parented?
        return setParent(setTextRange(factory.cloneNode(memberName.expression), memberName.expression), memberName.expression.parent);
    }
    else {
        // TODO(rbuckton): Does this need to be parented?
        return setParent(setTextRange(factory.cloneNode(memberName), memberName), memberName.parent);
    }
}
function createExpressionForAccessorDeclaration(factory, properties, property, receiver, multiLine) {
    const { firstAccessor, getAccessor, setAccessor } = getAllAccessorDeclarations(properties, property);
    if (property === firstAccessor) {
        return setTextRange(factory.createObjectDefinePropertyCall(receiver, createExpressionForPropertyName(factory, property.name), factory.createPropertyDescriptor({
            enumerable: factory.createFalse(),
            configurable: true,
            get: getAccessor && setTextRange(setOriginalNode(factory.createFunctionExpression(getModifiers(getAccessor), 
            /*asteriskToken*/ undefined, 
            /*name*/ undefined, 
            /*typeParameters*/ undefined, getAccessor.parameters, 
            /*type*/ undefined, getAccessor.body), getAccessor), getAccessor),
            set: setAccessor && setTextRange(setOriginalNode(factory.createFunctionExpression(getModifiers(setAccessor), 
            /*asteriskToken*/ undefined, 
            /*name*/ undefined, 
            /*typeParameters*/ undefined, setAccessor.parameters, 
            /*type*/ undefined, setAccessor.body), setAccessor), setAccessor),
        }, !multiLine)), firstAccessor);
    }
    return undefined;
}
function createExpressionForPropertyAssignment(factory, property, receiver) {
    return setOriginalNode(setTextRange(factory.createAssignment(createMemberAccessForPropertyName(factory, receiver, property.name, /*location*/ property.name), property.initializer), property), property);
}
function createExpressionForShorthandPropertyAssignment(factory, property, receiver) {
    return setOriginalNode(setTextRange(factory.createAssignment(createMemberAccessForPropertyName(factory, receiver, property.name, /*location*/ property.name), factory.cloneNode(property.name)), 
    /*location*/ property), 
    /*original*/ property);
}
function createExpressionForMethodDeclaration(factory, method, receiver) {
    return setOriginalNode(setTextRange(factory.createAssignment(createMemberAccessForPropertyName(factory, receiver, method.name, /*location*/ method.name), setOriginalNode(setTextRange(factory.createFunctionExpression(getModifiers(method), method.asteriskToken, 
    /*name*/ undefined, 
    /*typeParameters*/ undefined, method.parameters, 
    /*type*/ undefined, method.body), 
    /*location*/ method), 
    /*original*/ method)), 
    /*location*/ method), 
    /*original*/ method);
}
/** @internal */
export function createExpressionForObjectLiteralElementLike(factory, node, property, receiver) {
    if (property.name && isPrivateIdentifier(property.name)) {
        Debug.failBadSyntaxKind(property.name, "Private identifiers are not allowed in object literals.");
    }
    switch (property.kind) {
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
            return createExpressionForAccessorDeclaration(factory, node.properties, property, receiver, !!node.multiLine);
        case SyntaxKind.PropertyAssignment:
            return createExpressionForPropertyAssignment(factory, property, receiver);
        case SyntaxKind.ShorthandPropertyAssignment:
            return createExpressionForShorthandPropertyAssignment(factory, property, receiver);
        case SyntaxKind.MethodDeclaration:
            return createExpressionForMethodDeclaration(factory, property, receiver);
    }
}
/**
 * Expand the read and increment/decrement operations a pre- or post-increment or pre- or post-decrement expression.
 *
 * ```ts
 * // input
 * <expression>++
 * // output (if result is not discarded)
 * var <temp>;
 * (<temp> = <expression>, <resultVariable> = <temp>++, <temp>)
 * // output (if result is discarded)
 * var <temp>;
 * (<temp> = <expression>, <temp>++, <temp>)
 *
 * // input
 * ++<expression>
 * // output (if result is not discarded)
 * var <temp>;
 * (<temp> = <expression>, <resultVariable> = ++<temp>)
 * // output (if result is discarded)
 * var <temp>;
 * (<temp> = <expression>, ++<temp>)
 * ```
 *
 * It is up to the caller to supply a temporary variable for `<resultVariable>` if one is needed.
 * The temporary variable `<temp>` is injected so that `++` and `--` work uniformly with `number` and `bigint`.
 * The result of the expression is always the final result of incrementing or decrementing the expression, so that it can be used for storage.
 *
 * @param factory {@link NodeFactory} used to create the expanded representation.
 * @param node The original prefix or postfix unary node.
 * @param expression The expression to use as the value to increment or decrement
 * @param resultVariable A temporary variable in which to store the result. Pass `undefined` if the result is discarded, or if the value of `<temp>` is the expected result.
 *
 * @internal
 */
export function expandPreOrPostfixIncrementOrDecrementExpression(factory, node, expression, recordTempVariable, resultVariable) {
    const operator = node.operator;
    Debug.assert(operator === SyntaxKind.PlusPlusToken || operator === SyntaxKind.MinusMinusToken, "Expected 'node' to be a pre- or post-increment or pre- or post-decrement expression");
    const temp = factory.createTempVariable(recordTempVariable);
    expression = factory.createAssignment(temp, expression);
    setTextRange(expression, node.operand);
    let operation = isPrefixUnaryExpression(node) ?
        factory.createPrefixUnaryExpression(operator, temp) :
        factory.createPostfixUnaryExpression(temp, operator);
    setTextRange(operation, node);
    if (resultVariable) {
        operation = factory.createAssignment(resultVariable, operation);
        setTextRange(operation, node);
    }
    expression = factory.createComma(expression, operation);
    setTextRange(expression, node);
    if (isPostfixUnaryExpression(node)) {
        expression = factory.createComma(expression, temp);
        setTextRange(expression, node);
    }
    return expression;
}
/**
 * Gets whether an identifier should only be referred to by its internal name.
 *
 * @internal
 */
export function isInternalName(node) {
    return (getEmitFlags(node) & EmitFlags.InternalName) !== 0;
}
/**
 * Gets whether an identifier should only be referred to by its local name.
 *
 * @internal
 */
export function isLocalName(node) {
    return (getEmitFlags(node) & EmitFlags.LocalName) !== 0;
}
/**
 * Gets whether an identifier should only be referred to by its export representation if the
 * name points to an exported symbol.
 *
 * @internal
 */
export function isExportName(node) {
    return (getEmitFlags(node) & EmitFlags.ExportName) !== 0;
}
function isUseStrictPrologue(node) {
    return isStringLiteral(node.expression) && node.expression.text === "use strict";
}
/** @internal */
export function findUseStrictPrologue(statements) {
    for (const statement of statements) {
        if (isPrologueDirective(statement)) {
            if (isUseStrictPrologue(statement)) {
                return statement;
            }
        }
        else {
            break;
        }
    }
    return undefined;
}
/** @internal */
export function startsWithUseStrict(statements) {
    const firstStatement = firstOrUndefined(statements);
    return firstStatement !== undefined
        && isPrologueDirective(firstStatement)
        && isUseStrictPrologue(firstStatement);
}
/** @internal */
export function isCommaExpression(node) {
    return node.kind === SyntaxKind.BinaryExpression && node.operatorToken.kind === SyntaxKind.CommaToken;
}
/** @internal */
export function isCommaSequence(node) {
    return isCommaExpression(node) || isCommaListExpression(node);
}
/** @internal */
export function isJSDocTypeAssertion(node) {
    return isParenthesizedExpression(node)
        && isInJSFile(node)
        && !!getJSDocTypeTag(node);
}
/** @internal */
export function getJSDocTypeAssertionType(node) {
    const type = getJSDocType(node);
    Debug.assertIsDefined(type);
    return type;
}
/** @internal */
export function isOuterExpression(node, kinds = OuterExpressionKinds.All) {
    switch (node.kind) {
        case SyntaxKind.ParenthesizedExpression:
            if (kinds & OuterExpressionKinds.ExcludeJSDocTypeAssertion && isJSDocTypeAssertion(node)) {
                return false;
            }
            return (kinds & OuterExpressionKinds.Parentheses) !== 0;
        case SyntaxKind.TypeAssertionExpression:
        case SyntaxKind.AsExpression:
            return (kinds & OuterExpressionKinds.TypeAssertions) !== 0;
        case SyntaxKind.SatisfiesExpression:
            return (kinds & (OuterExpressionKinds.TypeAssertions | OuterExpressionKinds.Satisfies)) !== 0;
        case SyntaxKind.ExpressionWithTypeArguments:
            return (kinds & OuterExpressionKinds.ExpressionsWithTypeArguments) !== 0;
        case SyntaxKind.NonNullExpression:
            return (kinds & OuterExpressionKinds.NonNullAssertions) !== 0;
        case SyntaxKind.PartiallyEmittedExpression:
            return (kinds & OuterExpressionKinds.PartiallyEmittedExpressions) !== 0;
    }
    return false;
}
/** @internal */
export function skipOuterExpressions(node, kinds = OuterExpressionKinds.All) {
    while (isOuterExpression(node, kinds)) {
        node = node.expression;
    }
    return node;
}
/** @internal */
export function walkUpOuterExpressions(node, kinds = OuterExpressionKinds.All) {
    let parent = node.parent;
    while (isOuterExpression(parent, kinds)) {
        parent = parent.parent;
        Debug.assert(parent);
    }
    return parent;
}
/** @internal */
export function startOnNewLine(node) {
    return setStartsOnNewLine(node, /*newLine*/ true);
}
/** @internal */
export function getExternalHelpersModuleName(node) {
    const parseNode = getOriginalNode(node, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return emitNode && emitNode.externalHelpersModuleName;
}
/** @internal */
export function hasRecordedExternalHelpers(sourceFile) {
    const parseNode = getOriginalNode(sourceFile, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return !!emitNode && (!!emitNode.externalHelpersModuleName || !!emitNode.externalHelpers);
}
/** @internal */
export function createExternalHelpersImportDeclarationIfNeeded(nodeFactory, helperFactory, sourceFile, compilerOptions, hasExportStarsToExportValues, hasImportStar, hasImportDefault) {
    if (compilerOptions.importHelpers && isEffectiveExternalModule(sourceFile, compilerOptions)) {
        const moduleKind = getEmitModuleKind(compilerOptions);
        const impliedModuleKind = getImpliedNodeFormatForEmitWorker(sourceFile, compilerOptions);
        const helpers = getImportedHelpers(sourceFile);
        if ((moduleKind >= ModuleKind.ES2015 && moduleKind <= ModuleKind.ESNext) ||
            impliedModuleKind === ModuleKind.ESNext ||
            impliedModuleKind === undefined && moduleKind === ModuleKind.Preserve) {
            // When we emit as an ES module, generate an `import` declaration that uses named imports for helpers.
            // If we cannot determine the implied module kind under `module: preserve` we assume ESM.
            if (helpers) {
                const helperNames = [];
                for (const helper of helpers) {
                    const importName = helper.importName;
                    if (importName) {
                        pushIfUnique(helperNames, importName);
                    }
                }
                if (some(helperNames)) {
                    helperNames.sort(compareStringsCaseSensitive);
                    // Alias the imports if the names are used somewhere in the file.
                    // NOTE: We don't need to care about global import collisions as this is a module.
                    const namedBindings = nodeFactory.createNamedImports(map(helperNames, name => isFileLevelUniqueName(sourceFile, name)
                        ? nodeFactory.createImportSpecifier(/*isTypeOnly*/ false, /*propertyName*/ undefined, nodeFactory.createIdentifier(name))
                        : nodeFactory.createImportSpecifier(/*isTypeOnly*/ false, nodeFactory.createIdentifier(name), helperFactory.getUnscopedHelperName(name))));
                    const parseNode = getOriginalNode(sourceFile, isSourceFile);
                    const emitNode = getOrCreateEmitNode(parseNode);
                    emitNode.externalHelpers = true;
                    const externalHelpersImportDeclaration = nodeFactory.createImportDeclaration(
                    /*modifiers*/ undefined, nodeFactory.createImportClause(/*isTypeOnly*/ false, /*name*/ undefined, namedBindings), nodeFactory.createStringLiteral(externalHelpersModuleNameText), 
                    /*attributes*/ undefined);
                    addInternalEmitFlags(externalHelpersImportDeclaration, InternalEmitFlags.NeverApplyImportHelper);
                    return externalHelpersImportDeclaration;
                }
            }
        }
        else {
            // When we emit to a non-ES module, generate a synthetic `import tslib = require("tslib")` to be further transformed.
            const externalHelpersModuleName = getOrCreateExternalHelpersModuleNameIfNeeded(nodeFactory, sourceFile, compilerOptions, helpers, hasExportStarsToExportValues, hasImportStar || hasImportDefault);
            if (externalHelpersModuleName) {
                const externalHelpersImportDeclaration = nodeFactory.createImportEqualsDeclaration(
                /*modifiers*/ undefined, 
                /*isTypeOnly*/ false, externalHelpersModuleName, nodeFactory.createExternalModuleReference(nodeFactory.createStringLiteral(externalHelpersModuleNameText)));
                addInternalEmitFlags(externalHelpersImportDeclaration, InternalEmitFlags.NeverApplyImportHelper);
                return externalHelpersImportDeclaration;
            }
        }
    }
}
function getImportedHelpers(sourceFile) {
    return filter(getEmitHelpers(sourceFile), helper => !helper.scoped);
}
function getOrCreateExternalHelpersModuleNameIfNeeded(factory, node, compilerOptions, helpers, hasExportStarsToExportValues, hasImportStarOrImportDefault) {
    const externalHelpersModuleName = getExternalHelpersModuleName(node);
    if (externalHelpersModuleName) {
        return externalHelpersModuleName;
    }
    const create = some(helpers)
        || (hasExportStarsToExportValues || (getESModuleInterop(compilerOptions) && hasImportStarOrImportDefault))
            && getEmitModuleFormatOfFileWorker(node, compilerOptions) < ModuleKind.System;
    if (create) {
        const parseNode = getOriginalNode(node, isSourceFile);
        const emitNode = getOrCreateEmitNode(parseNode);
        return emitNode.externalHelpersModuleName || (emitNode.externalHelpersModuleName = factory.createUniqueName(externalHelpersModuleNameText));
    }
}
/**
 * Get the name of that target module from an import or export declaration
 *
 * @internal
 */
export function getLocalNameForExternalImport(factory, node, sourceFile) {
    const namespaceDeclaration = getNamespaceDeclarationNode(node);
    if (namespaceDeclaration && !isDefaultImport(node) && !isExportNamespaceAsDefaultDeclaration(node)) {
        const name = namespaceDeclaration.name;
        if (name.kind === SyntaxKind.StringLiteral) {
            return factory.getGeneratedNameForNode(node);
        }
        return isGeneratedIdentifier(name) ? name : factory.createIdentifier(getSourceTextOfNodeFromSourceFile(sourceFile, name) || idText(name));
    }
    if (node.kind === SyntaxKind.ImportDeclaration && node.importClause) {
        return factory.getGeneratedNameForNode(node);
    }
    if (node.kind === SyntaxKind.ExportDeclaration && node.moduleSpecifier) {
        return factory.getGeneratedNameForNode(node);
    }
    return undefined;
}
/**
 * Get the name of a target module from an import/export declaration as should be written in the emitted output.
 * The emitted output name can be different from the input if:
 *  1. The module has a /// <amd-module name="<new name>" />
 *  2. --out or --outFile is used, making the name relative to the rootDir
 *  3- The containing SourceFile has an entry in renamedDependencies for the import as requested by some module loaders (e.g. System).
 * Otherwise, a new StringLiteral node representing the module name will be returned.
 *
 * @internal
 */
export function getExternalModuleNameLiteral(factory, importNode, sourceFile, host, resolver, compilerOptions) {
    const moduleName = getExternalModuleName(importNode);
    if (moduleName && isStringLiteral(moduleName)) {
        return tryGetModuleNameFromDeclaration(importNode, host, factory, resolver, compilerOptions)
            || tryRenameExternalModule(factory, moduleName, sourceFile)
            || factory.cloneNode(moduleName);
    }
    return undefined;
}
/**
 * Some bundlers (SystemJS builder) sometimes want to rename dependencies.
 * Here we check if alternative name was provided for a given moduleName and return it if possible.
 */
function tryRenameExternalModule(factory, moduleName, sourceFile) {
    const rename = sourceFile.renamedDependencies && sourceFile.renamedDependencies.get(moduleName.text);
    return rename ? factory.createStringLiteral(rename) : undefined;
}
/**
 * Get the name of a module as should be written in the emitted output.
 * The emitted output name can be different from the input if:
 *  1. The module has a /// <amd-module name="<new name>" />
 *  2. --out or --outFile is used, making the name relative to the rootDir
 * Otherwise, a new StringLiteral node representing the module name will be returned.
 *
 * @internal
 */
export function tryGetModuleNameFromFile(factory, file, host, options) {
    if (!file) {
        return undefined;
    }
    if (file.moduleName) {
        return factory.createStringLiteral(file.moduleName);
    }
    if (!file.isDeclarationFile && options.outFile) {
        return factory.createStringLiteral(getExternalModuleNameFromPath(host, file.fileName));
    }
    return undefined;
}
function tryGetModuleNameFromDeclaration(declaration, host, factory, resolver, compilerOptions) {
    return tryGetModuleNameFromFile(factory, resolver.getExternalModuleFileFromDeclaration(declaration), host, compilerOptions);
}
/**
 * Gets the initializer of an BindingOrAssignmentElement.
 *
 * @internal
 */
export function getInitializerOfBindingOrAssignmentElement(bindingElement) {
    if (isDeclarationBindingElement(bindingElement)) {
        // `1` in `let { a = 1 } = ...`
        // `1` in `let { a: b = 1 } = ...`
        // `1` in `let { a: {b} = 1 } = ...`
        // `1` in `let { a: [b] = 1 } = ...`
        // `1` in `let [a = 1] = ...`
        // `1` in `let [{a} = 1] = ...`
        // `1` in `let [[a] = 1] = ...`
        return bindingElement.initializer;
    }
    if (isPropertyAssignment(bindingElement)) {
        // `1` in `({ a: b = 1 } = ...)`
        // `1` in `({ a: {b} = 1 } = ...)`
        // `1` in `({ a: [b] = 1 } = ...)`
        const initializer = bindingElement.initializer;
        return isAssignmentExpression(initializer, /*excludeCompoundAssignment*/ true)
            ? initializer.right
            : undefined;
    }
    if (isShorthandPropertyAssignment(bindingElement)) {
        // `1` in `({ a = 1 } = ...)`
        return bindingElement.objectAssignmentInitializer;
    }
    if (isAssignmentExpression(bindingElement, /*excludeCompoundAssignment*/ true)) {
        // `1` in `[a = 1] = ...`
        // `1` in `[{a} = 1] = ...`
        // `1` in `[[a] = 1] = ...`
        return bindingElement.right;
    }
    if (isSpreadElement(bindingElement)) {
        // Recovery consistent with existing emit.
        return getInitializerOfBindingOrAssignmentElement(bindingElement.expression);
    }
}
/**
 * Gets the name of an BindingOrAssignmentElement.
 *
 * @internal
 */
export function getTargetOfBindingOrAssignmentElement(bindingElement) {
    if (isDeclarationBindingElement(bindingElement)) {
        // `a` in `let { a } = ...`
        // `a` in `let { a = 1 } = ...`
        // `b` in `let { a: b } = ...`
        // `b` in `let { a: b = 1 } = ...`
        // `a` in `let { ...a } = ...`
        // `{b}` in `let { a: {b} } = ...`
        // `{b}` in `let { a: {b} = 1 } = ...`
        // `[b]` in `let { a: [b] } = ...`
        // `[b]` in `let { a: [b] = 1 } = ...`
        // `a` in `let [a] = ...`
        // `a` in `let [a = 1] = ...`
        // `a` in `let [...a] = ...`
        // `{a}` in `let [{a}] = ...`
        // `{a}` in `let [{a} = 1] = ...`
        // `[a]` in `let [[a]] = ...`
        // `[a]` in `let [[a] = 1] = ...`
        return bindingElement.name;
    }
    if (isObjectLiteralElementLike(bindingElement)) {
        switch (bindingElement.kind) {
            case SyntaxKind.PropertyAssignment:
                // `b` in `({ a: b } = ...)`
                // `b` in `({ a: b = 1 } = ...)`
                // `{b}` in `({ a: {b} } = ...)`
                // `{b}` in `({ a: {b} = 1 } = ...)`
                // `[b]` in `({ a: [b] } = ...)`
                // `[b]` in `({ a: [b] = 1 } = ...)`
                // `b.c` in `({ a: b.c } = ...)`
                // `b.c` in `({ a: b.c = 1 } = ...)`
                // `b[0]` in `({ a: b[0] } = ...)`
                // `b[0]` in `({ a: b[0] = 1 } = ...)`
                return getTargetOfBindingOrAssignmentElement(bindingElement.initializer);
            case SyntaxKind.ShorthandPropertyAssignment:
                // `a` in `({ a } = ...)`
                // `a` in `({ a = 1 } = ...)`
                return bindingElement.name;
            case SyntaxKind.SpreadAssignment:
                // `a` in `({ ...a } = ...)`
                return getTargetOfBindingOrAssignmentElement(bindingElement.expression);
        }
        // no target
        return undefined;
    }
    if (isAssignmentExpression(bindingElement, /*excludeCompoundAssignment*/ true)) {
        // `a` in `[a = 1] = ...`
        // `{a}` in `[{a} = 1] = ...`
        // `[a]` in `[[a] = 1] = ...`
        // `a.b` in `[a.b = 1] = ...`
        // `a[0]` in `[a[0] = 1] = ...`
        return getTargetOfBindingOrAssignmentElement(bindingElement.left);
    }
    if (isSpreadElement(bindingElement)) {
        // `a` in `[...a] = ...`
        return getTargetOfBindingOrAssignmentElement(bindingElement.expression);
    }
    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return bindingElement;
}
/**
 * Determines whether an BindingOrAssignmentElement is a rest element.
 *
 * @internal
 */
export function getRestIndicatorOfBindingOrAssignmentElement(bindingElement) {
    switch (bindingElement.kind) {
        case SyntaxKind.Parameter:
        case SyntaxKind.BindingElement:
            // `...` in `let [...a] = ...`
            return bindingElement.dotDotDotToken;
        case SyntaxKind.SpreadElement:
        case SyntaxKind.SpreadAssignment:
            // `...` in `[...a] = ...`
            return bindingElement;
    }
    return undefined;
}
/**
 * Gets the property name of a BindingOrAssignmentElement
 *
 * @internal
 */
export function getPropertyNameOfBindingOrAssignmentElement(bindingElement) {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement);
    Debug.assert(!!propertyName || isSpreadAssignment(bindingElement), "Invalid property name for binding element.");
    return propertyName;
}
/** @internal */
export function tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement) {
    switch (bindingElement.kind) {
        case SyntaxKind.BindingElement:
            // `a` in `let { a: b } = ...`
            // `[a]` in `let { [a]: b } = ...`
            // `"a"` in `let { "a": b } = ...`
            // `1` in `let { 1: b } = ...`
            if (bindingElement.propertyName) {
                const propertyName = bindingElement.propertyName;
                if (isPrivateIdentifier(propertyName)) {
                    return Debug.failBadSyntaxKind(propertyName);
                }
                return isComputedPropertyName(propertyName) && isStringOrNumericLiteral(propertyName.expression)
                    ? propertyName.expression
                    : propertyName;
            }
            break;
        case SyntaxKind.PropertyAssignment:
            // `a` in `({ a: b } = ...)`
            // `[a]` in `({ [a]: b } = ...)`
            // `"a"` in `({ "a": b } = ...)`
            // `1` in `({ 1: b } = ...)`
            if (bindingElement.name) {
                const propertyName = bindingElement.name;
                if (isPrivateIdentifier(propertyName)) {
                    return Debug.failBadSyntaxKind(propertyName);
                }
                return isComputedPropertyName(propertyName) && isStringOrNumericLiteral(propertyName.expression)
                    ? propertyName.expression
                    : propertyName;
            }
            break;
        case SyntaxKind.SpreadAssignment:
            // `a` in `({ ...a } = ...)`
            if (bindingElement.name && isPrivateIdentifier(bindingElement.name)) {
                return Debug.failBadSyntaxKind(bindingElement.name);
            }
            return bindingElement.name;
    }
    const target = getTargetOfBindingOrAssignmentElement(bindingElement);
    if (target && isPropertyName(target)) {
        return target;
    }
}
function isStringOrNumericLiteral(node) {
    const kind = node.kind;
    return kind === SyntaxKind.StringLiteral
        || kind === SyntaxKind.NumericLiteral;
}
/**
 * Gets the elements of a BindingOrAssignmentPattern
 *
 * @internal
 */
export function getElementsOfBindingOrAssignmentPattern(name) {
    switch (name.kind) {
        case SyntaxKind.ObjectBindingPattern:
        case SyntaxKind.ArrayBindingPattern:
        case SyntaxKind.ArrayLiteralExpression:
            // `a` in `{a}`
            // `a` in `[a]`
            return name.elements;
        case SyntaxKind.ObjectLiteralExpression:
            // `a` in `{a}`
            return name.properties;
    }
}
/** @internal */
export function getJSDocTypeAliasName(fullName) {
    if (fullName) {
        let rightNode = fullName;
        while (true) {
            if (isIdentifier(rightNode) || !rightNode.body) {
                return isIdentifier(rightNode) ? rightNode : rightNode.name;
            }
            rightNode = rightNode.body;
        }
    }
}
/** @internal @knipignore */
export function canHaveIllegalType(node) {
    const kind = node.kind;
    return kind === SyntaxKind.Constructor
        || kind === SyntaxKind.SetAccessor;
}
/** @internal */
export function canHaveIllegalTypeParameters(node) {
    const kind = node.kind;
    return kind === SyntaxKind.Constructor
        || kind === SyntaxKind.GetAccessor
        || kind === SyntaxKind.SetAccessor;
}
/** @internal */
export function canHaveIllegalDecorators(node) {
    const kind = node.kind;
    return kind === SyntaxKind.PropertyAssignment
        || kind === SyntaxKind.ShorthandPropertyAssignment
        || kind === SyntaxKind.FunctionDeclaration
        || kind === SyntaxKind.Constructor
        || kind === SyntaxKind.IndexSignature
        || kind === SyntaxKind.ClassStaticBlockDeclaration
        || kind === SyntaxKind.MissingDeclaration
        || kind === SyntaxKind.VariableStatement
        || kind === SyntaxKind.InterfaceDeclaration
        || kind === SyntaxKind.TypeAliasDeclaration
        || kind === SyntaxKind.EnumDeclaration
        || kind === SyntaxKind.ModuleDeclaration
        || kind === SyntaxKind.ImportEqualsDeclaration
        || kind === SyntaxKind.ImportDeclaration
        || kind === SyntaxKind.NamespaceExportDeclaration
        || kind === SyntaxKind.ExportDeclaration
        || kind === SyntaxKind.ExportAssignment;
}
/** @internal */
export function canHaveIllegalModifiers(node) {
    const kind = node.kind;
    return kind === SyntaxKind.ClassStaticBlockDeclaration
        || kind === SyntaxKind.PropertyAssignment
        || kind === SyntaxKind.ShorthandPropertyAssignment
        || kind === SyntaxKind.MissingDeclaration
        || kind === SyntaxKind.NamespaceExportDeclaration;
}
export function isQuestionOrExclamationToken(node) {
    return isQuestionToken(node) || isExclamationToken(node);
}
export function isIdentifierOrThisTypeNode(node) {
    return isIdentifier(node) || isThisTypeNode(node);
}
export function isReadonlyKeywordOrPlusOrMinusToken(node) {
    return isReadonlyKeyword(node) || isPlusToken(node) || isMinusToken(node);
}
export function isQuestionOrPlusOrMinusToken(node) {
    return isQuestionToken(node) || isPlusToken(node) || isMinusToken(node);
}
export function isModuleName(node) {
    return isIdentifier(node) || isStringLiteral(node);
}
function isExponentiationOperator(kind) {
    return kind === SyntaxKind.AsteriskAsteriskToken;
}
function isMultiplicativeOperator(kind) {
    return kind === SyntaxKind.AsteriskToken
        || kind === SyntaxKind.SlashToken
        || kind === SyntaxKind.PercentToken;
}
function isMultiplicativeOperatorOrHigher(kind) {
    return isExponentiationOperator(kind)
        || isMultiplicativeOperator(kind);
}
function isAdditiveOperator(kind) {
    return kind === SyntaxKind.PlusToken
        || kind === SyntaxKind.MinusToken;
}
function isAdditiveOperatorOrHigher(kind) {
    return isAdditiveOperator(kind)
        || isMultiplicativeOperatorOrHigher(kind);
}
function isShiftOperator(kind) {
    return kind === SyntaxKind.LessThanLessThanToken
        || kind === SyntaxKind.GreaterThanGreaterThanToken
        || kind === SyntaxKind.GreaterThanGreaterThanGreaterThanToken;
}
/** @internal */
export function isShiftOperatorOrHigher(kind) {
    return isShiftOperator(kind)
        || isAdditiveOperatorOrHigher(kind);
}
function isRelationalOperator(kind) {
    return kind === SyntaxKind.LessThanToken
        || kind === SyntaxKind.LessThanEqualsToken
        || kind === SyntaxKind.GreaterThanToken
        || kind === SyntaxKind.GreaterThanEqualsToken
        || kind === SyntaxKind.InstanceOfKeyword
        || kind === SyntaxKind.InKeyword;
}
function isRelationalOperatorOrHigher(kind) {
    return isRelationalOperator(kind)
        || isShiftOperatorOrHigher(kind);
}
function isEqualityOperator(kind) {
    return kind === SyntaxKind.EqualsEqualsToken
        || kind === SyntaxKind.EqualsEqualsEqualsToken
        || kind === SyntaxKind.ExclamationEqualsToken
        || kind === SyntaxKind.ExclamationEqualsEqualsToken;
}
function isEqualityOperatorOrHigher(kind) {
    return isEqualityOperator(kind)
        || isRelationalOperatorOrHigher(kind);
}
function isBitwiseOperator(kind) {
    return kind === SyntaxKind.AmpersandToken
        || kind === SyntaxKind.BarToken
        || kind === SyntaxKind.CaretToken;
}
function isBitwiseOperatorOrHigher(kind) {
    return isBitwiseOperator(kind)
        || isEqualityOperatorOrHigher(kind);
}
// NOTE: The version in utilities includes ExclamationToken, which is not a binary operator.
function isLogicalOperator(kind) {
    return kind === SyntaxKind.AmpersandAmpersandToken
        || kind === SyntaxKind.BarBarToken;
}
function isLogicalOperatorOrHigher(kind) {
    return isLogicalOperator(kind)
        || isBitwiseOperatorOrHigher(kind);
}
function isAssignmentOperatorOrHigher(kind) {
    return kind === SyntaxKind.QuestionQuestionToken
        || isLogicalOperatorOrHigher(kind)
        || isAssignmentOperator(kind);
}
function isBinaryOperator(kind) {
    return isAssignmentOperatorOrHigher(kind)
        || kind === SyntaxKind.CommaToken;
}
export function isBinaryOperatorToken(node) {
    return isBinaryOperator(node.kind);
}
var BinaryExpressionState;
(function (BinaryExpressionState) {
    /**
     * Handles walking into a `BinaryExpression`.
     * @param machine State machine handler functions
     * @param frame The current frame
     * @returns The new frame
     */
    function enter(machine, stackIndex, stateStack, nodeStack, userStateStack, _resultHolder, outerState) {
        const prevUserState = stackIndex > 0 ? userStateStack[stackIndex - 1] : undefined;
        Debug.assertEqual(stateStack[stackIndex], enter);
        userStateStack[stackIndex] = machine.onEnter(nodeStack[stackIndex], prevUserState, outerState);
        stateStack[stackIndex] = nextState(machine, enter);
        return stackIndex;
    }
    BinaryExpressionState.enter = enter;
    /**
     * Handles walking the `left` side of a `BinaryExpression`.
     * @param machine State machine handler functions
     * @param frame The current frame
     * @returns The new frame
     */
    function left(machine, stackIndex, stateStack, nodeStack, userStateStack, _resultHolder, _outerState) {
        Debug.assertEqual(stateStack[stackIndex], left);
        Debug.assertIsDefined(machine.onLeft);
        stateStack[stackIndex] = nextState(machine, left);
        const nextNode = machine.onLeft(nodeStack[stackIndex].left, userStateStack[stackIndex], nodeStack[stackIndex]);
        if (nextNode) {
            checkCircularity(stackIndex, nodeStack, nextNode);
            return pushStack(stackIndex, stateStack, nodeStack, userStateStack, nextNode);
        }
        return stackIndex;
    }
    BinaryExpressionState.left = left;
    /**
     * Handles walking the `operatorToken` of a `BinaryExpression`.
     * @param machine State machine handler functions
     * @param frame The current frame
     * @returns The new frame
     */
    function operator(machine, stackIndex, stateStack, nodeStack, userStateStack, _resultHolder, _outerState) {
        Debug.assertEqual(stateStack[stackIndex], operator);
        Debug.assertIsDefined(machine.onOperator);
        stateStack[stackIndex] = nextState(machine, operator);
        machine.onOperator(nodeStack[stackIndex].operatorToken, userStateStack[stackIndex], nodeStack[stackIndex]);
        return stackIndex;
    }
    BinaryExpressionState.operator = operator;
    /**
     * Handles walking the `right` side of a `BinaryExpression`.
     * @param machine State machine handler functions
     * @param frame The current frame
     * @returns The new frame
     */
    function right(machine, stackIndex, stateStack, nodeStack, userStateStack, _resultHolder, _outerState) {
        Debug.assertEqual(stateStack[stackIndex], right);
        Debug.assertIsDefined(machine.onRight);
        stateStack[stackIndex] = nextState(machine, right);
        const nextNode = machine.onRight(nodeStack[stackIndex].right, userStateStack[stackIndex], nodeStack[stackIndex]);
        if (nextNode) {
            checkCircularity(stackIndex, nodeStack, nextNode);
            return pushStack(stackIndex, stateStack, nodeStack, userStateStack, nextNode);
        }
        return stackIndex;
    }
    BinaryExpressionState.right = right;
    /**
     * Handles walking out of a `BinaryExpression`.
     * @param machine State machine handler functions
     * @param frame The current frame
     * @returns The new frame
     */
    function exit(machine, stackIndex, stateStack, nodeStack, userStateStack, resultHolder, _outerState) {
        Debug.assertEqual(stateStack[stackIndex], exit);
        stateStack[stackIndex] = nextState(machine, exit);
        const result = machine.onExit(nodeStack[stackIndex], userStateStack[stackIndex]);
        if (stackIndex > 0) {
            stackIndex--;
            if (machine.foldState) {
                const side = stateStack[stackIndex] === exit ? "right" : "left";
                userStateStack[stackIndex] = machine.foldState(userStateStack[stackIndex], result, side);
            }
        }
        else {
            resultHolder.value = result;
        }
        return stackIndex;
    }
    BinaryExpressionState.exit = exit;
    /**
     * Handles a frame that is already done.
     * @returns The `done` state.
     */
    function done(_machine, stackIndex, stateStack, _nodeStack, _userStateStack, _resultHolder, _outerState) {
        Debug.assertEqual(stateStack[stackIndex], done);
        return stackIndex;
    }
    BinaryExpressionState.done = done;
    function nextState(machine, currentState) {
        switch (currentState) {
            case enter:
                if (machine.onLeft)
                    return left;
            // falls through
            case left:
                if (machine.onOperator)
                    return operator;
            // falls through
            case operator:
                if (machine.onRight)
                    return right;
            // falls through
            case right:
                return exit;
            case exit:
                return done;
            case done:
                return done;
            default:
                Debug.fail("Invalid state");
        }
    }
    BinaryExpressionState.nextState = nextState;
    function pushStack(stackIndex, stateStack, nodeStack, userStateStack, node) {
        stackIndex++;
        stateStack[stackIndex] = enter;
        nodeStack[stackIndex] = node;
        userStateStack[stackIndex] = undefined;
        return stackIndex;
    }
    function checkCircularity(stackIndex, nodeStack, node) {
        if (Debug.shouldAssert(AssertionLevel.Aggressive)) {
            while (stackIndex >= 0) {
                Debug.assert(nodeStack[stackIndex] !== node, "Circular traversal detected.");
                stackIndex--;
            }
        }
    }
})(BinaryExpressionState || (BinaryExpressionState = {}));
/**
 * Holds state machine handler functions
 */
class BinaryExpressionStateMachine {
    constructor(onEnter, onLeft, onOperator, onRight, onExit, foldState) {
        this.onEnter = onEnter;
        this.onLeft = onLeft;
        this.onOperator = onOperator;
        this.onRight = onRight;
        this.onExit = onExit;
        this.foldState = foldState;
    }
}
/** @internal */
export function createBinaryExpressionTrampoline(onEnter, onLeft, onOperator, onRight, onExit, foldState) {
    const machine = new BinaryExpressionStateMachine(onEnter, onLeft, onOperator, onRight, onExit, foldState);
    return trampoline;
    function trampoline(node, outerState) {
        const resultHolder = { value: undefined };
        const stateStack = [BinaryExpressionState.enter];
        const nodeStack = [node];
        const userStateStack = [undefined];
        let stackIndex = 0;
        while (stateStack[stackIndex] !== BinaryExpressionState.done) {
            stackIndex = stateStack[stackIndex](machine, stackIndex, stateStack, nodeStack, userStateStack, resultHolder, outerState);
        }
        Debug.assertEqual(stackIndex, 0);
        return resultHolder.value;
    }
}
function isExportOrDefaultKeywordKind(kind) {
    return kind === SyntaxKind.ExportKeyword || kind === SyntaxKind.DefaultKeyword;
}
/** @internal */
export function isExportOrDefaultModifier(node) {
    const kind = node.kind;
    return isExportOrDefaultKeywordKind(kind);
}
/** @internal */
export function elideNodes(factory, nodes) {
    if (nodes === undefined)
        return undefined;
    if (nodes.length === 0)
        return nodes;
    return setTextRange(factory.createNodeArray([], nodes.hasTrailingComma), nodes);
}
/**
 * Gets the node from which a name should be generated.
 *
 * @internal
 */
export function getNodeForGeneratedName(name) {
    var _a;
    const autoGenerate = name.emitNode.autoGenerate;
    if (autoGenerate.flags & GeneratedIdentifierFlags.Node) {
        const autoGenerateId = autoGenerate.id;
        let node = name;
        let original = node.original;
        while (original) {
            node = original;
            const autoGenerate = (_a = node.emitNode) === null || _a === void 0 ? void 0 : _a.autoGenerate;
            // if "node" is a different generated name (having a different "autoGenerateId"), use it and stop traversing.
            if (isMemberName(node) && (autoGenerate === undefined ||
                !!(autoGenerate.flags & GeneratedIdentifierFlags.Node) &&
                    autoGenerate.id !== autoGenerateId)) {
                break;
            }
            original = node.original;
        }
        // otherwise, return the original node for the source
        return node;
    }
    return name;
}
/** @internal */
export function formatGeneratedNamePart(part, generateName) {
    return typeof part === "object" ? formatGeneratedName(/*privateName*/ false, part.prefix, part.node, part.suffix, generateName) :
        typeof part === "string" ? part.length > 0 && part.charCodeAt(0) === CharacterCodes.hash ? part.slice(1) : part :
            "";
}
function formatIdentifier(name, generateName) {
    return typeof name === "string" ? name :
        formatIdentifierWorker(name, Debug.checkDefined(generateName));
}
function formatIdentifierWorker(node, generateName) {
    return isGeneratedPrivateIdentifier(node) ? generateName(node).slice(1) :
        isGeneratedIdentifier(node) ? generateName(node) :
            isPrivateIdentifier(node) ? node.escapedText.slice(1) :
                idText(node);
}
/** @internal */
export function formatGeneratedName(privateName, prefix, baseName, suffix, generateName) {
    prefix = formatGeneratedNamePart(prefix, generateName);
    suffix = formatGeneratedNamePart(suffix, generateName);
    baseName = formatIdentifier(baseName, generateName);
    return `${privateName ? "#" : ""}${prefix}${baseName}${suffix}`;
}
/**
 * Creates a private backing field for an `accessor` {@link PropertyDeclaration}.
 *
 * @internal
 */
export function createAccessorPropertyBackingField(factory, node, modifiers, initializer) {
    return factory.updatePropertyDeclaration(node, modifiers, factory.getGeneratedPrivateNameForNode(node.name, /*prefix*/ undefined, "_accessor_storage"), 
    /*questionOrExclamationToken*/ undefined, 
    /*type*/ undefined, initializer);
}
/**
 * Creates a {@link GetAccessorDeclaration} that reads from a private backing field.
 *
 * @internal
 */
export function createAccessorPropertyGetRedirector(factory, node, modifiers, name, receiver = factory.createThis()) {
    return factory.createGetAccessorDeclaration(modifiers, name, [], 
    /*type*/ undefined, factory.createBlock([
        factory.createReturnStatement(factory.createPropertyAccessExpression(receiver, factory.getGeneratedPrivateNameForNode(node.name, /*prefix*/ undefined, "_accessor_storage"))),
    ]));
}
/**
 * Creates a {@link SetAccessorDeclaration} that writes to a private backing field.
 *
 * @internal
 */
export function createAccessorPropertySetRedirector(factory, node, modifiers, name, receiver = factory.createThis()) {
    return factory.createSetAccessorDeclaration(modifiers, name, [factory.createParameterDeclaration(
        /*modifiers*/ undefined, 
        /*dotDotDotToken*/ undefined, "value")], factory.createBlock([
        factory.createExpressionStatement(factory.createAssignment(factory.createPropertyAccessExpression(receiver, factory.getGeneratedPrivateNameForNode(node.name, /*prefix*/ undefined, "_accessor_storage")), factory.createIdentifier("value"))),
    ]));
}
/** @internal */
export function findComputedPropertyNameCacheAssignment(name) {
    let node = name.expression;
    while (true) {
        node = skipOuterExpressions(node);
        if (isCommaListExpression(node)) {
            node = last(node.elements);
            continue;
        }
        if (isCommaExpression(node)) {
            node = node.right;
            continue;
        }
        if (isAssignmentExpression(node, /*excludeCompoundAssignment*/ true) && isGeneratedIdentifier(node.left)) {
            return node;
        }
        break;
    }
}
function isSyntheticParenthesizedExpression(node) {
    return isParenthesizedExpression(node)
        && nodeIsSynthesized(node)
        && !node.emitNode;
}
function flattenCommaListWorker(node, expressions) {
    if (isSyntheticParenthesizedExpression(node)) {
        flattenCommaListWorker(node.expression, expressions);
    }
    else if (isCommaExpression(node)) {
        flattenCommaListWorker(node.left, expressions);
        flattenCommaListWorker(node.right, expressions);
    }
    else if (isCommaListExpression(node)) {
        for (const child of node.elements) {
            flattenCommaListWorker(child, expressions);
        }
    }
    else {
        expressions.push(node);
    }
}
/**
 * Flatten a CommaExpression or CommaListExpression into an array of one or more expressions, unwrapping any nested
 * comma expressions and synthetic parens.
 *
 * @internal
 */
export function flattenCommaList(node) {
    const expressions = [];
    flattenCommaListWorker(node, expressions);
    return expressions;
}
/**
 * Walk an AssignmentPattern to determine if it contains object rest (`...`) syntax. We cannot rely on
 * propagation of `TransformFlags.ContainsObjectRestOrSpread` since it isn't propagated by default in
 * ObjectLiteralExpression and ArrayLiteralExpression since we do not know whether they belong to an
 * AssignmentPattern at the time the nodes are parsed.
 *
 * @internal
 */
export function containsObjectRestOrSpread(node) {
    if (node.transformFlags & TransformFlags.ContainsObjectRestOrSpread)
        return true;
    if (node.transformFlags & TransformFlags.ContainsES2018) {
        // check for nested spread assignments, otherwise '{ x: { a, ...b } = foo } = c'
        // will not be correctly interpreted by the ES2018 transformer
        for (const element of getElementsOfBindingOrAssignmentPattern(node)) {
            const target = getTargetOfBindingOrAssignmentElement(element);
            if (target && isAssignmentPattern(target)) {
                if (target.transformFlags & TransformFlags.ContainsObjectRestOrSpread) {
                    return true;
                }
                if (target.transformFlags & TransformFlags.ContainsES2018) {
                    if (containsObjectRestOrSpread(target))
                        return true;
                }
            }
        }
    }
    return false;
}
