import {
  createTextRangeWithKind,
} from "../namespaces/ts.formatting.js";

import {
  append,
  createScanner,
  Debug,
  isJsxAttribute,
  isJsxElement,
  isJsxText,
  isKeyword,
  isToken,
  isTrivia,
  LanguageVariant,
  last,
  ScriptTarget,
  SyntaxKind,
} from "../namespaces/ts.js";


const standardScanner = createScanner(ScriptTarget.Latest, /*skipTrivia*/ false, LanguageVariant.Standard);
const jsxScanner = createScanner(ScriptTarget.Latest, /*skipTrivia*/ false, LanguageVariant.JSX);

var ScanAction;
(function (ScanAction) {
    ScanAction[ScanAction["Scan"] = 0] = "Scan";
    ScanAction[ScanAction["RescanGreaterThanToken"] = 1] = "RescanGreaterThanToken";
    ScanAction[ScanAction["RescanSlashToken"] = 2] = "RescanSlashToken";
    ScanAction[ScanAction["RescanTemplateToken"] = 3] = "RescanTemplateToken";
    ScanAction[ScanAction["RescanJsxIdentifier"] = 4] = "RescanJsxIdentifier";
    ScanAction[ScanAction["RescanJsxText"] = 5] = "RescanJsxText";
    ScanAction[ScanAction["RescanJsxAttributeValue"] = 6] = "RescanJsxAttributeValue";
})(ScanAction || (ScanAction = {}));

/** @internal */
export function getFormattingScanner(text, languageVariant, startPos, endPos, cb) {
    const scanner = languageVariant === LanguageVariant.JSX ? jsxScanner : standardScanner;
    scanner.setText(text);
    scanner.resetTokenState(startPos);
    let wasNewLine = true;
    let leadingTrivia;
    let trailingTrivia;
    let savedPos;
    let lastScanAction;
    let lastTokenInfo;
    const res = cb({
        advance,
        readTokenInfo,
        readEOFTokenRange,
        isOnToken,
        isOnEOF,
        getCurrentLeadingTrivia: () => leadingTrivia,
        lastTrailingTriviaWasNewLine: () => wasNewLine,
        skipToEndOf,
        skipToStartOf,
        getTokenFullStart: () => { var _a; return (_a = lastTokenInfo === null || lastTokenInfo === void 0 ? void 0 : lastTokenInfo.token.pos) !== null && _a !== void 0 ? _a : scanner.getTokenStart(); },
        getStartPos: () => { var _a; return (_a = lastTokenInfo === null || lastTokenInfo === void 0 ? void 0 : lastTokenInfo.token.pos) !== null && _a !== void 0 ? _a : scanner.getTokenStart(); },
    });
    lastTokenInfo = undefined;
    scanner.setText(undefined);
    return res;
    function advance() {
        lastTokenInfo = undefined;
        const isStarted = scanner.getTokenFullStart() !== startPos;
        if (isStarted) {
            wasNewLine = !!trailingTrivia && last(trailingTrivia).kind === SyntaxKind.NewLineTrivia;
        }
        else {
            scanner.scan();
        }
        leadingTrivia = undefined;
        trailingTrivia = undefined;
        let pos = scanner.getTokenFullStart();
        // Read leading trivia and token
        while (pos < endPos) {
            const t = scanner.getToken();
            if (!isTrivia(t)) {
                break;
            }
            // consume leading trivia
            scanner.scan();
            const item = {
                pos,
                end: scanner.getTokenFullStart(),
                kind: t,
            };
            pos = scanner.getTokenFullStart();
            leadingTrivia = append(leadingTrivia, item);
        }
        savedPos = scanner.getTokenFullStart();
    }
    function shouldRescanGreaterThanToken(node) {
        switch (node.kind) {
            case SyntaxKind.GreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            case SyntaxKind.GreaterThanGreaterThanToken:
                return true;
        }
        return false;
    }
    function shouldRescanJsxIdentifier(node) {
        if (node.parent) {
            switch (node.parent.kind) {
                case SyntaxKind.JsxAttribute:
                case SyntaxKind.JsxOpeningElement:
                case SyntaxKind.JsxClosingElement:
                case SyntaxKind.JsxSelfClosingElement:
                    // May parse an identifier like `module-layout`; that will be scanned as a keyword at first, but we should parse the whole thing to get an identifier.
                    return isKeyword(node.kind) || node.kind === SyntaxKind.Identifier;
            }
        }
        return false;
    }
    function shouldRescanJsxText(node) {
        return isJsxText(node) || isJsxElement(node) && (lastTokenInfo === null || lastTokenInfo === void 0 ? void 0 : lastTokenInfo.token.kind) === SyntaxKind.JsxText;
    }
    function shouldRescanSlashToken(container) {
        return container.kind === SyntaxKind.RegularExpressionLiteral;
    }
    function shouldRescanTemplateToken(container) {
        return container.kind === SyntaxKind.TemplateMiddle ||
            container.kind === SyntaxKind.TemplateTail;
    }
    function shouldRescanJsxAttributeValue(node) {
        return node.parent && isJsxAttribute(node.parent) && node.parent.initializer === node;
    }
    function startsWithSlashToken(t) {
        return t === SyntaxKind.SlashToken || t === SyntaxKind.SlashEqualsToken;
    }
    function readTokenInfo(n) {
        Debug.assert(isOnToken());
        // normally scanner returns the smallest available token
        // check the kind of context node to determine if scanner should have more greedy behavior and consume more text.
        const expectedScanAction = shouldRescanGreaterThanToken(n) ? 1 /* ScanAction.RescanGreaterThanToken */ :
            shouldRescanSlashToken(n) ? 2 /* ScanAction.RescanSlashToken */ :
                shouldRescanTemplateToken(n) ? 3 /* ScanAction.RescanTemplateToken */ :
                    shouldRescanJsxIdentifier(n) ? 4 /* ScanAction.RescanJsxIdentifier */ :
                        shouldRescanJsxText(n) ? 5 /* ScanAction.RescanJsxText */ :
                            shouldRescanJsxAttributeValue(n) ? 6 /* ScanAction.RescanJsxAttributeValue */ :
                                0 /* ScanAction.Scan */;
        if (lastTokenInfo && expectedScanAction === lastScanAction) {
            // readTokenInfo was called before with the same expected scan action.
            // No need to re-scan text, return existing 'lastTokenInfo'
            // it is ok to call fixTokenKind here since it does not affect
            // what portion of text is consumed. In contrast rescanning can change it,
            // i.e. for '>=' when originally scanner eats just one character
            // and rescanning forces it to consume more.
            return fixTokenKind(lastTokenInfo, n);
        }
        if (scanner.getTokenFullStart() !== savedPos) {
            Debug.assert(lastTokenInfo !== undefined);
            // readTokenInfo was called before but scan action differs - rescan text
            scanner.resetTokenState(savedPos);
            scanner.scan();
        }
        let currentToken = getNextToken(n, expectedScanAction);
        const token = createTextRangeWithKind(scanner.getTokenFullStart(), scanner.getTokenEnd(), currentToken);
        // consume trailing trivia
        if (trailingTrivia) {
            trailingTrivia = undefined;
        }
        while (scanner.getTokenFullStart() < endPos) {
            currentToken = scanner.scan();
            if (!isTrivia(currentToken)) {
                break;
            }
            const trivia = createTextRangeWithKind(scanner.getTokenFullStart(), scanner.getTokenEnd(), currentToken);
            if (!trailingTrivia) {
                trailingTrivia = [];
            }
            trailingTrivia.push(trivia);
            if (currentToken === SyntaxKind.NewLineTrivia) {
                // move past new line
                scanner.scan();
                break;
            }
        }
        lastTokenInfo = { leadingTrivia, trailingTrivia, token };
        return fixTokenKind(lastTokenInfo, n);
    }
    function getNextToken(n, expectedScanAction) {
        const token = scanner.getToken();
        lastScanAction = 0 /* ScanAction.Scan */;
        switch (expectedScanAction) {
            case 1 /* ScanAction.RescanGreaterThanToken */:
                if (token === SyntaxKind.GreaterThanToken) {
                    lastScanAction = 1 /* ScanAction.RescanGreaterThanToken */;
                    const newToken = scanner.reScanGreaterToken();
                    Debug.assert(n.kind === newToken);
                    return newToken;
                }
                break;
            case 2 /* ScanAction.RescanSlashToken */:
                if (startsWithSlashToken(token)) {
                    lastScanAction = 2 /* ScanAction.RescanSlashToken */;
                    const newToken = scanner.reScanSlashToken();
                    Debug.assert(n.kind === newToken);
                    return newToken;
                }
                break;
            case 3 /* ScanAction.RescanTemplateToken */:
                if (token === SyntaxKind.CloseBraceToken) {
                    lastScanAction = 3 /* ScanAction.RescanTemplateToken */;
                    return scanner.reScanTemplateToken(/*isTaggedTemplate*/ false);
                }
                break;
            case 4 /* ScanAction.RescanJsxIdentifier */:
                lastScanAction = 4 /* ScanAction.RescanJsxIdentifier */;
                return scanner.scanJsxIdentifier();
            case 5 /* ScanAction.RescanJsxText */:
                lastScanAction = 5 /* ScanAction.RescanJsxText */;
                return scanner.reScanJsxToken(/*allowMultilineJsxText*/ false);
            case 6 /* ScanAction.RescanJsxAttributeValue */:
                lastScanAction = 6 /* ScanAction.RescanJsxAttributeValue */;
                return scanner.reScanJsxAttributeValue();
            case 0 /* ScanAction.Scan */:
                break;
            default:
                Debug.assertNever(expectedScanAction);
        }
        return token;
    }
    function readEOFTokenRange() {
        Debug.assert(isOnEOF());
        return createTextRangeWithKind(scanner.getTokenFullStart(), scanner.getTokenEnd(), SyntaxKind.EndOfFileToken);
    }
    function isOnToken() {
        const current = lastTokenInfo ? lastTokenInfo.token.kind : scanner.getToken();
        return current !== SyntaxKind.EndOfFileToken && !isTrivia(current);
    }
    function isOnEOF() {
        const current = lastTokenInfo ? lastTokenInfo.token.kind : scanner.getToken();
        return current === SyntaxKind.EndOfFileToken;
    }
    // when containing node in the tree is token
    // but its kind differs from the kind that was returned by the scanner,
    // then kind needs to be fixed. This might happen in cases
    // when parser interprets token differently, i.e keyword treated as identifier
    function fixTokenKind(tokenInfo, container) {
        if (isToken(container) && tokenInfo.token.kind !== container.kind) {
            tokenInfo.token.kind = container.kind;
        }
        return tokenInfo;
    }
    function skipToEndOf(node) {
        scanner.resetTokenState(node.end);
        savedPos = scanner.getTokenFullStart();
        lastScanAction = undefined;
        lastTokenInfo = undefined;
        wasNewLine = false;
        leadingTrivia = undefined;
        trailingTrivia = undefined;
    }
    function skipToStartOf(node) {
        scanner.resetTokenState(node.pos);
        savedPos = scanner.getTokenFullStart();
        lastScanAction = undefined;
        lastTokenInfo = undefined;
        wasNewLine = false;
        leadingTrivia = undefined;
        trailingTrivia = undefined;
    }
}
