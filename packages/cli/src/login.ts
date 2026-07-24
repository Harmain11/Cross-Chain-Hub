import readline from "readline";
import ora from "ora";
import { loadConfig, saveConfig } from "./config.js";
import { c, icon } from "./ui.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

/**
 * Read a password from stdin without echoing characters.
 * Falls back to plain readline on non-TTY (CI / pipe).
 */
function readPassword(prompt: string): Promise<string> {
  return new Promise(resolve => {
    if (!process.stdin.isTTY) {
      // Non-interactive — just read a line
      const rl = readline.createInterface({ input: process.stdin, terminal: false });
      rl.once("line", line => { rl.close(); resolve(line.trim()); });
      return;
    }

    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    let password = "";

    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");
      if (char === "\r" || char === "\n") {
        process.stdout.write("\n");
        cleanup();
        resolve(password);
      } else if (char === "\u0003") {
        // Ctrl-C
        process.stdout.write("\n");
        cleanup();
        process.exit(0);
      } else if (char === "\u007f" || char === "\b") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += char;
        process.stdout.write("*");
      }
    };

    function cleanup() {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on("data", onData);
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function runLogin(apiUrl: string): Promise<void> {
  console.log();
  console.log(`  ${c.cyan(icon.forge)} ${c.bold(c.white("AURA Forge — Sign In"))}`);
  console.log(`  ${c.muted("Enter your AURA Forge credentials.")}`);
  console.log(`  ${c.muted("No account yet?")} ${c.cyan(`${apiUrl}/signup`)}`);
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let email: string;
  try {
    email = (await ask(rl, `  ${c.muted("Email")}    ${c.dim("›")} `)).trim();
  } finally {
    rl.close();
  }

  if (!email) {
    console.log(`  ${c.red(icon.cross)} Email is required.\n`);
    return;
  }

  const password = await readPassword(`  ${c.muted("Password")} ${c.dim("›")} `);

  if (!password) {
    console.log(`  ${c.red(icon.cross)} Password is required.\n`);
    return;
  }

  console.log();
  const spinner = ora({ text: c.muted("Signing in…"), indent: 2 }).start();

  try {
    // ── Step 1: Authenticate ────────────────────────────────────────────────
    const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const body = await loginRes.json().catch(() => ({})) as { error?: string };
      spinner.fail(c.red(body.error ?? `Login failed (HTTP ${loginRes.status})`));
      return;
    }

    // Extract session cookie so we can call authenticated endpoints
    const rawCookie = loginRes.headers.get("set-cookie") ?? "";
    // Take only the key=value part of the first cookie directive
    const cookieHeader = rawCookie.split(";")[0].trim();
    if (!cookieHeader) {
      spinner.fail(c.red("Server did not return a session cookie. Is the API server reachable?"));
      return;
    }

    spinner.text = c.muted("Creating CLI API key…");

    // ── Step 2: Create a named API key via the session ──────────────────────
    const keyRes = await fetch(`${apiUrl}/api/api-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ label: "CLI" }),
    });

    if (!keyRes.ok) {
      const body = await keyRes.json().catch(() => ({})) as { error?: string };
      spinner.fail(c.red(`Failed to create API key: ${body.error ?? `HTTP ${keyRes.status}`}`));
      return;
    }

    const keyData = (await keyRes.json()) as { fullKey: string };

    // ── Step 3: Persist ─────────────────────────────────────────────────────
    saveConfig({ apiKey: keyData.fullKey });

    spinner.succeed(c.green("Signed in"));
    console.log();
    console.log(`  ${c.dim(icon.dot)} API key saved to ${c.muted("~/.aura-forge/config.json")}`);
    console.log(`  ${c.muted("Run")} ${c.cyan("aura-forge")} ${c.muted("to start forging contracts.")}`);
    console.log();
  } catch (err) {
    spinner.fail(c.red(err instanceof Error ? err.message : "Unexpected error during login"));
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export function runLogout(): void {
  const cfg = loadConfig();
  if (!cfg.apiKey) {
    console.log();
    console.log(`  ${c.gold(icon.info)} Already logged out — no API key in config.`);
    console.log();
    return;
  }
  // Remove the apiKey by writing undefined — JSON.stringify drops undefined fields
  saveConfig({ apiKey: undefined });
  console.log();
  console.log(`  ${c.green(icon.check)} Logged out.`);
  console.log(`  ${c.muted("API key removed from")} ${c.dim("~/.aura-forge/config.json")}`);
  console.log();
}
