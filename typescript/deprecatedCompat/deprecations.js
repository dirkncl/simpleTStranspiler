import { hasProperty, } from "./namespaces/ts.js";
import { deprecate } from "./deprecate.js";

/** @internal @knipignore */
export function createOverload(name, overloads, binder, deprecations) {
    Object.defineProperty(call, "name", Object.assign(Object.assign({}, Object.getOwnPropertyDescriptor(call, "name")), { value: name }));
    if (deprecations) {
        for (const key of Object.keys(deprecations)) {
            const index = +key;
            if (!isNaN(index) && hasProperty(overloads, `${index}`)) {
                overloads[index] = deprecate(overloads[index], Object.assign(Object.assign({}, deprecations[index]), { name }));
            }
        }
    }
    const bind = createBinder(overloads, binder);
    return call;
    function call(...args) {
        const index = bind(args);
        const fn = index !== undefined ? overloads[index] : undefined;
        if (typeof fn === "function") {
            return fn(...args);
        }
        throw new TypeError("Invalid arguments");
    }
}

function createBinder(overloads, binder) {
    return args => {
        for (let i = 0; hasProperty(overloads, `${i}`) && hasProperty(binder, `${i}`); i++) {
            const fn = binder[i];
            if (fn(args)) {
                return i;
            }
        }
    };
}

// NOTE: We only use this "builder" because we don't infer correctly when calling `createOverload` directly in < TS 4.7,
//       but lib is currently at TS 4.4. We can switch to directly calling `createOverload` when we update LKG in main.
/** @internal @knipignore */
export function buildOverload(name) {
    return {
        overload: overloads => ({
            bind: binder => ({
                finish: () => createOverload(name, overloads, binder),
                deprecate: deprecations => ({
                    finish: () => createOverload(name, overloads, binder, deprecations),
                }),
            }),
        }),
    };
}
