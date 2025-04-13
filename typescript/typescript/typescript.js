import { Debug, LogLevel, } from "./namespaces/ts.js";
if (typeof console !== "undefined") {
    Debug.loggingHost = {
        log(level, s) {
            switch (level) {
                case LogLevel.Error:
                    return console.error(s);
                case LogLevel.Warning:
                    return console.warn(s);
                case LogLevel.Info:
                    return console.log(s);
                case LogLevel.Verbose:
                    return console.log(s);
            }
        },
    };
}
export * from "./namespaces/ts.js";
