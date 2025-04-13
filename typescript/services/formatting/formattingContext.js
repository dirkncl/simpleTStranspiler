import { Debug, findChildOfKind, SyntaxKind, } from "../namespaces/ts.js";

/** @internal */
export var FormattingRequestKind;
(function (FormattingRequestKind) {
    FormattingRequestKind[FormattingRequestKind["FormatDocument"] = 0] = "FormatDocument";
    FormattingRequestKind[FormattingRequestKind["FormatSelection"] = 1] = "FormatSelection";
    FormattingRequestKind[FormattingRequestKind["FormatOnEnter"] = 2] = "FormatOnEnter";
    FormattingRequestKind[FormattingRequestKind["FormatOnSemicolon"] = 3] = "FormatOnSemicolon";
    FormattingRequestKind[FormattingRequestKind["FormatOnOpeningCurlyBrace"] = 4] = "FormatOnOpeningCurlyBrace";
    FormattingRequestKind[FormattingRequestKind["FormatOnClosingCurlyBrace"] = 5] = "FormatOnClosingCurlyBrace";
})(FormattingRequestKind || (FormattingRequestKind = {}));

/** @internal */
export class FormattingContext {
    constructor(sourceFile, formattingRequestKind, options) {
        this.sourceFile = sourceFile;
        this.formattingRequestKind = formattingRequestKind;
        this.options = options;
    }
    updateContext(currentRange, currentTokenParent, nextRange, nextTokenParent, commonParent) {
        this.currentTokenSpan = Debug.checkDefined(currentRange);
        this.currentTokenParent = Debug.checkDefined(currentTokenParent);
        this.nextTokenSpan = Debug.checkDefined(nextRange);
        this.nextTokenParent = Debug.checkDefined(nextTokenParent);
        this.contextNode = Debug.checkDefined(commonParent);
        // drop cached results
        this.contextNodeAllOnSameLine = undefined;
        this.nextNodeAllOnSameLine = undefined;
        this.tokensAreOnSameLine = undefined;
        this.contextNodeBlockIsOnOneLine = undefined;
        this.nextNodeBlockIsOnOneLine = undefined;
    }
    ContextNodeAllOnSameLine() {
        if (this.contextNodeAllOnSameLine === undefined) {
            this.contextNodeAllOnSameLine = this.NodeIsOnOneLine(this.contextNode);
        }
        return this.contextNodeAllOnSameLine;
    }
    NextNodeAllOnSameLine() {
        if (this.nextNodeAllOnSameLine === undefined) {
            this.nextNodeAllOnSameLine = this.NodeIsOnOneLine(this.nextTokenParent);
        }
        return this.nextNodeAllOnSameLine;
    }
    TokensAreOnSameLine() {
        if (this.tokensAreOnSameLine === undefined) {
            const startLine = this.sourceFile.getLineAndCharacterOfPosition(this.currentTokenSpan.pos).line;
            const endLine = this.sourceFile.getLineAndCharacterOfPosition(this.nextTokenSpan.pos).line;
            this.tokensAreOnSameLine = startLine === endLine;
        }
        return this.tokensAreOnSameLine;
    }
    ContextNodeBlockIsOnOneLine() {
        if (this.contextNodeBlockIsOnOneLine === undefined) {
            this.contextNodeBlockIsOnOneLine = this.BlockIsOnOneLine(this.contextNode);
        }
        return this.contextNodeBlockIsOnOneLine;
    }
    NextNodeBlockIsOnOneLine() {
        if (this.nextNodeBlockIsOnOneLine === undefined) {
            this.nextNodeBlockIsOnOneLine = this.BlockIsOnOneLine(this.nextTokenParent);
        }
        return this.nextNodeBlockIsOnOneLine;
    }
    NodeIsOnOneLine(node) {
        const startLine = this.sourceFile.getLineAndCharacterOfPosition(node.getStart(this.sourceFile)).line;
        const endLine = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
        return startLine === endLine;
    }
    BlockIsOnOneLine(node) {
        const openBrace = findChildOfKind(node, SyntaxKind.OpenBraceToken, this.sourceFile);
        const closeBrace = findChildOfKind(node, SyntaxKind.CloseBraceToken, this.sourceFile);
        if (openBrace && closeBrace) {
            const startLine = this.sourceFile.getLineAndCharacterOfPosition(openBrace.getEnd()).line;
            const endLine = this.sourceFile.getLineAndCharacterOfPosition(closeBrace.getStart(this.sourceFile)).line;
            return startLine === endLine;
        }
        return false;
    }
}
