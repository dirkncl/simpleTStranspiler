import {
  arrayFrom,
  createGetCanonicalFileName,
  createLanguageServiceSourceFile,
  Debug,
  ensureScriptKind,
  firstDefinedIterator,
  forEachEntry,
  getEmitScriptTarget,
  getImpliedNodeFormatForFile,
  getKeyForCompilerOptions,
  getOrUpdate,
  getSetExternalModuleIndicator,
  getSnapshotText,
  identity,
  isDeclarationFileName,
  ScriptKind,
  ScriptTarget,
  sourceFileAffectingCompilerOptions,
  toPath,
  tracing,
  updateLanguageServiceSourceFile,
} from "./namespaces/ts.js";


/** @internal */
export function isDocumentRegistryEntry(entry) {
    return !!entry.sourceFile;
}

export function createDocumentRegistry(useCaseSensitiveFileNames, currentDirectory, jsDocParsingMode) {
    return createDocumentRegistryInternal(useCaseSensitiveFileNames, currentDirectory, jsDocParsingMode);
}
/** @internal */
export function createDocumentRegistryInternal(useCaseSensitiveFileNames, currentDirectory = "", jsDocParsingMode, externalCache) {
    // Maps from compiler setting target (ES3, ES5, etc.) to all the cached documents we have
    // for those settings.
    const buckets = new Map();
    const getCanonicalFileName = createGetCanonicalFileName(!!useCaseSensitiveFileNames);
    function reportStats() {
        const bucketInfoArray = arrayFrom(buckets.keys()).filter(name => name && name.charAt(0) === "_").map(name => {
            const entries = buckets.get(name);
            const sourceFiles = [];
            entries.forEach((entry, name) => {
                if (isDocumentRegistryEntry(entry)) {
                    sourceFiles.push({
                        name,
                        scriptKind: entry.sourceFile.scriptKind,
                        refCount: entry.languageServiceRefCount,
                    });
                }
                else {
                    entry.forEach((value, scriptKind) => sourceFiles.push({ name, scriptKind, refCount: value.languageServiceRefCount }));
                }
            });
            sourceFiles.sort((x, y) => y.refCount - x.refCount);
            return {
                bucket: name,
                sourceFiles,
            };
        });
        return JSON.stringify(bucketInfoArray, undefined, 2);
    }
    function getCompilationSettings(settingsOrHost) {
        if (typeof settingsOrHost.getCompilationSettings === "function") {
            return settingsOrHost.getCompilationSettings();
        }
        return settingsOrHost;
    }
    function acquireDocument(fileName, compilationSettings, scriptSnapshot, version, scriptKind, languageVersionOrOptions) {
        const path = toPath(fileName, currentDirectory, getCanonicalFileName);
        const key = getKeyForCompilationSettings(getCompilationSettings(compilationSettings));
        return acquireDocumentWithKey(fileName, path, compilationSettings, key, scriptSnapshot, version, scriptKind, languageVersionOrOptions);
    }
    function acquireDocumentWithKey(fileName, path, compilationSettings, key, scriptSnapshot, version, scriptKind, languageVersionOrOptions) {
        return acquireOrUpdateDocument(fileName, path, compilationSettings, key, scriptSnapshot, version, /*acquiring*/ true, scriptKind, languageVersionOrOptions);
    }
    function updateDocument(fileName, compilationSettings, scriptSnapshot, version, scriptKind, languageVersionOrOptions) {
        const path = toPath(fileName, currentDirectory, getCanonicalFileName);
        const key = getKeyForCompilationSettings(getCompilationSettings(compilationSettings));
        return updateDocumentWithKey(fileName, path, compilationSettings, key, scriptSnapshot, version, scriptKind, languageVersionOrOptions);
    }
    function updateDocumentWithKey(fileName, path, compilationSettings, key, scriptSnapshot, version, scriptKind, languageVersionOrOptions) {
        return acquireOrUpdateDocument(fileName, path, getCompilationSettings(compilationSettings), key, scriptSnapshot, version, /*acquiring*/ false, scriptKind, languageVersionOrOptions);
    }
    function getDocumentRegistryEntry(bucketEntry, scriptKind) {
        const entry = isDocumentRegistryEntry(bucketEntry) ? bucketEntry : bucketEntry.get(Debug.checkDefined(scriptKind, "If there are more than one scriptKind's for same document the scriptKind should be provided"));
        Debug.assert(scriptKind === undefined || !entry || entry.sourceFile.scriptKind === scriptKind, `Script kind should match provided ScriptKind:${scriptKind} and sourceFile.scriptKind: ${entry === null || entry === void 0 ? void 0 : entry.sourceFile.scriptKind}, !entry: ${!entry}`);
        return entry;
    }
    function acquireOrUpdateDocument(fileName, path, compilationSettingsOrHost, key, scriptSnapshot, version, acquiring, scriptKind, languageVersionOrOptions) {
        var _a, _b, _c, _d;
        scriptKind = ensureScriptKind(fileName, scriptKind);
        const compilationSettings = getCompilationSettings(compilationSettingsOrHost);
        const host = compilationSettingsOrHost === compilationSettings ? undefined : compilationSettingsOrHost;
        const scriptTarget = scriptKind === ScriptKind.JSON ? ScriptTarget.JSON : getEmitScriptTarget(compilationSettings);
        const sourceFileOptions = typeof languageVersionOrOptions === "object" ?
            languageVersionOrOptions :
            {
                languageVersion: scriptTarget,
                impliedNodeFormat: host && getImpliedNodeFormatForFile(path, (_d = (_c = (_b = (_a = host.getCompilerHost) === null || _a === void 0 ? void 0 : _a.call(host)) === null || _b === void 0 ? void 0 : _b.getModuleResolutionCache) === null || _c === void 0 ? void 0 : _c.call(_b)) === null || _d === void 0 ? void 0 : _d.getPackageJsonInfoCache(), host, compilationSettings),
                setExternalModuleIndicator: getSetExternalModuleIndicator(compilationSettings),
                jsDocParsingMode,
            };
        sourceFileOptions.languageVersion = scriptTarget;
        Debug.assertEqual(jsDocParsingMode, sourceFileOptions.jsDocParsingMode);
        const oldBucketCount = buckets.size;
        const keyWithMode = getDocumentRegistryBucketKeyWithMode(key, sourceFileOptions.impliedNodeFormat);
        const bucket = getOrUpdate(buckets, keyWithMode, () => new Map());
        if (tracing) {
            if (buckets.size > oldBucketCount) {
                // It is interesting, but not definitively problematic if a build requires multiple document registry buckets -
                // perhaps they are for two projects that don't have any overlap.
                // Bonus: these events can help us interpret the more interesting event below.
                tracing.instant(tracing.Phase.Session, "createdDocumentRegistryBucket", { configFilePath: compilationSettings.configFilePath, key: keyWithMode });
            }
            // It is fairly suspicious to have one path in two buckets - you'd expect dependencies to have similar configurations.
            // If this occurs unexpectedly, the fix is likely to synchronize the project settings.
            // Skip .d.ts files to reduce noise (should also cover most of node_modules).
            const otherBucketKey = !isDeclarationFileName(path) &&
                forEachEntry(buckets, (bucket, bucketKey) => bucketKey !== keyWithMode && bucket.has(path) && bucketKey);
            if (otherBucketKey) {
                tracing.instant(tracing.Phase.Session, "documentRegistryBucketOverlap", { path, key1: otherBucketKey, key2: keyWithMode });
            }
        }
        const bucketEntry = bucket.get(path);
        let entry = bucketEntry && getDocumentRegistryEntry(bucketEntry, scriptKind);
        if (!entry && externalCache) {
            const sourceFile = externalCache.getDocument(keyWithMode, path);
            if (sourceFile && sourceFile.scriptKind === scriptKind && sourceFile.text === getSnapshotText(scriptSnapshot)) {
                Debug.assert(acquiring);
                entry = {
                    sourceFile,
                    languageServiceRefCount: 0,
                };
                setBucketEntry();
            }
        }
        if (!entry) {
            // Have never seen this file with these settings.  Create a new source file for it.
            const sourceFile = createLanguageServiceSourceFile(fileName, scriptSnapshot, sourceFileOptions, version, /*setNodeParents*/ false, scriptKind);
            if (externalCache) {
                externalCache.setDocument(keyWithMode, path, sourceFile);
            }
            entry = {
                sourceFile,
                languageServiceRefCount: 1,
            };
            setBucketEntry();
        }
        else {
            // We have an entry for this file.  However, it may be for a different version of
            // the script snapshot.  If so, update it appropriately.  Otherwise, we can just
            // return it as is.
            if (entry.sourceFile.version !== version) {
                entry.sourceFile = updateLanguageServiceSourceFile(entry.sourceFile, scriptSnapshot, version, scriptSnapshot.getChangeRange(entry.sourceFile.scriptSnapshot));
                if (externalCache) {
                    externalCache.setDocument(keyWithMode, path, entry.sourceFile);
                }
            }
            // If we're acquiring, then this is the first time this LS is asking for this document.
            // Increase our ref count so we know there's another LS using the document.  If we're
            // not acquiring, then that means the LS is 'updating' the file instead, and that means
            // it has already acquired the document previously.  As such, we do not need to increase
            // the ref count.
            if (acquiring) {
                entry.languageServiceRefCount++;
            }
        }
        Debug.assert(entry.languageServiceRefCount !== 0);
        return entry.sourceFile;
        function setBucketEntry() {
            if (!bucketEntry) {
                bucket.set(path, entry);
            }
            else if (isDocumentRegistryEntry(bucketEntry)) {
                const scriptKindMap = new Map();
                scriptKindMap.set(bucketEntry.sourceFile.scriptKind, bucketEntry);
                scriptKindMap.set(scriptKind, entry);
                bucket.set(path, scriptKindMap);
            }
            else {
                bucketEntry.set(scriptKind, entry);
            }
        }
    }
    function releaseDocument(fileName, compilationSettings, scriptKind, impliedNodeFormat) {
        const path = toPath(fileName, currentDirectory, getCanonicalFileName);
        const key = getKeyForCompilationSettings(compilationSettings);
        return releaseDocumentWithKey(path, key, scriptKind, impliedNodeFormat);
    }
    function releaseDocumentWithKey(path, key, scriptKind, impliedNodeFormat) {
        const bucket = Debug.checkDefined(buckets.get(getDocumentRegistryBucketKeyWithMode(key, impliedNodeFormat)));
        const bucketEntry = bucket.get(path);
        const entry = getDocumentRegistryEntry(bucketEntry, scriptKind);
        entry.languageServiceRefCount--;
        Debug.assert(entry.languageServiceRefCount >= 0);
        if (entry.languageServiceRefCount === 0) {
            if (isDocumentRegistryEntry(bucketEntry)) {
                bucket.delete(path);
            }
            else {
                bucketEntry.delete(scriptKind);
                if (bucketEntry.size === 1) {
                    bucket.set(path, firstDefinedIterator(bucketEntry.values(), identity));
                }
            }
        }
    }
    return {
        acquireDocument,
        acquireDocumentWithKey,
        updateDocument,
        updateDocumentWithKey,
        releaseDocument,
        releaseDocumentWithKey,
        getKeyForCompilationSettings,
        getDocumentRegistryBucketKeyWithMode,
        reportStats,
        getBuckets: () => buckets,
    };
}
function getKeyForCompilationSettings(settings) {
    return getKeyForCompilerOptions(settings, sourceFileAffectingCompilerOptions);
}
function getDocumentRegistryBucketKeyWithMode(key, mode) {
    return (mode ? `${key}|${mode}` : key);
}
