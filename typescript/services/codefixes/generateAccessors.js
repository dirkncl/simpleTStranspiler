import {
  canHaveDecorators,
  cast,
  concatenate,
  Diagnostics,
  factory,
  find,
  findAncestor,
  getClassExtendsHeritageElement,
  getDecorators,
  getEffectiveModifierFlags,
  getFirstConstructorWithBody,
  getLocaleSpecificMessage,
  getTokenAtPosition,
  getTypeAnnotationNode,
  getUniqueName,
  hasEffectiveReadonlyModifier,
  hasStaticModifier,
  isClassLike,
  isElementAccessExpression,
  isFunctionLike,
  isIdentifier,
  isParameterPropertyDeclaration,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isSourceFileJS,
  isStringLiteral,
  isUnionTypeNode,
  isWriteAccess,
  ModifierFlags,
  nodeOverlapsWithStartEnd,
  refactor,
  startsWithUnderscore,
  suppressLeadingAndTrailingTrivia,
  SymbolFlags,
  SyntaxKind,
  textChanges,
} from "../namespaces/ts.js";

/** @internal */
export function generateAccessorFromProperty(file, program, start, end, context, _actionName) {
    const fieldInfo = getAccessorConvertiblePropertyAtPosition(file, program, start, end);
    if (!fieldInfo || refactor.isRefactorErrorInfo(fieldInfo))
        return undefined;
    const changeTracker = textChanges.ChangeTracker.fromContext(context);
    const { isStatic, isReadonly, fieldName, accessorName, originalName, type, container, declaration } = fieldInfo;
    suppressLeadingAndTrailingTrivia(fieldName);
    suppressLeadingAndTrailingTrivia(accessorName);
    suppressLeadingAndTrailingTrivia(declaration);
    suppressLeadingAndTrailingTrivia(container);
    let accessorModifiers;
    let fieldModifiers;
    if (isClassLike(container)) {
        const modifierFlags = getEffectiveModifierFlags(declaration);
        if (isSourceFileJS(file)) {
            const modifiers = factory.createModifiersFromModifierFlags(modifierFlags);
            accessorModifiers = modifiers;
            fieldModifiers = modifiers;
        }
        else {
            accessorModifiers = factory.createModifiersFromModifierFlags(prepareModifierFlagsForAccessor(modifierFlags));
            fieldModifiers = factory.createModifiersFromModifierFlags(prepareModifierFlagsForField(modifierFlags));
        }
        if (canHaveDecorators(declaration)) {
            fieldModifiers = concatenate(getDecorators(declaration), fieldModifiers);
        }
    }
    updateFieldDeclaration(changeTracker, file, declaration, type, fieldName, fieldModifiers);
    const getAccessor = generateGetAccessor(fieldName, accessorName, type, accessorModifiers, isStatic, container);
    suppressLeadingAndTrailingTrivia(getAccessor);
    insertAccessor(changeTracker, file, getAccessor, declaration, container);
    if (isReadonly) {
        // readonly modifier only existed in classLikeDeclaration
        const constructor = getFirstConstructorWithBody(container);
        if (constructor) {
            updateReadonlyPropertyInitializerStatementConstructor(changeTracker, file, constructor, fieldName.text, originalName);
        }
    }
    else {
        const setAccessor = generateSetAccessor(fieldName, accessorName, type, accessorModifiers, isStatic, container);
        suppressLeadingAndTrailingTrivia(setAccessor);
        insertAccessor(changeTracker, file, setAccessor, declaration, container);
    }
    return changeTracker.getChanges();
}
function isConvertibleName(name) {
    return isIdentifier(name) || isStringLiteral(name);
}
function isAcceptedDeclaration(node) {
    return isParameterPropertyDeclaration(node, node.parent) || isPropertyDeclaration(node) || isPropertyAssignment(node);
}
function createPropertyName(name, originalName) {
    return isIdentifier(originalName) ? factory.createIdentifier(name) : factory.createStringLiteral(name);
}
function createAccessorAccessExpression(fieldName, isStatic, container) {
    const leftHead = isStatic ? container.name : factory.createThis(); // TODO: GH#18217
    return isIdentifier(fieldName) ? factory.createPropertyAccessExpression(leftHead, fieldName) : factory.createElementAccessExpression(leftHead, factory.createStringLiteralFromNode(fieldName));
}
function prepareModifierFlagsForAccessor(modifierFlags) {
    modifierFlags &= ~ModifierFlags.Readonly; // avoid Readonly modifier because it will convert to get accessor
    modifierFlags &= ~ModifierFlags.Private;
    if (!(modifierFlags & ModifierFlags.Protected)) {
        modifierFlags |= ModifierFlags.Public;
    }
    return modifierFlags;
}
function prepareModifierFlagsForField(modifierFlags) {
    modifierFlags &= ~ModifierFlags.Public;
    modifierFlags &= ~ModifierFlags.Protected;
    modifierFlags |= ModifierFlags.Private;
    return modifierFlags;
}
/** @internal */
export function getAccessorConvertiblePropertyAtPosition(file, program, start, end, considerEmptySpans = true) {
    const node = getTokenAtPosition(file, start);
    const cursorRequest = start === end && considerEmptySpans;
    const declaration = findAncestor(node.parent, isAcceptedDeclaration);
    // make sure declaration have AccessibilityModifier or Static Modifier or Readonly Modifier
    const meaning = ModifierFlags.AccessibilityModifier | ModifierFlags.Static | ModifierFlags.Readonly;
    if (!declaration || (!(nodeOverlapsWithStartEnd(declaration.name, file, start, end) || cursorRequest))) {
        return {
            error: getLocaleSpecificMessage(Diagnostics.Could_not_find_property_for_which_to_generate_accessor),
        };
    }
    if (!isConvertibleName(declaration.name)) {
        return {
            error: getLocaleSpecificMessage(Diagnostics.Name_is_not_valid),
        };
    }
    if (((getEffectiveModifierFlags(declaration) & ModifierFlags.Modifier) | meaning) !== meaning) {
        return {
            error: getLocaleSpecificMessage(Diagnostics.Can_only_convert_property_with_modifier),
        };
    }
    const name = declaration.name.text;
    const startWithUnderscore = startsWithUnderscore(name);
    const fieldName = createPropertyName(startWithUnderscore ? name : getUniqueName(`_${name}`, file), declaration.name);
    const accessorName = createPropertyName(startWithUnderscore ? getUniqueName(name.substring(1), file) : name, declaration.name);
    return {
        isStatic: hasStaticModifier(declaration),
        isReadonly: hasEffectiveReadonlyModifier(declaration),
        type: getDeclarationType(declaration, program),
        container: declaration.kind === SyntaxKind.Parameter ? declaration.parent.parent : declaration.parent,
        originalName: declaration.name.text,
        declaration,
        fieldName,
        accessorName,
        renameAccessor: startWithUnderscore,
    };
}
function generateGetAccessor(fieldName, accessorName, type, modifiers, isStatic, container) {
    return factory.createGetAccessorDeclaration(modifiers, accessorName, [], type, factory.createBlock([
        factory.createReturnStatement(createAccessorAccessExpression(fieldName, isStatic, container)),
    ], /*multiLine*/ true));
}
function generateSetAccessor(fieldName, accessorName, type, modifiers, isStatic, container) {
    return factory.createSetAccessorDeclaration(modifiers, accessorName, [factory.createParameterDeclaration(
        /*modifiers*/ undefined, 
        /*dotDotDotToken*/ undefined, factory.createIdentifier("value"), 
        /*questionToken*/ undefined, type)], factory.createBlock([
        factory.createExpressionStatement(factory.createAssignment(createAccessorAccessExpression(fieldName, isStatic, container), factory.createIdentifier("value"))),
    ], /*multiLine*/ true));
}
function updatePropertyDeclaration(changeTracker, file, declaration, type, fieldName, modifiers) {
    const property = factory.updatePropertyDeclaration(declaration, modifiers, fieldName, declaration.questionToken || declaration.exclamationToken, type, declaration.initializer);
    changeTracker.replaceNode(file, declaration, property);
}
function updatePropertyAssignmentDeclaration(changeTracker, file, declaration, fieldName) {
    let assignment = factory.updatePropertyAssignment(declaration, fieldName, declaration.initializer);
    // Remove grammar errors from assignment
    if (assignment.modifiers || assignment.questionToken || assignment.exclamationToken) {
        if (assignment === declaration)
            assignment = factory.cloneNode(assignment);
        assignment.modifiers = undefined;
        assignment.questionToken = undefined;
        assignment.exclamationToken = undefined;
    }
    changeTracker.replacePropertyAssignment(file, declaration, assignment);
}
function updateFieldDeclaration(changeTracker, file, declaration, type, fieldName, modifiers) {
    if (isPropertyDeclaration(declaration)) {
        updatePropertyDeclaration(changeTracker, file, declaration, type, fieldName, modifiers);
    }
    else if (isPropertyAssignment(declaration)) {
        updatePropertyAssignmentDeclaration(changeTracker, file, declaration, fieldName);
    }
    else {
        changeTracker.replaceNode(file, declaration, factory.updateParameterDeclaration(declaration, modifiers, declaration.dotDotDotToken, cast(fieldName, isIdentifier), declaration.questionToken, declaration.type, declaration.initializer));
    }
}
function insertAccessor(changeTracker, file, accessor, declaration, container) {
    isParameterPropertyDeclaration(declaration, declaration.parent) ? changeTracker.insertMemberAtStart(file, container, accessor) :
        isPropertyAssignment(declaration) ? changeTracker.insertNodeAfterComma(file, declaration, accessor) :
            changeTracker.insertNodeAfter(file, declaration, accessor);
}
function updateReadonlyPropertyInitializerStatementConstructor(changeTracker, file, constructor, fieldName, originalName) {
    if (!constructor.body)
        return;
    constructor.body.forEachChild(function recur(node) {
        if (isElementAccessExpression(node) &&
            node.expression.kind === SyntaxKind.ThisKeyword &&
            isStringLiteral(node.argumentExpression) &&
            node.argumentExpression.text === originalName &&
            isWriteAccess(node)) {
            changeTracker.replaceNode(file, node.argumentExpression, factory.createStringLiteral(fieldName));
        }
        if (isPropertyAccessExpression(node) && node.expression.kind === SyntaxKind.ThisKeyword && node.name.text === originalName && isWriteAccess(node)) {
            changeTracker.replaceNode(file, node.name, factory.createIdentifier(fieldName));
        }
        if (!isFunctionLike(node) && !isClassLike(node)) {
            node.forEachChild(recur);
        }
    });
}
function getDeclarationType(declaration, program) {
    const typeNode = getTypeAnnotationNode(declaration);
    if (isPropertyDeclaration(declaration) && typeNode && declaration.questionToken) {
        const typeChecker = program.getTypeChecker();
        const type = typeChecker.getTypeFromTypeNode(typeNode);
        if (!typeChecker.isTypeAssignableTo(typeChecker.getUndefinedType(), type)) {
            const types = isUnionTypeNode(typeNode) ? typeNode.types : [typeNode];
            return factory.createUnionTypeNode([...types, factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)]);
        }
    }
    return typeNode;
}
/** @internal */
export function getAllSupers(decl, checker) {
    const res = [];
    while (decl) {
        const superElement = getClassExtendsHeritageElement(decl);
        const superSymbol = superElement && checker.getSymbolAtLocation(superElement.expression);
        if (!superSymbol)
            break;
        const symbol = superSymbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(superSymbol) : superSymbol;
        const superDecl = symbol.declarations && find(symbol.declarations, isClassLike);
        if (!superDecl)
            break;
        res.push(superDecl);
        decl = superDecl;
    }
    return res;
}
