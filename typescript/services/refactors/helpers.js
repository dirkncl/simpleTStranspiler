import {
  Debug,
  findAncestor,
  getUniqueName,
  identifierToKeywordKind,
  isAnyImportOrRequireStatement,
  isClassLike,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  skipAlias,
  SymbolFlags,
} from "../namespaces/ts.js";

import { addImportsForMovedSymbols } from "./moveToFile.js";

/**
 * Checks if some refactor info has refactor error info.
 *
 * @internal
 */
export function isRefactorErrorInfo(info) {
    return info.error !== undefined;
}
/**
 * Checks if string "known" begins with string "requested".
 * Used to match requested kinds with a known kind.
 *
 * @internal
 */
export function refactorKindBeginsWith(known, requested) {
    if (!requested)
        return true;
    return known.substr(0, requested.length) === requested;
}
/**
 * Try to come up with a unique name for a given node within the scope for the
 * use of being used as a property/variable name.
 *
 * @internal
 */
export function getIdentifierForNode(node, scope, checker, file) {
    return isPropertyAccessExpression(node) && !isClassLike(scope) && !checker.resolveName(node.name.text, node, SymbolFlags.Value, /*excludeGlobals*/ false) && !isPrivateIdentifier(node.name) && !identifierToKeywordKind(node.name)
        ? node.name.text
        : getUniqueName(isClassLike(scope) ? "newProperty" : "newLocal", file);
}
/** @internal */
export function addTargetFileImports(oldFile, importsToCopy, targetFileImportsFromOldFile, checker, program, importAdder) {
    /**
     * Recomputing the imports is preferred with importAdder because it manages multiple import additions for a file and writes then to a ChangeTracker,
     * but sometimes it fails because of unresolved imports from files, or when a source file is not available for the target file (in this case when creating a new file).
     * So in that case, fall back to copying the import verbatim.
     */
    importsToCopy.forEach(([isValidTypeOnlyUseSite, declaration], symbol) => {
        var _a;
        const targetSymbol = skipAlias(symbol, checker);
        if (checker.isUnknownSymbol(targetSymbol)) {
            importAdder.addVerbatimImport(Debug.checkDefined(declaration !== null && declaration !== void 0 ? declaration : findAncestor((_a = symbol.declarations) === null || _a === void 0 ? void 0 : _a[0], isAnyImportOrRequireStatement)));
        }
        else if (targetSymbol.parent === undefined) {
            Debug.assert(declaration !== undefined, "expected module symbol to have a declaration");
            importAdder.addImportForModuleSymbol(symbol, isValidTypeOnlyUseSite, declaration);
        }
        else {
            importAdder.addImportFromExportedSymbol(targetSymbol, isValidTypeOnlyUseSite, declaration);
        }
    });
    addImportsForMovedSymbols(targetFileImportsFromOldFile, oldFile.fileName, importAdder, program);
}
