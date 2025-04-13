import * as ts from "../typescript/typescript.js";
/** @internal */
export function getLogLevel(level) {
    if (level) {
        const l = level.toLowerCase();
        for (const name in ts.server.LogLevel) {
            if (isNaN(+name) && l === name.toLowerCase()) {
                return ts.server.LogLevel[name];
            }
        }
    }
    return undefined;
}
