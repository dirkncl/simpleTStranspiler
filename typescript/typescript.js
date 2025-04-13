import * as ts from './typescript/typescript.js'

export { libFileSet, libFileMap } from './lib.js'
export var createClassifier = ts.createClassifier;
export var createLanguageService = ts.createLanguageService;
export var displayPartsToString = ts.displayPartsToString;
export var EndOfLineState = ts.EndOfLineState;
export var flattenDiagnosticMessageText = ts.flattenDiagnosticMessageText;
export var IndentStyle = ts.IndentStyle;
export var ScriptKind = ts.ScriptKind;
export var ScriptTarget = ts.ScriptTarget;
export var TokenClass = ts.TokenClass;
export var typescript = ts;
export var version = ts.version;

export { ts };

