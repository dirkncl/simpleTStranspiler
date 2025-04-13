import {
  ClassificationType,
  CompletionTriggerKind,
  OrganizeImportsMode,
  SemicolonPreference,
} from "./namespaces/ts.js";

// These types/enums used to be defined in duplicate here and exported. They are re-exported to avoid breaking changes.
export {
  ClassificationType,
  CompletionTriggerKind,
  OrganizeImportsMode,
  SemicolonPreference
};

// // Declaration module describing the TypeScript Server protocol
// export const enum CommandTypes {
//     JsxClosingTag = "jsxClosingTag",
//     LinkedEditingRange = "linkedEditingRange",
//     Brace = "brace",
//     /** @internal */
//     BraceFull = "brace-full",
//     BraceCompletion = "braceCompletion",
//     GetSpanOfEnclosingComment = "getSpanOfEnclosingComment",
//     Change = "change",
//     Close = "close",
//     /** @deprecated Prefer CompletionInfo -- see comment on CompletionsResponse */
//     Completions = "completions",
//     CompletionInfo = "completionInfo",
//     /** @internal */
//     CompletionsFull = "completions-full",
//     CompletionDetails = "completionEntryDetails",
//     /** @internal */
//     CompletionDetailsFull = "completionEntryDetails-full",
//     CompileOnSaveAffectedFileList = "compileOnSaveAffectedFileList",
//     CompileOnSaveEmitFile = "compileOnSaveEmitFile",
//     Configure = "configure",
//     Definition = "definition",
//     /** @internal */
//     DefinitionFull = "definition-full",
//     DefinitionAndBoundSpan = "definitionAndBoundSpan",
//     /** @internal */
//     DefinitionAndBoundSpanFull = "definitionAndBoundSpan-full",
//     Implementation = "implementation",
//     /** @internal */
//     ImplementationFull = "implementation-full",
//     /** @internal */
//     EmitOutput = "emit-output",
//     Exit = "exit",
//     FileReferences = "fileReferences",
//     /** @internal */
//     FileReferencesFull = "fileReferences-full",
//     Format = "format",
//     Formatonkey = "formatonkey",
//     /** @internal */
//     FormatFull = "format-full",
//     /** @internal */
//     FormatonkeyFull = "formatonkey-full",
//     /** @internal */
//     FormatRangeFull = "formatRange-full",
//     Geterr = "geterr",
//     GeterrForProject = "geterrForProject",
//     SemanticDiagnosticsSync = "semanticDiagnosticsSync",
//     SyntacticDiagnosticsSync = "syntacticDiagnosticsSync",
//     SuggestionDiagnosticsSync = "suggestionDiagnosticsSync",
//     NavBar = "navbar",
//     /** @internal */
//     NavBarFull = "navbar-full",
//     Navto = "navto",
//     /** @internal */
//     NavtoFull = "navto-full",
//     NavTree = "navtree",
//     NavTreeFull = "navtree-full",
//     DocumentHighlights = "documentHighlights",
//     /** @internal */
//     DocumentHighlightsFull = "documentHighlights-full",
//     Open = "open",
//     Quickinfo = "quickinfo",
//     /** @internal */
//     QuickinfoFull = "quickinfo-full",
//     References = "references",
//     /** @internal */
//     ReferencesFull = "references-full",
//     Reload = "reload",
//     Rename = "rename",
//     /** @internal */
//     RenameInfoFull = "rename-full",
//     /** @internal */
//     RenameLocationsFull = "renameLocations-full",
//     Saveto = "saveto",
//     SignatureHelp = "signatureHelp",
//     /** @internal */
//     SignatureHelpFull = "signatureHelp-full",
//     FindSourceDefinition = "findSourceDefinition",
//     Status = "status",
//     TypeDefinition = "typeDefinition",
//     ProjectInfo = "projectInfo",
//     ReloadProjects = "reloadProjects",
//     Unknown = "unknown",
//     OpenExternalProject = "openExternalProject",
//     OpenExternalProjects = "openExternalProjects",
//     CloseExternalProject = "closeExternalProject",
//     /** @internal */
//     SynchronizeProjectList = "synchronizeProjectList",
//     /** @internal */
//     ApplyChangedToOpenFiles = "applyChangedToOpenFiles",
//     UpdateOpen = "updateOpen",
//     /** @internal */
//     EncodedSyntacticClassificationsFull = "encodedSyntacticClassifications-full",
//     /** @internal */
//     EncodedSemanticClassificationsFull = "encodedSemanticClassifications-full",
//     /** @internal */
//     Cleanup = "cleanup",
//     GetOutliningSpans = "getOutliningSpans",
//     /** @internal */
//     GetOutliningSpansFull = "outliningSpans", // Full command name is different for backward compatibility purposes
//     TodoComments = "todoComments",
//     Indentation = "indentation",
//     DocCommentTemplate = "docCommentTemplate",
//     /** @internal */
//     CompilerOptionsDiagnosticsFull = "compilerOptionsDiagnostics-full",
//     /** @internal */
//     NameOrDottedNameSpan = "nameOrDottedNameSpan",
//     /** @internal */
//     BreakpointStatement = "breakpointStatement",
//     CompilerOptionsForInferredProjects = "compilerOptionsForInferredProjects",
//     GetCodeFixes = "getCodeFixes",
//     /** @internal */
//     GetCodeFixesFull = "getCodeFixes-full",
//     GetCombinedCodeFix = "getCombinedCodeFix",
//     /** @internal */
//     GetCombinedCodeFixFull = "getCombinedCodeFix-full",
//     ApplyCodeActionCommand = "applyCodeActionCommand",
//     GetSupportedCodeFixes = "getSupportedCodeFixes",
// 
//     GetApplicableRefactors = "getApplicableRefactors",
//     GetEditsForRefactor = "getEditsForRefactor",
//     GetMoveToRefactoringFileSuggestions = "getMoveToRefactoringFileSuggestions",
//     PreparePasteEdits = "preparePasteEdits",
//     GetPasteEdits = "getPasteEdits",
//     /** @internal */
//     GetEditsForRefactorFull = "getEditsForRefactor-full",
// 
//     OrganizeImports = "organizeImports",
//     /** @internal */
//     OrganizeImportsFull = "organizeImports-full",
//     GetEditsForFileRename = "getEditsForFileRename",
//     /** @internal */
//     GetEditsForFileRenameFull = "getEditsForFileRename-full",
//     ConfigurePlugin = "configurePlugin",
//     SelectionRange = "selectionRange",
//     /** @internal */
//     SelectionRangeFull = "selectionRange-full",
//     ToggleLineComment = "toggleLineComment",
//     /** @internal */
//     ToggleLineCommentFull = "toggleLineComment-full",
//     ToggleMultilineComment = "toggleMultilineComment",
//     /** @internal */
//     ToggleMultilineCommentFull = "toggleMultilineComment-full",
//     CommentSelection = "commentSelection",
//     /** @internal */
//     CommentSelectionFull = "commentSelection-full",
//     UncommentSelection = "uncommentSelection",
//     /** @internal */
//     UncommentSelectionFull = "uncommentSelection-full",
//     PrepareCallHierarchy = "prepareCallHierarchy",
//     ProvideCallHierarchyIncomingCalls = "provideCallHierarchyIncomingCalls",
//     ProvideCallHierarchyOutgoingCalls = "provideCallHierarchyOutgoingCalls",
//     ProvideInlayHints = "provideInlayHints",
//     WatchChange = "watchChange",
//     MapCode = "mapCode",
//     /** @internal */
//     CopilotRelated = "copilotRelated",
// }
// Declaration module describing the TypeScript Server protocol
export var CommandTypes;
(function (CommandTypes) {
    CommandTypes["JsxClosingTag"] = "jsxClosingTag";
    CommandTypes["LinkedEditingRange"] = "linkedEditingRange";
    CommandTypes["Brace"] = "brace";
    /** @internal */
    CommandTypes["BraceFull"] = "brace-full";
    CommandTypes["BraceCompletion"] = "braceCompletion";
    CommandTypes["GetSpanOfEnclosingComment"] = "getSpanOfEnclosingComment";
    CommandTypes["Change"] = "change";
    CommandTypes["Close"] = "close";
    /** @deprecated Prefer CompletionInfo -- see comment on CompletionsResponse */
    CommandTypes["Completions"] = "completions";
    CommandTypes["CompletionInfo"] = "completionInfo";
    /** @internal */
    CommandTypes["CompletionsFull"] = "completions-full";
    CommandTypes["CompletionDetails"] = "completionEntryDetails";
    /** @internal */
    CommandTypes["CompletionDetailsFull"] = "completionEntryDetails-full";
    CommandTypes["CompileOnSaveAffectedFileList"] = "compileOnSaveAffectedFileList";
    CommandTypes["CompileOnSaveEmitFile"] = "compileOnSaveEmitFile";
    CommandTypes["Configure"] = "configure";
    CommandTypes["Definition"] = "definition";
    /** @internal */
    CommandTypes["DefinitionFull"] = "definition-full";
    CommandTypes["DefinitionAndBoundSpan"] = "definitionAndBoundSpan";
    /** @internal */
    CommandTypes["DefinitionAndBoundSpanFull"] = "definitionAndBoundSpan-full";
    CommandTypes["Implementation"] = "implementation";
    /** @internal */
    CommandTypes["ImplementationFull"] = "implementation-full";
    /** @internal */
    CommandTypes["EmitOutput"] = "emit-output";
    CommandTypes["Exit"] = "exit";
    CommandTypes["FileReferences"] = "fileReferences";
    /** @internal */
    CommandTypes["FileReferencesFull"] = "fileReferences-full";
    CommandTypes["Format"] = "format";
    CommandTypes["Formatonkey"] = "formatonkey";
    /** @internal */
    CommandTypes["FormatFull"] = "format-full";
    /** @internal */
    CommandTypes["FormatonkeyFull"] = "formatonkey-full";
    /** @internal */
    CommandTypes["FormatRangeFull"] = "formatRange-full";
    CommandTypes["Geterr"] = "geterr";
    CommandTypes["GeterrForProject"] = "geterrForProject";
    CommandTypes["SemanticDiagnosticsSync"] = "semanticDiagnosticsSync";
    CommandTypes["SyntacticDiagnosticsSync"] = "syntacticDiagnosticsSync";
    CommandTypes["SuggestionDiagnosticsSync"] = "suggestionDiagnosticsSync";
    CommandTypes["NavBar"] = "navbar";
    /** @internal */
    CommandTypes["NavBarFull"] = "navbar-full";
    CommandTypes["Navto"] = "navto";
    /** @internal */
    CommandTypes["NavtoFull"] = "navto-full";
    CommandTypes["NavTree"] = "navtree";
    CommandTypes["NavTreeFull"] = "navtree-full";
    CommandTypes["DocumentHighlights"] = "documentHighlights";
    /** @internal */
    CommandTypes["DocumentHighlightsFull"] = "documentHighlights-full";
    CommandTypes["Open"] = "open";
    CommandTypes["Quickinfo"] = "quickinfo";
    /** @internal */
    CommandTypes["QuickinfoFull"] = "quickinfo-full";
    CommandTypes["References"] = "references";
    /** @internal */
    CommandTypes["ReferencesFull"] = "references-full";
    CommandTypes["Reload"] = "reload";
    CommandTypes["Rename"] = "rename";
    /** @internal */
    CommandTypes["RenameInfoFull"] = "rename-full";
    /** @internal */
    CommandTypes["RenameLocationsFull"] = "renameLocations-full";
    CommandTypes["Saveto"] = "saveto";
    CommandTypes["SignatureHelp"] = "signatureHelp";
    /** @internal */
    CommandTypes["SignatureHelpFull"] = "signatureHelp-full";
    CommandTypes["FindSourceDefinition"] = "findSourceDefinition";
    CommandTypes["Status"] = "status";
    CommandTypes["TypeDefinition"] = "typeDefinition";
    CommandTypes["ProjectInfo"] = "projectInfo";
    CommandTypes["ReloadProjects"] = "reloadProjects";
    CommandTypes["Unknown"] = "unknown";
    CommandTypes["OpenExternalProject"] = "openExternalProject";
    CommandTypes["OpenExternalProjects"] = "openExternalProjects";
    CommandTypes["CloseExternalProject"] = "closeExternalProject";
    /** @internal */
    CommandTypes["SynchronizeProjectList"] = "synchronizeProjectList";
    /** @internal */
    CommandTypes["ApplyChangedToOpenFiles"] = "applyChangedToOpenFiles";
    CommandTypes["UpdateOpen"] = "updateOpen";
    /** @internal */
    CommandTypes["EncodedSyntacticClassificationsFull"] = "encodedSyntacticClassifications-full";
    /** @internal */
    CommandTypes["EncodedSemanticClassificationsFull"] = "encodedSemanticClassifications-full";
    /** @internal */
    CommandTypes["Cleanup"] = "cleanup";
    CommandTypes["GetOutliningSpans"] = "getOutliningSpans";
    /** @internal */
    CommandTypes["GetOutliningSpansFull"] = "outliningSpans";
    CommandTypes["TodoComments"] = "todoComments";
    CommandTypes["Indentation"] = "indentation";
    CommandTypes["DocCommentTemplate"] = "docCommentTemplate";
    /** @internal */
    CommandTypes["CompilerOptionsDiagnosticsFull"] = "compilerOptionsDiagnostics-full";
    /** @internal */
    CommandTypes["NameOrDottedNameSpan"] = "nameOrDottedNameSpan";
    /** @internal */
    CommandTypes["BreakpointStatement"] = "breakpointStatement";
    CommandTypes["CompilerOptionsForInferredProjects"] = "compilerOptionsForInferredProjects";
    CommandTypes["GetCodeFixes"] = "getCodeFixes";
    /** @internal */
    CommandTypes["GetCodeFixesFull"] = "getCodeFixes-full";
    CommandTypes["GetCombinedCodeFix"] = "getCombinedCodeFix";
    /** @internal */
    CommandTypes["GetCombinedCodeFixFull"] = "getCombinedCodeFix-full";
    CommandTypes["ApplyCodeActionCommand"] = "applyCodeActionCommand";
    CommandTypes["GetSupportedCodeFixes"] = "getSupportedCodeFixes";
    CommandTypes["GetApplicableRefactors"] = "getApplicableRefactors";
    CommandTypes["GetEditsForRefactor"] = "getEditsForRefactor";
    CommandTypes["GetMoveToRefactoringFileSuggestions"] = "getMoveToRefactoringFileSuggestions";
    CommandTypes["PreparePasteEdits"] = "preparePasteEdits";
    CommandTypes["GetPasteEdits"] = "getPasteEdits";
    /** @internal */
    CommandTypes["GetEditsForRefactorFull"] = "getEditsForRefactor-full";
    CommandTypes["OrganizeImports"] = "organizeImports";
    /** @internal */
    CommandTypes["OrganizeImportsFull"] = "organizeImports-full";
    CommandTypes["GetEditsForFileRename"] = "getEditsForFileRename";
    /** @internal */
    CommandTypes["GetEditsForFileRenameFull"] = "getEditsForFileRename-full";
    CommandTypes["ConfigurePlugin"] = "configurePlugin";
    CommandTypes["SelectionRange"] = "selectionRange";
    /** @internal */
    CommandTypes["SelectionRangeFull"] = "selectionRange-full";
    CommandTypes["ToggleLineComment"] = "toggleLineComment";
    /** @internal */
    CommandTypes["ToggleLineCommentFull"] = "toggleLineComment-full";
    CommandTypes["ToggleMultilineComment"] = "toggleMultilineComment";
    /** @internal */
    CommandTypes["ToggleMultilineCommentFull"] = "toggleMultilineComment-full";
    CommandTypes["CommentSelection"] = "commentSelection";
    /** @internal */
    CommandTypes["CommentSelectionFull"] = "commentSelection-full";
    CommandTypes["UncommentSelection"] = "uncommentSelection";
    /** @internal */
    CommandTypes["UncommentSelectionFull"] = "uncommentSelection-full";
    CommandTypes["PrepareCallHierarchy"] = "prepareCallHierarchy";
    CommandTypes["ProvideCallHierarchyIncomingCalls"] = "provideCallHierarchyIncomingCalls";
    CommandTypes["ProvideCallHierarchyOutgoingCalls"] = "provideCallHierarchyOutgoingCalls";
    CommandTypes["ProvideInlayHints"] = "provideInlayHints";
    CommandTypes["WatchChange"] = "watchChange";
    CommandTypes["MapCode"] = "mapCode";
    /** @internal */
    CommandTypes["CopilotRelated"] = "copilotRelated";
})(CommandTypes || (CommandTypes = {}));

export var WatchFileKind;
(function (WatchFileKind) {
    WatchFileKind["FixedPollingInterval"] = "FixedPollingInterval";
    WatchFileKind["PriorityPollingInterval"] = "PriorityPollingInterval";
    WatchFileKind["DynamicPriorityPolling"] = "DynamicPriorityPolling";
    WatchFileKind["FixedChunkSizePolling"] = "FixedChunkSizePolling";
    WatchFileKind["UseFsEvents"] = "UseFsEvents";
    WatchFileKind["UseFsEventsOnParentDirectory"] = "UseFsEventsOnParentDirectory";
})(WatchFileKind || (WatchFileKind = {}));

export var WatchDirectoryKind;
(function (WatchDirectoryKind) {
    WatchDirectoryKind["UseFsEvents"] = "UseFsEvents";
    WatchDirectoryKind["FixedPollingInterval"] = "FixedPollingInterval";
    WatchDirectoryKind["DynamicPriorityPolling"] = "DynamicPriorityPolling";
    WatchDirectoryKind["FixedChunkSizePolling"] = "FixedChunkSizePolling";
})(WatchDirectoryKind || (WatchDirectoryKind = {}));


export var PollingWatchKind;
(function (PollingWatchKind) {
    PollingWatchKind["FixedInterval"] = "FixedInterval";
    PollingWatchKind["PriorityInterval"] = "PriorityInterval";
    PollingWatchKind["DynamicPriority"] = "DynamicPriority";
    PollingWatchKind["FixedChunkSize"] = "FixedChunkSize";
})(PollingWatchKind || (PollingWatchKind = {}));

// export const enum IndentStyle {
//     None = "None",
//     Block = "Block",
//     Smart = "Smart",
// }
export var IndentStyle;
(function (IndentStyle) {
    IndentStyle["None"] = "None";
    IndentStyle["Block"] = "Block";
    IndentStyle["Smart"] = "Smart";
})(IndentStyle || (IndentStyle = {}));

//export const enum JsxEmit {
//    None = "none",
//    Preserve = "preserve",
//    ReactNative = "react-native",
//    React = "react",
//    ReactJSX = "react-jsx",
//    ReactJSXDev = "react-jsxdev",
//}
export var JsxEmit;
(function (JsxEmit) {
    JsxEmit["None"] = "none";
    JsxEmit["Preserve"] = "preserve";
    JsxEmit["ReactNative"] = "react-native";
    JsxEmit["React"] = "react";
    JsxEmit["ReactJSX"] = "react-jsx";
    JsxEmit["ReactJSXDev"] = "react-jsxdev";
})(JsxEmit || (JsxEmit = {}));

// export const enum ModuleKind {
//     None = "none",
//     CommonJS = "commonjs",
//     AMD = "amd",
//     UMD = "umd",
//     System = "system",
//     ES6 = "es6",
//     ES2015 = "es2015",
//     ES2020 = "es2020",
//     ES2022 = "es2022",
//     ESNext = "esnext",
//     Node16 = "node16",
//     Node18 = "node18",
//     NodeNext = "nodenext",
//     Preserve = "preserve",
// }
export var ModuleKind;
(function (ModuleKind) {
    ModuleKind["None"] = "none";
    ModuleKind["CommonJS"] = "commonjs";
    ModuleKind["AMD"] = "amd";
    ModuleKind["UMD"] = "umd";
    ModuleKind["System"] = "system";
    ModuleKind["ES6"] = "es6";
    ModuleKind["ES2015"] = "es2015";
    ModuleKind["ES2020"] = "es2020";
    ModuleKind["ES2022"] = "es2022";
    ModuleKind["ESNext"] = "esnext";
    ModuleKind["Node16"] = "node16";
    ModuleKind["Node18"] = "node18";
    ModuleKind["NodeNext"] = "nodenext";
    ModuleKind["Preserve"] = "preserve";
})(ModuleKind || (ModuleKind = {}));

// export const enum ModuleResolutionKind {
//     Classic = "classic",
//     /** @deprecated Renamed to `Node10` */
//     Node = "node",
//     /** @deprecated Renamed to `Node10` */
//     NodeJs = "node",
//     Node10 = "node10",
//     Node16 = "node16",
//     NodeNext = "nodenext",
//     Bundler = "bundler",
// }
export var ModuleResolutionKind;
(function (ModuleResolutionKind) {
    ModuleResolutionKind["Classic"] = "classic";
    /** @deprecated Renamed to `Node10` */
    ModuleResolutionKind["Node"] = "node";
    /** @deprecated Renamed to `Node10` */
    ModuleResolutionKind["NodeJs"] = "node";
    ModuleResolutionKind["Node10"] = "node10";
    ModuleResolutionKind["Node16"] = "node16";
    ModuleResolutionKind["NodeNext"] = "nodenext";
    ModuleResolutionKind["Bundler"] = "bundler";
})(ModuleResolutionKind || (ModuleResolutionKind = {}));

// export const enum NewLineKind {
//     Crlf = "Crlf",
//     Lf = "Lf",
// }
export var NewLineKind;
(function (NewLineKind) {
    NewLineKind["Crlf"] = "Crlf";
    NewLineKind["Lf"] = "Lf";
})(NewLineKind || (NewLineKind = {}));

// export const enum ScriptTarget {
//     /** @deprecated */
//     ES3 = "es3",
//     ES5 = "es5",
//     ES6 = "es6",
//     ES2015 = "es2015",
//     ES2016 = "es2016",
//     ES2017 = "es2017",
//     ES2018 = "es2018",
//     ES2019 = "es2019",
//     ES2020 = "es2020",
//     ES2021 = "es2021",
//     ES2022 = "es2022",
//     ES2023 = "es2023",
//     ES2024 = "es2024",
//     ESNext = "esnext",
//     JSON = "json",
//     Latest = ESNext,
// }
export var ScriptTarget;
(function (ScriptTarget) {
    /** @deprecated */
    ScriptTarget["ES3"] = "es3";
    ScriptTarget["ES5"] = "es5";
    ScriptTarget["ES6"] = "es6";
    ScriptTarget["ES2015"] = "es2015";
    ScriptTarget["ES2016"] = "es2016";
    ScriptTarget["ES2017"] = "es2017";
    ScriptTarget["ES2018"] = "es2018";
    ScriptTarget["ES2019"] = "es2019";
    ScriptTarget["ES2020"] = "es2020";
    ScriptTarget["ES2021"] = "es2021";
    ScriptTarget["ES2022"] = "es2022";
    ScriptTarget["ES2023"] = "es2023";
    ScriptTarget["ES2024"] = "es2024";
    ScriptTarget["ESNext"] = "esnext";
    ScriptTarget["JSON"] = "json";
    ScriptTarget["Latest"] = "esnext";
})(ScriptTarget || (ScriptTarget = {}));
