import {
  findAncestor,
  forEachChild,
  getTokenAtPosition,
  isIdentifier,
  rangeContainsPosition,
  rangeContainsRange,
  SymbolFlags,
} from "./namespaces/ts.js";

import { isInImport } from "./refactors/moveToFile.js";

/** @internal */
export function preparePasteEdits(sourceFile, copiedFromRange, checker) {
    let shouldProvidePasteEdits = false;
    copiedFromRange.forEach(range => {
        const enclosingNode = findAncestor(getTokenAtPosition(sourceFile, range.pos), ancestorNode => rangeContainsRange(ancestorNode, range));
        if (!enclosingNode)
            return;
        forEachChild(enclosingNode, function checkNameResolution(node) {
            var _a;
            if (shouldProvidePasteEdits)
                return;
            if (isIdentifier(node) && rangeContainsPosition(range, node.getStart(sourceFile))) {
                const resolvedSymbol = checker.resolveName(node.text, node, SymbolFlags.All, /*excludeGlobals*/ false);
                if (resolvedSymbol && resolvedSymbol.declarations) {
                    for (const decl of resolvedSymbol.declarations) {
                        if (isInImport(decl) || !!(node.text && sourceFile.symbol && ((_a = sourceFile.symbol.exports) === null || _a === void 0 ? void 0 : _a.has(node.escapedText)))) {
                            shouldProvidePasteEdits = true;
                            return;
                        }
                    }
                }
            }
            node.forEachChild(checkNameResolution);
        });
        if (shouldProvidePasteEdits)
            return;
    });
    return shouldProvidePasteEdits;
}
