import {
  createCodeFixActionWithoutFixAll,
  registerCodeFix,
} from "../_namespaces/ts.codefix.js";

import {
  arrayFrom,
  concatenate,
  copyEntries,
  createMultiMap,
  createRange,
  Debug,
  Diagnostics,
  emptyMap,
  factory,
  filter,
  findChildOfKind,
  flatMap,
  forEach,
  getEmitScriptTarget,
  getQuotePreference,
  getSynthesizedDeepClone,
  getSynthesizedDeepClones,
  getSynthesizedDeepClonesWithReplacements,
  getSynthesizedDeepCloneWithReplacements,
  importFromModuleSpecifier,
  InternalSymbolName,
  isArray,
  isArrowFunction,
  isBinaryExpression,
  isClassExpression,
  isExportsOrModuleExportsOrAlias,
  isFunctionExpression,
  isIdentifier,
  isIdentifierANonContextualKeyword,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isRequireCall,
  isVariableStatement,
  makeImport,
  map,
  mapAllOrFail,
  mapIterator,
  moduleSpecifierToValidIdentifier,
  NodeFlags,
  rangeContainsRange,
  some,
  SymbolFlags,
  SyntaxKind,
  textChanges,
} from "../_namespaces/ts.js";


registerCodeFix({
    errorCodes: [Diagnostics.File_is_a_CommonJS_module_it_may_be_converted_to_an_ES_module.code],
    getCodeActions(context) {
        const { sourceFile, program, preferences } = context;
        const changes = textChanges.ChangeTracker.with(context, changes => {
            const moduleExportsChangedToDefault = convertFileToEsModule(sourceFile, program.getTypeChecker(), changes, getEmitScriptTarget(program.getCompilerOptions()), getQuotePreference(sourceFile, preferences));
            if (moduleExportsChangedToDefault) {
                for (const importingFile of program.getSourceFiles()) {
                    fixImportOfModuleExports(importingFile, sourceFile, program, changes, getQuotePreference(importingFile, preferences));
                }
            }
        });
        // No support for fix-all since this applies to the whole file at once anyway.
        return [createCodeFixActionWithoutFixAll("convertToEsModule", changes, Diagnostics.Convert_to_ES_module)];
    },
});
function fixImportOfModuleExports(importingFile, exportingFile, program, changes, quotePreference) {
    var _a;
    for (const moduleSpecifier of importingFile.imports) {
        const imported = (_a = program.getResolvedModuleFromModuleSpecifier(moduleSpecifier, importingFile)) === null || _a === void 0 ? void 0 : _a.resolvedModule;
        if (!imported || imported.resolvedFileName !== exportingFile.fileName) {
            continue;
        }
        const importNode = importFromModuleSpecifier(moduleSpecifier);
        switch (importNode.kind) {
            case SyntaxKind.ImportEqualsDeclaration:
                changes.replaceNode(importingFile, importNode, makeImport(importNode.name, /*namedImports*/ undefined, moduleSpecifier, quotePreference));
                break;
            case SyntaxKind.CallExpression:
                if (isRequireCall(importNode, /*requireStringLiteralLikeArgument*/ false)) {
                    changes.replaceNode(importingFile, importNode, factory.createPropertyAccessExpression(getSynthesizedDeepClone(importNode), "default"));
                }
                break;
        }
    }
}
/** @returns Whether we converted a `module.exports =` to a default export. */
function convertFileToEsModule(sourceFile, checker, changes, target, quotePreference) {
    const identifiers = { original: collectFreeIdentifiers(sourceFile), additional: new Set() };
    const exports = collectExportRenames(sourceFile, checker, identifiers);
    convertExportsAccesses(sourceFile, exports, changes);
    let moduleExportsChangedToDefault = false;
    let useSitesToUnqualify;
    // Process variable statements first to collect use sites that need to be updated inside other transformations
    for (const statement of filter(sourceFile.statements, isVariableStatement)) {
        const newUseSites = convertVariableStatement(sourceFile, statement, changes, checker, identifiers, target, quotePreference);
        if (newUseSites) {
            copyEntries(newUseSites, useSitesToUnqualify !== null && useSitesToUnqualify !== void 0 ? useSitesToUnqualify : (useSitesToUnqualify = new Map()));
        }
    }
    // `convertStatement` will delete entries from `useSitesToUnqualify` when containing statements are replaced
    for (const statement of filter(sourceFile.statements, s => !isVariableStatement(s))) {
        const moduleExportsChanged = convertStatement(sourceFile, statement, checker, changes, identifiers, target, exports, useSitesToUnqualify, quotePreference);
        moduleExportsChangedToDefault = moduleExportsChangedToDefault || moduleExportsChanged;
    }
    // Remaining use sites can be changed directly
    useSitesToUnqualify === null || useSitesToUnqualify === void 0 ? void 0 : useSitesToUnqualify.forEach((replacement, original) => {
        changes.replaceNode(sourceFile, original, replacement);
    });
    return moduleExportsChangedToDefault;
}
function collectExportRenames(sourceFile, checker, identifiers) {
    const res = new Map();
    forEachExportReference(sourceFile, node => {
        const { text } = node.name;
        if (!res.has(text) && (isIdentifierANonContextualKeyword(node.name)
            || checker.resolveName(text, node, SymbolFlags.Value, /*excludeGlobals*/ true))) {
            // Unconditionally add an underscore in case `text` is a keyword.
            res.set(text, makeUniqueName(`_${text}`, identifiers));
        }
    });
    return res;
}
function convertExportsAccesses(sourceFile, exports, changes) {
    forEachExportReference(sourceFile, (node, isAssignmentLhs) => {
        if (isAssignmentLhs) {
            return;
        }
        const { text } = node.name;
        changes.replaceNode(sourceFile, node, factory.createIdentifier(exports.get(text) || text));
    });
}
function forEachExportReference(sourceFile, cb) {
    sourceFile.forEachChild(function recur(node) {
        if (isPropertyAccessExpression(node) && isExportsOrModuleExportsOrAlias(sourceFile, node.expression) && isIdentifier(node.name)) {
            const { parent } = node;
            cb(node, isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind === SyntaxKind.EqualsToken);
        }
        node.forEachChild(recur);
    });
}
function convertStatement(sourceFile, statement, checker, changes, identifiers, target, exports, useSitesToUnqualify, quotePreference) {
    switch (statement.kind) {
        case SyntaxKind.VariableStatement:
            convertVariableStatement(sourceFile, statement, changes, checker, identifiers, target, quotePreference);
            return false;
        case SyntaxKind.ExpressionStatement: {
            const { expression } = statement;
            switch (expression.kind) {
                case SyntaxKind.CallExpression: {
                    if (isRequireCall(expression, /*requireStringLiteralLikeArgument*/ true)) {
                        // For side-effecting require() call, just make a side-effecting import.
                        changes.replaceNode(sourceFile, statement, makeImport(/*defaultImport*/ undefined, /*namedImports*/ undefined, expression.arguments[0], quotePreference));
                    }
                    return false;
                }
                case SyntaxKind.BinaryExpression: {
                    const { operatorToken } = expression;
                    return operatorToken.kind === SyntaxKind.EqualsToken && convertAssignment(sourceFile, checker, expression, changes, exports, useSitesToUnqualify);
                }
            }
        }
        // falls through
        default:
            return false;
    }
}
function convertVariableStatement(sourceFile, statement, changes, checker, identifiers, target, quotePreference) {
    const { declarationList } = statement;
    let foundImport = false;
    const converted = map(declarationList.declarations, decl => {
        const { name, initializer } = decl;
        if (initializer) {
            if (isExportsOrModuleExportsOrAlias(sourceFile, initializer)) {
                // `const alias = module.exports;` can be removed.
                foundImport = true;
                return convertedImports([]);
            }
            else if (isRequireCall(initializer, /*requireStringLiteralLikeArgument*/ true)) {
                foundImport = true;
                return convertSingleImport(name, initializer.arguments[0], checker, identifiers, target, quotePreference);
            }
            else if (isPropertyAccessExpression(initializer) && isRequireCall(initializer.expression, /*requireStringLiteralLikeArgument*/ true)) {
                foundImport = true;
                return convertPropertyAccessImport(name, initializer.name.text, initializer.expression.arguments[0], identifiers, quotePreference);
            }
        }
        // Move it out to its own variable statement. (This will not be used if `!foundImport`)
        return convertedImports([factory.createVariableStatement(/*modifiers*/ undefined, factory.createVariableDeclarationList([decl], declarationList.flags))]);
    });
    if (foundImport) {
        // useNonAdjustedEndPosition to ensure we don't eat the newline after the statement.
        changes.replaceNodeWithNodes(sourceFile, statement, flatMap(converted, c => c.newImports));
        let combinedUseSites;
        forEach(converted, c => {
            if (c.useSitesToUnqualify) {
                copyEntries(c.useSitesToUnqualify, combinedUseSites !== null && combinedUseSites !== void 0 ? combinedUseSites : (combinedUseSites = new Map()));
            }
        });
        return combinedUseSites;
    }
}
/** Converts `const name = require("moduleSpecifier").propertyName` */
function convertPropertyAccessImport(name, propertyName, moduleSpecifier, identifiers, quotePreference) {
    switch (name.kind) {
        case SyntaxKind.ObjectBindingPattern:
        case SyntaxKind.ArrayBindingPattern: {
            // `const [a, b] = require("c").d` --> `import { d } from "c"; const [a, b] = d;`
            const tmp = makeUniqueName(propertyName, identifiers);
            return convertedImports([
                makeSingleImport(tmp, propertyName, moduleSpecifier, quotePreference),
                makeConst(/*modifiers*/ undefined, name, factory.createIdentifier(tmp)),
            ]);
        }
        case SyntaxKind.Identifier:
            // `const a = require("b").c` --> `import { c as a } from "./b";
            return convertedImports([makeSingleImport(name.text, propertyName, moduleSpecifier, quotePreference)]);
        default:
            return Debug.assertNever(name, `Convert to ES module got invalid syntax form ${name.kind}`);
    }
}
function convertAssignment(sourceFile, checker, assignment, changes, exports, useSitesToUnqualify) {
    const { left, right } = assignment;
    if (!isPropertyAccessExpression(left)) {
        return false;
    }
    if (isExportsOrModuleExportsOrAlias(sourceFile, left)) {
        if (isExportsOrModuleExportsOrAlias(sourceFile, right)) {
            // `const alias = module.exports;` or `module.exports = alias;` can be removed.
            changes.delete(sourceFile, assignment.parent);
        }
        else {
            const replacement = isObjectLiteralExpression(right) ? tryChangeModuleExportsObject(right, useSitesToUnqualify)
                : isRequireCall(right, /*requireStringLiteralLikeArgument*/ true) ? convertReExportAll(right.arguments[0], checker)
                    : undefined;
            if (replacement) {
                changes.replaceNodeWithNodes(sourceFile, assignment.parent, replacement[0]);
                return replacement[1];
            }
            else {
                changes.replaceRangeWithText(sourceFile, createRange(left.getStart(sourceFile), right.pos), "export default");
                return true;
            }
        }
    }
    else if (isExportsOrModuleExportsOrAlias(sourceFile, left.expression)) {
        convertNamedExport(sourceFile, assignment, changes, exports);
    }
    return false;
}
/**
 * Convert `module.exports = { ... }` to individual exports..
 * We can't always do this if the module has interesting members -- then it will be a default export instead.
 */
function tryChangeModuleExportsObject(object, useSitesToUnqualify) {
    const statements = mapAllOrFail(object.properties, prop => {
        switch (prop.kind) {
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
            // TODO: Maybe we should handle this? See fourslash test `refactorConvertToEs6Module_export_object_shorthand.ts`.
            // falls through
            case SyntaxKind.ShorthandPropertyAssignment:
            case SyntaxKind.SpreadAssignment:
                return undefined;
            case SyntaxKind.PropertyAssignment:
                return !isIdentifier(prop.name) ? undefined : convertExportsDotXEquals_replaceNode(prop.name.text, prop.initializer, useSitesToUnqualify);
            case SyntaxKind.MethodDeclaration:
                return !isIdentifier(prop.name) ? undefined : functionExpressionToDeclaration(prop.name.text, [factory.createToken(SyntaxKind.ExportKeyword)], prop, useSitesToUnqualify);
            default:
                Debug.assertNever(prop, `Convert to ES6 got invalid prop kind ${prop.kind}`);
        }
    });
    return statements && [statements, false];
}
function convertNamedExport(sourceFile, assignment, changes, exports) {
    // If "originalKeywordKind" was set, this is e.g. `exports.
    const { text } = assignment.left.name;
    const rename = exports.get(text);
    if (rename !== undefined) {
        /*
        const _class = 0;
        export { _class as class };
        */
        const newNodes = [
            makeConst(/*modifiers*/ undefined, rename, assignment.right),
            makeExportDeclaration([factory.createExportSpecifier(/*isTypeOnly*/ false, rename, text)]),
        ];
        changes.replaceNodeWithNodes(sourceFile, assignment.parent, newNodes);
    }
    else {
        convertExportsPropertyAssignment(assignment, sourceFile, changes);
    }
}
function convertReExportAll(reExported, checker) {
    // `module.exports = require("x");` ==> `export * from "x"; export { default } from "x";`
    const moduleSpecifier = reExported.text;
    const moduleSymbol = checker.getSymbolAtLocation(reExported);
    const exports = moduleSymbol ? moduleSymbol.exports : emptyMap;
    return exports.has(InternalSymbolName.ExportEquals) ? [[reExportDefault(moduleSpecifier)], true] :
        !exports.has(InternalSymbolName.Default) ? [[reExportStar(moduleSpecifier)], false] :
            // If there's some non-default export, must include both `export *` and `export default`.
            exports.size > 1 ? [[reExportStar(moduleSpecifier), reExportDefault(moduleSpecifier)], true] : [[reExportDefault(moduleSpecifier)], true];
}
function reExportStar(moduleSpecifier) {
    return makeExportDeclaration(/*exportSpecifiers*/ undefined, moduleSpecifier);
}
function reExportDefault(moduleSpecifier) {
    return makeExportDeclaration([factory.createExportSpecifier(/*isTypeOnly*/ false, /*propertyName*/ undefined, "default")], moduleSpecifier);
}
function convertExportsPropertyAssignment({ left, right, parent }, sourceFile, changes) {
    const name = left.name.text;
    if ((isFunctionExpression(right) || isArrowFunction(right) || isClassExpression(right)) && (!right.name || right.name.text === name)) {
        // `exports.f = function() {}` -> `export function f() {}` -- Replace `exports.f = ` with `export `, and insert the name after `function`.
        changes.replaceRange(sourceFile, { pos: left.getStart(sourceFile), end: right.getStart(sourceFile) }, factory.createToken(SyntaxKind.ExportKeyword), { suffix: " " });
        if (!right.name)
            changes.insertName(sourceFile, right, name);
        const semi = findChildOfKind(parent, SyntaxKind.SemicolonToken, sourceFile);
        if (semi)
            changes.delete(sourceFile, semi);
    }
    else {
        // `exports.f = function g() {}` -> `export const f = function g() {}` -- just replace `exports.` with `export const `
        changes.replaceNodeRangeWithNodes(sourceFile, left.expression, findChildOfKind(left, SyntaxKind.DotToken, sourceFile), [factory.createToken(SyntaxKind.ExportKeyword), factory.createToken(SyntaxKind.ConstKeyword)], { joiner: " ", suffix: " " });
    }
}
// TODO: GH#22492 this will cause an error if a change has been made inside the body of the node.
function convertExportsDotXEquals_replaceNode(name, exported, useSitesToUnqualify) {
    const modifiers = [factory.createToken(SyntaxKind.ExportKeyword)];
    switch (exported.kind) {
        case SyntaxKind.FunctionExpression: {
            const { name: expressionName } = exported;
            if (expressionName && expressionName.text !== name) {
                // `exports.f = function g() {}` -> `export const f = function g() {}`
                return exportConst();
            }
        }
        // falls through
        case SyntaxKind.ArrowFunction:
            // `exports.f = function() {}` --> `export function f() {}`
            return functionExpressionToDeclaration(name, modifiers, exported, useSitesToUnqualify);
        case SyntaxKind.ClassExpression:
            // `exports.C = class {}` --> `export class C {}`
            return classExpressionToDeclaration(name, modifiers, exported, useSitesToUnqualify);
        default:
            return exportConst();
    }
    function exportConst() {
        // `exports.x = 0;` --> `export const x = 0;`
        return makeConst(modifiers, factory.createIdentifier(name), replaceImportUseSites(exported, useSitesToUnqualify)); // TODO: GH#18217
    }
}
function replaceImportUseSites(nodeOrNodes, useSitesToUnqualify) {
    if (!useSitesToUnqualify || !some(arrayFrom(useSitesToUnqualify.keys()), original => rangeContainsRange(nodeOrNodes, original))) {
        return nodeOrNodes;
    }
    return isArray(nodeOrNodes)
        ? getSynthesizedDeepClonesWithReplacements(nodeOrNodes, /*includeTrivia*/ true, replaceNode)
        : getSynthesizedDeepCloneWithReplacements(nodeOrNodes, /*includeTrivia*/ true, replaceNode);
    function replaceNode(original) {
        // We are replacing `mod.SomeExport` wih `SomeExport`, so we only need to look at PropertyAccessExpressions
        if (original.kind === SyntaxKind.PropertyAccessExpression) {
            const replacement = useSitesToUnqualify.get(original);
            // Remove entry from `useSitesToUnqualify` so the refactor knows it's taken care of by the parent statement we're replacing
            useSitesToUnqualify.delete(original);
            return replacement;
        }
    }
}
/**
 * Converts `const <<name>> = require("x");`.
 * Returns nodes that will replace the variable declaration for the commonjs import.
 * May also make use `changes` to remove qualifiers at the use sites of imports, to change `mod.x` to `x`.
 */
function convertSingleImport(name, moduleSpecifier, checker, identifiers, target, quotePreference) {
    switch (name.kind) {
        case SyntaxKind.ObjectBindingPattern: {
            const importSpecifiers = mapAllOrFail(name.elements, e => e.dotDotDotToken || e.initializer || e.propertyName && !isIdentifier(e.propertyName) || !isIdentifier(e.name)
                ? undefined
                : makeImportSpecifier(e.propertyName && e.propertyName.text, e.name.text));
            if (importSpecifiers) {
                return convertedImports([makeImport(/*defaultImport*/ undefined, importSpecifiers, moduleSpecifier, quotePreference)]);
            }
        }
        // falls through -- object destructuring has an interesting pattern and must be a variable declaration
        case SyntaxKind.ArrayBindingPattern: {
            /*
            import x from "x";
            const [a, b, c] = x;
            */
            const tmp = makeUniqueName(moduleSpecifierToValidIdentifier(moduleSpecifier.text, target), identifiers);
            return convertedImports([
                makeImport(factory.createIdentifier(tmp), /*namedImports*/ undefined, moduleSpecifier, quotePreference),
                makeConst(/*modifiers*/ undefined, getSynthesizedDeepClone(name), factory.createIdentifier(tmp)),
            ]);
        }
        case SyntaxKind.Identifier:
            return convertSingleIdentifierImport(name, moduleSpecifier, checker, identifiers, quotePreference);
        default:
            return Debug.assertNever(name, `Convert to ES module got invalid name kind ${name.kind}`);
    }
}
/**
 * Convert `import x = require("x").`
 * Also:
 * - Convert `x.default()` to `x()` to handle ES6 default export
 * - Converts uses like `x.y()` to `y()` and uses a named import.
 */
function convertSingleIdentifierImport(name, moduleSpecifier, checker, identifiers, quotePreference) {
    const nameSymbol = checker.getSymbolAtLocation(name);
    // Maps from module property name to name actually used. (The same if there isn't shadowing.)
    const namedBindingsNames = new Map();
    // True if there is some non-property use like `x()` or `f(x)`.
    let needDefaultImport = false;
    let useSitesToUnqualify;
    for (const use of identifiers.original.get(name.text)) {
        if (checker.getSymbolAtLocation(use) !== nameSymbol || use === name) {
            // This was a use of a different symbol with the same name, due to shadowing. Ignore.
            continue;
        }
        const { parent } = use;
        if (isPropertyAccessExpression(parent)) {
            const { name: { text: propertyName } } = parent;
            if (propertyName === "default") {
                needDefaultImport = true;
                const importDefaultName = use.getText();
                (useSitesToUnqualify !== null && useSitesToUnqualify !== void 0 ? useSitesToUnqualify : (useSitesToUnqualify = new Map())).set(parent, factory.createIdentifier(importDefaultName));
            }
            else {
                Debug.assert(parent.expression === use, "Didn't expect expression === use"); // Else shouldn't have been in `collectIdentifiers`
                let idName = namedBindingsNames.get(propertyName);
                if (idName === undefined) {
                    idName = makeUniqueName(propertyName, identifiers);
                    namedBindingsNames.set(propertyName, idName);
                }
                (useSitesToUnqualify !== null && useSitesToUnqualify !== void 0 ? useSitesToUnqualify : (useSitesToUnqualify = new Map())).set(parent, factory.createIdentifier(idName));
            }
        }
        else {
            needDefaultImport = true;
        }
    }
    const namedBindings = namedBindingsNames.size === 0 ? undefined : arrayFrom(mapIterator(namedBindingsNames.entries(), ([propertyName, idName]) => factory.createImportSpecifier(/*isTypeOnly*/ false, propertyName === idName ? undefined : factory.createIdentifier(propertyName), factory.createIdentifier(idName))));
    if (!namedBindings) {
        // If it was unused, ensure that we at least import *something*.
        needDefaultImport = true;
    }
    return convertedImports([makeImport(needDefaultImport ? getSynthesizedDeepClone(name) : undefined, namedBindings, moduleSpecifier, quotePreference)], useSitesToUnqualify);
}
// Identifiers helpers
function makeUniqueName(name, identifiers) {
    while (identifiers.original.has(name) || identifiers.additional.has(name)) {
        name = `_${name}`;
    }
    identifiers.additional.add(name);
    return name;
}
function collectFreeIdentifiers(file) {
    const map = createMultiMap();
    forEachFreeIdentifier(file, id => map.add(id.text, id));
    return map;
}
/**
 * A free identifier is an identifier that can be accessed through name lookup as a local variable.
 * In the expression `x.y`, `x` is a free identifier, but `y` is not.
 */
function forEachFreeIdentifier(node, cb) {
    if (isIdentifier(node) && isFreeIdentifier(node))
        cb(node);
    node.forEachChild(child => forEachFreeIdentifier(child, cb));
}
function isFreeIdentifier(node) {
    const { parent } = node;
    switch (parent.kind) {
        case SyntaxKind.PropertyAccessExpression:
            return parent.name !== node;
        case SyntaxKind.BindingElement:
            return parent.propertyName !== node;
        case SyntaxKind.ImportSpecifier:
            return parent.propertyName !== node;
        default:
            return true;
    }
}
// Node helpers
function functionExpressionToDeclaration(name, additionalModifiers, fn, useSitesToUnqualify) {
    return factory.createFunctionDeclaration(concatenate(additionalModifiers, getSynthesizedDeepClones(fn.modifiers)), getSynthesizedDeepClone(fn.asteriskToken), name, getSynthesizedDeepClones(fn.typeParameters), getSynthesizedDeepClones(fn.parameters), getSynthesizedDeepClone(fn.type), factory.converters.convertToFunctionBlock(replaceImportUseSites(fn.body, useSitesToUnqualify)));
}
function classExpressionToDeclaration(name, additionalModifiers, cls, useSitesToUnqualify) {
    return factory.createClassDeclaration(concatenate(additionalModifiers, getSynthesizedDeepClones(cls.modifiers)), name, getSynthesizedDeepClones(cls.typeParameters), getSynthesizedDeepClones(cls.heritageClauses), replaceImportUseSites(cls.members, useSitesToUnqualify));
}
function makeSingleImport(localName, propertyName, moduleSpecifier, quotePreference) {
    return propertyName === "default"
        ? makeImport(factory.createIdentifier(localName), /*namedImports*/ undefined, moduleSpecifier, quotePreference)
        : makeImport(/*defaultImport*/ undefined, [makeImportSpecifier(propertyName, localName)], moduleSpecifier, quotePreference);
}
function makeImportSpecifier(propertyName, name) {
    return factory.createImportSpecifier(/*isTypeOnly*/ false, propertyName !== undefined && propertyName !== name ? factory.createIdentifier(propertyName) : undefined, factory.createIdentifier(name));
}
function makeConst(modifiers, name, init) {
    return factory.createVariableStatement(modifiers, factory.createVariableDeclarationList([factory.createVariableDeclaration(name, /*exclamationToken*/ undefined, /*type*/ undefined, init)], NodeFlags.Const));
}
function makeExportDeclaration(exportSpecifiers, moduleSpecifier) {
    return factory.createExportDeclaration(
    /*modifiers*/ undefined, 
    /*isTypeOnly*/ false, exportSpecifiers && factory.createNamedExports(exportSpecifiers), moduleSpecifier === undefined ? undefined : factory.createStringLiteral(moduleSpecifier));
}
function convertedImports(newImports, useSitesToUnqualify) {
    return {
        newImports,
        useSitesToUnqualify,
    };
}
