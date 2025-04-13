import { combinePaths, Extension, fileExtensionIs, } from "./_namespaces/ts.js";

// /** @internal */
// export enum UpToDateStatusType {
//     Unbuildable,
//     UpToDate,
//     /**
//      * The project appears out of date because its upstream inputs are newer than its outputs,
//      * but all of its outputs are actually newer than the previous identical outputs of its (.d.ts) inputs.
//      * This means we can Pseudo-build (just touch timestamps), as if we had actually built this project.
//      */
//     UpToDateWithUpstreamTypes,
//     OutputMissing,
//     ErrorReadingFile,
//     OutOfDateWithSelf,
//     OutOfDateWithUpstream,
//     OutOfDateBuildInfoWithPendingEmit,
//     OutOfDateBuildInfoWithErrors,
//     OutOfDateOptions,
//     OutOfDateRoots,
//     UpstreamOutOfDate,
//     UpstreamBlocked,
//     ComputingUpstream,
//     TsVersionOutputOfDate,
//     UpToDateWithInputFileText,
// 
//     /**
//      * Projects with no outputs (i.e. "solution" files)
//      */
//     ContainerOnly,
//     ForceBuild,
// }
/** @internal */
export var UpToDateStatusType;
(function (UpToDateStatusType) {
    UpToDateStatusType[UpToDateStatusType["Unbuildable"] = 0] = "Unbuildable";
    UpToDateStatusType[UpToDateStatusType["UpToDate"] = 1] = "UpToDate";
    /**
     * The project appears out of date because its upstream inputs are newer than its outputs,
     * but all of its outputs are actually newer than the previous identical outputs of its (.d.ts) inputs.
     * This means we can Pseudo-build (just touch timestamps), as if we had actually built this project.
     */
    UpToDateStatusType[UpToDateStatusType["UpToDateWithUpstreamTypes"] = 2] = "UpToDateWithUpstreamTypes";
    UpToDateStatusType[UpToDateStatusType["OutputMissing"] = 3] = "OutputMissing";
    UpToDateStatusType[UpToDateStatusType["ErrorReadingFile"] = 4] = "ErrorReadingFile";
    UpToDateStatusType[UpToDateStatusType["OutOfDateWithSelf"] = 5] = "OutOfDateWithSelf";
    UpToDateStatusType[UpToDateStatusType["OutOfDateWithUpstream"] = 6] = "OutOfDateWithUpstream";
    UpToDateStatusType[UpToDateStatusType["OutOfDateBuildInfoWithPendingEmit"] = 7] = "OutOfDateBuildInfoWithPendingEmit";
    UpToDateStatusType[UpToDateStatusType["OutOfDateBuildInfoWithErrors"] = 8] = "OutOfDateBuildInfoWithErrors";
    UpToDateStatusType[UpToDateStatusType["OutOfDateOptions"] = 9] = "OutOfDateOptions";
    UpToDateStatusType[UpToDateStatusType["OutOfDateRoots"] = 10] = "OutOfDateRoots";
    UpToDateStatusType[UpToDateStatusType["UpstreamOutOfDate"] = 11] = "UpstreamOutOfDate";
    UpToDateStatusType[UpToDateStatusType["UpstreamBlocked"] = 12] = "UpstreamBlocked";
    UpToDateStatusType[UpToDateStatusType["ComputingUpstream"] = 13] = "ComputingUpstream";
    UpToDateStatusType[UpToDateStatusType["TsVersionOutputOfDate"] = 14] = "TsVersionOutputOfDate";
    UpToDateStatusType[UpToDateStatusType["UpToDateWithInputFileText"] = 15] = "UpToDateWithInputFileText";
    /**
     * Projects with no outputs (i.e. "solution" files)
     */
    UpToDateStatusType[UpToDateStatusType["ContainerOnly"] = 16] = "ContainerOnly";
    UpToDateStatusType[UpToDateStatusType["ForceBuild"] = 17] = "ForceBuild";
})(UpToDateStatusType || (UpToDateStatusType = {}));

/** @internal */
export function resolveConfigFileProjectName(project) {
    if (fileExtensionIs(project, Extension.Json)) {
        return project;
    }
    return combinePaths(project, "tsconfig.json");
}
