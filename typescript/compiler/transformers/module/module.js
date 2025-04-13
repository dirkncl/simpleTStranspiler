import {
  addEmitHelper,
  addEmitHelpers,
  addInternalEmitFlags,
  addRange,
  append,
  arrayFrom,
  chainBundle,
  collectExternalModuleInfo,
  Debug,
  EmitFlags,
  EmitHint,
  emptyArray,
  firstOrUndefined,
  flattenDestructuringAssignment,
  FlattenLevel,
  forEachDynamicImportOrRequireCall,
  GeneratedIdentifierFlags,
  getEmitFlags,
  getEmitModuleKind,
  getEmitScriptTarget,
  getESModuleInterop,
  getExportNeedsImportStarHelper,
  getExternalHelpersModuleName,
  getExternalModuleNameLiteral,
  getImportNeedsImportDefaultHelper,
  getImportNeedsImportStarHelper,
  getInternalEmitFlags,
  getLocalNameForExternalImport,
  getNamespaceDeclarationNode,
  getNodeId,
  getOriginalNodeId,
  getStrictOptionValue,
  getTextOfIdentifierOrLiteral,
  hasJSFileExtension,
  hasJsonModuleEmitEnabled,
  hasSyntacticModifier,
  IdentifierNameMap,
  idText,
  insertStatementsAfterStandardPrologue,
  InternalEmitFlags,
  isArrayLiteralExpression,
  isArrowFunction,
  isAssignmentOperator,
  isBindingPattern,
  isBlock,
  isCaseBlock,
  isCaseOrDefaultClause,
  isClassElement,
  isClassExpression,
  isDeclarationNameOfEnumOrNamespace,
  isDefaultImport,
  isDestructuringAssignment,
  isEffectiveExternalModule,
  isExportDeclaration,
  isExportName,
  isExportNamespaceAsDefaultDeclaration,
  isExpression,
  isExternalModule,
  isExternalModuleImportEqualsDeclaration,
  isFileLevelReservedGeneratedIdentifier,
  isForInitializer,
  isFunctionExpression,
  isGeneratedIdentifier,
  isHeritageClause,
  isIdentifier,
  isImportCall,
  isImportClause,
  isImportEqualsDeclaration,
  isImportSpecifier,
  isInitializedVariable,
  isJsonSourceFile,
  isLocalName,
  isModifier,
  isModifierLike,
  isNamedExports,
  isObjectLiteralExpression,
  isOmittedExpression,
  isParameter,
  isPrefixUnaryExpression,
  isShorthandPropertyAssignment,
  isSimpleCopiableExpression,
  isSimpleInlineableExpression,
  isSpreadElement,
  isStatement,
  isStringLiteral,
  isStringLiteralLike,
  isVariableDeclaration,
  isVariableDeclarationList,
  length,
  mapDefined,
  ModifierFlags,
  moduleExportNameIsDefault,
  ModuleKind,
  NodeFlags,
  reduceLeft,
  removeAllComments,
  rewriteModuleSpecifier,
  ScriptTarget,
  setEmitFlags,
  setOriginalNode,
  setTextRange,
  shouldRewriteModuleSpecifier,
  singleOrMany,
  some,
  startOnNewLine,
  SyntaxKind,
  TransformFlags,
  tryGetModuleNameFromFile,
  visitEachChild,
  visitIterationBody,
  visitNode,
  visitNodes,
} from "../../_namespaces/ts.js";


/** @internal */
export function transformModule(context) {
    function getTransformModuleDelegate(moduleKind) {
        switch (moduleKind) {
            case ModuleKind.AMD:
                return transformAMDModule;
            case ModuleKind.UMD:
                return transformUMDModule;
            default:
                return transformCommonJSModule;
        }
    }
    const { factory, getEmitHelperFactory: emitHelpers, startLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration, } = context;
    const compilerOptions = context.getCompilerOptions();
    const resolver = context.getEmitResolver();
    const host = context.getEmitHost();
    const languageVersion = getEmitScriptTarget(compilerOptions);
    const moduleKind = getEmitModuleKind(compilerOptions);
    const previousOnSubstituteNode = context.onSubstituteNode;
    const previousOnEmitNode = context.onEmitNode;
    context.onSubstituteNode = onSubstituteNode;
    context.onEmitNode = onEmitNode;
    context.enableSubstitution(SyntaxKind.CallExpression); // Substitute calls to imported/exported symbols to avoid incorrect `this`.
    context.enableSubstitution(SyntaxKind.TaggedTemplateExpression); // Substitute calls to imported/exported symbols to avoid incorrect `this`.
    context.enableSubstitution(SyntaxKind.Identifier); // Substitutes expression identifiers with imported/exported symbols.
    context.enableSubstitution(SyntaxKind.BinaryExpression); // Substitutes assignments to exported symbols.
    context.enableSubstitution(SyntaxKind.ShorthandPropertyAssignment); // Substitutes shorthand property assignments for imported/exported symbols.
    context.enableEmitNotification(SyntaxKind.SourceFile); // Restore state when substituting nodes in a file.
    const moduleInfoMap = []; // The ExternalModuleInfo for each file.
    let currentSourceFile; // The current file.
    let currentModuleInfo; // The ExternalModuleInfo for the current file.
    let importsAndRequiresToRewriteOrShim;
    const noSubstitution = []; // Set of nodes for which substitution rules should be ignored.
    let needUMDDynamicImportHelper;
    return chainBundle(context, transformSourceFile);
    /**
     * Transforms the module aspects of a SourceFile.
     *
     * @param node The SourceFile node.
     */
    function transformSourceFile(node) {
        if (node.isDeclarationFile ||
            !(isEffectiveExternalModule(node, compilerOptions) ||
                node.transformFlags & TransformFlags.ContainsDynamicImport ||
                (isJsonSourceFile(node) && hasJsonModuleEmitEnabled(compilerOptions) && compilerOptions.outFile))) {
            return node;
        }
        currentSourceFile = node;
        currentModuleInfo = collectExternalModuleInfo(context, node);
        moduleInfoMap[getOriginalNodeId(node)] = currentModuleInfo;
        if (compilerOptions.rewriteRelativeImportExtensions) {
            forEachDynamicImportOrRequireCall(node, /*includeTypeSpaceImports*/ false, /*requireStringLiteralLikeArgument*/ false, node => {
                if (!isStringLiteralLike(node.arguments[0]) || shouldRewriteModuleSpecifier(node.arguments[0].text, compilerOptions)) {
                    importsAndRequiresToRewriteOrShim = append(importsAndRequiresToRewriteOrShim, node);
                }
            });
        }
        // Perform the transformation.
        const transformModule = getTransformModuleDelegate(moduleKind);
        const updated = transformModule(node);
        currentSourceFile = undefined;
        currentModuleInfo = undefined;
        needUMDDynamicImportHelper = false;
        return updated;
    }
    function shouldEmitUnderscoreUnderscoreESModule() {
        if (hasJSFileExtension(currentSourceFile.fileName) && currentSourceFile.commonJsModuleIndicator && (!currentSourceFile.externalModuleIndicator || currentSourceFile.externalModuleIndicator === true)) {
            return false;
        }
        if (!currentModuleInfo.exportEquals && isExternalModule(currentSourceFile)) {
            return true;
        }
        return false;
    }
    /**
     * Transforms a SourceFile into a CommonJS module.
     *
     * @param node The SourceFile node.
     */
    function transformCommonJSModule(node) {
        startLexicalEnvironment();
        const statements = [];
        const ensureUseStrict = getStrictOptionValue(compilerOptions, "alwaysStrict") || isExternalModule(currentSourceFile);
        const statementOffset = factory.copyPrologue(node.statements, statements, ensureUseStrict && !isJsonSourceFile(node), topLevelVisitor);
        if (shouldEmitUnderscoreUnderscoreESModule()) {
            append(statements, createUnderscoreUnderscoreESModule());
        }
        if (some(currentModuleInfo.exportedNames)) {
            const chunkSize = 50;
            for (let i = 0; i < currentModuleInfo.exportedNames.length; i += chunkSize) {
                append(statements, factory.createExpressionStatement(reduceLeft(currentModuleInfo.exportedNames.slice(i, i + chunkSize), (prev, nextId) => nextId.kind === SyntaxKind.StringLiteral
                    ? factory.createAssignment(factory.createElementAccessExpression(factory.createIdentifier("exports"), factory.createStringLiteral(nextId.text)), prev)
                    : factory.createAssignment(factory.createPropertyAccessExpression(factory.createIdentifier("exports"), factory.createIdentifier(idText(nextId))), prev), factory.createVoidZero())));
            }
        }
        for (const f of currentModuleInfo.exportedFunctions) {
            appendExportsOfHoistedDeclaration(statements, f);
        }
        append(statements, visitNode(currentModuleInfo.externalHelpersImportDeclaration, topLevelVisitor, isStatement));
        addRange(statements, visitNodes(node.statements, topLevelVisitor, isStatement, statementOffset));
        addExportEqualsIfNeeded(statements, /*emitAsReturn*/ false);
        insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
        const updated = factory.updateSourceFile(node, setTextRange(factory.createNodeArray(statements), node.statements));
        addEmitHelpers(updated, context.readEmitHelpers());
        return updated;
    }
    /**
     * Transforms a SourceFile into an AMD module.
     *
     * @param node The SourceFile node.
     */
    function transformAMDModule(node) {
        const define = factory.createIdentifier("define");
        const moduleName = tryGetModuleNameFromFile(factory, node, host, compilerOptions);
        const jsonSourceFile = isJsonSourceFile(node) && node;
        // An AMD define function has the following shape:
        //
        //     define(id?, dependencies?, factory);
        //
        // This has the shape of the following:
        //
        //     define(name, ["module1", "module2"], function (module1Alias) { ... }
        //
        // The location of the alias in the parameter list in the factory function needs to
        // match the position of the module name in the dependency list.
        //
        // To ensure this is true in cases of modules with no aliases, e.g.:
        //
        //     import "module"
        //
        // or
        //
        //     /// <amd-dependency path= "a.css" />
        //
        // we need to add modules without alias names to the end of the dependencies list
        const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, /*includeNonAmdDependencies*/ true);
        // Create an updated SourceFile:
        //
        //     define(mofactory.updateSourceFile", "module2"], function ...
        const updated = factory.updateSourceFile(node, setTextRange(factory.createNodeArray([
            factory.createExpressionStatement(factory.createCallExpression(define, 
            /*typeArguments*/ undefined, [
                // Add the module name (if provided).
                ...(moduleName ? [moduleName] : []),
                // Add the dependency array argument:
                //
                //     ["require", "exports", module1", "module2", ...]
                factory.createArrayLiteralExpression(jsonSourceFile ? emptyArray : [
                    factory.createStringLiteral("require"),
                    factory.createStringLiteral("exports"),
                    ...aliasedModuleNames,
                    ...unaliasedModuleNames,
                ]),
                // Add the module body function argument:
                //
                //     function (require, exports, module1, module2) ...
                jsonSourceFile ?
                    jsonSourceFile.statements.length ? jsonSourceFile.statements[0].expression : factory.createObjectLiteralExpression() :
                    factory.createFunctionExpression(
                    /*modifiers*/ undefined, 
                    /*asteriskToken*/ undefined, 
                    /*name*/ undefined, 
                    /*typeParameters*/ undefined, [
                        factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, "require"),
                        factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, "exports"),
                        ...importAliasNames,
                    ], 
                    /*type*/ undefined, transformAsynchronousModuleBody(node)),
            ])),
        ]), 
        /*location*/ node.statements));
        addEmitHelpers(updated, context.readEmitHelpers());
        return updated;
    }
    /**
     * Transforms a SourceFile into a UMD module.
     *
     * @param node The SourceFile node.
     */
    function transformUMDModule(node) {
        const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, /*includeNonAmdDependencies*/ false);
        const moduleName = tryGetModuleNameFromFile(factory, node, host, compilerOptions);
        const umdHeader = factory.createFunctionExpression(
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, 
        /*name*/ undefined, 
        /*typeParameters*/ undefined, [factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, "factory")], 
        /*type*/ undefined, setTextRange(factory.createBlock([
            factory.createIfStatement(factory.createLogicalAnd(factory.createTypeCheck(factory.createIdentifier("module"), "object"), factory.createTypeCheck(factory.createPropertyAccessExpression(factory.createIdentifier("module"), "exports"), "object")), factory.createBlock([
                factory.createVariableStatement(
                /*modifiers*/ undefined, [
                    factory.createVariableDeclaration("v", 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, factory.createCallExpression(factory.createIdentifier("factory"), 
                    /*typeArguments*/ undefined, [
                        factory.createIdentifier("require"),
                        factory.createIdentifier("exports"),
                    ])),
                ]),
                setEmitFlags(factory.createIfStatement(factory.createStrictInequality(factory.createIdentifier("v"), factory.createIdentifier("undefined")), factory.createExpressionStatement(factory.createAssignment(factory.createPropertyAccessExpression(factory.createIdentifier("module"), "exports"), factory.createIdentifier("v")))), EmitFlags.SingleLine),
            ]), factory.createIfStatement(factory.createLogicalAnd(factory.createTypeCheck(factory.createIdentifier("define"), "function"), factory.createPropertyAccessExpression(factory.createIdentifier("define"), "amd")), factory.createBlock([
                factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier("define"), 
                /*typeArguments*/ undefined, [
                    // Add the module name (if provided).
                    ...(moduleName ? [moduleName] : []),
                    factory.createArrayLiteralExpression([
                        factory.createStringLiteral("require"),
                        factory.createStringLiteral("exports"),
                        ...aliasedModuleNames,
                        ...unaliasedModuleNames,
                    ]),
                    factory.createIdentifier("factory"),
                ])),
            ]))),
        ], 
        /*multiLine*/ true), 
        /*location*/ undefined));
        // Create an updated SourceFile:
        //
        //  (function (factory) {
        //      if (typeof module === "object" && typeof module.exports === "object") {
        //          var v = factory(require, exports);
        //          if (v !== undefined) module.exports = v;
        //      }
        //      else if (typeof define === 'function' && define.amd) {
        //          define(["require", "exports"], factory);
        //      }
        //  })(function ...)
        const updated = factory.updateSourceFile(node, setTextRange(factory.createNodeArray([
            factory.createExpressionStatement(factory.createCallExpression(umdHeader, 
            /*typeArguments*/ undefined, [
                // Add the module body function argument:
                //
                //     function (require, exports) ...
                factory.createFunctionExpression(
                /*modifiers*/ undefined, 
                /*asteriskToken*/ undefined, 
                /*name*/ undefined, 
                /*typeParameters*/ undefined, [
                    factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, "require"),
                    factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, "exports"),
                    ...importAliasNames,
                ], 
                /*type*/ undefined, transformAsynchronousModuleBody(node)),
            ])),
        ]), 
        /*location*/ node.statements));
        addEmitHelpers(updated, context.readEmitHelpers());
        return updated;
    }
    /**
     * Collect the additional asynchronous dependencies for the module.
     *
     * @param node The source file.
     * @param includeNonAmdDependencies A value indicating whether to include non-AMD dependencies.
     */
    function collectAsynchronousDependencies(node, includeNonAmdDependencies) {
        // names of modules with corresponding parameter in the factory function
        const aliasedModuleNames = [];
        // names of modules with no corresponding parameters in factory function
        const unaliasedModuleNames = [];
        // names of the parameters in the factory function; these
        // parameters need to match the indexes of the corresponding
        // module names in aliasedModuleNames.
        const importAliasNames = [];
        // Fill in amd-dependency tags
        for (const amdDependency of node.amdDependencies) {
            if (amdDependency.name) {
                aliasedModuleNames.push(factory.createStringLiteral(amdDependency.path));
                importAliasNames.push(factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, amdDependency.name));
            }
            else {
                unaliasedModuleNames.push(factory.createStringLiteral(amdDependency.path));
            }
        }
        for (const importNode of currentModuleInfo.externalImports) {
            // Find the name of the external module
            const externalModuleName = getExternalModuleNameLiteral(factory, importNode, currentSourceFile, host, resolver, compilerOptions);
            // Find the name of the module alias, if there is one
            const importAliasName = getLocalNameForExternalImport(factory, importNode, currentSourceFile);
            // It is possible that externalModuleName is undefined if it is not string literal.
            // This can happen in the invalid import syntax.
            // E.g : "import * from alias from 'someLib';"
            if (externalModuleName) {
                if (includeNonAmdDependencies && importAliasName) {
                    // Set emitFlags on the name of the classDeclaration
                    // This is so that when printer will not substitute the identifier
                    setEmitFlags(importAliasName, EmitFlags.NoSubstitution);
                    aliasedModuleNames.push(externalModuleName);
                    importAliasNames.push(factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, importAliasName));
                }
                else {
                    unaliasedModuleNames.push(externalModuleName);
                }
            }
        }
        return { aliasedModuleNames, unaliasedModuleNames, importAliasNames };
    }
    function getAMDImportExpressionForImport(node) {
        if (isImportEqualsDeclaration(node) || isExportDeclaration(node) || !getExternalModuleNameLiteral(factory, node, currentSourceFile, host, resolver, compilerOptions)) {
            return undefined;
        }
        const name = getLocalNameForExternalImport(factory, node, currentSourceFile); // TODO: GH#18217
        const expr = getHelperExpressionForImport(node, name);
        if (expr === name) {
            return undefined;
        }
        return factory.createExpressionStatement(factory.createAssignment(name, expr));
    }
    /**
     * Transforms a SourceFile into an AMD or UMD module body.
     *
     * @param node The SourceFile node.
     */
    function transformAsynchronousModuleBody(node) {
        startLexicalEnvironment();
        const statements = [];
        const statementOffset = factory.copyPrologue(node.statements, statements, /*ensureUseStrict*/ true, topLevelVisitor);
        if (shouldEmitUnderscoreUnderscoreESModule()) {
            append(statements, createUnderscoreUnderscoreESModule());
        }
        if (some(currentModuleInfo.exportedNames)) {
            append(statements, factory.createExpressionStatement(reduceLeft(currentModuleInfo.exportedNames, (prev, nextId) => nextId.kind === SyntaxKind.StringLiteral
                ? factory.createAssignment(factory.createElementAccessExpression(factory.createIdentifier("exports"), factory.createStringLiteral(nextId.text)), prev)
                : factory.createAssignment(factory.createPropertyAccessExpression(factory.createIdentifier("exports"), factory.createIdentifier(idText(nextId))), prev), factory.createVoidZero())));
        }
        for (const f of currentModuleInfo.exportedFunctions) {
            appendExportsOfHoistedDeclaration(statements, f);
        }
        // Visit each statement of the module body.
        append(statements, visitNode(currentModuleInfo.externalHelpersImportDeclaration, topLevelVisitor, isStatement));
        if (moduleKind === ModuleKind.AMD) {
            addRange(statements, mapDefined(currentModuleInfo.externalImports, getAMDImportExpressionForImport));
        }
        addRange(statements, visitNodes(node.statements, topLevelVisitor, isStatement, statementOffset));
        // Append the 'export =' statement if provided.
        addExportEqualsIfNeeded(statements, /*emitAsReturn*/ true);
        // End the lexical environment for the module body
        // and merge any new lexical declarations.
        insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
        const body = factory.createBlock(statements, /*multiLine*/ true);
        if (needUMDDynamicImportHelper) {
            addEmitHelper(body, dynamicImportUMDHelper);
        }
        return body;
    }
    /**
     * Adds the down-level representation of `export=` to the statement list if one exists
     * in the source file.
     *
     * @param statements The Statement list to modify.
     * @param emitAsReturn A value indicating whether to emit the `export=` statement as a
     * return statement.
     */
    function addExportEqualsIfNeeded(statements, emitAsReturn) {
        if (currentModuleInfo.exportEquals) {
            const expressionResult = visitNode(currentModuleInfo.exportEquals.expression, visitor, isExpression);
            if (expressionResult) {
                if (emitAsReturn) {
                    const statement = factory.createReturnStatement(expressionResult);
                    setTextRange(statement, currentModuleInfo.exportEquals);
                    setEmitFlags(statement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments);
                    statements.push(statement);
                }
                else {
                    const statement = factory.createExpressionStatement(factory.createAssignment(factory.createPropertyAccessExpression(factory.createIdentifier("module"), "exports"), expressionResult));
                    setTextRange(statement, currentModuleInfo.exportEquals);
                    setEmitFlags(statement, EmitFlags.NoComments);
                    statements.push(statement);
                }
            }
        }
    }
    //
    // Top-Level Source Element Visitors
    //
    /**
     * Visits a node at the top level of the source file.
     *
     * @param node The node to visit.
     */
    function topLevelVisitor(node) {
        switch (node.kind) {
            case SyntaxKind.ImportDeclaration:
                return visitTopLevelImportDeclaration(node);
            case SyntaxKind.ImportEqualsDeclaration:
                return visitTopLevelImportEqualsDeclaration(node);
            case SyntaxKind.ExportDeclaration:
                return visitTopLevelExportDeclaration(node);
            case SyntaxKind.ExportAssignment:
                return visitTopLevelExportAssignment(node);
            default:
                return topLevelNestedVisitor(node);
        }
    }
    /**
     * Visit nested elements at the top-level of a module.
     *
     * @param node The node to visit.
     */
    function topLevelNestedVisitor(node) {
        switch (node.kind) {
            case SyntaxKind.VariableStatement:
                return visitVariableStatement(node);
            case SyntaxKind.FunctionDeclaration:
                return visitFunctionDeclaration(node);
            case SyntaxKind.ClassDeclaration:
                return visitClassDeclaration(node);
            case SyntaxKind.ForStatement:
                return visitForStatement(node, /*isTopLevel*/ true);
            case SyntaxKind.ForInStatement:
                return visitForInStatement(node);
            case SyntaxKind.ForOfStatement:
                return visitForOfStatement(node);
            case SyntaxKind.DoStatement:
                return visitDoStatement(node);
            case SyntaxKind.WhileStatement:
                return visitWhileStatement(node);
            case SyntaxKind.LabeledStatement:
                return visitLabeledStatement(node);
            case SyntaxKind.WithStatement:
                return visitWithStatement(node);
            case SyntaxKind.IfStatement:
                return visitIfStatement(node);
            case SyntaxKind.SwitchStatement:
                return visitSwitchStatement(node);
            case SyntaxKind.CaseBlock:
                return visitCaseBlock(node);
            case SyntaxKind.CaseClause:
                return visitCaseClause(node);
            case SyntaxKind.DefaultClause:
                return visitDefaultClause(node);
            case SyntaxKind.TryStatement:
                return visitTryStatement(node);
            case SyntaxKind.CatchClause:
                return visitCatchClause(node);
            case SyntaxKind.Block:
                return visitBlock(node);
            default:
                return visitor(node);
        }
    }
    function visitorWorker(node, valueIsDiscarded) {
        // This visitor does not need to descend into the tree if there is no dynamic import, destructuring assignment, or update expression
        // as export/import statements are only transformed at the top level of a file.
        if (!(node.transformFlags & (TransformFlags.ContainsDynamicImport | TransformFlags.ContainsDestructuringAssignment | TransformFlags.ContainsUpdateExpressionForIdentifier)) && !(importsAndRequiresToRewriteOrShim === null || importsAndRequiresToRewriteOrShim === void 0 ? void 0 : importsAndRequiresToRewriteOrShim.length)) {
            return node;
        }
        switch (node.kind) {
            case SyntaxKind.ForStatement:
                return visitForStatement(node, /*isTopLevel*/ false);
            case SyntaxKind.ExpressionStatement:
                return visitExpressionStatement(node);
            case SyntaxKind.ParenthesizedExpression:
                return visitParenthesizedExpression(node, valueIsDiscarded);
            case SyntaxKind.PartiallyEmittedExpression:
                return visitPartiallyEmittedExpression(node, valueIsDiscarded);
            case SyntaxKind.CallExpression:
                const needsRewrite = node === firstOrUndefined(importsAndRequiresToRewriteOrShim);
                if (needsRewrite) {
                    importsAndRequiresToRewriteOrShim.shift();
                }
                if (isImportCall(node) && host.shouldTransformImportCall(currentSourceFile)) {
                    return visitImportCallExpression(node, needsRewrite);
                }
                else if (needsRewrite) {
                    return shimOrRewriteImportOrRequireCall(node);
                }
                break;
            case SyntaxKind.BinaryExpression:
                if (isDestructuringAssignment(node)) {
                    return visitDestructuringAssignment(node, valueIsDiscarded);
                }
                break;
            case SyntaxKind.PrefixUnaryExpression:
            case SyntaxKind.PostfixUnaryExpression:
                return visitPreOrPostfixUnaryExpression(node, valueIsDiscarded);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitor(node) {
        return visitorWorker(node, /*valueIsDiscarded*/ false);
    }
    function discardedValueVisitor(node) {
        return visitorWorker(node, /*valueIsDiscarded*/ true);
    }
    function destructuringNeedsFlattening(node) {
        if (isObjectLiteralExpression(node)) {
            for (const elem of node.properties) {
                switch (elem.kind) {
                    case SyntaxKind.PropertyAssignment:
                        if (destructuringNeedsFlattening(elem.initializer)) {
                            return true;
                        }
                        break;
                    case SyntaxKind.ShorthandPropertyAssignment:
                        if (destructuringNeedsFlattening(elem.name)) {
                            return true;
                        }
                        break;
                    case SyntaxKind.SpreadAssignment:
                        if (destructuringNeedsFlattening(elem.expression)) {
                            return true;
                        }
                        break;
                    case SyntaxKind.MethodDeclaration:
                    case SyntaxKind.GetAccessor:
                    case SyntaxKind.SetAccessor:
                        return false;
                    default:
                        Debug.assertNever(elem, "Unhandled object member kind");
                }
            }
        }
        else if (isArrayLiteralExpression(node)) {
            for (const elem of node.elements) {
                if (isSpreadElement(elem)) {
                    if (destructuringNeedsFlattening(elem.expression)) {
                        return true;
                    }
                }
                else if (destructuringNeedsFlattening(elem)) {
                    return true;
                }
            }
        }
        else if (isIdentifier(node)) {
            return length(getExports(node)) > (isExportName(node) ? 1 : 0);
        }
        return false;
    }
    function visitDestructuringAssignment(node, valueIsDiscarded) {
        if (destructuringNeedsFlattening(node.left)) {
            return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, !valueIsDiscarded, createAllExportExpressions);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitForStatement(node, isTopLevel) {
        if (isTopLevel && node.initializer &&
            isVariableDeclarationList(node.initializer) &&
            !(node.initializer.flags & NodeFlags.BlockScoped)) {
            const exportStatements = appendExportsOfVariableDeclarationList(/*statements*/ undefined, node.initializer, /*isForInOrOfInitializer*/ false);
            if (exportStatements) {
                const statements = [];
                const varDeclList = visitNode(node.initializer, discardedValueVisitor, isVariableDeclarationList);
                const varStatement = factory.createVariableStatement(/*modifiers*/ undefined, varDeclList);
                statements.push(varStatement);
                addRange(statements, exportStatements);
                const condition = visitNode(node.condition, visitor, isExpression);
                const incrementor = visitNode(node.incrementor, discardedValueVisitor, isExpression);
                const body = visitIterationBody(node.statement, isTopLevel ? topLevelNestedVisitor : visitor, context);
                statements.push(factory.updateForStatement(node, /*initializer*/ undefined, condition, incrementor, body));
                return statements;
            }
        }
        return factory.updateForStatement(node, visitNode(node.initializer, discardedValueVisitor, isForInitializer), visitNode(node.condition, visitor, isExpression), visitNode(node.incrementor, discardedValueVisitor, isExpression), visitIterationBody(node.statement, isTopLevel ? topLevelNestedVisitor : visitor, context));
    }
    /**
     * Visits the body of a ForInStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitForInStatement(node) {
        if (isVariableDeclarationList(node.initializer) && !(node.initializer.flags & NodeFlags.BlockScoped)) {
            const exportStatements = appendExportsOfVariableDeclarationList(/*statements*/ undefined, node.initializer, /*isForInOrOfInitializer*/ true);
            if (some(exportStatements)) {
                const initializer = visitNode(node.initializer, discardedValueVisitor, isForInitializer);
                const expression = visitNode(node.expression, visitor, isExpression);
                const body = visitIterationBody(node.statement, topLevelNestedVisitor, context);
                const mergedBody = isBlock(body) ?
                    factory.updateBlock(body, [...exportStatements, ...body.statements]) :
                    factory.createBlock([...exportStatements, body], /*multiLine*/ true);
                return factory.updateForInStatement(node, initializer, expression, mergedBody);
            }
        }
        return factory.updateForInStatement(node, visitNode(node.initializer, discardedValueVisitor, isForInitializer), visitNode(node.expression, visitor, isExpression), visitIterationBody(node.statement, topLevelNestedVisitor, context));
    }
    /**
     * Visits the body of a ForOfStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitForOfStatement(node) {
        if (isVariableDeclarationList(node.initializer) && !(node.initializer.flags & NodeFlags.BlockScoped)) {
            const exportStatements = appendExportsOfVariableDeclarationList(/*statements*/ undefined, node.initializer, /*isForInOrOfInitializer*/ true);
            const initializer = visitNode(node.initializer, discardedValueVisitor, isForInitializer);
            const expression = visitNode(node.expression, visitor, isExpression);
            let body = visitIterationBody(node.statement, topLevelNestedVisitor, context);
            if (some(exportStatements)) {
                body = isBlock(body) ?
                    factory.updateBlock(body, [...exportStatements, ...body.statements]) :
                    factory.createBlock([...exportStatements, body], /*multiLine*/ true);
            }
            return factory.updateForOfStatement(node, node.awaitModifier, initializer, expression, body);
        }
        return factory.updateForOfStatement(node, node.awaitModifier, visitNode(node.initializer, discardedValueVisitor, isForInitializer), visitNode(node.expression, visitor, isExpression), visitIterationBody(node.statement, topLevelNestedVisitor, context));
    }
    /**
     * Visits the body of a DoStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitDoStatement(node) {
        return factory.updateDoStatement(node, visitIterationBody(node.statement, topLevelNestedVisitor, context), visitNode(node.expression, visitor, isExpression));
    }
    /**
     * Visits the body of a WhileStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitWhileStatement(node) {
        return factory.updateWhileStatement(node, visitNode(node.expression, visitor, isExpression), visitIterationBody(node.statement, topLevelNestedVisitor, context));
    }
    /**
     * Visits the body of a LabeledStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitLabeledStatement(node) {
        var _a;
        return factory.updateLabeledStatement(node, node.label, (_a = visitNode(node.statement, topLevelNestedVisitor, isStatement, factory.liftToBlock)) !== null && _a !== void 0 ? _a : setTextRange(factory.createEmptyStatement(), node.statement));
    }
    /**
     * Visits the body of a WithStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitWithStatement(node) {
        return factory.updateWithStatement(node, visitNode(node.expression, visitor, isExpression), Debug.checkDefined(visitNode(node.statement, topLevelNestedVisitor, isStatement, factory.liftToBlock)));
    }
    /**
     * Visits the body of a IfStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitIfStatement(node) {
        var _a;
        return factory.updateIfStatement(node, visitNode(node.expression, visitor, isExpression), (_a = visitNode(node.thenStatement, topLevelNestedVisitor, isStatement, factory.liftToBlock)) !== null && _a !== void 0 ? _a : factory.createBlock([]), visitNode(node.elseStatement, topLevelNestedVisitor, isStatement, factory.liftToBlock));
    }
    /**
     * Visits the body of a SwitchStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitSwitchStatement(node) {
        return factory.updateSwitchStatement(node, visitNode(node.expression, visitor, isExpression), Debug.checkDefined(visitNode(node.caseBlock, topLevelNestedVisitor, isCaseBlock)));
    }
    /**
     * Visits the body of a CaseBlock to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitCaseBlock(node) {
        return factory.updateCaseBlock(node, visitNodes(node.clauses, topLevelNestedVisitor, isCaseOrDefaultClause));
    }
    /**
     * Visits the body of a CaseClause to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitCaseClause(node) {
        return factory.updateCaseClause(node, visitNode(node.expression, visitor, isExpression), visitNodes(node.statements, topLevelNestedVisitor, isStatement));
    }
    /**
     * Visits the body of a DefaultClause to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitDefaultClause(node) {
        return visitEachChild(node, topLevelNestedVisitor, context);
    }
    /**
     * Visits the body of a TryStatement to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitTryStatement(node) {
        return visitEachChild(node, topLevelNestedVisitor, context);
    }
    /**
     * Visits the body of a CatchClause to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitCatchClause(node) {
        return factory.updateCatchClause(node, node.variableDeclaration, Debug.checkDefined(visitNode(node.block, topLevelNestedVisitor, isBlock)));
    }
    /**
     * Visits the body of a Block to hoist declarations.
     *
     * @param node The node to visit.
     */
    function visitBlock(node) {
        node = visitEachChild(node, topLevelNestedVisitor, context);
        return node;
    }
    function visitExpressionStatement(node) {
        return factory.updateExpressionStatement(node, visitNode(node.expression, discardedValueVisitor, isExpression));
    }
    function visitParenthesizedExpression(node, valueIsDiscarded) {
        return factory.updateParenthesizedExpression(node, visitNode(node.expression, valueIsDiscarded ? discardedValueVisitor : visitor, isExpression));
    }
    function visitPartiallyEmittedExpression(node, valueIsDiscarded) {
        return factory.updatePartiallyEmittedExpression(node, visitNode(node.expression, valueIsDiscarded ? discardedValueVisitor : visitor, isExpression));
    }
    function visitPreOrPostfixUnaryExpression(node, valueIsDiscarded) {
        // When we see a prefix or postfix increment expression whose operand is an exported
        // symbol, we should ensure all exports of that symbol are updated with the correct
        // value.
        //
        // - We do not transform generated identifiers for any reason.
        // - We do not transform identifiers tagged with the LocalName flag.
        // - We do not transform identifiers that were originally the name of an enum or
        //   namespace due to how they are transformed in TypeScript.
        // - We only transform identifiers that are exported at the top level.
        if ((node.operator === SyntaxKind.PlusPlusToken || node.operator === SyntaxKind.MinusMinusToken)
            && isIdentifier(node.operand)
            && !isGeneratedIdentifier(node.operand)
            && !isLocalName(node.operand)
            && !isDeclarationNameOfEnumOrNamespace(node.operand)) {
            const exportedNames = getExports(node.operand);
            if (exportedNames) {
                let temp;
                let expression = visitNode(node.operand, visitor, isExpression);
                if (isPrefixUnaryExpression(node)) {
                    expression = factory.updatePrefixUnaryExpression(node, expression);
                }
                else {
                    expression = factory.updatePostfixUnaryExpression(node, expression);
                    if (!valueIsDiscarded) {
                        temp = factory.createTempVariable(hoistVariableDeclaration);
                        expression = factory.createAssignment(temp, expression);
                        setTextRange(expression, node);
                    }
                    expression = factory.createComma(expression, factory.cloneNode(node.operand));
                    setTextRange(expression, node);
                }
                for (const exportName of exportedNames) {
                    noSubstitution[getNodeId(expression)] = true;
                    expression = createExportExpression(exportName, expression);
                    setTextRange(expression, node);
                }
                if (temp) {
                    noSubstitution[getNodeId(expression)] = true;
                    expression = factory.createComma(expression, temp);
                    setTextRange(expression, node);
                }
                return expression;
            }
        }
        return visitEachChild(node, visitor, context);
    }
    function shimOrRewriteImportOrRequireCall(node) {
        return factory.updateCallExpression(node, node.expression, 
        /*typeArguments*/ undefined, visitNodes(node.arguments, (arg) => {
            if (arg === node.arguments[0]) {
                return isStringLiteralLike(arg)
                    ? rewriteModuleSpecifier(arg, compilerOptions)
                    : emitHelpers().createRewriteRelativeImportExtensionsHelper(arg);
            }
            return visitor(arg);
        }, isExpression));
    }
    function visitImportCallExpression(node, rewriteOrShim) {
        if (moduleKind === ModuleKind.None && languageVersion >= ScriptTarget.ES2020) {
            return visitEachChild(node, visitor, context);
        }
        const externalModuleName = getExternalModuleNameLiteral(factory, node, currentSourceFile, host, resolver, compilerOptions);
        const firstArgument = visitNode(firstOrUndefined(node.arguments), visitor, isExpression);
        // Only use the external module name if it differs from the first argument. This allows us to preserve the quote style of the argument on output.
        const argument = externalModuleName && (!firstArgument || !isStringLiteral(firstArgument) || firstArgument.text !== externalModuleName.text)
            ? externalModuleName
            : firstArgument && rewriteOrShim
                ? isStringLiteral(firstArgument) ? rewriteModuleSpecifier(firstArgument, compilerOptions) : emitHelpers().createRewriteRelativeImportExtensionsHelper(firstArgument)
                : firstArgument;
        const containsLexicalThis = !!(node.transformFlags & TransformFlags.ContainsLexicalThis);
        switch (compilerOptions.module) {
            case ModuleKind.AMD:
                return createImportCallExpressionAMD(argument, containsLexicalThis);
            case ModuleKind.UMD:
                return createImportCallExpressionUMD(argument !== null && argument !== void 0 ? argument : factory.createVoidZero(), containsLexicalThis);
            case ModuleKind.CommonJS:
            default:
                return createImportCallExpressionCommonJS(argument);
        }
    }
    function createImportCallExpressionUMD(arg, containsLexicalThis) {
        // (function (factory) {
        //      ... (regular UMD)
        // }
        // })(function (require, exports, useSyncRequire) {
        //      "use strict";
        //      Object.defineProperty(exports, "__esModule", { value: true });
        //      var __syncRequire = typeof module === "object" && typeof module.exports === "object";
        //      var __resolved = new Promise(function (resolve) { resolve(); });
        //      .....
        //      __syncRequire
        //          ? __resolved.then(function () { return require(x); }) /*CommonJs Require*/
        //          : new Promise(function (_a, _b) { require([x], _a, _b); }); /*Amd Require*/
        // });
        needUMDDynamicImportHelper = true;
        if (isSimpleCopiableExpression(arg)) {
            const argClone = isGeneratedIdentifier(arg) ? arg : isStringLiteral(arg) ? factory.createStringLiteralFromNode(arg) : setEmitFlags(setTextRange(factory.cloneNode(arg), arg), EmitFlags.NoComments);
            return factory.createConditionalExpression(
            /*condition*/ factory.createIdentifier("__syncRequire"), 
            /*questionToken*/ undefined, 
            /*whenTrue*/ createImportCallExpressionCommonJS(arg), 
            /*colonToken*/ undefined, 
            /*whenFalse*/ createImportCallExpressionAMD(argClone, containsLexicalThis));
        }
        else {
            const temp = factory.createTempVariable(hoistVariableDeclaration);
            return factory.createComma(factory.createAssignment(temp, arg), factory.createConditionalExpression(
            /*condition*/ factory.createIdentifier("__syncRequire"), 
            /*questionToken*/ undefined, 
            /*whenTrue*/ createImportCallExpressionCommonJS(temp, /*isInlineable*/ true), 
            /*colonToken*/ undefined, 
            /*whenFalse*/ createImportCallExpressionAMD(temp, containsLexicalThis)));
        }
    }
    function createImportCallExpressionAMD(arg, containsLexicalThis) {
        // improt("./blah")
        // emit as
        // define(["require", "exports", "blah"], function (require, exports) {
        //     ...
        //     new Promise(function (_a, _b) { require([x], _a, _b); }); /*Amd Require*/
        // });
        const resolve = factory.createUniqueName("resolve");
        const reject = factory.createUniqueName("reject");
        const parameters = [
            factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, /*name*/ resolve),
            factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, /*name*/ reject),
        ];
        const body = factory.createBlock([
            factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier("require"), 
            /*typeArguments*/ undefined, [factory.createArrayLiteralExpression([arg || factory.createOmittedExpression()]), resolve, reject])),
        ]);
        let func;
        if (languageVersion >= ScriptTarget.ES2015) {
            func = factory.createArrowFunction(
            /*modifiers*/ undefined, 
            /*typeParameters*/ undefined, parameters, 
            /*type*/ undefined, 
            /*equalsGreaterThanToken*/ undefined, body);
        }
        else {
            func = factory.createFunctionExpression(
            /*modifiers*/ undefined, 
            /*asteriskToken*/ undefined, 
            /*name*/ undefined, 
            /*typeParameters*/ undefined, parameters, 
            /*type*/ undefined, body);
            // if there is a lexical 'this' in the import call arguments, ensure we indicate
            // that this new function expression indicates it captures 'this' so that the
            // es2015 transformer will properly substitute 'this' with '_this'.
            if (containsLexicalThis) {
                setEmitFlags(func, EmitFlags.CapturesThis);
            }
        }
        const promise = factory.createNewExpression(factory.createIdentifier("Promise"), /*typeArguments*/ undefined, [func]);
        if (getESModuleInterop(compilerOptions)) {
            return factory.createCallExpression(factory.createPropertyAccessExpression(promise, factory.createIdentifier("then")), /*typeArguments*/ undefined, [emitHelpers().createImportStarCallbackHelper()]);
        }
        return promise;
    }
    function createImportCallExpressionCommonJS(arg, isInlineable) {
        // import(x)
        // emit as
        // Promise.resolve(`${x}`).then((s) => require(s)) /*CommonJs Require*/
        // We have to wrap require in then callback so that require is done in asynchronously
        // if we simply do require in resolve callback in Promise constructor. We will execute the loading immediately
        // If the arg is not inlineable, we have to evaluate and ToString() it in the current scope
        // Otherwise, we inline it in require() so that it's statically analyzable
        const needSyncEval = arg && !isSimpleInlineableExpression(arg) && !isInlineable;
        const promiseResolveCall = factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("Promise"), "resolve"), 
        /*typeArguments*/ undefined, 
        /*argumentsArray*/ needSyncEval
            ? languageVersion >= ScriptTarget.ES2015
                ? [
                    factory.createTemplateExpression(factory.createTemplateHead(""), [
                        factory.createTemplateSpan(arg, factory.createTemplateTail("")),
                    ]),
                ]
                : [
                    factory.createCallExpression(factory.createPropertyAccessExpression(factory.createStringLiteral(""), "concat"), 
                    /*typeArguments*/ undefined, [arg]),
                ]
            : []);
        let requireCall = factory.createCallExpression(factory.createIdentifier("require"), 
        /*typeArguments*/ undefined, needSyncEval ? [factory.createIdentifier("s")] : arg ? [arg] : []);
        if (getESModuleInterop(compilerOptions)) {
            requireCall = emitHelpers().createImportStarHelper(requireCall);
        }
        const parameters = needSyncEval
            ? [
                factory.createParameterDeclaration(
                /*modifiers*/ undefined, 
                /*dotDotDotToken*/ undefined, 
                /*name*/ "s"),
            ]
            : [];
        let func;
        if (languageVersion >= ScriptTarget.ES2015) {
            func = factory.createArrowFunction(
            /*modifiers*/ undefined, 
            /*typeParameters*/ undefined, 
            /*parameters*/ parameters, 
            /*type*/ undefined, 
            /*equalsGreaterThanToken*/ undefined, requireCall);
        }
        else {
            func = factory.createFunctionExpression(
            /*modifiers*/ undefined, 
            /*asteriskToken*/ undefined, 
            /*name*/ undefined, 
            /*typeParameters*/ undefined, 
            /*parameters*/ parameters, 
            /*type*/ undefined, factory.createBlock([factory.createReturnStatement(requireCall)]));
        }
        const downleveledImport = factory.createCallExpression(factory.createPropertyAccessExpression(promiseResolveCall, "then"), /*typeArguments*/ undefined, [func]);
        return downleveledImport;
    }
    function getHelperExpressionForExport(node, innerExpr) {
        if (!getESModuleInterop(compilerOptions) || getInternalEmitFlags(node) & InternalEmitFlags.NeverApplyImportHelper) {
            return innerExpr;
        }
        if (getExportNeedsImportStarHelper(node)) {
            return emitHelpers().createImportStarHelper(innerExpr);
        }
        return innerExpr;
    }
    function getHelperExpressionForImport(node, innerExpr) {
        if (!getESModuleInterop(compilerOptions) || getInternalEmitFlags(node) & InternalEmitFlags.NeverApplyImportHelper) {
            return innerExpr;
        }
        if (getImportNeedsImportStarHelper(node)) {
            return emitHelpers().createImportStarHelper(innerExpr);
        }
        if (getImportNeedsImportDefaultHelper(node)) {
            return emitHelpers().createImportDefaultHelper(innerExpr);
        }
        return innerExpr;
    }
    /**
     * Visits an ImportDeclaration node.
     *
     * @param node The node to visit.
     */
    function visitTopLevelImportDeclaration(node) {
        let statements;
        const namespaceDeclaration = getNamespaceDeclarationNode(node);
        if (moduleKind !== ModuleKind.AMD) {
            if (!node.importClause) {
                // import "mod";
                return setOriginalNode(setTextRange(factory.createExpressionStatement(createRequireCall(node)), node), node);
            }
            else {
                const variables = [];
                if (namespaceDeclaration && !isDefaultImport(node)) {
                    // import * as n from "mod";
                    variables.push(factory.createVariableDeclaration(factory.cloneNode(namespaceDeclaration.name), 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, getHelperExpressionForImport(node, createRequireCall(node))));
                }
                else {
                    // import d from "mod";
                    // import { x, y } from "mod";
                    // import d, { x, y } from "mod";
                    // import d, * as n from "mod";
                    variables.push(factory.createVariableDeclaration(factory.getGeneratedNameForNode(node), 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, getHelperExpressionForImport(node, createRequireCall(node))));
                    if (namespaceDeclaration && isDefaultImport(node)) {
                        variables.push(factory.createVariableDeclaration(factory.cloneNode(namespaceDeclaration.name), 
                        /*exclamationToken*/ undefined, 
                        /*type*/ undefined, factory.getGeneratedNameForNode(node)));
                    }
                }
                statements = append(statements, setOriginalNode(setTextRange(factory.createVariableStatement(
                /*modifiers*/ undefined, factory.createVariableDeclarationList(variables, languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)), 
                /*location*/ node), 
                /*original*/ node));
            }
        }
        else if (namespaceDeclaration && isDefaultImport(node)) {
            // import d, * as n from "mod";
            statements = append(statements, factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([
                setOriginalNode(setTextRange(factory.createVariableDeclaration(factory.cloneNode(namespaceDeclaration.name), 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, factory.getGeneratedNameForNode(node)), 
                /*location*/ node), 
                /*original*/ node),
            ], languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)));
        }
        statements = appendExportsOfImportDeclaration(statements, node);
        return singleOrMany(statements);
    }
    /**
     * Creates a `require()` call to import an external module.
     *
     * @param importNode The declararation to import.
     */
    function createRequireCall(importNode) {
        const moduleName = getExternalModuleNameLiteral(factory, importNode, currentSourceFile, host, resolver, compilerOptions);
        const args = [];
        if (moduleName) {
            args.push(rewriteModuleSpecifier(moduleName, compilerOptions));
        }
        return factory.createCallExpression(factory.createIdentifier("require"), /*typeArguments*/ undefined, args);
    }
    /**
     * Visits an ImportEqualsDeclaration node.
     *
     * @param node The node to visit.
     */
    function visitTopLevelImportEqualsDeclaration(node) {
        Debug.assert(isExternalModuleImportEqualsDeclaration(node), "import= for internal module references should be handled in an earlier transformer.");
        let statements;
        if (moduleKind !== ModuleKind.AMD) {
            if (hasSyntacticModifier(node, ModifierFlags.Export)) {
                statements = append(statements, setOriginalNode(setTextRange(factory.createExpressionStatement(createExportExpression(node.name, createRequireCall(node))), node), node));
            }
            else {
                statements = append(statements, setOriginalNode(setTextRange(factory.createVariableStatement(
                /*modifiers*/ undefined, factory.createVariableDeclarationList([
                    factory.createVariableDeclaration(factory.cloneNode(node.name), 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, createRequireCall(node)),
                ], 
                /*flags*/ languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)), node), node));
            }
        }
        else {
            if (hasSyntacticModifier(node, ModifierFlags.Export)) {
                statements = append(statements, setOriginalNode(setTextRange(factory.createExpressionStatement(createExportExpression(factory.getExportName(node), factory.getLocalName(node))), node), node));
            }
        }
        statements = appendExportsOfImportEqualsDeclaration(statements, node);
        return singleOrMany(statements);
    }
    /**
     * Visits an ExportDeclaration node.
     *
     * @param The node to visit.
     */
    function visitTopLevelExportDeclaration(node) {
        if (!node.moduleSpecifier) {
            // Elide export declarations with no module specifier as they are handled
            // elsewhere.
            return undefined;
        }
        const generatedName = factory.getGeneratedNameForNode(node);
        if (node.exportClause && isNamedExports(node.exportClause)) {
            const statements = [];
            // export { x, y } from "mod";
            if (moduleKind !== ModuleKind.AMD) {
                statements.push(setOriginalNode(setTextRange(factory.createVariableStatement(
                /*modifiers*/ undefined, factory.createVariableDeclarationList([
                    factory.createVariableDeclaration(generatedName, 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, createRequireCall(node)),
                ])), 
                /*location*/ node), 
                /* original */ node));
            }
            for (const specifier of node.exportClause.elements) {
                const specifierName = specifier.propertyName || specifier.name;
                const exportNeedsImportDefault = !!getESModuleInterop(compilerOptions) &&
                    !(getInternalEmitFlags(node) & InternalEmitFlags.NeverApplyImportHelper) &&
                    moduleExportNameIsDefault(specifierName);
                const target = exportNeedsImportDefault ? emitHelpers().createImportDefaultHelper(generatedName) : generatedName;
                const exportedValue = specifierName.kind === SyntaxKind.StringLiteral
                    ? factory.createElementAccessExpression(target, specifierName)
                    : factory.createPropertyAccessExpression(target, specifierName);
                statements.push(setOriginalNode(setTextRange(factory.createExpressionStatement(createExportExpression(specifier.name.kind === SyntaxKind.StringLiteral ? factory.cloneNode(specifier.name) : factory.getExportName(specifier), exportedValue, 
                /*location*/ undefined, 
                /*liveBinding*/ true)), specifier), specifier));
            }
            return singleOrMany(statements);
        }
        else if (node.exportClause) {
            const statements = [];
            // export * as ns from "mod";
            // export * as default from "mod";
            statements.push(setOriginalNode(setTextRange(factory.createExpressionStatement(createExportExpression(factory.cloneNode(node.exportClause.name), getHelperExpressionForExport(node, moduleKind !== ModuleKind.AMD ?
                createRequireCall(node) :
                isExportNamespaceAsDefaultDeclaration(node) ? generatedName :
                    node.exportClause.name.kind === SyntaxKind.StringLiteral ? generatedName :
                        factory.createIdentifier(idText(node.exportClause.name))))), node), node));
            return singleOrMany(statements);
        }
        else {
            // export * from "mod";
            return setOriginalNode(setTextRange(factory.createExpressionStatement(emitHelpers().createExportStarHelper(moduleKind !== ModuleKind.AMD ? createRequireCall(node) : generatedName)), node), node);
        }
    }
    /**
     * Visits an ExportAssignment node.
     *
     * @param node The node to visit.
     */
    function visitTopLevelExportAssignment(node) {
        if (node.isExportEquals) {
            return undefined;
        }
        return createExportStatement(factory.createIdentifier("default"), visitNode(node.expression, visitor, isExpression), /*location*/ node, /*allowComments*/ true);
    }
    /**
     * Visits a FunctionDeclaration node.
     *
     * @param node The node to visit.
     */
    function visitFunctionDeclaration(node) {
        let statements;
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            statements = append(statements, setOriginalNode(setTextRange(factory.createFunctionDeclaration(visitNodes(node.modifiers, modifierVisitor, isModifier), node.asteriskToken, factory.getDeclarationName(node, /*allowComments*/ true, /*allowSourceMaps*/ true), 
            /*typeParameters*/ undefined, visitNodes(node.parameters, visitor, isParameter), 
            /*type*/ undefined, visitEachChild(node.body, visitor, context)), 
            /*location*/ node), 
            /*original*/ node));
        }
        else {
            statements = append(statements, visitEachChild(node, visitor, context));
        }
        // NOTE: CommonJS/AMD/UMD exports are hoisted to the top of the module body and do not need to be added here.
        return singleOrMany(statements);
    }
    /**
     * Visits a ClassDeclaration node.
     *
     * @param node The node to visit.
     */
    function visitClassDeclaration(node) {
        let statements;
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            statements = append(statements, setOriginalNode(setTextRange(factory.createClassDeclaration(visitNodes(node.modifiers, modifierVisitor, isModifierLike), factory.getDeclarationName(node, /*allowComments*/ true, /*allowSourceMaps*/ true), 
            /*typeParameters*/ undefined, visitNodes(node.heritageClauses, visitor, isHeritageClause), visitNodes(node.members, visitor, isClassElement)), node), node));
        }
        else {
            statements = append(statements, visitEachChild(node, visitor, context));
        }
        statements = appendExportsOfHoistedDeclaration(statements, node);
        return singleOrMany(statements);
    }
    /**
     * Visits a VariableStatement node.
     *
     * @param node The node to visit.
     */
    function visitVariableStatement(node) {
        let statements;
        let variables;
        let expressions;
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            let modifiers;
            let removeCommentsOnExpressions = false;
            // If we're exporting these variables, then these just become assignments to 'exports.x'.
            for (const variable of node.declarationList.declarations) {
                if (isIdentifier(variable.name) && isLocalName(variable.name)) {
                    // A "local name" generally means a variable declaration that *shouldn't* be
                    // converted to `exports.x = ...`, even if the declaration is exported. This
                    // usually indicates a class or function declaration that was converted into
                    // a variable declaration, as most references to the declaration will remain
                    // untransformed (i.e., `new C` rather than `new exports.C`). In these cases,
                    // an `export { x }` declaration will follow.
                    if (!modifiers) {
                        modifiers = visitNodes(node.modifiers, modifierVisitor, isModifier);
                    }
                    if (variable.initializer) {
                        const updatedVariable = factory.updateVariableDeclaration(variable, variable.name, 
                        /*exclamationToken*/ undefined, 
                        /*type*/ undefined, createExportExpression(variable.name, visitNode(variable.initializer, visitor, isExpression)));
                        variables = append(variables, updatedVariable);
                    }
                    else {
                        variables = append(variables, variable);
                    }
                }
                else if (variable.initializer) {
                    if (!isBindingPattern(variable.name) && (isArrowFunction(variable.initializer) || isFunctionExpression(variable.initializer) || isClassExpression(variable.initializer))) {
                        const expression = factory.createAssignment(setTextRange(factory.createPropertyAccessExpression(factory.createIdentifier("exports"), variable.name), 
                        /*location*/ variable.name), factory.createIdentifier(getTextOfIdentifierOrLiteral(variable.name)));
                        const updatedVariable = factory.createVariableDeclaration(variable.name, variable.exclamationToken, variable.type, visitNode(variable.initializer, visitor, isExpression));
                        variables = append(variables, updatedVariable);
                        expressions = append(expressions, expression);
                        removeCommentsOnExpressions = true;
                    }
                    else {
                        expressions = append(expressions, transformInitializedVariable(variable));
                    }
                }
            }
            if (variables) {
                statements = append(statements, factory.updateVariableStatement(node, modifiers, factory.updateVariableDeclarationList(node.declarationList, variables)));
            }
            if (expressions) {
                const statement = setOriginalNode(setTextRange(factory.createExpressionStatement(factory.inlineExpressions(expressions)), node), node);
                if (removeCommentsOnExpressions) {
                    removeAllComments(statement);
                }
                statements = append(statements, statement);
            }
        }
        else {
            statements = append(statements, visitEachChild(node, visitor, context));
        }
        statements = appendExportsOfVariableStatement(statements, node);
        return singleOrMany(statements);
    }
    function createAllExportExpressions(name, value, location) {
        const exportedNames = getExports(name);
        if (exportedNames) {
            // For each additional export of the declaration, apply an export assignment.
            let expression = isExportName(name) ? value : factory.createAssignment(name, value);
            for (const exportName of exportedNames) {
                // Mark the node to prevent triggering substitution.
                setEmitFlags(expression, EmitFlags.NoSubstitution);
                expression = createExportExpression(exportName, expression, /*location*/ location);
            }
            return expression;
        }
        return factory.createAssignment(name, value);
    }
    /**
     * Transforms an exported variable with an initializer into an expression.
     *
     * @param node The node to transform.
     */
    function transformInitializedVariable(node) {
        if (isBindingPattern(node.name)) {
            return flattenDestructuringAssignment(visitNode(node, visitor, isInitializedVariable), visitor, context, FlattenLevel.All, 
            /*needsValue*/ false, createAllExportExpressions);
        }
        else {
            return factory.createAssignment(setTextRange(factory.createPropertyAccessExpression(factory.createIdentifier("exports"), node.name), 
            /*location*/ node.name), node.initializer ? visitNode(node.initializer, visitor, isExpression) : factory.createVoidZero());
        }
    }
    /**
     * Appends the exports of an ImportDeclaration to a statement list, returning the
     * statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
    function appendExportsOfImportDeclaration(statements, decl) {
        if (currentModuleInfo.exportEquals) {
            return statements;
        }
        const importClause = decl.importClause;
        if (!importClause) {
            return statements;
        }
        const seen = new IdentifierNameMap();
        if (importClause.name) {
            statements = appendExportsOfDeclaration(statements, seen, importClause);
        }
        const namedBindings = importClause.namedBindings;
        if (namedBindings) {
            switch (namedBindings.kind) {
                case SyntaxKind.NamespaceImport:
                    statements = appendExportsOfDeclaration(statements, seen, namedBindings);
                    break;
                case SyntaxKind.NamedImports:
                    for (const importBinding of namedBindings.elements) {
                        statements = appendExportsOfDeclaration(statements, seen, importBinding, /*liveBinding*/ true);
                    }
                    break;
            }
        }
        return statements;
    }
    /**
     * Appends the exports of an ImportEqualsDeclaration to a statement list, returning the
     * statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
    function appendExportsOfImportEqualsDeclaration(statements, decl) {
        if (currentModuleInfo.exportEquals) {
            return statements;
        }
        return appendExportsOfDeclaration(statements, new IdentifierNameMap(), decl);
    }
    /**
     * Appends the exports of a VariableStatement to a statement list, returning the statement
     * list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param node The VariableStatement whose exports are to be recorded.
     */
    function appendExportsOfVariableStatement(statements, node) {
        return appendExportsOfVariableDeclarationList(statements, node.declarationList, /*isForInOrOfInitializer*/ false);
    }
    /**
     * Appends the exports of a VariableDeclarationList to a statement list, returning the statement
     * list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param node The VariableDeclarationList whose exports are to be recorded.
     */
    function appendExportsOfVariableDeclarationList(statements, node, isForInOrOfInitializer) {
        if (currentModuleInfo.exportEquals) {
            return statements;
        }
        for (const decl of node.declarations) {
            statements = appendExportsOfBindingElement(statements, decl, isForInOrOfInitializer);
        }
        return statements;
    }
    /**
     * Appends the exports of a VariableDeclaration or BindingElement to a statement list,
     * returning the statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
    function appendExportsOfBindingElement(statements, decl, isForInOrOfInitializer) {
        if (currentModuleInfo.exportEquals) {
            return statements;
        }
        if (isBindingPattern(decl.name)) {
            for (const element of decl.name.elements) {
                if (!isOmittedExpression(element)) {
                    statements = appendExportsOfBindingElement(statements, element, isForInOrOfInitializer);
                }
            }
        }
        else if (!isGeneratedIdentifier(decl.name) && (!isVariableDeclaration(decl) || decl.initializer || isForInOrOfInitializer)) {
            statements = appendExportsOfDeclaration(statements, new IdentifierNameMap(), decl);
        }
        return statements;
    }
    /**
     * Appends the exports of a ClassDeclaration or FunctionDeclaration to a statement list,
     * returning the statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
    function appendExportsOfHoistedDeclaration(statements, decl) {
        if (currentModuleInfo.exportEquals) {
            return statements;
        }
        const seen = new IdentifierNameMap();
        if (hasSyntacticModifier(decl, ModifierFlags.Export)) {
            const exportName = hasSyntacticModifier(decl, ModifierFlags.Default) ? factory.createIdentifier("default") : factory.getDeclarationName(decl);
            statements = appendExportStatement(statements, seen, exportName, factory.getLocalName(decl), /*location*/ decl);
        }
        if (decl.name) {
            statements = appendExportsOfDeclaration(statements, seen, decl);
        }
        return statements;
    }
    /**
     * Appends the exports of a declaration to a statement list, returning the statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration to export.
     */
    function appendExportsOfDeclaration(statements, seen, decl, liveBinding) {
        const name = factory.getDeclarationName(decl);
        const exportSpecifiers = currentModuleInfo.exportSpecifiers.get(name);
        if (exportSpecifiers) {
            for (const exportSpecifier of exportSpecifiers) {
                statements = appendExportStatement(statements, seen, exportSpecifier.name, name, /*location*/ exportSpecifier.name, /*allowComments*/ undefined, liveBinding);
            }
        }
        return statements;
    }
    /**
     * Appends the down-level representation of an export to a statement list, returning the
     * statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param exportName The name of the export.
     * @param expression The expression to export.
     * @param location The location to use for source maps and comments for the export.
     * @param allowComments Whether to allow comments on the export.
     */
    function appendExportStatement(statements, seen, exportName, expression, location, allowComments, liveBinding) {
        if (exportName.kind !== SyntaxKind.StringLiteral) {
            if (seen.has(exportName)) {
                return statements;
            }
            seen.set(exportName, true);
        }
        statements = append(statements, createExportStatement(exportName, expression, location, allowComments, liveBinding));
        return statements;
    }
    function createUnderscoreUnderscoreESModule() {
        const statement = factory.createExpressionStatement(factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "defineProperty"), 
        /*typeArguments*/ undefined, [
            factory.createIdentifier("exports"),
            factory.createStringLiteral("__esModule"),
            factory.createObjectLiteralExpression([
                factory.createPropertyAssignment("value", factory.createTrue()),
            ]),
        ]));
        setEmitFlags(statement, EmitFlags.CustomPrologue);
        return statement;
    }
    /**
     * Creates a call to the current file's export function to export a value.
     *
     * @param name The bound name of the export.
     * @param value The exported value.
     * @param location The location to use for source maps and comments for the export.
     * @param allowComments An optional value indicating whether to emit comments for the statement.
     */
    function createExportStatement(name, value, location, allowComments, liveBinding) {
        const statement = setTextRange(factory.createExpressionStatement(createExportExpression(name, value, /*location*/ undefined, liveBinding)), location);
        startOnNewLine(statement);
        if (!allowComments) {
            setEmitFlags(statement, EmitFlags.NoComments);
        }
        return statement;
    }
    /**
     * Creates a call to the current file's export function to export a value.
     *
     * @param name The bound name of the export.
     * @param value The exported value.
     * @param location The location to use for source maps and comments for the export.
     */
    function createExportExpression(name, value, location, liveBinding) {
        return setTextRange(liveBinding ? factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "defineProperty"), 
        /*typeArguments*/ undefined, [
            factory.createIdentifier("exports"),
            factory.createStringLiteralFromNode(name),
            factory.createObjectLiteralExpression([
                factory.createPropertyAssignment("enumerable", factory.createTrue()),
                factory.createPropertyAssignment("get", factory.createFunctionExpression(
                /*modifiers*/ undefined, 
                /*asteriskToken*/ undefined, 
                /*name*/ undefined, 
                /*typeParameters*/ undefined, 
                /*parameters*/ [], 
                /*type*/ undefined, factory.createBlock([factory.createReturnStatement(value)]))),
            ]),
        ]) : factory.createAssignment(name.kind === SyntaxKind.StringLiteral
            ? factory.createElementAccessExpression(factory.createIdentifier("exports"), factory.cloneNode(name))
            : factory.createPropertyAccessExpression(factory.createIdentifier("exports"), factory.cloneNode(name)), value), location);
    }
    //
    // Modifier Visitors
    //
    /**
     * Visit nodes to elide module-specific modifiers.
     *
     * @param node The node to visit.
     */
    function modifierVisitor(node) {
        // Elide module-specific modifiers.
        switch (node.kind) {
            case SyntaxKind.ExportKeyword:
            case SyntaxKind.DefaultKeyword:
                return undefined;
        }
        return node;
    }
    //
    // Emit Notification
    //
    /**
     * Hook for node emit notifications.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to emit.
     * @param emit A callback used to emit the node in the printer.
     */
    function onEmitNode(hint, node, emitCallback) {
        if (node.kind === SyntaxKind.SourceFile) {
            currentSourceFile = node;
            currentModuleInfo = moduleInfoMap[getOriginalNodeId(currentSourceFile)];
            previousOnEmitNode(hint, node, emitCallback);
            currentSourceFile = undefined;
            currentModuleInfo = undefined;
        }
        else {
            previousOnEmitNode(hint, node, emitCallback);
        }
    }
    //
    // Substitutions
    //
    /**
     * Hooks node substitutions.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to substitute.
     */
    function onSubstituteNode(hint, node) {
        node = previousOnSubstituteNode(hint, node);
        if (node.id && noSubstitution[node.id]) {
            return node;
        }
        if (hint === EmitHint.Expression) {
            return substituteExpression(node);
        }
        else if (isShorthandPropertyAssignment(node)) {
            return substituteShorthandPropertyAssignment(node);
        }
        return node;
    }
    /**
     * Substitution for a ShorthandPropertyAssignment whose declaration name is an imported
     * or exported symbol.
     *
     * @param node The node to substitute.
     */
    function substituteShorthandPropertyAssignment(node) {
        const name = node.name;
        const exportedOrImportedName = substituteExpressionIdentifier(name);
        if (exportedOrImportedName !== name) {
            // A shorthand property with an assignment initializer is probably part of a
            // destructuring assignment
            if (node.objectAssignmentInitializer) {
                const initializer = factory.createAssignment(exportedOrImportedName, node.objectAssignmentInitializer);
                return setTextRange(factory.createPropertyAssignment(name, initializer), node);
            }
            return setTextRange(factory.createPropertyAssignment(name, exportedOrImportedName), node);
        }
        return node;
    }
    /**
     * Substitution for an Expression that may contain an imported or exported symbol.
     *
     * @param node The node to substitute.
     */
    function substituteExpression(node) {
        switch (node.kind) {
            case SyntaxKind.Identifier:
                return substituteExpressionIdentifier(node);
            case SyntaxKind.CallExpression:
                return substituteCallExpression(node);
            case SyntaxKind.TaggedTemplateExpression:
                return substituteTaggedTemplateExpression(node);
            case SyntaxKind.BinaryExpression:
                return substituteBinaryExpression(node);
        }
        return node;
    }
    function substituteCallExpression(node) {
        if (isIdentifier(node.expression)) {
            const expression = substituteExpressionIdentifier(node.expression);
            noSubstitution[getNodeId(expression)] = true;
            if (!isIdentifier(expression) && !(getEmitFlags(node.expression) & EmitFlags.HelperName)) {
                return addInternalEmitFlags(factory.updateCallExpression(node, expression, /*typeArguments*/ undefined, node.arguments), InternalEmitFlags.IndirectCall);
            }
        }
        return node;
    }
    function substituteTaggedTemplateExpression(node) {
        if (isIdentifier(node.tag)) {
            const tag = substituteExpressionIdentifier(node.tag);
            noSubstitution[getNodeId(tag)] = true;
            if (!isIdentifier(tag) && !(getEmitFlags(node.tag) & EmitFlags.HelperName)) {
                return addInternalEmitFlags(factory.updateTaggedTemplateExpression(node, tag, /*typeArguments*/ undefined, node.template), InternalEmitFlags.IndirectCall);
            }
        }
        return node;
    }
    /**
     * Substitution for an Identifier expression that may contain an imported or exported
     * symbol.
     *
     * @param node The node to substitute.
     */
    function substituteExpressionIdentifier(node) {
        var _a, _b;
        if (getEmitFlags(node) & EmitFlags.HelperName) {
            const externalHelpersModuleName = getExternalHelpersModuleName(currentSourceFile);
            if (externalHelpersModuleName) {
                return factory.createPropertyAccessExpression(externalHelpersModuleName, node);
            }
            return node;
        }
        else if (!(isGeneratedIdentifier(node) && !(node.emitNode.autoGenerate.flags & GeneratedIdentifierFlags.AllowNameSubstitution)) && !isLocalName(node)) {
            const exportContainer = resolver.getReferencedExportContainer(node, isExportName(node));
            if (exportContainer && exportContainer.kind === SyntaxKind.SourceFile) {
                return setTextRange(factory.createPropertyAccessExpression(factory.createIdentifier("exports"), factory.cloneNode(node)), 
                /*location*/ node);
            }
            const importDeclaration = resolver.getReferencedImportDeclaration(node);
            if (importDeclaration) {
                if (isImportClause(importDeclaration)) {
                    return setTextRange(factory.createPropertyAccessExpression(factory.getGeneratedNameForNode(importDeclaration.parent), factory.createIdentifier("default")), 
                    /*location*/ node);
                }
                else if (isImportSpecifier(importDeclaration)) {
                    const name = importDeclaration.propertyName || importDeclaration.name;
                    const target = factory.getGeneratedNameForNode(((_b = (_a = importDeclaration.parent) === null || _a === void 0 ? void 0 : _a.parent) === null || _b === void 0 ? void 0 : _b.parent) || importDeclaration);
                    return setTextRange(name.kind === SyntaxKind.StringLiteral
                        ? factory.createElementAccessExpression(target, factory.cloneNode(name))
                        : factory.createPropertyAccessExpression(target, factory.cloneNode(name)), 
                    /*location*/ node);
                }
            }
        }
        return node;
    }
    /**
     * Substitution for a BinaryExpression that may contain an imported or exported symbol.
     *
     * @param node The node to substitute.
     */
    function substituteBinaryExpression(node) {
        // When we see an assignment expression whose left-hand side is an exported symbol,
        // we should ensure all exports of that symbol are updated with the correct value.
        //
        // - We do not substitute generated identifiers unless they are file-level reserved names.
        // - We do not substitute identifiers tagged with the LocalName flag.
        // - We only substitute identifiers that are exported at the top level.
        if (isAssignmentOperator(node.operatorToken.kind)
            && isIdentifier(node.left)
            && (!isGeneratedIdentifier(node.left) || isFileLevelReservedGeneratedIdentifier(node.left))
            && !isLocalName(node.left)) {
            const exportedNames = getExports(node.left);
            if (exportedNames) {
                // For each additional export of the declaration, apply an export assignment.
                let expression = node;
                for (const exportName of exportedNames) {
                    // Mark the node to prevent triggering this rule again.
                    noSubstitution[getNodeId(expression)] = true;
                    expression = createExportExpression(exportName, expression, /*location*/ node);
                }
                return expression;
            }
        }
        return node;
    }
    /**
     * Gets the additional exports of a name.
     *
     * @param name The name.
     */
    function getExports(name) {
        if (!isGeneratedIdentifier(name)) {
            const importDeclaration = resolver.getReferencedImportDeclaration(name);
            if (importDeclaration) {
                return currentModuleInfo === null || currentModuleInfo === void 0 ? void 0 : currentModuleInfo.exportedBindings[getOriginalNodeId(importDeclaration)];
            }
            // An exported namespace or enum may merge with an ambient declaration, which won't show up in .js emit, so
            // we analyze all value exports of a symbol.
            const bindingsSet = new Set();
            const declarations = resolver.getReferencedValueDeclarations(name);
            if (declarations) {
                for (const declaration of declarations) {
                    const bindings = currentModuleInfo === null || currentModuleInfo === void 0 ? void 0 : currentModuleInfo.exportedBindings[getOriginalNodeId(declaration)];
                    if (bindings) {
                        for (const binding of bindings) {
                            bindingsSet.add(binding);
                        }
                    }
                }
                if (bindingsSet.size) {
                    return arrayFrom(bindingsSet);
                }
            }
        }
        else if (isFileLevelReservedGeneratedIdentifier(name)) {
            const exportSpecifiers = currentModuleInfo === null || currentModuleInfo === void 0 ? void 0 : currentModuleInfo.exportSpecifiers.get(name);
            if (exportSpecifiers) {
                const exportedNames = [];
                for (const exportSpecifier of exportSpecifiers) {
                    exportedNames.push(exportSpecifier.name);
                }
                return exportedNames;
            }
        }
    }
}
// emit helper for dynamic import
const dynamicImportUMDHelper = {
    name: "typescript:dynamicimport-sync-require",
    scoped: true,
    text: `
            var __syncRequire = typeof module === "object" && typeof module.exports === "object";`,
};
