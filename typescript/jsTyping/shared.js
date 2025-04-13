import { sys } from "./_namespaces/ts.js";
/** @internal */
export const ActionSet = "action::set";
/** @internal */
export const ActionInvalidate = "action::invalidate";
/** @internal */
export const ActionPackageInstalled = "action::packageInstalled";
/** @internal */
export const EventTypesRegistry = "event::typesRegistry";
/** @internal */
export const EventBeginInstallTypes = "event::beginInstallTypes";
/** @internal */
export const EventEndInstallTypes = "event::endInstallTypes";
/** @internal */
export const EventInitializationFailed = "event::initializationFailed";
/** @internal */
export const ActionWatchTypingLocations = "action::watchTypingLocations";
/** @internal */
export var Arguments;
(function (Arguments) {
    Arguments.GlobalCacheLocation = "--globalTypingsCacheLocation";
    Arguments.LogFile = "--logFile";
    Arguments.EnableTelemetry = "--enableTelemetry";
    Arguments.TypingSafeListLocation = "--typingSafeListLocation";
    Arguments.TypesMapLocation = "--typesMapLocation";
    /**
     * This argument specifies the location of the NPM executable.
     * typingsInstaller will run the command with `${npmLocation} install ...`.
     */
    Arguments.NpmLocation = "--npmLocation";
    /**
     * Flag indicating that the typings installer should try to validate the default npm location.
     * If the default npm is not found when this flag is enabled, fallback to `npm install`
     */
    Arguments.ValidateDefaultNpmLocation = "--validateDefaultNpmLocation";
})(Arguments || (Arguments = {}));
/** @internal */
export function hasArgument(argumentName) {
    return sys.args.includes(argumentName);
}
/** @internal */
export function findArgument(argumentName) {
    const index = sys.args.indexOf(argumentName);
    return index >= 0 && index < sys.args.length - 1
        ? sys.args[index + 1]
        : undefined;
}
/** @internal */
export function nowString() {
    // E.g. "12:34:56.789"
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}
const indentStr = "\n    ";
/** @internal */
export function indent(str) {
    return indentStr + str.replace(/\n/g, indentStr);
}
/**
 * Put stringified JSON on the next line, indented.
 *
 * @internal
 */
export function stringifyIndented(json) {
    return indent(JSON.stringify(json, undefined, 2));
}
