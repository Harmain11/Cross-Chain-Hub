import fs from "fs";
import path from "path";

export interface WorkspaceFile {
  name: string;       // basename without extension
  ext: string;        // ".sol" | ".rs" | ".ts"
  chain: "EVM" | "SOLANA" | "unknown";
  absPath: string;
  relPath: string;
}

const CONTRACT_EXTS = new Set([".sol", ".rs"]);
const IGNORE_DIRS   = new Set(["node_modules", ".git", "target", "dist", "build", "out", "cache", ".anchor"]);

/** Recursively walk `dir`, returning all contract files up to `maxDepth`. */
function walk(dir: string, root: string, depth = 0, max = 6): WorkspaceFile[] {
  if (depth > max) return [];
  let results: WorkspaceFile[] = [];
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, root, depth + 1, max));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (CONTRACT_EXTS.has(ext)) {
        const name = path.basename(entry.name, ext);
        const chain: WorkspaceFile["chain"] =
          ext === ".sol" ? "EVM" :
          ext === ".rs"  ? "SOLANA" : "unknown";
        results.push({
          name,
          ext,
          chain,
          absPath: full,
          relPath: path.relative(root, full),
        });
      }
    }
  }
  return results;
}

export function scanWorkspace(dir: string): WorkspaceFile[] {
  return walk(dir, dir);
}

/** Find a file whose name fuzzy-matches `query` (case-insensitive). */
export function findFile(files: WorkspaceFile[], query: string): WorkspaceFile | undefined {
  const q = query.toLowerCase().replace(/\.(sol|rs)$/, "");
  return (
    files.find(f => f.name.toLowerCase() === q) ??
    files.find(f => f.name.toLowerCase().includes(q)) ??
    files.find(f => f.relPath.toLowerCase().includes(query.toLowerCase()))
  );
}

/** Read the source of a file, returning it with a language header for LLM context. */
export function readFileSource(f: WorkspaceFile): string {
  const src = fs.readFileSync(f.absPath, "utf8");
  return `// File: ${f.relPath}\n${src}`;
}

/** Write generated contract code to disk, creating dirs as needed. */
export function writeContract(outputDir: string, name: string, ext: string, code: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const file = path.join(outputDir, `${name}${ext}`);
  fs.writeFileSync(file, code, "utf8");
  return file;
}

export function writeTests(outputDir: string, name: string, chain: string, code: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const ext = chain === "SOLANA" ? ".test.ts" : ".t.sol";
  const file = path.join(outputDir, `${name}${ext}`);
  fs.writeFileSync(file, code, "utf8");
  return file;
}
