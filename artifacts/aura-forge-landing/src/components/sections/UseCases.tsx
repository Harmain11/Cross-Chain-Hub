import { motion } from 'framer-motion';
import { ChevronRight, FileCode2 } from 'lucide-react';

const cases = [
  {
    prompt: "Build me a staking contract where users earn 8% APY",
    output: "StakingVault.sol",
    type: "DeFi",
    code: `contract StakingVault is ReentrancyGuard {
    mapping(address => uint256) public balances;
    uint256 public constant APY = 800; // 8%

    function stake() external payable nonReentrant {
        require(msg.value > 0, "Zero stake");
        balances[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }
}`
  },
  {
    prompt: "NFT drop with whitelist, Dutch auction pricing on Solana",
    output: "NftDrop.rs",
    type: "NFT",
    code: `pub fn mint_nft(ctx: Context<MintNft>, proof: Vec<[u8; 32]>) -> Result<()> {
    let clock = Clock::get()?;
    let current_price = calculate_dutch_price(clock.unix_timestamp);
    
    verify_whitelist(proof, ctx.accounts.payer.key())?;
    
    transfer_funds(ctx, current_price)?;
    mint_token_to_user(ctx)?;
    Ok(())
}`
  },
  {
    prompt: "DAO treasury multisig with 3-of-5 threshold signing",
    output: "DaoTreasury.sol",
    type: "DAO",
    code: `contract DaoTreasury {
    uint256 public constant THRESHOLD = 3;
    address[5] public signers;
    
    function executeTransaction(
        address to, 
        uint256 value, 
        bytes calldata data, 
        bytes[] calldata signatures
    ) external {
        require(signatures.length >= THRESHOLD, "Not enough signs");
        verifySignatures(keccak256(data), signatures);
        (bool success, ) = to.call{value: value}(data);
        require(success, "Tx failed");
    }
}`
  },
  {
    prompt: "Token vesting with 1-year cliff and 4-year total",
    output: "VestingSchedule.sol",
    type: "Tokenomics",
    code: `contract VestingSchedule {
    uint256 public constant CLIFF = 365 days;
    uint256 public constant DURATION = 1460 days; // 4 years
    
    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        if (block.timestamp < startTime + CLIFF) return 0;
        if (block.timestamp >= startTime + DURATION) return totalAllocation;
        
        uint256 timePassed = block.timestamp - startTime;
        return (totalAllocation * timePassed) / DURATION;
    }
}`
  }
];

export default function UseCases() {
  return (
    <section id="use-cases" className="py-24 bg-card/30 border-y border-border">
      <div className="container mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">What you can build</h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            From simple ERC-20s to complex DeFi primitives. If you can describe it, AURA Forge can build it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {cases.map((useCase, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-background border border-border rounded-xl overflow-hidden group"
            >
              <div className="p-6 border-b border-border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                    {useCase.type}
                  </span>
                  <div className="flex items-center text-xs font-mono text-muted-foreground">
                    <FileCode2 className="w-4 h-4 mr-1" />
                    {useCase.output}
                  </div>
                </div>
                <div className="font-mono text-sm text-white flex items-start gap-2">
                  <ChevronRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  "{useCase.prompt}"
                </div>
              </div>
              <div className="p-6 bg-[#0a0a0a] overflow-x-auto relative">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">Score: 98/100</span>
                </div>
                <pre className="font-mono text-xs md:text-sm text-gray-300">
                  <code>{useCase.code}</code>
                </pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
