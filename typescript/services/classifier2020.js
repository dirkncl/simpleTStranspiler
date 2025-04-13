import {
  createTextSpan,
  Debug,
  EndOfLineState,
  forEachChild,
  getCombinedModifierFlags,
  getCombinedNodeFlags,
  getMeaningFromLocation,
  isBindingElement,
  isCallExpression,
  isCatchClause,
  isFunctionDeclaration,
  isIdentifier,
  isImportClause,
  isImportSpecifier,
  isInfinityOrNaNString,
  isJsxElement,
  isJsxExpression,
  isJsxSelfClosingElement,
  isNamespaceImport,
  isPropertyAccessExpression,
  isQualifiedName,
  isSourceFile,
  isVariableDeclaration,
  ModifierFlags,
  NodeFlags,
  SemanticMeaning,
  SymbolFlags,
  SyntaxKind,
  textSpanIntersectsWith,
} from "./namespaces/ts.js";


/** @internal */
export var TokenEncodingConsts;
(function (TokenEncodingConsts) {
    TokenEncodingConsts[TokenEncodingConsts["typeOffset"] = 8] = "typeOffset";
    TokenEncodingConsts[TokenEncodingConsts["modifierMask"] = 255] = "modifierMask";
})(TokenEncodingConsts || (TokenEncodingConsts = {}));

/** @internal */
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["class"] = 0] = "class";
    TokenType[TokenType["enum"] = 1] = "enum";
    TokenType[TokenType["interface"] = 2] = "interface";
    TokenType[TokenType["namespace"] = 3] = "namespace";
    TokenType[TokenType["typeParameter"] = 4] = "typeParameter";
    TokenType[TokenType["type"] = 5] = "type";
    TokenType[TokenType["parameter"] = 6] = "parameter";
    TokenType[TokenType["variable"] = 7] = "variable";
    TokenType[TokenType["enumMember"] = 8] = "enumMember";
    TokenType[TokenType["property"] = 9] = "property";
    TokenType[TokenType["function"] = 10] = "function";
    TokenType[TokenType["member"] = 11] = "member";
})(TokenType || (TokenType = {}));
/** @internal */
export var TokenModifier;
(function (TokenModifier) {
    TokenModifier[TokenModifier["declaration"] = 0] = "declaration";
    TokenModifier[TokenModifier["static"] = 1] = "static";
    TokenModifier[TokenModifier["async"] = 2] = "async";
    TokenModifier[TokenModifier["readonly"] = 3] = "readonly";
    TokenModifier[TokenModifier["defaultLibrary"] = 4] = "defaultLibrary";
    TokenModifier[TokenModifier["local"] = 5] = "local";
})(TokenModifier || (TokenModifier = {}));
/**
 * This is mainly used internally for testing
 *
 * @internal
 */
export function getSemanticClassifications(program, cancellationToken, sourceFile, span) {
    const classifications = getEncodedSemanticClassifications(program, cancellationToken, sourceFile, span);
    Debug.assert(classifications.spans.length % 3 === 0);
    const dense = classifications.spans;
    const result = [];
    for (let i = 0; i < dense.length; i += 3) {
        result.push({
            textSpan: createTextSpan(dense[i], dense[i + 1]),
            classificationType: dense[i + 2],
        });
    }
    return result;
}
/** @internal */
export function getEncodedSemanticClassifications(program, cancellationToken, sourceFile, span) {
    return {
        spans: getSemanticTokens(program, sourceFile, span, cancellationToken),
        endOfLineState: EndOfLineState.None,
    };
}
function getSemanticTokens(program, sourceFile, span, cancellationToken) {
    const resultTokens = [];
    const collector = (node, typeIdx, modifierSet) => {
        resultTokens.push(node.getStart(sourceFile), node.getWidth(sourceFile), ((typeIdx + 1) << 8 /* TokenEncodingConsts.typeOffset */) + modifierSet);
    };
    if (program && sourceFile) {
        collectTokens(program, sourceFile, span, collector, cancellationToken);
    }
    return resultTokens;
}
function collectTokens(program, sourceFile, span, collector, cancellationToken) {
    const typeChecker = program.getTypeChecker();
    let inJSXElement = false;
    function visit(node) {
        switch (node.kind) {
            case SyntaxKind.ModuleDeclaration:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.ClassExpression:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.ArrowFunction:
                cancellationToken.throwIfCancellationRequested();
        }
        if (!node || !textSpanIntersectsWith(span, node.pos, node.getFullWidth()) || node.getFullWidth() === 0) {
            return;
        }
        const prevInJSXElement = inJSXElement;
        if (isJsxElement(node) || isJsxSelfClosingElement(node)) {
            inJSXElement = true;
        }
        if (isJsxExpression(node)) {
            inJSXElement = false;
        }
        if (isIdentifier(node) && !inJSXElement && !inImportClause(node) && !isInfinityOrNaNString(node.escapedText)) {
            let symbol = typeChecker.getSymbolAtLocation(node);
            if (symbol) {
                if (symbol.flags & SymbolFlags.Alias) {
                    symbol = typeChecker.getAliasedSymbol(symbol);
                }
                let typeIdx = classifySymbol(symbol, getMeaningFromLocation(node));
                if (typeIdx !== undefined) {
                    let modifierSet = 0;
                    if (node.parent) {
                        const parentIsDeclaration = isBindingElement(node.parent) || tokenFromDeclarationMapping.get(node.parent.kind) === typeIdx;
                        if (parentIsDeclaration && node.parent.name === node) {
                            modifierSet = 1 << 0 /* TokenModifier.declaration */;
                        }
                    }
                    // property declaration in constructor
                    if (typeIdx === 6 /* TokenType.parameter */ && isRightSideOfQualifiedNameOrPropertyAccess(node)) {
                        typeIdx = 9 /* TokenType.property */;
                    }
                    typeIdx = reclassifyByType(typeChecker, node, typeIdx);
                    const decl = symbol.valueDeclaration;
                    if (decl) {
                        const modifiers = getCombinedModifierFlags(decl);
                        const nodeFlags = getCombinedNodeFlags(decl);
                        if (modifiers & ModifierFlags.Static) {
                            modifierSet |= 1 << 1 /* TokenModifier.static */;
                        }
                        if (modifiers & ModifierFlags.Async) {
                            modifierSet |= 1 << 2 /* TokenModifier.async */;
                        }
                        if (typeIdx !== 0 /* TokenType.class */ && typeIdx !== 2 /* TokenType.interface */) {
                            if ((modifiers & ModifierFlags.Readonly) || (nodeFlags & NodeFlags.Const) || (symbol.getFlags() & SymbolFlags.EnumMember)) {
                                modifierSet |= 1 << 3 /* TokenModifier.readonly */;
                            }
                        }
                        if ((typeIdx === 7 /* TokenType.variable */ || typeIdx === 10 /* TokenType.function */) && isLocalDeclaration(decl, sourceFile)) {
                            modifierSet |= 1 << 5 /* TokenModifier.local */;
                        }
                        if (program.isSourceFileDefaultLibrary(decl.getSourceFile())) {
                            modifierSet |= 1 << 4 /* TokenModifier.defaultLibrary */;
                        }
                    }
                    else if (symbol.declarations && symbol.declarations.some(d => program.isSourceFileDefaultLibrary(d.getSourceFile()))) {
                        modifierSet |= 1 << 4 /* TokenModifier.defaultLibrary */;
                    }
                    collector(node, typeIdx, modifierSet);
                }
            }
        }
        forEachChild(node, visit);
        inJSXElement = prevInJSXElement;
    }
    visit(sourceFile);
}
function classifySymbol(symbol, meaning) {
    const flags = symbol.getFlags();
    if (flags & SymbolFlags.Class) {
        return 0 /* TokenType.class */;
    }
    else if (flags & SymbolFlags.Enum) {
        return 1 /* TokenType.enum */;
    }
    else if (flags & SymbolFlags.TypeAlias) {
        return 5 /* TokenType.type */;
    }
    else if (flags & SymbolFlags.Interface) {
        if (meaning & SemanticMeaning.Type) {
            return 2 /* TokenType.interface */;
        }
    }
    else if (flags & SymbolFlags.TypeParameter) {
        return 4 /* TokenType.typeParameter */;
    }
    let decl = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
    if (decl && isBindingElement(decl)) {
        decl = getDeclarationForBindingElement(decl);
    }
    return decl && tokenFromDeclarationMapping.get(decl.kind);
}
function reclassifyByType(typeChecker, node, typeIdx) {
    // type based classifications
    if (typeIdx === 7 /* TokenType.variable */ || typeIdx === 9 /* TokenType.property */ || typeIdx === 6 /* TokenType.parameter */) {
        const type = typeChecker.getTypeAtLocation(node);
        if (type) {
            const test = (condition) => {
                return condition(type) || type.isUnion() && type.types.some(condition);
            };
            if (typeIdx !== 6 /* TokenType.parameter */ && test(t => t.getConstructSignatures().length > 0)) {
                return 0 /* TokenType.class */;
            }
            if (test(t => t.getCallSignatures().length > 0) && !test(t => t.getProperties().length > 0) || isExpressionInCallExpression(node)) {
                return typeIdx === 9 /* TokenType.property */ ? 11 /* TokenType.member */ : 10 /* TokenType.function */;
            }
        }
    }
    return typeIdx;
}
function isLocalDeclaration(decl, sourceFile) {
    if (isBindingElement(decl)) {
        decl = getDeclarationForBindingElement(decl);
    }
    if (isVariableDeclaration(decl)) {
        return (!isSourceFile(decl.parent.parent.parent) || isCatchClause(decl.parent)) && decl.getSourceFile() === sourceFile;
    }
    else if (isFunctionDeclaration(decl)) {
        return !isSourceFile(decl.parent) && decl.getSourceFile() === sourceFile;
    }
    return false;
}
function getDeclarationForBindingElement(element) {
    while (true) {
        if (isBindingElement(element.parent.parent)) {
            element = element.parent.parent;
        }
        else {
            return element.parent.parent;
        }
    }
}
function inImportClause(node) {
    const parent = node.parent;
    return parent && (isImportClause(parent) || isImportSpecifier(parent) || isNamespaceImport(parent));
}
function isExpressionInCallExpression(node) {
    while (isRightSideOfQualifiedNameOrPropertyAccess(node)) {
        node = node.parent;
    }
    return isCallExpression(node.parent) && node.parent.expression === node;
}
function isRightSideOfQualifiedNameOrPropertyAccess(node) {
    return (isQualifiedName(node.parent) && node.parent.right === node) || (isPropertyAccessExpression(node.parent) && node.parent.name === node);
}
const tokenFromDeclarationMapping = new Map([
    [SyntaxKind.VariableDeclaration, 7 /* TokenType.variable */],
    [SyntaxKind.Parameter, 6 /* TokenType.parameter */],
    [SyntaxKind.PropertyDeclaration, 9 /* TokenType.property */],
    [SyntaxKind.ModuleDeclaration, 3 /* TokenType.namespace */],
    [SyntaxKind.EnumDeclaration, 1 /* TokenType.enum */],
    [SyntaxKind.EnumMember, 8 /* TokenType.enumMember */],
    [SyntaxKind.ClassDeclaration, 0 /* TokenType.class */],
    [SyntaxKind.MethodDeclaration, 11 /* TokenType.member */],
    [SyntaxKind.FunctionDeclaration, 10 /* TokenType.function */],
    [SyntaxKind.FunctionExpression, 10 /* TokenType.function */],
    [SyntaxKind.MethodSignature, 11 /* TokenType.member */],
    [SyntaxKind.GetAccessor, 9 /* TokenType.property */],
    [SyntaxKind.SetAccessor, 9 /* TokenType.property */],
    [SyntaxKind.PropertySignature, 9 /* TokenType.property */],
    [SyntaxKind.InterfaceDeclaration, 2 /* TokenType.interface */],
    [SyntaxKind.TypeAliasDeclaration, 5 /* TokenType.type */],
    [SyntaxKind.TypeParameter, 4 /* TokenType.typeParameter */],
    [SyntaxKind.PropertyAssignment, 9 /* TokenType.property */],
    [SyntaxKind.ShorthandPropertyAssignment, 9 /* TokenType.property */],
]);
