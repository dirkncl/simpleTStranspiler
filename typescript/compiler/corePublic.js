// WARNING: The script `configurePrerelease.ts` uses a regexp to parse out these values.
// If changing the text in this section, be sure to test `configurePrerelease` too.
export const versionMajorMinor = "5.9";

// The following is baselined as a literal template type without intervention
/** The version of the TypeScript compiler release */
export const version = `${versionMajorMinor}.0-dev`;

// /** @internal */
// export const enum Comparison {
//     LessThan = -1,
//     EqualTo = 0,
//     GreaterThan = 1,
// }
/** @internal */
export var Comparison;
(function (Comparison) {
    Comparison[Comparison["LessThan"] = -1] = "LessThan";
    Comparison[Comparison["EqualTo"] = 0] = "EqualTo";
    Comparison[Comparison["GreaterThan"] = 1] = "GreaterThan";
})(Comparison || (Comparison = {}));
