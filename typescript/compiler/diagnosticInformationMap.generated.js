import { DiagnosticCategory } from './types.js'
import diagnosticMessagesJson from './diagnosticMessages.json' with {type: 'json'}

const diagnosticMessages = new Map();

for (const key in diagnosticMessagesJson) {
      if (Object.hasOwnProperty.call(diagnosticMessagesJson, key)) {
          diagnosticMessages.set(key, diagnosticMessagesJson[key]);
      }
}

function diag(code, category, key, message, reportsUnnecessary, elidedInCompatabilityPyramid, reportsDeprecated) {
    return { code, category, key, message, reportsUnnecessary, elidedInCompatabilityPyramid, reportsDeprecated };
}

let Diagnostics = {}
for (let [name, {code, category, reportsUnnecessary, elidedInCompatabilityPyramid, reportsDeprecated }] of diagnosticMessages) {
  const propName = convertPropertyName(name);
  const argReportsUnnecessary = reportsUnnecessary ? `, /*reportsUnnecessary*/ ${reportsUnnecessary}` : "";
  const argElidedInCompatabilityPyramid = elidedInCompatabilityPyramid ? `${!reportsUnnecessary ? ", /*reportsUnnecessary*/ undefined" : ""}, /*elidedInCompatabilityPyramid*/ ${elidedInCompatabilityPyramid}` : "";
  const argReportsDeprecated = reportsDeprecated ? `${!argElidedInCompatabilityPyramid ? ", /*reportsUnnecessary*/ undefined, /*elidedInCompatabilityPyramid*/ undefined" : ""}, /*reportsDeprecated*/ ${reportsDeprecated}` : "";
  //diag(1002, DiagnosticCategory.Error, "Unterminated_string_literal_1002", "Unterminated string literal.")
  Diagnostics[propName] = diag(code, DiagnosticCategory[DiagnosticCategory[category]], createKey(propName, code), JSON.stringify(name)+argReportsUnnecessary+argElidedInCompatabilityPyramid+argReportsDeprecated);

}

//const infoFileOutput = buildInfoFileOutput(diagnosticMessages, inputFilePath);
checkForUniqueCodes(diagnosticMessages);

function checkForUniqueCodes(diagnosticTable) {
    /** @type {Record<number, true | undefined>} */
    var allCodes = [];
    diagnosticTable.forEach(function (_a) {
        var code = _a.code;
        if (allCodes[code]) {
            throw new Error("Diagnostic code ".concat(code, " appears more than once."));
        }
        allCodes[code] = true;
    });
}

/**
 * @param {string} name
 * @param {number} code
 * @returns {string}
 */
function createKey(name, code) {
    return name.slice(0, 100) + "_" + code;
}

/**
 * @param {string} origName
 * @returns {string}
 */
function convertPropertyName(origName) {
    let result = origName.split("").map(char => {
        if (char === "*") return "_Asterisk";
        if (char === "/") return "_Slash";
        if (char === ":") return "_Colon";
        return /\w/.test(char) ? char : "_";
    }).join("");

    // get rid of all multi-underscores
    result = result.replace(/_+/g, "_");

    // remove any leading underscore, unless it is followed by a number.
    result = result.replace(/^_(\D)/, "$1");

    // get rid of all trailing underscores.
    result = result.replace(/_$/, "");

    return result;
}

export { Diagnostics }