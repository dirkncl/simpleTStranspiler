import {
  base64decode,
  computeLineAndCharacterOfPosition,
  createDocumentPositionMapper,
  createGetCanonicalFileName,
  Extension,
  getDeclarationEmitOutputFilePathWorker,
  getDirectoryPath,
  getDocumentPositionMapper as ts_getDocumentPositionMapper,
  getLineInfo,
  getLineStarts,
  getNormalizedAbsolutePath,
  identitySourceMapConsumer,
  isDeclarationFileName,
  isString,
  removeFileExtension,
  sys,
  toPath as ts_toPath,
  tryGetSourceMappingURL,
  tryParseRawSourceMap,
} from "./namespaces/ts.js";


const base64UrlRegExp = /^data:(?:application\/json;charset=[uU][tT][fF]-8;base64,([A-Za-z0-9+/=]+)$)?/;

/** @internal */
export function getSourceMapper(host) {
    const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
    const currentDirectory = host.getCurrentDirectory();
    const sourceFileLike = new Map();
    const documentPositionMappers = new Map();
    return {
        tryGetSourcePosition,
        tryGetGeneratedPosition,
        toLineColumnOffset,
        clearCache,
        documentPositionMappers,
    };
    function toPath(fileName) {
        return ts_toPath(fileName, currentDirectory, getCanonicalFileName);
    }
    function getDocumentPositionMapper(generatedFileName, sourceFileName) {
        const path = toPath(generatedFileName);
        const value = documentPositionMappers.get(path);
        if (value)
            return value;
        let mapper;
        if (host.getDocumentPositionMapper) {
            mapper = host.getDocumentPositionMapper(generatedFileName, sourceFileName);
        }
        else if (host.readFile) {
            const file = getSourceFileLike(generatedFileName);
            mapper = file && ts_getDocumentPositionMapper({ getSourceFileLike, getCanonicalFileName, log: s => host.log(s) }, generatedFileName, getLineInfo(file.text, getLineStarts(file)), f => !host.fileExists || host.fileExists(f) ? host.readFile(f) : undefined);
        }
        documentPositionMappers.set(path, mapper || identitySourceMapConsumer);
        return mapper || identitySourceMapConsumer;
    }
    function tryGetSourcePosition(info) {
        if (!isDeclarationFileName(info.fileName))
            return undefined;
        const file = getSourceFile(info.fileName);
        if (!file)
            return undefined;
        const newLoc = getDocumentPositionMapper(info.fileName).getSourcePosition(info);
        return !newLoc || newLoc === info ? undefined : tryGetSourcePosition(newLoc) || newLoc;
    }
    function tryGetGeneratedPosition(info) {
        if (isDeclarationFileName(info.fileName))
            return undefined;
        const sourceFile = getSourceFile(info.fileName);
        if (!sourceFile)
            return undefined;
        const program = host.getProgram();
        // If this is source file of project reference source (instead of redirect) there is no generated position
        if (program.isSourceOfProjectReferenceRedirect(sourceFile.fileName)) {
            return undefined;
        }
        const options = program.getCompilerOptions();
        const outPath = options.outFile;
        const declarationPath = outPath ?
            removeFileExtension(outPath) + Extension.Dts :
            getDeclarationEmitOutputFilePathWorker(info.fileName, program.getCompilerOptions(), program);
        if (declarationPath === undefined)
            return undefined;
        const newLoc = getDocumentPositionMapper(declarationPath, info.fileName).getGeneratedPosition(info);
        return newLoc === info ? undefined : newLoc;
    }
    function getSourceFile(fileName) {
        const program = host.getProgram();
        if (!program)
            return undefined;
        const path = toPath(fileName);
        // file returned here could be .d.ts when asked for .ts file if projectReferences and module resolution created this source file
        const file = program.getSourceFileByPath(path);
        return file && file.resolvedPath === path ? file : undefined;
    }
    function getOrCreateSourceFileLike(fileName) {
        const path = toPath(fileName);
        const fileFromCache = sourceFileLike.get(path);
        if (fileFromCache !== undefined)
            return fileFromCache ? fileFromCache : undefined;
        if (!host.readFile || host.fileExists && !host.fileExists(fileName)) {
            sourceFileLike.set(path, false);
            return undefined;
        }
        // And failing that, check the disk
        const text = host.readFile(fileName);
        const file = text ? createSourceFileLike(text) : false;
        sourceFileLike.set(path, file);
        return file ? file : undefined;
    }
    // This can be called from source mapper in either source program or program that includes generated file
    function getSourceFileLike(fileName) {
        return !host.getSourceFileLike ?
            getSourceFile(fileName) || getOrCreateSourceFileLike(fileName) :
            host.getSourceFileLike(fileName);
    }
    function toLineColumnOffset(fileName, position) {
        const file = getSourceFileLike(fileName); // TODO: GH#18217
        return file.getLineAndCharacterOfPosition(position);
    }
    function clearCache() {
        sourceFileLike.clear();
        documentPositionMappers.clear();
    }
}
/** @internal */
export function getDocumentPositionMapper(host, generatedFileName, generatedFileLineInfo, readMapFile) {
    let mapFileName = tryGetSourceMappingURL(generatedFileLineInfo);
    if (mapFileName) {
        const match = base64UrlRegExp.exec(mapFileName);
        if (match) {
            if (match[1]) {
                const base64Object = match[1];
                return convertDocumentToSourceMapper(host, base64decode(sys, base64Object), generatedFileName);
            }
            // Not a data URL we can parse, skip it
            mapFileName = undefined;
        }
    }
    const possibleMapLocations = [];
    if (mapFileName) {
        possibleMapLocations.push(mapFileName);
    }
    possibleMapLocations.push(generatedFileName + ".map");
    const originalMapFileName = mapFileName && getNormalizedAbsolutePath(mapFileName, getDirectoryPath(generatedFileName));
    for (const location of possibleMapLocations) {
        const mapFileName = getNormalizedAbsolutePath(location, getDirectoryPath(generatedFileName));
        const mapFileContents = readMapFile(mapFileName, originalMapFileName);
        if (isString(mapFileContents)) {
            return convertDocumentToSourceMapper(host, mapFileContents, mapFileName);
        }
        if (mapFileContents !== undefined) {
            return mapFileContents || undefined;
        }
    }
    return undefined;
}
function convertDocumentToSourceMapper(host, contents, mapFileName) {
    const map = tryParseRawSourceMap(contents);
    if (!map || !map.sources || !map.file || !map.mappings) {
        // obviously invalid map
        return undefined;
    }
    // Dont support sourcemaps that contain inlined sources
    if (map.sourcesContent && map.sourcesContent.some(isString))
        return undefined;
    return createDocumentPositionMapper(host, map, mapFileName);
}
function createSourceFileLike(text, lineMap) {
    return {
        text,
        lineMap,
        getLineAndCharacterOfPosition(pos) {
            return computeLineAndCharacterOfPosition(getLineStarts(this), pos);
        },
    };
}
