/**
 * faucet.ts — /faucet command implementation.
 *
 * Exported as a standalone function so it can be unit-tested independently
 * of the REPL loop in index.ts.
 *
 * Two code paths:
 *   EVM    → derives the Sepolia address from the private key and prints
 *            faucet links + live balance.
 *   SOLANA → requests 1 SOL from the Devnet airdrop endpoint, confirms the
 *            transaction, and shows the resulting balance.
 */

import ora from "ora";
import { c, icon } from "./ui.js";
import type { Chain } from "./forge.js";

export async function runFaucet(
  walletKey: string | undefined,
  chain: Chain,
): Promise<void> {
  if (!walletKey) {
    console.log();
    console.log(`  ${c.red(icon.cross)} No wallet key configured.`);
    console.log(
      `  ${c.muted("Set one with")} ${c.cyan("/wallet <key>")} ${c.muted("then run")} ${c.cyan("/faucet")} ${c.muted("again.")}`,
    );
    return;
  }

  if (chain === "EVM") {
    // ── Sepolia: derive address and print faucet links ──────────────────────
    const spinner = ora({ text: c.muted("Deriving wallet address…"), indent: 2 }).start();
    try {
      const { ethers } = await import("ethers");
      const wallet = new ethers.Wallet(walletKey);
      const address = wallet.address;
      spinner.stop();

      console.log();
      console.log(
        `  ${c.cyan(icon.forge)} ${c.bold(c.white("Sepolia Faucet"))}  ${c.dim("·")}  ${c.cyan("EVM")}`,
      );
      console.log();
      console.log(`  ${c.green(icon.check)} Wallet address  ${c.white(address)}`);
      console.log();
      console.log(`  ${c.muted("Fund this address at one of the faucets below:")}`);
      console.log();
      console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://sepoliafaucet.com")}`);
      console.log(
        `  ${c.dim(icon.dot)} ${c.cyan("https://www.alchemy.com/faucets/ethereum-sepolia")}`,
      );
      console.log(
        `  ${c.dim(icon.dot)} ${c.cyan("https://faucet.quicknode.com/ethereum/sepolia")}`,
      );
      console.log();
      console.log(
        `  ${c.muted("Copy your address above, paste it into any faucet, and request test ETH.")}`,
      );
      console.log(
        `  ${c.muted("Once funded, run")} ${c.cyan("/deploy <project-id>")} ${c.muted("to deploy your contract.")}`,
      );

      // Also fetch and show current balance if possible
      const rpcUrl =
        process.env.AURA_FORGE_EVM_RPC_URL ?? "https://rpc2.sepolia.org";
      const balSpinner = ora({ text: c.muted("Checking current balance…"), indent: 2 }).start();
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const bal = await provider.getBalance(address);
        const ethBal = ethers.formatEther(bal);
        balSpinner.succeed(
          c.dim(
            `Current balance: ${c.white(parseFloat(ethBal).toFixed(6))} ETH (Sepolia)`,
          ),
        );
      } catch {
        balSpinner.stop();
        // Non-fatal — balance check failed, just skip it
      }
    } catch (err) {
      spinner.fail(
        c.red(
          `Could not derive wallet address: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }
  } else {
    // ── Devnet: request 1 SOL airdrop directly ──────────────────────────────
    const spinner = ora({
      text: c.muted("Requesting 1 SOL airdrop from Devnet…"),
      indent: 2,
    }).start();
    try {
      const { Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const { parseSolanaKeypair } = await import("./deploy.js");
      const keypair = await parseSolanaKeypair(walletKey);
      const address = keypair.publicKey.toBase58();

      const rpcUrl =
        process.env.AURA_FORGE_SOL_RPC_URL ?? "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      spinner.text = c.muted(`Airdropping 1 SOL to ${address.slice(0, 8)}…`);
      const sig = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);

      // Confirm the transaction
      spinner.text = c.muted("Confirming airdrop transaction…");
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      spinner.succeed(c.green("Airdrop confirmed"));

      // Fetch and display the resulting balance as a separate, explicit step
      const balSpinner = ora({ text: c.muted("Fetching updated balance…"), indent: 2 }).start();
      let sol: number;
      try {
        const lamports = await connection.getBalance(keypair.publicKey);
        sol = lamports / LAMPORTS_PER_SOL;
        balSpinner.succeed(c.dim(`New balance: ${c.white(sol.toFixed(6) + " SOL")} (Devnet)`));
      } catch {
        balSpinner.warn(c.gold("Could not fetch updated balance — funds may still have arrived."));
        sol = 0;
      }

      console.log();
      console.log(
        `  ${c.purple(icon.solana)} ${c.bold(c.white("Solana Devnet Airdrop"))}  ${c.dim("·")}  ${c.purple("Devnet")}`,
      );
      console.log();
      console.log(`  ${c.green(icon.check)} Wallet address    ${c.white(address)}`);
      console.log(`  ${c.green(icon.check)} Airdrop amount    ${c.white("1 SOL")}`);
      console.log(`  ${c.green(icon.check)} New balance       ${c.white(sol.toFixed(6))} SOL`);
      console.log(
        `  ${c.dim("Explorer →")}  ${c.cyan(`https://explorer.solana.com/tx/${sig}?cluster=devnet`)}`,
      );
      console.log();
      console.log(
        `  ${c.muted("Run")} ${c.cyan("/balance")} ${c.muted("any time to check your balance, or")} ${c.cyan("/faucet")} ${c.muted("for more SOL.")}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        /429|too many requests|rate.?limit|airdrop.?limit|request limit/i.test(msg);

      if (isRateLimit) {
        spinner.fail(c.gold("Airdrop rate-limited"));
        console.log();
        console.log(
          `  ${c.gold(icon.info)} Devnet limits airdrop requests per address and IP.`,
        );
        console.log(
          `  ${c.muted("Wait at least")} ${c.white("60 seconds")} ${c.muted("before trying again, or fund your wallet directly:")}`,
        );
        console.log();
        console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://faucet.solana.com")}`);
        console.log();
        console.log(
          `  ${c.muted("Paste your wallet address there to request SOL without CLI rate limits.")}`,
        );
      } else {
        spinner.fail(c.red("Airdrop failed"));
        console.log();
        console.log(`  ${c.red(icon.cross)} RPC error: ${c.muted(msg)}`);
        console.log();
        console.log(
          `  ${c.muted("Possible causes: RPC node unreachable, network timeout, or invalid keypair.")}`,
        );
        console.log(`  ${c.muted("You can also request SOL manually at:")}`);
        console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://faucet.solana.com")}`);
      }
    }
  }
}
