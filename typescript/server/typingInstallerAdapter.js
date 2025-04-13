import {
  assertType,
  createQueue,
  Debug,
  JsTyping,
} from "./_namespaces/ts.js";

import {
  ActionInvalidate,
  ActionPackageInstalled,
  ActionSet,
  ActionWatchTypingLocations,
  createInstallTypingsRequest,
  EventBeginInstallTypes,
  EventEndInstallTypes,
  EventInitializationFailed,
  EventTypesRegistry,
  LogLevel,
  stringifyIndented,
} from "./_namespaces/ts.server.js";

/** @internal */
export class TypingsInstallerAdapter {
    constructor(telemetryEnabled, logger, host, globalTypingsCacheLocation, event, maxActiveRequestCount) {
        this.telemetryEnabled = telemetryEnabled;
        this.logger = logger;
        this.host = host;
        this.globalTypingsCacheLocation = globalTypingsCacheLocation;
        this.event = event;
        this.maxActiveRequestCount = maxActiveRequestCount;
        this.activeRequestCount = 0;
        this.requestQueue = createQueue();
        this.requestMap = new Map(); // Maps project name to newest requestQueue entry for that project
        /** We will lazily request the types registry on the first call to `isKnownTypesPackageName` and store it in `typesRegistryCache`. */
        this.requestedRegistry = false;
        this.packageInstallId = 0;
    }
    isKnownTypesPackageName(name) {
        var _a;
        // We want to avoid looking this up in the registry as that is expensive. So first check that it's actually an NPM package.
        const validationResult = JsTyping.validatePackageName(name);
        if (validationResult !== JsTyping.NameValidationResult.Ok) {
            return false;
        }
        if (!this.requestedRegistry) {
            this.requestedRegistry = true;
            this.installer.send({ kind: "typesRegistry" });
        }
        return !!((_a = this.typesRegistryCache) === null || _a === void 0 ? void 0 : _a.has(name));
    }
    installPackage(options) {
        this.packageInstallId++;
        const request = Object.assign(Object.assign({ kind: "installPackage" }, options), { id: this.packageInstallId });
        const promise = new Promise((resolve, reject) => {
            var _a;
            ((_a = this.packageInstalledPromise) !== null && _a !== void 0 ? _a : (this.packageInstalledPromise = new Map())).set(this.packageInstallId, { resolve, reject });
        });
        this.installer.send(request);
        return promise;
    }
    attach(projectService) {
        this.projectService = projectService;
        this.installer = this.createInstallerProcess();
    }
    onProjectClosed(p) {
        this.installer.send({ projectName: p.getProjectName(), kind: "closeProject" });
    }
    enqueueInstallTypingsRequest(project, typeAcquisition, unresolvedImports) {
        const request = createInstallTypingsRequest(project, typeAcquisition, unresolvedImports);
        if (this.logger.hasLevel(LogLevel.verbose)) {
            this.logger.info(`TIAdapter:: Scheduling throttled operation:${stringifyIndented(request)}`);
        }
        if (this.activeRequestCount < this.maxActiveRequestCount) {
            this.scheduleRequest(request);
        }
        else {
            if (this.logger.hasLevel(LogLevel.verbose)) {
                this.logger.info(`TIAdapter:: Deferring request for: ${request.projectName}`);
            }
            this.requestQueue.enqueue(request);
            this.requestMap.set(request.projectName, request);
        }
    }
    handleMessage(response) {
        var _a, _b;
        if (this.logger.hasLevel(LogLevel.verbose)) {
            this.logger.info(`TIAdapter:: Received response:${stringifyIndented(response)}`);
        }
        switch (response.kind) {
            case EventTypesRegistry:
                this.typesRegistryCache = new Map(Object.entries(response.typesRegistry));
                break;
            case ActionPackageInstalled: {
                const promise = (_a = this.packageInstalledPromise) === null || _a === void 0 ? void 0 : _a.get(response.id);
                Debug.assertIsDefined(promise, "Should find the promise for package install");
                (_b = this.packageInstalledPromise) === null || _b === void 0 ? void 0 : _b.delete(response.id);
                if (response.success) {
                    promise.resolve({ successMessage: response.message });
                }
                else {
                    promise.reject(response.message);
                }
                this.projectService.updateTypingsForProject(response);
                // The behavior is the same as for setTypings, so send the same event.
                this.event(response, "setTypings");
                break;
            }
            case EventInitializationFailed: {
                const body = {
                    message: response.message,
                };
                const eventName = "typesInstallerInitializationFailed";
                this.event(body, eventName);
                break;
            }
            case EventBeginInstallTypes: {
                const body = {
                    eventId: response.eventId,
                    packages: response.packagesToInstall,
                };
                const eventName = "beginInstallTypes";
                this.event(body, eventName);
                break;
            }
            case EventEndInstallTypes: {
                if (this.telemetryEnabled) {
                    const body = {
                        telemetryEventName: "typingsInstalled",
                        payload: {
                            installedPackages: response.packagesToInstall.join(","),
                            installSuccess: response.installSuccess,
                            typingsInstallerVersion: response.typingsInstallerVersion,
                        },
                    };
                    const eventName = "telemetry";
                    this.event(body, eventName);
                }
                const body = {
                    eventId: response.eventId,
                    packages: response.packagesToInstall,
                    success: response.installSuccess,
                };
                const eventName = "endInstallTypes";
                this.event(body, eventName);
                break;
            }
            case ActionInvalidate: {
                this.projectService.updateTypingsForProject(response);
                break;
            }
            case ActionSet: {
                if (this.activeRequestCount > 0) {
                    this.activeRequestCount--;
                }
                else {
                    Debug.fail("TIAdapter:: Received too many responses");
                }
                while (!this.requestQueue.isEmpty()) {
                    const queuedRequest = this.requestQueue.dequeue();
                    if (this.requestMap.get(queuedRequest.projectName) === queuedRequest) {
                        this.requestMap.delete(queuedRequest.projectName);
                        this.scheduleRequest(queuedRequest);
                        break;
                    }
                    if (this.logger.hasLevel(LogLevel.verbose)) {
                        this.logger.info(`TIAdapter:: Skipping defunct request for: ${queuedRequest.projectName}`);
                    }
                }
                this.projectService.updateTypingsForProject(response);
                this.event(response, "setTypings");
                break;
            }
            case ActionWatchTypingLocations:
                this.projectService.watchTypingLocations(response);
                break;
            default:
                assertType(response);
        }
    }
    scheduleRequest(request) {
        if (this.logger.hasLevel(LogLevel.verbose)) {
            this.logger.info(`TIAdapter:: Scheduling request for: ${request.projectName}`);
        }
        this.activeRequestCount++;
        this.host.setTimeout(() => {
            if (this.logger.hasLevel(LogLevel.verbose)) {
                this.logger.info(`TIAdapter:: Sending request:${stringifyIndented(request)}`);
            }
            this.installer.send(request);
        }, TypingsInstallerAdapter.requestDelayMillis, `${request.projectName}::${request.kind}`);
    }
}
// This number is essentially arbitrary.  Processing more than one typings request
// at a time makes sense, but having too many in the pipe results in a hang
// (see https://github.com/nodejs/node/issues/7657).
// It would be preferable to base our limit on the amount of space left in the
// buffer, but we have yet to find a way to retrieve that value.
TypingsInstallerAdapter.requestDelayMillis = 100;
