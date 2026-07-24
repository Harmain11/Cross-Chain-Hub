import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Run tests sequentially in a single fork so DB state from one test
    // doesn't bleed into another (we don't spin up a separate test DB).
    singleFork: true,
    // Give integration tests a generous timeout — they talk to a real DB.
    testTimeout: 30_000,
  },
});
