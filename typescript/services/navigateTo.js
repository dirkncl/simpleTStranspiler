import {
  compareStringsCaseSensitiveUI,
  compareValues,
  createPatternMatcher,
  createTextSpanFromNode,
  emptyArray,
  getContainerNode,
  getNameOfDeclaration,
  getNodeKind,
  getNodeModifiers,
  getTextOfIdentifierOrLiteral,
  isInsideNodeModules,
  isPropertyAccessExpression,
  isPropertyNameLiteral,
  PatternMatchKind,
  ScriptElementKind,
  SyntaxKind,
} from "./_namespaces/ts.js";


/** @internal */
export function getNavigateToItems(sourceFiles, checker, cancellationToken, searchValue, maxResultCount, excludeDtsFiles, excludeLibFiles) {
    const patternMatcher = createPatternMatcher(searchValue);
    if (!patternMatcher)
        return emptyArray;
    const rawItems = [];
    const singleCurrentFile = sourceFiles.length === 1 ? sourceFiles[0] : undefined;
    // Search the declarations in all files and output matched NavigateToItem into array of NavigateToItem[]
    for (const sourceFile of sourceFiles) {
        cancellationToken.throwIfCancellationRequested();
        if (excludeDtsFiles && sourceFile.isDeclarationFile) {
            continue;
        }
        if (shouldExcludeFile(sourceFile, !!excludeLibFiles, singleCurrentFile)) {
            continue;
        }
        sourceFile.getNamedDeclarations().forEach((declarations, name) => {
            getItemsFromNamedDeclaration(patternMatcher, name, declarations, checker, sourceFile.fileName, !!excludeLibFiles, singleCurrentFile, rawItems);
        });
    }
    rawItems.sort(compareNavigateToItems);
    return (maxResultCount === undefined ? rawItems : rawItems.slice(0, maxResultCount)).map(createNavigateToItem);
}
/**
 * Exclude 'node_modules/' files and standard library files if 'excludeLibFiles' is true.
 * If we're in current file only mode, we don't exclude the current file, even if it is a library file.
 */
function shouldExcludeFile(file, excludeLibFiles, singleCurrentFile) {
    return file !== singleCurrentFile && excludeLibFiles && (isInsideNodeModules(file.path) || file.hasNoDefaultLib);
}
function getItemsFromNamedDeclaration(patternMatcher, name, declarations, checker, fileName, excludeLibFiles, singleCurrentFile, rawItems) {
    // First do a quick check to see if the name of the declaration matches the
    // last portion of the (possibly) dotted name they're searching for.
    const match = patternMatcher.getMatchForLastSegmentOfPattern(name);
    if (!match) {
        return; // continue to next named declarations
    }
    for (const declaration of declarations) {
        if (!shouldKeepItem(declaration, checker, excludeLibFiles, singleCurrentFile))
            continue;
        if (patternMatcher.patternContainsDots) {
            // If the pattern has dots in it, then also see if the declaration container matches as well.
            const fullMatch = patternMatcher.getFullMatch(getContainers(declaration), name);
            if (fullMatch) {
                rawItems.push({ name, fileName, matchKind: fullMatch.kind, isCaseSensitive: fullMatch.isCaseSensitive, declaration });
            }
        }
        else {
            rawItems.push({ name, fileName, matchKind: match.kind, isCaseSensitive: match.isCaseSensitive, declaration });
        }
    }
}
function shouldKeepItem(declaration, checker, excludeLibFiles, singleCurrentFile) {
    var _a;
    switch (declaration.kind) {
        case SyntaxKind.ImportClause:
        case SyntaxKind.ImportSpecifier:
        case SyntaxKind.ImportEqualsDeclaration:
            const importer = checker.getSymbolAtLocation(declaration.name); // TODO: GH#18217
            const imported = checker.getAliasedSymbol(importer);
            return importer.escapedName !== imported.escapedName
                && !((_a = imported.declarations) === null || _a === void 0 ? void 0 : _a.every(d => shouldExcludeFile(d.getSourceFile(), excludeLibFiles, singleCurrentFile)));
        default:
            return true;
    }
}
function tryAddSingleDeclarationName(declaration, containers) {
    const name = getNameOfDeclaration(declaration);
    return !!name && (pushLiteral(name, containers) || name.kind === SyntaxKind.ComputedPropertyName && tryAddComputedPropertyName(name.expression, containers));
}
// Only added the names of computed properties if they're simple dotted expressions, like:
//
//      [X.Y.Z]() { }
function tryAddComputedPropertyName(expression, containers) {
    return pushLiteral(expression, containers)
        || isPropertyAccessExpression(expression) && (containers.push(expression.name.text), true) && tryAddComputedPropertyName(expression.expression, containers);
}
function pushLiteral(node, containers) {
    return isPropertyNameLiteral(node) && (containers.push(getTextOfIdentifierOrLiteral(node)), true);
}
function getContainers(declaration) {
    const containers = [];
    // First, if we started with a computed property name, then add all but the last
    // portion into the container array.
    const name = getNameOfDeclaration(declaration);
    if (name && name.kind === SyntaxKind.ComputedPropertyName && !tryAddComputedPropertyName(name.expression, containers)) {
        return emptyArray;
    }
    // Don't include the last portion.
    containers.shift();
    // Now, walk up our containers, adding all their names to the container array.
    let container = getContainerNode(declaration);
    while (container) {
        if (!tryAddSingleDeclarationName(container, containers)) {
            return emptyArray;
        }
        container = getContainerNode(container);
    }
    containers.reverse();
    return containers;
}
function compareNavigateToItems(i1, i2) {
    // TODO(cyrusn): get the gamut of comparisons that VS already uses here.
    return compareValues(i1.matchKind, i2.matchKind)
        || compareStringsCaseSensitiveUI(i1.name, i2.name);
}
function createNavigateToItem(rawItem) {
    const declaration = rawItem.declaration;
    const container = getContainerNode(declaration);
    const containerName = container && getNameOfDeclaration(container);
    return {
        name: rawItem.name,
        kind: getNodeKind(declaration),
        kindModifiers: getNodeModifiers(declaration),
        matchKind: PatternMatchKind[rawItem.matchKind],
        isCaseSensitive: rawItem.isCaseSensitive,
        fileName: rawItem.fileName,
        textSpan: createTextSpanFromNode(declaration),
        // TODO(jfreeman): What should be the containerName when the container has a computed name?
        containerName: containerName ? containerName.text : "",
        containerKind: containerName ? getNodeKind(container) : ScriptElementKind.unknown,
    };
}
