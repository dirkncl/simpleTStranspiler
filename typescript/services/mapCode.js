import {
  createSourceFile,
  find,
  findAncestor,
  findLast,
  flatten,
  forEach,
  getTokenAtPosition,
  isBlock,
  isClassElement,
  isClassLike,
  isForInOrOfStatement,
  isForStatement,
  isIfStatement,
  isInterfaceDeclaration,
  isLabeledStatement,
  isNamedDeclaration,
  isSourceFile,
  isTypeElement,
  isWhileStatement,
  or,
  some,
  SyntaxKind,
  textChanges,
} from "./_namespaces/ts.js";


/** @internal */
export function mapCode(sourceFile, contents, focusLocations, host, formatContext, preferences) {
    return textChanges.ChangeTracker.with({ host, formatContext, preferences }, changeTracker => {
        const parsed = contents.map(c => parse(sourceFile, c));
        const flattenedLocations = focusLocations && flatten(focusLocations);
        for (const nodes of parsed) {
            placeNodeGroup(sourceFile, changeTracker, nodes, flattenedLocations);
        }
    });
}
/**
 * Tries to parse something into either "top-level" statements, or into blocks
 * of class-context definitions.
 */
function parse(sourceFile, content) {
    // We're going to speculatively parse different kinds of contexts to see
    // which one makes the most sense, and grab the NodeArray from there. Do
    // this as lazily as possible.
    const nodeKinds = [
        {
            parse: () => createSourceFile("__mapcode_content_nodes.ts", content, sourceFile.languageVersion, 
            /*setParentNodes*/ true, sourceFile.scriptKind),
            body: (sf) => sf.statements,
        },
        {
            parse: () => createSourceFile("__mapcode_class_content_nodes.ts", `class __class {\n${content}\n}`, sourceFile.languageVersion, 
            /*setParentNodes*/ true, sourceFile.scriptKind),
            body: (cw) => cw.statements[0].members,
        },
    ];
    const parsedNodes = [];
    for (const { parse, body } of nodeKinds) {
        const sourceFile = parse();
        const bod = body(sourceFile);
        if (bod.length && sourceFile.parseDiagnostics.length === 0) {
            // If we run into a case with no parse errors, this is likely the right kind.
            return bod;
        }
        // We only want to keep the ones that have some kind of body.
        else if (bod.length) {
            // Otherwise, we'll need to look at others.
            parsedNodes.push({ sourceFile, body: bod });
        }
    }
    // Heuristic: fewer errors = more likely to be the right kind.
    parsedNodes.sort((a, b) => a.sourceFile.parseDiagnostics.length -
        b.sourceFile.parseDiagnostics.length);
    const { body } = parsedNodes[0];
    return body;
}
function placeNodeGroup(originalFile, changeTracker, changes, focusLocations) {
    if (isClassElement(changes[0]) || isTypeElement(changes[0])) {
        placeClassNodeGroup(originalFile, changeTracker, changes, focusLocations);
    }
    else {
        placeStatements(originalFile, changeTracker, changes, focusLocations);
    }
}
function placeClassNodeGroup(originalFile, changeTracker, changes, focusLocations) {
    let classOrInterface;
    if (!focusLocations || !focusLocations.length) {
        classOrInterface = find(originalFile.statements, or(isClassLike, isInterfaceDeclaration));
    }
    else {
        classOrInterface = forEach(focusLocations, location => findAncestor(getTokenAtPosition(originalFile, location.start), or(isClassLike, isInterfaceDeclaration)));
    }
    if (!classOrInterface) {
        // No class? don't insert.
        return;
    }
    const firstMatch = classOrInterface.members.find(member => changes.some(change => matchNode(change, member)));
    if (firstMatch) {
        // can't be undefined here, since we know we have at least one match.
        const lastMatch = findLast(classOrInterface.members, member => changes.some(change => matchNode(change, member)));
        forEach(changes, wipeNode);
        changeTracker.replaceNodeRangeWithNodes(originalFile, firstMatch, lastMatch, changes);
        return;
    }
    forEach(changes, wipeNode);
    changeTracker.insertNodesAfter(originalFile, classOrInterface.members[classOrInterface.members.length - 1], changes);
}
function placeStatements(originalFile, changeTracker, changes, focusLocations) {
    if (!(focusLocations === null || focusLocations === void 0 ? void 0 : focusLocations.length)) {
        changeTracker.insertNodesAtEndOfFile(originalFile, changes, 
        /*blankLineBetween*/ false);
        return;
    }
    for (const location of focusLocations) {
        const scope = findAncestor(getTokenAtPosition(originalFile, location.start), (block) => or(isBlock, isSourceFile)(block) &&
            some(block.statements, origStmt => changes.some(newStmt => matchNode(newStmt, origStmt))));
        if (scope) {
            const start = scope.statements.find(stmt => changes.some(node => matchNode(node, stmt)));
            if (start) {
                // Can't be undefined here, since we know we have at least one match.
                const end = findLast(scope.statements, stmt => changes.some(node => matchNode(node, stmt)));
                forEach(changes, wipeNode);
                changeTracker.replaceNodeRangeWithNodes(originalFile, start, end, changes);
                return;
            }
        }
    }
    let scopeStatements = originalFile.statements;
    for (const location of focusLocations) {
        const block = findAncestor(getTokenAtPosition(originalFile, location.start), isBlock);
        if (block) {
            scopeStatements = block.statements;
            break;
        }
    }
    forEach(changes, wipeNode);
    changeTracker.insertNodesAfter(originalFile, scopeStatements[scopeStatements.length - 1], changes);
}
function matchNode(a, b) {
    var _a, _b, _c, _d, _e, _f;
    if (a.kind !== b.kind) {
        return false;
    }
    if (a.kind === SyntaxKind.Constructor) {
        return a.kind === b.kind;
    }
    if (isNamedDeclaration(a) && isNamedDeclaration(b)) {
        return a.name.getText() === b.name.getText();
    }
    if (isIfStatement(a) && isIfStatement(b)) {
        return (a.expression.getText() === b.expression.getText());
    }
    if (isWhileStatement(a) && isWhileStatement(b)) {
        return (a.expression.getText() ===
            b.expression.getText());
    }
    if (isForStatement(a) && isForStatement(b)) {
        return (((_a = a.initializer) === null || _a === void 0 ? void 0 : _a.getText()) ===
            ((_b = b.initializer) === null || _b === void 0 ? void 0 : _b.getText()) &&
            ((_c = a.incrementor) === null || _c === void 0 ? void 0 : _c.getText()) ===
                ((_d = b.incrementor) === null || _d === void 0 ? void 0 : _d.getText()) &&
            ((_e = a.condition) === null || _e === void 0 ? void 0 : _e.getText()) === ((_f = b.condition) === null || _f === void 0 ? void 0 : _f.getText()));
    }
    if (isForInOrOfStatement(a) && isForInOrOfStatement(b)) {
        return (a.expression.getText() ===
            b.expression.getText() &&
            a.initializer.getText() ===
                b.initializer.getText());
    }
    if (isLabeledStatement(a) && isLabeledStatement(b)) {
        // If we're actually labeling/naming something, we should be a bit
        // more lenient about when we match, so we don't care what the actual
        // related statement is: we just replace.
        return a.label.getText() === b.label.getText();
    }
    if (a.getText() === b.getText()) {
        return true;
    }
    return false;
}
function wipeNode(node) {
    resetNodePositions(node);
    node.parent = undefined;
}
function resetNodePositions(node) {
    node.pos = -1;
    node.end = -1;
    node.forEachChild(resetNodePositions);
}
