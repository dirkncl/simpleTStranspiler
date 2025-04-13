import {
  addEmitHelpers,
  addRange,
  append,
  arrayFrom,
  chainBundle,
  Debug,
  EmitFlags,
  firstOrUndefined,
  GeneratedIdentifierFlags,
  getEmitFlags,
  hasSyntacticModifier,
  IdentifierNameMap,
  isArray,
  isBindingPattern,
  isBlock,
  isCaseClause,
  isCustomPrologue,
  isExpression,
  isGeneratedIdentifier,
  isIdentifier,
  isLocalName,
  isNamedEvaluation,
  isOmittedExpression,
  isPrologueDirective,
  isSourceFile,
  isStatement,
  isVariableDeclarationList,
  isVariableStatement,
  ModifierFlags,
  NodeFlags,
  setCommentRange,
  setEmitFlags,
  setOriginalNode,
  setSourceMapRange,
  setTextRange,
  skipOuterExpressions,
  SyntaxKind,
  TransformFlags,
  transformNamedEvaluation,
  visitArray,
  visitEachChild,
  visitNode,
  visitNodes,
} from "../namespaces/ts.js";


var UsingKind;
(function (UsingKind) {
    UsingKind[UsingKind["None"] = 0] = "None";
    UsingKind[UsingKind["Sync"] = 1] = "Sync";
    UsingKind[UsingKind["Async"] = 2] = "Async";
})(UsingKind || (UsingKind = {}));


/** @internal */
export function transformESNext(context) {
    // NOTE: We must reevaluate the target for upcoming features when each successive TC39 edition is ratified in
    //       June of each year. This includes changes to `LanguageFeatureMinimumTarget`, `ScriptTarget`,
    //       `ScriptTargetFeatures` transformers/esnext.ts, compiler/commandLineParser.ts,
    //       compiler/utilitiesPublic.ts, and the contents of each lib/esnext.*.d.ts file.
    const { factory, getEmitHelperFactory: emitHelpers, hoistVariableDeclaration, startLexicalEnvironment, endLexicalEnvironment, } = context;
    let exportBindings;
    let exportVars;
    let defaultExportBinding;
    let exportEqualsBinding;
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        const visited = visitNode(node, visitor, isSourceFile);
        addEmitHelpers(visited, context.readEmitHelpers());
        exportVars = undefined;
        exportBindings = undefined;
        defaultExportBinding = undefined;
        return visited;
    }
    function visitor(node) {
        if ((node.transformFlags & TransformFlags.ContainsESNext) === 0) {
            return node;
        }
        switch (node.kind) {
            case SyntaxKind.SourceFile:
                return visitSourceFile(node);
            case SyntaxKind.Block:
                return visitBlock(node);
            case SyntaxKind.ForStatement:
                return visitForStatement(node);
            case SyntaxKind.ForOfStatement:
                return visitForOfStatement(node);
            case SyntaxKind.SwitchStatement:
                return visitSwitchStatement(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    function visitSourceFile(node) {
        const usingKind = getUsingKindOfStatements(node.statements);
        if (usingKind) {
            // Imports and exports must stay at the top level. This means we must hoist all imports, exports, and
            // top-level function declarations and bindings out of the `try` statements we generate. For example:
            //
            // given:
            //
            //  import { w } from "mod";
            //  const x = expr1;
            //  using y = expr2;
            //  const z = expr3;
            //  export function f() {
            //    console.log(z);
            //  }
            //
            // produces:
            //
            //  import { x } from "mod";        // <-- preserved
            //  const x = expr1;                // <-- preserved
            //  var y, z;                       // <-- hoisted
            //  export function f() {           // <-- hoisted
            //    console.log(z);
            //  }
            //  const env_1 = { stack: [], error: void 0, hasError: false };
            //  try {
            //    y = __addDisposableResource(env_1, expr2, false);
            //    z = expr3;
            //  }
            //  catch (e_1) {
            //    env_1.error = e_1;
            //    env_1.hasError = true;
            //  }
            //  finally {
            //    __disposeResource(env_1);
            //  }
            //
            // In this transformation, we hoist `y`, `z`, and `f` to a new outer statement list while moving all other
            // statements in the source file into the `try` block, which is the same approach we use for System module
            // emit. Unlike System module emit, we attempt to preserve all statements prior to the first top-level
            // `using` to isolate the complexity of the transformed output to only where it is necessary.
            startLexicalEnvironment();
            exportBindings = new IdentifierNameMap();
            exportVars = [];
            const prologueCount = countPrologueStatements(node.statements);
            const topLevelStatements = [];
            addRange(topLevelStatements, visitArray(node.statements, visitor, isStatement, 0, prologueCount));
            // Collect and transform any leading statements up to the first `using` or `await using`. This preserves
            // the original statement order much as is possible.
            let pos = prologueCount;
            while (pos < node.statements.length) {
                const statement = node.statements[pos];
                if (getUsingKind(statement) !== 0 /* UsingKind.None */) {
                    if (pos > prologueCount) {
                        addRange(topLevelStatements, visitNodes(node.statements, visitor, isStatement, prologueCount, pos - prologueCount));
                    }
                    break;
                }
                pos++;
            }
            Debug.assert(pos < node.statements.length, "Should have encountered at least one 'using' statement.");
            // transform the rest of the body
            const envBinding = createEnvBinding();
            const bodyStatements = transformUsingDeclarations(node.statements, pos, node.statements.length, envBinding, topLevelStatements);
            // add `export {}` declarations for any hoisted bindings.
            if (exportBindings.size) {
                append(topLevelStatements, factory.createExportDeclaration(
                /*modifiers*/ undefined, 
                /*isTypeOnly*/ false, factory.createNamedExports(arrayFrom(exportBindings.values()))));
            }
            addRange(topLevelStatements, endLexicalEnvironment());
            if (exportVars.length) {
                topLevelStatements.push(factory.createVariableStatement(factory.createModifiersFromModifierFlags(ModifierFlags.Export), factory.createVariableDeclarationList(exportVars, NodeFlags.Let)));
            }
            addRange(topLevelStatements, createDownlevelUsingStatements(bodyStatements, envBinding, usingKind === 2 /* UsingKind.Async */));
            if (exportEqualsBinding) {
                topLevelStatements.push(factory.createExportAssignment(
                /*modifiers*/ undefined, 
                /*isExportEquals*/ true, exportEqualsBinding));
            }
            return factory.updateSourceFile(node, topLevelStatements);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitBlock(node) {
        const usingKind = getUsingKindOfStatements(node.statements);
        if (usingKind) {
            const prologueCount = countPrologueStatements(node.statements);
            const envBinding = createEnvBinding();
            return factory.updateBlock(node, [
                ...visitArray(node.statements, visitor, isStatement, 0, prologueCount),
                ...createDownlevelUsingStatements(transformUsingDeclarations(node.statements, prologueCount, node.statements.length, envBinding, /*topLevelStatements*/ undefined), envBinding, usingKind === 2 /* UsingKind.Async */),
            ]);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitForStatement(node) {
        if (node.initializer && isUsingVariableDeclarationList(node.initializer)) {
            // given:
            //
            //  for (using x = expr; cond; incr) { ... }
            //
            // produces a shallow transformation to:
            //
            //  {
            //    using x = expr;
            //    for (; cond; incr) { ... }
            //  }
            //
            // before handing the shallow transformation back to the visitor for an in-depth transformation.
            return visitNode(factory.createBlock([
                factory.createVariableStatement(/*modifiers*/ undefined, node.initializer),
                factory.updateForStatement(node, 
                /*initializer*/ undefined, node.condition, node.incrementor, node.statement),
            ]), visitor, isStatement);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitForOfStatement(node) {
        if (isUsingVariableDeclarationList(node.initializer)) {
            // given:
            //
            //  for (using x of y) { ... }
            //
            // produces a shallow transformation to:
            //
            //  for (const x_1 of y) {
            //    using x = x;
            //    ...
            //  }
            //
            // before handing the shallow transformation back to the visitor for an in-depth transformation.
            const forInitializer = node.initializer;
            const forDecl = firstOrUndefined(forInitializer.declarations) || factory.createVariableDeclaration(factory.createTempVariable(/*recordTempVariable*/ undefined));
            const isAwaitUsing = getUsingKindOfVariableDeclarationList(forInitializer) === 2 /* UsingKind.Async */;
            const temp = factory.getGeneratedNameForNode(forDecl.name);
            const usingVar = factory.updateVariableDeclaration(forDecl, forDecl.name, /*exclamationToken*/ undefined, /*type*/ undefined, temp);
            const usingVarList = factory.createVariableDeclarationList([usingVar], isAwaitUsing ? NodeFlags.AwaitUsing : NodeFlags.Using);
            const usingVarStatement = factory.createVariableStatement(/*modifiers*/ undefined, usingVarList);
            return visitNode(factory.updateForOfStatement(node, node.awaitModifier, factory.createVariableDeclarationList([
                factory.createVariableDeclaration(temp),
            ], NodeFlags.Const), node.expression, isBlock(node.statement) ?
                factory.updateBlock(node.statement, [
                    usingVarStatement,
                    ...node.statement.statements,
                ]) :
                factory.createBlock([
                    usingVarStatement,
                    node.statement,
                ], /*multiLine*/ true)), visitor, isStatement);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitCaseOrDefaultClause(node, envBinding) {
        if (getUsingKindOfStatements(node.statements) !== 0 /* UsingKind.None */) {
            if (isCaseClause(node)) {
                return factory.updateCaseClause(node, visitNode(node.expression, visitor, isExpression), transformUsingDeclarations(node.statements, /*start*/ 0, node.statements.length, envBinding, /*topLevelStatements*/ undefined));
            }
            else {
                return factory.updateDefaultClause(node, transformUsingDeclarations(node.statements, /*start*/ 0, node.statements.length, envBinding, /*topLevelStatements*/ undefined));
            }
        }
        return visitEachChild(node, visitor, context);
    }
    function visitSwitchStatement(node) {
        // given:
        //
        //  switch (expr) {
        //    case expr:
        //      using res = expr;
        //  }
        //
        // produces:
        //
        //  const env_1 = { stack: [], error: void 0, hasError: false };
        //  try {
        //    switch(expr) {
        //      case expr:
        //        const res = __addDisposableResource(env_1, expr, false);
        //    }
        //  }
        //  catch (e_1) {
        //    env_1.error = e_1;
        //    env_1.hasError = true;
        //  }
        //  finally {
        //     __disposeResources(env_1);
        //  }
        //
        const usingKind = getUsingKindOfCaseOrDefaultClauses(node.caseBlock.clauses);
        if (usingKind) {
            const envBinding = createEnvBinding();
            return createDownlevelUsingStatements([
                factory.updateSwitchStatement(node, visitNode(node.expression, visitor, isExpression), factory.updateCaseBlock(node.caseBlock, node.caseBlock.clauses.map(clause => visitCaseOrDefaultClause(clause, envBinding)))),
            ], envBinding, usingKind === 2 /* UsingKind.Async */);
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Transform `using` declarations in a statement list.
     */
    function transformUsingDeclarations(statementsIn, start, end, envBinding, topLevelStatements) {
        var _a;
        const statements = [];
        for (let i = start; i < end; i++) {
            const statement = statementsIn[i];
            const usingKind = getUsingKind(statement);
            if (usingKind) {
                Debug.assertNode(statement, isVariableStatement);
                const declarations = [];
                for (let declaration of statement.declarationList.declarations) {
                    if (!isIdentifier(declaration.name)) {
                        // Since binding patterns are a grammar error, we reset `declarations` so we don't process this as a `using`.
                        declarations.length = 0;
                        break;
                    }
                    // perform a shallow transform for any named evaluation
                    if (isNamedEvaluation(declaration)) {
                        declaration = transformNamedEvaluation(context, declaration);
                    }
                    const initializer = (_a = visitNode(declaration.initializer, visitor, isExpression)) !== null && _a !== void 0 ? _a : factory.createVoidZero();
                    declarations.push(factory.updateVariableDeclaration(declaration, declaration.name, 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, emitHelpers().createAddDisposableResourceHelper(envBinding, initializer, usingKind === 2 /* UsingKind.Async */)));
                }
                // Only replace the statement if it was valid.
                if (declarations.length) {
                    const varList = factory.createVariableDeclarationList(declarations, NodeFlags.Const);
                    setOriginalNode(varList, statement.declarationList);
                    setTextRange(varList, statement.declarationList);
                    hoistOrAppendNode(factory.updateVariableStatement(statement, /*modifiers*/ undefined, varList));
                    continue;
                }
            }
            const result = visitor(statement);
            if (isArray(result)) {
                result.forEach(hoistOrAppendNode);
            }
            else if (result) {
                hoistOrAppendNode(result);
            }
        }
        return statements;
        function hoistOrAppendNode(node) {
            Debug.assertNode(node, isStatement);
            append(statements, hoist(node));
        }
        function hoist(node) {
            if (!topLevelStatements)
                return node;
            switch (node.kind) {
                case SyntaxKind.ImportDeclaration:
                case SyntaxKind.ImportEqualsDeclaration:
                case SyntaxKind.ExportDeclaration:
                case SyntaxKind.FunctionDeclaration:
                    return hoistImportOrExportOrHoistedDeclaration(node, topLevelStatements);
                case SyntaxKind.ExportAssignment:
                    return hoistExportAssignment(node);
                case SyntaxKind.ClassDeclaration:
                    return hoistClassDeclaration(node);
                case SyntaxKind.VariableStatement:
                    return hoistVariableStatement(node);
            }
            return node;
        }
    }
    function hoistImportOrExportOrHoistedDeclaration(node, topLevelStatements) {
        // NOTE: `node` has already been visited
        topLevelStatements.push(node);
        return undefined;
    }
    function hoistExportAssignment(node) {
        return node.isExportEquals ? hoistExportEquals(node) : hoistExportDefault(node);
    }
    function hoistExportDefault(node) {
        // NOTE: `node` has already been visited
        if (defaultExportBinding) {
            // invalid case of multiple `export default` declarations. Don't assert here, just pass it through
            return node;
        }
        // given:
        //
        //   export default expr;
        //
        // produces:
        //
        //   // top level
        //   var default_1;
        //   export { default_1 as default };
        //
        //   // body
        //   default_1 = expr;
        defaultExportBinding = factory.createUniqueName("_default", GeneratedIdentifierFlags.ReservedInNestedScopes | GeneratedIdentifierFlags.FileLevel | GeneratedIdentifierFlags.Optimistic);
        hoistBindingIdentifier(defaultExportBinding, /*isExport*/ true, "default", node);
        // give a class or function expression an assigned name, if needed.
        let expression = node.expression;
        let innerExpression = skipOuterExpressions(expression);
        if (isNamedEvaluation(innerExpression)) {
            innerExpression = transformNamedEvaluation(context, innerExpression, /*ignoreEmptyStringLiteral*/ false, "default");
            expression = factory.restoreOuterExpressions(expression, innerExpression);
        }
        const assignment = factory.createAssignment(defaultExportBinding, expression);
        return factory.createExpressionStatement(assignment);
    }
    function hoistExportEquals(node) {
        // NOTE: `node` has already been visited
        if (exportEqualsBinding) {
            // invalid case of multiple `export default` declarations. Don't assert here, just pass it through
            return node;
        }
        // given:
        //
        //   export = expr;
        //
        // produces:
        //
        //   // top level
        //   var default_1;
        //
        //   try {
        //       // body
        //       default_1 = expr;
        //   } ...
        //
        //   // top level suffix
        //   export = default_1;
        exportEqualsBinding = factory.createUniqueName("_default", GeneratedIdentifierFlags.ReservedInNestedScopes | GeneratedIdentifierFlags.FileLevel | GeneratedIdentifierFlags.Optimistic);
        hoistVariableDeclaration(exportEqualsBinding);
        // give a class or function expression an assigned name, if needed.
        const assignment = factory.createAssignment(exportEqualsBinding, node.expression);
        return factory.createExpressionStatement(assignment);
    }
    function hoistClassDeclaration(node) {
        // NOTE: `node` has already been visited
        if (!node.name && defaultExportBinding) {
            // invalid case of multiple `export default` declarations. Don't assert here, just pass it through
            return node;
        }
        const isExported = hasSyntacticModifier(node, ModifierFlags.Export);
        const isDefault = hasSyntacticModifier(node, ModifierFlags.Default);
        // When hoisting a class declaration at the top level of a file containing a top-level `using` statement, we
        // must first convert it to a class expression so that we can hoist the binding outside of the `try`.
        let expression = factory.converters.convertToClassExpression(node);
        if (node.name) {
            // given:
            //
            //  using x = expr;
            //  class C {}
            //
            // produces:
            //
            //  var x, C;
            //  const env_1 = { ... };
            //  try {
            //    x = __addDisposableResource(env_1, expr, false);
            //    C = class {};
            //  }
            //  catch (e_1) {
            //    env_1.error = e_1;
            //    env_1.hasError = true;
            //  }
            //  finally {
            //    __disposeResources(env_1);
            //  }
            //
            // If the class is exported, we also produce an `export { C };`
            hoistBindingIdentifier(factory.getLocalName(node), isExported && !isDefault, /*exportAlias*/ undefined, node);
            expression = factory.createAssignment(factory.getDeclarationName(node), expression);
            if (isNamedEvaluation(expression)) {
                expression = transformNamedEvaluation(context, expression, /*ignoreEmptyStringLiteral*/ false);
            }
            setOriginalNode(expression, node);
            setSourceMapRange(expression, node);
            setCommentRange(expression, node);
        }
        if (isDefault && !defaultExportBinding) {
            // In the case of a default export, we create a temporary variable that we export as the default and then
            // assign to that variable.
            //
            // given:
            //
            //  using x = expr;
            //  export default class C {}
            //
            // produces:
            //
            //  export { default_1 as default };
            //  var x, C, default_1;
            //  const env_1 = { ... };
            //  try {
            //    x = __addDisposableResource(env_1, expr, false);
            //    default_1 = C = class {};
            //  }
            //  catch (e_1) {
            //    env_1.error = e_1;
            //    env_1.hasError = true;
            //  }
            //  finally {
            //    __disposeResources(env_1);
            //  }
            //
            // Though we will never reassign `default_1`, this most closely matches the specified runtime semantics.
            defaultExportBinding = factory.createUniqueName("_default", GeneratedIdentifierFlags.ReservedInNestedScopes | GeneratedIdentifierFlags.FileLevel | GeneratedIdentifierFlags.Optimistic);
            hoistBindingIdentifier(defaultExportBinding, /*isExport*/ true, "default", node);
            expression = factory.createAssignment(defaultExportBinding, expression);
            if (isNamedEvaluation(expression)) {
                expression = transformNamedEvaluation(context, expression, /*ignoreEmptyStringLiteral*/ false, "default");
            }
            setOriginalNode(expression, node);
        }
        return factory.createExpressionStatement(expression);
    }
    function hoistVariableStatement(node) {
        // NOTE: `node` has already been visited
        let expressions;
        const isExported = hasSyntacticModifier(node, ModifierFlags.Export);
        for (const variable of node.declarationList.declarations) {
            hoistBindingElement(variable, isExported, variable);
            if (variable.initializer) {
                expressions = append(expressions, hoistInitializedVariable(variable));
            }
        }
        if (expressions) {
            const statement = factory.createExpressionStatement(factory.inlineExpressions(expressions));
            setOriginalNode(statement, node);
            setCommentRange(statement, node);
            setSourceMapRange(statement, node);
            return statement;
        }
        return undefined;
    }
    function hoistInitializedVariable(node) {
        // NOTE: `node` has already been visited
        Debug.assertIsDefined(node.initializer);
        let target;
        if (isIdentifier(node.name)) {
            target = factory.cloneNode(node.name);
            setEmitFlags(target, getEmitFlags(target) & ~(EmitFlags.LocalName | EmitFlags.ExportName | EmitFlags.InternalName));
        }
        else {
            target = factory.converters.convertToAssignmentPattern(node.name);
        }
        const assignment = factory.createAssignment(target, node.initializer);
        setOriginalNode(assignment, node);
        setCommentRange(assignment, node);
        setSourceMapRange(assignment, node);
        return assignment;
    }
    function hoistBindingElement(node, isExportedDeclaration, original) {
        // NOTE: `node` has already been visited
        if (isBindingPattern(node.name)) {
            for (const element of node.name.elements) {
                if (!isOmittedExpression(element)) {
                    hoistBindingElement(element, isExportedDeclaration, original);
                }
            }
        }
        else {
            hoistBindingIdentifier(node.name, isExportedDeclaration, /*exportAlias*/ undefined, original);
        }
    }
    function hoistBindingIdentifier(node, isExport, exportAlias, original) {
        // NOTE: `node` has already been visited
        const name = isGeneratedIdentifier(node) ? node : factory.cloneNode(node);
        if (isExport) {
            if (exportAlias === undefined && !isLocalName(name)) {
                const varDecl = factory.createVariableDeclaration(name);
                if (original) {
                    setOriginalNode(varDecl, original);
                }
                exportVars.push(varDecl);
                return;
            }
            const localName = exportAlias !== undefined ? name : undefined;
            const exportName = exportAlias !== undefined ? exportAlias : name;
            const specifier = factory.createExportSpecifier(/*isTypeOnly*/ false, localName, exportName);
            if (original) {
                setOriginalNode(specifier, original);
            }
            exportBindings.set(name, specifier);
        }
        hoistVariableDeclaration(name);
    }
    function createEnvBinding() {
        return factory.createUniqueName("env");
    }
    function createDownlevelUsingStatements(bodyStatements, envBinding, async) {
        const statements = [];
        // produces:
        //
        //  const env_1 = { stack: [], error: void 0, hasError: false };
        //
        const envObject = factory.createObjectLiteralExpression([
            factory.createPropertyAssignment("stack", factory.createArrayLiteralExpression()),
            factory.createPropertyAssignment("error", factory.createVoidZero()),
            factory.createPropertyAssignment("hasError", factory.createFalse()),
        ]);
        const envVar = factory.createVariableDeclaration(envBinding, /*exclamationToken*/ undefined, /*type*/ undefined, envObject);
        const envVarList = factory.createVariableDeclarationList([envVar], NodeFlags.Const);
        const envVarStatement = factory.createVariableStatement(/*modifiers*/ undefined, envVarList);
        statements.push(envVarStatement);
        // when `async` is `false`, produces:
        //
        //  try {
        //    <bodyStatements>
        //  }
        //  catch (e_1) {
        //      env_1.error = e_1;
        //      env_1.hasError = true;
        //  }
        //  finally {
        //    __disposeResources(env_1);
        //  }
        // when `async` is `true`, produces:
        //
        //  try {
        //    <bodyStatements>
        //  }
        //  catch (e_1) {
        //      env_1.error = e_1;
        //      env_1.hasError = true;
        //  }
        //  finally {
        //    const result_1 = __disposeResources(env_1);
        //    if (result_1) {
        //      await result_1;
        //    }
        //  }
        // Unfortunately, it is necessary to use two properties to indicate an error because `throw undefined` is legal
        // JavaScript.
        const tryBlock = factory.createBlock(bodyStatements, /*multiLine*/ true);
        const bodyCatchBinding = factory.createUniqueName("e");
        const catchClause = factory.createCatchClause(bodyCatchBinding, factory.createBlock([
            factory.createExpressionStatement(factory.createAssignment(factory.createPropertyAccessExpression(envBinding, "error"), bodyCatchBinding)),
            factory.createExpressionStatement(factory.createAssignment(factory.createPropertyAccessExpression(envBinding, "hasError"), factory.createTrue())),
        ], /*multiLine*/ true));
        let finallyBlock;
        if (async) {
            const result = factory.createUniqueName("result");
            finallyBlock = factory.createBlock([
                factory.createVariableStatement(
                /*modifiers*/ undefined, factory.createVariableDeclarationList([
                    factory.createVariableDeclaration(result, 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, emitHelpers().createDisposeResourcesHelper(envBinding)),
                ], NodeFlags.Const)),
                factory.createIfStatement(result, factory.createExpressionStatement(factory.createAwaitExpression(result))),
            ], /*multiLine*/ true);
        }
        else {
            finallyBlock = factory.createBlock([
                factory.createExpressionStatement(emitHelpers().createDisposeResourcesHelper(envBinding)),
            ], /*multiLine*/ true);
        }
        const tryStatement = factory.createTryStatement(tryBlock, catchClause, finallyBlock);
        statements.push(tryStatement);
        return statements;
    }
}
function countPrologueStatements(statements) {
    for (let i = 0; i < statements.length; i++) {
        if (!isPrologueDirective(statements[i]) && !isCustomPrologue(statements[i])) {
            return i;
        }
    }
    return 0;
}
function isUsingVariableDeclarationList(node) {
    return isVariableDeclarationList(node) && getUsingKindOfVariableDeclarationList(node) !== 0 /* UsingKind.None */;
}
function getUsingKindOfVariableDeclarationList(node) {
    return (node.flags & NodeFlags.BlockScoped) === NodeFlags.AwaitUsing ? 2 /* UsingKind.Async */ :
        (node.flags & NodeFlags.BlockScoped) === NodeFlags.Using ? 1 /* UsingKind.Sync */ :
            0 /* UsingKind.None */;
}
function getUsingKindOfVariableStatement(node) {
    return getUsingKindOfVariableDeclarationList(node.declarationList);
}
function getUsingKind(statement) {
    return isVariableStatement(statement) ? getUsingKindOfVariableStatement(statement) : 0 /* UsingKind.None */;
}
function getUsingKindOfStatements(statements) {
    let result = 0 /* UsingKind.None */;
    for (const statement of statements) {
        const usingKind = getUsingKind(statement);
        if (usingKind === 2 /* UsingKind.Async */)
            return 2 /* UsingKind.Async */;
        if (usingKind > result)
            result = usingKind;
    }
    return result;
}
function getUsingKindOfCaseOrDefaultClauses(clauses) {
    let result = 0 /* UsingKind.None */;
    for (const clause of clauses) {
        const usingKind = getUsingKindOfStatements(clause.statements);
        if (usingKind === 2 /* UsingKind.Async */)
            return 2 /* UsingKind.Async */;
        if (usingKind > result)
            result = usingKind;
    }
    return result;
}
