import {
  Debug,
  noop,
  sys,
  timestamp,
  tryGetNativePerformanceHooks,
} from "./namespaces/ts.js";

let perfHooks;

// when set, indicates the implementation of `Performance` to use for user timing.
// when unset, indicates user timing is unavailable or disabled.
let performanceImpl;

/** @internal */
export function createTimerIf(condition, measureName, startMarkName, endMarkName) {
    return condition ? createTimer(measureName, startMarkName, endMarkName) : nullTimer;
}

/** @internal */
export function createTimer(measureName, startMarkName, endMarkName) {
    let enterCount = 0;
    return {
        enter,
        exit,
    };
    function enter() {
        if (++enterCount === 1) {
            mark(startMarkName);
        }
    }
    function exit() {
        if (--enterCount === 0) {
            mark(endMarkName);
            measure(measureName, startMarkName, endMarkName);
        }
        else if (enterCount < 0) {
            Debug.fail("enter/exit count does not match.");
        }
    }
}

/** @internal */
export const nullTimer = { enter: noop, exit: noop };

let enabled = false;
let timeorigin = timestamp();

const marks = new Map();
const counts = new Map();
const durations = new Map();

/**
 * Marks a performance event.
 *
 * @param markName The name of the mark.
 *
 * @internal
 */
export function mark(markName) {
    var _a;
    if (enabled) {
        const count = (_a = counts.get(markName)) !== null && _a !== void 0 ? _a : 0;
        counts.set(markName, count + 1);
        marks.set(markName, timestamp());
        performanceImpl === null || performanceImpl === void 0 ? void 0 : performanceImpl.mark(markName);
        if (typeof onProfilerEvent === "function") {
            onProfilerEvent(markName);
        }
    }
}

/**
 * Adds a performance measurement with the specified name.
 *
 * @param measureName The name of the performance measurement.
 * @param startMarkName The name of the starting mark. If not supplied, the point at which the
 *      profiler was enabled is used.
 * @param endMarkName The name of the ending mark. If not supplied, the current timestamp is
 *      used.
 *
 * @internal
 */
export function measure(measureName, startMarkName, endMarkName) {
    var _a, _b;
    if (enabled) {
        const end = (_a = (endMarkName !== undefined ? marks.get(endMarkName) : undefined)) !== null && _a !== void 0 ? _a : timestamp();
        const start = (_b = (startMarkName !== undefined ? marks.get(startMarkName) : undefined)) !== null && _b !== void 0 ? _b : timeorigin;
        const previousDuration = durations.get(measureName) || 0;
        durations.set(measureName, previousDuration + (end - start));
        performanceImpl === null || performanceImpl === void 0 ? void 0 : performanceImpl.measure(measureName, startMarkName, endMarkName);
    }
}
/**
 * Gets the number of times a marker was encountered.
 *
 * @param markName The name of the mark.
 *
 * @internal
 */
export function getCount(markName) {
    return counts.get(markName) || 0;
}
/**
 * Gets the total duration of all measurements with the supplied name.
 *
 * @param measureName The name of the measure whose durations should be accumulated.
 *
 * @internal
 */
export function getDuration(measureName) {
    return durations.get(measureName) || 0;
}
/**
 * Iterate over each measure, performing some action
 *
 * @param cb The action to perform for each measure
 *
 * @internal
 */
export function forEachMeasure(cb) {
    durations.forEach((duration, measureName) => cb(measureName, duration));
}
/** @internal */
export function forEachMark(cb) {
    marks.forEach((_time, markName) => cb(markName));
}
/** @internal */
export function clearMeasures(name) {
    if (name !== undefined)
        durations.delete(name);
    else
        durations.clear();
    performanceImpl === null || performanceImpl === void 0 ? void 0 : performanceImpl.clearMeasures(name);
}
/** @internal */
export function clearMarks(name) {
    if (name !== undefined) {
        counts.delete(name);
        marks.delete(name);
    }
    else {
        counts.clear();
        marks.clear();
    }
    performanceImpl === null || performanceImpl === void 0 ? void 0 : performanceImpl.clearMarks(name);
}
/**
 * Indicates whether the performance API is enabled.
 *
 * @internal
 */
export function isEnabled() {
    return enabled;
}
/**
 * Enables (and resets) performance measurements for the compiler.
 *
 * @internal
 */
export function enable(system = sys) {
    var _a;
    if (!enabled) {
        enabled = true;
        perfHooks || (perfHooks = tryGetNativePerformanceHooks());
        if (perfHooks === null || perfHooks === void 0 ? void 0 : perfHooks.performance) {
            timeorigin = perfHooks.performance.timeOrigin;
            // NodeJS's Web Performance API is currently slower than expected, but we'd still like
            // to be able to leverage native trace events when node is run with either `--cpu-prof`
            // or `--prof`, if we're running with our own `--generateCpuProfile` flag, or when
            // running in debug mode (since its possible to generate a cpu profile while debugging).
            if (perfHooks.shouldWriteNativeEvents || ((_a = system === null || system === void 0 ? void 0 : system.cpuProfilingEnabled) === null || _a === void 0 ? void 0 : _a.call(system)) || (system === null || system === void 0 ? void 0 : system.debugMode)) {
                performanceImpl = perfHooks.performance;
            }
        }
    }
    return true;
}
/**
 * Disables performance measurements for the compiler.
 *
 * @internal
 */
export function disable() {
    if (enabled) {
        marks.clear();
        counts.clear();
        durations.clear();
        performanceImpl = undefined;
        enabled = false;
    }
}
