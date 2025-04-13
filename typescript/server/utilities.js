import { getBaseFileName } from "./_namespaces/ts.js";
import { LogLevel, } from "./_namespaces/ts.server.js";

/** @internal */
export class ThrottledOperations {
    constructor(host, logger) {
        this.host = host;
        this.pendingTimeouts = new Map();
        this.logger = logger.hasLevel(LogLevel.verbose) ? logger : undefined;
    }
    /**
     * Wait `number` milliseconds and then invoke `cb`.  If, while waiting, schedule
     * is called again with the same `operationId`, cancel this operation in favor
     * of the new one.  (Note that the amount of time the canceled operation had been
     * waiting does not affect the amount of time that the new operation waits.)
     */
    schedule(operationId, delay, cb) {
        const pendingTimeout = this.pendingTimeouts.get(operationId);
        if (pendingTimeout) {
            // another operation was already scheduled for this id - cancel it
            this.host.clearTimeout(pendingTimeout);
        }
        // schedule new operation, pass arguments
        this.pendingTimeouts.set(operationId, this.host.setTimeout(ThrottledOperations.run, delay, operationId, this, cb));
        if (this.logger) {
            this.logger.info(`Scheduled: ${operationId}${pendingTimeout ? ", Cancelled earlier one" : ""}`);
        }
    }
    cancel(operationId) {
        const pendingTimeout = this.pendingTimeouts.get(operationId);
        if (!pendingTimeout)
            return false;
        this.host.clearTimeout(pendingTimeout);
        return this.pendingTimeouts.delete(operationId);
    }
    static run(operationId, self, cb) {
        self.pendingTimeouts.delete(operationId);
        if (self.logger) {
            self.logger.info(`Running: ${operationId}`);
        }
        cb();
    }
}

/** @internal */
export class GcTimer {
    constructor(host, delay, logger) {
        this.host = host;
        this.delay = delay;
        this.logger = logger;
    }
    scheduleCollect() {
        if (!this.host.gc || this.timerId !== undefined) {
            // no global.gc or collection was already scheduled - skip this request
            return;
        }
        this.timerId = this.host.setTimeout(GcTimer.run, this.delay, this);
    }
    static run(self) {
        self.timerId = undefined;
        const log = self.logger.hasLevel(LogLevel.requestTime);
        const before = log && self.host.getMemoryUsage(); // TODO: GH#18217
        self.host.gc(); // TODO: GH#18217
        if (log) {
            const after = self.host.getMemoryUsage(); // TODO: GH#18217
            self.logger.perftrc(`GC::before ${before}, after ${after}`);
        }
    }
}

/** @internal */
export function getBaseConfigFileName(configFilePath) {
    const base = getBaseFileName(configFilePath);
    return base === "tsconfig.json" || base === "jsconfig.json" ? base : undefined;
}
