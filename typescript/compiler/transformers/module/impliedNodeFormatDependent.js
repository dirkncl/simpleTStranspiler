import {
  Debug,
  isSourceFile,
  map,
  ModuleKind,
  SyntaxKind,
  transformECMAScriptModule,
  transformModule,
} from "../../_namespaces/ts.js";


/** @internal */
export function transformImpliedNodeFormatDependentModule(context) {
    const previousOnSubstituteNode = context.onSubstituteNode;
    const previousOnEmitNode = context.onEmitNode;
    const esmTransform = transformECMAScriptModule(context);
    const esmOnSubstituteNode = context.onSubstituteNode;
    const esmOnEmitNode = context.onEmitNode;
    context.onSubstituteNode = previousOnSubstituteNode;
    context.onEmitNode = previousOnEmitNode;
    const cjsTransform = transformModule(context);
    const cjsOnSubstituteNode = context.onSubstituteNode;
    const cjsOnEmitNode = context.onEmitNode;
    const getEmitModuleFormatOfFile = (file) => context.getEmitHost().getEmitModuleFormatOfFile(file);
    context.onSubstituteNode = onSubstituteNode;
    context.onEmitNode = onEmitNode;
    context.enableSubstitution(SyntaxKind.SourceFile);
    context.enableEmitNotification(SyntaxKind.SourceFile);
    let currentSourceFile;
    return transformSourceFileOrBundle;
    function onSubstituteNode(hint, node) {
        if (isSourceFile(node)) {
            currentSourceFile = node;
            // Neither component transform wants substitution notifications for `SourceFile`s, and, in fact, relies on
            // the source file emit notification to setup scope variables for substitutions (so we _cannot_ call their substitute
            // functions on source files safely, as that context only gets setup in a later pipeline phase!)
            return previousOnSubstituteNode(hint, node);
        }
        else {
            if (!currentSourceFile) {
                return previousOnSubstituteNode(hint, node);
            }
            if (getEmitModuleFormatOfFile(currentSourceFile) >= ModuleKind.ES2015) {
                return esmOnSubstituteNode(hint, node);
            }
            return cjsOnSubstituteNode(hint, node);
        }
    }
    function onEmitNode(hint, node, emitCallback) {
        if (isSourceFile(node)) {
            currentSourceFile = node;
        }
        if (!currentSourceFile) {
            return previousOnEmitNode(hint, node, emitCallback);
        }
        if (getEmitModuleFormatOfFile(currentSourceFile) >= ModuleKind.ES2015) {
            return esmOnEmitNode(hint, node, emitCallback);
        }
        return cjsOnEmitNode(hint, node, emitCallback);
    }
    function getModuleTransformForFile(file) {
        return getEmitModuleFormatOfFile(file) >= ModuleKind.ES2015 ? esmTransform : cjsTransform;
    }
    function transformSourceFile(node) {
        if (node.isDeclarationFile) {
            return node;
        }
        currentSourceFile = node;
        const result = getModuleTransformForFile(node)(node);
        currentSourceFile = undefined;
        Debug.assert(isSourceFile(result));
        return result;
    }
    function transformSourceFileOrBundle(node) {
        return node.kind === SyntaxKind.SourceFile ? transformSourceFile(node) : transformBundle(node);
    }
    function transformBundle(node) {
        return context.factory.createBundle(map(node.sourceFiles, transformSourceFile));
    }
}
