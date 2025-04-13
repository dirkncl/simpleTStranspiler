import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  cast,
  Debug,
  Diagnostics,
  factory,
  FindAllReferences,
  first,
  forEach,
  getJSDocParameterTags,
  getNewLineOrDefaultFromHost,
  getPrecedingNonSpaceCharacterPosition,
  getTokenAtPosition,
  isArrayBindingPattern,
  isBinaryExpression,
  isCallExpression,
  isCallLikeExpression,
  isComputedPropertyName,
  isDeclarationWithTypeParameterChildren,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isImportClause,
  isImportDeclaration,
  isInferTypeNode,
  isJSDocTemplateTag,
  isMethodDeclaration,
  isMethodSignature,
  isModifier,
  isObjectBindingPattern,
  isParameter,
  isPostfixUnaryExpression,
  isPrefixUnaryExpression,
  isPropertyAccessExpression,
  isSuperKeyword,
  isVariableDeclaration,
  isVariableDeclarationList,
  length,
  map,
  probablyUsesSemicolons,
  showModuleSpecifier,
  SyntaxKind,
  textChanges,
  tryCast,
} from "../namespaces/ts.js";


const fixName = "unusedIdentifier";
const fixIdPrefix = "unusedIdentifier_prefix";
const fixIdDelete = "unusedIdentifier_delete";
const fixIdDeleteImports = "unusedIdentifier_deleteImports";
const fixIdInfer = "unusedIdentifier_infer";

const errorCodes = [
    Diagnostics._0_is_declared_but_its_value_is_never_read.code,
    Diagnostics._0_is_declared_but_never_used.code,
    Diagnostics.Property_0_is_declared_but_its_value_is_never_read.code,
    Diagnostics.All_imports_in_import_declaration_are_unused.code,
    Diagnostics.All_destructured_elements_are_unused.code,
    Diagnostics.All_variables_are_unused.code,
    Diagnostics.All_type_parameters_are_unused.code,
];
registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { errorCode, sourceFile, program, cancellationToken } = context;
        const checker = program.getTypeChecker();
        const sourceFiles = program.getSourceFiles();
        const token = getTokenAtPosition(sourceFile, context.span.start);
        if (isJSDocTemplateTag(token)) {
            return [createDeleteFix(textChanges.ChangeTracker.with(context, t => t.delete(sourceFile, token)), Diagnostics.Remove_template_tag)];
        }
        if (token.kind === SyntaxKind.LessThanToken) {
            const changes = textChanges.ChangeTracker.with(context, t => deleteTypeParameters(t, sourceFile, token));
            return [createDeleteFix(changes, Diagnostics.Remove_type_parameters)];
        }
        const importDecl = tryGetFullImport(token);
        if (importDecl) {
            const changes = textChanges.ChangeTracker.with(context, t => t.delete(sourceFile, importDecl));
            return [createCodeFixAction(fixName, changes, [Diagnostics.Remove_import_from_0, showModuleSpecifier(importDecl)], fixIdDeleteImports, Diagnostics.Delete_all_unused_imports)];
        }
        else if (isImport(token)) {
            const deletion = textChanges.ChangeTracker.with(context, t => tryDeleteDeclaration(sourceFile, token, t, checker, sourceFiles, program, cancellationToken, /*isFixAll*/ false));
            if (deletion.length) {
                return [createCodeFixAction(fixName, deletion, [Diagnostics.Remove_unused_declaration_for_Colon_0, token.getText(sourceFile)], fixIdDeleteImports, Diagnostics.Delete_all_unused_imports)];
            }
        }
        if (isObjectBindingPattern(token.parent) || isArrayBindingPattern(token.parent)) {
            if (isParameter(token.parent.parent)) {
                const elements = token.parent.elements;
                const diagnostic = [
                    elements.length > 1 ? Diagnostics.Remove_unused_declarations_for_Colon_0 : Diagnostics.Remove_unused_declaration_for_Colon_0,
                    map(elements, e => e.getText(sourceFile)).join(", "),
                ];
                return [
                    createDeleteFix(textChanges.ChangeTracker.with(context, t => deleteDestructuringElements(t, sourceFile, token.parent)), diagnostic),
                ];
            }
            return [
                createDeleteFix(textChanges.ChangeTracker.with(context, t => deleteDestructuring(context, t, sourceFile, token.parent)), Diagnostics.Remove_unused_destructuring_declaration),
            ];
        }
        if (canDeleteEntireVariableStatement(sourceFile, token)) {
            return [
                createDeleteFix(textChanges.ChangeTracker.with(context, t => deleteEntireVariableStatement(t, sourceFile, token.parent)), Diagnostics.Remove_variable_statement),
            ];
        }
        if (isIdentifier(token) && isFunctionDeclaration(token.parent)) {
            return [createDeleteFix(textChanges.ChangeTracker.with(context, t => deleteFunctionLikeDeclaration(t, sourceFile, token.parent)), [Diagnostics.Remove_unused_declaration_for_Colon_0, token.getText(sourceFile)])];
        }
        const result = [];
        if (token.kind === SyntaxKind.InferKeyword) {
            const changes = textChanges.ChangeTracker.with(context, t => changeInferToUnknown(t, sourceFile, token));
            const name = cast(token.parent, isInferTypeNode).typeParameter.name.text;
            result.push(createCodeFixAction(fixName, changes, [Diagnostics.Replace_infer_0_with_unknown, name], fixIdInfer, Diagnostics.Replace_all_unused_infer_with_unknown));
        }
        else {
            const deletion = textChanges.ChangeTracker.with(context, t => tryDeleteDeclaration(sourceFile, token, t, checker, sourceFiles, program, cancellationToken, /*isFixAll*/ false));
            if (deletion.length) {
                const name = isComputedPropertyName(token.parent) ? token.parent : token;
                result.push(createDeleteFix(deletion, [Diagnostics.Remove_unused_declaration_for_Colon_0, name.getText(sourceFile)]));
            }
        }
        const prefix = textChanges.ChangeTracker.with(context, t => tryPrefixDeclaration(t, errorCode, sourceFile, token));
        if (prefix.length) {
            result.push(createCodeFixAction(fixName, prefix, [Diagnostics.Prefix_0_with_an_underscore, token.getText(sourceFile)], fixIdPrefix, Diagnostics.Prefix_all_unused_declarations_with_where_possible));
        }
        return result;
    },
    fixIds: [fixIdPrefix, fixIdDelete, fixIdDeleteImports, fixIdInfer],
    getAllCodeActions: context => {
        const { sourceFile, program, cancellationToken } = context;
        const checker = program.getTypeChecker();
        const sourceFiles = program.getSourceFiles();
        return codeFixAll(context, errorCodes, (changes, diag) => {
            const token = getTokenAtPosition(sourceFile, diag.start);
            switch (context.fixId) {
                case fixIdPrefix:
                    tryPrefixDeclaration(changes, diag.code, sourceFile, token);
                    break;
                case fixIdDeleteImports: {
                    const importDecl = tryGetFullImport(token);
                    if (importDecl) {
                        changes.delete(sourceFile, importDecl);
                    }
                    else if (isImport(token)) {
                        tryDeleteDeclaration(sourceFile, token, changes, checker, sourceFiles, program, cancellationToken, /*isFixAll*/ true);
                    }
                    break;
                }
                case fixIdDelete: {
                    if (token.kind === SyntaxKind.InferKeyword || isImport(token)) {
                        break; // Can't delete
                    }
                    else if (isJSDocTemplateTag(token)) {
                        changes.delete(sourceFile, token);
                    }
                    else if (token.kind === SyntaxKind.LessThanToken) {
                        deleteTypeParameters(changes, sourceFile, token);
                    }
                    else if (isObjectBindingPattern(token.parent)) {
                        if (token.parent.parent.initializer) {
                            break;
                        }
                        else if (!isParameter(token.parent.parent) || isNotProvidedArguments(token.parent.parent, checker, sourceFiles)) {
                            changes.delete(sourceFile, token.parent.parent);
                        }
                    }
                    else if (isArrayBindingPattern(token.parent.parent) && token.parent.parent.parent.initializer) {
                        break;
                    }
                    else if (canDeleteEntireVariableStatement(sourceFile, token)) {
                        deleteEntireVariableStatement(changes, sourceFile, token.parent);
                    }
                    else if (isIdentifier(token) && isFunctionDeclaration(token.parent)) {
                        deleteFunctionLikeDeclaration(changes, sourceFile, token.parent);
                    }
                    else {
                        tryDeleteDeclaration(sourceFile, token, changes, checker, sourceFiles, program, cancellationToken, /*isFixAll*/ true);
                    }
                    break;
                }
                case fixIdInfer:
                    if (token.kind === SyntaxKind.InferKeyword) {
                        changeInferToUnknown(changes, sourceFile, token);
                    }
                    break;
                default:
                    Debug.fail(JSON.stringify(context.fixId));
            }
        });
    },
});
function changeInferToUnknown(changes, sourceFile, token) {
    changes.replaceNode(sourceFile, token.parent, factory.createKeywordTypeNode(SyntaxKind.UnknownKeyword));
}
function createDeleteFix(changes, diag) {
    return createCodeFixAction(fixName, changes, diag, fixIdDelete, Diagnostics.Delete_all_unused_declarations);
}
function deleteTypeParameters(changes, sourceFile, token) {
    changes.delete(sourceFile, Debug.checkDefined(cast(token.parent, isDeclarationWithTypeParameterChildren).typeParameters, "The type parameter to delete should exist"));
}
function isImport(token) {
    return token.kind === SyntaxKind.ImportKeyword
        || token.kind === SyntaxKind.Identifier && (token.parent.kind === SyntaxKind.ImportSpecifier || token.parent.kind === SyntaxKind.ImportClause);
}
/** Sometimes the diagnostic span is an entire ImportDeclaration, so we should remove the whole thing. */
function tryGetFullImport(token) {
    return token.kind === SyntaxKind.ImportKeyword ? tryCast(token.parent, isImportDeclaration) : undefined;
}
function canDeleteEntireVariableStatement(sourceFile, token) {
    return isVariableDeclarationList(token.parent) && first(token.parent.getChildren(sourceFile)) === token;
}
function deleteEntireVariableStatement(changes, sourceFile, node) {
    changes.delete(sourceFile, node.parent.kind === SyntaxKind.VariableStatement ? node.parent : node);
}
function deleteDestructuringElements(changes, sourceFile, node) {
    forEach(node.elements, n => changes.delete(sourceFile, n));
}
function deleteDestructuring(context, changes, sourceFile, { parent }) {
    if (isVariableDeclaration(parent) && parent.initializer && isCallLikeExpression(parent.initializer)) {
        if (isVariableDeclarationList(parent.parent) && length(parent.parent.declarations) > 1) {
            const varStatement = parent.parent.parent;
            const pos = varStatement.getStart(sourceFile);
            const end = varStatement.end;
            changes.delete(sourceFile, parent);
            changes.insertNodeAt(sourceFile, end, parent.initializer, {
                prefix: getNewLineOrDefaultFromHost(context.host, context.formatContext.options) + sourceFile.text.slice(getPrecedingNonSpaceCharacterPosition(sourceFile.text, pos - 1), pos),
                suffix: probablyUsesSemicolons(sourceFile) ? ";" : "",
            });
        }
        else {
            changes.replaceNode(sourceFile, parent.parent, parent.initializer);
        }
    }
    else {
        changes.delete(sourceFile, parent);
    }
}
function tryPrefixDeclaration(changes, errorCode, sourceFile, token) {
    // Don't offer to prefix a property.
    if (errorCode === Diagnostics.Property_0_is_declared_but_its_value_is_never_read.code)
        return;
    if (token.kind === SyntaxKind.InferKeyword) {
        token = cast(token.parent, isInferTypeNode).typeParameter.name;
    }
    if (isIdentifier(token) && canPrefix(token)) {
        changes.replaceNode(sourceFile, token, factory.createIdentifier(`_${token.text}`));
        if (isParameter(token.parent)) {
            getJSDocParameterTags(token.parent).forEach(tag => {
                if (isIdentifier(tag.name)) {
                    changes.replaceNode(sourceFile, tag.name, factory.createIdentifier(`_${tag.name.text}`));
                }
            });
        }
    }
}
function canPrefix(token) {
    switch (token.parent.kind) {
        case SyntaxKind.Parameter:
        case SyntaxKind.TypeParameter:
            return true;
        case SyntaxKind.VariableDeclaration: {
            const varDecl = token.parent;
            switch (varDecl.parent.parent.kind) {
                case SyntaxKind.ForOfStatement:
                case SyntaxKind.ForInStatement:
                    return true;
            }
        }
    }
    return false;
}
function tryDeleteDeclaration(sourceFile, token, changes, checker, sourceFiles, program, cancellationToken, isFixAll) {
    tryDeleteDeclarationWorker(token, changes, sourceFile, checker, sourceFiles, program, cancellationToken, isFixAll);
    if (isIdentifier(token)) {
        FindAllReferences.Core.eachSymbolReferenceInFile(token, checker, sourceFile, (ref) => {
            if (isPropertyAccessExpression(ref.parent) && ref.parent.name === ref)
                ref = ref.parent;
            if (!isFixAll && mayDeleteExpression(ref)) {
                changes.delete(sourceFile, ref.parent.parent);
            }
        });
    }
}
function tryDeleteDeclarationWorker(token, changes, sourceFile, checker, sourceFiles, program, cancellationToken, isFixAll) {
    const { parent } = token;
    if (isParameter(parent)) {
        tryDeleteParameter(changes, sourceFile, parent, checker, sourceFiles, program, cancellationToken, isFixAll);
    }
    else if (!(isFixAll && isIdentifier(token) && FindAllReferences.Core.isSymbolReferencedInFile(token, checker, sourceFile))) {
        const node = isImportClause(parent) ? token : isComputedPropertyName(parent) ? parent.parent : parent;
        Debug.assert(node !== sourceFile, "should not delete whole source file");
        changes.delete(sourceFile, node);
    }
}
function tryDeleteParameter(changes, sourceFile, parameter, checker, sourceFiles, program, cancellationToken, isFixAll = false) {
    if (mayDeleteParameter(checker, sourceFile, parameter, sourceFiles, program, cancellationToken, isFixAll)) {
        if (parameter.modifiers && parameter.modifiers.length > 0 &&
            (!isIdentifier(parameter.name) || FindAllReferences.Core.isSymbolReferencedInFile(parameter.name, checker, sourceFile))) {
            for (const modifier of parameter.modifiers) {
                if (isModifier(modifier)) {
                    changes.deleteModifier(sourceFile, modifier);
                }
            }
        }
        else if (!parameter.initializer && isNotProvidedArguments(parameter, checker, sourceFiles)) {
            changes.delete(sourceFile, parameter);
        }
    }
}
function isNotProvidedArguments(parameter, checker, sourceFiles) {
    const index = parameter.parent.parameters.indexOf(parameter);
    // Just in case the call didn't provide enough arguments.
    return !FindAllReferences.Core.someSignatureUsage(parameter.parent, sourceFiles, checker, (_, call) => !call || call.arguments.length > index);
}
function mayDeleteParameter(checker, sourceFile, parameter, sourceFiles, program, cancellationToken, isFixAll) {
    const { parent } = parameter;
    switch (parent.kind) {
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.Constructor:
            const index = parent.parameters.indexOf(parameter);
            const referent = isMethodDeclaration(parent) ? parent.name : parent;
            const entries = FindAllReferences.Core.getReferencedSymbolsForNode(parent.pos, referent, program, sourceFiles, cancellationToken);
            if (entries) {
                for (const entry of entries) {
                    for (const reference of entry.references) {
                        if (reference.kind === FindAllReferences.EntryKind.Node) {
                            // argument in super(...)
                            const isSuperCall = isSuperKeyword(reference.node)
                                && isCallExpression(reference.node.parent)
                                && reference.node.parent.arguments.length > index;
                            // argument in super.m(...)
                            const isSuperMethodCall = isPropertyAccessExpression(reference.node.parent)
                                && isSuperKeyword(reference.node.parent.expression)
                                && isCallExpression(reference.node.parent.parent)
                                && reference.node.parent.parent.arguments.length > index;
                            // parameter in overridden or overriding method
                            const isOverriddenMethod = (isMethodDeclaration(reference.node.parent) || isMethodSignature(reference.node.parent))
                                && reference.node.parent !== parameter.parent
                                && reference.node.parent.parameters.length > index;
                            if (isSuperCall || isSuperMethodCall || isOverriddenMethod)
                                return false;
                        }
                    }
                }
            }
            return true;
        case SyntaxKind.FunctionDeclaration: {
            if (parent.name && isCallbackLike(checker, sourceFile, parent.name)) {
                return isLastParameter(parent, parameter, isFixAll);
            }
            return true;
        }
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
            // Can't remove a non-last parameter in a callback. Can remove a parameter in code-fix-all if future parameters are also unused.
            return isLastParameter(parent, parameter, isFixAll);
        case SyntaxKind.SetAccessor:
            // Setter must have a parameter
            return false;
        case SyntaxKind.GetAccessor:
            // Getter cannot have parameters
            return true;
        default:
            return Debug.failBadSyntaxKind(parent);
    }
}
function isCallbackLike(checker, sourceFile, name) {
    return !!FindAllReferences.Core.eachSymbolReferenceInFile(name, checker, sourceFile, reference => isIdentifier(reference) && isCallExpression(reference.parent) && reference.parent.arguments.includes(reference));
}
function isLastParameter(func, parameter, isFixAll) {
    const parameters = func.parameters;
    const index = parameters.indexOf(parameter);
    Debug.assert(index !== -1, "The parameter should already be in the list");
    return isFixAll ?
        parameters.slice(index + 1).every(p => isIdentifier(p.name) && !p.symbol.isReferenced) :
        index === parameters.length - 1;
}
function mayDeleteExpression(node) {
    return ((isBinaryExpression(node.parent) && node.parent.left === node) ||
        ((isPostfixUnaryExpression(node.parent) || isPrefixUnaryExpression(node.parent)) && node.parent.operand === node)) && isExpressionStatement(node.parent.parent);
}
function deleteFunctionLikeDeclaration(changes, sourceFile, node) {
    const declarations = node.symbol.declarations;
    if (declarations) {
        for (const declaration of declarations) {
            changes.delete(sourceFile, declaration);
        }
    }
}
