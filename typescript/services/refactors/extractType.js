import {
  addRange,
  addToSeen,
  append,
  cast,
  concatenate,
  createTextRangeFromSpan,
  Debug,
  Diagnostics,
  EmitFlags,
  emptyArray,
  factory,
  findAncestor,
  forEach,
  forEachChild,
  getEffectiveConstraintOfTypeParameter,
  getLineAndCharacterOfPosition,
  getLocaleSpecificMessage,
  getNameFromPropertyName,
  getNewLineOrDefaultFromHost,
  getPrecedingNonSpaceCharacterPosition,
  getRefactorContextSpan,
  getRenameLocation,
  getTokenAtPosition,
  getTouchingToken,
  getUniqueName,
  ignoreSourceNewlines,
  isArray,
  isConditionalTypeNode,
  isFunctionLike,
  isIdentifier,
  isInferTypeNode,
  isIntersectionTypeNode,
  isJSDoc,
  isJSDocTypeExpression,
  isParenthesizedTypeNode,
  isSourceFileJS,
  isStatement,
  isThisIdentifier,
  isThisTypeNode,
  isTupleTypeNode,
  isTypeLiteralNode,
  isTypeNode,
  isTypeParameterDeclaration,
  isTypePredicateNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  nodeOverlapsWithStartEnd,
  pushIfUnique,
  rangeContainsStartEnd,
  setEmitFlags,
  setTextRange,
  skipTrivia,
  SymbolFlags,
  textChanges,
  toArray,
} from "../namespaces/ts.js";

import {
  isRefactorErrorInfo,
  registerRefactor,
} from "../namespaces/ts.refactor.js";


const refactorName = "Extract type";

const extractToTypeAliasAction = {
    name: "Extract to type alias",
    description: getLocaleSpecificMessage(Diagnostics.Extract_to_type_alias),
    kind: "refactor.extract.type",
};
const extractToInterfaceAction = {
    name: "Extract to interface",
    description: getLocaleSpecificMessage(Diagnostics.Extract_to_interface),
    kind: "refactor.extract.interface",
};
const extractToTypeDefAction = {
    name: "Extract to typedef",
    description: getLocaleSpecificMessage(Diagnostics.Extract_to_typedef),
    kind: "refactor.extract.typedef",
};
registerRefactor(refactorName, {
    kinds: [
        extractToTypeAliasAction.kind,
        extractToInterfaceAction.kind,
        extractToTypeDefAction.kind,
    ],
    getAvailableActions: function getRefactorActionsToExtractType(context) {
        const { info, affectedTextRange } = getRangeToExtract(context, context.triggerReason === "invoked");
        if (!info)
            return emptyArray;
        if (!isRefactorErrorInfo(info)) {
            const refactorInfo = [{
                    name: refactorName,
                    description: getLocaleSpecificMessage(Diagnostics.Extract_type),
                    actions: info.isJS ?
                        [extractToTypeDefAction] : append([extractToTypeAliasAction], info.typeElements && extractToInterfaceAction),
                }];
            return refactorInfo.map(info => (Object.assign(Object.assign({}, info), { actions: info.actions.map(action => (Object.assign(Object.assign({}, action), { range: affectedTextRange ? {
                        start: { line: getLineAndCharacterOfPosition(context.file, affectedTextRange.pos).line, offset: getLineAndCharacterOfPosition(context.file, affectedTextRange.pos).character },
                        end: { line: getLineAndCharacterOfPosition(context.file, affectedTextRange.end).line, offset: getLineAndCharacterOfPosition(context.file, affectedTextRange.end).character },
                    }
                        : undefined }))) })));
        }
        if (context.preferences.provideRefactorNotApplicableReason) {
            return [{
                    name: refactorName,
                    description: getLocaleSpecificMessage(Diagnostics.Extract_type),
                    actions: [
                        Object.assign(Object.assign({}, extractToTypeDefAction), { notApplicableReason: info.error }),
                        Object.assign(Object.assign({}, extractToTypeAliasAction), { notApplicableReason: info.error }),
                        Object.assign(Object.assign({}, extractToInterfaceAction), { notApplicableReason: info.error }),
                    ],
                }];
        }
        return emptyArray;
    },
    getEditsForAction: function getRefactorEditsToExtractType(context, actionName) {
        const { file } = context;
        const { info } = getRangeToExtract(context);
        Debug.assert(info && !isRefactorErrorInfo(info), "Expected to find a range to extract");
        const name = getUniqueName("NewType", file);
        const edits = textChanges.ChangeTracker.with(context, changes => {
            switch (actionName) {
                case extractToTypeAliasAction.name:
                    Debug.assert(!info.isJS, "Invalid actionName/JS combo");
                    return doTypeAliasChange(changes, file, name, info);
                case extractToTypeDefAction.name:
                    Debug.assert(info.isJS, "Invalid actionName/JS combo");
                    return doTypedefChange(changes, context, file, name, info);
                case extractToInterfaceAction.name:
                    Debug.assert(!info.isJS && !!info.typeElements, "Invalid actionName/JS combo");
                    return doInterfaceChange(changes, file, name, info);
                default:
                    Debug.fail("Unexpected action name");
            }
        });
        const renameFilename = file.fileName;
        const renameLocation = getRenameLocation(edits, renameFilename, name, /*preferLastLocation*/ false);
        return { edits, renameFilename, renameLocation };
    },
});
function getRangeToExtract(context, considerEmptySpans = true) {
    const { file, startPosition } = context;
    const isJS = isSourceFileJS(file);
    const range = createTextRangeFromSpan(getRefactorContextSpan(context));
    const isCursorRequest = range.pos === range.end && considerEmptySpans;
    const firstType = getFirstTypeAt(file, startPosition, range, isCursorRequest);
    if (!firstType || !isTypeNode(firstType))
        return { info: { error: getLocaleSpecificMessage(Diagnostics.Selection_is_not_a_valid_type_node) }, affectedTextRange: undefined };
    const checker = context.program.getTypeChecker();
    const enclosingNode = getEnclosingNode(firstType, isJS);
    if (enclosingNode === undefined)
        return { info: { error: getLocaleSpecificMessage(Diagnostics.No_type_could_be_extracted_from_this_type_node) }, affectedTextRange: undefined };
    const expandedFirstType = getExpandedSelectionNode(firstType, enclosingNode);
    if (!isTypeNode(expandedFirstType))
        return { info: { error: getLocaleSpecificMessage(Diagnostics.Selection_is_not_a_valid_type_node) }, affectedTextRange: undefined };
    const typeList = [];
    if ((isUnionTypeNode(expandedFirstType.parent) || isIntersectionTypeNode(expandedFirstType.parent)) && range.end > firstType.end) {
        // the only extraction cases in which multiple nodes may need to be selected to capture the entire type are union and intersection types
        addRange(typeList, expandedFirstType.parent.types.filter(type => {
            return nodeOverlapsWithStartEnd(type, file, range.pos, range.end);
        }));
    }
    const selection = typeList.length > 1 ? typeList : expandedFirstType;
    const { typeParameters, affectedTextRange } = collectTypeParameters(checker, selection, enclosingNode, file);
    if (!typeParameters)
        return { info: { error: getLocaleSpecificMessage(Diagnostics.No_type_could_be_extracted_from_this_type_node) }, affectedTextRange: undefined };
    const typeElements = flattenTypeLiteralNodeReference(checker, selection);
    return { info: { isJS, selection, enclosingNode, typeParameters, typeElements }, affectedTextRange };
}
function getFirstTypeAt(file, startPosition, range, isCursorRequest) {
    const currentNodes = [
        () => getTokenAtPosition(file, startPosition),
        () => getTouchingToken(file, startPosition, () => true),
    ];
    for (const f of currentNodes) {
        const current = f();
        const overlappingRange = nodeOverlapsWithStartEnd(current, file, range.pos, range.end);
        const firstType = findAncestor(current, node => node.parent && isTypeNode(node) && !rangeContainsSkipTrivia(range, node.parent, file) &&
            (isCursorRequest || overlappingRange));
        if (firstType) {
            return firstType;
        }
    }
    return undefined;
}
function flattenTypeLiteralNodeReference(checker, selection) {
    if (!selection)
        return undefined;
    if (isArray(selection)) {
        const result = [];
        for (const type of selection) {
            const flattenedTypeMembers = flattenTypeLiteralNodeReference(checker, type);
            if (!flattenedTypeMembers)
                return undefined;
            addRange(result, flattenedTypeMembers);
        }
        return result;
    }
    if (isIntersectionTypeNode(selection)) {
        const result = [];
        const seen = new Set();
        for (const type of selection.types) {
            const flattenedTypeMembers = flattenTypeLiteralNodeReference(checker, type);
            if (!flattenedTypeMembers || !flattenedTypeMembers.every(type => type.name && addToSeen(seen, getNameFromPropertyName(type.name)))) {
                return undefined;
            }
            addRange(result, flattenedTypeMembers);
        }
        return result;
    }
    else if (isParenthesizedTypeNode(selection)) {
        return flattenTypeLiteralNodeReference(checker, selection.type);
    }
    else if (isTypeLiteralNode(selection)) {
        return selection.members;
    }
    return undefined;
}
function rangeContainsSkipTrivia(r1, node, file) {
    return rangeContainsStartEnd(r1, skipTrivia(file.text, node.pos), node.end);
}
function collectTypeParameters(checker, selection, enclosingNode, file) {
    const result = [];
    const selectionArray = toArray(selection);
    const selectionRange = { pos: selectionArray[0].getStart(file), end: selectionArray[selectionArray.length - 1].end };
    for (const t of selectionArray) {
        if (visitor(t))
            return { typeParameters: undefined, affectedTextRange: undefined };
    }
    return { typeParameters: result, affectedTextRange: selectionRange };
    function visitor(node) {
        if (isTypeReferenceNode(node)) {
            if (isIdentifier(node.typeName)) {
                const typeName = node.typeName;
                const symbol = checker.resolveName(typeName.text, typeName, SymbolFlags.TypeParameter, /*excludeGlobals*/ true);
                for (const decl of (symbol === null || symbol === void 0 ? void 0 : symbol.declarations) || emptyArray) {
                    if (isTypeParameterDeclaration(decl) && decl.getSourceFile() === file) {
                        // skip extraction if the type node is in the range of the type parameter declaration.
                        // function foo<T extends { a?: /**/T }>(): void;
                        if (decl.name.escapedText === typeName.escapedText && rangeContainsSkipTrivia(decl, selectionRange, file)) {
                            return true;
                        }
                        if (rangeContainsSkipTrivia(enclosingNode, decl, file) && !rangeContainsSkipTrivia(selectionRange, decl, file)) {
                            pushIfUnique(result, decl);
                            break;
                        }
                    }
                }
            }
        }
        else if (isInferTypeNode(node)) {
            const conditionalTypeNode = findAncestor(node, n => isConditionalTypeNode(n) && rangeContainsSkipTrivia(n.extendsType, node, file));
            if (!conditionalTypeNode || !rangeContainsSkipTrivia(selectionRange, conditionalTypeNode, file)) {
                return true;
            }
        }
        else if ((isTypePredicateNode(node) || isThisTypeNode(node))) {
            const functionLikeNode = findAncestor(node.parent, isFunctionLike);
            if (functionLikeNode && functionLikeNode.type && rangeContainsSkipTrivia(functionLikeNode.type, node, file) && !rangeContainsSkipTrivia(selectionRange, functionLikeNode, file)) {
                return true;
            }
        }
        else if (isTypeQueryNode(node)) {
            if (isIdentifier(node.exprName)) {
                const symbol = checker.resolveName(node.exprName.text, node.exprName, SymbolFlags.Value, /*excludeGlobals*/ false);
                if ((symbol === null || symbol === void 0 ? void 0 : symbol.valueDeclaration) && rangeContainsSkipTrivia(enclosingNode, symbol.valueDeclaration, file) && !rangeContainsSkipTrivia(selectionRange, symbol.valueDeclaration, file)) {
                    return true;
                }
            }
            else {
                if (isThisIdentifier(node.exprName.left) && !rangeContainsSkipTrivia(selectionRange, node.parent, file)) {
                    return true;
                }
            }
        }
        if (file && isTupleTypeNode(node) && (getLineAndCharacterOfPosition(file, node.pos).line === getLineAndCharacterOfPosition(file, node.end).line)) {
            setEmitFlags(node, EmitFlags.SingleLine);
        }
        return forEachChild(node, visitor);
    }
}
function doTypeAliasChange(changes, file, name, info) {
    const { enclosingNode, typeParameters } = info;
    const { firstTypeNode, lastTypeNode, newTypeNode } = getNodesToEdit(info);
    const newTypeDeclaration = factory.createTypeAliasDeclaration(
    /*modifiers*/ undefined, name, typeParameters.map(id => factory.updateTypeParameterDeclaration(id, id.modifiers, id.name, id.constraint, /*defaultType*/ undefined)), newTypeNode);
    changes.insertNodeBefore(file, enclosingNode, ignoreSourceNewlines(newTypeDeclaration), /*blankLineBetween*/ true);
    changes.replaceNodeRange(file, firstTypeNode, lastTypeNode, factory.createTypeReferenceNode(name, typeParameters.map(id => factory.createTypeReferenceNode(id.name, /*typeArguments*/ undefined))), { leadingTriviaOption: textChanges.LeadingTriviaOption.Exclude, trailingTriviaOption: textChanges.TrailingTriviaOption.ExcludeWhitespace });
}
function doInterfaceChange(changes, file, name, info) {
    var _a;
    const { enclosingNode, typeParameters, typeElements } = info;
    const newTypeNode = factory.createInterfaceDeclaration(
    /*modifiers*/ undefined, name, typeParameters, 
    /*heritageClauses*/ undefined, typeElements);
    setTextRange(newTypeNode, (_a = typeElements[0]) === null || _a === void 0 ? void 0 : _a.parent);
    changes.insertNodeBefore(file, enclosingNode, ignoreSourceNewlines(newTypeNode), /*blankLineBetween*/ true);
    const { firstTypeNode, lastTypeNode } = getNodesToEdit(info);
    changes.replaceNodeRange(file, firstTypeNode, lastTypeNode, factory.createTypeReferenceNode(name, typeParameters.map(id => factory.createTypeReferenceNode(id.name, /*typeArguments*/ undefined))), { leadingTriviaOption: textChanges.LeadingTriviaOption.Exclude, trailingTriviaOption: textChanges.TrailingTriviaOption.ExcludeWhitespace });
}
function doTypedefChange(changes, context, file, name, info) {
    var _a;
    toArray(info.selection).forEach(typeNode => {
        setEmitFlags(typeNode, EmitFlags.NoComments | EmitFlags.NoNestedComments);
    });
    const { enclosingNode, typeParameters } = info;
    const { firstTypeNode, lastTypeNode, newTypeNode } = getNodesToEdit(info);
    const node = factory.createJSDocTypedefTag(factory.createIdentifier("typedef"), factory.createJSDocTypeExpression(newTypeNode), factory.createIdentifier(name));
    const templates = [];
    forEach(typeParameters, typeParameter => {
        const constraint = getEffectiveConstraintOfTypeParameter(typeParameter);
        const parameter = factory.createTypeParameterDeclaration(/*modifiers*/ undefined, typeParameter.name);
        const template = factory.createJSDocTemplateTag(factory.createIdentifier("template"), constraint && cast(constraint, isJSDocTypeExpression), [parameter]);
        templates.push(template);
    });
    const jsDoc = factory.createJSDocComment(/*comment*/ undefined, factory.createNodeArray(concatenate(templates, [node])));
    if (isJSDoc(enclosingNode)) {
        const pos = enclosingNode.getStart(file);
        const newLineCharacter = getNewLineOrDefaultFromHost(context.host, (_a = context.formatContext) === null || _a === void 0 ? void 0 : _a.options);
        changes.insertNodeAt(file, enclosingNode.getStart(file), jsDoc, {
            suffix: newLineCharacter + newLineCharacter + file.text.slice(getPrecedingNonSpaceCharacterPosition(file.text, pos - 1), pos),
        });
    }
    else {
        changes.insertNodeBefore(file, enclosingNode, jsDoc, /*blankLineBetween*/ true);
    }
    changes.replaceNodeRange(file, firstTypeNode, lastTypeNode, factory.createTypeReferenceNode(name, typeParameters.map(id => factory.createTypeReferenceNode(id.name, /*typeArguments*/ undefined))));
}
function getNodesToEdit(info) {
    if (isArray(info.selection)) {
        return {
            firstTypeNode: info.selection[0],
            lastTypeNode: info.selection[info.selection.length - 1],
            newTypeNode: isUnionTypeNode(info.selection[0].parent) ? factory.createUnionTypeNode(info.selection) : factory.createIntersectionTypeNode(info.selection),
        };
    }
    return {
        firstTypeNode: info.selection,
        lastTypeNode: info.selection,
        newTypeNode: info.selection,
    };
}
function getEnclosingNode(node, isJS) {
    return findAncestor(node, isStatement) || (isJS ? findAncestor(node, isJSDoc) : undefined);
}
function getExpandedSelectionNode(firstType, enclosingNode) {
    var _a;
    // intended to capture the entire type in cases where the user selection is not exactly the entire type
    // currently only implemented for union and intersection types
    return (_a = findAncestor(firstType, node => {
        if (node === enclosingNode)
            return "quit";
        if (isUnionTypeNode(node.parent) || isIntersectionTypeNode(node.parent)) {
            return true;
        }
        return false;
    })) !== null && _a !== void 0 ? _a : firstType;
}
