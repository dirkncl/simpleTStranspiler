import { concatenate, factory, fixupCompilerOptions, isArray, transformNodes, } from "./namespaces/ts.js";

/**
 * Transform one or more nodes using the supplied transformers.
 * @param source A single `Node` or an array of `Node` objects.
 * @param transformers An array of `TransformerFactory` callbacks used to process the transformation.
 * @param compilerOptions Optional compiler options.
 */
export function transform(source, transformers, compilerOptions) {
    const diagnostics = [];
    compilerOptions = fixupCompilerOptions(compilerOptions, diagnostics); // TODO: GH#18217
    const nodes = isArray(source) ? source : [source];
    const result = transformNodes(/*resolver*/ undefined, /*host*/ undefined, factory, compilerOptions, nodes, transformers, /*allowDtsFiles*/ true);
    result.diagnostics = concatenate(result.diagnostics, diagnostics);
    return result;
}
