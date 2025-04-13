import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  Debug,
  Diagnostics,
  emptyArray,
  factory,
  getTokenAtPosition,
  isConstructorDeclaration,
  textChanges,
} from "../namespaces/ts.js";

const fixId = "constructorForDerivedNeedSuperCall";
const errorCodes = [Diagnostics.Constructors_for_derived_classes_must_contain_a_super_call.code];

registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { sourceFile, span } = context;
        const ctr = getNode(sourceFile, span.start);
        const changes = textChanges.ChangeTracker.with(context, t => doChange(t, sourceFile, ctr));
        return [createCodeFixAction(fixId, changes, Diagnostics.Add_missing_super_call, fixId, Diagnostics.Add_all_missing_super_calls)];
    },
    fixIds: [fixId],
    getAllCodeActions: context => codeFixAll(context, errorCodes, (changes, diag) => doChange(changes, context.sourceFile, getNode(diag.file, diag.start))),
});
function getNode(sourceFile, pos) {
    const token = getTokenAtPosition(sourceFile, pos);
    Debug.assert(isConstructorDeclaration(token.parent), "token should be at the constructor declaration");
    return token.parent;
}
function doChange(changes, sourceFile, ctr) {
    const superCall = factory.createExpressionStatement(factory.createCallExpression(factory.createSuper(), /*typeArguments*/ undefined, /*argumentsArray*/ emptyArray));
    changes.insertNodeAtConstructorStart(sourceFile, ctr, superCall);
}
