import {
  addEmitHelpers,
  addRange,
  addSyntheticLeadingComment,
  append,
  arrayIsEqualTo,
  cast,
  chainBundle,
  concatenate,
  createExpressionForPropertyName,
  createMemberAccessForPropertyName,
  createRange,
  createTokenRange,
  Debug,
  elementAt,
  EmitFlags,
  EmitHint,
  every,
  filter,
  first,
  firstOrUndefined,
  flatten,
  flattenDestructuringAssignment,
  flattenDestructuringBinding,
  FlattenLevel,
  forEachChild,
  GeneratedIdentifierFlags,
  getAllAccessorDeclarations,
  getClassExtendsHeritageElement,
  getCombinedNodeFlags,
  getCommentRange,
  getEmitFlags,
  getEnclosingBlockScopeContainer,
  getFirstConstructorWithBody,
  getInternalEmitFlags,
  getNameOfDeclaration,
  getOriginalNode,
  getParseTreeNode,
  getSourceMapRange,
  getSuperCallFromStatement,
  getUseDefineForClassFields,
  hasStaticModifier,
  hasSyntacticModifier,
  idText,
  insertStatementAfterCustomPrologue,
  insertStatementsAfterCustomPrologue,
  insertStatementsAfterStandardPrologue,
  InternalEmitFlags,
  isArrayLiteralExpression,
  isArrowFunction,
  isAssignmentExpression,
  isBinaryExpression,
  isBindingPattern,
  isBlock,
  isCallExpression,
  isCallToHelper,
  isCaseBlock,
  isCaseClause,
  isCatchClause,
  isClassElement,
  isClassLike,
  isComputedPropertyName,
  isDefaultClause,
  isDestructuringAssignment,
  isExpression,
  isExpressionStatement,
  isForInitializer,
  isForStatement,
  isFunctionExpression,
  isFunctionLike,
  isGeneratedIdentifier,
  isHoistedFunction,
  isHoistedVariableStatement,
  isIdentifier,
  isIdentifierANonContextualKeyword,
  isIfStatement,
  isInternalName,
  isIterationStatement,
  isLabeledStatement,
  isModifier,
  isObjectLiteralElementLike,
  isOmittedExpression,
  isPackedArrayLiteral,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  isPropertyDeclaration,
  isPropertyName,
  isReturnStatement,
  isSpreadElement,
  isStatement,
  isStatic,
  isSuperCall,
  isSuperProperty,
  isSwitchStatement,
  isTryStatement,
  isVariableDeclaration,
  isVariableDeclarationList,
  isVariableStatement,
  isWithStatement,
  last,
  lastOrUndefined,
  map,
  ModifierFlags,
  moveRangeEnd,
  moveRangePos,
  moveSyntheticComments,
  NodeCheckFlags,
  NodeFlags,
  nodeIsSynthesized,
  ProcessLevel,
  processTaggedTemplateExpression,
  rangeEndIsOnSameLineAsRangeStart,
  setCommentRange,
  setEmitFlags,
  setOriginalNode,
  setParent,
  setSourceMapRange,
  setTextRange,
  setTextRangeEnd,
  setTextRangePos,
  setTokenSourceMapRange,
  singleOrMany,
  singleOrUndefined,
  skipOuterExpressions,
  skipTrivia,
  some,
  spanMap,
  startOnNewLine,
  SyntaxKind,
  TokenFlags,
  TransformFlags,
  tryCast,
  unescapeLeadingUnderscores,
  unwrapInnermostStatementOfLabel,
  visitEachChild,
  visitNode,
  visitNodes,
  visitParameterList,
} from "../_namespaces/ts.js";

//const enum ES2015SubstitutionFlags {
//    None = 0,
//    /** Enables substitutions for captured `this` */
//    CapturedThis = 1 << 0,
//    /** Enables substitutions for block-scoped bindings. */
//    BlockScopedBindings = 1 << 1,
//}

var ES2015SubstitutionFlags;
(function (ES2015SubstitutionFlags) {
    ES2015SubstitutionFlags[ES2015SubstitutionFlags["None"] = 0] = "None";
    /** Enables substitutions for captured `this` */
    ES2015SubstitutionFlags[ES2015SubstitutionFlags["CapturedThis"] = 1] = "CapturedThis";
    /** Enables substitutions for block-scoped bindings. */
    ES2015SubstitutionFlags[ES2015SubstitutionFlags["BlockScopedBindings"] = 2] = "BlockScopedBindings";
})(ES2015SubstitutionFlags || (ES2015SubstitutionFlags = {}));
/**
 * If loop contains block scoped binding captured in some function then loop body is converted to a function.
 * Lexical bindings declared in loop initializer will be passed into the loop body function as parameters,
 * however if this binding is modified inside the body - this new value should be propagated back to the original binding.
 * This is done by declaring new variable (out parameter holder) outside of the loop for every binding that is reassigned inside the body.
 * On every iteration this variable is initialized with value of corresponding binding.
 * At every point where control flow leaves the loop either explicitly (break/continue) or implicitly (at the end of loop body)
 * we copy the value inside the loop to the out parameter holder.
 *
 * for (let x;;) {
 *     let a = 1;
 *     let b = () => a;
 *     x++
 *     if (...) break;
 *     ...
 * }
 *
 * will be converted to
 *
 * var out_x;
 * var loop = function(x) {
 *     var a = 1;
 *     var b = function() { return a; }
 *     x++;
 *     if (...) return out_x = x, "break";
 *     ...
 *     out_x = x;
 * }
 * for (var x;;) {
 *     out_x = x;
 *     var state = loop(x);
 *     x = out_x;
 *     if (state === "break") break;
 * }
 *
 * NOTE: values to out parameters are not copies if loop is abrupted with 'return' - in this case this will end the entire enclosing function
 * so nobody can observe this new value.
 */
// const enum LoopOutParameterFlags {
//     None = 0,
//     Body = 1 << 0, // Modified in the body of the iteration statement
//     Initializer = 1 << 1, // Set in the initializer of a ForStatement
// }

var LoopOutParameterFlags;
(function (LoopOutParameterFlags) {
    LoopOutParameterFlags[LoopOutParameterFlags["None"] = 0] = "None";
    LoopOutParameterFlags[LoopOutParameterFlags["Body"] = 1] = "Body";
    LoopOutParameterFlags[LoopOutParameterFlags["Initializer"] = 2] = "Initializer";
})(LoopOutParameterFlags || (LoopOutParameterFlags = {}));

var CopyDirection;
(function (CopyDirection) {
    CopyDirection[CopyDirection["ToOriginal"] = 0] = "ToOriginal";
    CopyDirection[CopyDirection["ToOutParameter"] = 1] = "ToOutParameter";
})(CopyDirection || (CopyDirection = {}));

// const enum Jump {
//     Break = 1 << 1,
//     Continue = 1 << 2,
//     Return = 1 << 3,
// }
var Jump;
(function (Jump) {
    Jump[Jump["Break"] = 2] = "Break";
    Jump[Jump["Continue"] = 4] = "Continue";
    Jump[Jump["Return"] = 8] = "Return";
})(Jump || (Jump = {}));

// Facts we track as we traverse the tree
// dprint-ignore
// const enum HierarchyFacts {
//     None = 0,
// 
//     //
//     // Ancestor facts
//     //
// 
//     Function = 1 << 0,                      // Enclosed in a non-arrow function
//     ArrowFunction = 1 << 1,                 // Enclosed in an arrow function
//     AsyncFunctionBody = 1 << 2,             // Enclosed in an async function body
//     NonStaticClassElement = 1 << 3,         // Enclosed in a non-static, non-async class element
//     CapturesThis = 1 << 4,                  // Enclosed in a function that captures the lexical 'this' (used in substitution)
//     ExportedVariableStatement = 1 << 5,     // Enclosed in an exported variable statement in the current scope
//     TopLevel = 1 << 6,                      // Enclosing block-scoped container is a top-level container
//     Block = 1 << 7,                         // Enclosing block-scoped container is a Block
//     IterationStatement = 1 << 8,            // Immediately enclosed in an IterationStatement
//     IterationStatementBlock = 1 << 9,       // Enclosing Block is enclosed in an IterationStatement
//     IterationContainer = 1 << 10,           // Enclosed in an outer IterationStatement
//     ForStatement = 1 << 11,                 // Enclosing block-scoped container is a ForStatement
//     ForInOrForOfStatement = 1 << 12,        // Enclosing block-scoped container is a ForInStatement or ForOfStatement
//     ConstructorWithSuperCall = 1 << 13,     // Enclosed in a constructor that captures 'this' for use with 'super'
//     StaticInitializer = 1 << 14,            // Enclosed in a static initializer
// 
//     // NOTE: do not add more ancestor flags without also updating AncestorFactsMask below.
//     // NOTE: when adding a new ancestor flag, be sure to update the subtree flags below.
// 
//     //
//     // Ancestor masks
//     //
// 
//     AncestorFactsMask = (StaticInitializer << 1) - 1,
// 
//     // We are always in *some* kind of block scope, but only specific block-scope containers are
//     // top-level or Blocks.
//     BlockScopeIncludes = None,
//     BlockScopeExcludes = TopLevel | Block | IterationStatement | IterationStatementBlock | ForStatement | ForInOrForOfStatement,
// 
//     // A source file is a top-level block scope.
//     SourceFileIncludes = TopLevel,
//     SourceFileExcludes = BlockScopeExcludes & ~TopLevel | IterationContainer,
// 
//     // Functions, methods, and accessors are both new lexical scopes and new block scopes.
//     FunctionIncludes = Function | TopLevel,
//     FunctionExcludes = BlockScopeExcludes & ~TopLevel | ArrowFunction | AsyncFunctionBody | CapturesThis | NonStaticClassElement | ConstructorWithSuperCall | IterationContainer | StaticInitializer,
// 
//     AsyncFunctionBodyIncludes = FunctionIncludes | AsyncFunctionBody,
//     AsyncFunctionBodyExcludes = FunctionExcludes & ~NonStaticClassElement,
// 
//     // Arrow functions are lexically scoped to their container, but are new block scopes.
//     ArrowFunctionIncludes = ArrowFunction | TopLevel,
//     ArrowFunctionExcludes = BlockScopeExcludes & ~TopLevel | ConstructorWithSuperCall,
// 
//     // Constructors are both new lexical scopes and new block scopes. Constructors are also
//     // always considered non-static members of a class.
//     ConstructorIncludes = FunctionIncludes | NonStaticClassElement,
//     ConstructorExcludes = FunctionExcludes & ~NonStaticClassElement,
// 
//     // 'do' and 'while' statements are not block scopes. We track that the subtree is contained
//     // within an IterationStatement to indicate whether the embedded statement is an
//     // IterationStatementBlock.
//     DoOrWhileStatementIncludes = IterationStatement | IterationContainer,
//     DoOrWhileStatementExcludes = None,
// 
//     // 'for' statements are new block scopes and have special handling for 'let' declarations.
//     ForStatementIncludes = IterationStatement | ForStatement | IterationContainer,
//     ForStatementExcludes = BlockScopeExcludes & ~ForStatement,
// 
//     // 'for-in' and 'for-of' statements are new block scopes and have special handling for
//     // 'let' declarations.
//     ForInOrForOfStatementIncludes = IterationStatement | ForInOrForOfStatement | IterationContainer,
//     ForInOrForOfStatementExcludes = BlockScopeExcludes & ~ForInOrForOfStatement,
// 
//     // Blocks (other than function bodies) are new block scopes.
//     BlockIncludes = Block,
//     BlockExcludes = BlockScopeExcludes & ~Block,
// 
//     IterationStatementBlockIncludes = IterationStatementBlock,
//     IterationStatementBlockExcludes = BlockScopeExcludes,
// 
//     StaticInitializerIncludes = FunctionIncludes | StaticInitializer,
//     StaticInitializerExcludes = FunctionExcludes,
// 
//     //
//     // Subtree facts
//     //
// 
//     NewTarget = 1 << 15,                            // Contains a 'new.target' meta-property
//     LexicalThis = 1 << 16,                          // Contains a lexical `this` reference
//     CapturedLexicalThis = 1 << 17,                  // Contains a lexical `this` reference captured by an arrow function.
// 
//     //
//     // Subtree masks
//     //
// 
//     SubtreeFactsMask = ~AncestorFactsMask,
// 
//     ArrowFunctionSubtreeExcludes = None,
//     FunctionSubtreeExcludes = NewTarget | LexicalThis | CapturedLexicalThis,
// }

// Facts we track as we traverse the tree
// dprint-ignore
var HierarchyFacts;
(function (HierarchyFacts) {
    HierarchyFacts[HierarchyFacts["None"] = 0] = "None";
    //
    // Ancestor facts
    //
    HierarchyFacts[HierarchyFacts["Function"] = 1] = "Function";
    HierarchyFacts[HierarchyFacts["ArrowFunction"] = 2] = "ArrowFunction";
    HierarchyFacts[HierarchyFacts["AsyncFunctionBody"] = 4] = "AsyncFunctionBody";
    HierarchyFacts[HierarchyFacts["NonStaticClassElement"] = 8] = "NonStaticClassElement";
    HierarchyFacts[HierarchyFacts["CapturesThis"] = 16] = "CapturesThis";
    HierarchyFacts[HierarchyFacts["ExportedVariableStatement"] = 32] = "ExportedVariableStatement";
    HierarchyFacts[HierarchyFacts["TopLevel"] = 64] = "TopLevel";
    HierarchyFacts[HierarchyFacts["Block"] = 128] = "Block";
    HierarchyFacts[HierarchyFacts["IterationStatement"] = 256] = "IterationStatement";
    HierarchyFacts[HierarchyFacts["IterationStatementBlock"] = 512] = "IterationStatementBlock";
    HierarchyFacts[HierarchyFacts["IterationContainer"] = 1024] = "IterationContainer";
    HierarchyFacts[HierarchyFacts["ForStatement"] = 2048] = "ForStatement";
    HierarchyFacts[HierarchyFacts["ForInOrForOfStatement"] = 4096] = "ForInOrForOfStatement";
    HierarchyFacts[HierarchyFacts["ConstructorWithSuperCall"] = 8192] = "ConstructorWithSuperCall";
    HierarchyFacts[HierarchyFacts["StaticInitializer"] = 16384] = "StaticInitializer";
    // NOTE: do not add more ancestor flags without also updating AncestorFactsMask below.
    // NOTE: when adding a new ancestor flag, be sure to update the subtree flags below.
    //
    // Ancestor masks
    //
    HierarchyFacts[HierarchyFacts["AncestorFactsMask"] = 32767] = "AncestorFactsMask";
    // We are always in *some* kind of block scope, but only specific block-scope containers are
    // top-level or Blocks.
    HierarchyFacts[HierarchyFacts["BlockScopeIncludes"] = 0] = "BlockScopeIncludes";
    HierarchyFacts[HierarchyFacts["BlockScopeExcludes"] = 7104] = "BlockScopeExcludes";
    // A source file is a top-level block scope.
    HierarchyFacts[HierarchyFacts["SourceFileIncludes"] = 64] = "SourceFileIncludes";
    HierarchyFacts[HierarchyFacts["SourceFileExcludes"] = 8064] = "SourceFileExcludes";
    // Functions, methods, and accessors are both new lexical scopes and new block scopes.
    HierarchyFacts[HierarchyFacts["FunctionIncludes"] = 65] = "FunctionIncludes";
    HierarchyFacts[HierarchyFacts["FunctionExcludes"] = 32670] = "FunctionExcludes";
    HierarchyFacts[HierarchyFacts["AsyncFunctionBodyIncludes"] = 69] = "AsyncFunctionBodyIncludes";
    HierarchyFacts[HierarchyFacts["AsyncFunctionBodyExcludes"] = 32662] = "AsyncFunctionBodyExcludes";
    // Arrow functions are lexically scoped to their container, but are new block scopes.
    HierarchyFacts[HierarchyFacts["ArrowFunctionIncludes"] = 66] = "ArrowFunctionIncludes";
    HierarchyFacts[HierarchyFacts["ArrowFunctionExcludes"] = 15232] = "ArrowFunctionExcludes";
    // Constructors are both new lexical scopes and new block scopes. Constructors are also
    // always considered non-static members of a class.
    HierarchyFacts[HierarchyFacts["ConstructorIncludes"] = 73] = "ConstructorIncludes";
    HierarchyFacts[HierarchyFacts["ConstructorExcludes"] = 32662] = "ConstructorExcludes";
    // 'do' and 'while' statements are not block scopes. We track that the subtree is contained
    // within an IterationStatement to indicate whether the embedded statement is an
    // IterationStatementBlock.
    HierarchyFacts[HierarchyFacts["DoOrWhileStatementIncludes"] = 1280] = "DoOrWhileStatementIncludes";
    HierarchyFacts[HierarchyFacts["DoOrWhileStatementExcludes"] = 0] = "DoOrWhileStatementExcludes";
    // 'for' statements are new block scopes and have special handling for 'let' declarations.
    HierarchyFacts[HierarchyFacts["ForStatementIncludes"] = 3328] = "ForStatementIncludes";
    HierarchyFacts[HierarchyFacts["ForStatementExcludes"] = 5056] = "ForStatementExcludes";
    // 'for-in' and 'for-of' statements are new block scopes and have special handling for
    // 'let' declarations.
    HierarchyFacts[HierarchyFacts["ForInOrForOfStatementIncludes"] = 5376] = "ForInOrForOfStatementIncludes";
    HierarchyFacts[HierarchyFacts["ForInOrForOfStatementExcludes"] = 3008] = "ForInOrForOfStatementExcludes";
    // Blocks (other than function bodies) are new block scopes.
    HierarchyFacts[HierarchyFacts["BlockIncludes"] = 128] = "BlockIncludes";
    HierarchyFacts[HierarchyFacts["BlockExcludes"] = 6976] = "BlockExcludes";
    HierarchyFacts[HierarchyFacts["IterationStatementBlockIncludes"] = 512] = "IterationStatementBlockIncludes";
    HierarchyFacts[HierarchyFacts["IterationStatementBlockExcludes"] = 7104] = "IterationStatementBlockExcludes";
    HierarchyFacts[HierarchyFacts["StaticInitializerIncludes"] = 16449] = "StaticInitializerIncludes";
    HierarchyFacts[HierarchyFacts["StaticInitializerExcludes"] = 32670] = "StaticInitializerExcludes";
    //
    // Subtree facts
    //
    HierarchyFacts[HierarchyFacts["NewTarget"] = 32768] = "NewTarget";
    HierarchyFacts[HierarchyFacts["LexicalThis"] = 65536] = "LexicalThis";
    HierarchyFacts[HierarchyFacts["CapturedLexicalThis"] = 131072] = "CapturedLexicalThis";
    //
    // Subtree masks
    //
    HierarchyFacts[HierarchyFacts["SubtreeFactsMask"] = -32768] = "SubtreeFactsMask";
    HierarchyFacts[HierarchyFacts["ArrowFunctionSubtreeExcludes"] = 0] = "ArrowFunctionSubtreeExcludes";
    HierarchyFacts[HierarchyFacts["FunctionSubtreeExcludes"] = 229376] = "FunctionSubtreeExcludes";
})(HierarchyFacts || (HierarchyFacts = {}));


// dprint-ignore
var SpreadSegmentKind;
(function (SpreadSegmentKind) {
    SpreadSegmentKind[SpreadSegmentKind["None"] = 0] = "None";
    SpreadSegmentKind[SpreadSegmentKind["UnpackedSpread"] = 1] = "UnpackedSpread";
    SpreadSegmentKind[SpreadSegmentKind["PackedSpread"] = 2] = "PackedSpread";
})(SpreadSegmentKind || (SpreadSegmentKind = {}));

function createSpreadSegment(kind, expression) {
    return { kind, expression };
}

/** @internal */
export function transformES2015(context) {
    const { factory, getEmitHelperFactory: emitHelpers, startLexicalEnvironment, resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration, } = context;
    const compilerOptions = context.getCompilerOptions();
    const resolver = context.getEmitResolver();
    const previousOnSubstituteNode = context.onSubstituteNode;
    const previousOnEmitNode = context.onEmitNode;
    context.onEmitNode = onEmitNode;
    context.onSubstituteNode = onSubstituteNode;
    let currentSourceFile;
    let currentText;
    let hierarchyFacts;
    let taggedTemplateStringDeclarations;
    function recordTaggedTemplateString(temp) {
        taggedTemplateStringDeclarations = append(taggedTemplateStringDeclarations, factory.createVariableDeclaration(temp));
    }
    /**
     * Used to track if we are emitting body of the converted loop
     */
    let convertedLoopState;
    /**
     * Keeps track of whether substitutions have been enabled for specific cases.
     * They are persisted between each SourceFile transformation and should not
     * be reset.
     */
    let enabledSubstitutions = 0 /* ES2015SubstitutionFlags.None */;
    return chainBundle(context, transformSourceFile);
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        currentSourceFile = node;
        currentText = node.text;
        const visited = visitSourceFile(node);
        addEmitHelpers(visited, context.readEmitHelpers());
        currentSourceFile = undefined;
        currentText = undefined;
        taggedTemplateStringDeclarations = undefined;
        hierarchyFacts = 0 /* HierarchyFacts.None */;
        return visited;
    }
    /**
     * Sets the `HierarchyFacts` for this node prior to visiting this node's subtree, returning the facts set prior to modification.
     * @param excludeFacts The existing `HierarchyFacts` to reset before visiting the subtree.
     * @param includeFacts The new `HierarchyFacts` to set before visiting the subtree.
     */
    function enterSubtree(excludeFacts, includeFacts) {
        const ancestorFacts = hierarchyFacts;
        hierarchyFacts = (hierarchyFacts & ~excludeFacts | includeFacts) & 32767 /* HierarchyFacts.AncestorFactsMask */;
        return ancestorFacts;
    }
    /**
     * Restores the `HierarchyFacts` for this node's ancestor after visiting this node's
     * subtree, propagating specific facts from the subtree.
     * @param ancestorFacts The `HierarchyFacts` of the ancestor to restore after visiting the subtree.
     * @param excludeFacts The existing `HierarchyFacts` of the subtree that should not be propagated.
     * @param includeFacts The new `HierarchyFacts` of the subtree that should be propagated.
     */
    function exitSubtree(ancestorFacts, excludeFacts, includeFacts) {
        hierarchyFacts = (hierarchyFacts & ~excludeFacts | includeFacts) & -32768 /* HierarchyFacts.SubtreeFactsMask */ | ancestorFacts;
    }
    function isReturnVoidStatementInConstructorWithCapturedSuper(node) {
        return (hierarchyFacts & 8192 /* HierarchyFacts.ConstructorWithSuperCall */) !== 0
            && node.kind === SyntaxKind.ReturnStatement
            && !node.expression;
    }
    function isOrMayContainReturnCompletion(node) {
        return node.transformFlags & TransformFlags.ContainsHoistedDeclarationOrCompletion
            && (isReturnStatement(node)
                || isIfStatement(node)
                || isWithStatement(node)
                || isSwitchStatement(node)
                || isCaseBlock(node)
                || isCaseClause(node)
                || isDefaultClause(node)
                || isTryStatement(node)
                || isCatchClause(node)
                || isLabeledStatement(node)
                || isIterationStatement(node, /*lookInLabeledStatements*/ false)
                || isBlock(node));
    }
    function shouldVisitNode(node) {
        return (node.transformFlags & TransformFlags.ContainsES2015) !== 0
            || convertedLoopState !== undefined
            || (hierarchyFacts & 8192 /* HierarchyFacts.ConstructorWithSuperCall */ && isOrMayContainReturnCompletion(node))
            || (isIterationStatement(node, /*lookInLabeledStatements*/ false) && shouldConvertIterationStatement(node))
            || (getInternalEmitFlags(node) & InternalEmitFlags.TypeScriptClassWrapper) !== 0;
    }
    function visitor(node) {
        return shouldVisitNode(node) ? visitorWorker(node, /*expressionResultIsUnused*/ false) : node;
    }
    function visitorWithUnusedExpressionResult(node) {
        return shouldVisitNode(node) ? visitorWorker(node, /*expressionResultIsUnused*/ true) : node;
    }
    function classWrapperStatementVisitor(node) {
        if (shouldVisitNode(node)) {
            const original = getOriginalNode(node);
            if (isPropertyDeclaration(original) && hasStaticModifier(original)) {
                const ancestorFacts = enterSubtree(32670 /* HierarchyFacts.StaticInitializerExcludes */, 16449 /* HierarchyFacts.StaticInitializerIncludes */);
                const result = visitorWorker(node, /*expressionResultIsUnused*/ false);
                exitSubtree(ancestorFacts, 229376 /* HierarchyFacts.FunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
                return result;
            }
            return visitorWorker(node, /*expressionResultIsUnused*/ false);
        }
        return node;
    }
    function callExpressionVisitor(node) {
        if (node.kind === SyntaxKind.SuperKeyword) {
            return visitSuperKeyword(node, /*isExpressionOfCall*/ true);
        }
        return visitor(node);
    }
    function visitorWorker(node, expressionResultIsUnused) {
        switch (node.kind) {
            case SyntaxKind.StaticKeyword:
                return undefined; // elide static keyword
            case SyntaxKind.ClassDeclaration:
                return visitClassDeclaration(node);
            case SyntaxKind.ClassExpression:
                return visitClassExpression(node);
            case SyntaxKind.Parameter:
                return visitParameter(node);
            case SyntaxKind.FunctionDeclaration:
                return visitFunctionDeclaration(node);
            case SyntaxKind.ArrowFunction:
                return visitArrowFunction(node);
            case SyntaxKind.FunctionExpression:
                return visitFunctionExpression(node);
            case SyntaxKind.VariableDeclaration:
                return visitVariableDeclaration(node);
            case SyntaxKind.Identifier:
                return visitIdentifier(node);
            case SyntaxKind.VariableDeclarationList:
                return visitVariableDeclarationList(node);
            case SyntaxKind.SwitchStatement:
                return visitSwitchStatement(node);
            case SyntaxKind.CaseBlock:
                return visitCaseBlock(node);
            case SyntaxKind.Block:
                return visitBlock(node, /*isFunctionBody*/ false);
            case SyntaxKind.BreakStatement:
            case SyntaxKind.ContinueStatement:
                return visitBreakOrContinueStatement(node);
            case SyntaxKind.LabeledStatement:
                return visitLabeledStatement(node);
            case SyntaxKind.DoStatement:
            case SyntaxKind.WhileStatement:
                return visitDoOrWhileStatement(node, /*outermostLabeledStatement*/ undefined);
            case SyntaxKind.ForStatement:
                return visitForStatement(node, /*outermostLabeledStatement*/ undefined);
            case SyntaxKind.ForInStatement:
                return visitForInStatement(node, /*outermostLabeledStatement*/ undefined);
            case SyntaxKind.ForOfStatement:
                return visitForOfStatement(node, /*outermostLabeledStatement*/ undefined);
            case SyntaxKind.ExpressionStatement:
                return visitExpressionStatement(node);
            case SyntaxKind.ObjectLiteralExpression:
                return visitObjectLiteralExpression(node);
            case SyntaxKind.CatchClause:
                return visitCatchClause(node);
            case SyntaxKind.ShorthandPropertyAssignment:
                return visitShorthandPropertyAssignment(node);
            case SyntaxKind.ComputedPropertyName:
                return visitComputedPropertyName(node);
            case SyntaxKind.ArrayLiteralExpression:
                return visitArrayLiteralExpression(node);
            case SyntaxKind.CallExpression:
                return visitCallExpression(node);
            case SyntaxKind.NewExpression:
                return visitNewExpression(node);
            case SyntaxKind.ParenthesizedExpression:
                return visitParenthesizedExpression(node, expressionResultIsUnused);
            case SyntaxKind.BinaryExpression:
                return visitBinaryExpression(node, expressionResultIsUnused);
            case SyntaxKind.CommaListExpression:
                return visitCommaListExpression(node, expressionResultIsUnused);
            case SyntaxKind.NoSubstitutionTemplateLiteral:
            case SyntaxKind.TemplateHead:
            case SyntaxKind.TemplateMiddle:
            case SyntaxKind.TemplateTail:
                return visitTemplateLiteral(node);
            case SyntaxKind.StringLiteral:
                return visitStringLiteral(node);
            case SyntaxKind.NumericLiteral:
                return visitNumericLiteral(node);
            case SyntaxKind.TaggedTemplateExpression:
                return visitTaggedTemplateExpression(node);
            case SyntaxKind.TemplateExpression:
                return visitTemplateExpression(node);
            case SyntaxKind.YieldExpression:
                return visitYieldExpression(node);
            case SyntaxKind.SpreadElement:
                return visitSpreadElement(node);
            case SyntaxKind.SuperKeyword:
                return visitSuperKeyword(node, /*isExpressionOfCall*/ false);
            case SyntaxKind.ThisKeyword:
                return visitThisKeyword(node);
            case SyntaxKind.MetaProperty:
                return visitMetaProperty(node);
            case SyntaxKind.MethodDeclaration:
                return visitMethodDeclaration(node);
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
                return visitAccessorDeclaration(node);
            case SyntaxKind.VariableStatement:
                return visitVariableStatement(node);
            case SyntaxKind.ReturnStatement:
                return visitReturnStatement(node);
            case SyntaxKind.VoidExpression:
                return visitVoidExpression(node);
            default:
                return visitEachChild(node, visitor, context);
        }
    }
    function visitSourceFile(node) {
        const ancestorFacts = enterSubtree(8064 /* HierarchyFacts.SourceFileExcludes */, 64 /* HierarchyFacts.SourceFileIncludes */);
        const prologue = [];
        const statements = [];
        startLexicalEnvironment();
        const statementOffset = factory.copyPrologue(node.statements, prologue, /*ensureUseStrict*/ false, visitor);
        addRange(statements, visitNodes(node.statements, visitor, isStatement, statementOffset));
        if (taggedTemplateStringDeclarations) {
            statements.push(factory.createVariableStatement(/*modifiers*/ undefined, factory.createVariableDeclarationList(taggedTemplateStringDeclarations)));
        }
        factory.mergeLexicalEnvironment(prologue, endLexicalEnvironment());
        insertCaptureThisForNodeIfNeeded(prologue, node);
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return factory.updateSourceFile(node, setTextRange(factory.createNodeArray(concatenate(prologue, statements)), node.statements));
    }
    function visitSwitchStatement(node) {
        if (convertedLoopState !== undefined) {
            const savedAllowedNonLabeledJumps = convertedLoopState.allowedNonLabeledJumps;
            // for switch statement allow only non-labeled break
            convertedLoopState.allowedNonLabeledJumps |= 2 /* Jump.Break */;
            const result = visitEachChild(node, visitor, context);
            convertedLoopState.allowedNonLabeledJumps = savedAllowedNonLabeledJumps;
            return result;
        }
        return visitEachChild(node, visitor, context);
    }
    function visitCaseBlock(node) {
        const ancestorFacts = enterSubtree(7104 /* HierarchyFacts.BlockScopeExcludes */, 0 /* HierarchyFacts.BlockScopeIncludes */);
        const updated = visitEachChild(node, visitor, context);
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return updated;
    }
    function returnCapturedThis(node) {
        return setOriginalNode(factory.createReturnStatement(createCapturedThis()), node);
    }
    function createCapturedThis() {
        return factory.createUniqueName("_this", GeneratedIdentifierFlags.Optimistic | GeneratedIdentifierFlags.FileLevel);
    }
    function visitReturnStatement(node) {
        if (convertedLoopState) {
            convertedLoopState.nonLocalJumps |= 8 /* Jump.Return */;
            if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
                node = returnCapturedThis(node);
            }
            return factory.createReturnStatement(factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(factory.createIdentifier("value"), node.expression
                    ? Debug.checkDefined(visitNode(node.expression, visitor, isExpression))
                    : factory.createVoidZero()),
            ]));
        }
        else if (isReturnVoidStatementInConstructorWithCapturedSuper(node)) {
            return returnCapturedThis(node);
        }
        return visitEachChild(node, visitor, context);
    }
    function visitThisKeyword(node) {
        hierarchyFacts |= 65536 /* HierarchyFacts.LexicalThis */;
        if (hierarchyFacts & 2 /* HierarchyFacts.ArrowFunction */ && !(hierarchyFacts & 16384 /* HierarchyFacts.StaticInitializer */)) {
            hierarchyFacts |= 131072 /* HierarchyFacts.CapturedLexicalThis */;
        }
        if (convertedLoopState) {
            if (hierarchyFacts & 2 /* HierarchyFacts.ArrowFunction */) {
                // if the enclosing function is an ArrowFunction then we use the captured 'this' keyword.
                convertedLoopState.containsLexicalThis = true;
                return node;
            }
            return convertedLoopState.thisName || (convertedLoopState.thisName = factory.createUniqueName("this"));
        }
        return node;
    }
    function visitVoidExpression(node) {
        return visitEachChild(node, visitorWithUnusedExpressionResult, context);
    }
    function visitIdentifier(node) {
        if (convertedLoopState) {
            if (resolver.isArgumentsLocalBinding(node)) {
                return convertedLoopState.argumentsName || (convertedLoopState.argumentsName = factory.createUniqueName("arguments"));
            }
        }
        if (node.flags & NodeFlags.IdentifierHasExtendedUnicodeEscape) {
            return setOriginalNode(setTextRange(factory.createIdentifier(unescapeLeadingUnderscores(node.escapedText)), node), node);
        }
        return node;
    }
    function visitBreakOrContinueStatement(node) {
        if (convertedLoopState) {
            // check if we can emit break/continue as is
            // it is possible if either
            //   - break/continue is labeled and label is located inside the converted loop
            //   - break/continue is non-labeled and located in non-converted loop/switch statement
            const jump = node.kind === SyntaxKind.BreakStatement ? 2 /* Jump.Break */ : 4 /* Jump.Continue */;
            const canUseBreakOrContinue = (node.label && convertedLoopState.labels && convertedLoopState.labels.get(idText(node.label))) ||
                (!node.label && (convertedLoopState.allowedNonLabeledJumps & jump));
            if (!canUseBreakOrContinue) {
                let labelMarker;
                const label = node.label;
                if (!label) {
                    if (node.kind === SyntaxKind.BreakStatement) {
                        convertedLoopState.nonLocalJumps |= 2 /* Jump.Break */;
                        labelMarker = "break";
                    }
                    else {
                        convertedLoopState.nonLocalJumps |= 4 /* Jump.Continue */;
                        // note: return value is emitted only to simplify debugging, call to converted loop body does not do any dispatching on it.
                        labelMarker = "continue";
                    }
                }
                else {
                    if (node.kind === SyntaxKind.BreakStatement) {
                        labelMarker = `break-${label.escapedText}`;
                        setLabeledJump(convertedLoopState, /*isBreak*/ true, idText(label), labelMarker);
                    }
                    else {
                        labelMarker = `continue-${label.escapedText}`;
                        setLabeledJump(convertedLoopState, /*isBreak*/ false, idText(label), labelMarker);
                    }
                }
                let returnExpression = factory.createStringLiteral(labelMarker);
                if (convertedLoopState.loopOutParameters.length) {
                    const outParams = convertedLoopState.loopOutParameters;
                    let expr;
                    for (let i = 0; i < outParams.length; i++) {
                        const copyExpr = copyOutParameter(outParams[i], 1 /* CopyDirection.ToOutParameter */);
                        if (i === 0) {
                            expr = copyExpr;
                        }
                        else {
                            expr = factory.createBinaryExpression(expr, SyntaxKind.CommaToken, copyExpr);
                        }
                    }
                    returnExpression = factory.createBinaryExpression(expr, SyntaxKind.CommaToken, returnExpression);
                }
                return factory.createReturnStatement(returnExpression);
            }
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a ClassDeclaration and transforms it into a variable statement.
     *
     * @param node A ClassDeclaration node.
     */
    function visitClassDeclaration(node) {
        // [source]
        //      class C { }
        //
        // [output]
        //      var C = (function () {
        //          function C() {
        //          }
        //          return C;
        //      }());
        const variable = factory.createVariableDeclaration(factory.getLocalName(node, /*allowComments*/ true), 
        /*exclamationToken*/ undefined, 
        /*type*/ undefined, transformClassLikeDeclarationToExpression(node));
        setOriginalNode(variable, node);
        const statements = [];
        const statement = factory.createVariableStatement(/*modifiers*/ undefined, factory.createVariableDeclarationList([variable]));
        setOriginalNode(statement, node);
        setTextRange(statement, node);
        startOnNewLine(statement);
        statements.push(statement);
        // Add an `export default` statement for default exports (for `--target es5 --module es6`)
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
            const exportStatement = hasSyntacticModifier(node, ModifierFlags.Default)
                ? factory.createExportDefault(factory.getLocalName(node))
                : factory.createExternalModuleExport(factory.getLocalName(node));
            setOriginalNode(exportStatement, statement);
            statements.push(exportStatement);
        }
        return singleOrMany(statements);
    }
    /**
     * Visits a ClassExpression and transforms it into an expression.
     *
     * @param node A ClassExpression node.
     */
    function visitClassExpression(node) {
        // [source]
        //      C = class { }
        //
        // [output]
        //      C = (function () {
        //          function class_1() {
        //          }
        //          return class_1;
        //      }())
        return transformClassLikeDeclarationToExpression(node);
    }
    /**
     * Transforms a ClassExpression or ClassDeclaration into an expression.
     *
     * @param node A ClassExpression or ClassDeclaration node.
     */
    function transformClassLikeDeclarationToExpression(node) {
        // [source]
        //      class C extends D {
        //          constructor() {}
        //          method() {}
        //          get prop() {}
        //          set prop(v) {}
        //      }
        //
        // [output]
        //      (function (_super) {
        //          __extends(C, _super);
        //          function C() {
        //          }
        //          C.prototype.method = function () {}
        //          Object.defineProperty(C.prototype, "prop", {
        //              get: function() {},
        //              set: function() {},
        //              enumerable: true,
        //              configurable: true
        //          });
        //          return C;
        //      }(D))
        if (node.name) {
            enableSubstitutionsForBlockScopedBindings();
        }
        const extendsClauseElement = getClassExtendsHeritageElement(node);
        const classFunction = factory.createFunctionExpression(
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, 
        /*name*/ undefined, 
        /*typeParameters*/ undefined, extendsClauseElement ? [factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, createSyntheticSuper())] : [], 
        /*type*/ undefined, transformClassBody(node, extendsClauseElement));
        // To preserve the behavior of the old emitter, we explicitly indent
        // the body of the function here if it was requested in an earlier
        // transformation.
        setEmitFlags(classFunction, (getEmitFlags(node) & EmitFlags.Indented) | EmitFlags.ReuseTempVariableScope);
        // "inner" and "outer" below are added purely to preserve source map locations from
        // the old emitter
        const inner = factory.createPartiallyEmittedExpression(classFunction);
        setTextRangeEnd(inner, node.end);
        setEmitFlags(inner, EmitFlags.NoComments);
        const outer = factory.createPartiallyEmittedExpression(inner);
        setTextRangeEnd(outer, skipTrivia(currentText, node.pos));
        setEmitFlags(outer, EmitFlags.NoComments);
        const result = factory.createParenthesizedExpression(factory.createCallExpression(outer, 
        /*typeArguments*/ undefined, extendsClauseElement
            ? [Debug.checkDefined(visitNode(extendsClauseElement.expression, visitor, isExpression))]
            : []));
        addSyntheticLeadingComment(result, SyntaxKind.MultiLineCommentTrivia, "* @class ");
        return result;
    }
    /**
     * Transforms a ClassExpression or ClassDeclaration into a function body.
     *
     * @param node A ClassExpression or ClassDeclaration node.
     * @param extendsClauseElement The expression for the class `extends` clause.
     */
    function transformClassBody(node, extendsClauseElement) {
        const statements = [];
        const name = factory.getInternalName(node);
        const constructorLikeName = isIdentifierANonContextualKeyword(name) ? factory.getGeneratedNameForNode(name) : name;
        startLexicalEnvironment();
        addExtendsHelperIfNeeded(statements, node, extendsClauseElement);
        addConstructor(statements, node, constructorLikeName, extendsClauseElement);
        addClassMembers(statements, node);
        // Create a synthetic text range for the return statement.
        const closingBraceLocation = createTokenRange(skipTrivia(currentText, node.members.end), SyntaxKind.CloseBraceToken);
        // The following partially-emitted expression exists purely to align our sourcemap
        // emit with the original emitter.
        const outer = factory.createPartiallyEmittedExpression(constructorLikeName);
        setTextRangeEnd(outer, closingBraceLocation.end);
        setEmitFlags(outer, EmitFlags.NoComments);
        const statement = factory.createReturnStatement(outer);
        setTextRangePos(statement, closingBraceLocation.pos);
        setEmitFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
        statements.push(statement);
        insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
        const block = factory.createBlock(setTextRange(factory.createNodeArray(statements), /*location*/ node.members), /*multiLine*/ true);
        setEmitFlags(block, EmitFlags.NoComments);
        return block;
    }
    /**
     * Adds a call to the `__extends` helper if needed for a class.
     *
     * @param statements The statements of the class body function.
     * @param node The ClassExpression or ClassDeclaration node.
     * @param extendsClauseElement The expression for the class `extends` clause.
     */
    function addExtendsHelperIfNeeded(statements, node, extendsClauseElement) {
        if (extendsClauseElement) {
            statements.push(setTextRange(factory.createExpressionStatement(emitHelpers().createExtendsHelper(factory.getInternalName(node))), 
            /*location*/ extendsClauseElement));
        }
    }
    /**
     * Adds the constructor of the class to a class body function.
     *
     * @param statements The statements of the class body function.
     * @param node The ClassExpression or ClassDeclaration node.
     * @param extendsClauseElement The expression for the class `extends` clause.
     */
    function addConstructor(statements, node, name, extendsClauseElement) {
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const ancestorFacts = enterSubtree(32662 /* HierarchyFacts.ConstructorExcludes */, 73 /* HierarchyFacts.ConstructorIncludes */);
        const constructor = getFirstConstructorWithBody(node);
        const hasSynthesizedSuper = hasSynthesizedDefaultSuperCall(constructor, extendsClauseElement !== undefined);
        const constructorFunction = factory.createFunctionDeclaration(
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, name, 
        /*typeParameters*/ undefined, transformConstructorParameters(constructor, hasSynthesizedSuper), 
        /*type*/ undefined, transformConstructorBody(constructor, node, extendsClauseElement, hasSynthesizedSuper));
        setTextRange(constructorFunction, constructor || node);
        if (extendsClauseElement) {
            setEmitFlags(constructorFunction, EmitFlags.CapturesThis);
        }
        statements.push(constructorFunction);
        exitSubtree(ancestorFacts, 229376 /* HierarchyFacts.FunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
        convertedLoopState = savedConvertedLoopState;
    }
    /**
     * Transforms the parameters of the constructor declaration of a class.
     *
     * @param constructor The constructor for the class.
     * @param hasSynthesizedSuper A value indicating whether the constructor starts with a
     *                            synthesized `super` call.
     */
    function transformConstructorParameters(constructor, hasSynthesizedSuper) {
        // If the TypeScript transformer needed to synthesize a constructor for property
        // initializers, it would have also added a synthetic `...args` parameter and
        // `super` call.
        // If this is the case, we do not include the synthetic `...args` parameter and
        // will instead use the `arguments` object in ES5/3.
        return visitParameterList(constructor && !hasSynthesizedSuper ? constructor.parameters : undefined, visitor, context)
            || [];
    }
    function createDefaultConstructorBody(node, isDerivedClass) {
        // We must be here because the user didn't write a constructor
        // but we needed to call 'super(...args)' anyway as per 14.5.14 of the ES2016 spec.
        // If that's the case we can just immediately return the result of a 'super()' call.
        const statements = [];
        resumeLexicalEnvironment();
        factory.mergeLexicalEnvironment(statements, endLexicalEnvironment());
        if (isDerivedClass) {
            // return _super !== null && _super.apply(this, arguments) || this;
            statements.push(factory.createReturnStatement(createDefaultSuperCallOrThis()));
        }
        const statementsArray = factory.createNodeArray(statements);
        setTextRange(statementsArray, node.members);
        const block = factory.createBlock(statementsArray, /*multiLine*/ true);
        setTextRange(block, node);
        setEmitFlags(block, EmitFlags.NoComments);
        return block;
    }
    function isUninitializedVariableStatement(node) {
        return isVariableStatement(node) && every(node.declarationList.declarations, decl => isIdentifier(decl.name) && !decl.initializer);
    }
    function containsSuperCall(node) {
        if (isSuperCall(node)) {
            return true;
        }
        if (!(node.transformFlags & TransformFlags.ContainsLexicalSuper)) {
            return false;
        }
        switch (node.kind) {
            // stop at function boundaries
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.Constructor:
            case SyntaxKind.ClassStaticBlockDeclaration:
                return false;
            // only step into computed property names for class and object literal elements
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.PropertyDeclaration: {
                const named = node;
                if (isComputedPropertyName(named.name)) {
                    return !!forEachChild(named.name, containsSuperCall);
                }
                return false;
            }
        }
        return !!forEachChild(node, containsSuperCall);
    }
    /**
     * Transforms the body of a constructor declaration of a class.
     *
     * @param constructor The constructor for the class.
     * @param node The node which contains the constructor.
     * @param extendsClauseElement The expression for the class `extends` clause.
     * @param hasSynthesizedSuper A value indicating whether the constructor starts with a
     *                            synthesized `super` call.
     */
    function transformConstructorBody(constructor, node, extendsClauseElement, hasSynthesizedSuper) {
        // determine whether the class is known syntactically to be a derived class (e.g. a
        // class that extends a value that is not syntactically known to be `null`).
        const isDerivedClass = !!extendsClauseElement && skipOuterExpressions(extendsClauseElement.expression).kind !== SyntaxKind.NullKeyword;
        // When the subclass does not have a constructor, we synthesize a *default* constructor using the following
        // representation:
        //
        // ```
        // // es2015 (source)
        // class C extends Base { }
        //
        // // es5 (transformed)
        // var C = (function (_super) {
        //     function C() {
        //         return _super.apply(this, arguments) || this;
        //     }
        //     return C;
        // })(Base);
        // ```
        if (!constructor)
            return createDefaultConstructorBody(node, isDerivedClass);
        // The prologue will contain all leading standard and custom prologue statements added by this transform
        const prologue = [];
        const statements = [];
        resumeLexicalEnvironment();
        // In derived classes, there may be code before the necessary super() call
        // We'll remove pre-super statements to be tacked on after the rest of the body
        const standardPrologueEnd = factory.copyStandardPrologue(constructor.body.statements, prologue, /*statementOffset*/ 0);
        if (hasSynthesizedSuper || containsSuperCall(constructor.body)) {
            hierarchyFacts |= 8192 /* HierarchyFacts.ConstructorWithSuperCall */;
        }
        addRange(statements, visitNodes(constructor.body.statements, visitor, isStatement, standardPrologueEnd));
        const mayReplaceThis = isDerivedClass || hierarchyFacts & 8192 /* HierarchyFacts.ConstructorWithSuperCall */;
        // Add parameter defaults at the beginning of the output, with prologue statements
        addDefaultValueAssignmentsIfNeeded(prologue, constructor);
        addRestParameterIfNeeded(prologue, constructor, hasSynthesizedSuper);
        insertCaptureNewTargetIfNeeded(prologue, constructor);
        if (mayReplaceThis) {
            insertCaptureThisForNode(prologue, constructor, createActualThis());
        }
        else {
            insertCaptureThisForNodeIfNeeded(prologue, constructor);
        }
        factory.mergeLexicalEnvironment(prologue, endLexicalEnvironment());
        if (mayReplaceThis && !isSufficientlyCoveredByReturnStatements(constructor.body)) {
            statements.push(factory.createReturnStatement(createCapturedThis()));
        }
        const body = factory.createBlock(setTextRange(factory.createNodeArray([
            ...prologue,
            ...statements,
        ]), 
        /*location*/ constructor.body.statements), 
        /*multiLine*/ true);
        setTextRange(body, constructor.body);
        return simplifyConstructor(body, constructor.body, hasSynthesizedSuper);
    }
    /** Tests whether `node` is a generated identifier whose base text is `_this` */
    function isCapturedThis(node) {
        return isGeneratedIdentifier(node) && idText(node) === "_this";
    }
    /** Tests whether `node` is a generated identifier whose base text is `_super` */
    function isSyntheticSuper(node) {
        return isGeneratedIdentifier(node) &&
            idText(node) === "_super";
    }
    /** Tests whether `node` is VariableStatement like `var _this = ...;` */
    function isThisCapturingVariableStatement(node) {
        return isVariableStatement(node) && node.declarationList.declarations.length === 1 &&
            isThisCapturingVariableDeclaration(node.declarationList.declarations[0]);
    }
    /** Tests whether `node` is a VariableDeclaration like in `var _this = ...` */
    function isThisCapturingVariableDeclaration(node) {
        return isVariableDeclaration(node) && isCapturedThis(node.name) && !!node.initializer;
    }
    /** Tests whether `node` is an AssignmentExpression like `_this = ...` */
    function isThisCapturingAssignment(node) {
        return isAssignmentExpression(node, /*excludeCompoundAssignment*/ true) && isCapturedThis(node.left);
    }
    /** Tests whether `node` is a call like `_super.call(this, ...)` or `_super.apply(this, ...)` */
    function isTransformedSuperCall(node) {
        return isCallExpression(node) &&
            isPropertyAccessExpression(node.expression) &&
            isSyntheticSuper(node.expression.expression) &&
            isIdentifier(node.expression.name) &&
            (idText(node.expression.name) === "call" || idText(node.expression.name) === "apply") &&
            node.arguments.length >= 1 &&
            node.arguments[0].kind === SyntaxKind.ThisKeyword;
    }
    /** Tests whether `node` is an expression like `_super.call(this) || this` */
    function isTransformedSuperCallWithFallback(node) {
        return isBinaryExpression(node) && node.operatorToken.kind === SyntaxKind.BarBarToken &&
            node.right.kind === SyntaxKind.ThisKeyword &&
            isTransformedSuperCall(node.left);
    }
    /** Tests whether `node` is a call like `_super !== null && _super.apply(this, arguments)` */
    function isImplicitSuperCall(node) {
        return isBinaryExpression(node) && node.operatorToken.kind === SyntaxKind.AmpersandAmpersandToken &&
            isBinaryExpression(node.left) && node.left.operatorToken.kind === SyntaxKind.ExclamationEqualsEqualsToken &&
            isSyntheticSuper(node.left.left) &&
            node.left.right.kind === SyntaxKind.NullKeyword &&
            isTransformedSuperCall(node.right) &&
            idText(node.right.expression.name) === "apply";
    }
    /** Tests whether `node` is an expression like `_super !== null && _super.apply(this, arguments) || this` */
    function isImplicitSuperCallWithFallback(node) {
        return isBinaryExpression(node) && node.operatorToken.kind === SyntaxKind.BarBarToken &&
            node.right.kind === SyntaxKind.ThisKeyword &&
            isImplicitSuperCall(node.left);
    }
    /** Tests whether `node` is an expression like `_this = _super.call(this) || this` */
    function isThisCapturingTransformedSuperCallWithFallback(node) {
        return isThisCapturingAssignment(node) && isTransformedSuperCallWithFallback(node.right);
    }
    /** Tests whether `node` is an expression like `_this = _super.call(this) || this` */
    function isThisCapturingImplicitSuperCallWithFallback(node) {
        return isThisCapturingAssignment(node) && isImplicitSuperCallWithFallback(node.right);
    }
    function isTransformedSuperCallLike(node) {
        return isTransformedSuperCall(node) ||
            isTransformedSuperCallWithFallback(node) ||
            isThisCapturingTransformedSuperCallWithFallback(node) ||
            isImplicitSuperCall(node) ||
            isImplicitSuperCallWithFallback(node) ||
            isThisCapturingImplicitSuperCallWithFallback(node);
    }
    /**
     * Simplifies a constructor by inlining `_this = _super.call(this) || this;` into a `var _this = this;` statement
     * that precedes it when they appear at the top level of the constructor body. No nested transformation is performed
     * as it is assumed that `body` has already been transformed prior to invoking this function.
     */
    function simplifyConstructorInlineSuperInThisCaptureVariable(body) {
        // given:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           var _this = this;
        //           _this = _super.call(this) || this;
        //           _this.x = 1;
        //           return _this;
        //       }
        //       return C;
        //   })(Base);
        //
        // simplifies to:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           var _this = _super.call(this) || this;
        //           _this.x = 1;
        //           return _this;
        //       }
        //       return C;
        //   })(Base);
        //
        for (let i = 0; i < body.statements.length - 1; i++) {
            const statement = body.statements[i];
            // walk forward until we find `var _this = ...;`
            if (!isThisCapturingVariableStatement(statement)) {
                continue;
            }
            // Only perform inlining for `var _this = this;`
            const varDecl = statement.declarationList.declarations[0];
            if (varDecl.initializer.kind !== SyntaxKind.ThisKeyword) {
                continue;
            }
            // It's possible that temporary variables may have been injected between `var _this` and `_this = ...`,
            // so we'll track any intervening statements to stitch them back in to the result.
            const thisCaptureStatementIndex = i;
            let superCallIndex = i + 1;
            while (superCallIndex < body.statements.length) {
                const statement = body.statements[superCallIndex];
                // stop on the next `_this = _super.call(...) || this` statement
                if (isExpressionStatement(statement)) {
                    if (isTransformedSuperCallLike(skipOuterExpressions(statement.expression))) {
                        break;
                    }
                }
                // skip over hoisted temporary variables
                if (isUninitializedVariableStatement(statement)) {
                    superCallIndex++;
                    continue;
                }
                // if there are any other statements following `var _this = ...` then we cannot simplify.
                return body;
            }
            const following = body.statements[superCallIndex];
            // If the expression that follows is `_this = ...`, strip off the assignment to `_this` since that will
            // be handled by the variable initializer.
            let expression = following.expression;
            if (isThisCapturingAssignment(expression)) {
                expression = expression.right;
            }
            const newVarDecl = factory.updateVariableDeclaration(varDecl, varDecl.name, 
            /*exclamationToken*/ undefined, 
            /*type*/ undefined, expression);
            const newDeclList = factory.updateVariableDeclarationList(statement.declarationList, [newVarDecl]);
            const newVarStatement = factory.createVariableStatement(statement.modifiers, newDeclList);
            setOriginalNode(newVarStatement, following);
            setTextRange(newVarStatement, following);
            const newStatements = factory.createNodeArray([
                ...body.statements.slice(0, thisCaptureStatementIndex), // copy statements preceding to `var _this`
                ...body.statements.slice(thisCaptureStatementIndex + 1, superCallIndex), // copy intervening temp variables
                newVarStatement,
                ...body.statements.slice(superCallIndex + 1), // copy statements following `super.call(this, ...)`
            ]);
            setTextRange(newStatements, body.statements);
            return factory.updateBlock(body, newStatements);
        }
        return body;
    }
    /**
     * Simplifies a constructor by inlining `_this = _super.call(this) || this;` into a `return _this;` statement
     * that follows it when they appear at the top level of the constructor body. No nested transformation is performed
     * as it is assumed that `body` has already been transformed prior to invoking this function.
     */
    function simplifyConstructorInlineSuperReturn(body, original) {
        // given:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           ...
        //           _this = _super.call(this) || this;
        //           return _this;
        //       }
        //       return C;
        //   })(Base);
        //
        // simplifies to:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           ...
        //           return _super.call(this) || this;
        //       }
        //       return C;
        //   })(Base);
        //
        // bail if there is a non-top-level `super()` in the original body
        for (const statement of original.statements) {
            if (statement.transformFlags & TransformFlags.ContainsLexicalSuper && !getSuperCallFromStatement(statement)) {
                return body;
            }
        }
        // If the original node contained a lexical `this` that must be preserved, or if we recorded a captured `this`
        // or `super`, then we cannot simplify `var _this = ...;`, but may still be able to inline standalone `_this = ...`
        // assignment statements.
        const canElideThisCapturingVariable = !(original.transformFlags & TransformFlags.ContainsLexicalThis) &&
            !(hierarchyFacts & 65536 /* HierarchyFacts.LexicalThis */) &&
            !(hierarchyFacts & 131072 /* HierarchyFacts.CapturedLexicalThis */);
        // find the return statement and the preceding transformed `super()` call
        for (let i = body.statements.length - 1; i > 0; i--) {
            // walk backwards until we find a `return _this;`
            const statement = body.statements[i];
            if (isReturnStatement(statement) && statement.expression && isCapturedThis(statement.expression)) {
                const preceding = body.statements[i - 1];
                let expression;
                if (isExpressionStatement(preceding) &&
                    isThisCapturingTransformedSuperCallWithFallback(skipOuterExpressions(preceding.expression))) {
                    // The preceding statement is `_this = _super.call(this, ...) || this`, so we'll inline the
                    // expression.
                    expression = preceding.expression;
                }
                else if (canElideThisCapturingVariable && isThisCapturingVariableStatement(preceding)) {
                    const varDecl = preceding.declarationList.declarations[0];
                    if (isTransformedSuperCallLike(skipOuterExpressions(varDecl.initializer))) {
                        // The preceding statement is `var _this = _super.call(this, ...) || this`, so we'll inline the
                        // initializer as a `_this` assignment, though it may be removed in a later pass.
                        expression = factory.createAssignment(createCapturedThis(), varDecl.initializer);
                    }
                }
                if (!expression) {
                    break;
                }
                const newReturnStatement = factory.createReturnStatement(expression);
                setOriginalNode(newReturnStatement, preceding);
                setTextRange(newReturnStatement, preceding);
                const newStatements = factory.createNodeArray([
                    ...body.statements.slice(0, i - 1), // copy all statements preceding `_super.call(this, ...)`
                    newReturnStatement,
                    ...body.statements.slice(i + 1), // copy all statements following `return _this;`
                ]);
                setTextRange(newStatements, body.statements);
                return factory.updateBlock(body, newStatements);
            }
        }
        return body;
    }
    /** Elides `var _this =` and `_this =` within the current function scope. */
    function elideUnusedThisCaptureWorker(node) {
        if (isThisCapturingVariableStatement(node)) {
            const varDecl = node.declarationList.declarations[0];
            if (varDecl.initializer.kind === SyntaxKind.ThisKeyword) {
                return undefined; // elide `var _this = this;`
            }
        }
        else if (isThisCapturingAssignment(node)) {
            return factory.createPartiallyEmittedExpression(node.right, node); // elide `_this =`
        }
        switch (node.kind) {
            // stop at function boundaries
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.Constructor:
            case SyntaxKind.ClassStaticBlockDeclaration:
                return node;
            // only step into computed property names for class and object literal elements
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.PropertyDeclaration: {
                const named = node;
                if (isComputedPropertyName(named.name)) {
                    return factory.replacePropertyName(named, visitEachChild(named.name, elideUnusedThisCaptureWorker, /*context*/ undefined));
                }
                return node;
            }
        }
        return visitEachChild(node, elideUnusedThisCaptureWorker, /*context*/ undefined);
    }
    /**
     * Simplifies a constructor by eliding `var _this = this;` and `_this = ...` when `this` capturing is no longer
     * necessary after other simplifications have been performed. No nested transformation is performed as it is assumed
     * that `body` has already been transformed prior to invoking this function. It is also assumed that this function is
     * only invoked after some other simplification has successfully replaced `body`.
     */
    function simplifyConstructorElideUnusedThisCapture(body, original) {
        // given:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           var _this = this;
        //           return _super.call(this) || this;
        //       }
        //       return C;
        //   })(Base);
        //
        // becomes:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           return _super.call(this) || this;
        //       }
        //       return C;
        //   })(Base);
        //
        // If the original node contained a lexical `this` that must be preserved, or if we recorded a captured `this`,
        // then there is nothing we can simplify.
        if (original.transformFlags & TransformFlags.ContainsLexicalThis ||
            hierarchyFacts & 65536 /* HierarchyFacts.LexicalThis */ ||
            hierarchyFacts & 131072 /* HierarchyFacts.CapturedLexicalThis */) {
            return body;
        }
        // bail if there is a non-top-level `super()` in the original body
        for (const statement of original.statements) {
            if (statement.transformFlags & TransformFlags.ContainsLexicalSuper && !getSuperCallFromStatement(statement)) {
                return body;
            }
        }
        return factory.updateBlock(body, visitNodes(body.statements, elideUnusedThisCaptureWorker, isStatement));
    }
    /** Injects `_super !== null &&` preceding any instance of a synthetic `_super.apply(this, arguments)` */
    function injectSuperPresenceCheckWorker(node) {
        if (isTransformedSuperCall(node) && node.arguments.length === 2 &&
            isIdentifier(node.arguments[1]) && idText(node.arguments[1]) === "arguments") {
            return factory.createLogicalAnd(factory.createStrictInequality(createSyntheticSuper(), factory.createNull()), node);
        }
        switch (node.kind) {
            // stop at function boundaries
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.Constructor:
            case SyntaxKind.ClassStaticBlockDeclaration:
                return node;
            // only step into computed property names for class and object literal elements
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.PropertyDeclaration: {
                const named = node;
                if (isComputedPropertyName(named.name)) {
                    return factory.replacePropertyName(named, visitEachChild(named.name, injectSuperPresenceCheckWorker, /*context*/ undefined));
                }
                return node;
            }
        }
        return visitEachChild(node, injectSuperPresenceCheckWorker, /*context*/ undefined);
    }
    /**
     * A slight non-simplification of a constructor, this injects a `_super !== null` test prior to a synthetic
     * `_super.call(this)` expression to support the synthetic super call we introduce for subclasses with an
     * implicit constructor, in the event the derviced class in the `extends` clause evaluates to `null`. No nested
     * transformation is performed as it is assumed that `body` has already been transformed prior to invoking this
     * function. It is also assumed that this function is only invoked for a constructor containing a synthetic
     * implicit `super()` call.
     */
    function complicateConstructorInjectSuperPresenceCheck(body) {
        // given:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           return _super.call(this) || this;
        //       }
        //       return C;
        //   })(Base);
        //
        // becomes:
        //
        //   var C = (function (_super) {
        //       function C() {
        //           return _super !== null && _super.call(this) || this;
        //       }
        //       return C;
        //   })(Base);
        //
        return factory.updateBlock(body, visitNodes(body.statements, injectSuperPresenceCheckWorker, isStatement));
    }
    /**
     * Simplifies a derived constructor by performing inlining tasks related to this-capturing and transformed
     * `super()` calls.
     * @param body The constructor body.
     * @param original The original constructor body.
     * @param hasSynthesizedSuper A value indicating whether the body may contain a synthetic implicit `super()` call.
     */
    function simplifyConstructor(body, original, hasSynthesizedSuper) {
        const inputBody = body;
        body = simplifyConstructorInlineSuperInThisCaptureVariable(body);
        body = simplifyConstructorInlineSuperReturn(body, original);
        if (body !== inputBody) {
            // Only perform `var _this = this` elision if some other simplification succeeded.
            body = simplifyConstructorElideUnusedThisCapture(body, original);
        }
        if (hasSynthesizedSuper) {
            body = complicateConstructorInjectSuperPresenceCheck(body);
        }
        return body;
    }
    /**
     * We want to try to avoid emitting a return statement in certain cases if a user already returned something.
     * It would generate obviously dead code, so we'll try to make things a little bit prettier
     * by doing a minimal check on whether some common patterns always explicitly return.
     */
    function isSufficientlyCoveredByReturnStatements(statement) {
        // A return statement is considered covered.
        if (statement.kind === SyntaxKind.ReturnStatement) {
            return true;
        }
        // An if-statement with two covered branches is covered.
        else if (statement.kind === SyntaxKind.IfStatement) {
            const ifStatement = statement;
            if (ifStatement.elseStatement) {
                return isSufficientlyCoveredByReturnStatements(ifStatement.thenStatement) &&
                    isSufficientlyCoveredByReturnStatements(ifStatement.elseStatement);
            }
        }
        // A block is covered if it has a last statement which is covered.
        else if (statement.kind === SyntaxKind.Block) {
            const lastStatement = lastOrUndefined(statement.statements);
            if (lastStatement && isSufficientlyCoveredByReturnStatements(lastStatement)) {
                return true;
            }
        }
        return false;
    }
    function createActualThis() {
        return setEmitFlags(factory.createThis(), EmitFlags.NoSubstitution);
    }
    function createDefaultSuperCallOrThis() {
        return factory.createLogicalOr(factory.createLogicalAnd(factory.createStrictInequality(createSyntheticSuper(), factory.createNull()), factory.createFunctionApplyCall(createSyntheticSuper(), createActualThis(), factory.createIdentifier("arguments"))), createActualThis());
    }
    /**
     * Visits a parameter declaration.
     *
     * @param node A ParameterDeclaration node.
     */
    function visitParameter(node) {
        if (node.dotDotDotToken) {
            // rest parameters are elided
            return undefined;
        }
        else if (isBindingPattern(node.name)) {
            // Binding patterns are converted into a generated name and are
            // evaluated inside the function body.
            return setOriginalNode(setTextRange(factory.createParameterDeclaration(
            /*modifiers*/ undefined, 
            /*dotDotDotToken*/ undefined, factory.getGeneratedNameForNode(node), 
            /*questionToken*/ undefined, 
            /*type*/ undefined, 
            /*initializer*/ undefined), 
            /*location*/ node), 
            /*original*/ node);
        }
        else if (node.initializer) {
            // Initializers are elided
            return setOriginalNode(setTextRange(factory.createParameterDeclaration(
            /*modifiers*/ undefined, 
            /*dotDotDotToken*/ undefined, node.name, 
            /*questionToken*/ undefined, 
            /*type*/ undefined, 
            /*initializer*/ undefined), 
            /*location*/ node), 
            /*original*/ node);
        }
        else {
            return node;
        }
    }
    function hasDefaultValueOrBindingPattern(node) {
        return node.initializer !== undefined
            || isBindingPattern(node.name);
    }
    /**
     * Adds statements to the body of a function-like node if it contains parameters with
     * binding patterns or initializers.
     *
     * @param statements The statements for the new function body.
     * @param node A function-like node.
     */
    function addDefaultValueAssignmentsIfNeeded(statements, node) {
        if (!some(node.parameters, hasDefaultValueOrBindingPattern)) {
            return false;
        }
        let added = false;
        for (const parameter of node.parameters) {
            const { name, initializer, dotDotDotToken } = parameter;
            // A rest parameter cannot have a binding pattern or an initializer,
            // so let's just ignore it.
            if (dotDotDotToken) {
                continue;
            }
            if (isBindingPattern(name)) {
                added = insertDefaultValueAssignmentForBindingPattern(statements, parameter, name, initializer) || added;
            }
            else if (initializer) {
                insertDefaultValueAssignmentForInitializer(statements, parameter, name, initializer);
                added = true;
            }
        }
        return added;
    }
    /**
     * Adds statements to the body of a function-like node for parameters with binding patterns
     *
     * @param statements The statements for the new function body.
     * @param parameter The parameter for the function.
     * @param name The name of the parameter.
     * @param initializer The initializer for the parameter.
     */
    function insertDefaultValueAssignmentForBindingPattern(statements, parameter, name, initializer) {
        // In cases where a binding pattern is simply '[]' or '{}',
        // we usually don't want to emit a var declaration; however, in the presence
        // of an initializer, we must emit that expression to preserve side effects.
        if (name.elements.length > 0) {
            insertStatementAfterCustomPrologue(statements, setEmitFlags(factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList(flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.All, factory.getGeneratedNameForNode(parameter)))), EmitFlags.CustomPrologue));
            return true;
        }
        else if (initializer) {
            insertStatementAfterCustomPrologue(statements, setEmitFlags(factory.createExpressionStatement(factory.createAssignment(factory.getGeneratedNameForNode(parameter), Debug.checkDefined(visitNode(initializer, visitor, isExpression)))), EmitFlags.CustomPrologue));
            return true;
        }
        return false;
    }
    /**
     * Adds statements to the body of a function-like node for parameters with initializers.
     *
     * @param statements The statements for the new function body.
     * @param parameter The parameter for the function.
     * @param name The name of the parameter.
     * @param initializer The initializer for the parameter.
     */
    function insertDefaultValueAssignmentForInitializer(statements, parameter, name, initializer) {
        initializer = Debug.checkDefined(visitNode(initializer, visitor, isExpression));
        const statement = factory.createIfStatement(factory.createTypeCheck(factory.cloneNode(name), "undefined"), setEmitFlags(setTextRange(factory.createBlock([
            factory.createExpressionStatement(setEmitFlags(setTextRange(factory.createAssignment(
            // TODO(rbuckton): Does this need to be parented?
            setEmitFlags(setParent(setTextRange(factory.cloneNode(name), name), name.parent), EmitFlags.NoSourceMap), setEmitFlags(initializer, EmitFlags.NoSourceMap | getEmitFlags(initializer) | EmitFlags.NoComments)), parameter), EmitFlags.NoComments)),
        ]), parameter), EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments));
        startOnNewLine(statement);
        setTextRange(statement, parameter);
        setEmitFlags(statement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoTrailingSourceMap | EmitFlags.CustomPrologue | EmitFlags.NoComments);
        insertStatementAfterCustomPrologue(statements, statement);
    }
    /**
     * Gets a value indicating whether we need to add statements to handle a rest parameter.
     *
     * @param node A ParameterDeclaration node.
     * @param inConstructorWithSynthesizedSuper A value indicating whether the parameter is
     *                                          part of a constructor declaration with a
     *                                          synthesized call to `super`
     */
    function shouldAddRestParameter(node, inConstructorWithSynthesizedSuper) {
        return !!(node && node.dotDotDotToken && !inConstructorWithSynthesizedSuper);
    }
    /**
     * Adds statements to the body of a function-like node if it contains a rest parameter.
     *
     * @param statements The statements for the new function body.
     * @param node A function-like node.
     * @param inConstructorWithSynthesizedSuper A value indicating whether the parameter is
     *                                          part of a constructor declaration with a
     *                                          synthesized call to `super`
     */
    function addRestParameterIfNeeded(statements, node, inConstructorWithSynthesizedSuper) {
        const prologueStatements = [];
        const parameter = lastOrUndefined(node.parameters);
        if (!shouldAddRestParameter(parameter, inConstructorWithSynthesizedSuper)) {
            return false;
        }
        // `declarationName` is the name of the local declaration for the parameter.
        // TODO(rbuckton): Does this need to be parented?
        const declarationName = parameter.name.kind === SyntaxKind.Identifier ? setParent(setTextRange(factory.cloneNode(parameter.name), parameter.name), parameter.name.parent) : factory.createTempVariable(/*recordTempVariable*/ undefined);
        setEmitFlags(declarationName, EmitFlags.NoSourceMap);
        // `expressionName` is the name of the parameter used in expressions.
        const expressionName = parameter.name.kind === SyntaxKind.Identifier ? factory.cloneNode(parameter.name) : declarationName;
        const restIndex = node.parameters.length - 1;
        const temp = factory.createLoopVariable();
        // var param = [];
        prologueStatements.push(setEmitFlags(setTextRange(factory.createVariableStatement(
        /*modifiers*/ undefined, factory.createVariableDeclarationList([
            factory.createVariableDeclaration(declarationName, 
            /*exclamationToken*/ undefined, 
            /*type*/ undefined, factory.createArrayLiteralExpression([])),
        ])), 
        /*location*/ parameter), EmitFlags.CustomPrologue));
        // for (var _i = restIndex; _i < arguments.length; _i++) {
        //   param[_i - restIndex] = arguments[_i];
        // }
        const forStatement = factory.createForStatement(setTextRange(factory.createVariableDeclarationList([
            factory.createVariableDeclaration(temp, /*exclamationToken*/ undefined, /*type*/ undefined, factory.createNumericLiteral(restIndex)),
        ]), parameter), setTextRange(factory.createLessThan(temp, factory.createPropertyAccessExpression(factory.createIdentifier("arguments"), "length")), parameter), setTextRange(factory.createPostfixIncrement(temp), parameter), factory.createBlock([
            startOnNewLine(setTextRange(factory.createExpressionStatement(factory.createAssignment(factory.createElementAccessExpression(expressionName, restIndex === 0
                ? temp
                : factory.createSubtract(temp, factory.createNumericLiteral(restIndex))), factory.createElementAccessExpression(factory.createIdentifier("arguments"), temp))), 
            /*location*/ parameter)),
        ]));
        setEmitFlags(forStatement, EmitFlags.CustomPrologue);
        startOnNewLine(forStatement);
        prologueStatements.push(forStatement);
        if (parameter.name.kind !== SyntaxKind.Identifier) {
            // do the actual destructuring of the rest parameter if necessary
            prologueStatements.push(setEmitFlags(setTextRange(factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList(flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.All, expressionName))), parameter), EmitFlags.CustomPrologue));
        }
        insertStatementsAfterCustomPrologue(statements, prologueStatements);
        return true;
    }
    /**
     * Adds a statement to capture the `this` of a function declaration if it is needed.
     * NOTE: This must be executed *after* the subtree has been visited.
     *
     * @param statements The statements for the new function body.
     * @param node A node.
     */
    function insertCaptureThisForNodeIfNeeded(statements, node) {
        if (hierarchyFacts & 131072 /* HierarchyFacts.CapturedLexicalThis */ && node.kind !== SyntaxKind.ArrowFunction) {
            insertCaptureThisForNode(statements, node, factory.createThis());
            return true;
        }
        return false;
    }
    function insertCaptureThisForNode(statements, node, initializer) {
        enableSubstitutionsForCapturedThis();
        const captureThisStatement = factory.createVariableStatement(
        /*modifiers*/ undefined, factory.createVariableDeclarationList([
            factory.createVariableDeclaration(createCapturedThis(), 
            /*exclamationToken*/ undefined, 
            /*type*/ undefined, initializer),
        ]));
        setEmitFlags(captureThisStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
        setSourceMapRange(captureThisStatement, node);
        insertStatementAfterCustomPrologue(statements, captureThisStatement);
    }
    function insertCaptureNewTargetIfNeeded(statements, node) {
        if (hierarchyFacts & 32768 /* HierarchyFacts.NewTarget */) {
            let newTarget;
            switch (node.kind) {
                case SyntaxKind.ArrowFunction:
                    return statements;
                case SyntaxKind.MethodDeclaration:
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    // Methods and accessors cannot be constructors, so 'new.target' will
                    // always return 'undefined'.
                    newTarget = factory.createVoidZero();
                    break;
                case SyntaxKind.Constructor:
                    // Class constructors can only be called with `new`, so `this.constructor`
                    // should be relatively safe to use.
                    newTarget = factory.createPropertyAccessExpression(setEmitFlags(factory.createThis(), EmitFlags.NoSubstitution), "constructor");
                    break;
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.FunctionExpression:
                    // Functions can be called or constructed, and may have a `this` due to
                    // being a member or when calling an imported function via `other_1.f()`.
                    newTarget = factory.createConditionalExpression(factory.createLogicalAnd(setEmitFlags(factory.createThis(), EmitFlags.NoSubstitution), factory.createBinaryExpression(setEmitFlags(factory.createThis(), EmitFlags.NoSubstitution), SyntaxKind.InstanceOfKeyword, factory.getLocalName(node))), 
                    /*questionToken*/ undefined, factory.createPropertyAccessExpression(setEmitFlags(factory.createThis(), EmitFlags.NoSubstitution), "constructor"), 
                    /*colonToken*/ undefined, factory.createVoidZero());
                    break;
                default:
                    return Debug.failBadSyntaxKind(node);
            }
            const captureNewTargetStatement = factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([
                factory.createVariableDeclaration(factory.createUniqueName("_newTarget", GeneratedIdentifierFlags.Optimistic | GeneratedIdentifierFlags.FileLevel), 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, newTarget),
            ]));
            setEmitFlags(captureNewTargetStatement, EmitFlags.NoComments | EmitFlags.CustomPrologue);
            insertStatementAfterCustomPrologue(statements, captureNewTargetStatement);
        }
        return statements;
    }
    /**
     * Adds statements to the class body function for a class to define the members of the
     * class.
     *
     * @param statements The statements for the class body function.
     * @param node The ClassExpression or ClassDeclaration node.
     */
    function addClassMembers(statements, node) {
        for (const member of node.members) {
            switch (member.kind) {
                case SyntaxKind.SemicolonClassElement:
                    statements.push(transformSemicolonClassElementToStatement(member));
                    break;
                case SyntaxKind.MethodDeclaration:
                    statements.push(transformClassMethodDeclarationToStatement(getClassMemberPrefix(node, member), member, node));
                    break;
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    const accessors = getAllAccessorDeclarations(node.members, member);
                    if (member === accessors.firstAccessor) {
                        statements.push(transformAccessorsToStatement(getClassMemberPrefix(node, member), accessors, node));
                    }
                    break;
                case SyntaxKind.Constructor:
                case SyntaxKind.ClassStaticBlockDeclaration:
                    // Constructors are handled in visitClassExpression/visitClassDeclaration
                    break;
                default:
                    Debug.failBadSyntaxKind(member, currentSourceFile && currentSourceFile.fileName);
                    break;
            }
        }
    }
    /**
     * Transforms a SemicolonClassElement into a statement for a class body function.
     *
     * @param member The SemicolonClassElement node.
     */
    function transformSemicolonClassElementToStatement(member) {
        return setTextRange(factory.createEmptyStatement(), member);
    }
    /**
     * Transforms a MethodDeclaration into a statement for a class body function.
     *
     * @param receiver The receiver for the member.
     * @param member The MethodDeclaration node.
     */
    function transformClassMethodDeclarationToStatement(receiver, member, container) {
        const commentRange = getCommentRange(member);
        const sourceMapRange = getSourceMapRange(member);
        const memberFunction = transformFunctionLikeToExpression(member, /*location*/ member, /*name*/ undefined, container);
        const propertyName = visitNode(member.name, visitor, isPropertyName);
        Debug.assert(propertyName);
        let e;
        if (!isPrivateIdentifier(propertyName) && getUseDefineForClassFields(context.getCompilerOptions())) {
            const name = isComputedPropertyName(propertyName) ? propertyName.expression
                : isIdentifier(propertyName) ? factory.createStringLiteral(unescapeLeadingUnderscores(propertyName.escapedText))
                    : propertyName;
            e = factory.createObjectDefinePropertyCall(receiver, name, factory.createPropertyDescriptor({ value: memberFunction, enumerable: false, writable: true, configurable: true }));
        }
        else {
            const memberName = createMemberAccessForPropertyName(factory, receiver, propertyName, /*location*/ member.name);
            e = factory.createAssignment(memberName, memberFunction);
        }
        setEmitFlags(memberFunction, EmitFlags.NoComments);
        setSourceMapRange(memberFunction, sourceMapRange);
        const statement = setTextRange(factory.createExpressionStatement(e), /*location*/ member);
        setOriginalNode(statement, member);
        setCommentRange(statement, commentRange);
        // The location for the statement is used to emit comments only.
        // No source map should be emitted for this statement to align with the
        // old emitter.
        setEmitFlags(statement, EmitFlags.NoSourceMap);
        return statement;
    }
    /**
     * Transforms a set of related of get/set accessors into a statement for a class body function.
     *
     * @param receiver The receiver for the member.
     * @param accessors The set of related get/set accessors.
     */
    function transformAccessorsToStatement(receiver, accessors, container) {
        const statement = factory.createExpressionStatement(transformAccessorsToExpression(receiver, accessors, container, /*startsOnNewLine*/ false));
        // The location for the statement is used to emit source maps only.
        // No comments should be emitted for this statement to align with the
        // old emitter.
        setEmitFlags(statement, EmitFlags.NoComments);
        setSourceMapRange(statement, getSourceMapRange(accessors.firstAccessor));
        return statement;
    }
    /**
     * Transforms a set of related get/set accessors into an expression for either a class
     * body function or an ObjectLiteralExpression with computed properties.
     *
     * @param receiver The receiver for the member.
     */
    function transformAccessorsToExpression(receiver, { firstAccessor, getAccessor, setAccessor }, container, startsOnNewLine) {
        // To align with source maps in the old emitter, the receiver and property name
        // arguments are both mapped contiguously to the accessor name.
        // TODO(rbuckton): Does this need to be parented?
        const target = setParent(setTextRange(factory.cloneNode(receiver), receiver), receiver.parent);
        setEmitFlags(target, EmitFlags.NoComments | EmitFlags.NoTrailingSourceMap);
        setSourceMapRange(target, firstAccessor.name);
        const visitedAccessorName = visitNode(firstAccessor.name, visitor, isPropertyName);
        Debug.assert(visitedAccessorName);
        if (isPrivateIdentifier(visitedAccessorName)) {
            return Debug.failBadSyntaxKind(visitedAccessorName, "Encountered unhandled private identifier while transforming ES2015.");
        }
        const propertyName = createExpressionForPropertyName(factory, visitedAccessorName);
        setEmitFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoLeadingSourceMap);
        setSourceMapRange(propertyName, firstAccessor.name);
        const properties = [];
        if (getAccessor) {
            const getterFunction = transformFunctionLikeToExpression(getAccessor, /*location*/ undefined, /*name*/ undefined, container);
            setSourceMapRange(getterFunction, getSourceMapRange(getAccessor));
            setEmitFlags(getterFunction, EmitFlags.NoLeadingComments);
            const getter = factory.createPropertyAssignment("get", getterFunction);
            setCommentRange(getter, getCommentRange(getAccessor));
            properties.push(getter);
        }
        if (setAccessor) {
            const setterFunction = transformFunctionLikeToExpression(setAccessor, /*location*/ undefined, /*name*/ undefined, container);
            setSourceMapRange(setterFunction, getSourceMapRange(setAccessor));
            setEmitFlags(setterFunction, EmitFlags.NoLeadingComments);
            const setter = factory.createPropertyAssignment("set", setterFunction);
            setCommentRange(setter, getCommentRange(setAccessor));
            properties.push(setter);
        }
        properties.push(factory.createPropertyAssignment("enumerable", getAccessor || setAccessor ? factory.createFalse() : factory.createTrue()), factory.createPropertyAssignment("configurable", factory.createTrue()));
        const call = factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "defineProperty"), 
        /*typeArguments*/ undefined, [
            target,
            propertyName,
            factory.createObjectLiteralExpression(properties, /*multiLine*/ true),
        ]);
        if (startsOnNewLine) {
            startOnNewLine(call);
        }
        return call;
    }
    /**
     * Visits an ArrowFunction and transforms it into a FunctionExpression.
     *
     * @param node An ArrowFunction node.
     */
    function visitArrowFunction(node) {
        if (node.transformFlags & TransformFlags.ContainsLexicalThis && !(hierarchyFacts & 16384 /* HierarchyFacts.StaticInitializer */)) {
            hierarchyFacts |= 131072 /* HierarchyFacts.CapturedLexicalThis */;
        }
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const ancestorFacts = enterSubtree(15232 /* HierarchyFacts.ArrowFunctionExcludes */, 66 /* HierarchyFacts.ArrowFunctionIncludes */);
        const func = factory.createFunctionExpression(
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, 
        /*name*/ undefined, 
        /*typeParameters*/ undefined, visitParameterList(node.parameters, visitor, context), 
        /*type*/ undefined, transformFunctionBody(node));
        setTextRange(func, node);
        setOriginalNode(func, node);
        setEmitFlags(func, EmitFlags.CapturesThis);
        // If an arrow function contains
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.ArrowFunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
        convertedLoopState = savedConvertedLoopState;
        return func;
    }
    /**
     * Visits a FunctionExpression node.
     *
     * @param node a FunctionExpression node.
     */
    function visitFunctionExpression(node) {
        const ancestorFacts = getEmitFlags(node) & EmitFlags.AsyncFunctionBody
            ? enterSubtree(32662 /* HierarchyFacts.AsyncFunctionBodyExcludes */, 69 /* HierarchyFacts.AsyncFunctionBodyIncludes */)
            : enterSubtree(32670 /* HierarchyFacts.FunctionExcludes */, 65 /* HierarchyFacts.FunctionIncludes */);
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const parameters = visitParameterList(node.parameters, visitor, context);
        const body = transformFunctionBody(node);
        const name = hierarchyFacts & 32768 /* HierarchyFacts.NewTarget */
            ? factory.getLocalName(node)
            : node.name;
        exitSubtree(ancestorFacts, 229376 /* HierarchyFacts.FunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
        convertedLoopState = savedConvertedLoopState;
        return factory.updateFunctionExpression(node, 
        /*modifiers*/ undefined, node.asteriskToken, name, 
        /*typeParameters*/ undefined, parameters, 
        /*type*/ undefined, body);
    }
    /**
     * Visits a FunctionDeclaration node.
     *
     * @param node a FunctionDeclaration node.
     */
    function visitFunctionDeclaration(node) {
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const ancestorFacts = enterSubtree(32670 /* HierarchyFacts.FunctionExcludes */, 65 /* HierarchyFacts.FunctionIncludes */);
        const parameters = visitParameterList(node.parameters, visitor, context);
        const body = transformFunctionBody(node);
        const name = hierarchyFacts & 32768 /* HierarchyFacts.NewTarget */
            ? factory.getLocalName(node)
            : node.name;
        exitSubtree(ancestorFacts, 229376 /* HierarchyFacts.FunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
        convertedLoopState = savedConvertedLoopState;
        return factory.updateFunctionDeclaration(node, visitNodes(node.modifiers, visitor, isModifier), node.asteriskToken, name, 
        /*typeParameters*/ undefined, parameters, 
        /*type*/ undefined, body);
    }
    /**
     * Transforms a function-like node into a FunctionExpression.
     *
     * @param node The function-like node to transform.
     * @param location The source-map location for the new FunctionExpression.
     * @param name The name of the new FunctionExpression.
     */
    function transformFunctionLikeToExpression(node, location, name, container) {
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const ancestorFacts = container && isClassLike(container) && !isStatic(node)
            ? enterSubtree(32670 /* HierarchyFacts.FunctionExcludes */, 65 /* HierarchyFacts.FunctionIncludes */ | 8 /* HierarchyFacts.NonStaticClassElement */)
            : enterSubtree(32670 /* HierarchyFacts.FunctionExcludes */, 65 /* HierarchyFacts.FunctionIncludes */);
        const parameters = visitParameterList(node.parameters, visitor, context);
        const body = transformFunctionBody(node);
        if (hierarchyFacts & 32768 /* HierarchyFacts.NewTarget */ && !name && (node.kind === SyntaxKind.FunctionDeclaration || node.kind === SyntaxKind.FunctionExpression)) {
            name = factory.getGeneratedNameForNode(node);
        }
        exitSubtree(ancestorFacts, 229376 /* HierarchyFacts.FunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
        convertedLoopState = savedConvertedLoopState;
        return setOriginalNode(setTextRange(factory.createFunctionExpression(
        /*modifiers*/ undefined, node.asteriskToken, name, 
        /*typeParameters*/ undefined, parameters, 
        /*type*/ undefined, body), location), 
        /*original*/ node);
    }
    /**
     * Transforms the body of a function-like node.
     *
     * @param node A function-like node.
     */
    function transformFunctionBody(node) {
        let multiLine = false; // indicates whether the block *must* be emitted as multiple lines
        let singleLine = false; // indicates whether the block *may* be emitted as a single line
        let statementsLocation;
        let closeBraceLocation;
        const prologue = [];
        const statements = [];
        const body = node.body;
        let statementOffset;
        resumeLexicalEnvironment();
        if (isBlock(body)) {
            // ensureUseStrict is false because no new prologue-directive should be added.
            // addStandardPrologue will put already-existing directives at the beginning of the target statement-array
            statementOffset = factory.copyStandardPrologue(body.statements, prologue, 0, /*ensureUseStrict*/ false);
            statementOffset = factory.copyCustomPrologue(body.statements, statements, statementOffset, visitor, isHoistedFunction);
            statementOffset = factory.copyCustomPrologue(body.statements, statements, statementOffset, visitor, isHoistedVariableStatement);
        }
        multiLine = addDefaultValueAssignmentsIfNeeded(statements, node) || multiLine;
        multiLine = addRestParameterIfNeeded(statements, node, /*inConstructorWithSynthesizedSuper*/ false) || multiLine;
        if (isBlock(body)) {
            // addCustomPrologue puts already-existing directives at the beginning of the target statement-array
            statementOffset = factory.copyCustomPrologue(body.statements, statements, statementOffset, visitor);
            statementsLocation = body.statements;
            addRange(statements, visitNodes(body.statements, visitor, isStatement, statementOffset));
            // If the original body was a multi-line block, this must be a multi-line block.
            if (!multiLine && body.multiLine) {
                multiLine = true;
            }
        }
        else {
            Debug.assert(node.kind === SyntaxKind.ArrowFunction);
            // To align with the old emitter, we use a synthetic end position on the location
            // for the statement list we synthesize when we down-level an arrow function with
            // an expression function body. This prevents both comments and source maps from
            // being emitted for the end position only.
            statementsLocation = moveRangeEnd(body, -1);
            const equalsGreaterThanToken = node.equalsGreaterThanToken;
            if (!nodeIsSynthesized(equalsGreaterThanToken) && !nodeIsSynthesized(body)) {
                if (rangeEndIsOnSameLineAsRangeStart(equalsGreaterThanToken, body, currentSourceFile)) {
                    singleLine = true;
                }
                else {
                    multiLine = true;
                }
            }
            const expression = visitNode(body, visitor, isExpression);
            const returnStatement = factory.createReturnStatement(expression);
            setTextRange(returnStatement, body);
            moveSyntheticComments(returnStatement, body);
            setEmitFlags(returnStatement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTrailingComments);
            statements.push(returnStatement);
            // To align with the source map emit for the old emitter, we set a custom
            // source map location for the close brace.
            closeBraceLocation = body;
        }
        factory.mergeLexicalEnvironment(prologue, endLexicalEnvironment());
        insertCaptureNewTargetIfNeeded(prologue, node);
        insertCaptureThisForNodeIfNeeded(prologue, node);
        // If we added any final generated statements, this must be a multi-line block
        if (some(prologue)) {
            multiLine = true;
        }
        statements.unshift(...prologue);
        if (isBlock(body) && arrayIsEqualTo(statements, body.statements)) {
            // no changes were made, preserve the tree
            return body;
        }
        const block = factory.createBlock(setTextRange(factory.createNodeArray(statements), statementsLocation), multiLine);
        setTextRange(block, node.body);
        if (!multiLine && singleLine) {
            setEmitFlags(block, EmitFlags.SingleLine);
        }
        if (closeBraceLocation) {
            setTokenSourceMapRange(block, SyntaxKind.CloseBraceToken, closeBraceLocation);
        }
        setOriginalNode(block, node.body);
        return block;
    }
    function visitBlock(node, isFunctionBody) {
        if (isFunctionBody) {
            // A function body is not a block scope.
            return visitEachChild(node, visitor, context);
        }
        const ancestorFacts = hierarchyFacts & 256 /* HierarchyFacts.IterationStatement */
            ? enterSubtree(7104 /* HierarchyFacts.IterationStatementBlockExcludes */, 512 /* HierarchyFacts.IterationStatementBlockIncludes */)
            : enterSubtree(6976 /* HierarchyFacts.BlockExcludes */, 128 /* HierarchyFacts.BlockIncludes */);
        const updated = visitEachChild(node, visitor, context);
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return updated;
    }
    /**
     * Visits an ExpressionStatement that contains a destructuring assignment.
     *
     * @param node An ExpressionStatement node.
     */
    function visitExpressionStatement(node) {
        return visitEachChild(node, visitorWithUnusedExpressionResult, context);
    }
    /**
     * Visits a ParenthesizedExpression that may contain a destructuring assignment.
     *
     * @param node A ParenthesizedExpression node.
     * @param expressionResultIsUnused Indicates the result of an expression is unused by the parent node (i.e., the left side of a comma or the
     * expression of an `ExpressionStatement`).
     */
    function visitParenthesizedExpression(node, expressionResultIsUnused) {
        return visitEachChild(node, expressionResultIsUnused ? visitorWithUnusedExpressionResult : visitor, context);
    }
    /**
     * Visits a BinaryExpression that contains a destructuring assignment.
     *
     * @param node A BinaryExpression node.
     * @param expressionResultIsUnused Indicates the result of an expression is unused by the parent node (i.e., the left side of a comma or the
     * expression of an `ExpressionStatement`).
     */
    function visitBinaryExpression(node, expressionResultIsUnused) {
        // If we are here it is because this is a destructuring assignment.
        if (isDestructuringAssignment(node)) {
            return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, !expressionResultIsUnused);
        }
        if (node.operatorToken.kind === SyntaxKind.CommaToken) {
            return factory.updateBinaryExpression(node, Debug.checkDefined(visitNode(node.left, visitorWithUnusedExpressionResult, isExpression)), node.operatorToken, Debug.checkDefined(visitNode(node.right, expressionResultIsUnused ? visitorWithUnusedExpressionResult : visitor, isExpression)));
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * @param expressionResultIsUnused Indicates the result of an expression is unused by the parent node (i.e., the left side of a comma or the
     * expression of an `ExpressionStatement`).
     */
    function visitCommaListExpression(node, expressionResultIsUnused) {
        if (expressionResultIsUnused) {
            return visitEachChild(node, visitorWithUnusedExpressionResult, context);
        }
        let result;
        for (let i = 0; i < node.elements.length; i++) {
            const element = node.elements[i];
            const visited = visitNode(element, i < node.elements.length - 1 ? visitorWithUnusedExpressionResult : visitor, isExpression);
            if (result || visited !== element) {
                result || (result = node.elements.slice(0, i));
                Debug.assert(visited);
                result.push(visited);
            }
        }
        const elements = result ? setTextRange(factory.createNodeArray(result), node.elements) : node.elements;
        return factory.updateCommaListExpression(node, elements);
    }
    function isVariableStatementOfTypeScriptClassWrapper(node) {
        return node.declarationList.declarations.length === 1
            && !!node.declarationList.declarations[0].initializer
            && !!(getInternalEmitFlags(node.declarationList.declarations[0].initializer) & InternalEmitFlags.TypeScriptClassWrapper);
    }
    function visitVariableStatement(node) {
        const ancestorFacts = enterSubtree(0 /* HierarchyFacts.None */, hasSyntacticModifier(node, ModifierFlags.Export) ? 32 /* HierarchyFacts.ExportedVariableStatement */ : 0 /* HierarchyFacts.None */);
        let updated;
        if (convertedLoopState && (node.declarationList.flags & NodeFlags.BlockScoped) === 0 && !isVariableStatementOfTypeScriptClassWrapper(node)) {
            // we are inside a converted loop - hoist variable declarations
            let assignments;
            for (const decl of node.declarationList.declarations) {
                hoistVariableDeclarationDeclaredInConvertedLoop(convertedLoopState, decl);
                if (decl.initializer) {
                    let assignment;
                    if (isBindingPattern(decl.name)) {
                        assignment = flattenDestructuringAssignment(decl, visitor, context, FlattenLevel.All);
                    }
                    else {
                        assignment = factory.createBinaryExpression(decl.name, SyntaxKind.EqualsToken, Debug.checkDefined(visitNode(decl.initializer, visitor, isExpression)));
                        setTextRange(assignment, decl);
                    }
                    assignments = append(assignments, assignment);
                }
            }
            if (assignments) {
                updated = setTextRange(factory.createExpressionStatement(factory.inlineExpressions(assignments)), node);
            }
            else {
                // none of declarations has initializer - the entire variable statement can be deleted
                updated = undefined;
            }
        }
        else {
            updated = visitEachChild(node, visitor, context);
        }
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return updated;
    }
    /**
     * Visits a VariableDeclarationList that is block scoped (e.g. `let` or `const`).
     *
     * @param node A VariableDeclarationList node.
     */
    function visitVariableDeclarationList(node) {
        if (node.flags & NodeFlags.BlockScoped || node.transformFlags & TransformFlags.ContainsBindingPattern) {
            if (node.flags & NodeFlags.BlockScoped) {
                enableSubstitutionsForBlockScopedBindings();
            }
            const declarations = visitNodes(node.declarations, node.flags & NodeFlags.Let
                ? visitVariableDeclarationInLetDeclarationList
                : visitVariableDeclaration, isVariableDeclaration);
            const declarationList = factory.createVariableDeclarationList(declarations);
            setOriginalNode(declarationList, node);
            setTextRange(declarationList, node);
            setCommentRange(declarationList, node);
            // If the first or last declaration is a binding pattern, we need to modify
            // the source map range for the declaration list.
            if (node.transformFlags & TransformFlags.ContainsBindingPattern
                && (isBindingPattern(node.declarations[0].name) || isBindingPattern(last(node.declarations).name))) {
                setSourceMapRange(declarationList, getRangeUnion(declarations));
            }
            return declarationList;
        }
        return visitEachChild(node, visitor, context);
    }
    function getRangeUnion(declarations) {
        // declarations may not be sorted by position.
        // pos should be the minimum* position over all nodes (that's not -1), end should be the maximum end over all nodes.
        let pos = -1, end = -1;
        for (const node of declarations) {
            pos = pos === -1 ? node.pos : node.pos === -1 ? pos : Math.min(pos, node.pos);
            end = Math.max(end, node.end);
        }
        return createRange(pos, end);
    }
    /**
     * Gets a value indicating whether we should emit an explicit initializer for a variable
     * declaration in a `let` declaration list.
     *
     * @param node A VariableDeclaration node.
     */
    function shouldEmitExplicitInitializerForLetDeclaration(node) {
        // Nested let bindings might need to be initialized explicitly to preserve
        // ES6 semantic:
        //
        //  { let x = 1; }
        //  { let x; } // x here should be undefined. not 1
        //
        // Top level bindings never collide with anything and thus don't require
        // explicit initialization. As for nested let bindings there are two cases:
        //
        // - Nested let bindings that were not renamed definitely should be
        //   initialized explicitly:
        //
        //    { let x = 1; }
        //    { let x; if (some-condition) { x = 1}; if (x) { /*1*/ } }
        //
        //   Without explicit initialization code in /*1*/ can be executed even if
        //   some-condition is evaluated to false.
        //
        // - Renaming introduces fresh name that should not collide with any
        //   existing names, however renamed bindings sometimes also should be
        //   explicitly initialized. One particular case: non-captured binding
        //   declared inside loop body (but not in loop initializer):
        //
        //    let x;
        //    for (;;) {
        //        let x;
        //    }
        //
        //   In downlevel codegen inner 'x' will be renamed so it won't collide
        //   with outer 'x' however it will should be reset on every iteration as
        //   if it was declared anew.
        //
        //   * Why non-captured binding?
        //     - Because if loop contains block scoped binding captured in some
        //       function then loop body will be rewritten to have a fresh scope
        //       on every iteration so everything will just work.
        //
        //   * Why loop initializer is excluded?
        //     - Since we've introduced a fresh name it already will be undefined.
        const isCapturedInFunction = resolver.hasNodeCheckFlag(node, NodeCheckFlags.CapturedBlockScopedBinding);
        const isDeclaredInLoop = resolver.hasNodeCheckFlag(node, NodeCheckFlags.BlockScopedBindingInLoop);
        const emittedAsTopLevel = (hierarchyFacts & 64 /* HierarchyFacts.TopLevel */) !== 0
            || (isCapturedInFunction
                && isDeclaredInLoop
                && (hierarchyFacts & 512 /* HierarchyFacts.IterationStatementBlock */) !== 0);
        const emitExplicitInitializer = !emittedAsTopLevel
            && (hierarchyFacts & 4096 /* HierarchyFacts.ForInOrForOfStatement */) === 0
            && (!resolver.isDeclarationWithCollidingName(node)
                || (isDeclaredInLoop
                    && !isCapturedInFunction
                    && (hierarchyFacts & (2048 /* HierarchyFacts.ForStatement */ | 4096 /* HierarchyFacts.ForInOrForOfStatement */)) === 0));
        return emitExplicitInitializer;
    }
    /**
     * Visits a VariableDeclaration in a `let` declaration list.
     *
     * @param node A VariableDeclaration node.
     */
    function visitVariableDeclarationInLetDeclarationList(node) {
        // For binding pattern names that lack initializers there is no point to emit
        // explicit initializer since downlevel codegen for destructuring will fail
        // in the absence of initializer so all binding elements will say uninitialized
        const name = node.name;
        if (isBindingPattern(name)) {
            return visitVariableDeclaration(node);
        }
        if (!node.initializer && shouldEmitExplicitInitializerForLetDeclaration(node)) {
            return factory.updateVariableDeclaration(node, node.name, /*exclamationToken*/ undefined, /*type*/ undefined, factory.createVoidZero());
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a VariableDeclaration node with a binding pattern.
     *
     * @param node A VariableDeclaration node.
     */
    function visitVariableDeclaration(node) {
        const ancestorFacts = enterSubtree(32 /* HierarchyFacts.ExportedVariableStatement */, 0 /* HierarchyFacts.None */);
        let updated;
        if (isBindingPattern(node.name)) {
            updated = flattenDestructuringBinding(node, visitor, context, FlattenLevel.All, 
            /*rval*/ undefined, (ancestorFacts & 32 /* HierarchyFacts.ExportedVariableStatement */) !== 0);
        }
        else {
            updated = visitEachChild(node, visitor, context);
        }
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return updated;
    }
    function recordLabel(node) {
        convertedLoopState.labels.set(idText(node.label), true);
    }
    function resetLabel(node) {
        convertedLoopState.labels.set(idText(node.label), false);
    }
    function visitLabeledStatement(node) {
        var _a;
        if (convertedLoopState && !convertedLoopState.labels) {
            convertedLoopState.labels = new Map();
        }
        const statement = unwrapInnermostStatementOfLabel(node, convertedLoopState && recordLabel);
        return isIterationStatement(statement, /*lookInLabeledStatements*/ false)
            ? visitIterationStatement(statement, /*outermostLabeledStatement*/ node)
            : factory.restoreEnclosingLabel((_a = visitNode(statement, visitor, isStatement, factory.liftToBlock)) !== null && _a !== void 0 ? _a : setTextRange(factory.createEmptyStatement(), statement), node, convertedLoopState && resetLabel);
    }
    function visitIterationStatement(node, outermostLabeledStatement) {
        switch (node.kind) {
            case SyntaxKind.DoStatement:
            case SyntaxKind.WhileStatement:
                return visitDoOrWhileStatement(node, outermostLabeledStatement);
            case SyntaxKind.ForStatement:
                return visitForStatement(node, outermostLabeledStatement);
            case SyntaxKind.ForInStatement:
                return visitForInStatement(node, outermostLabeledStatement);
            case SyntaxKind.ForOfStatement:
                return visitForOfStatement(node, outermostLabeledStatement);
        }
    }
    function visitIterationStatementWithFacts(excludeFacts, includeFacts, node, outermostLabeledStatement, convert) {
        const ancestorFacts = enterSubtree(excludeFacts, includeFacts);
        const updated = convertIterationStatementBodyIfNecessary(node, outermostLabeledStatement, ancestorFacts, convert);
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return updated;
    }
    function visitDoOrWhileStatement(node, outermostLabeledStatement) {
        return visitIterationStatementWithFacts(0 /* HierarchyFacts.DoOrWhileStatementExcludes */, 1280 /* HierarchyFacts.DoOrWhileStatementIncludes */, node, outermostLabeledStatement);
    }
    function visitForStatement(node, outermostLabeledStatement) {
        return visitIterationStatementWithFacts(5056 /* HierarchyFacts.ForStatementExcludes */, 3328 /* HierarchyFacts.ForStatementIncludes */, node, outermostLabeledStatement);
    }
    function visitEachChildOfForStatement(node) {
        return factory.updateForStatement(node, visitNode(node.initializer, visitorWithUnusedExpressionResult, isForInitializer), visitNode(node.condition, visitor, isExpression), visitNode(node.incrementor, visitorWithUnusedExpressionResult, isExpression), Debug.checkDefined(visitNode(node.statement, visitor, isStatement, factory.liftToBlock)));
    }
    function visitForInStatement(node, outermostLabeledStatement) {
        return visitIterationStatementWithFacts(3008 /* HierarchyFacts.ForInOrForOfStatementExcludes */, 5376 /* HierarchyFacts.ForInOrForOfStatementIncludes */, node, outermostLabeledStatement);
    }
    function visitForOfStatement(node, outermostLabeledStatement) {
        return visitIterationStatementWithFacts(3008 /* HierarchyFacts.ForInOrForOfStatementExcludes */, 5376 /* HierarchyFacts.ForInOrForOfStatementIncludes */, node, outermostLabeledStatement, compilerOptions.downlevelIteration ? convertForOfStatementForIterable : convertForOfStatementForArray);
    }
    function convertForOfStatementHead(node, boundValue, convertedLoopBodyStatements) {
        const statements = [];
        const initializer = node.initializer;
        if (isVariableDeclarationList(initializer)) {
            if (node.initializer.flags & NodeFlags.BlockScoped) {
                enableSubstitutionsForBlockScopedBindings();
            }
            const firstOriginalDeclaration = firstOrUndefined(initializer.declarations);
            if (firstOriginalDeclaration && isBindingPattern(firstOriginalDeclaration.name)) {
                // This works whether the declaration is a var, let, or const.
                // It will use rhsIterationValue _a[_i] as the initializer.
                const declarations = flattenDestructuringBinding(firstOriginalDeclaration, visitor, context, FlattenLevel.All, boundValue);
                const declarationList = setTextRange(factory.createVariableDeclarationList(declarations), node.initializer);
                setOriginalNode(declarationList, node.initializer);
                // Adjust the source map range for the first declaration to align with the old
                // emitter.
                setSourceMapRange(declarationList, createRange(declarations[0].pos, last(declarations).end));
                statements.push(factory.createVariableStatement(
                /*modifiers*/ undefined, declarationList));
            }
            else {
                // The following call does not include the initializer, so we have
                // to emit it separately.
                statements.push(setTextRange(factory.createVariableStatement(
                /*modifiers*/ undefined, setOriginalNode(setTextRange(factory.createVariableDeclarationList([
                    factory.createVariableDeclaration(firstOriginalDeclaration ? firstOriginalDeclaration.name : factory.createTempVariable(/*recordTempVariable*/ undefined), 
                    /*exclamationToken*/ undefined, 
                    /*type*/ undefined, boundValue),
                ]), moveRangePos(initializer, -1)), initializer)), moveRangeEnd(initializer, -1)));
            }
        }
        else {
            // Initializer is an expression. Emit the expression in the body, so that it's
            // evaluated on every iteration.
            const assignment = factory.createAssignment(initializer, boundValue);
            if (isDestructuringAssignment(assignment)) {
                statements.push(factory.createExpressionStatement(visitBinaryExpression(assignment, /*expressionResultIsUnused*/ true)));
            }
            else {
                setTextRangeEnd(assignment, initializer.end);
                statements.push(setTextRange(factory.createExpressionStatement(Debug.checkDefined(visitNode(assignment, visitor, isExpression))), moveRangeEnd(initializer, -1)));
            }
        }
        if (convertedLoopBodyStatements) {
            return createSyntheticBlockForConvertedStatements(addRange(statements, convertedLoopBodyStatements));
        }
        else {
            const statement = visitNode(node.statement, visitor, isStatement, factory.liftToBlock);
            Debug.assert(statement);
            if (isBlock(statement)) {
                return factory.updateBlock(statement, setTextRange(factory.createNodeArray(concatenate(statements, statement.statements)), statement.statements));
            }
            else {
                statements.push(statement);
                return createSyntheticBlockForConvertedStatements(statements);
            }
        }
    }
    function createSyntheticBlockForConvertedStatements(statements) {
        return setEmitFlags(factory.createBlock(factory.createNodeArray(statements), 
        /*multiLine*/ true), EmitFlags.NoSourceMap | EmitFlags.NoTokenSourceMaps);
    }
    function convertForOfStatementForArray(node, outermostLabeledStatement, convertedLoopBodyStatements) {
        // The following ES6 code:
        //
        //    for (let v of expr) { }
        //
        // should be emitted as
        //
        //    for (var _i = 0, _a = expr; _i < _a.length; _i++) {
        //        var v = _a[_i];
        //    }
        //
        // where _a and _i are temps emitted to capture the RHS and the counter,
        // respectively.
        // When the left hand side is an expression instead of a let declaration,
        // the "let v" is not emitted.
        // When the left hand side is a let/const, the v is renamed if there is
        // another v in scope.
        // Note that all assignments to the LHS are emitted in the body, including
        // all destructuring.
        // Note also that because an extra statement is needed to assign to the LHS,
        // for-of bodies are always emitted as blocks.
        const expression = visitNode(node.expression, visitor, isExpression);
        Debug.assert(expression);
        // In the case where the user wrote an identifier as the RHS, like this:
        //
        //     for (let v of arr) { }
        //
        // we don't want to emit a temporary variable for the RHS, just use it directly.
        const counter = factory.createLoopVariable();
        const rhsReference = isIdentifier(expression) ? factory.getGeneratedNameForNode(expression) : factory.createTempVariable(/*recordTempVariable*/ undefined);
        // The old emitter does not emit source maps for the expression
        setEmitFlags(expression, EmitFlags.NoSourceMap | getEmitFlags(expression));
        const forStatement = setTextRange(factory.createForStatement(
        /*initializer*/ setEmitFlags(setTextRange(factory.createVariableDeclarationList([
            setTextRange(factory.createVariableDeclaration(counter, /*exclamationToken*/ undefined, /*type*/ undefined, factory.createNumericLiteral(0)), moveRangePos(node.expression, -1)),
            setTextRange(factory.createVariableDeclaration(rhsReference, /*exclamationToken*/ undefined, /*type*/ undefined, expression), node.expression),
        ]), node.expression), EmitFlags.NoHoisting), 
        /*condition*/ setTextRange(factory.createLessThan(counter, factory.createPropertyAccessExpression(rhsReference, "length")), node.expression), 
        /*incrementor*/ setTextRange(factory.createPostfixIncrement(counter), node.expression), 
        /*statement*/ convertForOfStatementHead(node, factory.createElementAccessExpression(rhsReference, counter), convertedLoopBodyStatements)), 
        /*location*/ node);
        // Disable trailing source maps for the OpenParenToken to align source map emit with the old emitter.
        setEmitFlags(forStatement, EmitFlags.NoTokenTrailingSourceMaps);
        setTextRange(forStatement, node);
        return factory.restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel);
    }
    function convertForOfStatementForIterable(node, outermostLabeledStatement, convertedLoopBodyStatements, ancestorFacts) {
        const expression = visitNode(node.expression, visitor, isExpression);
        Debug.assert(expression);
        const iterator = isIdentifier(expression) ? factory.getGeneratedNameForNode(expression) : factory.createTempVariable(/*recordTempVariable*/ undefined);
        const result = isIdentifier(expression) ? factory.getGeneratedNameForNode(iterator) : factory.createTempVariable(/*recordTempVariable*/ undefined);
        const errorRecord = factory.createUniqueName("e");
        const catchVariable = factory.getGeneratedNameForNode(errorRecord);
        const returnMethod = factory.createTempVariable(/*recordTempVariable*/ undefined);
        const values = setTextRange(emitHelpers().createValuesHelper(expression), node.expression);
        const next = factory.createCallExpression(factory.createPropertyAccessExpression(iterator, "next"), /*typeArguments*/ undefined, []);
        hoistVariableDeclaration(errorRecord);
        hoistVariableDeclaration(returnMethod);
        // if we are enclosed in an outer loop ensure we reset 'errorRecord' per each iteration
        const initializer = ancestorFacts & 1024 /* HierarchyFacts.IterationContainer */
            ? factory.inlineExpressions([factory.createAssignment(errorRecord, factory.createVoidZero()), values])
            : values;
        const forStatement = setEmitFlags(setTextRange(factory.createForStatement(
        /*initializer*/ setEmitFlags(setTextRange(factory.createVariableDeclarationList([
            setTextRange(factory.createVariableDeclaration(iterator, /*exclamationToken*/ undefined, /*type*/ undefined, initializer), node.expression),
            factory.createVariableDeclaration(result, /*exclamationToken*/ undefined, /*type*/ undefined, next),
        ]), node.expression), EmitFlags.NoHoisting), 
        /*condition*/ factory.createLogicalNot(factory.createPropertyAccessExpression(result, "done")), 
        /*incrementor*/ factory.createAssignment(result, next), 
        /*statement*/ convertForOfStatementHead(node, factory.createPropertyAccessExpression(result, "value"), convertedLoopBodyStatements)), 
        /*location*/ node), EmitFlags.NoTokenTrailingSourceMaps);
        return factory.createTryStatement(factory.createBlock([
            factory.restoreEnclosingLabel(forStatement, outermostLabeledStatement, convertedLoopState && resetLabel),
        ]), factory.createCatchClause(factory.createVariableDeclaration(catchVariable), setEmitFlags(factory.createBlock([
            factory.createExpressionStatement(factory.createAssignment(errorRecord, factory.createObjectLiteralExpression([
                factory.createPropertyAssignment("error", catchVariable),
            ]))),
        ]), EmitFlags.SingleLine)), factory.createBlock([
            factory.createTryStatement(
            /*tryBlock*/ factory.createBlock([
                setEmitFlags(factory.createIfStatement(factory.createLogicalAnd(factory.createLogicalAnd(result, factory.createLogicalNot(factory.createPropertyAccessExpression(result, "done"))), factory.createAssignment(returnMethod, factory.createPropertyAccessExpression(iterator, "return"))), factory.createExpressionStatement(factory.createFunctionCallCall(returnMethod, iterator, []))), EmitFlags.SingleLine),
            ]), 
            /*catchClause*/ undefined, 
            /*finallyBlock*/ setEmitFlags(factory.createBlock([
                setEmitFlags(factory.createIfStatement(errorRecord, factory.createThrowStatement(factory.createPropertyAccessExpression(errorRecord, "error"))), EmitFlags.SingleLine),
            ]), EmitFlags.SingleLine)),
        ]));
    }
    /**
     * Visits an ObjectLiteralExpression with computed property names.
     *
     * @param node An ObjectLiteralExpression node.
     */
    function visitObjectLiteralExpression(node) {
        const properties = node.properties;
        // Find the first computed property.
        // Everything until that point can be emitted as part of the initial object literal.
        let numInitialProperties = -1, hasComputed = false;
        for (let i = 0; i < properties.length; i++) {
            const property = properties[i];
            if ((property.transformFlags & TransformFlags.ContainsYield &&
                hierarchyFacts & 4 /* HierarchyFacts.AsyncFunctionBody */)
                || (hasComputed = Debug.checkDefined(property.name).kind === SyntaxKind.ComputedPropertyName)) {
                numInitialProperties = i;
                break;
            }
        }
        if (numInitialProperties < 0) {
            return visitEachChild(node, visitor, context);
        }
        // For computed properties, we need to create a unique handle to the object
        // literal so we can modify it without risking internal assignments tainting the object.
        const temp = factory.createTempVariable(hoistVariableDeclaration);
        // Write out the first non-computed properties, then emit the rest through indexing on the temp variable.
        const expressions = [];
        const assignment = factory.createAssignment(temp, setEmitFlags(factory.createObjectLiteralExpression(visitNodes(properties, visitor, isObjectLiteralElementLike, 0, numInitialProperties), node.multiLine), hasComputed ? EmitFlags.Indented : 0));
        if (node.multiLine) {
            startOnNewLine(assignment);
        }
        expressions.push(assignment);
        addObjectLiteralMembers(expressions, node, temp, numInitialProperties);
        // We need to clone the temporary identifier so that we can write it on a
        // new line
        expressions.push(node.multiLine ? startOnNewLine(setParent(setTextRange(factory.cloneNode(temp), temp), temp.parent)) : temp);
        return factory.inlineExpressions(expressions);
    }
    function shouldConvertPartOfIterationStatement(node) {
        return resolver.hasNodeCheckFlag(node, NodeCheckFlags.ContainsCapturedBlockScopeBinding);
    }
    function shouldConvertInitializerOfForStatement(node) {
        return isForStatement(node) && !!node.initializer && shouldConvertPartOfIterationStatement(node.initializer);
    }
    function shouldConvertConditionOfForStatement(node) {
        return isForStatement(node) && !!node.condition && shouldConvertPartOfIterationStatement(node.condition);
    }
    function shouldConvertIncrementorOfForStatement(node) {
        return isForStatement(node) && !!node.incrementor && shouldConvertPartOfIterationStatement(node.incrementor);
    }
    function shouldConvertIterationStatement(node) {
        return shouldConvertBodyOfIterationStatement(node)
            || shouldConvertInitializerOfForStatement(node);
    }
    function shouldConvertBodyOfIterationStatement(node) {
        return resolver.hasNodeCheckFlag(node, NodeCheckFlags.LoopWithCapturedBlockScopedBinding);
    }
    /**
     * Records constituents of name for the given variable to be hoisted in the outer scope.
     */
    function hoistVariableDeclarationDeclaredInConvertedLoop(state, node) {
        if (!state.hoistedLocalVariables) {
            state.hoistedLocalVariables = [];
        }
        visit(node.name);
        function visit(node) {
            if (node.kind === SyntaxKind.Identifier) {
                state.hoistedLocalVariables.push(node);
            }
            else {
                for (const element of node.elements) {
                    if (!isOmittedExpression(element)) {
                        visit(element.name);
                    }
                }
            }
        }
    }
    function convertIterationStatementBodyIfNecessary(node, outermostLabeledStatement, ancestorFacts, convert) {
        if (!shouldConvertIterationStatement(node)) {
            let saveAllowedNonLabeledJumps;
            if (convertedLoopState) {
                // we get here if we are trying to emit normal loop loop inside converted loop
                // set allowedNonLabeledJumps to Break | Continue to mark that break\continue inside the loop should be emitted as is
                saveAllowedNonLabeledJumps = convertedLoopState.allowedNonLabeledJumps;
                convertedLoopState.allowedNonLabeledJumps = 2 /* Jump.Break */ | 4 /* Jump.Continue */;
            }
            const result = convert
                ? convert(node, outermostLabeledStatement, /*convertedLoopBodyStatements*/ undefined, ancestorFacts)
                : factory.restoreEnclosingLabel(isForStatement(node) ? visitEachChildOfForStatement(node) : visitEachChild(node, visitor, context), outermostLabeledStatement, convertedLoopState && resetLabel);
            if (convertedLoopState) {
                convertedLoopState.allowedNonLabeledJumps = saveAllowedNonLabeledJumps;
            }
            return result;
        }
        const currentState = createConvertedLoopState(node);
        const statements = [];
        const outerConvertedLoopState = convertedLoopState;
        convertedLoopState = currentState;
        const initializerFunction = shouldConvertInitializerOfForStatement(node) ? createFunctionForInitializerOfForStatement(node, currentState) : undefined;
        const bodyFunction = shouldConvertBodyOfIterationStatement(node) ? createFunctionForBodyOfIterationStatement(node, currentState, outerConvertedLoopState) : undefined;
        convertedLoopState = outerConvertedLoopState;
        if (initializerFunction)
            statements.push(initializerFunction.functionDeclaration);
        if (bodyFunction)
            statements.push(bodyFunction.functionDeclaration);
        addExtraDeclarationsForConvertedLoop(statements, currentState, outerConvertedLoopState);
        if (initializerFunction) {
            statements.push(generateCallToConvertedLoopInitializer(initializerFunction.functionName, initializerFunction.containsYield));
        }
        let loop;
        if (bodyFunction) {
            if (convert) {
                loop = convert(node, outermostLabeledStatement, bodyFunction.part, ancestorFacts);
            }
            else {
                const clone = convertIterationStatementCore(node, initializerFunction, factory.createBlock(bodyFunction.part, /*multiLine*/ true));
                loop = factory.restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
            }
        }
        else {
            const clone = convertIterationStatementCore(node, initializerFunction, Debug.checkDefined(visitNode(node.statement, visitor, isStatement, factory.liftToBlock)));
            loop = factory.restoreEnclosingLabel(clone, outermostLabeledStatement, convertedLoopState && resetLabel);
        }
        statements.push(loop);
        return statements;
    }
    function convertIterationStatementCore(node, initializerFunction, convertedLoopBody) {
        switch (node.kind) {
            case SyntaxKind.ForStatement:
                return convertForStatement(node, initializerFunction, convertedLoopBody);
            case SyntaxKind.ForInStatement:
                return convertForInStatement(node, convertedLoopBody);
            case SyntaxKind.ForOfStatement:
                return convertForOfStatement(node, convertedLoopBody);
            case SyntaxKind.DoStatement:
                return convertDoStatement(node, convertedLoopBody);
            case SyntaxKind.WhileStatement:
                return convertWhileStatement(node, convertedLoopBody);
            default:
                return Debug.failBadSyntaxKind(node, "IterationStatement expected");
        }
    }
    function convertForStatement(node, initializerFunction, convertedLoopBody) {
        const shouldConvertCondition = node.condition && shouldConvertPartOfIterationStatement(node.condition);
        const shouldConvertIncrementor = shouldConvertCondition || node.incrementor && shouldConvertPartOfIterationStatement(node.incrementor);
        return factory.updateForStatement(node, visitNode(initializerFunction ? initializerFunction.part : node.initializer, visitorWithUnusedExpressionResult, isForInitializer), visitNode(shouldConvertCondition ? undefined : node.condition, visitor, isExpression), visitNode(shouldConvertIncrementor ? undefined : node.incrementor, visitorWithUnusedExpressionResult, isExpression), convertedLoopBody);
    }
    function convertForOfStatement(node, convertedLoopBody) {
        return factory.updateForOfStatement(node, 
        /*awaitModifier*/ undefined, Debug.checkDefined(visitNode(node.initializer, visitor, isForInitializer)), Debug.checkDefined(visitNode(node.expression, visitor, isExpression)), convertedLoopBody);
    }
    function convertForInStatement(node, convertedLoopBody) {
        return factory.updateForInStatement(node, Debug.checkDefined(visitNode(node.initializer, visitor, isForInitializer)), Debug.checkDefined(visitNode(node.expression, visitor, isExpression)), convertedLoopBody);
    }
    function convertDoStatement(node, convertedLoopBody) {
        return factory.updateDoStatement(node, convertedLoopBody, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)));
    }
    function convertWhileStatement(node, convertedLoopBody) {
        return factory.updateWhileStatement(node, Debug.checkDefined(visitNode(node.expression, visitor, isExpression)), convertedLoopBody);
    }
    function createConvertedLoopState(node) {
        let loopInitializer;
        switch (node.kind) {
            case SyntaxKind.ForStatement:
            case SyntaxKind.ForInStatement:
            case SyntaxKind.ForOfStatement:
                const initializer = node.initializer;
                if (initializer && initializer.kind === SyntaxKind.VariableDeclarationList) {
                    loopInitializer = initializer;
                }
                break;
        }
        // variables that will be passed to the loop as parameters
        const loopParameters = [];
        // variables declared in the loop initializer that will be changed inside the loop
        const loopOutParameters = [];
        if (loopInitializer && (getCombinedNodeFlags(loopInitializer) & NodeFlags.BlockScoped)) {
            const hasCapturedBindingsInForHead = shouldConvertInitializerOfForStatement(node) ||
                shouldConvertConditionOfForStatement(node) ||
                shouldConvertIncrementorOfForStatement(node);
            for (const decl of loopInitializer.declarations) {
                processLoopVariableDeclaration(node, decl, loopParameters, loopOutParameters, hasCapturedBindingsInForHead);
            }
        }
        const currentState = { loopParameters, loopOutParameters };
        if (convertedLoopState) {
            // convertedOuterLoopState !== undefined means that this converted loop is nested in another converted loop.
            // if outer converted loop has already accumulated some state - pass it through
            if (convertedLoopState.argumentsName) {
                // outer loop has already used 'arguments' so we've already have some name to alias it
                // use the same name in all nested loops
                currentState.argumentsName = convertedLoopState.argumentsName;
            }
            if (convertedLoopState.thisName) {
                // outer loop has already used 'this' so we've already have some name to alias it
                // use the same name in all nested loops
                currentState.thisName = convertedLoopState.thisName;
            }
            if (convertedLoopState.hoistedLocalVariables) {
                // we've already collected some non-block scoped variable declarations in enclosing loop
                // use the same storage in nested loop
                currentState.hoistedLocalVariables = convertedLoopState.hoistedLocalVariables;
            }
        }
        return currentState;
    }
    function addExtraDeclarationsForConvertedLoop(statements, state, outerState) {
        let extraVariableDeclarations;
        // propagate state from the inner loop to the outer loop if necessary
        if (state.argumentsName) {
            // if alias for arguments is set
            if (outerState) {
                // pass it to outer converted loop
                outerState.argumentsName = state.argumentsName;
            }
            else {
                // this is top level converted loop and we need to create an alias for 'arguments' object
                (extraVariableDeclarations || (extraVariableDeclarations = [])).push(factory.createVariableDeclaration(state.argumentsName, 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, factory.createIdentifier("arguments")));
            }
        }
        if (state.thisName) {
            // if alias for this is set
            if (outerState) {
                // pass it to outer converted loop
                outerState.thisName = state.thisName;
            }
            else {
                // this is top level converted loop so we need to create an alias for 'this' here
                // NOTE:
                // if converted loops were all nested in arrow function then we'll always emit '_this' so convertedLoopState.thisName will not be set.
                // If it is set this means that all nested loops are not nested in arrow function and it is safe to capture 'this'.
                (extraVariableDeclarations || (extraVariableDeclarations = [])).push(factory.createVariableDeclaration(state.thisName, 
                /*exclamationToken*/ undefined, 
                /*type*/ undefined, factory.createIdentifier("this")));
            }
        }
        if (state.hoistedLocalVariables) {
            // if hoistedLocalVariables !== undefined this means that we've possibly collected some variable declarations to be hoisted later
            if (outerState) {
                // pass them to outer converted loop
                outerState.hoistedLocalVariables = state.hoistedLocalVariables;
            }
            else {
                if (!extraVariableDeclarations) {
                    extraVariableDeclarations = [];
                }
                // hoist collected variable declarations
                for (const identifier of state.hoistedLocalVariables) {
                    extraVariableDeclarations.push(factory.createVariableDeclaration(identifier));
                }
            }
        }
        // add extra variables to hold out parameters if necessary
        if (state.loopOutParameters.length) {
            if (!extraVariableDeclarations) {
                extraVariableDeclarations = [];
            }
            for (const outParam of state.loopOutParameters) {
                extraVariableDeclarations.push(factory.createVariableDeclaration(outParam.outParamName));
            }
        }
        if (state.conditionVariable) {
            if (!extraVariableDeclarations) {
                extraVariableDeclarations = [];
            }
            extraVariableDeclarations.push(factory.createVariableDeclaration(state.conditionVariable, /*exclamationToken*/ undefined, /*type*/ undefined, factory.createFalse()));
        }
        // create variable statement to hold all introduced variable declarations
        if (extraVariableDeclarations) {
            statements.push(factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList(extraVariableDeclarations)));
        }
    }
    function createOutVariable(p) {
        return factory.createVariableDeclaration(p.originalName, /*exclamationToken*/ undefined, /*type*/ undefined, p.outParamName);
    }
    /**
     * Creates a `_loop_init` function for a `ForStatement` with a block-scoped initializer
     * that is captured in a closure inside of the initializer. The `_loop_init` function is
     * used to preserve the per-iteration environment semantics of
     * [13.7.4.8 RS: ForBodyEvaluation](https://tc39.github.io/ecma262/#sec-forbodyevaluation).
     */
    function createFunctionForInitializerOfForStatement(node, currentState) {
        const functionName = factory.createUniqueName("_loop_init");
        const containsYield = (node.initializer.transformFlags & TransformFlags.ContainsYield) !== 0;
        let emitFlags = EmitFlags.None;
        if (currentState.containsLexicalThis)
            emitFlags |= EmitFlags.CapturesThis;
        if (containsYield && hierarchyFacts & 4 /* HierarchyFacts.AsyncFunctionBody */)
            emitFlags |= EmitFlags.AsyncFunctionBody;
        const statements = [];
        statements.push(factory.createVariableStatement(/*modifiers*/ undefined, node.initializer));
        copyOutParameters(currentState.loopOutParameters, 2 /* LoopOutParameterFlags.Initializer */, 1 /* CopyDirection.ToOutParameter */, statements);
        // This transforms the following ES2015 syntax:
        //
        //  for (let i = (setImmediate(() => console.log(i)), 0); i < 2; i++) {
        //      // loop body
        //  }
        //
        // Into the following ES5 syntax:
        //
        //  var _loop_init_1 = function () {
        //      var i = (setImmediate(() => console.log(i)), 0);
        //      out_i_1 = i;
        //  };
        //  var out_i_1;
        //  _loop_init_1();
        //  for (var i = out_i_1; i < 2; i++) {
        //      // loop body
        //  }
        //
        // Which prevents mutations to `i` in the per-iteration environment of the body
        // from affecting the initial value for `i` outside of the per-iteration environment.
        const functionDeclaration = factory.createVariableStatement(
        /*modifiers*/ undefined, setEmitFlags(factory.createVariableDeclarationList([
            factory.createVariableDeclaration(functionName, 
            /*exclamationToken*/ undefined, 
            /*type*/ undefined, setEmitFlags(factory.createFunctionExpression(
            /*modifiers*/ undefined, containsYield ? factory.createToken(SyntaxKind.AsteriskToken) : undefined, 
            /*name*/ undefined, 
            /*typeParameters*/ undefined, 
            /*parameters*/ undefined, 
            /*type*/ undefined, Debug.checkDefined(visitNode(factory.createBlock(statements, /*multiLine*/ true), visitor, isBlock))), emitFlags)),
        ]), EmitFlags.NoHoisting));
        const part = factory.createVariableDeclarationList(map(currentState.loopOutParameters, createOutVariable));
        return { functionName, containsYield, functionDeclaration, part };
    }
    /**
     * Creates a `_loop` function for an `IterationStatement` with a block-scoped initializer
     * that is captured in a closure inside of the loop body. The `_loop` function is used to
     * preserve the per-iteration environment semantics of
     * [13.7.4.8 RS: ForBodyEvaluation](https://tc39.github.io/ecma262/#sec-forbodyevaluation).
     */
    function createFunctionForBodyOfIterationStatement(node, currentState, outerState) {
        const functionName = factory.createUniqueName("_loop");
        startLexicalEnvironment();
        const statement = visitNode(node.statement, visitor, isStatement, factory.liftToBlock);
        const lexicalEnvironment = endLexicalEnvironment();
        const statements = [];
        if (shouldConvertConditionOfForStatement(node) || shouldConvertIncrementorOfForStatement(node)) {
            // If a block-scoped variable declared in the initializer of `node` is captured in
            // the condition or incrementor, we must move the condition and incrementor into
            // the body of the for loop.
            //
            // This transforms the following ES2015 syntax:
            //
            //  for (let i = 0; setImmediate(() => console.log(i)), i < 2; setImmediate(() => console.log(i)), i++) {
            //      // loop body
            //  }
            //
            // Into the following ES5 syntax:
            //
            //  var _loop_1 = function (i) {
            //      if (inc_1)
            //          setImmediate(() => console.log(i)), i++;
            //      else
            //          inc_1 = true;
            //      if (!(setImmediate(() => console.log(i)), i < 2))
            //          return out_i_1 = i, "break";
            //      // loop body
            //      out_i_1 = i;
            //  }
            //  var out_i_1, inc_1 = false;
            //  for (var i = 0;;) {
            //      var state_1 = _loop_1(i);
            //      i = out_i_1;
            //      if (state_1 === "break")
            //          break;
            //  }
            //
            // Which prevents mutations to `i` in the per-iteration environment of the body
            // from affecting the value of `i` in the previous per-iteration environment.
            //
            // Note that the incrementor of a `for` loop is evaluated in a *new* per-iteration
            // environment that is carried over to the next iteration of the loop. As a result,
            // we must indicate whether this is the first evaluation of the loop body so that
            // we only evaluate the incrementor on subsequent evaluations.
            currentState.conditionVariable = factory.createUniqueName("inc");
            if (node.incrementor) {
                statements.push(factory.createIfStatement(currentState.conditionVariable, factory.createExpressionStatement(Debug.checkDefined(visitNode(node.incrementor, visitor, isExpression))), factory.createExpressionStatement(factory.createAssignment(currentState.conditionVariable, factory.createTrue()))));
            }
            else {
                statements.push(factory.createIfStatement(factory.createLogicalNot(currentState.conditionVariable), factory.createExpressionStatement(factory.createAssignment(currentState.conditionVariable, factory.createTrue()))));
            }
            if (shouldConvertConditionOfForStatement(node)) {
                statements.push(factory.createIfStatement(factory.createPrefixUnaryExpression(SyntaxKind.ExclamationToken, Debug.checkDefined(visitNode(node.condition, visitor, isExpression))), Debug.checkDefined(visitNode(factory.createBreakStatement(), visitor, isStatement))));
            }
        }
        Debug.assert(statement);
        if (isBlock(statement)) {
            addRange(statements, statement.statements);
        }
        else {
            statements.push(statement);
        }
        copyOutParameters(currentState.loopOutParameters, 1 /* LoopOutParameterFlags.Body */, 1 /* CopyDirection.ToOutParameter */, statements);
        insertStatementsAfterStandardPrologue(statements, lexicalEnvironment);
        const loopBody = factory.createBlock(statements, /*multiLine*/ true);
        if (isBlock(statement))
            setOriginalNode(loopBody, statement);
        const containsYield = (node.statement.transformFlags & TransformFlags.ContainsYield) !== 0;
        let emitFlags = EmitFlags.ReuseTempVariableScope;
        if (currentState.containsLexicalThis)
            emitFlags |= EmitFlags.CapturesThis;
        if (containsYield && (hierarchyFacts & 4 /* HierarchyFacts.AsyncFunctionBody */) !== 0)
            emitFlags |= EmitFlags.AsyncFunctionBody;
        // This transforms the following ES2015 syntax (in addition to other variations):
        //
        //  for (let i = 0; i < 2; i++) {
        //      setImmediate(() => console.log(i));
        //  }
        //
        // Into the following ES5 syntax:
        //
        //  var _loop_1 = function (i) {
        //      setImmediate(() => console.log(i));
        //  };
        //  for (var i = 0; i < 2; i++) {
        //      _loop_1(i);
        //  }
        const functionDeclaration = factory.createVariableStatement(
        /*modifiers*/ undefined, setEmitFlags(factory.createVariableDeclarationList([
            factory.createVariableDeclaration(functionName, 
            /*exclamationToken*/ undefined, 
            /*type*/ undefined, setEmitFlags(factory.createFunctionExpression(
            /*modifiers*/ undefined, containsYield ? factory.createToken(SyntaxKind.AsteriskToken) : undefined, 
            /*name*/ undefined, 
            /*typeParameters*/ undefined, currentState.loopParameters, 
            /*type*/ undefined, loopBody), emitFlags)),
        ]), EmitFlags.NoHoisting));
        const part = generateCallToConvertedLoop(functionName, currentState, outerState, containsYield);
        return { functionName, containsYield, functionDeclaration, part };
    }
    function copyOutParameter(outParam, copyDirection) {
        const source = copyDirection === 0 /* CopyDirection.ToOriginal */ ? outParam.outParamName : outParam.originalName;
        const target = copyDirection === 0 /* CopyDirection.ToOriginal */ ? outParam.originalName : outParam.outParamName;
        return factory.createBinaryExpression(target, SyntaxKind.EqualsToken, source);
    }
    function copyOutParameters(outParams, partFlags, copyDirection, statements) {
        for (const outParam of outParams) {
            if (outParam.flags & partFlags) {
                statements.push(factory.createExpressionStatement(copyOutParameter(outParam, copyDirection)));
            }
        }
    }
    function generateCallToConvertedLoopInitializer(initFunctionExpressionName, containsYield) {
        const call = factory.createCallExpression(initFunctionExpressionName, /*typeArguments*/ undefined, []);
        const callResult = containsYield
            ? factory.createYieldExpression(factory.createToken(SyntaxKind.AsteriskToken), setEmitFlags(call, EmitFlags.Iterator))
            : call;
        return factory.createExpressionStatement(callResult);
    }
    function generateCallToConvertedLoop(loopFunctionExpressionName, state, outerState, containsYield) {
        const statements = [];
        // loop is considered simple if it does not have any return statements or break\continue that transfer control outside of the loop
        // simple loops are emitted as just 'loop()';
        // NOTE: if loop uses only 'continue' it still will be emitted as simple loop
        const isSimpleLoop = !(state.nonLocalJumps & ~4 /* Jump.Continue */) &&
            !state.labeledNonLocalBreaks &&
            !state.labeledNonLocalContinues;
        const call = factory.createCallExpression(loopFunctionExpressionName, /*typeArguments*/ undefined, map(state.loopParameters, p => p.name));
        const callResult = containsYield
            ? factory.createYieldExpression(factory.createToken(SyntaxKind.AsteriskToken), setEmitFlags(call, EmitFlags.Iterator))
            : call;
        if (isSimpleLoop) {
            statements.push(factory.createExpressionStatement(callResult));
            copyOutParameters(state.loopOutParameters, 1 /* LoopOutParameterFlags.Body */, 0 /* CopyDirection.ToOriginal */, statements);
        }
        else {
            const loopResultName = factory.createUniqueName("state");
            const stateVariable = factory.createVariableStatement(
            /*modifiers*/ undefined, factory.createVariableDeclarationList([factory.createVariableDeclaration(loopResultName, /*exclamationToken*/ undefined, /*type*/ undefined, callResult)]));
            statements.push(stateVariable);
            copyOutParameters(state.loopOutParameters, 1 /* LoopOutParameterFlags.Body */, 0 /* CopyDirection.ToOriginal */, statements);
            if (state.nonLocalJumps & 8 /* Jump.Return */) {
                let returnStatement;
                if (outerState) {
                    outerState.nonLocalJumps |= 8 /* Jump.Return */;
                    returnStatement = factory.createReturnStatement(loopResultName);
                }
                else {
                    returnStatement = factory.createReturnStatement(factory.createPropertyAccessExpression(loopResultName, "value"));
                }
                statements.push(factory.createIfStatement(factory.createTypeCheck(loopResultName, "object"), returnStatement));
            }
            if (state.nonLocalJumps & 2 /* Jump.Break */) {
                statements.push(factory.createIfStatement(factory.createStrictEquality(loopResultName, factory.createStringLiteral("break")), factory.createBreakStatement()));
            }
            if (state.labeledNonLocalBreaks || state.labeledNonLocalContinues) {
                const caseClauses = [];
                processLabeledJumps(state.labeledNonLocalBreaks, /*isBreak*/ true, loopResultName, outerState, caseClauses);
                processLabeledJumps(state.labeledNonLocalContinues, /*isBreak*/ false, loopResultName, outerState, caseClauses);
                statements.push(factory.createSwitchStatement(loopResultName, factory.createCaseBlock(caseClauses)));
            }
        }
        return statements;
    }
    function setLabeledJump(state, isBreak, labelText, labelMarker) {
        if (isBreak) {
            if (!state.labeledNonLocalBreaks) {
                state.labeledNonLocalBreaks = new Map();
            }
            state.labeledNonLocalBreaks.set(labelText, labelMarker);
        }
        else {
            if (!state.labeledNonLocalContinues) {
                state.labeledNonLocalContinues = new Map();
            }
            state.labeledNonLocalContinues.set(labelText, labelMarker);
        }
    }
    function processLabeledJumps(table, isBreak, loopResultName, outerLoop, caseClauses) {
        if (!table) {
            return;
        }
        table.forEach((labelMarker, labelText) => {
            const statements = [];
            // if there are no outer converted loop or outer label in question is located inside outer converted loop
            // then emit labeled break\continue
            // otherwise propagate pair 'label -> marker' to outer converted loop and emit 'return labelMarker' so outer loop can later decide what to do
            if (!outerLoop || (outerLoop.labels && outerLoop.labels.get(labelText))) {
                const label = factory.createIdentifier(labelText);
                statements.push(isBreak ? factory.createBreakStatement(label) : factory.createContinueStatement(label));
            }
            else {
                setLabeledJump(outerLoop, isBreak, labelText, labelMarker);
                statements.push(factory.createReturnStatement(loopResultName));
            }
            caseClauses.push(factory.createCaseClause(factory.createStringLiteral(labelMarker), statements));
        });
    }
    function processLoopVariableDeclaration(container, decl, loopParameters, loopOutParameters, hasCapturedBindingsInForHead) {
        const name = decl.name;
        if (isBindingPattern(name)) {
            for (const element of name.elements) {
                if (!isOmittedExpression(element)) {
                    processLoopVariableDeclaration(container, element, loopParameters, loopOutParameters, hasCapturedBindingsInForHead);
                }
            }
        }
        else {
            loopParameters.push(factory.createParameterDeclaration(/*modifiers*/ undefined, /*dotDotDotToken*/ undefined, name));
            const needsOutParam = resolver.hasNodeCheckFlag(decl, NodeCheckFlags.NeedsLoopOutParameter);
            if (needsOutParam || hasCapturedBindingsInForHead) {
                const outParamName = factory.createUniqueName("out_" + idText(name));
                let flags = 0 /* LoopOutParameterFlags.None */;
                if (needsOutParam) {
                    flags |= 1 /* LoopOutParameterFlags.Body */;
                }
                if (isForStatement(container)) {
                    if (container.initializer && resolver.isBindingCapturedByNode(container.initializer, decl)) {
                        flags |= 2 /* LoopOutParameterFlags.Initializer */;
                    }
                    if (container.condition && resolver.isBindingCapturedByNode(container.condition, decl) ||
                        container.incrementor && resolver.isBindingCapturedByNode(container.incrementor, decl)) {
                        flags |= 1 /* LoopOutParameterFlags.Body */;
                    }
                }
                loopOutParameters.push({ flags, originalName: name, outParamName });
            }
        }
    }
    /**
     * Adds the members of an object literal to an array of expressions.
     *
     * @param expressions An array of expressions.
     * @param node An ObjectLiteralExpression node.
     * @param receiver The receiver for members of the ObjectLiteralExpression.
     * @param numInitialNonComputedProperties The number of initial properties without
     *                                        computed property names.
     */
    function addObjectLiteralMembers(expressions, node, receiver, start) {
        const properties = node.properties;
        const numProperties = properties.length;
        for (let i = start; i < numProperties; i++) {
            const property = properties[i];
            switch (property.kind) {
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    const accessors = getAllAccessorDeclarations(node.properties, property);
                    if (property === accessors.firstAccessor) {
                        expressions.push(transformAccessorsToExpression(receiver, accessors, node, !!node.multiLine));
                    }
                    break;
                case SyntaxKind.MethodDeclaration:
                    expressions.push(transformObjectLiteralMethodDeclarationToExpression(property, receiver, node, node.multiLine));
                    break;
                case SyntaxKind.PropertyAssignment:
                    expressions.push(transformPropertyAssignmentToExpression(property, receiver, node.multiLine));
                    break;
                case SyntaxKind.ShorthandPropertyAssignment:
                    expressions.push(transformShorthandPropertyAssignmentToExpression(property, receiver, node.multiLine));
                    break;
                default:
                    Debug.failBadSyntaxKind(node);
                    break;
            }
        }
    }
    /**
     * Transforms a PropertyAssignment node into an expression.
     *
     * @param node The ObjectLiteralExpression that contains the PropertyAssignment.
     * @param property The PropertyAssignment node.
     * @param receiver The receiver for the assignment.
     */
    function transformPropertyAssignmentToExpression(property, receiver, startsOnNewLine) {
        const expression = factory.createAssignment(createMemberAccessForPropertyName(factory, receiver, Debug.checkDefined(visitNode(property.name, visitor, isPropertyName))), Debug.checkDefined(visitNode(property.initializer, visitor, isExpression)));
        setTextRange(expression, property);
        if (startsOnNewLine) {
            startOnNewLine(expression);
        }
        return expression;
    }
    /**
     * Transforms a ShorthandPropertyAssignment node into an expression.
     *
     * @param node The ObjectLiteralExpression that contains the ShorthandPropertyAssignment.
     * @param property The ShorthandPropertyAssignment node.
     * @param receiver The receiver for the assignment.
     */
    function transformShorthandPropertyAssignmentToExpression(property, receiver, startsOnNewLine) {
        const expression = factory.createAssignment(createMemberAccessForPropertyName(factory, receiver, Debug.checkDefined(visitNode(property.name, visitor, isPropertyName))), factory.cloneNode(property.name));
        setTextRange(expression, property);
        if (startsOnNewLine) {
            startOnNewLine(expression);
        }
        return expression;
    }
    /**
     * Transforms a MethodDeclaration of an ObjectLiteralExpression into an expression.
     *
     * @param node The ObjectLiteralExpression that contains the MethodDeclaration.
     * @param method The MethodDeclaration node.
     * @param receiver The receiver for the assignment.
     */
    function transformObjectLiteralMethodDeclarationToExpression(method, receiver, container, startsOnNewLine) {
        const expression = factory.createAssignment(createMemberAccessForPropertyName(factory, receiver, Debug.checkDefined(visitNode(method.name, visitor, isPropertyName))), transformFunctionLikeToExpression(method, /*location*/ method, /*name*/ undefined, container));
        setTextRange(expression, method);
        if (startsOnNewLine) {
            startOnNewLine(expression);
        }
        return expression;
    }
    function visitCatchClause(node) {
        const ancestorFacts = enterSubtree(7104 /* HierarchyFacts.BlockScopeExcludes */, 0 /* HierarchyFacts.BlockScopeIncludes */);
        let updated;
        Debug.assert(!!node.variableDeclaration, "Catch clause variable should always be present when downleveling ES2015.");
        if (isBindingPattern(node.variableDeclaration.name)) {
            const temp = factory.createTempVariable(/*recordTempVariable*/ undefined);
            const newVariableDeclaration = factory.createVariableDeclaration(temp);
            setTextRange(newVariableDeclaration, node.variableDeclaration);
            const vars = flattenDestructuringBinding(node.variableDeclaration, visitor, context, FlattenLevel.All, temp);
            const list = factory.createVariableDeclarationList(vars);
            setTextRange(list, node.variableDeclaration);
            const destructure = factory.createVariableStatement(/*modifiers*/ undefined, list);
            updated = factory.updateCatchClause(node, newVariableDeclaration, addStatementToStartOfBlock(node.block, destructure));
        }
        else {
            updated = visitEachChild(node, visitor, context);
        }
        exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
        return updated;
    }
    function addStatementToStartOfBlock(block, statement) {
        const transformedStatements = visitNodes(block.statements, visitor, isStatement);
        return factory.updateBlock(block, [statement, ...transformedStatements]);
    }
    /**
     * Visits a MethodDeclaration of an ObjectLiteralExpression and transforms it into a
     * PropertyAssignment.
     *
     * @param node A MethodDeclaration node.
     */
    function visitMethodDeclaration(node) {
        // We should only get here for methods on an object literal with regular identifier names.
        // Methods on classes are handled in visitClassDeclaration/visitClassExpression.
        // Methods with computed property names are handled in visitObjectLiteralExpression.
        Debug.assert(!isComputedPropertyName(node.name));
        const functionExpression = transformFunctionLikeToExpression(node, /*location*/ moveRangePos(node, -1), /*name*/ undefined, /*container*/ undefined);
        setEmitFlags(functionExpression, EmitFlags.NoLeadingComments | getEmitFlags(functionExpression));
        return setTextRange(factory.createPropertyAssignment(node.name, functionExpression), 
        /*location*/ node);
    }
    /**
     * Visits an AccessorDeclaration of an ObjectLiteralExpression.
     *
     * @param node An AccessorDeclaration node.
     */
    function visitAccessorDeclaration(node) {
        Debug.assert(!isComputedPropertyName(node.name));
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const ancestorFacts = enterSubtree(32670 /* HierarchyFacts.FunctionExcludes */, 65 /* HierarchyFacts.FunctionIncludes */);
        let updated;
        const parameters = visitParameterList(node.parameters, visitor, context);
        const body = transformFunctionBody(node);
        if (node.kind === SyntaxKind.GetAccessor) {
            updated = factory.updateGetAccessorDeclaration(node, node.modifiers, node.name, parameters, node.type, body);
        }
        else {
            updated = factory.updateSetAccessorDeclaration(node, node.modifiers, node.name, parameters, body);
        }
        exitSubtree(ancestorFacts, 229376 /* HierarchyFacts.FunctionSubtreeExcludes */, 0 /* HierarchyFacts.None */);
        convertedLoopState = savedConvertedLoopState;
        return updated;
    }
    /**
     * Visits a ShorthandPropertyAssignment and transforms it into a PropertyAssignment.
     *
     * @param node A ShorthandPropertyAssignment node.
     */
    function visitShorthandPropertyAssignment(node) {
        return setTextRange(factory.createPropertyAssignment(node.name, visitIdentifier(factory.cloneNode(node.name))), 
        /*location*/ node);
    }
    function visitComputedPropertyName(node) {
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a YieldExpression node.
     *
     * @param node A YieldExpression node.
     */
    function visitYieldExpression(node) {
        // `yield` expressions are transformed using the generators transformer.
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits an ArrayLiteralExpression that contains a spread element.
     *
     * @param node An ArrayLiteralExpression node.
     */
    function visitArrayLiteralExpression(node) {
        if (some(node.elements, isSpreadElement)) {
            // We are here because we contain a SpreadElementExpression.
            return transformAndSpreadElements(node.elements, /*isArgumentList*/ false, !!node.multiLine, /*hasTrailingComma*/ !!node.elements.hasTrailingComma);
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a CallExpression that contains either a spread element or `super`.
     *
     * @param node a CallExpression.
     */
    function visitCallExpression(node) {
        if (getInternalEmitFlags(node) & InternalEmitFlags.TypeScriptClassWrapper) {
            return visitTypeScriptClassWrapper(node);
        }
        const expression = skipOuterExpressions(node.expression);
        if (expression.kind === SyntaxKind.SuperKeyword ||
            isSuperProperty(expression) ||
            some(node.arguments, isSpreadElement)) {
            return visitCallExpressionWithPotentialCapturedThisAssignment(node, /*assignToCapturedThis*/ true);
        }
        return factory.updateCallExpression(node, Debug.checkDefined(visitNode(node.expression, callExpressionVisitor, isExpression)), 
        /*typeArguments*/ undefined, visitNodes(node.arguments, visitor, isExpression));
    }
    function visitTypeScriptClassWrapper(node) {
        // This is a call to a class wrapper function (an IIFE) created by the 'ts' transformer.
        // The wrapper has a form similar to:
        //
        //  (function() {
        //      class C { // 1
        //      }
        //      C.x = 1; // 2
        //      return C;
        //  }())
        //
        // When we transform the class, we end up with something like this:
        //
        //  (function () {
        //      var C = (function () { // 3
        //          function C() {
        //          }
        //          return C; // 4
        //      }());
        //      C.x = 1;
        //      return C;
        //  }())
        //
        // We want to simplify the two nested IIFEs to end up with something like this:
        //
        //  (function () {
        //      function C() {
        //      }
        //      C.x = 1;
        //      return C;
        //  }())
        // We skip any outer expressions in a number of places to get to the innermost
        // expression, but we will restore them later to preserve comments and source maps.
        const body = cast(cast(skipOuterExpressions(node.expression), isArrowFunction).body, isBlock);
        // The class statements are the statements generated by visiting the first statement with initializer of the
        // body (1), while all other statements are added to remainingStatements (2)
        const isVariableStatementWithInitializer = (stmt) => isVariableStatement(stmt) && !!first(stmt.declarationList.declarations).initializer;
        // visit the class body statements outside of any converted loop body.
        const savedConvertedLoopState = convertedLoopState;
        convertedLoopState = undefined;
        const bodyStatements = visitNodes(body.statements, classWrapperStatementVisitor, isStatement);
        convertedLoopState = savedConvertedLoopState;
        const classStatements = filter(bodyStatements, isVariableStatementWithInitializer);
        const remainingStatements = filter(bodyStatements, stmt => !isVariableStatementWithInitializer(stmt));
        const varStatement = cast(first(classStatements), isVariableStatement);
        // We know there is only one variable declaration here as we verified this in an
        // earlier call to isTypeScriptClassWrapper
        const variable = varStatement.declarationList.declarations[0];
        const initializer = skipOuterExpressions(variable.initializer);
        // Under certain conditions, the 'ts' transformer may introduce a class alias, which
        // we see as an assignment, for example:
        //
        //  (function () {
        //      var C_1;
        //      var C = C_1 = (function () {
        //          function C() {
        //          }
        //          C.x = function () { return C_1; }
        //          return C;
        //      }());
        //      C = C_1 = __decorate([dec], C);
        //      return C;
        //  }())
        //
        let aliasAssignment = tryCast(initializer, isAssignmentExpression);
        if (!aliasAssignment && isBinaryExpression(initializer) && initializer.operatorToken.kind === SyntaxKind.CommaToken) {
            aliasAssignment = tryCast(initializer.left, isAssignmentExpression);
        }
        // The underlying call (3) is another IIFE that may contain a '_super' argument.
        const call = cast(aliasAssignment ? skipOuterExpressions(aliasAssignment.right) : initializer, isCallExpression);
        const func = cast(skipOuterExpressions(call.expression), isFunctionExpression);
        const funcStatements = func.body.statements;
        let classBodyStart = 0;
        let classBodyEnd = -1;
        const statements = [];
        if (aliasAssignment) {
            // If we have a class alias assignment, we need to move it to the down-level constructor
            // function we generated for the class.
            const extendsCall = tryCast(funcStatements[classBodyStart], isExpressionStatement);
            if (extendsCall) {
                statements.push(extendsCall);
                classBodyStart++;
            }
            // The next statement is the function declaration.
            statements.push(funcStatements[classBodyStart]);
            classBodyStart++;
            // Add the class alias following the declaration.
            statements.push(factory.createExpressionStatement(factory.createAssignment(aliasAssignment.left, cast(variable.name, isIdentifier))));
        }
        // Find the trailing 'return' statement (4)
        while (!isReturnStatement(elementAt(funcStatements, classBodyEnd))) {
            classBodyEnd--;
        }
        // When we extract the statements of the inner IIFE, we exclude the 'return' statement (4)
        // as we already have one that has been introduced by the 'ts' transformer.
        addRange(statements, funcStatements, classBodyStart, classBodyEnd);
        if (classBodyEnd < -1) {
            // If there were any hoisted declarations following the return statement, we should
            // append them.
            addRange(statements, funcStatements, classBodyEnd + 1);
        }
        // TODO(rbuckton): We should consider either improving the inlining here, or remove it entirely, since
        //                 the new esDecorators emit doesn't inline.
        // Add the remaining statements of the outer wrapper. Use the 'return' statement
        // of the inner wrapper if its expression is not trivially an Identifier.
        const returnStatement = tryCast(elementAt(funcStatements, classBodyEnd), isReturnStatement);
        for (const statement of remainingStatements) {
            if (isReturnStatement(statement) && (returnStatement === null || returnStatement === void 0 ? void 0 : returnStatement.expression) &&
                !isIdentifier(returnStatement.expression)) {
                statements.push(returnStatement);
            }
            else {
                statements.push(statement);
            }
        }
        // The 'es2015' class transform may add an end-of-declaration marker. If so we will add it
        // after the remaining statements from the 'ts' transformer.
        addRange(statements, classStatements, /*start*/ 1);
        // Recreate any outer parentheses or partially-emitted expressions to preserve source map
        // and comment locations.
        return factory.restoreOuterExpressions(node.expression, factory.restoreOuterExpressions(variable.initializer, factory.restoreOuterExpressions(aliasAssignment && aliasAssignment.right, factory.updateCallExpression(call, factory.restoreOuterExpressions(call.expression, factory.updateFunctionExpression(func, 
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, 
        /*name*/ undefined, 
        /*typeParameters*/ undefined, func.parameters, 
        /*type*/ undefined, factory.updateBlock(func.body, statements))), 
        /*typeArguments*/ undefined, call.arguments))));
    }
    function visitCallExpressionWithPotentialCapturedThisAssignment(node, assignToCapturedThis) {
        // We are here either because SuperKeyword was used somewhere in the expression, or
        // because we contain a SpreadElementExpression.
        if (node.transformFlags & TransformFlags.ContainsRestOrSpread ||
            node.expression.kind === SyntaxKind.SuperKeyword ||
            isSuperProperty(skipOuterExpressions(node.expression))) {
            const { target, thisArg } = factory.createCallBinding(node.expression, hoistVariableDeclaration);
            if (node.expression.kind === SyntaxKind.SuperKeyword) {
                setEmitFlags(thisArg, EmitFlags.NoSubstitution);
            }
            let resultingCall;
            if (node.transformFlags & TransformFlags.ContainsRestOrSpread) {
                // [source]
                //      f(...a, b)
                //      x.m(...a, b)
                //      super(...a, b)
                //      super.m(...a, b) // in static
                //      super.m(...a, b) // in instance
                //
                // [output]
                //      f.apply(void 0, a.concat([b]))
                //      (_a = x).m.apply(_a, a.concat([b]))
                //      _super.apply(this, a.concat([b]))
                //      _super.m.apply(this, a.concat([b]))
                //      _super.prototype.m.apply(this, a.concat([b]))
                resultingCall = factory.createFunctionApplyCall(Debug.checkDefined(visitNode(target, callExpressionVisitor, isExpression)), node.expression.kind === SyntaxKind.SuperKeyword ? thisArg : Debug.checkDefined(visitNode(thisArg, visitor, isExpression)), transformAndSpreadElements(node.arguments, /*isArgumentList*/ true, /*multiLine*/ false, /*hasTrailingComma*/ false));
            }
            else {
                // [source]
                //      super(a)
                //      super.m(a) // in static
                //      super.m(a) // in instance
                //
                // [output]
                //      _super.call(this, a)
                //      _super.m.call(this, a)
                //      _super.prototype.m.call(this, a)
                resultingCall = setTextRange(factory.createFunctionCallCall(Debug.checkDefined(visitNode(target, callExpressionVisitor, isExpression)), node.expression.kind === SyntaxKind.SuperKeyword ? thisArg : Debug.checkDefined(visitNode(thisArg, visitor, isExpression)), visitNodes(node.arguments, visitor, isExpression)), node);
            }
            if (node.expression.kind === SyntaxKind.SuperKeyword) {
                const initializer = factory.createLogicalOr(resultingCall, createActualThis());
                resultingCall = assignToCapturedThis
                    ? factory.createAssignment(createCapturedThis(), initializer)
                    : initializer;
            }
            return setOriginalNode(resultingCall, node);
        }
        if (isSuperCall(node)) {
            hierarchyFacts |= 131072 /* HierarchyFacts.CapturedLexicalThis */;
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Visits a NewExpression that contains a spread element.
     *
     * @param node A NewExpression node.
     */
    function visitNewExpression(node) {
        if (some(node.arguments, isSpreadElement)) {
            // We are here because we contain a SpreadElementExpression.
            // [source]
            //      new C(...a)
            //
            // [output]
            //      new ((_a = C).bind.apply(_a, [void 0].concat(a)))()
            const { target, thisArg } = factory.createCallBinding(factory.createPropertyAccessExpression(node.expression, "bind"), hoistVariableDeclaration);
            return factory.createNewExpression(factory.createFunctionApplyCall(Debug.checkDefined(visitNode(target, visitor, isExpression)), thisArg, transformAndSpreadElements(factory.createNodeArray([factory.createVoidZero(), ...node.arguments]), /*isArgumentList*/ true, /*multiLine*/ false, /*hasTrailingComma*/ false)), 
            /*typeArguments*/ undefined, []);
        }
        return visitEachChild(node, visitor, context);
    }
    /**
     * Transforms an array of Expression nodes that contains a SpreadExpression.
     *
     * @param elements The array of Expression nodes.
     * @param isArgumentList A value indicating whether to ensure that the result is a fresh array.
     * This should be `false` when spreading into an `ArrayLiteral`, and `true` when spreading into an
     * argument list.
     * @param multiLine A value indicating whether the result should be emitted on multiple lines.
     */
    function transformAndSpreadElements(elements, isArgumentList, multiLine, hasTrailingComma) {
        // When there is no leading SpreadElement:
        //
        // [source]
        //      [a, ...b, c]
        //
        // [output (downlevelIteration)]
        //      __spreadArray(__spreadArray([a], __read(b)), [c])
        //
        // [output]
        //      __spreadArray(__spreadArray([a], b), [c])
        //
        // When there *is* a leading SpreadElement:
        //
        // [source]
        //      [...a, b]
        //
        // [output (downlevelIteration)]
        //      __spreadArray(__spreadArray([], __read(a)), [b])
        //
        // [output]
        //      __spreadArray(__spreadArray([], a), [b])
        //
        // NOTE: We use `isPackedArrayLiteral` below rather than just `isArrayLiteral`
        // because ES2015 spread will replace _missing_ array elements with `undefined`,
        // so we cannot just use an array as is. For example:
        //
        // `[1, ...[2, , 3]]` becomes `[1, 2, undefined, 3]`
        //
        // However, for packed array literals (i.e., an array literal with no OmittedExpression
        // elements), we can use the array as-is.
        // Map spans of spread expressions into their expressions and spans of other
        // expressions into an array literal.
        const numElements = elements.length;
        const segments = flatten(
        // As we visit each element, we return one of two functions to use as the "key":
        // - `visitSpanOfSpreads` for one or more contiguous `...` spread expressions, i.e. `...a, ...b` in `[1, 2, ...a, ...b]`
        // - `visitSpanOfNonSpreads` for one or more contiguous non-spread elements, i.e. `1, 2`, in `[1, 2, ...a, ...b]`
        spanMap(elements, partitionSpread, (partition, visitPartition, _start, end) => visitPartition(partition, multiLine, hasTrailingComma && end === numElements)));
        if (segments.length === 1) {
            const firstSegment = segments[0];
            // If we don't need a unique copy, then we are spreading into an argument list for
            // a CallExpression or NewExpression. When using `--downlevelIteration`, we need
            // to coerce this into an array for use with `apply`, so we will use the code path
            // that follows instead.
            if (isArgumentList && !compilerOptions.downlevelIteration
                || isPackedArrayLiteral(firstSegment.expression) // see NOTE (above)
                || isCallToHelper(firstSegment.expression, "___spreadArray")) {
                return firstSegment.expression;
            }
        }
        const helpers = emitHelpers();
        const startsWithSpread = segments[0].kind !== 0 /* SpreadSegmentKind.None */;
        let expression = startsWithSpread ? factory.createArrayLiteralExpression() :
            segments[0].expression;
        for (let i = startsWithSpread ? 0 : 1; i < segments.length; i++) {
            const segment = segments[i];
            // If this is for an argument list, it doesn't matter if the array is packed or sparse
            expression = helpers.createSpreadArrayHelper(expression, segment.expression, segment.kind === 1 /* SpreadSegmentKind.UnpackedSpread */ && !isArgumentList);
        }
        return expression;
    }
    function partitionSpread(node) {
        return isSpreadElement(node)
            ? visitSpanOfSpreads
            : visitSpanOfNonSpreads;
    }
    function visitSpanOfSpreads(chunk) {
        return map(chunk, visitExpressionOfSpread);
    }
    function visitExpressionOfSpread(node) {
        Debug.assertNode(node, isSpreadElement);
        let expression = visitNode(node.expression, visitor, isExpression);
        Debug.assert(expression);
        // We don't need to pack already packed array literals, or existing calls to the `__read` helper.
        const isCallToReadHelper = isCallToHelper(expression, "___read");
        let kind = isCallToReadHelper || isPackedArrayLiteral(expression) ? 2 /* SpreadSegmentKind.PackedSpread */ : 1 /* SpreadSegmentKind.UnpackedSpread */;
        // We don't need the `__read` helper for array literals. Array packing will be performed by `__spreadArray`.
        if (compilerOptions.downlevelIteration && kind === 1 /* SpreadSegmentKind.UnpackedSpread */ && !isArrayLiteralExpression(expression) && !isCallToReadHelper) {
            expression = emitHelpers().createReadHelper(expression, /*count*/ undefined);
            // the `__read` helper returns a packed array, so we don't need to ensure a packed array
            kind = 2 /* SpreadSegmentKind.PackedSpread */;
        }
        return createSpreadSegment(kind, expression);
    }
    function visitSpanOfNonSpreads(chunk, multiLine, hasTrailingComma) {
        const expression = factory.createArrayLiteralExpression(visitNodes(factory.createNodeArray(chunk, hasTrailingComma), visitor, isExpression), multiLine);
        // We do not pack non-spread segments, this is so that `[1, , ...[2, , 3], , 4]` is properly downleveled to
        // `[1, , 2, undefined, 3, , 4]`. See the NOTE in `transformAndSpreadElements`
        return createSpreadSegment(0 /* SpreadSegmentKind.None */, expression);
    }
    function visitSpreadElement(node) {
        return visitNode(node.expression, visitor, isExpression);
    }
    /**
     * Visits a template literal.
     *
     * @param node A template literal.
     */
    function visitTemplateLiteral(node) {
        return setTextRange(factory.createStringLiteral(node.text), node);
    }
    /**
     * Visits a string literal with an extended unicode escape.
     *
     * @param node A string literal.
     */
    function visitStringLiteral(node) {
        if (node.hasExtendedUnicodeEscape) {
            return setTextRange(factory.createStringLiteral(node.text), node);
        }
        return node;
    }
    /**
     * Visits a binary or octal (ES6) numeric literal.
     *
     * @param node A string literal.
     */
    function visitNumericLiteral(node) {
        if (node.numericLiteralFlags & TokenFlags.BinaryOrOctalSpecifier) {
            return setTextRange(factory.createNumericLiteral(node.text), node);
        }
        return node;
    }
    /**
     * Visits a TaggedTemplateExpression node.
     *
     * @param node A TaggedTemplateExpression node.
     */
    function visitTaggedTemplateExpression(node) {
        return processTaggedTemplateExpression(context, node, visitor, currentSourceFile, recordTaggedTemplateString, ProcessLevel.All);
    }
    /**
     * Visits a TemplateExpression node.
     *
     * @param node A TemplateExpression node.
     */
    function visitTemplateExpression(node) {
        let expression = factory.createStringLiteral(node.head.text);
        for (const span of node.templateSpans) {
            const args = [Debug.checkDefined(visitNode(span.expression, visitor, isExpression))];
            if (span.literal.text.length > 0) {
                args.push(factory.createStringLiteral(span.literal.text));
            }
            expression = factory.createCallExpression(factory.createPropertyAccessExpression(expression, "concat"), 
            /*typeArguments*/ undefined, args);
        }
        return setTextRange(expression, node);
    }
    function createSyntheticSuper() {
        return factory.createUniqueName("_super", GeneratedIdentifierFlags.Optimistic | GeneratedIdentifierFlags.FileLevel);
    }
    /**
     * Visits the `super` keyword
     */
    function visitSuperKeyword(node, isExpressionOfCall) {
        const expression = hierarchyFacts & 8 /* HierarchyFacts.NonStaticClassElement */ && !isExpressionOfCall
            ? factory.createPropertyAccessExpression(setOriginalNode(createSyntheticSuper(), node), "prototype")
            : createSyntheticSuper();
        setOriginalNode(expression, node);
        setCommentRange(expression, node);
        setSourceMapRange(expression, node);
        return expression;
    }
    function visitMetaProperty(node) {
        if (node.keywordToken === SyntaxKind.NewKeyword && node.name.escapedText === "target") {
            hierarchyFacts |= 32768 /* HierarchyFacts.NewTarget */;
            return factory.createUniqueName("_newTarget", GeneratedIdentifierFlags.Optimistic | GeneratedIdentifierFlags.FileLevel);
        }
        return node;
    }
    /**
     * Called by the printer just before a node is printed.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to be printed.
     * @param emitCallback The callback used to emit the node.
     */
    function onEmitNode(hint, node, emitCallback) {
        if (enabledSubstitutions & 1 /* ES2015SubstitutionFlags.CapturedThis */ && isFunctionLike(node)) {
            // If we are tracking a captured `this`, keep track of the enclosing function.
            const ancestorFacts = enterSubtree(32670 /* HierarchyFacts.FunctionExcludes */, getEmitFlags(node) & EmitFlags.CapturesThis
                ? 65 /* HierarchyFacts.FunctionIncludes */ | 16 /* HierarchyFacts.CapturesThis */
                : 65 /* HierarchyFacts.FunctionIncludes */);
            previousOnEmitNode(hint, node, emitCallback);
            exitSubtree(ancestorFacts, 0 /* HierarchyFacts.None */, 0 /* HierarchyFacts.None */);
            return;
        }
        previousOnEmitNode(hint, node, emitCallback);
    }
    /**
     * Enables a more costly code path for substitutions when we determine a source file
     * contains block-scoped bindings (e.g. `let` or `const`).
     */
    function enableSubstitutionsForBlockScopedBindings() {
        if ((enabledSubstitutions & 2 /* ES2015SubstitutionFlags.BlockScopedBindings */) === 0) {
            enabledSubstitutions |= 2 /* ES2015SubstitutionFlags.BlockScopedBindings */;
            context.enableSubstitution(SyntaxKind.Identifier);
        }
    }
    /**
     * Enables a more costly code path for substitutions when we determine a source file
     * contains a captured `this`.
     */
    function enableSubstitutionsForCapturedThis() {
        if ((enabledSubstitutions & 1 /* ES2015SubstitutionFlags.CapturedThis */) === 0) {
            enabledSubstitutions |= 1 /* ES2015SubstitutionFlags.CapturedThis */;
            context.enableSubstitution(SyntaxKind.ThisKeyword);
            context.enableEmitNotification(SyntaxKind.Constructor);
            context.enableEmitNotification(SyntaxKind.MethodDeclaration);
            context.enableEmitNotification(SyntaxKind.GetAccessor);
            context.enableEmitNotification(SyntaxKind.SetAccessor);
            context.enableEmitNotification(SyntaxKind.ArrowFunction);
            context.enableEmitNotification(SyntaxKind.FunctionExpression);
            context.enableEmitNotification(SyntaxKind.FunctionDeclaration);
        }
    }
    /**
     * Hooks node substitutions.
     *
     * @param hint The context for the emitter.
     * @param node The node to substitute.
     */
    function onSubstituteNode(hint, node) {
        node = previousOnSubstituteNode(hint, node);
        if (hint === EmitHint.Expression) {
            return substituteExpression(node);
        }
        if (isIdentifier(node)) {
            return substituteIdentifier(node);
        }
        return node;
    }
    /**
     * Hooks substitutions for non-expression identifiers.
     */
    function substituteIdentifier(node) {
        // Only substitute the identifier if we have enabled substitutions for block-scoped
        // bindings.
        if (enabledSubstitutions & 2 /* ES2015SubstitutionFlags.BlockScopedBindings */ && !isInternalName(node)) {
            const original = getParseTreeNode(node, isIdentifier);
            if (original && isNameOfDeclarationWithCollidingName(original)) {
                return setTextRange(factory.getGeneratedNameForNode(original), node);
            }
        }
        return node;
    }
    /**
     * Determines whether a name is the name of a declaration with a colliding name.
     * NOTE: This function expects to be called with an original source tree node.
     *
     * @param node An original source tree node.
     */
    function isNameOfDeclarationWithCollidingName(node) {
        switch (node.parent.kind) {
            case SyntaxKind.BindingElement:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.VariableDeclaration:
                return node.parent.name === node
                    && resolver.isDeclarationWithCollidingName(node.parent);
        }
        return false;
    }
    /**
     * Substitutes an expression.
     *
     * @param node An Expression node.
     */
    function substituteExpression(node) {
        switch (node.kind) {
            case SyntaxKind.Identifier:
                return substituteExpressionIdentifier(node);
            case SyntaxKind.ThisKeyword:
                return substituteThisKeyword(node);
        }
        return node;
    }
    /**
     * Substitutes an expression identifier.
     *
     * @param node An Identifier node.
     */
    function substituteExpressionIdentifier(node) {
        if (enabledSubstitutions & 2 /* ES2015SubstitutionFlags.BlockScopedBindings */ && !isInternalName(node)) {
            const declaration = resolver.getReferencedDeclarationWithCollidingName(node);
            if (declaration && !(isClassLike(declaration) && isPartOfClassBody(declaration, node))) {
                return setTextRange(factory.getGeneratedNameForNode(getNameOfDeclaration(declaration)), node);
            }
        }
        return node;
    }
    function isPartOfClassBody(declaration, node) {
        let currentNode = getParseTreeNode(node);
        if (!currentNode || currentNode === declaration || currentNode.end <= declaration.pos || currentNode.pos >= declaration.end) {
            // if the node has no correlation to a parse tree node, its definitely not
            // part of the body.
            // if the node is outside of the document range of the declaration, its
            // definitely not part of the body.
            return false;
        }
        const blockScope = getEnclosingBlockScopeContainer(declaration);
        while (currentNode) {
            if (currentNode === blockScope || currentNode === declaration) {
                // if we are in the enclosing block scope of the declaration, we are definitely
                // not inside the class body.
                return false;
            }
            if (isClassElement(currentNode) && currentNode.parent === declaration) {
                return true;
            }
            currentNode = currentNode.parent;
        }
        return false;
    }
    /**
     * Substitutes `this` when contained within an arrow function.
     *
     * @param node The ThisKeyword node.
     */
    function substituteThisKeyword(node) {
        if (enabledSubstitutions & 1 /* ES2015SubstitutionFlags.CapturedThis */
            && hierarchyFacts & 16 /* HierarchyFacts.CapturesThis */) {
            return setTextRange(createCapturedThis(), node);
        }
        return node;
    }
    function getClassMemberPrefix(node, member) {
        return isStatic(member)
            ? factory.getInternalName(node)
            : factory.createPropertyAccessExpression(factory.getInternalName(node), "prototype");
    }
    function hasSynthesizedDefaultSuperCall(constructor, hasExtendsClause) {
        if (!constructor || !hasExtendsClause) {
            return false;
        }
        if (some(constructor.parameters)) {
            return false;
        }
        const statement = firstOrUndefined(constructor.body.statements);
        if (!statement || !nodeIsSynthesized(statement) || statement.kind !== SyntaxKind.ExpressionStatement) {
            return false;
        }
        const statementExpression = statement.expression;
        if (!nodeIsSynthesized(statementExpression) || statementExpression.kind !== SyntaxKind.CallExpression) {
            return false;
        }
        const callTarget = statementExpression.expression;
        if (!nodeIsSynthesized(callTarget) || callTarget.kind !== SyntaxKind.SuperKeyword) {
            return false;
        }
        const callArgument = singleOrUndefined(statementExpression.arguments);
        if (!callArgument || !nodeIsSynthesized(callArgument) || callArgument.kind !== SyntaxKind.SpreadElement) {
            return false;
        }
        const expression = callArgument.expression;
        return isIdentifier(expression) && expression.escapedText === "arguments";
    }
}
