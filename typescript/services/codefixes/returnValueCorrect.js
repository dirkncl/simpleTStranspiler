import {
  codeFixAll,
  createCodeFixAction,
  registerCodeFix,
} from "../namespaces/ts.codefix.js";

import {
  append,
  copyComments,
  createSymbolTable,
  Debug,
  Diagnostics,
  factory,
  findAncestor,
  first,
  getTokenAtPosition,
  hasSyntacticModifier,
  isArrowFunction,
  isBlock,
  isCallExpression,
  isDeclarationName,
  isExpressionStatement,
  isFunctionLikeDeclaration,
  isJsxAttribute,
  isJsxExpression,
  isLabeledStatement,
  isVariableLike,
  length,
  ModifierFlags,
  needsParentheses,
  probablyUsesSemicolons,
  rangeContainsRange,
  suppressLeadingAndTrailingTrivia,
  SymbolFlags,
  SyntaxKind,
  textChanges,
} from "../namespaces/ts.js";


const fixId = "returnValueCorrect";
const fixIdAddReturnStatement = "fixAddReturnStatement";
const fixRemoveBracesFromArrowFunctionBody = "fixRemoveBracesFromArrowFunctionBody";
const fixIdWrapTheBlockWithParen = "fixWrapTheBlockWithParen";

const errorCodes = [
    Diagnostics.A_function_whose_declared_type_is_neither_undefined_void_nor_any_must_return_a_value.code,
    Diagnostics.Type_0_is_not_assignable_to_type_1.code,
    Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
];

var ProblemKind;
(function (ProblemKind) {
    ProblemKind[ProblemKind["MissingReturnStatement"] = 0] = "MissingReturnStatement";
    ProblemKind[ProblemKind["MissingParentheses"] = 1] = "MissingParentheses";
})(ProblemKind || (ProblemKind = {}));

registerCodeFix({
    errorCodes,
    fixIds: [fixIdAddReturnStatement, fixRemoveBracesFromArrowFunctionBody, fixIdWrapTheBlockWithParen],
    getCodeActions: function getCodeActionsToCorrectReturnValue(context) {
        const { program, sourceFile, span: { start }, errorCode } = context;
        const info = getInfo(program.getTypeChecker(), sourceFile, start, errorCode);
        if (!info)
            return undefined;
        if (info.kind === ProblemKind.MissingReturnStatement) {
            return append([getActionForfixAddReturnStatement(context, info.expression, info.statement)], isArrowFunction(info.declaration) ? getActionForFixRemoveBracesFromArrowFunctionBody(context, info.declaration, info.expression, info.commentSource) : undefined);
        }
        else {
            return [getActionForfixWrapTheBlockWithParen(context, info.declaration, info.expression)];
        }
    },
    getAllCodeActions: context => codeFixAll(context, errorCodes, (changes, diag) => {
        const info = getInfo(context.program.getTypeChecker(), diag.file, diag.start, diag.code);
        if (!info)
            return undefined;
        switch (context.fixId) {
            case fixIdAddReturnStatement:
                addReturnStatement(changes, diag.file, info.expression, info.statement);
                break;
            case fixRemoveBracesFromArrowFunctionBody:
                if (!isArrowFunction(info.declaration))
                    return undefined;
                removeBlockBodyBrace(changes, diag.file, info.declaration, info.expression, info.commentSource, /*withParen*/ false);
                break;
            case fixIdWrapTheBlockWithParen:
                if (!isArrowFunction(info.declaration))
                    return undefined;
                wrapBlockWithParen(changes, diag.file, info.declaration, info.expression);
                break;
            default:
                Debug.fail(JSON.stringify(context.fixId));
        }
    }),
});
function createObjectTypeFromLabeledExpression(checker, label, expression) {
    const member = checker.createSymbol(SymbolFlags.Property, label.escapedText);
    member.links.type = checker.getTypeAtLocation(expression);
    const members = createSymbolTable([member]);
    return checker.createAnonymousType(/*symbol*/ undefined, members, [], [], []);
}
function getFixInfo(checker, declaration, expectType, isFunctionType) {
    if (!declaration.body || !isBlock(declaration.body) || length(declaration.body.statements) !== 1)
        return undefined;
    const firstStatement = first(declaration.body.statements);
    if (isExpressionStatement(firstStatement) && checkFixedAssignableTo(checker, declaration, checker.getTypeAtLocation(firstStatement.expression), expectType, isFunctionType)) {
        return {
            declaration,
            kind: ProblemKind.MissingReturnStatement,
            expression: firstStatement.expression,
            statement: firstStatement,
            commentSource: firstStatement.expression,
        };
    }
    else if (isLabeledStatement(firstStatement) && isExpressionStatement(firstStatement.statement)) {
        const node = factory.createObjectLiteralExpression([factory.createPropertyAssignment(firstStatement.label, firstStatement.statement.expression)]);
        const nodeType = createObjectTypeFromLabeledExpression(checker, firstStatement.label, firstStatement.statement.expression);
        if (checkFixedAssignableTo(checker, declaration, nodeType, expectType, isFunctionType)) {
            return isArrowFunction(declaration) ? {
                declaration,
                kind: ProblemKind.MissingParentheses,
                expression: node,
                statement: firstStatement,
                commentSource: firstStatement.statement.expression,
            } : {
                declaration,
                kind: ProblemKind.MissingReturnStatement,
                expression: node,
                statement: firstStatement,
                commentSource: firstStatement.statement.expression,
            };
        }
    }
    else if (isBlock(firstStatement) && length(firstStatement.statements) === 1) {
        const firstBlockStatement = first(firstStatement.statements);
        if (isLabeledStatement(firstBlockStatement) && isExpressionStatement(firstBlockStatement.statement)) {
            const node = factory.createObjectLiteralExpression([factory.createPropertyAssignment(firstBlockStatement.label, firstBlockStatement.statement.expression)]);
            const nodeType = createObjectTypeFromLabeledExpression(checker, firstBlockStatement.label, firstBlockStatement.statement.expression);
            if (checkFixedAssignableTo(checker, declaration, nodeType, expectType, isFunctionType)) {
                return {
                    declaration,
                    kind: ProblemKind.MissingReturnStatement,
                    expression: node,
                    statement: firstStatement,
                    commentSource: firstBlockStatement,
                };
            }
        }
    }
    return undefined;
}
function checkFixedAssignableTo(checker, declaration, exprType, type, isFunctionType) {
    if (isFunctionType) {
        const sig = checker.getSignatureFromDeclaration(declaration);
        if (sig) {
            if (hasSyntacticModifier(declaration, ModifierFlags.Async)) {
                exprType = checker.createPromiseType(exprType);
            }
            const newSig = checker.createSignature(declaration, sig.typeParameters, sig.thisParameter, sig.parameters, exprType, 
            /*typePredicate*/ undefined, sig.minArgumentCount, sig.flags);
            exprType = checker.createAnonymousType(
            /*symbol*/ undefined, createSymbolTable(), [newSig], [], []);
        }
        else {
            exprType = checker.getAnyType();
        }
    }
    return checker.isTypeAssignableTo(exprType, type);
}
function getInfo(checker, sourceFile, position, errorCode) {
    const node = getTokenAtPosition(sourceFile, position);
    if (!node.parent)
        return undefined;
    const declaration = findAncestor(node.parent, isFunctionLikeDeclaration);
    switch (errorCode) {
        case Diagnostics.A_function_whose_declared_type_is_neither_undefined_void_nor_any_must_return_a_value.code:
            if (!declaration || !declaration.body || !declaration.type || !rangeContainsRange(declaration.type, node))
                return undefined;
            return getFixInfo(checker, declaration, checker.getTypeFromTypeNode(declaration.type), /*isFunctionType*/ false);
        case Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code:
            if (!declaration || !isCallExpression(declaration.parent) || !declaration.body)
                return undefined;
            const pos = declaration.parent.arguments.indexOf(declaration);
            if (pos === -1)
                return undefined;
            const type = checker.getContextualTypeForArgumentAtIndex(declaration.parent, pos);
            if (!type)
                return undefined;
            return getFixInfo(checker, declaration, type, /*isFunctionType*/ true);
        case Diagnostics.Type_0_is_not_assignable_to_type_1.code:
            if (!isDeclarationName(node) || !isVariableLike(node.parent) && !isJsxAttribute(node.parent))
                return undefined;
            const initializer = getVariableLikeInitializer(node.parent);
            if (!initializer || !isFunctionLikeDeclaration(initializer) || !initializer.body)
                return undefined;
            return getFixInfo(checker, initializer, checker.getTypeAtLocation(node.parent), /*isFunctionType*/ true);
    }
    return undefined;
}
function getVariableLikeInitializer(declaration) {
    switch (declaration.kind) {
        case SyntaxKind.VariableDeclaration:
        case SyntaxKind.Parameter:
        case SyntaxKind.BindingElement:
        case SyntaxKind.PropertyDeclaration:
        case SyntaxKind.PropertyAssignment:
            return declaration.initializer;
        case SyntaxKind.JsxAttribute:
            return declaration.initializer && (isJsxExpression(declaration.initializer) ? declaration.initializer.expression : undefined);
        case SyntaxKind.ShorthandPropertyAssignment:
        case SyntaxKind.PropertySignature:
        case SyntaxKind.EnumMember:
        case SyntaxKind.JSDocPropertyTag:
        case SyntaxKind.JSDocParameterTag:
            return undefined;
    }
}
function addReturnStatement(changes, sourceFile, expression, statement) {
    suppressLeadingAndTrailingTrivia(expression);
    const probablyNeedSemi = probablyUsesSemicolons(sourceFile);
    changes.replaceNode(sourceFile, statement, factory.createReturnStatement(expression), {
        leadingTriviaOption: textChanges.LeadingTriviaOption.Exclude,
        trailingTriviaOption: textChanges.TrailingTriviaOption.Exclude,
        suffix: probablyNeedSemi ? ";" : undefined,
    });
}
function removeBlockBodyBrace(changes, sourceFile, declaration, expression, commentSource, withParen) {
    const newBody = (withParen || needsParentheses(expression)) ? factory.createParenthesizedExpression(expression) : expression;
    suppressLeadingAndTrailingTrivia(commentSource);
    copyComments(commentSource, newBody);
    changes.replaceNode(sourceFile, declaration.body, newBody);
}
function wrapBlockWithParen(changes, sourceFile, declaration, expression) {
    changes.replaceNode(sourceFile, declaration.body, factory.createParenthesizedExpression(expression));
}
function getActionForfixAddReturnStatement(context, expression, statement) {
    const changes = textChanges.ChangeTracker.with(context, t => addReturnStatement(t, context.sourceFile, expression, statement));
    return createCodeFixAction(fixId, changes, Diagnostics.Add_a_return_statement, fixIdAddReturnStatement, Diagnostics.Add_all_missing_return_statement);
}
function getActionForFixRemoveBracesFromArrowFunctionBody(context, declaration, expression, commentSource) {
    const changes = textChanges.ChangeTracker.with(context, t => removeBlockBodyBrace(t, context.sourceFile, declaration, expression, commentSource, /*withParen*/ false));
    return createCodeFixAction(fixId, changes, Diagnostics.Remove_braces_from_arrow_function_body, fixRemoveBracesFromArrowFunctionBody, Diagnostics.Remove_braces_from_all_arrow_function_bodies_with_relevant_issues);
}
function getActionForfixWrapTheBlockWithParen(context, declaration, expression) {
    const changes = textChanges.ChangeTracker.with(context, t => wrapBlockWithParen(t, context.sourceFile, declaration, expression));
    return createCodeFixAction(fixId, changes, Diagnostics.Wrap_the_following_body_with_parentheses_which_should_be_an_object_literal, fixIdWrapTheBlockWithParen, Diagnostics.Wrap_all_object_literal_with_parentheses);
}
