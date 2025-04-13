/* Generated file to emulate the ts namespace. */
export * from "../../compiler/namespaces/ts.js";
export * from "../../jsTyping/namespaces/ts.js";
export * from "../../services/namespaces/ts.js";
// Pull this in here so that plugins loaded by the server see compat wrappers.
export * from "../../deprecatedCompat/namespaces/ts.js";
import * as server from "./ts.server.js";
export { server };
