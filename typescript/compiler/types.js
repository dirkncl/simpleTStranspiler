// token > SyntaxKind.Identifier => token is a keyword
// Also, If you add a new SyntaxKind be sure to keep the `Markers` section at the bottom in sync
export var SyntaxKind;
(function (SyntaxKind) {
    SyntaxKind[SyntaxKind["Unknown"] = 0] = "Unknown";
    SyntaxKind[SyntaxKind["EndOfFileToken"] = 1] = "EndOfFileToken";
    SyntaxKind[SyntaxKind["SingleLineCommentTrivia"] = 2] = "SingleLineCommentTrivia";
    SyntaxKind[SyntaxKind["MultiLineCommentTrivia"] = 3] = "MultiLineCommentTrivia";
    SyntaxKind[SyntaxKind["NewLineTrivia"] = 4] = "NewLineTrivia";
    SyntaxKind[SyntaxKind["WhitespaceTrivia"] = 5] = "WhitespaceTrivia";
    // We detect and preserve #! on the first line
    SyntaxKind[SyntaxKind["ShebangTrivia"] = 6] = "ShebangTrivia";
    // We detect and provide better error recovery when we encounter a git merge marker.  This
    // allows us to edit files with git-conflict markers in them in a much more pleasant manner.
    SyntaxKind[SyntaxKind["ConflictMarkerTrivia"] = 7] = "ConflictMarkerTrivia";
    // If a file is actually binary, with any luck, we'll get U+FFFD REPLACEMENT CHARACTER
    // in position zero and can just skip what is surely a doomed parse.
    SyntaxKind[SyntaxKind["NonTextFileMarkerTrivia"] = 8] = "NonTextFileMarkerTrivia";
    // Literals
    SyntaxKind[SyntaxKind["NumericLiteral"] = 9] = "NumericLiteral";
    SyntaxKind[SyntaxKind["BigIntLiteral"] = 10] = "BigIntLiteral";
    SyntaxKind[SyntaxKind["StringLiteral"] = 11] = "StringLiteral";
    SyntaxKind[SyntaxKind["JsxText"] = 12] = "JsxText";
    SyntaxKind[SyntaxKind["JsxTextAllWhiteSpaces"] = 13] = "JsxTextAllWhiteSpaces";
    SyntaxKind[SyntaxKind["RegularExpressionLiteral"] = 14] = "RegularExpressionLiteral";
    SyntaxKind[SyntaxKind["NoSubstitutionTemplateLiteral"] = 15] = "NoSubstitutionTemplateLiteral";
    // Pseudo-literals
    SyntaxKind[SyntaxKind["TemplateHead"] = 16] = "TemplateHead";
    SyntaxKind[SyntaxKind["TemplateMiddle"] = 17] = "TemplateMiddle";
    SyntaxKind[SyntaxKind["TemplateTail"] = 18] = "TemplateTail";
    // Punctuation
    SyntaxKind[SyntaxKind["OpenBraceToken"] = 19] = "OpenBraceToken";
    SyntaxKind[SyntaxKind["CloseBraceToken"] = 20] = "CloseBraceToken";
    SyntaxKind[SyntaxKind["OpenParenToken"] = 21] = "OpenParenToken";
    SyntaxKind[SyntaxKind["CloseParenToken"] = 22] = "CloseParenToken";
    SyntaxKind[SyntaxKind["OpenBracketToken"] = 23] = "OpenBracketToken";
    SyntaxKind[SyntaxKind["CloseBracketToken"] = 24] = "CloseBracketToken";
    SyntaxKind[SyntaxKind["DotToken"] = 25] = "DotToken";
    SyntaxKind[SyntaxKind["DotDotDotToken"] = 26] = "DotDotDotToken";
    SyntaxKind[SyntaxKind["SemicolonToken"] = 27] = "SemicolonToken";
    SyntaxKind[SyntaxKind["CommaToken"] = 28] = "CommaToken";
    SyntaxKind[SyntaxKind["QuestionDotToken"] = 29] = "QuestionDotToken";
    SyntaxKind[SyntaxKind["LessThanToken"] = 30] = "LessThanToken";
    SyntaxKind[SyntaxKind["LessThanSlashToken"] = 31] = "LessThanSlashToken";
    SyntaxKind[SyntaxKind["GreaterThanToken"] = 32] = "GreaterThanToken";
    SyntaxKind[SyntaxKind["LessThanEqualsToken"] = 33] = "LessThanEqualsToken";
    SyntaxKind[SyntaxKind["GreaterThanEqualsToken"] = 34] = "GreaterThanEqualsToken";
    SyntaxKind[SyntaxKind["EqualsEqualsToken"] = 35] = "EqualsEqualsToken";
    SyntaxKind[SyntaxKind["ExclamationEqualsToken"] = 36] = "ExclamationEqualsToken";
    SyntaxKind[SyntaxKind["EqualsEqualsEqualsToken"] = 37] = "EqualsEqualsEqualsToken";
    SyntaxKind[SyntaxKind["ExclamationEqualsEqualsToken"] = 38] = "ExclamationEqualsEqualsToken";
    SyntaxKind[SyntaxKind["EqualsGreaterThanToken"] = 39] = "EqualsGreaterThanToken";
    SyntaxKind[SyntaxKind["PlusToken"] = 40] = "PlusToken";
    SyntaxKind[SyntaxKind["MinusToken"] = 41] = "MinusToken";
    SyntaxKind[SyntaxKind["AsteriskToken"] = 42] = "AsteriskToken";
    SyntaxKind[SyntaxKind["AsteriskAsteriskToken"] = 43] = "AsteriskAsteriskToken";
    SyntaxKind[SyntaxKind["SlashToken"] = 44] = "SlashToken";
    SyntaxKind[SyntaxKind["PercentToken"] = 45] = "PercentToken";
    SyntaxKind[SyntaxKind["PlusPlusToken"] = 46] = "PlusPlusToken";
    SyntaxKind[SyntaxKind["MinusMinusToken"] = 47] = "MinusMinusToken";
    SyntaxKind[SyntaxKind["LessThanLessThanToken"] = 48] = "LessThanLessThanToken";
    SyntaxKind[SyntaxKind["GreaterThanGreaterThanToken"] = 49] = "GreaterThanGreaterThanToken";
    SyntaxKind[SyntaxKind["GreaterThanGreaterThanGreaterThanToken"] = 50] = "GreaterThanGreaterThanGreaterThanToken";
    SyntaxKind[SyntaxKind["AmpersandToken"] = 51] = "AmpersandToken";
    SyntaxKind[SyntaxKind["BarToken"] = 52] = "BarToken";
    SyntaxKind[SyntaxKind["CaretToken"] = 53] = "CaretToken";
    SyntaxKind[SyntaxKind["ExclamationToken"] = 54] = "ExclamationToken";
    SyntaxKind[SyntaxKind["TildeToken"] = 55] = "TildeToken";
    SyntaxKind[SyntaxKind["AmpersandAmpersandToken"] = 56] = "AmpersandAmpersandToken";
    SyntaxKind[SyntaxKind["BarBarToken"] = 57] = "BarBarToken";
    SyntaxKind[SyntaxKind["QuestionToken"] = 58] = "QuestionToken";
    SyntaxKind[SyntaxKind["ColonToken"] = 59] = "ColonToken";
    SyntaxKind[SyntaxKind["AtToken"] = 60] = "AtToken";
    SyntaxKind[SyntaxKind["QuestionQuestionToken"] = 61] = "QuestionQuestionToken";
    /** Only the JSDoc scanner produces BacktickToken. The normal scanner produces NoSubstitutionTemplateLiteral and related kinds. */
    SyntaxKind[SyntaxKind["BacktickToken"] = 62] = "BacktickToken";
    /** Only the JSDoc scanner produces HashToken. The normal scanner produces PrivateIdentifier. */
    SyntaxKind[SyntaxKind["HashToken"] = 63] = "HashToken";
    // Assignments
    SyntaxKind[SyntaxKind["EqualsToken"] = 64] = "EqualsToken";
    SyntaxKind[SyntaxKind["PlusEqualsToken"] = 65] = "PlusEqualsToken";
    SyntaxKind[SyntaxKind["MinusEqualsToken"] = 66] = "MinusEqualsToken";
    SyntaxKind[SyntaxKind["AsteriskEqualsToken"] = 67] = "AsteriskEqualsToken";
    SyntaxKind[SyntaxKind["AsteriskAsteriskEqualsToken"] = 68] = "AsteriskAsteriskEqualsToken";
    SyntaxKind[SyntaxKind["SlashEqualsToken"] = 69] = "SlashEqualsToken";
    SyntaxKind[SyntaxKind["PercentEqualsToken"] = 70] = "PercentEqualsToken";
    SyntaxKind[SyntaxKind["LessThanLessThanEqualsToken"] = 71] = "LessThanLessThanEqualsToken";
    SyntaxKind[SyntaxKind["GreaterThanGreaterThanEqualsToken"] = 72] = "GreaterThanGreaterThanEqualsToken";
    SyntaxKind[SyntaxKind["GreaterThanGreaterThanGreaterThanEqualsToken"] = 73] = "GreaterThanGreaterThanGreaterThanEqualsToken";
    SyntaxKind[SyntaxKind["AmpersandEqualsToken"] = 74] = "AmpersandEqualsToken";
    SyntaxKind[SyntaxKind["BarEqualsToken"] = 75] = "BarEqualsToken";
    SyntaxKind[SyntaxKind["BarBarEqualsToken"] = 76] = "BarBarEqualsToken";
    SyntaxKind[SyntaxKind["AmpersandAmpersandEqualsToken"] = 77] = "AmpersandAmpersandEqualsToken";
    SyntaxKind[SyntaxKind["QuestionQuestionEqualsToken"] = 78] = "QuestionQuestionEqualsToken";
    SyntaxKind[SyntaxKind["CaretEqualsToken"] = 79] = "CaretEqualsToken";
    // Identifiers and PrivateIdentifiers
    SyntaxKind[SyntaxKind["Identifier"] = 80] = "Identifier";
    SyntaxKind[SyntaxKind["PrivateIdentifier"] = 81] = "PrivateIdentifier";
    /**
     * Only the special JSDoc comment text scanner produces JSDocCommentTextTokes. One of these tokens spans all text after a tag comment's start and before the next @
     * @internal
     */
    SyntaxKind[SyntaxKind["JSDocCommentTextToken"] = 82] = "JSDocCommentTextToken";
    // Reserved words
    SyntaxKind[SyntaxKind["BreakKeyword"] = 83] = "BreakKeyword";
    SyntaxKind[SyntaxKind["CaseKeyword"] = 84] = "CaseKeyword";
    SyntaxKind[SyntaxKind["CatchKeyword"] = 85] = "CatchKeyword";
    SyntaxKind[SyntaxKind["ClassKeyword"] = 86] = "ClassKeyword";
    SyntaxKind[SyntaxKind["ConstKeyword"] = 87] = "ConstKeyword";
    SyntaxKind[SyntaxKind["ContinueKeyword"] = 88] = "ContinueKeyword";
    SyntaxKind[SyntaxKind["DebuggerKeyword"] = 89] = "DebuggerKeyword";
    SyntaxKind[SyntaxKind["DefaultKeyword"] = 90] = "DefaultKeyword";
    SyntaxKind[SyntaxKind["DeleteKeyword"] = 91] = "DeleteKeyword";
    SyntaxKind[SyntaxKind["DoKeyword"] = 92] = "DoKeyword";
    SyntaxKind[SyntaxKind["ElseKeyword"] = 93] = "ElseKeyword";
    SyntaxKind[SyntaxKind["EnumKeyword"] = 94] = "EnumKeyword";
    SyntaxKind[SyntaxKind["ExportKeyword"] = 95] = "ExportKeyword";
    SyntaxKind[SyntaxKind["ExtendsKeyword"] = 96] = "ExtendsKeyword";
    SyntaxKind[SyntaxKind["FalseKeyword"] = 97] = "FalseKeyword";
    SyntaxKind[SyntaxKind["FinallyKeyword"] = 98] = "FinallyKeyword";
    SyntaxKind[SyntaxKind["ForKeyword"] = 99] = "ForKeyword";
    SyntaxKind[SyntaxKind["FunctionKeyword"] = 100] = "FunctionKeyword";
    SyntaxKind[SyntaxKind["IfKeyword"] = 101] = "IfKeyword";
    SyntaxKind[SyntaxKind["ImportKeyword"] = 102] = "ImportKeyword";
    SyntaxKind[SyntaxKind["InKeyword"] = 103] = "InKeyword";
    SyntaxKind[SyntaxKind["InstanceOfKeyword"] = 104] = "InstanceOfKeyword";
    SyntaxKind[SyntaxKind["NewKeyword"] = 105] = "NewKeyword";
    SyntaxKind[SyntaxKind["NullKeyword"] = 106] = "NullKeyword";
    SyntaxKind[SyntaxKind["ReturnKeyword"] = 107] = "ReturnKeyword";
    SyntaxKind[SyntaxKind["SuperKeyword"] = 108] = "SuperKeyword";
    SyntaxKind[SyntaxKind["SwitchKeyword"] = 109] = "SwitchKeyword";
    SyntaxKind[SyntaxKind["ThisKeyword"] = 110] = "ThisKeyword";
    SyntaxKind[SyntaxKind["ThrowKeyword"] = 111] = "ThrowKeyword";
    SyntaxKind[SyntaxKind["TrueKeyword"] = 112] = "TrueKeyword";
    SyntaxKind[SyntaxKind["TryKeyword"] = 113] = "TryKeyword";
    SyntaxKind[SyntaxKind["TypeOfKeyword"] = 114] = "TypeOfKeyword";
    SyntaxKind[SyntaxKind["VarKeyword"] = 115] = "VarKeyword";
    SyntaxKind[SyntaxKind["VoidKeyword"] = 116] = "VoidKeyword";
    SyntaxKind[SyntaxKind["WhileKeyword"] = 117] = "WhileKeyword";
    SyntaxKind[SyntaxKind["WithKeyword"] = 118] = "WithKeyword";
    // Strict mode reserved words
    SyntaxKind[SyntaxKind["ImplementsKeyword"] = 119] = "ImplementsKeyword";
    SyntaxKind[SyntaxKind["InterfaceKeyword"] = 120] = "InterfaceKeyword";
    SyntaxKind[SyntaxKind["LetKeyword"] = 121] = "LetKeyword";
    SyntaxKind[SyntaxKind["PackageKeyword"] = 122] = "PackageKeyword";
    SyntaxKind[SyntaxKind["PrivateKeyword"] = 123] = "PrivateKeyword";
    SyntaxKind[SyntaxKind["ProtectedKeyword"] = 124] = "ProtectedKeyword";
    SyntaxKind[SyntaxKind["PublicKeyword"] = 125] = "PublicKeyword";
    SyntaxKind[SyntaxKind["StaticKeyword"] = 126] = "StaticKeyword";
    SyntaxKind[SyntaxKind["YieldKeyword"] = 127] = "YieldKeyword";
    // Contextual keywords
    SyntaxKind[SyntaxKind["AbstractKeyword"] = 128] = "AbstractKeyword";
    SyntaxKind[SyntaxKind["AccessorKeyword"] = 129] = "AccessorKeyword";
    SyntaxKind[SyntaxKind["AsKeyword"] = 130] = "AsKeyword";
    SyntaxKind[SyntaxKind["AssertsKeyword"] = 131] = "AssertsKeyword";
    SyntaxKind[SyntaxKind["AssertKeyword"] = 132] = "AssertKeyword";
    SyntaxKind[SyntaxKind["AnyKeyword"] = 133] = "AnyKeyword";
    SyntaxKind[SyntaxKind["AsyncKeyword"] = 134] = "AsyncKeyword";
    SyntaxKind[SyntaxKind["AwaitKeyword"] = 135] = "AwaitKeyword";
    SyntaxKind[SyntaxKind["BooleanKeyword"] = 136] = "BooleanKeyword";
    SyntaxKind[SyntaxKind["ConstructorKeyword"] = 137] = "ConstructorKeyword";
    SyntaxKind[SyntaxKind["DeclareKeyword"] = 138] = "DeclareKeyword";
    SyntaxKind[SyntaxKind["GetKeyword"] = 139] = "GetKeyword";
    SyntaxKind[SyntaxKind["InferKeyword"] = 140] = "InferKeyword";
    SyntaxKind[SyntaxKind["IntrinsicKeyword"] = 141] = "IntrinsicKeyword";
    SyntaxKind[SyntaxKind["IsKeyword"] = 142] = "IsKeyword";
    SyntaxKind[SyntaxKind["KeyOfKeyword"] = 143] = "KeyOfKeyword";
    SyntaxKind[SyntaxKind["ModuleKeyword"] = 144] = "ModuleKeyword";
    SyntaxKind[SyntaxKind["NamespaceKeyword"] = 145] = "NamespaceKeyword";
    SyntaxKind[SyntaxKind["NeverKeyword"] = 146] = "NeverKeyword";
    SyntaxKind[SyntaxKind["OutKeyword"] = 147] = "OutKeyword";
    SyntaxKind[SyntaxKind["ReadonlyKeyword"] = 148] = "ReadonlyKeyword";
    SyntaxKind[SyntaxKind["RequireKeyword"] = 149] = "RequireKeyword";
    SyntaxKind[SyntaxKind["NumberKeyword"] = 150] = "NumberKeyword";
    SyntaxKind[SyntaxKind["ObjectKeyword"] = 151] = "ObjectKeyword";
    SyntaxKind[SyntaxKind["SatisfiesKeyword"] = 152] = "SatisfiesKeyword";
    SyntaxKind[SyntaxKind["SetKeyword"] = 153] = "SetKeyword";
    SyntaxKind[SyntaxKind["StringKeyword"] = 154] = "StringKeyword";
    SyntaxKind[SyntaxKind["SymbolKeyword"] = 155] = "SymbolKeyword";
    SyntaxKind[SyntaxKind["TypeKeyword"] = 156] = "TypeKeyword";
    SyntaxKind[SyntaxKind["UndefinedKeyword"] = 157] = "UndefinedKeyword";
    SyntaxKind[SyntaxKind["UniqueKeyword"] = 158] = "UniqueKeyword";
    SyntaxKind[SyntaxKind["UnknownKeyword"] = 159] = "UnknownKeyword";
    SyntaxKind[SyntaxKind["UsingKeyword"] = 160] = "UsingKeyword";
    SyntaxKind[SyntaxKind["FromKeyword"] = 161] = "FromKeyword";
    SyntaxKind[SyntaxKind["GlobalKeyword"] = 162] = "GlobalKeyword";
    SyntaxKind[SyntaxKind["BigIntKeyword"] = 163] = "BigIntKeyword";
    SyntaxKind[SyntaxKind["OverrideKeyword"] = 164] = "OverrideKeyword";
    SyntaxKind[SyntaxKind["OfKeyword"] = 165] = "OfKeyword";
    // Parse tree nodes
    // Names
    SyntaxKind[SyntaxKind["QualifiedName"] = 166] = "QualifiedName";
    SyntaxKind[SyntaxKind["ComputedPropertyName"] = 167] = "ComputedPropertyName";
    // Signature elements
    SyntaxKind[SyntaxKind["TypeParameter"] = 168] = "TypeParameter";
    SyntaxKind[SyntaxKind["Parameter"] = 169] = "Parameter";
    SyntaxKind[SyntaxKind["Decorator"] = 170] = "Decorator";
    // TypeMember
    SyntaxKind[SyntaxKind["PropertySignature"] = 171] = "PropertySignature";
    SyntaxKind[SyntaxKind["PropertyDeclaration"] = 172] = "PropertyDeclaration";
    SyntaxKind[SyntaxKind["MethodSignature"] = 173] = "MethodSignature";
    SyntaxKind[SyntaxKind["MethodDeclaration"] = 174] = "MethodDeclaration";
    SyntaxKind[SyntaxKind["ClassStaticBlockDeclaration"] = 175] = "ClassStaticBlockDeclaration";
    SyntaxKind[SyntaxKind["Constructor"] = 176] = "Constructor";
    SyntaxKind[SyntaxKind["GetAccessor"] = 177] = "GetAccessor";
    SyntaxKind[SyntaxKind["SetAccessor"] = 178] = "SetAccessor";
    SyntaxKind[SyntaxKind["CallSignature"] = 179] = "CallSignature";
    SyntaxKind[SyntaxKind["ConstructSignature"] = 180] = "ConstructSignature";
    SyntaxKind[SyntaxKind["IndexSignature"] = 181] = "IndexSignature";
    // Type
    SyntaxKind[SyntaxKind["TypePredicate"] = 182] = "TypePredicate";
    SyntaxKind[SyntaxKind["TypeReference"] = 183] = "TypeReference";
    SyntaxKind[SyntaxKind["FunctionType"] = 184] = "FunctionType";
    SyntaxKind[SyntaxKind["ConstructorType"] = 185] = "ConstructorType";
    SyntaxKind[SyntaxKind["TypeQuery"] = 186] = "TypeQuery";
    SyntaxKind[SyntaxKind["TypeLiteral"] = 187] = "TypeLiteral";
    SyntaxKind[SyntaxKind["ArrayType"] = 188] = "ArrayType";
    SyntaxKind[SyntaxKind["TupleType"] = 189] = "TupleType";
    SyntaxKind[SyntaxKind["OptionalType"] = 190] = "OptionalType";
    SyntaxKind[SyntaxKind["RestType"] = 191] = "RestType";
    SyntaxKind[SyntaxKind["UnionType"] = 192] = "UnionType";
    SyntaxKind[SyntaxKind["IntersectionType"] = 193] = "IntersectionType";
    SyntaxKind[SyntaxKind["ConditionalType"] = 194] = "ConditionalType";
    SyntaxKind[SyntaxKind["InferType"] = 195] = "InferType";
    SyntaxKind[SyntaxKind["ParenthesizedType"] = 196] = "ParenthesizedType";
    SyntaxKind[SyntaxKind["ThisType"] = 197] = "ThisType";
    SyntaxKind[SyntaxKind["TypeOperator"] = 198] = "TypeOperator";
    SyntaxKind[SyntaxKind["IndexedAccessType"] = 199] = "IndexedAccessType";
    SyntaxKind[SyntaxKind["MappedType"] = 200] = "MappedType";
    SyntaxKind[SyntaxKind["LiteralType"] = 201] = "LiteralType";
    SyntaxKind[SyntaxKind["NamedTupleMember"] = 202] = "NamedTupleMember";
    SyntaxKind[SyntaxKind["TemplateLiteralType"] = 203] = "TemplateLiteralType";
    SyntaxKind[SyntaxKind["TemplateLiteralTypeSpan"] = 204] = "TemplateLiteralTypeSpan";
    SyntaxKind[SyntaxKind["ImportType"] = 205] = "ImportType";
    // Binding patterns
    SyntaxKind[SyntaxKind["ObjectBindingPattern"] = 206] = "ObjectBindingPattern";
    SyntaxKind[SyntaxKind["ArrayBindingPattern"] = 207] = "ArrayBindingPattern";
    SyntaxKind[SyntaxKind["BindingElement"] = 208] = "BindingElement";
    // Expression
    SyntaxKind[SyntaxKind["ArrayLiteralExpression"] = 209] = "ArrayLiteralExpression";
    SyntaxKind[SyntaxKind["ObjectLiteralExpression"] = 210] = "ObjectLiteralExpression";
    SyntaxKind[SyntaxKind["PropertyAccessExpression"] = 211] = "PropertyAccessExpression";
    SyntaxKind[SyntaxKind["ElementAccessExpression"] = 212] = "ElementAccessExpression";
    SyntaxKind[SyntaxKind["CallExpression"] = 213] = "CallExpression";
    SyntaxKind[SyntaxKind["NewExpression"] = 214] = "NewExpression";
    SyntaxKind[SyntaxKind["TaggedTemplateExpression"] = 215] = "TaggedTemplateExpression";
    SyntaxKind[SyntaxKind["TypeAssertionExpression"] = 216] = "TypeAssertionExpression";
    SyntaxKind[SyntaxKind["ParenthesizedExpression"] = 217] = "ParenthesizedExpression";
    SyntaxKind[SyntaxKind["FunctionExpression"] = 218] = "FunctionExpression";
    SyntaxKind[SyntaxKind["ArrowFunction"] = 219] = "ArrowFunction";
    SyntaxKind[SyntaxKind["DeleteExpression"] = 220] = "DeleteExpression";
    SyntaxKind[SyntaxKind["TypeOfExpression"] = 221] = "TypeOfExpression";
    SyntaxKind[SyntaxKind["VoidExpression"] = 222] = "VoidExpression";
    SyntaxKind[SyntaxKind["AwaitExpression"] = 223] = "AwaitExpression";
    SyntaxKind[SyntaxKind["PrefixUnaryExpression"] = 224] = "PrefixUnaryExpression";
    SyntaxKind[SyntaxKind["PostfixUnaryExpression"] = 225] = "PostfixUnaryExpression";
    SyntaxKind[SyntaxKind["BinaryExpression"] = 226] = "BinaryExpression";
    SyntaxKind[SyntaxKind["ConditionalExpression"] = 227] = "ConditionalExpression";
    SyntaxKind[SyntaxKind["TemplateExpression"] = 228] = "TemplateExpression";
    SyntaxKind[SyntaxKind["YieldExpression"] = 229] = "YieldExpression";
    SyntaxKind[SyntaxKind["SpreadElement"] = 230] = "SpreadElement";
    SyntaxKind[SyntaxKind["ClassExpression"] = 231] = "ClassExpression";
    SyntaxKind[SyntaxKind["OmittedExpression"] = 232] = "OmittedExpression";
    SyntaxKind[SyntaxKind["ExpressionWithTypeArguments"] = 233] = "ExpressionWithTypeArguments";
    SyntaxKind[SyntaxKind["AsExpression"] = 234] = "AsExpression";
    SyntaxKind[SyntaxKind["NonNullExpression"] = 235] = "NonNullExpression";
    SyntaxKind[SyntaxKind["MetaProperty"] = 236] = "MetaProperty";
    SyntaxKind[SyntaxKind["SyntheticExpression"] = 237] = "SyntheticExpression";
    SyntaxKind[SyntaxKind["SatisfiesExpression"] = 238] = "SatisfiesExpression";
    // Misc
    SyntaxKind[SyntaxKind["TemplateSpan"] = 239] = "TemplateSpan";
    SyntaxKind[SyntaxKind["SemicolonClassElement"] = 240] = "SemicolonClassElement";
    // Element
    SyntaxKind[SyntaxKind["Block"] = 241] = "Block";
    SyntaxKind[SyntaxKind["EmptyStatement"] = 242] = "EmptyStatement";
    SyntaxKind[SyntaxKind["VariableStatement"] = 243] = "VariableStatement";
    SyntaxKind[SyntaxKind["ExpressionStatement"] = 244] = "ExpressionStatement";
    SyntaxKind[SyntaxKind["IfStatement"] = 245] = "IfStatement";
    SyntaxKind[SyntaxKind["DoStatement"] = 246] = "DoStatement";
    SyntaxKind[SyntaxKind["WhileStatement"] = 247] = "WhileStatement";
    SyntaxKind[SyntaxKind["ForStatement"] = 248] = "ForStatement";
    SyntaxKind[SyntaxKind["ForInStatement"] = 249] = "ForInStatement";
    SyntaxKind[SyntaxKind["ForOfStatement"] = 250] = "ForOfStatement";
    SyntaxKind[SyntaxKind["ContinueStatement"] = 251] = "ContinueStatement";
    SyntaxKind[SyntaxKind["BreakStatement"] = 252] = "BreakStatement";
    SyntaxKind[SyntaxKind["ReturnStatement"] = 253] = "ReturnStatement";
    SyntaxKind[SyntaxKind["WithStatement"] = 254] = "WithStatement";
    SyntaxKind[SyntaxKind["SwitchStatement"] = 255] = "SwitchStatement";
    SyntaxKind[SyntaxKind["LabeledStatement"] = 256] = "LabeledStatement";
    SyntaxKind[SyntaxKind["ThrowStatement"] = 257] = "ThrowStatement";
    SyntaxKind[SyntaxKind["TryStatement"] = 258] = "TryStatement";
    SyntaxKind[SyntaxKind["DebuggerStatement"] = 259] = "DebuggerStatement";
    SyntaxKind[SyntaxKind["VariableDeclaration"] = 260] = "VariableDeclaration";
    SyntaxKind[SyntaxKind["VariableDeclarationList"] = 261] = "VariableDeclarationList";
    SyntaxKind[SyntaxKind["FunctionDeclaration"] = 262] = "FunctionDeclaration";
    SyntaxKind[SyntaxKind["ClassDeclaration"] = 263] = "ClassDeclaration";
    SyntaxKind[SyntaxKind["InterfaceDeclaration"] = 264] = "InterfaceDeclaration";
    SyntaxKind[SyntaxKind["TypeAliasDeclaration"] = 265] = "TypeAliasDeclaration";
    SyntaxKind[SyntaxKind["EnumDeclaration"] = 266] = "EnumDeclaration";
    SyntaxKind[SyntaxKind["ModuleDeclaration"] = 267] = "ModuleDeclaration";
    SyntaxKind[SyntaxKind["ModuleBlock"] = 268] = "ModuleBlock";
    SyntaxKind[SyntaxKind["CaseBlock"] = 269] = "CaseBlock";
    SyntaxKind[SyntaxKind["NamespaceExportDeclaration"] = 270] = "NamespaceExportDeclaration";
    SyntaxKind[SyntaxKind["ImportEqualsDeclaration"] = 271] = "ImportEqualsDeclaration";
    SyntaxKind[SyntaxKind["ImportDeclaration"] = 272] = "ImportDeclaration";
    SyntaxKind[SyntaxKind["ImportClause"] = 273] = "ImportClause";
    SyntaxKind[SyntaxKind["NamespaceImport"] = 274] = "NamespaceImport";
    SyntaxKind[SyntaxKind["NamedImports"] = 275] = "NamedImports";
    SyntaxKind[SyntaxKind["ImportSpecifier"] = 276] = "ImportSpecifier";
    SyntaxKind[SyntaxKind["ExportAssignment"] = 277] = "ExportAssignment";
    SyntaxKind[SyntaxKind["ExportDeclaration"] = 278] = "ExportDeclaration";
    SyntaxKind[SyntaxKind["NamedExports"] = 279] = "NamedExports";
    SyntaxKind[SyntaxKind["NamespaceExport"] = 280] = "NamespaceExport";
    SyntaxKind[SyntaxKind["ExportSpecifier"] = 281] = "ExportSpecifier";
    SyntaxKind[SyntaxKind["MissingDeclaration"] = 282] = "MissingDeclaration";
    // Module references
    SyntaxKind[SyntaxKind["ExternalModuleReference"] = 283] = "ExternalModuleReference";
    // JSX
    SyntaxKind[SyntaxKind["JsxElement"] = 284] = "JsxElement";
    SyntaxKind[SyntaxKind["JsxSelfClosingElement"] = 285] = "JsxSelfClosingElement";
    SyntaxKind[SyntaxKind["JsxOpeningElement"] = 286] = "JsxOpeningElement";
    SyntaxKind[SyntaxKind["JsxClosingElement"] = 287] = "JsxClosingElement";
    SyntaxKind[SyntaxKind["JsxFragment"] = 288] = "JsxFragment";
    SyntaxKind[SyntaxKind["JsxOpeningFragment"] = 289] = "JsxOpeningFragment";
    SyntaxKind[SyntaxKind["JsxClosingFragment"] = 290] = "JsxClosingFragment";
    SyntaxKind[SyntaxKind["JsxAttribute"] = 291] = "JsxAttribute";
    SyntaxKind[SyntaxKind["JsxAttributes"] = 292] = "JsxAttributes";
    SyntaxKind[SyntaxKind["JsxSpreadAttribute"] = 293] = "JsxSpreadAttribute";
    SyntaxKind[SyntaxKind["JsxExpression"] = 294] = "JsxExpression";
    SyntaxKind[SyntaxKind["JsxNamespacedName"] = 295] = "JsxNamespacedName";
    // Clauses
    SyntaxKind[SyntaxKind["CaseClause"] = 296] = "CaseClause";
    SyntaxKind[SyntaxKind["DefaultClause"] = 297] = "DefaultClause";
    SyntaxKind[SyntaxKind["HeritageClause"] = 298] = "HeritageClause";
    SyntaxKind[SyntaxKind["CatchClause"] = 299] = "CatchClause";
    SyntaxKind[SyntaxKind["ImportAttributes"] = 300] = "ImportAttributes";
    SyntaxKind[SyntaxKind["ImportAttribute"] = 301] = "ImportAttribute";
    /** @deprecated */ SyntaxKind[SyntaxKind["AssertClause"] = 300] = "AssertClause";
    /** @deprecated */ SyntaxKind[SyntaxKind["AssertEntry"] = 301] = "AssertEntry";
    /** @deprecated */ SyntaxKind[SyntaxKind["ImportTypeAssertionContainer"] = 302] = "ImportTypeAssertionContainer";
    // Property assignments
    SyntaxKind[SyntaxKind["PropertyAssignment"] = 303] = "PropertyAssignment";
    SyntaxKind[SyntaxKind["ShorthandPropertyAssignment"] = 304] = "ShorthandPropertyAssignment";
    SyntaxKind[SyntaxKind["SpreadAssignment"] = 305] = "SpreadAssignment";
    // Enum
    SyntaxKind[SyntaxKind["EnumMember"] = 306] = "EnumMember";
    // Top-level nodes
    SyntaxKind[SyntaxKind["SourceFile"] = 307] = "SourceFile";
    SyntaxKind[SyntaxKind["Bundle"] = 308] = "Bundle";
    // JSDoc nodes
    SyntaxKind[SyntaxKind["JSDocTypeExpression"] = 309] = "JSDocTypeExpression";
    SyntaxKind[SyntaxKind["JSDocNameReference"] = 310] = "JSDocNameReference";
    SyntaxKind[SyntaxKind["JSDocMemberName"] = 311] = "JSDocMemberName";
    SyntaxKind[SyntaxKind["JSDocAllType"] = 312] = "JSDocAllType";
    SyntaxKind[SyntaxKind["JSDocUnknownType"] = 313] = "JSDocUnknownType";
    SyntaxKind[SyntaxKind["JSDocNullableType"] = 314] = "JSDocNullableType";
    SyntaxKind[SyntaxKind["JSDocNonNullableType"] = 315] = "JSDocNonNullableType";
    SyntaxKind[SyntaxKind["JSDocOptionalType"] = 316] = "JSDocOptionalType";
    SyntaxKind[SyntaxKind["JSDocFunctionType"] = 317] = "JSDocFunctionType";
    SyntaxKind[SyntaxKind["JSDocVariadicType"] = 318] = "JSDocVariadicType";
    SyntaxKind[SyntaxKind["JSDocNamepathType"] = 319] = "JSDocNamepathType";
    SyntaxKind[SyntaxKind["JSDoc"] = 320] = "JSDoc";
    /** @deprecated Use SyntaxKind.JSDoc */
    SyntaxKind[SyntaxKind["JSDocComment"] = 320] = "JSDocComment";
    SyntaxKind[SyntaxKind["JSDocText"] = 321] = "JSDocText";
    SyntaxKind[SyntaxKind["JSDocTypeLiteral"] = 322] = "JSDocTypeLiteral";
    SyntaxKind[SyntaxKind["JSDocSignature"] = 323] = "JSDocSignature";
    SyntaxKind[SyntaxKind["JSDocLink"] = 324] = "JSDocLink";
    SyntaxKind[SyntaxKind["JSDocLinkCode"] = 325] = "JSDocLinkCode";
    SyntaxKind[SyntaxKind["JSDocLinkPlain"] = 326] = "JSDocLinkPlain";
    SyntaxKind[SyntaxKind["JSDocTag"] = 327] = "JSDocTag";
    SyntaxKind[SyntaxKind["JSDocAugmentsTag"] = 328] = "JSDocAugmentsTag";
    SyntaxKind[SyntaxKind["JSDocImplementsTag"] = 329] = "JSDocImplementsTag";
    SyntaxKind[SyntaxKind["JSDocAuthorTag"] = 330] = "JSDocAuthorTag";
    SyntaxKind[SyntaxKind["JSDocDeprecatedTag"] = 331] = "JSDocDeprecatedTag";
    SyntaxKind[SyntaxKind["JSDocClassTag"] = 332] = "JSDocClassTag";
    SyntaxKind[SyntaxKind["JSDocPublicTag"] = 333] = "JSDocPublicTag";
    SyntaxKind[SyntaxKind["JSDocPrivateTag"] = 334] = "JSDocPrivateTag";
    SyntaxKind[SyntaxKind["JSDocProtectedTag"] = 335] = "JSDocProtectedTag";
    SyntaxKind[SyntaxKind["JSDocReadonlyTag"] = 336] = "JSDocReadonlyTag";
    SyntaxKind[SyntaxKind["JSDocOverrideTag"] = 337] = "JSDocOverrideTag";
    SyntaxKind[SyntaxKind["JSDocCallbackTag"] = 338] = "JSDocCallbackTag";
    SyntaxKind[SyntaxKind["JSDocOverloadTag"] = 339] = "JSDocOverloadTag";
    SyntaxKind[SyntaxKind["JSDocEnumTag"] = 340] = "JSDocEnumTag";
    SyntaxKind[SyntaxKind["JSDocParameterTag"] = 341] = "JSDocParameterTag";
    SyntaxKind[SyntaxKind["JSDocReturnTag"] = 342] = "JSDocReturnTag";
    SyntaxKind[SyntaxKind["JSDocThisTag"] = 343] = "JSDocThisTag";
    SyntaxKind[SyntaxKind["JSDocTypeTag"] = 344] = "JSDocTypeTag";
    SyntaxKind[SyntaxKind["JSDocTemplateTag"] = 345] = "JSDocTemplateTag";
    SyntaxKind[SyntaxKind["JSDocTypedefTag"] = 346] = "JSDocTypedefTag";
    SyntaxKind[SyntaxKind["JSDocSeeTag"] = 347] = "JSDocSeeTag";
    SyntaxKind[SyntaxKind["JSDocPropertyTag"] = 348] = "JSDocPropertyTag";
    SyntaxKind[SyntaxKind["JSDocThrowsTag"] = 349] = "JSDocThrowsTag";
    SyntaxKind[SyntaxKind["JSDocSatisfiesTag"] = 350] = "JSDocSatisfiesTag";
    SyntaxKind[SyntaxKind["JSDocImportTag"] = 351] = "JSDocImportTag";
    // Synthesized list
    SyntaxKind[SyntaxKind["SyntaxList"] = 352] = "SyntaxList";
    // Transformation nodes
    SyntaxKind[SyntaxKind["NotEmittedStatement"] = 353] = "NotEmittedStatement";
    SyntaxKind[SyntaxKind["NotEmittedTypeElement"] = 354] = "NotEmittedTypeElement";
    SyntaxKind[SyntaxKind["PartiallyEmittedExpression"] = 355] = "PartiallyEmittedExpression";
    SyntaxKind[SyntaxKind["CommaListExpression"] = 356] = "CommaListExpression";
    SyntaxKind[SyntaxKind["SyntheticReferenceExpression"] = 357] = "SyntheticReferenceExpression";
    // Enum value count
    SyntaxKind[SyntaxKind["Count"] = 358] = "Count";
    // Markers
    SyntaxKind[SyntaxKind["FirstAssignment"] = 64] = "FirstAssignment";
    SyntaxKind[SyntaxKind["LastAssignment"] = 79] = "LastAssignment";
    SyntaxKind[SyntaxKind["FirstCompoundAssignment"] = 65] = "FirstCompoundAssignment";
    SyntaxKind[SyntaxKind["LastCompoundAssignment"] = 79] = "LastCompoundAssignment";
    SyntaxKind[SyntaxKind["FirstReservedWord"] = 83] = "FirstReservedWord";
    SyntaxKind[SyntaxKind["LastReservedWord"] = 118] = "LastReservedWord";
    SyntaxKind[SyntaxKind["FirstKeyword"] = 83] = "FirstKeyword";
    SyntaxKind[SyntaxKind["LastKeyword"] = 165] = "LastKeyword";
    SyntaxKind[SyntaxKind["FirstFutureReservedWord"] = 119] = "FirstFutureReservedWord";
    SyntaxKind[SyntaxKind["LastFutureReservedWord"] = 127] = "LastFutureReservedWord";
    SyntaxKind[SyntaxKind["FirstTypeNode"] = 182] = "FirstTypeNode";
    SyntaxKind[SyntaxKind["LastTypeNode"] = 205] = "LastTypeNode";
    SyntaxKind[SyntaxKind["FirstPunctuation"] = 19] = "FirstPunctuation";
    SyntaxKind[SyntaxKind["LastPunctuation"] = 79] = "LastPunctuation";
    SyntaxKind[SyntaxKind["FirstToken"] = 0] = "FirstToken";
    SyntaxKind[SyntaxKind["LastToken"] = 165] = "LastToken";
    SyntaxKind[SyntaxKind["FirstTriviaToken"] = 2] = "FirstTriviaToken";
    SyntaxKind[SyntaxKind["LastTriviaToken"] = 7] = "LastTriviaToken";
    SyntaxKind[SyntaxKind["FirstLiteralToken"] = 9] = "FirstLiteralToken";
    SyntaxKind[SyntaxKind["LastLiteralToken"] = 15] = "LastLiteralToken";
    SyntaxKind[SyntaxKind["FirstTemplateToken"] = 15] = "FirstTemplateToken";
    SyntaxKind[SyntaxKind["LastTemplateToken"] = 18] = "LastTemplateToken";
    SyntaxKind[SyntaxKind["FirstBinaryOperator"] = 30] = "FirstBinaryOperator";
    SyntaxKind[SyntaxKind["LastBinaryOperator"] = 79] = "LastBinaryOperator";
    SyntaxKind[SyntaxKind["FirstStatement"] = 243] = "FirstStatement";
    SyntaxKind[SyntaxKind["LastStatement"] = 259] = "LastStatement";
    SyntaxKind[SyntaxKind["FirstNode"] = 166] = "FirstNode";
    SyntaxKind[SyntaxKind["FirstJSDocNode"] = 309] = "FirstJSDocNode";
    SyntaxKind[SyntaxKind["LastJSDocNode"] = 351] = "LastJSDocNode";
    SyntaxKind[SyntaxKind["FirstJSDocTagNode"] = 327] = "FirstJSDocTagNode";
    SyntaxKind[SyntaxKind["LastJSDocTagNode"] = 351] = "LastJSDocTagNode";
    /** @internal */ SyntaxKind[SyntaxKind["FirstContextualKeyword"] = 128] = "FirstContextualKeyword";
    /** @internal */ SyntaxKind[SyntaxKind["LastContextualKeyword"] = 165] = "LastContextualKeyword";
})(SyntaxKind || (SyntaxKind = {}));
// dprint-ignore
export var NodeFlags;
(function (NodeFlags) {
    NodeFlags[NodeFlags["None"] = 0] = "None";
    NodeFlags[NodeFlags["Let"] = 1] = "Let";
    NodeFlags[NodeFlags["Const"] = 2] = "Const";
    NodeFlags[NodeFlags["Using"] = 4] = "Using";
    NodeFlags[NodeFlags["AwaitUsing"] = 6] = "AwaitUsing";
    NodeFlags[NodeFlags["NestedNamespace"] = 8] = "NestedNamespace";
    NodeFlags[NodeFlags["Synthesized"] = 16] = "Synthesized";
    NodeFlags[NodeFlags["Namespace"] = 32] = "Namespace";
    NodeFlags[NodeFlags["OptionalChain"] = 64] = "OptionalChain";
    NodeFlags[NodeFlags["ExportContext"] = 128] = "ExportContext";
    NodeFlags[NodeFlags["ContainsThis"] = 256] = "ContainsThis";
    NodeFlags[NodeFlags["HasImplicitReturn"] = 512] = "HasImplicitReturn";
    NodeFlags[NodeFlags["HasExplicitReturn"] = 1024] = "HasExplicitReturn";
    NodeFlags[NodeFlags["GlobalAugmentation"] = 2048] = "GlobalAugmentation";
    NodeFlags[NodeFlags["HasAsyncFunctions"] = 4096] = "HasAsyncFunctions";
    NodeFlags[NodeFlags["DisallowInContext"] = 8192] = "DisallowInContext";
    NodeFlags[NodeFlags["YieldContext"] = 16384] = "YieldContext";
    NodeFlags[NodeFlags["DecoratorContext"] = 32768] = "DecoratorContext";
    NodeFlags[NodeFlags["AwaitContext"] = 65536] = "AwaitContext";
    NodeFlags[NodeFlags["DisallowConditionalTypesContext"] = 131072] = "DisallowConditionalTypesContext";
    NodeFlags[NodeFlags["ThisNodeHasError"] = 262144] = "ThisNodeHasError";
    NodeFlags[NodeFlags["JavaScriptFile"] = 524288] = "JavaScriptFile";
    NodeFlags[NodeFlags["ThisNodeOrAnySubNodesHasError"] = 1048576] = "ThisNodeOrAnySubNodesHasError";
    NodeFlags[NodeFlags["HasAggregatedChildData"] = 2097152] = "HasAggregatedChildData";
    // These flags will be set when the parser encounters a dynamic import expression or 'import.meta' to avoid
    // walking the tree if the flags are not set. However, these flags are just a approximation
    // (hence why it's named "PossiblyContainsDynamicImport") because once set, the flags never get cleared.
    // During editing, if a dynamic import is removed, incremental parsing will *NOT* clear this flag.
    // This means that the tree will always be traversed during module resolution, or when looking for external module indicators.
    // However, the removal operation should not occur often and in the case of the
    // removal, it is likely that users will add the import anyway.
    // The advantage of this approach is its simplicity. For the case of batch compilation,
    // we guarantee that users won't have to pay the price of walking the tree if a dynamic import isn't used.
    /** @internal */ NodeFlags[NodeFlags["PossiblyContainsDynamicImport"] = 4194304] = "PossiblyContainsDynamicImport";
    /** @internal */ NodeFlags[NodeFlags["PossiblyContainsImportMeta"] = 8388608] = "PossiblyContainsImportMeta";
    NodeFlags[NodeFlags["JSDoc"] = 16777216] = "JSDoc";
    /** @internal */ NodeFlags[NodeFlags["Ambient"] = 33554432] = "Ambient";
    /** @internal */ NodeFlags[NodeFlags["InWithStatement"] = 67108864] = "InWithStatement";
    NodeFlags[NodeFlags["JsonFile"] = 134217728] = "JsonFile";
    /** @internal */ NodeFlags[NodeFlags["TypeCached"] = 268435456] = "TypeCached";
    /** @internal */ NodeFlags[NodeFlags["Deprecated"] = 536870912] = "Deprecated";
    NodeFlags[NodeFlags["BlockScoped"] = 7] = "BlockScoped";
    NodeFlags[NodeFlags["Constant"] = 6] = "Constant";
    NodeFlags[NodeFlags["ReachabilityCheckFlags"] = 1536] = "ReachabilityCheckFlags";
    NodeFlags[NodeFlags["ReachabilityAndEmitFlags"] = 5632] = "ReachabilityAndEmitFlags";
    // Parsing context flags
    NodeFlags[NodeFlags["ContextFlags"] = 101441536] = "ContextFlags";
    // Exclude these flags when parsing a Type
    NodeFlags[NodeFlags["TypeExcludesFlags"] = 81920] = "TypeExcludesFlags";
    // Represents all flags that are potentially set once and
    // never cleared on SourceFiles which get re-used in between incremental parses.
    // See the comment above on `PossiblyContainsDynamicImport` and `PossiblyContainsImportMeta`.
    /** @internal */ NodeFlags[NodeFlags["PermanentlySetIncrementalFlags"] = 12582912] = "PermanentlySetIncrementalFlags";
    // The following flags repurpose other NodeFlags as different meanings for Identifier nodes
    /** @internal */ NodeFlags[NodeFlags["IdentifierHasExtendedUnicodeEscape"] = 256] = "IdentifierHasExtendedUnicodeEscape";
    /** @internal */ NodeFlags[NodeFlags["IdentifierIsInJSDocNamespace"] = 4096] = "IdentifierIsInJSDocNamespace";
})(NodeFlags || (NodeFlags = {}));


// dprint-ignore
export var ModifierFlags;
(function (ModifierFlags) {
    ModifierFlags[ModifierFlags["None"] = 0] = "None";
    // Syntactic/JSDoc modifiers
    ModifierFlags[ModifierFlags["Public"] = 1] = "Public";
    ModifierFlags[ModifierFlags["Private"] = 2] = "Private";
    ModifierFlags[ModifierFlags["Protected"] = 4] = "Protected";
    ModifierFlags[ModifierFlags["Readonly"] = 8] = "Readonly";
    ModifierFlags[ModifierFlags["Override"] = 16] = "Override";
    // Syntactic-only modifiers
    ModifierFlags[ModifierFlags["Export"] = 32] = "Export";
    ModifierFlags[ModifierFlags["Abstract"] = 64] = "Abstract";
    ModifierFlags[ModifierFlags["Ambient"] = 128] = "Ambient";
    ModifierFlags[ModifierFlags["Static"] = 256] = "Static";
    ModifierFlags[ModifierFlags["Accessor"] = 512] = "Accessor";
    ModifierFlags[ModifierFlags["Async"] = 1024] = "Async";
    ModifierFlags[ModifierFlags["Default"] = 2048] = "Default";
    ModifierFlags[ModifierFlags["Const"] = 4096] = "Const";
    ModifierFlags[ModifierFlags["In"] = 8192] = "In";
    ModifierFlags[ModifierFlags["Out"] = 16384] = "Out";
    ModifierFlags[ModifierFlags["Decorator"] = 32768] = "Decorator";
    // JSDoc-only modifiers
    ModifierFlags[ModifierFlags["Deprecated"] = 65536] = "Deprecated";
    // Cache-only JSDoc-modifiers. Should match order of Syntactic/JSDoc modifiers, above.
    /** @internal */ ModifierFlags[ModifierFlags["JSDocPublic"] = 8388608] = "JSDocPublic";
    /** @internal */ ModifierFlags[ModifierFlags["JSDocPrivate"] = 16777216] = "JSDocPrivate";
    /** @internal */ ModifierFlags[ModifierFlags["JSDocProtected"] = 33554432] = "JSDocProtected";
    /** @internal */ ModifierFlags[ModifierFlags["JSDocReadonly"] = 67108864] = "JSDocReadonly";
    /** @internal */ ModifierFlags[ModifierFlags["JSDocOverride"] = 134217728] = "JSDocOverride";
    /** @internal */ ModifierFlags[ModifierFlags["SyntacticOrJSDocModifiers"] = 31] = "SyntacticOrJSDocModifiers";
    /** @internal */ ModifierFlags[ModifierFlags["SyntacticOnlyModifiers"] = 65504] = "SyntacticOnlyModifiers";
    /** @internal */ ModifierFlags[ModifierFlags["SyntacticModifiers"] = 65535] = "SyntacticModifiers";
    /** @internal */ ModifierFlags[ModifierFlags["JSDocCacheOnlyModifiers"] = 260046848] = "JSDocCacheOnlyModifiers";
    /** @internal */ ModifierFlags[ModifierFlags["JSDocOnlyModifiers"] = 65536] = "JSDocOnlyModifiers";
    /** @internal */ ModifierFlags[ModifierFlags["NonCacheOnlyModifiers"] = 131071] = "NonCacheOnlyModifiers";
    ModifierFlags[ModifierFlags["HasComputedJSDocModifiers"] = 268435456] = "HasComputedJSDocModifiers";
    ModifierFlags[ModifierFlags["HasComputedFlags"] = 536870912] = "HasComputedFlags";
    ModifierFlags[ModifierFlags["AccessibilityModifier"] = 7] = "AccessibilityModifier";
    // Accessibility modifiers and 'readonly' can be attached to a parameter in a constructor to make it a property.
    ModifierFlags[ModifierFlags["ParameterPropertyModifier"] = 31] = "ParameterPropertyModifier";
    ModifierFlags[ModifierFlags["NonPublicAccessibilityModifier"] = 6] = "NonPublicAccessibilityModifier";
    ModifierFlags[ModifierFlags["TypeScriptModifier"] = 28895] = "TypeScriptModifier";
    ModifierFlags[ModifierFlags["ExportDefault"] = 2080] = "ExportDefault";
    ModifierFlags[ModifierFlags["All"] = 131071] = "All";
    ModifierFlags[ModifierFlags["Modifier"] = 98303] = "Modifier";
})(ModifierFlags || (ModifierFlags = {}));

export var JsxFlags;
(function (JsxFlags) {
    JsxFlags[JsxFlags["None"] = 0] = "None";
    /** An element from a named property of the JSX.IntrinsicElements interface */
    JsxFlags[JsxFlags["IntrinsicNamedElement"] = 1] = "IntrinsicNamedElement";
    /** An element inferred from the string index signature of the JSX.IntrinsicElements interface */
    JsxFlags[JsxFlags["IntrinsicIndexedElement"] = 2] = "IntrinsicIndexedElement";
    JsxFlags[JsxFlags["IntrinsicElement"] = 3] = "IntrinsicElement";
})(JsxFlags || (JsxFlags = {}));

// dprint-ignore
/** @internal */
export var RelationComparisonResult;
(function (RelationComparisonResult) {
    RelationComparisonResult[RelationComparisonResult["None"] = 0] = "None";
    RelationComparisonResult[RelationComparisonResult["Succeeded"] = 1] = "Succeeded";
    RelationComparisonResult[RelationComparisonResult["Failed"] = 2] = "Failed";
    RelationComparisonResult[RelationComparisonResult["ReportsUnmeasurable"] = 8] = "ReportsUnmeasurable";
    RelationComparisonResult[RelationComparisonResult["ReportsUnreliable"] = 16] = "ReportsUnreliable";
    RelationComparisonResult[RelationComparisonResult["ReportsMask"] = 24] = "ReportsMask";
    RelationComparisonResult[RelationComparisonResult["ComplexityOverflow"] = 32] = "ComplexityOverflow";
    RelationComparisonResult[RelationComparisonResult["StackDepthOverflow"] = 64] = "StackDepthOverflow";
    RelationComparisonResult[RelationComparisonResult["Overflow"] = 96] = "Overflow";
})(RelationComparisonResult || (RelationComparisonResult = {}));

/** @internal */
export var PredicateSemantics;
(function (PredicateSemantics) {
    PredicateSemantics[PredicateSemantics["None"] = 0] = "None";
    PredicateSemantics[PredicateSemantics["Always"] = 1] = "Always";
    PredicateSemantics[PredicateSemantics["Never"] = 2] = "Never";
    PredicateSemantics[PredicateSemantics["Sometimes"] = 3] = "Sometimes";
})(PredicateSemantics || (PredicateSemantics = {}));

// dprint-ignore
export var GeneratedIdentifierFlags;
(function (GeneratedIdentifierFlags) {
    // Kinds
    GeneratedIdentifierFlags[GeneratedIdentifierFlags["None"] = 0] = "None";
    /** @internal */ GeneratedIdentifierFlags[GeneratedIdentifierFlags["Auto"] = 1] = "Auto";
    /** @internal */ GeneratedIdentifierFlags[GeneratedIdentifierFlags["Loop"] = 2] = "Loop";
    /** @internal */ GeneratedIdentifierFlags[GeneratedIdentifierFlags["Unique"] = 3] = "Unique";
    /** @internal */ GeneratedIdentifierFlags[GeneratedIdentifierFlags["Node"] = 4] = "Node";
    /** @internal */ GeneratedIdentifierFlags[GeneratedIdentifierFlags["KindMask"] = 7] = "KindMask";
    // Flags
    GeneratedIdentifierFlags[GeneratedIdentifierFlags["ReservedInNestedScopes"] = 8] = "ReservedInNestedScopes";
    GeneratedIdentifierFlags[GeneratedIdentifierFlags["Optimistic"] = 16] = "Optimistic";
    GeneratedIdentifierFlags[GeneratedIdentifierFlags["FileLevel"] = 32] = "FileLevel";
    GeneratedIdentifierFlags[GeneratedIdentifierFlags["AllowNameSubstitution"] = 64] = "AllowNameSubstitution";
})(GeneratedIdentifierFlags || (GeneratedIdentifierFlags = {}));

// dprint-ignore
/** @internal */
export var RegularExpressionFlags;
(function (RegularExpressionFlags) {
    RegularExpressionFlags[RegularExpressionFlags["None"] = 0] = "None";
    RegularExpressionFlags[RegularExpressionFlags["HasIndices"] = 1] = "HasIndices";
    RegularExpressionFlags[RegularExpressionFlags["Global"] = 2] = "Global";
    RegularExpressionFlags[RegularExpressionFlags["IgnoreCase"] = 4] = "IgnoreCase";
    RegularExpressionFlags[RegularExpressionFlags["Multiline"] = 8] = "Multiline";
    RegularExpressionFlags[RegularExpressionFlags["DotAll"] = 16] = "DotAll";
    RegularExpressionFlags[RegularExpressionFlags["Unicode"] = 32] = "Unicode";
    RegularExpressionFlags[RegularExpressionFlags["UnicodeSets"] = 64] = "UnicodeSets";
    RegularExpressionFlags[RegularExpressionFlags["Sticky"] = 128] = "Sticky";
    RegularExpressionFlags[RegularExpressionFlags["AnyUnicodeMode"] = 96] = "AnyUnicodeMode";
    RegularExpressionFlags[RegularExpressionFlags["Modifiers"] = 28] = "Modifiers";
})(RegularExpressionFlags || (RegularExpressionFlags = {}));

// dprint-ignore
export var TokenFlags;
(function (TokenFlags) {
    TokenFlags[TokenFlags["None"] = 0] = "None";
    /** @internal */
    TokenFlags[TokenFlags["PrecedingLineBreak"] = 1] = "PrecedingLineBreak";
    /** @internal */
    TokenFlags[TokenFlags["PrecedingJSDocComment"] = 2] = "PrecedingJSDocComment";
    /** @internal */
    TokenFlags[TokenFlags["Unterminated"] = 4] = "Unterminated";
    /** @internal */
    TokenFlags[TokenFlags["ExtendedUnicodeEscape"] = 8] = "ExtendedUnicodeEscape";
    TokenFlags[TokenFlags["Scientific"] = 16] = "Scientific";
    TokenFlags[TokenFlags["Octal"] = 32] = "Octal";
    TokenFlags[TokenFlags["HexSpecifier"] = 64] = "HexSpecifier";
    TokenFlags[TokenFlags["BinarySpecifier"] = 128] = "BinarySpecifier";
    TokenFlags[TokenFlags["OctalSpecifier"] = 256] = "OctalSpecifier";
    /** @internal */
    TokenFlags[TokenFlags["ContainsSeparator"] = 512] = "ContainsSeparator";
    /** @internal */
    TokenFlags[TokenFlags["UnicodeEscape"] = 1024] = "UnicodeEscape";
    /** @internal */
    TokenFlags[TokenFlags["ContainsInvalidEscape"] = 2048] = "ContainsInvalidEscape";
    /** @internal */
    TokenFlags[TokenFlags["HexEscape"] = 4096] = "HexEscape";
    /** @internal */
    TokenFlags[TokenFlags["ContainsLeadingZero"] = 8192] = "ContainsLeadingZero";
    /** @internal */
    TokenFlags[TokenFlags["ContainsInvalidSeparator"] = 16384] = "ContainsInvalidSeparator";
    /** @internal */
    TokenFlags[TokenFlags["PrecedingJSDocLeadingAsterisks"] = 32768] = "PrecedingJSDocLeadingAsterisks";
    /** @internal */
    TokenFlags[TokenFlags["BinaryOrOctalSpecifier"] = 384] = "BinaryOrOctalSpecifier";
    /** @internal */
    TokenFlags[TokenFlags["WithSpecifier"] = 448] = "WithSpecifier";
    /** @internal */
    TokenFlags[TokenFlags["StringLiteralFlags"] = 7176] = "StringLiteralFlags";
    /** @internal */
    TokenFlags[TokenFlags["NumericLiteralFlags"] = 25584] = "NumericLiteralFlags";
    /** @internal */
    TokenFlags[TokenFlags["TemplateLiteralLikeFlags"] = 7176] = "TemplateLiteralLikeFlags";
    /** @internal */
    TokenFlags[TokenFlags["IsInvalid"] = 26656] = "IsInvalid";
})(TokenFlags || (TokenFlags = {}));

// NOTE: Ensure this is up-to-date with src/debug/debug.ts
// dprint-ignore
/** @internal */
export var FlowFlags;
(function (FlowFlags) {
    FlowFlags[FlowFlags["Unreachable"] = 1] = "Unreachable";
    FlowFlags[FlowFlags["Start"] = 2] = "Start";
    FlowFlags[FlowFlags["BranchLabel"] = 4] = "BranchLabel";
    FlowFlags[FlowFlags["LoopLabel"] = 8] = "LoopLabel";
    FlowFlags[FlowFlags["Assignment"] = 16] = "Assignment";
    FlowFlags[FlowFlags["TrueCondition"] = 32] = "TrueCondition";
    FlowFlags[FlowFlags["FalseCondition"] = 64] = "FalseCondition";
    FlowFlags[FlowFlags["SwitchClause"] = 128] = "SwitchClause";
    FlowFlags[FlowFlags["ArrayMutation"] = 256] = "ArrayMutation";
    FlowFlags[FlowFlags["Call"] = 512] = "Call";
    FlowFlags[FlowFlags["ReduceLabel"] = 1024] = "ReduceLabel";
    FlowFlags[FlowFlags["Referenced"] = 2048] = "Referenced";
    FlowFlags[FlowFlags["Shared"] = 4096] = "Shared";
    FlowFlags[FlowFlags["Label"] = 12] = "Label";
    FlowFlags[FlowFlags["Condition"] = 96] = "Condition";
})(FlowFlags || (FlowFlags = {}));

/** @internal */
export var CommentDirectiveType;
(function (CommentDirectiveType) {
    CommentDirectiveType[CommentDirectiveType["ExpectError"] = 0] = "ExpectError";
    CommentDirectiveType[CommentDirectiveType["Ignore"] = 1] = "Ignore";
})(CommentDirectiveType || (CommentDirectiveType = {}));
export class OperationCanceledException {
}

/** @internal */
export var FileIncludeKind;
(function (FileIncludeKind) {
    FileIncludeKind[FileIncludeKind["RootFile"] = 0] = "RootFile";
    FileIncludeKind[FileIncludeKind["SourceFromProjectReference"] = 1] = "SourceFromProjectReference";
    FileIncludeKind[FileIncludeKind["OutputFromProjectReference"] = 2] = "OutputFromProjectReference";
    FileIncludeKind[FileIncludeKind["Import"] = 3] = "Import";
    FileIncludeKind[FileIncludeKind["ReferenceFile"] = 4] = "ReferenceFile";
    FileIncludeKind[FileIncludeKind["TypeReferenceDirective"] = 5] = "TypeReferenceDirective";
    FileIncludeKind[FileIncludeKind["LibFile"] = 6] = "LibFile";
    FileIncludeKind[FileIncludeKind["LibReferenceDirective"] = 7] = "LibReferenceDirective";
    FileIncludeKind[FileIncludeKind["AutomaticTypeDirectiveFile"] = 8] = "AutomaticTypeDirectiveFile";
})(FileIncludeKind || (FileIncludeKind = {}));

/** @internal */
export var FilePreprocessingDiagnosticsKind;
(function (FilePreprocessingDiagnosticsKind) {
    FilePreprocessingDiagnosticsKind[FilePreprocessingDiagnosticsKind["FilePreprocessingLibReferenceDiagnostic"] = 0] = "FilePreprocessingLibReferenceDiagnostic";
    FilePreprocessingDiagnosticsKind[FilePreprocessingDiagnosticsKind["FilePreprocessingFileExplainingDiagnostic"] = 1] = "FilePreprocessingFileExplainingDiagnostic";
    FilePreprocessingDiagnosticsKind[FilePreprocessingDiagnosticsKind["ResolutionDiagnostics"] = 2] = "ResolutionDiagnostics";
})(FilePreprocessingDiagnosticsKind || (FilePreprocessingDiagnosticsKind = {}));

/** @internal */
export var EmitOnly;
(function (EmitOnly) {
    EmitOnly[EmitOnly["Js"] = 0] = "Js";
    EmitOnly[EmitOnly["Dts"] = 1] = "Dts";
    EmitOnly[EmitOnly["BuilderSignature"] = 2] = "BuilderSignature";
})(EmitOnly || (EmitOnly = {}));

/** @internal */
export var StructureIsReused;
(function (StructureIsReused) {
    StructureIsReused[StructureIsReused["Not"] = 0] = "Not";
    StructureIsReused[StructureIsReused["SafeModules"] = 1] = "SafeModules";
    StructureIsReused[StructureIsReused["Completely"] = 2] = "Completely";
})(StructureIsReused || (StructureIsReused = {}));

/** Return code used by getEmitOutput function to indicate status of the function */
export var ExitStatus;
(function (ExitStatus) {
    // Compiler ran successfully.  Either this was a simple do-nothing compilation (for example,
    // when -version or -help was provided, or this was a normal compilation, no diagnostics
    // were produced, and all outputs were generated successfully.
    ExitStatus[ExitStatus["Success"] = 0] = "Success";
    // Diagnostics were produced and because of them no code was generated.
    ExitStatus[ExitStatus["DiagnosticsPresent_OutputsSkipped"] = 1] = "DiagnosticsPresent_OutputsSkipped";
    // Diagnostics were produced and outputs were generated in spite of them.
    ExitStatus[ExitStatus["DiagnosticsPresent_OutputsGenerated"] = 2] = "DiagnosticsPresent_OutputsGenerated";
    // When build skipped because passed in project is invalid
    ExitStatus[ExitStatus["InvalidProject_OutputsSkipped"] = 3] = "InvalidProject_OutputsSkipped";
    // When build is skipped because project references form cycle
    ExitStatus[ExitStatus["ProjectReferenceCycle_OutputsSkipped"] = 4] = "ProjectReferenceCycle_OutputsSkipped";
})(ExitStatus || (ExitStatus = {}));

/** @internal */
export var MemberOverrideStatus;
(function (MemberOverrideStatus) {
    MemberOverrideStatus[MemberOverrideStatus["Ok"] = 0] = "Ok";
    MemberOverrideStatus[MemberOverrideStatus["NeedsOverride"] = 1] = "NeedsOverride";
    MemberOverrideStatus[MemberOverrideStatus["HasInvalidOverride"] = 2] = "HasInvalidOverride";
})(MemberOverrideStatus || (MemberOverrideStatus = {}));

/** @internal */
export var UnionReduction;
(function (UnionReduction) {
    UnionReduction[UnionReduction["None"] = 0] = "None";
    UnionReduction[UnionReduction["Literal"] = 1] = "Literal";
    UnionReduction[UnionReduction["Subtype"] = 2] = "Subtype";
})(UnionReduction || (UnionReduction = {}));

/** @internal */
export var IntersectionFlags;
(function (IntersectionFlags) {
    IntersectionFlags[IntersectionFlags["None"] = 0] = "None";
    IntersectionFlags[IntersectionFlags["NoSupertypeReduction"] = 1] = "NoSupertypeReduction";
    IntersectionFlags[IntersectionFlags["NoConstraintReduction"] = 2] = "NoConstraintReduction";
})(IntersectionFlags || (IntersectionFlags = {}));

// dprint-ignore
/** @internal */
export var ContextFlags;
(function (ContextFlags) {
    ContextFlags[ContextFlags["None"] = 0] = "None";
    ContextFlags[ContextFlags["Signature"] = 1] = "Signature";
    ContextFlags[ContextFlags["NoConstraints"] = 2] = "NoConstraints";
    ContextFlags[ContextFlags["Completions"] = 4] = "Completions";
    ContextFlags[ContextFlags["SkipBindingPatterns"] = 8] = "SkipBindingPatterns";
})(ContextFlags || (ContextFlags = {}));

// NOTE: If modifying this enum, must modify `TypeFormatFlags` too!
// dprint-ignore
export var NodeBuilderFlags;
(function (NodeBuilderFlags) {
    NodeBuilderFlags[NodeBuilderFlags["None"] = 0] = "None";
    // Options
    NodeBuilderFlags[NodeBuilderFlags["NoTruncation"] = 1] = "NoTruncation";
    NodeBuilderFlags[NodeBuilderFlags["WriteArrayAsGenericType"] = 2] = "WriteArrayAsGenericType";
    NodeBuilderFlags[NodeBuilderFlags["GenerateNamesForShadowedTypeParams"] = 4] = "GenerateNamesForShadowedTypeParams";
    NodeBuilderFlags[NodeBuilderFlags["UseStructuralFallback"] = 8] = "UseStructuralFallback";
    NodeBuilderFlags[NodeBuilderFlags["ForbidIndexedAccessSymbolReferences"] = 16] = "ForbidIndexedAccessSymbolReferences";
    NodeBuilderFlags[NodeBuilderFlags["WriteTypeArgumentsOfSignature"] = 32] = "WriteTypeArgumentsOfSignature";
    NodeBuilderFlags[NodeBuilderFlags["UseFullyQualifiedType"] = 64] = "UseFullyQualifiedType";
    NodeBuilderFlags[NodeBuilderFlags["UseOnlyExternalAliasing"] = 128] = "UseOnlyExternalAliasing";
    NodeBuilderFlags[NodeBuilderFlags["SuppressAnyReturnType"] = 256] = "SuppressAnyReturnType";
    NodeBuilderFlags[NodeBuilderFlags["WriteTypeParametersInQualifiedName"] = 512] = "WriteTypeParametersInQualifiedName";
    NodeBuilderFlags[NodeBuilderFlags["MultilineObjectLiterals"] = 1024] = "MultilineObjectLiterals";
    NodeBuilderFlags[NodeBuilderFlags["WriteClassExpressionAsTypeLiteral"] = 2048] = "WriteClassExpressionAsTypeLiteral";
    NodeBuilderFlags[NodeBuilderFlags["UseTypeOfFunction"] = 4096] = "UseTypeOfFunction";
    NodeBuilderFlags[NodeBuilderFlags["OmitParameterModifiers"] = 8192] = "OmitParameterModifiers";
    NodeBuilderFlags[NodeBuilderFlags["UseAliasDefinedOutsideCurrentScope"] = 16384] = "UseAliasDefinedOutsideCurrentScope";
    NodeBuilderFlags[NodeBuilderFlags["UseSingleQuotesForStringLiteralType"] = 268435456] = "UseSingleQuotesForStringLiteralType";
    NodeBuilderFlags[NodeBuilderFlags["NoTypeReduction"] = 536870912] = "NoTypeReduction";
    NodeBuilderFlags[NodeBuilderFlags["OmitThisParameter"] = 33554432] = "OmitThisParameter";
    // Error handling
    NodeBuilderFlags[NodeBuilderFlags["AllowThisInObjectLiteral"] = 32768] = "AllowThisInObjectLiteral";
    NodeBuilderFlags[NodeBuilderFlags["AllowQualifiedNameInPlaceOfIdentifier"] = 65536] = "AllowQualifiedNameInPlaceOfIdentifier";
    NodeBuilderFlags[NodeBuilderFlags["AllowAnonymousIdentifier"] = 131072] = "AllowAnonymousIdentifier";
    NodeBuilderFlags[NodeBuilderFlags["AllowEmptyUnionOrIntersection"] = 262144] = "AllowEmptyUnionOrIntersection";
    NodeBuilderFlags[NodeBuilderFlags["AllowEmptyTuple"] = 524288] = "AllowEmptyTuple";
    NodeBuilderFlags[NodeBuilderFlags["AllowUniqueESSymbolType"] = 1048576] = "AllowUniqueESSymbolType";
    NodeBuilderFlags[NodeBuilderFlags["AllowEmptyIndexInfoType"] = 2097152] = "AllowEmptyIndexInfoType";
    // Errors (cont.)
    NodeBuilderFlags[NodeBuilderFlags["AllowNodeModulesRelativePaths"] = 67108864] = "AllowNodeModulesRelativePaths";
    NodeBuilderFlags[NodeBuilderFlags["IgnoreErrors"] = 70221824] = "IgnoreErrors";
    // State
    NodeBuilderFlags[NodeBuilderFlags["InObjectTypeLiteral"] = 4194304] = "InObjectTypeLiteral";
    NodeBuilderFlags[NodeBuilderFlags["InTypeAlias"] = 8388608] = "InTypeAlias";
    NodeBuilderFlags[NodeBuilderFlags["InInitialEntityName"] = 16777216] = "InInitialEntityName";
})(NodeBuilderFlags || (NodeBuilderFlags = {}));

/** @internal */
// dprint-ignore
export var InternalNodeBuilderFlags;
(function (InternalNodeBuilderFlags) {
    InternalNodeBuilderFlags[InternalNodeBuilderFlags["None"] = 0] = "None";
    InternalNodeBuilderFlags[InternalNodeBuilderFlags["WriteComputedProps"] = 1] = "WriteComputedProps";
    InternalNodeBuilderFlags[InternalNodeBuilderFlags["NoSyntacticPrinter"] = 2] = "NoSyntacticPrinter";
    InternalNodeBuilderFlags[InternalNodeBuilderFlags["DoNotIncludeSymbolChain"] = 4] = "DoNotIncludeSymbolChain";
    InternalNodeBuilderFlags[InternalNodeBuilderFlags["AllowUnresolvedNames"] = 8] = "AllowUnresolvedNames";
})(InternalNodeBuilderFlags || (InternalNodeBuilderFlags = {}));

// Ensure the shared flags between this and `NodeBuilderFlags` stay in alignment
// dprint-ignore
export var TypeFormatFlags;
(function (TypeFormatFlags) {
    TypeFormatFlags[TypeFormatFlags["None"] = 0] = "None";
    TypeFormatFlags[TypeFormatFlags["NoTruncation"] = 1] = "NoTruncation";
    TypeFormatFlags[TypeFormatFlags["WriteArrayAsGenericType"] = 2] = "WriteArrayAsGenericType";
    TypeFormatFlags[TypeFormatFlags["GenerateNamesForShadowedTypeParams"] = 4] = "GenerateNamesForShadowedTypeParams";
    TypeFormatFlags[TypeFormatFlags["UseStructuralFallback"] = 8] = "UseStructuralFallback";
    // hole because there's a hole in node builder flags
    TypeFormatFlags[TypeFormatFlags["WriteTypeArgumentsOfSignature"] = 32] = "WriteTypeArgumentsOfSignature";
    TypeFormatFlags[TypeFormatFlags["UseFullyQualifiedType"] = 64] = "UseFullyQualifiedType";
    // hole because `UseOnlyExternalAliasing` is here in node builder flags, but functions which take old flags use `SymbolFormatFlags` instead
    TypeFormatFlags[TypeFormatFlags["SuppressAnyReturnType"] = 256] = "SuppressAnyReturnType";
    // hole because `WriteTypeParametersInQualifiedName` is here in node builder flags, but functions which take old flags use `SymbolFormatFlags` for this instead
    TypeFormatFlags[TypeFormatFlags["MultilineObjectLiterals"] = 1024] = "MultilineObjectLiterals";
    TypeFormatFlags[TypeFormatFlags["WriteClassExpressionAsTypeLiteral"] = 2048] = "WriteClassExpressionAsTypeLiteral";
    TypeFormatFlags[TypeFormatFlags["UseTypeOfFunction"] = 4096] = "UseTypeOfFunction";
    TypeFormatFlags[TypeFormatFlags["OmitParameterModifiers"] = 8192] = "OmitParameterModifiers";
    TypeFormatFlags[TypeFormatFlags["UseAliasDefinedOutsideCurrentScope"] = 16384] = "UseAliasDefinedOutsideCurrentScope";
    TypeFormatFlags[TypeFormatFlags["UseSingleQuotesForStringLiteralType"] = 268435456] = "UseSingleQuotesForStringLiteralType";
    TypeFormatFlags[TypeFormatFlags["NoTypeReduction"] = 536870912] = "NoTypeReduction";
    TypeFormatFlags[TypeFormatFlags["OmitThisParameter"] = 33554432] = "OmitThisParameter";
    // Error Handling
    TypeFormatFlags[TypeFormatFlags["AllowUniqueESSymbolType"] = 1048576] = "AllowUniqueESSymbolType";
    // TypeFormatFlags exclusive
    TypeFormatFlags[TypeFormatFlags["AddUndefined"] = 131072] = "AddUndefined";
    TypeFormatFlags[TypeFormatFlags["WriteArrowStyleSignature"] = 262144] = "WriteArrowStyleSignature";
    // State
    TypeFormatFlags[TypeFormatFlags["InArrayType"] = 524288] = "InArrayType";
    TypeFormatFlags[TypeFormatFlags["InElementType"] = 2097152] = "InElementType";
    TypeFormatFlags[TypeFormatFlags["InFirstTypeArgument"] = 4194304] = "InFirstTypeArgument";
    TypeFormatFlags[TypeFormatFlags["InTypeAlias"] = 8388608] = "InTypeAlias";
    TypeFormatFlags[TypeFormatFlags["NodeBuilderFlagsMask"] = 848330095] = "NodeBuilderFlagsMask";
})(TypeFormatFlags || (TypeFormatFlags = {}));

// dprint-ignore
export var SymbolFormatFlags;
(function (SymbolFormatFlags) {
    SymbolFormatFlags[SymbolFormatFlags["None"] = 0] = "None";
    // Write symbols's type argument if it is instantiated symbol
    // eg. class C<T> { p: T }   <-- Show p as C<T>.p here
    //     var a: C<number>;
    //     var p = a.p; <--- Here p is property of C<number> so show it as C<number>.p instead of just C.p
    SymbolFormatFlags[SymbolFormatFlags["WriteTypeParametersOrArguments"] = 1] = "WriteTypeParametersOrArguments";
    // Use only external alias information to get the symbol name in the given context
    // eg.  module m { export class c { } } import x = m.c;
    // When this flag is specified m.c will be used to refer to the class instead of alias symbol x
    SymbolFormatFlags[SymbolFormatFlags["UseOnlyExternalAliasing"] = 2] = "UseOnlyExternalAliasing";
    // Build symbol name using any nodes needed, instead of just components of an entity name
    SymbolFormatFlags[SymbolFormatFlags["AllowAnyNodeKind"] = 4] = "AllowAnyNodeKind";
    // Prefer aliases which are not directly visible
    SymbolFormatFlags[SymbolFormatFlags["UseAliasDefinedOutsideCurrentScope"] = 8] = "UseAliasDefinedOutsideCurrentScope";
    // { [E.A]: 1 }
    /** @internal */ SymbolFormatFlags[SymbolFormatFlags["WriteComputedProps"] = 16] = "WriteComputedProps";
    // Skip building an accessible symbol chain
    /** @internal */ SymbolFormatFlags[SymbolFormatFlags["DoNotIncludeSymbolChain"] = 32] = "DoNotIncludeSymbolChain";
})(SymbolFormatFlags || (SymbolFormatFlags = {}));

/** @internal */
export var SymbolAccessibility;
(function (SymbolAccessibility) {
    SymbolAccessibility[SymbolAccessibility["Accessible"] = 0] = "Accessible";
    SymbolAccessibility[SymbolAccessibility["NotAccessible"] = 1] = "NotAccessible";
    SymbolAccessibility[SymbolAccessibility["CannotBeNamed"] = 2] = "CannotBeNamed";
    SymbolAccessibility[SymbolAccessibility["NotResolved"] = 3] = "NotResolved";
})(SymbolAccessibility || (SymbolAccessibility = {}));

export var TypePredicateKind;
(function (TypePredicateKind) {
    TypePredicateKind[TypePredicateKind["This"] = 0] = "This";
    TypePredicateKind[TypePredicateKind["Identifier"] = 1] = "Identifier";
    TypePredicateKind[TypePredicateKind["AssertsThis"] = 2] = "AssertsThis";
    TypePredicateKind[TypePredicateKind["AssertsIdentifier"] = 3] = "AssertsIdentifier";
})(TypePredicateKind || (TypePredicateKind = {}));

/**
 * Indicates how to serialize the name for a TypeReferenceNode when emitting decorator metadata
 *
 * @internal
 */
export var TypeReferenceSerializationKind;
(function (TypeReferenceSerializationKind) {
    // The TypeReferenceNode could not be resolved.
    // The type name should be emitted using a safe fallback.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["Unknown"] = 0] = "Unknown";
    // The TypeReferenceNode resolves to a type with a constructor
    // function that can be reached at runtime (e.g. a `class`
    // declaration or a `var` declaration for the static side
    // of a type, such as the global `Promise` type in lib.d.ts).
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["TypeWithConstructSignatureAndValue"] = 1] = "TypeWithConstructSignatureAndValue";
    // The TypeReferenceNode resolves to a Void-like, Nullable, or Never type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["VoidNullableOrNeverType"] = 2] = "VoidNullableOrNeverType";
    // The TypeReferenceNode resolves to a Number-like type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["NumberLikeType"] = 3] = "NumberLikeType";
    // The TypeReferenceNode resolves to a BigInt-like type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["BigIntLikeType"] = 4] = "BigIntLikeType";
    // The TypeReferenceNode resolves to a String-like type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["StringLikeType"] = 5] = "StringLikeType";
    // The TypeReferenceNode resolves to a Boolean-like type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["BooleanType"] = 6] = "BooleanType";
    // The TypeReferenceNode resolves to an Array-like type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["ArrayLikeType"] = 7] = "ArrayLikeType";
    // The TypeReferenceNode resolves to the ESSymbol type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["ESSymbolType"] = 8] = "ESSymbolType";
    // The TypeReferenceNode resolved to the global Promise constructor symbol.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["Promise"] = 9] = "Promise";
    // The TypeReferenceNode resolves to a Function type or a type with call signatures.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["TypeWithCallSignature"] = 10] = "TypeWithCallSignature";
    // The TypeReferenceNode resolves to any other type.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["ObjectType"] = 11] = "ObjectType";
})(TypeReferenceSerializationKind || (TypeReferenceSerializationKind = {}));

// dprint-ignore
export var SymbolFlags;
(function (SymbolFlags) {
    SymbolFlags[SymbolFlags["None"] = 0] = "None";
    SymbolFlags[SymbolFlags["FunctionScopedVariable"] = 1] = "FunctionScopedVariable";
    SymbolFlags[SymbolFlags["BlockScopedVariable"] = 2] = "BlockScopedVariable";
    SymbolFlags[SymbolFlags["Property"] = 4] = "Property";
    SymbolFlags[SymbolFlags["EnumMember"] = 8] = "EnumMember";
    SymbolFlags[SymbolFlags["Function"] = 16] = "Function";
    SymbolFlags[SymbolFlags["Class"] = 32] = "Class";
    SymbolFlags[SymbolFlags["Interface"] = 64] = "Interface";
    SymbolFlags[SymbolFlags["ConstEnum"] = 128] = "ConstEnum";
    SymbolFlags[SymbolFlags["RegularEnum"] = 256] = "RegularEnum";
    SymbolFlags[SymbolFlags["ValueModule"] = 512] = "ValueModule";
    SymbolFlags[SymbolFlags["NamespaceModule"] = 1024] = "NamespaceModule";
    SymbolFlags[SymbolFlags["TypeLiteral"] = 2048] = "TypeLiteral";
    SymbolFlags[SymbolFlags["ObjectLiteral"] = 4096] = "ObjectLiteral";
    SymbolFlags[SymbolFlags["Method"] = 8192] = "Method";
    SymbolFlags[SymbolFlags["Constructor"] = 16384] = "Constructor";
    SymbolFlags[SymbolFlags["GetAccessor"] = 32768] = "GetAccessor";
    SymbolFlags[SymbolFlags["SetAccessor"] = 65536] = "SetAccessor";
    SymbolFlags[SymbolFlags["Signature"] = 131072] = "Signature";
    SymbolFlags[SymbolFlags["TypeParameter"] = 262144] = "TypeParameter";
    SymbolFlags[SymbolFlags["TypeAlias"] = 524288] = "TypeAlias";
    SymbolFlags[SymbolFlags["ExportValue"] = 1048576] = "ExportValue";
    SymbolFlags[SymbolFlags["Alias"] = 2097152] = "Alias";
    SymbolFlags[SymbolFlags["Prototype"] = 4194304] = "Prototype";
    SymbolFlags[SymbolFlags["ExportStar"] = 8388608] = "ExportStar";
    SymbolFlags[SymbolFlags["Optional"] = 16777216] = "Optional";
    SymbolFlags[SymbolFlags["Transient"] = 33554432] = "Transient";
    SymbolFlags[SymbolFlags["Assignment"] = 67108864] = "Assignment";
    SymbolFlags[SymbolFlags["ModuleExports"] = 134217728] = "ModuleExports";
    SymbolFlags[SymbolFlags["All"] = -1] = "All";
    SymbolFlags[SymbolFlags["Enum"] = 384] = "Enum";
    SymbolFlags[SymbolFlags["Variable"] = 3] = "Variable";
    SymbolFlags[SymbolFlags["Value"] = 111551] = "Value";
    SymbolFlags[SymbolFlags["Type"] = 788968] = "Type";
    SymbolFlags[SymbolFlags["Namespace"] = 1920] = "Namespace";
    SymbolFlags[SymbolFlags["Module"] = 1536] = "Module";
    SymbolFlags[SymbolFlags["Accessor"] = 98304] = "Accessor";
    // Variables can be redeclared, but can not redeclare a block-scoped declaration with the
    // same name, or any other value that is not a variable, e.g. ValueModule or Class
    SymbolFlags[SymbolFlags["FunctionScopedVariableExcludes"] = 111550] = "FunctionScopedVariableExcludes";
    // Block-scoped declarations are not allowed to be re-declared
    // they can not merge with anything in the value space
    SymbolFlags[SymbolFlags["BlockScopedVariableExcludes"] = 111551] = "BlockScopedVariableExcludes";
    SymbolFlags[SymbolFlags["ParameterExcludes"] = 111551] = "ParameterExcludes";
    SymbolFlags[SymbolFlags["PropertyExcludes"] = 0] = "PropertyExcludes";
    SymbolFlags[SymbolFlags["EnumMemberExcludes"] = 900095] = "EnumMemberExcludes";
    SymbolFlags[SymbolFlags["FunctionExcludes"] = 110991] = "FunctionExcludes";
    SymbolFlags[SymbolFlags["ClassExcludes"] = 899503] = "ClassExcludes";
    SymbolFlags[SymbolFlags["InterfaceExcludes"] = 788872] = "InterfaceExcludes";
    SymbolFlags[SymbolFlags["RegularEnumExcludes"] = 899327] = "RegularEnumExcludes";
    SymbolFlags[SymbolFlags["ConstEnumExcludes"] = 899967] = "ConstEnumExcludes";
    SymbolFlags[SymbolFlags["ValueModuleExcludes"] = 110735] = "ValueModuleExcludes";
    SymbolFlags[SymbolFlags["NamespaceModuleExcludes"] = 0] = "NamespaceModuleExcludes";
    SymbolFlags[SymbolFlags["MethodExcludes"] = 103359] = "MethodExcludes";
    SymbolFlags[SymbolFlags["GetAccessorExcludes"] = 46015] = "GetAccessorExcludes";
    SymbolFlags[SymbolFlags["SetAccessorExcludes"] = 78783] = "SetAccessorExcludes";
    SymbolFlags[SymbolFlags["AccessorExcludes"] = 13247] = "AccessorExcludes";
    SymbolFlags[SymbolFlags["TypeParameterExcludes"] = 526824] = "TypeParameterExcludes";
    SymbolFlags[SymbolFlags["TypeAliasExcludes"] = 788968] = "TypeAliasExcludes";
    SymbolFlags[SymbolFlags["AliasExcludes"] = 2097152] = "AliasExcludes";
    SymbolFlags[SymbolFlags["ModuleMember"] = 2623475] = "ModuleMember";
    SymbolFlags[SymbolFlags["ExportHasLocal"] = 944] = "ExportHasLocal";
    SymbolFlags[SymbolFlags["BlockScoped"] = 418] = "BlockScoped";
    SymbolFlags[SymbolFlags["PropertyOrAccessor"] = 98308] = "PropertyOrAccessor";
    SymbolFlags[SymbolFlags["ClassMember"] = 106500] = "ClassMember";
    /** @internal */
    SymbolFlags[SymbolFlags["ExportSupportsDefaultModifier"] = 112] = "ExportSupportsDefaultModifier";
    /** @internal */
    SymbolFlags[SymbolFlags["ExportDoesNotSupportDefaultModifier"] = -113] = "ExportDoesNotSupportDefaultModifier";
    /** @internal */
    // The set of things we consider semantically classifiable.  Used to speed up the LS during
    // classification.
    SymbolFlags[SymbolFlags["Classifiable"] = 2885600] = "Classifiable";
    /** @internal */
    SymbolFlags[SymbolFlags["LateBindingContainer"] = 6256] = "LateBindingContainer";
})(SymbolFlags || (SymbolFlags = {}));

// dprint-ignore
/** @internal */
export var CheckFlags;
(function (CheckFlags) {
    CheckFlags[CheckFlags["None"] = 0] = "None";
    CheckFlags[CheckFlags["Instantiated"] = 1] = "Instantiated";
    CheckFlags[CheckFlags["SyntheticProperty"] = 2] = "SyntheticProperty";
    CheckFlags[CheckFlags["SyntheticMethod"] = 4] = "SyntheticMethod";
    CheckFlags[CheckFlags["Readonly"] = 8] = "Readonly";
    CheckFlags[CheckFlags["ReadPartial"] = 16] = "ReadPartial";
    CheckFlags[CheckFlags["WritePartial"] = 32] = "WritePartial";
    CheckFlags[CheckFlags["HasNonUniformType"] = 64] = "HasNonUniformType";
    CheckFlags[CheckFlags["HasLiteralType"] = 128] = "HasLiteralType";
    CheckFlags[CheckFlags["ContainsPublic"] = 256] = "ContainsPublic";
    CheckFlags[CheckFlags["ContainsProtected"] = 512] = "ContainsProtected";
    CheckFlags[CheckFlags["ContainsPrivate"] = 1024] = "ContainsPrivate";
    CheckFlags[CheckFlags["ContainsStatic"] = 2048] = "ContainsStatic";
    CheckFlags[CheckFlags["Late"] = 4096] = "Late";
    CheckFlags[CheckFlags["ReverseMapped"] = 8192] = "ReverseMapped";
    CheckFlags[CheckFlags["OptionalParameter"] = 16384] = "OptionalParameter";
    CheckFlags[CheckFlags["RestParameter"] = 32768] = "RestParameter";
    CheckFlags[CheckFlags["DeferredType"] = 65536] = "DeferredType";
    CheckFlags[CheckFlags["HasNeverType"] = 131072] = "HasNeverType";
    CheckFlags[CheckFlags["Mapped"] = 262144] = "Mapped";
    CheckFlags[CheckFlags["StripOptional"] = 524288] = "StripOptional";
    CheckFlags[CheckFlags["Unresolved"] = 1048576] = "Unresolved";
    CheckFlags[CheckFlags["Synthetic"] = 6] = "Synthetic";
    CheckFlags[CheckFlags["Discriminant"] = 192] = "Discriminant";
    CheckFlags[CheckFlags["Partial"] = 48] = "Partial";
})(CheckFlags || (CheckFlags = {}));

export var InternalSymbolName;
(function (InternalSymbolName) {
    InternalSymbolName["Call"] = "__call";
    InternalSymbolName["Constructor"] = "__constructor";
    InternalSymbolName["New"] = "__new";
    InternalSymbolName["Index"] = "__index";
    InternalSymbolName["ExportStar"] = "__export";
    InternalSymbolName["Global"] = "__global";
    InternalSymbolName["Missing"] = "__missing";
    InternalSymbolName["Type"] = "__type";
    InternalSymbolName["Object"] = "__object";
    InternalSymbolName["JSXAttributes"] = "__jsxAttributes";
    InternalSymbolName["Class"] = "__class";
    InternalSymbolName["Function"] = "__function";
    InternalSymbolName["Computed"] = "__computed";
    InternalSymbolName["Resolving"] = "__resolving__";
    InternalSymbolName["ExportEquals"] = "export=";
    InternalSymbolName["Default"] = "default";
    InternalSymbolName["This"] = "this";
    InternalSymbolName["InstantiationExpression"] = "__instantiationExpression";
    InternalSymbolName["ImportAttributes"] = "__importAttributes";
})(InternalSymbolName || (InternalSymbolName = {}));

// dprint-ignore
/** @internal */
export var NodeCheckFlags;
(function (NodeCheckFlags) {
    NodeCheckFlags[NodeCheckFlags["None"] = 0] = "None";
    NodeCheckFlags[NodeCheckFlags["TypeChecked"] = 1] = "TypeChecked";
    NodeCheckFlags[NodeCheckFlags["LexicalThis"] = 2] = "LexicalThis";
    NodeCheckFlags[NodeCheckFlags["CaptureThis"] = 4] = "CaptureThis";
    NodeCheckFlags[NodeCheckFlags["CaptureNewTarget"] = 8] = "CaptureNewTarget";
    NodeCheckFlags[NodeCheckFlags["SuperInstance"] = 16] = "SuperInstance";
    NodeCheckFlags[NodeCheckFlags["SuperStatic"] = 32] = "SuperStatic";
    NodeCheckFlags[NodeCheckFlags["ContextChecked"] = 64] = "ContextChecked";
    NodeCheckFlags[NodeCheckFlags["MethodWithSuperPropertyAccessInAsync"] = 128] = "MethodWithSuperPropertyAccessInAsync";
    NodeCheckFlags[NodeCheckFlags["MethodWithSuperPropertyAssignmentInAsync"] = 256] = "MethodWithSuperPropertyAssignmentInAsync";
    NodeCheckFlags[NodeCheckFlags["CaptureArguments"] = 512] = "CaptureArguments";
    NodeCheckFlags[NodeCheckFlags["EnumValuesComputed"] = 1024] = "EnumValuesComputed";
    NodeCheckFlags[NodeCheckFlags["LexicalModuleMergesWithClass"] = 2048] = "LexicalModuleMergesWithClass";
    NodeCheckFlags[NodeCheckFlags["LoopWithCapturedBlockScopedBinding"] = 4096] = "LoopWithCapturedBlockScopedBinding";
    NodeCheckFlags[NodeCheckFlags["ContainsCapturedBlockScopeBinding"] = 8192] = "ContainsCapturedBlockScopeBinding";
    NodeCheckFlags[NodeCheckFlags["CapturedBlockScopedBinding"] = 16384] = "CapturedBlockScopedBinding";
    NodeCheckFlags[NodeCheckFlags["BlockScopedBindingInLoop"] = 32768] = "BlockScopedBindingInLoop";
    NodeCheckFlags[NodeCheckFlags["NeedsLoopOutParameter"] = 65536] = "NeedsLoopOutParameter";
    NodeCheckFlags[NodeCheckFlags["AssignmentsMarked"] = 131072] = "AssignmentsMarked";
    NodeCheckFlags[NodeCheckFlags["ContainsConstructorReference"] = 262144] = "ContainsConstructorReference";
    NodeCheckFlags[NodeCheckFlags["ConstructorReference"] = 536870912] = "ConstructorReference";
    NodeCheckFlags[NodeCheckFlags["ContainsClassWithPrivateIdentifiers"] = 1048576] = "ContainsClassWithPrivateIdentifiers";
    NodeCheckFlags[NodeCheckFlags["ContainsSuperPropertyInStaticInitializer"] = 2097152] = "ContainsSuperPropertyInStaticInitializer";
    NodeCheckFlags[NodeCheckFlags["InCheckIdentifier"] = 4194304] = "InCheckIdentifier";
    NodeCheckFlags[NodeCheckFlags["PartiallyTypeChecked"] = 8388608] = "PartiallyTypeChecked";
    /** These flags are LazyNodeCheckFlags and can be calculated lazily by `hasNodeCheckFlag` */
    NodeCheckFlags[NodeCheckFlags["LazyFlags"] = 539358128] = "LazyFlags";
})(NodeCheckFlags || (NodeCheckFlags = {}));

// dprint-ignore
export var TypeFlags;
(function (TypeFlags) {
    TypeFlags[TypeFlags["Any"] = 1] = "Any";
    TypeFlags[TypeFlags["Unknown"] = 2] = "Unknown";
    TypeFlags[TypeFlags["String"] = 4] = "String";
    TypeFlags[TypeFlags["Number"] = 8] = "Number";
    TypeFlags[TypeFlags["Boolean"] = 16] = "Boolean";
    TypeFlags[TypeFlags["Enum"] = 32] = "Enum";
    TypeFlags[TypeFlags["BigInt"] = 64] = "BigInt";
    TypeFlags[TypeFlags["StringLiteral"] = 128] = "StringLiteral";
    TypeFlags[TypeFlags["NumberLiteral"] = 256] = "NumberLiteral";
    TypeFlags[TypeFlags["BooleanLiteral"] = 512] = "BooleanLiteral";
    TypeFlags[TypeFlags["EnumLiteral"] = 1024] = "EnumLiteral";
    TypeFlags[TypeFlags["BigIntLiteral"] = 2048] = "BigIntLiteral";
    TypeFlags[TypeFlags["ESSymbol"] = 4096] = "ESSymbol";
    TypeFlags[TypeFlags["UniqueESSymbol"] = 8192] = "UniqueESSymbol";
    TypeFlags[TypeFlags["Void"] = 16384] = "Void";
    TypeFlags[TypeFlags["Undefined"] = 32768] = "Undefined";
    TypeFlags[TypeFlags["Null"] = 65536] = "Null";
    TypeFlags[TypeFlags["Never"] = 131072] = "Never";
    TypeFlags[TypeFlags["TypeParameter"] = 262144] = "TypeParameter";
    TypeFlags[TypeFlags["Object"] = 524288] = "Object";
    TypeFlags[TypeFlags["Union"] = 1048576] = "Union";
    TypeFlags[TypeFlags["Intersection"] = 2097152] = "Intersection";
    TypeFlags[TypeFlags["Index"] = 4194304] = "Index";
    TypeFlags[TypeFlags["IndexedAccess"] = 8388608] = "IndexedAccess";
    TypeFlags[TypeFlags["Conditional"] = 16777216] = "Conditional";
    TypeFlags[TypeFlags["Substitution"] = 33554432] = "Substitution";
    TypeFlags[TypeFlags["NonPrimitive"] = 67108864] = "NonPrimitive";
    TypeFlags[TypeFlags["TemplateLiteral"] = 134217728] = "TemplateLiteral";
    TypeFlags[TypeFlags["StringMapping"] = 268435456] = "StringMapping";
    /** @internal */
    TypeFlags[TypeFlags["Reserved1"] = 536870912] = "Reserved1";
    /** @internal */
    TypeFlags[TypeFlags["Reserved2"] = 1073741824] = "Reserved2";
    /** @internal */
    TypeFlags[TypeFlags["AnyOrUnknown"] = 3] = "AnyOrUnknown";
    /** @internal */
    TypeFlags[TypeFlags["Nullable"] = 98304] = "Nullable";
    TypeFlags[TypeFlags["Literal"] = 2944] = "Literal";
    TypeFlags[TypeFlags["Unit"] = 109472] = "Unit";
    TypeFlags[TypeFlags["Freshable"] = 2976] = "Freshable";
    TypeFlags[TypeFlags["StringOrNumberLiteral"] = 384] = "StringOrNumberLiteral";
    /** @internal */
    TypeFlags[TypeFlags["StringOrNumberLiteralOrUnique"] = 8576] = "StringOrNumberLiteralOrUnique";
    /** @internal */
    TypeFlags[TypeFlags["DefinitelyFalsy"] = 117632] = "DefinitelyFalsy";
    TypeFlags[TypeFlags["PossiblyFalsy"] = 117724] = "PossiblyFalsy";
    /** @internal */
    TypeFlags[TypeFlags["Intrinsic"] = 67359327] = "Intrinsic";
    TypeFlags[TypeFlags["StringLike"] = 402653316] = "StringLike";
    TypeFlags[TypeFlags["NumberLike"] = 296] = "NumberLike";
    TypeFlags[TypeFlags["BigIntLike"] = 2112] = "BigIntLike";
    TypeFlags[TypeFlags["BooleanLike"] = 528] = "BooleanLike";
    TypeFlags[TypeFlags["EnumLike"] = 1056] = "EnumLike";
    TypeFlags[TypeFlags["ESSymbolLike"] = 12288] = "ESSymbolLike";
    TypeFlags[TypeFlags["VoidLike"] = 49152] = "VoidLike";
    /** @internal */
    TypeFlags[TypeFlags["Primitive"] = 402784252] = "Primitive";
    /** @internal */
    TypeFlags[TypeFlags["DefinitelyNonNullable"] = 470302716] = "DefinitelyNonNullable";
    /** @internal */
    TypeFlags[TypeFlags["DisjointDomains"] = 469892092] = "DisjointDomains";
    TypeFlags[TypeFlags["UnionOrIntersection"] = 3145728] = "UnionOrIntersection";
    TypeFlags[TypeFlags["StructuredType"] = 3670016] = "StructuredType";
    TypeFlags[TypeFlags["TypeVariable"] = 8650752] = "TypeVariable";
    TypeFlags[TypeFlags["InstantiableNonPrimitive"] = 58982400] = "InstantiableNonPrimitive";
    TypeFlags[TypeFlags["InstantiablePrimitive"] = 406847488] = "InstantiablePrimitive";
    TypeFlags[TypeFlags["Instantiable"] = 465829888] = "Instantiable";
    TypeFlags[TypeFlags["StructuredOrInstantiable"] = 469499904] = "StructuredOrInstantiable";
    /** @internal */
    TypeFlags[TypeFlags["ObjectFlagsType"] = 3899393] = "ObjectFlagsType";
    /** @internal */
    TypeFlags[TypeFlags["Simplifiable"] = 25165824] = "Simplifiable";
    /** @internal */
    TypeFlags[TypeFlags["Singleton"] = 67358815] = "Singleton";
    // 'Narrowable' types are types where narrowing actually narrows.
    // This *should* be every type other than null, undefined, void, and never
    TypeFlags[TypeFlags["Narrowable"] = 536624127] = "Narrowable";
    // The following flags are aggregated during union and intersection type construction
    /** @internal */
    TypeFlags[TypeFlags["IncludesMask"] = 473694207] = "IncludesMask";
    // The following flags are used for different purposes during union and intersection type construction
    /** @internal */
    TypeFlags[TypeFlags["IncludesMissingType"] = 262144] = "IncludesMissingType";
    /** @internal */
    TypeFlags[TypeFlags["IncludesNonWideningType"] = 4194304] = "IncludesNonWideningType";
    /** @internal */
    TypeFlags[TypeFlags["IncludesWildcard"] = 8388608] = "IncludesWildcard";
    /** @internal */
    TypeFlags[TypeFlags["IncludesEmptyObject"] = 16777216] = "IncludesEmptyObject";
    /** @internal */
    TypeFlags[TypeFlags["IncludesInstantiable"] = 33554432] = "IncludesInstantiable";
    /** @internal */
    TypeFlags[TypeFlags["IncludesConstrainedTypeVariable"] = 536870912] = "IncludesConstrainedTypeVariable";
    /** @internal */
    TypeFlags[TypeFlags["IncludesError"] = 1073741824] = "IncludesError";
    /** @internal */
    TypeFlags[TypeFlags["NotPrimitiveUnion"] = 36323331] = "NotPrimitiveUnion";
})(TypeFlags || (TypeFlags = {}));

// Types included in TypeFlags.ObjectFlagsType have an objectFlags property. Some ObjectFlags
// are specific to certain types and reuse the same bit position. Those ObjectFlags require a check
// for a certain TypeFlags value to determine their meaning.
// dprint-ignore
export var ObjectFlags;
(function (ObjectFlags) {
    ObjectFlags[ObjectFlags["None"] = 0] = "None";
    ObjectFlags[ObjectFlags["Class"] = 1] = "Class";
    ObjectFlags[ObjectFlags["Interface"] = 2] = "Interface";
    ObjectFlags[ObjectFlags["Reference"] = 4] = "Reference";
    ObjectFlags[ObjectFlags["Tuple"] = 8] = "Tuple";
    ObjectFlags[ObjectFlags["Anonymous"] = 16] = "Anonymous";
    ObjectFlags[ObjectFlags["Mapped"] = 32] = "Mapped";
    ObjectFlags[ObjectFlags["Instantiated"] = 64] = "Instantiated";
    ObjectFlags[ObjectFlags["ObjectLiteral"] = 128] = "ObjectLiteral";
    ObjectFlags[ObjectFlags["EvolvingArray"] = 256] = "EvolvingArray";
    ObjectFlags[ObjectFlags["ObjectLiteralPatternWithComputedProperties"] = 512] = "ObjectLiteralPatternWithComputedProperties";
    ObjectFlags[ObjectFlags["ReverseMapped"] = 1024] = "ReverseMapped";
    ObjectFlags[ObjectFlags["JsxAttributes"] = 2048] = "JsxAttributes";
    ObjectFlags[ObjectFlags["JSLiteral"] = 4096] = "JSLiteral";
    ObjectFlags[ObjectFlags["FreshLiteral"] = 8192] = "FreshLiteral";
    ObjectFlags[ObjectFlags["ArrayLiteral"] = 16384] = "ArrayLiteral";
    /** @internal */
    ObjectFlags[ObjectFlags["PrimitiveUnion"] = 32768] = "PrimitiveUnion";
    /** @internal */
    ObjectFlags[ObjectFlags["ContainsWideningType"] = 65536] = "ContainsWideningType";
    /** @internal */
    ObjectFlags[ObjectFlags["ContainsObjectOrArrayLiteral"] = 131072] = "ContainsObjectOrArrayLiteral";
    /** @internal */
    ObjectFlags[ObjectFlags["NonInferrableType"] = 262144] = "NonInferrableType";
    /** @internal */
    ObjectFlags[ObjectFlags["CouldContainTypeVariablesComputed"] = 524288] = "CouldContainTypeVariablesComputed";
    /** @internal */
    ObjectFlags[ObjectFlags["CouldContainTypeVariables"] = 1048576] = "CouldContainTypeVariables";
    ObjectFlags[ObjectFlags["ClassOrInterface"] = 3] = "ClassOrInterface";
    /** @internal */
    ObjectFlags[ObjectFlags["RequiresWidening"] = 196608] = "RequiresWidening";
    /** @internal */
    ObjectFlags[ObjectFlags["PropagatingFlags"] = 458752] = "PropagatingFlags";
    /** @internal */
    ObjectFlags[ObjectFlags["InstantiatedMapped"] = 96] = "InstantiatedMapped";
    // Object flags that uniquely identify the kind of ObjectType
    /** @internal */
    ObjectFlags[ObjectFlags["ObjectTypeKindMask"] = 1343] = "ObjectTypeKindMask";
    // Flags that require TypeFlags.Object
    ObjectFlags[ObjectFlags["ContainsSpread"] = 2097152] = "ContainsSpread";
    ObjectFlags[ObjectFlags["ObjectRestType"] = 4194304] = "ObjectRestType";
    ObjectFlags[ObjectFlags["InstantiationExpressionType"] = 8388608] = "InstantiationExpressionType";
    ObjectFlags[ObjectFlags["SingleSignatureType"] = 134217728] = "SingleSignatureType";
    /** @internal */
    ObjectFlags[ObjectFlags["IsClassInstanceClone"] = 16777216] = "IsClassInstanceClone";
    // Flags that require TypeFlags.Object and ObjectFlags.Reference
    /** @internal */
    ObjectFlags[ObjectFlags["IdenticalBaseTypeCalculated"] = 33554432] = "IdenticalBaseTypeCalculated";
    /** @internal */
    ObjectFlags[ObjectFlags["IdenticalBaseTypeExists"] = 67108864] = "IdenticalBaseTypeExists";
    // Flags that require TypeFlags.UnionOrIntersection or TypeFlags.Substitution
    /** @internal */
    ObjectFlags[ObjectFlags["IsGenericTypeComputed"] = 2097152] = "IsGenericTypeComputed";
    /** @internal */
    ObjectFlags[ObjectFlags["IsGenericObjectType"] = 4194304] = "IsGenericObjectType";
    /** @internal */
    ObjectFlags[ObjectFlags["IsGenericIndexType"] = 8388608] = "IsGenericIndexType";
    /** @internal */
    ObjectFlags[ObjectFlags["IsGenericType"] = 12582912] = "IsGenericType";
    // Flags that require TypeFlags.Union
    /** @internal */
    ObjectFlags[ObjectFlags["ContainsIntersections"] = 16777216] = "ContainsIntersections";
    /** @internal */
    ObjectFlags[ObjectFlags["IsUnknownLikeUnionComputed"] = 33554432] = "IsUnknownLikeUnionComputed";
    /** @internal */
    ObjectFlags[ObjectFlags["IsUnknownLikeUnion"] = 67108864] = "IsUnknownLikeUnion";
    /** @internal */
    // Flags that require TypeFlags.Intersection
    /** @internal */
    ObjectFlags[ObjectFlags["IsNeverIntersectionComputed"] = 16777216] = "IsNeverIntersectionComputed";
    /** @internal */
    ObjectFlags[ObjectFlags["IsNeverIntersection"] = 33554432] = "IsNeverIntersection";
    /** @internal */
    ObjectFlags[ObjectFlags["IsConstrainedTypeVariable"] = 67108864] = "IsConstrainedTypeVariable";
})(ObjectFlags || (ObjectFlags = {}));

// dprint-ignore
/** @internal */
export var VarianceFlags;
(function (VarianceFlags) {
    VarianceFlags[VarianceFlags["Invariant"] = 0] = "Invariant";
    VarianceFlags[VarianceFlags["Covariant"] = 1] = "Covariant";
    VarianceFlags[VarianceFlags["Contravariant"] = 2] = "Contravariant";
    VarianceFlags[VarianceFlags["Bivariant"] = 3] = "Bivariant";
    VarianceFlags[VarianceFlags["Independent"] = 4] = "Independent";
    VarianceFlags[VarianceFlags["VarianceMask"] = 7] = "VarianceMask";
    VarianceFlags[VarianceFlags["Unmeasurable"] = 8] = "Unmeasurable";
    VarianceFlags[VarianceFlags["Unreliable"] = 16] = "Unreliable";
    VarianceFlags[VarianceFlags["AllowsStructuralFallback"] = 24] = "AllowsStructuralFallback";
})(VarianceFlags || (VarianceFlags = {}));

// dprint-ignore
export var ElementFlags;
(function (ElementFlags) {
    ElementFlags[ElementFlags["Required"] = 1] = "Required";
    ElementFlags[ElementFlags["Optional"] = 2] = "Optional";
    ElementFlags[ElementFlags["Rest"] = 4] = "Rest";
    ElementFlags[ElementFlags["Variadic"] = 8] = "Variadic";
    ElementFlags[ElementFlags["Fixed"] = 3] = "Fixed";
    ElementFlags[ElementFlags["Variable"] = 12] = "Variable";
    ElementFlags[ElementFlags["NonRequired"] = 14] = "NonRequired";
    ElementFlags[ElementFlags["NonRest"] = 11] = "NonRest";
})(ElementFlags || (ElementFlags = {}));

/** @internal */
export var AccessFlags;
(function (AccessFlags) {
    AccessFlags[AccessFlags["None"] = 0] = "None";
    AccessFlags[AccessFlags["IncludeUndefined"] = 1] = "IncludeUndefined";
    AccessFlags[AccessFlags["NoIndexSignatures"] = 2] = "NoIndexSignatures";
    AccessFlags[AccessFlags["Writing"] = 4] = "Writing";
    AccessFlags[AccessFlags["CacheSymbol"] = 8] = "CacheSymbol";
    AccessFlags[AccessFlags["AllowMissing"] = 16] = "AllowMissing";
    AccessFlags[AccessFlags["ExpressionPosition"] = 32] = "ExpressionPosition";
    AccessFlags[AccessFlags["ReportDeprecated"] = 64] = "ReportDeprecated";
    AccessFlags[AccessFlags["SuppressNoImplicitAnyError"] = 128] = "SuppressNoImplicitAnyError";
    AccessFlags[AccessFlags["Contextual"] = 256] = "Contextual";
    AccessFlags[AccessFlags["Persistent"] = 1] = "Persistent";
})(AccessFlags || (AccessFlags = {}));

/** @internal */
export var IndexFlags;
(function (IndexFlags) {
    IndexFlags[IndexFlags["None"] = 0] = "None";
    IndexFlags[IndexFlags["StringsOnly"] = 1] = "StringsOnly";
    IndexFlags[IndexFlags["NoIndexSignatures"] = 2] = "NoIndexSignatures";
    IndexFlags[IndexFlags["NoReducibleCheck"] = 4] = "NoReducibleCheck";
})(IndexFlags || (IndexFlags = {}));

/** @internal */
export var JsxReferenceKind;
(function (JsxReferenceKind) {
    JsxReferenceKind[JsxReferenceKind["Component"] = 0] = "Component";
    JsxReferenceKind[JsxReferenceKind["Function"] = 1] = "Function";
    JsxReferenceKind[JsxReferenceKind["Mixed"] = 2] = "Mixed";
})(JsxReferenceKind || (JsxReferenceKind = {}));

export var SignatureKind;
(function (SignatureKind) {
    SignatureKind[SignatureKind["Call"] = 0] = "Call";
    SignatureKind[SignatureKind["Construct"] = 1] = "Construct";
})(SignatureKind || (SignatureKind = {}));

// dprint-ignore
/** @internal */
export var SignatureFlags;
(function (SignatureFlags) {
    SignatureFlags[SignatureFlags["None"] = 0] = "None";
    // Propagating flags
    SignatureFlags[SignatureFlags["HasRestParameter"] = 1] = "HasRestParameter";
    SignatureFlags[SignatureFlags["HasLiteralTypes"] = 2] = "HasLiteralTypes";
    SignatureFlags[SignatureFlags["Abstract"] = 4] = "Abstract";
    // Non-propagating flags
    SignatureFlags[SignatureFlags["IsInnerCallChain"] = 8] = "IsInnerCallChain";
    SignatureFlags[SignatureFlags["IsOuterCallChain"] = 16] = "IsOuterCallChain";
    SignatureFlags[SignatureFlags["IsUntypedSignatureInJSFile"] = 32] = "IsUntypedSignatureInJSFile";
    SignatureFlags[SignatureFlags["IsNonInferrable"] = 64] = "IsNonInferrable";
    SignatureFlags[SignatureFlags["IsSignatureCandidateForOverloadFailure"] = 128] = "IsSignatureCandidateForOverloadFailure";
    // We do not propagate `IsInnerCallChain` or `IsOuterCallChain` to instantiated signatures, as that would result in us
    // attempting to add `| undefined` on each recursive call to `getReturnTypeOfSignature` when
    // instantiating the return type.
    SignatureFlags[SignatureFlags["PropagatingFlags"] = 167] = "PropagatingFlags";
    SignatureFlags[SignatureFlags["CallChainFlags"] = 24] = "CallChainFlags";
})(SignatureFlags || (SignatureFlags = {}));

export var IndexKind;
(function (IndexKind) {
    IndexKind[IndexKind["String"] = 0] = "String";
    IndexKind[IndexKind["Number"] = 1] = "Number";
})(IndexKind || (IndexKind = {}));

/** @internal */
export var TypeMapKind;
(function (TypeMapKind) {
    TypeMapKind[TypeMapKind["Simple"] = 0] = "Simple";
    TypeMapKind[TypeMapKind["Array"] = 1] = "Array";
    TypeMapKind[TypeMapKind["Deferred"] = 2] = "Deferred";
    TypeMapKind[TypeMapKind["Function"] = 3] = "Function";
    TypeMapKind[TypeMapKind["Composite"] = 4] = "Composite";
    TypeMapKind[TypeMapKind["Merged"] = 5] = "Merged";
})(TypeMapKind || (TypeMapKind = {}));

// dprint-ignore
export var InferencePriority;
(function (InferencePriority) {
    InferencePriority[InferencePriority["None"] = 0] = "None";
    InferencePriority[InferencePriority["NakedTypeVariable"] = 1] = "NakedTypeVariable";
    InferencePriority[InferencePriority["SpeculativeTuple"] = 2] = "SpeculativeTuple";
    InferencePriority[InferencePriority["SubstituteSource"] = 4] = "SubstituteSource";
    InferencePriority[InferencePriority["HomomorphicMappedType"] = 8] = "HomomorphicMappedType";
    InferencePriority[InferencePriority["PartialHomomorphicMappedType"] = 16] = "PartialHomomorphicMappedType";
    InferencePriority[InferencePriority["MappedTypeConstraint"] = 32] = "MappedTypeConstraint";
    InferencePriority[InferencePriority["ContravariantConditional"] = 64] = "ContravariantConditional";
    InferencePriority[InferencePriority["ReturnType"] = 128] = "ReturnType";
    InferencePriority[InferencePriority["LiteralKeyof"] = 256] = "LiteralKeyof";
    InferencePriority[InferencePriority["NoConstraints"] = 512] = "NoConstraints";
    InferencePriority[InferencePriority["AlwaysStrict"] = 1024] = "AlwaysStrict";
    InferencePriority[InferencePriority["MaxValue"] = 2048] = "MaxValue";
    InferencePriority[InferencePriority["PriorityImpliesCombination"] = 416] = "PriorityImpliesCombination";
    InferencePriority[InferencePriority["Circularity"] = -1] = "Circularity";
})(InferencePriority || (InferencePriority = {}));

// dprint-ignore
/** @internal */
export var InferenceFlags;
(function (InferenceFlags) {
    InferenceFlags[InferenceFlags["None"] = 0] = "None";
    InferenceFlags[InferenceFlags["NoDefault"] = 1] = "NoDefault";
    InferenceFlags[InferenceFlags["AnyDefault"] = 2] = "AnyDefault";
    InferenceFlags[InferenceFlags["SkippedGenericFunction"] = 4] = "SkippedGenericFunction";
})(InferenceFlags || (InferenceFlags = {}));

/**
 * Ternary values are defined such that
 * x & y picks the lesser in the order False < Unknown < Maybe < True, and
 * x | y picks the greater in the order False < Unknown < Maybe < True.
 * Generally, Ternary.Maybe is used as the result of a relation that depends on itself, and
 * Ternary.Unknown is used as the result of a variance check that depends on itself. We make
 * a distinction because we don't want to cache circular variance check results.
 *
 * @internal
 */
export var Ternary;
(function (Ternary) {
    Ternary[Ternary["False"] = 0] = "False";
    Ternary[Ternary["Unknown"] = 1] = "Unknown";
    Ternary[Ternary["Maybe"] = 3] = "Maybe";
    Ternary[Ternary["True"] = -1] = "True";
})(Ternary || (Ternary = {}));

/** @internal */
export var AssignmentDeclarationKind;
(function (AssignmentDeclarationKind) {
    AssignmentDeclarationKind[AssignmentDeclarationKind["None"] = 0] = "None";
    /// exports.name = expr
    /// module.exports.name = expr
    AssignmentDeclarationKind[AssignmentDeclarationKind["ExportsProperty"] = 1] = "ExportsProperty";
    /// module.exports = expr
    AssignmentDeclarationKind[AssignmentDeclarationKind["ModuleExports"] = 2] = "ModuleExports";
    /// className.prototype.name = expr
    AssignmentDeclarationKind[AssignmentDeclarationKind["PrototypeProperty"] = 3] = "PrototypeProperty";
    /// this.name = expr
    AssignmentDeclarationKind[AssignmentDeclarationKind["ThisProperty"] = 4] = "ThisProperty";
    // F.name = expr
    AssignmentDeclarationKind[AssignmentDeclarationKind["Property"] = 5] = "Property";
    // F.prototype = { ... }
    AssignmentDeclarationKind[AssignmentDeclarationKind["Prototype"] = 6] = "Prototype";
    // Object.defineProperty(x, 'name', { value: any, writable?: boolean (false by default) });
    // Object.defineProperty(x, 'name', { get: Function, set: Function });
    // Object.defineProperty(x, 'name', { get: Function });
    // Object.defineProperty(x, 'name', { set: Function });
    AssignmentDeclarationKind[AssignmentDeclarationKind["ObjectDefinePropertyValue"] = 7] = "ObjectDefinePropertyValue";
    // Object.defineProperty(exports || module.exports, 'name', ...);
    AssignmentDeclarationKind[AssignmentDeclarationKind["ObjectDefinePropertyExports"] = 8] = "ObjectDefinePropertyExports";
    // Object.defineProperty(Foo.prototype, 'name', ...);
    AssignmentDeclarationKind[AssignmentDeclarationKind["ObjectDefinePrototypeProperty"] = 9] = "ObjectDefinePrototypeProperty";
})(AssignmentDeclarationKind || (AssignmentDeclarationKind = {}));

export var DiagnosticCategory;
(function (DiagnosticCategory) {
    DiagnosticCategory[DiagnosticCategory["Warning"] = 0] = "Warning";
    DiagnosticCategory[DiagnosticCategory["Error"] = 1] = "Error";
    DiagnosticCategory[DiagnosticCategory["Suggestion"] = 2] = "Suggestion";
    DiagnosticCategory[DiagnosticCategory["Message"] = 3] = "Message";
})(DiagnosticCategory || (DiagnosticCategory = {}));

/** @internal */
export function diagnosticCategoryName(d, lowerCase = true) {
    const name = DiagnosticCategory[d.category];
    return lowerCase ? name.toLowerCase() : name;
}

export var ModuleResolutionKind;
(function (ModuleResolutionKind) {
    ModuleResolutionKind[ModuleResolutionKind["Classic"] = 1] = "Classic";
    /**
     * @deprecated
     * `NodeJs` was renamed to `Node10` to better reflect the version of Node that it targets.
     * Use the new name or consider switching to a modern module resolution target.
     */
    ModuleResolutionKind[ModuleResolutionKind["NodeJs"] = 2] = "NodeJs";
    ModuleResolutionKind[ModuleResolutionKind["Node10"] = 2] = "Node10";
    // Starting with node12, node's module resolver has significant departures from traditional cjs resolution
    // to better support ECMAScript modules and their use within node - however more features are still being added.
    // TypeScript's Node ESM support was introduced after Node 12 went end-of-life, and Node 14 is the earliest stable
    // version that supports both pattern trailers - *but*, Node 16 is the first version that also supports ECMAScript 2022.
    // In turn, we offer both a `NodeNext` moving resolution target, and a `Node16` version-anchored resolution target
    ModuleResolutionKind[ModuleResolutionKind["Node16"] = 3] = "Node16";
    ModuleResolutionKind[ModuleResolutionKind["NodeNext"] = 99] = "NodeNext";
    ModuleResolutionKind[ModuleResolutionKind["Bundler"] = 100] = "Bundler";
})(ModuleResolutionKind || (ModuleResolutionKind = {}));

export var ModuleDetectionKind;
(function (ModuleDetectionKind) {
    /**
     * Files with imports, exports and/or import.meta are considered modules
     */
    ModuleDetectionKind[ModuleDetectionKind["Legacy"] = 1] = "Legacy";
    /**
     * Legacy, but also files with jsx under react-jsx or react-jsxdev and esm mode files under moduleResolution: node16+
     */
    ModuleDetectionKind[ModuleDetectionKind["Auto"] = 2] = "Auto";
    /**
     * Consider all non-declaration files modules, regardless of present syntax
     */
    ModuleDetectionKind[ModuleDetectionKind["Force"] = 3] = "Force";
})(ModuleDetectionKind || (ModuleDetectionKind = {}));

export var WatchFileKind;
(function (WatchFileKind) {
    WatchFileKind[WatchFileKind["FixedPollingInterval"] = 0] = "FixedPollingInterval";
    WatchFileKind[WatchFileKind["PriorityPollingInterval"] = 1] = "PriorityPollingInterval";
    WatchFileKind[WatchFileKind["DynamicPriorityPolling"] = 2] = "DynamicPriorityPolling";
    WatchFileKind[WatchFileKind["FixedChunkSizePolling"] = 3] = "FixedChunkSizePolling";
    WatchFileKind[WatchFileKind["UseFsEvents"] = 4] = "UseFsEvents";
    WatchFileKind[WatchFileKind["UseFsEventsOnParentDirectory"] = 5] = "UseFsEventsOnParentDirectory";
})(WatchFileKind || (WatchFileKind = {}));

export var WatchDirectoryKind;
(function (WatchDirectoryKind) {
    WatchDirectoryKind[WatchDirectoryKind["UseFsEvents"] = 0] = "UseFsEvents";
    WatchDirectoryKind[WatchDirectoryKind["FixedPollingInterval"] = 1] = "FixedPollingInterval";
    WatchDirectoryKind[WatchDirectoryKind["DynamicPriorityPolling"] = 2] = "DynamicPriorityPolling";
    WatchDirectoryKind[WatchDirectoryKind["FixedChunkSizePolling"] = 3] = "FixedChunkSizePolling";
})(WatchDirectoryKind || (WatchDirectoryKind = {}));

export var PollingWatchKind;
(function (PollingWatchKind) {
    PollingWatchKind[PollingWatchKind["FixedInterval"] = 0] = "FixedInterval";
    PollingWatchKind[PollingWatchKind["PriorityInterval"] = 1] = "PriorityInterval";
    PollingWatchKind[PollingWatchKind["DynamicPriority"] = 2] = "DynamicPriority";
    PollingWatchKind[PollingWatchKind["FixedChunkSize"] = 3] = "FixedChunkSize";
})(PollingWatchKind || (PollingWatchKind = {}));

export var ModuleKind;
(function (ModuleKind) {
    ModuleKind[ModuleKind["None"] = 0] = "None";
    ModuleKind[ModuleKind["CommonJS"] = 1] = "CommonJS";
    ModuleKind[ModuleKind["AMD"] = 2] = "AMD";
    ModuleKind[ModuleKind["UMD"] = 3] = "UMD";
    ModuleKind[ModuleKind["System"] = 4] = "System";
    // NOTE: ES module kinds should be contiguous to more easily check whether a module kind is *any* ES module kind.
    //       Non-ES module kinds should not come between ES2015 (the earliest ES module kind) and ESNext (the last ES
    //       module kind).
    ModuleKind[ModuleKind["ES2015"] = 5] = "ES2015";
    ModuleKind[ModuleKind["ES2020"] = 6] = "ES2020";
    ModuleKind[ModuleKind["ES2022"] = 7] = "ES2022";
    ModuleKind[ModuleKind["ESNext"] = 99] = "ESNext";
    // Node16+ is an amalgam of commonjs (albeit updated) and es2022+, and represents a distinct module system from es2020/esnext
    ModuleKind[ModuleKind["Node16"] = 100] = "Node16";
    ModuleKind[ModuleKind["Node18"] = 101] = "Node18";
    ModuleKind[ModuleKind["NodeNext"] = 199] = "NodeNext";
    // Emit as written
    ModuleKind[ModuleKind["Preserve"] = 200] = "Preserve";
})(ModuleKind || (ModuleKind = {}));

export var JsxEmit;
(function (JsxEmit) {
    JsxEmit[JsxEmit["None"] = 0] = "None";
    JsxEmit[JsxEmit["Preserve"] = 1] = "Preserve";
    JsxEmit[JsxEmit["React"] = 2] = "React";
    JsxEmit[JsxEmit["ReactNative"] = 3] = "ReactNative";
    JsxEmit[JsxEmit["ReactJSX"] = 4] = "ReactJSX";
    JsxEmit[JsxEmit["ReactJSXDev"] = 5] = "ReactJSXDev";
})(JsxEmit || (JsxEmit = {}));

/** @deprecated */
export var ImportsNotUsedAsValues;
(function (ImportsNotUsedAsValues) {
    ImportsNotUsedAsValues[ImportsNotUsedAsValues["Remove"] = 0] = "Remove";
    ImportsNotUsedAsValues[ImportsNotUsedAsValues["Preserve"] = 1] = "Preserve";
    ImportsNotUsedAsValues[ImportsNotUsedAsValues["Error"] = 2] = "Error";
})(ImportsNotUsedAsValues || (ImportsNotUsedAsValues = {}));

export var NewLineKind;
(function (NewLineKind) {
    NewLineKind[NewLineKind["CarriageReturnLineFeed"] = 0] = "CarriageReturnLineFeed";
    NewLineKind[NewLineKind["LineFeed"] = 1] = "LineFeed";
})(NewLineKind || (NewLineKind = {}));

export var ScriptKind;
(function (ScriptKind) {
    ScriptKind[ScriptKind["Unknown"] = 0] = "Unknown";
    ScriptKind[ScriptKind["JS"] = 1] = "JS";
    ScriptKind[ScriptKind["JSX"] = 2] = "JSX";
    ScriptKind[ScriptKind["TS"] = 3] = "TS";
    ScriptKind[ScriptKind["TSX"] = 4] = "TSX";
    ScriptKind[ScriptKind["External"] = 5] = "External";
    ScriptKind[ScriptKind["JSON"] = 6] = "JSON";
    /**
     * Used on extensions that doesn't define the ScriptKind but the content defines it.
     * Deferred extensions are going to be included in all project contexts.
     */
    ScriptKind[ScriptKind["Deferred"] = 7] = "Deferred";
})(ScriptKind || (ScriptKind = {}));

// NOTE: We must reevaluate the target for upcoming features when each successive TC39 edition is ratified in
//       June of each year. This includes changes to `LanguageFeatureMinimumTarget`, `ScriptTarget`,
//       `ScriptTargetFeatures` transformers/esnext.ts, compiler/commandLineParser.ts,
//       compiler/utilitiesPublic.ts, and the contents of each lib/esnext.*.d.ts file.
export var ScriptTarget;
(function (ScriptTarget) {
    /** @deprecated */
    ScriptTarget[ScriptTarget["ES3"] = 0] = "ES3";
    ScriptTarget[ScriptTarget["ES5"] = 1] = "ES5";
    ScriptTarget[ScriptTarget["ES2015"] = 2] = "ES2015";
    ScriptTarget[ScriptTarget["ES2016"] = 3] = "ES2016";
    ScriptTarget[ScriptTarget["ES2017"] = 4] = "ES2017";
    ScriptTarget[ScriptTarget["ES2018"] = 5] = "ES2018";
    ScriptTarget[ScriptTarget["ES2019"] = 6] = "ES2019";
    ScriptTarget[ScriptTarget["ES2020"] = 7] = "ES2020";
    ScriptTarget[ScriptTarget["ES2021"] = 8] = "ES2021";
    ScriptTarget[ScriptTarget["ES2022"] = 9] = "ES2022";
    ScriptTarget[ScriptTarget["ES2023"] = 10] = "ES2023";
    ScriptTarget[ScriptTarget["ES2024"] = 11] = "ES2024";
    ScriptTarget[ScriptTarget["ESNext"] = 99] = "ESNext";
    ScriptTarget[ScriptTarget["JSON"] = 100] = "JSON";
    ScriptTarget[ScriptTarget["Latest"] = 99] = "Latest";
})(ScriptTarget || (ScriptTarget = {}));

export var LanguageVariant;
(function (LanguageVariant) {
    LanguageVariant[LanguageVariant["Standard"] = 0] = "Standard";
    LanguageVariant[LanguageVariant["JSX"] = 1] = "JSX";
})(LanguageVariant || (LanguageVariant = {}));

export var WatchDirectoryFlags;
(function (WatchDirectoryFlags) {
    WatchDirectoryFlags[WatchDirectoryFlags["None"] = 0] = "None";
    WatchDirectoryFlags[WatchDirectoryFlags["Recursive"] = 1] = "Recursive";
})(WatchDirectoryFlags || (WatchDirectoryFlags = {}));

// dprint-ignore
/** @internal */
export var CharacterCodes;
(function (CharacterCodes) {
    CharacterCodes[CharacterCodes["EOF"] = -1] = "EOF";
    CharacterCodes[CharacterCodes["nullCharacter"] = 0] = "nullCharacter";
    CharacterCodes[CharacterCodes["maxAsciiCharacter"] = 127] = "maxAsciiCharacter";
    CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
    CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
    CharacterCodes[CharacterCodes["lineSeparator"] = 8232] = "lineSeparator";
    CharacterCodes[CharacterCodes["paragraphSeparator"] = 8233] = "paragraphSeparator";
    CharacterCodes[CharacterCodes["nextLine"] = 133] = "nextLine";
    // Unicode 3.0 space characters
    CharacterCodes[CharacterCodes["space"] = 32] = "space";
    CharacterCodes[CharacterCodes["nonBreakingSpace"] = 160] = "nonBreakingSpace";
    CharacterCodes[CharacterCodes["enQuad"] = 8192] = "enQuad";
    CharacterCodes[CharacterCodes["emQuad"] = 8193] = "emQuad";
    CharacterCodes[CharacterCodes["enSpace"] = 8194] = "enSpace";
    CharacterCodes[CharacterCodes["emSpace"] = 8195] = "emSpace";
    CharacterCodes[CharacterCodes["threePerEmSpace"] = 8196] = "threePerEmSpace";
    CharacterCodes[CharacterCodes["fourPerEmSpace"] = 8197] = "fourPerEmSpace";
    CharacterCodes[CharacterCodes["sixPerEmSpace"] = 8198] = "sixPerEmSpace";
    CharacterCodes[CharacterCodes["figureSpace"] = 8199] = "figureSpace";
    CharacterCodes[CharacterCodes["punctuationSpace"] = 8200] = "punctuationSpace";
    CharacterCodes[CharacterCodes["thinSpace"] = 8201] = "thinSpace";
    CharacterCodes[CharacterCodes["hairSpace"] = 8202] = "hairSpace";
    CharacterCodes[CharacterCodes["zeroWidthSpace"] = 8203] = "zeroWidthSpace";
    CharacterCodes[CharacterCodes["narrowNoBreakSpace"] = 8239] = "narrowNoBreakSpace";
    CharacterCodes[CharacterCodes["ideographicSpace"] = 12288] = "ideographicSpace";
    CharacterCodes[CharacterCodes["mathematicalSpace"] = 8287] = "mathematicalSpace";
    CharacterCodes[CharacterCodes["ogham"] = 5760] = "ogham";
    // Unicode replacement character produced when a byte sequence is invalid
    CharacterCodes[CharacterCodes["replacementCharacter"] = 65533] = "replacementCharacter";
    CharacterCodes[CharacterCodes["_"] = 95] = "_";
    CharacterCodes[CharacterCodes["$"] = 36] = "$";
    CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
    CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
    CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
    CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
    CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
    CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
    CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
    CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
    CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
    CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
    CharacterCodes[CharacterCodes["a"] = 97] = "a";
    CharacterCodes[CharacterCodes["b"] = 98] = "b";
    CharacterCodes[CharacterCodes["c"] = 99] = "c";
    CharacterCodes[CharacterCodes["d"] = 100] = "d";
    CharacterCodes[CharacterCodes["e"] = 101] = "e";
    CharacterCodes[CharacterCodes["f"] = 102] = "f";
    CharacterCodes[CharacterCodes["g"] = 103] = "g";
    CharacterCodes[CharacterCodes["h"] = 104] = "h";
    CharacterCodes[CharacterCodes["i"] = 105] = "i";
    CharacterCodes[CharacterCodes["j"] = 106] = "j";
    CharacterCodes[CharacterCodes["k"] = 107] = "k";
    CharacterCodes[CharacterCodes["l"] = 108] = "l";
    CharacterCodes[CharacterCodes["m"] = 109] = "m";
    CharacterCodes[CharacterCodes["n"] = 110] = "n";
    CharacterCodes[CharacterCodes["o"] = 111] = "o";
    CharacterCodes[CharacterCodes["p"] = 112] = "p";
    CharacterCodes[CharacterCodes["q"] = 113] = "q";
    CharacterCodes[CharacterCodes["r"] = 114] = "r";
    CharacterCodes[CharacterCodes["s"] = 115] = "s";
    CharacterCodes[CharacterCodes["t"] = 116] = "t";
    CharacterCodes[CharacterCodes["u"] = 117] = "u";
    CharacterCodes[CharacterCodes["v"] = 118] = "v";
    CharacterCodes[CharacterCodes["w"] = 119] = "w";
    CharacterCodes[CharacterCodes["x"] = 120] = "x";
    CharacterCodes[CharacterCodes["y"] = 121] = "y";
    CharacterCodes[CharacterCodes["z"] = 122] = "z";
    CharacterCodes[CharacterCodes["A"] = 65] = "A";
    CharacterCodes[CharacterCodes["B"] = 66] = "B";
    CharacterCodes[CharacterCodes["C"] = 67] = "C";
    CharacterCodes[CharacterCodes["D"] = 68] = "D";
    CharacterCodes[CharacterCodes["E"] = 69] = "E";
    CharacterCodes[CharacterCodes["F"] = 70] = "F";
    CharacterCodes[CharacterCodes["G"] = 71] = "G";
    CharacterCodes[CharacterCodes["H"] = 72] = "H";
    CharacterCodes[CharacterCodes["I"] = 73] = "I";
    CharacterCodes[CharacterCodes["J"] = 74] = "J";
    CharacterCodes[CharacterCodes["K"] = 75] = "K";
    CharacterCodes[CharacterCodes["L"] = 76] = "L";
    CharacterCodes[CharacterCodes["M"] = 77] = "M";
    CharacterCodes[CharacterCodes["N"] = 78] = "N";
    CharacterCodes[CharacterCodes["O"] = 79] = "O";
    CharacterCodes[CharacterCodes["P"] = 80] = "P";
    CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
    CharacterCodes[CharacterCodes["R"] = 82] = "R";
    CharacterCodes[CharacterCodes["S"] = 83] = "S";
    CharacterCodes[CharacterCodes["T"] = 84] = "T";
    CharacterCodes[CharacterCodes["U"] = 85] = "U";
    CharacterCodes[CharacterCodes["V"] = 86] = "V";
    CharacterCodes[CharacterCodes["W"] = 87] = "W";
    CharacterCodes[CharacterCodes["X"] = 88] = "X";
    CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
    CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
    CharacterCodes[CharacterCodes["ampersand"] = 38] = "ampersand";
    CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
    CharacterCodes[CharacterCodes["at"] = 64] = "at";
    CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
    CharacterCodes[CharacterCodes["backtick"] = 96] = "backtick";
    CharacterCodes[CharacterCodes["bar"] = 124] = "bar";
    CharacterCodes[CharacterCodes["caret"] = 94] = "caret";
    CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
    CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
    CharacterCodes[CharacterCodes["closeParen"] = 41] = "closeParen";
    CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
    CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
    CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
    CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
    CharacterCodes[CharacterCodes["equals"] = 61] = "equals";
    CharacterCodes[CharacterCodes["exclamation"] = 33] = "exclamation";
    CharacterCodes[CharacterCodes["greaterThan"] = 62] = "greaterThan";
    CharacterCodes[CharacterCodes["hash"] = 35] = "hash";
    CharacterCodes[CharacterCodes["lessThan"] = 60] = "lessThan";
    CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
    CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
    CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
    CharacterCodes[CharacterCodes["openParen"] = 40] = "openParen";
    CharacterCodes[CharacterCodes["percent"] = 37] = "percent";
    CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
    CharacterCodes[CharacterCodes["question"] = 63] = "question";
    CharacterCodes[CharacterCodes["semicolon"] = 59] = "semicolon";
    CharacterCodes[CharacterCodes["singleQuote"] = 39] = "singleQuote";
    CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
    CharacterCodes[CharacterCodes["tilde"] = 126] = "tilde";
    CharacterCodes[CharacterCodes["backspace"] = 8] = "backspace";
    CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
    CharacterCodes[CharacterCodes["byteOrderMark"] = 65279] = "byteOrderMark";
    CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
    CharacterCodes[CharacterCodes["verticalTab"] = 11] = "verticalTab";
})(CharacterCodes || (CharacterCodes = {}));

export var Extension;
(function (Extension) {
    Extension["Ts"] = ".ts";
    Extension["Tsx"] = ".tsx";
    Extension["Dts"] = ".d.ts";
    Extension["Js"] = ".js";
    Extension["Jsx"] = ".jsx";
    Extension["Json"] = ".json";
    Extension["TsBuildInfo"] = ".tsbuildinfo";
    Extension["Mjs"] = ".mjs";
    Extension["Mts"] = ".mts";
    Extension["Dmts"] = ".d.mts";
    Extension["Cjs"] = ".cjs";
    Extension["Cts"] = ".cts";
    Extension["Dcts"] = ".d.cts";
})(Extension || (Extension = {}));

/** @internal */
export var TransformFlags;
(function (TransformFlags) {
    TransformFlags[TransformFlags["None"] = 0] = "None";
    // Facts
    // - Flags used to indicate that a node or subtree contains syntax that requires transformation.
    TransformFlags[TransformFlags["ContainsTypeScript"] = 1] = "ContainsTypeScript";
    TransformFlags[TransformFlags["ContainsJsx"] = 2] = "ContainsJsx";
    TransformFlags[TransformFlags["ContainsESNext"] = 4] = "ContainsESNext";
    TransformFlags[TransformFlags["ContainsES2022"] = 8] = "ContainsES2022";
    TransformFlags[TransformFlags["ContainsES2021"] = 16] = "ContainsES2021";
    TransformFlags[TransformFlags["ContainsES2020"] = 32] = "ContainsES2020";
    TransformFlags[TransformFlags["ContainsES2019"] = 64] = "ContainsES2019";
    TransformFlags[TransformFlags["ContainsES2018"] = 128] = "ContainsES2018";
    TransformFlags[TransformFlags["ContainsES2017"] = 256] = "ContainsES2017";
    TransformFlags[TransformFlags["ContainsES2016"] = 512] = "ContainsES2016";
    TransformFlags[TransformFlags["ContainsES2015"] = 1024] = "ContainsES2015";
    TransformFlags[TransformFlags["ContainsGenerator"] = 2048] = "ContainsGenerator";
    TransformFlags[TransformFlags["ContainsDestructuringAssignment"] = 4096] = "ContainsDestructuringAssignment";
    // Markers
    // - Flags used to indicate that a subtree contains a specific transformation.
    TransformFlags[TransformFlags["ContainsTypeScriptClassSyntax"] = 8192] = "ContainsTypeScriptClassSyntax";
    TransformFlags[TransformFlags["ContainsLexicalThis"] = 16384] = "ContainsLexicalThis";
    TransformFlags[TransformFlags["ContainsRestOrSpread"] = 32768] = "ContainsRestOrSpread";
    TransformFlags[TransformFlags["ContainsObjectRestOrSpread"] = 65536] = "ContainsObjectRestOrSpread";
    TransformFlags[TransformFlags["ContainsComputedPropertyName"] = 131072] = "ContainsComputedPropertyName";
    TransformFlags[TransformFlags["ContainsBlockScopedBinding"] = 262144] = "ContainsBlockScopedBinding";
    TransformFlags[TransformFlags["ContainsBindingPattern"] = 524288] = "ContainsBindingPattern";
    TransformFlags[TransformFlags["ContainsYield"] = 1048576] = "ContainsYield";
    TransformFlags[TransformFlags["ContainsAwait"] = 2097152] = "ContainsAwait";
    TransformFlags[TransformFlags["ContainsHoistedDeclarationOrCompletion"] = 4194304] = "ContainsHoistedDeclarationOrCompletion";
    TransformFlags[TransformFlags["ContainsDynamicImport"] = 8388608] = "ContainsDynamicImport";
    TransformFlags[TransformFlags["ContainsClassFields"] = 16777216] = "ContainsClassFields";
    TransformFlags[TransformFlags["ContainsDecorators"] = 33554432] = "ContainsDecorators";
    TransformFlags[TransformFlags["ContainsPossibleTopLevelAwait"] = 67108864] = "ContainsPossibleTopLevelAwait";
    TransformFlags[TransformFlags["ContainsLexicalSuper"] = 134217728] = "ContainsLexicalSuper";
    TransformFlags[TransformFlags["ContainsUpdateExpressionForIdentifier"] = 268435456] = "ContainsUpdateExpressionForIdentifier";
    TransformFlags[TransformFlags["ContainsPrivateIdentifierInExpression"] = 536870912] = "ContainsPrivateIdentifierInExpression";
    TransformFlags[TransformFlags["HasComputedFlags"] = -2147483648] = "HasComputedFlags";
    // Assertions
    // - Bitmasks that are used to assert facts about the syntax of a node and its subtree.
    TransformFlags[TransformFlags["AssertTypeScript"] = 1] = "AssertTypeScript";
    TransformFlags[TransformFlags["AssertJsx"] = 2] = "AssertJsx";
    TransformFlags[TransformFlags["AssertESNext"] = 4] = "AssertESNext";
    TransformFlags[TransformFlags["AssertES2022"] = 8] = "AssertES2022";
    TransformFlags[TransformFlags["AssertES2021"] = 16] = "AssertES2021";
    TransformFlags[TransformFlags["AssertES2020"] = 32] = "AssertES2020";
    TransformFlags[TransformFlags["AssertES2019"] = 64] = "AssertES2019";
    TransformFlags[TransformFlags["AssertES2018"] = 128] = "AssertES2018";
    TransformFlags[TransformFlags["AssertES2017"] = 256] = "AssertES2017";
    TransformFlags[TransformFlags["AssertES2016"] = 512] = "AssertES2016";
    TransformFlags[TransformFlags["AssertES2015"] = 1024] = "AssertES2015";
    TransformFlags[TransformFlags["AssertGenerator"] = 2048] = "AssertGenerator";
    TransformFlags[TransformFlags["AssertDestructuringAssignment"] = 4096] = "AssertDestructuringAssignment";
    // Scope Exclusions
    // - Bitmasks that exclude flags from propagating out of a specific context
    //   into the subtree flags of their container.
    TransformFlags[TransformFlags["OuterExpressionExcludes"] = -2147483648] = "OuterExpressionExcludes";
    TransformFlags[TransformFlags["PropertyAccessExcludes"] = -2147483648] = "PropertyAccessExcludes";
    TransformFlags[TransformFlags["NodeExcludes"] = -2147483648] = "NodeExcludes";
    TransformFlags[TransformFlags["ArrowFunctionExcludes"] = -2072174592] = "ArrowFunctionExcludes";
    TransformFlags[TransformFlags["FunctionExcludes"] = -1937940480] = "FunctionExcludes";
    TransformFlags[TransformFlags["ConstructorExcludes"] = -1937948672] = "ConstructorExcludes";
    TransformFlags[TransformFlags["MethodOrAccessorExcludes"] = -2005057536] = "MethodOrAccessorExcludes";
    TransformFlags[TransformFlags["PropertyExcludes"] = -2013249536] = "PropertyExcludes";
    TransformFlags[TransformFlags["ClassExcludes"] = -2147344384] = "ClassExcludes";
    TransformFlags[TransformFlags["ModuleExcludes"] = -1941676032] = "ModuleExcludes";
    TransformFlags[TransformFlags["TypeExcludes"] = -2] = "TypeExcludes";
    TransformFlags[TransformFlags["ObjectLiteralExcludes"] = -2147278848] = "ObjectLiteralExcludes";
    TransformFlags[TransformFlags["ArrayLiteralOrCallOrNewExcludes"] = -2147450880] = "ArrayLiteralOrCallOrNewExcludes";
    TransformFlags[TransformFlags["VariableDeclarationListExcludes"] = -2146893824] = "VariableDeclarationListExcludes";
    TransformFlags[TransformFlags["ParameterExcludes"] = -2147483648] = "ParameterExcludes";
    TransformFlags[TransformFlags["CatchClauseExcludes"] = -2147418112] = "CatchClauseExcludes";
    TransformFlags[TransformFlags["BindingPatternExcludes"] = -2147450880] = "BindingPatternExcludes";
    TransformFlags[TransformFlags["ContainsLexicalThisOrSuper"] = 134234112] = "ContainsLexicalThisOrSuper";
    // Propagating flags
    // - Bitmasks for flags that should propagate from a child
    TransformFlags[TransformFlags["PropertyNamePropagatingFlags"] = 134234112] = "PropertyNamePropagatingFlags";
    // Masks
    // - Additional bitmasks
})(TransformFlags || (TransformFlags = {}));

// Reference: https://code.visualstudio.com/docs/editor/userdefinedsnippets#_snippet-syntax
// dprint-ignore
/** @internal */
export var SnippetKind;
(function (SnippetKind) {
    SnippetKind[SnippetKind["TabStop"] = 0] = "TabStop";
    SnippetKind[SnippetKind["Placeholder"] = 1] = "Placeholder";
    SnippetKind[SnippetKind["Choice"] = 2] = "Choice";
    SnippetKind[SnippetKind["Variable"] = 3] = "Variable";
})(SnippetKind || (SnippetKind = {}));

// dprint-ignore
export var EmitFlags;
(function (EmitFlags) {
    EmitFlags[EmitFlags["None"] = 0] = "None";
    EmitFlags[EmitFlags["SingleLine"] = 1] = "SingleLine";
    EmitFlags[EmitFlags["MultiLine"] = 2] = "MultiLine";
    EmitFlags[EmitFlags["AdviseOnEmitNode"] = 4] = "AdviseOnEmitNode";
    EmitFlags[EmitFlags["NoSubstitution"] = 8] = "NoSubstitution";
    EmitFlags[EmitFlags["CapturesThis"] = 16] = "CapturesThis";
    EmitFlags[EmitFlags["NoLeadingSourceMap"] = 32] = "NoLeadingSourceMap";
    EmitFlags[EmitFlags["NoTrailingSourceMap"] = 64] = "NoTrailingSourceMap";
    EmitFlags[EmitFlags["NoSourceMap"] = 96] = "NoSourceMap";
    EmitFlags[EmitFlags["NoNestedSourceMaps"] = 128] = "NoNestedSourceMaps";
    EmitFlags[EmitFlags["NoTokenLeadingSourceMaps"] = 256] = "NoTokenLeadingSourceMaps";
    EmitFlags[EmitFlags["NoTokenTrailingSourceMaps"] = 512] = "NoTokenTrailingSourceMaps";
    EmitFlags[EmitFlags["NoTokenSourceMaps"] = 768] = "NoTokenSourceMaps";
    EmitFlags[EmitFlags["NoLeadingComments"] = 1024] = "NoLeadingComments";
    EmitFlags[EmitFlags["NoTrailingComments"] = 2048] = "NoTrailingComments";
    EmitFlags[EmitFlags["NoComments"] = 3072] = "NoComments";
    EmitFlags[EmitFlags["NoNestedComments"] = 4096] = "NoNestedComments";
    EmitFlags[EmitFlags["HelperName"] = 8192] = "HelperName";
    EmitFlags[EmitFlags["ExportName"] = 16384] = "ExportName";
    EmitFlags[EmitFlags["LocalName"] = 32768] = "LocalName";
    EmitFlags[EmitFlags["InternalName"] = 65536] = "InternalName";
    EmitFlags[EmitFlags["Indented"] = 131072] = "Indented";
    EmitFlags[EmitFlags["NoIndentation"] = 262144] = "NoIndentation";
    EmitFlags[EmitFlags["AsyncFunctionBody"] = 524288] = "AsyncFunctionBody";
    EmitFlags[EmitFlags["ReuseTempVariableScope"] = 1048576] = "ReuseTempVariableScope";
    EmitFlags[EmitFlags["CustomPrologue"] = 2097152] = "CustomPrologue";
    EmitFlags[EmitFlags["NoHoisting"] = 4194304] = "NoHoisting";
    EmitFlags[EmitFlags["Iterator"] = 8388608] = "Iterator";
    EmitFlags[EmitFlags["NoAsciiEscaping"] = 16777216] = "NoAsciiEscaping";
})(EmitFlags || (EmitFlags = {}));

// dprint-ignore
/** @internal */
export var InternalEmitFlags;
(function (InternalEmitFlags) {
    InternalEmitFlags[InternalEmitFlags["None"] = 0] = "None";
    InternalEmitFlags[InternalEmitFlags["TypeScriptClassWrapper"] = 1] = "TypeScriptClassWrapper";
    InternalEmitFlags[InternalEmitFlags["NeverApplyImportHelper"] = 2] = "NeverApplyImportHelper";
    InternalEmitFlags[InternalEmitFlags["IgnoreSourceNewlines"] = 4] = "IgnoreSourceNewlines";
    InternalEmitFlags[InternalEmitFlags["Immutable"] = 8] = "Immutable";
    InternalEmitFlags[InternalEmitFlags["IndirectCall"] = 16] = "IndirectCall";
    InternalEmitFlags[InternalEmitFlags["TransformPrivateStaticElements"] = 32] = "TransformPrivateStaticElements";
})(InternalEmitFlags || (InternalEmitFlags = {}));

/**
 * Indicates the minimum `ScriptTarget` (inclusive) after which a specific language feature is no longer transpiled.
 *
 * @internal
 */
export const LanguageFeatureMinimumTarget = {
    Classes: 2 /* ScriptTarget.ES2015 */,
    ForOf: 2 /* ScriptTarget.ES2015 */,
    Generators: 2 /* ScriptTarget.ES2015 */,
    Iteration: 2 /* ScriptTarget.ES2015 */,
    SpreadElements: 2 /* ScriptTarget.ES2015 */,
    RestElements: 2 /* ScriptTarget.ES2015 */,
    TaggedTemplates: 2 /* ScriptTarget.ES2015 */,
    DestructuringAssignment: 2 /* ScriptTarget.ES2015 */,
    BindingPatterns: 2 /* ScriptTarget.ES2015 */,
    ArrowFunctions: 2 /* ScriptTarget.ES2015 */,
    BlockScopedVariables: 2 /* ScriptTarget.ES2015 */,
    ObjectAssign: 2 /* ScriptTarget.ES2015 */,
    RegularExpressionFlagsUnicode: 2 /* ScriptTarget.ES2015 */,
    RegularExpressionFlagsSticky: 2 /* ScriptTarget.ES2015 */,
    Exponentiation: 3 /* ScriptTarget.ES2016 */,
    AsyncFunctions: 4 /* ScriptTarget.ES2017 */,
    ForAwaitOf: 5 /* ScriptTarget.ES2018 */,
    AsyncGenerators: 5 /* ScriptTarget.ES2018 */,
    AsyncIteration: 5 /* ScriptTarget.ES2018 */,
    ObjectSpreadRest: 5 /* ScriptTarget.ES2018 */,
    RegularExpressionFlagsDotAll: 5 /* ScriptTarget.ES2018 */,
    BindinglessCatch: 6 /* ScriptTarget.ES2019 */,
    BigInt: 7 /* ScriptTarget.ES2020 */,
    NullishCoalesce: 7 /* ScriptTarget.ES2020 */,
    OptionalChaining: 7 /* ScriptTarget.ES2020 */,
    LogicalAssignment: 8 /* ScriptTarget.ES2021 */,
    TopLevelAwait: 9 /* ScriptTarget.ES2022 */,
    ClassFields: 9 /* ScriptTarget.ES2022 */,
    PrivateNamesAndClassStaticBlocks: 9 /* ScriptTarget.ES2022 */,
    RegularExpressionFlagsHasIndices: 9 /* ScriptTarget.ES2022 */,
    ShebangComments: 10 /* ScriptTarget.ES2023 */,
    RegularExpressionFlagsUnicodeSets: 11 /* ScriptTarget.ES2024 */,
    UsingAndAwaitUsing: 99 /* ScriptTarget.ESNext */,
    ClassAndClassElementDecorators: 99 /* ScriptTarget.ESNext */,
};

// dprint-ignore
/**
 * Used by the checker, this enum keeps track of external emit helpers that should be type
 * checked.
 *
 * @internal
 */
export var ExternalEmitHelpers;
(function (ExternalEmitHelpers) {
    ExternalEmitHelpers[ExternalEmitHelpers["Extends"] = 1] = "Extends";
    ExternalEmitHelpers[ExternalEmitHelpers["Assign"] = 2] = "Assign";
    ExternalEmitHelpers[ExternalEmitHelpers["Rest"] = 4] = "Rest";
    ExternalEmitHelpers[ExternalEmitHelpers["Decorate"] = 8] = "Decorate";
    ExternalEmitHelpers[ExternalEmitHelpers["ESDecorateAndRunInitializers"] = 8] = "ESDecorateAndRunInitializers";
    ExternalEmitHelpers[ExternalEmitHelpers["Metadata"] = 16] = "Metadata";
    ExternalEmitHelpers[ExternalEmitHelpers["Param"] = 32] = "Param";
    ExternalEmitHelpers[ExternalEmitHelpers["Awaiter"] = 64] = "Awaiter";
    ExternalEmitHelpers[ExternalEmitHelpers["Generator"] = 128] = "Generator";
    ExternalEmitHelpers[ExternalEmitHelpers["Values"] = 256] = "Values";
    ExternalEmitHelpers[ExternalEmitHelpers["Read"] = 512] = "Read";
    ExternalEmitHelpers[ExternalEmitHelpers["SpreadArray"] = 1024] = "SpreadArray";
    ExternalEmitHelpers[ExternalEmitHelpers["Await"] = 2048] = "Await";
    ExternalEmitHelpers[ExternalEmitHelpers["AsyncGenerator"] = 4096] = "AsyncGenerator";
    ExternalEmitHelpers[ExternalEmitHelpers["AsyncDelegator"] = 8192] = "AsyncDelegator";
    ExternalEmitHelpers[ExternalEmitHelpers["AsyncValues"] = 16384] = "AsyncValues";
    ExternalEmitHelpers[ExternalEmitHelpers["ExportStar"] = 32768] = "ExportStar";
    ExternalEmitHelpers[ExternalEmitHelpers["ImportStar"] = 65536] = "ImportStar";
    ExternalEmitHelpers[ExternalEmitHelpers["ImportDefault"] = 131072] = "ImportDefault";
    ExternalEmitHelpers[ExternalEmitHelpers["MakeTemplateObject"] = 262144] = "MakeTemplateObject";
    ExternalEmitHelpers[ExternalEmitHelpers["ClassPrivateFieldGet"] = 524288] = "ClassPrivateFieldGet";
    ExternalEmitHelpers[ExternalEmitHelpers["ClassPrivateFieldSet"] = 1048576] = "ClassPrivateFieldSet";
    ExternalEmitHelpers[ExternalEmitHelpers["ClassPrivateFieldIn"] = 2097152] = "ClassPrivateFieldIn";
    ExternalEmitHelpers[ExternalEmitHelpers["SetFunctionName"] = 4194304] = "SetFunctionName";
    ExternalEmitHelpers[ExternalEmitHelpers["PropKey"] = 8388608] = "PropKey";
    ExternalEmitHelpers[ExternalEmitHelpers["AddDisposableResourceAndDisposeResources"] = 16777216] = "AddDisposableResourceAndDisposeResources";
    ExternalEmitHelpers[ExternalEmitHelpers["RewriteRelativeImportExtension"] = 33554432] = "RewriteRelativeImportExtension";
    ExternalEmitHelpers[ExternalEmitHelpers["FirstEmitHelper"] = 1] = "FirstEmitHelper";
    ExternalEmitHelpers[ExternalEmitHelpers["LastEmitHelper"] = 16777216] = "LastEmitHelper";
    // Helpers included by ES2015 for..of
    ExternalEmitHelpers[ExternalEmitHelpers["ForOfIncludes"] = 256] = "ForOfIncludes";
    // Helpers included by ES2017 for..await..of
    ExternalEmitHelpers[ExternalEmitHelpers["ForAwaitOfIncludes"] = 16384] = "ForAwaitOfIncludes";
    // Helpers included by ES2017 async generators
    ExternalEmitHelpers[ExternalEmitHelpers["AsyncGeneratorIncludes"] = 6144] = "AsyncGeneratorIncludes";
    // Helpers included by yield* in ES2017 async generators
    ExternalEmitHelpers[ExternalEmitHelpers["AsyncDelegatorIncludes"] = 26624] = "AsyncDelegatorIncludes";
    // Helpers included by ES2015 spread
    ExternalEmitHelpers[ExternalEmitHelpers["SpreadIncludes"] = 1536] = "SpreadIncludes";
})(ExternalEmitHelpers || (ExternalEmitHelpers = {}));

// dprint-ignore
export var EmitHint;
(function (EmitHint) {
    EmitHint[EmitHint["SourceFile"] = 0] = "SourceFile";
    EmitHint[EmitHint["Expression"] = 1] = "Expression";
    EmitHint[EmitHint["IdentifierName"] = 2] = "IdentifierName";
    EmitHint[EmitHint["MappedTypeParameter"] = 3] = "MappedTypeParameter";
    EmitHint[EmitHint["Unspecified"] = 4] = "Unspecified";
    EmitHint[EmitHint["EmbeddedStatement"] = 5] = "EmbeddedStatement";
    EmitHint[EmitHint["JsxAttributeValue"] = 6] = "JsxAttributeValue";
    EmitHint[EmitHint["ImportTypeNodeAttributes"] = 7] = "ImportTypeNodeAttributes";
})(EmitHint || (EmitHint = {}));

export var OuterExpressionKinds;
(function (OuterExpressionKinds) {
    OuterExpressionKinds[OuterExpressionKinds["Parentheses"] = 1] = "Parentheses";
    OuterExpressionKinds[OuterExpressionKinds["TypeAssertions"] = 2] = "TypeAssertions";
    OuterExpressionKinds[OuterExpressionKinds["NonNullAssertions"] = 4] = "NonNullAssertions";
    OuterExpressionKinds[OuterExpressionKinds["PartiallyEmittedExpressions"] = 8] = "PartiallyEmittedExpressions";
    OuterExpressionKinds[OuterExpressionKinds["ExpressionsWithTypeArguments"] = 16] = "ExpressionsWithTypeArguments";
    OuterExpressionKinds[OuterExpressionKinds["Satisfies"] = 32] = "Satisfies";
    OuterExpressionKinds[OuterExpressionKinds["Assertions"] = 38] = "Assertions";
    OuterExpressionKinds[OuterExpressionKinds["All"] = 63] = "All";
    OuterExpressionKinds[OuterExpressionKinds["ExcludeJSDocTypeAssertion"] = -2147483648] = "ExcludeJSDocTypeAssertion";
})(OuterExpressionKinds || (OuterExpressionKinds = {}));

/** @internal */
export var LexicalEnvironmentFlags;
(function (LexicalEnvironmentFlags) {
    LexicalEnvironmentFlags[LexicalEnvironmentFlags["None"] = 0] = "None";
    LexicalEnvironmentFlags[LexicalEnvironmentFlags["InParameters"] = 1] = "InParameters";
    LexicalEnvironmentFlags[LexicalEnvironmentFlags["VariablesHoistedInParameters"] = 2] = "VariablesHoistedInParameters";
})(LexicalEnvironmentFlags || (LexicalEnvironmentFlags = {}));

// dprint-ignore
export var ListFormat;
(function (ListFormat) {
    ListFormat[ListFormat["None"] = 0] = "None";
    // Line separators
    ListFormat[ListFormat["SingleLine"] = 0] = "SingleLine";
    ListFormat[ListFormat["MultiLine"] = 1] = "MultiLine";
    ListFormat[ListFormat["PreserveLines"] = 2] = "PreserveLines";
    ListFormat[ListFormat["LinesMask"] = 3] = "LinesMask";
    // Delimiters
    ListFormat[ListFormat["NotDelimited"] = 0] = "NotDelimited";
    ListFormat[ListFormat["BarDelimited"] = 4] = "BarDelimited";
    ListFormat[ListFormat["AmpersandDelimited"] = 8] = "AmpersandDelimited";
    ListFormat[ListFormat["CommaDelimited"] = 16] = "CommaDelimited";
    ListFormat[ListFormat["AsteriskDelimited"] = 32] = "AsteriskDelimited";
    ListFormat[ListFormat["DelimitersMask"] = 60] = "DelimitersMask";
    ListFormat[ListFormat["AllowTrailingComma"] = 64] = "AllowTrailingComma";
    // Whitespace
    ListFormat[ListFormat["Indented"] = 128] = "Indented";
    ListFormat[ListFormat["SpaceBetweenBraces"] = 256] = "SpaceBetweenBraces";
    ListFormat[ListFormat["SpaceBetweenSiblings"] = 512] = "SpaceBetweenSiblings";
    // Brackets/Braces
    ListFormat[ListFormat["Braces"] = 1024] = "Braces";
    ListFormat[ListFormat["Parenthesis"] = 2048] = "Parenthesis";
    ListFormat[ListFormat["AngleBrackets"] = 4096] = "AngleBrackets";
    ListFormat[ListFormat["SquareBrackets"] = 8192] = "SquareBrackets";
    ListFormat[ListFormat["BracketsMask"] = 15360] = "BracketsMask";
    ListFormat[ListFormat["OptionalIfUndefined"] = 16384] = "OptionalIfUndefined";
    ListFormat[ListFormat["OptionalIfEmpty"] = 32768] = "OptionalIfEmpty";
    ListFormat[ListFormat["Optional"] = 49152] = "Optional";
    // Other
    ListFormat[ListFormat["PreferNewLine"] = 65536] = "PreferNewLine";
    ListFormat[ListFormat["NoTrailingNewLine"] = 131072] = "NoTrailingNewLine";
    ListFormat[ListFormat["NoInterveningComments"] = 262144] = "NoInterveningComments";
    ListFormat[ListFormat["NoSpaceIfEmpty"] = 524288] = "NoSpaceIfEmpty";
    ListFormat[ListFormat["SingleElement"] = 1048576] = "SingleElement";
    ListFormat[ListFormat["SpaceAfterList"] = 2097152] = "SpaceAfterList";
    // Precomputed Formats
    ListFormat[ListFormat["Modifiers"] = 2359808] = "Modifiers";
    ListFormat[ListFormat["HeritageClauses"] = 512] = "HeritageClauses";
    ListFormat[ListFormat["SingleLineTypeLiteralMembers"] = 768] = "SingleLineTypeLiteralMembers";
    ListFormat[ListFormat["MultiLineTypeLiteralMembers"] = 32897] = "MultiLineTypeLiteralMembers";
    ListFormat[ListFormat["SingleLineTupleTypeElements"] = 528] = "SingleLineTupleTypeElements";
    ListFormat[ListFormat["MultiLineTupleTypeElements"] = 657] = "MultiLineTupleTypeElements";
    ListFormat[ListFormat["UnionTypeConstituents"] = 516] = "UnionTypeConstituents";
    ListFormat[ListFormat["IntersectionTypeConstituents"] = 520] = "IntersectionTypeConstituents";
    ListFormat[ListFormat["ObjectBindingPatternElements"] = 525136] = "ObjectBindingPatternElements";
    ListFormat[ListFormat["ArrayBindingPatternElements"] = 524880] = "ArrayBindingPatternElements";
    ListFormat[ListFormat["ObjectLiteralExpressionProperties"] = 526226] = "ObjectLiteralExpressionProperties";
    ListFormat[ListFormat["ImportAttributes"] = 526226] = "ImportAttributes";
    /** @deprecated */ ListFormat[ListFormat["ImportClauseEntries"] = 526226] = "ImportClauseEntries";
    ListFormat[ListFormat["ArrayLiteralExpressionElements"] = 8914] = "ArrayLiteralExpressionElements";
    ListFormat[ListFormat["CommaListElements"] = 528] = "CommaListElements";
    ListFormat[ListFormat["CallExpressionArguments"] = 2576] = "CallExpressionArguments";
    ListFormat[ListFormat["NewExpressionArguments"] = 18960] = "NewExpressionArguments";
    ListFormat[ListFormat["TemplateExpressionSpans"] = 262144] = "TemplateExpressionSpans";
    ListFormat[ListFormat["SingleLineBlockStatements"] = 768] = "SingleLineBlockStatements";
    ListFormat[ListFormat["MultiLineBlockStatements"] = 129] = "MultiLineBlockStatements";
    ListFormat[ListFormat["VariableDeclarationList"] = 528] = "VariableDeclarationList";
    ListFormat[ListFormat["SingleLineFunctionBodyStatements"] = 768] = "SingleLineFunctionBodyStatements";
    ListFormat[ListFormat["MultiLineFunctionBodyStatements"] = 1] = "MultiLineFunctionBodyStatements";
    ListFormat[ListFormat["ClassHeritageClauses"] = 0] = "ClassHeritageClauses";
    ListFormat[ListFormat["ClassMembers"] = 129] = "ClassMembers";
    ListFormat[ListFormat["InterfaceMembers"] = 129] = "InterfaceMembers";
    ListFormat[ListFormat["EnumMembers"] = 145] = "EnumMembers";
    ListFormat[ListFormat["CaseBlockClauses"] = 129] = "CaseBlockClauses";
    ListFormat[ListFormat["NamedImportsOrExportsElements"] = 525136] = "NamedImportsOrExportsElements";
    ListFormat[ListFormat["JsxElementOrFragmentChildren"] = 262144] = "JsxElementOrFragmentChildren";
    ListFormat[ListFormat["JsxElementAttributes"] = 262656] = "JsxElementAttributes";
    ListFormat[ListFormat["CaseOrDefaultClauseStatements"] = 163969] = "CaseOrDefaultClauseStatements";
    ListFormat[ListFormat["HeritageClauseTypes"] = 528] = "HeritageClauseTypes";
    ListFormat[ListFormat["SourceFileStatements"] = 131073] = "SourceFileStatements";
    ListFormat[ListFormat["Decorators"] = 2146305] = "Decorators";
    ListFormat[ListFormat["TypeArguments"] = 53776] = "TypeArguments";
    ListFormat[ListFormat["TypeParameters"] = 53776] = "TypeParameters";
    ListFormat[ListFormat["Parameters"] = 2576] = "Parameters";
    ListFormat[ListFormat["IndexSignatureParameters"] = 8848] = "IndexSignatureParameters";
    ListFormat[ListFormat["JSDocComment"] = 33] = "JSDocComment";
})(ListFormat || (ListFormat = {}));

/** @internal */
export var PragmaKindFlags;
(function (PragmaKindFlags) {
    PragmaKindFlags[PragmaKindFlags["None"] = 0] = "None";
    /**
     * Triple slash comment of the form
     * /// <pragma-name argname="value" />
     */
    PragmaKindFlags[PragmaKindFlags["TripleSlashXML"] = 1] = "TripleSlashXML";
    /**
     * Single line comment of the form
     * // @pragma-name argval1 argval2
     * or
     * /// @pragma-name argval1 argval2
     */
    PragmaKindFlags[PragmaKindFlags["SingleLine"] = 2] = "SingleLine";
    /**
     * Multiline non-jsdoc pragma of the form
     * /* @pragma-name argval1 argval2 * /
     */
    PragmaKindFlags[PragmaKindFlags["MultiLine"] = 4] = "MultiLine";
    PragmaKindFlags[PragmaKindFlags["All"] = 7] = "All";
    PragmaKindFlags[PragmaKindFlags["Default"] = 7] = "Default";
})(PragmaKindFlags || (PragmaKindFlags = {}));

// While not strictly a type, this is here because `PragmaMap` needs to be here to be used with `SourceFile`, and we don't
//  fancy effectively defining it twice, once in value-space and once in type-space
/** @internal */
export const commentPragmas = {
    "reference": {
        args: [
            { name: "types", optional: true, captureSpan: true },
            { name: "lib", optional: true, captureSpan: true },
            { name: "path", optional: true, captureSpan: true },
            { name: "no-default-lib", optional: true },
            { name: "resolution-mode", optional: true },
            { name: "preserve", optional: true },
        ],
        kind: 1 /* PragmaKindFlags.TripleSlashXML */,
    },
    "amd-dependency": {
        args: [{ name: "path" }, { name: "name", optional: true }],
        kind: 1 /* PragmaKindFlags.TripleSlashXML */,
    },
    "amd-module": {
        args: [{ name: "name" }],
        kind: 1 /* PragmaKindFlags.TripleSlashXML */,
    },
    "ts-check": {
        kind: 2 /* PragmaKindFlags.SingleLine */,
    },
    "ts-nocheck": {
        kind: 2 /* PragmaKindFlags.SingleLine */,
    },
    "jsx": {
        args: [{ name: "factory" }],
        kind: 4 /* PragmaKindFlags.MultiLine */,
    },
    "jsxfrag": {
        args: [{ name: "factory" }],
        kind: 4 /* PragmaKindFlags.MultiLine */,
    },
    "jsximportsource": {
        args: [{ name: "factory" }],
        kind: 4 /* PragmaKindFlags.MultiLine */,
    },
    "jsxruntime": {
        args: [{ name: "factory" }],
        kind: 4 /* PragmaKindFlags.MultiLine */,
    },
};

export var JSDocParsingMode;
(function (JSDocParsingMode) {
    /**
     * Always parse JSDoc comments and include them in the AST.
     *
     * This is the default if no mode is provided.
     */
    JSDocParsingMode[JSDocParsingMode["ParseAll"] = 0] = "ParseAll";
    /**
     * Never parse JSDoc comments, mo matter the file type.
     */
    JSDocParsingMode[JSDocParsingMode["ParseNone"] = 1] = "ParseNone";
    /**
     * Parse only JSDoc comments which are needed to provide correct type errors.
     *
     * This will always parse JSDoc in non-TS files, but only parse JSDoc comments
     * containing `@see` and `@link` in TS files.
     */
    JSDocParsingMode[JSDocParsingMode["ParseForTypeErrors"] = 2] = "ParseForTypeErrors";
    /**
     * Parse only JSDoc comments which are needed to provide correct type info.
     *
     * This will always parse JSDoc in non-TS files, but never in TS files.
     *
     * Note: Do not use this mode if you require accurate type errors; use {@link ParseForTypeErrors} instead.
     */
    JSDocParsingMode[JSDocParsingMode["ParseForTypeInfo"] = 3] = "ParseForTypeInfo";
})(JSDocParsingMode || (JSDocParsingMode = {}));
