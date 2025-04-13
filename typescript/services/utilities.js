import {
  addEmitFlags,
  addSyntheticLeadingComment,
  addSyntheticTrailingComment,
  assertType,
  AssignmentDeclarationKind,
  binarySearchKey,
  canHaveModifiers,
  cast,
  CharacterCodes,
  clone,
  combinePaths,
  compareTextSpans,
  compareValues,
  Comparison,
  contains,
  createRange,
  createScanner,
  createTextSpan,
  createTextSpanFromBounds,
  Debug,
  defaultMaximumTruncationLength,
  directoryProbablyExists,
  EmitFlags,
  emitModuleKindIsNonNodeESM,
  emptyArray,
  endsWith,
  ensureScriptKind,
  equateStringsCaseInsensitive,
  equateStringsCaseSensitive,
  escapeString,
  exclusivelyPrefixedNodeCoreModules,
  factory,
  filter,
  find,
  findAncestor,
  findConfigFile,
  first,
  firstDefined,
  firstOrUndefined,
  forEachAncestorDirectoryStoppingAtGlobalCache,
  forEachChild,
  forEachLeadingCommentRange,
  forEachTrailingCommentRange,
  formatStringFromArgs,
  formatting,
  getAssignmentDeclarationKind,
  getBaseFileName,
  getCombinedNodeFlagsAlwaysIncludeJSDoc,
  getDirectoryPath,
  getEmitModuleKind,
  getEmitScriptTarget,
  getExternalModuleImportEqualsDeclarationExpression,
  getImpliedNodeFormatForEmitWorker,
  getImpliedNodeFormatForFile,
  getImpliedNodeFormatForFileWorker,
  getIndentString,
  getJSDocEnumTag,
  getLastChild,
  getLineAndCharacterOfPosition,
  getLineStarts,
  getLocaleSpecificMessage,
  getModuleInstanceState,
  getNameOfDeclaration,
  getNodeId,
  getOriginalNode,
  getPackageNameFromTypesPackageName,
  getPathComponents,
  getRootDeclaration,
  getSourceFileOfNode,
  getSpanOfTokenAtPosition,
  getSymbolId,
  getTextOfIdentifierOrLiteral,
  getTextOfNode,
  getTypesPackageName,
  hasJSFileExtension,
  hasSyntacticModifier,
  hostGetCanonicalFileName,
  identifierIsThisKeyword,
  identity,
  idText,
  indexOfNode,
  InternalNodeBuilderFlags,
  InternalSymbolName,
  isAmbientModule,
  isAnyImportSyntax,
  isArray,
  isArrayBindingPattern,
  isArrayTypeNode,
  isAsExpression,
  isAwaitExpression,
  isBinaryExpression,
  isBindingElement,
  isBreakOrContinueStatement,
  isCallExpression,
  isCallOrNewExpression,
  isClassDeclaration,
  isClassExpression,
  isClassStaticBlockDeclaration,
  isConditionalTypeNode,
  isDeclaration,
  isDeclarationName,
  isDecorator,
  isDefaultClause,
  isDeleteExpression,
  isElementAccessExpression,
  isEntityName,
  isEnumDeclaration,
  isEnumMember,
  isExportAssignment,
  isExportDeclaration,
  isExportSpecifier,
  isExpression,
  isExpressionNode,
  isExternalModule,
  isExternalModuleImportEqualsDeclaration,
  isExternalModuleReference,
  isExternalModuleSymbol,
  isFileLevelUniqueName,
  isForInStatement,
  isForOfStatement,
  isFullSourceFile,
  isFunctionBlock,
  isFunctionDeclaration,
  isFunctionExpression,
  isFunctionLike,
  isGetAccessorDeclaration,
  isHeritageClause,
  isIdentifier,
  isIdentifierPart,
  isIdentifierStart,
  isImportCall,
  isImportClause,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportOrExportSpecifier,
  isImportSpecifier,
  isInferTypeNode,
  isInJSFile,
  isInterfaceDeclaration,
  isInternalModuleImportEqualsDeclaration,
  isJSDoc,
  isJSDocCommentContainingNode,
  isJSDocImportTag,
  isJSDocLink,
  isJSDocLinkCode,
  isJSDocLinkLike,
  isJSDocMemberName,
  isJSDocNameReference,
  isJSDocTag,
  isJSDocTemplateTag,
  isJSDocTypeAlias,
  isJsxElement,
  isJsxExpression,
  isJsxOpeningLikeElement,
  isJsxText,
  isKeyword,
  isLabeledStatement,
  isLet,
  isLiteralExpression,
  isLiteralTypeNode,
  isMappedTypeNode,
  isModifier,
  isModuleBlock,
  isModuleDeclaration,
  isNamedDeclaration,
  isNamedExports,
  isNamedImports,
  isNamespaceExport,
  isNamespaceImport,
  isNewExpression,
  isNumericLiteral,
  isObjectBindingPattern,
  isObjectLiteralExpression,
  isOptionalChain,
  isOptionalChainRoot,
  isParameter,
  isPartOfTypeNode,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  isPropertyNameLiteral,
  isQualifiedName,
  isRequireCall,
  isRequireVariableStatement,
  isRightSideOfQualifiedNameOrPropertyAccess,
  isRootedDiskPath,
  isSatisfiesExpression,
  isSetAccessorDeclaration,
  isSourceFile,
  isSourceFileJS,
  isStringANonContextualKeyword,
  isStringDoubleQuoted,
  isStringLiteral,
  isStringLiteralLike,
  isStringOrNumericLiteralLike,
  isStringTextContainingNode,
  isSyntaxList,
  isTaggedTemplateExpression,
  isTemplateLiteralKind,
  isToken,
  isTransientSymbol,
  isTypeAliasDeclaration,
  isTypeElement,
  isTypeNode,
  isTypeOfExpression,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypeReferenceNode,
  isVarConst,
  isVariableDeclarationList,
  isVoidExpression,
  isWhiteSpaceLike,
  isWhiteSpaceSingleLine,
  isYieldExpression,
  JsxEmit,
  last,
  lastOrUndefined,
  map,
  maybeBind,
  ModifierFlags,
  ModuleInstanceState,
  ModuleKind,
  ModuleResolutionKind,
  moduleSpecifiers,
  NewLineKind,
  NodeBuilderFlags,
  nodeCoreModules,
  NodeFlags,
  nodeIsMissing,
  nodeIsPresent,
  nodeIsSynthesized,
  normalizePath,
  notImplemented,
  or,
  OrganizeImports,
  PackageJsonDependencyGroup,
  parseBigInt,
  pathIsRelative,
  pseudoBigIntToString,
  rangeContainsRange,
  removeFileExtension,
  removeSuffix,
  ScriptElementKind,
  ScriptElementKindModifier,
  ScriptTarget,
  SemicolonPreference,
  setConfigFileInOptions,
  setOriginalNode,
  setParentRecursive,
  setTextRange,
  singleOrUndefined,
  skipAlias,
  skipOuterExpressions,
  skipParentheses,
  some,
  startsWith,
  stringToToken,
  stripQuotes,
  SymbolAccessibility,
  SymbolDisplayPartKind,
  SymbolFlags,
  SymbolFormatFlags,
  SyntaxKind,
  textChanges,
  textSpanContainsPosition,
  textSpanContainsTextSpan,
  textSpanEnd,
  tokenToString,
  toPath,
  toSorted,
  tryCast,
  tryParseJson,
  TypeFlags,
  TypeFormatFlags,
  unescapeLeadingUnderscores,
  visitEachChild,
  walkUpParenthesizedExpressions,
} from "./namespaces/ts.js";


// These utilities are common to multiple language service features.
// #region
/** @internal */
export const scanner = createScanner(ScriptTarget.Latest, /*skipTrivia*/ true);

/** @internal */
export var SemanticMeaning;
(function (SemanticMeaning) {
    SemanticMeaning[SemanticMeaning["None"] = 0] = "None";
    SemanticMeaning[SemanticMeaning["Value"] = 1] = "Value";
    SemanticMeaning[SemanticMeaning["Type"] = 2] = "Type";
    SemanticMeaning[SemanticMeaning["Namespace"] = 4] = "Namespace";
    SemanticMeaning[SemanticMeaning["All"] = 7] = "All";
})(SemanticMeaning || (SemanticMeaning = {}));

/** @internal */
export function getMeaningFromDeclaration(node) {
    switch (node.kind) {
        case SyntaxKind.VariableDeclaration:
            return isInJSFile(node) && getJSDocEnumTag(node) ? 7 /* SemanticMeaning.All */ : 1 /* SemanticMeaning.Value */;
        case SyntaxKind.Parameter:
        case SyntaxKind.BindingElement:
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.PropertySignature:
        case SyntaxKind.PropertyAssignment:
        case SyntaxKind.ShorthandPropertyAssignment:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.MethodSignature:
        case SyntaxKind.Constructor:
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.CatchClause:
        case SyntaxKind.JsxAttribute:
            return 1 /* SemanticMeaning.Value */;
        case SyntaxKind.TypeParameter:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.TypeAliasDeclaration:
        case SyntaxKind.TypeLiteral:
            return 2 /* SemanticMeaning.Type */;
        case SyntaxKind.JSDocTypedefTag:
            // If it has no name node, it shares the name with the value declaration below it.
            return node.name === undefined ? 1 /* SemanticMeaning.Value */ | 2 /* SemanticMeaning.Type */ : 2 /* SemanticMeaning.Type */;
        case SyntaxKind.EnumMember:
        case SyntaxKind.ClassDeclaration:
            return 1 /* SemanticMeaning.Value */ | 2 /* SemanticMeaning.Type */;
        case SyntaxKind.ModuleDeclaration:
            if (isAmbientModule(node)) {
                return 4 /* SemanticMeaning.Namespace */ | 1 /* SemanticMeaning.Value */;
            }
            else if (getModuleInstanceState(node) === ModuleInstanceState.Instantiated) {
                return 4 /* SemanticMeaning.Namespace */ | 1 /* SemanticMeaning.Value */;
            }
            else {
                return 4 /* SemanticMeaning.Namespace */;
            }
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.NamedImports:
        case SyntaxKind.ImportSpecifier:
        case SyntaxKind.ImportEqualsDeclaration:
        case SyntaxKind.ImportDeclaration:
        case SyntaxKind.ExportAssignment:
        case SyntaxKind.ExportDeclaration:
            return 7 /* SemanticMeaning.All */;
        // An external module can be a Value
        case SyntaxKind.SourceFile:
            return 4 /* SemanticMeaning.Namespace */ | 1 /* SemanticMeaning.Value */;
    }
    return 7 /* SemanticMeaning.All */;
}
/** @internal */
export function getMeaningFromLocation(node) {
    node = getAdjustedReferenceLocation(node);
    const parent = node.parent;
    if (node.kind === SyntaxKind.SourceFile) {
        return 1 /* SemanticMeaning.Value */;
    }
    else if (isExportAssignment(parent)
        || isExportSpecifier(parent)
        || isExternalModuleReference(parent)
        || isImportSpecifier(parent)
        || isImportClause(parent)
        || isImportEqualsDeclaration(parent) && node === parent.name) {
        return 7 /* SemanticMeaning.All */;
    }
    else if (isInRightSideOfInternalImportEqualsDeclaration(node)) {
        return getMeaningFromRightHandSideOfImportEquals(node);
    }
    else if (isDeclarationName(node)) {
        return getMeaningFromDeclaration(parent);
    }
    else if (isEntityName(node) && findAncestor(node, or(isJSDocNameReference, isJSDocLinkLike, isJSDocMemberName))) {
        return 7 /* SemanticMeaning.All */;
    }
    else if (isTypeReference(node)) {
        return 2 /* SemanticMeaning.Type */;
    }
    else if (isNamespaceReference(node)) {
        return 4 /* SemanticMeaning.Namespace */;
    }
    else if (isTypeParameterDeclaration(parent)) {
        Debug.assert(isJSDocTemplateTag(parent.parent)); // Else would be handled by isDeclarationName
        return 2 /* SemanticMeaning.Type */;
    }
    else if (isLiteralTypeNode(parent)) {
        // This might be T["name"], which is actually referencing a property and not a type. So allow both meanings.
        return 2 /* SemanticMeaning.Type */ | 1 /* SemanticMeaning.Value */;
    }
    else {
        return 1 /* SemanticMeaning.Value */;
    }
}
function getMeaningFromRightHandSideOfImportEquals(node) {
    //     import a = |b|; // Namespace
    //     import a = |b.c|; // Value, type, namespace
    //     import a = |b.c|.d; // Namespace
    const name = node.kind === SyntaxKind.QualifiedName ? node : isQualifiedName(node.parent) && node.parent.right === node ? node.parent : undefined;
    return name && name.parent.kind === SyntaxKind.ImportEqualsDeclaration ? 7 /* SemanticMeaning.All */ : 4 /* SemanticMeaning.Namespace */;
}
/** @internal */
export function isInRightSideOfInternalImportEqualsDeclaration(node) {
    while (node.parent.kind === SyntaxKind.QualifiedName) {
        node = node.parent;
    }
    return isInternalModuleImportEqualsDeclaration(node.parent) && node.parent.moduleReference === node;
}
function isNamespaceReference(node) {
    return isQualifiedNameNamespaceReference(node) || isPropertyAccessNamespaceReference(node);
}
function isQualifiedNameNamespaceReference(node) {
    let root = node;
    let isLastClause = true;
    if (root.parent.kind === SyntaxKind.QualifiedName) {
        while (root.parent && root.parent.kind === SyntaxKind.QualifiedName) {
            root = root.parent;
        }
        isLastClause = root.right === node;
    }
    return root.parent.kind === SyntaxKind.TypeReference && !isLastClause;
}
function isPropertyAccessNamespaceReference(node) {
    let root = node;
    let isLastClause = true;
    if (root.parent.kind === SyntaxKind.PropertyAccessExpression) {
        while (root.parent && root.parent.kind === SyntaxKind.PropertyAccessExpression) {
            root = root.parent;
        }
        isLastClause = root.name === node;
    }
    if (!isLastClause && root.parent.kind === SyntaxKind.ExpressionWithTypeArguments && root.parent.parent.kind === SyntaxKind.HeritageClause) {
        const decl = root.parent.parent.parent;
        return (decl.kind === SyntaxKind.ClassDeclaration && root.parent.parent.token === SyntaxKind.ImplementsKeyword) ||
            (decl.kind === SyntaxKind.InterfaceDeclaration && root.parent.parent.token === SyntaxKind.ExtendsKeyword);
    }
    return false;
}
function isTypeReference(node) {
    if (isRightSideOfQualifiedNameOrPropertyAccess(node)) {
        node = node.parent;
    }
    switch (node.kind) {
        case SyntaxKind.ThisKeyword:
            return !isExpressionNode(node);
        case SyntaxKind.ThisType:
            return true;
    }
    switch (node.parent.kind) {
        case SyntaxKind.TypeReference:
            return true;
        case SyntaxKind.ImportType:
            return !node.parent.isTypeOf;
        case SyntaxKind.ExpressionWithTypeArguments:
            return isPartOfTypeNode(node.parent);
    }
    return false;
}
/** @internal */
export function isCallExpressionTarget(node, includeElementAccess = false, skipPastOuterExpressions = false) {
    return isCalleeWorker(node, isCallExpression, selectExpressionOfCallOrNewExpressionOrDecorator, includeElementAccess, skipPastOuterExpressions);
}
/** @internal */
export function isNewExpressionTarget(node, includeElementAccess = false, skipPastOuterExpressions = false) {
    return isCalleeWorker(node, isNewExpression, selectExpressionOfCallOrNewExpressionOrDecorator, includeElementAccess, skipPastOuterExpressions);
}
/** @internal */
export function isCallOrNewExpressionTarget(node, includeElementAccess = false, skipPastOuterExpressions = false) {
    return isCalleeWorker(node, isCallOrNewExpression, selectExpressionOfCallOrNewExpressionOrDecorator, includeElementAccess, skipPastOuterExpressions);
}
/** @internal */
export function isTaggedTemplateTag(node, includeElementAccess = false, skipPastOuterExpressions = false) {
    return isCalleeWorker(node, isTaggedTemplateExpression, selectTagOfTaggedTemplateExpression, includeElementAccess, skipPastOuterExpressions);
}
/** @internal */
export function isDecoratorTarget(node, includeElementAccess = false, skipPastOuterExpressions = false) {
    return isCalleeWorker(node, isDecorator, selectExpressionOfCallOrNewExpressionOrDecorator, includeElementAccess, skipPastOuterExpressions);
}
/** @internal */
export function isJsxOpeningLikeElementTagName(node, includeElementAccess = false, skipPastOuterExpressions = false) {
    return isCalleeWorker(node, isJsxOpeningLikeElement, selectTagNameOfJsxOpeningLikeElement, includeElementAccess, skipPastOuterExpressions);
}
function selectExpressionOfCallOrNewExpressionOrDecorator(node) {
    return node.expression;
}
function selectTagOfTaggedTemplateExpression(node) {
    return node.tag;
}
function selectTagNameOfJsxOpeningLikeElement(node) {
    return node.tagName;
}
function isCalleeWorker(node, pred, calleeSelector, includeElementAccess, skipPastOuterExpressions) {
    let target = includeElementAccess ? climbPastPropertyOrElementAccess(node) : climbPastPropertyAccess(node);
    if (skipPastOuterExpressions) {
        target = skipOuterExpressions(target);
    }
    return !!target && !!target.parent && pred(target.parent) && calleeSelector(target.parent) === target;
}
/** @internal */
export function climbPastPropertyAccess(node) {
    return isRightSideOfPropertyAccess(node) ? node.parent : node;
}
function climbPastPropertyOrElementAccess(node) {
    return isRightSideOfPropertyAccess(node) || isArgumentExpressionOfElementAccess(node) ? node.parent : node;
}
/** @internal */
export function getTargetLabel(referenceNode, labelName) {
    while (referenceNode) {
        if (referenceNode.kind === SyntaxKind.LabeledStatement && referenceNode.label.escapedText === labelName) {
            return referenceNode.label;
        }
        referenceNode = referenceNode.parent;
    }
    return undefined;
}
/** @internal */
export function hasPropertyAccessExpressionWithName(node, funcName) {
    if (!isPropertyAccessExpression(node.expression)) {
        return false;
    }
    return node.expression.name.text === funcName;
}
/** @internal */
export function isJumpStatementTarget(node) {
    var _a;
    return isIdentifier(node) && ((_a = tryCast(node.parent, isBreakOrContinueStatement)) === null || _a === void 0 ? void 0 : _a.label) === node;
}
/** @internal */
export function isLabelOfLabeledStatement(node) {
    var _a;
    return isIdentifier(node) && ((_a = tryCast(node.parent, isLabeledStatement)) === null || _a === void 0 ? void 0 : _a.label) === node;
}
/** @internal */
export function isLabelName(node) {
    return isLabelOfLabeledStatement(node) || isJumpStatementTarget(node);
}
/** @internal */
export function isTagName(node) {
    var _a;
    return ((_a = tryCast(node.parent, isJSDocTag)) === null || _a === void 0 ? void 0 : _a.tagName) === node;
}
/** @internal */
export function isRightSideOfQualifiedName(node) {
    var _a;
    return ((_a = tryCast(node.parent, isQualifiedName)) === null || _a === void 0 ? void 0 : _a.right) === node;
}
/** @internal */
export function isRightSideOfPropertyAccess(node) {
    var _a;
    return ((_a = tryCast(node.parent, isPropertyAccessExpression)) === null || _a === void 0 ? void 0 : _a.name) === node;
}
/** @internal */
export function isArgumentExpressionOfElementAccess(node) {
    var _a;
    return ((_a = tryCast(node.parent, isElementAccessExpression)) === null || _a === void 0 ? void 0 : _a.argumentExpression) === node;
}
/** @internal */
export function isNameOfModuleDeclaration(node) {
    var _a;
    return ((_a = tryCast(node.parent, isModuleDeclaration)) === null || _a === void 0 ? void 0 : _a.name) === node;
}
/** @internal */
export function isNameOfFunctionDeclaration(node) {
    var _a;
    return isIdentifier(node) && ((_a = tryCast(node.parent, isFunctionLike)) === null || _a === void 0 ? void 0 : _a.name) === node;
}
/** @internal */
export function isLiteralNameOfPropertyDeclarationOrIndexAccess(node) {
    switch (node.parent.kind) {
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.PropertySignature:
        case SyntaxKind.PropertyAssignment:
        case SyntaxKind.EnumMember:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.MethodSignature:
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
        case SyntaxKind.ModuleDeclaration:
            return getNameOfDeclaration(node.parent) === node;
        case SyntaxKind.ElementAccessExpression:
            return node.parent.argumentExpression === node;
        case SyntaxKind.ComputedPropertyName:
            return true;
        case SyntaxKind.LiteralType:
            return node.parent.parent.kind === SyntaxKind.IndexedAccessType;
        default:
            return false;
    }
}
/** @internal */
export function isExpressionOfExternalModuleImportEqualsDeclaration(node) {
    return isExternalModuleImportEqualsDeclaration(node.parent.parent) &&
        getExternalModuleImportEqualsDeclarationExpression(node.parent.parent) === node;
}
/** @internal */
export function getContainerNode(node) {
    if (isJSDocTypeAlias(node)) {
        // This doesn't just apply to the node immediately under the comment, but to everything in its parent's scope.
        // node.parent = the JSDoc comment, node.parent.parent = the node having the comment.
        // Then we get parent again in the loop.
        node = node.parent.parent;
    }
    while (true) {
        node = node.parent;
        if (!node) {
            return undefined;
        }
        switch (node.kind) {
            case SyntaxKind.SourceFile:
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.MethodSignature:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.ModuleDeclaration:
                return node;
        }
    }
}
/** @internal */
export function getNodeKind(node) {
    switch (node.kind) {
        case SyntaxKind.SourceFile:
            return isExternalModule(node) ? ScriptElementKind.moduleElement : ScriptElementKind.scriptElement;
        case SyntaxKind.ModuleDeclaration:
            return ScriptElementKind.moduleElement;
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ClassExpression:
            return ScriptElementKind.classElement;
        case SyntaxKind.InterfaceDeclaration:
            return ScriptElementKind.interfaceElement;
        case SyntaxKind.TypeAliasDeclaration:
        case SyntaxKind.JSDocCallbackTag:
        case SyntaxKind.JSDocTypedefTag:
            return ScriptElementKind.typeElement;
        case SyntaxKind.EnumDeclaration:
            return ScriptElementKind.enumElement;
        case SyntaxKind.VariableDeclaration:
            return getKindOfVariableDeclaration(node);
        case SyntaxKind.BindingElement:
            return getKindOfVariableDeclaration(getRootDeclaration(node));
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
            return ScriptElementKind.functionElement;
        case SyntaxKind.GetAccessor:
            return ScriptElementKind.memberGetAccessorElement;
        case SyntaxKind.SetAccessor:
            return ScriptElementKind.memberSetAccessorElement;
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.MethodSignature:
            return ScriptElementKind.memberFunctionElement;
        case SyntaxKind.PropertyAssignment:
            const { initializer } = node;
            return isFunctionLike(initializer) ? ScriptElementKind.memberFunctionElement : ScriptElementKind.memberVariableElement;
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.PropertySignature:
        case SyntaxKind.ShorthandPropertyAssignment:
        case SyntaxKind.SpreadAssignment:
            return ScriptElementKind.memberVariableElement;
        case SyntaxKind.IndexSignature:
            return ScriptElementKind.indexSignatureElement;
        case SyntaxKind.ConstructSignature:
            return ScriptElementKind.constructSignatureElement;
        case SyntaxKind.CallSignature:
            return ScriptElementKind.callSignatureElement;
        case SyntaxKind.Constructor:
        case SyntaxKind.ClassStaticBlockDeclaration:
            return ScriptElementKind.constructorImplementationElement;
        case SyntaxKind.TypeParameter:
            return ScriptElementKind.typeParameterElement;
        case SyntaxKind.EnumMember:
            return ScriptElementKind.enumMemberElement;
        case SyntaxKind.Parameter:
            return hasSyntacticModifier(node, ModifierFlags.ParameterPropertyModifier) ? ScriptElementKind.memberVariableElement : ScriptElementKind.parameterElement;
        case SyntaxKind.ImportEqualsDeclaration:
        case SyntaxKind.ImportSpecifier:
        case SyntaxKind.ExportSpecifier:
        case SyntaxKind.NamespaceImport:
        case SyntaxKind.NamespaceExport:
            return ScriptElementKind.alias;
        case SyntaxKind.BinaryExpression:
            const kind = getAssignmentDeclarationKind(node);
            const { right } = node;
            switch (kind) {
                case AssignmentDeclarationKind.ObjectDefinePropertyValue:
                case AssignmentDeclarationKind.ObjectDefinePropertyExports:
                case AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
                case AssignmentDeclarationKind.None:
                    return ScriptElementKind.unknown;
                case AssignmentDeclarationKind.ExportsProperty:
                case AssignmentDeclarationKind.ModuleExports:
                    const rightKind = getNodeKind(right);
                    return rightKind === ScriptElementKind.unknown ? ScriptElementKind.constElement : rightKind;
                case AssignmentDeclarationKind.PrototypeProperty:
                    return isFunctionExpression(right) ? ScriptElementKind.memberFunctionElement : ScriptElementKind.memberVariableElement;
                case AssignmentDeclarationKind.ThisProperty:
                    return ScriptElementKind.memberVariableElement; // property
                case AssignmentDeclarationKind.Property:
                    // static method / property
                    return isFunctionExpression(right) ? ScriptElementKind.memberFunctionElement : ScriptElementKind.memberVariableElement;
                case AssignmentDeclarationKind.Prototype:
                    return ScriptElementKind.localClassElement;
                default: {
                    assertType(kind);
                    return ScriptElementKind.unknown;
                }
            }
        case SyntaxKind.Identifier:
            return isImportClause(node.parent) ? ScriptElementKind.alias : ScriptElementKind.unknown;
        case SyntaxKind.ExportAssignment:
            const scriptKind = getNodeKind(node.expression);
            // If the expression didn't come back with something (like it does for an identifiers)
            return scriptKind === ScriptElementKind.unknown ? ScriptElementKind.constElement : scriptKind;
        default:
            return ScriptElementKind.unknown;
    }
    function getKindOfVariableDeclaration(v) {
        return isVarConst(v)
            ? ScriptElementKind.constElement
            : isLet(v)
                ? ScriptElementKind.letElement
                : ScriptElementKind.variableElement;
    }
}
/** @internal */
export function isThis(node) {
    switch (node.kind) {
        case SyntaxKind.ThisKeyword:
            // case SyntaxKind.ThisType: TODO: GH#9267
            return true;
        case SyntaxKind.Identifier:
            // 'this' as a parameter
            return identifierIsThisKeyword(node) && node.parent.kind === SyntaxKind.Parameter;
        default:
            return false;
    }
}
// Matches the beginning of a triple slash directive
const tripleSlashDirectivePrefixRegex = /^\/\/\/\s*</;
/** @internal */
export function getLineStartPositionForPosition(position, sourceFile) {
    const lineStarts = getLineStarts(sourceFile);
    const line = sourceFile.getLineAndCharacterOfPosition(position).line;
    return lineStarts[line];
}
/** @internal */
export function rangeContainsRangeExclusive(r1, r2) {
    return rangeContainsPositionExclusive(r1, r2.pos) && rangeContainsPositionExclusive(r1, r2.end);
}
/** @internal */
export function rangeContainsPosition(r, pos) {
    return r.pos <= pos && pos <= r.end;
}
/** @internal */
export function rangeContainsPositionExclusive(r, pos) {
    return r.pos < pos && pos < r.end;
}
/** @internal */
export function rangeContainsStartEnd(range, start, end) {
    return range.pos <= start && range.end >= end;
}
/** @internal */
export function rangeOverlapsWithStartEnd(r1, start, end) {
    return startEndOverlapsWithStartEnd(r1.pos, r1.end, start, end);
}
/** @internal */
export function nodeOverlapsWithStartEnd(node, sourceFile, start, end) {
    return startEndOverlapsWithStartEnd(node.getStart(sourceFile), node.end, start, end);
}
/** @internal */
export function startEndOverlapsWithStartEnd(start1, end1, start2, end2) {
    const start = Math.max(start1, start2);
    const end = Math.min(end1, end2);
    return start < end;
}
/**
 * Assumes `candidate.start <= position` holds.
 *
 * @internal
 */
export function positionBelongsToNode(candidate, position, sourceFile) {
    Debug.assert(candidate.pos <= position);
    return position < candidate.end || !isCompletedNode(candidate, sourceFile);
}
function isCompletedNode(n, sourceFile) {
    if (n === undefined || nodeIsMissing(n)) {
        return false;
    }
    switch (n.kind) {
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.EnumDeclaration:
        case SyntaxKind.ObjectLiteralExpression:
        case SyntaxKind.ObjectBindingPattern:
        case SyntaxKind.TypeLiteral:
        case SyntaxKind.Block:
        case SyntaxKind.ModuleBlock:
        case SyntaxKind.CaseBlock:
        case SyntaxKind.NamedImports:
        case SyntaxKind.NamedExports:
            return nodeEndsWith(n, SyntaxKind.CloseBraceToken, sourceFile);
        case SyntaxKind.CatchClause:
            return isCompletedNode(n.block, sourceFile);
        case SyntaxKind.NewExpression:
            if (!n.arguments) {
                return true;
            }
        // falls through
        case SyntaxKind.CallExpression:
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.ParenthesizedType:
            return nodeEndsWith(n, SyntaxKind.CloseParenToken, sourceFile);
        case SyntaxKind.FunctionType:
        case SyntaxKind.ConstructorType:
            return isCompletedNode(n.type, sourceFile);
        case SyntaxKind.Constructor:
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.MethodSignature:
        case SyntaxKind.ConstructSignature:
        case SyntaxKind.CallSignature:
        case SyntaxKind.ArrowFunction:
            if (n.body) {
                return isCompletedNode(n.body, sourceFile);
            }
            if (n.type) {
                return isCompletedNode(n.type, sourceFile);
            }
            // Even though type parameters can be unclosed, we can get away with
            // having at least a closing paren.
            return hasChildOfKind(n, SyntaxKind.CloseParenToken, sourceFile);
        case SyntaxKind.ModuleDeclaration:
            return !!n.body && isCompletedNode(n.body, sourceFile);
        case SyntaxKind.IfStatement:
            if (n.elseStatement) {
                return isCompletedNode(n.elseStatement, sourceFile);
            }
            return isCompletedNode(n.thenStatement, sourceFile);
        case SyntaxKind.ExpressionStatement:
            return isCompletedNode(n.expression, sourceFile) ||
                hasChildOfKind(n, SyntaxKind.SemicolonToken, sourceFile);
        case SyntaxKind.ArrayLiteralExpression:
        case SyntaxKind.ArrayBindingPattern:
        case SyntaxKind.ElementAccessExpression:
        case SyntaxKind.ComputedPropertyName:
        case SyntaxKind.TupleType:
            return nodeEndsWith(n, SyntaxKind.CloseBracketToken, sourceFile);
        case SyntaxKind.IndexSignature:
            if (n.type) {
                return isCompletedNode(n.type, sourceFile);
            }
            return hasChildOfKind(n, SyntaxKind.CloseBracketToken, sourceFile);
        case SyntaxKind.CaseClause:
        case SyntaxKind.DefaultClause:
            // there is no such thing as terminator token for CaseClause/DefaultClause so for simplicity always consider them non-completed
            return false;
        case SyntaxKind.ForStatement:
        case SyntaxKind.ForInStatement:
        case SyntaxKind.ForOfStatement:
        case SyntaxKind.WhileStatement:
            return isCompletedNode(n.statement, sourceFile);
        case SyntaxKind.DoStatement:
            // rough approximation: if DoStatement has While keyword - then if node is completed is checking the presence of ')';
            return hasChildOfKind(n, SyntaxKind.WhileKeyword, sourceFile)
                ? nodeEndsWith(n, SyntaxKind.CloseParenToken, sourceFile)
                : isCompletedNode(n.statement, sourceFile);
        case SyntaxKind.TypeQuery:
            return isCompletedNode(n.exprName, sourceFile);
        case SyntaxKind.TypeOfExpression:
        case SyntaxKind.DeleteExpression:
        case SyntaxKind.VoidExpression:
        case SyntaxKind.YieldExpression:
        case SyntaxKind.SpreadElement:
            const unaryWordExpression = n;
            return isCompletedNode(unaryWordExpression.expression, sourceFile);
        case SyntaxKind.TaggedTemplateExpression:
            return isCompletedNode(n.template, sourceFile);
        case SyntaxKind.TemplateExpression:
            const lastSpan = lastOrUndefined(n.templateSpans);
            return isCompletedNode(lastSpan, sourceFile);
        case SyntaxKind.TemplateSpan:
            return nodeIsPresent(n.literal);
        case SyntaxKind.ExportDeclaration:
        case SyntaxKind.ImportDeclaration:
            return nodeIsPresent(n.moduleSpecifier);
        case SyntaxKind.PrefixUnaryExpression:
            return isCompletedNode(n.operand, sourceFile);
        case SyntaxKind.BinaryExpression:
            return isCompletedNode(n.right, sourceFile);
        case SyntaxKind.ConditionalExpression:
            return isCompletedNode(n.whenFalse, sourceFile);
        default:
            return true;
    }
}
/*
 * Checks if node ends with 'expectedLastToken'.
 * If child at position 'length - 1' is 'SemicolonToken' it is skipped and 'expectedLastToken' is compared with child at position 'length - 2'.
 */
function nodeEndsWith(n, expectedLastToken, sourceFile) {
    const children = n.getChildren(sourceFile);
    if (children.length) {
        const lastChild = last(children);
        if (lastChild.kind === expectedLastToken) {
            return true;
        }
        else if (lastChild.kind === SyntaxKind.SemicolonToken && children.length !== 1) {
            return children[children.length - 2].kind === expectedLastToken;
        }
    }
    return false;
}
/** @internal */
export function findListItemInfo(node) {
    const list = findContainingList(node);
    // It is possible at this point for syntaxList to be undefined, either if
    // node.parent had no list child, or if none of its list children contained
    // the span of node. If this happens, return undefined. The caller should
    // handle this case.
    if (!list) {
        return undefined;
    }
    const children = list.getChildren();
    const listItemIndex = indexOfNode(children, node);
    return {
        listItemIndex,
        list,
    };
}
function hasChildOfKind(n, kind, sourceFile) {
    return !!findChildOfKind(n, kind, sourceFile);
}
/** @internal */
export function findChildOfKind(n, kind, sourceFile) {
    return find(n.getChildren(sourceFile), (c) => c.kind === kind);
}
/** @internal */
export function findContainingList(node) {
    // The node might be a list element (nonsynthetic) or a comma (synthetic). Either way, it will
    // be parented by the container of the SyntaxList, not the SyntaxList itself.
    // In order to find the list item index, we first need to locate SyntaxList itself and then search
    // for the position of the relevant node (or comma).
    const syntaxList = find(node.parent.getChildren(), (c) => isSyntaxList(c) && rangeContainsRange(c, node));
    // Either we didn't find an appropriate list, or the list must contain us.
    Debug.assert(!syntaxList || contains(syntaxList.getChildren(), node));
    return syntaxList;
}
function isDefaultModifier(node) {
    return node.kind === SyntaxKind.DefaultKeyword;
}
function isClassKeyword(node) {
    return node.kind === SyntaxKind.ClassKeyword;
}
function isFunctionKeyword(node) {
    return node.kind === SyntaxKind.FunctionKeyword;
}
function getAdjustedLocationForClass(node) {
    if (isNamedDeclaration(node)) {
        return node.name;
    }
    if (isClassDeclaration(node)) {
        // for class and function declarations, use the `default` modifier
        // when the declaration is unnamed.
        const defaultModifier = node.modifiers && find(node.modifiers, isDefaultModifier);
        if (defaultModifier)
            return defaultModifier;
    }
    if (isClassExpression(node)) {
        // for class expressions, use the `class` keyword when the class is unnamed
        const classKeyword = find(node.getChildren(), isClassKeyword);
        if (classKeyword)
            return classKeyword;
    }
}
function getAdjustedLocationForFunction(node) {
    if (isNamedDeclaration(node)) {
        return node.name;
    }
    if (isFunctionDeclaration(node)) {
        // for class and function declarations, use the `default` modifier
        // when the declaration is unnamed.
        const defaultModifier = find(node.modifiers, isDefaultModifier);
        if (defaultModifier)
            return defaultModifier;
    }
    if (isFunctionExpression(node)) {
        // for function expressions, use the `function` keyword when the function is unnamed
        const functionKeyword = find(node.getChildren(), isFunctionKeyword);
        if (functionKeyword)
            return functionKeyword;
    }
}
function getAncestorTypeNode(node) {
    let lastTypeNode;
    findAncestor(node, a => {
        if (isTypeNode(a)) {
            lastTypeNode = a;
        }
        return !isQualifiedName(a.parent) && !isTypeNode(a.parent) && !isTypeElement(a.parent);
    });
    return lastTypeNode;
}
/** @internal */
export function getContextualTypeFromParentOrAncestorTypeNode(node, checker) {
    if (node.flags & (NodeFlags.JSDoc & ~NodeFlags.JavaScriptFile))
        return undefined;
    const contextualType = getContextualTypeFromParent(node, checker);
    if (contextualType)
        return contextualType;
    const ancestorTypeNode = getAncestorTypeNode(node);
    return ancestorTypeNode && checker.getTypeAtLocation(ancestorTypeNode);
}
function getAdjustedLocationForDeclaration(node, forRename) {
    if (!forRename) {
        switch (node.kind) {
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.ClassExpression:
                return getAdjustedLocationForClass(node);
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.FunctionExpression:
                return getAdjustedLocationForFunction(node);
            case SyntaxKind.Constructor:
                return node;
        }
    }
    if (isNamedDeclaration(node)) {
        return node.name;
    }
}
function getAdjustedLocationForImportDeclaration(node, forRename) {
    if (node.importClause) {
        if (node.importClause.name && node.importClause.namedBindings) {
            // do not adjust if we have both a name and named bindings
            return;
        }
        // /**/import [|name|] from ...;
        // import /**/type [|name|] from ...;
        if (node.importClause.name) {
            return node.importClause.name;
        }
        // /**/import { [|name|] } from ...;
        // /**/import { propertyName as [|name|] } from ...;
        // /**/import * as [|name|] from ...;
        // import /**/type { [|name|] } from ...;
        // import /**/type { propertyName as [|name|] } from ...;
        // import /**/type * as [|name|] from ...;
        if (node.importClause.namedBindings) {
            if (isNamedImports(node.importClause.namedBindings)) {
                // do nothing if there is more than one binding
                const onlyBinding = singleOrUndefined(node.importClause.namedBindings.elements);
                if (!onlyBinding) {
                    return;
                }
                return onlyBinding.name;
            }
            else if (isNamespaceImport(node.importClause.namedBindings)) {
                return node.importClause.namedBindings.name;
            }
        }
    }
    if (!forRename) {
        // /**/import "[|module|]";
        // /**/import ... from "[|module|]";
        // import /**/type ... from "[|module|]";
        return node.moduleSpecifier;
    }
}
function getAdjustedLocationForExportDeclaration(node, forRename) {
    if (node.exportClause) {
        // /**/export { [|name|] } ...
        // /**/export { propertyName as [|name|] } ...
        // /**/export * as [|name|] ...
        // export /**/type { [|name|] } from ...
        // export /**/type { propertyName as [|name|] } from ...
        // export /**/type * as [|name|] ...
        if (isNamedExports(node.exportClause)) {
            // do nothing if there is more than one binding
            const onlyBinding = singleOrUndefined(node.exportClause.elements);
            if (!onlyBinding) {
                return;
            }
            return node.exportClause.elements[0].name;
        }
        else if (isNamespaceExport(node.exportClause)) {
            return node.exportClause.name;
        }
    }
    if (!forRename) {
        // /**/export * from "[|module|]";
        // export /**/type * from "[|module|]";
        return node.moduleSpecifier;
    }
}
function getAdjustedLocationForHeritageClause(node) {
    // /**/extends [|name|]
    // /**/implements [|name|]
    if (node.types.length === 1) {
        return node.types[0].expression;
    }
    // /**/extends name1, name2 ...
    // /**/implements name1, name2 ...
}
function getAdjustedLocation(node, forRename) {
    const { parent } = node;
    // /**/<modifier> [|name|] ...
    // /**/<modifier> <class|interface|type|enum|module|namespace|function|get|set> [|name|] ...
    // /**/<class|interface|type|enum|module|namespace|function|get|set> [|name|] ...
    // /**/import [|name|] = ...
    //
    // NOTE: If the node is a modifier, we don't adjust its location if it is the `default` modifier as that is handled
    // specially by `getSymbolAtLocation`.
    if (isModifier(node) && (forRename || node.kind !== SyntaxKind.DefaultKeyword) ? canHaveModifiers(parent) && contains(parent.modifiers, node) :
        node.kind === SyntaxKind.ClassKeyword ? isClassDeclaration(parent) || isClassExpression(node) :
            node.kind === SyntaxKind.FunctionKeyword ? isFunctionDeclaration(parent) || isFunctionExpression(node) :
                node.kind === SyntaxKind.InterfaceKeyword ? isInterfaceDeclaration(parent) :
                    node.kind === SyntaxKind.EnumKeyword ? isEnumDeclaration(parent) :
                        node.kind === SyntaxKind.TypeKeyword ? isTypeAliasDeclaration(parent) :
                            node.kind === SyntaxKind.NamespaceKeyword || node.kind === SyntaxKind.ModuleKeyword ? isModuleDeclaration(parent) :
                                node.kind === SyntaxKind.ImportKeyword ? isImportEqualsDeclaration(parent) :
                                    node.kind === SyntaxKind.GetKeyword ? isGetAccessorDeclaration(parent) :
                                        node.kind === SyntaxKind.SetKeyword && isSetAccessorDeclaration(parent)) {
        const location = getAdjustedLocationForDeclaration(parent, forRename);
        if (location) {
            return location;
        }
    }
    // /**/<var|let|const> [|name|] ...
    if ((node.kind === SyntaxKind.VarKeyword || node.kind === SyntaxKind.ConstKeyword || node.kind === SyntaxKind.LetKeyword) &&
        isVariableDeclarationList(parent) && parent.declarations.length === 1) {
        const decl = parent.declarations[0];
        if (isIdentifier(decl.name)) {
            return decl.name;
        }
    }
    if (node.kind === SyntaxKind.TypeKeyword) {
        // import /**/type [|name|] from ...;
        // import /**/type { [|name|] } from ...;
        // import /**/type { propertyName as [|name|] } from ...;
        // import /**/type ... from "[|module|]";
        if (isImportClause(parent) && parent.isTypeOnly) {
            const location = getAdjustedLocationForImportDeclaration(parent.parent, forRename);
            if (location) {
                return location;
            }
        }
        // export /**/type { [|name|] } from ...;
        // export /**/type { propertyName as [|name|] } from ...;
        // export /**/type * from "[|module|]";
        // export /**/type * as ... from "[|module|]";
        if (isExportDeclaration(parent) && parent.isTypeOnly) {
            const location = getAdjustedLocationForExportDeclaration(parent, forRename);
            if (location) {
                return location;
            }
        }
    }
    // import { propertyName /**/as [|name|] } ...
    // import * /**/as [|name|] ...
    // export { propertyName /**/as [|name|] } ...
    // export * /**/as [|name|] ...
    if (node.kind === SyntaxKind.AsKeyword) {
        if (isImportSpecifier(parent) && parent.propertyName ||
            isExportSpecifier(parent) && parent.propertyName ||
            isNamespaceImport(parent) ||
            isNamespaceExport(parent)) {
            return parent.name;
        }
        if (isExportDeclaration(parent) && parent.exportClause && isNamespaceExport(parent.exportClause)) {
            return parent.exportClause.name;
        }
    }
    // /**/import [|name|] from ...;
    // /**/import { [|name|] } from ...;
    // /**/import { propertyName as [|name|] } from ...;
    // /**/import ... from "[|module|]";
    // /**/import "[|module|]";
    if (node.kind === SyntaxKind.ImportKeyword && isImportDeclaration(parent)) {
        const location = getAdjustedLocationForImportDeclaration(parent, forRename);
        if (location) {
            return location;
        }
    }
    if (node.kind === SyntaxKind.ExportKeyword) {
        // /**/export { [|name|] } ...;
        // /**/export { propertyName as [|name|] } ...;
        // /**/export * from "[|module|]";
        // /**/export * as ... from "[|module|]";
        if (isExportDeclaration(parent)) {
            const location = getAdjustedLocationForExportDeclaration(parent, forRename);
            if (location) {
                return location;
            }
        }
        // NOTE: We don't adjust the location of the `default` keyword as that is handled specially by `getSymbolAtLocation`.
        // /**/export default [|name|];
        // /**/export = [|name|];
        if (isExportAssignment(parent)) {
            return skipOuterExpressions(parent.expression);
        }
    }
    // import name = /**/require("[|module|]");
    if (node.kind === SyntaxKind.RequireKeyword && isExternalModuleReference(parent)) {
        return parent.expression;
    }
    // import ... /**/from "[|module|]";
    // export ... /**/from "[|module|]";
    if (node.kind === SyntaxKind.FromKeyword && (isImportDeclaration(parent) || isExportDeclaration(parent)) && parent.moduleSpecifier) {
        return parent.moduleSpecifier;
    }
    // class ... /**/extends [|name|] ...
    // class ... /**/implements [|name|] ...
    // class ... /**/implements name1, name2 ...
    // interface ... /**/extends [|name|] ...
    // interface ... /**/extends name1, name2 ...
    if ((node.kind === SyntaxKind.ExtendsKeyword || node.kind === SyntaxKind.ImplementsKeyword) && isHeritageClause(parent) && parent.token === node.kind) {
        const location = getAdjustedLocationForHeritageClause(parent);
        if (location) {
            return location;
        }
    }
    if (node.kind === SyntaxKind.ExtendsKeyword) {
        // ... <T /**/extends [|U|]> ...
        if (isTypeParameterDeclaration(parent) && parent.constraint && isTypeReferenceNode(parent.constraint)) {
            return parent.constraint.typeName;
        }
        // ... T /**/extends [|U|] ? ...
        if (isConditionalTypeNode(parent) && isTypeReferenceNode(parent.extendsType)) {
            return parent.extendsType.typeName;
        }
    }
    // ... T extends /**/infer [|U|] ? ...
    if (node.kind === SyntaxKind.InferKeyword && isInferTypeNode(parent)) {
        return parent.typeParameter.name;
    }
    // { [ [|K|] /**/in keyof T]: ... }
    if (node.kind === SyntaxKind.InKeyword && isTypeParameterDeclaration(parent) && isMappedTypeNode(parent.parent)) {
        return parent.name;
    }
    // /**/keyof [|T|]
    if (node.kind === SyntaxKind.KeyOfKeyword && isTypeOperatorNode(parent) && parent.operator === SyntaxKind.KeyOfKeyword &&
        isTypeReferenceNode(parent.type)) {
        return parent.type.typeName;
    }
    // /**/readonly [|name|][]
    if (node.kind === SyntaxKind.ReadonlyKeyword && isTypeOperatorNode(parent) && parent.operator === SyntaxKind.ReadonlyKeyword &&
        isArrayTypeNode(parent.type) && isTypeReferenceNode(parent.type.elementType)) {
        return parent.type.elementType.typeName;
    }
    if (!forRename) {
        // /**/new [|name|]
        // /**/void [|name|]
        // /**/void obj.[|name|]
        // /**/typeof [|name|]
        // /**/typeof obj.[|name|]
        // /**/await [|name|]
        // /**/await obj.[|name|]
        // /**/yield [|name|]
        // /**/yield obj.[|name|]
        // /**/delete obj.[|name|]
        if (node.kind === SyntaxKind.NewKeyword && isNewExpression(parent) ||
            node.kind === SyntaxKind.VoidKeyword && isVoidExpression(parent) ||
            node.kind === SyntaxKind.TypeOfKeyword && isTypeOfExpression(parent) ||
            node.kind === SyntaxKind.AwaitKeyword && isAwaitExpression(parent) ||
            node.kind === SyntaxKind.YieldKeyword && isYieldExpression(parent) ||
            node.kind === SyntaxKind.DeleteKeyword && isDeleteExpression(parent)) {
            if (parent.expression) {
                return skipOuterExpressions(parent.expression);
            }
        }
        // left /**/in [|name|]
        // left /**/instanceof [|name|]
        if ((node.kind === SyntaxKind.InKeyword || node.kind === SyntaxKind.InstanceOfKeyword) && isBinaryExpression(parent) && parent.operatorToken === node) {
            return skipOuterExpressions(parent.right);
        }
        // left /**/as [|name|]
        if (node.kind === SyntaxKind.AsKeyword && isAsExpression(parent) && isTypeReferenceNode(parent.type)) {
            return parent.type.typeName;
        }
        // for (... /**/in [|name|])
        // for (... /**/of [|name|])
        if (node.kind === SyntaxKind.InKeyword && isForInStatement(parent) ||
            node.kind === SyntaxKind.OfKeyword && isForOfStatement(parent)) {
            return skipOuterExpressions(parent.expression);
        }
    }
    return node;
}
/**
 * Adjusts the location used for "find references" and "go to definition" when the cursor was not
 * on a property name.
 *
 * @internal
 */
export function getAdjustedReferenceLocation(node) {
    return getAdjustedLocation(node, /*forRename*/ false);
}
/**
 * Adjusts the location used for "rename" when the cursor was not on a property name.
 *
 * @internal
 */
export function getAdjustedRenameLocation(node) {
    return getAdjustedLocation(node, /*forRename*/ true);
}
/**
 * Gets the token whose text has range [start, end) and
 * position >= start and (position < end or (position === end && token is literal or keyword or identifier))
 *
 * @internal
 */
export function getTouchingPropertyName(sourceFile, position) {
    return getTouchingToken(sourceFile, position, n => isPropertyNameLiteral(n) || isKeyword(n.kind) || isPrivateIdentifier(n));
}
/**
 * Returns the token if position is in [start, end).
 * If position === end, returns the preceding token if includeItemAtEndPosition(previousToken) === true
 *
 * @internal
 */
export function getTouchingToken(sourceFile, position, includePrecedingTokenAtEndPosition) {
    return getTokenAtPositionWorker(sourceFile, position, /*allowPositionInLeadingTrivia*/ false, includePrecedingTokenAtEndPosition, /*includeEndPosition*/ false);
}
/**
 * Returns a token if position is in [start-of-leading-trivia, end)
 *
 * @internal
 */
export function getTokenAtPosition(sourceFile, position) {
    return getTokenAtPositionWorker(sourceFile, position, /*allowPositionInLeadingTrivia*/ true, /*includePrecedingTokenAtEndPosition*/ undefined, /*includeEndPosition*/ false);
}
/** Get the token whose text contains the position */
function getTokenAtPositionWorker(sourceFile, position, allowPositionInLeadingTrivia, includePrecedingTokenAtEndPosition, includeEndPosition) {
    let current = sourceFile;
    let foundToken;
    outer: while (true) {
        // find the child that contains 'position'
        const children = current.getChildren(sourceFile);
        const i = binarySearchKey(children, position, (_, i) => i, (middle, _) => {
            // This last callback is more of a selector than a comparator -
            // `EqualTo` causes the `middle` result to be returned
            // `GreaterThan` causes recursion on the left of the middle
            // `LessThan` causes recursion on the right of the middle
            // Let's say you have 3 nodes, spanning positons
            // pos: 1, end: 3
            // pos: 3, end: 3
            // pos: 3, end: 5
            // and you're looking for the token at positon 3 - all 3 of these nodes are overlapping with position 3.
            // In fact, there's a _good argument_ that node 2 shouldn't even be allowed to exist - depending on if
            // the start or end of the ranges are considered inclusive, it's either wholly subsumed by the first or the last node.
            // Unfortunately, such nodes do exist. :( - See fourslash/completionsImport_tsx.tsx - empty jsx attributes create
            // a zero-length node.
            // What also you may not expect is that which node we return depends on the includePrecedingTokenAtEndPosition flag.
            // Specifically, if includePrecedingTokenAtEndPosition is set, we return the 1-3 node, while if it's unset, we
            // return the 3-5 node. (The zero length node is never correct.) This is because the includePrecedingTokenAtEndPosition
            // flag causes us to return the first node whose end position matches the position and which produces and acceptable token
            // kind. Meanwhile, if includePrecedingTokenAtEndPosition is unset, we look for the first node whose start is <= the
            // position and whose end is greater than the position.
            // There are more sophisticated end tests later, but this one is very fast
            // and allows us to skip a bunch of work
            const end = children[middle].getEnd();
            if (end < position) {
                return Comparison.LessThan;
            }
            const start = allowPositionInLeadingTrivia ? children[middle].getFullStart() : children[middle].getStart(sourceFile, /*includeJsDocComment*/ true);
            if (start > position) {
                return Comparison.GreaterThan;
            }
            // first element whose start position is before the input and whose end position is after or equal to the input
            if (nodeContainsPosition(children[middle], start, end)) {
                if (children[middle - 1]) {
                    // we want the _first_ element that contains the position, so left-recur if the prior node also contains the position
                    if (nodeContainsPosition(children[middle - 1])) {
                        return Comparison.GreaterThan;
                    }
                }
                return Comparison.EqualTo;
            }
            // this complex condition makes us left-recur around a zero-length node when includePrecedingTokenAtEndPosition is set, rather than right-recur on it
            if (includePrecedingTokenAtEndPosition && start === position && children[middle - 1] && children[middle - 1].getEnd() === position && nodeContainsPosition(children[middle - 1])) {
                return Comparison.GreaterThan;
            }
            return Comparison.LessThan;
        });
        if (foundToken) {
            return foundToken;
        }
        if (i >= 0 && children[i]) {
            current = children[i];
            continue outer;
        }
        return current;
    }
    function nodeContainsPosition(node, start, end) {
        end !== null && end !== void 0 ? end : (end = node.getEnd());
        if (end < position) {
            return false;
        }
        start !== null && start !== void 0 ? start : (start = allowPositionInLeadingTrivia ? node.getFullStart() : node.getStart(sourceFile, /*includeJsDocComment*/ true));
        if (start > position) {
            // If this child begins after position, then all subsequent children will as well.
            return false;
        }
        if (position < end || (position === end && (node.kind === SyntaxKind.EndOfFileToken || includeEndPosition))) {
            return true;
        }
        else if (includePrecedingTokenAtEndPosition && end === position) {
            const previousToken = findPrecedingToken(position, sourceFile, node);
            if (previousToken && includePrecedingTokenAtEndPosition(previousToken)) {
                foundToken = previousToken;
                return true;
            }
        }
        return false;
    }
}
/**
 * Returns the first token where position is in [start, end),
 * excluding `JsxText` tokens containing only whitespace.
 *
 * @internal
 */
export function findFirstNonJsxWhitespaceToken(sourceFile, position) {
    let tokenAtPosition = getTokenAtPosition(sourceFile, position);
    while (isWhiteSpaceOnlyJsxText(tokenAtPosition)) {
        const nextToken = findNextToken(tokenAtPosition, tokenAtPosition.parent, sourceFile);
        if (!nextToken)
            return;
        tokenAtPosition = nextToken;
    }
    return tokenAtPosition;
}
/**
 * The token on the left of the position is the token that strictly includes the position
 * or sits to the left of the cursor if it is on a boundary. For example
 *
 *   fo|o               -> will return foo
 *   foo <comment> |bar -> will return foo
 *
 * @internal
 */
export function findTokenOnLeftOfPosition(file, position) {
    // Ideally, getTokenAtPosition should return a token. However, it is currently
    // broken, so we do a check to make sure the result was indeed a token.
    const tokenAtPosition = getTokenAtPosition(file, position);
    if (isToken(tokenAtPosition) && position > tokenAtPosition.getStart(file) && position < tokenAtPosition.getEnd()) {
        return tokenAtPosition;
    }
    return findPrecedingToken(position, file);
}
/** @internal */
export function findNextToken(previousToken, parent, sourceFile) {
    return find(parent);
    function find(n) {
        if (isToken(n) && n.pos === previousToken.end) {
            // this is token that starts at the end of previous token - return it
            return n;
        }
        return firstDefined(n.getChildren(sourceFile), child => {
            const shouldDiveInChildNode = 
            // previous token is enclosed somewhere in the child
            (child.pos <= previousToken.pos && child.end > previousToken.end) ||
                // previous token ends exactly at the beginning of child
                (child.pos === previousToken.end);
            return shouldDiveInChildNode && nodeHasTokens(child, sourceFile) ? find(child) : undefined;
        });
    }
}
/** @internal */
export function findPrecedingToken(position, sourceFile, startNode, excludeJsdoc) {
    const result = find((startNode || sourceFile));
    Debug.assert(!(result && isWhiteSpaceOnlyJsxText(result)));
    return result;
    function find(n) {
        if (isNonWhitespaceToken(n) && n.kind !== SyntaxKind.EndOfFileToken) {
            return n;
        }
        const children = n.getChildren(sourceFile);
        const i = binarySearchKey(children, position, (_, i) => i, (middle, _) => {
            // This last callback is more of a selector than a comparator -
            // `EqualTo` causes the `middle` result to be returned
            // `GreaterThan` causes recursion on the left of the middle
            // `LessThan` causes recursion on the right of the middle
            if (position < children[middle].end) {
                // first element whose end position is greater than the input position
                if (!children[middle - 1] || position >= children[middle - 1].end) {
                    return Comparison.EqualTo;
                }
                return Comparison.GreaterThan;
            }
            return Comparison.LessThan;
        });
        if (i >= 0 && children[i]) {
            const child = children[i];
            // Note that the span of a node's tokens is [node.getStart(...), node.end).
            // Given that `position < child.end` and child has constituent tokens, we distinguish these cases:
            // 1) `position` precedes `child`'s tokens or `child` has no tokens (ie: in a comment or whitespace preceding `child`):
            // we need to find the last token in a previous child.
            // 2) `position` is within the same span: we recurse on `child`.
            if (position < child.end) {
                const start = child.getStart(sourceFile, /*includeJsDoc*/ !excludeJsdoc);
                const lookInPreviousChild = (start >= position) || // cursor in the leading trivia
                    !nodeHasTokens(child, sourceFile) ||
                    isWhiteSpaceOnlyJsxText(child);
                if (lookInPreviousChild) {
                    // actual start of the node is past the position - previous token should be at the end of previous child
                    const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ i, sourceFile, n.kind);
                    if (candidate) {
                        // Ensure we recurse into JSDoc nodes with children.
                        if (!excludeJsdoc && isJSDocCommentContainingNode(candidate) && candidate.getChildren(sourceFile).length) {
                            return find(candidate);
                        }
                        return findRightmostToken(candidate, sourceFile);
                    }
                    return undefined;
                }
                else {
                    // candidate should be in this node
                    return find(child);
                }
            }
        }
        Debug.assert(startNode !== undefined || n.kind === SyntaxKind.SourceFile || n.kind === SyntaxKind.EndOfFileToken || isJSDocCommentContainingNode(n));
        // Here we know that none of child token nodes embrace the position,
        // the only known case is when position is at the end of the file.
        // Try to find the rightmost token in the file without filtering.
        // Namely we are skipping the check: 'position < node.end'
        const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length, sourceFile, n.kind);
        return candidate && findRightmostToken(candidate, sourceFile);
    }
}
function isNonWhitespaceToken(n) {
    return isToken(n) && !isWhiteSpaceOnlyJsxText(n);
}
function findRightmostToken(n, sourceFile) {
    if (isNonWhitespaceToken(n)) {
        return n;
    }
    const children = n.getChildren(sourceFile);
    if (children.length === 0) {
        return n;
    }
    const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length, sourceFile, n.kind);
    return candidate && findRightmostToken(candidate, sourceFile);
}
/**
 * Finds the rightmost child to the left of `children[exclusiveStartPosition]` which is a non-all-whitespace token or has constituent tokens.
 */
function findRightmostChildNodeWithTokens(children, exclusiveStartPosition, sourceFile, parentKind) {
    for (let i = exclusiveStartPosition - 1; i >= 0; i--) {
        const child = children[i];
        if (isWhiteSpaceOnlyJsxText(child)) {
            if (i === 0 && (parentKind === SyntaxKind.JsxText || parentKind === SyntaxKind.JsxSelfClosingElement)) {
                Debug.fail("`JsxText` tokens should not be the first child of `JsxElement | JsxSelfClosingElement`");
            }
        }
        else if (nodeHasTokens(children[i], sourceFile)) {
            return children[i];
        }
    }
}
/** @internal */
export function isInString(sourceFile, position, previousToken = findPrecedingToken(position, sourceFile)) {
    if (previousToken && isStringTextContainingNode(previousToken)) {
        const start = previousToken.getStart(sourceFile);
        const end = previousToken.getEnd();
        // To be "in" one of these literals, the position has to be:
        //   1. entirely within the token text.
        //   2. at the end position of an unterminated token.
        //   3. at the end of a regular expression (due to trailing flags like '/foo/g').
        if (start < position && position < end) {
            return true;
        }
        if (position === end) {
            return !!previousToken.isUnterminated;
        }
    }
    return false;
}
/**
 * @internal
 */
export function isInsideJsxElementOrAttribute(sourceFile, position) {
    const token = getTokenAtPosition(sourceFile, position);
    if (!token) {
        return false;
    }
    if (token.kind === SyntaxKind.JsxText) {
        return true;
    }
    // <div>Hello |</div>
    if (token.kind === SyntaxKind.LessThanToken && token.parent.kind === SyntaxKind.JsxText) {
        return true;
    }
    // <div> { | </div> or <div a={| </div>
    if (token.kind === SyntaxKind.LessThanToken && token.parent.kind === SyntaxKind.JsxExpression) {
        return true;
    }
    // <div> {
    // |
    // } < /div>
    if (token && token.kind === SyntaxKind.CloseBraceToken && token.parent.kind === SyntaxKind.JsxExpression) {
        return true;
    }
    // <div>|</div>
    if (token.kind === SyntaxKind.LessThanToken && token.parent.kind === SyntaxKind.JsxClosingElement) {
        return true;
    }
    return false;
}
function isWhiteSpaceOnlyJsxText(node) {
    return isJsxText(node) && node.containsOnlyTriviaWhiteSpaces;
}
/** @internal */
export function isInTemplateString(sourceFile, position) {
    const token = getTokenAtPosition(sourceFile, position);
    return isTemplateLiteralKind(token.kind) && position > token.getStart(sourceFile);
}
/** @internal */
export function isInJSXText(sourceFile, position) {
    const token = getTokenAtPosition(sourceFile, position);
    if (isJsxText(token)) {
        return true;
    }
    if (token.kind === SyntaxKind.OpenBraceToken && isJsxExpression(token.parent) && isJsxElement(token.parent.parent)) {
        return true;
    }
    if (token.kind === SyntaxKind.LessThanToken && isJsxOpeningLikeElement(token.parent) && isJsxElement(token.parent.parent)) {
        return true;
    }
    return false;
}
/** @internal */
export function isInsideJsxElement(sourceFile, position) {
    function isInsideJsxElementTraversal(node) {
        while (node) {
            if (node.kind >= SyntaxKind.JsxSelfClosingElement && node.kind <= SyntaxKind.JsxExpression
                || node.kind === SyntaxKind.JsxText
                || node.kind === SyntaxKind.LessThanToken
                || node.kind === SyntaxKind.GreaterThanToken
                || node.kind === SyntaxKind.Identifier
                || node.kind === SyntaxKind.CloseBraceToken
                || node.kind === SyntaxKind.OpenBraceToken
                || node.kind === SyntaxKind.SlashToken) {
                node = node.parent;
            }
            else if (node.kind === SyntaxKind.JsxElement) {
                if (position > node.getStart(sourceFile))
                    return true;
                node = node.parent;
            }
            else {
                return false;
            }
        }
        return false;
    }
    return isInsideJsxElementTraversal(getTokenAtPosition(sourceFile, position));
}
/** @internal */
export function findPrecedingMatchingToken(token, matchingTokenKind, sourceFile) {
    const closeTokenText = tokenToString(token.kind);
    const matchingTokenText = tokenToString(matchingTokenKind);
    const tokenFullStart = token.getFullStart();
    // Text-scan based fast path - can be bamboozled by comments and other trivia, but often provides
    // a good, fast approximation without too much extra work in the cases where it fails.
    const bestGuessIndex = sourceFile.text.lastIndexOf(matchingTokenText, tokenFullStart);
    if (bestGuessIndex === -1) {
        return undefined; // if the token text doesn't appear in the file, there can't be a match - super fast bail
    }
    // we can only use the textual result directly if we didn't have to count any close tokens within the range
    if (sourceFile.text.lastIndexOf(closeTokenText, tokenFullStart - 1) < bestGuessIndex) {
        const nodeAtGuess = findPrecedingToken(bestGuessIndex + 1, sourceFile);
        if (nodeAtGuess && nodeAtGuess.kind === matchingTokenKind) {
            return nodeAtGuess;
        }
    }
    const tokenKind = token.kind;
    let remainingMatchingTokens = 0;
    while (true) {
        const preceding = findPrecedingToken(token.getFullStart(), sourceFile);
        if (!preceding) {
            return undefined;
        }
        token = preceding;
        if (token.kind === matchingTokenKind) {
            if (remainingMatchingTokens === 0) {
                return token;
            }
            remainingMatchingTokens--;
        }
        else if (token.kind === tokenKind) {
            remainingMatchingTokens++;
        }
    }
}
function removeOptionality(type, isOptionalExpression, isOptionalChain) {
    return isOptionalExpression ? type.getNonNullableType() :
        isOptionalChain ? type.getNonOptionalType() :
            type;
}
/** @internal */
export function isPossiblyTypeArgumentPosition(token, sourceFile, checker) {
    const info = getPossibleTypeArgumentsInfo(token, sourceFile);
    return info !== undefined && (isPartOfTypeNode(info.called) ||
        getPossibleGenericSignatures(info.called, info.nTypeArguments, checker).length !== 0 ||
        isPossiblyTypeArgumentPosition(info.called, sourceFile, checker));
}
/** @internal */
export function getPossibleGenericSignatures(called, typeArgumentCount, checker) {
    let type = checker.getTypeAtLocation(called);
    if (isOptionalChain(called.parent)) {
        type = removeOptionality(type, isOptionalChainRoot(called.parent), /*isOptionalChain*/ true);
    }
    const signatures = isNewExpression(called.parent) ? type.getConstructSignatures() : type.getCallSignatures();
    return signatures.filter(candidate => !!candidate.typeParameters && candidate.typeParameters.length >= typeArgumentCount);
}
// Get info for an expression like `f <` that may be the start of type arguments.
/** @internal */
export function getPossibleTypeArgumentsInfo(tokenIn, sourceFile) {
    // This is a rare case, but one that saves on a _lot_ of work if true - if the source file has _no_ `<` character,
    // then there obviously can't be any type arguments - no expensive brace-matching backwards scanning required
    if (sourceFile.text.lastIndexOf("<", tokenIn ? tokenIn.pos : sourceFile.text.length) === -1) {
        return undefined;
    }
    let token = tokenIn;
    // This function determines if the node could be type argument position
    // Since during editing, when type argument list is not complete,
    // the tree could be of any shape depending on the tokens parsed before current node,
    // scanning of the previous identifier followed by "<" before current node would give us better result
    // Note that we also balance out the already provided type arguments, arrays, object literals while doing so
    let remainingLessThanTokens = 0;
    let nTypeArguments = 0;
    while (token) {
        switch (token.kind) {
            case SyntaxKind.LessThanToken:
                // Found the beginning of the generic argument expression
                token = findPrecedingToken(token.getFullStart(), sourceFile);
                if (token && token.kind === SyntaxKind.QuestionDotToken) {
                    token = findPrecedingToken(token.getFullStart(), sourceFile);
                }
                if (!token || !isIdentifier(token))
                    return undefined;
                if (!remainingLessThanTokens) {
                    return isDeclarationName(token) ? undefined : { called: token, nTypeArguments };
                }
                remainingLessThanTokens--;
                break;
            case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                remainingLessThanTokens = +3;
                break;
            case SyntaxKind.GreaterThanGreaterThanToken:
                remainingLessThanTokens = +2;
                break;
            case SyntaxKind.GreaterThanToken:
                remainingLessThanTokens++;
                break;
            case SyntaxKind.CloseBraceToken:
                // This can be object type, skip until we find the matching open brace token
                // Skip until the matching open brace token
                token = findPrecedingMatchingToken(token, SyntaxKind.OpenBraceToken, sourceFile);
                if (!token)
                    return undefined;
                break;
            case SyntaxKind.CloseParenToken:
                // This can be object type, skip until we find the matching open brace token
                // Skip until the matching open brace token
                token = findPrecedingMatchingToken(token, SyntaxKind.OpenParenToken, sourceFile);
                if (!token)
                    return undefined;
                break;
            case SyntaxKind.CloseBracketToken:
                // This can be object type, skip until we find the matching open brace token
                // Skip until the matching open brace token
                token = findPrecedingMatchingToken(token, SyntaxKind.OpenBracketToken, sourceFile);
                if (!token)
                    return undefined;
                break;
            // Valid tokens in a type name. Skip.
            case SyntaxKind.CommaToken:
                nTypeArguments++;
                break;
            case SyntaxKind.EqualsGreaterThanToken:
            // falls through
            case SyntaxKind.Identifier:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumericLiteral:
            case SyntaxKind.BigIntLiteral:
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
            // falls through
            case SyntaxKind.TypeOfKeyword:
            case SyntaxKind.ExtendsKeyword:
            case SyntaxKind.KeyOfKeyword:
            case SyntaxKind.DotToken:
            case SyntaxKind.BarToken:
            case SyntaxKind.QuestionToken:
            case SyntaxKind.ColonToken:
                break;
            default:
                if (isTypeNode(token)) {
                    break;
                }
                // Invalid token in type
                return undefined;
        }
        token = findPrecedingToken(token.getFullStart(), sourceFile);
    }
    return undefined;
}
/**
 * Returns true if the cursor at position in sourceFile is within a comment.
 *
 * @param tokenAtPosition Must equal `getTokenAtPosition(sourceFile, position)`
 * @param predicate Additional predicate to test on the comment range.
 *
 * @internal
 */
export function isInComment(sourceFile, position, tokenAtPosition) {
    return formatting.getRangeOfEnclosingComment(sourceFile, position, /*precedingToken*/ undefined, tokenAtPosition);
}
/** @internal */
export function hasDocComment(sourceFile, position) {
    const token = getTokenAtPosition(sourceFile, position);
    return !!findAncestor(token, isJSDoc);
}
function nodeHasTokens(n, sourceFile) {
    // If we have a token or node that has a non-zero width, it must have tokens.
    // Note: getWidth() does not take trivia into account.
    return n.kind === SyntaxKind.EndOfFileToken ? !!n.jsDoc : n.getWidth(sourceFile) !== 0;
}
/** @internal */
export function getNodeModifiers(node, excludeFlags = ModifierFlags.None) {
    const result = [];
    const flags = isDeclaration(node)
        ? getCombinedNodeFlagsAlwaysIncludeJSDoc(node) & ~excludeFlags
        : ModifierFlags.None;
    if (flags & ModifierFlags.Private)
        result.push(ScriptElementKindModifier.privateMemberModifier);
    if (flags & ModifierFlags.Protected)
        result.push(ScriptElementKindModifier.protectedMemberModifier);
    if (flags & ModifierFlags.Public)
        result.push(ScriptElementKindModifier.publicMemberModifier);
    if (flags & ModifierFlags.Static || isClassStaticBlockDeclaration(node))
        result.push(ScriptElementKindModifier.staticModifier);
    if (flags & ModifierFlags.Abstract)
        result.push(ScriptElementKindModifier.abstractModifier);
    if (flags & ModifierFlags.Export)
        result.push(ScriptElementKindModifier.exportedModifier);
    if (flags & ModifierFlags.Deprecated)
        result.push(ScriptElementKindModifier.deprecatedModifier);
    if (node.flags & NodeFlags.Ambient)
        result.push(ScriptElementKindModifier.ambientModifier);
    if (node.kind === SyntaxKind.ExportAssignment)
        result.push(ScriptElementKindModifier.exportedModifier);
    return result.length > 0 ? result.join(",") : ScriptElementKindModifier.none;
}
/** @internal */
export function getTypeArgumentOrTypeParameterList(node) {
    if (node.kind === SyntaxKind.TypeReference || node.kind === SyntaxKind.CallExpression) {
        return node.typeArguments;
    }
    if (isFunctionLike(node) || node.kind === SyntaxKind.ClassDeclaration || node.kind === SyntaxKind.InterfaceDeclaration) {
        return node.typeParameters;
    }
    return undefined;
}
/** @internal */
export function isComment(kind) {
    return kind === SyntaxKind.SingleLineCommentTrivia || kind === SyntaxKind.MultiLineCommentTrivia;
}
/** @internal */
export function isStringOrRegularExpressionOrTemplateLiteral(kind) {
    if (kind === SyntaxKind.StringLiteral
        || kind === SyntaxKind.RegularExpressionLiteral
        || isTemplateLiteralKind(kind)) {
        return true;
    }
    return false;
}
function areIntersectedTypesAvoidingStringReduction(checker, t1, t2) {
    return !!(t1.flags & TypeFlags.String) && checker.isEmptyAnonymousObjectType(t2);
}
/** @internal */
export function isStringAndEmptyAnonymousObjectIntersection(type) {
    if (!type.isIntersection()) {
        return false;
    }
    const { types, checker } = type;
    return types.length === 2 &&
        (areIntersectedTypesAvoidingStringReduction(checker, types[0], types[1]) || areIntersectedTypesAvoidingStringReduction(checker, types[1], types[0]));
}
/** @internal */
export function isInsideTemplateLiteral(node, position, sourceFile) {
    return isTemplateLiteralKind(node.kind)
        && (node.getStart(sourceFile) < position && position < node.end) || (!!node.isUnterminated && position === node.end);
}
/** @internal */
export function isAccessibilityModifier(kind) {
    switch (kind) {
        case SyntaxKind.PublicKeyword:
        case SyntaxKind.PrivateKeyword:
        case SyntaxKind.ProtectedKeyword:
            return true;
    }
    return false;
}
/** @internal */
export function cloneCompilerOptions(options) {
    const result = clone(options);
    setConfigFileInOptions(result, options && options.configFile);
    return result;
}
/** @internal */
export function isArrayLiteralOrObjectLiteralDestructuringPattern(node) {
    if (node.kind === SyntaxKind.ArrayLiteralExpression ||
        node.kind === SyntaxKind.ObjectLiteralExpression) {
        // [a,b,c] from:
        // [a, b, c] = someExpression;
        if (node.parent.kind === SyntaxKind.BinaryExpression &&
            node.parent.left === node &&
            node.parent.operatorToken.kind === SyntaxKind.EqualsToken) {
            return true;
        }
        // [a, b, c] from:
        // for([a, b, c] of expression)
        if (node.parent.kind === SyntaxKind.ForOfStatement &&
            node.parent.initializer === node) {
            return true;
        }
        // [a, b, c] of
        // [x, [a, b, c] ] = someExpression
        // or
        // {x, a: {a, b, c} } = someExpression
        if (isArrayLiteralOrObjectLiteralDestructuringPattern(node.parent.kind === SyntaxKind.PropertyAssignment ? node.parent.parent : node.parent)) {
            return true;
        }
    }
    return false;
}
/** @internal */
export function isInReferenceComment(sourceFile, position) {
    return isInReferenceCommentWorker(sourceFile, position, /*shouldBeReference*/ true);
}
/** @internal */
export function isInNonReferenceComment(sourceFile, position) {
    return isInReferenceCommentWorker(sourceFile, position, /*shouldBeReference*/ false);
}
function isInReferenceCommentWorker(sourceFile, position, shouldBeReference) {
    const range = isInComment(sourceFile, position, /*tokenAtPosition*/ undefined);
    return !!range && shouldBeReference === tripleSlashDirectivePrefixRegex.test(sourceFile.text.substring(range.pos, range.end));
}
/** @internal */
export function getReplacementSpanForContextToken(contextToken, position) {
    if (!contextToken)
        return undefined;
    switch (contextToken.kind) {
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
            return createTextSpanFromStringLiteralLikeContent(contextToken, position);
        default:
            return createTextSpanFromNode(contextToken);
    }
}
/** @internal */
export function createTextSpanFromNode(node, sourceFile, endNode) {
    return createTextSpanFromBounds(node.getStart(sourceFile), (endNode || node).getEnd());
}
/** @internal */
export function createTextSpanFromStringLiteralLikeContent(node, position) {
    let replacementEnd = node.getEnd() - 1;
    if (node.isUnterminated) {
        // we return no replacement range only if unterminated string is empty
        if (node.getStart() === replacementEnd)
            return undefined;
        replacementEnd = Math.min(position, node.getEnd());
    }
    return createTextSpanFromBounds(node.getStart() + 1, replacementEnd);
}
/** @internal */
export function createTextRangeFromNode(node, sourceFile) {
    return createRange(node.getStart(sourceFile), node.end);
}
/** @internal */
export function createTextSpanFromRange(range) {
    return createTextSpanFromBounds(range.pos, range.end);
}
/** @internal */
export function createTextRangeFromSpan(span) {
    return createRange(span.start, span.start + span.length);
}
/** @internal */
export function createTextChangeFromStartLength(start, length, newText) {
    return createTextChange(createTextSpan(start, length), newText);
}
/** @internal */
export function createTextChange(span, newText) {
    return { span, newText };
}
/** @internal */
export const typeKeywords = [
    SyntaxKind.AnyKeyword,
    SyntaxKind.AssertsKeyword,
    SyntaxKind.BigIntKeyword,
    SyntaxKind.BooleanKeyword,
    SyntaxKind.FalseKeyword,
    SyntaxKind.InferKeyword,
    SyntaxKind.KeyOfKeyword,
    SyntaxKind.NeverKeyword,
    SyntaxKind.NullKeyword,
    SyntaxKind.NumberKeyword,
    SyntaxKind.ObjectKeyword,
    SyntaxKind.ReadonlyKeyword,
    SyntaxKind.StringKeyword,
    SyntaxKind.SymbolKeyword,
    SyntaxKind.TypeOfKeyword,
    SyntaxKind.TrueKeyword,
    SyntaxKind.VoidKeyword,
    SyntaxKind.UndefinedKeyword,
    SyntaxKind.UniqueKeyword,
    SyntaxKind.UnknownKeyword,
];
/** @internal */
export function isTypeKeyword(kind) {
    return contains(typeKeywords, kind);
}
function isTypeKeywordToken(node) {
    return node.kind === SyntaxKind.TypeKeyword;
}
/** @internal */
export function isTypeKeywordTokenOrIdentifier(node) {
    return isTypeKeywordToken(node) || isIdentifier(node) && node.text === "type";
}
/** @internal */
export function nodeSeenTracker() {
    const seen = [];
    return node => {
        const id = getNodeId(node);
        return !seen[id] && (seen[id] = true);
    };
}
/** @internal */
export function getSnapshotText(snap) {
    return snap.getText(0, snap.getLength());
}
/** @internal */
export function repeatString(str, count) {
    let result = "";
    for (let i = 0; i < count; i++) {
        result += str;
    }
    return result;
}
/** @internal */
export function skipConstraint(type) {
    return type.isTypeParameter() ? type.getConstraint() || type : type;
}
/** @internal */
export function getNameFromPropertyName(name) {
    return name.kind === SyntaxKind.ComputedPropertyName
        // treat computed property names where expression is string/numeric literal as just string/numeric literal
        ? isStringOrNumericLiteralLike(name.expression) ? name.expression.text : undefined
        : isPrivateIdentifier(name) ? idText(name) : getTextOfIdentifierOrLiteral(name);
}
/** @internal */
export function programContainsModules(program) {
    return program.getSourceFiles().some(s => !s.isDeclarationFile && !program.isSourceFileFromExternalLibrary(s) && !!(s.externalModuleIndicator || s.commonJsModuleIndicator));
}
/** @internal */
export function programContainsEsModules(program) {
    return program.getSourceFiles().some(s => !s.isDeclarationFile && !program.isSourceFileFromExternalLibrary(s) && !!s.externalModuleIndicator);
}
// TODO: this function is, at best, poorly named. Use sites are pretty suspicious.
/** @internal */
export function compilerOptionsIndicateEsModules(compilerOptions) {
    return !!compilerOptions.module || getEmitScriptTarget(compilerOptions) >= ScriptTarget.ES2015 || !!compilerOptions.noEmit;
}
/** @internal */
export function createModuleSpecifierResolutionHost(program, host) {
    // Mix in `getSymlinkCache` from Program when host doesn't have it
    // in order for non-Project hosts to have a symlinks cache.
    return {
        fileExists: fileName => program.fileExists(fileName),
        getCurrentDirectory: () => host.getCurrentDirectory(),
        readFile: maybeBind(host, host.readFile),
        useCaseSensitiveFileNames: maybeBind(host, host.useCaseSensitiveFileNames) || program.useCaseSensitiveFileNames,
        getSymlinkCache: maybeBind(host, host.getSymlinkCache) || program.getSymlinkCache,
        getModuleSpecifierCache: maybeBind(host, host.getModuleSpecifierCache),
        getPackageJsonInfoCache: () => { var _a; return (_a = program.getModuleResolutionCache()) === null || _a === void 0 ? void 0 : _a.getPackageJsonInfoCache(); },
        getGlobalTypingsCacheLocation: maybeBind(host, host.getGlobalTypingsCacheLocation),
        redirectTargetsMap: program.redirectTargetsMap,
        getProjectReferenceRedirect: fileName => program.getProjectReferenceRedirect(fileName),
        isSourceOfProjectReferenceRedirect: fileName => program.isSourceOfProjectReferenceRedirect(fileName),
        getNearestAncestorDirectoryWithPackageJson: maybeBind(host, host.getNearestAncestorDirectoryWithPackageJson),
        getFileIncludeReasons: () => program.getFileIncludeReasons(),
        getCommonSourceDirectory: () => program.getCommonSourceDirectory(),
        getDefaultResolutionModeForFile: file => program.getDefaultResolutionModeForFile(file),
        getModeForResolutionAtIndex: (file, index) => program.getModeForResolutionAtIndex(file, index),
    };
}
/** @internal */
export function getModuleSpecifierResolverHost(program, host) {
    return Object.assign(Object.assign({}, createModuleSpecifierResolutionHost(program, host)), { getCommonSourceDirectory: () => program.getCommonSourceDirectory() });
}
/** @internal */
export function moduleResolutionUsesNodeModules(moduleResolution) {
    return moduleResolution === ModuleResolutionKind.Node10
        || moduleResolution >= ModuleResolutionKind.Node16 && moduleResolution <= ModuleResolutionKind.NodeNext
        || moduleResolution === ModuleResolutionKind.Bundler;
}
/** @internal */
export function makeImport(defaultImport, namedImports, moduleSpecifier, quotePreference, isTypeOnly) {
    return factory.createImportDeclaration(
    /*modifiers*/ undefined, defaultImport || namedImports
        ? factory.createImportClause(!!isTypeOnly, defaultImport, namedImports && namedImports.length ? factory.createNamedImports(namedImports) : undefined)
        : undefined, typeof moduleSpecifier === "string" ? makeStringLiteral(moduleSpecifier, quotePreference) : moduleSpecifier, 
    /*attributes*/ undefined);
}
/** @internal */
export function makeStringLiteral(text, quotePreference) {
    return factory.createStringLiteral(text, quotePreference === 0 /* QuotePreference.Single */);
}
/** @internal */
export var QuotePreference;
(function (QuotePreference) {
    QuotePreference[QuotePreference["Single"] = 0] = "Single";
    QuotePreference[QuotePreference["Double"] = 1] = "Double";
})(QuotePreference || (QuotePreference = {}));
/** @internal */
export function quotePreferenceFromString(str, sourceFile) {
    return isStringDoubleQuoted(str, sourceFile) ? 1 /* QuotePreference.Double */ : 0 /* QuotePreference.Single */;
}
/** @internal */
export function getQuotePreference(sourceFile, preferences) {
    if (preferences.quotePreference && preferences.quotePreference !== "auto") {
        return preferences.quotePreference === "single" ? 0 /* QuotePreference.Single */ : 1 /* QuotePreference.Double */;
    }
    else {
        // ignore synthetic import added when importHelpers: true
        const firstModuleSpecifier = isFullSourceFile(sourceFile) && sourceFile.imports &&
            find(sourceFile.imports, n => isStringLiteral(n) && !nodeIsSynthesized(n.parent));
        return firstModuleSpecifier ? quotePreferenceFromString(firstModuleSpecifier, sourceFile) : 1 /* QuotePreference.Double */;
    }
}
/** @internal */
export function getQuoteFromPreference(qp) {
    switch (qp) {
        case 0 /* QuotePreference.Single */:
            return "'";
        case 1 /* QuotePreference.Double */:
            return '"';
        default:
            return Debug.assertNever(qp);
    }
}
/** @internal */
export function symbolNameNoDefault(symbol) {
    const escaped = symbolEscapedNameNoDefault(symbol);
    return escaped === undefined ? undefined : unescapeLeadingUnderscores(escaped);
}
/** @internal */
export function symbolEscapedNameNoDefault(symbol) {
    if (symbol.escapedName !== InternalSymbolName.Default) {
        return symbol.escapedName;
    }
    return firstDefined(symbol.declarations, decl => {
        const name = getNameOfDeclaration(decl);
        return name && name.kind === SyntaxKind.Identifier ? name.escapedText : undefined;
    });
}
/** @internal */
export function isModuleSpecifierLike(node) {
    return isStringLiteralLike(node) && (isExternalModuleReference(node.parent) ||
        isImportDeclaration(node.parent) ||
        isJSDocImportTag(node.parent) ||
        isRequireCall(node.parent, /*requireStringLiteralLikeArgument*/ false) && node.parent.arguments[0] === node ||
        isImportCall(node.parent) && node.parent.arguments[0] === node);
}
/** @internal */
export function isObjectBindingElementWithoutPropertyName(bindingElement) {
    return isBindingElement(bindingElement) &&
        isObjectBindingPattern(bindingElement.parent) &&
        isIdentifier(bindingElement.name) &&
        !bindingElement.propertyName;
}
/** @internal */
export function getPropertySymbolFromBindingElement(checker, bindingElement) {
    const typeOfPattern = checker.getTypeAtLocation(bindingElement.parent);
    return typeOfPattern && checker.getPropertyOfType(typeOfPattern, bindingElement.name.text);
}
/** @internal */
export function getParentNodeInSpan(node, file, span) {
    if (!node)
        return undefined;
    while (node.parent) {
        if (isSourceFile(node.parent) || !spanContainsNode(span, node.parent, file)) {
            return node;
        }
        node = node.parent;
    }
}
function spanContainsNode(span, node, file) {
    return textSpanContainsPosition(span, node.getStart(file)) &&
        node.getEnd() <= textSpanEnd(span);
}
/** @internal */
export function findModifier(node, kind) {
    return canHaveModifiers(node) ? find(node.modifiers, (m) => m.kind === kind) : undefined;
}
/** @internal */
export function insertImports(changes, sourceFile, imports, blankLineBetween, preferences) {
    var _a;
    const decl = isArray(imports) ? imports[0] : imports;
    const importKindPredicate = decl.kind === SyntaxKind.VariableStatement ? isRequireVariableStatement : isAnyImportSyntax;
    const existingImportStatements = filter(sourceFile.statements, importKindPredicate);
    const { comparer, isSorted } = OrganizeImports.getOrganizeImportsStringComparerWithDetection(existingImportStatements, preferences);
    const sortedNewImports = isArray(imports) ? toSorted(imports, (a, b) => OrganizeImports.compareImportsOrRequireStatements(a, b, comparer)) : [imports];
    if (!(existingImportStatements === null || existingImportStatements === void 0 ? void 0 : existingImportStatements.length)) {
        if (isFullSourceFile(sourceFile)) {
            changes.insertNodesAtTopOfFile(sourceFile, sortedNewImports, blankLineBetween);
        }
        else {
            for (const newImport of sortedNewImports) {
                // Insert one at a time to send correct original source file for accurate text reuse
                // when some imports are cloned from existing ones in other files.
                changes.insertStatementsInNewFile(sourceFile.fileName, [newImport], (_a = getOriginalNode(newImport)) === null || _a === void 0 ? void 0 : _a.getSourceFile());
            }
        }
        return;
    }
    Debug.assert(isFullSourceFile(sourceFile));
    if (existingImportStatements && isSorted) {
        for (const newImport of sortedNewImports) {
            const insertionIndex = OrganizeImports.getImportDeclarationInsertionIndex(existingImportStatements, newImport, comparer);
            if (insertionIndex === 0) {
                // If the first import is top-of-file, insert after the leading comment which is likely the header.
                const options = existingImportStatements[0] === sourceFile.statements[0] ?
                    { leadingTriviaOption: textChanges.LeadingTriviaOption.Exclude } : {};
                changes.insertNodeBefore(sourceFile, existingImportStatements[0], newImport, /*blankLineBetween*/ false, options);
            }
            else {
                const prevImport = existingImportStatements[insertionIndex - 1];
                changes.insertNodeAfter(sourceFile, prevImport, newImport);
            }
        }
    }
    else {
        const lastExistingImport = lastOrUndefined(existingImportStatements);
        if (lastExistingImport) {
            changes.insertNodesAfter(sourceFile, lastExistingImport, sortedNewImports);
        }
        else {
            changes.insertNodesAtTopOfFile(sourceFile, sortedNewImports, blankLineBetween);
        }
    }
}
/** @internal */
export function getTypeKeywordOfTypeOnlyImport(importClause, sourceFile) {
    Debug.assert(importClause.isTypeOnly);
    return cast(importClause.getChildAt(0, sourceFile), isTypeKeywordToken);
}
/** @internal */
export function textSpansEqual(a, b) {
    return !!a && !!b && a.start === b.start && a.length === b.length;
}
/** @internal */
export function documentSpansEqual(a, b, useCaseSensitiveFileNames) {
    return (useCaseSensitiveFileNames ? equateStringsCaseSensitive : equateStringsCaseInsensitive)(a.fileName, b.fileName) &&
        textSpansEqual(a.textSpan, b.textSpan);
}
/** @internal */
export function getDocumentSpansEqualityComparer(useCaseSensitiveFileNames) {
    return (a, b) => documentSpansEqual(a, b, useCaseSensitiveFileNames);
}
/**
 * Iterates through 'array' by index and performs the callback on each element of array until the callback
 * returns a truthy value, then returns that value.
 * If no such value is found, the callback is applied to each element of array and undefined is returned.
 *
 * @internal
 */
export function forEachUnique(array, callback) {
    if (array) {
        for (let i = 0; i < array.length; i++) {
            if (array.indexOf(array[i]) === i) {
                const result = callback(array[i], i);
                if (result) {
                    return result;
                }
            }
        }
    }
    return undefined;
}
/** @internal */
export function isTextWhiteSpaceLike(text, startPos, endPos) {
    for (let i = startPos; i < endPos; i++) {
        if (!isWhiteSpaceLike(text.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}
/** @internal */
export function getMappedLocation(location, sourceMapper, fileExists) {
    const mapsTo = sourceMapper.tryGetSourcePosition(location);
    return mapsTo && (!fileExists || fileExists(normalizePath(mapsTo.fileName)) ? mapsTo : undefined);
}
/** @internal */
export function getMappedDocumentSpan(documentSpan, sourceMapper, fileExists) {
    const { fileName, textSpan } = documentSpan;
    const newPosition = getMappedLocation({ fileName, pos: textSpan.start }, sourceMapper, fileExists);
    if (!newPosition)
        return undefined;
    const newEndPosition = getMappedLocation({ fileName, pos: textSpan.start + textSpan.length }, sourceMapper, fileExists);
    const newLength = newEndPosition
        ? newEndPosition.pos - newPosition.pos
        : textSpan.length; // This shouldn't happen
    return {
        fileName: newPosition.fileName,
        textSpan: {
            start: newPosition.pos,
            length: newLength,
        },
        originalFileName: documentSpan.fileName,
        originalTextSpan: documentSpan.textSpan,
        contextSpan: getMappedContextSpan(documentSpan, sourceMapper, fileExists),
        originalContextSpan: documentSpan.contextSpan,
    };
}
/** @internal */
export function getMappedContextSpan(documentSpan, sourceMapper, fileExists) {
    const contextSpanStart = documentSpan.contextSpan && getMappedLocation({ fileName: documentSpan.fileName, pos: documentSpan.contextSpan.start }, sourceMapper, fileExists);
    const contextSpanEnd = documentSpan.contextSpan && getMappedLocation({ fileName: documentSpan.fileName, pos: documentSpan.contextSpan.start + documentSpan.contextSpan.length }, sourceMapper, fileExists);
    return contextSpanStart && contextSpanEnd ?
        { start: contextSpanStart.pos, length: contextSpanEnd.pos - contextSpanStart.pos } :
        undefined;
}
// #endregion
// Display-part writer helpers
// #region
/** @internal */
export function isFirstDeclarationOfSymbolParameter(symbol) {
    const declaration = symbol.declarations ? firstOrUndefined(symbol.declarations) : undefined;
    return !!findAncestor(declaration, n => isParameter(n) ? true : isBindingElement(n) || isObjectBindingPattern(n) || isArrayBindingPattern(n) ? false : "quit");
}
const displayPartWriter = getDisplayPartWriter();
function getDisplayPartWriter() {
    const absoluteMaximumLength = defaultMaximumTruncationLength * 10; // A hard cutoff to avoid overloading the messaging channel in worst-case scenarios
    let displayParts;
    let lineStart;
    let indent;
    let length;
    resetWriter();
    const unknownWrite = (text) => writeKind(text, SymbolDisplayPartKind.text);
    return {
        displayParts: () => {
            const finalText = displayParts.length && displayParts[displayParts.length - 1].text;
            if (length > absoluteMaximumLength && finalText && finalText !== "...") {
                if (!isWhiteSpaceLike(finalText.charCodeAt(finalText.length - 1))) {
                    displayParts.push(displayPart(" ", SymbolDisplayPartKind.space));
                }
                displayParts.push(displayPart("...", SymbolDisplayPartKind.punctuation));
            }
            return displayParts;
        },
        writeKeyword: text => writeKind(text, SymbolDisplayPartKind.keyword),
        writeOperator: text => writeKind(text, SymbolDisplayPartKind.operator),
        writePunctuation: text => writeKind(text, SymbolDisplayPartKind.punctuation),
        writeTrailingSemicolon: text => writeKind(text, SymbolDisplayPartKind.punctuation),
        writeSpace: text => writeKind(text, SymbolDisplayPartKind.space),
        writeStringLiteral: text => writeKind(text, SymbolDisplayPartKind.stringLiteral),
        writeParameter: text => writeKind(text, SymbolDisplayPartKind.parameterName),
        writeProperty: text => writeKind(text, SymbolDisplayPartKind.propertyName),
        writeLiteral: text => writeKind(text, SymbolDisplayPartKind.stringLiteral),
        writeSymbol,
        writeLine,
        write: unknownWrite,
        writeComment: unknownWrite,
        getText: () => "",
        getTextPos: () => 0,
        getColumn: () => 0,
        getLine: () => 0,
        isAtStartOfLine: () => false,
        hasTrailingWhitespace: () => false,
        hasTrailingComment: () => false,
        rawWrite: notImplemented,
        getIndent: () => indent,
        increaseIndent: () => {
            indent++;
        },
        decreaseIndent: () => {
            indent--;
        },
        clear: resetWriter,
    };
    function writeIndent() {
        if (length > absoluteMaximumLength)
            return;
        if (lineStart) {
            const indentString = getIndentString(indent);
            if (indentString) {
                length += indentString.length;
                displayParts.push(displayPart(indentString, SymbolDisplayPartKind.space));
            }
            lineStart = false;
        }
    }
    function writeKind(text, kind) {
        if (length > absoluteMaximumLength)
            return;
        writeIndent();
        length += text.length;
        displayParts.push(displayPart(text, kind));
    }
    function writeSymbol(text, symbol) {
        if (length > absoluteMaximumLength)
            return;
        writeIndent();
        length += text.length;
        displayParts.push(symbolPart(text, symbol));
    }
    function writeLine() {
        if (length > absoluteMaximumLength)
            return;
        length += 1;
        displayParts.push(lineBreakPart());
        lineStart = true;
    }
    function resetWriter() {
        displayParts = [];
        lineStart = true;
        indent = 0;
        length = 0;
    }
}
function symbolPart(text, symbol) {
    return displayPart(text, displayPartKind(symbol));
    function displayPartKind(symbol) {
        const flags = symbol.flags;
        if (flags & SymbolFlags.Variable) {
            return isFirstDeclarationOfSymbolParameter(symbol) ? SymbolDisplayPartKind.parameterName : SymbolDisplayPartKind.localName;
        }
        if (flags & SymbolFlags.Property)
            return SymbolDisplayPartKind.propertyName;
        if (flags & SymbolFlags.GetAccessor)
            return SymbolDisplayPartKind.propertyName;
        if (flags & SymbolFlags.SetAccessor)
            return SymbolDisplayPartKind.propertyName;
        if (flags & SymbolFlags.EnumMember)
            return SymbolDisplayPartKind.enumMemberName;
        if (flags & SymbolFlags.Function)
            return SymbolDisplayPartKind.functionName;
        if (flags & SymbolFlags.Class)
            return SymbolDisplayPartKind.className;
        if (flags & SymbolFlags.Interface)
            return SymbolDisplayPartKind.interfaceName;
        if (flags & SymbolFlags.Enum)
            return SymbolDisplayPartKind.enumName;
        if (flags & SymbolFlags.Module)
            return SymbolDisplayPartKind.moduleName;
        if (flags & SymbolFlags.Method)
            return SymbolDisplayPartKind.methodName;
        if (flags & SymbolFlags.TypeParameter)
            return SymbolDisplayPartKind.typeParameterName;
        if (flags & SymbolFlags.TypeAlias)
            return SymbolDisplayPartKind.aliasName;
        if (flags & SymbolFlags.Alias)
            return SymbolDisplayPartKind.aliasName;
        return SymbolDisplayPartKind.text;
    }
}
/** @internal */
export function displayPart(text, kind) {
    return { text, kind: SymbolDisplayPartKind[kind] };
}
/** @internal */
export function spacePart() {
    return displayPart(" ", SymbolDisplayPartKind.space);
}
/** @internal */
export function keywordPart(kind) {
    return displayPart(tokenToString(kind), SymbolDisplayPartKind.keyword);
}
/** @internal */
export function punctuationPart(kind) {
    return displayPart(tokenToString(kind), SymbolDisplayPartKind.punctuation);
}
/** @internal */
export function operatorPart(kind) {
    return displayPart(tokenToString(kind), SymbolDisplayPartKind.operator);
}
/** @internal */
export function parameterNamePart(text) {
    return displayPart(text, SymbolDisplayPartKind.parameterName);
}
/** @internal */
export function propertyNamePart(text) {
    return displayPart(text, SymbolDisplayPartKind.propertyName);
}
/** @internal */
export function textOrKeywordPart(text) {
    const kind = stringToToken(text);
    return kind === undefined
        ? textPart(text)
        : keywordPart(kind);
}
/** @internal */
export function textPart(text) {
    return displayPart(text, SymbolDisplayPartKind.text);
}
/** @internal */
export function typeAliasNamePart(text) {
    return displayPart(text, SymbolDisplayPartKind.aliasName);
}
/** @internal */
export function typeParameterNamePart(text) {
    return displayPart(text, SymbolDisplayPartKind.typeParameterName);
}
function linkTextPart(text) {
    return displayPart(text, SymbolDisplayPartKind.linkText);
}
function linkNamePart(text, target) {
    return {
        text,
        kind: SymbolDisplayPartKind[SymbolDisplayPartKind.linkName],
        target: {
            fileName: getSourceFileOfNode(target).fileName,
            textSpan: createTextSpanFromNode(target),
        },
    };
}
function linkPart(text) {
    return displayPart(text, SymbolDisplayPartKind.link);
}
/** @internal */
export function buildLinkParts(link, checker) {
    var _a;
    const prefix = isJSDocLink(link) ? "link"
        : isJSDocLinkCode(link) ? "linkcode"
            : "linkplain";
    const parts = [linkPart(`{@${prefix} `)];
    if (!link.name) {
        if (link.text) {
            parts.push(linkTextPart(link.text));
        }
    }
    else {
        const symbol = checker === null || checker === void 0 ? void 0 : checker.getSymbolAtLocation(link.name);
        const targetSymbol = symbol && checker ? getSymbolTarget(symbol, checker) : undefined;
        const suffix = findLinkNameEnd(link.text);
        const name = getTextOfNode(link.name) + link.text.slice(0, suffix);
        const text = skipSeparatorFromLinkText(link.text.slice(suffix));
        const decl = (targetSymbol === null || targetSymbol === void 0 ? void 0 : targetSymbol.valueDeclaration) || ((_a = targetSymbol === null || targetSymbol === void 0 ? void 0 : targetSymbol.declarations) === null || _a === void 0 ? void 0 : _a[0]);
        if (decl) {
            parts.push(linkNamePart(name, decl));
            if (text)
                parts.push(linkTextPart(text));
        }
        else {
            const separator = suffix === 0 || (link.text.charCodeAt(suffix) === CharacterCodes.bar && name.charCodeAt(name.length - 1) !== CharacterCodes.space) ? " " : "";
            parts.push(linkTextPart(name + separator + text));
        }
    }
    parts.push(linkPart("}"));
    return parts;
}
function skipSeparatorFromLinkText(text) {
    let pos = 0;
    if (text.charCodeAt(pos++) === CharacterCodes.bar) {
        while (pos < text.length && text.charCodeAt(pos) === CharacterCodes.space)
            pos++;
        return text.slice(pos);
    }
    return text;
}
function findLinkNameEnd(text) {
    let pos = text.indexOf("://");
    if (pos === 0) {
        while (pos < text.length && text.charCodeAt(pos) !== CharacterCodes.bar)
            pos++;
        return pos;
    }
    if (text.indexOf("()") === 0)
        return 2;
    if (text.charAt(0) === "<") {
        let brackets = 0;
        let i = 0;
        while (i < text.length) {
            if (text[i] === "<")
                brackets++;
            if (text[i] === ">")
                brackets--;
            i++;
            if (!brackets)
                return i;
        }
    }
    return 0;
}
const lineFeed = "\n";
/**
 * The default is LF.
 *
 * @internal
 */
export function getNewLineOrDefaultFromHost(host, formatSettings) {
    var _a;
    return (formatSettings === null || formatSettings === void 0 ? void 0 : formatSettings.newLineCharacter) ||
        ((_a = host.getNewLine) === null || _a === void 0 ? void 0 : _a.call(host)) ||
        lineFeed;
}
/** @internal */
export function lineBreakPart() {
    return displayPart("\n", SymbolDisplayPartKind.lineBreak);
}
/** @internal */
export function mapToDisplayParts(writeDisplayParts) {
    try {
        writeDisplayParts(displayPartWriter);
        return displayPartWriter.displayParts();
    }
    finally {
        displayPartWriter.clear();
    }
}
/** @internal */
export function typeToDisplayParts(typechecker, type, enclosingDeclaration, flags = TypeFormatFlags.None) {
    return mapToDisplayParts(writer => {
        typechecker.writeType(type, enclosingDeclaration, flags | TypeFormatFlags.MultilineObjectLiterals | TypeFormatFlags.UseAliasDefinedOutsideCurrentScope, writer);
    });
}
/** @internal */
export function symbolToDisplayParts(typeChecker, symbol, enclosingDeclaration, meaning, flags = SymbolFormatFlags.None) {
    return mapToDisplayParts(writer => {
        typeChecker.writeSymbol(symbol, enclosingDeclaration, meaning, flags | SymbolFormatFlags.UseAliasDefinedOutsideCurrentScope, writer);
    });
}
/** @internal */
export function signatureToDisplayParts(typechecker, signature, enclosingDeclaration, flags = TypeFormatFlags.None) {
    flags |= TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | TypeFormatFlags.MultilineObjectLiterals | TypeFormatFlags.WriteTypeArgumentsOfSignature | TypeFormatFlags.OmitParameterModifiers;
    return mapToDisplayParts(writer => {
        typechecker.writeSignature(signature, enclosingDeclaration, flags, /*kind*/ undefined, writer);
    });
}
/** @internal */
export function isImportOrExportSpecifierName(location) {
    return !!location.parent && isImportOrExportSpecifier(location.parent) && location.parent.propertyName === location;
}
/** @internal */
export function getScriptKind(fileName, host) {
    // First check to see if the script kind was specified by the host. Chances are the host
    // may override the default script kind for the file extension.
    return ensureScriptKind(fileName, host.getScriptKind && host.getScriptKind(fileName));
}
/** @internal */
export function getSymbolTarget(symbol, checker) {
    let next = symbol;
    while (isAliasSymbol(next) || (isTransientSymbol(next) && next.links.target)) {
        if (isTransientSymbol(next) && next.links.target) {
            next = next.links.target;
        }
        else {
            next = skipAlias(next, checker);
        }
    }
    return next;
}
function isAliasSymbol(symbol) {
    return (symbol.flags & SymbolFlags.Alias) !== 0;
}
/** @internal */
export function getUniqueSymbolId(symbol, checker) {
    return getSymbolId(skipAlias(symbol, checker));
}
/** @internal */
export function getFirstNonSpaceCharacterPosition(text, position) {
    while (isWhiteSpaceLike(text.charCodeAt(position))) {
        position += 1;
    }
    return position;
}
/** @internal */
export function getPrecedingNonSpaceCharacterPosition(text, position) {
    while (position > -1 && isWhiteSpaceSingleLine(text.charCodeAt(position))) {
        position -= 1;
    }
    return position + 1;
}
/**
 * Creates a deep, memberwise clone of a node with no source map location.
 *
 * WARNING: This is an expensive operation and is only intended to be used in refactorings
 * and code fixes (because those are triggered by explicit user actions).
 *
 * @internal
 */
export function getSynthesizedDeepClone(node, includeTrivia = true) {
    const clone = node && getSynthesizedDeepCloneWorker(node);
    if (clone && !includeTrivia)
        suppressLeadingAndTrailingTrivia(clone);
    return setParentRecursive(clone, /*incremental*/ false);
}
/** @internal */
export function getSynthesizedDeepCloneWithReplacements(node, includeTrivia, replaceNode) {
    let clone = replaceNode(node);
    if (clone) {
        setOriginalNode(clone, node);
    }
    else {
        clone = getSynthesizedDeepCloneWorker(node, replaceNode);
    }
    if (clone && !includeTrivia)
        suppressLeadingAndTrailingTrivia(clone);
    return clone;
}
function getSynthesizedDeepCloneWorker(node, replaceNode) {
    const nodeClone = replaceNode
        ? n => getSynthesizedDeepCloneWithReplacements(n, /*includeTrivia*/ true, replaceNode)
        : getSynthesizedDeepClone;
    const nodesClone = replaceNode
        ? ns => ns && getSynthesizedDeepClonesWithReplacements(ns, /*includeTrivia*/ true, replaceNode)
        : ns => ns && getSynthesizedDeepClones(ns);
    const visited = visitEachChild(node, nodeClone, /*context*/ undefined, nodesClone, nodeClone);
    if (visited === node) {
        // This only happens for leaf nodes - internal nodes always see their children change.
        const clone = isStringLiteral(node) ? setOriginalNode(factory.createStringLiteralFromNode(node), node) :
            isNumericLiteral(node) ? setOriginalNode(factory.createNumericLiteral(node.text, node.numericLiteralFlags), node) :
                factory.cloneNode(node);
        return setTextRange(clone, node);
    }
    // PERF: As an optimization, rather than calling factory.cloneNode, we'll update
    // the new node created by visitEachChild with the extra changes factory.cloneNode
    // would have made.
    visited.parent = undefined;
    return visited;
}
/** @internal */
export function getSynthesizedDeepClones(nodes, includeTrivia = true) {
    if (nodes) {
        const cloned = factory.createNodeArray(nodes.map(n => getSynthesizedDeepClone(n, includeTrivia)), nodes.hasTrailingComma);
        setTextRange(cloned, nodes);
        return cloned;
    }
    return nodes;
}
/** @internal */
export function getSynthesizedDeepClonesWithReplacements(nodes, includeTrivia, replaceNode) {
    return factory.createNodeArray(nodes.map(n => getSynthesizedDeepCloneWithReplacements(n, includeTrivia, replaceNode)), nodes.hasTrailingComma);
}
/**
 * Sets EmitFlags to suppress leading and trailing trivia on the node.
 *
 * @internal
 */
export function suppressLeadingAndTrailingTrivia(node) {
    suppressLeadingTrivia(node);
    suppressTrailingTrivia(node);
}
/**
 * Sets EmitFlags to suppress leading trivia on the node.
 *
 * @internal
 */
export function suppressLeadingTrivia(node) {
    addEmitFlagsRecursively(node, EmitFlags.NoLeadingComments, getFirstChild);
}
/**
 * Sets EmitFlags to suppress trailing trivia on the node.
 *
 * @internal @knipignore
 */
export function suppressTrailingTrivia(node) {
    addEmitFlagsRecursively(node, EmitFlags.NoTrailingComments, getLastChild);
}
/** @internal */
export function copyComments(sourceNode, targetNode) {
    const sourceFile = sourceNode.getSourceFile();
    const text = sourceFile.text;
    if (hasLeadingLineBreak(sourceNode, text)) {
        copyLeadingComments(sourceNode, targetNode, sourceFile);
    }
    else {
        copyTrailingAsLeadingComments(sourceNode, targetNode, sourceFile);
    }
    copyTrailingComments(sourceNode, targetNode, sourceFile);
}
function hasLeadingLineBreak(node, text) {
    const start = node.getFullStart();
    const end = node.getStart();
    for (let i = start; i < end; i++) {
        if (text.charCodeAt(i) === CharacterCodes.lineFeed)
            return true;
    }
    return false;
}
function addEmitFlagsRecursively(node, flag, getChild) {
    addEmitFlags(node, flag);
    const child = getChild(node);
    if (child)
        addEmitFlagsRecursively(child, flag, getChild);
}
function getFirstChild(node) {
    return node.forEachChild(child => child);
}
/** @internal */
export function getUniqueName(baseName, sourceFile) {
    let nameText = baseName;
    for (let i = 1; !isFileLevelUniqueName(sourceFile, nameText); i++) {
        nameText = `${baseName}_${i}`;
    }
    return nameText;
}
/**
 * @return The index of the (only) reference to the extracted symbol.  We want the cursor
 * to be on the reference, rather than the declaration, because it's closer to where the
 * user was before extracting it.
 *
 * @internal
 */
export function getRenameLocation(edits, renameFilename, name, preferLastLocation) {
    let delta = 0;
    let lastPos = -1;
    for (const { fileName, textChanges } of edits) {
        Debug.assert(fileName === renameFilename);
        for (const change of textChanges) {
            const { span, newText } = change;
            const index = indexInTextChange(newText, escapeString(name));
            if (index !== -1) {
                lastPos = span.start + delta + index;
                // If the reference comes first, return immediately.
                if (!preferLastLocation) {
                    return lastPos;
                }
            }
            delta += newText.length - span.length;
        }
    }
    // If the declaration comes first, return the position of the last occurrence.
    Debug.assert(preferLastLocation);
    Debug.assert(lastPos >= 0);
    return lastPos;
}
/** @internal */
export function copyLeadingComments(sourceNode, targetNode, sourceFile, commentKind, hasTrailingNewLine) {
    forEachLeadingCommentRange(sourceFile.text, sourceNode.pos, getAddCommentsFunction(targetNode, sourceFile, commentKind, hasTrailingNewLine, addSyntheticLeadingComment));
}
/** @internal */
export function copyTrailingComments(sourceNode, targetNode, sourceFile, commentKind, hasTrailingNewLine) {
    forEachTrailingCommentRange(sourceFile.text, sourceNode.end, getAddCommentsFunction(targetNode, sourceFile, commentKind, hasTrailingNewLine, addSyntheticTrailingComment));
}
/**
 * This function copies the trailing comments for the token that comes before `sourceNode`, as leading comments of `targetNode`.
 * This is useful because sometimes a comment that refers to `sourceNode` will be a leading comment for `sourceNode`, according to the
 * notion of trivia ownership, and instead will be a trailing comment for the token before `sourceNode`, e.g.:
 * `function foo(\* not leading comment for a *\ a: string) {}`
 * The comment refers to `a` but belongs to the `(` token, but we might want to copy it.
 *
 * @internal
 */
export function copyTrailingAsLeadingComments(sourceNode, targetNode, sourceFile, commentKind, hasTrailingNewLine) {
    forEachTrailingCommentRange(sourceFile.text, sourceNode.pos, getAddCommentsFunction(targetNode, sourceFile, commentKind, hasTrailingNewLine, addSyntheticLeadingComment));
}
function getAddCommentsFunction(targetNode, sourceFile, commentKind, hasTrailingNewLine, cb) {
    return (pos, end, kind, htnl) => {
        if (kind === SyntaxKind.MultiLineCommentTrivia) {
            // Remove leading /*
            pos += 2;
            // Remove trailing */
            end -= 2;
        }
        else {
            // Remove leading //
            pos += 2;
        }
        cb(targetNode, commentKind || kind, sourceFile.text.slice(pos, end), hasTrailingNewLine !== undefined ? hasTrailingNewLine : htnl);
    };
}
function indexInTextChange(change, name) {
    if (startsWith(change, name))
        return 0;
    // Add a " " to avoid references inside words
    let idx = change.indexOf(" " + name);
    if (idx === -1)
        idx = change.indexOf("." + name);
    if (idx === -1)
        idx = change.indexOf('"' + name);
    return idx === -1 ? -1 : idx + 1;
}
/** @internal */
export function needsParentheses(expression) {
    return isBinaryExpression(expression) && expression.operatorToken.kind === SyntaxKind.CommaToken
        || isObjectLiteralExpression(expression)
        || (isAsExpression(expression) || isSatisfiesExpression(expression)) && isObjectLiteralExpression(expression.expression);
}
/** @internal */
export function getContextualTypeFromParent(node, checker, contextFlags) {
    const parent = walkUpParenthesizedExpressions(node.parent);
    switch (parent.kind) {
        case SyntaxKind.NewExpression:
            return checker.getContextualType(parent, contextFlags);
        case SyntaxKind.BinaryExpression: {
            const { left, operatorToken, right } = parent;
            return isEqualityOperatorKind(operatorToken.kind)
                ? checker.getTypeAtLocation(node === right ? left : right)
                : checker.getContextualType(node, contextFlags);
        }
        case SyntaxKind.CaseClause:
            return getSwitchedType(parent, checker);
        default:
            return checker.getContextualType(node, contextFlags);
    }
}
/** @internal */
export function quote(sourceFile, preferences, text) {
    // Editors can pass in undefined or empty string - we want to infer the preference in those cases.
    const quotePreference = getQuotePreference(sourceFile, preferences);
    const quoted = JSON.stringify(text);
    return quotePreference === 0 /* QuotePreference.Single */ ? `'${stripQuotes(quoted).replace(/'/g, () => "\\'").replace(/\\"/g, '"')}'` : quoted;
}
/** @internal */
export function isEqualityOperatorKind(kind) {
    switch (kind) {
        case SyntaxKind.EqualsEqualsEqualsToken:
        case SyntaxKind.EqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsToken:
            return true;
        default:
            return false;
    }
}
/** @internal */
export function isStringLiteralOrTemplate(node) {
    switch (node.kind) {
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
        case SyntaxKind.TemplateExpression:
        case SyntaxKind.TaggedTemplateExpression:
            return true;
        default:
            return false;
    }
}
/** @internal */
export function hasIndexSignature(type) {
    return !!type.getStringIndexType() || !!type.getNumberIndexType();
}
/** @internal */
export function getSwitchedType(caseClause, checker) {
    return checker.getTypeAtLocation(caseClause.parent.parent.expression);
}
/** @internal */
export const ANONYMOUS = "anonymous function";
/** @internal */
export function getTypeNodeIfAccessible(type, enclosingScope, program, host) {
    const checker = program.getTypeChecker();
    let typeIsAccessible = true;
    const notAccessible = () => typeIsAccessible = false;
    const res = checker.typeToTypeNode(type, enclosingScope, NodeBuilderFlags.NoTruncation, InternalNodeBuilderFlags.AllowUnresolvedNames, {
        trackSymbol: (symbol, declaration, meaning) => {
            typeIsAccessible = typeIsAccessible && checker.isSymbolAccessible(symbol, declaration, meaning, /*shouldComputeAliasToMarkVisible*/ false).accessibility === SymbolAccessibility.Accessible;
            return !typeIsAccessible;
        },
        reportInaccessibleThisError: notAccessible,
        reportPrivateInBaseOfClassExpression: notAccessible,
        reportInaccessibleUniqueSymbolError: notAccessible,
        moduleResolverHost: getModuleSpecifierResolverHost(program, host),
    });
    return typeIsAccessible ? res : undefined;
}
function syntaxRequiresTrailingCommaOrSemicolonOrASI(kind) {
    return kind === SyntaxKind.CallSignature
        || kind === SyntaxKind.ConstructSignature
        || kind === SyntaxKind.IndexSignature
        || kind === SyntaxKind.PropertySignature
        || kind === SyntaxKind.MethodSignature;
}
function syntaxRequiresTrailingFunctionBlockOrSemicolonOrASI(kind) {
    return kind === SyntaxKind.FunctionDeclaration
        || kind === SyntaxKind.Constructor
        || kind === SyntaxKind.MethodDeclaration
        || kind === SyntaxKind.GetAccessor
        || kind === SyntaxKind.SetAccessor;
}
function syntaxRequiresTrailingModuleBlockOrSemicolonOrASI(kind) {
    return kind === SyntaxKind.ModuleDeclaration;
}
function syntaxRequiresTrailingSemicolonOrASI(kind) {
    return kind === SyntaxKind.VariableStatement
        || kind === SyntaxKind.ExpressionStatement
        || kind === SyntaxKind.DoStatement
        || kind === SyntaxKind.ContinueStatement
        || kind === SyntaxKind.BreakStatement
        || kind === SyntaxKind.ReturnStatement
        || kind === SyntaxKind.ThrowStatement
        || kind === SyntaxKind.DebuggerStatement
        || kind === SyntaxKind.PropertyDeclaration
        || kind === SyntaxKind.TypeAliasDeclaration
        || kind === SyntaxKind.ImportDeclaration
        || kind === SyntaxKind.ImportEqualsDeclaration
        || kind === SyntaxKind.ExportDeclaration
        || kind === SyntaxKind.NamespaceExportDeclaration
        || kind === SyntaxKind.ExportAssignment;
}
const syntaxMayBeASICandidate = or(syntaxRequiresTrailingCommaOrSemicolonOrASI, syntaxRequiresTrailingFunctionBlockOrSemicolonOrASI, syntaxRequiresTrailingModuleBlockOrSemicolonOrASI, syntaxRequiresTrailingSemicolonOrASI);
function nodeIsASICandidate(node, sourceFile) {
    const lastToken = node.getLastToken(sourceFile);
    if (lastToken && lastToken.kind === SyntaxKind.SemicolonToken) {
        return false;
    }
    if (syntaxRequiresTrailingCommaOrSemicolonOrASI(node.kind)) {
        if (lastToken && lastToken.kind === SyntaxKind.CommaToken) {
            return false;
        }
    }
    else if (syntaxRequiresTrailingModuleBlockOrSemicolonOrASI(node.kind)) {
        const lastChild = last(node.getChildren(sourceFile));
        if (lastChild && isModuleBlock(lastChild)) {
            return false;
        }
    }
    else if (syntaxRequiresTrailingFunctionBlockOrSemicolonOrASI(node.kind)) {
        const lastChild = last(node.getChildren(sourceFile));
        if (lastChild && isFunctionBlock(lastChild)) {
            return false;
        }
    }
    else if (!syntaxRequiresTrailingSemicolonOrASI(node.kind)) {
        return false;
    }
    // See comment in parser's `parseDoStatement`
    if (node.kind === SyntaxKind.DoStatement) {
        return true;
    }
    const topNode = findAncestor(node, ancestor => !ancestor.parent);
    const nextToken = findNextToken(node, topNode, sourceFile);
    if (!nextToken || nextToken.kind === SyntaxKind.CloseBraceToken) {
        return true;
    }
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
    const endLine = sourceFile.getLineAndCharacterOfPosition(nextToken.getStart(sourceFile)).line;
    return startLine !== endLine;
}
/** @internal */
export function positionIsASICandidate(pos, context, sourceFile) {
    const contextAncestor = findAncestor(context, ancestor => {
        if (ancestor.end !== pos) {
            return "quit";
        }
        return syntaxMayBeASICandidate(ancestor.kind);
    });
    return !!contextAncestor && nodeIsASICandidate(contextAncestor, sourceFile);
}
/** @internal */
export function probablyUsesSemicolons(sourceFile) {
    let withSemicolon = 0;
    let withoutSemicolon = 0;
    const nStatementsToObserve = 5;
    forEachChild(sourceFile, function visit(node) {
        if (syntaxRequiresTrailingSemicolonOrASI(node.kind)) {
            const lastToken = node.getLastToken(sourceFile);
            if ((lastToken === null || lastToken === void 0 ? void 0 : lastToken.kind) === SyntaxKind.SemicolonToken) {
                withSemicolon++;
            }
            else {
                withoutSemicolon++;
            }
        }
        else if (syntaxRequiresTrailingCommaOrSemicolonOrASI(node.kind)) {
            const lastToken = node.getLastToken(sourceFile);
            if ((lastToken === null || lastToken === void 0 ? void 0 : lastToken.kind) === SyntaxKind.SemicolonToken) {
                withSemicolon++;
            }
            else if (lastToken && lastToken.kind !== SyntaxKind.CommaToken) {
                const lastTokenLine = getLineAndCharacterOfPosition(sourceFile, lastToken.getStart(sourceFile)).line;
                const nextTokenLine = getLineAndCharacterOfPosition(sourceFile, getSpanOfTokenAtPosition(sourceFile, lastToken.end).start).line;
                // Avoid counting missing semicolon in single-line objects:
                // `function f(p: { x: string /*no semicolon here is insignificant*/ }) {`
                if (lastTokenLine !== nextTokenLine) {
                    withoutSemicolon++;
                }
            }
        }
        if (withSemicolon + withoutSemicolon >= nStatementsToObserve) {
            return true;
        }
        return forEachChild(node, visit);
    });
    // One statement missing a semicolon isn't sufficient evidence to say the user
    // doesn't want semicolons, because they may not even be done writing that statement.
    if (withSemicolon === 0 && withoutSemicolon <= 1) {
        return true;
    }
    // If even 2/5 places have a semicolon, the user probably wants semicolons
    return withSemicolon / withoutSemicolon > 1 / nStatementsToObserve;
}
/** @internal */
export function tryGetDirectories(host, directoryName) {
    return tryIOAndConsumeErrors(host, host.getDirectories, directoryName) || [];
}
/** @internal */
export function tryReadDirectory(host, path, extensions, exclude, include) {
    return tryIOAndConsumeErrors(host, host.readDirectory, path, extensions, exclude, include) || emptyArray;
}
/** @internal */
export function tryFileExists(host, path) {
    return tryIOAndConsumeErrors(host, host.fileExists, path);
}
/** @internal */
export function tryDirectoryExists(host, path) {
    return tryAndIgnoreErrors(() => directoryProbablyExists(path, host)) || false;
}
/** @internal */
export function tryAndIgnoreErrors(cb) {
    try {
        return cb();
    }
    catch (_a) {
        return undefined;
    }
}
function tryIOAndConsumeErrors(host, toApply, ...args) {
    return tryAndIgnoreErrors(() => toApply && toApply.apply(host, args));
}
/** @internal */
export function findPackageJsons(startDirectory, host) {
    const paths = [];
    forEachAncestorDirectoryStoppingAtGlobalCache(host, startDirectory, ancestor => {
        const currentConfigPath = combinePaths(ancestor, "package.json");
        if (tryFileExists(host, currentConfigPath)) {
            paths.push(currentConfigPath);
        }
    });
    return paths;
}
/** @internal */
export function findPackageJson(directory, host) {
    let packageJson;
    forEachAncestorDirectoryStoppingAtGlobalCache(host, directory, ancestor => {
        if (ancestor === "node_modules")
            return true;
        packageJson = findConfigFile(ancestor, f => tryFileExists(host, f), "package.json");
        if (packageJson) {
            return true; // break out
        }
    });
    return packageJson;
}
function getPackageJsonsVisibleToFile(fileName, host) {
    if (!host.fileExists) {
        return [];
    }
    const packageJsons = [];
    forEachAncestorDirectoryStoppingAtGlobalCache(host, getDirectoryPath(fileName), ancestor => {
        const packageJsonFileName = combinePaths(ancestor, "package.json");
        if (host.fileExists(packageJsonFileName)) {
            const info = createPackageJsonInfo(packageJsonFileName, host);
            if (info) {
                packageJsons.push(info);
            }
        }
    });
    return packageJsons;
}
/** @internal */
export function createPackageJsonInfo(fileName, host) {
    if (!host.readFile) {
        return undefined;
    }
    const dependencyKeys = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
    const stringContent = host.readFile(fileName) || "";
    const content = tryParseJson(stringContent);
    const info = {};
    if (content) {
        for (const key of dependencyKeys) {
            const dependencies = content[key];
            if (!dependencies) {
                continue;
            }
            const dependencyMap = new Map();
            for (const packageName in dependencies) {
                dependencyMap.set(packageName, dependencies[packageName]);
            }
            info[key] = dependencyMap;
        }
    }
    const dependencyGroups = [
        [PackageJsonDependencyGroup.Dependencies, info.dependencies],
        [PackageJsonDependencyGroup.DevDependencies, info.devDependencies],
        [PackageJsonDependencyGroup.OptionalDependencies, info.optionalDependencies],
        [PackageJsonDependencyGroup.PeerDependencies, info.peerDependencies],
    ];
    return Object.assign(Object.assign({}, info), { parseable: !!content, fileName,
        get,
        has(dependencyName, inGroups) {
            return !!get(dependencyName, inGroups);
        } });
    function get(dependencyName, inGroups = PackageJsonDependencyGroup.All) {
        for (const [group, deps] of dependencyGroups) {
            if (deps && (inGroups & group)) {
                const dep = deps.get(dependencyName);
                if (dep !== undefined) {
                    return dep;
                }
            }
        }
    }
}
/** @internal */
export function createPackageJsonImportFilter(fromFile, preferences, host) {
    const packageJsons = ((host.getPackageJsonsVisibleToFile && host.getPackageJsonsVisibleToFile(fromFile.fileName)) || getPackageJsonsVisibleToFile(fromFile.fileName, host)).filter(p => p.parseable);
    let usesNodeCoreModules;
    let ambientModuleCache;
    let sourceFileCache;
    return {
        allowsImportingAmbientModule,
        getSourceFileInfo,
        allowsImportingSpecifier,
    };
    function moduleSpecifierIsCoveredByPackageJson(specifier) {
        const packageName = getNodeModuleRootSpecifier(specifier);
        for (const packageJson of packageJsons) {
            if (packageJson.has(packageName) || packageJson.has(getTypesPackageName(packageName))) {
                return true;
            }
        }
        return false;
    }
    function allowsImportingAmbientModule(moduleSymbol, moduleSpecifierResolutionHost) {
        if (!packageJsons.length || !moduleSymbol.valueDeclaration) {
            return true;
        }
        if (!ambientModuleCache) {
            ambientModuleCache = new Map();
        }
        else {
            const cached = ambientModuleCache.get(moduleSymbol);
            if (cached !== undefined) {
                return cached;
            }
        }
        const declaredModuleSpecifier = stripQuotes(moduleSymbol.getName());
        if (isAllowedCoreNodeModulesImport(declaredModuleSpecifier)) {
            ambientModuleCache.set(moduleSymbol, true);
            return true;
        }
        const declaringSourceFile = moduleSymbol.valueDeclaration.getSourceFile();
        const declaringNodeModuleName = getNodeModulesPackageNameFromFileName(declaringSourceFile.fileName, moduleSpecifierResolutionHost);
        if (typeof declaringNodeModuleName === "undefined") {
            ambientModuleCache.set(moduleSymbol, true);
            return true;
        }
        const result = moduleSpecifierIsCoveredByPackageJson(declaringNodeModuleName) ||
            moduleSpecifierIsCoveredByPackageJson(declaredModuleSpecifier);
        ambientModuleCache.set(moduleSymbol, result);
        return result;
    }
    function getSourceFileInfo(sourceFile, moduleSpecifierResolutionHost) {
        if (!packageJsons.length) {
            return { importable: true, packageName: undefined };
        }
        if (!sourceFileCache) {
            sourceFileCache = new Map();
        }
        else {
            const cached = sourceFileCache.get(sourceFile);
            if (cached !== undefined) {
                return cached;
            }
        }
        const packageName = getNodeModulesPackageNameFromFileName(sourceFile.fileName, moduleSpecifierResolutionHost);
        if (!packageName) {
            const result = { importable: true, packageName };
            sourceFileCache.set(sourceFile, result);
            return result;
        }
        const importable = moduleSpecifierIsCoveredByPackageJson(packageName);
        const result = { importable, packageName };
        sourceFileCache.set(sourceFile, result);
        return result;
    }
    function allowsImportingSpecifier(moduleSpecifier) {
        if (!packageJsons.length || isAllowedCoreNodeModulesImport(moduleSpecifier)) {
            return true;
        }
        if (pathIsRelative(moduleSpecifier) || isRootedDiskPath(moduleSpecifier)) {
            return true;
        }
        return moduleSpecifierIsCoveredByPackageJson(moduleSpecifier);
    }
    function isAllowedCoreNodeModulesImport(moduleSpecifier) {
        // If we're in JavaScript, it can be difficult to tell whether the user wants to import
        // from Node core modules or not. We can start by seeing if the user is actually using
        // any node core modules, as opposed to simply having @types/node accidentally as a
        // dependency of a dependency.
        if (isFullSourceFile(fromFile) && isSourceFileJS(fromFile) && nodeCoreModules.has(moduleSpecifier)) {
            if (usesNodeCoreModules === undefined) {
                usesNodeCoreModules = consumesNodeCoreModules(fromFile);
            }
            if (usesNodeCoreModules) {
                return true;
            }
        }
        return false;
    }
    function getNodeModulesPackageNameFromFileName(importedFileName, moduleSpecifierResolutionHost) {
        if (!importedFileName.includes("node_modules")) {
            return undefined;
        }
        const specifier = moduleSpecifiers.getNodeModulesPackageName(host.getCompilationSettings(), fromFile, importedFileName, moduleSpecifierResolutionHost, preferences);
        if (!specifier) {
            return undefined;
        }
        // Paths here are not node_modules, so we don't care about them;
        // returning anything will trigger a lookup in package.json.
        if (!pathIsRelative(specifier) && !isRootedDiskPath(specifier)) {
            return getNodeModuleRootSpecifier(specifier);
        }
    }
    function getNodeModuleRootSpecifier(fullSpecifier) {
        const components = getPathComponents(getPackageNameFromTypesPackageName(fullSpecifier)).slice(1);
        // Scoped packages
        if (startsWith(components[0], "@")) {
            return `${components[0]}/${components[1]}`;
        }
        return components[0];
    }
}
/** @internal */
export function consumesNodeCoreModules(sourceFile) {
    return some(sourceFile.imports, ({ text }) => nodeCoreModules.has(text));
}
/** @internal */
export function isInsideNodeModules(fileOrDirectory) {
    return contains(getPathComponents(fileOrDirectory), "node_modules");
}
function isDiagnosticWithLocation(diagnostic) {
    return diagnostic.file !== undefined && diagnostic.start !== undefined && diagnostic.length !== undefined;
}
/** @internal */
export function findDiagnosticForNode(node, sortedFileDiagnostics) {
    const span = createTextSpanFromNode(node);
    const index = binarySearchKey(sortedFileDiagnostics, span, identity, compareTextSpans);
    if (index >= 0) {
        const diagnostic = sortedFileDiagnostics[index];
        Debug.assertEqual(diagnostic.file, node.getSourceFile(), "Diagnostics proided to 'findDiagnosticForNode' must be from a single SourceFile");
        return cast(diagnostic, isDiagnosticWithLocation);
    }
}
/** @internal */
export function getDiagnosticsWithinSpan(span, sortedFileDiagnostics) {
    var _a;
    let index = binarySearchKey(sortedFileDiagnostics, span.start, diag => diag.start, compareValues);
    if (index < 0) {
        index = ~index;
    }
    while (((_a = sortedFileDiagnostics[index - 1]) === null || _a === void 0 ? void 0 : _a.start) === span.start) {
        index--;
    }
    const result = [];
    const end = textSpanEnd(span);
    while (true) {
        const diagnostic = tryCast(sortedFileDiagnostics[index], isDiagnosticWithLocation);
        if (!diagnostic || diagnostic.start > end) {
            break;
        }
        if (textSpanContainsTextSpan(span, diagnostic)) {
            result.push(diagnostic);
        }
        index++;
    }
    return result;
}
/** @internal */
export function getRefactorContextSpan({ startPosition, endPosition }) {
    return createTextSpanFromBounds(startPosition, endPosition === undefined ? startPosition : endPosition);
}
/** @internal */
export function getFixableErrorSpanExpression(sourceFile, span) {
    const token = getTokenAtPosition(sourceFile, span.start);
    // Checker has already done work to determine that await might be possible, and has attached
    // related info to the node, so start by finding the expression that exactly matches up
    // with the diagnostic range.
    const expression = findAncestor(token, node => {
        if (node.getStart(sourceFile) < span.start || node.getEnd() > textSpanEnd(span)) {
            return "quit";
        }
        return isExpression(node) && textSpansEqual(span, createTextSpanFromNode(node, sourceFile));
    });
    return expression;
}
/** @internal */
export function mapOneOrMany(valueOrArray, f, resultSelector = identity) {
    return valueOrArray ? isArray(valueOrArray) ? resultSelector(map(valueOrArray, f)) : f(valueOrArray, 0) : undefined;
}
/**
 * If the provided value is an array, the first element of the array is returned; otherwise, the provided value is returned instead.
 *
 * @internal
 */
export function firstOrOnly(valueOrArray) {
    return isArray(valueOrArray) ? first(valueOrArray) : valueOrArray;
}
/**
 * If a type checker and multiple files are available, consider using `forEachNameOfDefaultExport`
 * instead, which searches for names of re-exported defaults/namespaces in target files.
 * @internal
 */
export function getNameForExportedSymbol(symbol, scriptTarget, preferCapitalized) {
    if (symbol.escapedName === InternalSymbolName.ExportEquals || symbol.escapedName === InternalSymbolName.Default) {
        // Names for default exports:
        // - export default foo => foo
        // - export { foo as default } => foo
        // - export default 0 => filename converted to camelCase
        return getDefaultLikeExportNameFromDeclaration(symbol)
            || moduleSymbolToValidIdentifier(getSymbolParentOrFail(symbol), scriptTarget, !!preferCapitalized);
    }
    return symbol.name;
}
/**
 * If a type checker and multiple files are available, consider using `forEachNameOfDefaultExport`
 * instead, which searches for names of re-exported defaults/namespaces in target files.
 * @internal
 */
export function getDefaultLikeExportNameFromDeclaration(symbol) {
    return firstDefined(symbol.declarations, d => {
        var _a, _b, _c;
        // "export default" in this case. See `ExportAssignment`for more details.
        if (isExportAssignment(d)) {
            return (_a = tryCast(skipOuterExpressions(d.expression), isIdentifier)) === null || _a === void 0 ? void 0 : _a.text;
        }
        // "export { ~ as default }"
        if (isExportSpecifier(d) && d.symbol.flags === SymbolFlags.Alias) {
            return (_b = tryCast(d.propertyName, isIdentifier)) === null || _b === void 0 ? void 0 : _b.text;
        }
        // GH#52694
        const name = (_c = tryCast(getNameOfDeclaration(d), isIdentifier)) === null || _c === void 0 ? void 0 : _c.text;
        if (name) {
            return name;
        }
        if (symbol.parent && !isExternalModuleSymbol(symbol.parent)) {
            return symbol.parent.getName();
        }
    });
}
function getSymbolParentOrFail(symbol) {
    var _a;
    return Debug.checkDefined(symbol.parent, `Symbol parent was undefined. Flags: ${Debug.formatSymbolFlags(symbol.flags)}. ` +
        `Declarations: ${(_a = symbol.declarations) === null || _a === void 0 ? void 0 : _a.map(d => {
            const kind = Debug.formatSyntaxKind(d.kind);
            const inJS = isInJSFile(d);
            const { expression } = d;
            return (inJS ? "[JS]" : "") + kind + (expression ? ` (expression: ${Debug.formatSyntaxKind(expression.kind)})` : "");
        }).join(", ")}.`);
}
/** @internal */
export function moduleSymbolToValidIdentifier(moduleSymbol, target, forceCapitalize) {
    return moduleSpecifierToValidIdentifier(removeFileExtension(stripQuotes(moduleSymbol.name)), target, forceCapitalize);
}
/** @internal */
export function moduleSpecifierToValidIdentifier(moduleSpecifier, target, forceCapitalize) {
    const baseName = getBaseFileName(removeSuffix(removeFileExtension(moduleSpecifier), "/index"));
    let res = "";
    let lastCharWasValid = true;
    const firstCharCode = baseName.charCodeAt(0);
    if (isIdentifierStart(firstCharCode, target)) {
        res += String.fromCharCode(firstCharCode);
        if (forceCapitalize) {
            res = res.toUpperCase();
        }
    }
    else {
        lastCharWasValid = false;
    }
    for (let i = 1; i < baseName.length; i++) {
        const ch = baseName.charCodeAt(i);
        const isValid = isIdentifierPart(ch, target);
        if (isValid) {
            let char = String.fromCharCode(ch);
            if (!lastCharWasValid) {
                char = char.toUpperCase();
            }
            res += char;
        }
        lastCharWasValid = isValid;
    }
    // Need `|| "_"` to ensure result isn't empty.
    return !isStringANonContextualKeyword(res) ? res || "_" : `_${res}`;
}
/**
 * Useful to check whether a string contains another string at a specific index
 * without allocating another string or traversing the entire contents of the outer string.
 *
 * This function is useful in place of either of the following:
 *
 * ```ts
 * // Allocates
 * haystack.substr(startIndex, needle.length) === needle
 *
 * // Full traversal
 * haystack.indexOf(needle, startIndex) === startIndex
 * ```
 *
 * @param haystack The string that potentially contains `needle`.
 * @param needle The string whose content might sit within `haystack`.
 * @param startIndex The index within `haystack` to start searching for `needle`.
 *
 * @internal
 */
export function stringContainsAt(haystack, needle, startIndex) {
    const needleLength = needle.length;
    if (needleLength + startIndex > haystack.length) {
        return false;
    }
    for (let i = 0; i < needleLength; i++) {
        if (needle.charCodeAt(i) !== haystack.charCodeAt(i + startIndex))
            return false;
    }
    return true;
}
/** @internal */
export function startsWithUnderscore(name) {
    return name.charCodeAt(0) === CharacterCodes._;
}
/** @internal */
export function isDeprecatedDeclaration(decl) {
    return !!(getCombinedNodeFlagsAlwaysIncludeJSDoc(decl) & ModifierFlags.Deprecated);
}
/** @internal */
export function shouldUseUriStyleNodeCoreModules(file, program) {
    let decisionFromFile;
    for (const node of file.imports) {
        if (nodeCoreModules.has(node.text) && !exclusivelyPrefixedNodeCoreModules.has(node.text)) {
            if (startsWith(node.text, "node:")) {
                return true;
            }
            else {
                decisionFromFile = false;
            }
        }
    }
    return decisionFromFile !== null && decisionFromFile !== void 0 ? decisionFromFile : program.usesUriStyleNodeCoreModules;
}
/** @internal */
export function getNewLineKind(newLineCharacter) {
    return newLineCharacter === "\n" ? NewLineKind.LineFeed : NewLineKind.CarriageReturnLineFeed;
}
/** @internal */
export function diagnosticToString(diag) {
    return isArray(diag)
        ? formatStringFromArgs(getLocaleSpecificMessage(diag[0]), diag.slice(1))
        : getLocaleSpecificMessage(diag);
}
/**
 * Get format code settings for a code writing context (e.g. when formatting text changes or completions code).
 *
 * @internal
 */
export function getFormatCodeSettingsForWriting({ options }, sourceFile) {
    const shouldAutoDetectSemicolonPreference = !options.semicolons || options.semicolons === SemicolonPreference.Ignore;
    const shouldRemoveSemicolons = options.semicolons === SemicolonPreference.Remove || shouldAutoDetectSemicolonPreference && !probablyUsesSemicolons(sourceFile);
    return Object.assign(Object.assign({}, options), { semicolons: shouldRemoveSemicolons ? SemicolonPreference.Remove : SemicolonPreference.Ignore });
}
/** @internal */
export function jsxModeNeedsExplicitImport(jsx) {
    return jsx === JsxEmit.React || jsx === JsxEmit.ReactNative;
}
/** @internal */
export function isSourceFileFromLibrary(program, node) {
    return program.isSourceFileFromExternalLibrary(node) || program.isSourceFileDefaultLibrary(node);
}
/** @internal */
export function newCaseClauseTracker(checker, clauses) {
    const existingStrings = new Set();
    const existingNumbers = new Set();
    const existingBigInts = new Set();
    for (const clause of clauses) {
        if (!isDefaultClause(clause)) {
            const expression = skipParentheses(clause.expression);
            if (isLiteralExpression(expression)) {
                switch (expression.kind) {
                    case SyntaxKind.NoSubstitutionTemplateLiteral:
                    case SyntaxKind.StringLiteral:
                        existingStrings.add(expression.text);
                        break;
                    case SyntaxKind.NumericLiteral:
                        existingNumbers.add(parseInt(expression.text));
                        break;
                    case SyntaxKind.BigIntLiteral:
                        const parsedBigInt = parseBigInt(endsWith(expression.text, "n") ? expression.text.slice(0, -1) : expression.text);
                        if (parsedBigInt) {
                            existingBigInts.add(pseudoBigIntToString(parsedBigInt));
                        }
                        break;
                }
            }
            else {
                const symbol = checker.getSymbolAtLocation(clause.expression);
                if (symbol && symbol.valueDeclaration && isEnumMember(symbol.valueDeclaration)) {
                    const enumValue = checker.getConstantValue(symbol.valueDeclaration);
                    if (enumValue !== undefined) {
                        addValue(enumValue);
                    }
                }
            }
        }
    }
    return {
        addValue,
        hasValue,
    };
    function addValue(value) {
        switch (typeof value) {
            case "string":
                existingStrings.add(value);
                break;
            case "number":
                existingNumbers.add(value);
        }
    }
    function hasValue(value) {
        switch (typeof value) {
            case "string":
                return existingStrings.has(value);
            case "number":
                return existingNumbers.has(value);
            case "object":
                return existingBigInts.has(pseudoBigIntToString(value));
        }
    }
}
/** @internal */
export function fileShouldUseJavaScriptRequire(file, program, host, preferRequire) {
    var _a;
    const fileName = typeof file === "string" ? file : file.fileName;
    if (!hasJSFileExtension(fileName)) {
        return false;
    }
    const compilerOptions = typeof file === "string" ? program.getCompilerOptions() : program.getCompilerOptionsForFile(file);
    const moduleKind = getEmitModuleKind(compilerOptions);
    const sourceFileLike = typeof file === "string" ? {
        fileName: file,
        impliedNodeFormat: getImpliedNodeFormatForFile(toPath(file, host.getCurrentDirectory(), hostGetCanonicalFileName(host)), (_a = program.getPackageJsonInfoCache) === null || _a === void 0 ? void 0 : _a.call(program), host, compilerOptions),
    } : file;
    const impliedNodeFormat = getImpliedNodeFormatForEmitWorker(sourceFileLike, compilerOptions);
    if (impliedNodeFormat === ModuleKind.ESNext) {
        return false;
    }
    if (impliedNodeFormat === ModuleKind.CommonJS) {
        // Since we're in a JS file, assume the user is writing the JS that will run
        // (i.e., assume `noEmit`), so a CJS-format file should just have require
        // syntax, rather than imports that will be downleveled to `require`.
        return true;
    }
    if (compilerOptions.verbatimModuleSyntax && moduleKind === ModuleKind.CommonJS) {
        // Using ESM syntax under these options would result in an error.
        return true;
    }
    if (compilerOptions.verbatimModuleSyntax && emitModuleKindIsNonNodeESM(moduleKind)) {
        return false;
    }
    // impliedNodeFormat is undefined and `verbatimModuleSyntax` is off (or in an invalid combo)
    // Use heuristics from existing code
    if (typeof file === "object") {
        if (file.commonJsModuleIndicator) {
            return true;
        }
        if (file.externalModuleIndicator) {
            return false;
        }
    }
    return preferRequire;
}
/** @internal */
export function isBlockLike(node) {
    switch (node.kind) {
        case SyntaxKind.Block:
        case SyntaxKind.SourceFile:
        case SyntaxKind.ModuleBlock:
        case SyntaxKind.CaseClause:
            return true;
        default:
            return false;
    }
}
/** @internal */
export function createFutureSourceFile(fileName, syntaxModuleIndicator, program, moduleResolutionHost) {
    var _a;
    const result = getImpliedNodeFormatForFileWorker(fileName, (_a = program.getPackageJsonInfoCache) === null || _a === void 0 ? void 0 : _a.call(program), moduleResolutionHost, program.getCompilerOptions());
    let impliedNodeFormat, packageJsonScope;
    if (typeof result === "object") {
        impliedNodeFormat = result.impliedNodeFormat;
        packageJsonScope = result.packageJsonScope;
    }
    return {
        path: toPath(fileName, program.getCurrentDirectory(), program.getCanonicalFileName),
        fileName,
        externalModuleIndicator: syntaxModuleIndicator === ModuleKind.ESNext ? true : undefined,
        commonJsModuleIndicator: syntaxModuleIndicator === ModuleKind.CommonJS ? true : undefined,
        impliedNodeFormat,
        packageJsonScope,
        statements: emptyArray,
        imports: emptyArray,
    };
}
