import { Shield, Zap, Terminal, Code2, Database, Cpu, Lock, Workflow } from 'lucide-react';

export const features = [
  {
    title: 'Plain English to Code',
    description: 'Describe your logic, economics, and security constraints. AURA Forge writes the implementation.',
    icon: <Terminal className="w-6 h-6 text-primary" />,
  },
  {
    title: 'Multi-Chain Native',
    description: 'Production-ready EVM Solidity and Solana Rust/Anchor. Automatically applies best practices for each ecosystem.',
    icon: <Database className="w-6 h-6 text-primary" />,
  },
  {
    title: 'Automated Auditing',
    description: 'Contracts are continuously scored 0–100 for reentrancy, overflow, access control, and edge-case logic flaws.',
    icon: <Shield className="w-6 h-6 text-primary" />,
  },
  {
    title: 'Iterative Hardening',
    description: 'If the score falls below the threshold, AURA Forge rewrites and refactors until the contract is bulletproof.',
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
];
