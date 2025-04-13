import {
  CompletionKind,
  createCompletionDetails,
  createCompletionDetailsForSymbol,
  getCompletionEntriesFromSymbols,
  getDefaultCommitCharacters,
  getPropertiesForObjectExpression,
  SortText,
} from "./namespaces/ts.Completions.js";

import {
  addToSeen,
  altDirectorySeparator,
  arrayFrom,
  changeExtension,
  CharacterCodes,
  combinePaths,
  comparePaths,
  comparePatternKeys,
  compareStringsCaseSensitive,
  compareValues,
  Comparison,
  concatenate,
  contains,
  containsPath,
  ContextFlags,
  createModuleSpecifierResolutionHost,
  createSortedArray,
  createTextSpan,
  createTextSpanFromStringLiteralLikeContent,
  Debug,
  deduplicate,
  directorySeparator,
  emptyArray,
  endsWith,
  ensureTrailingDirectorySeparator,
  equateStringsCaseSensitive,
  escapeString,
  Extension,
  fileExtensionIsOneOf,
  filter,
  find,
  findAncestor,
  findPackageJson,
  findPackageJsons,
  firstDefined,
  firstOrUndefined,
  flatMap,
  flatten,
  forEachAncestorDirectoryStoppingAtGlobalCache,
  getBaseFileName,
  getConditions,
  getContextualTypeFromParent,
  getDeclarationEmitExtensionForPath,
  getDirectoryPath,
  getEffectiveTypeRoots,
  getEmitModuleResolutionKind,
  getLeadingCommentRanges,
  getOwnKeys,
  getPackageJsonTypesVersionsPaths,
  getPathComponents,
  getPathsBasePath,
  getPossibleOriginalInputExtensionForExtension,
  getPossibleOriginalInputPathWithoutChangingExt,
  getReplacementSpanForContextToken,
  getResolvePackageJsonExports,
  getResolvePackageJsonImports,
  getSupportedExtensions,
  getSupportedExtensionsWithJsonIfResolveJsonModule,
  getTextOfJsxAttributeName,
  getTextOfNode,
  getTokenAtPosition,
  hasIndexSignature,
  hasProperty,
  hasTrailingDirectorySeparator,
  hostGetCanonicalFileName,
  hostUsesCaseSensitiveFileNames,
  InternalSymbolName,
  isApplicableVersionedTypesKey,
  isArray,
  isCallExpression,
  isIdentifier,
  isIdentifierText,
  isImportCall,
  isInReferenceComment,
  isInString,
  isJsxAttribute,
  isJsxOpeningLikeElement,
  isLiteralTypeNode,
  isObjectLiteralExpression,
  isPatternMatch,
  isPrivateIdentifierClassElementDeclaration,
  isRootedDiskPath,
  isString,
  isStringLiteral,
  isStringLiteralLike,
  isUrl,
  length,
  mapDefined,
  moduleExportNameTextEscaped,
  moduleResolutionUsesNodeModules,
  ModuleSpecifierEnding,
  moduleSpecifiers,
  newCaseClauseTracker,
  normalizePath,
  normalizeSlashes,
  rangeContainsPosition,
  readJson,
  removeFileExtension,
  removePrefix,
  removeTrailingDirectorySeparator,
  resolvePath,
  ScriptElementKind,
  ScriptElementKindModifier,
  ScriptTarget,
  signatureHasRestParameter,
  SignatureHelp,
  singleElementArray,
  skipConstraint,
  skipParentheses,
  startsWith,
  stripQuotes,
  supportedTSImplementationExtensions,
  SyntaxKind,
  textPart,
  tryAndIgnoreErrors,
  tryDirectoryExists,
  tryFileExists,
  tryGetDirectories,
  tryGetExtensionFromPath,
  tryParsePattern,
  tryReadDirectory,
  tryRemoveDirectoryPrefix,
  tryRemovePrefix,
  TypeFlags,
  unmangleScopedPackageName,
  walkUpParenthesizedExpressions,
  walkUpParenthesizedTypes,
} from "./namespaces/ts.js";


const kindPrecedence = {
    [ScriptElementKind.directory]: 0,
    [ScriptElementKind.scriptElement]: 1,
    [ScriptElementKind.externalModuleName]: 2,
};

function createNameAndKindSet() {
    const map = new Map();
    function add(value) {
        const existing = map.get(value.name);
        if (!existing || kindPrecedence[existing.kind] < kindPrecedence[value.kind]) {
            map.set(value.name, value);
        }
    }
    return {
        add,
        has: map.has.bind(map),
        values: map.values.bind(map),
    };
}

/** @internal */
export function getStringLiteralCompletions(sourceFile, position, contextToken, options, host, program, log, preferences, includeSymbol) {
    if (isInReferenceComment(sourceFile, position)) {
        const entries = getTripleSlashReferenceCompletion(sourceFile, position, program, host, createModuleSpecifierResolutionHost(program, host));
        return entries && convertPathCompletions(entries);
    }
    if (isInString(sourceFile, position, contextToken)) {
        if (!contextToken || !isStringLiteralLike(contextToken))
            return undefined;
        const entries = getStringLiteralCompletionEntries(sourceFile, contextToken, position, program, host, preferences);
        return convertStringLiteralCompletions(entries, contextToken, sourceFile, host, program, log, options, preferences, position, includeSymbol);
    }
}
function convertStringLiteralCompletions(completion, contextToken, sourceFile, host, program, log, options, preferences, position, includeSymbol) {
    if (completion === undefined) {
        return undefined;
    }
    const optionalReplacementSpan = createTextSpanFromStringLiteralLikeContent(contextToken, position);
    switch (completion.kind) {
        case 0 /* StringLiteralCompletionKind.Paths */:
            return convertPathCompletions(completion.paths);
        case 1 /* StringLiteralCompletionKind.Properties */: {
            const entries = createSortedArray();
            getCompletionEntriesFromSymbols(completion.symbols, entries, contextToken, contextToken, sourceFile, position, sourceFile, host, program, ScriptTarget.ESNext, log, CompletionKind.String, preferences, options, 
            /*formatContext*/ undefined, 
            /*isTypeOnlyLocation*/ undefined, 
            /*propertyAccessToConvert*/ undefined, 
            /*jsxIdentifierExpected*/ undefined, 
            /*isJsxInitializer*/ undefined, 
            /*importStatementCompletion*/ undefined, 
            /*recommendedCompletion*/ undefined, 
            /*symbolToOriginInfoMap*/ undefined, 
            /*symbolToSortTextMap*/ undefined, 
            /*isJsxIdentifierExpected*/ undefined, 
            /*isRightOfOpenTag*/ undefined, includeSymbol); // Target will not be used, so arbitrary
            return {
                isGlobalCompletion: false,
                isMemberCompletion: true,
                isNewIdentifierLocation: completion.hasIndexSignature,
                optionalReplacementSpan,
                entries,
                defaultCommitCharacters: getDefaultCommitCharacters(completion.hasIndexSignature),
            };
        }
        case 2 /* StringLiteralCompletionKind.Types */: {
            const quoteChar = contextToken.kind === SyntaxKind.NoSubstitutionTemplateLiteral
                ? CharacterCodes.backtick
                : startsWith(getTextOfNode(contextToken), "'")
                    ? CharacterCodes.singleQuote
                    : CharacterCodes.doubleQuote;
            const entries = completion.types.map(type => ({
                name: escapeString(type.value, quoteChar),
                kindModifiers: ScriptElementKindModifier.none,
                kind: ScriptElementKind.string,
                sortText: SortText.LocationPriority,
                replacementSpan: getReplacementSpanForContextToken(contextToken, position),
                commitCharacters: [],
            }));
            return {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: completion.isNewIdentifier,
                optionalReplacementSpan,
                entries,
                defaultCommitCharacters: getDefaultCommitCharacters(completion.isNewIdentifier),
            };
        }
        default:
            return Debug.assertNever(completion);
    }
}
/** @internal */
export function getStringLiteralCompletionDetails(name, sourceFile, position, contextToken, program, host, cancellationToken, preferences) {
    if (!contextToken || !isStringLiteralLike(contextToken))
        return undefined;
    const completions = getStringLiteralCompletionEntries(sourceFile, contextToken, position, program, host, preferences);
    return completions && stringLiteralCompletionDetails(name, contextToken, completions, sourceFile, program.getTypeChecker(), cancellationToken);
}
function stringLiteralCompletionDetails(name, location, completion, sourceFile, checker, cancellationToken) {
    switch (completion.kind) {
        case 0 /* StringLiteralCompletionKind.Paths */: {
            const match = find(completion.paths, p => p.name === name);
            return match && createCompletionDetails(name, kindModifiersFromExtension(match.extension), match.kind, [textPart(name)]);
        }
        case 1 /* StringLiteralCompletionKind.Properties */: {
            const match = find(completion.symbols, s => s.name === name);
            return match && createCompletionDetailsForSymbol(match, match.name, checker, sourceFile, location, cancellationToken);
        }
        case 2 /* StringLiteralCompletionKind.Types */:
            return find(completion.types, t => t.value === name) ? createCompletionDetails(name, ScriptElementKindModifier.none, ScriptElementKind.string, [textPart(name)]) : undefined;
        default:
            return Debug.assertNever(completion);
    }
}
function convertPathCompletions(pathCompletions) {
    const isGlobalCompletion = false; // We don't want the editor to offer any other completions, such as snippets, inside a comment.
    const isNewIdentifierLocation = true; // The user may type in a path that doesn't yet exist, creating a "new identifier" with respect to the collection of identifiers the server is aware of.
    const entries = pathCompletions.map(({ name, kind, span, extension }) => ({ name, kind, kindModifiers: kindModifiersFromExtension(extension), sortText: SortText.LocationPriority, replacementSpan: span }));
    return {
        isGlobalCompletion,
        isMemberCompletion: false,
        isNewIdentifierLocation,
        entries,
        defaultCommitCharacters: getDefaultCommitCharacters(isNewIdentifierLocation),
    };
}
function kindModifiersFromExtension(extension) {
    switch (extension) {
        case Extension.Dts:
            return ScriptElementKindModifier.dtsModifier;
        case Extension.Js:
            return ScriptElementKindModifier.jsModifier;
        case Extension.Json:
            return ScriptElementKindModifier.jsonModifier;
        case Extension.Jsx:
            return ScriptElementKindModifier.jsxModifier;
        case Extension.Ts:
            return ScriptElementKindModifier.tsModifier;
        case Extension.Tsx:
            return ScriptElementKindModifier.tsxModifier;
        case Extension.Dmts:
            return ScriptElementKindModifier.dmtsModifier;
        case Extension.Mjs:
            return ScriptElementKindModifier.mjsModifier;
        case Extension.Mts:
            return ScriptElementKindModifier.mtsModifier;
        case Extension.Dcts:
            return ScriptElementKindModifier.dctsModifier;
        case Extension.Cjs:
            return ScriptElementKindModifier.cjsModifier;
        case Extension.Cts:
            return ScriptElementKindModifier.ctsModifier;
        case Extension.TsBuildInfo:
            return Debug.fail(`Extension ${Extension.TsBuildInfo} is unsupported.`);
        case undefined:
            return ScriptElementKindModifier.none;
        default:
            return Debug.assertNever(extension);
    }
}
var StringLiteralCompletionKind;
(function (StringLiteralCompletionKind) {
    StringLiteralCompletionKind[StringLiteralCompletionKind["Paths"] = 0] = "Paths";
    StringLiteralCompletionKind[StringLiteralCompletionKind["Properties"] = 1] = "Properties";
    StringLiteralCompletionKind[StringLiteralCompletionKind["Types"] = 2] = "Types";
})(StringLiteralCompletionKind || (StringLiteralCompletionKind = {}));
function getStringLiteralCompletionEntries(sourceFile, node, position, program, host, preferences) {
    const typeChecker = program.getTypeChecker();
    const parent = walkUpParentheses(node.parent);
    switch (parent.kind) {
        case SyntaxKind.LiteralType: {
            const grandParent = walkUpParentheses(parent.parent);
            if (grandParent.kind === SyntaxKind.ImportType) {
                return { kind: 0 /* StringLiteralCompletionKind.Paths */, paths: getStringLiteralCompletionsFromModuleNames(sourceFile, node, program, host, preferences) };
            }
            return fromUnionableLiteralType(grandParent);
        }
        case SyntaxKind.PropertyAssignment:
            if (isObjectLiteralExpression(parent.parent) && parent.name === node) {
                // Get quoted name of properties of the object literal expression
                // i.e. interface ConfigFiles {
                //          'jspm:dev': string
                //      }
                //      let files: ConfigFiles = {
                //          '/*completion position*/'
                //      }
                //
                //      function foo(c: ConfigFiles) {}
                //      foo({
                //          '/*completion position*/'
                //      });
                return stringLiteralCompletionsForObjectLiteral(typeChecker, parent.parent);
            }
            return fromContextualType() || fromContextualType(ContextFlags.None);
        case SyntaxKind.ElementAccessExpression: {
            const { expression, argumentExpression } = parent;
            if (node === skipParentheses(argumentExpression)) {
                // Get all names of properties on the expression
                // i.e. interface A {
                //      'prop1': string
                // }
                // let a: A;
                // a['/*completion position*/']
                return stringLiteralCompletionsFromProperties(typeChecker.getTypeAtLocation(expression));
            }
            return undefined;
        }
        case SyntaxKind.CallExpression:
        case SyntaxKind.NewExpression:
        case SyntaxKind.JsxAttribute:
            if (!isRequireCallArgument(node) && !isImportCall(parent)) {
                const argumentInfo = SignatureHelp.getArgumentInfoForCompletions(parent.kind === SyntaxKind.JsxAttribute ? parent.parent : node, position, sourceFile, typeChecker);
                // Get string literal completions from specialized signatures of the target
                // i.e. declare function f(a: 'A');
                // f("/*completion position*/")
                return argumentInfo && getStringLiteralCompletionsFromSignature(argumentInfo.invocation, node, argumentInfo, typeChecker) || fromContextualType(ContextFlags.None);
            }
        // falls through (is `require("")` or `require(""` or `import("")`)
        case SyntaxKind.ImportDeclaration:
        case SyntaxKind.ExportDeclaration:
        case SyntaxKind.ExternalModuleReference:
        case SyntaxKind.JSDocImportTag:
            // Get all known external module names or complete a path to a module
            // i.e. import * as ns from "/*completion position*/";
            //      var y = import("/*completion position*/");
            //      import x = require("/*completion position*/");
            //      var y = require("/*completion position*/");
            //      export * from "/*completion position*/";
            return { kind: 0 /* StringLiteralCompletionKind.Paths */, paths: getStringLiteralCompletionsFromModuleNames(sourceFile, node, program, host, preferences) };
        case SyntaxKind.CaseClause:
            const tracker = newCaseClauseTracker(typeChecker, parent.parent.clauses);
            const contextualTypes = fromContextualType();
            if (!contextualTypes) {
                return;
            }
            const literals = contextualTypes.types.filter(literal => !tracker.hasValue(literal.value));
            return { kind: 2 /* StringLiteralCompletionKind.Types */, types: literals, isNewIdentifier: false };
        case SyntaxKind.ImportSpecifier:
        case SyntaxKind.ExportSpecifier:
            // Complete string aliases in `import { "|" } from` and `export { "|" } from`
            const specifier = parent;
            if (specifier.propertyName && node !== specifier.propertyName) {
                return; // Don't complete in `export { "..." as "|" } from`
            }
            const namedImportsOrExports = specifier.parent;
            const { moduleSpecifier } = namedImportsOrExports.kind === SyntaxKind.NamedImports ? namedImportsOrExports.parent.parent : namedImportsOrExports.parent;
            if (!moduleSpecifier)
                return;
            const moduleSpecifierSymbol = typeChecker.getSymbolAtLocation(moduleSpecifier); // TODO: GH#18217
            if (!moduleSpecifierSymbol)
                return;
            const exports = typeChecker.getExportsAndPropertiesOfModule(moduleSpecifierSymbol);
            const existing = new Set(namedImportsOrExports.elements.map(n => moduleExportNameTextEscaped(n.propertyName || n.name)));
            const uniques = exports.filter(e => e.escapedName !== InternalSymbolName.Default && !existing.has(e.escapedName));
            return { kind: 1 /* StringLiteralCompletionKind.Properties */, symbols: uniques, hasIndexSignature: false };
        case SyntaxKind.BinaryExpression:
            if (parent.operatorToken.kind === SyntaxKind.InKeyword) {
                const type = typeChecker.getTypeAtLocation(parent.right);
                const properties = type.isUnion() ? typeChecker.getAllPossiblePropertiesOfTypes(type.types) : type.getApparentProperties();
                return {
                    kind: 1 /* StringLiteralCompletionKind.Properties */,
                    symbols: properties.filter(prop => !prop.valueDeclaration || !isPrivateIdentifierClassElementDeclaration(prop.valueDeclaration)),
                    hasIndexSignature: false,
                };
            }
            return fromContextualType(ContextFlags.None);
        default:
            return fromContextualType() || fromContextualType(ContextFlags.None);
    }
    function fromUnionableLiteralType(grandParent) {
        switch (grandParent.kind) {
            case SyntaxKind.ExpressionWithTypeArguments:
            case SyntaxKind.TypeReference: {
                const typeArgument = findAncestor(parent, n => n.parent === grandParent);
                if (typeArgument) {
                    return { kind: 2 /* StringLiteralCompletionKind.Types */, types: getStringLiteralTypes(typeChecker.getTypeArgumentConstraint(typeArgument)), isNewIdentifier: false };
                }
                return undefined;
            }
            case SyntaxKind.IndexedAccessType:
                // Get all apparent property names
                // i.e. interface Foo {
                //          foo: string;
                //          bar: string;
                //      }
                //      let x: Foo["/*completion position*/"]
                const { indexType, objectType } = grandParent;
                if (!rangeContainsPosition(indexType, position)) {
                    return undefined;
                }
                return stringLiteralCompletionsFromProperties(typeChecker.getTypeFromTypeNode(objectType));
            case SyntaxKind.UnionType: {
                const result = fromUnionableLiteralType(walkUpParentheses(grandParent.parent));
                if (!result) {
                    return undefined;
                }
                const alreadyUsedTypes = getAlreadyUsedTypesInStringLiteralUnion(grandParent, parent);
                if (result.kind === 1 /* StringLiteralCompletionKind.Properties */) {
                    return { kind: 1 /* StringLiteralCompletionKind.Properties */, symbols: result.symbols.filter(sym => !contains(alreadyUsedTypes, sym.name)), hasIndexSignature: result.hasIndexSignature };
                }
                return { kind: 2 /* StringLiteralCompletionKind.Types */, types: result.types.filter(t => !contains(alreadyUsedTypes, t.value)), isNewIdentifier: false };
            }
            default:
                return undefined;
        }
    }
    function fromContextualType(contextFlags = ContextFlags.Completions) {
        // Get completion for string literal from string literal type
        // i.e. var x: "hi" | "hello" = "/*completion position*/"
        const types = getStringLiteralTypes(getContextualTypeFromParent(node, typeChecker, contextFlags));
        if (!types.length) {
            return;
        }
        return { kind: 2 /* StringLiteralCompletionKind.Types */, types, isNewIdentifier: false };
    }
}
function walkUpParentheses(node) {
    switch (node.kind) {
        case SyntaxKind.ParenthesizedType:
            return walkUpParenthesizedTypes(node);
        case SyntaxKind.ParenthesizedExpression:
            return walkUpParenthesizedExpressions(node);
        default:
            return node;
    }
}
function getAlreadyUsedTypesInStringLiteralUnion(union, current) {
    return mapDefined(union.types, type => type !== current && isLiteralTypeNode(type) && isStringLiteral(type.literal) ? type.literal.text : undefined);
}
function getStringLiteralCompletionsFromSignature(call, arg, argumentInfo, checker) {
    let isNewIdentifier = false;
    const uniques = new Set();
    const editingArgument = isJsxOpeningLikeElement(call) ? Debug.checkDefined(findAncestor(arg.parent, isJsxAttribute)) : arg;
    const candidates = checker.getCandidateSignaturesForStringLiteralCompletions(call, editingArgument);
    const types = flatMap(candidates, candidate => {
        if (!signatureHasRestParameter(candidate) && argumentInfo.argumentCount > candidate.parameters.length)
            return;
        let type = candidate.getTypeParameterAtPosition(argumentInfo.argumentIndex);
        if (isJsxOpeningLikeElement(call)) {
            const propType = checker.getTypeOfPropertyOfType(type, getTextOfJsxAttributeName(editingArgument.name));
            if (propType) {
                type = propType;
            }
        }
        isNewIdentifier = isNewIdentifier || !!(type.flags & TypeFlags.String);
        return getStringLiteralTypes(type, uniques);
    });
    return length(types) ? { kind: 2 /* StringLiteralCompletionKind.Types */, types, isNewIdentifier } : undefined;
}
function stringLiteralCompletionsFromProperties(type) {
    return type && {
        kind: 1 /* StringLiteralCompletionKind.Properties */,
        symbols: filter(type.getApparentProperties(), prop => !(prop.valueDeclaration && isPrivateIdentifierClassElementDeclaration(prop.valueDeclaration))),
        hasIndexSignature: hasIndexSignature(type),
    };
}
function stringLiteralCompletionsForObjectLiteral(checker, objectLiteralExpression) {
    const contextualType = checker.getContextualType(objectLiteralExpression);
    if (!contextualType)
        return undefined;
    const completionsType = checker.getContextualType(objectLiteralExpression, ContextFlags.Completions);
    const symbols = getPropertiesForObjectExpression(contextualType, completionsType, objectLiteralExpression, checker);
    return {
        kind: 1 /* StringLiteralCompletionKind.Properties */,
        symbols,
        hasIndexSignature: hasIndexSignature(contextualType),
    };
}
function getStringLiteralTypes(type, uniques = new Set()) {
    if (!type)
        return emptyArray;
    type = skipConstraint(type);
    return type.isUnion() ? flatMap(type.types, t => getStringLiteralTypes(t, uniques)) :
        type.isStringLiteral() && !(type.flags & TypeFlags.EnumLiteral) && addToSeen(uniques, type.value) ? [type] : emptyArray;
}
function nameAndKind(name, kind, extension) {
    return { name, kind, extension };
}
function directoryResult(name) {
    return nameAndKind(name, ScriptElementKind.directory, /*extension*/ undefined);
}
function addReplacementSpans(text, textStart, names) {
    const span = getDirectoryFragmentTextSpan(text, textStart);
    const wholeSpan = text.length === 0 ? undefined : createTextSpan(textStart, text.length);
    return names.map(({ name, kind, extension }) => (name.includes(directorySeparator) || name.includes(altDirectorySeparator)) ? { name, kind, extension, span: wholeSpan } : { name, kind, extension, span });
}
function getStringLiteralCompletionsFromModuleNames(sourceFile, node, program, host, preferences) {
    return addReplacementSpans(node.text, node.getStart(sourceFile) + 1, getStringLiteralCompletionsFromModuleNamesWorker(sourceFile, node, program, host, preferences));
}
function getStringLiteralCompletionsFromModuleNamesWorker(sourceFile, node, program, host, preferences) {
    const literalValue = normalizeSlashes(node.text);
    const mode = isStringLiteralLike(node) ? program.getModeForUsageLocation(sourceFile, node) : undefined;
    const scriptPath = sourceFile.path;
    const scriptDirectory = getDirectoryPath(scriptPath);
    const compilerOptions = program.getCompilerOptions();
    const typeChecker = program.getTypeChecker();
    const moduleSpecifierResolutionHost = createModuleSpecifierResolutionHost(program, host);
    const extensionOptions = getExtensionOptions(compilerOptions, 1 /* ReferenceKind.ModuleSpecifier */, sourceFile, typeChecker, preferences, mode);
    return isPathRelativeToScript(literalValue) || !compilerOptions.baseUrl && !compilerOptions.paths && (isRootedDiskPath(literalValue) || isUrl(literalValue))
        ? getCompletionEntriesForRelativeModules(literalValue, scriptDirectory, program, host, moduleSpecifierResolutionHost, scriptPath, extensionOptions)
        : getCompletionEntriesForNonRelativeModules(literalValue, scriptDirectory, mode, program, host, moduleSpecifierResolutionHost, extensionOptions);
}
function getExtensionOptions(compilerOptions, referenceKind, importingSourceFile, typeChecker, preferences, resolutionMode) {
    return {
        extensionsToSearch: flatten(getSupportedExtensionsForModuleResolution(compilerOptions, typeChecker)),
        referenceKind,
        importingSourceFile,
        endingPreference: preferences === null || preferences === void 0 ? void 0 : preferences.importModuleSpecifierEnding,
        resolutionMode,
    };
}
function getCompletionEntriesForRelativeModules(literalValue, scriptDirectory, program, host, moduleSpecifierResolutionHost, scriptPath, extensionOptions) {
    const compilerOptions = program.getCompilerOptions();
    if (compilerOptions.rootDirs) {
        return getCompletionEntriesForDirectoryFragmentWithRootDirs(compilerOptions.rootDirs, literalValue, scriptDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, scriptPath);
    }
    else {
        return arrayFrom(getCompletionEntriesForDirectoryFragment(literalValue, scriptDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, /*moduleSpecifierIsRelative*/ true, scriptPath).values());
    }
}
function getSupportedExtensionsForModuleResolution(compilerOptions, typeChecker) {
    /** file extensions from ambient modules declarations e.g. *.css */
    const ambientModulesExtensions = !typeChecker ? [] : mapDefined(typeChecker.getAmbientModules(), module => {
        const name = module.name.slice(1, -1);
        if (!name.startsWith("*.") || name.includes("/"))
            return;
        return name.slice(1);
    });
    const extensions = [...getSupportedExtensions(compilerOptions), ambientModulesExtensions];
    const moduleResolution = getEmitModuleResolutionKind(compilerOptions);
    return moduleResolutionUsesNodeModules(moduleResolution) ?
        getSupportedExtensionsWithJsonIfResolveJsonModule(compilerOptions, extensions) :
        extensions;
}
/**
 * Takes a script path and returns paths for all potential folders that could be merged with its
 * containing folder via the "rootDirs" compiler option
 */
function getBaseDirectoriesFromRootDirs(rootDirs, basePath, scriptDirectory, ignoreCase) {
    // Make all paths absolute/normalized if they are not already
    rootDirs = rootDirs.map(rootDirectory => ensureTrailingDirectorySeparator(normalizePath(isRootedDiskPath(rootDirectory) ? rootDirectory : combinePaths(basePath, rootDirectory))));
    // Determine the path to the directory containing the script relative to the root directory it is contained within
    const relativeDirectory = firstDefined(rootDirs, rootDirectory => containsPath(rootDirectory, scriptDirectory, basePath, ignoreCase) ? scriptDirectory.substr(rootDirectory.length) : undefined); // TODO: GH#18217
    // Now find a path for each potential directory that is to be merged with the one containing the script
    return deduplicate([...rootDirs.map(rootDirectory => combinePaths(rootDirectory, relativeDirectory)), scriptDirectory].map(baseDir => removeTrailingDirectorySeparator(baseDir)), equateStringsCaseSensitive, compareStringsCaseSensitive);
}
function getCompletionEntriesForDirectoryFragmentWithRootDirs(rootDirs, fragment, scriptDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, exclude) {
    const compilerOptions = program.getCompilerOptions();
    const basePath = compilerOptions.project || host.getCurrentDirectory();
    const ignoreCase = !(host.useCaseSensitiveFileNames && host.useCaseSensitiveFileNames());
    const baseDirectories = getBaseDirectoriesFromRootDirs(rootDirs, basePath, scriptDirectory, ignoreCase);
    return deduplicate(flatMap(baseDirectories, baseDirectory => arrayFrom(getCompletionEntriesForDirectoryFragment(fragment, baseDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, /*moduleSpecifierIsRelative*/ true, exclude).values())), (itemA, itemB) => itemA.name === itemB.name && itemA.kind === itemB.kind && itemA.extension === itemB.extension);
}
var ReferenceKind;
(function (ReferenceKind) {
    ReferenceKind[ReferenceKind["Filename"] = 0] = "Filename";
    ReferenceKind[ReferenceKind["ModuleSpecifier"] = 1] = "ModuleSpecifier";
})(ReferenceKind || (ReferenceKind = {}));
/**
 * Given a path ending at a directory, gets the completions for the path, and filters for those entries containing the basename.
 */
function getCompletionEntriesForDirectoryFragment(fragment, scriptDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, moduleSpecifierIsRelative, exclude, result = createNameAndKindSet()) {
    var _a;
    if (fragment === undefined) {
        fragment = "";
    }
    fragment = normalizeSlashes(fragment);
    /**
     * Remove the basename from the path. Note that we don't use the basename to filter completions;
     * the client is responsible for refining completions.
     */
    if (!hasTrailingDirectorySeparator(fragment)) {
        fragment = getDirectoryPath(fragment);
    }
    if (fragment === "") {
        fragment = "." + directorySeparator;
    }
    fragment = ensureTrailingDirectorySeparator(fragment);
    const absolutePath = resolvePath(scriptDirectory, fragment);
    const baseDirectory = hasTrailingDirectorySeparator(absolutePath) ? absolutePath : getDirectoryPath(absolutePath);
    if (!moduleSpecifierIsRelative) {
        // check for a version redirect
        const packageJsonPath = findPackageJson(baseDirectory, host);
        if (packageJsonPath) {
            const packageJson = readJson(packageJsonPath, host);
            const typesVersions = packageJson.typesVersions;
            if (typeof typesVersions === "object") {
                const versionPaths = (_a = getPackageJsonTypesVersionsPaths(typesVersions)) === null || _a === void 0 ? void 0 : _a.paths;
                if (versionPaths) {
                    const packageDirectory = getDirectoryPath(packageJsonPath);
                    const pathInPackage = absolutePath.slice(ensureTrailingDirectorySeparator(packageDirectory).length);
                    if (addCompletionEntriesFromPaths(result, pathInPackage, packageDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, versionPaths)) {
                        // A true result means one of the `versionPaths` was matched, which will block relative resolution
                        // to files and folders from here. All reachable paths given the pattern match are already added.
                        return result;
                    }
                }
            }
        }
    }
    const ignoreCase = !(host.useCaseSensitiveFileNames && host.useCaseSensitiveFileNames());
    if (!tryDirectoryExists(host, baseDirectory))
        return result;
    // Enumerate the available files if possible
    const files = tryReadDirectory(host, baseDirectory, extensionOptions.extensionsToSearch, /*exclude*/ undefined, /*include*/ ["./*"]);
    if (files) {
        for (let filePath of files) {
            filePath = normalizePath(filePath);
            if (exclude && comparePaths(filePath, exclude, scriptDirectory, ignoreCase) === Comparison.EqualTo) {
                continue;
            }
            const { name, extension } = getFilenameWithExtensionOption(getBaseFileName(filePath), program, extensionOptions, /*isExportsOrImportsWildcard*/ false);
            result.add(nameAndKind(name, ScriptElementKind.scriptElement, extension));
        }
    }
    // If possible, get folder completion as well
    const directories = tryGetDirectories(host, baseDirectory);
    if (directories) {
        for (const directory of directories) {
            const directoryName = getBaseFileName(normalizePath(directory));
            if (directoryName !== "@types") {
                result.add(directoryResult(directoryName));
            }
        }
    }
    return result;
}
function getFilenameWithExtensionOption(name, program, extensionOptions, isExportsOrImportsWildcard) {
    const nonJsResult = moduleSpecifiers.tryGetRealFileNameForNonJsDeclarationFileName(name);
    if (nonJsResult) {
        return { name: nonJsResult, extension: tryGetExtensionFromPath(nonJsResult) };
    }
    if (extensionOptions.referenceKind === 0 /* ReferenceKind.Filename */) {
        return { name, extension: tryGetExtensionFromPath(name) };
    }
    let allowedEndings = moduleSpecifiers.getModuleSpecifierPreferences({ importModuleSpecifierEnding: extensionOptions.endingPreference }, program, program.getCompilerOptions(), extensionOptions.importingSourceFile).getAllowedEndingsInPreferredOrder(extensionOptions.resolutionMode);
    if (isExportsOrImportsWildcard) {
        // If we're completing `import {} from "foo/|"` and subpaths are available via `"exports": { "./*": "./src/*" }`,
        // the completion must be a (potentially extension-swapped) file name. Dropping extensions and index files is not allowed.
        allowedEndings = allowedEndings.filter(e => e !== ModuleSpecifierEnding.Minimal && e !== ModuleSpecifierEnding.Index);
    }
    if (allowedEndings[0] === ModuleSpecifierEnding.TsExtension) {
        if (fileExtensionIsOneOf(name, supportedTSImplementationExtensions)) {
            return { name, extension: tryGetExtensionFromPath(name) };
        }
        const outputExtension = moduleSpecifiers.tryGetJSExtensionForFile(name, program.getCompilerOptions());
        return outputExtension
            ? { name: changeExtension(name, outputExtension), extension: outputExtension }
            : { name, extension: tryGetExtensionFromPath(name) };
    }
    if (!isExportsOrImportsWildcard &&
        (allowedEndings[0] === ModuleSpecifierEnding.Minimal || allowedEndings[0] === ModuleSpecifierEnding.Index) &&
        fileExtensionIsOneOf(name, [Extension.Js, Extension.Jsx, Extension.Ts, Extension.Tsx, Extension.Dts])) {
        return { name: removeFileExtension(name), extension: tryGetExtensionFromPath(name) };
    }
    const outputExtension = moduleSpecifiers.tryGetJSExtensionForFile(name, program.getCompilerOptions());
    return outputExtension
        ? { name: changeExtension(name, outputExtension), extension: outputExtension }
        : { name, extension: tryGetExtensionFromPath(name) };
}
/** @returns whether `fragment` was a match for any `paths` (which should indicate whether any other path completions should be offered) */
function addCompletionEntriesFromPaths(result, fragment, baseDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, paths) {
    const getPatternsForKey = (key) => paths[key];
    const comparePaths = (a, b) => {
        const patternA = tryParsePattern(a);
        const patternB = tryParsePattern(b);
        const lengthA = typeof patternA === "object" ? patternA.prefix.length : a.length;
        const lengthB = typeof patternB === "object" ? patternB.prefix.length : b.length;
        return compareValues(lengthB, lengthA);
    };
    return addCompletionEntriesFromPathsOrExportsOrImports(result, /*isExports*/ false, /*isImports*/ false, fragment, baseDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, getOwnKeys(paths), getPatternsForKey, comparePaths);
}
/** @returns whether `fragment` was a match for any `paths` (which should indicate whether any other path completions should be offered) */
function addCompletionEntriesFromPathsOrExportsOrImports(result, isExports, isImports, fragment, baseDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, keys, getPatternsForKey, comparePaths) {
    let pathResults = [];
    let matchedPath;
    for (const key of keys) {
        if (key === ".")
            continue;
        const keyWithoutLeadingDotSlash = key
            .replace(/^\.\//, "") // remove leading "./"
            + ((isExports || isImports) && endsWith(key, "/") ? "*" : ""); // normalize trailing `/` to `/*`
        const patterns = getPatternsForKey(key);
        if (patterns) {
            const pathPattern = tryParsePattern(keyWithoutLeadingDotSlash);
            if (!pathPattern)
                continue;
            const isMatch = typeof pathPattern === "object" && isPatternMatch(pathPattern, fragment);
            const isLongestMatch = isMatch && (matchedPath === undefined || comparePaths(keyWithoutLeadingDotSlash, matchedPath) === Comparison.LessThan);
            if (isLongestMatch) {
                // If this is a higher priority match than anything we've seen so far, previous results from matches are invalid, e.g.
                // for `import {} from "some-package/|"` with a typesVersions:
                // {
                //   "bar/*": ["bar/*"], // <-- 1. We add 'bar', but 'bar/*' doesn't match yet.
                //   "*": ["dist/*"],    // <-- 2. We match here and add files from dist. 'bar' is still ok because it didn't come from a match.
                //   "foo/*": ["foo/*"]  // <-- 3. We matched '*' earlier and added results from dist, but if 'foo/*' also matched,
                // }                               results in dist would not be visible. 'bar' still stands because it didn't come from a match.
                //                                 This is especially important if `dist/foo` is a folder, because if we fail to clear results
                //                                 added by the '*' match, after typing `"some-package/foo/|"` we would get file results from both
                //                                 ./dist/foo and ./foo, when only the latter will actually be resolvable.
                //                                 See pathCompletionsTypesVersionsWildcard6.ts.
                matchedPath = keyWithoutLeadingDotSlash;
                pathResults = pathResults.filter(r => !r.matchedPattern);
            }
            if (typeof pathPattern === "string" || matchedPath === undefined || comparePaths(keyWithoutLeadingDotSlash, matchedPath) !== Comparison.GreaterThan) {
                pathResults.push({
                    matchedPattern: isMatch,
                    results: getCompletionsForPathMapping(keyWithoutLeadingDotSlash, patterns, fragment, baseDirectory, extensionOptions, isExports, isImports, program, host, moduleSpecifierResolutionHost)
                        .map(({ name, kind, extension }) => nameAndKind(name, kind, extension)),
                });
            }
        }
    }
    pathResults.forEach(pathResult => pathResult.results.forEach(r => result.add(r)));
    return matchedPath !== undefined;
}
/**
 * Check all of the declared modules and those in node modules. Possible sources of modules:
 *      Modules that are found by the type checker
 *      Modules found relative to "baseUrl" compliler options (including patterns from "paths" compiler option)
 *      Modules from node_modules (i.e. those listed in package.json)
 *          This includes all files that are found in node_modules/moduleName/ with acceptable file extensions
 */
function getCompletionEntriesForNonRelativeModules(fragment, scriptPath, mode, program, host, moduleSpecifierResolutionHost, extensionOptions) {
    const typeChecker = program.getTypeChecker();
    const compilerOptions = program.getCompilerOptions();
    const { baseUrl, paths } = compilerOptions;
    const result = createNameAndKindSet();
    const moduleResolution = getEmitModuleResolutionKind(compilerOptions);
    if (baseUrl) {
        const absolute = normalizePath(combinePaths(host.getCurrentDirectory(), baseUrl));
        getCompletionEntriesForDirectoryFragment(fragment, absolute, extensionOptions, program, host, moduleSpecifierResolutionHost, /*moduleSpecifierIsRelative*/ false, /*exclude*/ undefined, result);
    }
    if (paths) {
        const absolute = getPathsBasePath(compilerOptions, host);
        addCompletionEntriesFromPaths(result, fragment, absolute, extensionOptions, program, host, moduleSpecifierResolutionHost, paths);
    }
    const fragmentDirectory = getFragmentDirectory(fragment);
    for (const ambientName of getAmbientModuleCompletions(fragment, fragmentDirectory, typeChecker)) {
        result.add(nameAndKind(ambientName, ScriptElementKind.externalModuleName, /*extension*/ undefined));
    }
    getCompletionEntriesFromTypings(program, host, moduleSpecifierResolutionHost, scriptPath, fragmentDirectory, extensionOptions, result);
    if (moduleResolutionUsesNodeModules(moduleResolution)) {
        // If looking for a global package name, don't just include everything in `node_modules` because that includes dependencies' own dependencies.
        // (But do if we didn't find anything, e.g. 'package.json' missing.)
        let foundGlobal = false;
        if (fragmentDirectory === undefined) {
            for (const moduleName of enumerateNodeModulesVisibleToScript(host, scriptPath)) {
                const moduleResult = nameAndKind(moduleName, ScriptElementKind.externalModuleName, /*extension*/ undefined);
                if (!result.has(moduleResult.name)) {
                    foundGlobal = true;
                    result.add(moduleResult);
                }
            }
        }
        if (!foundGlobal) {
            const resolvePackageJsonExports = getResolvePackageJsonExports(compilerOptions);
            const resolvePackageJsonImports = getResolvePackageJsonImports(compilerOptions);
            let seenPackageScope = false;
            const importsLookup = (directory) => {
                if (resolvePackageJsonImports && !seenPackageScope) {
                    const packageFile = combinePaths(directory, "package.json");
                    if (seenPackageScope = tryFileExists(host, packageFile)) {
                        const packageJson = readJson(packageFile, host);
                        exportsOrImportsLookup(packageJson.imports, fragment, directory, /*isExports*/ false, /*isImports*/ true);
                    }
                }
            };
            let ancestorLookup = ancestor => {
                const nodeModules = combinePaths(ancestor, "node_modules");
                if (tryDirectoryExists(host, nodeModules)) {
                    getCompletionEntriesForDirectoryFragment(fragment, nodeModules, extensionOptions, program, host, moduleSpecifierResolutionHost, /*moduleSpecifierIsRelative*/ false, /*exclude*/ undefined, result);
                }
                importsLookup(ancestor);
            };
            if (fragmentDirectory && resolvePackageJsonExports) {
                const nodeModulesDirectoryOrImportsLookup = ancestorLookup;
                ancestorLookup = ancestor => {
                    const components = getPathComponents(fragment);
                    components.shift(); // shift off empty root
                    let packagePath = components.shift();
                    if (!packagePath) {
                        return nodeModulesDirectoryOrImportsLookup(ancestor);
                    }
                    if (startsWith(packagePath, "@")) {
                        const subName = components.shift();
                        if (!subName) {
                            return nodeModulesDirectoryOrImportsLookup(ancestor);
                        }
                        packagePath = combinePaths(packagePath, subName);
                    }
                    if (resolvePackageJsonImports && startsWith(packagePath, "#")) {
                        return importsLookup(ancestor);
                    }
                    const packageDirectory = combinePaths(ancestor, "node_modules", packagePath);
                    const packageFile = combinePaths(packageDirectory, "package.json");
                    if (tryFileExists(host, packageFile)) {
                        const packageJson = readJson(packageFile, host);
                        const fragmentSubpath = components.join("/") + (components.length && hasTrailingDirectorySeparator(fragment) ? "/" : "");
                        exportsOrImportsLookup(packageJson.exports, fragmentSubpath, packageDirectory, /*isExports*/ true, /*isImports*/ false);
                        return;
                    }
                    return nodeModulesDirectoryOrImportsLookup(ancestor);
                };
            }
            forEachAncestorDirectoryStoppingAtGlobalCache(host, scriptPath, ancestorLookup);
        }
    }
    return arrayFrom(result.values());
    function exportsOrImportsLookup(lookupTable, fragment, baseDirectory, isExports, isImports) {
        if (typeof lookupTable !== "object" || lookupTable === null) { // eslint-disable-line no-restricted-syntax
            return; // null lookupTable or entrypoint only
        }
        const keys = getOwnKeys(lookupTable);
        const conditions = getConditions(compilerOptions, mode);
        addCompletionEntriesFromPathsOrExportsOrImports(result, isExports, isImports, fragment, baseDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, keys, key => {
            const pattern = getPatternFromFirstMatchingCondition(lookupTable[key], conditions);
            if (pattern === undefined) {
                return undefined;
            }
            return singleElementArray(endsWith(key, "/") && endsWith(pattern, "/") ? pattern + "*" : pattern);
        }, comparePatternKeys);
    }
}
function getPatternFromFirstMatchingCondition(target, conditions) {
    if (typeof target === "string") {
        return target;
    }
    if (target && typeof target === "object" && !isArray(target)) {
        for (const condition in target) {
            if (condition === "default" || conditions.includes(condition) || isApplicableVersionedTypesKey(conditions, condition)) {
                const pattern = target[condition];
                return getPatternFromFirstMatchingCondition(pattern, conditions);
            }
        }
    }
}
function getFragmentDirectory(fragment) {
    return containsSlash(fragment) ? hasTrailingDirectorySeparator(fragment) ? fragment : getDirectoryPath(fragment) : undefined;
}
function getCompletionsForPathMapping(path, patterns, fragment, packageDirectory, extensionOptions, isExports, isImports, program, host, moduleSpecifierResolutionHost) {
    const parsedPath = tryParsePattern(path);
    if (!parsedPath) {
        return emptyArray;
    }
    // no stars in the pattern
    if (typeof parsedPath === "string") {
        // For a path mapping "foo": ["/x/y/z.ts"], add "foo" itself as a completion.
        return justPathMappingName(path, ScriptElementKind.scriptElement);
    }
    const remainingFragment = tryRemovePrefix(fragment, parsedPath.prefix);
    if (remainingFragment === undefined) {
        const starIsFullPathComponent = endsWith(path, "/*");
        return starIsFullPathComponent ? justPathMappingName(parsedPath.prefix, ScriptElementKind.directory) : flatMap(patterns, pattern => { var _a; return (_a = getModulesForPathsPattern("", packageDirectory, pattern, extensionOptions, isExports, isImports, program, host, moduleSpecifierResolutionHost)) === null || _a === void 0 ? void 0 : _a.map(({ name, ...rest }) => ({ name: parsedPath.prefix + name + parsedPath.suffix, ...rest })); });
    }
    return flatMap(patterns, pattern => getModulesForPathsPattern(remainingFragment, packageDirectory, pattern, extensionOptions, isExports, isImports, program, host, moduleSpecifierResolutionHost));
    function justPathMappingName(name, kind) {
        return startsWith(name, fragment) ? [{ name: removeTrailingDirectorySeparator(name), kind, extension: undefined }] : emptyArray;
    }
}
function getModulesForPathsPattern(fragment, packageDirectory, pattern, extensionOptions, isExports, isImports, program, host, moduleSpecifierResolutionHost) {
    if (!host.readDirectory) {
        return undefined;
    }
    const parsed = tryParsePattern(pattern);
    if (parsed === undefined || isString(parsed)) {
        return undefined;
    }
    // The prefix has two effective parts: the directory path and the base component after the filepath that is not a
    // full directory component. For example: directory/path/of/prefix/base*
    const normalizedPrefix = resolvePath(parsed.prefix);
    const normalizedPrefixDirectory = hasTrailingDirectorySeparator(parsed.prefix) ? normalizedPrefix : getDirectoryPath(normalizedPrefix);
    const normalizedPrefixBase = hasTrailingDirectorySeparator(parsed.prefix) ? "" : getBaseFileName(normalizedPrefix);
    const fragmentHasPath = containsSlash(fragment);
    const fragmentDirectory = fragmentHasPath ? hasTrailingDirectorySeparator(fragment) ? fragment : getDirectoryPath(fragment) : undefined;
    const getCommonSourceDirectory = () => moduleSpecifierResolutionHost.getCommonSourceDirectory();
    const ignoreCase = !hostUsesCaseSensitiveFileNames(moduleSpecifierResolutionHost);
    const outDir = program.getCompilerOptions().outDir;
    const declarationDir = program.getCompilerOptions().declarationDir;
    // Try and expand the prefix to include any path from the fragment so that we can limit the readDirectory call
    const expandedPrefixDirectory = fragmentHasPath ? combinePaths(normalizedPrefixDirectory, normalizedPrefixBase + fragmentDirectory) : normalizedPrefixDirectory;
    // Need to normalize after combining: If we combinePaths("a", "../b"), we want "b" and not "a/../b".
    const baseDirectory = normalizePath(combinePaths(packageDirectory, expandedPrefixDirectory));
    const possibleInputBaseDirectoryForOutDir = isImports && outDir && getPossibleOriginalInputPathWithoutChangingExt(baseDirectory, ignoreCase, outDir, getCommonSourceDirectory);
    const possibleInputBaseDirectoryForDeclarationDir = isImports && declarationDir && getPossibleOriginalInputPathWithoutChangingExt(baseDirectory, ignoreCase, declarationDir, getCommonSourceDirectory);
    const normalizedSuffix = normalizePath(parsed.suffix);
    const declarationExtension = normalizedSuffix && getDeclarationEmitExtensionForPath("_" + normalizedSuffix);
    const inputExtension = normalizedSuffix ? getPossibleOriginalInputExtensionForExtension("_" + normalizedSuffix) : undefined;
    const matchingSuffixes = [
        declarationExtension && changeExtension(normalizedSuffix, declarationExtension),
        ...(inputExtension ? inputExtension.map(ext => changeExtension(normalizedSuffix, ext)) : []),
        normalizedSuffix,
    ].filter(isString);
    // If we have a suffix, then we read the directory all the way down to avoid returning completions for
    // directories that don't contain files that would match the suffix. A previous comment here was concerned
    // about the case where `normalizedSuffix` includes a `?` character, which should be interpreted literally,
    // but will match any single character as part of the `include` pattern in `tryReadDirectory`. This is not
    // a problem, because (in the extremely unusual circumstance where the suffix has a `?` in it) a `?`
    // interpreted as "any character" can only return *too many* results as compared to the literal
    // interpretation, so we can filter those superfluous results out via `trimPrefixAndSuffix` as we've always
    // done.
    const includeGlobs = normalizedSuffix
        ? matchingSuffixes.map(suffix => "**/*" + suffix)
        : ["./*"];
    const isExportsOrImportsWildcard = (isExports || isImports) && endsWith(pattern, "/*");
    let matches = getMatchesWithPrefix(baseDirectory);
    if (possibleInputBaseDirectoryForOutDir) {
        matches = concatenate(matches, getMatchesWithPrefix(possibleInputBaseDirectoryForOutDir));
    }
    if (possibleInputBaseDirectoryForDeclarationDir) {
        matches = concatenate(matches, getMatchesWithPrefix(possibleInputBaseDirectoryForDeclarationDir));
    }
    // If we had a suffix, we already recursively searched for all possible files that could match
    // it and returned the directories leading to those files. Otherwise, assume any directory could
    // have something valid to import.
    if (!normalizedSuffix) {
        matches = concatenate(matches, getDirectoryMatches(baseDirectory));
        if (possibleInputBaseDirectoryForOutDir) {
            matches = concatenate(matches, getDirectoryMatches(possibleInputBaseDirectoryForOutDir));
        }
        if (possibleInputBaseDirectoryForDeclarationDir) {
            matches = concatenate(matches, getDirectoryMatches(possibleInputBaseDirectoryForDeclarationDir));
        }
    }
    return matches;
    function getMatchesWithPrefix(directory) {
        const completePrefix = fragmentHasPath ? directory : ensureTrailingDirectorySeparator(directory) + normalizedPrefixBase;
        return mapDefined(tryReadDirectory(host, directory, extensionOptions.extensionsToSearch, /*exclude*/ undefined, includeGlobs), match => {
            const trimmedWithPattern = trimPrefixAndSuffix(match, completePrefix);
            if (trimmedWithPattern) {
                if (containsSlash(trimmedWithPattern)) {
                    return directoryResult(getPathComponents(removeLeadingDirectorySeparator(trimmedWithPattern))[1]);
                }
                const { name, extension } = getFilenameWithExtensionOption(trimmedWithPattern, program, extensionOptions, isExportsOrImportsWildcard);
                return nameAndKind(name, ScriptElementKind.scriptElement, extension);
            }
        });
    }
    function getDirectoryMatches(directoryName) {
        return mapDefined(tryGetDirectories(host, directoryName), dir => dir === "node_modules" ? undefined : directoryResult(dir));
    }
    function trimPrefixAndSuffix(path, prefix) {
        return firstDefined(matchingSuffixes, suffix => {
            const inner = withoutStartAndEnd(normalizePath(path), prefix, suffix);
            return inner === undefined ? undefined : removeLeadingDirectorySeparator(inner);
        });
    }
}
function withoutStartAndEnd(s, start, end) {
    return startsWith(s, start) && endsWith(s, end) ? s.slice(start.length, s.length - end.length) : undefined;
}
function removeLeadingDirectorySeparator(path) {
    return path[0] === directorySeparator ? path.slice(1) : path;
}
function getAmbientModuleCompletions(fragment, fragmentDirectory, checker) {
    // Get modules that the type checker picked up
    const ambientModules = checker.getAmbientModules().map(sym => stripQuotes(sym.name));
    const nonRelativeModuleNames = ambientModules.filter(moduleName => startsWith(moduleName, fragment) && !moduleName.includes("*"));
    // Nested modules of the form "module-name/sub" need to be adjusted to only return the string
    // after the last '/' that appears in the fragment because that's where the replacement span
    // starts
    if (fragmentDirectory !== undefined) {
        const moduleNameWithSeparator = ensureTrailingDirectorySeparator(fragmentDirectory);
        return nonRelativeModuleNames.map(nonRelativeModuleName => removePrefix(nonRelativeModuleName, moduleNameWithSeparator));
    }
    return nonRelativeModuleNames;
}
function getTripleSlashReferenceCompletion(sourceFile, position, program, host, moduleSpecifierResolutionHost) {
    const compilerOptions = program.getCompilerOptions();
    const token = getTokenAtPosition(sourceFile, position);
    const commentRanges = getLeadingCommentRanges(sourceFile.text, token.pos);
    const range = commentRanges && find(commentRanges, commentRange => position >= commentRange.pos && position <= commentRange.end);
    if (!range) {
        return undefined;
    }
    const text = sourceFile.text.slice(range.pos, position);
    const match = tripleSlashDirectiveFragmentRegex.exec(text);
    if (!match) {
        return undefined;
    }
    const [, prefix, kind, toComplete] = match;
    const scriptPath = getDirectoryPath(sourceFile.path);
    const names = kind === "path" ? getCompletionEntriesForDirectoryFragment(toComplete, scriptPath, getExtensionOptions(compilerOptions, 0 /* ReferenceKind.Filename */, sourceFile), program, host, moduleSpecifierResolutionHost, /*moduleSpecifierIsRelative*/ true, sourceFile.path)
        : kind === "types" ? getCompletionEntriesFromTypings(program, host, moduleSpecifierResolutionHost, scriptPath, getFragmentDirectory(toComplete), getExtensionOptions(compilerOptions, 1 /* ReferenceKind.ModuleSpecifier */, sourceFile))
            : Debug.fail();
    return addReplacementSpans(toComplete, range.pos + prefix.length, arrayFrom(names.values()));
}
function getCompletionEntriesFromTypings(program, host, moduleSpecifierResolutionHost, scriptPath, fragmentDirectory, extensionOptions, result = createNameAndKindSet()) {
    const options = program.getCompilerOptions();
    // Check for typings specified in compiler options
    const seen = new Map();
    const typeRoots = tryAndIgnoreErrors(() => getEffectiveTypeRoots(options, host)) || emptyArray;
    for (const root of typeRoots) {
        getCompletionEntriesFromDirectories(root);
    }
    // Also get all @types typings installed in visible node_modules directories
    for (const packageJson of findPackageJsons(scriptPath, host)) {
        const typesDir = combinePaths(getDirectoryPath(packageJson), "node_modules/@types");
        getCompletionEntriesFromDirectories(typesDir);
    }
    return result;
    function getCompletionEntriesFromDirectories(directory) {
        if (!tryDirectoryExists(host, directory))
            return;
        for (const typeDirectoryName of tryGetDirectories(host, directory)) {
            const packageName = unmangleScopedPackageName(typeDirectoryName);
            if (options.types && !contains(options.types, packageName))
                continue;
            if (fragmentDirectory === undefined) {
                if (!seen.has(packageName)) {
                    result.add(nameAndKind(packageName, ScriptElementKind.externalModuleName, /*extension*/ undefined));
                    seen.set(packageName, true);
                }
            }
            else {
                const baseDirectory = combinePaths(directory, typeDirectoryName);
                const remainingFragment = tryRemoveDirectoryPrefix(fragmentDirectory, packageName, hostGetCanonicalFileName(host));
                if (remainingFragment !== undefined) {
                    getCompletionEntriesForDirectoryFragment(remainingFragment, baseDirectory, extensionOptions, program, host, moduleSpecifierResolutionHost, /*moduleSpecifierIsRelative*/ false, /*exclude*/ undefined, result);
                }
            }
        }
    }
}
function enumerateNodeModulesVisibleToScript(host, scriptPath) {
    if (!host.readFile || !host.fileExists)
        return emptyArray;
    const result = [];
    for (const packageJson of findPackageJsons(scriptPath, host)) {
        const contents = readJson(packageJson, host); // Cast to assert that readFile is defined
        // Provide completions for all non @types dependencies
        for (const key of nodeModulesDependencyKeys) {
            const dependencies = contents[key];
            if (!dependencies)
                continue;
            for (const dep in dependencies) {
                if (hasProperty(dependencies, dep) && !startsWith(dep, "@types/")) {
                    result.push(dep);
                }
            }
        }
    }
    return result;
}
// Replace everything after the last directory separator that appears
function getDirectoryFragmentTextSpan(text, textStart) {
    const index = Math.max(text.lastIndexOf(directorySeparator), text.lastIndexOf(altDirectorySeparator));
    const offset = index !== -1 ? index + 1 : 0;
    // If the range is an identifier, span is unnecessary.
    const length = text.length - offset;
    return length === 0 || isIdentifierText(text.substr(offset, length), ScriptTarget.ESNext) ? undefined : createTextSpan(textStart + offset, length);
}
// Returns true if the path is explicitly relative to the script (i.e. relative to . or ..)
function isPathRelativeToScript(path) {
    if (path && path.length >= 2 && path.charCodeAt(0) === CharacterCodes.dot) {
        const slashIndex = path.length >= 3 && path.charCodeAt(1) === CharacterCodes.dot ? 2 : 1;
        const slashCharCode = path.charCodeAt(slashIndex);
        return slashCharCode === CharacterCodes.slash || slashCharCode === CharacterCodes.backslash;
    }
    return false;
}
/**
 * Matches a triple slash reference directive with an incomplete string literal for its path. Used
 * to determine if the caret is currently within the string literal and capture the literal fragment
 * for completions.
 * For example, this matches
 *
 * /// <reference path="fragment
 *
 * but not
 *
 * /// <reference path="fragment"
 */
const tripleSlashDirectiveFragmentRegex = /^(\/\/\/\s*<reference\s+(path|types)\s*=\s*(?:'|"))([^\x03"]*)$/;
const nodeModulesDependencyKeys = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
function containsSlash(fragment) {
    return fragment.includes(directorySeparator);
}
/**
 * Matches
 *   require(""
 *   require("")
 */
function isRequireCallArgument(node) {
    return isCallExpression(node.parent) && firstOrUndefined(node.parent.arguments) === node
        && isIdentifier(node.parent.expression) && node.parent.expression.escapedText === "require";
}
