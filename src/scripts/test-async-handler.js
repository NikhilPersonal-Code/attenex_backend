"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asyncHandler_1 = require("../utils/asyncHandler");
// Very simple smoke test that asyncHandler forwards errors to next()
async function run() {
    let calledWith = null;
    const handler = (0, asyncHandler_1.asyncHandler)(async () => {
        throw new Error("Test error");
    });
    await new Promise((resolve) => {
        handler({}, {}, (err) => {
            calledWith = err;
            resolve();
        });
    });
    if (calledWith && calledWith.message === "Test error") {
        console.log("asyncHandler test passed");
        process.exit(0);
    }
    else {
        console.error("asyncHandler test failed", calledWith);
        process.exit(1);
    }
}
run().catch((e) => {
    console.error("Error running test script", e);
    process.exit(1);
});
