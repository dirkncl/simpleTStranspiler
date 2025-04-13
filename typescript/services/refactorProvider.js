import { arrayFrom, flatMapIterator, } from "./_namespaces/ts.js";
import { refactorKindBeginsWith } from "./_namespaces/ts.refactor.js";
// A map with the refactor code as key, the refactor itself as value
// e.g.  nonSuggestableRefactors[refactorCode] -> the refactor you want
const refactors = new Map();
/**
 * @param name An unique code associated with each refactor. Does not have to be human-readable.
 *
 * @internal
 */
export function registerRefactor(name, refactor) {
    refactors.set(name, refactor);
}
/** @internal */
export function getApplicableRefactors(context, includeInteractiveActions) {
    return arrayFrom(flatMapIterator(refactors.values(), refactor => {
        var _a;
        return context.cancellationToken && context.cancellationToken.isCancellationRequested() ||
            !((_a = refactor.kinds) === null || _a === void 0 ? void 0 : _a.some(kind => refactorKindBeginsWith(kind, context.kind))) ? undefined :
            refactor.getAvailableActions(context, includeInteractiveActions);
    }));
}
/** @internal */
export function getEditsForRefactor(context, refactorName, actionName, interactiveRefactorArguments) {
    const refactor = refactors.get(refactorName);
    return refactor && refactor.getEditsForAction(context, actionName, interactiveRefactorArguments);
}
