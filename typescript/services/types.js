export var ScriptSnapshot;
(function (ScriptSnapshot) {
    class StringScriptSnapshot {
        constructor(text) {
            this.text = text;
        }
        getText(start, end) {
            return start === 0 && end === this.text.length
                ? this.text
                : this.text.substring(start, end);
        }
        getLength() {
            return this.text.length;
        }
        getChangeRange() {
            // Text-based snapshots do not support incremental parsing. Return undefined
            // to signal that to the caller.
            return undefined;
        }
    }
    function fromString(text) {
        return new StringScriptSnapshot(text);
    }
    ScriptSnapshot.fromString = fromString;
})(ScriptSnapshot || (ScriptSnapshot = {}));
/** @internal */
export var PackageJsonDependencyGroup;
(function (PackageJsonDependencyGroup) {
    PackageJsonDependencyGroup[PackageJsonDependencyGroup["Dependencies"] = 1] = "Dependencies";
    PackageJsonDependencyGroup[PackageJsonDependencyGroup["DevDependencies"] = 2] = "DevDependencies";
    PackageJsonDependencyGroup[PackageJsonDependencyGroup["PeerDependencies"] = 4] = "PeerDependencies";
    PackageJsonDependencyGroup[PackageJsonDependencyGroup["OptionalDependencies"] = 8] = "OptionalDependencies";
    PackageJsonDependencyGroup[PackageJsonDependencyGroup["All"] = 15] = "All";
})(PackageJsonDependencyGroup || (PackageJsonDependencyGroup = {}));
/** @internal */
export var PackageJsonAutoImportPreference;
(function (PackageJsonAutoImportPreference) {
    PackageJsonAutoImportPreference[PackageJsonAutoImportPreference["Off"] = 0] = "Off";
    PackageJsonAutoImportPreference[PackageJsonAutoImportPreference["On"] = 1] = "On";
    PackageJsonAutoImportPreference[PackageJsonAutoImportPreference["Auto"] = 2] = "Auto";
})(PackageJsonAutoImportPreference || (PackageJsonAutoImportPreference = {}));
export var LanguageServiceMode;
(function (LanguageServiceMode) {
    LanguageServiceMode[LanguageServiceMode["Semantic"] = 0] = "Semantic";
    LanguageServiceMode[LanguageServiceMode["PartialSemantic"] = 1] = "PartialSemantic";
    LanguageServiceMode[LanguageServiceMode["Syntactic"] = 2] = "Syntactic";
})(LanguageServiceMode || (LanguageServiceMode = {}));
/** @internal */
export const emptyOptions = {};
export var SemanticClassificationFormat;
(function (SemanticClassificationFormat) {
    SemanticClassificationFormat["Original"] = "original";
    SemanticClassificationFormat["TwentyTwenty"] = "2020";
})(SemanticClassificationFormat || (SemanticClassificationFormat = {}));
export var OrganizeImportsMode;
(function (OrganizeImportsMode) {
    OrganizeImportsMode["All"] = "All";
    OrganizeImportsMode["SortAndCombine"] = "SortAndCombine";
    OrganizeImportsMode["RemoveUnused"] = "RemoveUnused";
})(OrganizeImportsMode || (OrganizeImportsMode = {}));
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    /** Completion was triggered by typing an identifier, manual invocation (e.g Ctrl+Space) or via API. */
    CompletionTriggerKind[CompletionTriggerKind["Invoked"] = 1] = "Invoked";
    /** Completion was triggered by a trigger character. */
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    /** Completion was re-triggered as the current completion list is incomplete. */
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 3] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind["Type"] = "Type";
    InlayHintKind["Parameter"] = "Parameter";
    InlayHintKind["Enum"] = "Enum";
})(InlayHintKind || (InlayHintKind = {}));
export var HighlightSpanKind;
(function (HighlightSpanKind) {
    HighlightSpanKind["none"] = "none";
    HighlightSpanKind["definition"] = "definition";
    HighlightSpanKind["reference"] = "reference";
    HighlightSpanKind["writtenReference"] = "writtenReference";
})(HighlightSpanKind || (HighlightSpanKind = {}));
export var IndentStyle;
(function (IndentStyle) {
    IndentStyle[IndentStyle["None"] = 0] = "None";
    IndentStyle[IndentStyle["Block"] = 1] = "Block";
    IndentStyle[IndentStyle["Smart"] = 2] = "Smart";
})(IndentStyle || (IndentStyle = {}));
export var SemicolonPreference;
(function (SemicolonPreference) {
    SemicolonPreference["Ignore"] = "ignore";
    SemicolonPreference["Insert"] = "insert";
    SemicolonPreference["Remove"] = "remove";
})(SemicolonPreference || (SemicolonPreference = {}));
export function getDefaultFormatCodeSettings(newLineCharacter) {
    return {
        indentSize: 4,
        tabSize: 4,
        newLineCharacter: newLineCharacter || "\n",
        convertTabsToSpaces: true,
        indentStyle: IndentStyle.Smart,
        insertSpaceAfterConstructor: false,
        insertSpaceAfterCommaDelimiter: true,
        insertSpaceAfterSemicolonInForStatements: true,
        insertSpaceBeforeAndAfterBinaryOperators: true,
        insertSpaceAfterKeywordsInControlFlowStatements: true,
        insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
        insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
        insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
        insertSpaceBeforeFunctionParenthesis: false,
        placeOpenBraceOnNewLineForFunctions: false,
        placeOpenBraceOnNewLineForControlBlocks: false,
        semicolons: SemicolonPreference.Ignore,
        trimTrailingWhitespace: true,
        indentSwitchCase: true,
    };
}
/** @internal */
export const testFormatSettings = getDefaultFormatCodeSettings("\n");
export var SymbolDisplayPartKind;
(function (SymbolDisplayPartKind) {
    SymbolDisplayPartKind[SymbolDisplayPartKind["aliasName"] = 0] = "aliasName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["className"] = 1] = "className";
    SymbolDisplayPartKind[SymbolDisplayPartKind["enumName"] = 2] = "enumName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["fieldName"] = 3] = "fieldName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["interfaceName"] = 4] = "interfaceName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["keyword"] = 5] = "keyword";
    SymbolDisplayPartKind[SymbolDisplayPartKind["lineBreak"] = 6] = "lineBreak";
    SymbolDisplayPartKind[SymbolDisplayPartKind["numericLiteral"] = 7] = "numericLiteral";
    SymbolDisplayPartKind[SymbolDisplayPartKind["stringLiteral"] = 8] = "stringLiteral";
    SymbolDisplayPartKind[SymbolDisplayPartKind["localName"] = 9] = "localName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["methodName"] = 10] = "methodName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["moduleName"] = 11] = "moduleName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["operator"] = 12] = "operator";
    SymbolDisplayPartKind[SymbolDisplayPartKind["parameterName"] = 13] = "parameterName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["propertyName"] = 14] = "propertyName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["punctuation"] = 15] = "punctuation";
    SymbolDisplayPartKind[SymbolDisplayPartKind["space"] = 16] = "space";
    SymbolDisplayPartKind[SymbolDisplayPartKind["text"] = 17] = "text";
    SymbolDisplayPartKind[SymbolDisplayPartKind["typeParameterName"] = 18] = "typeParameterName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["enumMemberName"] = 19] = "enumMemberName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["functionName"] = 20] = "functionName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["regularExpressionLiteral"] = 21] = "regularExpressionLiteral";
    SymbolDisplayPartKind[SymbolDisplayPartKind["link"] = 22] = "link";
    SymbolDisplayPartKind[SymbolDisplayPartKind["linkName"] = 23] = "linkName";
    SymbolDisplayPartKind[SymbolDisplayPartKind["linkText"] = 24] = "linkText";
})(SymbolDisplayPartKind || (SymbolDisplayPartKind = {}));
// Do not change existing values, as they exist in telemetry.
export var CompletionInfoFlags;
(function (CompletionInfoFlags) {
    CompletionInfoFlags[CompletionInfoFlags["None"] = 0] = "None";
    CompletionInfoFlags[CompletionInfoFlags["MayIncludeAutoImports"] = 1] = "MayIncludeAutoImports";
    CompletionInfoFlags[CompletionInfoFlags["IsImportStatementCompletion"] = 2] = "IsImportStatementCompletion";
    CompletionInfoFlags[CompletionInfoFlags["IsContinuation"] = 4] = "IsContinuation";
    CompletionInfoFlags[CompletionInfoFlags["ResolvedModuleSpecifiers"] = 8] = "ResolvedModuleSpecifiers";
    CompletionInfoFlags[CompletionInfoFlags["ResolvedModuleSpecifiersBeyondLimit"] = 16] = "ResolvedModuleSpecifiersBeyondLimit";
    CompletionInfoFlags[CompletionInfoFlags["MayIncludeMethodSnippets"] = 32] = "MayIncludeMethodSnippets";
})(CompletionInfoFlags || (CompletionInfoFlags = {}));
export var OutliningSpanKind;
(function (OutliningSpanKind) {
    /** Single or multi-line comments */
    OutliningSpanKind["Comment"] = "comment";
    /** Sections marked by '// #region' and '// #endregion' comments */
    OutliningSpanKind["Region"] = "region";
    /** Declarations and expressions */
    OutliningSpanKind["Code"] = "code";
    /** Contiguous blocks of import declarations */
    OutliningSpanKind["Imports"] = "imports";
})(OutliningSpanKind || (OutliningSpanKind = {}));
export var OutputFileType;
(function (OutputFileType) {
    OutputFileType[OutputFileType["JavaScript"] = 0] = "JavaScript";
    OutputFileType[OutputFileType["SourceMap"] = 1] = "SourceMap";
    OutputFileType[OutputFileType["Declaration"] = 2] = "Declaration";
})(OutputFileType || (OutputFileType = {}));
export var EndOfLineState;
(function (EndOfLineState) {
    EndOfLineState[EndOfLineState["None"] = 0] = "None";
    EndOfLineState[EndOfLineState["InMultiLineCommentTrivia"] = 1] = "InMultiLineCommentTrivia";
    EndOfLineState[EndOfLineState["InSingleQuoteStringLiteral"] = 2] = "InSingleQuoteStringLiteral";
    EndOfLineState[EndOfLineState["InDoubleQuoteStringLiteral"] = 3] = "InDoubleQuoteStringLiteral";
    EndOfLineState[EndOfLineState["InTemplateHeadOrNoSubstitutionTemplate"] = 4] = "InTemplateHeadOrNoSubstitutionTemplate";
    EndOfLineState[EndOfLineState["InTemplateMiddleOrTail"] = 5] = "InTemplateMiddleOrTail";
    EndOfLineState[EndOfLineState["InTemplateSubstitutionPosition"] = 6] = "InTemplateSubstitutionPosition";
})(EndOfLineState || (EndOfLineState = {}));
export var TokenClass;
(function (TokenClass) {
    TokenClass[TokenClass["Punctuation"] = 0] = "Punctuation";
    TokenClass[TokenClass["Keyword"] = 1] = "Keyword";
    TokenClass[TokenClass["Operator"] = 2] = "Operator";
    TokenClass[TokenClass["Comment"] = 3] = "Comment";
    TokenClass[TokenClass["Whitespace"] = 4] = "Whitespace";
    TokenClass[TokenClass["Identifier"] = 5] = "Identifier";
    TokenClass[TokenClass["NumberLiteral"] = 6] = "NumberLiteral";
    TokenClass[TokenClass["BigIntLiteral"] = 7] = "BigIntLiteral";
    TokenClass[TokenClass["StringLiteral"] = 8] = "StringLiteral";
    TokenClass[TokenClass["RegExpLiteral"] = 9] = "RegExpLiteral";
})(TokenClass || (TokenClass = {}));
export var ScriptElementKind;
(function (ScriptElementKind) {
    ScriptElementKind["unknown"] = "";
    ScriptElementKind["warning"] = "warning";
    /** predefined type (void) or keyword (class) */
    ScriptElementKind["keyword"] = "keyword";
    /** top level script node */
    ScriptElementKind["scriptElement"] = "script";
    /** module foo {} */
    ScriptElementKind["moduleElement"] = "module";
    /** class X {} */
    ScriptElementKind["classElement"] = "class";
    /** var x = class X {} */
    ScriptElementKind["localClassElement"] = "local class";
    /** interface Y {} */
    ScriptElementKind["interfaceElement"] = "interface";
    /** type T = ... */
    ScriptElementKind["typeElement"] = "type";
    /** enum E */
    ScriptElementKind["enumElement"] = "enum";
    ScriptElementKind["enumMemberElement"] = "enum member";
    /**
     * Inside module and script only
     * const v = ..
     */
    ScriptElementKind["variableElement"] = "var";
    /** Inside function */
    ScriptElementKind["localVariableElement"] = "local var";
    /** using foo = ... */
    ScriptElementKind["variableUsingElement"] = "using";
    /** await using foo = ... */
    ScriptElementKind["variableAwaitUsingElement"] = "await using";
    /**
     * Inside module and script only
     * function f() { }
     */
    ScriptElementKind["functionElement"] = "function";
    /** Inside function */
    ScriptElementKind["localFunctionElement"] = "local function";
    /** class X { [public|private]* foo() {} } */
    ScriptElementKind["memberFunctionElement"] = "method";
    /** class X { [public|private]* [get|set] foo:number; } */
    ScriptElementKind["memberGetAccessorElement"] = "getter";
    ScriptElementKind["memberSetAccessorElement"] = "setter";
    /**
     * class X { [public|private]* foo:number; }
     * interface Y { foo:number; }
     */
    ScriptElementKind["memberVariableElement"] = "property";
    /** class X { [public|private]* accessor foo: number; } */
    ScriptElementKind["memberAccessorVariableElement"] = "accessor";
    /**
     * class X { constructor() { } }
     * class X { static { } }
     */
    ScriptElementKind["constructorImplementationElement"] = "constructor";
    /** interface Y { ():number; } */
    ScriptElementKind["callSignatureElement"] = "call";
    /** interface Y { []:number; } */
    ScriptElementKind["indexSignatureElement"] = "index";
    /** interface Y { new():Y; } */
    ScriptElementKind["constructSignatureElement"] = "construct";
    /** function foo(*Y*: string) */
    ScriptElementKind["parameterElement"] = "parameter";
    ScriptElementKind["typeParameterElement"] = "type parameter";
    ScriptElementKind["primitiveType"] = "primitive type";
    ScriptElementKind["label"] = "label";
    ScriptElementKind["alias"] = "alias";
    ScriptElementKind["constElement"] = "const";
    ScriptElementKind["letElement"] = "let";
    ScriptElementKind["directory"] = "directory";
    ScriptElementKind["externalModuleName"] = "external module name";
    /**
     * <JsxTagName attribute1 attribute2={0} />
     * @deprecated
     */
    ScriptElementKind["jsxAttribute"] = "JSX attribute";
    /** String literal */
    ScriptElementKind["string"] = "string";
    /** Jsdoc @link: in `{@link C link text}`, the before and after text "{@link " and "}" */
    ScriptElementKind["link"] = "link";
    /** Jsdoc @link: in `{@link C link text}`, the entity name "C" */
    ScriptElementKind["linkName"] = "link name";
    /** Jsdoc @link: in `{@link C link text}`, the link text "link text" */
    ScriptElementKind["linkText"] = "link text";
})(ScriptElementKind || (ScriptElementKind = {}));
export var ScriptElementKindModifier;
(function (ScriptElementKindModifier) {
    ScriptElementKindModifier["none"] = "";
    ScriptElementKindModifier["publicMemberModifier"] = "public";
    ScriptElementKindModifier["privateMemberModifier"] = "private";
    ScriptElementKindModifier["protectedMemberModifier"] = "protected";
    ScriptElementKindModifier["exportedModifier"] = "export";
    ScriptElementKindModifier["ambientModifier"] = "declare";
    ScriptElementKindModifier["staticModifier"] = "static";
    ScriptElementKindModifier["abstractModifier"] = "abstract";
    ScriptElementKindModifier["optionalModifier"] = "optional";
    ScriptElementKindModifier["deprecatedModifier"] = "deprecated";
    ScriptElementKindModifier["dtsModifier"] = ".d.ts";
    ScriptElementKindModifier["tsModifier"] = ".ts";
    ScriptElementKindModifier["tsxModifier"] = ".tsx";
    ScriptElementKindModifier["jsModifier"] = ".js";
    ScriptElementKindModifier["jsxModifier"] = ".jsx";
    ScriptElementKindModifier["jsonModifier"] = ".json";
    ScriptElementKindModifier["dmtsModifier"] = ".d.mts";
    ScriptElementKindModifier["mtsModifier"] = ".mts";
    ScriptElementKindModifier["mjsModifier"] = ".mjs";
    ScriptElementKindModifier["dctsModifier"] = ".d.cts";
    ScriptElementKindModifier["ctsModifier"] = ".cts";
    ScriptElementKindModifier["cjsModifier"] = ".cjs";
})(ScriptElementKindModifier || (ScriptElementKindModifier = {}));
export var ClassificationTypeNames;
(function (ClassificationTypeNames) {
    ClassificationTypeNames["comment"] = "comment";
    ClassificationTypeNames["identifier"] = "identifier";
    ClassificationTypeNames["keyword"] = "keyword";
    ClassificationTypeNames["numericLiteral"] = "number";
    ClassificationTypeNames["bigintLiteral"] = "bigint";
    ClassificationTypeNames["operator"] = "operator";
    ClassificationTypeNames["stringLiteral"] = "string";
    ClassificationTypeNames["whiteSpace"] = "whitespace";
    ClassificationTypeNames["text"] = "text";
    ClassificationTypeNames["punctuation"] = "punctuation";
    ClassificationTypeNames["className"] = "class name";
    ClassificationTypeNames["enumName"] = "enum name";
    ClassificationTypeNames["interfaceName"] = "interface name";
    ClassificationTypeNames["moduleName"] = "module name";
    ClassificationTypeNames["typeParameterName"] = "type parameter name";
    ClassificationTypeNames["typeAliasName"] = "type alias name";
    ClassificationTypeNames["parameterName"] = "parameter name";
    ClassificationTypeNames["docCommentTagName"] = "doc comment tag name";
    ClassificationTypeNames["jsxOpenTagName"] = "jsx open tag name";
    ClassificationTypeNames["jsxCloseTagName"] = "jsx close tag name";
    ClassificationTypeNames["jsxSelfClosingTagName"] = "jsx self closing tag name";
    ClassificationTypeNames["jsxAttribute"] = "jsx attribute";
    ClassificationTypeNames["jsxText"] = "jsx text";
    ClassificationTypeNames["jsxAttributeStringLiteralValue"] = "jsx attribute string literal value";
})(ClassificationTypeNames || (ClassificationTypeNames = {}));
export var ClassificationType;
(function (ClassificationType) {
    ClassificationType[ClassificationType["comment"] = 1] = "comment";
    ClassificationType[ClassificationType["identifier"] = 2] = "identifier";
    ClassificationType[ClassificationType["keyword"] = 3] = "keyword";
    ClassificationType[ClassificationType["numericLiteral"] = 4] = "numericLiteral";
    ClassificationType[ClassificationType["operator"] = 5] = "operator";
    ClassificationType[ClassificationType["stringLiteral"] = 6] = "stringLiteral";
    ClassificationType[ClassificationType["regularExpressionLiteral"] = 7] = "regularExpressionLiteral";
    ClassificationType[ClassificationType["whiteSpace"] = 8] = "whiteSpace";
    ClassificationType[ClassificationType["text"] = 9] = "text";
    ClassificationType[ClassificationType["punctuation"] = 10] = "punctuation";
    ClassificationType[ClassificationType["className"] = 11] = "className";
    ClassificationType[ClassificationType["enumName"] = 12] = "enumName";
    ClassificationType[ClassificationType["interfaceName"] = 13] = "interfaceName";
    ClassificationType[ClassificationType["moduleName"] = 14] = "moduleName";
    ClassificationType[ClassificationType["typeParameterName"] = 15] = "typeParameterName";
    ClassificationType[ClassificationType["typeAliasName"] = 16] = "typeAliasName";
    ClassificationType[ClassificationType["parameterName"] = 17] = "parameterName";
    ClassificationType[ClassificationType["docCommentTagName"] = 18] = "docCommentTagName";
    ClassificationType[ClassificationType["jsxOpenTagName"] = 19] = "jsxOpenTagName";
    ClassificationType[ClassificationType["jsxCloseTagName"] = 20] = "jsxCloseTagName";
    ClassificationType[ClassificationType["jsxSelfClosingTagName"] = 21] = "jsxSelfClosingTagName";
    ClassificationType[ClassificationType["jsxAttribute"] = 22] = "jsxAttribute";
    ClassificationType[ClassificationType["jsxText"] = 23] = "jsxText";
    ClassificationType[ClassificationType["jsxAttributeStringLiteralValue"] = 24] = "jsxAttributeStringLiteralValue";
    ClassificationType[ClassificationType["bigintLiteral"] = 25] = "bigintLiteral";
})(ClassificationType || (ClassificationType = {}));
