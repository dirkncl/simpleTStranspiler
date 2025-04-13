import {
  arrayFrom,
  cast,
  computeSuggestionDiagnostics,
  contains,
  createMultiMap,
  Debug,
  diagnosticToString,
  flatMap,
  getEmitDeclarations,
  isString,
  map,
  textChanges,
} from "./namespaces/ts.js";

const errorCodeToFixes = createMultiMap();
const fixIdToRegistration = new Map();

/** @internal */
export function createCodeFixActionWithoutFixAll(fixName, changes, description) {
    return createCodeFixActionWorker(fixName, diagnosticToString(description), changes, /*fixId*/ undefined, /*fixAllDescription*/ undefined);
}

/** @internal */
export function createCodeFixAction(fixName, changes, description, fixId, fixAllDescription, command) {
    return createCodeFixActionWorker(fixName, diagnosticToString(description), changes, fixId, diagnosticToString(fixAllDescription), command);
}
/** @internal */
export function createCodeFixActionMaybeFixAll(fixName, changes, description, fixId, fixAllDescription, command) {
    return createCodeFixActionWorker(fixName, diagnosticToString(description), changes, fixId, fixAllDescription && diagnosticToString(fixAllDescription), command);
}
function createCodeFixActionWorker(fixName, description, changes, fixId, fixAllDescription, command) {
    return { fixName, description, changes, fixId, fixAllDescription, commands: command ? [command] : undefined };
}
/** @internal */
export function registerCodeFix(reg) {
    for (const error of reg.errorCodes) {
        errorCodeToFixesArray = undefined;
        errorCodeToFixes.add(String(error), reg);
    }
    if (reg.fixIds) {
        for (const fixId of reg.fixIds) {
            Debug.assert(!fixIdToRegistration.has(fixId));
            fixIdToRegistration.set(fixId, reg);
        }
    }
}
let errorCodeToFixesArray;
/** @internal */
export function getSupportedErrorCodes() {
    return errorCodeToFixesArray !== null && errorCodeToFixesArray !== void 0 ? errorCodeToFixesArray : (errorCodeToFixesArray = arrayFrom(errorCodeToFixes.keys()));
}
function removeFixIdIfFixAllUnavailable(registration, diagnostics) {
    const { errorCodes } = registration;
    let maybeFixableDiagnostics = 0;
    for (const diag of diagnostics) {
        if (contains(errorCodes, diag.code))
            maybeFixableDiagnostics++;
        if (maybeFixableDiagnostics > 1)
            break;
    }
    const fixAllUnavailable = maybeFixableDiagnostics < 2;
    return ({ fixId, fixAllDescription, ...action }) => {
        return fixAllUnavailable ? action : { ...action, fixId, fixAllDescription };
    };
}
/** @internal */
export function getFixes(context) {
    const diagnostics = getDiagnostics(context);
    const registrations = errorCodeToFixes.get(String(context.errorCode));
    return flatMap(registrations, f => map(f.getCodeActions(context), removeFixIdIfFixAllUnavailable(f, diagnostics)));
}
/** @internal */
export function getAllFixes(context) {
    // Currently fixId is always a string.
    return fixIdToRegistration.get(cast(context.fixId, isString)).getAllCodeActions(context);
}
/** @internal */
export function createCombinedCodeActions(changes, commands) {
    return { changes, commands };
}
/** @internal */
export function createFileTextChanges(fileName, textChanges) {
    return { fileName, textChanges };
}
/** @internal */
export function codeFixAll(context, errorCodes, use) {
    const commands = [];
    const changes = textChanges.ChangeTracker.with(context, t => eachDiagnostic(context, errorCodes, diag => use(t, diag, commands)));
    return createCombinedCodeActions(changes, commands.length === 0 ? undefined : commands);
}
/** @internal */
export function eachDiagnostic(context, errorCodes, cb) {
    for (const diag of getDiagnostics(context)) {
        if (contains(errorCodes, diag.code)) {
            cb(diag);
        }
    }
}
function getDiagnostics({ program, sourceFile, cancellationToken }) {
    const diagnostics = [
        ...program.getSemanticDiagnostics(sourceFile, cancellationToken),
        ...program.getSyntacticDiagnostics(sourceFile, cancellationToken),
        ...computeSuggestionDiagnostics(sourceFile, program, cancellationToken),
    ];
    if (getEmitDeclarations(program.getCompilerOptions())) {
        diagnostics.push(...program.getDeclarationDiagnostics(sourceFile, cancellationToken));
    }
    return diagnostics;
}
