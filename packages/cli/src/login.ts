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

  const atIdx = email.indexOf("@");
  if (atIdx < 1 || atIdx === email.length - 1 || email.indexOf(".", atIdx) === -1) {
    console.log(`  ${c.red(icon.cross)} Invalid email address — please check the format and try again.\n`);
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

    spinner.text = c.muted("Checking for existing CLI keys…");

    // ── Step 2: Revoke any existing active CLI keys ──────────────────────────
    const listRes = await fetch(`${apiUrl}/api/api-keys`, {
      headers: { Cookie: cookieHeader },
    });

    if (listRes.ok) {
      const existing = (await listRes.json()) as Array<{
        id: number;
        label: string;
        revokedAt: string | null;
      }>;
      const activeCliKeys = existing.filter(
        k => k.label === "CLI" && !k.revokedAt,
      );
      for (const key of activeCliKeys) {
        await fetch(`${apiUrl}/api/api-keys/${key.id}`, {
          method: "DELETE",
          headers: { Cookie: cookieHeader },
        });
      }
    }

    spinner.text = c.muted("Creating CLI API key…");

    // ── Step 3: Create a named API key via the session ──────────────────────
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

    const keyData = (await keyRes.json()) as { id: number; fullKey: string };

    // ── Step 3: Persist ─────────────────────────────────────────────────────
    saveConfig({ apiKey: keyData.fullKey, apiKeyId: keyData.id });

    spinner.succeed(c.green("Signed in"));
    console.log();
    console.log(`  ${c.dim(icon.dot)} API key saved to ${c.muted("~/.aura-forge/config.json")}`);
    console.log(`  ${c.muted("Run")} ${c.cyan("aura-forge")} ${c.muted("to start forging contracts.")}`);
    console.log();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isNetworkError =
      err instanceof TypeError &&
      (msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("network"));
    if (isNetworkError) {
      spinner.fail(c.red("Could not reach the AURA Forge server."));
      console.log(
        `  ${c.muted("Check your network connection, or verify the server URL is correct.")}`,
      );
      console.log(
        `  ${c.muted("You can also run")} ${c.cyan("aura-forge --help")} ${c.muted("to see available options.")}`,
      );
    } else {
      spinner.fail(c.red(msg || "Unexpected error during login"));
    }
  }
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function runSignup(apiUrl: string): Promise<void> {
  console.log();
  console.log(`  ${c.cyan(icon.forge)} ${c.bold(c.white("AURA Forge — Create Account"))}`);
  console.log(`  ${c.muted("Enter a new email address and a password (min 8 characters).")}`);
  console.log(`  ${c.muted("Already have an account?")} ${c.cyan("aura-forge login")}`);
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let email: string;
  try {
    email = (await ask(rl, `  ${c.muted("Email")}             ${c.dim("›")} `)).trim();
  } finally {
    rl.close();
  }

  if (!email) {
    console.log(`  ${c.red(icon.cross)} Email is required.\n`);
    return;
  }

  const atIdx = email.indexOf("@");
  if (atIdx < 1 || atIdx === email.length - 1 || email.indexOf(".", atIdx) === -1) {
    console.log(`  ${c.red(icon.cross)} Invalid email address — please check the format and try again.\n`);
    return;
  }

  const password = await readPassword(`  ${c.muted("Password")}          ${c.dim("›")} `);

  if (!password) {
    console.log(`  ${c.red(icon.cross)} Password is required.\n`);
    return;
  }

  const confirm = await readPassword(`  ${c.muted("Confirm password")} ${c.dim("›")} `);

  if (password !== confirm) {
    console.log(`  ${c.red(icon.cross)} Passwords do not match.\n`);
    return;
  }

  console.log();
  const spinner = ora({ text: c.muted("Creating account…"), indent: 2 }).start();

  try {
    // ── Step 1: Create account ──────────────────────────────────────────────
    const signupRes = await fetch(`${apiUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!signupRes.ok) {
      const body = await signupRes.json().catch(() => ({})) as { error?: string };
      const msg = body.error ?? `Signup failed (HTTP ${signupRes.status})`;
      spinner.fail(c.red(msg));
      if (signupRes.status === 409) {
        console.log(`  ${c.muted("Already have an account? Run")} ${c.cyan("aura-forge login")}`);
      }
      return;
    }

    // Extract session cookie so we can call authenticated endpoints
    const rawCookie = signupRes.headers.get("set-cookie") ?? "";
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

    const keyData = (await keyRes.json()) as { id: number; fullKey: string };

    // ── Step 3: Persist ─────────────────────────────────────────────────────
    saveConfig({ apiKey: keyData.fullKey, apiKeyId: keyData.id });

    spinner.succeed(c.green("Account created"));
    console.log();
    console.log(`  ${c.dim(icon.dot)} API key saved to ${c.muted("~/.aura-forge/config.json")}`);
    console.log(`  ${c.muted("Run")} ${c.cyan("aura-forge")} ${c.muted("to start forging contracts.")}`);
    console.log();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isNetworkError =
      err instanceof TypeError &&
      (msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("network"));
    if (isNetworkError) {
      spinner.fail(c.red("Could not reach the AURA Forge server."));
      console.log(
        `  ${c.muted("Check your network connection, or verify the server URL is correct.")}`,
      );
      console.log(
        `  ${c.muted("You can also run")} ${c.cyan("aura-forge --help")} ${c.muted("to see available options.")}`,
      );
    } else {
      spinner.fail(c.red(msg || "Unexpected error during signup"));
    }
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function runLogout(apiUrl: string): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.apiKey) {
    console.log();
    console.log(`  ${c.gold(icon.info)} Already logged out — no API key in config.`);
    console.log();
    return;
  }

  const spinner = ora({ text: c.muted("Revoking API key on server…"), indent: 2 }).start();

  let serverRevoked = false;
  try {
    if (cfg.apiKeyId != null) {
      // ── Fast path: DELETE directly using the stored key ID ─────────────────
      const delRes = await fetch(`${apiUrl}/api/api-keys/${cfg.apiKeyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      serverRevoked = delRes.ok || delRes.status === 404;
      if (!serverRevoked) {
        spinner.warn(
          c.gold(`Could not revoke key on server (HTTP ${delRes.status}). ` +
            `Removing locally — the key may still be active.`),
        );
      }
    } else {
      // ── Fallback: List keys and find by prefix ──────────────────────────────
      const listRes = await fetch(`${apiUrl}/api/api-keys`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });

      if (listRes.ok) {
        const keys = (await listRes.json()) as Array<{
          id: number;
          label: string;
          keyPrefix: string;
          revokedAt: string | null;
        }>;

        // The full key starts with the keyPrefix stored on the server
        const localPrefix = cfg.apiKey.slice(0, 14); // "af_live_" (8) + 6 chars
        const match = keys.find(k => !k.revokedAt && k.keyPrefix === localPrefix);

        if (match) {
          const delRes = await fetch(`${apiUrl}/api/api-keys/${match.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${cfg.apiKey}` },
          });
          serverRevoked = delRes.ok || delRes.status === 404;
          if (!serverRevoked) {
            spinner.warn(
              c.gold(`Could not revoke key on server (HTTP ${delRes.status}). ` +
                `Removing locally — the key may still be active.`),
            );
          }
        } else {
          // Key was already revoked or not found — nothing to do server-side
          serverRevoked = true;
        }
      } else {
        spinner.warn(
          c.gold(`Could not reach server to revoke key (HTTP ${listRes.status}). ` +
            `Removing locally — the key may still be active.`),
        );
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.warn(
      c.gold(`Could not reach server to revoke key (${msg}). ` +
        `Removing locally — the key may still be active.`),
    );
  }

  // ── Always clear local config ─────────────────────────────────────────────
  // Remove the apiKey and apiKeyId by writing undefined — JSON.stringify drops undefined fields
  saveConfig({ apiKey: undefined, apiKeyId: undefined });

  if (serverRevoked) {
    spinner.succeed(c.green("Logged out — API key revoked on server and removed locally."));
  }
  console.log();
  console.log(`  ${c.muted("API key removed from")} ${c.dim("~/.aura-forge/config.json")}`);
  console.log();
}
