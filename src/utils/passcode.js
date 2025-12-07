"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsPasscodeRefresh = exports.generatePasscode = void 0;
/**
 * Generate a random 4-digit passcode
 */
const generatePasscode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};
exports.generatePasscode = generatePasscode;
/**
 * Check if passcode needs refresh (older than 10 seconds)
 */
const needsPasscodeRefresh = (lastUpdated) => {
    if (!lastUpdated)
        return true;
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    return diffMs >= 10000; // 10 seconds
};
exports.needsPasscodeRefresh = needsPasscodeRefresh;
