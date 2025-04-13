import {
  AssignmentDeclarationKind,
  compareStringsCaseSensitiveUI,
  compareValues,
  concatenate,
  contains,
  createTextSpanFromNode,
  createTextSpanFromRange,
  Debug,
  declarationNameToString,
  escapeString,
  factory,
  filterMutate,
  forEach,
  forEachChild,
  getAssignmentDeclarationKind,
  getBaseFileName,
  getElementOrPropertyAccessName,
  getFullWidth,
  getNameOfDeclaration,
  getNameOrArgument,
  getNodeKind,
  getNodeModifiers,
  getPropertyNameForPropertyNameNode,
  getSyntacticModifierFlags,
  getTextOfIdentifierOrLiteral,
  getTextOfNode,
  hasJSDocNodes,
  InternalSymbolName,
  isAmbientModule,
  isArrowFunction,
  isBinaryExpression,
  isBindableStaticAccessExpression,
  isBindingPattern,
  isCallExpression,
  isClassDeclaration,
  isClassLike,
  isComputedPropertyName,
  isDeclaration,
  isElementAccessExpression,
  isEntityNameExpression,
  isExportAssignment,
  isExpression,
  isExternalModule,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isJSDocTypeAlias,
  isModuleBlock,
  isModuleDeclaration,
  isNumericLiteral,
  isObjectLiteralExpression,
  isParameterPropertyDeclaration,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyName,
  isPropertyNameLiteral,
  isStatic,
  isStringLiteralLike,
  isStringOrNumericLiteralLike,
  isTemplateLiteral,
  isToken,
  isVariableDeclaration,
  lastOrUndefined,
  map,
  mapDefined,
  ModifierFlags,
  NodeFlags,
  normalizePath,
  removeFileExtension,
  setTextRange,
  SyntaxKind,
  unescapeLeadingUnderscores,
} from "./namespaces/ts.js";

/**
 * Matches all whitespace characters in a string. Eg:
 *
 * "app.
 *
 * onactivated"
 *
 * matches because of the newline, whereas
 *
 * "app.onactivated"
 *
 * does not match.
 */
const whiteSpaceRegex = /\s+/g;
/**
 * Maximum amount of characters to return
 * The amount was chosen arbitrarily.
 */
const maxLength = 150;
// Keep sourceFile handy so we don't have to search for it every time we need to call `getText`.
let curCancellationToken;
let curSourceFile;
/**
 * For performance, we keep navigation bar parents on a stack rather than passing them through each recursion.
 * `parent` is the current parent and is *not* stored in parentsStack.
 * `startNode` sets a new parent and `endNode` returns to the previous parent.
 */
let parentsStack = [];
let parent;
const trackedEs5ClassesStack = [];
let trackedEs5Classes;
// NavigationBarItem requires an array, but will not mutate it, so just give it this for performance.
let emptyChildItemArray = [];
/** @internal */
export function getNavigationBarItems(sourceFile, cancellationToken) {
    curCancellationToken = cancellationToken;
    curSourceFile = sourceFile;
    try {
        return map(primaryNavBarMenuItems(rootNavigationBarNode(sourceFile)), convertToPrimaryNavBarMenuItem);
    }
    finally {
        reset();
    }
}
/** @internal */
export function getNavigationTree(sourceFile, cancellationToken) {
    curCancellationToken = cancellationToken;
    curSourceFile = sourceFile;
    try {
        return convertToTree(rootNavigationBarNode(sourceFile));
    }
    finally {
        reset();
    }
}
function reset() {
    curSourceFile = undefined;
    curCancellationToken = undefined;
    parentsStack = [];
    parent = undefined;
    emptyChildItemArray = [];
}
function nodeText(node) {
    return cleanText(node.getText(curSourceFile));
}
function navigationBarNodeKind(n) {
    return n.node.kind;
}
function pushChild(parent, child) {
    if (parent.children) {
        parent.children.push(child);
    }
    else {
        parent.children = [child];
    }
}
function rootNavigationBarNode(sourceFile) {
    Debug.assert(!parentsStack.length);
    const root = { node: sourceFile, name: undefined, additionalNodes: undefined, parent: undefined, children: undefined, indent: 0 };
    parent = root;
    for (const statement of sourceFile.statements) {
        addChildrenRecursively(statement);
    }
    endNode();
    Debug.assert(!parent && !parentsStack.length);
    return root;
}
function addLeafNode(node, name) {
    pushChild(parent, emptyNavigationBarNode(node, name));
}
function emptyNavigationBarNode(node, name) {
    return {
        node,
        name: name || (isDeclaration(node) || isExpression(node) ? getNameOfDeclaration(node) : undefined),
        additionalNodes: undefined,
        parent,
        children: undefined,
        indent: parent.indent + 1,
    };
}
function addTrackedEs5Class(name) {
    if (!trackedEs5Classes) {
        trackedEs5Classes = new Map();
    }
    trackedEs5Classes.set(name, true);
}
function endNestedNodes(depth) {
    for (let i = 0; i < depth; i++)
        endNode();
}
function startNestedNodes(targetNode, entityName) {
    const names = [];
    while (!isPropertyNameLiteral(entityName)) {
        const name = getNameOrArgument(entityName);
        const nameText = getElementOrPropertyAccessName(entityName);
        entityName = entityName.expression;
        if (nameText === "prototype" || isPrivateIdentifier(name))
            continue;
        names.push(name);
    }
    names.push(entityName);
    for (let i = names.length - 1; i > 0; i--) {
        const name = names[i];
        startNode(targetNode, name);
    }
    return [names.length - 1, names[0]];
}
/**
 * Add a new level of NavigationBarNodes.
 * This pushes to the stack, so you must call `endNode` when you are done adding to this node.
 */
function startNode(node, name) {
    const navNode = emptyNavigationBarNode(node, name);
    pushChild(parent, navNode);
    // Save the old parent
    parentsStack.push(parent);
    trackedEs5ClassesStack.push(trackedEs5Classes);
    trackedEs5Classes = undefined;
    parent = navNode;
}
/** Call after calling `startNode` and adding children to it. */
function endNode() {
    if (parent.children) {
        mergeChildren(parent.children, parent);
        sortChildren(parent.children);
    }
    parent = parentsStack.pop();
    trackedEs5Classes = trackedEs5ClassesStack.pop();
}
function addNodeWithRecursiveChild(node, child, name) {
    startNode(node, name);
    addChildrenRecursively(child);
    endNode();
}
function addNodeWithRecursiveInitializer(node) {
    if (node.initializer && isFunctionOrClassExpression(node.initializer)) {
        startNode(node);
        forEachChild(node.initializer, addChildrenRecursively);
        endNode();
    }
    else {
        addNodeWithRecursiveChild(node, node.initializer);
    }
}
function hasNavigationBarName(node) {
    const name = getNameOfDeclaration(node);
    if (name === undefined)
        return false;
    if (isComputedPropertyName(name)) {
        const expression = name.expression;
        return isEntityNameExpression(expression) || isNumericLiteral(expression) || isStringOrNumericLiteralLike(expression);
    }
    return !!name;
}
/** Look for navigation bar items in node's subtree, adding them to the current `parent`. */
function addChildrenRecursively(node) {
    curCancellationToken.throwIfCancellationRequested();
    if (!node || isToken(node)) {
        return;
    }
    switch (node.kind) {
        case SyntaxKind.Constructor:
            // Get parameter properties, and treat them as being on the *same* level as the constructor, not under it.
            const ctr = node;
            addNodeWithRecursiveChild(ctr, ctr.body);
            // Parameter properties are children of the class, not the constructor.
            for (const param of ctr.parameters) {
                if (isParameterPropertyDeclaration(param, ctr)) {
                    addLeafNode(param);
                }
            }
            break;
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
        case SyntaxKind.MethodSignature:
            if (hasNavigationBarName(node)) {
                addNodeWithRecursiveChild(node, node.body);
            }
            break;
        case SyntaxKind.PropertyDeclaration:
            if (hasNavigationBarName(node)) {
                addNodeWithRecursiveInitializer(node);
            }
            break;
        case SyntaxKind.PropertySignature:
            if (hasNavigationBarName(node)) {
                addLeafNode(node);
            }
            break;
        case SyntaxKind.ImportClause:
            const importClause = node;
            // Handle default import case e.g.:
            //    import d from "mod";
            if (importClause.name) {
                addLeafNode(importClause.name);
            }
            // Handle named bindings in imports e.g.:
            //    import * as NS from "mod";
            //    import {a, b as B} from "mod";
            const { namedBindings } = importClause;
            if (namedBindings) {
                if (namedBindings.kind === SyntaxKind.NamespaceImport) {
                    addLeafNode(namedBindings);
                }
                else {
                    for (const element of namedBindings.elements) {
                        addLeafNode(element);
                    }
                }
            }
            break;
        case SyntaxKind.ShorthandPropertyAssignment:
            addNodeWithRecursiveChild(node, node.name);
            break;
        case SyntaxKind.SpreadAssignment:
            const { expression } = node;
            // Use the expression as the name of the SpreadAssignment, otherwise show as <unknown>.
            isIdentifier(expression) ? addLeafNode(node, expression) : addLeafNode(node);
            break;
        case SyntaxKind.BindingElement:
        case SyntaxKind.PropertyAssignment:
        case SyntaxKind.VariableDeclaration: {
            const child = node;
            if (isBindingPattern(child.name)) {
                addChildrenRecursively(child.name);
            }
            else {
                addNodeWithRecursiveInitializer(child);
            }
            break;
        }
        case SyntaxKind.FunctionDeclaration:
            const nameNode = node.name;
            // If we see a function declaration track as a possible ES5 class
            if (nameNode && isIdentifier(nameNode)) {
                addTrackedEs5Class(nameNode.text);
            }
            addNodeWithRecursiveChild(node, node.body);
            break;
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.FunctionExpression:
            addNodeWithRecursiveChild(node, node.body);
            break;
        case SyntaxKind.EnumDeclaration:
            startNode(node);
            for (const member of node.members) {
                if (!isComputedProperty(member)) {
                    addLeafNode(member);
                }
            }
            endNode();
            break;
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ClassExpression:
        case SyntaxKind.InterfaceDeclaration:
            startNode(node);
            for (const member of node.members) {
                addChildrenRecursively(member);
            }
            endNode();
            break;
        case SyntaxKind.ModuleDeclaration:
            addNodeWithRecursiveChild(node, getInteriorModule(node).body);
            break;
        case SyntaxKind.ExportAssignment: {
            const expression = node.expression;
            const child = isObjectLiteralExpression(expression) || isCallExpression(expression) ? expression :
                isArrowFunction(expression) || isFunctionExpression(expression) ? expression.body : undefined;
            if (child) {
                startNode(node);
                addChildrenRecursively(child);
                endNode();
            }
            else {
                addLeafNode(node);
            }
            break;
        }
        case SyntaxKind.ExportSpecifier:
        case SyntaxKind.ImportEqualsDeclaration:
        case SyntaxKind.IndexSignature:
        case SyntaxKind.CallSignature:
        case SyntaxKind.ConstructSignature:
        case SyntaxKind.TypeAliasDeclaration:
            addLeafNode(node);
            break;
        case SyntaxKind.CallExpression:
        case SyntaxKind.BinaryExpression: {
            const special = getAssignmentDeclarationKind(node);
            switch (special) {
                case AssignmentDeclarationKind.ExportsProperty:
                case AssignmentDeclarationKind.ModuleExports:
                    addNodeWithRecursiveChild(node, node.right);
                    return;
                case AssignmentDeclarationKind.Prototype:
                case AssignmentDeclarationKind.PrototypeProperty: {
                    const binaryExpression = node;
                    const assignmentTarget = binaryExpression.left;
                    const prototypeAccess = special === AssignmentDeclarationKind.PrototypeProperty ?
                        assignmentTarget.expression :
                        assignmentTarget;
                    let depth = 0;
                    let className;
                    // If we see a prototype assignment, start tracking the target as a class
                    // This is only done for simple classes not nested assignments.
                    if (isIdentifier(prototypeAccess.expression)) {
                        addTrackedEs5Class(prototypeAccess.expression.text);
                        className = prototypeAccess.expression;
                    }
                    else {
                        [depth, className] = startNestedNodes(binaryExpression, prototypeAccess.expression);
                    }
                    if (special === AssignmentDeclarationKind.Prototype) {
                        if (isObjectLiteralExpression(binaryExpression.right)) {
                            if (binaryExpression.right.properties.length > 0) {
                                startNode(binaryExpression, className);
                                forEachChild(binaryExpression.right, addChildrenRecursively);
                                endNode();
                            }
                        }
                    }
                    else if (isFunctionExpression(binaryExpression.right) || isArrowFunction(binaryExpression.right)) {
                        addNodeWithRecursiveChild(node, binaryExpression.right, className);
                    }
                    else {
                        startNode(binaryExpression, className);
                        addNodeWithRecursiveChild(node, binaryExpression.right, assignmentTarget.name);
                        endNode();
                    }
                    endNestedNodes(depth);
                    return;
                }
                case AssignmentDeclarationKind.ObjectDefinePropertyValue:
                case AssignmentDeclarationKind.ObjectDefinePrototypeProperty: {
                    const defineCall = node;
                    const className = special === AssignmentDeclarationKind.ObjectDefinePropertyValue ?
                        defineCall.arguments[0] :
                        defineCall.arguments[0].expression;
                    const memberName = defineCall.arguments[1];
                    const [depth, classNameIdentifier] = startNestedNodes(node, className);
                    startNode(node, classNameIdentifier);
                    startNode(node, setTextRange(factory.createIdentifier(memberName.text), memberName));
                    addChildrenRecursively(node.arguments[2]);
                    endNode();
                    endNode();
                    endNestedNodes(depth);
                    return;
                }
                case AssignmentDeclarationKind.Property: {
                    const binaryExpression = node;
                    const assignmentTarget = binaryExpression.left;
                    const targetFunction = assignmentTarget.expression;
                    if (isIdentifier(targetFunction) && getElementOrPropertyAccessName(assignmentTarget) !== "prototype" &&
                        trackedEs5Classes && trackedEs5Classes.has(targetFunction.text)) {
                        if (isFunctionExpression(binaryExpression.right) || isArrowFunction(binaryExpression.right)) {
                            addNodeWithRecursiveChild(node, binaryExpression.right, targetFunction);
                        }
                        else if (isBindableStaticAccessExpression(assignmentTarget)) {
                            startNode(binaryExpression, targetFunction);
                            addNodeWithRecursiveChild(binaryExpression.left, binaryExpression.right, getNameOrArgument(assignmentTarget));
                            endNode();
                        }
                        return;
                    }
                    break;
                }
                case AssignmentDeclarationKind.ThisProperty:
                case AssignmentDeclarationKind.None:
                case AssignmentDeclarationKind.ObjectDefinePropertyExports:
                    break;
                default:
                    Debug.assertNever(special);
            }
        }
        // falls through
        default:
            if (hasJSDocNodes(node)) {
                forEach(node.jsDoc, jsDoc => {
                    forEach(jsDoc.tags, tag => {
                        if (isJSDocTypeAlias(tag)) {
                            addLeafNode(tag);
                        }
                    });
                });
            }
            forEachChild(node, addChildrenRecursively);
    }
}
/** Merge declarations of the same kind. */
function mergeChildren(children, node) {
    const nameToItems = new Map();
    filterMutate(children, (child, index) => {
        const declName = child.name || getNameOfDeclaration(child.node);
        const name = declName && nodeText(declName);
        if (!name) {
            // Anonymous items are never merged.
            return true;
        }
        const itemsWithSameName = nameToItems.get(name);
        if (!itemsWithSameName) {
            nameToItems.set(name, child);
            return true;
        }
        if (itemsWithSameName instanceof Array) {
            for (const itemWithSameName of itemsWithSameName) {
                if (tryMerge(itemWithSameName, child, index, node)) {
                    return false;
                }
            }
            itemsWithSameName.push(child);
            return true;
        }
        else {
            const itemWithSameName = itemsWithSameName;
            if (tryMerge(itemWithSameName, child, index, node)) {
                return false;
            }
            nameToItems.set(name, [itemWithSameName, child]);
            return true;
        }
    });
}
const isEs5ClassMember = {
    [AssignmentDeclarationKind.Property]: true,
    [AssignmentDeclarationKind.PrototypeProperty]: true,
    [AssignmentDeclarationKind.ObjectDefinePropertyValue]: true,
    [AssignmentDeclarationKind.ObjectDefinePrototypeProperty]: true,
    [AssignmentDeclarationKind.None]: false,
    [AssignmentDeclarationKind.ExportsProperty]: false,
    [AssignmentDeclarationKind.ModuleExports]: false,
    [AssignmentDeclarationKind.ObjectDefinePropertyExports]: false,
    [AssignmentDeclarationKind.Prototype]: true,
    [AssignmentDeclarationKind.ThisProperty]: false,
};
function tryMergeEs5Class(a, b, bIndex, parent) {
    function isPossibleConstructor(node) {
        return isFunctionExpression(node) || isFunctionDeclaration(node) || isVariableDeclaration(node);
    }
    const bAssignmentDeclarationKind = isBinaryExpression(b.node) || isCallExpression(b.node) ?
        getAssignmentDeclarationKind(b.node) :
        AssignmentDeclarationKind.None;
    const aAssignmentDeclarationKind = isBinaryExpression(a.node) || isCallExpression(a.node) ?
        getAssignmentDeclarationKind(a.node) :
        AssignmentDeclarationKind.None;
    // We treat this as an es5 class and merge the nodes in in one of several cases
    if ((isEs5ClassMember[bAssignmentDeclarationKind] && isEs5ClassMember[aAssignmentDeclarationKind]) // merge two class elements
        || (isPossibleConstructor(a.node) && isEs5ClassMember[bAssignmentDeclarationKind]) // ctor function & member
        || (isPossibleConstructor(b.node) && isEs5ClassMember[aAssignmentDeclarationKind]) // member & ctor function
        || (isClassDeclaration(a.node) && isSynthesized(a.node) && isEs5ClassMember[bAssignmentDeclarationKind]) // class (generated) & member
        || (isClassDeclaration(b.node) && isEs5ClassMember[aAssignmentDeclarationKind]) // member & class (generated)
        || (isClassDeclaration(a.node) && isSynthesized(a.node) && isPossibleConstructor(b.node)) // class (generated) & ctor
        || (isClassDeclaration(b.node) && isPossibleConstructor(a.node) && isSynthesized(a.node)) // ctor & class (generated)
    ) {
        let lastANode = a.additionalNodes && lastOrUndefined(a.additionalNodes) || a.node;
        if ((!isClassDeclaration(a.node) && !isClassDeclaration(b.node)) // If neither outline node is a class
            || isPossibleConstructor(a.node) || isPossibleConstructor(b.node) // If either function is a constructor function
        ) {
            const ctorFunction = isPossibleConstructor(a.node) ? a.node :
                isPossibleConstructor(b.node) ? b.node :
                    undefined;
            if (ctorFunction !== undefined) {
                const ctorNode = setTextRange(factory.createConstructorDeclaration(/*modifiers*/ undefined, [], /*body*/ undefined), ctorFunction);
                const ctor = emptyNavigationBarNode(ctorNode);
                ctor.indent = a.indent + 1;
                ctor.children = a.node === ctorFunction ? a.children : b.children;
                a.children = a.node === ctorFunction ? concatenate([ctor], b.children || [b]) : concatenate(a.children || [Object.assign({}, a)], [ctor]);
            }
            else {
                if (a.children || b.children) {
                    a.children = concatenate(a.children || [Object.assign({}, a)], b.children || [b]);
                    if (a.children) {
                        mergeChildren(a.children, a);
                        sortChildren(a.children);
                    }
                }
            }
            lastANode = a.node = setTextRange(factory.createClassDeclaration(
            /*modifiers*/ undefined, a.name || factory.createIdentifier("__class__"), 
            /*typeParameters*/ undefined, 
            /*heritageClauses*/ undefined, []), a.node);
        }
        else {
            a.children = concatenate(a.children, b.children);
            if (a.children) {
                mergeChildren(a.children, a);
            }
        }
        const bNode = b.node;
        // We merge if the outline node previous to b (bIndex - 1) is already part of the current class
        // We do this so that statements between class members that do not generate outline nodes do not split up the class outline:
        // Ex This should produce one outline node C:
        //    function C() {}; a = 1; C.prototype.m = function () {}
        // Ex This will produce 3 outline nodes: C, a, C
        //    function C() {}; let a = 1; C.prototype.m = function () {}
        if (parent.children[bIndex - 1].node.end === lastANode.end) {
            setTextRange(lastANode, { pos: lastANode.pos, end: bNode.end });
        }
        else {
            if (!a.additionalNodes)
                a.additionalNodes = [];
            a.additionalNodes.push(setTextRange(factory.createClassDeclaration(
            /*modifiers*/ undefined, a.name || factory.createIdentifier("__class__"), 
            /*typeParameters*/ undefined, 
            /*heritageClauses*/ undefined, []), b.node));
        }
        return true;
    }
    return bAssignmentDeclarationKind === AssignmentDeclarationKind.None ? false : true;
}
function tryMerge(a, b, bIndex, parent) {
    // const v = false as boolean;
    if (tryMergeEs5Class(a, b, bIndex, parent)) {
        return true;
    }
    if (shouldReallyMerge(a.node, b.node, parent)) {
        merge(a, b);
        return true;
    }
    return false;
}
/** a and b have the same name, but they may not be mergeable. */
function shouldReallyMerge(a, b, parent) {
    if (a.kind !== b.kind || a.parent !== b.parent && !(isOwnChild(a, parent) && isOwnChild(b, parent))) {
        return false;
    }
    switch (a.kind) {
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.GetAccessor:
        case SyntaxKind.SetAccessor:
            return isStatic(a) === isStatic(b);
        case SyntaxKind.ModuleDeclaration:
            return areSameModule(a, b)
                && getFullyQualifiedModuleName(a) === getFullyQualifiedModuleName(b);
        default:
            return true;
    }
}
function isSynthesized(node) {
    return !!(node.flags & NodeFlags.Synthesized);
}
// We want to merge own children like `I` in in `module A { interface I {} } module A { interface I {} }`
// We don't want to merge unrelated children like `m` in `const o = { a: { m() {} }, b: { m() {} } };`
function isOwnChild(n, parent) {
    if (n.parent === undefined)
        return false;
    const par = isModuleBlock(n.parent) ? n.parent.parent : n.parent;
    return par === parent.node || contains(parent.additionalNodes, par);
}
// We use 1 NavNode to represent 'A.B.C', but there are multiple source nodes.
// Only merge module nodes that have the same chain. Don't merge 'A.B.C' with 'A'!
function areSameModule(a, b) {
    if (!a.body || !b.body) {
        return a.body === b.body;
    }
    return a.body.kind === b.body.kind && (a.body.kind !== SyntaxKind.ModuleDeclaration || areSameModule(a.body, b.body));
}
/** Merge source into target. Source should be thrown away after this is called. */
function merge(target, source) {
    target.additionalNodes = target.additionalNodes || [];
    target.additionalNodes.push(source.node);
    if (source.additionalNodes) {
        target.additionalNodes.push(...source.additionalNodes);
    }
    target.children = concatenate(target.children, source.children);
    if (target.children) {
        mergeChildren(target.children, target);
        sortChildren(target.children);
    }
}
/** Recursively ensure that each NavNode's children are in sorted order. */
function sortChildren(children) {
    children.sort(compareChildren);
}
function compareChildren(child1, child2) {
    return compareStringsCaseSensitiveUI(tryGetName(child1.node), tryGetName(child2.node)) // TODO: GH#18217
        || compareValues(navigationBarNodeKind(child1), navigationBarNodeKind(child2));
}
/**
 * This differs from getItemName because this is just used for sorting.
 * We only sort nodes by name that have a more-or-less "direct" name, as opposed to `new()` and the like.
 * So `new()` can still come before an `aardvark` method.
 */
function tryGetName(node) {
    if (node.kind === SyntaxKind.ModuleDeclaration) {
        return getModuleName(node);
    }
    const declName = getNameOfDeclaration(node);
    if (declName && isPropertyName(declName)) {
        const propertyName = getPropertyNameForPropertyNameNode(declName);
        return propertyName && unescapeLeadingUnderscores(propertyName);
    }
    switch (node.kind) {
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.ClassExpression:
            return getFunctionOrClassName(node);
        default:
            return undefined;
    }
}
function getItemName(node, name) {
    if (node.kind === SyntaxKind.ModuleDeclaration) {
        return cleanText(getModuleName(node));
    }
    if (name) {
        const text = isIdentifier(name) ? name.text
            : isElementAccessExpression(name) ? `[${nodeText(name.argumentExpression)}]`
                : nodeText(name);
        if (text.length > 0) {
            return cleanText(text);
        }
    }
    switch (node.kind) {
        case SyntaxKind.SourceFile:
            const sourceFile = node;
            return isExternalModule(sourceFile)
                ? `"${escapeString(getBaseFileName(removeFileExtension(normalizePath(sourceFile.fileName))))}"`
                : "<global>";
        case SyntaxKind.ExportAssignment:
            return isExportAssignment(node) && node.isExportEquals ? InternalSymbolName.ExportEquals : InternalSymbolName.Default;
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.ClassExpression:
            if (getSyntacticModifierFlags(node) & ModifierFlags.Default) {
                return "default";
            }
            // We may get a string with newlines or other whitespace in the case of an object dereference
            // (eg: "app\n.onactivated"), so we should remove the whitespace for readability in the
            // navigation bar.
            return getFunctionOrClassName(node);
        case SyntaxKind.Constructor:
            return "constructor";
        case SyntaxKind.ConstructSignature:
            return "new()";
        case SyntaxKind.CallSignature:
            return "()";
        case SyntaxKind.IndexSignature:
            return "[]";
        default:
            return "<unknown>";
    }
}
/** Flattens the NavNode tree to a list of items to appear in the primary navbar menu. */
function primaryNavBarMenuItems(root) {
    // The primary (middle) navbar menu displays the general code navigation hierarchy, similar to the navtree.
    // The secondary (right) navbar menu displays the child items of whichever primary item is selected.
    // Some less interesting items without their own child navigation items (e.g. a local variable declaration) only show up in the secondary menu.
    const primaryNavBarMenuItems = [];
    function recur(item) {
        if (shouldAppearInPrimaryNavBarMenu(item)) {
            primaryNavBarMenuItems.push(item);
            if (item.children) {
                for (const child of item.children) {
                    recur(child);
                }
            }
        }
    }
    recur(root);
    return primaryNavBarMenuItems;
    /** Determines if a node should appear in the primary navbar menu. */
    function shouldAppearInPrimaryNavBarMenu(item) {
        // Items with children should always appear in the primary navbar menu.
        if (item.children) {
            return true;
        }
        // Some nodes are otherwise important enough to always include in the primary navigation menu.
        switch (navigationBarNodeKind(item)) {
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.ClassExpression:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.ModuleDeclaration:
            case SyntaxKind.SourceFile:
            case SyntaxKind.TypeAliasDeclaration:
            case SyntaxKind.JSDocTypedefTag:
            case SyntaxKind.JSDocCallbackTag:
                return true;
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.FunctionExpression:
                return isTopLevelFunctionDeclaration(item);
            default:
                return false;
        }
        function isTopLevelFunctionDeclaration(item) {
            if (!item.node.body) {
                return false;
            }
            switch (navigationBarNodeKind(item.parent)) {
                case SyntaxKind.ModuleBlock:
                case SyntaxKind.SourceFile:
                case SyntaxKind.MethodDeclaration:
                case SyntaxKind.Constructor:
                    return true;
                default:
                    return false;
            }
        }
    }
}
function convertToTree(n) {
    return {
        text: getItemName(n.node, n.name),
        kind: getNodeKind(n.node),
        kindModifiers: getModifiers(n.node),
        spans: getSpans(n),
        nameSpan: n.name && getNodeSpan(n.name),
        childItems: map(n.children, convertToTree),
    };
}
function convertToPrimaryNavBarMenuItem(n) {
    return {
        text: getItemName(n.node, n.name),
        kind: getNodeKind(n.node),
        kindModifiers: getModifiers(n.node),
        spans: getSpans(n),
        childItems: map(n.children, convertToSecondaryNavBarMenuItem) || emptyChildItemArray,
        indent: n.indent,
        bolded: false,
        grayed: false,
    };
    function convertToSecondaryNavBarMenuItem(n) {
        return {
            text: getItemName(n.node, n.name),
            kind: getNodeKind(n.node),
            kindModifiers: getNodeModifiers(n.node),
            spans: getSpans(n),
            childItems: emptyChildItemArray,
            indent: 0,
            bolded: false,
            grayed: false,
        };
    }
}
function getSpans(n) {
    const spans = [getNodeSpan(n.node)];
    if (n.additionalNodes) {
        for (const node of n.additionalNodes) {
            spans.push(getNodeSpan(node));
        }
    }
    return spans;
}
function getModuleName(moduleDeclaration) {
    // We want to maintain quotation marks.
    if (isAmbientModule(moduleDeclaration)) {
        return getTextOfNode(moduleDeclaration.name);
    }
    return getFullyQualifiedModuleName(moduleDeclaration);
}
function getFullyQualifiedModuleName(moduleDeclaration) {
    // Otherwise, we need to aggregate each identifier to build up the qualified name.
    const result = [getTextOfIdentifierOrLiteral(moduleDeclaration.name)];
    while (moduleDeclaration.body && moduleDeclaration.body.kind === SyntaxKind.ModuleDeclaration) {
        moduleDeclaration = moduleDeclaration.body;
        result.push(getTextOfIdentifierOrLiteral(moduleDeclaration.name));
    }
    return result.join(".");
}
/**
 * For 'module A.B.C', we want to get the node for 'C'.
 * We store 'A' as associated with a NavNode, and use getModuleName to traverse down again.
 */
function getInteriorModule(decl) {
    return decl.body && isModuleDeclaration(decl.body) ? getInteriorModule(decl.body) : decl;
}
function isComputedProperty(member) {
    return !member.name || member.name.kind === SyntaxKind.ComputedPropertyName;
}
function getNodeSpan(node) {
    return node.kind === SyntaxKind.SourceFile ? createTextSpanFromRange(node) : createTextSpanFromNode(node, curSourceFile);
}
function getModifiers(node) {
    if (node.parent && node.parent.kind === SyntaxKind.VariableDeclaration) {
        node = node.parent;
    }
    return getNodeModifiers(node);
}
function getFunctionOrClassName(node) {
    const { parent } = node;
    if (node.name && getFullWidth(node.name) > 0) {
        return cleanText(declarationNameToString(node.name));
    }
    // See if it is a var initializer. If so, use the var name.
    else if (isVariableDeclaration(parent)) {
        return cleanText(declarationNameToString(parent.name));
    }
    // See if it is of the form "<expr> = function(){...}". If so, use the text from the left-hand side.
    else if (isBinaryExpression(parent) && parent.operatorToken.kind === SyntaxKind.EqualsToken) {
        return nodeText(parent.left).replace(whiteSpaceRegex, "");
    }
    // See if it is a property assignment, and if so use the property name
    else if (isPropertyAssignment(parent)) {
        return nodeText(parent.name);
    }
    // Default exports are named "default"
    else if (getSyntacticModifierFlags(node) & ModifierFlags.Default) {
        return "default";
    }
    else if (isClassLike(node)) {
        return "<class>";
    }
    else if (isCallExpression(parent)) {
        let name = getCalledExpressionName(parent.expression);
        if (name !== undefined) {
            name = cleanText(name);
            if (name.length > maxLength) {
                return `${name} callback`;
            }
            const args = cleanText(mapDefined(parent.arguments, a => isStringLiteralLike(a) || isTemplateLiteral(a) ? a.getText(curSourceFile) : undefined).join(", "));
            return `${name}(${args}) callback`;
        }
    }
    return "<function>";
}
// See also 'tryGetPropertyAccessOrIdentifierToString'
function getCalledExpressionName(expr) {
    if (isIdentifier(expr)) {
        return expr.text;
    }
    else if (isPropertyAccessExpression(expr)) {
        const left = getCalledExpressionName(expr.expression);
        const right = expr.name.text;
        return left === undefined ? right : `${left}.${right}`;
    }
    else {
        return undefined;
    }
}
function isFunctionOrClassExpression(node) {
    switch (node.kind) {
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ClassExpression:
            return true;
        default:
            return false;
    }
}
function cleanText(text) {
    // Truncate to maximum amount of characters as we don't want to do a big replace operation.
    text = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    // Replaces ECMAScript line terminators and removes the trailing `\` from each line:
    // \n - Line Feed
    // \r - Carriage Return
    // \u2028 - Line separator
    // \u2029 - Paragraph separator
    return text.replace(/\\?(?:\r?\n|[\r\u2028\u2029])/g, "");
}
