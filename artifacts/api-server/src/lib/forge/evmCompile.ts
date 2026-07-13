import solc from "solc";

export interface GasEstimate {
  functionSignature: string;
  gas: string; // solc reports these as strings (may be "infinite" for unbounded loops)
}

export interface EvmCompileResult {
  success: boolean;
  bytecode?: string;
  abi?: unknown[];
  gasEstimates?: GasEstimate[];
  /** solc-generated metadata JSON (string), used for Sourcify verification. */
  metadata?: string;
  errors?: string;
}

export function compileSolidity(
  contractName: string,
  source: string,
): EvmCompileResult {
  const input = {
    language: "Solidity",
    sources: {
      [`${contractName}.sol`]: { content: source },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.gasEstimates", "metadata"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  const errors = (output.errors ?? []).filter(
    (e: { severity: string }) => e.severity === "error",
  );
  if (errors.length > 0) {
    return {
      success: false,
      errors: errors
        .map((e: { formattedMessage: string }) => e.formattedMessage)
        .join("\n"),
    };
  }

  const fileOutput = output.contracts?.[`${contractName}.sol`];
  if (!fileOutput) {
    return { success: false, errors: "solc produced no output for the file" };
  }

  const contractKey = Object.keys(fileOutput).find(
    (key) => key.toLowerCase() === contractName.toLowerCase(),
  );
  if (!contractKey) {
    return {
      success: false,
      errors: `Compiled output does not contain a contract named "${contractName}". Found: ${Object.keys(
        fileOutput,
      ).join(", ")}`,
    };
  }

  const compiled = fileOutput[contractKey];
  const external: Record<string, string> | undefined =
    compiled.evm?.gasEstimates?.external;
  const gasEstimates: GasEstimate[] | undefined = external
    ? Object.entries(external).map(([functionSignature, gas]) => ({
        functionSignature,
        gas: String(gas),
      }))
    : undefined;

  return {
    success: true,
    bytecode: `0x${compiled.evm.bytecode.object}`,
    abi: compiled.abi,
    gasEstimates,
    metadata: compiled.metadata,
  };
}
