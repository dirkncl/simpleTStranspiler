import {
  AssignmentDeclarationKind,
  canHaveModifiers,
  canHaveSymbol,
  cast,
  Debug,
  findAncestor,
  forEach,
  getAssignmentDeclarationKind,
  getFirstIdentifier,
  getNameOfAccessExpression,
  getSourceFileOfNode,
  getSymbolId,
  hasSyntacticModifier,
  importFromModuleSpecifier,
  InternalSymbolName,
  isAccessExpression,
  isBinaryExpression,
  isBindingElement,
  isCatchClause,
  isDefaultImport,
  isExportAssignment,
  isExportDeclaration,
  isExportModifier,
  isExportSpecifier,
  isExternalModuleAugmentation,
  isExternalModuleSymbol,
  isImportCall,
  isImportEqualsDeclaration,
  isImportTypeNode,
  isInJSFile,
  isJSDocCallbackTag,
  isJSDocTypedefTag,
  isModuleExportsAccessExpression,
  isNamedExports,
  isNamespaceExport,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  isShorthandPropertyAssignment,
  isSourceFile,
  isStringLiteral,
  isVariableDeclaration,
  isVariableDeclarationInitializedToBareOrAccessedRequire,
  isVariableStatement,
  ModifierFlags,
  moduleExportNameTextEscaped,
  nodeIsSynthesized,
  nodeSeenTracker,
  some,
  symbolEscapedNameNoDefault,
  SymbolFlags,
  symbolName,
  SyntaxKind,
  tryCast,
  walkUpBindingElementsAndPatterns,
} from "./_namespaces/ts.js";

/**
 * Creates the imports map and returns an ImportTracker that uses it. Call this lazily to avoid calling `getDirectImportsMap` unnecessarily.
 *
 * @internal
 */
export function createImportTracker(sourceFiles, sourceFilesSet, checker, cancellationToken) {
    const allDirectImports = getDirectImportsMap(sourceFiles, checker, cancellationToken);
    return (exportSymbol, exportInfo, isForRename) => {
        const { directImports, indirectUsers } = getImportersForExport(sourceFiles, sourceFilesSet, allDirectImports, exportInfo, checker, cancellationToken);
        return Object.assign({ indirectUsers }, getSearchesFromDirectImports(directImports, exportSymbol, exportInfo.exportKind, checker, isForRename));
    };
}
/** @internal */
export var ExportKind;
(function (ExportKind) {
    ExportKind[ExportKind["Named"] = 0] = "Named";
    ExportKind[ExportKind["Default"] = 1] = "Default";
    ExportKind[ExportKind["ExportEquals"] = 2] = "ExportEquals";
})(ExportKind || (ExportKind = {}));
/** @internal */
export var ImportExport;
(function (ImportExport) {
    ImportExport[ImportExport["Import"] = 0] = "Import";
    ImportExport[ImportExport["Export"] = 1] = "Export";
})(ImportExport || (ImportExport = {}));
/** Returns import statements that directly reference the exporting module, and a list of files that may access the module through a namespace. */
function getImportersForExport(sourceFiles, sourceFilesSet, allDirectImports, { exportingModuleSymbol, exportKind }, checker, cancellationToken) {
    const markSeenDirectImport = nodeSeenTracker();
    const markSeenIndirectUser = nodeSeenTracker();
    const directImports = [];
    const isAvailableThroughGlobal = !!exportingModuleSymbol.globalExports;
    const indirectUserDeclarations = isAvailableThroughGlobal ? undefined : [];
    handleDirectImports(exportingModuleSymbol);
    return { directImports, indirectUsers: getIndirectUsers() };
    function getIndirectUsers() {
        if (isAvailableThroughGlobal) {
            // It has `export as namespace`, so anything could potentially use it.
            return sourceFiles;
        }
        // Module augmentations may use this module's exports without importing it.
        if (exportingModuleSymbol.declarations) {
            for (const decl of exportingModuleSymbol.declarations) {
                if (isExternalModuleAugmentation(decl) && sourceFilesSet.has(decl.getSourceFile().fileName)) {
                    addIndirectUser(decl);
                }
            }
        }
        // This may return duplicates (if there are multiple module declarations in a single source file, all importing the same thing as a namespace), but `State.markSearchedSymbol` will handle that.
        return indirectUserDeclarations.map(getSourceFileOfNode);
    }
    function handleDirectImports(exportingModuleSymbol) {
        const theseDirectImports = getDirectImports(exportingModuleSymbol);
        if (theseDirectImports) {
            for (const direct of theseDirectImports) {
                if (!markSeenDirectImport(direct)) {
                    continue;
                }
                if (cancellationToken)
                    cancellationToken.throwIfCancellationRequested();
                switch (direct.kind) {
                    case SyntaxKind.CallExpression:
                        if (isImportCall(direct)) {
                            handleImportCall(direct);
                            break;
                        }
                        if (!isAvailableThroughGlobal) {
                            const parent = direct.parent;
                            if (exportKind === 2 /* ExportKind.ExportEquals */ && parent.kind === SyntaxKind.VariableDeclaration) {
                                const { name } = parent;
                                if (name.kind === SyntaxKind.Identifier) {
                                    directImports.push(name);
                                    break;
                                }
                            }
                        }
                        break;
                    case SyntaxKind.Identifier: // for 'const x = require("y");
                        break; // TODO: GH#23879
                    case SyntaxKind.ImportEqualsDeclaration:
                        handleNamespaceImport(direct, direct.name, hasSyntacticModifier(direct, ModifierFlags.Export), /*alreadyAddedDirect*/ false);
                        break;
                    case SyntaxKind.ImportDeclaration:
                    case SyntaxKind.JSDocImportTag:
                        directImports.push(direct);
                        const namedBindings = direct.importClause && direct.importClause.namedBindings;
                        if (namedBindings && namedBindings.kind === SyntaxKind.NamespaceImport) {
                            handleNamespaceImport(direct, namedBindings.name, /*isReExport*/ false, /*alreadyAddedDirect*/ true);
                        }
                        else if (!isAvailableThroughGlobal && isDefaultImport(direct)) {
                            addIndirectUser(getSourceFileLikeForImportDeclaration(direct)); // Add a check for indirect uses to handle synthetic default imports
                        }
                        break;
                    case SyntaxKind.ExportDeclaration:
                        if (!direct.exportClause) {
                            // This is `export * from "foo"`, so imports of this module may import the export too.
                            handleDirectImports(getContainingModuleSymbol(direct, checker));
                        }
                        else if (direct.exportClause.kind === SyntaxKind.NamespaceExport) {
                            // `export * as foo from "foo"` add to indirect uses
                            addIndirectUser(getSourceFileLikeForImportDeclaration(direct), /*addTransitiveDependencies*/ true);
                        }
                        else {
                            // This is `export { foo } from "foo"` and creates an alias symbol, so recursive search will get handle re-exports.
                            directImports.push(direct);
                        }
                        break;
                    case SyntaxKind.ImportType:
                        // Only check for typeof import('xyz')
                        if (!isAvailableThroughGlobal && direct.isTypeOf && !direct.qualifier && isExported(direct)) {
                            addIndirectUser(direct.getSourceFile(), /*addTransitiveDependencies*/ true);
                        }
                        directImports.push(direct);
                        break;
                    default:
                        Debug.failBadSyntaxKind(direct, "Unexpected import kind.");
                }
            }
        }
    }
    function handleImportCall(importCall) {
        const top = findAncestor(importCall, isAmbientModuleDeclaration) || importCall.getSourceFile();
        addIndirectUser(top, /** addTransitiveDependencies */ !!isExported(importCall, /*stopAtAmbientModule*/ true));
    }
    function isExported(node, stopAtAmbientModule = false) {
        return findAncestor(node, node => {
            if (stopAtAmbientModule && isAmbientModuleDeclaration(node))
                return "quit";
            return canHaveModifiers(node) && some(node.modifiers, isExportModifier);
        });
    }
    function handleNamespaceImport(importDeclaration, name, isReExport, alreadyAddedDirect) {
        if (exportKind === 2 /* ExportKind.ExportEquals */) {
            // This is a direct import, not import-as-namespace.
            if (!alreadyAddedDirect)
                directImports.push(importDeclaration);
        }
        else if (!isAvailableThroughGlobal) {
            const sourceFileLike = getSourceFileLikeForImportDeclaration(importDeclaration);
            Debug.assert(sourceFileLike.kind === SyntaxKind.SourceFile || sourceFileLike.kind === SyntaxKind.ModuleDeclaration);
            if (isReExport || findNamespaceReExports(sourceFileLike, name, checker)) {
                addIndirectUser(sourceFileLike, /*addTransitiveDependencies*/ true);
            }
            else {
                addIndirectUser(sourceFileLike);
            }
        }
    }
    /** Adds a module and all of its transitive dependencies as possible indirect users. */
    function addIndirectUser(sourceFileLike, addTransitiveDependencies = false) {
        Debug.assert(!isAvailableThroughGlobal);
        const isNew = markSeenIndirectUser(sourceFileLike);
        if (!isNew)
            return;
        indirectUserDeclarations.push(sourceFileLike); // TODO: GH#18217
        if (!addTransitiveDependencies)
            return;
        const moduleSymbol = checker.getMergedSymbol(sourceFileLike.symbol);
        if (!moduleSymbol)
            return;
        Debug.assert(!!(moduleSymbol.flags & SymbolFlags.Module));
        const directImports = getDirectImports(moduleSymbol);
        if (directImports) {
            for (const directImport of directImports) {
                if (!isImportTypeNode(directImport)) {
                    addIndirectUser(getSourceFileLikeForImportDeclaration(directImport), /*addTransitiveDependencies*/ true);
                }
            }
        }
    }
    function getDirectImports(moduleSymbol) {
        return allDirectImports.get(getSymbolId(moduleSymbol).toString());
    }
}
/**
 * Given the set of direct imports of a module, we need to find which ones import the particular exported symbol.
 * The returned `importSearches` will result in the entire source file being searched.
 * But re-exports will be placed in 'singleReferences' since they cannot be locally referenced.
 */
function getSearchesFromDirectImports(directImports, exportSymbol, exportKind, checker, isForRename) {
    const importSearches = [];
    const singleReferences = [];
    function addSearch(location, symbol) {
        importSearches.push([location, symbol]);
    }
    if (directImports) {
        for (const decl of directImports) {
            handleImport(decl);
        }
    }
    return { importSearches, singleReferences };
    function handleImport(decl) {
        if (decl.kind === SyntaxKind.ImportEqualsDeclaration) {
            if (isExternalModuleImportEquals(decl)) {
                handleNamespaceImportLike(decl.name);
            }
            return;
        }
        if (decl.kind === SyntaxKind.Identifier) {
            handleNamespaceImportLike(decl);
            return;
        }
        if (decl.kind === SyntaxKind.ImportType) {
            if (decl.qualifier) {
                const firstIdentifier = getFirstIdentifier(decl.qualifier);
                if (firstIdentifier.escapedText === symbolName(exportSymbol)) {
                    singleReferences.push(firstIdentifier);
                }
            }
            else if (exportKind === 2 /* ExportKind.ExportEquals */) {
                singleReferences.push(decl.argument.literal);
            }
            return;
        }
        // Ignore if there's a grammar error
        if (decl.moduleSpecifier.kind !== SyntaxKind.StringLiteral) {
            return;
        }
        if (decl.kind === SyntaxKind.ExportDeclaration) {
            if (decl.exportClause && isNamedExports(decl.exportClause)) {
                searchForNamedImport(decl.exportClause);
            }
            return;
        }
        const { name, namedBindings } = decl.importClause || { name: undefined, namedBindings: undefined };
        if (namedBindings) {
            switch (namedBindings.kind) {
                case SyntaxKind.NamespaceImport:
                    handleNamespaceImportLike(namedBindings.name);
                    break;
                case SyntaxKind.NamedImports:
                    // 'default' might be accessed as a named import `{ default as foo }`.
                    if (exportKind === 0 /* ExportKind.Named */ || exportKind === 1 /* ExportKind.Default */) {
                        searchForNamedImport(namedBindings);
                    }
                    break;
                default:
                    Debug.assertNever(namedBindings);
            }
        }
        // `export =` might be imported by a default import if `--allowSyntheticDefaultImports` is on, so this handles both ExportKind.Default and ExportKind.ExportEquals.
        // If a default import has the same name as the default export, allow to rename it.
        // Given `import f` and `export default function f`, we will rename both, but for `import g` we will rename just that.
        if (name && (exportKind === 1 /* ExportKind.Default */ || exportKind === 2 /* ExportKind.ExportEquals */) && (!isForRename || name.escapedText === symbolEscapedNameNoDefault(exportSymbol))) {
            const defaultImportAlias = checker.getSymbolAtLocation(name);
            addSearch(name, defaultImportAlias);
        }
    }
    /**
     * `import x = require("./x")` or `import * as x from "./x"`.
     * An `export =` may be imported by this syntax, so it may be a direct import.
     * If it's not a direct import, it will be in `indirectUsers`, so we don't have to do anything here.
     */
    function handleNamespaceImportLike(importName) {
        // Don't rename an import that already has a different name than the export.
        if (exportKind === 2 /* ExportKind.ExportEquals */ && (!isForRename || isNameMatch(importName.escapedText))) {
            addSearch(importName, checker.getSymbolAtLocation(importName));
        }
    }
    function searchForNamedImport(namedBindings) {
        if (!namedBindings) {
            return;
        }
        for (const element of namedBindings.elements) {
            const { name, propertyName } = element;
            if (!isNameMatch(moduleExportNameTextEscaped(propertyName || name))) {
                continue;
            }
            if (propertyName) {
                // This is `import { foo as bar } from "./a"` or `export { foo as bar } from "./a"`. `foo` isn't a local in the file, so just add it as a single reference.
                singleReferences.push(propertyName);
                // If renaming `{ foo as bar }`, don't touch `bar`, just `foo`.
                // But do rename `foo` in ` { default as foo }` if that's the original export name.
                if (!isForRename || moduleExportNameTextEscaped(name) === exportSymbol.escapedName) {
                    // Search locally for `bar`.
                    addSearch(name, checker.getSymbolAtLocation(name));
                }
            }
            else {
                const localSymbol = element.kind === SyntaxKind.ExportSpecifier && element.propertyName
                    ? checker.getExportSpecifierLocalTargetSymbol(element) // For re-exporting under a different name, we want to get the re-exported symbol.
                    : checker.getSymbolAtLocation(name);
                addSearch(name, localSymbol);
            }
        }
    }
    function isNameMatch(name) {
        // Use name of "default" even in `export =` case because we may have allowSyntheticDefaultImports
        return name === exportSymbol.escapedName || exportKind !== 0 /* ExportKind.Named */ && name === InternalSymbolName.Default;
    }
}
/** Returns 'true' is the namespace 'name' is re-exported from this module, and 'false' if it is only used locally. */
function findNamespaceReExports(sourceFileLike, name, checker) {
    const namespaceImportSymbol = checker.getSymbolAtLocation(name);
    return !!forEachPossibleImportOrExportStatement(sourceFileLike, statement => {
        if (!isExportDeclaration(statement))
            return;
        const { exportClause, moduleSpecifier } = statement;
        return !moduleSpecifier && exportClause && isNamedExports(exportClause) &&
            exportClause.elements.some(element => checker.getExportSpecifierLocalTargetSymbol(element) === namespaceImportSymbol);
    });
}
/** @internal */
export function findModuleReferences(program, sourceFiles, searchModuleSymbol) {
    var _a;
    const refs = [];
    const checker = program.getTypeChecker();
    for (const referencingFile of sourceFiles) {
        const searchSourceFile = searchModuleSymbol.valueDeclaration;
        if ((searchSourceFile === null || searchSourceFile === void 0 ? void 0 : searchSourceFile.kind) === SyntaxKind.SourceFile) {
            for (const ref of referencingFile.referencedFiles) {
                if (program.getSourceFileFromReference(referencingFile, ref) === searchSourceFile) {
                    refs.push({ kind: "reference", referencingFile, ref });
                }
            }
            for (const ref of referencingFile.typeReferenceDirectives) {
                const referenced = (_a = program.getResolvedTypeReferenceDirectiveFromTypeReferenceDirective(ref, referencingFile)) === null || _a === void 0 ? void 0 : _a.resolvedTypeReferenceDirective;
                if (referenced !== undefined && referenced.resolvedFileName === searchSourceFile.fileName) {
                    refs.push({ kind: "reference", referencingFile, ref });
                }
            }
        }
        forEachImport(referencingFile, (importDecl, moduleSpecifier) => {
            const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
            if (moduleSymbol === searchModuleSymbol) {
                refs.push(nodeIsSynthesized(importDecl) ? { kind: "implicit", literal: moduleSpecifier, referencingFile } : { kind: "import", literal: moduleSpecifier });
            }
        });
    }
    return refs;
}
/** Returns a map from a module symbol Id to all import statements that directly reference the module. */
function getDirectImportsMap(sourceFiles, checker, cancellationToken) {
    const map = new Map();
    for (const sourceFile of sourceFiles) {
        if (cancellationToken)
            cancellationToken.throwIfCancellationRequested();
        forEachImport(sourceFile, (importDecl, moduleSpecifier) => {
            const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
            if (moduleSymbol) {
                const id = getSymbolId(moduleSymbol).toString();
                let imports = map.get(id);
                if (!imports) {
                    map.set(id, imports = []);
                }
                imports.push(importDecl);
            }
        });
    }
    return map;
}
/** Iterates over all statements at the top level or in module declarations. Returns the first truthy result. */
function forEachPossibleImportOrExportStatement(sourceFileLike, action) {
    return forEach(sourceFileLike.kind === SyntaxKind.SourceFile ? sourceFileLike.statements : sourceFileLike.body.statements, statement => 
    // TODO: GH#18217
    action(statement) || (isAmbientModuleDeclaration(statement) && forEach(statement.body && statement.body.statements, action)));
}
/** Calls `action` for each import, re-export, or require() in a file. */
function forEachImport(sourceFile, action) {
    if (sourceFile.externalModuleIndicator || sourceFile.imports !== undefined) {
        for (const i of sourceFile.imports) {
            action(importFromModuleSpecifier(i), i);
        }
    }
    else {
        forEachPossibleImportOrExportStatement(sourceFile, statement => {
            switch (statement.kind) {
                case SyntaxKind.ExportDeclaration:
                case SyntaxKind.ImportDeclaration: {
                    const decl = statement;
                    if (decl.moduleSpecifier && isStringLiteral(decl.moduleSpecifier)) {
                        action(decl, decl.moduleSpecifier);
                    }
                    break;
                }
                case SyntaxKind.ImportEqualsDeclaration: {
                    const decl = statement;
                    if (isExternalModuleImportEquals(decl)) {
                        action(decl, decl.moduleReference.expression);
                    }
                    break;
                }
            }
        });
    }
}
/**
 * Given a local reference, we might notice that it's an import/export and recursively search for references of that.
 * If at an import, look locally for the symbol it imports.
 * If at an export, look for all imports of it.
 * This doesn't handle export specifiers; that is done in `getReferencesAtExportSpecifier`.
 * @param comingFromExport If we are doing a search for all exports, don't bother looking backwards for the imported symbol, since that's the reason we're here.
 *
 * @internal
 */
export function getImportOrExportSymbol(node, symbol, checker, comingFromExport) {
    return comingFromExport ? getExport() : getExport() || getImport();
    function getExport() {
        var _a;
        const { parent } = node;
        const grandparent = parent.parent;
        if (symbol.exportSymbol) {
            if (parent.kind === SyntaxKind.PropertyAccessExpression) {
                // When accessing an export of a JS module, there's no alias. The symbol will still be flagged as an export even though we're at the use.
                // So check that we are at the declaration.
                return ((_a = symbol.declarations) === null || _a === void 0 ? void 0 : _a.some(d => d === parent)) && isBinaryExpression(grandparent)
                    ? getSpecialPropertyExport(grandparent, /*useLhsSymbol*/ false)
                    : undefined;
            }
            else {
                return exportInfo(symbol.exportSymbol, getExportKindForDeclaration(parent));
            }
        }
        else {
            const exportNode = getExportNode(parent, node);
            if (exportNode && hasSyntacticModifier(exportNode, ModifierFlags.Export)) {
                if (isImportEqualsDeclaration(exportNode) && exportNode.moduleReference === node) {
                    // We're at `Y` in `export import X = Y`. This is not the exported symbol, the left-hand-side is. So treat this as an import statement.
                    if (comingFromExport) {
                        return undefined;
                    }
                    const lhsSymbol = checker.getSymbolAtLocation(exportNode.name);
                    return { kind: 0 /* ImportExport.Import */, symbol: lhsSymbol };
                }
                else {
                    return exportInfo(symbol, getExportKindForDeclaration(exportNode));
                }
            }
            else if (isNamespaceExport(parent)) {
                return exportInfo(symbol, 0 /* ExportKind.Named */);
            }
            // If we are in `export = a;` or `export default a;`, `parent` is the export assignment.
            else if (isExportAssignment(parent)) {
                return getExportAssignmentExport(parent);
            }
            // If we are in `export = class A {};` (or `export = class A {};`) at `A`, `parent.parent` is the export assignment.
            else if (isExportAssignment(grandparent)) {
                return getExportAssignmentExport(grandparent);
            }
            // Similar for `module.exports =` and `exports.A =`.
            else if (isBinaryExpression(parent)) {
                return getSpecialPropertyExport(parent, /*useLhsSymbol*/ true);
            }
            else if (isBinaryExpression(grandparent)) {
                return getSpecialPropertyExport(grandparent, /*useLhsSymbol*/ true);
            }
            else if (isJSDocTypedefTag(parent) || isJSDocCallbackTag(parent)) {
                return exportInfo(symbol, 0 /* ExportKind.Named */);
            }
        }
        function getExportAssignmentExport(ex) {
            // Get the symbol for the `export =` node; its parent is the module it's the export of.
            if (!ex.symbol.parent)
                return undefined;
            const exportKind = ex.isExportEquals ? 2 /* ExportKind.ExportEquals */ : 1 /* ExportKind.Default */;
            return { kind: 1 /* ImportExport.Export */, symbol, exportInfo: { exportingModuleSymbol: ex.symbol.parent, exportKind } };
        }
        function getSpecialPropertyExport(node, useLhsSymbol) {
            let kind;
            switch (getAssignmentDeclarationKind(node)) {
                case AssignmentDeclarationKind.ExportsProperty:
                    kind = 0 /* ExportKind.Named */;
                    break;
                case AssignmentDeclarationKind.ModuleExports:
                    kind = 2 /* ExportKind.ExportEquals */;
                    break;
                default:
                    return undefined;
            }
            const sym = useLhsSymbol ? checker.getSymbolAtLocation(getNameOfAccessExpression(cast(node.left, isAccessExpression))) : symbol;
            return sym && exportInfo(sym, kind);
        }
    }
    function getImport() {
        const isImport = isNodeImport(node);
        if (!isImport)
            return undefined;
        // A symbol being imported is always an alias. So get what that aliases to find the local symbol.
        let importedSymbol = checker.getImmediateAliasedSymbol(symbol);
        if (!importedSymbol)
            return undefined;
        // Search on the local symbol in the exporting module, not the exported symbol.
        importedSymbol = skipExportSpecifierSymbol(importedSymbol, checker);
        // Similarly, skip past the symbol for 'export ='
        if (importedSymbol.escapedName === "export=") {
            importedSymbol = getExportEqualsLocalSymbol(importedSymbol, checker);
            if (importedSymbol === undefined)
                return undefined;
        }
        // If the import has a different name than the export, do not continue searching.
        // If `importedName` is undefined, do continue searching as the export is anonymous.
        // (All imports returned from this function will be ignored anyway if we are in rename and this is a not a named export.)
        const importedName = symbolEscapedNameNoDefault(importedSymbol);
        if (importedName === undefined || importedName === InternalSymbolName.Default || importedName === symbol.escapedName) {
            return { kind: 0 /* ImportExport.Import */, symbol: importedSymbol };
        }
    }
    function exportInfo(symbol, kind) {
        const exportInfo = getExportInfo(symbol, kind, checker);
        return exportInfo && { kind: 1 /* ImportExport.Export */, symbol, exportInfo };
    }
    // Not meant for use with export specifiers or export assignment.
    function getExportKindForDeclaration(node) {
        return hasSyntacticModifier(node, ModifierFlags.Default) ? 1 /* ExportKind.Default */ : 0 /* ExportKind.Named */;
    }
}
function getExportEqualsLocalSymbol(importedSymbol, checker) {
    var _a, _b;
    if (importedSymbol.flags & SymbolFlags.Alias) {
        return checker.getImmediateAliasedSymbol(importedSymbol);
    }
    const decl = Debug.checkDefined(importedSymbol.valueDeclaration);
    if (isExportAssignment(decl)) { // `export = class {}`
        return (_a = tryCast(decl.expression, canHaveSymbol)) === null || _a === void 0 ? void 0 : _a.symbol;
    }
    else if (isBinaryExpression(decl)) { // `module.exports = class {}`
        return (_b = tryCast(decl.right, canHaveSymbol)) === null || _b === void 0 ? void 0 : _b.symbol;
    }
    else if (isSourceFile(decl)) { // json module
        return decl.symbol;
    }
    return undefined;
}
// If a reference is a class expression, the exported node would be its parent.
// If a reference is a variable declaration, the exported node would be the variable statement.
function getExportNode(parent, node) {
    const declaration = isVariableDeclaration(parent) ? parent : isBindingElement(parent) ? walkUpBindingElementsAndPatterns(parent) : undefined;
    if (declaration) {
        return parent.name !== node ? undefined :
            isCatchClause(declaration.parent) ? undefined : isVariableStatement(declaration.parent.parent) ? declaration.parent.parent : undefined;
    }
    else {
        return parent;
    }
}
function isNodeImport(node) {
    const { parent } = node;
    switch (parent.kind) {
        case SyntaxKind.ImportEqualsDeclaration:
            return parent.name === node && isExternalModuleImportEquals(parent);
        case SyntaxKind.ImportSpecifier:
            // For a rename import `{ foo as bar }`, don't search for the imported symbol. Just find local uses of `bar`.
            return !parent.propertyName;
        case SyntaxKind.ImportClause:
        case SyntaxKind.NamespaceImport:
            Debug.assert(parent.name === node);
            return true;
        case SyntaxKind.BindingElement:
            return isInJSFile(node) && isVariableDeclarationInitializedToBareOrAccessedRequire(parent.parent.parent);
        default:
            return false;
    }
}
/** @internal */
export function getExportInfo(exportSymbol, exportKind, checker) {
    const moduleSymbol = exportSymbol.parent;
    if (!moduleSymbol)
        return undefined; // This can happen if an `export` is not at the top-level (which is a compile error).
    const exportingModuleSymbol = checker.getMergedSymbol(moduleSymbol); // Need to get merged symbol in case there's an augmentation.
    // `export` may appear in a namespace. In that case, just rely on global search.
    return isExternalModuleSymbol(exportingModuleSymbol) ? { exportingModuleSymbol, exportKind } : undefined;
}
/** If at an export specifier, go to the symbol it refers to. */
function skipExportSpecifierSymbol(symbol, checker) {
    // For `export { foo } from './bar", there's nothing to skip, because it does not create a new alias. But `export { foo } does.
    if (symbol.declarations) {
        for (const declaration of symbol.declarations) {
            if (isExportSpecifier(declaration) && !declaration.propertyName && !declaration.parent.parent.moduleSpecifier) {
                return checker.getExportSpecifierLocalTargetSymbol(declaration) || symbol;
            }
            else if (isPropertyAccessExpression(declaration) && isModuleExportsAccessExpression(declaration.expression) && !isPrivateIdentifier(declaration.name)) {
                // Export of form 'module.exports.propName = expr';
                return checker.getSymbolAtLocation(declaration);
            }
            else if (isShorthandPropertyAssignment(declaration)
                && isBinaryExpression(declaration.parent.parent)
                && getAssignmentDeclarationKind(declaration.parent.parent) === AssignmentDeclarationKind.ModuleExports) {
                return checker.getExportSpecifierLocalTargetSymbol(declaration.name);
            }
        }
    }
    return symbol;
}
function getContainingModuleSymbol(importer, checker) {
    return checker.getMergedSymbol(getSourceFileLikeForImportDeclaration(importer).symbol);
}
function getSourceFileLikeForImportDeclaration(node) {
    if (node.kind === SyntaxKind.CallExpression || node.kind === SyntaxKind.JSDocImportTag) {
        return node.getSourceFile();
    }
    const { parent } = node;
    if (parent.kind === SyntaxKind.SourceFile) {
        return parent;
    }
    Debug.assert(parent.kind === SyntaxKind.ModuleBlock);
    return cast(parent.parent, isAmbientModuleDeclaration);
}
function isAmbientModuleDeclaration(node) {
    return node.kind === SyntaxKind.ModuleDeclaration && node.name.kind === SyntaxKind.StringLiteral;
}
function isExternalModuleImportEquals(eq) {
    return eq.moduleReference.kind === SyntaxKind.ExternalModuleReference && eq.moduleReference.expression.kind === SyntaxKind.StringLiteral;
}
