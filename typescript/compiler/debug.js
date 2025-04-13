import * as ts from "./namespaces/ts.js";
import {
  AssertionLevel,
  compareValues,
  every,
  FlowFlags,
  getEffectiveModifierFlagsNoCache,
  getEmitFlags,
  getOwnKeys,
  getParseTreeNode,
  getSourceFileOfNode,
  getSourceTextOfNodeFromSourceFile,
  hasProperty,
  idText,
  isArrayTypeNode,
  isBigIntLiteral,
  isCallSignatureDeclaration,
  isConditionalTypeNode,
  isConstructorDeclaration,
  isConstructorTypeNode,
  isConstructSignatureDeclaration,
  isDefaultClause,
  isFunctionTypeNode,
  isGeneratedIdentifier,
  isGetAccessorDeclaration,
  isIdentifier,
  isImportTypeNode,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInferTypeNode,
  isIntersectionTypeNode,
  isLiteralTypeNode,
  isMappedTypeNode,
  isNamedTupleMember,
  isNumericLiteral,
  isOptionalTypeNode,
  isParameter,
  isParenthesizedTypeNode,
  isParseTreeNode,
  isPrivateIdentifier,
  isRestTypeNode,
  isSetAccessorDeclaration,
  isStringLiteral,
  isThisTypeNode,
  isTupleTypeNode,
  isTypeLiteralNode,
  isTypeOperatorNode,
  isTypeParameterDeclaration,
  isTypePredicateNode,
  isTypeQueryNode,
  isTypeReferenceNode,
  isUnionTypeNode,
  map,
  maxBy,
  nodeIsSynthesized,
  noop,
  objectAllocator,
  ObjectFlags,
  SymbolFlags,
  symbolName,
  toSorted,
  TypeFlags,
  TypeMapKind,
  unescapeLeadingUnderscores,
  VarianceFlags,
  zipWith,
} from "./namespaces/ts.js";


// /** @internal */
// export enum LogLevel {
//     Off,
//     Error,
//     Warning,
//     Info,
//     Verbose,
// }
/** @internal */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Off"] = 0] = "Off";
    LogLevel[LogLevel["Error"] = 1] = "Error";
    LogLevel[LogLevel["Warning"] = 2] = "Warning";
    LogLevel[LogLevel["Info"] = 3] = "Info";
    LogLevel[LogLevel["Verbose"] = 4] = "Verbose";
})(LogLevel || (LogLevel = {}));

/** @internal */
export var Debug;
(function (Debug) {
    /* eslint-disable prefer-const */
    let currentAssertionLevel = AssertionLevel.None;
    Debug.currentLogLevel = LogLevel.Warning;
    Debug.isDebugging = false;
    function shouldLog(level) {
        return Debug.currentLogLevel <= level;
    }
    Debug.shouldLog = shouldLog;
    function logMessage(level, s) {
        if (Debug.loggingHost && shouldLog(level)) {
            Debug.loggingHost.log(level, s);
        }
    }
    function log(s) {
        logMessage(LogLevel.Info, s);
    }
    Debug.log = log;
    (function (log_1) {
        function error(s) {
            logMessage(LogLevel.Error, s);
        }
        log_1.error = error;
        function warn(s) {
            logMessage(LogLevel.Warning, s);
        }
        log_1.warn = warn;
        function log(s) {
            logMessage(LogLevel.Info, s);
        }
        log_1.log = log;
        function trace(s) {
            logMessage(LogLevel.Verbose, s);
        }
        log_1.trace = trace;
    })(log = Debug.log || (Debug.log = {}));
    const assertionCache = {};
    function getAssertionLevel() {
        return currentAssertionLevel;
    }
    Debug.getAssertionLevel = getAssertionLevel;
    function setAssertionLevel(level) {
        const prevAssertionLevel = currentAssertionLevel;
        currentAssertionLevel = level;
        if (level > prevAssertionLevel) {
            // restore assertion functions for the current assertion level (see `shouldAssertFunction`).
            for (const key of getOwnKeys(assertionCache)) {
                const cachedFunc = assertionCache[key];
                if (cachedFunc !== undefined && Debug[key] !== cachedFunc.assertion && level >= cachedFunc.level) {
                    Debug[key] = cachedFunc;
                    assertionCache[key] = undefined;
                }
            }
        }
    }
    Debug.setAssertionLevel = setAssertionLevel;
    function shouldAssert(level) {
        return currentAssertionLevel >= level;
    }
    Debug.shouldAssert = shouldAssert;
    /**
     * Tests whether an assertion function should be executed. If it shouldn't, it is cached and replaced with `ts.noop`.
     * Replaced assertion functions are restored when `Debug.setAssertionLevel` is set to a high enough level.
     * @param level The minimum assertion level required.
     * @param name The name of the current assertion function.
     */
    function shouldAssertFunction(level, name) {
        if (!shouldAssert(level)) {
            assertionCache[name] = { level, assertion: Debug[name] };
            Debug[name] = noop;
            return false;
        }
        return true;
    }
    function fail(message, stackCrawlMark) {
        // eslint-disable-next-line no-debugger
        debugger;
        const e = new Error(message ? `Debug Failure. ${message}` : "Debug Failure.");
        if (Error.captureStackTrace) {
            Error.captureStackTrace(e, stackCrawlMark || fail);
        }
        throw e;
    }
    Debug.fail = fail;
    function failBadSyntaxKind(node, message, stackCrawlMark) {
        return fail(`${message || "Unexpected node."}\r\nNode ${formatSyntaxKind(node.kind)} was unexpected.`, stackCrawlMark || failBadSyntaxKind);
    }
    Debug.failBadSyntaxKind = failBadSyntaxKind;
    function assert(expression, message, verboseDebugInfo, stackCrawlMark) {
        if (!expression) {
            message = message ? `False expression: ${message}` : "False expression.";
            if (verboseDebugInfo) {
                message += "\r\nVerbose Debug Information: " + (typeof verboseDebugInfo === "string" ? verboseDebugInfo : verboseDebugInfo());
            }
            fail(message, stackCrawlMark || assert);
        }
    }
    Debug.assert = assert;
    function assertEqual(a, b, msg, msg2, stackCrawlMark) {
        if (a !== b) {
            const message = msg ? msg2 ? `${msg} ${msg2}` : msg : "";
            fail(`Expected ${a} === ${b}. ${message}`, stackCrawlMark || assertEqual);
        }
    }
    Debug.assertEqual = assertEqual;
    function assertLessThan(a, b, msg, stackCrawlMark) {
        if (a >= b) {
            fail(`Expected ${a} < ${b}. ${msg || ""}`, stackCrawlMark || assertLessThan);
        }
    }
    Debug.assertLessThan = assertLessThan;
    function assertLessThanOrEqual(a, b, stackCrawlMark) {
        if (a > b) {
            fail(`Expected ${a} <= ${b}`, stackCrawlMark || assertLessThanOrEqual);
        }
    }
    Debug.assertLessThanOrEqual = assertLessThanOrEqual;
    function assertGreaterThanOrEqual(a, b, stackCrawlMark) {
        if (a < b) {
            fail(`Expected ${a} >= ${b}`, stackCrawlMark || assertGreaterThanOrEqual);
        }
    }
    Debug.assertGreaterThanOrEqual = assertGreaterThanOrEqual;
    function assertIsDefined(value, message, stackCrawlMark) {
        // eslint-disable-next-line no-restricted-syntax
        if (value === undefined || value === null) {
            fail(message, stackCrawlMark || assertIsDefined);
        }
    }
    Debug.assertIsDefined = assertIsDefined;
    function checkDefined(value, message, stackCrawlMark) {
        assertIsDefined(value, message, stackCrawlMark || checkDefined);
        return value;
    }
    Debug.checkDefined = checkDefined;
    function assertEachIsDefined(value, message, stackCrawlMark) {
        for (const v of value) {
            assertIsDefined(v, message, stackCrawlMark || assertEachIsDefined);
        }
    }
    Debug.assertEachIsDefined = assertEachIsDefined;
    function checkEachDefined(value, message, stackCrawlMark) {
        assertEachIsDefined(value, message, stackCrawlMark || checkEachDefined);
        return value;
    }
    Debug.checkEachDefined = checkEachDefined;
    
    function assertNever(member, message = "Illegal value:", stackCrawlMark) {
        const detail = typeof member === "object" && hasProperty(member, "kind") && hasProperty(member, "pos") ? "SyntaxKind: " + formatSyntaxKind(member.kind) : JSON.stringify(member);
        return fail(`${message} ${detail}`, stackCrawlMark || assertNever);
    }
    Debug.assertNever = assertNever;
    
    function assertEachNode(nodes, test, message, stackCrawlMark) {
        if (shouldAssertFunction(AssertionLevel.Normal, "assertEachNode")) {
            assert(test === undefined || every(nodes, test), message || "Unexpected node.", () => `Node array did not pass test '${getFunctionName(test)}'.`, stackCrawlMark || assertEachNode);
        }
    }
    Debug.assertEachNode = assertEachNode;
    
    function assertNode(node, test, message, stackCrawlMark) {
        if (shouldAssertFunction(AssertionLevel.Normal, "assertNode")) {
            assert(node !== undefined && (test === undefined || test(node)), message || "Unexpected node.", () => `Node ${formatSyntaxKind(node === null || node === void 0 ? void 0 : node.kind)} did not pass test '${getFunctionName(test)}'.`, stackCrawlMark || assertNode);
        }
    }
    Debug.assertNode = assertNode;
    
    function assertNotNode(node, test, message, stackCrawlMark) {
        if (shouldAssertFunction(AssertionLevel.Normal, "assertNotNode")) {
            assert(node === undefined || test === undefined || !test(node), message || "Unexpected node.", () => `Node ${formatSyntaxKind(node.kind)} should not have passed test '${getFunctionName(test)}'.`, stackCrawlMark || assertNotNode);
        }
    }
    Debug.assertNotNode = assertNotNode;
    function assertOptionalNode(node, test, message, stackCrawlMark) {
        if (shouldAssertFunction(AssertionLevel.Normal, "assertOptionalNode")) {
            assert(test === undefined || node === undefined || test(node), message || "Unexpected node.", () => `Node ${formatSyntaxKind(node === null || node === void 0 ? void 0 : node.kind)} did not pass test '${getFunctionName(test)}'.`, stackCrawlMark || assertOptionalNode);
        }
    }
    Debug.assertOptionalNode = assertOptionalNode;
    function assertOptionalToken(node, kind, message, stackCrawlMark) {
        if (shouldAssertFunction(AssertionLevel.Normal, "assertOptionalToken")) {
            assert(kind === undefined || node === undefined || node.kind === kind, message || "Unexpected node.", () => `Node ${formatSyntaxKind(node === null || node === void 0 ? void 0 : node.kind)} was not a '${formatSyntaxKind(kind)}' token.`, stackCrawlMark || assertOptionalToken);
        }
    }
    Debug.assertOptionalToken = assertOptionalToken;
    function assertMissingNode(node, message, stackCrawlMark) {
        if (shouldAssertFunction(AssertionLevel.Normal, "assertMissingNode")) {
            assert(node === undefined, message || "Unexpected node.", () => `Node ${formatSyntaxKind(node.kind)} was unexpected'.`, stackCrawlMark || assertMissingNode);
        }
    }
    Debug.assertMissingNode = assertMissingNode;
    
    function type(_value) { }
    
    Debug.type = type;
    
    function getFunctionName(func) {
        if (typeof func !== "function") {
            return "";
        }
        else if (hasProperty(func, "name")) {
            return func.name;
        }
        else {
            const text = Function.prototype.toString.call(func);
            const match = /^function\s+([\w$]+)\s*\(/.exec(text);
            return match ? match[1] : "";
        }
    }
    Debug.getFunctionName = getFunctionName;
    
    function formatSymbol(symbol) {
        return `{ name: ${unescapeLeadingUnderscores(symbol.escapedName)}; flags: ${formatSymbolFlags(symbol.flags)}; declarations: ${map(symbol.declarations, node => formatSyntaxKind(node.kind))} }`;
    }
    Debug.formatSymbol = formatSymbol;
    
    /**
     * Formats an enum value as a string for debugging and debug assertions.
     */
    function formatEnum(value = 0, enumObject, isFlags) {
        const members = getEnumMembers(enumObject);
        if (value === 0) {
            return members.length > 0 && members[0][0] === 0 ? members[0][1] : "0";
        }
        if (isFlags) {
            const result = [];
            let remainingFlags = value;
            for (const [enumValue, enumName] of members) {
                if (enumValue > value) {
                    break;
                }
                if (enumValue !== 0 && enumValue & value) {
                    result.push(enumName);
                    remainingFlags &= ~enumValue;
                }
            }
            if (remainingFlags === 0) {
                return result.join("|");
            }
        }
        else {
            for (const [enumValue, enumName] of members) {
                if (enumValue === value) {
                    return enumName;
                }
            }
        }
        return value.toString();
    }
    Debug.formatEnum = formatEnum;
    const enumMemberCache = new Map();
    function getEnumMembers(enumObject) {
        // Assuming enum objects do not change at runtime, we can cache the enum members list
        // to reuse later. This saves us from reconstructing this each and every time we call
        // a formatting function (which can be expensive for large enums like SyntaxKind).
        const existing = enumMemberCache.get(enumObject);
        if (existing) {
            return existing;
        }
        const result = [];
        for (const name in enumObject) {
            const value = enumObject[name];
            if (typeof value === "number") {
                result.push([value, name]);
            }
        }
        const sorted = toSorted(result, (x, y) => compareValues(x[0], y[0]));
        enumMemberCache.set(enumObject, sorted);
        return sorted;
    }
    function formatSyntaxKind(kind) {
        return formatEnum(kind, ts.SyntaxKind, /*isFlags*/ false);
    }
    Debug.formatSyntaxKind = formatSyntaxKind;
    function formatSnippetKind(kind) {
        return formatEnum(kind, ts.SnippetKind, /*isFlags*/ false);
    }
    Debug.formatSnippetKind = formatSnippetKind;
    function formatScriptKind(kind) {
        return formatEnum(kind, ts.ScriptKind, /*isFlags*/ false);
    }
    Debug.formatScriptKind = formatScriptKind;
    function formatNodeFlags(flags) {
        return formatEnum(flags, ts.NodeFlags, /*isFlags*/ true);
    }
    Debug.formatNodeFlags = formatNodeFlags;
    function formatNodeCheckFlags(flags) {
        return formatEnum(flags, ts.NodeCheckFlags, /*isFlags*/ true);
    }
    Debug.formatNodeCheckFlags = formatNodeCheckFlags;
    function formatModifierFlags(flags) {
        return formatEnum(flags, ts.ModifierFlags, /*isFlags*/ true);
    }
    Debug.formatModifierFlags = formatModifierFlags;
    function formatTransformFlags(flags) {
        return formatEnum(flags, ts.TransformFlags, /*isFlags*/ true);
    }
    Debug.formatTransformFlags = formatTransformFlags;
    function formatEmitFlags(flags) {
        return formatEnum(flags, ts.EmitFlags, /*isFlags*/ true);
    }
    Debug.formatEmitFlags = formatEmitFlags;
    function formatSymbolFlags(flags) {
        return formatEnum(flags, ts.SymbolFlags, /*isFlags*/ true);
    }
    Debug.formatSymbolFlags = formatSymbolFlags;
    function formatTypeFlags(flags) {
        return formatEnum(flags, ts.TypeFlags, /*isFlags*/ true);
    }
    Debug.formatTypeFlags = formatTypeFlags;
    function formatSignatureFlags(flags) {
        return formatEnum(flags, ts.SignatureFlags, /*isFlags*/ true);
    }
    Debug.formatSignatureFlags = formatSignatureFlags;
    function formatObjectFlags(flags) {
        return formatEnum(flags, ts.ObjectFlags, /*isFlags*/ true);
    }
    Debug.formatObjectFlags = formatObjectFlags;
    function formatFlowFlags(flags) {
        return formatEnum(flags, ts.FlowFlags, /*isFlags*/ true);
    }
    Debug.formatFlowFlags = formatFlowFlags;
    function formatRelationComparisonResult(result) {
        return formatEnum(result, ts.RelationComparisonResult, /*isFlags*/ true);
    }
    Debug.formatRelationComparisonResult = formatRelationComparisonResult;
    function formatCheckMode(mode) {
        return formatEnum(mode, ts.CheckMode, /*isFlags*/ true);
    }
    Debug.formatCheckMode = formatCheckMode;
    function formatSignatureCheckMode(mode) {
        return formatEnum(mode, ts.SignatureCheckMode, /*isFlags*/ true);
    }
    Debug.formatSignatureCheckMode = formatSignatureCheckMode;
    function formatTypeFacts(facts) {
        return formatEnum(facts, ts.TypeFacts, /*isFlags*/ true);
    }
    Debug.formatTypeFacts = formatTypeFacts;
    let isDebugInfoEnabled = false;
    let flowNodeProto;
    function attachFlowNodeDebugInfoWorker(flowNode) {
        if (!("__debugFlowFlags" in flowNode)) { // eslint-disable-line local/no-in-operator
            Object.defineProperties(flowNode, {
                // for use with vscode-js-debug's new customDescriptionGenerator in launch.json
                __tsDebuggerDisplay: {
                    value() {
                        const flowHeader = this.flags & FlowFlags.Start ? "FlowStart" :
                            this.flags & FlowFlags.BranchLabel ? "FlowBranchLabel" :
                                this.flags & FlowFlags.LoopLabel ? "FlowLoopLabel" :
                                    this.flags & FlowFlags.Assignment ? "FlowAssignment" :
                                        this.flags & FlowFlags.TrueCondition ? "FlowTrueCondition" :
                                            this.flags & FlowFlags.FalseCondition ? "FlowFalseCondition" :
                                                this.flags & FlowFlags.SwitchClause ? "FlowSwitchClause" :
                                                    this.flags & FlowFlags.ArrayMutation ? "FlowArrayMutation" :
                                                        this.flags & FlowFlags.Call ? "FlowCall" :
                                                            this.flags & FlowFlags.ReduceLabel ? "FlowReduceLabel" :
                                                                this.flags & FlowFlags.Unreachable ? "FlowUnreachable" :
                                                                    "UnknownFlow";
                        const remainingFlags = this.flags & ~(FlowFlags.Referenced - 1);
                        return `${flowHeader}${remainingFlags ? ` (${formatFlowFlags(remainingFlags)})` : ""}`;
                    },
                },
                __debugFlowFlags: {
                    get() {
                        return formatEnum(this.flags, ts.FlowFlags, /*isFlags*/ true);
                    },
                },
                __debugToString: {
                    value() {
                        return formatControlFlowGraph(this);
                    },
                },
            });
        }
    }
    function attachFlowNodeDebugInfo(flowNode) {
        if (isDebugInfoEnabled) {
            if (typeof Object.setPrototypeOf === "function") {
                // if we're in es2015, attach the method to a shared prototype for `FlowNode`
                // so the method doesn't show up in the watch window.
                if (!flowNodeProto) {
                    flowNodeProto = Object.create(Object.prototype);
                    attachFlowNodeDebugInfoWorker(flowNodeProto);
                }
                Object.setPrototypeOf(flowNode, flowNodeProto);
            }
            else {
                // not running in an es2015 environment, attach the method directly.
                attachFlowNodeDebugInfoWorker(flowNode);
            }
        }
        return flowNode;
    }
    Debug.attachFlowNodeDebugInfo = attachFlowNodeDebugInfo;
    let nodeArrayProto;
    function attachNodeArrayDebugInfoWorker(array) {
        if (!("__tsDebuggerDisplay" in array)) { // eslint-disable-line local/no-in-operator
            Object.defineProperties(array, {
                __tsDebuggerDisplay: {
                    value(defaultValue) {
                        // An `Array` with extra properties is rendered as `[A, B, prop1: 1, prop2: 2]`. Most of
                        // these aren't immediately useful so we trim off the `prop1: ..., prop2: ...` part from the
                        // formatted string.
                        // This regex can trigger slow backtracking because of overlapping potential captures.
                        // We don't care, this is debug code that's only enabled with a debugger attached -
                        // we're just taking note of it for anyone checking regex performance in the future.
                        defaultValue = String(defaultValue).replace(/(?:,[\s\w]+:[^,]+)+\]$/, "]");
                        return `NodeArray ${defaultValue}`;
                    },
                },
            });
        }
    }
    function attachNodeArrayDebugInfo(array) {
        if (isDebugInfoEnabled) {
            if (typeof Object.setPrototypeOf === "function") {
                // if we're in es2015, attach the method to a shared prototype for `NodeArray`
                // so the method doesn't show up in the watch window.
                if (!nodeArrayProto) {
                    nodeArrayProto = Object.create(Array.prototype);
                    attachNodeArrayDebugInfoWorker(nodeArrayProto);
                }
                Object.setPrototypeOf(array, nodeArrayProto);
            }
            else {
                // not running in an es2015 environment, attach the method directly.
                attachNodeArrayDebugInfoWorker(array);
            }
        }
    }
    Debug.attachNodeArrayDebugInfo = attachNodeArrayDebugInfo;
    /**
     * Injects debug information into frequently used types.
     */
    function enableDebugInfo() {
        if (isDebugInfoEnabled)
            return;
        // avoid recomputing
        const weakTypeTextMap = new WeakMap();
        const weakNodeTextMap = new WeakMap();
        // Add additional properties in debug mode to assist with debugging.
        Object.defineProperties(objectAllocator.getSymbolConstructor().prototype, {
            // for use with vscode-js-debug's new customDescriptionGenerator in launch.json
            __tsDebuggerDisplay: {
                value() {
                    const symbolHeader = this.flags & SymbolFlags.Transient ? "TransientSymbol" :
                        "Symbol";
                    const remainingSymbolFlags = this.flags & ~SymbolFlags.Transient;
                    return `${symbolHeader} '${symbolName(this)}'${remainingSymbolFlags ? ` (${formatSymbolFlags(remainingSymbolFlags)})` : ""}`;
                },
            },
            __debugFlags: {
                get() {
                    return formatSymbolFlags(this.flags);
                },
            },
        });
        Object.defineProperties(objectAllocator.getTypeConstructor().prototype, {
            // for use with vscode-js-debug's new customDescriptionGenerator in launch.json
            __tsDebuggerDisplay: {
                value() {
                    const typeHeader = this.flags & TypeFlags.Intrinsic ? `IntrinsicType ${this.intrinsicName}${this.debugIntrinsicName ? ` (${this.debugIntrinsicName})` : ""}` :
                        this.flags & TypeFlags.Nullable ? "NullableType" :
                            this.flags & TypeFlags.StringOrNumberLiteral ? `LiteralType ${JSON.stringify(this.value)}` :
                                this.flags & TypeFlags.BigIntLiteral ? `LiteralType ${this.value.negative ? "-" : ""}${this.value.base10Value}n` :
                                    this.flags & TypeFlags.UniqueESSymbol ? "UniqueESSymbolType" :
                                        this.flags & TypeFlags.Enum ? "EnumType" :
                                            this.flags & TypeFlags.Union ? "UnionType" :
                                                this.flags & TypeFlags.Intersection ? "IntersectionType" :
                                                    this.flags & TypeFlags.Index ? "IndexType" :
                                                        this.flags & TypeFlags.IndexedAccess ? "IndexedAccessType" :
                                                            this.flags & TypeFlags.Conditional ? "ConditionalType" :
                                                                this.flags & TypeFlags.Substitution ? "SubstitutionType" :
                                                                    this.flags & TypeFlags.TypeParameter ? "TypeParameter" :
                                                                        this.flags & TypeFlags.Object ?
                                                                            this.objectFlags & ObjectFlags.ClassOrInterface ? "InterfaceType" :
                                                                                this.objectFlags & ObjectFlags.Reference ? "TypeReference" :
                                                                                    this.objectFlags & ObjectFlags.Tuple ? "TupleType" :
                                                                                        this.objectFlags & ObjectFlags.Anonymous ? "AnonymousType" :
                                                                                            this.objectFlags & ObjectFlags.Mapped ? "MappedType" :
                                                                                                this.objectFlags & ObjectFlags.ReverseMapped ? "ReverseMappedType" :
                                                                                                    this.objectFlags & ObjectFlags.EvolvingArray ? "EvolvingArrayType" :
                                                                                                        "ObjectType" :
                                                                            "Type";
                    const remainingObjectFlags = this.flags & TypeFlags.Object ? this.objectFlags & ~ObjectFlags.ObjectTypeKindMask : 0;
                    return `${typeHeader}${this.symbol ? ` '${symbolName(this.symbol)}'` : ""}${remainingObjectFlags ? ` (${formatObjectFlags(remainingObjectFlags)})` : ""}`;
                },
            },
            __debugFlags: {
                get() {
                    return formatTypeFlags(this.flags);
                },
            },
            __debugObjectFlags: {
                get() {
                    return this.flags & TypeFlags.Object ? formatObjectFlags(this.objectFlags) : "";
                },
            },
            __debugTypeToString: {
                value() {
                    // avoid recomputing
                    let text = weakTypeTextMap.get(this);
                    if (text === undefined) {
                        text = this.checker.typeToString(this);
                        weakTypeTextMap.set(this, text);
                    }
                    return text;
                },
            },
        });
        Object.defineProperties(objectAllocator.getSignatureConstructor().prototype, {
            __debugFlags: {
                get() {
                    return formatSignatureFlags(this.flags);
                },
            },
            __debugSignatureToString: {
                value() {
                    var _a;
                    return (_a = this.checker) === null || _a === void 0 ? void 0 : _a.signatureToString(this);
                },
            },
        });
        const nodeConstructors = [
            objectAllocator.getNodeConstructor(),
            objectAllocator.getIdentifierConstructor(),
            objectAllocator.getTokenConstructor(),
            objectAllocator.getSourceFileConstructor(),
        ];
        for (const ctor of nodeConstructors) {
            if (!hasProperty(ctor.prototype, "__debugKind")) {
                Object.defineProperties(ctor.prototype, {
                    // for use with vscode-js-debug's new customDescriptionGenerator in launch.json
                    __tsDebuggerDisplay: {
                        value() {
                            const nodeHeader = isGeneratedIdentifier(this) ? "GeneratedIdentifier" :
                                isIdentifier(this) ? `Identifier '${idText(this)}'` :
                                    isPrivateIdentifier(this) ? `PrivateIdentifier '${idText(this)}'` :
                                        isStringLiteral(this) ? `StringLiteral ${JSON.stringify(this.text.length < 10 ? this.text : this.text.slice(10) + "...")}` :
                                            isNumericLiteral(this) ? `NumericLiteral ${this.text}` :
                                                isBigIntLiteral(this) ? `BigIntLiteral ${this.text}n` :
                                                    isTypeParameterDeclaration(this) ? "TypeParameterDeclaration" :
                                                        isParameter(this) ? "ParameterDeclaration" :
                                                            isConstructorDeclaration(this) ? "ConstructorDeclaration" :
                                                                isGetAccessorDeclaration(this) ? "GetAccessorDeclaration" :
                                                                    isSetAccessorDeclaration(this) ? "SetAccessorDeclaration" :
                                                                        isCallSignatureDeclaration(this) ? "CallSignatureDeclaration" :
                                                                            isConstructSignatureDeclaration(this) ? "ConstructSignatureDeclaration" :
                                                                                isIndexSignatureDeclaration(this) ? "IndexSignatureDeclaration" :
                                                                                    isTypePredicateNode(this) ? "TypePredicateNode" :
                                                                                        isTypeReferenceNode(this) ? "TypeReferenceNode" :
                                                                                            isFunctionTypeNode(this) ? "FunctionTypeNode" :
                                                                                                isConstructorTypeNode(this) ? "ConstructorTypeNode" :
                                                                                                    isTypeQueryNode(this) ? "TypeQueryNode" :
                                                                                                        isTypeLiteralNode(this) ? "TypeLiteralNode" :
                                                                                                            isArrayTypeNode(this) ? "ArrayTypeNode" :
                                                                                                                isTupleTypeNode(this) ? "TupleTypeNode" :
                                                                                                                    isOptionalTypeNode(this) ? "OptionalTypeNode" :
                                                                                                                        isRestTypeNode(this) ? "RestTypeNode" :
                                                                                                                            isUnionTypeNode(this) ? "UnionTypeNode" :
                                                                                                                                isIntersectionTypeNode(this) ? "IntersectionTypeNode" :
                                                                                                                                    isConditionalTypeNode(this) ? "ConditionalTypeNode" :
                                                                                                                                        isInferTypeNode(this) ? "InferTypeNode" :
                                                                                                                                            isParenthesizedTypeNode(this) ? "ParenthesizedTypeNode" :
                                                                                                                                                isThisTypeNode(this) ? "ThisTypeNode" :
                                                                                                                                                    isTypeOperatorNode(this) ? "TypeOperatorNode" :
                                                                                                                                                        isIndexedAccessTypeNode(this) ? "IndexedAccessTypeNode" :
                                                                                                                                                            isMappedTypeNode(this) ? "MappedTypeNode" :
                                                                                                                                                                isLiteralTypeNode(this) ? "LiteralTypeNode" :
                                                                                                                                                                    isNamedTupleMember(this) ? "NamedTupleMember" :
                                                                                                                                                                        isImportTypeNode(this) ? "ImportTypeNode" :
                                                                                                                                                                            formatSyntaxKind(this.kind);
                            return `${nodeHeader}${this.flags ? ` (${formatNodeFlags(this.flags)})` : ""}`;
                        },
                    },
                    __debugKind: {
                        get() {
                            return formatSyntaxKind(this.kind);
                        },
                    },
                    __debugNodeFlags: {
                        get() {
                            return formatNodeFlags(this.flags);
                        },
                    },
                    __debugModifierFlags: {
                        get() {
                            return formatModifierFlags(getEffectiveModifierFlagsNoCache(this));
                        },
                    },
                    __debugTransformFlags: {
                        get() {
                            return formatTransformFlags(this.transformFlags);
                        },
                    },
                    __debugIsParseTreeNode: {
                        get() {
                            return isParseTreeNode(this);
                        },
                    },
                    __debugEmitFlags: {
                        get() {
                            return formatEmitFlags(getEmitFlags(this));
                        },
                    },
                    __debugGetText: {
                        value(includeTrivia) {
                            if (nodeIsSynthesized(this))
                                return "";
                            // avoid recomputing
                            let text = weakNodeTextMap.get(this);
                            if (text === undefined) {
                                const parseNode = getParseTreeNode(this);
                                const sourceFile = parseNode && getSourceFileOfNode(parseNode);
                                text = sourceFile ? getSourceTextOfNodeFromSourceFile(sourceFile, parseNode, includeTrivia) : "";
                                weakNodeTextMap.set(this, text);
                            }
                            return text;
                        },
                    },
                });
            }
        }
        isDebugInfoEnabled = true;
    }
    Debug.enableDebugInfo = enableDebugInfo;
    function formatVariance(varianceFlags) {
        const variance = varianceFlags & VarianceFlags.VarianceMask;
        let result = variance === VarianceFlags.Invariant ? "in out" :
            variance === VarianceFlags.Bivariant ? "[bivariant]" :
                variance === VarianceFlags.Contravariant ? "in" :
                    variance === VarianceFlags.Covariant ? "out" :
                        variance === VarianceFlags.Independent ? "[independent]" : "";
        if (varianceFlags & VarianceFlags.Unmeasurable) {
            result += " (unmeasurable)";
        }
        else if (varianceFlags & VarianceFlags.Unreliable) {
            result += " (unreliable)";
        }
        return result;
    }
    Debug.formatVariance = formatVariance;
    class DebugTypeMapper {
        __debugToString() {
            var _a;
            type(this);
            switch (this.kind) {
                case TypeMapKind.Function:
                    return ((_a = this.debugInfo) === null || _a === void 0 ? void 0 : _a.call(this)) || "(function mapper)";
                case TypeMapKind.Simple:
                    return `${this.source.__debugTypeToString()} -> ${this.target.__debugTypeToString()}`;
                case TypeMapKind.Array:
                    return zipWith(this.sources, this.targets || map(this.sources, () => "any"), (s, t) => `${s.__debugTypeToString()} -> ${typeof t === "string" ? t : t.__debugTypeToString()}`).join(", ");
                case TypeMapKind.Deferred:
                    return zipWith(this.sources, this.targets, (s, t) => `${s.__debugTypeToString()} -> ${t().__debugTypeToString()}`).join(", ");
                case TypeMapKind.Merged:
                case TypeMapKind.Composite:
                    return `m1: ${this.mapper1.__debugToString().split("\n").join("\n    ")}
m2: ${this.mapper2.__debugToString().split("\n").join("\n    ")}`;
                default:
                    return assertNever(this);
            }
        }
    }
    Debug.DebugTypeMapper = DebugTypeMapper;
    function attachDebugPrototypeIfDebug(mapper) {
        if (Debug.isDebugging) {
            return Object.setPrototypeOf(mapper, DebugTypeMapper.prototype);
        }
        return mapper;
    }
    Debug.attachDebugPrototypeIfDebug = attachDebugPrototypeIfDebug;
    function printControlFlowGraph(flowNode) {
        return console.log(formatControlFlowGraph(flowNode));
    }
    Debug.printControlFlowGraph = printControlFlowGraph;
    function formatControlFlowGraph(flowNode) {
        let nextDebugFlowId = -1;
        function getDebugFlowNodeId(f) {
            if (!f.id) {
                f.id = nextDebugFlowId;
                nextDebugFlowId--;
            }
            return f.id;
        }
        let BoxCharacter;
        (function (BoxCharacter) {
            BoxCharacter["lr"] = "\u2500";
            BoxCharacter["ud"] = "\u2502";
            BoxCharacter["dr"] = "\u256D";
            BoxCharacter["dl"] = "\u256E";
            BoxCharacter["ul"] = "\u256F";
            BoxCharacter["ur"] = "\u2570";
            BoxCharacter["udr"] = "\u251C";
            BoxCharacter["udl"] = "\u2524";
            BoxCharacter["dlr"] = "\u252C";
            BoxCharacter["ulr"] = "\u2534";
            BoxCharacter["udlr"] = "\u256B";
        })(BoxCharacter || (BoxCharacter = {}));
        let Connection;
        (function (Connection) {
            Connection[Connection["None"] = 0] = "None";
            Connection[Connection["Up"] = 1] = "Up";
            Connection[Connection["Down"] = 2] = "Down";
            Connection[Connection["Left"] = 4] = "Left";
            Connection[Connection["Right"] = 8] = "Right";
            Connection[Connection["UpDown"] = 3] = "UpDown";
            Connection[Connection["LeftRight"] = 12] = "LeftRight";
            Connection[Connection["UpLeft"] = 5] = "UpLeft";
            Connection[Connection["UpRight"] = 9] = "UpRight";
            Connection[Connection["DownLeft"] = 6] = "DownLeft";
            Connection[Connection["DownRight"] = 10] = "DownRight";
            Connection[Connection["UpDownLeft"] = 7] = "UpDownLeft";
            Connection[Connection["UpDownRight"] = 11] = "UpDownRight";
            Connection[Connection["UpLeftRight"] = 13] = "UpLeftRight";
            Connection[Connection["DownLeftRight"] = 14] = "DownLeftRight";
            Connection[Connection["UpDownLeftRight"] = 15] = "UpDownLeftRight";
            Connection[Connection["NoChildren"] = 16] = "NoChildren";
        })(Connection || (Connection = {}));
        const hasAntecedentFlags = FlowFlags.Assignment |
            FlowFlags.Condition |
            FlowFlags.SwitchClause |
            FlowFlags.ArrayMutation |
            FlowFlags.Call |
            FlowFlags.ReduceLabel;
        const hasNodeFlags = FlowFlags.Start |
            FlowFlags.Assignment |
            FlowFlags.Call |
            FlowFlags.Condition |
            FlowFlags.ArrayMutation;
        const links = Object.create(/*o*/ null); // eslint-disable-line no-restricted-syntax
        const nodes = [];
        const edges = [];
        const root = buildGraphNode(flowNode, new Set());
        for (const node of nodes) {
            node.text = renderFlowNode(node.flowNode, node.circular);
            computeLevel(node);
        }
        const height = computeHeight(root);
        const columnWidths = computeColumnWidths(height);
        computeLanes(root, 0);
        return renderGraph();
        function isFlowSwitchClause(f) {
            return !!(f.flags & FlowFlags.SwitchClause);
        }
        function hasAntecedents(f) {
            return !!(f.flags & FlowFlags.Label) && !!f.antecedent;
        }
        function hasAntecedent(f) {
            return !!(f.flags & hasAntecedentFlags);
        }
        function hasNode(f) {
            return !!(f.flags & hasNodeFlags);
        }
        function getChildren(node) {
            const children = [];
            for (const edge of node.edges) {
                if (edge.source === node) {
                    children.push(edge.target);
                }
            }
            return children;
        }
        function getParents(node) {
            const parents = [];
            for (const edge of node.edges) {
                if (edge.target === node) {
                    parents.push(edge.source);
                }
            }
            return parents;
        }
        function buildGraphNode(flowNode, seen) {
            const id = getDebugFlowNodeId(flowNode);
            let graphNode = links[id];
            if (graphNode && seen.has(flowNode)) {
                graphNode.circular = true;
                graphNode = {
                    id: -1,
                    flowNode,
                    edges: [],
                    text: "",
                    lane: -1,
                    endLane: -1,
                    level: -1,
                    circular: "circularity",
                };
                nodes.push(graphNode);
                return graphNode;
            }
            seen.add(flowNode);
            if (!graphNode) {
                links[id] = graphNode = { id, flowNode, edges: [], text: "", lane: -1, endLane: -1, level: -1, circular: false };
                nodes.push(graphNode);
                if (hasAntecedents(flowNode)) {
                    for (const antecedent of flowNode.antecedent) {
                        buildGraphEdge(graphNode, antecedent, seen);
                    }
                }
                else if (hasAntecedent(flowNode)) {
                    buildGraphEdge(graphNode, flowNode.antecedent, seen);
                }
            }
            seen.delete(flowNode);
            return graphNode;
        }
        function buildGraphEdge(source, antecedent, seen) {
            const target = buildGraphNode(antecedent, seen);
            const edge = { source, target };
            edges.push(edge);
            source.edges.push(edge);
            target.edges.push(edge);
        }
        function computeLevel(node) {
            if (node.level !== -1) {
                return node.level;
            }
            let level = 0;
            for (const parent of getParents(node)) {
                level = Math.max(level, computeLevel(parent) + 1);
            }
            return node.level = level;
        }
        function computeHeight(node) {
            let height = 0;
            for (const child of getChildren(node)) {
                height = Math.max(height, computeHeight(child));
            }
            return height + 1;
        }
        function computeColumnWidths(height) {
            const columns = fill(Array(height), 0);
            for (const node of nodes) {
                columns[node.level] = Math.max(columns[node.level], node.text.length);
            }
            return columns;
        }
        function computeLanes(node, lane) {
            if (node.lane === -1) {
                node.lane = lane;
                node.endLane = lane;
                const children = getChildren(node);
                for (let i = 0; i < children.length; i++) {
                    if (i > 0)
                        lane++;
                    const child = children[i];
                    computeLanes(child, lane);
                    if (child.endLane > node.endLane) {
                        lane = child.endLane;
                    }
                }
                node.endLane = lane;
            }
        }
        function getHeader(flags) {
            if (flags & FlowFlags.Start)
                return "Start";
            if (flags & FlowFlags.BranchLabel)
                return "Branch";
            if (flags & FlowFlags.LoopLabel)
                return "Loop";
            if (flags & FlowFlags.Assignment)
                return "Assignment";
            if (flags & FlowFlags.TrueCondition)
                return "True";
            if (flags & FlowFlags.FalseCondition)
                return "False";
            if (flags & FlowFlags.SwitchClause)
                return "SwitchClause";
            if (flags & FlowFlags.ArrayMutation)
                return "ArrayMutation";
            if (flags & FlowFlags.Call)
                return "Call";
            if (flags & FlowFlags.ReduceLabel)
                return "ReduceLabel";
            if (flags & FlowFlags.Unreachable)
                return "Unreachable";
            throw new Error();
        }
        function getNodeText(node) {
            const sourceFile = getSourceFileOfNode(node);
            return getSourceTextOfNodeFromSourceFile(sourceFile, node, /*includeTrivia*/ false);
        }
        function renderFlowNode(flowNode, circular) {
            let text = getHeader(flowNode.flags);
            if (circular) {
                text = `${text}#${getDebugFlowNodeId(flowNode)}`;
            }
            if (isFlowSwitchClause(flowNode)) {
                const clauses = [];
                const { switchStatement, clauseStart, clauseEnd } = flowNode.node;
                for (let i = clauseStart; i < clauseEnd; i++) {
                    const clause = switchStatement.caseBlock.clauses[i];
                    if (isDefaultClause(clause)) {
                        clauses.push("default");
                    }
                    else {
                        clauses.push(getNodeText(clause.expression));
                    }
                }
                text += ` (${clauses.join(", ")})`;
            }
            else if (hasNode(flowNode)) {
                if (flowNode.node) {
                    text += ` (${getNodeText(flowNode.node)})`;
                }
            }
            return circular === "circularity" ? `Circular(${text})` : text;
        }
        function renderGraph() {
            const columnCount = columnWidths.length;
            const laneCount = maxBy(nodes, 0, n => n.lane) + 1;
            const lanes = fill(Array(laneCount), "");
            const grid = columnWidths.map(() => Array(laneCount));
            const connectors = columnWidths.map(() => fill(Array(laneCount), 0));
            // build connectors
            for (const node of nodes) {
                grid[node.level][node.lane] = node;
                const children = getChildren(node);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    let connector = 8 /* Connection.Right */;
                    if (child.lane === node.lane)
                        connector |= 4 /* Connection.Left */;
                    if (i > 0)
                        connector |= 1 /* Connection.Up */;
                    if (i < children.length - 1)
                        connector |= 2 /* Connection.Down */;
                    connectors[node.level][child.lane] |= connector;
                }
                if (children.length === 0) {
                    connectors[node.level][node.lane] |= 16 /* Connection.NoChildren */;
                }
                const parents = getParents(node);
                for (let i = 0; i < parents.length; i++) {
                    const parent = parents[i];
                    let connector = 4 /* Connection.Left */;
                    if (i > 0)
                        connector |= 1 /* Connection.Up */;
                    if (i < parents.length - 1)
                        connector |= 2 /* Connection.Down */;
                    connectors[node.level - 1][parent.lane] |= connector;
                }
            }
            // fill in missing connectors
            for (let column = 0; column < columnCount; column++) {
                for (let lane = 0; lane < laneCount; lane++) {
                    const left = column > 0 ? connectors[column - 1][lane] : 0;
                    const above = lane > 0 ? connectors[column][lane - 1] : 0;
                    let connector = connectors[column][lane];
                    if (!connector) {
                        if (left & 8 /* Connection.Right */)
                            connector |= 12 /* Connection.LeftRight */;
                        if (above & 2 /* Connection.Down */)
                            connector |= 3 /* Connection.UpDown */;
                        connectors[column][lane] = connector;
                    }
                }
            }
            for (let column = 0; column < columnCount; column++) {
                for (let lane = 0; lane < lanes.length; lane++) {
                    const connector = connectors[column][lane];
                    const fill = connector & 4 /* Connection.Left */ ? "\u2500" /* BoxCharacter.lr */ : " ";
                    const node = grid[column][lane];
                    if (!node) {
                        if (column < columnCount - 1) {
                            writeLane(lane, repeat(fill, columnWidths[column] + 1));
                        }
                    }
                    else {
                        writeLane(lane, node.text);
                        if (column < columnCount - 1) {
                            writeLane(lane, " ");
                            writeLane(lane, repeat(fill, columnWidths[column] - node.text.length));
                        }
                    }
                    writeLane(lane, getBoxCharacter(connector));
                    writeLane(lane, connector & 8 /* Connection.Right */ && column < columnCount - 1 && !grid[column + 1][lane] ? "\u2500" /* BoxCharacter.lr */ : " ");
                }
            }
            return `\n${lanes.join("\n")}\n`;
            function writeLane(lane, text) {
                lanes[lane] += text;
            }
        }
        function getBoxCharacter(connector) {
            switch (connector) {
                case 3 /* Connection.UpDown */:
                    return "\u2502" /* BoxCharacter.ud */;
                case 12 /* Connection.LeftRight */:
                    return "\u2500" /* BoxCharacter.lr */;
                case 5 /* Connection.UpLeft */:
                    return "\u256F" /* BoxCharacter.ul */;
                case 9 /* Connection.UpRight */:
                    return "\u2570" /* BoxCharacter.ur */;
                case 6 /* Connection.DownLeft */:
                    return "\u256E" /* BoxCharacter.dl */;
                case 10 /* Connection.DownRight */:
                    return "\u256D" /* BoxCharacter.dr */;
                case 7 /* Connection.UpDownLeft */:
                    return "\u2524" /* BoxCharacter.udl */;
                case 11 /* Connection.UpDownRight */:
                    return "\u251C" /* BoxCharacter.udr */;
                case 13 /* Connection.UpLeftRight */:
                    return "\u2534" /* BoxCharacter.ulr */;
                case 14 /* Connection.DownLeftRight */:
                    return "\u252C" /* BoxCharacter.dlr */;
                case 15 /* Connection.UpDownLeftRight */:
                    return "\u256B" /* BoxCharacter.udlr */;
            }
            return " ";
        }
        function fill(array, value) {
            if (array.fill) {
                array.fill(value);
            }
            else {
                for (let i = 0; i < array.length; i++) {
                    array[i] = value;
                }
            }
            return array;
        }
        function repeat(ch, length) {
            if (ch.repeat) {
                return length > 0 ? ch.repeat(length) : "";
            }
            let s = "";
            while (s.length < length) {
                s += ch;
            }
            return s;
        }
    }
    Debug.formatControlFlowGraph = formatControlFlowGraph;
})(Debug || (Debug = {}));
