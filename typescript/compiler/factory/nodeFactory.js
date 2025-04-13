import {
  addRange,
  append,
  appendIfUnique,
  cast,
  CharacterCodes,
  containsObjectRestOrSpread,
  createBaseNodeFactory,
  createNodeConverters,
  createParenthesizerRules,
  createScanner,
  Debug,
  EmitFlags,
  emptyArray,
  escapeLeadingUnderscores,
  every,
  findUseStrictPrologue,
  forEach,
  formatGeneratedName,
  GeneratedIdentifierFlags,
  getCommentRange,
  getEmitFlags,
  getIdentifierTypeArguments,
  getJSDocTypeAliasName,
  getNameOfDeclaration,
  getNodeId,
  getNonAssignedNameOfDeclaration,
  getSourceMapRange,
  getSyntheticLeadingComments,
  getSyntheticTrailingComments,
  getTextOfIdentifierOrLiteral,
  hasInvalidEscape,
  hasProperty,
  hasSyntacticModifier,
  identity,
  idText,
  InternalEmitFlags,
  isArray,
  isArrayLiteralExpression,
  isArrowFunction,
  isBinaryExpression,
  isCallChain,
  isClassDeclaration,
  isClassExpression,
  isCommaListExpression,
  isCommaToken,
  isComputedPropertyName,
  isConstructorDeclaration,
  isConstructorTypeNode,
  isCustomPrologue,
  isElementAccessChain,
  isElementAccessExpression,
  isEnumDeclaration,
  isExclamationToken,
  isExportAssignment,
  isExportDeclaration,
  isExternalModuleReference,
  isFunctionDeclaration,
  isFunctionExpression,
  isGeneratedIdentifier,
  isGeneratedPrivateIdentifier,
  isGetAccessorDeclaration,
  isHoistedFunction,
  isHoistedVariableStatement,
  isIdentifier,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportKeyword,
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isLabeledStatement,
  isLocalName,
  isLogicalOrCoalescingAssignmentOperator,
  isMemberName,
  isMethodDeclaration,
  isMethodSignature,
  isModuleDeclaration,
  isNamedDeclaration,
  isNodeArray,
  isNodeKind,
  isNonNullChain,
  isNotEmittedStatement,
  isObjectLiteralExpression,
  isOmittedExpression,
  isOuterExpression,
  isParameter,
  isParenthesizedExpression,
  isParseTreeNode,
  isPrivateIdentifier,
  isPrologueDirective,
  isPropertyAccessChain,
  isPropertyAccessExpression,
  isPropertyDeclaration,
  isPropertyName,
  isPropertySignature,
  isQuestionToken,
  isSetAccessorDeclaration,
  isSourceFile,
  isStatement,
  isStatementOrBlock,
  isStringLiteral,
  isSuperKeyword,
  isSuperProperty,
  isThisIdentifier,
  isTypeAliasDeclaration,
  isTypeParameterDeclaration,
  isVariableDeclaration,
  isVariableStatement,
  LanguageVariant,
  lastOrUndefined,
  memoize,
  memoizeOne,
  ModifierFlags,
  modifiersToFlags,
  NodeFlags,
  nodeIsSynthesized,
  nullNodeConverters,
  nullParenthesizerRules,
  objectAllocator,
  OuterExpressionKinds,
  pseudoBigIntToString,
  reduceLeft,
  returnTrue,
  sameFlatMap,
  ScriptTarget,
  setEmitFlags,
  setIdentifierAutoGenerate,
  setIdentifierTypeArguments,
  setParent,
  setTextRange,
  singleOrUndefined,
  skipOuterExpressions,
  skipParentheses,
  some,
  startOnNewLine,
  startsWith,
  stringToToken,
  SyntaxKind,
  TokenFlags,
  TransformFlags,
  visitNode,
} from "../_namespaces/ts.js";

let nextAutoGenerateId = 0;

// /** @internal */
// export const enum NodeFactoryFlags {
//     None = 0,
//     // Disables the parenthesizer rules for the factory.
//     NoParenthesizerRules = 1 << 0,
//     // Disables the node converters for the factory.
//     NoNodeConverters = 1 << 1,
//     // Ensures new `PropertyAccessExpression` nodes are created with the `NoIndentation` emit flag set.
//     NoIndentationOnFreshPropertyAccess = 1 << 2,
//     // Do not set an `original` pointer when updating a node.
//     NoOriginalNode = 1 << 3,
// }
/** @internal */
export var NodeFactoryFlags;
(function (NodeFactoryFlags) {
    NodeFactoryFlags[NodeFactoryFlags["None"] = 0] = "None";
    // Disables the parenthesizer rules for the factory.
    NodeFactoryFlags[NodeFactoryFlags["NoParenthesizerRules"] = 1] = "NoParenthesizerRules";//1 << 0,
    // Disables the node converters for the factory.
    NodeFactoryFlags[NodeFactoryFlags["NoNodeConverters"] = 2] = "NoNodeConverters"; //1 << 1
    // Ensures new `PropertyAccessExpression` nodes are created with the `NoIndentation` emit flag set.
    NodeFactoryFlags[NodeFactoryFlags["NoIndentationOnFreshPropertyAccess"] = 4] = "NoIndentationOnFreshPropertyAccess"; //1 << 2
    // Do not set an `original` pointer when updating a node. 
    NodeFactoryFlags[NodeFactoryFlags["NoOriginalNode"] = 8] = "NoOriginalNode"; 1 << 3
})(NodeFactoryFlags || (NodeFactoryFlags = {}));

const nodeFactoryPatchers = [];

/** @internal @knipignore */
export function addNodeFactoryPatcher(fn) {
    nodeFactoryPatchers.push(fn);
}
/**
 * Creates a `NodeFactory` that can be used to create and update a syntax tree.
 * @param flags Flags that control factory behavior.
 * @param baseFactory A `BaseNodeFactory` used to create the base `Node` objects.
 *
 * @internal
 */
export function createNodeFactory(flags, baseFactory) {
    const setOriginal = flags & 8 /* NodeFactoryFlags.NoOriginalNode */ ? identity : setOriginalNode;
    // Lazily load the parenthesizer, node converters, and some factory methods until they are used.
    const parenthesizerRules = memoize(() => flags & 1 /* NodeFactoryFlags.NoParenthesizerRules */ ? nullParenthesizerRules : createParenthesizerRules(factory));
    const converters = memoize(() => flags & 2 /* NodeFactoryFlags.NoNodeConverters */ ? nullNodeConverters : createNodeConverters(factory));
    // lazy initializaton of common operator factories
    const getBinaryCreateFunction = memoizeOne((operator) => (left, right) => createBinaryExpression(left, operator, right));
    const getPrefixUnaryCreateFunction = memoizeOne((operator) => (operand) => createPrefixUnaryExpression(operator, operand));
    const getPostfixUnaryCreateFunction = memoizeOne((operator) => (operand) => createPostfixUnaryExpression(operand, operator));
    const getJSDocPrimaryTypeCreateFunction = memoizeOne((kind) => () => createJSDocPrimaryTypeWorker(kind));
    const getJSDocUnaryTypeCreateFunction = memoizeOne((kind) => (type) => createJSDocUnaryTypeWorker(kind, type));
    const getJSDocUnaryTypeUpdateFunction = memoizeOne((kind) => (node, type) => updateJSDocUnaryTypeWorker(kind, node, type));
    const getJSDocPrePostfixUnaryTypeCreateFunction = memoizeOne((kind) => (type, postfix) => createJSDocPrePostfixUnaryTypeWorker(kind, type, postfix));
    const getJSDocPrePostfixUnaryTypeUpdateFunction = memoizeOne((kind) => (node, type) => updateJSDocPrePostfixUnaryTypeWorker(kind, node, type));
    const getJSDocSimpleTagCreateFunction = memoizeOne((kind) => (tagName, comment) => createJSDocSimpleTagWorker(kind, tagName, comment));
    const getJSDocSimpleTagUpdateFunction = memoizeOne((kind) => (node, tagName, comment) => updateJSDocSimpleTagWorker(kind, node, tagName, comment));
    const getJSDocTypeLikeTagCreateFunction = memoizeOne((kind) => (tagName, typeExpression, comment) => createJSDocTypeLikeTagWorker(kind, tagName, typeExpression, comment));
    const getJSDocTypeLikeTagUpdateFunction = memoizeOne((kind) => (node, tagName, typeExpression, comment) => updateJSDocTypeLikeTagWorker(kind, node, tagName, typeExpression, comment));
    const factory = {
        get parenthesizer() {
            return parenthesizerRules();
        },
        get converters() {
            return converters();
        },
        baseFactory,
        flags,
        createNodeArray,
        createNumericLiteral,
        createBigIntLiteral,
        createStringLiteral,
        createStringLiteralFromNode,
        createRegularExpressionLiteral,
        createLiteralLikeNode,
        createIdentifier,
        createTempVariable,
        createLoopVariable,
        createUniqueName,
        getGeneratedNameForNode,
        createPrivateIdentifier,
        createUniquePrivateName,
        getGeneratedPrivateNameForNode,
        createToken,
        createSuper,
        createThis,
        createNull,
        createTrue,
        createFalse,
        createModifier,
        createModifiersFromModifierFlags,
        createQualifiedName,
        updateQualifiedName,
        createComputedPropertyName,
        updateComputedPropertyName,
        createTypeParameterDeclaration,
        updateTypeParameterDeclaration,
        createParameterDeclaration,
        updateParameterDeclaration,
        createDecorator,
        updateDecorator,
        createPropertySignature,
        updatePropertySignature,
        createPropertyDeclaration,
        updatePropertyDeclaration,
        createMethodSignature,
        updateMethodSignature,
        createMethodDeclaration,
        updateMethodDeclaration,
        createConstructorDeclaration,
        updateConstructorDeclaration,
        createGetAccessorDeclaration,
        updateGetAccessorDeclaration,
        createSetAccessorDeclaration,
        updateSetAccessorDeclaration,
        createCallSignature,
        updateCallSignature,
        createConstructSignature,
        updateConstructSignature,
        createIndexSignature,
        updateIndexSignature,
        createClassStaticBlockDeclaration,
        updateClassStaticBlockDeclaration,
        createTemplateLiteralTypeSpan,
        updateTemplateLiteralTypeSpan,
        createKeywordTypeNode,
        createTypePredicateNode,
        updateTypePredicateNode,
        createTypeReferenceNode,
        updateTypeReferenceNode,
        createFunctionTypeNode,
        updateFunctionTypeNode,
        createConstructorTypeNode,
        updateConstructorTypeNode,
        createTypeQueryNode,
        updateTypeQueryNode,
        createTypeLiteralNode,
        updateTypeLiteralNode,
        createArrayTypeNode,
        updateArrayTypeNode,
        createTupleTypeNode,
        updateTupleTypeNode,
        createNamedTupleMember,
        updateNamedTupleMember,
        createOptionalTypeNode,
        updateOptionalTypeNode,
        createRestTypeNode,
        updateRestTypeNode,
        createUnionTypeNode,
        updateUnionTypeNode,
        createIntersectionTypeNode,
        updateIntersectionTypeNode,
        createConditionalTypeNode,
        updateConditionalTypeNode,
        createInferTypeNode,
        updateInferTypeNode,
        createImportTypeNode,
        updateImportTypeNode,
        createParenthesizedType,
        updateParenthesizedType,
        createThisTypeNode,
        createTypeOperatorNode,
        updateTypeOperatorNode,
        createIndexedAccessTypeNode,
        updateIndexedAccessTypeNode,
        createMappedTypeNode,
        updateMappedTypeNode,
        createLiteralTypeNode,
        updateLiteralTypeNode,
        createTemplateLiteralType,
        updateTemplateLiteralType,
        createObjectBindingPattern,
        updateObjectBindingPattern,
        createArrayBindingPattern,
        updateArrayBindingPattern,
        createBindingElement,
        updateBindingElement,
        createArrayLiteralExpression,
        updateArrayLiteralExpression,
        createObjectLiteralExpression,
        updateObjectLiteralExpression,
        createPropertyAccessExpression: flags & 4 /* NodeFactoryFlags.NoIndentationOnFreshPropertyAccess */ ?
            (expression, name) => setEmitFlags(createPropertyAccessExpression(expression, name), EmitFlags.NoIndentation) :
            createPropertyAccessExpression,
        updatePropertyAccessExpression,
        createPropertyAccessChain: flags & 4 /* NodeFactoryFlags.NoIndentationOnFreshPropertyAccess */ ?
            (expression, questionDotToken, name) => setEmitFlags(createPropertyAccessChain(expression, questionDotToken, name), EmitFlags.NoIndentation) :
            createPropertyAccessChain,
        updatePropertyAccessChain,
        createElementAccessExpression,
        updateElementAccessExpression,
        createElementAccessChain,
        updateElementAccessChain,
        createCallExpression,
        updateCallExpression,
        createCallChain,
        updateCallChain,
        createNewExpression,
        updateNewExpression,
        createTaggedTemplateExpression,
        updateTaggedTemplateExpression,
        createTypeAssertion,
        updateTypeAssertion,
        createParenthesizedExpression,
        updateParenthesizedExpression,
        createFunctionExpression,
        updateFunctionExpression,
        createArrowFunction,
        updateArrowFunction,
        createDeleteExpression,
        updateDeleteExpression,
        createTypeOfExpression,
        updateTypeOfExpression,
        createVoidExpression,
        updateVoidExpression,
        createAwaitExpression,
        updateAwaitExpression,
        createPrefixUnaryExpression,
        updatePrefixUnaryExpression,
        createPostfixUnaryExpression,
        updatePostfixUnaryExpression,
        createBinaryExpression,
        updateBinaryExpression,
        createConditionalExpression,
        updateConditionalExpression,
        createTemplateExpression,
        updateTemplateExpression,
        createTemplateHead,
        createTemplateMiddle,
        createTemplateTail,
        createNoSubstitutionTemplateLiteral,
        createTemplateLiteralLikeNode,
        createYieldExpression,
        updateYieldExpression,
        createSpreadElement,
        updateSpreadElement,
        createClassExpression,
        updateClassExpression,
        createOmittedExpression,
        createExpressionWithTypeArguments,
        updateExpressionWithTypeArguments,
        createAsExpression,
        updateAsExpression,
        createNonNullExpression,
        updateNonNullExpression,
        createSatisfiesExpression,
        updateSatisfiesExpression,
        createNonNullChain,
        updateNonNullChain,
        createMetaProperty,
        updateMetaProperty,
        createTemplateSpan,
        updateTemplateSpan,
        createSemicolonClassElement,
        createBlock,
        updateBlock,
        createVariableStatement,
        updateVariableStatement,
        createEmptyStatement,
        createExpressionStatement,
        updateExpressionStatement,
        createIfStatement,
        updateIfStatement,
        createDoStatement,
        updateDoStatement,
        createWhileStatement,
        updateWhileStatement,
        createForStatement,
        updateForStatement,
        createForInStatement,
        updateForInStatement,
        createForOfStatement,
        updateForOfStatement,
        createContinueStatement,
        updateContinueStatement,
        createBreakStatement,
        updateBreakStatement,
        createReturnStatement,
        updateReturnStatement,
        createWithStatement,
        updateWithStatement,
        createSwitchStatement,
        updateSwitchStatement,
        createLabeledStatement,
        updateLabeledStatement,
        createThrowStatement,
        updateThrowStatement,
        createTryStatement,
        updateTryStatement,
        createDebuggerStatement,
        createVariableDeclaration,
        updateVariableDeclaration,
        createVariableDeclarationList,
        updateVariableDeclarationList,
        createFunctionDeclaration,
        updateFunctionDeclaration,
        createClassDeclaration,
        updateClassDeclaration,
        createInterfaceDeclaration,
        updateInterfaceDeclaration,
        createTypeAliasDeclaration,
        updateTypeAliasDeclaration,
        createEnumDeclaration,
        updateEnumDeclaration,
        createModuleDeclaration,
        updateModuleDeclaration,
        createModuleBlock,
        updateModuleBlock,
        createCaseBlock,
        updateCaseBlock,
        createNamespaceExportDeclaration,
        updateNamespaceExportDeclaration,
        createImportEqualsDeclaration,
        updateImportEqualsDeclaration,
        createImportDeclaration,
        updateImportDeclaration,
        createImportClause,
        updateImportClause,
        createAssertClause,
        updateAssertClause,
        createAssertEntry,
        updateAssertEntry,
        createImportTypeAssertionContainer,
        updateImportTypeAssertionContainer,
        createImportAttributes,
        updateImportAttributes,
        createImportAttribute,
        updateImportAttribute,
        createNamespaceImport,
        updateNamespaceImport,
        createNamespaceExport,
        updateNamespaceExport,
        createNamedImports,
        updateNamedImports,
        createImportSpecifier,
        updateImportSpecifier,
        createExportAssignment,
        updateExportAssignment,
        createExportDeclaration,
        updateExportDeclaration,
        createNamedExports,
        updateNamedExports,
        createExportSpecifier,
        updateExportSpecifier,
        createMissingDeclaration,
        createExternalModuleReference,
        updateExternalModuleReference,
        // lazily load factory members for JSDoc types with similar structure
        get createJSDocAllType() {
            return getJSDocPrimaryTypeCreateFunction(SyntaxKind.JSDocAllType);
        },
        get createJSDocUnknownType() {
            return getJSDocPrimaryTypeCreateFunction(SyntaxKind.JSDocUnknownType);
        },
        get createJSDocNonNullableType() {
            return getJSDocPrePostfixUnaryTypeCreateFunction(SyntaxKind.JSDocNonNullableType);
        },
        get updateJSDocNonNullableType() {
            return getJSDocPrePostfixUnaryTypeUpdateFunction(SyntaxKind.JSDocNonNullableType);
        },
        get createJSDocNullableType() {
            return getJSDocPrePostfixUnaryTypeCreateFunction(SyntaxKind.JSDocNullableType);
        },
        get updateJSDocNullableType() {
            return getJSDocPrePostfixUnaryTypeUpdateFunction(SyntaxKind.JSDocNullableType);
        },
        get createJSDocOptionalType() {
            return getJSDocUnaryTypeCreateFunction(SyntaxKind.JSDocOptionalType);
        },
        get updateJSDocOptionalType() {
            return getJSDocUnaryTypeUpdateFunction(SyntaxKind.JSDocOptionalType);
        },
        get createJSDocVariadicType() {
            return getJSDocUnaryTypeCreateFunction(SyntaxKind.JSDocVariadicType);
        },
        get updateJSDocVariadicType() {
            return getJSDocUnaryTypeUpdateFunction(SyntaxKind.JSDocVariadicType);
        },
        get createJSDocNamepathType() {
            return getJSDocUnaryTypeCreateFunction(SyntaxKind.JSDocNamepathType);
        },
        get updateJSDocNamepathType() {
            return getJSDocUnaryTypeUpdateFunction(SyntaxKind.JSDocNamepathType);
        },
        createJSDocFunctionType,
        updateJSDocFunctionType,
        createJSDocTypeLiteral,
        updateJSDocTypeLiteral,
        createJSDocTypeExpression,
        updateJSDocTypeExpression,
        createJSDocSignature,
        updateJSDocSignature,
        createJSDocTemplateTag,
        updateJSDocTemplateTag,
        createJSDocTypedefTag,
        updateJSDocTypedefTag,
        createJSDocParameterTag,
        updateJSDocParameterTag,
        createJSDocPropertyTag,
        updateJSDocPropertyTag,
        createJSDocCallbackTag,
        updateJSDocCallbackTag,
        createJSDocOverloadTag,
        updateJSDocOverloadTag,
        createJSDocAugmentsTag,
        updateJSDocAugmentsTag,
        createJSDocImplementsTag,
        updateJSDocImplementsTag,
        createJSDocSeeTag,
        updateJSDocSeeTag,
        createJSDocImportTag,
        updateJSDocImportTag,
        createJSDocNameReference,
        updateJSDocNameReference,
        createJSDocMemberName,
        updateJSDocMemberName,
        createJSDocLink,
        updateJSDocLink,
        createJSDocLinkCode,
        updateJSDocLinkCode,
        createJSDocLinkPlain,
        updateJSDocLinkPlain,
        // lazily load factory members for JSDoc tags with similar structure
        get createJSDocTypeTag() {
            return getJSDocTypeLikeTagCreateFunction(SyntaxKind.JSDocTypeTag);
        },
        get updateJSDocTypeTag() {
            return getJSDocTypeLikeTagUpdateFunction(SyntaxKind.JSDocTypeTag);
        },
        get createJSDocReturnTag() {
            return getJSDocTypeLikeTagCreateFunction(SyntaxKind.JSDocReturnTag);
        },
        get updateJSDocReturnTag() {
            return getJSDocTypeLikeTagUpdateFunction(SyntaxKind.JSDocReturnTag);
        },
        get createJSDocThisTag() {
            return getJSDocTypeLikeTagCreateFunction(SyntaxKind.JSDocThisTag);
        },
        get updateJSDocThisTag() {
            return getJSDocTypeLikeTagUpdateFunction(SyntaxKind.JSDocThisTag);
        },
        get createJSDocAuthorTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocAuthorTag);
        },
        get updateJSDocAuthorTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocAuthorTag);
        },
        get createJSDocClassTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocClassTag);
        },
        get updateJSDocClassTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocClassTag);
        },
        get createJSDocPublicTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocPublicTag);
        },
        get updateJSDocPublicTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocPublicTag);
        },
        get createJSDocPrivateTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocPrivateTag);
        },
        get updateJSDocPrivateTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocPrivateTag);
        },
        get createJSDocProtectedTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocProtectedTag);
        },
        get updateJSDocProtectedTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocProtectedTag);
        },
        get createJSDocReadonlyTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocReadonlyTag);
        },
        get updateJSDocReadonlyTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocReadonlyTag);
        },
        get createJSDocOverrideTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocOverrideTag);
        },
        get updateJSDocOverrideTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocOverrideTag);
        },
        get createJSDocDeprecatedTag() {
            return getJSDocSimpleTagCreateFunction(SyntaxKind.JSDocDeprecatedTag);
        },
        get updateJSDocDeprecatedTag() {
            return getJSDocSimpleTagUpdateFunction(SyntaxKind.JSDocDeprecatedTag);
        },
        get createJSDocThrowsTag() {
            return getJSDocTypeLikeTagCreateFunction(SyntaxKind.JSDocThrowsTag);
        },
        get updateJSDocThrowsTag() {
            return getJSDocTypeLikeTagUpdateFunction(SyntaxKind.JSDocThrowsTag);
        },
        get createJSDocSatisfiesTag() {
            return getJSDocTypeLikeTagCreateFunction(SyntaxKind.JSDocSatisfiesTag);
        },
        get updateJSDocSatisfiesTag() {
            return getJSDocTypeLikeTagUpdateFunction(SyntaxKind.JSDocSatisfiesTag);
        },
        createJSDocEnumTag,
        updateJSDocEnumTag,
        createJSDocUnknownTag,
        updateJSDocUnknownTag,
        createJSDocText,
        updateJSDocText,
        createJSDocComment,
        updateJSDocComment,
        createJsxElement,
        updateJsxElement,
        createJsxSelfClosingElement,
        updateJsxSelfClosingElement,
        createJsxOpeningElement,
        updateJsxOpeningElement,
        createJsxClosingElement,
        updateJsxClosingElement,
        createJsxFragment,
        createJsxText,
        updateJsxText,
        createJsxOpeningFragment,
        createJsxJsxClosingFragment,
        updateJsxFragment,
        createJsxAttribute,
        updateJsxAttribute,
        createJsxAttributes,
        updateJsxAttributes,
        createJsxSpreadAttribute,
        updateJsxSpreadAttribute,
        createJsxExpression,
        updateJsxExpression,
        createJsxNamespacedName,
        updateJsxNamespacedName,
        createCaseClause,
        updateCaseClause,
        createDefaultClause,
        updateDefaultClause,
        createHeritageClause,
        updateHeritageClause,
        createCatchClause,
        updateCatchClause,
        createPropertyAssignment,
        updatePropertyAssignment,
        createShorthandPropertyAssignment,
        updateShorthandPropertyAssignment,
        createSpreadAssignment,
        updateSpreadAssignment,
        createEnumMember,
        updateEnumMember,
        createSourceFile,
        updateSourceFile,
        createRedirectedSourceFile,
        createBundle,
        updateBundle,
        createSyntheticExpression,
        createSyntaxList,
        createNotEmittedStatement,
        createNotEmittedTypeElement,
        createPartiallyEmittedExpression,
        updatePartiallyEmittedExpression,
        createCommaListExpression,
        updateCommaListExpression,
        createSyntheticReferenceExpression,
        updateSyntheticReferenceExpression,
        cloneNode,
        // Lazily load factory methods for common operator factories and utilities
        get createComma() {
            return getBinaryCreateFunction(SyntaxKind.CommaToken);
        },
        get createAssignment() {
            return getBinaryCreateFunction(SyntaxKind.EqualsToken);
        },
        get createLogicalOr() {
            return getBinaryCreateFunction(SyntaxKind.BarBarToken);
        },
        get createLogicalAnd() {
            return getBinaryCreateFunction(SyntaxKind.AmpersandAmpersandToken);
        },
        get createBitwiseOr() {
            return getBinaryCreateFunction(SyntaxKind.BarToken);
        },
        get createBitwiseXor() {
            return getBinaryCreateFunction(SyntaxKind.CaretToken);
        },
        get createBitwiseAnd() {
            return getBinaryCreateFunction(SyntaxKind.AmpersandToken);
        },
        get createStrictEquality() {
            return getBinaryCreateFunction(SyntaxKind.EqualsEqualsEqualsToken);
        },
        get createStrictInequality() {
            return getBinaryCreateFunction(SyntaxKind.ExclamationEqualsEqualsToken);
        },
        get createEquality() {
            return getBinaryCreateFunction(SyntaxKind.EqualsEqualsToken);
        },
        get createInequality() {
            return getBinaryCreateFunction(SyntaxKind.ExclamationEqualsToken);
        },
        get createLessThan() {
            return getBinaryCreateFunction(SyntaxKind.LessThanToken);
        },
        get createLessThanEquals() {
            return getBinaryCreateFunction(SyntaxKind.LessThanEqualsToken);
        },
        get createGreaterThan() {
            return getBinaryCreateFunction(SyntaxKind.GreaterThanToken);
        },
        get createGreaterThanEquals() {
            return getBinaryCreateFunction(SyntaxKind.GreaterThanEqualsToken);
        },
        get createLeftShift() {
            return getBinaryCreateFunction(SyntaxKind.LessThanLessThanToken);
        },
        get createRightShift() {
            return getBinaryCreateFunction(SyntaxKind.GreaterThanGreaterThanToken);
        },
        get createUnsignedRightShift() {
            return getBinaryCreateFunction(SyntaxKind.GreaterThanGreaterThanGreaterThanToken);
        },
        get createAdd() {
            return getBinaryCreateFunction(SyntaxKind.PlusToken);
        },
        get createSubtract() {
            return getBinaryCreateFunction(SyntaxKind.MinusToken);
        },
        get createMultiply() {
            return getBinaryCreateFunction(SyntaxKind.AsteriskToken);
        },
        get createDivide() {
            return getBinaryCreateFunction(SyntaxKind.SlashToken);
        },
        get createModulo() {
            return getBinaryCreateFunction(SyntaxKind.PercentToken);
        },
        get createExponent() {
            return getBinaryCreateFunction(SyntaxKind.AsteriskAsteriskToken);
        },
        get createPrefixPlus() {
            return getPrefixUnaryCreateFunction(SyntaxKind.PlusToken);
        },
        get createPrefixMinus() {
            return getPrefixUnaryCreateFunction(SyntaxKind.MinusToken);
        },
        get createPrefixIncrement() {
            return getPrefixUnaryCreateFunction(SyntaxKind.PlusPlusToken);
        },
        get createPrefixDecrement() {
            return getPrefixUnaryCreateFunction(SyntaxKind.MinusMinusToken);
        },
        get createBitwiseNot() {
            return getPrefixUnaryCreateFunction(SyntaxKind.TildeToken);
        },
        get createLogicalNot() {
            return getPrefixUnaryCreateFunction(SyntaxKind.ExclamationToken);
        },
        get createPostfixIncrement() {
            return getPostfixUnaryCreateFunction(SyntaxKind.PlusPlusToken);
        },
        get createPostfixDecrement() {
            return getPostfixUnaryCreateFunction(SyntaxKind.MinusMinusToken);
        },
        // Compound nodes
        createImmediatelyInvokedFunctionExpression,
        createImmediatelyInvokedArrowFunction,
        createVoidZero,
        createExportDefault,
        createExternalModuleExport,
        createTypeCheck,
        createIsNotTypeCheck,
        createMethodCall,
        createGlobalMethodCall,
        createFunctionBindCall,
        createFunctionCallCall,
        createFunctionApplyCall,
        createArraySliceCall,
        createArrayConcatCall,
        createObjectDefinePropertyCall,
        createObjectGetOwnPropertyDescriptorCall,
        createReflectGetCall,
        createReflectSetCall,
        createPropertyDescriptor,
        createCallBinding,
        createAssignmentTargetWrapper,
        // Utilities
        inlineExpressions,
        getInternalName,
        getLocalName,
        getExportName,
        getDeclarationName,
        getNamespaceMemberName,
        getExternalModuleOrNamespaceExportName,
        restoreOuterExpressions,
        restoreEnclosingLabel,
        createUseStrictPrologue,
        copyPrologue,
        copyStandardPrologue,
        copyCustomPrologue,
        ensureUseStrict,
        liftToBlock,
        mergeLexicalEnvironment,
        replaceModifiers,
        replaceDecoratorsAndModifiers,
        replacePropertyName,
    };
    forEach(nodeFactoryPatchers, fn => fn(factory));
    return factory;
    // @api
    function createNodeArray(elements, hasTrailingComma) {
        if (elements === undefined || elements === emptyArray) {
            elements = [];
        }
        else if (isNodeArray(elements)) {
            if (hasTrailingComma === undefined || elements.hasTrailingComma === hasTrailingComma) {
                // Ensure the transform flags have been aggregated for this NodeArray
                if (elements.transformFlags === undefined) {
                    aggregateChildrenFlags(elements);
                }
                Debug.attachNodeArrayDebugInfo(elements);
                return elements;
            }
            // This *was* a `NodeArray`, but the `hasTrailingComma` option differs. Recreate the
            // array with the same elements, text range, and transform flags but with the updated
            // value for `hasTrailingComma`
            const array = elements.slice();
            array.pos = elements.pos;
            array.end = elements.end;
            array.hasTrailingComma = hasTrailingComma;
            array.transformFlags = elements.transformFlags;
            Debug.attachNodeArrayDebugInfo(array);
            return array;
        }
        // Since the element list of a node array is typically created by starting with an empty array and
        // repeatedly calling push(), the list may not have the optimal memory layout. We invoke slice() for
        // small arrays (1 to 4 elements) to give the VM a chance to allocate an optimal representation.
        const length = elements.length;
        const array = (length >= 1 && length <= 4 ? elements.slice() : elements);
        array.pos = -1;
        array.end = -1;
        array.hasTrailingComma = !!hasTrailingComma;
        array.transformFlags = TransformFlags.None;
        aggregateChildrenFlags(array);
        Debug.attachNodeArrayDebugInfo(array);
        return array;
    }
    function createBaseNode(kind) {
        return baseFactory.createBaseNode(kind);
    }
    function createBaseDeclaration(kind) {
        const node = createBaseNode(kind);
        node.symbol = undefined; // initialized by binder
        node.localSymbol = undefined; // initialized by binder
        return node;
    }
    function finishUpdateBaseSignatureDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used for quick info
            updated.typeArguments = original.typeArguments;
        }
        return update(updated, original);
    }
    //
    // Literals
    //
    // @api
    function createNumericLiteral(value, numericLiteralFlags = TokenFlags.None) {
        const text = typeof value === "number" ? value + "" : value;
        Debug.assert(text.charCodeAt(0) !== CharacterCodes.minus, "Negative numbers should be created in combination with createPrefixUnaryExpression");
        const node = createBaseDeclaration(SyntaxKind.NumericLiteral);
        node.text = text;
        node.numericLiteralFlags = numericLiteralFlags;
        if (numericLiteralFlags & TokenFlags.BinaryOrOctalSpecifier)
            node.transformFlags |= TransformFlags.ContainsES2015;
        return node;
    }
    // @api
    function createBigIntLiteral(value) {
        const node = createBaseToken(SyntaxKind.BigIntLiteral);
        node.text = typeof value === "string" ? value : pseudoBigIntToString(value) + "n";
        node.transformFlags |= TransformFlags.ContainsES2020;
        return node;
    }
    function createBaseStringLiteral(text, isSingleQuote) {
        const node = createBaseDeclaration(SyntaxKind.StringLiteral);
        node.text = text;
        node.singleQuote = isSingleQuote;
        return node;
    }
    // @api
    function createStringLiteral(text, isSingleQuote, hasExtendedUnicodeEscape) {
        const node = createBaseStringLiteral(text, isSingleQuote);
        node.hasExtendedUnicodeEscape = hasExtendedUnicodeEscape;
        if (hasExtendedUnicodeEscape)
            node.transformFlags |= TransformFlags.ContainsES2015;
        return node;
    }
    // @api
    function createStringLiteralFromNode(sourceNode) {
        const node = createBaseStringLiteral(getTextOfIdentifierOrLiteral(sourceNode), /*isSingleQuote*/ undefined);
        node.textSourceNode = sourceNode;
        return node;
    }
    // @api
    function createRegularExpressionLiteral(text) {
        const node = createBaseToken(SyntaxKind.RegularExpressionLiteral);
        node.text = text;
        return node;
    }
    // @api
    function createLiteralLikeNode(kind, text) {
        switch (kind) {
            case SyntaxKind.NumericLiteral:
                return createNumericLiteral(text, /*numericLiteralFlags*/ 0);
            case SyntaxKind.BigIntLiteral:
                return createBigIntLiteral(text);
            case SyntaxKind.StringLiteral:
                return createStringLiteral(text, /*isSingleQuote*/ undefined);
            case SyntaxKind.JsxText:
                return createJsxText(text, /*containsOnlyTriviaWhiteSpaces*/ false);
            case SyntaxKind.JsxTextAllWhiteSpaces:
                return createJsxText(text, /*containsOnlyTriviaWhiteSpaces*/ true);
            case SyntaxKind.RegularExpressionLiteral:
                return createRegularExpressionLiteral(text);
            case SyntaxKind.NoSubstitutionTemplateLiteral:
                return createTemplateLiteralLikeNode(kind, text, /*rawText*/ undefined, /*templateFlags*/ 0);
        }
    }
    //
    // Identifiers
    //
    function createBaseIdentifier(escapedText) {
        const node = baseFactory.createBaseIdentifierNode(SyntaxKind.Identifier);
        node.escapedText = escapedText;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.symbol = undefined; // initialized by checker
        return node;
    }
    function createBaseGeneratedIdentifier(text, autoGenerateFlags, prefix, suffix) {
        const node = createBaseIdentifier(escapeLeadingUnderscores(text));
        setIdentifierAutoGenerate(node, {
            flags: autoGenerateFlags,
            id: nextAutoGenerateId,
            prefix,
            suffix,
        });
        nextAutoGenerateId++;
        return node;
    }
    // @api
    function createIdentifier(text, originalKeywordKind, hasExtendedUnicodeEscape) {
        if (originalKeywordKind === undefined && text) {
            originalKeywordKind = stringToToken(text);
        }
        if (originalKeywordKind === SyntaxKind.Identifier) {
            originalKeywordKind = undefined;
        }
        const node = createBaseIdentifier(escapeLeadingUnderscores(text));
        if (hasExtendedUnicodeEscape)
            node.flags |= NodeFlags.IdentifierHasExtendedUnicodeEscape;
        // NOTE: we do not include transform flags of typeArguments in an identifier as they do not contribute to transformations
        if (node.escapedText === "await") {
            node.transformFlags |= TransformFlags.ContainsPossibleTopLevelAwait;
        }
        if (node.flags & NodeFlags.IdentifierHasExtendedUnicodeEscape) {
            node.transformFlags |= TransformFlags.ContainsES2015;
        }
        return node;
    }
    // @api
    function createTempVariable(recordTempVariable, reservedInNestedScopes, prefix, suffix) {
        let flags = GeneratedIdentifierFlags.Auto;
        if (reservedInNestedScopes)
            flags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
        const name = createBaseGeneratedIdentifier("", flags, prefix, suffix);
        if (recordTempVariable) {
            recordTempVariable(name);
        }
        return name;
    }
    /** Create a unique temporary variable for use in a loop. */
    // @api
    function createLoopVariable(reservedInNestedScopes) {
        let flags = GeneratedIdentifierFlags.Loop;
        if (reservedInNestedScopes)
            flags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
        return createBaseGeneratedIdentifier("", flags, /*prefix*/ undefined, /*suffix*/ undefined);
    }
    /** Create a unique name based on the supplied text. */
    // @api
    function createUniqueName(text, flags = GeneratedIdentifierFlags.None, prefix, suffix) {
        Debug.assert(!(flags & GeneratedIdentifierFlags.KindMask), "Argument out of range: flags");
        Debug.assert((flags & (GeneratedIdentifierFlags.Optimistic | GeneratedIdentifierFlags.FileLevel)) !== GeneratedIdentifierFlags.FileLevel, "GeneratedIdentifierFlags.FileLevel cannot be set without also setting GeneratedIdentifierFlags.Optimistic");
        return createBaseGeneratedIdentifier(text, GeneratedIdentifierFlags.Unique | flags, prefix, suffix);
    }
    /** Create a unique name generated for a node. */
    // @api
    function getGeneratedNameForNode(node, flags = 0, prefix, suffix) {
        Debug.assert(!(flags & GeneratedIdentifierFlags.KindMask), "Argument out of range: flags");
        const text = !node ? "" :
            isMemberName(node) ? formatGeneratedName(/*privateName*/ false, prefix, node, suffix, idText) :
                `generated@${getNodeId(node)}`;
        if (prefix || suffix)
            flags |= GeneratedIdentifierFlags.Optimistic;
        const name = createBaseGeneratedIdentifier(text, GeneratedIdentifierFlags.Node | flags, prefix, suffix);
        name.original = node;
        return name;
    }
    function createBasePrivateIdentifier(escapedText) {
        const node = baseFactory.createBasePrivateIdentifierNode(SyntaxKind.PrivateIdentifier);
        node.escapedText = escapedText;
        node.transformFlags |= TransformFlags.ContainsClassFields;
        return node;
    }
    // @api
    function createPrivateIdentifier(text) {
        if (!startsWith(text, "#"))
            Debug.fail("First character of private identifier must be #: " + text);
        return createBasePrivateIdentifier(escapeLeadingUnderscores(text));
    }
    function createBaseGeneratedPrivateIdentifier(text, autoGenerateFlags, prefix, suffix) {
        const node = createBasePrivateIdentifier(escapeLeadingUnderscores(text));
        setIdentifierAutoGenerate(node, {
            flags: autoGenerateFlags,
            id: nextAutoGenerateId,
            prefix,
            suffix,
        });
        nextAutoGenerateId++;
        return node;
    }
    /** Create a unique name based on the supplied text. */
    // @api
    function createUniquePrivateName(text, prefix, suffix) {
        if (text && !startsWith(text, "#"))
            Debug.fail("First character of private identifier must be #: " + text);
        const autoGenerateFlags = GeneratedIdentifierFlags.ReservedInNestedScopes |
            (text ? GeneratedIdentifierFlags.Unique : GeneratedIdentifierFlags.Auto);
        return createBaseGeneratedPrivateIdentifier(text !== null && text !== void 0 ? text : "", autoGenerateFlags, prefix, suffix);
    }
    // @api
    function getGeneratedPrivateNameForNode(node, prefix, suffix) {
        const text = isMemberName(node) ? formatGeneratedName(/*privateName*/ true, prefix, node, suffix, idText) :
            `#generated@${getNodeId(node)}`;
        const flags = prefix || suffix ? GeneratedIdentifierFlags.Optimistic : GeneratedIdentifierFlags.None;
        const name = createBaseGeneratedPrivateIdentifier(text, GeneratedIdentifierFlags.Node | flags, prefix, suffix);
        name.original = node;
        return name;
    }
    //
    // Punctuation
    //
    function createBaseToken(kind) {
        return baseFactory.createBaseTokenNode(kind);
    }
    function createToken(token) {
        Debug.assert(token >= SyntaxKind.FirstToken && token <= SyntaxKind.LastToken, "Invalid token");
        Debug.assert(token <= SyntaxKind.FirstTemplateToken || token >= SyntaxKind.LastTemplateToken, "Invalid token. Use 'createTemplateLiteralLikeNode' to create template literals.");
        Debug.assert(token <= SyntaxKind.FirstLiteralToken || token >= SyntaxKind.LastLiteralToken, "Invalid token. Use 'createLiteralLikeNode' to create literals.");
        Debug.assert(token !== SyntaxKind.Identifier, "Invalid token. Use 'createIdentifier' to create identifiers");
        const node = createBaseToken(token);
        let transformFlags = TransformFlags.None;
        switch (token) {
            case SyntaxKind.AsyncKeyword:
                // 'async' modifier is ES2017 (async functions) or ES2018 (async generators)
                transformFlags = TransformFlags.ContainsES2017 |
                    TransformFlags.ContainsES2018;
                break;
            case SyntaxKind.UsingKeyword:
                transformFlags = TransformFlags.ContainsESNext;
                break;
            case SyntaxKind.PublicKeyword:
            case SyntaxKind.PrivateKeyword:
            case SyntaxKind.ProtectedKeyword:
            case SyntaxKind.ReadonlyKeyword:
            case SyntaxKind.AbstractKeyword:
            case SyntaxKind.DeclareKeyword:
            case SyntaxKind.ConstKeyword:
            case SyntaxKind.AnyKeyword:
            case SyntaxKind.NumberKeyword:
            case SyntaxKind.BigIntKeyword:
            case SyntaxKind.NeverKeyword:
            case SyntaxKind.ObjectKeyword:
            case SyntaxKind.InKeyword:
            case SyntaxKind.OutKeyword:
            case SyntaxKind.OverrideKeyword:
            case SyntaxKind.StringKeyword:
            case SyntaxKind.BooleanKeyword:
            case SyntaxKind.SymbolKeyword:
            case SyntaxKind.VoidKeyword:
            case SyntaxKind.UnknownKeyword:
            case SyntaxKind.UndefinedKeyword: // `undefined` is an Identifier in the expression case.
                transformFlags = TransformFlags.ContainsTypeScript;
                break;
            case SyntaxKind.SuperKeyword:
                transformFlags = TransformFlags.ContainsES2015 | TransformFlags.ContainsLexicalSuper;
                node.flowNode = undefined; // initialized by binder (FlowContainer)
                break;
            case SyntaxKind.StaticKeyword:
                transformFlags = TransformFlags.ContainsES2015;
                break;
            case SyntaxKind.AccessorKeyword:
                transformFlags = TransformFlags.ContainsClassFields;
                break;
            case SyntaxKind.ThisKeyword:
                // 'this' indicates a lexical 'this'
                transformFlags = TransformFlags.ContainsLexicalThis;
                node.flowNode = undefined; // initialized by binder (FlowContainer)
                break;
        }
        if (transformFlags) {
            node.transformFlags |= transformFlags;
        }
        return node;
    }
    //
    // Reserved words
    //
    // @api
    function createSuper() {
        return createToken(SyntaxKind.SuperKeyword);
    }
    // @api
    function createThis() {
        return createToken(SyntaxKind.ThisKeyword);
    }
    // @api
    function createNull() {
        return createToken(SyntaxKind.NullKeyword);
    }
    // @api
    function createTrue() {
        return createToken(SyntaxKind.TrueKeyword);
    }
    // @api
    function createFalse() {
        return createToken(SyntaxKind.FalseKeyword);
    }
    //
    // Modifiers
    //
    // @api
    function createModifier(kind) {
        return createToken(kind);
    }
    // @api
    function createModifiersFromModifierFlags(flags) {
        const result = [];
        if (flags & ModifierFlags.Export)
            result.push(createModifier(SyntaxKind.ExportKeyword));
        if (flags & ModifierFlags.Ambient)
            result.push(createModifier(SyntaxKind.DeclareKeyword));
        if (flags & ModifierFlags.Default)
            result.push(createModifier(SyntaxKind.DefaultKeyword));
        if (flags & ModifierFlags.Const)
            result.push(createModifier(SyntaxKind.ConstKeyword));
        if (flags & ModifierFlags.Public)
            result.push(createModifier(SyntaxKind.PublicKeyword));
        if (flags & ModifierFlags.Private)
            result.push(createModifier(SyntaxKind.PrivateKeyword));
        if (flags & ModifierFlags.Protected)
            result.push(createModifier(SyntaxKind.ProtectedKeyword));
        if (flags & ModifierFlags.Abstract)
            result.push(createModifier(SyntaxKind.AbstractKeyword));
        if (flags & ModifierFlags.Static)
            result.push(createModifier(SyntaxKind.StaticKeyword));
        if (flags & ModifierFlags.Override)
            result.push(createModifier(SyntaxKind.OverrideKeyword));
        if (flags & ModifierFlags.Readonly)
            result.push(createModifier(SyntaxKind.ReadonlyKeyword));
        if (flags & ModifierFlags.Accessor)
            result.push(createModifier(SyntaxKind.AccessorKeyword));
        if (flags & ModifierFlags.Async)
            result.push(createModifier(SyntaxKind.AsyncKeyword));
        if (flags & ModifierFlags.In)
            result.push(createModifier(SyntaxKind.InKeyword));
        if (flags & ModifierFlags.Out)
            result.push(createModifier(SyntaxKind.OutKeyword));
        return result.length ? result : undefined;
    }
    //
    // Names
    //
    // @api
    function createQualifiedName(left, right) {
        const node = createBaseNode(SyntaxKind.QualifiedName);
        node.left = left;
        node.right = asName(right);
        node.transformFlags |= propagateChildFlags(node.left) |
            propagateIdentifierNameFlags(node.right);
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateQualifiedName(node, left, right) {
        return node.left !== left
            || node.right !== right
            ? update(createQualifiedName(left, right), node)
            : node;
    }
    // @api
    function createComputedPropertyName(expression) {
        const node = createBaseNode(SyntaxKind.ComputedPropertyName);
        node.expression = parenthesizerRules().parenthesizeExpressionOfComputedPropertyName(expression);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsES2015 |
            TransformFlags.ContainsComputedPropertyName;
        return node;
    }
    // @api
    function updateComputedPropertyName(node, expression) {
        return node.expression !== expression
            ? update(createComputedPropertyName(expression), node)
            : node;
    }
    //
    // Signature elements
    //
    // @api
    function createTypeParameterDeclaration(modifiers, name, constraint, defaultType) {
        const node = createBaseDeclaration(SyntaxKind.TypeParameter);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.constraint = constraint;
        node.default = defaultType;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.expression = undefined; // initialized by parser to report grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateTypeParameterDeclaration(node, modifiers, name, constraint, defaultType) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.constraint !== constraint
            || node.default !== defaultType
            ? update(createTypeParameterDeclaration(modifiers, name, constraint, defaultType), node)
            : node;
    }
    // @api
    function createParameterDeclaration(modifiers, dotDotDotToken, name, questionToken, type, initializer) {
        var _a, _b;
        const node = createBaseDeclaration(SyntaxKind.Parameter);
        node.modifiers = asNodeArray(modifiers);
        node.dotDotDotToken = dotDotDotToken;
        node.name = asName(name);
        node.questionToken = questionToken;
        node.type = type;
        node.initializer = asInitializer(initializer);
        if (isThisIdentifier(node.name)) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            node.transformFlags = propagateChildrenFlags(node.modifiers) |
                propagateChildFlags(node.dotDotDotToken) |
                propagateNameFlags(node.name) |
                propagateChildFlags(node.questionToken) |
                propagateChildFlags(node.initializer) |
                (((_a = node.questionToken) !== null && _a !== void 0 ? _a : node.type) ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
                (((_b = node.dotDotDotToken) !== null && _b !== void 0 ? _b : node.initializer) ? TransformFlags.ContainsES2015 : TransformFlags.None) |
                (modifiersToFlags(node.modifiers) & ModifierFlags.ParameterPropertyModifier ? TransformFlags.ContainsTypeScriptClassSyntax : TransformFlags.None);
        }
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateParameterDeclaration(node, modifiers, dotDotDotToken, name, questionToken, type, initializer) {
        return node.modifiers !== modifiers
            || node.dotDotDotToken !== dotDotDotToken
            || node.name !== name
            || node.questionToken !== questionToken
            || node.type !== type
            || node.initializer !== initializer
            ? update(createParameterDeclaration(modifiers, dotDotDotToken, name, questionToken, type, initializer), node)
            : node;
    }
    // @api
    function createDecorator(expression) {
        const node = createBaseNode(SyntaxKind.Decorator);
        node.expression = parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsTypeScript |
            TransformFlags.ContainsTypeScriptClassSyntax |
            TransformFlags.ContainsDecorators;
        return node;
    }
    // @api
    function updateDecorator(node, expression) {
        return node.expression !== expression
            ? update(createDecorator(expression), node)
            : node;
    }
    //
    // Type Elements
    //
    // @api
    function createPropertySignature(modifiers, name, questionToken, type) {
        const node = createBaseDeclaration(SyntaxKind.PropertySignature);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.type = type;
        node.questionToken = questionToken;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.initializer = undefined; // initialized by parser to report grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updatePropertySignature(node, modifiers, name, questionToken, type) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.questionToken !== questionToken
            || node.type !== type
            ? finishUpdatePropertySignature(createPropertySignature(modifiers, name, questionToken, type), node)
            : node;
    }
    function finishUpdatePropertySignature(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.initializer = original.initializer;
        }
        return update(updated, original);
    }
    // @api
    function createPropertyDeclaration(modifiers, name, questionOrExclamationToken, type, initializer) {
        const node = createBaseDeclaration(SyntaxKind.PropertyDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.questionToken = questionOrExclamationToken && isQuestionToken(questionOrExclamationToken) ? questionOrExclamationToken : undefined;
        node.exclamationToken = questionOrExclamationToken && isExclamationToken(questionOrExclamationToken) ? questionOrExclamationToken : undefined;
        node.type = type;
        node.initializer = asInitializer(initializer);
        const isAmbient = node.flags & NodeFlags.Ambient || modifiersToFlags(node.modifiers) & ModifierFlags.Ambient;
        node.transformFlags = propagateChildrenFlags(node.modifiers) |
            propagateNameFlags(node.name) |
            propagateChildFlags(node.initializer) |
            (isAmbient || node.questionToken || node.exclamationToken || node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
            (isComputedPropertyName(node.name) || modifiersToFlags(node.modifiers) & ModifierFlags.Static && node.initializer ? TransformFlags.ContainsTypeScriptClassSyntax : TransformFlags.None) |
            TransformFlags.ContainsClassFields;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updatePropertyDeclaration(node, modifiers, name, questionOrExclamationToken, type, initializer) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.questionToken !== (questionOrExclamationToken !== undefined && isQuestionToken(questionOrExclamationToken) ? questionOrExclamationToken : undefined)
            || node.exclamationToken !== (questionOrExclamationToken !== undefined && isExclamationToken(questionOrExclamationToken) ? questionOrExclamationToken : undefined)
            || node.type !== type
            || node.initializer !== initializer
            ? update(createPropertyDeclaration(modifiers, name, questionOrExclamationToken, type, initializer), node)
            : node;
    }
    // @api
    function createMethodSignature(modifiers, name, questionToken, typeParameters, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.MethodSignature);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.questionToken = questionToken;
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = asNodeArray(parameters);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    // @api
    function updateMethodSignature(node, modifiers, name, questionToken, typeParameters, parameters, type) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.questionToken !== questionToken
            || node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            ? finishUpdateBaseSignatureDeclaration(createMethodSignature(modifiers, name, questionToken, typeParameters, parameters, type), node)
            : node;
    }
    // @api
    function createMethodDeclaration(modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body) {
        const node = createBaseDeclaration(SyntaxKind.MethodDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.asteriskToken = asteriskToken;
        node.name = asName(name);
        node.questionToken = questionToken;
        node.exclamationToken = undefined; // initialized by parser for grammar errors
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = createNodeArray(parameters);
        node.type = type;
        node.body = body;
        if (!node.body) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            const isAsync = modifiersToFlags(node.modifiers) & ModifierFlags.Async;
            const isGenerator = !!node.asteriskToken;
            const isAsyncGenerator = isAsync && isGenerator;
            node.transformFlags = propagateChildrenFlags(node.modifiers) |
                propagateChildFlags(node.asteriskToken) |
                propagateNameFlags(node.name) |
                propagateChildFlags(node.questionToken) |
                propagateChildrenFlags(node.typeParameters) |
                propagateChildrenFlags(node.parameters) |
                propagateChildFlags(node.type) |
                (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
                (isAsyncGenerator ? TransformFlags.ContainsES2018 :
                    isAsync ? TransformFlags.ContainsES2017 :
                        isGenerator ? TransformFlags.ContainsGenerator :
                            TransformFlags.None) |
                (node.questionToken || node.typeParameters || node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
                TransformFlags.ContainsES2015;
        }
        node.typeArguments = undefined; // used in quick info
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateMethodDeclaration(node, modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body) {
        return node.modifiers !== modifiers
            || node.asteriskToken !== asteriskToken
            || node.name !== name
            || node.questionToken !== questionToken
            || node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            || node.body !== body
            ? finishUpdateMethodDeclaration(createMethodDeclaration(modifiers, asteriskToken, name, questionToken, typeParameters, parameters, type, body), node)
            : node;
    }
    function finishUpdateMethodDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.exclamationToken = original.exclamationToken;
        }
        return update(updated, original);
    }
    // @api
    function createClassStaticBlockDeclaration(body) {
        const node = createBaseDeclaration(SyntaxKind.ClassStaticBlockDeclaration);
        node.body = body;
        node.transformFlags = propagateChildFlags(body) | TransformFlags.ContainsClassFields;
        node.modifiers = undefined; // initialized by parser for grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateClassStaticBlockDeclaration(node, body) {
        return node.body !== body
            ? finishUpdateClassStaticBlockDeclaration(createClassStaticBlockDeclaration(body), node)
            : node;
    }
    function finishUpdateClassStaticBlockDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.modifiers = original.modifiers;
        }
        return update(updated, original);
    }
    // @api
    function createConstructorDeclaration(modifiers, parameters, body) {
        const node = createBaseDeclaration(SyntaxKind.Constructor);
        node.modifiers = asNodeArray(modifiers);
        node.parameters = createNodeArray(parameters);
        node.body = body;
        if (!node.body) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            node.transformFlags = propagateChildrenFlags(node.modifiers) |
                propagateChildrenFlags(node.parameters) |
                (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
                TransformFlags.ContainsES2015;
        }
        node.typeParameters = undefined; // initialized by parser for grammar errors
        node.type = undefined; // initialized by parser for grammar errors
        node.typeArguments = undefined; // used in quick info
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateConstructorDeclaration(node, modifiers, parameters, body) {
        return node.modifiers !== modifiers
            || node.parameters !== parameters
            || node.body !== body
            ? finishUpdateConstructorDeclaration(createConstructorDeclaration(modifiers, parameters, body), node)
            : node;
    }
    function finishUpdateConstructorDeclaration(updated, original) {
        if (updated !== original) {
            updated.typeParameters = original.typeParameters;
            updated.type = original.type;
        }
        return finishUpdateBaseSignatureDeclaration(updated, original);
    }
    // @api
    function createGetAccessorDeclaration(modifiers, name, parameters, type, body) {
        const node = createBaseDeclaration(SyntaxKind.GetAccessor);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.parameters = createNodeArray(parameters);
        node.type = type;
        node.body = body;
        if (!node.body) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            node.transformFlags = propagateChildrenFlags(node.modifiers) |
                propagateNameFlags(node.name) |
                propagateChildrenFlags(node.parameters) |
                propagateChildFlags(node.type) |
                (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
                (node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None);
        }
        node.typeArguments = undefined; // used in quick info
        node.typeParameters = undefined; // initialized by parser for grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateGetAccessorDeclaration(node, modifiers, name, parameters, type, body) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.parameters !== parameters
            || node.type !== type
            || node.body !== body
            ? finishUpdateGetAccessorDeclaration(createGetAccessorDeclaration(modifiers, name, parameters, type, body), node)
            : node;
    }
    function finishUpdateGetAccessorDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.typeParameters = original.typeParameters;
        }
        return finishUpdateBaseSignatureDeclaration(updated, original);
    }
    // @api
    function createSetAccessorDeclaration(modifiers, name, parameters, body) {
        const node = createBaseDeclaration(SyntaxKind.SetAccessor);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.parameters = createNodeArray(parameters);
        node.body = body;
        if (!node.body) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            node.transformFlags = propagateChildrenFlags(node.modifiers) |
                propagateNameFlags(node.name) |
                propagateChildrenFlags(node.parameters) |
                (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
                (node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None);
        }
        node.typeArguments = undefined; // used in quick info
        node.typeParameters = undefined; // initialized by parser for grammar errors
        node.type = undefined; // initialized by parser for grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateSetAccessorDeclaration(node, modifiers, name, parameters, body) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.parameters !== parameters
            || node.body !== body
            ? finishUpdateSetAccessorDeclaration(createSetAccessorDeclaration(modifiers, name, parameters, body), node)
            : node;
    }
    function finishUpdateSetAccessorDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.typeParameters = original.typeParameters;
            updated.type = original.type;
        }
        return finishUpdateBaseSignatureDeclaration(updated, original);
    }
    // @api
    function createCallSignature(typeParameters, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.CallSignature);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = asNodeArray(parameters);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    // @api
    function updateCallSignature(node, typeParameters, parameters, type) {
        return node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            ? finishUpdateBaseSignatureDeclaration(createCallSignature(typeParameters, parameters, type), node)
            : node;
    }
    // @api
    function createConstructSignature(typeParameters, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.ConstructSignature);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = asNodeArray(parameters);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    // @api
    function updateConstructSignature(node, typeParameters, parameters, type) {
        return node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            ? finishUpdateBaseSignatureDeclaration(createConstructSignature(typeParameters, parameters, type), node)
            : node;
    }
    // @api
    function createIndexSignature(modifiers, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.IndexSignature);
        node.modifiers = asNodeArray(modifiers);
        node.parameters = asNodeArray(parameters);
        node.type = type; // TODO(rbuckton): We mark this as required in IndexSignatureDeclaration, but it looks like the parser allows it to be elided.
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    // @api
    function updateIndexSignature(node, modifiers, parameters, type) {
        return node.parameters !== parameters
            || node.type !== type
            || node.modifiers !== modifiers
            ? finishUpdateBaseSignatureDeclaration(createIndexSignature(modifiers, parameters, type), node)
            : node;
    }
    // @api
    function createTemplateLiteralTypeSpan(type, literal) {
        const node = createBaseNode(SyntaxKind.TemplateLiteralTypeSpan);
        node.type = type;
        node.literal = literal;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTemplateLiteralTypeSpan(node, type, literal) {
        return node.type !== type
            || node.literal !== literal
            ? update(createTemplateLiteralTypeSpan(type, literal), node)
            : node;
    }
    //
    // Types
    //
    // @api
    function createKeywordTypeNode(kind) {
        return createToken(kind);
    }
    // @api
    function createTypePredicateNode(assertsModifier, parameterName, type) {
        const node = createBaseNode(SyntaxKind.TypePredicate);
        node.assertsModifier = assertsModifier;
        node.parameterName = asName(parameterName);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTypePredicateNode(node, assertsModifier, parameterName, type) {
        return node.assertsModifier !== assertsModifier
            || node.parameterName !== parameterName
            || node.type !== type
            ? update(createTypePredicateNode(assertsModifier, parameterName, type), node)
            : node;
    }
    // @api
    function createTypeReferenceNode(typeName, typeArguments) {
        const node = createBaseNode(SyntaxKind.TypeReference);
        node.typeName = asName(typeName);
        node.typeArguments = typeArguments && parenthesizerRules().parenthesizeTypeArguments(createNodeArray(typeArguments));
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTypeReferenceNode(node, typeName, typeArguments) {
        return node.typeName !== typeName
            || node.typeArguments !== typeArguments
            ? update(createTypeReferenceNode(typeName, typeArguments), node)
            : node;
    }
    // @api
    function createFunctionTypeNode(typeParameters, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.FunctionType);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = asNodeArray(parameters);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.modifiers = undefined; // initialized by parser for grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    // @api
    function updateFunctionTypeNode(node, typeParameters, parameters, type) {
        return node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            ? finishUpdateFunctionTypeNode(createFunctionTypeNode(typeParameters, parameters, type), node)
            : node;
    }
    function finishUpdateFunctionTypeNode(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.modifiers = original.modifiers;
        }
        return finishUpdateBaseSignatureDeclaration(updated, original);
    }
    // @api
    function createConstructorTypeNode(...args) {
        return args.length === 4 ? createConstructorTypeNode1(...args) :
            args.length === 3 ? createConstructorTypeNode2(...args) :
                Debug.fail("Incorrect number of arguments specified.");
    }
    function createConstructorTypeNode1(modifiers, typeParameters, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.ConstructorType);
        node.modifiers = asNodeArray(modifiers);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = asNodeArray(parameters);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    /** @deprecated */
    function createConstructorTypeNode2(typeParameters, parameters, type) {
        return createConstructorTypeNode1(/*modifiers*/ undefined, typeParameters, parameters, type);
    }
    // @api
    function updateConstructorTypeNode(...args) {
        return args.length === 5 ? updateConstructorTypeNode1(...args) :
            args.length === 4 ? updateConstructorTypeNode2(...args) :
                Debug.fail("Incorrect number of arguments specified.");
    }
    function updateConstructorTypeNode1(node, modifiers, typeParameters, parameters, type) {
        return node.modifiers !== modifiers
            || node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            ? finishUpdateBaseSignatureDeclaration(createConstructorTypeNode(modifiers, typeParameters, parameters, type), node)
            : node;
    }
    /** @deprecated */
    function updateConstructorTypeNode2(node, typeParameters, parameters, type) {
        return updateConstructorTypeNode1(node, node.modifiers, typeParameters, parameters, type);
    }
    // @api
    function createTypeQueryNode(exprName, typeArguments) {
        const node = createBaseNode(SyntaxKind.TypeQuery);
        node.exprName = exprName;
        node.typeArguments = typeArguments && parenthesizerRules().parenthesizeTypeArguments(typeArguments);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTypeQueryNode(node, exprName, typeArguments) {
        return node.exprName !== exprName
            || node.typeArguments !== typeArguments
            ? update(createTypeQueryNode(exprName, typeArguments), node)
            : node;
    }
    // @api
    function createTypeLiteralNode(members) {
        const node = createBaseDeclaration(SyntaxKind.TypeLiteral);
        node.members = createNodeArray(members);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTypeLiteralNode(node, members) {
        return node.members !== members
            ? update(createTypeLiteralNode(members), node)
            : node;
    }
    // @api
    function createArrayTypeNode(elementType) {
        const node = createBaseNode(SyntaxKind.ArrayType);
        node.elementType = parenthesizerRules().parenthesizeNonArrayTypeOfPostfixType(elementType);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateArrayTypeNode(node, elementType) {
        return node.elementType !== elementType
            ? update(createArrayTypeNode(elementType), node)
            : node;
    }
    // @api
    function createTupleTypeNode(elements) {
        const node = createBaseNode(SyntaxKind.TupleType);
        node.elements = createNodeArray(parenthesizerRules().parenthesizeElementTypesOfTupleType(elements));
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTupleTypeNode(node, elements) {
        return node.elements !== elements
            ? update(createTupleTypeNode(elements), node)
            : node;
    }
    // @api
    function createNamedTupleMember(dotDotDotToken, name, questionToken, type) {
        const node = createBaseDeclaration(SyntaxKind.NamedTupleMember);
        node.dotDotDotToken = dotDotDotToken;
        node.name = name;
        node.questionToken = questionToken;
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateNamedTupleMember(node, dotDotDotToken, name, questionToken, type) {
        return node.dotDotDotToken !== dotDotDotToken
            || node.name !== name
            || node.questionToken !== questionToken
            || node.type !== type
            ? update(createNamedTupleMember(dotDotDotToken, name, questionToken, type), node)
            : node;
    }
    // @api
    function createOptionalTypeNode(type) {
        const node = createBaseNode(SyntaxKind.OptionalType);
        node.type = parenthesizerRules().parenthesizeTypeOfOptionalType(type);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateOptionalTypeNode(node, type) {
        return node.type !== type
            ? update(createOptionalTypeNode(type), node)
            : node;
    }
    // @api
    function createRestTypeNode(type) {
        const node = createBaseNode(SyntaxKind.RestType);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateRestTypeNode(node, type) {
        return node.type !== type
            ? update(createRestTypeNode(type), node)
            : node;
    }
    function createUnionOrIntersectionTypeNode(kind, types, parenthesize) {
        const node = createBaseNode(kind);
        node.types = factory.createNodeArray(parenthesize(types));
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    function updateUnionOrIntersectionTypeNode(node, types, parenthesize) {
        return node.types !== types
            ? update(createUnionOrIntersectionTypeNode(node.kind, types, parenthesize), node)
            : node;
    }
    // @api
    function createUnionTypeNode(types) {
        return createUnionOrIntersectionTypeNode(SyntaxKind.UnionType, types, parenthesizerRules().parenthesizeConstituentTypesOfUnionType);
    }
    // @api
    function updateUnionTypeNode(node, types) {
        return updateUnionOrIntersectionTypeNode(node, types, parenthesizerRules().parenthesizeConstituentTypesOfUnionType);
    }
    // @api
    function createIntersectionTypeNode(types) {
        return createUnionOrIntersectionTypeNode(SyntaxKind.IntersectionType, types, parenthesizerRules().parenthesizeConstituentTypesOfIntersectionType);
    }
    // @api
    function updateIntersectionTypeNode(node, types) {
        return updateUnionOrIntersectionTypeNode(node, types, parenthesizerRules().parenthesizeConstituentTypesOfIntersectionType);
    }
    // @api
    function createConditionalTypeNode(checkType, extendsType, trueType, falseType) {
        const node = createBaseNode(SyntaxKind.ConditionalType);
        node.checkType = parenthesizerRules().parenthesizeCheckTypeOfConditionalType(checkType);
        node.extendsType = parenthesizerRules().parenthesizeExtendsTypeOfConditionalType(extendsType);
        node.trueType = trueType;
        node.falseType = falseType;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateConditionalTypeNode(node, checkType, extendsType, trueType, falseType) {
        return node.checkType !== checkType
            || node.extendsType !== extendsType
            || node.trueType !== trueType
            || node.falseType !== falseType
            ? update(createConditionalTypeNode(checkType, extendsType, trueType, falseType), node)
            : node;
    }
    // @api
    function createInferTypeNode(typeParameter) {
        const node = createBaseNode(SyntaxKind.InferType);
        node.typeParameter = typeParameter;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateInferTypeNode(node, typeParameter) {
        return node.typeParameter !== typeParameter
            ? update(createInferTypeNode(typeParameter), node)
            : node;
    }
    // @api
    function createTemplateLiteralType(head, templateSpans) {
        const node = createBaseNode(SyntaxKind.TemplateLiteralType);
        node.head = head;
        node.templateSpans = createNodeArray(templateSpans);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTemplateLiteralType(node, head, templateSpans) {
        return node.head !== head
            || node.templateSpans !== templateSpans
            ? update(createTemplateLiteralType(head, templateSpans), node)
            : node;
    }
    // @api
    function createImportTypeNode(argument, attributes, qualifier, typeArguments, isTypeOf = false) {
        const node = createBaseNode(SyntaxKind.ImportType);
        node.argument = argument;
        node.attributes = attributes;
        if (node.assertions && node.assertions.assertClause && node.attributes) {
            node.assertions.assertClause = node.attributes;
        }
        node.qualifier = qualifier;
        node.typeArguments = typeArguments && parenthesizerRules().parenthesizeTypeArguments(typeArguments);
        node.isTypeOf = isTypeOf;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateImportTypeNode(node, argument, attributes, qualifier, typeArguments, isTypeOf = node.isTypeOf) {
        return node.argument !== argument
            || node.attributes !== attributes
            || node.qualifier !== qualifier
            || node.typeArguments !== typeArguments
            || node.isTypeOf !== isTypeOf
            ? update(createImportTypeNode(argument, attributes, qualifier, typeArguments, isTypeOf), node)
            : node;
    }
    // @api
    function createParenthesizedType(type) {
        const node = createBaseNode(SyntaxKind.ParenthesizedType);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateParenthesizedType(node, type) {
        return node.type !== type
            ? update(createParenthesizedType(type), node)
            : node;
    }
    // @api
    function createThisTypeNode() {
        const node = createBaseNode(SyntaxKind.ThisType);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function createTypeOperatorNode(operator, type) {
        const node = createBaseNode(SyntaxKind.TypeOperator);
        node.operator = operator;
        node.type = operator === SyntaxKind.ReadonlyKeyword ?
            parenthesizerRules().parenthesizeOperandOfReadonlyTypeOperator(type) :
            parenthesizerRules().parenthesizeOperandOfTypeOperator(type);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTypeOperatorNode(node, type) {
        return node.type !== type
            ? update(createTypeOperatorNode(node.operator, type), node)
            : node;
    }
    // @api
    function createIndexedAccessTypeNode(objectType, indexType) {
        const node = createBaseNode(SyntaxKind.IndexedAccessType);
        node.objectType = parenthesizerRules().parenthesizeNonArrayTypeOfPostfixType(objectType);
        node.indexType = indexType;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateIndexedAccessTypeNode(node, objectType, indexType) {
        return node.objectType !== objectType
            || node.indexType !== indexType
            ? update(createIndexedAccessTypeNode(objectType, indexType), node)
            : node;
    }
    // @api
    function createMappedTypeNode(readonlyToken, typeParameter, nameType, questionToken, type, members) {
        const node = createBaseDeclaration(SyntaxKind.MappedType);
        node.readonlyToken = readonlyToken;
        node.typeParameter = typeParameter;
        node.nameType = nameType;
        node.questionToken = questionToken;
        node.type = type;
        node.members = members && createNodeArray(members);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateMappedTypeNode(node, readonlyToken, typeParameter, nameType, questionToken, type, members) {
        return node.readonlyToken !== readonlyToken
            || node.typeParameter !== typeParameter
            || node.nameType !== nameType
            || node.questionToken !== questionToken
            || node.type !== type
            || node.members !== members
            ? update(createMappedTypeNode(readonlyToken, typeParameter, nameType, questionToken, type, members), node)
            : node;
    }
    // @api
    function createLiteralTypeNode(literal) {
        const node = createBaseNode(SyntaxKind.LiteralType);
        node.literal = literal;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateLiteralTypeNode(node, literal) {
        return node.literal !== literal
            ? update(createLiteralTypeNode(literal), node)
            : node;
    }
    //
    // Binding Patterns
    //
    // @api
    function createObjectBindingPattern(elements) {
        const node = createBaseNode(SyntaxKind.ObjectBindingPattern);
        node.elements = createNodeArray(elements);
        node.transformFlags |= propagateChildrenFlags(node.elements) |
            TransformFlags.ContainsES2015 |
            TransformFlags.ContainsBindingPattern;
        if (node.transformFlags & TransformFlags.ContainsRestOrSpread) {
            node.transformFlags |= TransformFlags.ContainsES2018 |
                TransformFlags.ContainsObjectRestOrSpread;
        }
        return node;
    }
    // @api
    function updateObjectBindingPattern(node, elements) {
        return node.elements !== elements
            ? update(createObjectBindingPattern(elements), node)
            : node;
    }
    // @api
    function createArrayBindingPattern(elements) {
        const node = createBaseNode(SyntaxKind.ArrayBindingPattern);
        node.elements = createNodeArray(elements);
        node.transformFlags |= propagateChildrenFlags(node.elements) |
            TransformFlags.ContainsES2015 |
            TransformFlags.ContainsBindingPattern;
        return node;
    }
    // @api
    function updateArrayBindingPattern(node, elements) {
        return node.elements !== elements
            ? update(createArrayBindingPattern(elements), node)
            : node;
    }
    // @api
    function createBindingElement(dotDotDotToken, propertyName, name, initializer) {
        const node = createBaseDeclaration(SyntaxKind.BindingElement);
        node.dotDotDotToken = dotDotDotToken;
        node.propertyName = asName(propertyName);
        node.name = asName(name);
        node.initializer = asInitializer(initializer);
        node.transformFlags |= propagateChildFlags(node.dotDotDotToken) |
            propagateNameFlags(node.propertyName) |
            propagateNameFlags(node.name) |
            propagateChildFlags(node.initializer) |
            (node.dotDotDotToken ? TransformFlags.ContainsRestOrSpread : TransformFlags.None) |
            TransformFlags.ContainsES2015;
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateBindingElement(node, dotDotDotToken, propertyName, name, initializer) {
        return node.propertyName !== propertyName
            || node.dotDotDotToken !== dotDotDotToken
            || node.name !== name
            || node.initializer !== initializer
            ? update(createBindingElement(dotDotDotToken, propertyName, name, initializer), node)
            : node;
    }
    //
    // Expression
    //
    // @api
    function createArrayLiteralExpression(elements, multiLine) {
        const node = createBaseNode(SyntaxKind.ArrayLiteralExpression);
        // Ensure we add a trailing comma for something like `[NumericLiteral(1), NumericLiteral(2), OmittedExpresion]` so that
        // we end up with `[1, 2, ,]` instead of `[1, 2, ]` otherwise the `OmittedExpression` will just end up being treated like
        // a trailing comma.
        const lastElement = elements && lastOrUndefined(elements);
        const elementsArray = createNodeArray(elements, lastElement && isOmittedExpression(lastElement) ? true : undefined);
        node.elements = parenthesizerRules().parenthesizeExpressionsOfCommaDelimitedList(elementsArray);
        node.multiLine = multiLine;
        node.transformFlags |= propagateChildrenFlags(node.elements);
        return node;
    }
    // @api
    function updateArrayLiteralExpression(node, elements) {
        return node.elements !== elements
            ? update(createArrayLiteralExpression(elements, node.multiLine), node)
            : node;
    }
    // @api
    function createObjectLiteralExpression(properties, multiLine) {
        const node = createBaseDeclaration(SyntaxKind.ObjectLiteralExpression);
        node.properties = createNodeArray(properties);
        node.multiLine = multiLine;
        node.transformFlags |= propagateChildrenFlags(node.properties);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateObjectLiteralExpression(node, properties) {
        return node.properties !== properties
            ? update(createObjectLiteralExpression(properties, node.multiLine), node)
            : node;
    }
    function createBasePropertyAccessExpression(expression, questionDotToken, name) {
        const node = createBaseDeclaration(SyntaxKind.PropertyAccessExpression);
        node.expression = expression;
        node.questionDotToken = questionDotToken;
        node.name = name;
        node.transformFlags = propagateChildFlags(node.expression) |
            propagateChildFlags(node.questionDotToken) |
            (isIdentifier(node.name) ?
                propagateIdentifierNameFlags(node.name) :
                propagateChildFlags(node.name) | TransformFlags.ContainsPrivateIdentifierInExpression);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function createPropertyAccessExpression(expression, name) {
        const node = createBasePropertyAccessExpression(parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false), 
        /*questionDotToken*/ undefined, asName(name));
        if (isSuperKeyword(expression)) {
            // super method calls require a lexical 'this'
            // super method calls require 'super' hoisting in ES2017 and ES2018 async functions and async generators
            node.transformFlags |= TransformFlags.ContainsES2017 |
                TransformFlags.ContainsES2018;
        }
        return node;
    }
    // @api
    function updatePropertyAccessExpression(node, expression, name) {
        if (isPropertyAccessChain(node)) {
            return updatePropertyAccessChain(node, expression, node.questionDotToken, cast(name, isIdentifier));
        }
        return node.expression !== expression
            || node.name !== name
            ? update(createPropertyAccessExpression(expression, name), node)
            : node;
    }
    // @api
    function createPropertyAccessChain(expression, questionDotToken, name) {
        const node = createBasePropertyAccessExpression(parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ true), questionDotToken, asName(name));
        node.flags |= NodeFlags.OptionalChain;
        node.transformFlags |= TransformFlags.ContainsES2020;
        return node;
    }
    // @api
    function updatePropertyAccessChain(node, expression, questionDotToken, name) {
        Debug.assert(!!(node.flags & NodeFlags.OptionalChain), "Cannot update a PropertyAccessExpression using updatePropertyAccessChain. Use updatePropertyAccess instead.");
        // Because we are updating an existing PropertyAccessChain we want to inherit its emitFlags
        // instead of using the default from createPropertyAccess
        return node.expression !== expression
            || node.questionDotToken !== questionDotToken
            || node.name !== name
            ? update(createPropertyAccessChain(expression, questionDotToken, name), node)
            : node;
    }
    function createBaseElementAccessExpression(expression, questionDotToken, argumentExpression) {
        const node = createBaseDeclaration(SyntaxKind.ElementAccessExpression);
        node.expression = expression;
        node.questionDotToken = questionDotToken;
        node.argumentExpression = argumentExpression;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.questionDotToken) |
            propagateChildFlags(node.argumentExpression);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function createElementAccessExpression(expression, index) {
        const node = createBaseElementAccessExpression(parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false), 
        /*questionDotToken*/ undefined, asExpression(index));
        if (isSuperKeyword(expression)) {
            // super method calls require a lexical 'this'
            // super method calls require 'super' hoisting in ES2017 and ES2018 async functions and async generators
            node.transformFlags |= TransformFlags.ContainsES2017 |
                TransformFlags.ContainsES2018;
        }
        return node;
    }
    // @api
    function updateElementAccessExpression(node, expression, argumentExpression) {
        if (isElementAccessChain(node)) {
            return updateElementAccessChain(node, expression, node.questionDotToken, argumentExpression);
        }
        return node.expression !== expression
            || node.argumentExpression !== argumentExpression
            ? update(createElementAccessExpression(expression, argumentExpression), node)
            : node;
    }
    // @api
    function createElementAccessChain(expression, questionDotToken, index) {
        const node = createBaseElementAccessExpression(parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ true), questionDotToken, asExpression(index));
        node.flags |= NodeFlags.OptionalChain;
        node.transformFlags |= TransformFlags.ContainsES2020;
        return node;
    }
    // @api
    function updateElementAccessChain(node, expression, questionDotToken, argumentExpression) {
        Debug.assert(!!(node.flags & NodeFlags.OptionalChain), "Cannot update a ElementAccessExpression using updateElementAccessChain. Use updateElementAccess instead.");
        // Because we are updating an existing ElementAccessChain we want to inherit its emitFlags
        // instead of using the default from createElementAccess
        return node.expression !== expression
            || node.questionDotToken !== questionDotToken
            || node.argumentExpression !== argumentExpression
            ? update(createElementAccessChain(expression, questionDotToken, argumentExpression), node)
            : node;
    }
    function createBaseCallExpression(expression, questionDotToken, typeArguments, argumentsArray) {
        const node = createBaseDeclaration(SyntaxKind.CallExpression);
        node.expression = expression;
        node.questionDotToken = questionDotToken;
        node.typeArguments = typeArguments;
        node.arguments = argumentsArray;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.questionDotToken) |
            propagateChildrenFlags(node.typeArguments) |
            propagateChildrenFlags(node.arguments);
        if (node.typeArguments) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        if (isSuperProperty(node.expression)) {
            node.transformFlags |= TransformFlags.ContainsLexicalThis;
        }
        return node;
    }
    // @api
    function createCallExpression(expression, typeArguments, argumentsArray) {
        const node = createBaseCallExpression(parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false), 
        /*questionDotToken*/ undefined, asNodeArray(typeArguments), parenthesizerRules().parenthesizeExpressionsOfCommaDelimitedList(createNodeArray(argumentsArray)));
        if (isImportKeyword(node.expression)) {
            node.transformFlags |= TransformFlags.ContainsDynamicImport;
        }
        return node;
    }
    // @api
    function updateCallExpression(node, expression, typeArguments, argumentsArray) {
        if (isCallChain(node)) {
            return updateCallChain(node, expression, node.questionDotToken, typeArguments, argumentsArray);
        }
        return node.expression !== expression
            || node.typeArguments !== typeArguments
            || node.arguments !== argumentsArray
            ? update(createCallExpression(expression, typeArguments, argumentsArray), node)
            : node;
    }
    // @api
    function createCallChain(expression, questionDotToken, typeArguments, argumentsArray) {
        const node = createBaseCallExpression(parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ true), questionDotToken, asNodeArray(typeArguments), parenthesizerRules().parenthesizeExpressionsOfCommaDelimitedList(createNodeArray(argumentsArray)));
        node.flags |= NodeFlags.OptionalChain;
        node.transformFlags |= TransformFlags.ContainsES2020;
        return node;
    }
    // @api
    function updateCallChain(node, expression, questionDotToken, typeArguments, argumentsArray) {
        Debug.assert(!!(node.flags & NodeFlags.OptionalChain), "Cannot update a CallExpression using updateCallChain. Use updateCall instead.");
        return node.expression !== expression
            || node.questionDotToken !== questionDotToken
            || node.typeArguments !== typeArguments
            || node.arguments !== argumentsArray
            ? update(createCallChain(expression, questionDotToken, typeArguments, argumentsArray), node)
            : node;
    }
    // @api
    function createNewExpression(expression, typeArguments, argumentsArray) {
        const node = createBaseDeclaration(SyntaxKind.NewExpression);
        node.expression = parenthesizerRules().parenthesizeExpressionOfNew(expression);
        node.typeArguments = asNodeArray(typeArguments);
        node.arguments = argumentsArray ? parenthesizerRules().parenthesizeExpressionsOfCommaDelimitedList(argumentsArray) : undefined;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildrenFlags(node.typeArguments) |
            propagateChildrenFlags(node.arguments) |
            TransformFlags.ContainsES2020;
        if (node.typeArguments) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        return node;
    }
    // @api
    function updateNewExpression(node, expression, typeArguments, argumentsArray) {
        return node.expression !== expression
            || node.typeArguments !== typeArguments
            || node.arguments !== argumentsArray
            ? update(createNewExpression(expression, typeArguments, argumentsArray), node)
            : node;
    }
    // @api
    function createTaggedTemplateExpression(tag, typeArguments, template) {
        const node = createBaseNode(SyntaxKind.TaggedTemplateExpression);
        node.tag = parenthesizerRules().parenthesizeLeftSideOfAccess(tag, /*optionalChain*/ false);
        node.typeArguments = asNodeArray(typeArguments);
        node.template = template;
        node.transformFlags |= propagateChildFlags(node.tag) |
            propagateChildrenFlags(node.typeArguments) |
            propagateChildFlags(node.template) |
            TransformFlags.ContainsES2015;
        if (node.typeArguments) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        if (hasInvalidEscape(node.template)) {
            node.transformFlags |= TransformFlags.ContainsES2018;
        }
        return node;
    }
    // @api
    function updateTaggedTemplateExpression(node, tag, typeArguments, template) {
        return node.tag !== tag
            || node.typeArguments !== typeArguments
            || node.template !== template
            ? update(createTaggedTemplateExpression(tag, typeArguments, template), node)
            : node;
    }
    // @api
    function createTypeAssertion(type, expression) {
        const node = createBaseNode(SyntaxKind.TypeAssertionExpression);
        node.expression = parenthesizerRules().parenthesizeOperandOfPrefixUnary(expression);
        node.type = type;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.type) |
            TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateTypeAssertion(node, type, expression) {
        return node.type !== type
            || node.expression !== expression
            ? update(createTypeAssertion(type, expression), node)
            : node;
    }
    // @api
    function createParenthesizedExpression(expression) {
        const node = createBaseNode(SyntaxKind.ParenthesizedExpression);
        node.expression = expression;
        node.transformFlags = propagateChildFlags(node.expression);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateParenthesizedExpression(node, expression) {
        return node.expression !== expression
            ? update(createParenthesizedExpression(expression), node)
            : node;
    }
    // @api
    function createFunctionExpression(modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
        const node = createBaseDeclaration(SyntaxKind.FunctionExpression);
        node.modifiers = asNodeArray(modifiers);
        node.asteriskToken = asteriskToken;
        node.name = asName(name);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = createNodeArray(parameters);
        node.type = type;
        node.body = body;
        const isAsync = modifiersToFlags(node.modifiers) & ModifierFlags.Async;
        const isGenerator = !!node.asteriskToken;
        const isAsyncGenerator = isAsync && isGenerator;
        node.transformFlags = propagateChildrenFlags(node.modifiers) |
            propagateChildFlags(node.asteriskToken) |
            propagateNameFlags(node.name) |
            propagateChildrenFlags(node.typeParameters) |
            propagateChildrenFlags(node.parameters) |
            propagateChildFlags(node.type) |
            (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
            (isAsyncGenerator ? TransformFlags.ContainsES2018 :
                isAsync ? TransformFlags.ContainsES2017 :
                    isGenerator ? TransformFlags.ContainsGenerator :
                        TransformFlags.None) |
            (node.typeParameters || node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
            TransformFlags.ContainsHoistedDeclarationOrCompletion;
        node.typeArguments = undefined; // used in quick info
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateFunctionExpression(node, modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
        return node.name !== name
            || node.modifiers !== modifiers
            || node.asteriskToken !== asteriskToken
            || node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            || node.body !== body
            ? finishUpdateBaseSignatureDeclaration(createFunctionExpression(modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
            : node;
    }
    // @api
    function createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body) {
        const node = createBaseDeclaration(SyntaxKind.ArrowFunction);
        node.modifiers = asNodeArray(modifiers);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = createNodeArray(parameters);
        node.type = type;
        node.equalsGreaterThanToken = equalsGreaterThanToken !== null && equalsGreaterThanToken !== void 0 ? equalsGreaterThanToken : createToken(SyntaxKind.EqualsGreaterThanToken);
        node.body = parenthesizerRules().parenthesizeConciseBodyOfArrowFunction(body);
        const isAsync = modifiersToFlags(node.modifiers) & ModifierFlags.Async;
        node.transformFlags = propagateChildrenFlags(node.modifiers) |
            propagateChildrenFlags(node.typeParameters) |
            propagateChildrenFlags(node.parameters) |
            propagateChildFlags(node.type) |
            propagateChildFlags(node.equalsGreaterThanToken) |
            (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
            (node.typeParameters || node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
            (isAsync ? TransformFlags.ContainsES2017 | TransformFlags.ContainsLexicalThis : TransformFlags.None) |
            TransformFlags.ContainsES2015;
        node.typeArguments = undefined; // used in quick info
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateArrowFunction(node, modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body) {
        return node.modifiers !== modifiers
            || node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            || node.equalsGreaterThanToken !== equalsGreaterThanToken
            || node.body !== body
            ? finishUpdateBaseSignatureDeclaration(createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body), node)
            : node;
    }
    // @api
    function createDeleteExpression(expression) {
        const node = createBaseNode(SyntaxKind.DeleteExpression);
        node.expression = parenthesizerRules().parenthesizeOperandOfPrefixUnary(expression);
        node.transformFlags |= propagateChildFlags(node.expression);
        return node;
    }
    // @api
    function updateDeleteExpression(node, expression) {
        return node.expression !== expression
            ? update(createDeleteExpression(expression), node)
            : node;
    }
    // @api
    function createTypeOfExpression(expression) {
        const node = createBaseNode(SyntaxKind.TypeOfExpression);
        node.expression = parenthesizerRules().parenthesizeOperandOfPrefixUnary(expression);
        node.transformFlags |= propagateChildFlags(node.expression);
        return node;
    }
    // @api
    function updateTypeOfExpression(node, expression) {
        return node.expression !== expression
            ? update(createTypeOfExpression(expression), node)
            : node;
    }
    // @api
    function createVoidExpression(expression) {
        const node = createBaseNode(SyntaxKind.VoidExpression);
        node.expression = parenthesizerRules().parenthesizeOperandOfPrefixUnary(expression);
        node.transformFlags |= propagateChildFlags(node.expression);
        return node;
    }
    // @api
    function updateVoidExpression(node, expression) {
        return node.expression !== expression
            ? update(createVoidExpression(expression), node)
            : node;
    }
    // @api
    function createAwaitExpression(expression) {
        const node = createBaseNode(SyntaxKind.AwaitExpression);
        node.expression = parenthesizerRules().parenthesizeOperandOfPrefixUnary(expression);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsES2017 |
            TransformFlags.ContainsES2018 |
            TransformFlags.ContainsAwait;
        return node;
    }
    // @api
    function updateAwaitExpression(node, expression) {
        return node.expression !== expression
            ? update(createAwaitExpression(expression), node)
            : node;
    }
    // @api
    function createPrefixUnaryExpression(operator, operand) {
        const node = createBaseNode(SyntaxKind.PrefixUnaryExpression);
        node.operator = operator;
        node.operand = parenthesizerRules().parenthesizeOperandOfPrefixUnary(operand);
        node.transformFlags |= propagateChildFlags(node.operand);
        // Only set this flag for non-generated identifiers and non-"local" names. See the
        // comment in `visitPreOrPostfixUnaryExpression` in module.ts
        if ((operator === SyntaxKind.PlusPlusToken || operator === SyntaxKind.MinusMinusToken) &&
            isIdentifier(node.operand) &&
            !isGeneratedIdentifier(node.operand) &&
            !isLocalName(node.operand)) {
            node.transformFlags |= TransformFlags.ContainsUpdateExpressionForIdentifier;
        }
        return node;
    }
    // @api
    function updatePrefixUnaryExpression(node, operand) {
        return node.operand !== operand
            ? update(createPrefixUnaryExpression(node.operator, operand), node)
            : node;
    }
    // @api
    function createPostfixUnaryExpression(operand, operator) {
        const node = createBaseNode(SyntaxKind.PostfixUnaryExpression);
        node.operator = operator;
        node.operand = parenthesizerRules().parenthesizeOperandOfPostfixUnary(operand);
        node.transformFlags |= propagateChildFlags(node.operand);
        // Only set this flag for non-generated identifiers and non-"local" names. See the
        // comment in `visitPreOrPostfixUnaryExpression` in module.ts
        if (isIdentifier(node.operand) &&
            !isGeneratedIdentifier(node.operand) &&
            !isLocalName(node.operand)) {
            node.transformFlags |= TransformFlags.ContainsUpdateExpressionForIdentifier;
        }
        return node;
    }
    // @api
    function updatePostfixUnaryExpression(node, operand) {
        return node.operand !== operand
            ? update(createPostfixUnaryExpression(operand, node.operator), node)
            : node;
    }
    // @api
    function createBinaryExpression(left, operator, right) {
        const node = createBaseDeclaration(SyntaxKind.BinaryExpression);
        const operatorToken = asToken(operator);
        const operatorKind = operatorToken.kind;
        node.left = parenthesizerRules().parenthesizeLeftSideOfBinary(operatorKind, left);
        node.operatorToken = operatorToken;
        node.right = parenthesizerRules().parenthesizeRightSideOfBinary(operatorKind, node.left, right);
        node.transformFlags |= propagateChildFlags(node.left) |
            propagateChildFlags(node.operatorToken) |
            propagateChildFlags(node.right);
        if (operatorKind === SyntaxKind.QuestionQuestionToken) {
            node.transformFlags |= TransformFlags.ContainsES2020;
        }
        else if (operatorKind === SyntaxKind.EqualsToken) {
            if (isObjectLiteralExpression(node.left)) {
                node.transformFlags |= TransformFlags.ContainsES2015 |
                    TransformFlags.ContainsES2018 |
                    TransformFlags.ContainsDestructuringAssignment |
                    propagateAssignmentPatternFlags(node.left);
            }
            else if (isArrayLiteralExpression(node.left)) {
                node.transformFlags |= TransformFlags.ContainsES2015 |
                    TransformFlags.ContainsDestructuringAssignment |
                    propagateAssignmentPatternFlags(node.left);
            }
        }
        else if (operatorKind === SyntaxKind.AsteriskAsteriskToken || operatorKind === SyntaxKind.AsteriskAsteriskEqualsToken) {
            node.transformFlags |= TransformFlags.ContainsES2016;
        }
        else if (isLogicalOrCoalescingAssignmentOperator(operatorKind)) {
            node.transformFlags |= TransformFlags.ContainsES2021;
        }
        if (operatorKind === SyntaxKind.InKeyword && isPrivateIdentifier(node.left)) {
            node.transformFlags |= TransformFlags.ContainsPrivateIdentifierInExpression;
        }
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    function propagateAssignmentPatternFlags(node) {
        return containsObjectRestOrSpread(node) ? TransformFlags.ContainsObjectRestOrSpread : TransformFlags.None;
    }
    // @api
    function updateBinaryExpression(node, left, operator, right) {
        return node.left !== left
            || node.operatorToken !== operator
            || node.right !== right
            ? update(createBinaryExpression(left, operator, right), node)
            : node;
    }
    // @api
    function createConditionalExpression(condition, questionToken, whenTrue, colonToken, whenFalse) {
        const node = createBaseNode(SyntaxKind.ConditionalExpression);
        node.condition = parenthesizerRules().parenthesizeConditionOfConditionalExpression(condition);
        node.questionToken = questionToken !== null && questionToken !== void 0 ? questionToken : createToken(SyntaxKind.QuestionToken);
        node.whenTrue = parenthesizerRules().parenthesizeBranchOfConditionalExpression(whenTrue);
        node.colonToken = colonToken !== null && colonToken !== void 0 ? colonToken : createToken(SyntaxKind.ColonToken);
        node.whenFalse = parenthesizerRules().parenthesizeBranchOfConditionalExpression(whenFalse);
        node.transformFlags |= propagateChildFlags(node.condition) |
            propagateChildFlags(node.questionToken) |
            propagateChildFlags(node.whenTrue) |
            propagateChildFlags(node.colonToken) |
            propagateChildFlags(node.whenFalse);
        node.flowNodeWhenFalse = undefined;
        node.flowNodeWhenTrue = undefined;
        return node;
    }
    // @api
    function updateConditionalExpression(node, condition, questionToken, whenTrue, colonToken, whenFalse) {
        return node.condition !== condition
            || node.questionToken !== questionToken
            || node.whenTrue !== whenTrue
            || node.colonToken !== colonToken
            || node.whenFalse !== whenFalse
            ? update(createConditionalExpression(condition, questionToken, whenTrue, colonToken, whenFalse), node)
            : node;
    }
    // @api
    function createTemplateExpression(head, templateSpans) {
        const node = createBaseNode(SyntaxKind.TemplateExpression);
        node.head = head;
        node.templateSpans = createNodeArray(templateSpans);
        node.transformFlags |= propagateChildFlags(node.head) |
            propagateChildrenFlags(node.templateSpans) |
            TransformFlags.ContainsES2015;
        return node;
    }
    // @api
    function updateTemplateExpression(node, head, templateSpans) {
        return node.head !== head
            || node.templateSpans !== templateSpans
            ? update(createTemplateExpression(head, templateSpans), node)
            : node;
    }
    function checkTemplateLiteralLikeNode(kind, text, rawText, templateFlags = TokenFlags.None) {
        Debug.assert(!(templateFlags & ~TokenFlags.TemplateLiteralLikeFlags), "Unsupported template flags.");
        // NOTE: without the assignment to `undefined`, we don't narrow the initial type of `cooked`.
        // eslint-disable-next-line no-undef-init
        let cooked = undefined;
        if (rawText !== undefined && rawText !== text) {
            cooked = getCookedText(kind, rawText);
            if (typeof cooked === "object") {
                return Debug.fail("Invalid raw text");
            }
        }
        if (text === undefined) {
            if (cooked === undefined) {
                return Debug.fail("Arguments 'text' and 'rawText' may not both be undefined.");
            }
            text = cooked;
        }
        else if (cooked !== undefined) {
            Debug.assert(text === cooked, "Expected argument 'text' to be the normalized (i.e. 'cooked') version of argument 'rawText'.");
        }
        return text;
    }
    function getTransformFlagsOfTemplateLiteralLike(templateFlags) {
        let transformFlags = TransformFlags.ContainsES2015;
        if (templateFlags) {
            transformFlags |= TransformFlags.ContainsES2018;
        }
        return transformFlags;
    }
    // NOTE: `createTemplateLiteralLikeToken` and `createTemplateLiteralLikeDeclaration` are identical except for
    //       the underlying nodes they create. To avoid polymorphism due to two different node shapes, these
    //       functions are intentionally duplicated.
    function createTemplateLiteralLikeToken(kind, text, rawText, templateFlags) {
        const node = createBaseToken(kind);
        node.text = text;
        node.rawText = rawText;
        node.templateFlags = templateFlags & TokenFlags.TemplateLiteralLikeFlags;
        node.transformFlags = getTransformFlagsOfTemplateLiteralLike(node.templateFlags);
        return node;
    }
    function createTemplateLiteralLikeDeclaration(kind, text, rawText, templateFlags) {
        const node = createBaseDeclaration(kind);
        node.text = text;
        node.rawText = rawText;
        node.templateFlags = templateFlags & TokenFlags.TemplateLiteralLikeFlags;
        node.transformFlags = getTransformFlagsOfTemplateLiteralLike(node.templateFlags);
        return node;
    }
    // @api
    function createTemplateLiteralLikeNode(kind, text, rawText, templateFlags) {
        if (kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
            return createTemplateLiteralLikeDeclaration(kind, text, rawText, templateFlags);
        }
        return createTemplateLiteralLikeToken(kind, text, rawText, templateFlags);
    }
    // @api
    function createTemplateHead(text, rawText, templateFlags) {
        text = checkTemplateLiteralLikeNode(SyntaxKind.TemplateHead, text, rawText, templateFlags);
        return createTemplateLiteralLikeNode(SyntaxKind.TemplateHead, text, rawText, templateFlags);
    }
    // @api
    function createTemplateMiddle(text, rawText, templateFlags) {
        text = checkTemplateLiteralLikeNode(SyntaxKind.TemplateHead, text, rawText, templateFlags);
        return createTemplateLiteralLikeNode(SyntaxKind.TemplateMiddle, text, rawText, templateFlags);
    }
    // @api
    function createTemplateTail(text, rawText, templateFlags) {
        text = checkTemplateLiteralLikeNode(SyntaxKind.TemplateHead, text, rawText, templateFlags);
        return createTemplateLiteralLikeNode(SyntaxKind.TemplateTail, text, rawText, templateFlags);
    }
    // @api
    function createNoSubstitutionTemplateLiteral(text, rawText, templateFlags) {
        text = checkTemplateLiteralLikeNode(SyntaxKind.TemplateHead, text, rawText, templateFlags);
        return createTemplateLiteralLikeDeclaration(SyntaxKind.NoSubstitutionTemplateLiteral, text, rawText, templateFlags);
    }
    // @api
    function createYieldExpression(asteriskToken, expression) {
        Debug.assert(!asteriskToken || !!expression, "A `YieldExpression` with an asteriskToken must have an expression.");
        const node = createBaseNode(SyntaxKind.YieldExpression);
        node.expression = expression && parenthesizerRules().parenthesizeExpressionForDisallowedComma(expression);
        node.asteriskToken = asteriskToken;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.asteriskToken) |
            TransformFlags.ContainsES2015 |
            TransformFlags.ContainsES2018 |
            TransformFlags.ContainsYield;
        return node;
    }
    // @api
    function updateYieldExpression(node, asteriskToken, expression) {
        return node.expression !== expression
            || node.asteriskToken !== asteriskToken
            ? update(createYieldExpression(asteriskToken, expression), node)
            : node;
    }
    // @api
    function createSpreadElement(expression) {
        const node = createBaseNode(SyntaxKind.SpreadElement);
        node.expression = parenthesizerRules().parenthesizeExpressionForDisallowedComma(expression);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsES2015 |
            TransformFlags.ContainsRestOrSpread;
        return node;
    }
    // @api
    function updateSpreadElement(node, expression) {
        return node.expression !== expression
            ? update(createSpreadElement(expression), node)
            : node;
    }
    // @api
    function createClassExpression(modifiers, name, typeParameters, heritageClauses, members) {
        const node = createBaseDeclaration(SyntaxKind.ClassExpression);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.typeParameters = asNodeArray(typeParameters);
        node.heritageClauses = asNodeArray(heritageClauses);
        node.members = createNodeArray(members);
        node.transformFlags |= propagateChildrenFlags(node.modifiers) |
            propagateNameFlags(node.name) |
            propagateChildrenFlags(node.typeParameters) |
            propagateChildrenFlags(node.heritageClauses) |
            propagateChildrenFlags(node.members) |
            (node.typeParameters ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
            TransformFlags.ContainsES2015;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateClassExpression(node, modifiers, name, typeParameters, heritageClauses, members) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.typeParameters !== typeParameters
            || node.heritageClauses !== heritageClauses
            || node.members !== members
            ? update(createClassExpression(modifiers, name, typeParameters, heritageClauses, members), node)
            : node;
    }
    // @api
    function createOmittedExpression() {
        return createBaseNode(SyntaxKind.OmittedExpression);
    }
    // @api
    function createExpressionWithTypeArguments(expression, typeArguments) {
        const node = createBaseNode(SyntaxKind.ExpressionWithTypeArguments);
        node.expression = parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false);
        node.typeArguments = typeArguments && parenthesizerRules().parenthesizeTypeArguments(typeArguments);
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildrenFlags(node.typeArguments) |
            TransformFlags.ContainsES2015;
        return node;
    }
    // @api
    function updateExpressionWithTypeArguments(node, expression, typeArguments) {
        return node.expression !== expression
            || node.typeArguments !== typeArguments
            ? update(createExpressionWithTypeArguments(expression, typeArguments), node)
            : node;
    }
    // @api
    function createAsExpression(expression, type) {
        const node = createBaseNode(SyntaxKind.AsExpression);
        node.expression = expression;
        node.type = type;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.type) |
            TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateAsExpression(node, expression, type) {
        return node.expression !== expression
            || node.type !== type
            ? update(createAsExpression(expression, type), node)
            : node;
    }
    // @api
    function createNonNullExpression(expression) {
        const node = createBaseNode(SyntaxKind.NonNullExpression);
        node.expression = parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateNonNullExpression(node, expression) {
        if (isNonNullChain(node)) {
            return updateNonNullChain(node, expression);
        }
        return node.expression !== expression
            ? update(createNonNullExpression(expression), node)
            : node;
    }
    // @api
    function createSatisfiesExpression(expression, type) {
        const node = createBaseNode(SyntaxKind.SatisfiesExpression);
        node.expression = expression;
        node.type = type;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.type) |
            TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateSatisfiesExpression(node, expression, type) {
        return node.expression !== expression
            || node.type !== type
            ? update(createSatisfiesExpression(expression, type), node)
            : node;
    }
    // @api
    function createNonNullChain(expression) {
        const node = createBaseNode(SyntaxKind.NonNullExpression);
        node.flags |= NodeFlags.OptionalChain;
        node.expression = parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ true);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsTypeScript;
        return node;
    }
    // @api
    function updateNonNullChain(node, expression) {
        Debug.assert(!!(node.flags & NodeFlags.OptionalChain), "Cannot update a NonNullExpression using updateNonNullChain. Use updateNonNullExpression instead.");
        return node.expression !== expression
            ? update(createNonNullChain(expression), node)
            : node;
    }
    // @api
    function createMetaProperty(keywordToken, name) {
        const node = createBaseNode(SyntaxKind.MetaProperty);
        node.keywordToken = keywordToken;
        node.name = name;
        node.transformFlags |= propagateChildFlags(node.name);
        switch (keywordToken) {
            case SyntaxKind.NewKeyword:
                node.transformFlags |= TransformFlags.ContainsES2015;
                break;
            case SyntaxKind.ImportKeyword:
                node.transformFlags |= TransformFlags.ContainsES2020;
                break;
            default:
                return Debug.assertNever(keywordToken);
        }
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateMetaProperty(node, name) {
        return node.name !== name
            ? update(createMetaProperty(node.keywordToken, name), node)
            : node;
    }
    //
    // Misc
    //
    // @api
    function createTemplateSpan(expression, literal) {
        const node = createBaseNode(SyntaxKind.TemplateSpan);
        node.expression = expression;
        node.literal = literal;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.literal) |
            TransformFlags.ContainsES2015;
        return node;
    }
    // @api
    function updateTemplateSpan(node, expression, literal) {
        return node.expression !== expression
            || node.literal !== literal
            ? update(createTemplateSpan(expression, literal), node)
            : node;
    }
    // @api
    function createSemicolonClassElement() {
        const node = createBaseNode(SyntaxKind.SemicolonClassElement);
        node.transformFlags |= TransformFlags.ContainsES2015;
        return node;
    }
    //
    // Element
    //
    // @api
    function createBlock(statements, multiLine) {
        const node = createBaseNode(SyntaxKind.Block);
        node.statements = createNodeArray(statements);
        node.multiLine = multiLine;
        node.transformFlags |= propagateChildrenFlags(node.statements);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateBlock(node, statements) {
        return node.statements !== statements
            ? update(createBlock(statements, node.multiLine), node)
            : node;
    }
    // @api
    function createVariableStatement(modifiers, declarationList) {
        const node = createBaseNode(SyntaxKind.VariableStatement);
        node.modifiers = asNodeArray(modifiers);
        node.declarationList = isArray(declarationList) ? createVariableDeclarationList(declarationList) : declarationList;
        node.transformFlags |= propagateChildrenFlags(node.modifiers) |
            propagateChildFlags(node.declarationList);
        if (modifiersToFlags(node.modifiers) & ModifierFlags.Ambient) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateVariableStatement(node, modifiers, declarationList) {
        return node.modifiers !== modifiers
            || node.declarationList !== declarationList
            ? update(createVariableStatement(modifiers, declarationList), node)
            : node;
    }
    // @api
    function createEmptyStatement() {
        const node = createBaseNode(SyntaxKind.EmptyStatement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function createExpressionStatement(expression) {
        const node = createBaseNode(SyntaxKind.ExpressionStatement);
        node.expression = parenthesizerRules().parenthesizeExpressionOfExpressionStatement(expression);
        node.transformFlags |= propagateChildFlags(node.expression);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateExpressionStatement(node, expression) {
        return node.expression !== expression
            ? update(createExpressionStatement(expression), node)
            : node;
    }
    // @api
    function createIfStatement(expression, thenStatement, elseStatement) {
        const node = createBaseNode(SyntaxKind.IfStatement);
        node.expression = expression;
        node.thenStatement = asEmbeddedStatement(thenStatement);
        node.elseStatement = asEmbeddedStatement(elseStatement);
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.thenStatement) |
            propagateChildFlags(node.elseStatement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateIfStatement(node, expression, thenStatement, elseStatement) {
        return node.expression !== expression
            || node.thenStatement !== thenStatement
            || node.elseStatement !== elseStatement
            ? update(createIfStatement(expression, thenStatement, elseStatement), node)
            : node;
    }
    // @api
    function createDoStatement(statement, expression) {
        const node = createBaseNode(SyntaxKind.DoStatement);
        node.statement = asEmbeddedStatement(statement);
        node.expression = expression;
        node.transformFlags |= propagateChildFlags(node.statement) |
            propagateChildFlags(node.expression);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateDoStatement(node, statement, expression) {
        return node.statement !== statement
            || node.expression !== expression
            ? update(createDoStatement(statement, expression), node)
            : node;
    }
    // @api
    function createWhileStatement(expression, statement) {
        const node = createBaseNode(SyntaxKind.WhileStatement);
        node.expression = expression;
        node.statement = asEmbeddedStatement(statement);
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.statement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateWhileStatement(node, expression, statement) {
        return node.expression !== expression
            || node.statement !== statement
            ? update(createWhileStatement(expression, statement), node)
            : node;
    }
    // @api
    function createForStatement(initializer, condition, incrementor, statement) {
        const node = createBaseNode(SyntaxKind.ForStatement);
        node.initializer = initializer;
        node.condition = condition;
        node.incrementor = incrementor;
        node.statement = asEmbeddedStatement(statement);
        node.transformFlags |= propagateChildFlags(node.initializer) |
            propagateChildFlags(node.condition) |
            propagateChildFlags(node.incrementor) |
            propagateChildFlags(node.statement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateForStatement(node, initializer, condition, incrementor, statement) {
        return node.initializer !== initializer
            || node.condition !== condition
            || node.incrementor !== incrementor
            || node.statement !== statement
            ? update(createForStatement(initializer, condition, incrementor, statement), node)
            : node;
    }
    // @api
    function createForInStatement(initializer, expression, statement) {
        const node = createBaseNode(SyntaxKind.ForInStatement);
        node.initializer = initializer;
        node.expression = expression;
        node.statement = asEmbeddedStatement(statement);
        node.transformFlags |= propagateChildFlags(node.initializer) |
            propagateChildFlags(node.expression) |
            propagateChildFlags(node.statement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateForInStatement(node, initializer, expression, statement) {
        return node.initializer !== initializer
            || node.expression !== expression
            || node.statement !== statement
            ? update(createForInStatement(initializer, expression, statement), node)
            : node;
    }
    // @api
    function createForOfStatement(awaitModifier, initializer, expression, statement) {
        const node = createBaseNode(SyntaxKind.ForOfStatement);
        node.awaitModifier = awaitModifier;
        node.initializer = initializer;
        node.expression = parenthesizerRules().parenthesizeExpressionForDisallowedComma(expression);
        node.statement = asEmbeddedStatement(statement);
        node.transformFlags |= propagateChildFlags(node.awaitModifier) |
            propagateChildFlags(node.initializer) |
            propagateChildFlags(node.expression) |
            propagateChildFlags(node.statement) |
            TransformFlags.ContainsES2015;
        if (awaitModifier)
            node.transformFlags |= TransformFlags.ContainsES2018;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateForOfStatement(node, awaitModifier, initializer, expression, statement) {
        return node.awaitModifier !== awaitModifier
            || node.initializer !== initializer
            || node.expression !== expression
            || node.statement !== statement
            ? update(createForOfStatement(awaitModifier, initializer, expression, statement), node)
            : node;
    }
    // @api
    function createContinueStatement(label) {
        const node = createBaseNode(SyntaxKind.ContinueStatement);
        node.label = asName(label);
        node.transformFlags |= propagateChildFlags(node.label) |
            TransformFlags.ContainsHoistedDeclarationOrCompletion;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateContinueStatement(node, label) {
        return node.label !== label
            ? update(createContinueStatement(label), node)
            : node;
    }
    // @api
    function createBreakStatement(label) {
        const node = createBaseNode(SyntaxKind.BreakStatement);
        node.label = asName(label);
        node.transformFlags |= propagateChildFlags(node.label) |
            TransformFlags.ContainsHoistedDeclarationOrCompletion;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateBreakStatement(node, label) {
        return node.label !== label
            ? update(createBreakStatement(label), node)
            : node;
    }
    // @api
    function createReturnStatement(expression) {
        const node = createBaseNode(SyntaxKind.ReturnStatement);
        node.expression = expression;
        // return in an ES2018 async generator must be awaited
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsES2018 |
            TransformFlags.ContainsHoistedDeclarationOrCompletion;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateReturnStatement(node, expression) {
        return node.expression !== expression
            ? update(createReturnStatement(expression), node)
            : node;
    }
    // @api
    function createWithStatement(expression, statement) {
        const node = createBaseNode(SyntaxKind.WithStatement);
        node.expression = expression;
        node.statement = asEmbeddedStatement(statement);
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.statement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateWithStatement(node, expression, statement) {
        return node.expression !== expression
            || node.statement !== statement
            ? update(createWithStatement(expression, statement), node)
            : node;
    }
    // @api
    function createSwitchStatement(expression, caseBlock) {
        const node = createBaseNode(SyntaxKind.SwitchStatement);
        node.expression = parenthesizerRules().parenthesizeExpressionForDisallowedComma(expression);
        node.caseBlock = caseBlock;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.caseBlock);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        node.possiblyExhaustive = false; // initialized by binder
        return node;
    }
    // @api
    function updateSwitchStatement(node, expression, caseBlock) {
        return node.expression !== expression
            || node.caseBlock !== caseBlock
            ? update(createSwitchStatement(expression, caseBlock), node)
            : node;
    }
    // @api
    function createLabeledStatement(label, statement) {
        const node = createBaseNode(SyntaxKind.LabeledStatement);
        node.label = asName(label);
        node.statement = asEmbeddedStatement(statement);
        node.transformFlags |= propagateChildFlags(node.label) |
            propagateChildFlags(node.statement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateLabeledStatement(node, label, statement) {
        return node.label !== label
            || node.statement !== statement
            ? update(createLabeledStatement(label, statement), node)
            : node;
    }
    // @api
    function createThrowStatement(expression) {
        const node = createBaseNode(SyntaxKind.ThrowStatement);
        node.expression = expression;
        node.transformFlags |= propagateChildFlags(node.expression);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateThrowStatement(node, expression) {
        return node.expression !== expression
            ? update(createThrowStatement(expression), node)
            : node;
    }
    // @api
    function createTryStatement(tryBlock, catchClause, finallyBlock) {
        const node = createBaseNode(SyntaxKind.TryStatement);
        node.tryBlock = tryBlock;
        node.catchClause = catchClause;
        node.finallyBlock = finallyBlock;
        node.transformFlags |= propagateChildFlags(node.tryBlock) |
            propagateChildFlags(node.catchClause) |
            propagateChildFlags(node.finallyBlock);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function updateTryStatement(node, tryBlock, catchClause, finallyBlock) {
        return node.tryBlock !== tryBlock
            || node.catchClause !== catchClause
            || node.finallyBlock !== finallyBlock
            ? update(createTryStatement(tryBlock, catchClause, finallyBlock), node)
            : node;
    }
    // @api
    function createDebuggerStatement() {
        const node = createBaseNode(SyntaxKind.DebuggerStatement);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.flowNode = undefined; // initialized by binder (FlowContainer)
        return node;
    }
    // @api
    function createVariableDeclaration(name, exclamationToken, type, initializer) {
        var _a;
        const node = createBaseDeclaration(SyntaxKind.VariableDeclaration);
        node.name = asName(name);
        node.exclamationToken = exclamationToken;
        node.type = type;
        node.initializer = asInitializer(initializer);
        node.transformFlags |= propagateNameFlags(node.name) |
            propagateChildFlags(node.initializer) |
            (((_a = node.exclamationToken) !== null && _a !== void 0 ? _a : node.type) ? TransformFlags.ContainsTypeScript : TransformFlags.None);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateVariableDeclaration(node, name, exclamationToken, type, initializer) {
        return node.name !== name
            || node.type !== type
            || node.exclamationToken !== exclamationToken
            || node.initializer !== initializer
            ? update(createVariableDeclaration(name, exclamationToken, type, initializer), node)
            : node;
    }
    // @api
    function createVariableDeclarationList(declarations, flags = NodeFlags.None) {
        const node = createBaseNode(SyntaxKind.VariableDeclarationList);
        node.flags |= flags & NodeFlags.BlockScoped;
        node.declarations = createNodeArray(declarations);
        node.transformFlags |= propagateChildrenFlags(node.declarations) |
            TransformFlags.ContainsHoistedDeclarationOrCompletion;
        if (flags & NodeFlags.BlockScoped) {
            node.transformFlags |= TransformFlags.ContainsES2015 |
                TransformFlags.ContainsBlockScopedBinding;
        }
        if (flags & NodeFlags.Using) {
            node.transformFlags |= TransformFlags.ContainsESNext;
        }
        return node;
    }
    // @api
    function updateVariableDeclarationList(node, declarations) {
        return node.declarations !== declarations
            ? update(createVariableDeclarationList(declarations, node.flags), node)
            : node;
    }
    // @api
    function createFunctionDeclaration(modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
        const node = createBaseDeclaration(SyntaxKind.FunctionDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.asteriskToken = asteriskToken;
        node.name = asName(name);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = createNodeArray(parameters);
        node.type = type;
        node.body = body;
        if (!node.body || modifiersToFlags(node.modifiers) & ModifierFlags.Ambient) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            const isAsync = modifiersToFlags(node.modifiers) & ModifierFlags.Async;
            const isGenerator = !!node.asteriskToken;
            const isAsyncGenerator = isAsync && isGenerator;
            node.transformFlags = propagateChildrenFlags(node.modifiers) |
                propagateChildFlags(node.asteriskToken) |
                propagateNameFlags(node.name) |
                propagateChildrenFlags(node.typeParameters) |
                propagateChildrenFlags(node.parameters) |
                propagateChildFlags(node.type) |
                (propagateChildFlags(node.body) & ~TransformFlags.ContainsPossibleTopLevelAwait) |
                (isAsyncGenerator ? TransformFlags.ContainsES2018 :
                    isAsync ? TransformFlags.ContainsES2017 :
                        isGenerator ? TransformFlags.ContainsGenerator :
                            TransformFlags.None) |
                (node.typeParameters || node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
                TransformFlags.ContainsHoistedDeclarationOrCompletion;
        }
        node.typeArguments = undefined; // used in quick info
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.endFlowNode = undefined;
        node.returnFlowNode = undefined;
        return node;
    }
    // @api
    function updateFunctionDeclaration(node, modifiers, asteriskToken, name, typeParameters, parameters, type, body) {
        return node.modifiers !== modifiers
            || node.asteriskToken !== asteriskToken
            || node.name !== name
            || node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            || node.body !== body
            ? finishUpdateFunctionDeclaration(createFunctionDeclaration(modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
            : node;
    }
    function finishUpdateFunctionDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            if (updated.modifiers === original.modifiers) {
                updated.modifiers = original.modifiers;
            }
        }
        return finishUpdateBaseSignatureDeclaration(updated, original);
    }
    // @api
    function createClassDeclaration(modifiers, name, typeParameters, heritageClauses, members) {
        const node = createBaseDeclaration(SyntaxKind.ClassDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.typeParameters = asNodeArray(typeParameters);
        node.heritageClauses = asNodeArray(heritageClauses);
        node.members = createNodeArray(members);
        if (modifiersToFlags(node.modifiers) & ModifierFlags.Ambient) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            node.transformFlags |= propagateChildrenFlags(node.modifiers) |
                propagateNameFlags(node.name) |
                propagateChildrenFlags(node.typeParameters) |
                propagateChildrenFlags(node.heritageClauses) |
                propagateChildrenFlags(node.members) |
                (node.typeParameters ? TransformFlags.ContainsTypeScript : TransformFlags.None) |
                TransformFlags.ContainsES2015;
            if (node.transformFlags & TransformFlags.ContainsTypeScriptClassSyntax) {
                node.transformFlags |= TransformFlags.ContainsTypeScript;
            }
        }
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateClassDeclaration(node, modifiers, name, typeParameters, heritageClauses, members) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.typeParameters !== typeParameters
            || node.heritageClauses !== heritageClauses
            || node.members !== members
            ? update(createClassDeclaration(modifiers, name, typeParameters, heritageClauses, members), node)
            : node;
    }
    // @api
    function createInterfaceDeclaration(modifiers, name, typeParameters, heritageClauses, members) {
        const node = createBaseDeclaration(SyntaxKind.InterfaceDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.typeParameters = asNodeArray(typeParameters);
        node.heritageClauses = asNodeArray(heritageClauses);
        node.members = createNodeArray(members);
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateInterfaceDeclaration(node, modifiers, name, typeParameters, heritageClauses, members) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.typeParameters !== typeParameters
            || node.heritageClauses !== heritageClauses
            || node.members !== members
            ? update(createInterfaceDeclaration(modifiers, name, typeParameters, heritageClauses, members), node)
            : node;
    }
    // @api
    function createTypeAliasDeclaration(modifiers, name, typeParameters, type) {
        const node = createBaseDeclaration(SyntaxKind.TypeAliasDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.typeParameters = asNodeArray(typeParameters);
        node.type = type;
        node.transformFlags = TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateTypeAliasDeclaration(node, modifiers, name, typeParameters, type) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.typeParameters !== typeParameters
            || node.type !== type
            ? update(createTypeAliasDeclaration(modifiers, name, typeParameters, type), node)
            : node;
    }
    // @api
    function createEnumDeclaration(modifiers, name, members) {
        const node = createBaseDeclaration(SyntaxKind.EnumDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.members = createNodeArray(members);
        node.transformFlags |= propagateChildrenFlags(node.modifiers) |
            propagateChildFlags(node.name) |
            propagateChildrenFlags(node.members) |
            TransformFlags.ContainsTypeScript;
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // Enum declarations cannot contain `await`
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateEnumDeclaration(node, modifiers, name, members) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.members !== members
            ? update(createEnumDeclaration(modifiers, name, members), node)
            : node;
    }
    // @api
    function createModuleDeclaration(modifiers, name, body, flags = NodeFlags.None) {
        const node = createBaseDeclaration(SyntaxKind.ModuleDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
        node.name = name;
        node.body = body;
        if (modifiersToFlags(node.modifiers) & ModifierFlags.Ambient) {
            node.transformFlags = TransformFlags.ContainsTypeScript;
        }
        else {
            node.transformFlags |= propagateChildrenFlags(node.modifiers) |
                propagateChildFlags(node.name) |
                propagateChildFlags(node.body) |
                TransformFlags.ContainsTypeScript;
        }
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // Module declarations cannot contain `await`.
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateModuleDeclaration(node, modifiers, name, body) {
        return node.modifiers !== modifiers
            || node.name !== name
            || node.body !== body
            ? update(createModuleDeclaration(modifiers, name, body, node.flags), node)
            : node;
    }
    // @api
    function createModuleBlock(statements) {
        const node = createBaseNode(SyntaxKind.ModuleBlock);
        node.statements = createNodeArray(statements);
        node.transformFlags |= propagateChildrenFlags(node.statements);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateModuleBlock(node, statements) {
        return node.statements !== statements
            ? update(createModuleBlock(statements), node)
            : node;
    }
    // @api
    function createCaseBlock(clauses) {
        const node = createBaseNode(SyntaxKind.CaseBlock);
        node.clauses = createNodeArray(clauses);
        node.transformFlags |= propagateChildrenFlags(node.clauses);
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateCaseBlock(node, clauses) {
        return node.clauses !== clauses
            ? update(createCaseBlock(clauses), node)
            : node;
    }
    // @api
    function createNamespaceExportDeclaration(name) {
        const node = createBaseDeclaration(SyntaxKind.NamespaceExportDeclaration);
        node.name = asName(name);
        node.transformFlags |= propagateIdentifierNameFlags(node.name) |
            TransformFlags.ContainsTypeScript;
        node.modifiers = undefined; // initialized by parser to report grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateNamespaceExportDeclaration(node, name) {
        return node.name !== name
            ? finishUpdateNamespaceExportDeclaration(createNamespaceExportDeclaration(name), node)
            : node;
    }
    function finishUpdateNamespaceExportDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.modifiers = original.modifiers;
        }
        return update(updated, original);
    }
    // @api
    function createImportEqualsDeclaration(modifiers, isTypeOnly, name, moduleReference) {
        const node = createBaseDeclaration(SyntaxKind.ImportEqualsDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.name = asName(name);
        node.isTypeOnly = isTypeOnly;
        node.moduleReference = moduleReference;
        node.transformFlags |= propagateChildrenFlags(node.modifiers) |
            propagateIdentifierNameFlags(node.name) |
            propagateChildFlags(node.moduleReference);
        if (!isExternalModuleReference(node.moduleReference)) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // Import= declaration is always parsed in an Await context
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateImportEqualsDeclaration(node, modifiers, isTypeOnly, name, moduleReference) {
        return node.modifiers !== modifiers
            || node.isTypeOnly !== isTypeOnly
            || node.name !== name
            || node.moduleReference !== moduleReference
            ? update(createImportEqualsDeclaration(modifiers, isTypeOnly, name, moduleReference), node)
            : node;
    }
    // @api
    function createImportDeclaration(modifiers, importClause, moduleSpecifier, attributes) {
        const node = createBaseNode(SyntaxKind.ImportDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.importClause = importClause;
        node.moduleSpecifier = moduleSpecifier;
        node.attributes = node.assertClause = attributes;
        node.transformFlags |= propagateChildFlags(node.importClause) |
            propagateChildFlags(node.moduleSpecifier);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateImportDeclaration(node, modifiers, importClause, moduleSpecifier, attributes) {
        return node.modifiers !== modifiers
            || node.importClause !== importClause
            || node.moduleSpecifier !== moduleSpecifier
            || node.attributes !== attributes
            ? update(createImportDeclaration(modifiers, importClause, moduleSpecifier, attributes), node)
            : node;
    }
    // @api
    function createImportClause(isTypeOnly, name, namedBindings) {
        const node = createBaseDeclaration(SyntaxKind.ImportClause);
        node.isTypeOnly = isTypeOnly;
        node.name = name;
        node.namedBindings = namedBindings;
        node.transformFlags |= propagateChildFlags(node.name) |
            propagateChildFlags(node.namedBindings);
        if (isTypeOnly) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateImportClause(node, isTypeOnly, name, namedBindings) {
        return node.isTypeOnly !== isTypeOnly
            || node.name !== name
            || node.namedBindings !== namedBindings
            ? update(createImportClause(isTypeOnly, name, namedBindings), node)
            : node;
    }
    // @api
    function createAssertClause(elements, multiLine) {
        const node = createBaseNode(SyntaxKind.AssertClause);
        node.elements = createNodeArray(elements);
        node.multiLine = multiLine;
        node.token = SyntaxKind.AssertKeyword;
        node.transformFlags |= TransformFlags.ContainsESNext;
        return node;
    }
    // @api
    function updateAssertClause(node, elements, multiLine) {
        return node.elements !== elements
            || node.multiLine !== multiLine
            ? update(createAssertClause(elements, multiLine), node)
            : node;
    }
    // @api
    function createAssertEntry(name, value) {
        const node = createBaseNode(SyntaxKind.AssertEntry);
        node.name = name;
        node.value = value;
        node.transformFlags |= TransformFlags.ContainsESNext;
        return node;
    }
    // @api
    function updateAssertEntry(node, name, value) {
        return node.name !== name
            || node.value !== value
            ? update(createAssertEntry(name, value), node)
            : node;
    }
    // @api
    function createImportTypeAssertionContainer(clause, multiLine) {
        const node = createBaseNode(SyntaxKind.ImportTypeAssertionContainer);
        node.assertClause = clause;
        node.multiLine = multiLine;
        return node;
    }
    // @api
    function updateImportTypeAssertionContainer(node, clause, multiLine) {
        return node.assertClause !== clause
            || node.multiLine !== multiLine
            ? update(createImportTypeAssertionContainer(clause, multiLine), node)
            : node;
    }
    function createImportAttributes(elements, multiLine, token) {
        const node = createBaseNode(SyntaxKind.ImportAttributes);
        node.token = token !== null && token !== void 0 ? token : SyntaxKind.WithKeyword;
        node.elements = createNodeArray(elements);
        node.multiLine = multiLine;
        node.transformFlags |= TransformFlags.ContainsESNext;
        return node;
    }
    // @api
    function updateImportAttributes(node, elements, multiLine) {
        return node.elements !== elements
            || node.multiLine !== multiLine
            ? update(createImportAttributes(elements, multiLine, node.token), node)
            : node;
    }
    // @api
    function createImportAttribute(name, value) {
        const node = createBaseNode(SyntaxKind.ImportAttribute);
        node.name = name;
        node.value = value;
        node.transformFlags |= TransformFlags.ContainsESNext;
        return node;
    }
    // @api
    function updateImportAttribute(node, name, value) {
        return node.name !== name
            || node.value !== value
            ? update(createImportAttribute(name, value), node)
            : node;
    }
    // @api
    function createNamespaceImport(name) {
        const node = createBaseDeclaration(SyntaxKind.NamespaceImport);
        node.name = name;
        node.transformFlags |= propagateChildFlags(node.name);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateNamespaceImport(node, name) {
        return node.name !== name
            ? update(createNamespaceImport(name), node)
            : node;
    }
    // @api
    function createNamespaceExport(name) {
        const node = createBaseDeclaration(SyntaxKind.NamespaceExport);
        node.name = name;
        node.transformFlags |= propagateChildFlags(node.name) |
            TransformFlags.ContainsES2020;
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateNamespaceExport(node, name) {
        return node.name !== name
            ? update(createNamespaceExport(name), node)
            : node;
    }
    // @api
    function createNamedImports(elements) {
        const node = createBaseNode(SyntaxKind.NamedImports);
        node.elements = createNodeArray(elements);
        node.transformFlags |= propagateChildrenFlags(node.elements);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateNamedImports(node, elements) {
        return node.elements !== elements
            ? update(createNamedImports(elements), node)
            : node;
    }
    // @api
    function createImportSpecifier(isTypeOnly, propertyName, name) {
        const node = createBaseDeclaration(SyntaxKind.ImportSpecifier);
        node.isTypeOnly = isTypeOnly;
        node.propertyName = propertyName;
        node.name = name;
        node.transformFlags |= propagateChildFlags(node.propertyName) |
            propagateChildFlags(node.name);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateImportSpecifier(node, isTypeOnly, propertyName, name) {
        return node.isTypeOnly !== isTypeOnly
            || node.propertyName !== propertyName
            || node.name !== name
            ? update(createImportSpecifier(isTypeOnly, propertyName, name), node)
            : node;
    }
    // @api
    function createExportAssignment(modifiers, isExportEquals, expression) {
        const node = createBaseDeclaration(SyntaxKind.ExportAssignment);
        node.modifiers = asNodeArray(modifiers);
        node.isExportEquals = isExportEquals;
        node.expression = isExportEquals
            ? parenthesizerRules().parenthesizeRightSideOfBinary(SyntaxKind.EqualsToken, /*leftSide*/ undefined, expression)
            : parenthesizerRules().parenthesizeExpressionOfExportDefault(expression);
        node.transformFlags |= propagateChildrenFlags(node.modifiers) | propagateChildFlags(node.expression);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateExportAssignment(node, modifiers, expression) {
        return node.modifiers !== modifiers
            || node.expression !== expression
            ? update(createExportAssignment(modifiers, node.isExportEquals, expression), node)
            : node;
    }
    // @api
    function createExportDeclaration(modifiers, isTypeOnly, exportClause, moduleSpecifier, attributes) {
        const node = createBaseDeclaration(SyntaxKind.ExportDeclaration);
        node.modifiers = asNodeArray(modifiers);
        node.isTypeOnly = isTypeOnly;
        node.exportClause = exportClause;
        node.moduleSpecifier = moduleSpecifier;
        node.attributes = node.assertClause = attributes;
        node.transformFlags |= propagateChildrenFlags(node.modifiers) |
            propagateChildFlags(node.exportClause) |
            propagateChildFlags(node.moduleSpecifier);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateExportDeclaration(node, modifiers, isTypeOnly, exportClause, moduleSpecifier, attributes) {
        return node.modifiers !== modifiers
            || node.isTypeOnly !== isTypeOnly
            || node.exportClause !== exportClause
            || node.moduleSpecifier !== moduleSpecifier
            || node.attributes !== attributes
            ? finishUpdateExportDeclaration(createExportDeclaration(modifiers, isTypeOnly, exportClause, moduleSpecifier, attributes), node)
            : node;
    }
    function finishUpdateExportDeclaration(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            if (updated.modifiers === original.modifiers) {
                updated.modifiers = original.modifiers;
            }
        }
        return update(updated, original);
    }
    // @api
    function createNamedExports(elements) {
        const node = createBaseNode(SyntaxKind.NamedExports);
        node.elements = createNodeArray(elements);
        node.transformFlags |= propagateChildrenFlags(node.elements);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateNamedExports(node, elements) {
        return node.elements !== elements
            ? update(createNamedExports(elements), node)
            : node;
    }
    // @api
    function createExportSpecifier(isTypeOnly, propertyName, name) {
        const node = createBaseNode(SyntaxKind.ExportSpecifier);
        node.isTypeOnly = isTypeOnly;
        node.propertyName = asName(propertyName);
        node.name = asName(name);
        node.transformFlags |= propagateChildFlags(node.propertyName) |
            propagateChildFlags(node.name);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateExportSpecifier(node, isTypeOnly, propertyName, name) {
        return node.isTypeOnly !== isTypeOnly
            || node.propertyName !== propertyName
            || node.name !== name
            ? update(createExportSpecifier(isTypeOnly, propertyName, name), node)
            : node;
    }
    // @api
    function createMissingDeclaration() {
        const node = createBaseDeclaration(SyntaxKind.MissingDeclaration);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    //
    // Module references
    //
    // @api
    function createExternalModuleReference(expression) {
        const node = createBaseNode(SyntaxKind.ExternalModuleReference);
        node.expression = expression;
        node.transformFlags |= propagateChildFlags(node.expression);
        node.transformFlags &= ~TransformFlags.ContainsPossibleTopLevelAwait; // always parsed in an Await context
        return node;
    }
    // @api
    function updateExternalModuleReference(node, expression) {
        return node.expression !== expression
            ? update(createExternalModuleReference(expression), node)
            : node;
    }
    //
    // JSDoc
    //
    // @api
    // createJSDocAllType
    // createJSDocUnknownType
    function createJSDocPrimaryTypeWorker(kind) {
        return createBaseNode(kind);
    }
    // @api
    // createJSDocNullableType
    // createJSDocNonNullableType
    function createJSDocPrePostfixUnaryTypeWorker(kind, type, postfix = false) {
        const node = createJSDocUnaryTypeWorker(kind, postfix ? type && parenthesizerRules().parenthesizeNonArrayTypeOfPostfixType(type) : type);
        node.postfix = postfix;
        return node;
    }
    // @api
    // createJSDocOptionalType
    // createJSDocVariadicType
    // createJSDocNamepathType
    function createJSDocUnaryTypeWorker(kind, type) {
        const node = createBaseNode(kind);
        node.type = type;
        return node;
    }
    // @api
    // updateJSDocNonNullableType
    // updateJSDocNullableType
    function updateJSDocPrePostfixUnaryTypeWorker(kind, node, type) {
        return node.type !== type
            ? update(createJSDocPrePostfixUnaryTypeWorker(kind, type, node.postfix), node)
            : node;
    }
    // @api
    // updateJSDocOptionalType
    // updateJSDocVariadicType
    // updateJSDocNamepathType
    function updateJSDocUnaryTypeWorker(kind, node, type) {
        return node.type !== type
            ? update(createJSDocUnaryTypeWorker(kind, type), node)
            : node;
    }
    // @api
    function createJSDocFunctionType(parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.JSDocFunctionType);
        node.parameters = asNodeArray(parameters);
        node.type = type;
        node.transformFlags = propagateChildrenFlags(node.parameters) |
            (node.type ? TransformFlags.ContainsTypeScript : TransformFlags.None);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.typeArguments = undefined; // used in quick info
        return node;
    }
    // @api
    function updateJSDocFunctionType(node, parameters, type) {
        return node.parameters !== parameters
            || node.type !== type
            ? update(createJSDocFunctionType(parameters, type), node)
            : node;
    }
    // @api
    function createJSDocTypeLiteral(propertyTags, isArrayType = false) {
        const node = createBaseDeclaration(SyntaxKind.JSDocTypeLiteral);
        node.jsDocPropertyTags = asNodeArray(propertyTags);
        node.isArrayType = isArrayType;
        return node;
    }
    // @api
    function updateJSDocTypeLiteral(node, propertyTags, isArrayType) {
        return node.jsDocPropertyTags !== propertyTags
            || node.isArrayType !== isArrayType
            ? update(createJSDocTypeLiteral(propertyTags, isArrayType), node)
            : node;
    }
    // @api
    function createJSDocTypeExpression(type) {
        const node = createBaseNode(SyntaxKind.JSDocTypeExpression);
        node.type = type;
        return node;
    }
    // @api
    function updateJSDocTypeExpression(node, type) {
        return node.type !== type
            ? update(createJSDocTypeExpression(type), node)
            : node;
    }
    // @api
    function createJSDocSignature(typeParameters, parameters, type) {
        const node = createBaseDeclaration(SyntaxKind.JSDocSignature);
        node.typeParameters = asNodeArray(typeParameters);
        node.parameters = createNodeArray(parameters);
        node.type = type;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateJSDocSignature(node, typeParameters, parameters, type) {
        return node.typeParameters !== typeParameters
            || node.parameters !== parameters
            || node.type !== type
            ? update(createJSDocSignature(typeParameters, parameters, type), node)
            : node;
    }
    function getDefaultTagName(node) {
        const defaultTagName = getDefaultTagNameForKind(node.kind);
        return node.tagName.escapedText === escapeLeadingUnderscores(defaultTagName)
            ? node.tagName
            : createIdentifier(defaultTagName);
    }
    // @api
    function createBaseJSDocTag(kind, tagName, comment) {
        const node = createBaseNode(kind);
        node.tagName = tagName;
        node.comment = comment;
        return node;
    }
    function createBaseJSDocTagDeclaration(kind, tagName, comment) {
        const node = createBaseDeclaration(kind);
        node.tagName = tagName;
        node.comment = comment;
        return node;
    }
    // @api
    function createJSDocTemplateTag(tagName, constraint, typeParameters, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocTemplateTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("template"), comment);
        node.constraint = constraint;
        node.typeParameters = createNodeArray(typeParameters);
        return node;
    }
    // @api
    function updateJSDocTemplateTag(node, tagName = getDefaultTagName(node), constraint, typeParameters, comment) {
        return node.tagName !== tagName
            || node.constraint !== constraint
            || node.typeParameters !== typeParameters
            || node.comment !== comment
            ? update(createJSDocTemplateTag(tagName, constraint, typeParameters, comment), node)
            : node;
    }
    // @api
    function createJSDocTypedefTag(tagName, typeExpression, fullName, comment) {
        const node = createBaseJSDocTagDeclaration(SyntaxKind.JSDocTypedefTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("typedef"), comment);
        node.typeExpression = typeExpression;
        node.fullName = fullName;
        node.name = getJSDocTypeAliasName(fullName);
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateJSDocTypedefTag(node, tagName = getDefaultTagName(node), typeExpression, fullName, comment) {
        return node.tagName !== tagName
            || node.typeExpression !== typeExpression
            || node.fullName !== fullName
            || node.comment !== comment
            ? update(createJSDocTypedefTag(tagName, typeExpression, fullName, comment), node)
            : node;
    }
    // @api
    function createJSDocParameterTag(tagName, name, isBracketed, typeExpression, isNameFirst, comment) {
        const node = createBaseJSDocTagDeclaration(SyntaxKind.JSDocParameterTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("param"), comment);
        node.typeExpression = typeExpression;
        node.name = name;
        node.isNameFirst = !!isNameFirst;
        node.isBracketed = isBracketed;
        return node;
    }
    // @api
    function updateJSDocParameterTag(node, tagName = getDefaultTagName(node), name, isBracketed, typeExpression, isNameFirst, comment) {
        return node.tagName !== tagName
            || node.name !== name
            || node.isBracketed !== isBracketed
            || node.typeExpression !== typeExpression
            || node.isNameFirst !== isNameFirst
            || node.comment !== comment
            ? update(createJSDocParameterTag(tagName, name, isBracketed, typeExpression, isNameFirst, comment), node)
            : node;
    }
    // @api
    function createJSDocPropertyTag(tagName, name, isBracketed, typeExpression, isNameFirst, comment) {
        const node = createBaseJSDocTagDeclaration(SyntaxKind.JSDocPropertyTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("prop"), comment);
        node.typeExpression = typeExpression;
        node.name = name;
        node.isNameFirst = !!isNameFirst;
        node.isBracketed = isBracketed;
        return node;
    }
    // @api
    function updateJSDocPropertyTag(node, tagName = getDefaultTagName(node), name, isBracketed, typeExpression, isNameFirst, comment) {
        return node.tagName !== tagName
            || node.name !== name
            || node.isBracketed !== isBracketed
            || node.typeExpression !== typeExpression
            || node.isNameFirst !== isNameFirst
            || node.comment !== comment
            ? update(createJSDocPropertyTag(tagName, name, isBracketed, typeExpression, isNameFirst, comment), node)
            : node;
    }
    // @api
    function createJSDocCallbackTag(tagName, typeExpression, fullName, comment) {
        const node = createBaseJSDocTagDeclaration(SyntaxKind.JSDocCallbackTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("callback"), comment);
        node.typeExpression = typeExpression;
        node.fullName = fullName;
        node.name = getJSDocTypeAliasName(fullName);
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateJSDocCallbackTag(node, tagName = getDefaultTagName(node), typeExpression, fullName, comment) {
        return node.tagName !== tagName
            || node.typeExpression !== typeExpression
            || node.fullName !== fullName
            || node.comment !== comment
            ? update(createJSDocCallbackTag(tagName, typeExpression, fullName, comment), node)
            : node;
    }
    // @api
    function createJSDocOverloadTag(tagName, typeExpression, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocOverloadTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("overload"), comment);
        node.typeExpression = typeExpression;
        return node;
    }
    // @api
    function updateJSDocOverloadTag(node, tagName = getDefaultTagName(node), typeExpression, comment) {
        return node.tagName !== tagName
            || node.typeExpression !== typeExpression
            || node.comment !== comment
            ? update(createJSDocOverloadTag(tagName, typeExpression, comment), node)
            : node;
    }
    // @api
    function createJSDocAugmentsTag(tagName, className, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocAugmentsTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("augments"), comment);
        node.class = className;
        return node;
    }
    // @api
    function updateJSDocAugmentsTag(node, tagName = getDefaultTagName(node), className, comment) {
        return node.tagName !== tagName
            || node.class !== className
            || node.comment !== comment
            ? update(createJSDocAugmentsTag(tagName, className, comment), node)
            : node;
    }
    // @api
    function createJSDocImplementsTag(tagName, className, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocImplementsTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("implements"), comment);
        node.class = className;
        return node;
    }
    // @api
    function createJSDocSeeTag(tagName, name, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocSeeTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("see"), comment);
        node.name = name;
        return node;
    }
    // @api
    function updateJSDocSeeTag(node, tagName, name, comment) {
        return node.tagName !== tagName
            || node.name !== name
            || node.comment !== comment
            ? update(createJSDocSeeTag(tagName, name, comment), node)
            : node;
    }
    // @api
    function createJSDocNameReference(name) {
        const node = createBaseNode(SyntaxKind.JSDocNameReference);
        node.name = name;
        return node;
    }
    // @api
    function updateJSDocNameReference(node, name) {
        return node.name !== name
            ? update(createJSDocNameReference(name), node)
            : node;
    }
    // @api
    function createJSDocMemberName(left, right) {
        const node = createBaseNode(SyntaxKind.JSDocMemberName);
        node.left = left;
        node.right = right;
        node.transformFlags |= propagateChildFlags(node.left) |
            propagateChildFlags(node.right);
        return node;
    }
    // @api
    function updateJSDocMemberName(node, left, right) {
        return node.left !== left
            || node.right !== right
            ? update(createJSDocMemberName(left, right), node)
            : node;
    }
    // @api
    function createJSDocLink(name, text) {
        const node = createBaseNode(SyntaxKind.JSDocLink);
        node.name = name;
        node.text = text;
        return node;
    }
    // @api
    function updateJSDocLink(node, name, text) {
        return node.name !== name
            ? update(createJSDocLink(name, text), node)
            : node;
    }
    // @api
    function createJSDocLinkCode(name, text) {
        const node = createBaseNode(SyntaxKind.JSDocLinkCode);
        node.name = name;
        node.text = text;
        return node;
    }
    // @api
    function updateJSDocLinkCode(node, name, text) {
        return node.name !== name
            ? update(createJSDocLinkCode(name, text), node)
            : node;
    }
    // @api
    function createJSDocLinkPlain(name, text) {
        const node = createBaseNode(SyntaxKind.JSDocLinkPlain);
        node.name = name;
        node.text = text;
        return node;
    }
    // @api
    function updateJSDocLinkPlain(node, name, text) {
        return node.name !== name
            ? update(createJSDocLinkPlain(name, text), node)
            : node;
    }
    // @api
    function updateJSDocImplementsTag(node, tagName = getDefaultTagName(node), className, comment) {
        return node.tagName !== tagName
            || node.class !== className
            || node.comment !== comment
            ? update(createJSDocImplementsTag(tagName, className, comment), node)
            : node;
    }
    // @api
    // createJSDocAuthorTag
    // createJSDocClassTag
    // createJSDocPublicTag
    // createJSDocPrivateTag
    // createJSDocProtectedTag
    // createJSDocReadonlyTag
    // createJSDocDeprecatedTag
    function createJSDocSimpleTagWorker(kind, tagName, comment) {
        const node = createBaseJSDocTag(kind, tagName !== null && tagName !== void 0 ? tagName : createIdentifier(getDefaultTagNameForKind(kind)), comment);
        return node;
    }
    // @api
    // updateJSDocAuthorTag
    // updateJSDocClassTag
    // updateJSDocPublicTag
    // updateJSDocPrivateTag
    // updateJSDocProtectedTag
    // updateJSDocReadonlyTag
    // updateJSDocDeprecatedTag
    function updateJSDocSimpleTagWorker(kind, node, tagName = getDefaultTagName(node), comment) {
        return node.tagName !== tagName
            || node.comment !== comment
            ? update(createJSDocSimpleTagWorker(kind, tagName, comment), node) :
            node;
    }
    // @api
    // createJSDocTypeTag
    // createJSDocReturnTag
    // createJSDocThisTag
    // createJSDocEnumTag
    // createJSDocSatisfiesTag
    function createJSDocTypeLikeTagWorker(kind, tagName, typeExpression, comment) {
        const node = createBaseJSDocTag(kind, tagName !== null && tagName !== void 0 ? tagName : createIdentifier(getDefaultTagNameForKind(kind)), comment);
        node.typeExpression = typeExpression;
        return node;
    }
    // @api
    // updateJSDocTypeTag
    // updateJSDocReturnTag
    // updateJSDocThisTag
    // updateJSDocEnumTag
    // updateJSDocSatisfiesTag
    function updateJSDocTypeLikeTagWorker(kind, node, tagName = getDefaultTagName(node), typeExpression, comment) {
        return node.tagName !== tagName
            || node.typeExpression !== typeExpression
            || node.comment !== comment
            ? update(createJSDocTypeLikeTagWorker(kind, tagName, typeExpression, comment), node)
            : node;
    }
    // @api
    function createJSDocUnknownTag(tagName, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocTag, tagName, comment);
        return node;
    }
    // @api
    function updateJSDocUnknownTag(node, tagName, comment) {
        return node.tagName !== tagName
            || node.comment !== comment
            ? update(createJSDocUnknownTag(tagName, comment), node)
            : node;
    }
    // @api
    function createJSDocEnumTag(tagName, typeExpression, comment) {
        const node = createBaseJSDocTagDeclaration(SyntaxKind.JSDocEnumTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier(getDefaultTagNameForKind(SyntaxKind.JSDocEnumTag)), comment);
        node.typeExpression = typeExpression;
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateJSDocEnumTag(node, tagName = getDefaultTagName(node), typeExpression, comment) {
        return node.tagName !== tagName
            || node.typeExpression !== typeExpression
            || node.comment !== comment
            ? update(createJSDocEnumTag(tagName, typeExpression, comment), node)
            : node;
    }
    // @api
    function createJSDocImportTag(tagName, importClause, moduleSpecifier, attributes, comment) {
        const node = createBaseJSDocTag(SyntaxKind.JSDocImportTag, tagName !== null && tagName !== void 0 ? tagName : createIdentifier("import"), comment);
        node.importClause = importClause;
        node.moduleSpecifier = moduleSpecifier;
        node.attributes = attributes;
        node.comment = comment;
        return node;
    }
    function updateJSDocImportTag(node, tagName, importClause, moduleSpecifier, attributes, comment) {
        return node.tagName !== tagName
            || node.comment !== comment
            || node.importClause !== importClause
            || node.moduleSpecifier !== moduleSpecifier
            || node.attributes !== attributes
            ? update(createJSDocImportTag(tagName, importClause, moduleSpecifier, attributes, comment), node)
            : node;
    }
    // @api
    function createJSDocText(text) {
        const node = createBaseNode(SyntaxKind.JSDocText);
        node.text = text;
        return node;
    }
    // @api
    function updateJSDocText(node, text) {
        return node.text !== text
            ? update(createJSDocText(text), node)
            : node;
    }
    // @api
    function createJSDocComment(comment, tags) {
        const node = createBaseNode(SyntaxKind.JSDoc);
        node.comment = comment;
        node.tags = asNodeArray(tags);
        return node;
    }
    // @api
    function updateJSDocComment(node, comment, tags) {
        return node.comment !== comment
            || node.tags !== tags
            ? update(createJSDocComment(comment, tags), node)
            : node;
    }
    //
    // JSX
    //
    // @api
    function createJsxElement(openingElement, children, closingElement) {
        const node = createBaseNode(SyntaxKind.JsxElement);
        node.openingElement = openingElement;
        node.children = createNodeArray(children);
        node.closingElement = closingElement;
        node.transformFlags |= propagateChildFlags(node.openingElement) |
            propagateChildrenFlags(node.children) |
            propagateChildFlags(node.closingElement) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxElement(node, openingElement, children, closingElement) {
        return node.openingElement !== openingElement
            || node.children !== children
            || node.closingElement !== closingElement
            ? update(createJsxElement(openingElement, children, closingElement), node)
            : node;
    }
    // @api
    function createJsxSelfClosingElement(tagName, typeArguments, attributes) {
        const node = createBaseNode(SyntaxKind.JsxSelfClosingElement);
        node.tagName = tagName;
        node.typeArguments = asNodeArray(typeArguments);
        node.attributes = attributes;
        node.transformFlags |= propagateChildFlags(node.tagName) |
            propagateChildrenFlags(node.typeArguments) |
            propagateChildFlags(node.attributes) |
            TransformFlags.ContainsJsx;
        if (node.typeArguments) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        return node;
    }
    // @api
    function updateJsxSelfClosingElement(node, tagName, typeArguments, attributes) {
        return node.tagName !== tagName
            || node.typeArguments !== typeArguments
            || node.attributes !== attributes
            ? update(createJsxSelfClosingElement(tagName, typeArguments, attributes), node)
            : node;
    }
    // @api
    function createJsxOpeningElement(tagName, typeArguments, attributes) {
        const node = createBaseNode(SyntaxKind.JsxOpeningElement);
        node.tagName = tagName;
        node.typeArguments = asNodeArray(typeArguments);
        node.attributes = attributes;
        node.transformFlags |= propagateChildFlags(node.tagName) |
            propagateChildrenFlags(node.typeArguments) |
            propagateChildFlags(node.attributes) |
            TransformFlags.ContainsJsx;
        if (typeArguments) {
            node.transformFlags |= TransformFlags.ContainsTypeScript;
        }
        return node;
    }
    // @api
    function updateJsxOpeningElement(node, tagName, typeArguments, attributes) {
        return node.tagName !== tagName
            || node.typeArguments !== typeArguments
            || node.attributes !== attributes
            ? update(createJsxOpeningElement(tagName, typeArguments, attributes), node)
            : node;
    }
    // @api
    function createJsxClosingElement(tagName) {
        const node = createBaseNode(SyntaxKind.JsxClosingElement);
        node.tagName = tagName;
        node.transformFlags |= propagateChildFlags(node.tagName) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxClosingElement(node, tagName) {
        return node.tagName !== tagName
            ? update(createJsxClosingElement(tagName), node)
            : node;
    }
    // @api
    function createJsxFragment(openingFragment, children, closingFragment) {
        const node = createBaseNode(SyntaxKind.JsxFragment);
        node.openingFragment = openingFragment;
        node.children = createNodeArray(children);
        node.closingFragment = closingFragment;
        node.transformFlags |= propagateChildFlags(node.openingFragment) |
            propagateChildrenFlags(node.children) |
            propagateChildFlags(node.closingFragment) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxFragment(node, openingFragment, children, closingFragment) {
        return node.openingFragment !== openingFragment
            || node.children !== children
            || node.closingFragment !== closingFragment
            ? update(createJsxFragment(openingFragment, children, closingFragment), node)
            : node;
    }
    // @api
    function createJsxText(text, containsOnlyTriviaWhiteSpaces) {
        const node = createBaseNode(SyntaxKind.JsxText);
        node.text = text;
        node.containsOnlyTriviaWhiteSpaces = !!containsOnlyTriviaWhiteSpaces;
        node.transformFlags |= TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxText(node, text, containsOnlyTriviaWhiteSpaces) {
        return node.text !== text
            || node.containsOnlyTriviaWhiteSpaces !== containsOnlyTriviaWhiteSpaces
            ? update(createJsxText(text, containsOnlyTriviaWhiteSpaces), node)
            : node;
    }
    // @api
    function createJsxOpeningFragment() {
        const node = createBaseNode(SyntaxKind.JsxOpeningFragment);
        node.transformFlags |= TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function createJsxJsxClosingFragment() {
        const node = createBaseNode(SyntaxKind.JsxClosingFragment);
        node.transformFlags |= TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function createJsxAttribute(name, initializer) {
        const node = createBaseDeclaration(SyntaxKind.JsxAttribute);
        node.name = name;
        node.initializer = initializer;
        node.transformFlags |= propagateChildFlags(node.name) |
            propagateChildFlags(node.initializer) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxAttribute(node, name, initializer) {
        return node.name !== name
            || node.initializer !== initializer
            ? update(createJsxAttribute(name, initializer), node)
            : node;
    }
    // @api
    function createJsxAttributes(properties) {
        const node = createBaseDeclaration(SyntaxKind.JsxAttributes);
        node.properties = createNodeArray(properties);
        node.transformFlags |= propagateChildrenFlags(node.properties) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxAttributes(node, properties) {
        return node.properties !== properties
            ? update(createJsxAttributes(properties), node)
            : node;
    }
    // @api
    function createJsxSpreadAttribute(expression) {
        const node = createBaseNode(SyntaxKind.JsxSpreadAttribute);
        node.expression = expression;
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxSpreadAttribute(node, expression) {
        return node.expression !== expression
            ? update(createJsxSpreadAttribute(expression), node)
            : node;
    }
    // @api
    function createJsxExpression(dotDotDotToken, expression) {
        const node = createBaseNode(SyntaxKind.JsxExpression);
        node.dotDotDotToken = dotDotDotToken;
        node.expression = expression;
        node.transformFlags |= propagateChildFlags(node.dotDotDotToken) |
            propagateChildFlags(node.expression) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxExpression(node, expression) {
        return node.expression !== expression
            ? update(createJsxExpression(node.dotDotDotToken, expression), node)
            : node;
    }
    // @api
    function createJsxNamespacedName(namespace, name) {
        const node = createBaseNode(SyntaxKind.JsxNamespacedName);
        node.namespace = namespace;
        node.name = name;
        node.transformFlags |= propagateChildFlags(node.namespace) |
            propagateChildFlags(node.name) |
            TransformFlags.ContainsJsx;
        return node;
    }
    // @api
    function updateJsxNamespacedName(node, namespace, name) {
        return node.namespace !== namespace
            || node.name !== name
            ? update(createJsxNamespacedName(namespace, name), node)
            : node;
    }
    //
    // Clauses
    //
    // @api
    function createCaseClause(expression, statements) {
        const node = createBaseNode(SyntaxKind.CaseClause);
        node.expression = parenthesizerRules().parenthesizeExpressionForDisallowedComma(expression);
        node.statements = createNodeArray(statements);
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildrenFlags(node.statements);
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateCaseClause(node, expression, statements) {
        return node.expression !== expression
            || node.statements !== statements
            ? update(createCaseClause(expression, statements), node)
            : node;
    }
    // @api
    function createDefaultClause(statements) {
        const node = createBaseNode(SyntaxKind.DefaultClause);
        node.statements = createNodeArray(statements);
        node.transformFlags = propagateChildrenFlags(node.statements);
        return node;
    }
    // @api
    function updateDefaultClause(node, statements) {
        return node.statements !== statements
            ? update(createDefaultClause(statements), node)
            : node;
    }
    // @api
    function createHeritageClause(token, types) {
        const node = createBaseNode(SyntaxKind.HeritageClause);
        node.token = token;
        node.types = createNodeArray(types);
        node.transformFlags |= propagateChildrenFlags(node.types);
        switch (token) {
            case SyntaxKind.ExtendsKeyword:
                node.transformFlags |= TransformFlags.ContainsES2015;
                break;
            case SyntaxKind.ImplementsKeyword:
                node.transformFlags |= TransformFlags.ContainsTypeScript;
                break;
            default:
                return Debug.assertNever(token);
        }
        return node;
    }
    // @api
    function updateHeritageClause(node, types) {
        return node.types !== types
            ? update(createHeritageClause(node.token, types), node)
            : node;
    }
    // @api
    function createCatchClause(variableDeclaration, block) {
        const node = createBaseNode(SyntaxKind.CatchClause);
        node.variableDeclaration = asVariableDeclaration(variableDeclaration);
        node.block = block;
        node.transformFlags |= propagateChildFlags(node.variableDeclaration) |
            propagateChildFlags(node.block) |
            (!variableDeclaration ? TransformFlags.ContainsES2019 : TransformFlags.None);
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        return node;
    }
    // @api
    function updateCatchClause(node, variableDeclaration, block) {
        return node.variableDeclaration !== variableDeclaration
            || node.block !== block
            ? update(createCatchClause(variableDeclaration, block), node)
            : node;
    }
    //
    // Property assignments
    //
    // @api
    function createPropertyAssignment(name, initializer) {
        const node = createBaseDeclaration(SyntaxKind.PropertyAssignment);
        node.name = asName(name);
        node.initializer = parenthesizerRules().parenthesizeExpressionForDisallowedComma(initializer);
        node.transformFlags |= propagateNameFlags(node.name) |
            propagateChildFlags(node.initializer);
        node.modifiers = undefined; // initialized by parser to report grammar errors
        node.questionToken = undefined; // initialized by parser to report grammar errors
        node.exclamationToken = undefined; // initialized by parser to report grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updatePropertyAssignment(node, name, initializer) {
        return node.name !== name
            || node.initializer !== initializer
            ? finishUpdatePropertyAssignment(createPropertyAssignment(name, initializer), node)
            : node;
    }
    function finishUpdatePropertyAssignment(updated, original) {
        // copy children used only for error reporting
        if (updated !== original) {
            // copy children used only for error reporting
            updated.modifiers = original.modifiers;
            updated.questionToken = original.questionToken;
            updated.exclamationToken = original.exclamationToken;
        }
        return update(updated, original);
    }
    // @api
    function createShorthandPropertyAssignment(name, objectAssignmentInitializer) {
        const node = createBaseDeclaration(SyntaxKind.ShorthandPropertyAssignment);
        node.name = asName(name);
        node.objectAssignmentInitializer = objectAssignmentInitializer && parenthesizerRules().parenthesizeExpressionForDisallowedComma(objectAssignmentInitializer);
        node.transformFlags |= propagateIdentifierNameFlags(node.name) |
            propagateChildFlags(node.objectAssignmentInitializer) |
            TransformFlags.ContainsES2015;
        node.equalsToken = undefined; // initialized by parser to report grammar errors
        node.modifiers = undefined; // initialized by parser to report grammar errors
        node.questionToken = undefined; // initialized by parser to report grammar errors
        node.exclamationToken = undefined; // initialized by parser to report grammar errors
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateShorthandPropertyAssignment(node, name, objectAssignmentInitializer) {
        return node.name !== name
            || node.objectAssignmentInitializer !== objectAssignmentInitializer
            ? finishUpdateShorthandPropertyAssignment(createShorthandPropertyAssignment(name, objectAssignmentInitializer), node)
            : node;
    }
    function finishUpdateShorthandPropertyAssignment(updated, original) {
        if (updated !== original) {
            // copy children used only for error reporting
            updated.modifiers = original.modifiers;
            updated.questionToken = original.questionToken;
            updated.exclamationToken = original.exclamationToken;
            updated.equalsToken = original.equalsToken;
        }
        return update(updated, original);
    }
    // @api
    function createSpreadAssignment(expression) {
        const node = createBaseDeclaration(SyntaxKind.SpreadAssignment);
        node.expression = parenthesizerRules().parenthesizeExpressionForDisallowedComma(expression);
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsES2018 |
            TransformFlags.ContainsObjectRestOrSpread;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateSpreadAssignment(node, expression) {
        return node.expression !== expression
            ? update(createSpreadAssignment(expression), node)
            : node;
    }
    //
    // Enum
    //
    // @api
    function createEnumMember(name, initializer) {
        const node = createBaseDeclaration(SyntaxKind.EnumMember);
        node.name = asName(name);
        node.initializer = initializer && parenthesizerRules().parenthesizeExpressionForDisallowedComma(initializer);
        node.transformFlags |= propagateChildFlags(node.name) |
            propagateChildFlags(node.initializer) |
            TransformFlags.ContainsTypeScript;
        node.jsDoc = undefined; // initialized by parser (JsDocContainer)
        return node;
    }
    // @api
    function updateEnumMember(node, name, initializer) {
        return node.name !== name
            || node.initializer !== initializer
            ? update(createEnumMember(name, initializer), node)
            : node;
    }
    //
    // Top-level nodes
    //
    // @api
    function createSourceFile(statements, endOfFileToken, flags) {
        const node = baseFactory.createBaseSourceFileNode(SyntaxKind.SourceFile);
        node.statements = createNodeArray(statements);
        node.endOfFileToken = endOfFileToken;
        node.flags |= flags;
        node.text = "";
        node.fileName = "";
        node.path = "";
        node.resolvedPath = "";
        node.originalFileName = "";
        node.languageVersion = ScriptTarget.ES5;
        node.languageVariant = 0;
        node.scriptKind = 0;
        node.isDeclarationFile = false;
        node.hasNoDefaultLib = false;
        node.transformFlags |= propagateChildrenFlags(node.statements) |
            propagateChildFlags(node.endOfFileToken);
        node.locals = undefined; // initialized by binder (LocalsContainer)
        node.nextContainer = undefined; // initialized by binder (LocalsContainer)
        node.endFlowNode = undefined;
        node.nodeCount = 0;
        node.identifierCount = 0;
        node.symbolCount = 0;
        node.parseDiagnostics = undefined;
        node.bindDiagnostics = undefined;
        node.bindSuggestionDiagnostics = undefined;
        node.lineMap = undefined;
        node.externalModuleIndicator = undefined;
        node.setExternalModuleIndicator = undefined;
        node.pragmas = undefined;
        node.checkJsDirective = undefined;
        node.referencedFiles = undefined;
        node.typeReferenceDirectives = undefined;
        node.libReferenceDirectives = undefined;
        node.amdDependencies = undefined;
        node.commentDirectives = undefined;
        node.identifiers = undefined;
        node.packageJsonLocations = undefined;
        node.packageJsonScope = undefined;
        node.imports = undefined;
        node.moduleAugmentations = undefined;
        node.ambientModuleNames = undefined;
        node.classifiableNames = undefined;
        node.impliedNodeFormat = undefined;
        return node;
    }
    function createRedirectedSourceFile(redirectInfo) {
        const node = Object.create(redirectInfo.redirectTarget);
        Object.defineProperties(node, {
            id: {
                get() {
                    return this.redirectInfo.redirectTarget.id;
                },
                set(value) {
                    this.redirectInfo.redirectTarget.id = value;
                },
            },
            symbol: {
                get() {
                    return this.redirectInfo.redirectTarget.symbol;
                },
                set(value) {
                    this.redirectInfo.redirectTarget.symbol = value;
                },
            },
        });
        node.redirectInfo = redirectInfo;
        return node;
    }
    function cloneRedirectedSourceFile(source) {
        const node = createRedirectedSourceFile(source.redirectInfo);
        node.flags |= source.flags & ~NodeFlags.Synthesized;
        node.fileName = source.fileName;
        node.path = source.path;
        node.resolvedPath = source.resolvedPath;
        node.originalFileName = source.originalFileName;
        node.packageJsonLocations = source.packageJsonLocations;
        node.packageJsonScope = source.packageJsonScope;
        node.emitNode = undefined;
        return node;
    }
    function cloneSourceFileWorker(source) {
        // TODO: This mechanism for cloning results in megamorphic property reads and writes. In future perf-related
        //       work, we should consider switching explicit property assignments instead of using `for..in`.
        const node = baseFactory.createBaseSourceFileNode(SyntaxKind.SourceFile);
        node.flags |= source.flags & ~NodeFlags.Synthesized;
        for (const p in source) {
            if (hasProperty(node, p) || !hasProperty(source, p)) {
                continue;
            }
            if (p === "emitNode") {
                node.emitNode = undefined;
                continue;
            }
            node[p] = source[p];
        }
        return node;
    }
    function cloneSourceFile(source) {
        const node = source.redirectInfo ? cloneRedirectedSourceFile(source) : cloneSourceFileWorker(source);
        setOriginal(node, source);
        return node;
    }
    function cloneSourceFileWithChanges(source, statements, isDeclarationFile, referencedFiles, typeReferences, hasNoDefaultLib, libReferences) {
        const node = cloneSourceFile(source);
        node.statements = createNodeArray(statements);
        node.isDeclarationFile = isDeclarationFile;
        node.referencedFiles = referencedFiles;
        node.typeReferenceDirectives = typeReferences;
        node.hasNoDefaultLib = hasNoDefaultLib;
        node.libReferenceDirectives = libReferences;
        node.transformFlags = propagateChildrenFlags(node.statements) |
            propagateChildFlags(node.endOfFileToken);
        return node;
    }
    // @api
    function updateSourceFile(node, statements, isDeclarationFile = node.isDeclarationFile, referencedFiles = node.referencedFiles, typeReferenceDirectives = node.typeReferenceDirectives, hasNoDefaultLib = node.hasNoDefaultLib, libReferenceDirectives = node.libReferenceDirectives) {
        return node.statements !== statements
            || node.isDeclarationFile !== isDeclarationFile
            || node.referencedFiles !== referencedFiles
            || node.typeReferenceDirectives !== typeReferenceDirectives
            || node.hasNoDefaultLib !== hasNoDefaultLib
            || node.libReferenceDirectives !== libReferenceDirectives
            ? update(cloneSourceFileWithChanges(node, statements, isDeclarationFile, referencedFiles, typeReferenceDirectives, hasNoDefaultLib, libReferenceDirectives), node)
            : node;
    }
    // @api
    function createBundle(sourceFiles) {
        const node = createBaseNode(SyntaxKind.Bundle);
        node.sourceFiles = sourceFiles;
        node.syntheticFileReferences = undefined;
        node.syntheticTypeReferences = undefined;
        node.syntheticLibReferences = undefined;
        node.hasNoDefaultLib = undefined;
        return node;
    }
    // @api
    function updateBundle(node, sourceFiles) {
        return node.sourceFiles !== sourceFiles
            ? update(createBundle(sourceFiles), node)
            : node;
    }
    //
    // Synthetic Nodes (used by checker)
    //
    // @api
    function createSyntheticExpression(type, isSpread = false, tupleNameSource) {
        const node = createBaseNode(SyntaxKind.SyntheticExpression);
        node.type = type;
        node.isSpread = isSpread;
        node.tupleNameSource = tupleNameSource;
        return node;
    }
    // @api
    function createSyntaxList(children) {
        const node = createBaseNode(SyntaxKind.SyntaxList);
        node._children = children;
        return node;
    }
    //
    // Transformation nodes
    //
    /**
     * Creates a synthetic statement to act as a placeholder for a not-emitted statement in
     * order to preserve comments.
     *
     * @param original The original statement.
     */
    // @api
    function createNotEmittedStatement(original) {
        const node = createBaseNode(SyntaxKind.NotEmittedStatement);
        node.original = original;
        setTextRange(node, original);
        return node;
    }
    /**
     * Creates a synthetic expression to act as a placeholder for a not-emitted expression in
     * order to preserve comments or sourcemap positions.
     *
     * @param expression The inner expression to emit.
     * @param original The original outer expression.
     */
    // @api
    function createPartiallyEmittedExpression(expression, original) {
        const node = createBaseNode(SyntaxKind.PartiallyEmittedExpression);
        node.expression = expression;
        node.original = original;
        node.transformFlags |= propagateChildFlags(node.expression) |
            TransformFlags.ContainsTypeScript;
        setTextRange(node, original);
        return node;
    }
    // @api
    function updatePartiallyEmittedExpression(node, expression) {
        return node.expression !== expression
            ? update(createPartiallyEmittedExpression(expression, node.original), node)
            : node;
    }
    // @api
    function createNotEmittedTypeElement() {
        return createBaseNode(SyntaxKind.NotEmittedTypeElement);
    }
    function flattenCommaElements(node) {
        if (nodeIsSynthesized(node) && !isParseTreeNode(node) && !node.original && !node.emitNode && !node.id) {
            if (isCommaListExpression(node)) {
                return node.elements;
            }
            if (isBinaryExpression(node) && isCommaToken(node.operatorToken)) {
                return [node.left, node.right];
            }
        }
        return node;
    }
    // @api
    function createCommaListExpression(elements) {
        const node = createBaseNode(SyntaxKind.CommaListExpression);
        node.elements = createNodeArray(sameFlatMap(elements, flattenCommaElements));
        node.transformFlags |= propagateChildrenFlags(node.elements);
        return node;
    }
    // @api
    function updateCommaListExpression(node, elements) {
        return node.elements !== elements
            ? update(createCommaListExpression(elements), node)
            : node;
    }
    // @api
    function createSyntheticReferenceExpression(expression, thisArg) {
        const node = createBaseNode(SyntaxKind.SyntheticReferenceExpression);
        node.expression = expression;
        node.thisArg = thisArg;
        node.transformFlags |= propagateChildFlags(node.expression) |
            propagateChildFlags(node.thisArg);
        return node;
    }
    // @api
    function updateSyntheticReferenceExpression(node, expression, thisArg) {
        return node.expression !== expression
            || node.thisArg !== thisArg
            ? update(createSyntheticReferenceExpression(expression, thisArg), node)
            : node;
    }
    function cloneGeneratedIdentifier(node) {
        const clone = createBaseIdentifier(node.escapedText);
        clone.flags |= node.flags & ~NodeFlags.Synthesized;
        clone.transformFlags = node.transformFlags;
        setOriginal(clone, node);
        setIdentifierAutoGenerate(clone, Object.assign({}, node.emitNode.autoGenerate));
        return clone;
    }
    function cloneIdentifier(node) {
        const clone = createBaseIdentifier(node.escapedText);
        clone.flags |= node.flags & ~NodeFlags.Synthesized;
        clone.jsDoc = node.jsDoc;
        clone.flowNode = node.flowNode;
        clone.symbol = node.symbol;
        clone.transformFlags = node.transformFlags;
        setOriginal(clone, node);
        // clone type arguments for emitter/typeWriter
        const typeArguments = getIdentifierTypeArguments(node);
        if (typeArguments)
            setIdentifierTypeArguments(clone, typeArguments);
        return clone;
    }
    function cloneGeneratedPrivateIdentifier(node) {
        const clone = createBasePrivateIdentifier(node.escapedText);
        clone.flags |= node.flags & ~NodeFlags.Synthesized;
        clone.transformFlags = node.transformFlags;
        setOriginal(clone, node);
        setIdentifierAutoGenerate(clone, Object.assign({}, node.emitNode.autoGenerate));
        return clone;
    }
    function clonePrivateIdentifier(node) {
        const clone = createBasePrivateIdentifier(node.escapedText);
        clone.flags |= node.flags & ~NodeFlags.Synthesized;
        clone.transformFlags = node.transformFlags;
        setOriginal(clone, node);
        return clone;
    }
    function cloneNode(node) {
        // We don't use "clone" from core.ts here, as we need to preserve the prototype chain of
        // the original node. We also need to exclude specific properties and only include own-
        // properties (to skip members already defined on the shared prototype).
        if (node === undefined) {
            return node;
        }
        if (isSourceFile(node)) {
            return cloneSourceFile(node);
        }
        if (isGeneratedIdentifier(node)) {
            return cloneGeneratedIdentifier(node);
        }
        if (isIdentifier(node)) {
            return cloneIdentifier(node);
        }
        if (isGeneratedPrivateIdentifier(node)) {
            return cloneGeneratedPrivateIdentifier(node);
        }
        if (isPrivateIdentifier(node)) {
            return clonePrivateIdentifier(node);
        }
        const clone = !isNodeKind(node.kind) ? baseFactory.createBaseTokenNode(node.kind) :
            baseFactory.createBaseNode(node.kind);
        clone.flags |= node.flags & ~NodeFlags.Synthesized;
        clone.transformFlags = node.transformFlags;
        setOriginal(clone, node);
        for (const key in node) {
            if (hasProperty(clone, key) || !hasProperty(node, key)) {
                continue;
            }
            clone[key] = node[key];
        }
        return clone;
    }
    function createImmediatelyInvokedFunctionExpression(statements, param, paramValue) {
        return createCallExpression(createFunctionExpression(
        /*modifiers*/ undefined, 
        /*asteriskToken*/ undefined, 
        /*name*/ undefined, 
        /*typeParameters*/ undefined, 
        /*parameters*/ param ? [param] : [], 
        /*type*/ undefined, createBlock(statements, /*multiLine*/ true)), 
        /*typeArguments*/ undefined, 
        /*argumentsArray*/ paramValue ? [paramValue] : []);
    }
    function createImmediatelyInvokedArrowFunction(statements, param, paramValue) {
        return createCallExpression(createArrowFunction(
        /*modifiers*/ undefined, 
        /*typeParameters*/ undefined, 
        /*parameters*/ param ? [param] : [], 
        /*type*/ undefined, 
        /*equalsGreaterThanToken*/ undefined, createBlock(statements, /*multiLine*/ true)), 
        /*typeArguments*/ undefined, 
        /*argumentsArray*/ paramValue ? [paramValue] : []);
    }
    function createVoidZero() {
        return createVoidExpression(createNumericLiteral("0"));
    }
    function createExportDefault(expression) {
        return createExportAssignment(
        /*modifiers*/ undefined, 
        /*isExportEquals*/ false, expression);
    }
    function createExternalModuleExport(exportName) {
        return createExportDeclaration(
        /*modifiers*/ undefined, 
        /*isTypeOnly*/ false, createNamedExports([
            createExportSpecifier(/*isTypeOnly*/ false, /*propertyName*/ undefined, exportName),
        ]));
    }
    //
    // Utilities
    //
    function createTypeCheck(value, tag) {
        return tag === "null" ? factory.createStrictEquality(value, createNull()) :
            tag === "undefined" ? factory.createStrictEquality(value, createVoidZero()) :
                factory.createStrictEquality(createTypeOfExpression(value), createStringLiteral(tag));
    }
    function createIsNotTypeCheck(value, tag) {
        return tag === "null" ? factory.createStrictInequality(value, createNull()) :
            tag === "undefined" ? factory.createStrictInequality(value, createVoidZero()) :
                factory.createStrictInequality(createTypeOfExpression(value), createStringLiteral(tag));
    }
    function createMethodCall(object, methodName, argumentsList) {
        // Preserve the optionality of `object`.
        if (isCallChain(object)) {
            return createCallChain(createPropertyAccessChain(object, /*questionDotToken*/ undefined, methodName), 
            /*questionDotToken*/ undefined, 
            /*typeArguments*/ undefined, argumentsList);
        }
        return createCallExpression(createPropertyAccessExpression(object, methodName), 
        /*typeArguments*/ undefined, argumentsList);
    }
    function createFunctionBindCall(target, thisArg, argumentsList) {
        return createMethodCall(target, "bind", [thisArg, ...argumentsList]);
    }
    function createFunctionCallCall(target, thisArg, argumentsList) {
        return createMethodCall(target, "call", [thisArg, ...argumentsList]);
    }
    function createFunctionApplyCall(target, thisArg, argumentsExpression) {
        return createMethodCall(target, "apply", [thisArg, argumentsExpression]);
    }
    function createGlobalMethodCall(globalObjectName, methodName, argumentsList) {
        return createMethodCall(createIdentifier(globalObjectName), methodName, argumentsList);
    }
    function createArraySliceCall(array, start) {
        return createMethodCall(array, "slice", start === undefined ? [] : [asExpression(start)]);
    }
    function createArrayConcatCall(array, argumentsList) {
        return createMethodCall(array, "concat", argumentsList);
    }
    function createObjectDefinePropertyCall(target, propertyName, attributes) {
        return createGlobalMethodCall("Object", "defineProperty", [target, asExpression(propertyName), attributes]);
    }
    function createObjectGetOwnPropertyDescriptorCall(target, propertyName) {
        return createGlobalMethodCall("Object", "getOwnPropertyDescriptor", [target, asExpression(propertyName)]);
    }
    function createReflectGetCall(target, propertyKey, receiver) {
        return createGlobalMethodCall("Reflect", "get", receiver ? [target, propertyKey, receiver] : [target, propertyKey]);
    }
    function createReflectSetCall(target, propertyKey, value, receiver) {
        return createGlobalMethodCall("Reflect", "set", receiver ? [target, propertyKey, value, receiver] : [target, propertyKey, value]);
    }
    function tryAddPropertyAssignment(properties, propertyName, expression) {
        if (expression) {
            properties.push(createPropertyAssignment(propertyName, expression));
            return true;
        }
        return false;
    }
    function createPropertyDescriptor(attributes, singleLine) {
        const properties = [];
        tryAddPropertyAssignment(properties, "enumerable", asExpression(attributes.enumerable));
        tryAddPropertyAssignment(properties, "configurable", asExpression(attributes.configurable));
        let isData = tryAddPropertyAssignment(properties, "writable", asExpression(attributes.writable));
        isData = tryAddPropertyAssignment(properties, "value", attributes.value) || isData;
        let isAccessor = tryAddPropertyAssignment(properties, "get", attributes.get);
        isAccessor = tryAddPropertyAssignment(properties, "set", attributes.set) || isAccessor;
        Debug.assert(!(isData && isAccessor), "A PropertyDescriptor may not be both an accessor descriptor and a data descriptor.");
        return createObjectLiteralExpression(properties, !singleLine);
    }
    function updateOuterExpression(outerExpression, expression) {
        switch (outerExpression.kind) {
            case SyntaxKind.ParenthesizedExpression:
                return updateParenthesizedExpression(outerExpression, expression);
            case SyntaxKind.TypeAssertionExpression:
                return updateTypeAssertion(outerExpression, outerExpression.type, expression);
            case SyntaxKind.AsExpression:
                return updateAsExpression(outerExpression, expression, outerExpression.type);
            case SyntaxKind.SatisfiesExpression:
                return updateSatisfiesExpression(outerExpression, expression, outerExpression.type);
            case SyntaxKind.NonNullExpression:
                return updateNonNullExpression(outerExpression, expression);
            case SyntaxKind.ExpressionWithTypeArguments:
                return updateExpressionWithTypeArguments(outerExpression, expression, outerExpression.typeArguments);
            case SyntaxKind.PartiallyEmittedExpression:
                return updatePartiallyEmittedExpression(outerExpression, expression);
        }
    }
    /**
     * Determines whether a node is a parenthesized expression that can be ignored when recreating outer expressions.
     *
     * A parenthesized expression can be ignored when all of the following are true:
     *
     * - It's `pos` and `end` are not -1
     * - It does not have a custom source map range
     * - It does not have a custom comment range
     * - It does not have synthetic leading or trailing comments
     *
     * If an outermost parenthesized expression is ignored, but the containing expression requires a parentheses around
     * the expression to maintain precedence, a new parenthesized expression should be created automatically when
     * the containing expression is created/updated.
     */
    function isIgnorableParen(node) {
        return isParenthesizedExpression(node)
            && nodeIsSynthesized(node)
            && nodeIsSynthesized(getSourceMapRange(node))
            && nodeIsSynthesized(getCommentRange(node))
            && !some(getSyntheticLeadingComments(node))
            && !some(getSyntheticTrailingComments(node));
    }
    function restoreOuterExpressions(outerExpression, innerExpression, kinds = OuterExpressionKinds.All) {
        if (outerExpression && isOuterExpression(outerExpression, kinds) && !isIgnorableParen(outerExpression)) {
            return updateOuterExpression(outerExpression, restoreOuterExpressions(outerExpression.expression, innerExpression));
        }
        return innerExpression;
    }
    function restoreEnclosingLabel(node, outermostLabeledStatement, afterRestoreLabelCallback) {
        if (!outermostLabeledStatement) {
            return node;
        }
        const updated = updateLabeledStatement(outermostLabeledStatement, outermostLabeledStatement.label, isLabeledStatement(outermostLabeledStatement.statement)
            ? restoreEnclosingLabel(node, outermostLabeledStatement.statement)
            : node);
        if (afterRestoreLabelCallback) {
            afterRestoreLabelCallback(outermostLabeledStatement);
        }
        return updated;
    }
    function shouldBeCapturedInTempVariable(node, cacheIdentifiers) {
        const target = skipParentheses(node);
        switch (target.kind) {
            case SyntaxKind.Identifier:
                return cacheIdentifiers;
            case SyntaxKind.ThisKeyword:
            case SyntaxKind.NumericLiteral:
            case SyntaxKind.BigIntLiteral:
            case SyntaxKind.StringLiteral:
                return false;
            case SyntaxKind.ArrayLiteralExpression:
                const elements = target.elements;
                if (elements.length === 0) {
                    return false;
                }
                return true;
            case SyntaxKind.ObjectLiteralExpression:
                return target.properties.length > 0;
            default:
                return true;
        }
    }
    function createCallBinding(expression, recordTempVariable, languageVersion, cacheIdentifiers = false) {
        const callee = skipOuterExpressions(expression, OuterExpressionKinds.All);
        let thisArg;
        let target;
        if (isSuperProperty(callee)) {
            thisArg = createThis();
            target = callee;
        }
        else if (isSuperKeyword(callee)) {
            thisArg = createThis();
            target = languageVersion !== undefined && languageVersion < ScriptTarget.ES2015
                ? setTextRange(createIdentifier("_super"), callee)
                : callee;
        }
        else if (getEmitFlags(callee) & EmitFlags.HelperName) {
            thisArg = createVoidZero();
            target = parenthesizerRules().parenthesizeLeftSideOfAccess(callee, /*optionalChain*/ false);
        }
        else if (isPropertyAccessExpression(callee)) {
            if (shouldBeCapturedInTempVariable(callee.expression, cacheIdentifiers)) {
                // for `a.b()` target is `(_a = a).b` and thisArg is `_a`
                thisArg = createTempVariable(recordTempVariable);
                target = createPropertyAccessExpression(setTextRange(factory.createAssignment(thisArg, callee.expression), callee.expression), callee.name);
                setTextRange(target, callee);
            }
            else {
                thisArg = callee.expression;
                target = callee;
            }
        }
        else if (isElementAccessExpression(callee)) {
            if (shouldBeCapturedInTempVariable(callee.expression, cacheIdentifiers)) {
                // for `a[b]()` target is `(_a = a)[b]` and thisArg is `_a`
                thisArg = createTempVariable(recordTempVariable);
                target = createElementAccessExpression(setTextRange(factory.createAssignment(thisArg, callee.expression), callee.expression), callee.argumentExpression);
                setTextRange(target, callee);
            }
            else {
                thisArg = callee.expression;
                target = callee;
            }
        }
        else {
            // for `a()` target is `a` and thisArg is `void 0`
            thisArg = createVoidZero();
            target = parenthesizerRules().parenthesizeLeftSideOfAccess(expression, /*optionalChain*/ false);
        }
        return { target, thisArg };
    }
    function createAssignmentTargetWrapper(paramName, expression) {
        return createPropertyAccessExpression(
        // Explicit parens required because of v8 regression (https://bugs.chromium.org/p/v8/issues/detail?id=9560)
        createParenthesizedExpression(createObjectLiteralExpression([
            createSetAccessorDeclaration(
            /*modifiers*/ undefined, "value", [createParameterDeclaration(
                /*modifiers*/ undefined, 
                /*dotDotDotToken*/ undefined, paramName, 
                /*questionToken*/ undefined, 
                /*type*/ undefined, 
                /*initializer*/ undefined)], createBlock([
                createExpressionStatement(expression),
            ])),
        ])), "value");
    }
    function inlineExpressions(expressions) {
        // Avoid deeply nested comma expressions as traversing them during emit can result in "Maximum call
        // stack size exceeded" errors.
        return expressions.length > 10
            ? createCommaListExpression(expressions)
            : reduceLeft(expressions, factory.createComma);
    }
    function getName(node, allowComments, allowSourceMaps, emitFlags = 0, ignoreAssignedName) {
        const nodeName = ignoreAssignedName ? node && getNonAssignedNameOfDeclaration(node) : getNameOfDeclaration(node);
        if (nodeName && isIdentifier(nodeName) && !isGeneratedIdentifier(nodeName)) {
            // TODO(rbuckton): Does this need to be parented?
            const name = setParent(setTextRange(cloneNode(nodeName), nodeName), nodeName.parent);
            emitFlags |= getEmitFlags(nodeName);
            if (!allowSourceMaps)
                emitFlags |= EmitFlags.NoSourceMap;
            if (!allowComments)
                emitFlags |= EmitFlags.NoComments;
            if (emitFlags)
                setEmitFlags(name, emitFlags);
            return name;
        }
        return getGeneratedNameForNode(node);
    }
    /**
     * Gets the internal name of a declaration. This is primarily used for declarations that can be
     * referred to by name in the body of an ES5 class function body. An internal name will *never*
     * be prefixed with an module or namespace export modifier like "exports." when emitted as an
     * expression. An internal name will also *never* be renamed due to a collision with a block
     * scoped variable.
     *
     * @param node The declaration.
     * @param allowComments A value indicating whether comments may be emitted for the name.
     * @param allowSourceMaps A value indicating whether source maps may be emitted for the name.
     */
    function getInternalName(node, allowComments, allowSourceMaps) {
        return getName(node, allowComments, allowSourceMaps, EmitFlags.LocalName | EmitFlags.InternalName);
    }
    /**
     * Gets the local name of a declaration. This is primarily used for declarations that can be
     * referred to by name in the declaration's immediate scope (classes, enums, namespaces). A
     * local name will *never* be prefixed with an module or namespace export modifier like
     * "exports." when emitted as an expression.
     *
     * @param node The declaration.
     * @param allowComments A value indicating whether comments may be emitted for the name.
     * @param allowSourceMaps A value indicating whether source maps may be emitted for the name.
     * @param ignoreAssignedName Indicates that the assigned name of a declaration shouldn't be considered.
     */
    function getLocalName(node, allowComments, allowSourceMaps, ignoreAssignedName) {
        return getName(node, allowComments, allowSourceMaps, EmitFlags.LocalName, ignoreAssignedName);
    }
    /**
     * Gets the export name of a declaration. This is primarily used for declarations that can be
     * referred to by name in the declaration's immediate scope (classes, enums, namespaces). An
     * export name will *always* be prefixed with an module or namespace export modifier like
     * `"exports."` when emitted as an expression if the name points to an exported symbol.
     *
     * @param node The declaration.
     * @param allowComments A value indicating whether comments may be emitted for the name.
     * @param allowSourceMaps A value indicating whether source maps may be emitted for the name.
     */
    function getExportName(node, allowComments, allowSourceMaps) {
        return getName(node, allowComments, allowSourceMaps, EmitFlags.ExportName);
    }
    /**
     * Gets the name of a declaration for use in declarations.
     *
     * @param node The declaration.
     * @param allowComments A value indicating whether comments may be emitted for the name.
     * @param allowSourceMaps A value indicating whether source maps may be emitted for the name.
     */
    function getDeclarationName(node, allowComments, allowSourceMaps) {
        return getName(node, allowComments, allowSourceMaps);
    }
    /**
     * Gets a namespace-qualified name for use in expressions.
     *
     * @param ns The namespace identifier.
     * @param name The name.
     * @param allowComments A value indicating whether comments may be emitted for the name.
     * @param allowSourceMaps A value indicating whether source maps may be emitted for the name.
     */
    function getNamespaceMemberName(ns, name, allowComments, allowSourceMaps) {
        const qualifiedName = createPropertyAccessExpression(ns, nodeIsSynthesized(name) ? name : cloneNode(name));
        setTextRange(qualifiedName, name);
        let emitFlags = 0;
        if (!allowSourceMaps)
            emitFlags |= EmitFlags.NoSourceMap;
        if (!allowComments)
            emitFlags |= EmitFlags.NoComments;
        if (emitFlags)
            setEmitFlags(qualifiedName, emitFlags);
        return qualifiedName;
    }
    /**
     * Gets the exported name of a declaration for use in expressions.
     *
     * An exported name will *always* be prefixed with an module or namespace export modifier like
     * "exports." if the name points to an exported symbol.
     *
     * @param ns The namespace identifier.
     * @param node The declaration.
     * @param allowComments A value indicating whether comments may be emitted for the name.
     * @param allowSourceMaps A value indicating whether source maps may be emitted for the name.
     */
    function getExternalModuleOrNamespaceExportName(ns, node, allowComments, allowSourceMaps) {
        if (ns && hasSyntacticModifier(node, ModifierFlags.Export)) {
            return getNamespaceMemberName(ns, getName(node), allowComments, allowSourceMaps);
        }
        return getExportName(node, allowComments, allowSourceMaps);
    }
    /**
     * Copies any necessary standard and custom prologue-directives into target array.
     * @param source origin statements array
     * @param target result statements array
     * @param ensureUseStrict boolean determining whether the function need to add prologue-directives
     * @param visitor Optional callback used to visit any custom prologue directives.
     */
    function copyPrologue(source, target, ensureUseStrict, visitor) {
        const offset = copyStandardPrologue(source, target, 0, ensureUseStrict);
        return copyCustomPrologue(source, target, offset, visitor);
    }
    function isUseStrictPrologue(node) {
        return isStringLiteral(node.expression) && node.expression.text === "use strict";
    }
    function createUseStrictPrologue() {
        return startOnNewLine(createExpressionStatement(createStringLiteral("use strict")));
    }
    /**
     * Copies only the standard (string-expression) prologue-directives into the target statement-array.
     * @param source origin statements array
     * @param target result statements array
     * @param statementOffset The offset at which to begin the copy.
     * @param ensureUseStrict boolean determining whether the function need to add prologue-directives
     * @returns Count of how many directive statements were copied.
     */
    function copyStandardPrologue(source, target, statementOffset = 0, ensureUseStrict) {
        Debug.assert(target.length === 0, "Prologue directives should be at the first statement in the target statements array");
        let foundUseStrict = false;
        const numStatements = source.length;
        while (statementOffset < numStatements) {
            const statement = source[statementOffset];
            if (isPrologueDirective(statement)) {
                if (isUseStrictPrologue(statement)) {
                    foundUseStrict = true;
                }
                target.push(statement);
            }
            else {
                break;
            }
            statementOffset++;
        }
        if (ensureUseStrict && !foundUseStrict) {
            target.push(createUseStrictPrologue());
        }
        return statementOffset;
    }
    function copyCustomPrologue(source, target, statementOffset, visitor, filter = returnTrue) {
        const numStatements = source.length;
        while (statementOffset !== undefined && statementOffset < numStatements) {
            const statement = source[statementOffset];
            if (getEmitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) {
                append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
            }
            else {
                break;
            }
            statementOffset++;
        }
        return statementOffset;
    }
    /**
     * Ensures "use strict" directive is added
     *
     * @param statements An array of statements
     */
    function ensureUseStrict(statements) {
        const foundUseStrict = findUseStrictPrologue(statements);
        if (!foundUseStrict) {
            return setTextRange(createNodeArray([createUseStrictPrologue(), ...statements]), statements);
        }
        return statements;
    }
    /**
     * Lifts a NodeArray containing only Statement nodes to a block.
     *
     * @param nodes The NodeArray.
     */
    function liftToBlock(nodes) {
        Debug.assert(every(nodes, isStatementOrBlock), "Cannot lift nodes to a Block.");
        return singleOrUndefined(nodes) || createBlock(nodes);
    }
    function findSpanEnd(array, test, start) {
        let i = start;
        while (i < array.length && test(array[i])) {
            i++;
        }
        return i;
    }
    function mergeLexicalEnvironment(statements, declarations) {
        if (!some(declarations)) {
            return statements;
        }
        // When we merge new lexical statements into an existing statement list, we merge them in the following manner:
        //
        // Given:
        //
        // | Left                               | Right                               |
        // |------------------------------------|-------------------------------------|
        // | [standard prologues (left)]        | [standard prologues (right)]        |
        // | [hoisted functions (left)]         | [hoisted functions (right)]         |
        // | [hoisted variables (left)]         | [hoisted variables (right)]         |
        // | [lexical init statements (left)]   | [lexical init statements (right)]   |
        // | [other statements (left)]          |                                     |
        //
        // The resulting statement list will be:
        //
        // | Result                              |
        // |-------------------------------------|
        // | [standard prologues (right)]        |
        // | [standard prologues (left)]         |
        // | [hoisted functions (right)]         |
        // | [hoisted functions (left)]          |
        // | [hoisted variables (right)]         |
        // | [hoisted variables (left)]          |
        // | [lexical init statements (right)]   |
        // | [lexical init statements (left)]    |
        // | [other statements (left)]           |
        //
        // NOTE: It is expected that new lexical init statements must be evaluated before existing lexical init statements,
        // as the prior transformation may depend on the evaluation of the lexical init statements to be in the correct state.
        // find standard prologues on left in the following order: standard directives, hoisted functions, hoisted variables, other custom
        const leftStandardPrologueEnd = findSpanEnd(statements, isPrologueDirective, 0);
        const leftHoistedFunctionsEnd = findSpanEnd(statements, isHoistedFunction, leftStandardPrologueEnd);
        const leftHoistedVariablesEnd = findSpanEnd(statements, isHoistedVariableStatement, leftHoistedFunctionsEnd);
        // find standard prologues on right in the following order: standard directives, hoisted functions, hoisted variables, other custom
        const rightStandardPrologueEnd = findSpanEnd(declarations, isPrologueDirective, 0);
        const rightHoistedFunctionsEnd = findSpanEnd(declarations, isHoistedFunction, rightStandardPrologueEnd);
        const rightHoistedVariablesEnd = findSpanEnd(declarations, isHoistedVariableStatement, rightHoistedFunctionsEnd);
        const rightCustomPrologueEnd = findSpanEnd(declarations, isCustomPrologue, rightHoistedVariablesEnd);
        Debug.assert(rightCustomPrologueEnd === declarations.length, "Expected declarations to be valid standard or custom prologues");
        // splice prologues from the right into the left. We do this in reverse order
        // so that we don't need to recompute the index on the left when we insert items.
        const left = isNodeArray(statements) ? statements.slice() : statements;
        // splice other custom prologues from right into left
        if (rightCustomPrologueEnd > rightHoistedVariablesEnd) {
            left.splice(leftHoistedVariablesEnd, 0, ...declarations.slice(rightHoistedVariablesEnd, rightCustomPrologueEnd));
        }
        // splice hoisted variables from right into left
        if (rightHoistedVariablesEnd > rightHoistedFunctionsEnd) {
            left.splice(leftHoistedFunctionsEnd, 0, ...declarations.slice(rightHoistedFunctionsEnd, rightHoistedVariablesEnd));
        }
        // splice hoisted functions from right into left
        if (rightHoistedFunctionsEnd > rightStandardPrologueEnd) {
            left.splice(leftStandardPrologueEnd, 0, ...declarations.slice(rightStandardPrologueEnd, rightHoistedFunctionsEnd));
        }
        // splice standard prologues from right into left (that are not already in left)
        if (rightStandardPrologueEnd > 0) {
            if (leftStandardPrologueEnd === 0) {
                left.splice(0, 0, ...declarations.slice(0, rightStandardPrologueEnd));
            }
            else {
                const leftPrologues = new Map();
                for (let i = 0; i < leftStandardPrologueEnd; i++) {
                    const leftPrologue = statements[i];
                    leftPrologues.set(leftPrologue.expression.text, true);
                }
                for (let i = rightStandardPrologueEnd - 1; i >= 0; i--) {
                    const rightPrologue = declarations[i];
                    if (!leftPrologues.has(rightPrologue.expression.text)) {
                        left.unshift(rightPrologue);
                    }
                }
            }
        }
        if (isNodeArray(statements)) {
            return setTextRange(createNodeArray(left, statements.hasTrailingComma), statements);
        }
        return statements;
    }
    function replaceModifiers(node, modifiers) {
        var _a;
        let modifierArray;
        if (typeof modifiers === "number") {
            modifierArray = createModifiersFromModifierFlags(modifiers);
        }
        else {
            modifierArray = modifiers;
        }
        return isTypeParameterDeclaration(node) ? updateTypeParameterDeclaration(node, modifierArray, node.name, node.constraint, node.default) :
            isParameter(node) ? updateParameterDeclaration(node, modifierArray, node.dotDotDotToken, node.name, node.questionToken, node.type, node.initializer) :
                isConstructorTypeNode(node) ? updateConstructorTypeNode1(node, modifierArray, node.typeParameters, node.parameters, node.type) :
                    isPropertySignature(node) ? updatePropertySignature(node, modifierArray, node.name, node.questionToken, node.type) :
                        isPropertyDeclaration(node) ? updatePropertyDeclaration(node, modifierArray, node.name, (_a = node.questionToken) !== null && _a !== void 0 ? _a : node.exclamationToken, node.type, node.initializer) :
                            isMethodSignature(node) ? updateMethodSignature(node, modifierArray, node.name, node.questionToken, node.typeParameters, node.parameters, node.type) :
                                isMethodDeclaration(node) ? updateMethodDeclaration(node, modifierArray, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type, node.body) :
                                    isConstructorDeclaration(node) ? updateConstructorDeclaration(node, modifierArray, node.parameters, node.body) :
                                        isGetAccessorDeclaration(node) ? updateGetAccessorDeclaration(node, modifierArray, node.name, node.parameters, node.type, node.body) :
                                            isSetAccessorDeclaration(node) ? updateSetAccessorDeclaration(node, modifierArray, node.name, node.parameters, node.body) :
                                                isIndexSignatureDeclaration(node) ? updateIndexSignature(node, modifierArray, node.parameters, node.type) :
                                                    isFunctionExpression(node) ? updateFunctionExpression(node, modifierArray, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body) :
                                                        isArrowFunction(node) ? updateArrowFunction(node, modifierArray, node.typeParameters, node.parameters, node.type, node.equalsGreaterThanToken, node.body) :
                                                            isClassExpression(node) ? updateClassExpression(node, modifierArray, node.name, node.typeParameters, node.heritageClauses, node.members) :
                                                                isVariableStatement(node) ? updateVariableStatement(node, modifierArray, node.declarationList) :
                                                                    isFunctionDeclaration(node) ? updateFunctionDeclaration(node, modifierArray, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body) :
                                                                        isClassDeclaration(node) ? updateClassDeclaration(node, modifierArray, node.name, node.typeParameters, node.heritageClauses, node.members) :
                                                                            isInterfaceDeclaration(node) ? updateInterfaceDeclaration(node, modifierArray, node.name, node.typeParameters, node.heritageClauses, node.members) :
                                                                                isTypeAliasDeclaration(node) ? updateTypeAliasDeclaration(node, modifierArray, node.name, node.typeParameters, node.type) :
                                                                                    isEnumDeclaration(node) ? updateEnumDeclaration(node, modifierArray, node.name, node.members) :
                                                                                        isModuleDeclaration(node) ? updateModuleDeclaration(node, modifierArray, node.name, node.body) :
                                                                                            isImportEqualsDeclaration(node) ? updateImportEqualsDeclaration(node, modifierArray, node.isTypeOnly, node.name, node.moduleReference) :
                                                                                                isImportDeclaration(node) ? updateImportDeclaration(node, modifierArray, node.importClause, node.moduleSpecifier, node.attributes) :
                                                                                                    isExportAssignment(node) ? updateExportAssignment(node, modifierArray, node.expression) :
                                                                                                        isExportDeclaration(node) ? updateExportDeclaration(node, modifierArray, node.isTypeOnly, node.exportClause, node.moduleSpecifier, node.attributes) :
                                                                                                            Debug.assertNever(node);
    }
    function replaceDecoratorsAndModifiers(node, modifierArray) {
        var _a;
        return isParameter(node) ? updateParameterDeclaration(node, modifierArray, node.dotDotDotToken, node.name, node.questionToken, node.type, node.initializer) :
            isPropertyDeclaration(node) ? updatePropertyDeclaration(node, modifierArray, node.name, (_a = node.questionToken) !== null && _a !== void 0 ? _a : node.exclamationToken, node.type, node.initializer) :
                isMethodDeclaration(node) ? updateMethodDeclaration(node, modifierArray, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type, node.body) :
                    isGetAccessorDeclaration(node) ? updateGetAccessorDeclaration(node, modifierArray, node.name, node.parameters, node.type, node.body) :
                        isSetAccessorDeclaration(node) ? updateSetAccessorDeclaration(node, modifierArray, node.name, node.parameters, node.body) :
                            isClassExpression(node) ? updateClassExpression(node, modifierArray, node.name, node.typeParameters, node.heritageClauses, node.members) :
                                isClassDeclaration(node) ? updateClassDeclaration(node, modifierArray, node.name, node.typeParameters, node.heritageClauses, node.members) :
                                    Debug.assertNever(node);
    }
    function replacePropertyName(node, name) {
        var _a;
        switch (node.kind) {
            case SyntaxKind.GetAccessor:
                return updateGetAccessorDeclaration(node, node.modifiers, name, node.parameters, node.type, node.body);
            case SyntaxKind.SetAccessor:
                return updateSetAccessorDeclaration(node, node.modifiers, name, node.parameters, node.body);
            case SyntaxKind.MethodDeclaration:
                return updateMethodDeclaration(node, node.modifiers, node.asteriskToken, name, node.questionToken, node.typeParameters, node.parameters, node.type, node.body);
            case SyntaxKind.MethodSignature:
                return updateMethodSignature(node, node.modifiers, name, node.questionToken, node.typeParameters, node.parameters, node.type);
            case SyntaxKind.PropertyDeclaration:
                return updatePropertyDeclaration(node, node.modifiers, name, (_a = node.questionToken) !== null && _a !== void 0 ? _a : node.exclamationToken, node.type, node.initializer);
            case SyntaxKind.PropertySignature:
                return updatePropertySignature(node, node.modifiers, name, node.questionToken, node.type);
            case SyntaxKind.PropertyAssignment:
                return updatePropertyAssignment(node, name, node.initializer);
        }
    }
    function asNodeArray(array) {
        return array ? createNodeArray(array) : undefined;
    }
    function asName(name) {
        return typeof name === "string" ? createIdentifier(name) :
            name;
    }
    function asExpression(value) {
        return typeof value === "string" ? createStringLiteral(value) :
            typeof value === "number" ? createNumericLiteral(value) :
                typeof value === "boolean" ? value ? createTrue() : createFalse() :
                    value;
    }
    function asInitializer(node) {
        return node && parenthesizerRules().parenthesizeExpressionForDisallowedComma(node);
    }
    function asToken(value) {
        return typeof value === "number" ? createToken(value) : value;
    }
    function asEmbeddedStatement(statement) {
        return statement && isNotEmittedStatement(statement) ? setTextRange(setOriginal(createEmptyStatement(), statement), statement) : statement;
    }
    function asVariableDeclaration(variableDeclaration) {
        if (typeof variableDeclaration === "string" || variableDeclaration && !isVariableDeclaration(variableDeclaration)) {
            return createVariableDeclaration(variableDeclaration, 
            /*exclamationToken*/ undefined, 
            /*type*/ undefined, 
            /*initializer*/ undefined);
        }
        return variableDeclaration;
    }
    function update(updated, original) {
        if (updated !== original) {
            setOriginal(updated, original);
            setTextRange(updated, original);
        }
        return updated;
    }
}
function getDefaultTagNameForKind(kind) {
    switch (kind) {
        case SyntaxKind.JSDocTypeTag:
            return "type";
        case SyntaxKind.JSDocReturnTag:
            return "returns";
        case SyntaxKind.JSDocThisTag:
            return "this";
        case SyntaxKind.JSDocEnumTag:
            return "enum";
        case SyntaxKind.JSDocAuthorTag:
            return "author";
        case SyntaxKind.JSDocClassTag:
            return "class";
        case SyntaxKind.JSDocPublicTag:
            return "public";
        case SyntaxKind.JSDocPrivateTag:
            return "private";
        case SyntaxKind.JSDocProtectedTag:
            return "protected";
        case SyntaxKind.JSDocReadonlyTag:
            return "readonly";
        case SyntaxKind.JSDocOverrideTag:
            return "override";
        case SyntaxKind.JSDocTemplateTag:
            return "template";
        case SyntaxKind.JSDocTypedefTag:
            return "typedef";
        case SyntaxKind.JSDocParameterTag:
            return "param";
        case SyntaxKind.JSDocPropertyTag:
            return "prop";
        case SyntaxKind.JSDocCallbackTag:
            return "callback";
        case SyntaxKind.JSDocOverloadTag:
            return "overload";
        case SyntaxKind.JSDocAugmentsTag:
            return "augments";
        case SyntaxKind.JSDocImplementsTag:
            return "implements";
        case SyntaxKind.JSDocImportTag:
            return "import";
        default:
            return Debug.fail(`Unsupported kind: ${Debug.formatSyntaxKind(kind)}`);
    }
}
let rawTextScanner;
const invalidValueSentinel = {};
function getCookedText(kind, rawText) {
    if (!rawTextScanner) {
        rawTextScanner = createScanner(ScriptTarget.Latest, /*skipTrivia*/ false, LanguageVariant.Standard);
    }
    switch (kind) {
        case SyntaxKind.NoSubstitutionTemplateLiteral:
            rawTextScanner.setText("`" + rawText + "`");
            break;
        case SyntaxKind.TemplateHead:
            rawTextScanner.setText("`" + rawText + "${");
            break;
        case SyntaxKind.TemplateMiddle:
            rawTextScanner.setText("}" + rawText + "${");
            break;
        case SyntaxKind.TemplateTail:
            rawTextScanner.setText("}" + rawText + "`");
            break;
    }
    let token = rawTextScanner.scan();
    if (token === SyntaxKind.CloseBraceToken) {
        token = rawTextScanner.reScanTemplateToken(/*isTaggedTemplate*/ false);
    }
    if (rawTextScanner.isUnterminated()) {
        rawTextScanner.setText(undefined);
        return invalidValueSentinel;
    }
    let tokenValue;
    switch (token) {
        case SyntaxKind.NoSubstitutionTemplateLiteral:
        case SyntaxKind.TemplateHead:
        case SyntaxKind.TemplateMiddle:
        case SyntaxKind.TemplateTail:
            tokenValue = rawTextScanner.getTokenValue();
            break;
    }
    if (tokenValue === undefined || rawTextScanner.scan() !== SyntaxKind.EndOfFileToken) {
        rawTextScanner.setText(undefined);
        return invalidValueSentinel;
    }
    rawTextScanner.setText(undefined);
    return tokenValue;
}
function propagateNameFlags(node) {
    return node && isIdentifier(node) ? propagateIdentifierNameFlags(node) : propagateChildFlags(node);
}
function propagateIdentifierNameFlags(node) {
    // An IdentifierName is allowed to be `await`
    return propagateChildFlags(node) & ~TransformFlags.ContainsPossibleTopLevelAwait;
}
function propagatePropertyNameFlagsOfChild(node, transformFlags) {
    return transformFlags | (node.transformFlags & TransformFlags.PropertyNamePropagatingFlags);
}
function propagateChildFlags(child) {
    if (!child)
        return TransformFlags.None;
    const childFlags = child.transformFlags & ~getTransformFlagsSubtreeExclusions(child.kind);
    return isNamedDeclaration(child) && isPropertyName(child.name) ? propagatePropertyNameFlagsOfChild(child.name, childFlags) : childFlags;
}
function propagateChildrenFlags(children) {
    return children ? children.transformFlags : TransformFlags.None;
}
function aggregateChildrenFlags(children) {
    let subtreeFlags = TransformFlags.None;
    for (const child of children) {
        subtreeFlags |= propagateChildFlags(child);
    }
    children.transformFlags = subtreeFlags;
}
/**
 * Gets the transform flags to exclude when unioning the transform flags of a subtree.
 */
function getTransformFlagsSubtreeExclusions(kind) {
    if (kind >= SyntaxKind.FirstTypeNode && kind <= SyntaxKind.LastTypeNode) {
        return TransformFlags.TypeExcludes;
    }
    switch (kind) {
        case SyntaxKind.CallExpression:
        case SyntaxKind.NewExpression:
        case SyntaxKind.ArrayLiteralExpression:
            return TransformFlags.ArrayLiteralOrCallOrNewExcludes;
        case SyntaxKind.ModuleDeclaration:
            return TransformFlags.ModuleExcludes;
        case SyntaxKind.Parameter:
            return TransformFlags.ParameterExcludes;
        case SyntaxKind.ArrowFunction:
            return TransformFlags.ArrowFunctionExcludes;
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.FunctionDeclaration:
            return TransformFlags.FunctionExcludes;
        case SyntaxKind.VariableDeclarationList:
            return TransformFlags.VariableDeclarationListExcludes;
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ClassExpression:
            return TransformFlags.ClassExcludes;
        case SyntaxKind.Constructor:
            return TransformFlags.ConstructorExcludes;
        case SyntaxKind.PropertyDeclaration:
            return TransformFlags.PropertyExcludes;
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
            return TransformFlags.MethodOrAccessorExcludes;
        case SyntaxKind.AnyKeyword:
        case SyntaxKind.NumberKeyword:
        case SyntaxKind.BigIntKeyword:
        case SyntaxKind.NeverKeyword:
        case SyntaxKind.StringKeyword:
        case SyntaxKind.ObjectKeyword:
        case SyntaxKind.BooleanKeyword:
        case SyntaxKind.SymbolKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.TypeParameter:
        case SyntaxKind.PropertySignature:
        case SyntaxKind.MethodSignature:
        case SyntaxKind.CallSignature:
        case SyntaxKind.ConstructSignature:
        case SyntaxKind.IndexSignature:
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.TypeAliasDeclaration:
            return TransformFlags.TypeExcludes;
        case SyntaxKind.ObjectLiteralExpression:
            return TransformFlags.ObjectLiteralExcludes;
        case SyntaxKind.CatchClause:
            return TransformFlags.CatchClauseExcludes;
        case SyntaxKind.ObjectBindingPattern:
        case SyntaxKind.ArrayBindingPattern:
            return TransformFlags.BindingPatternExcludes;
        case SyntaxKind.TypeAssertionExpression:
        case SyntaxKind.SatisfiesExpression:
        case SyntaxKind.AsExpression:
        case SyntaxKind.PartiallyEmittedExpression:
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.SuperKeyword:
            return TransformFlags.OuterExpressionExcludes;
        case SyntaxKind.PropertyAccessExpression:
        case SyntaxKind.ElementAccessExpression:
            return TransformFlags.PropertyAccessExcludes;
        default:
            return TransformFlags.NodeExcludes;
    }
}
const baseFactory = createBaseNodeFactory();
function makeSynthetic(node) {
    node.flags |= NodeFlags.Synthesized;
    return node;
}
const syntheticFactory = {
    createBaseSourceFileNode: kind => makeSynthetic(baseFactory.createBaseSourceFileNode(kind)),
    createBaseIdentifierNode: kind => makeSynthetic(baseFactory.createBaseIdentifierNode(kind)),
    createBasePrivateIdentifierNode: kind => makeSynthetic(baseFactory.createBasePrivateIdentifierNode(kind)),
    createBaseTokenNode: kind => makeSynthetic(baseFactory.createBaseTokenNode(kind)),
    createBaseNode: kind => makeSynthetic(baseFactory.createBaseNode(kind)),
};
export const factory = createNodeFactory(4 /* NodeFactoryFlags.NoIndentationOnFreshPropertyAccess */, syntheticFactory);
let SourceMapSource;
/**
 * Create an external source map source file reference
 */
export function createSourceMapSource(fileName, text, skipTrivia) {
    return new (SourceMapSource || (SourceMapSource = objectAllocator.getSourceMapSourceConstructor()))(fileName, text, skipTrivia);
}
// Utilities
export function setOriginalNode(node, original) {
    if (node.original !== original) {
        node.original = original;
        if (original) {
            const emitNode = original.emitNode;
            if (emitNode)
                node.emitNode = mergeEmitNode(emitNode, node.emitNode);
        }
    }
    return node;
}
function mergeEmitNode(sourceEmitNode, destEmitNode) {
    const { flags, internalFlags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine, snippetElement, classThis, assignedName, } = sourceEmitNode;
    if (!destEmitNode)
        destEmitNode = {};
    // NOTE: We should have one or more lines here for each property in EmitNode, even if the line
    // consists only of a comment indicating the property does not merge
    // `flags` overwrites the destination
    if (flags) {
        destEmitNode.flags = flags;
    }
    // `internalFlags` overwrites the destination. We do not copy over the immutability of the source.
    if (internalFlags) {
        destEmitNode.internalFlags = internalFlags & ~InternalEmitFlags.Immutable;
    }
    // `annotatedNodes` are not merged as they should only present on the parse tree node of a `SourceFile`.
    // `leadingComments` are concatenated with any existing leading comments on the destination
    if (leadingComments) {
        // We use `.slice()` in case `destEmitNode.leadingComments` is pushed to later
        destEmitNode.leadingComments = addRange(leadingComments.slice(), destEmitNode.leadingComments);
    }
    // `trailingComments` are concatenated with any existing trailing comments on the destination
    if (trailingComments) {
        // We use `.slice()` in case `destEmitNode.trailingComments` is pushed to later
        destEmitNode.trailingComments = addRange(trailingComments.slice(), destEmitNode.trailingComments);
    }
    // `commentRange` overwrites the destination
    if (commentRange) {
        destEmitNode.commentRange = commentRange;
    }
    // `sourceMapRange` overwrites the destination
    if (sourceMapRange) {
        destEmitNode.sourceMapRange = sourceMapRange;
    }
    // `tokenSourceMapRanges` are merged with the destination
    if (tokenSourceMapRanges) {
        destEmitNode.tokenSourceMapRanges = mergeTokenSourceMapRanges(tokenSourceMapRanges, destEmitNode.tokenSourceMapRanges);
    }
    // `constantValue` overwrites the destination
    if (constantValue !== undefined) {
        destEmitNode.constantValue = constantValue;
    }
    // `externalHelpersModuleName` is not merged
    // `externalHelpers` is not merged
    // `helpers` are merged into the destination
    if (helpers) {
        for (const helper of helpers) {
            destEmitNode.helpers = appendIfUnique(destEmitNode.helpers, helper);
        }
    }
    // `startsOnNewLine` overwrites the destination
    if (startsOnNewLine !== undefined) {
        destEmitNode.startsOnNewLine = startsOnNewLine;
    }
    // `snippetElement` overwrites the destination
    if (snippetElement !== undefined) {
        destEmitNode.snippetElement = snippetElement;
    }
    // `typeNode` is not merged as it only applies to comment emit for a variable declaration.
    // TODO: `typeNode` should overwrite the destination
    // `classThis` overwrites the destination
    if (classThis) {
        destEmitNode.classThis = classThis;
    }
    // `assignedName` overwrites the destination
    if (assignedName) {
        destEmitNode.assignedName = assignedName;
    }
    // `identifierTypeArguments` are not merged as they only apply to an Identifier in quick info
    // `autoGenerate` is not merged as it only applies to a specific generated Identifier/PrivateIdentifier
    // `generatedImportReference` is not merged as it only applies to an Identifier
    return destEmitNode;
}
function mergeTokenSourceMapRanges(sourceRanges, destRanges) {
    if (!destRanges)
        destRanges = [];
    for (const key in sourceRanges) {
        destRanges[key] = sourceRanges[key];
    }
    return destRanges;
}
