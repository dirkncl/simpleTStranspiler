import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  Debug,
  Diagnostics,
  factory,
  findAncestor,
  getTokenAtPosition,
  isIdentifier,
  isQualifiedName,
  textChanges,
} from "../namespaces/ts.js";


const fixId = "correctQualifiedNameToIndexedAccessType";

const errorCodes = [Diagnostics.Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_property_1_in_0_with_0_1.code];

registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const qualifiedName = getQualifiedName(context.sourceFile, context.span.start);
        if (!qualifiedName)
            return undefined;
        const changes = textChanges.ChangeTracker.with(context, t => doChange(t, context.sourceFile, qualifiedName));
        const newText = `${qualifiedName.left.text}["${qualifiedName.right.text}"]`;
        return [createCodeFixAction(fixId, changes, [Diagnostics.Rewrite_as_the_indexed_access_type_0, newText], fixId, Diagnostics.Rewrite_all_as_indexed_access_types)];
    },
    fixIds: [fixId],
    getAllCodeActions: context => codeFixAll(context, errorCodes, (changes, diag) => {
        const q = getQualifiedName(diag.file, diag.start);
        if (q) {
            doChange(changes, diag.file, q);
        }
    }),
});
function getQualifiedName(sourceFile, pos) {
    const qualifiedName = findAncestor(getTokenAtPosition(sourceFile, pos), isQualifiedName);
    Debug.assert(!!qualifiedName, "Expected position to be owned by a qualified name.");
    return isIdentifier(qualifiedName.left) ? qualifiedName : undefined;
}
function doChange(changeTracker, sourceFile, qualifiedName) {
    const rightText = qualifiedName.right.text;
    const replacement = factory.createIndexedAccessTypeNode(factory.createTypeReferenceNode(qualifiedName.left, /*typeArguments*/ undefined), factory.createLiteralTypeNode(factory.createStringLiteral(rightText)));
    changeTracker.replaceNode(sourceFile, qualifiedName, replacement);
}
