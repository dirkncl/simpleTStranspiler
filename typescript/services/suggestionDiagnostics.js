import {
  addRange,
  AssignmentDeclarationKind,
  codefix,
  compilerOptionsIndicateEsModules,
  createDiagnosticForNode,
  Diagnostics,
  Extension,
  fileExtensionIsOneOf,
  forEachReturnStatement,
  FunctionFlags,
  getAllowSyntheticDefaultImports,
  getAssignmentDeclarationKind,
  getFunctionFlags,
  hasInitializer,
  hasPropertyAccessExpressionWithName,
  hasSyntacticModifier,
  importFromModuleSpecifier,
  isAsyncFunction,
  isBinaryExpression,
  isBlock,
  isCallExpression,
  isExportAssignment,
  isFunctionDeclaration,
  isFunctionExpression,
  isFunctionLike,
  isIdentifier,
  isImportEqualsDeclaration,
  isPropertyAccessExpression,
  isRequireCall,
  isReturnStatement,
  isSourceFileJS,
  isStringLiteral,
  isVariableDeclaration,
  isVariableStatement,
  ModifierFlags,
  ModuleKind,
  NodeFlags,
  programContainsEsModules,
  skipAlias,
  some,
  SyntaxKind,
} from "./_namespaces/ts.js";


const visitedNestedConvertibleFunctions = new Map();

/** @internal */
export function computeSuggestionDiagnostics(sourceFile, program, cancellationToken) {
    var _a;
    program.getSemanticDiagnostics(sourceFile, cancellationToken);
    const diags = [];
    const checker = program.getTypeChecker();
    const isCommonJSFile = program.getImpliedNodeFormatForEmit(sourceFile) === ModuleKind.CommonJS || fileExtensionIsOneOf(sourceFile.fileName, [Extension.Cts, Extension.Cjs]);
    if (!isCommonJSFile &&
        sourceFile.commonJsModuleIndicator &&
        (programContainsEsModules(program) || compilerOptionsIndicateEsModules(program.getCompilerOptions())) &&
        containsTopLevelCommonjs(sourceFile)) {
        diags.push(createDiagnosticForNode(getErrorNodeFromCommonJsIndicator(sourceFile.commonJsModuleIndicator), Diagnostics.File_is_a_CommonJS_module_it_may_be_converted_to_an_ES_module));
    }
    const isJsFile = isSourceFileJS(sourceFile);
    visitedNestedConvertibleFunctions.clear();
    check(sourceFile);
    if (getAllowSyntheticDefaultImports(program.getCompilerOptions())) {
        for (const moduleSpecifier of sourceFile.imports) {
            const importNode = importFromModuleSpecifier(moduleSpecifier);
            if (isImportEqualsDeclaration(importNode) && hasSyntacticModifier(importNode, ModifierFlags.Export))
                continue;
            const name = importNameForConvertToDefaultImport(importNode);
            if (!name)
                continue;
            const module = (_a = program.getResolvedModuleFromModuleSpecifier(moduleSpecifier, sourceFile)) === null || _a === void 0 ? void 0 : _a.resolvedModule;
            const resolvedFile = module && program.getSourceFile(module.resolvedFileName);
            if (resolvedFile && resolvedFile.externalModuleIndicator && resolvedFile.externalModuleIndicator !== true && isExportAssignment(resolvedFile.externalModuleIndicator) && resolvedFile.externalModuleIndicator.isExportEquals) {
                diags.push(createDiagnosticForNode(name, Diagnostics.Import_may_be_converted_to_a_default_import));
            }
        }
    }
    addRange(diags, sourceFile.bindSuggestionDiagnostics);
    addRange(diags, program.getSuggestionDiagnostics(sourceFile, cancellationToken));
    diags.sort((d1, d2) => d1.start - d2.start);
    return diags;
    function check(node) {
        if (isJsFile) {
            if (canBeConvertedToClass(node, checker)) {
                diags.push(createDiagnosticForNode(isVariableDeclaration(node.parent) ? node.parent.name : node, Diagnostics.This_constructor_function_may_be_converted_to_a_class_declaration));
            }
        }
        else {
            if (isVariableStatement(node) &&
                node.parent === sourceFile &&
                node.declarationList.flags & NodeFlags.Const &&
                node.declarationList.declarations.length === 1) {
                const init = node.declarationList.declarations[0].initializer;
                if (init && isRequireCall(init, /*requireStringLiteralLikeArgument*/ true)) {
                    diags.push(createDiagnosticForNode(init, Diagnostics.require_call_may_be_converted_to_an_import));
                }
            }
            const jsdocTypedefNodes = codefix.getJSDocTypedefNodes(node);
            for (const jsdocTypedefNode of jsdocTypedefNodes) {
                diags.push(createDiagnosticForNode(jsdocTypedefNode, Diagnostics.JSDoc_typedef_may_be_converted_to_TypeScript_type));
            }
            if (codefix.parameterShouldGetTypeFromJSDoc(node)) {
                diags.push(createDiagnosticForNode(node.name || node, Diagnostics.JSDoc_types_may_be_moved_to_TypeScript_types));
            }
        }
        if (canBeConvertedToAsync(node)) {
            addConvertToAsyncFunctionDiagnostics(node, checker, diags);
        }
        node.forEachChild(check);
    }
}
// convertToEsModule only works on top-level, so don't trigger it if commonjs code only appears in nested scopes.
function containsTopLevelCommonjs(sourceFile) {
    return sourceFile.statements.some(statement => {
        switch (statement.kind) {
            case SyntaxKind.VariableStatement:
                return statement.declarationList.declarations.some(decl => !!decl.initializer && isRequireCall(propertyAccessLeftHandSide(decl.initializer), /*requireStringLiteralLikeArgument*/ true));
            case SyntaxKind.ExpressionStatement: {
                const { expression } = statement;
                if (!isBinaryExpression(expression))
                    return isRequireCall(expression, /*requireStringLiteralLikeArgument*/ true);
                const kind = getAssignmentDeclarationKind(expression);
                return kind === AssignmentDeclarationKind.ExportsProperty || kind === AssignmentDeclarationKind.ModuleExports;
            }
            default:
                return false;
        }
    });
}
function propertyAccessLeftHandSide(node) {
    return isPropertyAccessExpression(node) ? propertyAccessLeftHandSide(node.expression) : node;
}
function importNameForConvertToDefaultImport(node) {
    switch (node.kind) {
        case SyntaxKind.ImportDeclaration:
            const { importClause, moduleSpecifier } = node;
            return importClause && !importClause.name && importClause.namedBindings && importClause.namedBindings.kind === SyntaxKind.NamespaceImport && isStringLiteral(moduleSpecifier)
                ? importClause.namedBindings.name
                : undefined;
        case SyntaxKind.ImportEqualsDeclaration:
            return node.name;
        default:
            return undefined;
    }
}
function addConvertToAsyncFunctionDiagnostics(node, checker, diags) {
    // need to check function before checking map so that deeper levels of nested callbacks are checked
    if (isConvertibleFunction(node, checker) && !visitedNestedConvertibleFunctions.has(getKeyFromNode(node))) {
        diags.push(createDiagnosticForNode(!node.name && isVariableDeclaration(node.parent) && isIdentifier(node.parent.name) ? node.parent.name : node, Diagnostics.This_may_be_converted_to_an_async_function));
    }
}
function isConvertibleFunction(node, checker) {
    return !isAsyncFunction(node) &&
        node.body &&
        isBlock(node.body) &&
        hasReturnStatementWithPromiseHandler(node.body, checker) &&
        returnsPromise(node, checker);
}
/** @internal */
export function returnsPromise(node, checker) {
    const signature = checker.getSignatureFromDeclaration(node);
    const returnType = signature ? checker.getReturnTypeOfSignature(signature) : undefined;
    return !!returnType && !!checker.getPromisedTypeOfPromise(returnType);
}
function getErrorNodeFromCommonJsIndicator(commonJsModuleIndicator) {
    return isBinaryExpression(commonJsModuleIndicator) ? commonJsModuleIndicator.left : commonJsModuleIndicator;
}
function hasReturnStatementWithPromiseHandler(body, checker) {
    return !!forEachReturnStatement(body, statement => isReturnStatementWithFixablePromiseHandler(statement, checker));
}
/** @internal */
export function isReturnStatementWithFixablePromiseHandler(node, checker) {
    return isReturnStatement(node) && !!node.expression && isFixablePromiseHandler(node.expression, checker);
}
// Should be kept up to date with transformExpression in convertToAsyncFunction.ts
/** @internal */
export function isFixablePromiseHandler(node, checker) {
    // ensure outermost call exists and is a promise handler
    if (!isPromiseHandler(node) || !hasSupportedNumberOfArguments(node) || !node.arguments.every(arg => isFixablePromiseArgument(arg, checker))) {
        return false;
    }
    // ensure all chained calls are valid
    let currentNode = node.expression.expression;
    while (isPromiseHandler(currentNode) || isPropertyAccessExpression(currentNode)) {
        if (isCallExpression(currentNode)) {
            if (!hasSupportedNumberOfArguments(currentNode) || !currentNode.arguments.every(arg => isFixablePromiseArgument(arg, checker))) {
                return false;
            }
            currentNode = currentNode.expression.expression;
        }
        else {
            currentNode = currentNode.expression;
        }
    }
    return true;
}
function isPromiseHandler(node) {
    return isCallExpression(node) && (hasPropertyAccessExpressionWithName(node, "then") ||
        hasPropertyAccessExpressionWithName(node, "catch") ||
        hasPropertyAccessExpressionWithName(node, "finally"));
}
function hasSupportedNumberOfArguments(node) {
    const name = node.expression.name.text;
    const maxArguments = name === "then" ? 2 : name === "catch" ? 1 : name === "finally" ? 1 : 0;
    if (node.arguments.length > maxArguments)
        return false;
    if (node.arguments.length < maxArguments)
        return true;
    return maxArguments === 1 || some(node.arguments, arg => {
        return arg.kind === SyntaxKind.NullKeyword || isIdentifier(arg) && arg.text === "undefined";
    });
}
// should be kept up to date with getTransformationBody in convertToAsyncFunction.ts
function isFixablePromiseArgument(arg, checker) {
    switch (arg.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.FunctionExpression:
            const functionFlags = getFunctionFlags(arg);
            if (functionFlags & FunctionFlags.Generator) {
                return false;
            }
        // falls through
        case SyntaxKind.ArrowFunction:
            visitedNestedConvertibleFunctions.set(getKeyFromNode(arg), true);
        // falls through
        case SyntaxKind.NullKeyword:
            return true;
        case SyntaxKind.Identifier:
        case SyntaxKind.PropertyAccessExpression: {
            const symbol = checker.getSymbolAtLocation(arg);
            if (!symbol) {
                return false;
            }
            return checker.isUndefinedSymbol(symbol) ||
                some(skipAlias(symbol, checker).declarations, d => isFunctionLike(d) || hasInitializer(d) && !!d.initializer && isFunctionLike(d.initializer));
        }
        default:
            return false;
    }
}
function getKeyFromNode(exp) {
    return `${exp.pos.toString()}:${exp.end.toString()}`;
}
function canBeConvertedToClass(node, checker) {
    var _a, _b, _c, _d;
    if (isFunctionExpression(node)) {
        if (isVariableDeclaration(node.parent) && ((_a = node.symbol.members) === null || _a === void 0 ? void 0 : _a.size)) {
            return true;
        }
        const symbol = checker.getSymbolOfExpando(node, /*allowDeclaration*/ false);
        return !!(symbol && (((_b = symbol.exports) === null || _b === void 0 ? void 0 : _b.size) || ((_c = symbol.members) === null || _c === void 0 ? void 0 : _c.size)));
    }
    if (isFunctionDeclaration(node)) {
        return !!((_d = node.symbol.members) === null || _d === void 0 ? void 0 : _d.size);
    }
    return false;
}
/** @internal */
export function canBeConvertedToAsync(node) {
    switch (node.kind) {
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
            return true;
        default:
            return false;
    }
}
