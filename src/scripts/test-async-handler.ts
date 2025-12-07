import asyncHandler from "../utils/asyncHandler";

// Very simple smoke test that asyncHandler forwards errors to next()
async function run() {
  let calledWith: any = null;
  const handler = asyncHandler(async () => {
    throw new Error("Test error");
  });

  await new Promise<void>((resolve) => {
    handler({} as any, {} as any, (err: any) => {
      calledWith = err;
      resolve();
    });
  });

  if (calledWith && calledWith.message === "Test error") {
    console.log("asyncHandler test passed");
    process.exit(0);
  } else {
    console.error("asyncHandler test failed", calledWith);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Error running test script", e);
  process.exit(1);
});
