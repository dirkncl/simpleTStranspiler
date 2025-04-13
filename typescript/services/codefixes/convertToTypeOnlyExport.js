import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  addToSeen,
  contains,
  createTextSpanFromNode,
  Diagnostics,
  factory,
  filter,
  findDiagnosticForNode,
  getDiagnosticsWithinSpan,
  getNodeId,
  getTokenAtPosition,
  isExportSpecifier,
  SyntaxKind,
  textChanges,
  tryCast,
} from "../namespaces/ts.js";


const errorCodes = [Diagnostics.Re_exporting_a_type_when_0_is_enabled_requires_using_export_type.code];

const fixId = "convertToTypeOnlyExport";

registerCodeFix({
    errorCodes,
    getCodeActions: function getCodeActionsToConvertToTypeOnlyExport(context) {
        const changes = textChanges.ChangeTracker.with(context, t => fixSingleExportDeclaration(t, getExportSpecifierForDiagnosticSpan(context.span, context.sourceFile), context));
        if (changes.length) {
            return [createCodeFixAction(fixId, changes, Diagnostics.Convert_to_type_only_export, fixId, Diagnostics.Convert_all_re_exported_types_to_type_only_exports)];
        }
    },
    fixIds: [fixId],
    getAllCodeActions: function getAllCodeActionsToConvertToTypeOnlyExport(context) {
        const fixedExportDeclarations = new Set();
        return codeFixAll(context, errorCodes, (changes, diag) => {
            const exportSpecifier = getExportSpecifierForDiagnosticSpan(diag, context.sourceFile);
            if (exportSpecifier && addToSeen(fixedExportDeclarations, getNodeId(exportSpecifier.parent.parent))) {
                fixSingleExportDeclaration(changes, exportSpecifier, context);
            }
        });
    },
});

function getExportSpecifierForDiagnosticSpan(span, sourceFile) {
    return tryCast(getTokenAtPosition(sourceFile, span.start).parent, isExportSpecifier);
}

function fixSingleExportDeclaration(changes, exportSpecifier, context) {
    if (!exportSpecifier) {
        return;
    }
    const exportClause = exportSpecifier.parent;
    const exportDeclaration = exportClause.parent;
    const typeExportSpecifiers = getTypeExportSpecifiers(exportSpecifier, context);
    if (typeExportSpecifiers.length === exportClause.elements.length) {
        changes.insertModifierBefore(context.sourceFile, SyntaxKind.TypeKeyword, exportClause);
    }
    else {
        const valueExportDeclaration = factory.updateExportDeclaration(exportDeclaration, exportDeclaration.modifiers, 
        /*isTypeOnly*/ false, factory.updateNamedExports(exportClause, filter(exportClause.elements, e => !contains(typeExportSpecifiers, e))), exportDeclaration.moduleSpecifier, 
        /*attributes*/ undefined);
        const typeExportDeclaration = factory.createExportDeclaration(
        /*modifiers*/ undefined, 
        /*isTypeOnly*/ true, factory.createNamedExports(typeExportSpecifiers), exportDeclaration.moduleSpecifier, 
        /*attributes*/ undefined);
        changes.replaceNode(context.sourceFile, exportDeclaration, valueExportDeclaration, {
            leadingTriviaOption: textChanges.LeadingTriviaOption.IncludeAll,
            trailingTriviaOption: textChanges.TrailingTriviaOption.Exclude,
        });
        changes.insertNodeAfter(context.sourceFile, exportDeclaration, typeExportDeclaration);
    }
}

function getTypeExportSpecifiers(originExportSpecifier, context) {
    const exportClause = originExportSpecifier.parent;
    if (exportClause.elements.length === 1) {
        return exportClause.elements;
    }
    const diagnostics = getDiagnosticsWithinSpan(createTextSpanFromNode(exportClause), context.program.getSemanticDiagnostics(context.sourceFile, context.cancellationToken));
    return filter(exportClause.elements, element => {
        var _a;
        return element === originExportSpecifier || ((_a = findDiagnosticForNode(element, diagnostics)) === null || _a === void 0 ? void 0 : _a.code) === errorCodes[0];
    });
}
