import {
  combinePaths,
  createPackageJsonInfo,
  Debug,
  forEachAncestorDirectoryStoppingAtGlobalCache,
  getDirectoryPath,
  Ternary,
  tryFileExists,
} from "./_namespaces/ts.js";

/** @internal */
export function createPackageJsonCache(host) {
    const packageJsons = new Map();
    const directoriesWithoutPackageJson = new Map();
    return {
        addOrUpdate,
        invalidate,
        delete: fileName => {
            packageJsons.delete(fileName);
            directoriesWithoutPackageJson.set(getDirectoryPath(fileName), true);
        },
        getInDirectory: directory => {
            return packageJsons.get(host.toPath(combinePaths(directory, "package.json"))) || undefined;
        },
        directoryHasPackageJson: directory => directoryHasPackageJson(host.toPath(directory)),
        searchDirectoryAndAncestors: (directory, project) => {
            forEachAncestorDirectoryStoppingAtGlobalCache(project, directory, ancestor => {
                const ancestorPath = host.toPath(ancestor);
                if (directoryHasPackageJson(ancestorPath) !== Ternary.Maybe) {
                    return true;
                }
                const packageJsonFileName = combinePaths(ancestor, "package.json");
                if (tryFileExists(host, packageJsonFileName)) {
                    addOrUpdate(packageJsonFileName, combinePaths(ancestorPath, "package.json"));
                }
                else {
                    directoriesWithoutPackageJson.set(ancestorPath, true);
                }
            });
        },
    };
    function addOrUpdate(fileName, path) {
        const packageJsonInfo = Debug.checkDefined(createPackageJsonInfo(fileName, host.host));
        packageJsons.set(path, packageJsonInfo);
        directoriesWithoutPackageJson.delete(getDirectoryPath(path));
    }
    function invalidate(path) {
        packageJsons.delete(path);
        directoriesWithoutPackageJson.delete(getDirectoryPath(path));
    }
    function directoryHasPackageJson(directory) {
        return packageJsons.has(combinePaths(directory, "package.json")) ? Ternary.True :
            directoriesWithoutPackageJson.has(directory) ? Ternary.False :
                Ternary.Maybe;
    }
}
