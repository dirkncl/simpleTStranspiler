import {
  getNormalizedAbsolutePath,
  isRootedDiskPath,
  normalizePath,
} from "./namespaces/ts.js";

export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["terse"] = 0] = "terse";
    LogLevel[LogLevel["normal"] = 1] = "normal";
    LogLevel[LogLevel["requestTime"] = 2] = "requestTime";
    LogLevel[LogLevel["verbose"] = 3] = "verbose";
})(LogLevel || (LogLevel = {}));

export const emptyArray = createSortedArray();

// TODO: Use a const enum (https://github.com/Microsoft/TypeScript/issues/16804)
export var Msg;
(function (Msg) {
    Msg["Err"] = "Err";
    Msg["Info"] = "Info";
    Msg["Perf"] = "Perf";
})(Msg || (Msg = {}));

export function createInstallTypingsRequest(project, typeAcquisition, unresolvedImports, cachePath) {
    return {
        projectName: project.getProjectName(),
        fileNames: project.getFileNames(/*excludeFilesFromExternalLibraries*/ true, /*excludeConfigFiles*/ true).concat(project.getExcludedFiles()),
        compilerOptions: project.getCompilationSettings(),
        typeAcquisition,
        unresolvedImports,
        projectRootPath: project.getCurrentDirectory(),
        cachePath,
        kind: "discover",
    };
}

export var Errors;
(function (Errors) {
    function ThrowNoProject() {
        throw new Error("No Project.");
    }
    Errors.ThrowNoProject = ThrowNoProject;
    function ThrowProjectLanguageServiceDisabled() {
        throw new Error("The project's language service is disabled.");
    }
    Errors.ThrowProjectLanguageServiceDisabled = ThrowProjectLanguageServiceDisabled;
    function ThrowProjectDoesNotContainDocument(fileName, project) {
        throw new Error(`Project '${project.getProjectName()}' does not contain document '${fileName}'`);
    }
    Errors.ThrowProjectDoesNotContainDocument = ThrowProjectDoesNotContainDocument;
})(Errors || (Errors = {}));

export function toNormalizedPath(fileName) {
    return normalizePath(fileName);
}

export function normalizedPathToPath(normalizedPath, currentDirectory, getCanonicalFileName) {
    const f = isRootedDiskPath(normalizedPath) ? normalizedPath : getNormalizedAbsolutePath(normalizedPath, currentDirectory);
    return getCanonicalFileName(f);
}

export function asNormalizedPath(fileName) {
    return fileName;
}

export function createNormalizedPathMap() {
    const map = new Map();
    return {
        get(path) {
            return map.get(path);
        },
        set(path, value) {
            map.set(path, value);
        },
        contains(path) {
            return map.has(path);
        },
        remove(path) {
            map.delete(path);
        },
    };
}

export function isInferredProjectName(name) {
    // POSIX defines /dev/null as a device - there should be no file with this prefix
    return /dev\/null\/inferredProject\d+\*/.test(name);
}

export function makeInferredProjectName(counter) {
    return `/dev/null/inferredProject${counter}*`;
}

/** @internal */
export function makeAutoImportProviderProjectName(counter) {
    return `/dev/null/autoImportProviderProject${counter}*`;
}

/** @internal */
export function makeAuxiliaryProjectName(counter) {
    return `/dev/null/auxiliaryProject${counter}*`;
}

export function createSortedArray() {
    return []; // TODO: GH#19873
}
