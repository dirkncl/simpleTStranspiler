import { Debug, formatStringFromArgs, noop, Version, version, } from "./namespaces/ts.js";

export let enableDeprecationWarnings = true;

export function setEnableDeprecationWarnings(value) {
    enableDeprecationWarnings = value;
}

let typeScriptVersion;

function getTypeScriptVersion() {
    return typeScriptVersion !== null && typeScriptVersion !== void 0 ? typeScriptVersion : (typeScriptVersion = new Version(version));
}

function formatDeprecationMessage(name, error, errorAfter, since, message) {
    let deprecationMessage = error ? "DeprecationError: " : "DeprecationWarning: ";
    deprecationMessage += `'${name}' `;
    deprecationMessage += since ? `has been deprecated since v${since}` : "is deprecated";
    deprecationMessage += error ? " and can no longer be used." : errorAfter ? ` and will no longer be usable after v${errorAfter}.` : ".";
    deprecationMessage += message ? ` ${formatStringFromArgs(message, [name])}` : "";
    return deprecationMessage;
}

function createErrorDeprecation(name, errorAfter, since, message) {
    const deprecationMessage = formatDeprecationMessage(name, /*error*/ true, errorAfter, since, message);
    return () => {
        throw new TypeError(deprecationMessage);
    };
}

function createWarningDeprecation(name, errorAfter, since, message) {
    let hasWrittenDeprecation = false;
    return () => {
        if (enableDeprecationWarnings && !hasWrittenDeprecation) {
            Debug.log.warn(formatDeprecationMessage(name, /*error*/ false, errorAfter, since, message));
            hasWrittenDeprecation = true;
        }
    };
}

export function createDeprecation(name, options = {}) {
    var _a, _b;
    const version = typeof options.typeScriptVersion === "string" ? new Version(options.typeScriptVersion) : (_a = options.typeScriptVersion) !== null && _a !== void 0 ? _a : getTypeScriptVersion();
    const errorAfter = typeof options.errorAfter === "string" ? new Version(options.errorAfter) : options.errorAfter;
    const warnAfter = typeof options.warnAfter === "string" ? new Version(options.warnAfter) : options.warnAfter;
    const since = typeof options.since === "string" ? new Version(options.since) : (_b = options.since) !== null && _b !== void 0 ? _b : warnAfter;
    const error = options.error || errorAfter && version.compareTo(errorAfter) >= 0;
    const warn = !warnAfter || version.compareTo(warnAfter) >= 0;
    return error ? createErrorDeprecation(name, errorAfter, since, options.message) :
        warn ? createWarningDeprecation(name, errorAfter, since, options.message) :
            noop;
}

function wrapFunction(deprecation, func) {
    return function () {
        deprecation();
        // eslint-disable-next-line prefer-rest-params
        return func.apply(this, arguments);
    };
}

export function deprecate(func, options) {
    var _a;
    const deprecation = createDeprecation((_a = options === null || options === void 0 ? void 0 : options.name) !== null && _a !== void 0 ? _a : Debug.getFunctionName(func), options);
    return wrapFunction(deprecation, func);
}
