export interface ContractTemplate {
  id: string;
  label: string;
  description: string;
  /** Fragment folded into the generation prompt to steer the LLM toward this pattern. */
  promptFragment: string;
}

export const EVM_TEMPLATES: ContractTemplate[] = [
  {
    id: "erc20",
    label: "ERC20 Token",
    description: "A standard fungible token with mint/burn and an owner.",
    promptFragment:
      "Implement a standard ERC20-compatible fungible token (name, symbol, decimals, transfer, approve, transferFrom, balanceOf, totalSupply) with an owner-only mint function and public burn.",
  },
  {
    id: "erc721",
    label: "ERC721 NFT",
    description: "A standard non-fungible token collection with owner-only minting.",
    promptFragment:
      "Implement a standard ERC721-compatible NFT collection (ownerOf, balanceOf, transferFrom, approve, tokenURI) with an owner-only mint function and a fixed or incrementing token id scheme.",
  },
  {
    id: "erc1155",
    label: "ERC1155 Multi-Token",
    description: "A multi-token standard supporting fungible and non-fungible ids.",
    promptFragment:
      "Implement a standard ERC1155-compatible multi-token contract (balanceOf, balanceOfBatch, safeTransferFrom, safeBatchTransferFrom) with an owner-only mint function per token id.",
  },
  {
    id: "staking",
    label: "Staking Vault",
    description: "Users deposit a token and earn rewards over time.",
    promptFragment:
      "Implement a staking vault where users can deposit an ERC20 token, accrue rewards over time based on amount and duration staked, and withdraw their principal plus accrued rewards.",
  },
  {
    id: "vesting",
    label: "Vesting Schedule",
    description: "Linear token vesting with a cliff, releasable by the beneficiary.",
    promptFragment:
      "Implement a token vesting contract with a start time, cliff duration, and total vesting duration, linearly releasing a fixed total amount to a single beneficiary who can call release() to claim what has vested so far.",
  },
  {
    id: "multisig",
    label: "Multisig Wallet",
    description: "N-of-M owners must approve before a transaction executes.",
    promptFragment:
      "Implement a multisig wallet with a fixed set of owner addresses and a required-confirmations threshold; owners can submit, confirm, revoke confirmation, and execute a transaction once enough confirmations are collected.",
  },
  {
    id: "dao",
    label: "DAO Governor",
    description: "Simple proposal + voting + execution governance contract.",
    promptFragment:
      "Implement a simple DAO governance contract where members can create proposals, vote for/against within a voting period, and execute a proposal once it passes with a majority and the voting period has ended.",
  },
];

export const SOLANA_TEMPLATES: ContractTemplate[] = [
  {
    id: "spl-token-mint",
    label: "Token Mint Authority",
    description: "A program that gates minting of an SPL token behind program logic.",
    promptFragment:
      "Implement an Anchor program that acts as the mint authority for an SPL token, exposing an instruction to mint tokens to a recipient that only the program's configured admin can call.",
  },
  {
    id: "staking",
    label: "Staking Vault",
    description: "Users deposit an SPL token and earn rewards over time.",
    promptFragment:
      "Implement an Anchor staking program where users deposit an SPL token into a PDA-owned vault, accrue rewards over time, and can withdraw their principal plus rewards.",
  },
  {
    id: "vesting",
    label: "Vesting Schedule",
    description: "Linear token vesting with a cliff, releasable by the beneficiary.",
    promptFragment:
      "Implement an Anchor vesting program with a start time, cliff, and total duration that linearly releases a fixed total amount of an SPL token to a single beneficiary.",
  },
  {
    id: "multisig",
    label: "Multisig Wallet",
    description: "N-of-M signers must approve before a transaction executes.",
    promptFragment:
      "Implement an Anchor multisig program with a fixed set of signer public keys and a required-approvals threshold; signers can propose, approve, and execute an instruction once enough approvals are collected.",
  },
  {
    id: "dao",
    label: "DAO Governor",
    description: "Simple proposal + voting + execution governance program.",
    promptFragment:
      "Implement an Anchor DAO governance program where members can create proposals, cast votes within a voting period, and execute a proposal once it passes with a majority after the voting period ends.",
  },
];

export const UPGRADEABLE_EVM_FRAGMENT =
  "The contract MUST follow the OpenZeppelin-style upgradeable (UUPS) pattern: no logic in the constructor (use an initialize() function guarded by an initializer modifier/flag so it can only be called once, ideally called atomically at deployment), avoid immutable/constant storage that would break proxy storage layout, and include an owner-only _authorizeUpgrade-style upgrade authorization hook. Clearly comment the storage layout so future upgrades don't collide.";

export function getTemplate(
  ecosystem: "EVM" | "SOLANA",
  templateId: string | null | undefined,
): ContractTemplate | undefined {
  if (!templateId) return undefined;
  const catalog = ecosystem === "EVM" ? EVM_TEMPLATES : SOLANA_TEMPLATES;
  return catalog.find((t) => t.id === templateId);
}
