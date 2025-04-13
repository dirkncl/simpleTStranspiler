import { SyntaxKind, } from "../namespaces/ts.js";

// Literals
export function isNumericLiteral(node) {
    return node.kind === SyntaxKind.NumericLiteral;
}
export function isBigIntLiteral(node) {
    return node.kind === SyntaxKind.BigIntLiteral;
}
export function isStringLiteral(node) {
    return node.kind === SyntaxKind.StringLiteral;
}
export function isJsxText(node) {
    return node.kind === SyntaxKind.JsxText;
}
export function isRegularExpressionLiteral(node) {
    return node.kind === SyntaxKind.RegularExpressionLiteral;
}
export function isNoSubstitutionTemplateLiteral(node) {
    return node.kind === SyntaxKind.NoSubstitutionTemplateLiteral;
}
// Pseudo-literals
export function isTemplateHead(node) {
    return node.kind === SyntaxKind.TemplateHead;
}
export function isTemplateMiddle(node) {
    return node.kind === SyntaxKind.TemplateMiddle;
}
export function isTemplateTail(node) {
    return node.kind === SyntaxKind.TemplateTail;
}
// Punctuation
export function isDotDotDotToken(node) {
    return node.kind === SyntaxKind.DotDotDotToken;
}
/** @internal */
export function isCommaToken(node) {
    return node.kind === SyntaxKind.CommaToken;
}
export function isPlusToken(node) {
    return node.kind === SyntaxKind.PlusToken;
}
export function isMinusToken(node) {
    return node.kind === SyntaxKind.MinusToken;
}
export function isAsteriskToken(node) {
    return node.kind === SyntaxKind.AsteriskToken;
}
export function isExclamationToken(node) {
    return node.kind === SyntaxKind.ExclamationToken;
}
export function isQuestionToken(node) {
    return node.kind === SyntaxKind.QuestionToken;
}
export function isColonToken(node) {
    return node.kind === SyntaxKind.ColonToken;
}
export function isQuestionDotToken(node) {
    return node.kind === SyntaxKind.QuestionDotToken;
}
export function isEqualsGreaterThanToken(node) {
    return node.kind === SyntaxKind.EqualsGreaterThanToken;
}
// Identifiers
export function isIdentifier(node) {
    return node.kind === SyntaxKind.Identifier;
}
export function isPrivateIdentifier(node) {
    return node.kind === SyntaxKind.PrivateIdentifier;
}
// Reserved Words
/** @internal */
export function isExportModifier(node) {
    return node.kind === SyntaxKind.ExportKeyword;
}
/** @internal */
export function isDefaultModifier(node) {
    return node.kind === SyntaxKind.DefaultKeyword;
}
/** @internal */
export function isAsyncModifier(node) {
    return node.kind === SyntaxKind.AsyncKeyword;
}
export function isAssertsKeyword(node) {
    return node.kind === SyntaxKind.AssertsKeyword;
}
export function isAwaitKeyword(node) {
    return node.kind === SyntaxKind.AwaitKeyword;
}
/** @internal */
export function isReadonlyKeyword(node) {
    return node.kind === SyntaxKind.ReadonlyKeyword;
}
/** @internal */
export function isStaticModifier(node) {
    return node.kind === SyntaxKind.StaticKeyword;
}
/** @internal */
export function isAbstractModifier(node) {
    return node.kind === SyntaxKind.AbstractKeyword;
}
/** @internal */
export function isOverrideModifier(node) {
    return node.kind === SyntaxKind.OverrideKeyword;
}
/** @internal */
export function isAccessorModifier(node) {
    return node.kind === SyntaxKind.AccessorKeyword;
}
/** @internal */
export function isSuperKeyword(node) {
    return node.kind === SyntaxKind.SuperKeyword;
}
/** @internal */
export function isImportKeyword(node) {
    return node.kind === SyntaxKind.ImportKeyword;
}
/** @internal */
export function isCaseKeyword(node) {
    return node.kind === SyntaxKind.CaseKeyword;
}
// Names
export function isQualifiedName(node) {
    return node.kind === SyntaxKind.QualifiedName;
}
export function isComputedPropertyName(node) {
    return node.kind === SyntaxKind.ComputedPropertyName;
}
// Signature elements
export function isTypeParameterDeclaration(node) {
    return node.kind === SyntaxKind.TypeParameter;
}
// TODO(rbuckton): Rename to 'isParameterDeclaration'
export function isParameter(node) {
    return node.kind === SyntaxKind.Parameter;
}
export function isDecorator(node) {
    return node.kind === SyntaxKind.Decorator;
}
// TypeMember
export function isPropertySignature(node) {
    return node.kind === SyntaxKind.PropertySignature;
}
export function isPropertyDeclaration(node) {
    return node.kind === SyntaxKind.PropertyDeclaration;
}
export function isMethodSignature(node) {
    return node.kind === SyntaxKind.MethodSignature;
}
export function isMethodDeclaration(node) {
    return node.kind === SyntaxKind.MethodDeclaration;
}
export function isClassStaticBlockDeclaration(node) {
    return node.kind === SyntaxKind.ClassStaticBlockDeclaration;
}
export function isConstructorDeclaration(node) {
    return node.kind === SyntaxKind.Constructor;
}
export function isGetAccessorDeclaration(node) {
    return node.kind === SyntaxKind.GetAccessor;
}
export function isSetAccessorDeclaration(node) {
    return node.kind === SyntaxKind.SetAccessor;
}
export function isCallSignatureDeclaration(node) {
    return node.kind === SyntaxKind.CallSignature;
}
export function isConstructSignatureDeclaration(node) {
    return node.kind === SyntaxKind.ConstructSignature;
}
export function isIndexSignatureDeclaration(node) {
    return node.kind === SyntaxKind.IndexSignature;
}
// Type
export function isTypePredicateNode(node) {
    return node.kind === SyntaxKind.TypePredicate;
}
export function isTypeReferenceNode(node) {
    return node.kind === SyntaxKind.TypeReference;
}
export function isFunctionTypeNode(node) {
    return node.kind === SyntaxKind.FunctionType;
}
export function isConstructorTypeNode(node) {
    return node.kind === SyntaxKind.ConstructorType;
}
export function isTypeQueryNode(node) {
    return node.kind === SyntaxKind.TypeQuery;
}
export function isTypeLiteralNode(node) {
    return node.kind === SyntaxKind.TypeLiteral;
}
export function isArrayTypeNode(node) {
    return node.kind === SyntaxKind.ArrayType;
}
export function isTupleTypeNode(node) {
    return node.kind === SyntaxKind.TupleType;
}
export function isNamedTupleMember(node) {
    return node.kind === SyntaxKind.NamedTupleMember;
}
export function isOptionalTypeNode(node) {
    return node.kind === SyntaxKind.OptionalType;
}
export function isRestTypeNode(node) {
    return node.kind === SyntaxKind.RestType;
}
export function isUnionTypeNode(node) {
    return node.kind === SyntaxKind.UnionType;
}
export function isIntersectionTypeNode(node) {
    return node.kind === SyntaxKind.IntersectionType;
}
export function isConditionalTypeNode(node) {
    return node.kind === SyntaxKind.ConditionalType;
}
export function isInferTypeNode(node) {
    return node.kind === SyntaxKind.InferType;
}
export function isParenthesizedTypeNode(node) {
    return node.kind === SyntaxKind.ParenthesizedType;
}
export function isThisTypeNode(node) {
    return node.kind === SyntaxKind.ThisType;
}
export function isTypeOperatorNode(node) {
    return node.kind === SyntaxKind.TypeOperator;
}
export function isIndexedAccessTypeNode(node) {
    return node.kind === SyntaxKind.IndexedAccessType;
}
export function isMappedTypeNode(node) {
    return node.kind === SyntaxKind.MappedType;
}
export function isLiteralTypeNode(node) {
    return node.kind === SyntaxKind.LiteralType;
}
export function isImportTypeNode(node) {
    return node.kind === SyntaxKind.ImportType;
}
export function isTemplateLiteralTypeSpan(node) {
    return node.kind === SyntaxKind.TemplateLiteralTypeSpan;
}
export function isTemplateLiteralTypeNode(node) {
    return node.kind === SyntaxKind.TemplateLiteralType;
}
// Binding patterns
export function isObjectBindingPattern(node) {
    return node.kind === SyntaxKind.ObjectBindingPattern;
}
export function isArrayBindingPattern(node) {
    return node.kind === SyntaxKind.ArrayBindingPattern;
}
export function isBindingElement(node) {
    return node.kind === SyntaxKind.BindingElement;
}
// Expression
export function isArrayLiteralExpression(node) {
    return node.kind === SyntaxKind.ArrayLiteralExpression;
}
export function isObjectLiteralExpression(node) {
    return node.kind === SyntaxKind.ObjectLiteralExpression;
}
export function isPropertyAccessExpression(node) {
    return node.kind === SyntaxKind.PropertyAccessExpression;
}
export function isElementAccessExpression(node) {
    return node.kind === SyntaxKind.ElementAccessExpression;
}
export function isCallExpression(node) {
    return node.kind === SyntaxKind.CallExpression;
}
export function isNewExpression(node) {
    return node.kind === SyntaxKind.NewExpression;
}
export function isTaggedTemplateExpression(node) {
    return node.kind === SyntaxKind.TaggedTemplateExpression;
}
export function isTypeAssertionExpression(node) {
    return node.kind === SyntaxKind.TypeAssertionExpression;
}
export function isParenthesizedExpression(node) {
    return node.kind === SyntaxKind.ParenthesizedExpression;
}
export function isFunctionExpression(node) {
    return node.kind === SyntaxKind.FunctionExpression;
}
export function isArrowFunction(node) {
    return node.kind === SyntaxKind.ArrowFunction;
}
export function isDeleteExpression(node) {
    return node.kind === SyntaxKind.DeleteExpression;
}
export function isTypeOfExpression(node) {
    return node.kind === SyntaxKind.TypeOfExpression;
}
export function isVoidExpression(node) {
    return node.kind === SyntaxKind.VoidExpression;
}
export function isAwaitExpression(node) {
    return node.kind === SyntaxKind.AwaitExpression;
}
export function isPrefixUnaryExpression(node) {
    return node.kind === SyntaxKind.PrefixUnaryExpression;
}
export function isPostfixUnaryExpression(node) {
    return node.kind === SyntaxKind.PostfixUnaryExpression;
}
export function isBinaryExpression(node) {
    return node.kind === SyntaxKind.BinaryExpression;
}
export function isConditionalExpression(node) {
    return node.kind === SyntaxKind.ConditionalExpression;
}
export function isTemplateExpression(node) {
    return node.kind === SyntaxKind.TemplateExpression;
}
export function isYieldExpression(node) {
    return node.kind === SyntaxKind.YieldExpression;
}
export function isSpreadElement(node) {
    return node.kind === SyntaxKind.SpreadElement;
}
export function isClassExpression(node) {
    return node.kind === SyntaxKind.ClassExpression;
}
export function isOmittedExpression(node) {
    return node.kind === SyntaxKind.OmittedExpression;
}
export function isExpressionWithTypeArguments(node) {
    return node.kind === SyntaxKind.ExpressionWithTypeArguments;
}
export function isAsExpression(node) {
    return node.kind === SyntaxKind.AsExpression;
}
export function isSatisfiesExpression(node) {
    return node.kind === SyntaxKind.SatisfiesExpression;
}
export function isNonNullExpression(node) {
    return node.kind === SyntaxKind.NonNullExpression;
}
export function isMetaProperty(node) {
    return node.kind === SyntaxKind.MetaProperty;
}
export function isSyntheticExpression(node) {
    return node.kind === SyntaxKind.SyntheticExpression;
}
export function isPartiallyEmittedExpression(node) {
    return node.kind === SyntaxKind.PartiallyEmittedExpression;
}
export function isCommaListExpression(node) {
    return node.kind === SyntaxKind.CommaListExpression;
}
// Misc
export function isTemplateSpan(node) {
    return node.kind === SyntaxKind.TemplateSpan;
}
export function isSemicolonClassElement(node) {
    return node.kind === SyntaxKind.SemicolonClassElement;
}
// Elements
export function isBlock(node) {
    return node.kind === SyntaxKind.Block;
}
export function isVariableStatement(node) {
    return node.kind === SyntaxKind.VariableStatement;
}
export function isEmptyStatement(node) {
    return node.kind === SyntaxKind.EmptyStatement;
}
export function isExpressionStatement(node) {
    return node.kind === SyntaxKind.ExpressionStatement;
}
export function isIfStatement(node) {
    return node.kind === SyntaxKind.IfStatement;
}
export function isDoStatement(node) {
    return node.kind === SyntaxKind.DoStatement;
}
export function isWhileStatement(node) {
    return node.kind === SyntaxKind.WhileStatement;
}
export function isForStatement(node) {
    return node.kind === SyntaxKind.ForStatement;
}
export function isForInStatement(node) {
    return node.kind === SyntaxKind.ForInStatement;
}
export function isForOfStatement(node) {
    return node.kind === SyntaxKind.ForOfStatement;
}
export function isContinueStatement(node) {
    return node.kind === SyntaxKind.ContinueStatement;
}
export function isBreakStatement(node) {
    return node.kind === SyntaxKind.BreakStatement;
}
export function isReturnStatement(node) {
    return node.kind === SyntaxKind.ReturnStatement;
}
export function isWithStatement(node) {
    return node.kind === SyntaxKind.WithStatement;
}
export function isSwitchStatement(node) {
    return node.kind === SyntaxKind.SwitchStatement;
}
export function isLabeledStatement(node) {
    return node.kind === SyntaxKind.LabeledStatement;
}
export function isThrowStatement(node) {
    return node.kind === SyntaxKind.ThrowStatement;
}
export function isTryStatement(node) {
    return node.kind === SyntaxKind.TryStatement;
}
export function isDebuggerStatement(node) {
    return node.kind === SyntaxKind.DebuggerStatement;
}
export function isVariableDeclaration(node) {
    return node.kind === SyntaxKind.VariableDeclaration;
}
export function isVariableDeclarationList(node) {
    return node.kind === SyntaxKind.VariableDeclarationList;
}
export function isFunctionDeclaration(node) {
    return node.kind === SyntaxKind.FunctionDeclaration;
}
export function isClassDeclaration(node) {
    return node.kind === SyntaxKind.ClassDeclaration;
}
export function isInterfaceDeclaration(node) {
    return node.kind === SyntaxKind.InterfaceDeclaration;
}
export function isTypeAliasDeclaration(node) {
    return node.kind === SyntaxKind.TypeAliasDeclaration;
}
export function isEnumDeclaration(node) {
    return node.kind === SyntaxKind.EnumDeclaration;
}
export function isModuleDeclaration(node) {
    return node.kind === SyntaxKind.ModuleDeclaration;
}
export function isModuleBlock(node) {
    return node.kind === SyntaxKind.ModuleBlock;
}
export function isCaseBlock(node) {
    return node.kind === SyntaxKind.CaseBlock;
}
export function isNamespaceExportDeclaration(node) {
    return node.kind === SyntaxKind.NamespaceExportDeclaration;
}
export function isImportEqualsDeclaration(node) {
    return node.kind === SyntaxKind.ImportEqualsDeclaration;
}
export function isImportDeclaration(node) {
    return node.kind === SyntaxKind.ImportDeclaration;
}
export function isImportClause(node) {
    return node.kind === SyntaxKind.ImportClause;
}
export function isImportTypeAssertionContainer(node) {
    return node.kind === SyntaxKind.ImportTypeAssertionContainer;
}
/** @deprecated */
export function isAssertClause(node) {
    return node.kind === SyntaxKind.AssertClause;
}
/** @deprecated */
export function isAssertEntry(node) {
    return node.kind === SyntaxKind.AssertEntry;
}
export function isImportAttributes(node) {
    return node.kind === SyntaxKind.ImportAttributes;
}
export function isImportAttribute(node) {
    return node.kind === SyntaxKind.ImportAttribute;
}
export function isNamespaceImport(node) {
    return node.kind === SyntaxKind.NamespaceImport;
}
export function isNamespaceExport(node) {
    return node.kind === SyntaxKind.NamespaceExport;
}
export function isNamedImports(node) {
    return node.kind === SyntaxKind.NamedImports;
}
export function isImportSpecifier(node) {
    return node.kind === SyntaxKind.ImportSpecifier;
}
export function isExportAssignment(node) {
    return node.kind === SyntaxKind.ExportAssignment;
}
export function isExportDeclaration(node) {
    return node.kind === SyntaxKind.ExportDeclaration;
}
export function isNamedExports(node) {
    return node.kind === SyntaxKind.NamedExports;
}
export function isExportSpecifier(node) {
    return node.kind === SyntaxKind.ExportSpecifier;
}
export function isModuleExportName(node) {
    return node.kind === SyntaxKind.Identifier || node.kind === SyntaxKind.StringLiteral;
}
export function isMissingDeclaration(node) {
    return node.kind === SyntaxKind.MissingDeclaration;
}
export function isNotEmittedStatement(node) {
    return node.kind === SyntaxKind.NotEmittedStatement;
}
/** @internal */
export function isSyntheticReference(node) {
    return node.kind === SyntaxKind.SyntheticReferenceExpression;
}
// Module References
export function isExternalModuleReference(node) {
    return node.kind === SyntaxKind.ExternalModuleReference;
}
// JSX
export function isJsxElement(node) {
    return node.kind === SyntaxKind.JsxElement;
}
export function isJsxSelfClosingElement(node) {
    return node.kind === SyntaxKind.JsxSelfClosingElement;
}
export function isJsxOpeningElement(node) {
    return node.kind === SyntaxKind.JsxOpeningElement;
}
export function isJsxClosingElement(node) {
    return node.kind === SyntaxKind.JsxClosingElement;
}
export function isJsxFragment(node) {
    return node.kind === SyntaxKind.JsxFragment;
}
export function isJsxOpeningFragment(node) {
    return node.kind === SyntaxKind.JsxOpeningFragment;
}
export function isJsxClosingFragment(node) {
    return node.kind === SyntaxKind.JsxClosingFragment;
}
export function isJsxAttribute(node) {
    return node.kind === SyntaxKind.JsxAttribute;
}
export function isJsxAttributes(node) {
    return node.kind === SyntaxKind.JsxAttributes;
}
export function isJsxSpreadAttribute(node) {
    return node.kind === SyntaxKind.JsxSpreadAttribute;
}
export function isJsxExpression(node) {
    return node.kind === SyntaxKind.JsxExpression;
}
export function isJsxNamespacedName(node) {
    return node.kind === SyntaxKind.JsxNamespacedName;
}
// Clauses
export function isCaseClause(node) {
    return node.kind === SyntaxKind.CaseClause;
}
export function isDefaultClause(node) {
    return node.kind === SyntaxKind.DefaultClause;
}
export function isHeritageClause(node) {
    return node.kind === SyntaxKind.HeritageClause;
}
export function isCatchClause(node) {
    return node.kind === SyntaxKind.CatchClause;
}
// Property assignments
export function isPropertyAssignment(node) {
    return node.kind === SyntaxKind.PropertyAssignment;
}
export function isShorthandPropertyAssignment(node) {
    return node.kind === SyntaxKind.ShorthandPropertyAssignment;
}
export function isSpreadAssignment(node) {
    return node.kind === SyntaxKind.SpreadAssignment;
}
// Enum
export function isEnumMember(node) {
    return node.kind === SyntaxKind.EnumMember;
}
// Top-level nodes
export function isSourceFile(node) {
    return node.kind === SyntaxKind.SourceFile;
}
export function isBundle(node) {
    return node.kind === SyntaxKind.Bundle;
}
// TODO(rbuckton): isInputFiles
// JSDoc Elements
export function isJSDocTypeExpression(node) {
    return node.kind === SyntaxKind.JSDocTypeExpression;
}
export function isJSDocNameReference(node) {
    return node.kind === SyntaxKind.JSDocNameReference;
}
export function isJSDocMemberName(node) {
    return node.kind === SyntaxKind.JSDocMemberName;
}
export function isJSDocLink(node) {
    return node.kind === SyntaxKind.JSDocLink;
}
export function isJSDocLinkCode(node) {
    return node.kind === SyntaxKind.JSDocLinkCode;
}
export function isJSDocLinkPlain(node) {
    return node.kind === SyntaxKind.JSDocLinkPlain;
}
export function isJSDocAllType(node) {
    return node.kind === SyntaxKind.JSDocAllType;
}
export function isJSDocUnknownType(node) {
    return node.kind === SyntaxKind.JSDocUnknownType;
}
export function isJSDocNullableType(node) {
    return node.kind === SyntaxKind.JSDocNullableType;
}
export function isJSDocNonNullableType(node) {
    return node.kind === SyntaxKind.JSDocNonNullableType;
}
export function isJSDocOptionalType(node) {
    return node.kind === SyntaxKind.JSDocOptionalType;
}
export function isJSDocFunctionType(node) {
    return node.kind === SyntaxKind.JSDocFunctionType;
}
export function isJSDocVariadicType(node) {
    return node.kind === SyntaxKind.JSDocVariadicType;
}
export function isJSDocNamepathType(node) {
    return node.kind === SyntaxKind.JSDocNamepathType;
}
export function isJSDoc(node) {
    return node.kind === SyntaxKind.JSDoc;
}
export function isJSDocTypeLiteral(node) {
    return node.kind === SyntaxKind.JSDocTypeLiteral;
}
export function isJSDocSignature(node) {
    return node.kind === SyntaxKind.JSDocSignature;
}
// JSDoc Tags
export function isJSDocAugmentsTag(node) {
    return node.kind === SyntaxKind.JSDocAugmentsTag;
}
export function isJSDocAuthorTag(node) {
    return node.kind === SyntaxKind.JSDocAuthorTag;
}
export function isJSDocClassTag(node) {
    return node.kind === SyntaxKind.JSDocClassTag;
}
export function isJSDocCallbackTag(node) {
    return node.kind === SyntaxKind.JSDocCallbackTag;
}
export function isJSDocPublicTag(node) {
    return node.kind === SyntaxKind.JSDocPublicTag;
}
export function isJSDocPrivateTag(node) {
    return node.kind === SyntaxKind.JSDocPrivateTag;
}
export function isJSDocProtectedTag(node) {
    return node.kind === SyntaxKind.JSDocProtectedTag;
}
export function isJSDocReadonlyTag(node) {
    return node.kind === SyntaxKind.JSDocReadonlyTag;
}
export function isJSDocOverrideTag(node) {
    return node.kind === SyntaxKind.JSDocOverrideTag;
}
export function isJSDocOverloadTag(node) {
    return node.kind === SyntaxKind.JSDocOverloadTag;
}
export function isJSDocDeprecatedTag(node) {
    return node.kind === SyntaxKind.JSDocDeprecatedTag;
}
export function isJSDocSeeTag(node) {
    return node.kind === SyntaxKind.JSDocSeeTag;
}
export function isJSDocEnumTag(node) {
    return node.kind === SyntaxKind.JSDocEnumTag;
}
export function isJSDocParameterTag(node) {
    return node.kind === SyntaxKind.JSDocParameterTag;
}
export function isJSDocReturnTag(node) {
    return node.kind === SyntaxKind.JSDocReturnTag;
}
export function isJSDocThisTag(node) {
    return node.kind === SyntaxKind.JSDocThisTag;
}
export function isJSDocTypeTag(node) {
    return node.kind === SyntaxKind.JSDocTypeTag;
}
export function isJSDocTemplateTag(node) {
    return node.kind === SyntaxKind.JSDocTemplateTag;
}
export function isJSDocTypedefTag(node) {
    return node.kind === SyntaxKind.JSDocTypedefTag;
}
export function isJSDocUnknownTag(node) {
    return node.kind === SyntaxKind.JSDocTag;
}
export function isJSDocPropertyTag(node) {
    return node.kind === SyntaxKind.JSDocPropertyTag;
}
export function isJSDocImplementsTag(node) {
    return node.kind === SyntaxKind.JSDocImplementsTag;
}
export function isJSDocSatisfiesTag(node) {
    return node.kind === SyntaxKind.JSDocSatisfiesTag;
}
export function isJSDocThrowsTag(node) {
    return node.kind === SyntaxKind.JSDocThrowsTag;
}
export function isJSDocImportTag(node) {
    return node.kind === SyntaxKind.JSDocImportTag;
}
// Synthesized list
/** @internal */
export function isSyntaxList(n) {
    return n.kind === SyntaxKind.SyntaxList;
}
