import React, { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { toast } from "sonner"
import Editor from "@monaco-editor/react"
import { createWalletClient, custom, createPublicClient, http, parseAbi } from "viem"
import { mainnet, sepolia, baseSepolia } from "viem/chains"
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, clusterApiUrl } from "@solana/web3.js"

import { 
  useGetCurrentUser, 
  useLogout, 
  useListProjects, 
  useGetProjectsSummary, 
  useGetProject,
  useCreateForgeJob,
  useCreateHardenJob,
  useRecordDeployment,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  getGetProjectsSummaryQueryKey,
  getGetCurrentUserQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Icons } from "@/components/ui/icons"

type PhaseMessage = { phase: string; message: string }

export default function DashboardPage() {
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const { data: user, isLoading: userLoading, error: userError } = useGetCurrentUser({ query: { retry: false }})
  const logoutMutation = useLogout()
  const createJobMutation = useCreateForgeJob()
  const createHardenJobMutation = useCreateHardenJob()
  const recordDeploymentMutation = useRecordDeployment()

  const { data: projects = [] } = useListProjects({ query: { enabled: !!user }})
  const { data: summary } = useGetProjectsSummary({ query: { enabled: !!user }})

  // The project selected from history — its "Improve Security" re-runs open as
  // extra tabs alongside it, without leaving the history list.
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  // Which tab (activeProjectId itself, or one of its hardening children) is
  // currently displayed in the editor/console/deploy panel.
  const [displayedProjectId, setDisplayedProjectId] = useState<number | null>(null)
  const { data: activeProject, refetch: refetchActiveProject } = useGetProject(displayedProjectId as number, { query: { enabled: !!displayedProjectId }})

  const [ecosystem, setEcosystem] = useState<"EVM" | "SOLANA">("EVM")
  const [prompt, setPrompt] = useState("")
  const [contractName, setContractName] = useState("")

  // Console output and running-state are tracked per project id so each tab
  // (original job or a hardening re-run) only shows its own log.
  const [logsByProject, setLogsByProject] = useState<Record<number, PhaseMessage[]>>({})
  const [runningProjectIds, setRunningProjectIds] = useState<Set<number>>(new Set())
  const [isImprovingSecurity, setIsImprovingSecurity] = useState(false)

  const consoleLogs = displayedProjectId ? logsByProject[displayedProjectId] ?? [] : []
  const isForging = displayedProjectId ? runningProjectIds.has(displayedProjectId) : false

  const appendLog = (projectId: number, log: PhaseMessage) => {
    setLogsByProject(prev => ({ ...prev, [projectId]: [...(prev[projectId] ?? []), log] }))
  }
  const setRunning = (projectId: number, running: boolean) => {
    setRunningProjectIds(prev => {
      const next = new Set(prev)
      if (running) next.add(projectId)
      else next.delete(projectId)
      return next
    })
  }

  // Hardening re-runs of the currently selected history project, oldest first —
  // rendered as extra tabs next to the "Original" tab.
  const hardenTabs = projects
    .filter(p => p.parentProjectId === activeProjectId)
    .sort((a, b) => a.id - b.id)

  const [targetNetwork, setTargetNetwork] = useState<string>("Ethereum Sepolia")
  const [isDeploying, setIsDeploying] = useState(false)

  const consoleEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (userError) {
      setLocation("/")
    }
  }, [userError, setLocation])

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [consoleLogs])

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    queryClient.setQueryData(getGetCurrentUserQueryKey(), null)
    queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() })
    setLocation("/")
  }

  const handleStartForge = async () => {
    if (!prompt || !contractName) {
      toast.error("Provide both a prompt and contract name")
      return
    }

    try {
      const newJob = await createJobMutation.mutateAsync({
        data: { prompt, contractName, ecosystem }
      })

      setRunning(newJob.id, true)
      setLogsByProject(prev => ({ ...prev, [newJob.id]: [{ phase: "init", message: "Initializing forge job..." }] }))
      setActiveProjectId(newJob.id)
      setDisplayedProjectId(newJob.id)
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })

      // Start SSE Stream
      const eventSource = new EventSource(`${import.meta.env.BASE_URL}api/forge-contract/${newJob.id}/stream`, { withCredentials: true })
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.phase === "done") {
            appendLog(newJob.id, { phase: "done", message: "Forge complete." })
            eventSource.close()
            setRunning(newJob.id, false)
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(newJob.id) })
            queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
            queryClient.invalidateQueries({ queryKey: getGetProjectsSummaryQueryKey() })
            refetchActiveProject()
            setPrompt("")
            setContractName("")
          } else if (data.phase === "error") {
            appendLog(newJob.id, { phase: "error", message: `ERROR: ${data.message}` })
            eventSource.close()
            setRunning(newJob.id, false)
            toast.error("Forge job failed")
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(newJob.id) })
          } else {
            appendLog(newJob.id, { phase: data.phase, message: data.message })
          }
        } catch (e) {
          console.error("Failed to parse SSE data", e)
        }
      }
      
      eventSource.onerror = (e) => {
        console.error("SSE Error", e)
        eventSource.close()
        setRunning(newJob.id, false)
      }

    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to start forge job")
    }
  }

  const handleImproveSecurity = async () => {
    if (!activeProject || !displayedProjectId) return

    try {
      setIsImprovingSecurity(true)
      const child = await createHardenJobMutation.mutateAsync({ id: displayedProjectId })

      setRunning(child.id, true)
      setLogsByProject(prev => ({
        ...prev,
        [child.id]: [{ phase: "init", message: `Starting a new security-hardening pass on "${activeProject.contractName}"...` }],
      }))
      setDisplayedProjectId(child.id)
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })

      const eventSource = new EventSource(`${import.meta.env.BASE_URL}api/projects/${child.id}/harden-stream`, { withCredentials: true })

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.phase === "done") {
            appendLog(child.id, { phase: "done", message: "Hardening pass complete." })
            eventSource.close()
            setRunning(child.id, false)
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(child.id) })
            queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
            queryClient.invalidateQueries({ queryKey: getGetProjectsSummaryQueryKey() })
            refetchActiveProject()
          } else if (data.phase === "error") {
            appendLog(child.id, { phase: "error", message: `ERROR: ${data.message}` })
            eventSource.close()
            setRunning(child.id, false)
            toast.error("Hardening job failed")
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(child.id) })
          } else {
            appendLog(child.id, { phase: data.phase, message: data.message })
          }
        } catch (e) {
          console.error("Failed to parse SSE data", e)
        }
      }

      eventSource.onerror = (e) => {
        console.error("SSE Error", e)
        eventSource.close()
        setRunning(child.id, false)
      }
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to start hardening job")
    } finally {
      setIsImprovingSecurity(false)
    }
  }

  const handleDeploy = async () => {
    if (!activeProject || !displayedProjectId) return
    
    setIsDeploying(true)
    
    try {
      if (activeProject.ecosystem === "EVM") {
        if (!activeProject.compiledBytecode || !activeProject.abiOrIdl) {
          throw new Error("Missing bytecode or ABI")
        }
        
        if (!window.ethereum) {
          throw new Error("No injected Ethereum wallet found (e.g. MetaMask). Please install one.")
        }

        appendLog(displayedProjectId, { phase: "deploy", message: "Requesting wallet connection..." })
        
        const walletClient = createWalletClient({
          transport: custom(window.ethereum)
        })

        const [account] = await walletClient.requestAddresses()

        let chain = sepolia
        let rpcUrl = "https://sepolia.drpc.org"
        
        if (targetNetwork === "Base Sepolia") {
          chain = baseSepolia
          rpcUrl = "https://sepolia.base.org"
        }

        appendLog(displayedProjectId, { phase: "deploy", message: `Switching to ${chain.name}...` })
        
        try {
          await walletClient.switchChain({ id: chain.id })
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            await walletClient.addChain({ chain })
          } else {
            throw switchError
          }
        }

        const publicClient = createPublicClient({
          chain,
          transport: http(rpcUrl)
        })

        appendLog(displayedProjectId, { phase: "deploy", message: "Broadcasting deployment transaction..." })

        const abi = JSON.parse(activeProject.abiOrIdl)
        const hash = await walletClient.deployContract({
          abi,
          bytecode: activeProject.compiledBytecode as `0x${string}`,
          account
        })

        appendLog(displayedProjectId, { phase: "deploy", message: `Tx Hash: ${hash}. Waiting for confirmation...` })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        
        if (!receipt.contractAddress) {
          throw new Error("Deployment failed, no contract address in receipt")
        }

        appendLog(displayedProjectId, { phase: "deploy", message: `Deployed at ${receipt.contractAddress}` })
        
        await recordDeploymentMutation.mutateAsync({
          id: displayedProjectId,
          data: {
            networkSelected: targetNetwork,
            deploymentTxHash: hash,
            liveDeployedAddress: receipt.contractAddress
          }
        })
        
        toast.success("Deployed successfully to EVM")

      } else if (activeProject.ecosystem === "SOLANA") {
        if (!window.solana || !window.solana.isPhantom) {
          throw new Error("No Solana wallet found. Please install Phantom or Backpack.")
        }
        
        appendLog(displayedProjectId, { phase: "deploy", message: "Requesting Solana wallet connection..." })
        const resp = await window.solana.connect()
        const pubKey = resp.publicKey

        appendLog(displayedProjectId, { phase: "deploy", message: "Preparing Devnet verification broadcast..." })
        
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed")
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: pubKey,
            toPubkey: pubKey,
            lamports: 0,
          })
        )
        
        transaction.feePayer = pubKey
        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash

        appendLog(displayedProjectId, { phase: "deploy", message: "Requesting signature..." })
        const signed = await window.solana.signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signed.serialize())
        
        appendLog(displayedProjectId, { phase: "deploy", message: `Tx Signature: ${signature}. Verifying...` })
        await connection.confirmTransaction(signature, "confirmed")

        const mockAddress = Keypair.generate().publicKey.toString()
        appendLog(displayedProjectId, { phase: "deploy", message: `Simulated program ID: ${mockAddress} (Devnet Broadcast Anchor Only)` })

        await recordDeploymentMutation.mutateAsync({
          id: displayedProjectId,
          data: {
            networkSelected: "Solana Devnet",
            deploymentTxHash: signature,
            liveDeployedAddress: mockAddress
          }
        })
        
        toast.success("Verification broadcast recorded")
      }
      
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(displayedProjectId) })
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getGetProjectsSummaryQueryKey() })

    } catch (err: any) {
      appendLog(displayedProjectId, { phase: "error", message: `DEPLOYMENT ERROR: ${err.message || "Unknown error"}` })
      toast.error(err.message || "Deployment failed")
    } finally {
      setIsDeploying(false)
    }
  }

  if (userLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Icons.Loader2 className="animate-spin text-primary" /></div>

  const evmNetworks = ["Ethereum Sepolia", "Base Sepolia"]
  const solanaNetworks = ["Solana Devnet"]
  const networksToUse = activeProject?.ecosystem === "SOLANA" ? solanaNetworks : evmNetworks

  // SVG Gauge logic
  const score = activeProject?.securityScore
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = score !== undefined && score !== null 
    ? circumference - (score / 100) * circumference 
    : circumference
    
  let scoreColor = "#666"
  if (score !== null && score !== undefined) {
    if (score >= 80) scoreColor = "#10b981" // green
    else if (score >= 50) scoreColor = "#f59e0b" // yellow
    else scoreColor = "#ef4444" // red
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      
      {/* Left Panel: Profile, History, Forge Controls */}
      <div className="w-[320px] min-w-[320px] flex flex-col border-r border-border bg-card/30 backdrop-blur-md z-10 relative shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              <Icons.Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-foreground">AURA_FORGE</span>
              <span className="text-[10px] text-muted-foreground uppercase">{user?.email}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Icons.Terminal className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border bg-black/20">
            <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase mb-2 tracking-wider">
              <span>Ecosystem Target</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={ecosystem === "EVM" ? "default" : "outline"} 
                className="flex-1 font-mono text-xs h-8"
                onClick={() => setEcosystem("EVM")}
              >
                EVM
              </Button>
              <Button 
                variant={ecosystem === "SOLANA" ? "default" : "outline"} 
                className="flex-1 font-mono text-xs h-8"
                onClick={() => setEcosystem("SOLANA")}
              >
                SOLANA
              </Button>
            </div>
          </div>

          <div className="px-4 py-4 border-b border-border bg-black/20">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Contract Name</Label>
                <Input 
                  placeholder="e.g. Vault" 
                  className="h-8 text-xs font-mono bg-background/50 focus-visible:ring-primary/50" 
                  value={contractName}
                  onChange={e => setContractName(e.target.value)}
                  disabled={isForging}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Description Prompt</Label>
                <Textarea 
                  placeholder="Create a standard ERC20 token with a mint function callable only by the owner..." 
                  className="text-xs font-mono min-h-[80px] bg-background/50 focus-visible:ring-primary/50 resize-none"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={isForging}
                />
              </div>
              <Button 
                className="w-full h-10 font-mono text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
                onClick={handleStartForge}
                disabled={isForging || !prompt || !contractName}
              >
                {isForging ? <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icons.Play className="w-4 h-4 mr-2" />}
                INITIALIZE FORGE
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-black/40">
            <div className="px-4 py-2 border-b border-border flex justify-between items-center">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Local History</span>
              {summary && (
                <span className="text-[10px] text-primary font-mono">{summary.totalProjects} Jobs</span>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {projects.filter(proj => !proj.parentProjectId).map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id)
                      setDisplayedProjectId(proj.id)
                      if (!logsByProject[proj.id]) {
                        setLogsByProject(prev => ({ ...prev, [proj.id]: [{ phase: "sys", message: `Loaded project: ${proj.contractName} [${proj.id}]` }] }))
                      }
                    }}
                    className={`w-full text-left p-2 rounded flex items-center justify-between group transition-colors font-mono text-xs ${activeProjectId === proj.id ? 'bg-primary/20 border border-primary/50 text-primary-foreground' : 'bg-transparent border border-transparent hover:bg-white/5 text-muted-foreground'}`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">{proj.contractName}</span>
                      <span className="text-[10px] opacity-70">{new Date(proj.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant={proj.status === "success" ? "default" : proj.status === "failed" ? "destructive" : "outline"} className="text-[9px] uppercase h-5 px-1.5 ml-2 shrink-0">
                      {proj.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

        </div>
      </div>

      {/* Center Panel: Code & Console */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        {activeProjectId && (
          <div className="h-9 min-h-[2.25rem] border-b border-border bg-card/40 flex items-center px-2 gap-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setDisplayedProjectId(activeProjectId)}
              className={`px-3 h-7 rounded-t font-mono text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${displayedProjectId === activeProjectId ? 'bg-black text-primary border-t border-x border-primary/40' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {runningProjectIds.has(activeProjectId) && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              Original
            </button>
            {hardenTabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setDisplayedProjectId(tab.id)}
                className={`px-3 h-7 rounded-t font-mono text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${displayedProjectId === tab.id ? 'bg-black text-primary border-t border-x border-primary/40' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {runningProjectIds.has(tab.id) && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                Security Pass {i + 1}
                {tab.securityScore !== null && <span className="opacity-60">({tab.securityScore})</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 relative border-b border-border group">
          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none flex items-center px-4">
            <span className="text-xs font-mono text-muted-foreground opacity-50 uppercase tracking-widest">{activeProject ? `${activeProject.contractName}.${activeProject.ecosystem === "EVM" ? "sol" : "rs"}` : "IDLE"}</span>
          </div>
          {activeProject ? (
            <Editor
              height="100%"
              language={activeProject.ecosystem === "EVM" ? "sol" : "rust"}
              theme="vs-dark"
              value={activeProject.smartContractCode || "// Awaiting generation..."}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontFamily: "'Space Mono', monospace",
                fontSize: 14,
                lineHeight: 24,
                padding: { top: 40 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground opacity-20">
              <Icons.Terminal className="w-24 h-24 mb-4" />
              <p className="font-mono text-xl tracking-widest uppercase">Awaiting Input Sequence</p>
            </div>
          )}
        </div>

        {/* Console */}
        <div className="h-64 min-h-[16rem] bg-[#050505] flex flex-col font-mono text-xs">
          <div className="h-8 border-b border-border flex items-center px-4 justify-between bg-card/50">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isForging || isDeploying ? 'bg-primary animate-pulse shadow-[0_0_5px_var(--primary)]' : 'bg-muted-foreground'}`} />
              Terminal Output
            </span>
          </div>
          <ScrollArea className="flex-1 p-4 text-[#888]">
            {consoleLogs.map((log, i) => (
              <div key={i} className="mb-1 leading-relaxed flex gap-3">
                <span className="text-primary/50 shrink-0 select-none">[{new Date().toISOString().substring(11, 19)}]</span>
                <span className={
                  log.phase === 'error' ? 'text-destructive' : 
                  log.phase === 'done' || log.phase === 'success' ? 'text-green-400' :
                  log.phase === 'healing' || log.phase === 'hardening' ? 'text-amber-400' :
                  'text-[#ccc]'
                }>{log.message}</span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </ScrollArea>
        </div>
      </div>

      {/* Right Panel: Data & Deploy */}
      <div className="w-[320px] min-w-[320px] border-l border-border bg-card/30 backdrop-blur-md flex flex-col z-10 relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        {activeProject ? (
          <>
            <div className="p-6 border-b border-border flex flex-col items-center justify-center bg-black/20">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest w-full mb-6">Security Analysis</span>
              
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="8" 
                  />
                  {/* Progress track */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke={scoreColor} 
                    strokeWidth="8" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${scoreColor}80)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-mono font-bold" style={{ color: scoreColor }}>
                    {score !== null && score !== undefined ? score : "--"}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground mt-1">Score</span>
                </div>
              </div>

              {activeProject.securityNotes && (
                <div className="mt-6 text-xs text-muted-foreground bg-black/40 p-3 rounded border border-white/5 font-mono max-h-32 overflow-y-auto w-full leading-relaxed">
                  {activeProject.securityNotes}
                </div>
              )}

              <Button
                onClick={handleImproveSecurity}
                disabled={activeProject.status !== "success" || isForging || isDeploying || isImprovingSecurity}
                variant="outline"
                className="w-full h-9 mt-4 font-mono text-xs uppercase tracking-widest border-primary/40 text-primary hover:bg-primary/10"
              >
                {isImprovingSecurity ? <Icons.Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Icons.Shield className="w-3.5 h-3.5 mr-2" />}
                Improve Security
              </Button>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-end bg-black/10">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Target Network</Label>
                  <Select value={targetNetwork} onValueChange={setTargetNetwork} disabled={isDeploying || isForging}>
                    <SelectTrigger className="font-mono text-xs bg-background/50">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent className="font-mono text-xs">
                      {networksToUse.map(net => (
                        <SelectItem key={net} value={net}>{net}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeProject.ecosystem === "SOLANA" && (
                  <p className="text-[10px] font-mono text-muted-foreground text-center px-2 py-2 bg-amber-500/10 text-amber-500/80 rounded border border-amber-500/20">
                    Solana programs are anchored via Devnet broadcast. Full deployment requires local Cargo tools.
                  </p>
                )}

                <Button 
                  onClick={handleDeploy}
                  disabled={isDeploying || activeProject.status !== "success" || isForging}
                  className="w-full h-12 font-mono uppercase tracking-widest text-sm relative group overflow-hidden border border-primary/50"
                  variant="outline"
                >
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay" />
                  <span className="relative flex items-center text-primary group-hover:text-white transition-colors">
                    {isDeploying ? <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icons.Zap className="w-4 h-4 mr-2" />}
                    Broadcast Deploy
                  </span>
                </Button>

                {activeProject.liveDeployedAddress && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Deployment Status</Label>
                    <div className="mt-2 bg-black/40 p-2 rounded border border-primary/20 flex flex-col gap-1 overflow-hidden">
                      <span className="text-[10px] text-primary/70 uppercase">Address / ID</span>
                      <span className="text-[11px] font-mono truncate text-foreground select-all">{activeProject.liveDeployedAddress}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground/30 flex-col p-6 text-center">
            <Icons.Shield className="w-16 h-16 mb-4" />
            <p className="font-mono text-sm uppercase tracking-widest">Select a project to view telemetry</p>
          </div>
        )}
      </div>

    </div>
  )
}
