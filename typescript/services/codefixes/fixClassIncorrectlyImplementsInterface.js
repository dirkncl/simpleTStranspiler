import {
  codeFixAll,
  createCodeFixAction,
  createImportAdder,
  createMissingMemberNodes,
  getNoopSymbolTrackerWithResolver,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  addToSeen,
  and,
  createSymbolTable,
  Debug,
  Diagnostics,
  find,
  getContainingClass,
  getEffectiveBaseTypeNode,
  getEffectiveImplementsTypeNodes,
  getEffectiveModifierFlags,
  getNodeId,
  getTokenAtPosition,
  IndexKind,
  isConstructorDeclaration,
  mapDefined,
  ModifierFlags,
  textChanges,
} from "../namespaces/ts.js";


const errorCodes = [
    Diagnostics.Class_0_incorrectly_implements_interface_1.code,
    Diagnostics.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass.code,
];

const fixId = "fixClassIncorrectlyImplementsInterface"; // TODO: share a group with fixClassDoesntImplementInheritedAbstractMember?

registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { sourceFile, span } = context;
        const classDeclaration = getClass(sourceFile, span.start);
        return mapDefined(getEffectiveImplementsTypeNodes(classDeclaration), implementedTypeNode => {
            const changes = textChanges.ChangeTracker.with(context, t => addMissingDeclarations(context, implementedTypeNode, sourceFile, classDeclaration, t, context.preferences));
            return changes.length === 0 ? undefined : createCodeFixAction(fixId, changes, [Diagnostics.Implement_interface_0, implementedTypeNode.getText(sourceFile)], fixId, Diagnostics.Implement_all_unimplemented_interfaces);
        });
    },
    fixIds: [fixId],
    getAllCodeActions(context) {
        const seenClassDeclarations = new Set();
        return codeFixAll(context, errorCodes, (changes, diag) => {
            const classDeclaration = getClass(diag.file, diag.start);
            if (addToSeen(seenClassDeclarations, getNodeId(classDeclaration))) {
                for (const implementedTypeNode of getEffectiveImplementsTypeNodes(classDeclaration)) {
                    addMissingDeclarations(context, implementedTypeNode, diag.file, classDeclaration, changes, context.preferences);
                }
            }
        });
    },
});
function getClass(sourceFile, pos) {
    return Debug.checkDefined(getContainingClass(getTokenAtPosition(sourceFile, pos)), "There should be a containing class");
}
function symbolPointsToNonPrivateMember(symbol) {
    return !symbol.valueDeclaration || !(getEffectiveModifierFlags(symbol.valueDeclaration) & ModifierFlags.Private);
}
function addMissingDeclarations(context, implementedTypeNode, sourceFile, classDeclaration, changeTracker, preferences) {
    const checker = context.program.getTypeChecker();
    const maybeHeritageClauseSymbol = getHeritageClauseSymbolTable(classDeclaration, checker);
    // Note that this is ultimately derived from a map indexed by symbol names,
    // so duplicates cannot occur.
    const implementedType = checker.getTypeAtLocation(implementedTypeNode);
    const implementedTypeSymbols = checker.getPropertiesOfType(implementedType);
    const nonPrivateAndNotExistedInHeritageClauseMembers = implementedTypeSymbols.filter(and(symbolPointsToNonPrivateMember, symbol => !maybeHeritageClauseSymbol.has(symbol.escapedName)));
    const classType = checker.getTypeAtLocation(classDeclaration);
    const constructor = find(classDeclaration.members, m => isConstructorDeclaration(m));
    if (!classType.getNumberIndexType()) {
        createMissingIndexSignatureDeclaration(implementedType, IndexKind.Number);
    }
    if (!classType.getStringIndexType()) {
        createMissingIndexSignatureDeclaration(implementedType, IndexKind.String);
    }
    const importAdder = createImportAdder(sourceFile, context.program, preferences, context.host);
    createMissingMemberNodes(classDeclaration, nonPrivateAndNotExistedInHeritageClauseMembers, sourceFile, context, preferences, importAdder, member => insertInterfaceMemberNode(sourceFile, classDeclaration, member));
    importAdder.writeFixes(changeTracker);
    function createMissingIndexSignatureDeclaration(type, kind) {
        const indexInfoOfKind = checker.getIndexInfoOfType(type, kind);
        if (indexInfoOfKind) {
            insertInterfaceMemberNode(sourceFile, classDeclaration, checker.indexInfoToIndexSignatureDeclaration(indexInfoOfKind, classDeclaration, /*flags*/ undefined, /*internalFlags*/ undefined, getNoopSymbolTrackerWithResolver(context)));
        }
    }
    // Either adds the node at the top of the class, or if there's a constructor right after that
    function insertInterfaceMemberNode(sourceFile, cls, newElement) {
        if (constructor) {
            changeTracker.insertNodeAfter(sourceFile, constructor, newElement);
        }
        else {
            changeTracker.insertMemberAtStart(sourceFile, cls, newElement);
        }
    }
}
function getHeritageClauseSymbolTable(classDeclaration, checker) {
    const heritageClauseNode = getEffectiveBaseTypeNode(classDeclaration);
    if (!heritageClauseNode)
        return createSymbolTable();
    const heritageClauseType = checker.getTypeAtLocation(heritageClauseNode);
    const heritageClauseTypeSymbols = checker.getPropertiesOfType(heritageClauseType);
    return createSymbolTable(heritageClauseTypeSymbols.filter(symbolPointsToNonPrivateMember));
}
