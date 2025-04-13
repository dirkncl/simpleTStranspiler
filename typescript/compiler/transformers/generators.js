import {
  addEmitHelpers,
  addSyntheticTrailingComment,
  Associativity,
  chainBundle,
  createExpressionForObjectLiteralElementLike,
  Debug,
  EmitFlags,
  EmitHint,
  forEach,
  getEmitFlags,
  getEmitScriptTarget,
  getExpressionAssociativity,
  getInitializedVariables,
  getNonAssignmentOperatorForCompoundAssignment,
  getOriginalNode,
  getOriginalNodeId,
  idText,
  insertStatementsAfterStandardPrologue,
  isBinaryExpression,
  isBlock,
  isCompoundAssignment,
  isExpression,
  isFunctionLikeDeclaration,
  isGeneratedIdentifier,
  isIdentifier,
  isImportCall,
  isLeftHandSideExpression,
  isLogicalOperator,
  isObjectLiteralElementLike,
  isStatement,
  isVariableDeclarationList,
  lastOrUndefined,
  map,
  reduceLeft,
  setCommentRange,
  setEmitFlags,
  setOriginalNode,
  setParent,
  setSourceMapRange,
  setTextRange,
  startOnNewLine,
  SyntaxKind,
  TransformFlags,
  visitEachChild,
  visitIterationBody,
  visitNode,
  visitNodes,
  visitParameterList,
} from "../_namespaces/ts.js";

// Transforms generator functions into a compatible ES5 representation with similar runtime
// semantics. This is accomplished by first transforming the body of each generator
// function into an intermediate representation that is the compiled into a JavaScript
// switch statement.
//
// Many functions in this transformer will contain comments indicating the expected
// intermediate representation. For illustrative purposes, the following intermediate
// language is used to define this intermediate representation:
//
//  .nop                            - Performs no operation.
//  .local NAME, ...                - Define local variable declarations.
//  .mark LABEL                     - Mark the location of a label.
//  .br LABEL                       - Jump to a label. If jumping out of a protected
//                                    region, all .finally blocks are executed.
//  .brtrue LABEL, (x)              - Jump to a label IIF the expression `x` is truthy.
//                                    If jumping out of a protected region, all .finally
//                                    blocks are executed.
//  .brfalse LABEL, (x)             - Jump to a label IIF the expression `x` is falsey.
//                                    If jumping out of a protected region, all .finally
//                                    blocks are executed.
//  .yield (x)                      - Yield the value of the optional expression `x`.
//                                    Resume at the next label.
//  .yieldstar (x)                  - Delegate yield to the value of the optional
//                                    expression `x`. Resume at the next label.
//                                    NOTE: `x` must be an Iterator, not an Iterable.
//  .loop CONTINUE, BREAK           - Marks the beginning of a loop. Any "continue" or
//                                    "break" abrupt completions jump to the CONTINUE or
//                                    BREAK labels, respectively.
//  .endloop                        - Marks the end of a loop.
//  .with (x)                       - Marks the beginning of a WithStatement block, using
//                                    the supplied expression.
//  .endwith                        - Marks the end of a WithStatement.
//  .switch                         - Marks the beginning of a SwitchStatement.
//  .endswitch                      - Marks the end of a SwitchStatement.
//  .labeled NAME                   - Marks the beginning of a LabeledStatement with the
//                                    supplied name.
//  .endlabeled                     - Marks the end of a LabeledStatement.
//  .try TRY, CATCH, FINALLY, END   - Marks the beginning of a protected region, and the
//                                    labels for each block.
//  .catch (x)                      - Marks the beginning of a catch block.
//  .finally                        - Marks the beginning of a finally block.
//  .endfinally                     - Marks the end of a finally block.
//  .endtry                         - Marks the end of a protected region.
//  .throw (x)                      - Throws the value of the expression `x`.
//  .return (x)                     - Returns the value of the expression `x`.
//
// In addition, the illustrative intermediate representation introduces some special
// variables:
//
//  %sent%                          - Either returns the next value sent to the generator,
//                                    returns the result of a delegated yield, or throws
//                                    the exception sent to the generator.
//  %error%                         - Returns the value of the current exception in a
//                                    catch block.
//
// This intermediate representation is then compiled into JavaScript syntax. The resulting
// compilation output looks something like the following:
//
//  function f() {
//      var /*locals*/;
//      /*functions*/
//      return __generator(function (state) {
//          switch (state.label) {
//              /*cases per label*/
//          }
//      });
//  }
//
// Each of the above instructions corresponds to JavaScript emit similar to the following:
//
//  .local NAME                   | var NAME;
// -------------------------------|----------------------------------------------
//  .mark LABEL                   | case LABEL:
// -------------------------------|----------------------------------------------
//  .br LABEL                     |     return [3 /*break*/, LABEL];
// -------------------------------|----------------------------------------------
//  .brtrue LABEL, (x)            |     if (x) return [3 /*break*/, LABEL];
// -------------------------------|----------------------------------------------
//  .brfalse LABEL, (x)           |     if (!(x)) return [3, /*break*/, LABEL];
// -------------------------------|----------------------------------------------
//  .yield (x)                    |     return [4 /*yield*/, x];
//  .mark RESUME                  | case RESUME:
//      a = %sent%;               |     a = state.sent();
// -------------------------------|----------------------------------------------
//  .yieldstar (x)                |     return [5 /*yield**/, x];
//  .mark RESUME                  | case RESUME:
//      a = %sent%;               |     a = state.sent();
// -------------------------------|----------------------------------------------
//  .with (_a)                    |     with (_a) {
//      a();                      |         a();
//                                |     }
//                                |     state.label = LABEL;
//  .mark LABEL                   | case LABEL:
//                                |     with (_a) {
//      b();                      |         b();
//                                |     }
//  .endwith                      |
// -------------------------------|----------------------------------------------
//                                | case 0:
//                                |     state.trys = [];
//                                | ...
//  .try TRY, CATCH, FINALLY, END |
//  .mark TRY                     | case TRY:
//                                |     state.trys.push([TRY, CATCH, FINALLY, END]);
//  .nop                          |
//      a();                      |     a();
//  .br END                       |     return [3 /*break*/, END];
//  .catch (e)                    |
//  .mark CATCH                   | case CATCH:
//                                |     e = state.sent();
//      b();                      |     b();
//  .br END                       |     return [3 /*break*/, END];
//  .finally                      |
//  .mark FINALLY                 | case FINALLY:
//      c();                      |     c();
//  .endfinally                   |     return [7 /*endfinally*/];
//  .endtry                       |
//  .mark END                     | case END:
// dprint-ignore

//const enum OpCode {
//    Nop,                    // No operation, used to force a new case in the state machine
//    Statement,              // A regular javascript statement
//    Assign,                 // An assignment
//    Break,                  // A break instruction used to jump to a label
//    BreakWhenTrue,          // A break instruction used to jump to a label if a condition evaluates to true
//    BreakWhenFalse,         // A break instruction used to jump to a label if a condition evaluates to false
//    Yield,                  // A completion instruction for the `yield` keyword
//    YieldStar,              // A completion instruction for the `yield*` keyword (not implemented, but reserved for future use)
//    Return,                 // A completion instruction for the `return` keyword
//    Throw,                  // A completion instruction for the `throw` keyword
//    Endfinally,              // Marks the end of a `finally` block
//}

var OpCode;
(function (OpCode) {
    OpCode[OpCode["Nop"] = 0] = "Nop";
    OpCode[OpCode["Statement"] = 1] = "Statement";
    OpCode[OpCode["Assign"] = 2] = "Assign";
    OpCode[OpCode["Break"] = 3] = "Break";
    OpCode[OpCode["BreakWhenTrue"] = 4] = "BreakWhenTrue";
    OpCode[OpCode["BreakWhenFalse"] = 5] = "BreakWhenFalse";
    OpCode[OpCode["Yield"] = 6] = "Yield";
    OpCode[OpCode["YieldStar"] = 7] = "YieldStar";
    OpCode[OpCode["Return"] = 8] = "Return";
    OpCode[OpCode["Throw"] = 9] = "Throw";
    OpCode[OpCode["Endfinally"] = 10] = "Endfinally";
})(OpCode || (OpCode = {}));


// whether a generated code block is opening or closing at the current operation for a FunctionBuilder
var BlockAction;
(function (BlockAction) {
    BlockAction[BlockAction["Open"] = 0] = "Open";
    BlockAction[BlockAction["Close"] = 1] = "Close";
})(BlockAction || (BlockAction = {}));

// the kind for a generated code block in a FunctionBuilder
var CodeBlockKind;
(function (CodeBlockKind) {
    CodeBlockKind[CodeBlockKind["Exception"] = 0] = "Exception";
    CodeBlockKind[CodeBlockKind["With"] = 1] = "With";
    CodeBlockKind[CodeBlockKind["Switch"] = 2] = "Switch";
    CodeBlockKind[CodeBlockKind["Loop"] = 3] = "Loop";
    CodeBlockKind[CodeBlockKind["Labeled"] = 4] = "Labeled";
})(CodeBlockKind || (CodeBlockKind = {}));

// the state for a generated code exception block
var ExceptionBlockState;
(function (ExceptionBlockState) {
    ExceptionBlockState[ExceptionBlockState["Try"] = 0] = "Try";
    ExceptionBlockState[ExceptionBlockState["Catch"] = 1] = "Catch";
    ExceptionBlockState[ExceptionBlockState["Finally"] = 2] = "Finally";
    ExceptionBlockState[ExceptionBlockState["Done"] = 3] = "Done";
})(ExceptionBlockState || (ExceptionBlockState = {}));

// NOTE: changes to this enum should be reflected in the __generator helper.
var Instruction;
(function (Instruction) {
    Instruction[Instruction["Next"] = 0] = "Next";
    Instruction[Instruction["Throw"] = 1] = "Throw";
    Instruction[Instruction["Return"] = 2] = "Return";
    Instruction[Instruction["Break"] = 3] = "Break";
    Instruction[Instruction["Yield"] = 4] = "Yield";
    Instruction[Instruction["YieldStar"] = 5] = "YieldStar";
    Instruction[Instruction["Catch"] = 6] = "Catch";
    Instruction[Instruction["Endfinally"] = 7] = "Endfinally";
})(Instruction || (Instruction = {}));

function getInstructionName(instruction) {
    switch (instruction) {
        case 2 /* Instruction.Return */:
            return "return";
        case 3 /* Instruction.Break */:
            return "break";
        case 4 /* Instruction.Yield */:
            return "yield";
        case 5 /* Instruction.YieldStar */:
            return "yield*";
        case 7 /* Instruction.Endfinally */:
            return "endfinally";
        default:
            return undefined; // TODO: GH#18217
    }
}

/** @internal */
export function transformGenerators(context) {
    const { factory, getEmitHelperFactory: emitHelpers, resumeLexicalEnvironment, endLexicalEnvironment, hoistFunctionDeclaration, hoistVariableDeclaration, } = context;
    const compilerOptions = context.getCompilerOptions();
    const languageVersion = getEmitScriptTarget(compilerOptions);
    const resolver = context.getEmitResolver();
    const previousOnSubstituteNode = context.onSubstituteNode;
    context.onSubstituteNode = onSubstituteNode;
    let renamedCatchVariables;
    let renamedCatchVariableDeclarations;
    let inGeneratorFunctionBody;
    let inStatementContainingYield;
    // The following three arrays store information about generated code blocks.
    // All three arrays are correlated by their index. This approach is used over allocating
    // objects to store the same information to avoid GC overhead.
    //
    let blocks; // Information about the code block
    let blockOffsets; // The operation offset at which a code block begins or ends
    let blockActions; // Whether the code block is opened or closed
    let blockStack; // A stack of currently open code blocks
    // Labels are used to mark locations in the code that can be the target of a Break (jump)
    // operation. These are translated into case clauses in a switch statement.
    // The following two arrays are correlated by their index. This approach is used over
    // allocating objects to store the same information to avoid GC overhead.
    //
    let labelOffsets; // The operation offset at which the label is defined.
    let labelExpressions; // The NumericLiteral nodes bound to each label.
    let nextLabelId = 1; // The next label id to use.
    // Operations store information about generated code for the function body. This
    // Includes things like statements, assignments, breaks (jumps), and yields.
    // The following three arrays are correlated by their index. This approach is used over
    // allocating objects to store the same information to avoid GC overhead.
    //
    let operations; // The operation to perform.
    let operationArguments; // The arguments to the operation.
    let operationLocations; // The source map location for the operation.
    let state; // The name of the state object used by the generator at runtime.
    // The following variables store information used by the `build` function:
    //
    let blockIndex = 0; // The index of the current block.
    let labelNumber = 0; // The current label number.
    let labelNumbers;
    let lastOperationWasAbrupt; // Indicates whether the last operation was abrupt (break/continue).
    let lastOperationWasCompletion; // Indicates whether the last operation was a completion (return/throw).
    let clauses; // The case clauses generated for labels.
    let statements; // The statements for the current label.
    let exceptionBlockStack; // A stack of containing exception blocks.
    let currentExceptionBlock; // The current exception block.
    let withBlockStack; // A stack containing `with` blocks.
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile || (node.transformFlags & TransformFlags.ContainsGenerator) === 0) {
            return node;
        }
        const visited = visitEachChild(node, visitor, context);
        addEmitHelpers(visited, context.readEmitHelpers());
        return visited;
    }
    /**
     * Visits a node.
     *
     * @param node The node to visit.
     */
    function visitor(node) {
        const transformFlags = node.transformFlags;
        if (inStatementContainingYield) {
            return visitJavaScriptInStatementContainingYield(node);
        }
        else if (inGeneratorFunctionBody) {
            return visitJavaScriptInGeneratorFunctionBody(node);
        }
        else if (isFunctionLikeDeclaration(node) && node.asteriskToken) {
            return visitGenerator(node);
        }
        else if (transformFlags & TransformFlags.ContainsGenerator) {
            return visitEachChild(node, visitor, context);
        }
        else {
            return node;
        }
    }
    /**
     * Visits a node that is contained within a statement that contains yield.
     *
     * @param node The node to visit.
     */
    function visitJavaScriptInStatementContainingYield(node) {
        switch (node.kind) {
            case SyntaxKind.DoStatement:
                return visitDoStatement(node);
            case SyntaxKind.WhileStatement:
                return visitWhileStatement(node);
            case SyntaxKind.SwitchStatement:
                return visitSwitchStatement(node);
            case SyntaxKind.LabeledStatement:
                return visitLabeledStatement(node);
            default:
                return visitJavaScriptInGeneratorFunctionBody(node);
        }
    }
    /**
     * Visits a node that is contained within a generator function.
     *
     * @param node The node to visit.
     */
    function visitJavaScriptInGeneratorFunctionBody(node) {
        switch (node.kind) {
            case SyntaxKind.FunctionDeclaration:
                return visitFunctionDeclaration(node);
            case SyntaxKind.FunctionExpression:
                return visitFunctionExpression(node);
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
                return visitAccessorDeclaration(node);
            case SyntaxKind.VariableStatement:
                return visitVariableStatement(node);
            case SyntaxKind.ForStatement:
                return visitForStatement(node);
            case SyntaxKind.ForInStatement:
                return visitForInStatement(node);
            case SyntaxKind.BreakStatement:
                return visitBreakStatement(node);
            case SyntaxKind.ContinueStatement:
                return visitContinueStatement(node);
            case SyntaxKind.ReturnStatement:
                return visitReturnStatement(node);
            default:
                if (node.transformFlags & TransformFlags.ContainsYield) {
                    return visitJavaScriptContainingYield(node);
                }
                else if (node.transformFlags & (TransformFlags.ContainsGenerator | TransformFlags.ContainsHoistedDeclarationOrCompletion)) {
                    return visitEachChild(node, visitor, context);
                }
                else {
                    return node;
                }
        }
    }
    /**
     * Visits a node that contains a YieldExpression.
     *
     * @param node The node to visit.
     */
    function visitJavaScriptContainingYield(node) {
        switch (node.kind) {
            case SyntaxKind.BinaryExpression:
                return visitBinaryExpression(node);
            case SyntaxKind.CommaListExpression:
                return visitCommaListExpression(node);
            case SyntaxKind.ConditionalExpression:
                return visitConditionalExpression(node);
            case SyntaxKind.YieldExpression:
                return visitYieldExpression(node);
            case SyntaxKind.ArrayLiteralExpression:
                return visitArrayLiteralExpression(node);
            case SyntaxKind.ObjectLiteralExpression:
                return visitObjectLiteralExpression(node);
            case SyntaxKind.ElementAccessExpression:
                return visitElementAccessExpression(node);
            case SyntaxKind.CallExpression:
                return visitCallExpression(node);
            case SyntaxKind.NewExpression:
                return visitNewExpression(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    /**
     * Visits a generator function.
     *
     * @param node The node to visit.
     */
    function visitGenerator(node) {
        switch (node.kind) {
            case SyntaxKind.FunctionDeclaration:
                return visitFunctionDeclaration(node);
            case SyntaxKind.FunctionExpression:
                return visitFunctionExpression(node);
            default:
                return Debug.failBadSyntaxKind(node);
        }
    }
    /**
     * Visits a function declaration.
     *
     * This will be called when one of the following conditions are met:
     * - The function declaration is a generator function.
     * - The function declaration is contained within the body of a generator function.
     *
     * @param node The node to visit.
     */
    function visitFunctionDeclaration(node) {
        // Currently, we only support generators that were originally async functions.
        if (node.asteriskToken) {
            node = setOriginalNode(setTextRange(factory.createFunctionDeclaration(node.modifiers, 
            /*asteriskToken*/ undefined, node.name, 
            /*typeParameters*/ undefined, visitParameterList(node.parameters, visitor, context), 
            /*type*/ undefined, transformGeneratorFunctionBody(node.body)), 
            /*location*/ node), node);
        }
        else {
            const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
            const savedInStatementContainingYield = inStatementContainingYield;
            inGeneratorFunctionBody = false;
            inStatementContainingYield = false;
            node = visitEachChild(node, visitor, context);
            inGeneratorFunctionBody = savedInGeneratorFunctionBody;
            inStatementContainingYield = savedInStatementContainingYield;
        }
        if (inGeneratorFunctionBody) {
            // Function declarations in a generator function body are hoisted
            // to the top of the lexical scope and elided from the current statement.
            hoistFunctionDeclaration(node);
            return undefined;
        }
        else {
            return node;
        }
    }
    /**
     * Visits a function expression.
     *
     * This will be called when one of the following conditions are met:
     * - The function expression is a generator function.
     * - The function expression is contained within the body of a generator function.
     *
     * @param node The node to visit.
     */
    function visitFunctionExpression(node) {
        // Currently, we only support generators that were originally async functions.
        if (node.asteriskToken) {
            node = setOriginalNode(setTextRange(factory.createFunctionExpression(
            /*modifiers*/ undefined, 
            /*asteriskToken*/ undefined, node.name, 
            /*typeParameters*/ undefined, visitParameterList(node.parameters, visitor, context), 
            /*type*/ undefined, transformGeneratorFunctionBody(node.body)), 
            /*location*/ node), node);
        }
        else {
            const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
            const savedInStatementContainingYield = inStatementContainingYield;
            inGeneratorFunctionBody = false;
            inStatementContainingYield = false;
            node = visitEachChild(node, visitor, context);
            inGeneratorFunctionBody = savedInGeneratorFunctionBody;
            inStatementContainingYield = savedInStatementContainingYield;
        }
        return node;
    }
    /**
     * Visits a get or set accessor declaration.
     *
     * This will be called when one of the following conditions are met:
     * - The accessor is contained within the body of a generator function.
     *
     * @param node The node to visit.
     */
    function visitAccessorDeclaration(node) {
        const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
        const savedInStatementContainingYield = inStatementContainingYield;
        inGeneratorFunctionBody = false;
        inStatementContainingYield = false;
        node = visitEachChild(node, visitor, context);
        inGeneratorFunctionBody = savedInGeneratorFunctionBody;
        inStatementContainingYield = savedInStatementContainingYield;
        return node;
    }
    /**
     * Transforms the body of a generator function declaration.
     *
     * @param node The function body to transform.
     */
    function transformGeneratorFunctionBody(body) {
        // Save existing generator state
        const statements = [];
        const savedInGeneratorFunctionBody = inGeneratorFunctionBody;
        const savedInStatementContainingYield = inStatementContainingYield;
        const savedBlocks = blocks;
        const savedBlockOffsets = blockOffsets;
        const savedBlockActions = blockActions;
        const savedBlockStack = blockStack;
        const savedLabelOffsets = labelOffsets;
        const savedLabelExpressions = labelExpressions;
        const savedNextLabelId = nextLabelId;
        const savedOperations = operations;
        const savedOperationArguments = operationArguments;
        const savedOperationLocations = operationLocations;
        const savedState = state;
        // Initialize generator state
        inGeneratorFunctionBody = true;
        inStatementContainingYield = false;
        blocks = undefined;
        blockOffsets = undefined;
        blockActions = undefined;
        blockStack = undefined;
        labelOffsets = undefined;
        labelExpressions = undefined;
        nextLabelId = 1;
        operations = undefined;
        operationArguments = undefined;
        operationLocations = undefined;
        state = factory.createTempVariable(/*recordTempVariable*/ undefined);
        // Build the generator
        resumeLexicalEnvironment();
        const statementOffset = factory.copyPrologue(body.statements, statements, /*ensureUseStrict*/ false, visitor);
        transformAndEmitStatements(body.statements, statementOffset);
        const buildResult = build();
        insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
        statements.push(factory.createReturnStatement(buildResult));
        // Restore previous generator state
        inGeneratorFunctionBody = savedInGeneratorFunctionBody;
        inStatementContainingYield = savedInStatementContainingYield;
        blocks = savedBlocks;
        blockOffsets = savedBlockOffsets;
        blockActions = savedBlockActions;
        blockStack = savedBlockStack;
        labelOffsets = savedLabelOffsets;
        labelExpressions = savedLabelExpressions;
        nextLabelId = savedNextLabelId;
        operations = savedOperations;
        operationArguments = savedOperationArguments;
        operationLocations = savedOperationLocations;
        state = savedState;
        return setTextRange(factory.createBlock(statements, body.multiLine), body);
    }
    /**
     * Visits a variable statement.
     *
     * This will be called when one of the following conditions are met:
     * - The variable statement is contained within the body of a generator function.
     *
     * @param node The node to visit.
     */
    function visitVariableStatement(node) {
        if (node.transformFlags & TransformFlags.ContainsYield) {
            transformAndEmitVariableDeclarationList(node.declarationList);
            return undefined;
        }
        else {
            // Do not hoist custom prologues.
            if (getEmitFlags(node) & EmitFlags.CustomPrologue) {
                return node;
            }
            for (const variable of node.declarationList.declarations) {
                hoistVariableDeclaration(variable.name);
            }
            const variables = getInitializedVariables(node.declarationList);
            if (variables.length === 0) {
                return undefined;
            }
            return setSourceMapRange(factory.createExpressionStatement(factory.inlineExpressions(map(variables, transformInitializedVariable))), node);
        }
    }
    /**
     * Visits a binary expression.
     *
     * This will be called when one of the following conditions are met:
     * - The node contains a YieldExpression.
     *
     * @param node The node to visit.
     */
    function visitBinaryExpression(node) {
        const assoc = getExpressionAssociativity(node);
        switch (assoc) {
            case Associativity.Left:
                return visitLeftAssociativeBinaryExpression(node);
            case Associativity.Right:
                return visitRightAssociativeBinaryExpression(node);
            default:
                return Debug.assertNever(assoc);
        }
    }
    /**
     * Visits a right-associative binary expression containing `yield`.
     *
     * @param node The node to visit.
     */
    function visitRightAssociativeBinaryExpression(node) {
        const { left, right } = node;
        if (containsYield(right)) {
            let target;
            switch (left.kind) {
                case SyntaxKind.PropertyAccessExpression:
                    // [source]
                    //      a.b = yield;
                    //
                    // [intermediate]
                    //  .local _a
                    //      _a = a;
                    //  .yield resumeLabel
                    //  .mark resumeLabel
                    //      _a.b = %sent%;
                    target = factory.updatePropertyAccessExpression(left, cacheExpression(Debug.checkDefined(visitNode(left.expression, visitor, isLeftHandSideExpression))), left.name);
                    break;
                case SyntaxKind.ElementAccessExpression:
                    // [source]
                    //      a[b] = yield;
                    //
                    // [intermediate]
                    //  .local _a, _b
                    //      _a = a;
                    //      _b = b;
                    //  .yield resumeLabel
                    //  .mark resumeLabel
                    //      _a[_b] = %sent%;
                    target = factory.updateElementAccessExpression(left, cacheExpression(Debug.checkDefined(visitNode(left.expression, visitor, isLeftHandSideExpression))), cacheExpression(Debug.checkDefined(visitNode(left.argumentExpression, visitor, isExpression))));
                    break;
                default:
                    target = Debug.checkDefined(visitNode(left, visitor, isExpression));
                    break;
            }
            const operator = node.operatorToken.kind;
            if (isCompoundAssignment(operator)) {
                return setTextRange(factory.createAssignment(target, setTextRange(factory.createBinaryExpression(cacheExpression(target), getNonAssignmentOperatorForCompoundAssignment(operator), Debug.checkDefined(visitNode(right, visitor, isExpression))), node)), node);
            }
            else {
                return factory.updateBinaryExpression(node, target, node.operatorToken, Debug.checkDefined(visitNode(right, visitor, isExpression)));
            }
        }
        return visitEachChild(node, visitor, context);
    }
    function visitLeftAssociativeBinaryExpression(node) {
        if (containsYield(node.right)) {
            if (isLogicalOperator(node.operatorToken.kind)) {
                return visitLogicalBinaryExpression(node);
            }
            else if (node.operatorToken.kind === SyntaxKind.CommaToken) {
                return visitCommaExpression(node);
            }
            // [source]
            //      a() + (yield) + c()
            //
            // [intermediate]
            //  .local _a
            //      _a = a();
            //  .yield resumeLabel
            //      _a + %sent% + c()
            return factory.updateBinaryExpression(node, cacheExpression(Debug.checkDefined(visitNode(node.left, visitor, isExpression))), node.operatorToken, Debug.checkDefined(visitNode(node.right, visitor, isExpression)));
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a comma expression containing `yield`.
     *
     * @param node The node to visit.
     */
    function visitCommaExpression(node) {
        // [source]
        //      x = a(), yield, b();
        //
        // [intermediate]
        //      a();
        //  .yield resumeLabel
        //  .mark resumeLabel
        //      x = %sent%, b();
        let pendingExpressions = [];
        visit(node.left);
        visit(node.right);
        return factory.inlineExpressions(pendingExpressions);
        function visit(node) {
            if (isBinaryExpression(node) && node.operatorToken.kind === SyntaxKind.CommaToken) {
                visit(node.left);
                visit(node.right);
            }
            else {
                if (containsYield(node) && pendingExpressions.length > 0) {
                    emitWorker(1 /* OpCode.Statement */, [factory.createExpressionStatement(factory.inlineExpressions(pendingExpressions))]);
                    pendingExpressions = [];
                }
                pendingExpressions.push(Debug.checkDefined(visitNode(node, visitor, isExpression)));
            }
        }
    }
    /**
     * Visits a comma-list expression.
     *
     * @param node The node to visit.
     */
    function visitCommaListExpression(node) {
        // flattened version of `visitCommaExpression`
        let pendingExpressions = [];
        for (const elem of node.elements) {
            if (isBinaryExpression(elem) && elem.operatorToken.kind === SyntaxKind.CommaToken) {
                pendingExpressions.push(visitCommaExpression(elem));
            }
            else {
                if (containsYield(elem) && pendingExpressions.length > 0) {
                    emitWorker(1 /* OpCode.Statement */, [factory.createExpressionStatement(factory.inlineExpressions(pendingExpressions))]);
                    pendingExpressions = [];
                }
                pendingExpressions.push(Debug.checkDefined(visitNode(elem, visitor, isExpression)));
            }
        }
        return factory.inlineExpressions(pendingExpressions);
    }
    /**
     * Visits a logical binary expression containing `yield`.
     *
     * @param node A node to visit.
     */
    function visitLogicalBinaryExpression(node) {
        // Logical binary expressions (`&&` and `||`) are shortcutting expressions and need
        // to be transformed as such:
        //
        // [source]
        //      x = a() && yield;
        //
        // [intermediate]
        //  .local _a
        //      _a = a();
        //  .brfalse resultLabel, (_a)
        //  .yield resumeLabel
        //  .mark resumeLabel
        //      _a = %sent%;
        //  .mark resultLabel
        //      x = _a;
        //
        // [source]
        //      x = a() || yield;
        //
        // [intermediate]
        //  .local _a
        //      _a = a();
        //  .brtrue resultLabel, (_a)
        //  .yield resumeLabel
        //  .mark resumeLabel
        //      _a = %sent%;
        //  .mark resultLabel
        //      x = _a;
        const resultLabel = defineLabel();
        const resultLocal = declareLocal();
        emitAssignment(resultLocal, Debug.checkDefined(visitNode(node.left, visitor, isExpression)), /*location*/ node.left);
        if (node.operatorToken.kind === SyntaxKind.AmpersandAmpersandToken) {
            // Logical `&&` shortcuts when the left-hand operand is falsey.
            emitBreakWhenFalse(resultLabel, resultLocal, /*location*/ node.left);
        }
        else {
            // Logical `||` shortcuts when the left-hand operand is truthy.
            emitBreakWhenTrue(resultLabel, resultLocal, /*location*/ node.left);
        }
        emitAssignment(resultLocal, Debug.checkDefined(visitNode(node.right, visitor, isExpression)), /*location*/ node.right);
        markLabel(resultLabel);
        return resultLocal;
    }
    /**
     * Visits a conditional expression containing `yield`.
     *
     * @param node The node to visit.
     */
    function visitConditionalExpression(node) {
        // [source]
        //      x = a() ? yield : b();
        //
        // [intermediate]
        //  .local _a
        //  .brfalse whenFalseLabel, (a())
        //  .yield resumeLabel
        //  .mark resumeLabel
        //      _a = %sent%;
        //  .br resultLabel
        //  .mark whenFalseLabel
        //      _a = b();
        //  .mark resultLabel
        //      x = _a;
        // We only need to perform a specific transformation if a `yield` expression exists
        // in either the `whenTrue` or `whenFalse` branches.
        // A `yield` in the condition will be handled by the normal visitor.
        if (containsYield(node.whenTrue) || containsYield(node.whenFalse)) {
            const whenFalseLabel = defineLabel();
            const resultLabel = defineLabel();
            const resultLocal = declareLocal();
            emitBreakWhenFalse(whenFalseLabel, Debug.checkDefined(visitNode(node.condition, visitor, isExpression)), /*location*/ node.condition);
            emitAssignment(resultLocal, Debug.checkDefined(visitNode(node.whenTrue, visitor, isExpression)), /*location*/ node.whenTrue);
            emitBreak(resultLabel);
            markLabel(whenFalseLabel);
            emitAssignment(resultLocal, Debug.checkDefined(visitNode(node.whenFalse, visitor, isExpression)), /*location*/ node.whenFalse);
            markLabel(resultLabel);
            return resultLocal;
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a `yield` expression.
     *
     * @param node The node to visit.
     */
    function visitYieldExpression(node) {
        // [source]
        //      x = yield a();
        //
        // [intermediate]
        //  .yield resumeLabel, (a())
        //  .mark resumeLabel
        //      x = %sent%;
        const resumeLabel = defineLabel();
        const expression = visitNode(node.expression, visitor, isExpression);
        if (node.asteriskToken) {
            // NOTE: `expression` must be defined for `yield*`.
            const iterator = (getEmitFlags(node.expression) & EmitFlags.Iterator) === 0
                ? setTextRange(emitHelpers().createValuesHelper(expression), node)
                : expression;
            emitYieldStar(iterator, /*location*/ node);
        }
        else {
            emitYield(expression, /*location*/ node);
        }
        markLabel(resumeLabel);
        return createGeneratorResume(/*location*/ node);
    }
    /**
     * Visits an ArrayLiteralExpression that contains a YieldExpression.
     *
     * @param node The node to visit.
     */
    function visitArrayLiteralExpression(node) {
        return visitElements(node.elements, /*leadingElement*/ undefined, /*location*/ undefined, node.multiLine);
    }
    /**
     * Visits an array of expressions containing one or more YieldExpression nodes
     * and returns an expression for the resulting value.
     *
     * @param elements The elements to visit.
     * @param multiLine Whether array literals created should be emitted on multiple lines.
     */
    function visitElements(elements, leadingElement, location, multiLine) {
        // [source]
        //      ar = [1, yield, 2];
        //
        // [intermediate]
        //  .local _a
        //      _a = [1];
        //  .yield resumeLabel
        //  .mark resumeLabel
        //      ar = _a.concat([%sent%, 2]);
        const numInitialElements = countInitialNodesWithoutYield(elements);
        let temp;
        if (numInitialElements > 0) {
            temp = declareLocal();
            const initialElements = visitNodes(elements, visitor, isExpression, 0, numInitialElements);
            emitAssignment(temp, factory.createArrayLiteralExpression(leadingElement
                ? [leadingElement, ...initialElements]
                : initialElements));
            leadingElement = undefined;
        }
        const expressions = reduceLeft(elements, reduceElement, [], numInitialElements);
        return temp
            ? factory.createArrayConcatCall(temp, [factory.createArrayLiteralExpression(expressions, multiLine)])
            : setTextRange(factory.createArrayLiteralExpression(leadingElement ? [leadingElement, ...expressions] : expressions, multiLine), location);
        function reduceElement(expressions, element) {
            if (containsYield(element) && expressions.length > 0) {
                const hasAssignedTemp = temp !== undefined;
                if (!temp) {
                    temp = declareLocal();
                }
                emitAssignment(temp, hasAssignedTemp
                    ? factory.createArrayConcatCall(temp, [factory.createArrayLiteralExpression(expressions, multiLine)])
                    : factory.createArrayLiteralExpression(leadingElement ? [leadingElement, ...expressions] : expressions, multiLine));
                leadingElement = undefined;
                expressions = [];
            }
            expressions.push(Debug.checkDefined(visitNode(element, visitor, isExpression)));
            return expressions;
        }
    }
    function visitObjectLiteralExpression(node) {
        // [source]
        //      o = {
        //          a: 1,
        //          b: yield,
        //          c: 2
        //      };
        //
        // [intermediate]
        //  .local _a
        //      _a = {
        //          a: 1
        //      };
        //  .yield resumeLabel
        //  .mark resumeLabel
        //      o = (_a.b = %sent%,
        //          _a.c = 2,
        //          _a);
        const properties = node.properties;
        const multiLine = node.multiLine;
        const numInitialProperties = countInitialNodesWithoutYield(properties);
        const temp = declareLocal();
        emitAssignment(temp, factory.createObjectLiteralExpression(visitNodes(properties, visitor, isObjectLiteralElementLike, 0, numInitialProperties), multiLine));
        const expressions = reduceLeft(properties, reduceProperty, [], numInitialProperties);
        // TODO(rbuckton): Does this need to be parented?
        expressions.push(multiLine ? startOnNewLine(setParent(setTextRange(factory.cloneNode(temp), temp), temp.parent)) : temp);
        return factory.inlineExpressions(expressions);
        function reduceProperty(expressions, property) {
            if (containsYield(property) && expressions.length > 0) {
                emitStatement(factory.createExpressionStatement(factory.inlineExpressions(expressions)));
                expressions = [];
            }
            const expression = createExpressionForObjectLiteralElementLike(factory, node, property, temp);
            const visited = visitNode(expression, visitor, isExpression);
            if (visited) {
                if (multiLine) {
                    startOnNewLine(visited);
                }
                expressions.push(visited);
            }
            return expressions;
        }
    }
    /**
     * Visits an ElementAccessExpression that contains a YieldExpression.
     *
     * @param node The node to visit.
     */
    function visitElementAccessExpression(node) {
        if (containsYield(node.argumentExpression)) {
            // [source]
            //      a = x[yield];
            //
            // [intermediate]
            //  .local _a
            //      _a = x;
            //  .yield resumeLabel
            //  .mark resumeLabel
            //      a = _a[%sent%]
            return factory.updateElementAccessExpression(node, cacheExpression(Debug.checkDefined(visitNode(node.expression, visitor, isLeftHandSideExpression))), Debug.checkDefined(visitNode(node.argumentExpression, visitor, isExpression)));
        }
        return visitEachChild(node, visitor, context);
    }
    function visitCallExpression(node) {
        if (!isImportCall(node) && forEach(node.arguments, containsYield)) {
            // [source]
            //      a.b(1, yield, 2);
            //
            // [intermediate]
            //  .local _a, _b, _c
            //      _b = (_a = a).b;
            //      _c = [1];
            //  .yield resumeLabel
            //  .mark resumeLabel
            //      _b.apply(_a, _c.concat([%sent%, 2]));
            const { target, thisArg } = factory.createCallBinding(node.expression, hoistVariableDeclaration, languageVersion, /*cacheIdentifiers*/ true);
            return setOriginalNode(setTextRange(factory.createFunctionApplyCall(cacheExpression(Debug.checkDefined(visitNode(target, visitor, isLeftHandSideExpression))), thisArg, visitElements(node.arguments)), node), node);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitNewExpression(node) {
        if (forEach(node.arguments, containsYield)) {
            // [source]
            //      new a.b(1, yield, 2);
            //
            // [intermediate]
            //  .local _a, _b, _c
            //      _b = (_a = a.b).bind;
            //      _c = [1];
            //  .yield resumeLabel
            //  .mark resumeLabel
            //      new (_b.apply(_a, _c.concat([%sent%, 2])));
            const { target, thisArg } = factory.createCallBinding(factory.createPropertyAccessExpression(node.expression, "bind"), hoistVariableDeclaration);
            return setOriginalNode(setTextRange(factory.createNewExpression(factory.createFunctionApplyCall(cacheExpression(Debug.checkDefined(visitNode(target, visitor, isExpression))), thisArg, visitElements(node.arguments, 
            /*leadingElement*/ factory.createVoidZero())), 
            /*typeArguments*/ undefined, []), node), node);
        }
        return visitEachChild(node, visitor, context);
    }
    function transformAndEmitStatements(statements, start = 0) {
        const numStatements = statements.length;
        for (let i = start; i < numStatements; i++) {
            transformAndEmitStatement(statements[i]);
        }
    }
    function transformAndEmitEmbeddedStatement(node) {
        if (isBlock(node)) {
            transformAndEmitStatements(node.statements);
        }
        else {
            transformAndEmitStatement(node);
        }
    }
    function transformAndEmitStatement(node) {
        const savedInStatementContainingYield = inStatementContainingYield;
        if (!inStatementContainingYield) {
            inStatementContainingYield = containsYield(node);
        }
        transformAndEmitStatementWorker(node);
        inStatementContainingYield = savedInStatementContainingYield;
    }
    function transformAndEmitStatementWorker(node) {
        switch (node.kind) {
            case SyntaxKind.Block:
                return transformAndEmitBlock(node);
            case SyntaxKind.ExpressionStatement:
                return transformAndEmitExpressionStatement(node);
            case SyntaxKind.IfStatement:
                return transformAndEmitIfStatement(node);
            case SyntaxKind.DoStatement:
                return transformAndEmitDoStatement(node);
            case SyntaxKind.WhileStatement:
                return transformAndEmitWhileStatement(node);
            case SyntaxKind.ForStatement:
                return transformAndEmitForStatement(node);
            case SyntaxKind.ForInStatement:
                return transformAndEmitForInStatement(node);
            case SyntaxKind.ContinueStatement:
                return transformAndEmitContinueStatement(node);
            case SyntaxKind.BreakStatement:
                return transformAndEmitBreakStatement(node);
            case SyntaxKind.ReturnStatement:
                return transformAndEmitReturnStatement(node);
            case SyntaxKind.WithStatement:
                return transformAndEmitWithStatement(node);
            case SyntaxKind.SwitchStatement:
                return transformAndEmitSwitchStatement(node);
            case SyntaxKind.LabeledStatement:
                return transformAndEmitLabeledStatement(node);
            case SyntaxKind.ThrowStatement:
                return transformAndEmitThrowStatement(node);
            case SyntaxKind.TryStatement:
                return transformAndEmitTryStatement(node);
            default:
                return emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function transformAndEmitBlock(node) {
        if (containsYield(node)) {
            transformAndEmitStatements(node.statements);
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function transformAndEmitExpressionStatement(node) {
        emitStatement(visitNode(node, visitor, isStatement));
    }
    function transformAndEmitVariableDeclarationList(node) {
        for (const variable of node.declarations) {
            const name = factory.cloneNode(variable.name);
            setCommentRange(name, variable.name);
            hoistVariableDeclaration(name);
        }
        const variables = getInitializedVariables(node);
        const numVariables = variables.length;
        let variablesWritten = 0;
        let pendingExpressions = [];
        while (variablesWritten < numVariables) {
            for (let i = variablesWritten; i < numVariables; i++) {
                const variable = variables[i];
                if (containsYield(variable.initializer) && pendingExpressions.length > 0) {
                    break;
                }
                pendingExpressions.push(transformInitializedVariable(variable));
            }
            if (pendingExpressions.length) {
                emitStatement(factory.createExpressionStatement(factory.inlineExpressions(pendingExpressions)));
                variablesWritten += pendingExpressions.length;
                pendingExpressions = [];
            }
        }
        return undefined;
    }
    function transformInitializedVariable(node) {
        return setSourceMapRange(factory.createAssignment(setSourceMapRange(factory.cloneNode(node.name), node.name), Debug.checkDefined(visitNode(node.initializer, visitor, isExpression))), node);
    }
    function transformAndEmitIfStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      if (x)
            //          /*thenStatement*/
            //      else
            //          /*elseStatement*/
            //
            // [intermediate]
            //  .brfalse elseLabel, (x)
            //      /*thenStatement*/
            //  .br endLabel
            //  .mark elseLabel
            //      /*elseStatement*/
            //  .mark endLabel
            if (containsYield(node.thenStatement) || containsYield(node.elseStatement)) {
                const endLabel = defineLabel();
                const elseLabel = node.elseStatement ? defineLabel() : undefined;
                emitBreakWhenFalse(node.elseStatement ? elseLabel : endLabel, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)), /*location*/ node.expression);
                transformAndEmitEmbeddedStatement(node.thenStatement);
                if (node.elseStatement) {
                    emitBreak(endLabel);
                    markLabel(elseLabel);
                    transformAndEmitEmbeddedStatement(node.elseStatement);
                }
                markLabel(endLabel);
            }
            else {
                emitStatement(visitNode(node, visitor, isStatement));
            }
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function transformAndEmitDoStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      do {
            //          /*body*/
            //      }
            //      while (i < 10);
            //
            // [intermediate]
            //  .loop conditionLabel, endLabel
            //  .mark loopLabel
            //      /*body*/
            //  .mark conditionLabel
            //  .brtrue loopLabel, (i < 10)
            //  .endloop
            //  .mark endLabel
            const conditionLabel = defineLabel();
            const loopLabel = defineLabel();
            beginLoopBlock(/*continueLabel*/ conditionLabel);
            markLabel(loopLabel);
            transformAndEmitEmbeddedStatement(node.statement);
            markLabel(conditionLabel);
            emitBreakWhenTrue(loopLabel, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)));
            endLoopBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function visitDoStatement(node) {
        if (inStatementContainingYield) {
            beginScriptLoopBlock();
            node = visitEachChild(node, visitor, context);
            endLoopBlock();
            return node;
        }
        else {
            return visitEachChild(node, visitor, context);
        }
    }
    function transformAndEmitWhileStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      while (i < 10) {
            //          /*body*/
            //      }
            //
            // [intermediate]
            //  .loop loopLabel, endLabel
            //  .mark loopLabel
            //  .brfalse endLabel, (i < 10)
            //      /*body*/
            //  .br loopLabel
            //  .endloop
            //  .mark endLabel
            const loopLabel = defineLabel();
            const endLabel = beginLoopBlock(loopLabel);
            markLabel(loopLabel);
            emitBreakWhenFalse(endLabel, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)));
            transformAndEmitEmbeddedStatement(node.statement);
            emitBreak(loopLabel);
            endLoopBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function visitWhileStatement(node) {
        if (inStatementContainingYield) {
            beginScriptLoopBlock();
            node = visitEachChild(node, visitor, context);
            endLoopBlock();
            return node;
        }
        else {
            return visitEachChild(node, visitor, context);
        }
    }
    function transformAndEmitForStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      for (var i = 0; i < 10; i++) {
            //          /*body*/
            //      }
            //
            // [intermediate]
            //  .local i
            //      i = 0;
            //  .loop incrementLabel, endLoopLabel
            //  .mark conditionLabel
            //  .brfalse endLoopLabel, (i < 10)
            //      /*body*/
            //  .mark incrementLabel
            //      i++;
            //  .br conditionLabel
            //  .endloop
            //  .mark endLoopLabel
            const conditionLabel = defineLabel();
            const incrementLabel = defineLabel();
            const endLabel = beginLoopBlock(incrementLabel);
            if (node.initializer) {
                const initializer = node.initializer;
                if (isVariableDeclarationList(initializer)) {
                    transformAndEmitVariableDeclarationList(initializer);
                }
                else {
                    emitStatement(setTextRange(factory.createExpressionStatement(Debug.checkDefined(visitNode(initializer, visitor, isExpression))), initializer));
                }
            }
            markLabel(conditionLabel);
            if (node.condition) {
                emitBreakWhenFalse(endLabel, Debug.checkDefined(visitNode(node.condition, visitor, isExpression)));
            }
            transformAndEmitEmbeddedStatement(node.statement);
            markLabel(incrementLabel);
            if (node.incrementor) {
                emitStatement(setTextRange(factory.createExpressionStatement(Debug.checkDefined(visitNode(node.incrementor, visitor, isExpression))), node.incrementor));
            }
            emitBreak(conditionLabel);
            endLoopBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function visitForStatement(node) {
        if (inStatementContainingYield) {
            beginScriptLoopBlock();
        }
        const initializer = node.initializer;
        if (initializer && isVariableDeclarationList(initializer)) {
            for (const variable of initializer.declarations) {
                hoistVariableDeclaration(variable.name);
            }
            const variables = getInitializedVariables(initializer);
            node = factory.updateForStatement(node, variables.length > 0
                ? factory.inlineExpressions(map(variables, transformInitializedVariable))
                : undefined, visitNode(node.condition, visitor, isExpression), visitNode(node.incrementor, visitor, isExpression), visitIterationBody(node.statement, visitor, context));
        }
        else {
            node = visitEachChild(node, visitor, context);
        }
        if (inStatementContainingYield) {
            endLoopBlock();
        }
        return node;
    }
    function transformAndEmitForInStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      for (var p in o) {
            //          /*body*/
            //      }
            //
            // [intermediate]
            //  .local _b, _a, _c, _i
            //      _b = [];
            //      _a = o;
            //      for (_c in _a) _b.push(_c);
            //      _i = 0;
            //  .loop incrementLabel, endLoopLabel
            //  .mark conditionLabel
            //  .brfalse endLoopLabel, (_i < _b.length)
            //      _c = _b[_i];
            //  .brfalse incrementLabel, (_c in _a)
            //      p = _c;
            //      /*body*/
            //  .mark incrementLabel
            //      _c++;
            //  .br conditionLabel
            //  .endloop
            //  .mark endLoopLabel
            const obj = declareLocal(); // _a
            const keysArray = declareLocal(); // _b
            const key = declareLocal(); // _c
            const keysIndex = factory.createLoopVariable(); // _i
            const initializer = node.initializer;
            hoistVariableDeclaration(keysIndex);
            emitAssignment(obj, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)));
            emitAssignment(keysArray, factory.createArrayLiteralExpression());
            emitStatement(factory.createForInStatement(key, obj, factory.createExpressionStatement(factory.createCallExpression(factory.createPropertyAccessExpression(keysArray, "push"), 
            /*typeArguments*/ undefined, [key]))));
            emitAssignment(keysIndex, factory.createNumericLiteral(0));
            const conditionLabel = defineLabel();
            const incrementLabel = defineLabel();
            const endLoopLabel = beginLoopBlock(incrementLabel);
            markLabel(conditionLabel);
            emitBreakWhenFalse(endLoopLabel, factory.createLessThan(keysIndex, factory.createPropertyAccessExpression(keysArray, "length")));
            emitAssignment(key, factory.createElementAccessExpression(keysArray, keysIndex));
            emitBreakWhenFalse(incrementLabel, factory.createBinaryExpression(key, SyntaxKind.InKeyword, obj));
            let variable;
            if (isVariableDeclarationList(initializer)) {
                for (const variable of initializer.declarations) {
                    hoistVariableDeclaration(variable.name);
                }
                variable = factory.cloneNode(initializer.declarations[0].name);
            }
            else {
                variable = Debug.checkDefined(visitNode(initializer, visitor, isExpression));
                Debug.assert(isLeftHandSideExpression(variable));
            }
            emitAssignment(variable, key);
            transformAndEmitEmbeddedStatement(node.statement);
            markLabel(incrementLabel);
            emitStatement(factory.createExpressionStatement(factory.createPostfixIncrement(keysIndex)));
            emitBreak(conditionLabel);
            endLoopBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function visitForInStatement(node) {
        // [source]
        //      for (var x in a) {
        //          /*body*/
        //      }
        //
        // [intermediate]
        //  .local x
        //  .loop
        //      for (x in a) {
        //          /*body*/
        //      }
        //  .endloop
        if (inStatementContainingYield) {
            beginScriptLoopBlock();
        }
        const initializer = node.initializer;
        if (isVariableDeclarationList(initializer)) {
            for (const variable of initializer.declarations) {
                hoistVariableDeclaration(variable.name);
            }
            node = factory.updateForInStatement(node, initializer.declarations[0].name, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)), Debug.checkDefined(visitNode(node.statement, visitor, isStatement, factory.liftToBlock)));
        }
        else {
            node = visitEachChild(node, visitor, context);
        }
        if (inStatementContainingYield) {
            endLoopBlock();
        }
        return node;
    }
    function transformAndEmitContinueStatement(node) {
        const label = findContinueTarget(node.label ? idText(node.label) : undefined);
        if (label > 0) {
            emitBreak(label, /*location*/ node);
        }
        else {
            // invalid continue without a containing loop. Leave the node as is, per #17875.
            emitStatement(node);
        }
    }
    function visitContinueStatement(node) {
        if (inStatementContainingYield) {
            const label = findContinueTarget(node.label && idText(node.label));
            if (label > 0) {
                return createInlineBreak(label, /*location*/ node);
            }
        }
        return visitEachChild(node, visitor, context);
    }
    function transformAndEmitBreakStatement(node) {
        const label = findBreakTarget(node.label ? idText(node.label) : undefined);
        if (label > 0) {
            emitBreak(label, /*location*/ node);
        }
        else {
            // invalid break without a containing loop, switch, or labeled statement. Leave the node as is, per #17875.
            emitStatement(node);
        }
    }
    function visitBreakStatement(node) {
        if (inStatementContainingYield) {
            const label = findBreakTarget(node.label && idText(node.label));
            if (label > 0) {
                return createInlineBreak(label, /*location*/ node);
            }
        }
        return visitEachChild(node, visitor, context);
    }
    function transformAndEmitReturnStatement(node) {
        emitReturn(visitNode(node.expression, visitor, isExpression), 
        /*location*/ node);
    }
    function visitReturnStatement(node) {
        return createInlineReturn(visitNode(node.expression, visitor, isExpression), 
        /*location*/ node);
    }
    function transformAndEmitWithStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      with (x) {
            //          /*body*/
            //      }
            //
            // [intermediate]
            //  .with (x)
            //      /*body*/
            //  .endwith
            beginWithBlock(cacheExpression(Debug.checkDefined(visitNode(node.expression, visitor, isExpression))));
            transformAndEmitEmbeddedStatement(node.statement);
            endWithBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function transformAndEmitSwitchStatement(node) {
        if (containsYield(node.caseBlock)) {
            // [source]
            //      switch (x) {
            //          case a:
            //              /*caseStatements*/
            //          case b:
            //              /*caseStatements*/
            //          default:
            //              /*defaultStatements*/
            //      }
            //
            // [intermediate]
            //  .local _a
            //  .switch endLabel
            //      _a = x;
            //      switch (_a) {
            //          case a:
            //  .br clauseLabels[0]
            //      }
            //      switch (_a) {
            //          case b:
            //  .br clauseLabels[1]
            //      }
            //  .br clauseLabels[2]
            //  .mark clauseLabels[0]
            //      /*caseStatements*/
            //  .mark clauseLabels[1]
            //      /*caseStatements*/
            //  .mark clauseLabels[2]
            //      /*caseStatements*/
            //  .endswitch
            //  .mark endLabel
            const caseBlock = node.caseBlock;
            const numClauses = caseBlock.clauses.length;
            const endLabel = beginSwitchBlock();
            const expression = cacheExpression(Debug.checkDefined(visitNode(node.expression, visitor, isExpression)));
            // Create labels for each clause and find the index of the first default clause.
            const clauseLabels = [];
            let defaultClauseIndex = -1;
            for (let i = 0; i < numClauses; i++) {
                const clause = caseBlock.clauses[i];
                clauseLabels.push(defineLabel());
                if (clause.kind === SyntaxKind.DefaultClause && defaultClauseIndex === -1) {
                    defaultClauseIndex = i;
                }
            }
            // Emit switch statements for each run of case clauses either from the first case
            // clause or the next case clause with a `yield` in its expression, up to the next
            // case clause with a `yield` in its expression.
            let clausesWritten = 0;
            let pendingClauses = [];
            while (clausesWritten < numClauses) {
                let defaultClausesSkipped = 0;
                for (let i = clausesWritten; i < numClauses; i++) {
                    const clause = caseBlock.clauses[i];
                    if (clause.kind === SyntaxKind.CaseClause) {
                        if (containsYield(clause.expression) && pendingClauses.length > 0) {
                            break;
                        }
                        pendingClauses.push(factory.createCaseClause(Debug.checkDefined(visitNode(clause.expression, visitor, isExpression)), [
                            createInlineBreak(clauseLabels[i], /*location*/ clause.expression),
                        ]));
                    }
                    else {
                        defaultClausesSkipped++;
                    }
                }
                if (pendingClauses.length) {
                    emitStatement(factory.createSwitchStatement(expression, factory.createCaseBlock(pendingClauses)));
                    clausesWritten += pendingClauses.length;
                    pendingClauses = [];
                }
                if (defaultClausesSkipped > 0) {
                    clausesWritten += defaultClausesSkipped;
                    defaultClausesSkipped = 0;
                }
            }
            if (defaultClauseIndex >= 0) {
                emitBreak(clauseLabels[defaultClauseIndex]);
            }
            else {
                emitBreak(endLabel);
            }
            for (let i = 0; i < numClauses; i++) {
                markLabel(clauseLabels[i]);
                transformAndEmitStatements(caseBlock.clauses[i].statements);
            }
            endSwitchBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function visitSwitchStatement(node) {
        if (inStatementContainingYield) {
            beginScriptSwitchBlock();
        }
        node = visitEachChild(node, visitor, context);
        if (inStatementContainingYield) {
            endSwitchBlock();
        }
        return node;
    }
    function transformAndEmitLabeledStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      x: {
            //          /*body*/
            //      }
            //
            // [intermediate]
            //  .labeled "x", endLabel
            //      /*body*/
            //  .endlabeled
            //  .mark endLabel
            beginLabeledBlock(idText(node.label));
            transformAndEmitEmbeddedStatement(node.statement);
            endLabeledBlock();
        }
        else {
            emitStatement(visitNode(node, visitor, isStatement));
        }
    }
    function visitLabeledStatement(node) {
        if (inStatementContainingYield) {
            beginScriptLabeledBlock(idText(node.label));
        }
        node = visitEachChild(node, visitor, context);
        if (inStatementContainingYield) {
            endLabeledBlock();
        }
        return node;
    }
    function transformAndEmitThrowStatement(node) {
        var _a;
        // TODO(rbuckton): `expression` should be required on `throw`.
        emitThrow(Debug.checkDefined(visitNode((_a = node.expression) !== null && _a !== void 0 ? _a : factory.createVoidZero(), visitor, isExpression)), 
        /*location*/ node);
    }
    function transformAndEmitTryStatement(node) {
        if (containsYield(node)) {
            // [source]
            //      try {
            //          /*tryBlock*/
            //      }
            //      catch (e) {
            //          /*catchBlock*/
            //      }
            //      finally {
            //          /*finallyBlock*/
            //      }
            //
            // [intermediate]
            //  .local _a
            //  .try tryLabel, catchLabel, finallyLabel, endLabel
            //  .mark tryLabel
            //  .nop
            //      /*tryBlock*/
            //  .br endLabel
            //  .catch
            //  .mark catchLabel
            //      _a = %error%;
            //      /*catchBlock*/
            //  .br endLabel
            //  .finally
            //  .mark finallyLabel
            //      /*finallyBlock*/
            //  .endfinally
            //  .endtry
            //  .mark endLabel
            beginExceptionBlock();
            transformAndEmitEmbeddedStatement(node.tryBlock);
            if (node.catchClause) {
                beginCatchBlock(node.catchClause.variableDeclaration); // TODO: GH#18217
                transformAndEmitEmbeddedStatement(node.catchClause.block);
            }
            if (node.finallyBlock) {
                beginFinallyBlock();
                transformAndEmitEmbeddedStatement(node.finallyBlock);
            }
            endExceptionBlock();
        }
        else {
            emitStatement(visitEachChild(node, visitor, context));
        }
    }
    function containsYield(node) {
        return !!node && (node.transformFlags & TransformFlags.ContainsYield) !== 0;
    }
    function countInitialNodesWithoutYield(nodes) {
        const numNodes = nodes.length;
        for (let i = 0; i < numNodes; i++) {
            if (containsYield(nodes[i])) {
                return i;
            }
        }
        return -1;
    }
    function onSubstituteNode(hint, node) {
        node = previousOnSubstituteNode(hint, node);
        if (hint === EmitHint.Expression) {
            return substituteExpression(node);
        }
        return node;
    }
    function substituteExpression(node) {
        if (isIdentifier(node)) {
            return substituteExpressionIdentifier(node);
        }
        return node;
    }
    function substituteExpressionIdentifier(node) {
        if (!isGeneratedIdentifier(node) && renamedCatchVariables && renamedCatchVariables.has(idText(node))) {
            const original = getOriginalNode(node);
            if (isIdentifier(original) && original.parent) {
                const declaration = resolver.getReferencedValueDeclaration(original);
                if (declaration) {
                    const name = renamedCatchVariableDeclarations[getOriginalNodeId(declaration)];
                    if (name) {
                        // TODO(rbuckton): Does this need to be parented?
                        const clone = setParent(setTextRange(factory.cloneNode(name), name), name.parent);
                        setSourceMapRange(clone, node);
                        setCommentRange(clone, node);
                        return clone;
                    }
                }
            }
        }
        return node;
    }
    function cacheExpression(node) {
        if (isGeneratedIdentifier(node) || getEmitFlags(node) & EmitFlags.HelperName) {
            return node;
        }
        const temp = factory.createTempVariable(hoistVariableDeclaration);
        emitAssignment(temp, node, /*location*/ node);
        return temp;
    }
    function declareLocal(name) {
        const temp = name
            ? factory.createUniqueName(name)
            : factory.createTempVariable(/*recordTempVariable*/ undefined);
        hoistVariableDeclaration(temp);
        return temp;
    }
    /**
     * Defines a label, uses as the target of a Break operation.
     */
    function defineLabel() {
        if (!labelOffsets) {
            labelOffsets = [];
        }
        const label = nextLabelId;
        nextLabelId++;
        labelOffsets[label] = -1;
        return label;
    }
    /**
     * Marks the current operation with the specified label.
     */
    function markLabel(label) {
        Debug.assert(labelOffsets !== undefined, "No labels were defined.");
        labelOffsets[label] = operations ? operations.length : 0;
    }
    /**
     * Begins a block operation (With, Break/Continue, Try/Catch/Finally)
     *
     * @param block Information about the block.
     */
    function beginBlock(block) {
        if (!blocks) {
            blocks = [];
            blockActions = [];
            blockOffsets = [];
            blockStack = [];
        }
        const index = blockActions.length;
        blockActions[index] = 0 /* BlockAction.Open */;
        blockOffsets[index] = operations ? operations.length : 0;
        blocks[index] = block;
        blockStack.push(block);
        return index;
    }
    /**
     * Ends the current block operation.
     */
    function endBlock() {
        const block = peekBlock();
        if (block === undefined)
            return Debug.fail("beginBlock was never called.");
        const index = blockActions.length;
        blockActions[index] = 1 /* BlockAction.Close */;
        blockOffsets[index] = operations ? operations.length : 0;
        blocks[index] = block;
        blockStack.pop();
        return block;
    }
    /**
     * Gets the current open block.
     */
    function peekBlock() {
        return lastOrUndefined(blockStack);
    }
    /**
     * Gets the kind of the current open block.
     */
    function peekBlockKind() {
        const block = peekBlock();
        return block && block.kind;
    }
    /**
     * Begins a code block for a generated `with` statement.
     *
     * @param expression An identifier representing expression for the `with` block.
     */
    function beginWithBlock(expression) {
        const startLabel = defineLabel();
        const endLabel = defineLabel();
        markLabel(startLabel);
        beginBlock({
            kind: 1 /* CodeBlockKind.With */,
            expression,
            startLabel,
            endLabel,
        });
    }
    /**
     * Ends a code block for a generated `with` statement.
     */
    function endWithBlock() {
        Debug.assert(peekBlockKind() === 1 /* CodeBlockKind.With */);
        const block = endBlock();
        markLabel(block.endLabel);
    }
    /**
     * Begins a code block for a generated `try` statement.
     */
    function beginExceptionBlock() {
        const startLabel = defineLabel();
        const endLabel = defineLabel();
        markLabel(startLabel);
        beginBlock({
            kind: 0 /* CodeBlockKind.Exception */,
            state: 0 /* ExceptionBlockState.Try */,
            startLabel,
            endLabel,
        });
        emitNop();
        return endLabel;
    }
    /**
     * Enters the `catch` clause of a generated `try` statement.
     *
     * @param variable The catch variable.
     */
    function beginCatchBlock(variable) {
        Debug.assert(peekBlockKind() === 0 /* CodeBlockKind.Exception */);
        // generated identifiers should already be unique within a file
        let name;
        if (isGeneratedIdentifier(variable.name)) {
            name = variable.name;
            hoistVariableDeclaration(variable.name);
        }
        else {
            const text = idText(variable.name);
            name = declareLocal(text);
            if (!renamedCatchVariables) {
                renamedCatchVariables = new Map();
                renamedCatchVariableDeclarations = [];
                context.enableSubstitution(SyntaxKind.Identifier);
            }
            renamedCatchVariables.set(text, true);
            renamedCatchVariableDeclarations[getOriginalNodeId(variable)] = name;
        }
        const exception = peekBlock();
        Debug.assert(exception.state < 1 /* ExceptionBlockState.Catch */);
        const endLabel = exception.endLabel;
        emitBreak(endLabel);
        const catchLabel = defineLabel();
        markLabel(catchLabel);
        exception.state = 1 /* ExceptionBlockState.Catch */;
        exception.catchVariable = name;
        exception.catchLabel = catchLabel;
        emitAssignment(name, factory.createCallExpression(factory.createPropertyAccessExpression(state, "sent"), /*typeArguments*/ undefined, []));
        emitNop();
    }
    /**
     * Enters the `finally` block of a generated `try` statement.
     */
    function beginFinallyBlock() {
        Debug.assert(peekBlockKind() === 0 /* CodeBlockKind.Exception */);
        const exception = peekBlock();
        Debug.assert(exception.state < 2 /* ExceptionBlockState.Finally */);
        const endLabel = exception.endLabel;
        emitBreak(endLabel);
        const finallyLabel = defineLabel();
        markLabel(finallyLabel);
        exception.state = 2 /* ExceptionBlockState.Finally */;
        exception.finallyLabel = finallyLabel;
    }
    /**
     * Ends the code block for a generated `try` statement.
     */
    function endExceptionBlock() {
        Debug.assert(peekBlockKind() === 0 /* CodeBlockKind.Exception */);
        const exception = endBlock();
        const state = exception.state;
        if (state < 2 /* ExceptionBlockState.Finally */) {
            emitBreak(exception.endLabel);
        }
        else {
            emitEndfinally();
        }
        markLabel(exception.endLabel);
        emitNop();
        exception.state = 3 /* ExceptionBlockState.Done */;
    }
    /**
     * Begins a code block that supports `break` or `continue` statements that are defined in
     * the source tree and not from generated code.
     *
     * @param labelText Names from containing labeled statements.
     */
    function beginScriptLoopBlock() {
        beginBlock({
            kind: 3 /* CodeBlockKind.Loop */,
            isScript: true,
            breakLabel: -1,
            continueLabel: -1,
        });
    }
    /**
     * Begins a code block that supports `break` or `continue` statements that are defined in
     * generated code. Returns a label used to mark the operation to which to jump when a
     * `break` statement targets this block.
     *
     * @param continueLabel A Label used to mark the operation to which to jump when a
     *                      `continue` statement targets this block.
     */
    function beginLoopBlock(continueLabel) {
        const breakLabel = defineLabel();
        beginBlock({
            kind: 3 /* CodeBlockKind.Loop */,
            isScript: false,
            breakLabel,
            continueLabel,
        });
        return breakLabel;
    }
    /**
     * Ends a code block that supports `break` or `continue` statements that are defined in
     * generated code or in the source tree.
     */
    function endLoopBlock() {
        Debug.assert(peekBlockKind() === 3 /* CodeBlockKind.Loop */);
        const block = endBlock();
        const breakLabel = block.breakLabel;
        if (!block.isScript) {
            markLabel(breakLabel);
        }
    }
    /**
     * Begins a code block that supports `break` statements that are defined in the source
     * tree and not from generated code.
     */
    function beginScriptSwitchBlock() {
        beginBlock({
            kind: 2 /* CodeBlockKind.Switch */,
            isScript: true,
            breakLabel: -1,
        });
    }
    /**
     * Begins a code block that supports `break` statements that are defined in generated code.
     * Returns a label used to mark the operation to which to jump when a `break` statement
     * targets this block.
     */
    function beginSwitchBlock() {
        const breakLabel = defineLabel();
        beginBlock({
            kind: 2 /* CodeBlockKind.Switch */,
            isScript: false,
            breakLabel,
        });
        return breakLabel;
    }
    /**
     * Ends a code block that supports `break` statements that are defined in generated code.
     */
    function endSwitchBlock() {
        Debug.assert(peekBlockKind() === 2 /* CodeBlockKind.Switch */);
        const block = endBlock();
        const breakLabel = block.breakLabel;
        if (!block.isScript) {
            markLabel(breakLabel);
        }
    }
    function beginScriptLabeledBlock(labelText) {
        beginBlock({
            kind: 4 /* CodeBlockKind.Labeled */,
            isScript: true,
            labelText,
            breakLabel: -1,
        });
    }
    function beginLabeledBlock(labelText) {
        const breakLabel = defineLabel();
        beginBlock({
            kind: 4 /* CodeBlockKind.Labeled */,
            isScript: false,
            labelText,
            breakLabel,
        });
    }
    function endLabeledBlock() {
        Debug.assert(peekBlockKind() === 4 /* CodeBlockKind.Labeled */);
        const block = endBlock();
        if (!block.isScript) {
            markLabel(block.breakLabel);
        }
    }
    /**
     * Indicates whether the provided block supports `break` statements.
     *
     * @param block A code block.
     */
    function supportsUnlabeledBreak(block) {
        return block.kind === 2 /* CodeBlockKind.Switch */
            || block.kind === 3 /* CodeBlockKind.Loop */;
    }
    /**
     * Indicates whether the provided block supports `break` statements with labels.
     *
     * @param block A code block.
     */
    function supportsLabeledBreakOrContinue(block) {
        return block.kind === 4 /* CodeBlockKind.Labeled */;
    }
    /**
     * Indicates whether the provided block supports `continue` statements.
     *
     * @param block A code block.
     */
    function supportsUnlabeledContinue(block) {
        return block.kind === 3 /* CodeBlockKind.Loop */;
    }
    function hasImmediateContainingLabeledBlock(labelText, start) {
        for (let j = start; j >= 0; j--) {
            const containingBlock = blockStack[j];
            if (supportsLabeledBreakOrContinue(containingBlock)) {
                if (containingBlock.labelText === labelText) {
                    return true;
                }
            }
            else {
                break;
            }
        }
        return false;
    }
    /**
     * Finds the label that is the target for a `break` statement.
     *
     * @param labelText An optional name of a containing labeled statement.
     */
    function findBreakTarget(labelText) {
        if (blockStack) {
            if (labelText) {
                for (let i = blockStack.length - 1; i >= 0; i--) {
                    const block = blockStack[i];
                    if (supportsLabeledBreakOrContinue(block) && block.labelText === labelText) {
                        return block.breakLabel;
                    }
                    else if (supportsUnlabeledBreak(block) && hasImmediateContainingLabeledBlock(labelText, i - 1)) {
                        return block.breakLabel;
                    }
                }
            }
            else {
                for (let i = blockStack.length - 1; i >= 0; i--) {
                    const block = blockStack[i];
                    if (supportsUnlabeledBreak(block)) {
                        return block.breakLabel;
                    }
                }
            }
        }
        return 0;
    }
    /**
     * Finds the label that is the target for a `continue` statement.
     *
     * @param labelText An optional name of a containing labeled statement.
     */
    function findContinueTarget(labelText) {
        if (blockStack) {
            if (labelText) {
                for (let i = blockStack.length - 1; i >= 0; i--) {
                    const block = blockStack[i];
                    if (supportsUnlabeledContinue(block) && hasImmediateContainingLabeledBlock(labelText, i - 1)) {
                        return block.continueLabel;
                    }
                }
            }
            else {
                for (let i = blockStack.length - 1; i >= 0; i--) {
                    const block = blockStack[i];
                    if (supportsUnlabeledContinue(block)) {
                        return block.continueLabel;
                    }
                }
            }
        }
        return 0;
    }
    /**
     * Creates an expression that can be used to indicate the value for a label.
     *
     * @param label A label.
     */
    function createLabel(label) {
        if (label !== undefined && label > 0) {
            if (labelExpressions === undefined) {
                labelExpressions = [];
            }
            const expression = factory.createNumericLiteral(Number.MAX_SAFE_INTEGER);
            if (labelExpressions[label] === undefined) {
                labelExpressions[label] = [expression];
            }
            else {
                labelExpressions[label].push(expression);
            }
            return expression;
        }
        return factory.createOmittedExpression();
    }
    /**
     * Creates a numeric literal for the provided instruction.
     */
    function createInstruction(instruction) {
        const literal = factory.createNumericLiteral(instruction);
        addSyntheticTrailingComment(literal, SyntaxKind.MultiLineCommentTrivia, getInstructionName(instruction));
        return literal;
    }
    /**
     * Creates a statement that can be used indicate a Break operation to the provided label.
     *
     * @param label A label.
     * @param location An optional source map location for the statement.
     */
    function createInlineBreak(label, location) {
        Debug.assertLessThan(0, label, "Invalid label");
        return setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression([
            createInstruction(3 /* Instruction.Break */),
            createLabel(label),
        ])), location);
    }
    /**
     * Creates a statement that can be used indicate a Return operation.
     *
     * @param expression The expression for the return statement.
     * @param location An optional source map location for the statement.
     */
    function createInlineReturn(expression, location) {
        return setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression(expression
            ? [createInstruction(2 /* Instruction.Return */), expression]
            : [createInstruction(2 /* Instruction.Return */)])), location);
    }
    /**
     * Creates an expression that can be used to resume from a Yield operation.
     */
    function createGeneratorResume(location) {
        return setTextRange(factory.createCallExpression(factory.createPropertyAccessExpression(state, "sent"), 
        /*typeArguments*/ undefined, []), location);
    }
    /**
     * Emits an empty instruction.
     */
    function emitNop() {
        emitWorker(0 /* OpCode.Nop */);
    }
    /**
     * Emits a Statement.
     *
     * @param node A statement.
     */
    function emitStatement(node) {
        if (node) {
            emitWorker(1 /* OpCode.Statement */, [node]);
        }
        else {
            emitNop();
        }
    }
    /**
     * Emits an Assignment operation.
     *
     * @param left The left-hand side of the assignment.
     * @param right The right-hand side of the assignment.
     * @param location An optional source map location for the assignment.
     */
    function emitAssignment(left, right, location) {
        emitWorker(2 /* OpCode.Assign */, [left, right], location);
    }
    /**
     * Emits a Break operation to the specified label.
     *
     * @param label A label.
     * @param location An optional source map location for the assignment.
     */
    function emitBreak(label, location) {
        emitWorker(3 /* OpCode.Break */, [label], location);
    }
    /**
     * Emits a Break operation to the specified label when a condition evaluates to a truthy
     * value at runtime.
     *
     * @param label A label.
     * @param condition The condition.
     * @param location An optional source map location for the assignment.
     */
    function emitBreakWhenTrue(label, condition, location) {
        emitWorker(4 /* OpCode.BreakWhenTrue */, [label, condition], location);
    }
    /**
     * Emits a Break to the specified label when a condition evaluates to a falsey value at
     * runtime.
     *
     * @param label A label.
     * @param condition The condition.
     * @param location An optional source map location for the assignment.
     */
    function emitBreakWhenFalse(label, condition, location) {
        emitWorker(5 /* OpCode.BreakWhenFalse */, [label, condition], location);
    }
    /**
     * Emits a YieldStar operation for the provided expression.
     *
     * @param expression An optional value for the yield operation.
     * @param location An optional source map location for the assignment.
     */
    function emitYieldStar(expression, location) {
        emitWorker(7 /* OpCode.YieldStar */, [expression], location);
    }
    /**
     * Emits a Yield operation for the provided expression.
     *
     * @param expression An optional value for the yield operation.
     * @param location An optional source map location for the assignment.
     */
    function emitYield(expression, location) {
        emitWorker(6 /* OpCode.Yield */, [expression], location);
    }
    /**
     * Emits a Return operation for the provided expression.
     *
     * @param expression An optional value for the operation.
     * @param location An optional source map location for the assignment.
     */
    function emitReturn(expression, location) {
        emitWorker(8 /* OpCode.Return */, [expression], location);
    }
    /**
     * Emits a Throw operation for the provided expression.
     *
     * @param expression A value for the operation.
     * @param location An optional source map location for the assignment.
     */
    function emitThrow(expression, location) {
        emitWorker(9 /* OpCode.Throw */, [expression], location);
    }
    /**
     * Emits an Endfinally operation. This is used to handle `finally` block semantics.
     */
    function emitEndfinally() {
        emitWorker(10 /* OpCode.Endfinally */);
    }
    /**
     * Emits an operation.
     *
     * @param code The OpCode for the operation.
     * @param args The optional arguments for the operation.
     */
    function emitWorker(code, args, location) {
        if (operations === undefined) {
            operations = [];
            operationArguments = [];
            operationLocations = [];
        }
        if (labelOffsets === undefined) {
            // mark entry point
            markLabel(defineLabel());
        }
        const operationIndex = operations.length;
        operations[operationIndex] = code;
        operationArguments[operationIndex] = args;
        operationLocations[operationIndex] = location;
    }
    /**
     * Builds the generator function body.
     */
    function build() {
        blockIndex = 0;
        labelNumber = 0;
        labelNumbers = undefined;
        lastOperationWasAbrupt = false;
        lastOperationWasCompletion = false;
        clauses = undefined;
        statements = undefined;
        exceptionBlockStack = undefined;
        currentExceptionBlock = undefined;
        withBlockStack = undefined;
        const buildResult = buildStatements();
        return emitHelpers().createGeneratorHelper(setEmitFlags(factory.createFunctionExpression(
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, 
        /*name*/ undefined, 
        /*typeParameters*/ undefined, [factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, state)], 
        /*type*/ undefined, factory.createBlock(buildResult, 
        /*multiLine*/ buildResult.length > 0)), EmitFlags.ReuseTempVariableScope));
    }
    /**
     * Builds the statements for the generator function body.
     */
    function buildStatements() {
        if (operations) {
            for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
                writeOperation(operationIndex);
            }
            flushFinalLabel(operations.length);
        }
        else {
            flushFinalLabel(0);
        }
        if (clauses) {
            const labelExpression = factory.createPropertyAccessExpression(state, "label");
            const switchStatement = factory.createSwitchStatement(labelExpression, factory.createCaseBlock(clauses));
            return [startOnNewLine(switchStatement)];
        }
        if (statements) {
            return statements;
        }
        return [];
    }
    /**
     * Flush the current label and advance to a new label.
     */
    function flushLabel() {
        if (!statements) {
            return;
        }
        appendLabel(/*markLabelEnd*/ !lastOperationWasAbrupt);
        lastOperationWasAbrupt = false;
        lastOperationWasCompletion = false;
        labelNumber++;
    }
    /**
     * Flush the final label of the generator function body.
     */
    function flushFinalLabel(operationIndex) {
        if (isFinalLabelReachable(operationIndex)) {
            tryEnterLabel(operationIndex);
            withBlockStack = undefined;
            writeReturn(/*expression*/ undefined, /*operationLocation*/ undefined);
        }
        if (statements && clauses) {
            appendLabel(/*markLabelEnd*/ false);
        }
        updateLabelExpressions();
    }
    /**
     * Tests whether the final label of the generator function body
     * is reachable by user code.
     */
    function isFinalLabelReachable(operationIndex) {
        // if the last operation was *not* a completion (return/throw) then
        // the final label is reachable.
        if (!lastOperationWasCompletion) {
            return true;
        }
        // if there are no labels defined or referenced, then the final label is
        // not reachable.
        if (!labelOffsets || !labelExpressions) {
            return false;
        }
        // if the label for this offset is referenced, then the final label
        // is reachable.
        for (let label = 0; label < labelOffsets.length; label++) {
            if (labelOffsets[label] === operationIndex && labelExpressions[label]) {
                return true;
            }
        }
        return false;
    }
    /**
     * Appends a case clause for the last label and sets the new label.
     *
     * @param markLabelEnd Indicates that the transition between labels was a fall-through
     *                     from a previous case clause and the change in labels should be
     *                     reflected on the `state` object.
     */
    function appendLabel(markLabelEnd) {
        if (!clauses) {
            clauses = [];
        }
        if (statements) {
            if (withBlockStack) {
                // The previous label was nested inside one or more `with` blocks, so we
                // surround the statements in generated `with` blocks to create the same environment.
                for (let i = withBlockStack.length - 1; i >= 0; i--) {
                    const withBlock = withBlockStack[i];
                    statements = [factory.createWithStatement(withBlock.expression, factory.createBlock(statements))];
                }
            }
            if (currentExceptionBlock) {
                // The previous label was nested inside of an exception block, so we must
                // indicate entry into a protected region by pushing the label numbers
                // for each block in the protected region.
                const { startLabel, catchLabel, finallyLabel, endLabel } = currentExceptionBlock;
                statements.unshift(factory.createExpressionStatement(factory.createCallExpression(factory.createPropertyAccessExpression(factory.createPropertyAccessExpression(state, "trys"), "push"), 
                /*typeArguments*/ undefined, [
                    factory.createArrayLiteralExpression([
                        createLabel(startLabel),
                        createLabel(catchLabel),
                        createLabel(finallyLabel),
                        createLabel(endLabel),
                    ]),
                ])));
                currentExceptionBlock = undefined;
            }
            if (markLabelEnd) {
                // The case clause for the last label falls through to this label, so we
                // add an assignment statement to reflect the change in labels.
                statements.push(factory.createExpressionStatement(factory.createAssignment(factory.createPropertyAccessExpression(state, "label"), factory.createNumericLiteral(labelNumber + 1))));
            }
        }
        clauses.push(factory.createCaseClause(factory.createNumericLiteral(labelNumber), statements || []));
        statements = undefined;
    }
    /**
     * Tries to enter into a new label at the current operation index.
     */
    function tryEnterLabel(operationIndex) {
        if (!labelOffsets) {
            return;
        }
        for (let label = 0; label < labelOffsets.length; label++) {
            if (labelOffsets[label] === operationIndex) {
                flushLabel();
                if (labelNumbers === undefined) {
                    labelNumbers = [];
                }
                if (labelNumbers[labelNumber] === undefined) {
                    labelNumbers[labelNumber] = [label];
                }
                else {
                    labelNumbers[labelNumber].push(label);
                }
            }
        }
    }
    /**
     * Updates literal expressions for labels with actual label numbers.
     */
    function updateLabelExpressions() {
        if (labelExpressions !== undefined && labelNumbers !== undefined) {
            for (let labelNumber = 0; labelNumber < labelNumbers.length; labelNumber++) {
                const labels = labelNumbers[labelNumber];
                if (labels !== undefined) {
                    for (const label of labels) {
                        const expressions = labelExpressions[label];
                        if (expressions !== undefined) {
                            for (const expression of expressions) {
                                expression.text = String(labelNumber);
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Tries to enter or leave a code block.
     */
    function tryEnterOrLeaveBlock(operationIndex) {
        if (blocks) {
            for (; blockIndex < blockActions.length && blockOffsets[blockIndex] <= operationIndex; blockIndex++) {
                const block = blocks[blockIndex];
                const blockAction = blockActions[blockIndex];
                switch (block.kind) {
                    case 0 /* CodeBlockKind.Exception */:
                        if (blockAction === 0 /* BlockAction.Open */) {
                            if (!exceptionBlockStack) {
                                exceptionBlockStack = [];
                            }
                            if (!statements) {
                                statements = [];
                            }
                            exceptionBlockStack.push(currentExceptionBlock);
                            currentExceptionBlock = block;
                        }
                        else if (blockAction === 1 /* BlockAction.Close */) {
                            currentExceptionBlock = exceptionBlockStack.pop();
                        }
                        break;
                    case 1 /* CodeBlockKind.With */:
                        if (blockAction === 0 /* BlockAction.Open */) {
                            if (!withBlockStack) {
                                withBlockStack = [];
                            }
                            withBlockStack.push(block);
                        }
                        else if (blockAction === 1 /* BlockAction.Close */) {
                            withBlockStack.pop();
                        }
                        break;
                    // default: do nothing
                }
            }
        }
    }
    /**
     * Writes an operation as a statement to the current label's statement list.
     *
     * @param operation The OpCode of the operation
     */
    function writeOperation(operationIndex) {
        tryEnterLabel(operationIndex);
        tryEnterOrLeaveBlock(operationIndex);
        // early termination, nothing else to process in this label
        if (lastOperationWasAbrupt) {
            return;
        }
        lastOperationWasAbrupt = false;
        lastOperationWasCompletion = false;
        const opcode = operations[operationIndex];
        if (opcode === 0 /* OpCode.Nop */) {
            return;
        }
        else if (opcode === 10 /* OpCode.Endfinally */) {
            return writeEndfinally();
        }
        const args = operationArguments[operationIndex];
        if (opcode === 1 /* OpCode.Statement */) {
            return writeStatement(args[0]);
        }
        const location = operationLocations[operationIndex];
        switch (opcode) {
            case 2 /* OpCode.Assign */:
                return writeAssign(args[0], args[1], location);
            case 3 /* OpCode.Break */:
                return writeBreak(args[0], location);
            case 4 /* OpCode.BreakWhenTrue */:
                return writeBreakWhenTrue(args[0], args[1], location);
            case 5 /* OpCode.BreakWhenFalse */:
                return writeBreakWhenFalse(args[0], args[1], location);
            case 6 /* OpCode.Yield */:
                return writeYield(args[0], location);
            case 7 /* OpCode.YieldStar */:
                return writeYieldStar(args[0], location);
            case 8 /* OpCode.Return */:
                return writeReturn(args[0], location);
            case 9 /* OpCode.Throw */:
                return writeThrow(args[0], location);
        }
    }
    /**
     * Writes a statement to the current label's statement list.
     *
     * @param statement A statement to write.
     */
    function writeStatement(statement) {
        if (statement) {
            if (!statements) {
                statements = [statement];
            }
            else {
                statements.push(statement);
            }
        }
    }
    /**
     * Writes an Assign operation to the current label's statement list.
     *
     * @param left The left-hand side of the assignment.
     * @param right The right-hand side of the assignment.
     * @param operationLocation The source map location for the operation.
     */
    function writeAssign(left, right, operationLocation) {
        writeStatement(setTextRange(factory.createExpressionStatement(factory.createAssignment(left, right)), operationLocation));
    }
    /**
     * Writes a Throw operation to the current label's statement list.
     *
     * @param expression The value to throw.
     * @param operationLocation The source map location for the operation.
     */
    function writeThrow(expression, operationLocation) {
        lastOperationWasAbrupt = true;
        lastOperationWasCompletion = true;
        writeStatement(setTextRange(factory.createThrowStatement(expression), operationLocation));
    }
    /**
     * Writes a Return operation to the current label's statement list.
     *
     * @param expression The value to return.
     * @param operationLocation The source map location for the operation.
     */
    function writeReturn(expression, operationLocation) {
        lastOperationWasAbrupt = true;
        lastOperationWasCompletion = true;
        writeStatement(setEmitFlags(setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression(expression
            ? [createInstruction(2 /* Instruction.Return */), expression]
            : [createInstruction(2 /* Instruction.Return */)])), operationLocation), EmitFlags.NoTokenSourceMaps));
    }
    /**
     * Writes a Break operation to the current label's statement list.
     *
     * @param label The label for the Break.
     * @param operationLocation The source map location for the operation.
     */
    function writeBreak(label, operationLocation) {
        lastOperationWasAbrupt = true;
        writeStatement(setEmitFlags(setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression([
            createInstruction(3 /* Instruction.Break */),
            createLabel(label),
        ])), operationLocation), EmitFlags.NoTokenSourceMaps));
    }
    /**
     * Writes a BreakWhenTrue operation to the current label's statement list.
     *
     * @param label The label for the Break.
     * @param condition The condition for the Break.
     * @param operationLocation The source map location for the operation.
     */
    function writeBreakWhenTrue(label, condition, operationLocation) {
        writeStatement(setEmitFlags(factory.createIfStatement(condition, setEmitFlags(setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression([
            createInstruction(3 /* Instruction.Break */),
            createLabel(label),
        ])), operationLocation), EmitFlags.NoTokenSourceMaps)), EmitFlags.SingleLine));
    }
    /**
     * Writes a BreakWhenFalse operation to the current label's statement list.
     *
     * @param label The label for the Break.
     * @param condition The condition for the Break.
     * @param operationLocation The source map location for the operation.
     */
    function writeBreakWhenFalse(label, condition, operationLocation) {
        writeStatement(setEmitFlags(factory.createIfStatement(factory.createLogicalNot(condition), setEmitFlags(setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression([
            createInstruction(3 /* Instruction.Break */),
            createLabel(label),
        ])), operationLocation), EmitFlags.NoTokenSourceMaps)), EmitFlags.SingleLine));
    }
    /**
     * Writes a Yield operation to the current label's statement list.
     *
     * @param expression The expression to yield.
     * @param operationLocation The source map location for the operation.
     */
    function writeYield(expression, operationLocation) {
        lastOperationWasAbrupt = true;
        writeStatement(setEmitFlags(setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression(expression
            ? [createInstruction(4 /* Instruction.Yield */), expression]
            : [createInstruction(4 /* Instruction.Yield */)])), operationLocation), EmitFlags.NoTokenSourceMaps));
    }
    /**
     * Writes a YieldStar instruction to the current label's statement list.
     *
     * @param expression The expression to yield.
     * @param operationLocation The source map location for the operation.
     */
    function writeYieldStar(expression, operationLocation) {
        lastOperationWasAbrupt = true;
        writeStatement(setEmitFlags(setTextRange(factory.createReturnStatement(factory.createArrayLiteralExpression([
            createInstruction(5 /* Instruction.YieldStar */),
            expression,
        ])), operationLocation), EmitFlags.NoTokenSourceMaps));
    }
    /**
     * Writes an Endfinally instruction to the current label's statement list.
     */
    function writeEndfinally() {
        lastOperationWasAbrupt = true;
        writeStatement(factory.createReturnStatement(factory.createArrayLiteralExpression([
            createInstruction(7 /* Instruction.Endfinally */),
        ])));
    }
}
