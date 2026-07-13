import solc from "solc";

export interface EvmCompileResult {
  success: boolean;
  bytecode?: string;
  abi?: unknown[];
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
          "*": ["abi", "evm.bytecode.object"],
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
  return {
    success: true,
    bytecode: `0x${compiled.evm.bytecode.object}`,
    abi: compiled.abi,
  };
}
