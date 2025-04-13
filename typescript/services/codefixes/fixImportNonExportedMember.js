import {
  createCodeFixAction,
  createCombinedCodeActions,
  eachDiagnostic,
  registerCodeFix,
} from "../_namespaces/ts.codefix.js";

import {
  canHaveExportModifier,
  canHaveLocals,
  Diagnostics,
  factory,
  find,
  findAncestor,
  findLast,
  firstOrUndefined,
  getIsolatedModules,
  getTokenAtPosition,
  isExportDeclaration,
  isIdentifier,
  isImportDeclaration,
  isNamedExports,
  isSourceFileFromLibrary,
  isStringLiteral,
  isTypeDeclaration,
  isVariableDeclaration,
  isVariableStatement,
  length,
  map,
  textChanges,
  tryCast,
} from "../_namespaces/ts.js";


const fixId = "fixImportNonExportedMember";

const errorCodes = [
    Diagnostics.Module_0_declares_1_locally_but_it_is_not_exported.code,
];

registerCodeFix({
    errorCodes,
    fixIds: [fixId],
    getCodeActions(context) {
        const { sourceFile, span, program } = context;
        const info = getInfo(sourceFile, span.start, program);
        if (info === undefined)
            return undefined;
        const changes = textChanges.ChangeTracker.with(context, t => doChange(t, program, info));
        return [createCodeFixAction(fixId, changes, [Diagnostics.Export_0_from_module_1, info.exportName.node.text, info.moduleSpecifier], fixId, Diagnostics.Export_all_referenced_locals)];
    },
    getAllCodeActions(context) {
        const { program } = context;
        return createCombinedCodeActions(textChanges.ChangeTracker.with(context, changes => {
            const exports = new Map();
            eachDiagnostic(context, errorCodes, diag => {
                const info = getInfo(diag.file, diag.start, program);
                if (info === undefined)
                    return undefined;
                const { exportName, node, moduleSourceFile } = info;
                if (tryGetExportDeclaration(moduleSourceFile, exportName.isTypeOnly) === undefined && canHaveExportModifier(node)) {
                    changes.insertExportModifier(moduleSourceFile, node);
                }
                else {
                    const moduleExports = exports.get(moduleSourceFile) || { typeOnlyExports: [], exports: [] };
                    if (exportName.isTypeOnly) {
                        moduleExports.typeOnlyExports.push(exportName);
                    }
                    else {
                        moduleExports.exports.push(exportName);
                    }
                    exports.set(moduleSourceFile, moduleExports);
                }
            });
            exports.forEach((moduleExports, moduleSourceFile) => {
                const exportDeclaration = tryGetExportDeclaration(moduleSourceFile, /*isTypeOnly*/ true);
                if (exportDeclaration && exportDeclaration.isTypeOnly) {
                    doChanges(changes, program, moduleSourceFile, moduleExports.typeOnlyExports, exportDeclaration);
                    doChanges(changes, program, moduleSourceFile, moduleExports.exports, tryGetExportDeclaration(moduleSourceFile, /*isTypeOnly*/ false));
                }
                else {
                    doChanges(changes, program, moduleSourceFile, [...moduleExports.exports, ...moduleExports.typeOnlyExports], exportDeclaration);
                }
            });
        }));
    },
});
function getInfo(sourceFile, pos, program) {
    var _a, _b;
    const token = getTokenAtPosition(sourceFile, pos);
    if (isIdentifier(token)) {
        const importDeclaration = findAncestor(token, isImportDeclaration);
        if (importDeclaration === undefined)
            return undefined;
        const moduleSpecifier = isStringLiteral(importDeclaration.moduleSpecifier) ? importDeclaration.moduleSpecifier : undefined;
        if (moduleSpecifier === undefined)
            return undefined;
        const resolvedModule = (_a = program.getResolvedModuleFromModuleSpecifier(moduleSpecifier, sourceFile)) === null || _a === void 0 ? void 0 : _a.resolvedModule;
        if (resolvedModule === undefined)
            return undefined;
        const moduleSourceFile = program.getSourceFile(resolvedModule.resolvedFileName);
        if (moduleSourceFile === undefined || isSourceFileFromLibrary(program, moduleSourceFile))
            return undefined;
        const moduleSymbol = moduleSourceFile.symbol;
        const locals = (_b = tryCast(moduleSymbol.valueDeclaration, canHaveLocals)) === null || _b === void 0 ? void 0 : _b.locals;
        if (locals === undefined)
            return undefined;
        const localSymbol = locals.get(token.escapedText);
        if (localSymbol === undefined)
            return undefined;
        const node = getNodeOfSymbol(localSymbol);
        if (node === undefined)
            return undefined;
        const exportName = { node: token, isTypeOnly: isTypeDeclaration(node) };
        return { exportName, node, moduleSourceFile, moduleSpecifier: moduleSpecifier.text };
    }
    return undefined;
}
function doChange(changes, program, { exportName, node, moduleSourceFile }) {
    const exportDeclaration = tryGetExportDeclaration(moduleSourceFile, exportName.isTypeOnly);
    if (exportDeclaration) {
        updateExport(changes, program, moduleSourceFile, exportDeclaration, [exportName]);
    }
    else if (canHaveExportModifier(node)) {
        changes.insertExportModifier(moduleSourceFile, node);
    }
    else {
        createExport(changes, program, moduleSourceFile, [exportName]);
    }
}
function doChanges(changes, program, sourceFile, moduleExports, node) {
    if (length(moduleExports)) {
        if (node) {
            updateExport(changes, program, sourceFile, node, moduleExports);
        }
        else {
            createExport(changes, program, sourceFile, moduleExports);
        }
    }
}
function tryGetExportDeclaration(sourceFile, isTypeOnly) {
    const predicate = (node) => isExportDeclaration(node) && (isTypeOnly && node.isTypeOnly || !node.isTypeOnly);
    return findLast(sourceFile.statements, predicate);
}
function updateExport(changes, program, sourceFile, node, names) {
    const namedExports = node.exportClause && isNamedExports(node.exportClause) ? node.exportClause.elements : factory.createNodeArray([]);
    const allowTypeModifier = !node.isTypeOnly && !!(getIsolatedModules(program.getCompilerOptions()) || find(namedExports, e => e.isTypeOnly));
    changes.replaceNode(sourceFile, node, factory.updateExportDeclaration(node, node.modifiers, node.isTypeOnly, factory.createNamedExports(factory.createNodeArray([...namedExports, ...createExportSpecifiers(names, allowTypeModifier)], /*hasTrailingComma*/ namedExports.hasTrailingComma)), node.moduleSpecifier, node.attributes));
}
function createExport(changes, program, sourceFile, names) {
    changes.insertNodeAtEndOfScope(sourceFile, sourceFile, factory.createExportDeclaration(/*modifiers*/ undefined, /*isTypeOnly*/ false, factory.createNamedExports(createExportSpecifiers(names, /*allowTypeModifier*/ getIsolatedModules(program.getCompilerOptions()))), /*moduleSpecifier*/ undefined, /*attributes*/ undefined));
}
function createExportSpecifiers(names, allowTypeModifier) {
    return factory.createNodeArray(map(names, n => factory.createExportSpecifier(allowTypeModifier && n.isTypeOnly, /*propertyName*/ undefined, n.node)));
}
function getNodeOfSymbol(symbol) {
    if (symbol.valueDeclaration === undefined) {
        return firstOrUndefined(symbol.declarations);
    }
    const declaration = symbol.valueDeclaration;
    const variableStatement = isVariableDeclaration(declaration) ? tryCast(declaration.parent.parent, isVariableStatement) : undefined;
    return variableStatement && length(variableStatement.declarationList.declarations) === 1 ? variableStatement : declaration;
}
