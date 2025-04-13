import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../_namespaces/ts.codefix.js";

import {
  Diagnostics,
  getQuotePreference,
  getTokenAtPosition,
  isExternalModuleReference,
  isIdentifier,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isNamespaceImport,
  makeImport,
  textChanges,
} from "../_namespaces/ts.js";


const fixId = "useDefaultImport";
const errorCodes = [Diagnostics.Import_may_be_converted_to_a_default_import.code];

registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { sourceFile, span: { start } } = context;
        const info = getInfo(sourceFile, start);
        if (!info)
            return undefined;
        const changes = textChanges.ChangeTracker.with(context, t => doChange(t, sourceFile, info, context.preferences));
        return [createCodeFixAction(fixId, changes, Diagnostics.Convert_to_default_import, fixId, Diagnostics.Convert_all_to_default_imports)];
    },
    fixIds: [fixId],
    getAllCodeActions: context => codeFixAll(context, errorCodes, (changes, diag) => {
        const info = getInfo(diag.file, diag.start);
        if (info)
            doChange(changes, diag.file, info, context.preferences);
    }),
});
function getInfo(sourceFile, pos) {
    const name = getTokenAtPosition(sourceFile, pos);
    if (!isIdentifier(name))
        return undefined; // bad input
    const { parent } = name;
    if (isImportEqualsDeclaration(parent) && isExternalModuleReference(parent.moduleReference)) {
        return { importNode: parent, name, moduleSpecifier: parent.moduleReference.expression };
    }
    else if (isNamespaceImport(parent) && isImportDeclaration(parent.parent.parent)) {
        const importNode = parent.parent.parent;
        return { importNode, name, moduleSpecifier: importNode.moduleSpecifier };
    }
}
function doChange(changes, sourceFile, info, preferences) {
    changes.replaceNode(sourceFile, info.importNode, makeImport(info.name, /*namedImports*/ undefined, info.moduleSpecifier, getQuotePreference(sourceFile, preferences)));
}
