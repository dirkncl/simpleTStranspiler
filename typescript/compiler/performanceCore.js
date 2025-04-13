import { isNodeLikeSystem } from "./_namespaces/ts.js";

function tryGetPerformance() {
    if (isNodeLikeSystem()) {
        try {
            // By default, only write native events when generating a cpu profile or using the v8 profiler.
            // Some environments may polyfill this module with an empty object; verify the object has the expected shape.
            const { performance } = require("perf_hooks");
            if (performance) {
                return {
                    shouldWriteNativeEvents: false,
                    performance,
                };
            }
        }
        catch (_a) {
            // ignore errors
        }
    }
    if (typeof performance === "object") {
        // For now we always write native performance events when running in the browser. We may
        // make this conditional in the future if we find that native web performance hooks
        // in the browser also slow down compilation.
        return {
            shouldWriteNativeEvents: true,
            performance,
        };
    }
    return undefined;
}

function tryGetPerformanceHooks() {
    const p = tryGetPerformance();
    if (!p)
        return undefined;
    const { shouldWriteNativeEvents, performance } = p;
    const hooks = {
        shouldWriteNativeEvents,
        performance: undefined,
        performanceTime: undefined,
    };
    if (typeof performance.timeOrigin === "number" && typeof performance.now === "function") {
        hooks.performanceTime = performance;
    }
    if (hooks.performanceTime &&
        typeof performance.mark === "function" &&
        typeof performance.measure === "function" &&
        typeof performance.clearMarks === "function" &&
        typeof performance.clearMeasures === "function") {
        hooks.performance = performance;
    }
    return hooks;
}

const nativePerformanceHooks = tryGetPerformanceHooks();

const nativePerformanceTime = nativePerformanceHooks === null || nativePerformanceHooks === void 0 ? void 0 : nativePerformanceHooks.performanceTime;

/** @internal */
export function tryGetNativePerformanceHooks() {
    return nativePerformanceHooks;
}

/**
 * Gets a timestamp with (at least) ms resolution
 *
 * @internal
 */
export const timestamp = nativePerformanceTime ? () => nativePerformanceTime.now() : Date.now;
