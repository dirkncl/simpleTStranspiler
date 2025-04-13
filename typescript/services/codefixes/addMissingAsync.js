import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  createTextSpanFromNode,
  Diagnostics,
  factory,
  find,
  findAncestor,
  getNodeId,
  getSyntacticModifierFlags,
  getSynthesizedDeepClone,
  getTokenAtPosition,
  isArrowFunction,
  isFunctionDeclaration,
  isFunctionExpression,
  isMethodDeclaration,
  isNumber,
  ModifierFlags,
  some,
  textChanges,
  textSpanEnd,
  textSpansEqual,
} from "../namespaces/ts.js";

const fixId = "addMissingAsync";

const errorCodes = [
    Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
    Diagnostics.Type_0_is_not_assignable_to_type_1.code,
    Diagnostics.Type_0_is_not_comparable_to_type_1.code,
];

registerCodeFix({
    fixIds: [fixId],
    errorCodes,
    getCodeActions: function getCodeActionsToAddMissingAsync(context) {
        const { sourceFile, errorCode, cancellationToken, program, span } = context;
        const diagnostic = find(program.getTypeChecker().getDiagnostics(sourceFile, cancellationToken), getIsMatchingAsyncError(span, errorCode));
        const directSpan = diagnostic && diagnostic.relatedInformation && find(diagnostic.relatedInformation, r => r.code === Diagnostics.Did_you_mean_to_mark_this_function_as_async.code);
        const decl = getFixableErrorSpanDeclaration(sourceFile, directSpan);
        if (!decl) {
            return;
        }
        const trackChanges = cb => textChanges.ChangeTracker.with(context, cb);
        return [getFix(context, decl, trackChanges)];
    },
    getAllCodeActions: context => {
        const { sourceFile } = context;
        const fixedDeclarations = new Set();
        return codeFixAll(context, errorCodes, (t, diagnostic) => {
            const span = diagnostic.relatedInformation && find(diagnostic.relatedInformation, r => r.code === Diagnostics.Did_you_mean_to_mark_this_function_as_async.code);
            const decl = getFixableErrorSpanDeclaration(sourceFile, span);
            if (!decl) {
                return;
            }
            const trackChanges = cb => (cb(t), []);
            return getFix(context, decl, trackChanges, fixedDeclarations);
        });
    },
});

function getFix(context, decl, trackChanges, fixedDeclarations) {
    const changes = trackChanges(t => makeChange(t, context.sourceFile, decl, fixedDeclarations));
    return createCodeFixAction(fixId, changes, Diagnostics.Add_async_modifier_to_containing_function, fixId, Diagnostics.Add_all_missing_async_modifiers);
}

function makeChange(changeTracker, sourceFile, insertionSite, fixedDeclarations) {
    if (fixedDeclarations) {
        if (fixedDeclarations.has(getNodeId(insertionSite))) {
            return;
        }
    }
    fixedDeclarations === null || fixedDeclarations === void 0 ? void 0 : fixedDeclarations.add(getNodeId(insertionSite));
    const cloneWithModifier = factory.replaceModifiers(getSynthesizedDeepClone(insertionSite, /*includeTrivia*/ true), factory.createNodeArray(factory.createModifiersFromModifierFlags(getSyntacticModifierFlags(insertionSite) | ModifierFlags.Async)));
    changeTracker.replaceNode(sourceFile, insertionSite, cloneWithModifier);
}

function getFixableErrorSpanDeclaration(sourceFile, span) {
    if (!span)
        return undefined;
    const token = getTokenAtPosition(sourceFile, span.start);
    // Checker has already done work to determine that async might be possible, and has attached
    // related info to the node, so start by finding the signature that exactly matches up
    // with the diagnostic range.
    const decl = findAncestor(token, node => {
        if (node.getStart(sourceFile) < span.start || node.getEnd() > textSpanEnd(span)) {
            return "quit";
        }
        return (isArrowFunction(node) || isMethodDeclaration(node) || isFunctionExpression(node) || isFunctionDeclaration(node)) && textSpansEqual(span, createTextSpanFromNode(node, sourceFile));
    });
    return decl;
}

function getIsMatchingAsyncError(span, errorCode) {
    return ({ start, length, relatedInformation, code }) => isNumber(start) && isNumber(length) && textSpansEqual({ start, length }, span) &&
        code === errorCode &&
        !!relatedInformation &&
        some(relatedInformation, related => related.code === Diagnostics.Did_you_mean_to_mark_this_function_as_async.code);
}
