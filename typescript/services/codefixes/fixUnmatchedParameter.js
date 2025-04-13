import {
  createCodeFixAction,
  createCodeFixActionWithoutFixAll,
  createCombinedCodeActions,
  eachDiagnostic,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  append,
  Diagnostics,
  factory,
  firstDefined,
  getHostSignatureFromJSDoc,
  getJSDocHost,
  getJSDocTags,
  getTokenAtPosition,
  isIdentifier,
  isJSDocParameterTag,
  length,
  map,
  textChanges,
} from "../namespaces/ts.js";


const deleteUnmatchedParameter = "deleteUnmatchedParameter";
const renameUnmatchedParameter = "renameUnmatchedParameter";
const errorCodes = [
    Diagnostics.JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name.code,
];
registerCodeFix({
    fixIds: [deleteUnmatchedParameter, renameUnmatchedParameter],
    errorCodes,
    getCodeActions: function getCodeActionsToFixUnmatchedParameter(context) {
        const { sourceFile, span } = context;
        const actions = [];
        const info = getInfo(sourceFile, span.start);
        if (info) {
            append(actions, getDeleteAction(context, info));
            append(actions, getRenameAction(context, info));
            return actions;
        }
        return undefined;
    },
    getAllCodeActions: function getAllCodeActionsToFixUnmatchedParameter(context) {
        const tagsToSignature = new Map();
        return createCombinedCodeActions(textChanges.ChangeTracker.with(context, changes => {
            eachDiagnostic(context, errorCodes, ({ file, start }) => {
                const info = getInfo(file, start);
                if (info) {
                    tagsToSignature.set(info.signature, append(tagsToSignature.get(info.signature), info.jsDocParameterTag));
                }
            });
            tagsToSignature.forEach((tags, signature) => {
                if (context.fixId === deleteUnmatchedParameter) {
                    const tagsSet = new Set(tags);
                    changes.filterJSDocTags(signature.getSourceFile(), signature, t => !tagsSet.has(t));
                }
            });
        }));
    },
});
function getDeleteAction(context, { name, jsDocHost, jsDocParameterTag }) {
    const changes = textChanges.ChangeTracker.with(context, changeTracker => changeTracker.filterJSDocTags(context.sourceFile, jsDocHost, t => t !== jsDocParameterTag));
    return createCodeFixAction(deleteUnmatchedParameter, changes, [Diagnostics.Delete_unused_param_tag_0, name.getText(context.sourceFile)], deleteUnmatchedParameter, Diagnostics.Delete_all_unused_param_tags);
}
function getRenameAction(context, { name, jsDocHost, signature, jsDocParameterTag }) {
    if (!length(signature.parameters))
        return undefined;
    const sourceFile = context.sourceFile;
    const tags = getJSDocTags(signature);
    const names = new Set();
    for (const tag of tags) {
        if (isJSDocParameterTag(tag) && isIdentifier(tag.name)) {
            names.add(tag.name.escapedText);
        }
    }
    // @todo - match to all available names instead to the first parameter name
    // @see /codeFixRenameUnmatchedParameter3.ts
    const parameterName = firstDefined(signature.parameters, p => isIdentifier(p.name) && !names.has(p.name.escapedText) ? p.name.getText(sourceFile) : undefined);
    if (parameterName === undefined)
        return undefined;
    const newJSDocParameterTag = factory.updateJSDocParameterTag(jsDocParameterTag, jsDocParameterTag.tagName, factory.createIdentifier(parameterName), jsDocParameterTag.isBracketed, jsDocParameterTag.typeExpression, jsDocParameterTag.isNameFirst, jsDocParameterTag.comment);
    const changes = textChanges.ChangeTracker.with(context, changeTracker => changeTracker.replaceJSDocComment(sourceFile, jsDocHost, map(tags, t => t === jsDocParameterTag ? newJSDocParameterTag : t)));
    return createCodeFixActionWithoutFixAll(renameUnmatchedParameter, changes, [Diagnostics.Rename_param_tag_name_0_to_1, name.getText(sourceFile), parameterName]);
}
function getInfo(sourceFile, pos) {
    const token = getTokenAtPosition(sourceFile, pos);
    if (token.parent && isJSDocParameterTag(token.parent) && isIdentifier(token.parent.name)) {
        const jsDocParameterTag = token.parent;
        const jsDocHost = getJSDocHost(jsDocParameterTag);
        const signature = getHostSignatureFromJSDoc(jsDocParameterTag);
        if (jsDocHost && signature) {
            return { jsDocHost, signature, name: token.parent.name, jsDocParameterTag };
        }
    }
    return undefined;
}
