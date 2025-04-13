import {
  clear,
  forEach,
  getOwnValues,
  getSymbolId,
  ObjectFlags,
  SyntaxKind,
  TypeFlags,
} from "./_namespaces/ts.js";

/** @internal */
export function createGetSymbolWalker(getRestTypeOfSignature, getTypePredicateOfSignature, getReturnTypeOfSignature, getBaseTypes, resolveStructuredTypeMembers, getTypeOfSymbol, getResolvedSymbol, getConstraintOfTypeParameter, getFirstIdentifier, getTypeArguments) {
    return getSymbolWalker;
    function getSymbolWalker(accept = () => true) {
        const visitedTypes = []; // Sparse array from id to type
        const visitedSymbols = []; // Sparse array from id to symbol
        return {
            walkType: type => {
                try {
                    visitType(type);
                    return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
                }
                finally {
                    clear(visitedTypes);
                    clear(visitedSymbols);
                }
            },
            walkSymbol: symbol => {
                try {
                    visitSymbol(symbol);
                    return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
                }
                finally {
                    clear(visitedTypes);
                    clear(visitedSymbols);
                }
            },
        };
        function visitType(type) {
            if (!type) {
                return;
            }
            if (visitedTypes[type.id]) {
                return;
            }
            visitedTypes[type.id] = type;
            // Reuse visitSymbol to visit the type's symbol,
            //  but be sure to bail on recuring into the type if accept declines the symbol.
            const shouldBail = visitSymbol(type.symbol);
            if (shouldBail)
                return;
            // Visit the type's related types, if any
            if (type.flags & TypeFlags.Object) {
                const objectType = type;
                const objectFlags = objectType.objectFlags;
                if (objectFlags & ObjectFlags.Reference) {
                    visitTypeReference(type);
                }
                if (objectFlags & ObjectFlags.Mapped) {
                    visitMappedType(type);
                }
                if (objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) {
                    visitInterfaceType(type);
                }
                if (objectFlags & (ObjectFlags.Tuple | ObjectFlags.Anonymous)) {
                    visitObjectType(objectType);
                }
            }
            if (type.flags & TypeFlags.TypeParameter) {
                visitTypeParameter(type);
            }
            if (type.flags & TypeFlags.UnionOrIntersection) {
                visitUnionOrIntersectionType(type);
            }
            if (type.flags & TypeFlags.Index) {
                visitIndexType(type);
            }
            if (type.flags & TypeFlags.IndexedAccess) {
                visitIndexedAccessType(type);
            }
        }
        function visitTypeReference(type) {
            visitType(type.target);
            forEach(getTypeArguments(type), visitType);
        }
        function visitTypeParameter(type) {
            visitType(getConstraintOfTypeParameter(type));
        }
        function visitUnionOrIntersectionType(type) {
            forEach(type.types, visitType);
        }
        function visitIndexType(type) {
            visitType(type.type);
        }
        function visitIndexedAccessType(type) {
            visitType(type.objectType);
            visitType(type.indexType);
            visitType(type.constraint);
        }
        function visitMappedType(type) {
            visitType(type.typeParameter);
            visitType(type.constraintType);
            visitType(type.templateType);
            visitType(type.modifiersType);
        }
        function visitSignature(signature) {
            const typePredicate = getTypePredicateOfSignature(signature);
            if (typePredicate) {
                visitType(typePredicate.type);
            }
            forEach(signature.typeParameters, visitType);
            for (const parameter of signature.parameters) {
                visitSymbol(parameter);
            }
            visitType(getRestTypeOfSignature(signature));
            visitType(getReturnTypeOfSignature(signature));
        }
        function visitInterfaceType(interfaceT) {
            visitObjectType(interfaceT);
            forEach(interfaceT.typeParameters, visitType);
            forEach(getBaseTypes(interfaceT), visitType);
            visitType(interfaceT.thisType);
        }
        function visitObjectType(type) {
            const resolved = resolveStructuredTypeMembers(type);
            for (const info of resolved.indexInfos) {
                visitType(info.keyType);
                visitType(info.type);
            }
            for (const signature of resolved.callSignatures) {
                visitSignature(signature);
            }
            for (const signature of resolved.constructSignatures) {
                visitSignature(signature);
            }
            for (const p of resolved.properties) {
                visitSymbol(p);
            }
        }
        function visitSymbol(symbol) {
            if (!symbol) {
                return false;
            }
            const symbolId = getSymbolId(symbol);
            if (visitedSymbols[symbolId]) {
                return false;
            }
            visitedSymbols[symbolId] = symbol;
            if (!accept(symbol)) {
                return true;
            }
            const t = getTypeOfSymbol(symbol);
            visitType(t); // Should handle members on classes and such
            if (symbol.exports) {
                symbol.exports.forEach(visitSymbol);
            }
            forEach(symbol.declarations, d => {
                // Type queries are too far resolved when we just visit the symbol's type
                //  (their type resolved directly to the member deeply referenced)
                // So to get the intervening symbols, we need to check if there's a type
                // query node on any of the symbol's declarations and get symbols there
                if (d.type && d.type.kind === SyntaxKind.TypeQuery) {
                    const query = d.type;
                    const entity = getResolvedSymbol(getFirstIdentifier(query.exprName));
                    visitSymbol(entity);
                }
            });
            return false;
        }
    }
}
