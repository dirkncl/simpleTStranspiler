import { emptyArray, } from "../namespaces/ts.js";
/** @internal */
export const anyContext = emptyArray;
// dprint-ignore
/** @internal */
export var RuleAction;
(function (RuleAction) {
    RuleAction[RuleAction["None"] = 0] = "None";
    RuleAction[RuleAction["StopProcessingSpaceActions"] = 1] = "StopProcessingSpaceActions";
    RuleAction[RuleAction["StopProcessingTokenActions"] = 2] = "StopProcessingTokenActions";
    RuleAction[RuleAction["InsertSpace"] = 4] = "InsertSpace";
    RuleAction[RuleAction["InsertNewLine"] = 8] = "InsertNewLine";
    RuleAction[RuleAction["DeleteSpace"] = 16] = "DeleteSpace";
    RuleAction[RuleAction["DeleteToken"] = 32] = "DeleteToken";
    RuleAction[RuleAction["InsertTrailingSemicolon"] = 64] = "InsertTrailingSemicolon";
    RuleAction[RuleAction["StopAction"] = 3] = "StopAction";
    RuleAction[RuleAction["ModifySpaceAction"] = 28] = "ModifySpaceAction";
    RuleAction[RuleAction["ModifyTokenAction"] = 96] = "ModifyTokenAction";
})(RuleAction || (RuleAction = {}));
/** @internal */
export var RuleFlags;
(function (RuleFlags) {
    RuleFlags[RuleFlags["None"] = 0] = "None";
    RuleFlags[RuleFlags["CanDeleteNewLines"] = 1] = "CanDeleteNewLines";
})(RuleFlags || (RuleFlags = {}));
