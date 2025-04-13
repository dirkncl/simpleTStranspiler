import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  Diagnostics,
  getTokenAtPosition,
  isIdentifier,
  isPropertyAccessExpression,
  textChanges,
} from "../namespaces/ts.js";

const fixId = "fixMissingCallParentheses";

const errorCodes = [
    Diagnostics.This_condition_will_always_return_true_since_this_function_is_always_defined_Did_you_mean_to_call_it_instead.code,
];

registerCodeFix({
    errorCodes,
    fixIds: [fixId],
    getCodeActions(context) {
        const { sourceFile, span } = context;
        const callName = getCallName(sourceFile, span.start);
        if (!callName)
            return;
        const changes = textChanges.ChangeTracker.with(context, t => doChange(t, context.sourceFile, callName));
        return [createCodeFixAction(fixId, changes, Diagnostics.Add_missing_call_parentheses, fixId, Diagnostics.Add_all_missing_call_parentheses)];
    },
    getAllCodeActions: context => codeFixAll(context, errorCodes, (changes, diag) => {
        const callName = getCallName(diag.file, diag.start);
        if (callName)
            doChange(changes, diag.file, callName);
    }),
});
function doChange(changes, sourceFile, name) {
    changes.replaceNodeWithText(sourceFile, name, `${name.text}()`);
}
function getCallName(sourceFile, start) {
    const token = getTokenAtPosition(sourceFile, start);
    if (isPropertyAccessExpression(token.parent)) {
        let current = token.parent;
        while (isPropertyAccessExpression(current.parent)) {
            current = current.parent;
        }
        return current.name;
    }
    if (isIdentifier(token)) {
        return token;
    }
    return undefined;
}
