#!/usr/bin/env node
/**
 * version-bump.mjs
 *
 * Bumps @aura-forge/cli and @aura-forge/mcp to the same version in lockstep.
 *
 * Usage:
 *   pnpm version:bump 0.2.0
 *   pnpm version:bump          # prints current versions and exits with usage
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PACKAGES = [
  resolve(__dirname, "packages/cli/package.json"),
  resolve(__dirname, "packages/mcp/package.json"),
];

function readPkg(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writePkg(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Print current versions
const current = PACKAGES.map((p) => {
  const pkg = readPkg(p);
  return { name: pkg.name, version: pkg.version, path: p };
});

console.log("\nCurrent versions:");
for (const { name, version } of current) {
  console.log(`  ${name}  →  ${version}`);
}

const nextVersion = process.argv[2];

if (!nextVersion) {
  console.log("\nUsage: pnpm version:bump <new-version>");
  console.log("Example: pnpm version:bump 0.2.0\n");
  process.exit(0);
}

// Validate semver-like format
if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(nextVersion)) {
  console.error(`\nError: "${nextVersion}" is not a valid semver version.\n`);
  process.exit(1);
}

// Check for accidental downgrades
for (const { name, version, path } of current) {
  const [curMajor, curMinor, curPatch] = version.split("-")[0].split(".").map(Number);
  const [newMajor, newMinor, newPatch] = nextVersion.split("-")[0].split(".").map(Number);
  const isDowngrade =
    newMajor < curMajor ||
    (newMajor === curMajor && newMinor < curMinor) ||
    (newMajor === curMajor && newMinor === curMinor && newPatch < curPatch);

  if (isDowngrade) {
    console.error(
      `\nError: ${name} is at ${version}; bumping to ${nextVersion} would be a downgrade.\n`
    );
    process.exit(1);
  }
}

// Apply the version bump
for (const { path } of current) {
  const pkg = readPkg(path);
  pkg.version = nextVersion;
  writePkg(path, pkg);
}

console.log(`\nBumped all packages to ${nextVersion}:\n`);
for (const { name } of current) {
  console.log(`  ✓ ${name}  →  ${nextVersion}`);
}
console.log(
  "\nNext steps:\n" +
    "  1. Review the changes: git diff packages/*/package.json\n" +
    "  2. Commit: git commit -am 'chore: release v" +
    nextVersion +
    "'\n" +
    "  3. Tag:    git tag v" +
    nextVersion +
    "\n" +
    "  4. Push:   git push && git push --tags\n" +
    "  5. Publish: pnpm --filter @aura-forge/cli publish && pnpm --filter @aura-forge/mcp publish\n"
);
