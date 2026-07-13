import solc from "solc";
import { getEvmChainId } from "./chains";
import { logger } from "../logger";

export interface VerificationOutcome {
  status: "pending" | "verified" | "failed";
  url: string | null;
  error: string | null;
}

const SOURCIFY_SERVER = "https://sourcify.dev/server";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Best-effort source verification against Sourcify (API v2) for a
 * just-deployed EVM contract. Never throws — failures are reported in the
 * returned outcome so the caller can persist them without rolling back the
 * deployment record.
 */
export async function verifyEvmDeployment(params: {
  networkLabel: string;
  contractName: string;
  sourceCode: string;
  address: string;
}): Promise<VerificationOutcome> {
  const { networkLabel, contractName, sourceCode, address } = params;

  const chainId = getEvmChainId(networkLabel);
  if (!chainId) {
    return {
      status: "failed",
      url: null,
      error: `Verification is not supported for network "${networkLabel}".`,
    };
  }

  try {
    const submitRes = await fetch(`${SOURCIFY_SERVER}/v2/verify/${chainId}/${address}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stdJsonInput: {
          language: "Solidity",
          sources: {
            [`${contractName}.sol`]: { content: sourceCode },
          },
          settings: {
            outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
          },
        },
        compilerVersion: solc.version(),
        contractIdentifier: `${contractName}.sol:${contractName}`,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const submitBody: any = await submitRes.json().catch(() => null);

    if (submitRes.status !== 202 || !submitBody?.verificationId) {
      return {
        status: "failed",
        url: null,
        error: submitBody?.message || `Sourcify submission responded with HTTP ${submitRes.status}`,
      };
    }

    const verificationId = submitBody.verificationId as string;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollRes = await fetch(`${SOURCIFY_SERVER}/v2/verify/${verificationId}`, {
        signal: AbortSignal.timeout(15_000),
      });
      const pollBody: any = await pollRes.json().catch(() => null);
      if (!pollRes.ok || !pollBody) continue;

      if (pollBody.isJobCompleted) {
        const matchStatus: string | undefined = pollBody.contract?.match;
        if (matchStatus === "exact_match" || matchStatus === "match") {
          return {
            status: "verified",
            url: `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/`,
            error: null,
          };
        }
        const reason =
          pollBody.error?.message ||
          (matchStatus ? `Sourcify reported match status "${matchStatus}"` : "Sourcify could not match the deployed bytecode to this source.");
        return { status: "failed", url: null, error: reason };
      }
    }

    return { status: "failed", url: null, error: "Verification timed out waiting for Sourcify." };
  } catch (err) {
    logger.warn({ err, networkLabel, address }, "Sourcify verification request failed");
    return {
      status: "failed",
      url: null,
      error: err instanceof Error ? err.message : "Verification request failed",
    };
  }
}
