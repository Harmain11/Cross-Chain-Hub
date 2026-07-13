import React, { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { toast } from "sonner"
import Editor from "@monaco-editor/react"
import { createWalletClient, custom, createPublicClient, http, BaseError as ViemBaseError } from "viem"

import { 
  useGetCurrentUser, 
  useLogout, 
  useListProjects, 
  useGetProjectsSummary, 
  useGetProject,
  useGetProjectLineage,
  useCreateForgeJob,
  useCreateHardenJob,
  useRecordDeployment,
  useUpdateMonitoringConfig,
  useListTeams,
  useCreateTeam,
  useListTeamMembers,
  useCreateTeamInvite,
  useListMyInvites,
  useAcceptTeamInvite,
  useDeclineTeamInvite,
  useRemoveTeamMember,
  useListApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  getGetProjectsSummaryQueryKey,
  getGetCurrentUserQueryKey,
  getListTeamsQueryKey,
  getListMyInvitesQueryKey,
  getListTeamMembersQueryKey,
  getListApiKeysQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { computeLineDiff } from "@/lib/diff"
import { EVM_NETWORKS, SOLANA_NETWORKS, getEvmNetwork, getSolanaNetwork } from "@/lib/networks"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Icons } from "@/components/ui/icons"

// Starter templates offered on contract creation. Ids must match the backend
// catalog in artifacts/api-server/src/lib/forge/templates.ts.
const EVM_TEMPLATE_OPTIONS = [
  { id: "erc20", label: "ERC20 Token" },
  { id: "erc721", label: "ERC721 NFT" },
  { id: "erc1155", label: "ERC1155 Multi-Token" },
  { id: "staking", label: "Staking Vault" },
  { id: "vesting", label: "Vesting Schedule" },
  { id: "multisig", label: "Multisig Wallet" },
  { id: "dao", label: "DAO Governor" },
]
const SOLANA_TEMPLATE_OPTIONS = [
  { id: "spl-token-mint", label: "Token Mint Authority" },
  { id: "staking", label: "Staking Vault" },
  { id: "vesting", label: "Vesting Schedule" },
  { id: "multisig", label: "Multisig Wallet" },
  { id: "dao", label: "DAO Governor" },
]
const NO_TEMPLATE = "__blank__"

type PhaseMessage = { phase: string; message: string }

export default function DashboardPage() {
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const { data: user, isLoading: userLoading, error: userError } = useGetCurrentUser({ query: { retry: false }})
  const logoutMutation = useLogout()
  const createJobMutation = useCreateForgeJob()
  const createHardenJobMutation = useCreateHardenJob()
  const recordDeploymentMutation = useRecordDeployment()

  // Workspace: "personal" (the caller's own projects) or a specific team's
  // shared workspace. Switching workspaces re-scopes the project list,
  // summary counters, and where new forge jobs get created.
  const [activeWorkspaceTeamId, setActiveWorkspaceTeamId] = useState<number | null>(null)
  const { data: teams = [] } = useListTeams({ query: { enabled: !!user } })
  const { data: myInvites = [] } = useListMyInvites({ query: { enabled: !!user } })
  const createTeamMutation = useCreateTeam()
  const createTeamInviteMutation = useCreateTeamInvite()
  const acceptInviteMutation = useAcceptTeamInvite()
  const declineInviteMutation = useDeclineTeamInvite()
  const removeMemberMutation = useRemoveTeamMember()
  const { data: teamMembers = [] } = useListTeamMembers(activeWorkspaceTeamId as number, {
    query: { enabled: activeWorkspaceTeamId !== null },
  })
  const activeTeam = teams.find(t => t.id === activeWorkspaceTeamId)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")

  // Public API keys for programmatic access.
  const [isApiKeysDialogOpen, setIsApiKeysDialogOpen] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState("")
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null)
  const { data: apiKeys = [] } = useListApiKeys({ query: { enabled: !!user && isApiKeysDialogOpen } })
  const createApiKeyMutation = useCreateApiKey()
  const revokeApiKeyMutation = useRevokeApiKey()

  const projectScopeParams = activeWorkspaceTeamId !== null ? { teamId: activeWorkspaceTeamId } : undefined
  const { data: projects = [] } = useListProjects(projectScopeParams, { query: { enabled: !!user }})
  const { data: summary } = useGetProjectsSummary(projectScopeParams, { query: { enabled: !!user }})

  // The project selected from history — its "Improve Security" re-runs open as
  // extra tabs alongside it, without leaving the history list.
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  // Which tab (activeProjectId itself, or one of its hardening children) is
  // currently displayed in the editor/console/deploy panel.
  const [displayedProjectId, setDisplayedProjectId] = useState<number | null>(null)
  const { data: activeProject, refetch: refetchActiveProject } = useGetProject(displayedProjectId as number, {
    query: {
      enabled: !!displayedProjectId,
      // Poll while verification is in flight so the ✅/❌ badge updates without a manual refresh.
      refetchInterval: (query) => (query.state.data?.verificationStatus === "pending" ? 3000 : false),
    },
  })

  const [ecosystem, setEcosystem] = useState<"EVM" | "SOLANA">("EVM")
  const [prompt, setPrompt] = useState("")
  const [contractName, setContractName] = useState("")
  const [templateId, setTemplateId] = useState<string>(NO_TEMPLATE)
  const [upgradeable, setUpgradeable] = useState(false)
  const templateOptions = ecosystem === "EVM" ? EVM_TEMPLATE_OPTIONS : SOLANA_TEMPLATE_OPTIONS

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

  // VS Code-style tab reordering: a user-chosen display order for the open tabs
  // (Original + its Security Pass re-runs), independent of their underlying
  // chronological order. Reset whenever the selected history project changes
  // so a fresh set of tabs starts in its natural order.
  const [tabOrderIds, setTabOrderIds] = useState<number[] | null>(null)
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null)
  const [dragOverTabId, setDragOverTabId] = useState<number | null>(null)

  useEffect(() => {
    setTabOrderIds(null)
    setDraggedTabId(null)
    setDragOverTabId(null)
  }, [activeProjectId])

  const openTabs = activeProjectId
    ? [
        { id: activeProjectId, label: "Original", score: null as number | null },
        ...hardenTabs.map((tab, i) => ({
          id: tab.id,
          label: `Security Pass ${i + 1}`,
          score: tab.securityScore,
        })),
      ]
    : []

  const orderedTabs = (() => {
    const naturalIds = openTabs.map(t => t.id)
    if (!tabOrderIds) return openTabs
    const known = tabOrderIds.filter(id => naturalIds.includes(id))
    const missing = naturalIds.filter(id => !known.includes(id))
    const finalOrder = [...known, ...missing]
    return finalOrder.map(id => openTabs.find(t => t.id === id)!).filter(Boolean)
  })()

  const handleTabDrop = (targetId: number) => {
    if (draggedTabId === null || draggedTabId === targetId) {
      setDraggedTabId(null)
      setDragOverTabId(null)
      return
    }
    const currentOrder = orderedTabs.map(t => t.id)
    const from = currentOrder.indexOf(draggedTabId)
    const to = currentOrder.indexOf(targetId)
    if (from === -1 || to === -1) return
    const next = [...currentOrder]
    next.splice(from, 1)
    next.splice(to, 0, draggedTabId)
    setTabOrderIds(next)
    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  // Free-text answer to activeProject.securityContextQuestion, submitted alongside
  // the next "Improve Security" run so the hardening pass can use it.
  const [hardenContext, setHardenContext] = useState("")

  const [targetNetwork, setTargetNetwork] = useState<string>("Ethereum Sepolia")
  const [isDeploying, setIsDeploying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [pendingMainnetNetwork, setPendingMainnetNetwork] = useState<string | null>(null)
  const [monitoringWebhookInput, setMonitoringWebhookInput] = useState("")
  const [monitoringEmailAlertsInput, setMonitoringEmailAlertsInput] = useState(false)
  const updateMonitoringConfig = useUpdateMonitoringConfig()

  // Manual deployment entry — a fallback for deployments made outside the
  // app (e.g. via a CLI), and the only path for Solana today since browser
  // wallets can't push a compiled program without a local Anchor/Cargo build.
  const [isManualDeployOpen, setIsManualDeployOpen] = useState(false)
  const [manualTxHash, setManualTxHash] = useState("")
  const [manualAddress, setManualAddress] = useState("")
  const [isSavingManualDeploy, setIsSavingManualDeploy] = useState(false)

  useEffect(() => {
    setMonitoringWebhookInput(activeProject?.monitoringWebhookUrl ?? "")
    setMonitoringEmailAlertsInput(activeProject?.monitoringEmailAlertsEnabled ?? false)
  }, [activeProject?.id, activeProject?.monitoringWebhookUrl, activeProject?.monitoringEmailAlertsEnabled])

  const handleEnableMonitoring = async () => {
    if (!activeProject) return
    if (!monitoringWebhookInput.trim() && !monitoringEmailAlertsInput) {
      toast.error("Provide a webhook URL or enable email alerts.")
      return
    }
    try {
      await updateMonitoringConfig.mutateAsync({
        id: activeProject.id,
        data: {
          enabled: true,
          webhookUrl: monitoringWebhookInput.trim() || null,
          emailAlertsEnabled: monitoringEmailAlertsInput,
        },
      })
      refetchActiveProject()
      toast.success("Monitoring enabled.")
    } catch {
      toast.error("Could not enable monitoring.")
    }
  }

  const handleDisableMonitoring = async () => {
    if (!activeProject) return
    try {
      await updateMonitoringConfig.mutateAsync({ id: activeProject.id, data: { enabled: false } })
      refetchActiveProject()
      toast.success("Monitoring disabled.")
    } catch {
      toast.error("Could not disable monitoring.")
    }
  }

  const handleSwitchWorkspace = (teamId: number | null) => {
    setActiveWorkspaceTeamId(teamId)
    setActiveProjectId(null)
    setDisplayedProjectId(null)
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    try {
      const team = await createTeamMutation.mutateAsync({ data: { name: newTeamName.trim() } })
      queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() })
      setNewTeamName("")
      setIsTeamDialogOpen(false)
      handleSwitchWorkspace(team.id)
      toast.success(`Team "${team.name}" created.`)
    } catch {
      toast.error("Could not create team.")
    }
  }

  const handleInviteMember = async () => {
    if (!activeWorkspaceTeamId || !inviteEmail.trim()) return
    try {
      await createTeamInviteMutation.mutateAsync({
        id: activeWorkspaceTeamId,
        data: { email: inviteEmail.trim(), role: "member" },
      })
      setInviteEmail("")
      toast.success(`Invite sent to ${inviteEmail.trim()}.`)
    } catch {
      toast.error("Could not send invite. Only the team owner can invite members.")
    }
  }

  const handleRemoveMember = async (userId: number) => {
    if (!activeWorkspaceTeamId) return
    try {
      await removeMemberMutation.mutateAsync({ id: activeWorkspaceTeamId, userId })
      queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey(activeWorkspaceTeamId) })
      toast.success("Member removed.")
    } catch {
      toast.error("Could not remove member.")
    }
  }

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      const team = await acceptInviteMutation.mutateAsync({ id: inviteId })
      queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getListMyInvitesQueryKey() })
      toast.success(`Joined "${team.name}".`)
    } catch {
      toast.error("Could not accept invite.")
    }
  }

  const handleDeclineInvite = async (inviteId: number) => {
    try {
      await declineInviteMutation.mutateAsync({ id: inviteId })
      queryClient.invalidateQueries({ queryKey: getListMyInvitesQueryKey() })
    } catch {
      toast.error("Could not decline invite.")
    }
  }

  const handleCreateApiKey = async () => {
    if (!newKeyLabel.trim()) return
    try {
      const key = await createApiKeyMutation.mutateAsync({ data: { label: newKeyLabel.trim() } })
      queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() })
      setNewKeyLabel("")
      setJustCreatedKey(key.fullKey)
    } catch {
      toast.error("Could not create API key.")
    }
  }

  const handleRevokeApiKey = async (id: number) => {
    try {
      await revokeApiKeyMutation.mutateAsync({ id })
      queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() })
      toast.success("API key revoked.")
    } catch {
      toast.error("Could not revoke key.")
    }
  }
  const [codeViewMode, setCodeViewMode] = useState<"code" | "tests" | "history">("code")
  const [historyDiffIndex, setHistoryDiffIndex] = useState<number | null>(null)
  const { data: lineage } = useGetProjectLineage(displayedProjectId as number, {
    query: { enabled: !!displayedProjectId && codeViewMode === "history" },
  })

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
        data: {
          prompt,
          contractName,
          ecosystem,
          templateId: templateId === NO_TEMPLATE ? undefined : templateId,
          upgradeable: ecosystem === "EVM" ? upgradeable : undefined,
          teamId: activeWorkspaceTeamId ?? undefined,
        }
      })

      setRunning(newJob.id, true)
      setLogsByProject(prev => ({ ...prev, [newJob.id]: [{ phase: "init", message: "Initializing forge job..." }] }))
      setActiveProjectId(newJob.id)
      setDisplayedProjectId(newJob.id)
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getGetProjectsSummaryQueryKey() })

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

  const handleImproveSecurity = async (context?: string) => {
    if (!activeProject || !displayedProjectId) return

    try {
      setIsImprovingSecurity(true)
      const child = await createHardenJobMutation.mutateAsync({
        id: displayedProjectId,
        data: context ? { context } : undefined,
      })
      setHardenContext("")

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

  const handleDownloadProject = async () => {
    if (!activeProject || !displayedProjectId) return

    setIsDownloading(true)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/projects/${displayedProjectId}/export`, {
        credentials: "include",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to export project")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${activeProject.contractName.replace(/[^a-zA-Z0-9_-]/g, "") || "contract"}-export.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err?.message || "Failed to download project")
    } finally {
      setIsDownloading(false)
    }
  }

  // Turns a viem/wallet-thrown error into a short, human-readable message —
  // covering the common cases (no wallet, user rejected, insufficient funds)
  // instead of surfacing a raw provider error blob.
  const describeDeployError = (err: unknown): string => {
    if (err instanceof ViemBaseError) {
      // shortMessage already collapses viem's verbose causes (e.g. "User
      // rejected the request.", "insufficient funds for gas * price + value").
      return err.shortMessage || err.message
    }
    const anyErr = err as any
    if (anyErr?.code === 4001 || anyErr?.code === "ACTION_REJECTED") {
      return "You rejected the request in your wallet."
    }
    if (typeof anyErr?.message === "string" && anyErr.message.length > 0) {
      return anyErr.message
    }
    return "Deployment failed for an unknown reason."
  }

  const handleDeploy = async () => {
    if (!activeProject || !displayedProjectId) return
    if (activeProject.ecosystem !== "EVM") return // Solana uses the manual-entry path only, see note in the Deploy tab.

    setIsDeploying(true)

    try {
      if (!activeProject.compiledBytecode || !activeProject.abiOrIdl) {
        throw new Error("This project hasn't compiled successfully yet, so there's no bytecode to deploy.")
      }

      if (!window.ethereum) {
        throw new Error("No injected Ethereum wallet found. Install MetaMask (or another EIP-1193 wallet) and try again.")
      }

      const networkConfig = getEvmNetwork(targetNetwork)
      if (!networkConfig) {
        throw new Error(`Unknown network: ${targetNetwork}`)
      }
      const chain = networkConfig.chain
      const rpcUrl = chain.rpcUrls.default.http[0]

      appendLog(displayedProjectId, { phase: "deploy", message: "Requesting wallet connection..." })

      const walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
      })

      const [account] = await walletClient.requestAddresses()
      if (!account) {
        throw new Error("No account was returned by the wallet.")
      }

      appendLog(displayedProjectId, { phase: "deploy", message: `Connected as ${account}. Switching to ${chain.name}...` })

      try {
        await walletClient.switchChain({ id: chain.id })
      } catch (switchError: any) {
        // 4902 means the chain hasn't been added to the wallet yet.
        if (switchError?.code === 4902) {
          await walletClient.addChain({ chain })
        } else {
          throw switchError
        }
      }

      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      })

      appendLog(displayedProjectId, { phase: "deploy", message: "Sign the deployment transaction in your wallet..." })

      const abi = JSON.parse(activeProject.abiOrIdl)
      const hash = await walletClient.deployContract({
        abi,
        bytecode: activeProject.compiledBytecode as `0x${string}`,
        account,
        chain,
      })

      appendLog(displayedProjectId, { phase: "deploy", message: `Broadcast as ${hash}. Waiting for confirmation...` })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== "success" || !receipt.contractAddress) {
        throw new Error("The transaction was mined but reverted, or no contract address was returned.")
      }

      appendLog(displayedProjectId, { phase: "deploy", message: `Deployed at ${receipt.contractAddress}` })

      await recordDeploymentMutation.mutateAsync({
        id: displayedProjectId,
        data: {
          networkSelected: targetNetwork,
          deploymentTxHash: hash,
          liveDeployedAddress: receipt.contractAddress,
        },
      })

      toast.success("Deployed successfully.")

      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(displayedProjectId) })
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getGetProjectsSummaryQueryKey() })
    } catch (err) {
      const message = describeDeployError(err)
      appendLog(displayedProjectId, { phase: "error", message: `DEPLOYMENT ERROR: ${message}` })
      toast.error(message)
    } finally {
      setIsDeploying(false)
    }
  }

  // Records a deployment made outside the app (own CLI/script), or a Solana
  // deployment made via the Anchor/Solana CLI against the exported project —
  // Solana programs can't be pushed from a browser wallet, since that needs
  // a compiled .so binary chunked into a buffer account, which only a local
  // Cargo/Anchor toolchain can produce.
  const handleSaveManualDeploy = async () => {
    if (!activeProject || !displayedProjectId) return
    if (!manualTxHash.trim() || !manualAddress.trim()) {
      toast.error("Provide both a transaction hash/signature and the resulting address/program ID.")
      return
    }

    setIsSavingManualDeploy(true)
    try {
      await recordDeploymentMutation.mutateAsync({
        id: displayedProjectId,
        data: {
          networkSelected: targetNetwork,
          deploymentTxHash: manualTxHash.trim(),
          liveDeployedAddress: manualAddress.trim(),
        },
      })
      toast.success("Deployment recorded.")
      setManualTxHash("")
      setManualAddress("")
      setIsManualDeployOpen(false)
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(displayedProjectId) })
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getGetProjectsSummaryQueryKey() })
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Could not record this deployment.")
    } finally {
      setIsSavingManualDeploy(false)
    }
  }

  const isTargetNetworkMainnet =
    (activeProject?.ecosystem === "SOLANA" ? getSolanaNetwork(targetNetwork) : getEvmNetwork(targetNetwork))?.isMainnet ?? false

  const handleDeployClick = () => {
    if (isTargetNetworkMainnet) {
      setPendingMainnetNetwork(targetNetwork)
      return
    }
    handleDeploy()
  }

  const confirmMainnetDeploy = () => {
    setPendingMainnetNetwork(null)
    handleDeploy()
  }

  if (userLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Icons.Loader2 className="animate-spin text-primary" /></div>

  const networksToUse = activeProject?.ecosystem === "SOLANA" ? SOLANA_NETWORKS : EVM_NETWORKS

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
      <div className="w-[360px] min-w-[360px] flex flex-col border-r border-border bg-card/30 backdrop-blur-md z-10 relative shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        
        <div className="p-5 border-b border-border flex items-center justify-between">
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

        {myInvites.length > 0 && (
          <div className="px-4 py-2 border-b border-border bg-amber-500/10">
            {myInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between gap-2 text-[10px] font-mono py-0.5">
                <span className="text-amber-300 truncate">Invited to "{invite.teamName}"</span>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleAcceptInvite(invite.id)}>Accept</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => handleDeclineInvite(invite.id)}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2 border-b border-border bg-black/20 flex items-center gap-2">
          <Select
            value={activeWorkspaceTeamId === null ? "personal" : String(activeWorkspaceTeamId)}
            onValueChange={(v) => handleSwitchWorkspace(v === "personal" ? null : Number(v))}
          >
            <SelectTrigger className="h-8 text-xs font-mono bg-background/50 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal" className="text-xs font-mono">Personal Workspace</SelectItem>
              {teams.length > 0 && <SelectSeparator />}
              {teams.map(t => (
                <SelectItem key={t.id} value={String(t.id)} className="text-xs font-mono">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Create team">
                <Icons.Users className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="font-mono">
              <DialogHeader>
                <DialogTitle className="text-sm">New Team Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="text-xs"
                />
                <Button className="w-full" onClick={handleCreateTeam} disabled={!newTeamName.trim() || createTeamMutation.isPending}>
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isApiKeysDialogOpen} onOpenChange={(open) => { setIsApiKeysDialogOpen(open); if (!open) setJustCreatedKey(null) }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="API keys">
                <Icons.Key className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="font-mono max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Public API Keys</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-[10px] text-muted-foreground">
                  Use a key with <code className="text-primary">Authorization: Bearer &lt;key&gt;</code> to call the AURA Forge API programmatically. Example:
                </p>
                <pre className="text-[9px] bg-black/50 p-2 rounded border border-border overflow-x-auto">{`curl -H "Authorization: Bearer af_live_..." \\\n  ${import.meta.env.BASE_URL}api/projects`}</pre>

                {justCreatedKey && (
                  <div className="p-2 rounded border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Copy this now — it won't be shown again</span>
                    <div className="flex items-center gap-1">
                      <code className="text-[10px] flex-1 break-all select-all">{justCreatedKey}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(justCreatedKey); toast.success("Copied.") }}
                        className="text-muted-foreground hover:text-primary shrink-0"
                      >
                        <Icons.Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {apiKeys.map(k => (
                    <div key={k.id} className="flex items-center justify-between text-[10px] py-1 border-b border-border/50">
                      <div className="flex flex-col">
                        <span className="text-foreground">{k.label}</span>
                        <span className="text-muted-foreground">{k.keyPrefix}••••{k.revokedAt ? " · revoked" : k.lastUsedAt ? ` · used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}</span>
                      </div>
                      {!k.revokedAt && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive" onClick={() => handleRevokeApiKey(k.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                  {apiKeys.length === 0 && <span className="text-[10px] text-muted-foreground">No API keys yet.</span>}
                </div>

                <div className="flex gap-1">
                  <Input
                    placeholder="Key label (e.g. CI pipeline)"
                    value={newKeyLabel}
                    onChange={e => setNewKeyLabel(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleCreateApiKey} disabled={!newKeyLabel.trim() || createApiKeyMutation.isPending}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activeTeam && (
          <div className="px-5 py-4 border-b border-border bg-black/20">
            <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase mb-2 tracking-wider">
              <span>Team Members ({teamMembers.length})</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {teamMembers.map(m => (
                <div key={m.userId} className="flex items-center justify-between text-[10px] font-mono text-foreground/80">
                  <span className="truncate">{m.email} {m.role === "owner" && <span className="text-primary">(owner)</span>}</span>
                  {activeTeam.role === "owner" && m.role !== "owner" && (
                    <button onClick={() => handleRemoveMember(m.userId)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
                      <Icons.X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {activeTeam.role === "owner" && (
              <div className="flex gap-1 mt-2">
                <Input
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="h-7 text-[10px]"
                />
                <Button size="sm" className="h-7 text-[10px]" onClick={handleInviteMember} disabled={!inviteEmail.trim() || createTeamInviteMutation.isPending}>
                  Invite
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-4 border-b border-border bg-black/20">
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

          <div className="px-5 py-5 border-b border-border bg-black/20">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Starter Template</Label>
                <Select value={templateId} onValueChange={setTemplateId} disabled={isForging}>
                  <SelectTrigger className="h-8 text-xs font-mono bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE} className="text-xs font-mono">Blank prompt</SelectItem>
                    {templateOptions.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs font-mono">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ecosystem === "EVM" && (
                <div className="flex items-center justify-between py-1">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Upgradeable (Proxy/UUPS)</Label>
                  <Switch checked={upgradeable} onCheckedChange={setUpgradeable} disabled={isForging} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Contract Name</Label>
                <Input 
                  placeholder="e.g. Vault" 
                  className="h-9 text-xs font-mono bg-background/50 focus-visible:ring-primary/50" 
                  value={contractName}
                  onChange={e => setContractName(e.target.value)}
                  disabled={isForging}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Description Prompt</Label>
                <Textarea 
                  placeholder="Create a standard ERC20 token with a mint function callable only by the owner..." 
                  className="text-xs font-mono min-h-[96px] bg-background/50 focus-visible:ring-primary/50 resize-none"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={isForging}
                />
              </div>
              <Button 
                className="w-full h-11 font-mono text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
                onClick={handleStartForge}
                disabled={isForging || !prompt || !contractName}
              >
                {isForging ? <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icons.Play className="w-4 h-4 mr-2" />}
                INITIALIZE FORGE
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-black/40">
            <div className="px-5 py-3 border-b border-border flex justify-between items-center">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Local History</span>
              {summary && (
                <span className="text-[10px] text-primary font-mono">{summary.totalProjects} Jobs</span>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1.5">
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
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between group transition-all duration-150 font-mono text-xs ${activeProjectId === proj.id ? 'bg-primary/20 border border-primary/50 text-primary-foreground shadow-[0_0_16px_rgba(0,240,255,0.08)]' : 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/5 text-muted-foreground'}`}
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
            {orderedTabs.map((tab) => (
              <button
                key={tab.id}
                draggable
                onDragStart={(e) => {
                  setDraggedTabId(tab.id)
                  e.dataTransfer.effectAllowed = "move"
                  // Firefox requires data to be set for drag to initiate.
                  e.dataTransfer.setData("text/plain", String(tab.id))
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggedTabId !== null && draggedTabId !== tab.id) {
                    setDragOverTabId(tab.id)
                  }
                }}
                onDragLeave={() => {
                  setDragOverTabId(prev => (prev === tab.id ? null : prev))
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleTabDrop(tab.id)
                }}
                onDragEnd={() => {
                  setDraggedTabId(null)
                  setDragOverTabId(null)
                }}
                onClick={() => setDisplayedProjectId(tab.id)}
                className={`relative px-3 h-7 rounded-t font-mono text-[11px] uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-grab active:cursor-grabbing ${displayedProjectId === tab.id ? 'bg-black text-primary border-t border-x border-primary/40' : 'text-muted-foreground hover:text-foreground'} ${draggedTabId === tab.id ? 'opacity-40' : 'opacity-100'}`}
              >
                {dragOverTabId === tab.id && draggedTabId !== null && draggedTabId !== tab.id && (
                  <span className="absolute left-0 top-0.5 bottom-0.5 w-0.5 bg-primary shadow-[0_0_6px_var(--primary)]" />
                )}
                {runningProjectIds.has(tab.id) && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                {tab.label}
                {tab.score !== null && tab.score !== undefined && <span className="opacity-60">({tab.score})</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 relative border-b border-border group">
          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none flex items-center justify-between px-4">
            <span className="text-xs font-mono text-muted-foreground opacity-50 uppercase tracking-widest">
              {activeProject
                ? codeViewMode === "code"
                  ? `${activeProject.contractName}.${activeProject.ecosystem === "EVM" ? "sol" : "rs"}`
                  : codeViewMode === "tests"
                  ? `${activeProject.contractName}.test.${activeProject.ecosystem === "EVM" ? "sol" : "ts"}`
                  : "Version History"
                : "IDLE"}
            </span>
            {activeProject && (
              <div className="flex gap-1 pointer-events-auto">
                <button
                  onClick={() => setCodeViewMode("code")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${codeViewMode === "code" ? "border-primary/50 text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  Code
                </button>
                <button
                  onClick={() => setCodeViewMode("tests")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${codeViewMode === "tests" ? "border-primary/50 text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  Tests
                </button>
                <button
                  onClick={() => { setCodeViewMode("history"); setHistoryDiffIndex(null) }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${codeViewMode === "history" ? "border-primary/50 text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  History
                </button>
              </div>
            )}
          </div>
          {activeProject && codeViewMode === "history" ? (
            <ScrollArea className="h-full pt-10">
              <div className="p-4 space-y-2">
                {!lineage && (
                  <p className="text-xs font-mono text-muted-foreground p-2">Loading version history...</p>
                )}
                {lineage?.map((entry, idx) => {
                  const isLatest = idx === lineage.length - 1
                  const isDiffing = historyDiffIndex === idx
                  const prev = idx > 0 ? lineage[idx - 1] : null
                  return (
                    <div key={entry.id} className="border border-white/10 rounded overflow-hidden">
                      <button
                        onClick={() => setHistoryDiffIndex(isDiffing ? null : idx)}
                        disabled={!prev}
                        className="w-full flex items-center justify-between px-3 py-2 bg-card/40 hover:bg-card/70 text-left disabled:cursor-default"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">v{idx + 1}</span>
                          <span className="text-[11px] font-mono text-[#ccc] truncate">
                            {entry.userContext ? `"${entry.userContext}"` : entry.parentProjectId === null ? "Initial generation" : "Security hardening pass"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {entry.securityScore !== null && (
                            <span className="text-[10px] font-mono text-primary/80">{entry.securityScore}/100</span>
                          )}
                          {isLatest && (
                            <Badge className="text-[9px] uppercase h-5 px-1.5">Latest</Badge>
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                          {prev && <Icons.ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDiffing ? "rotate-180" : ""}`} />}
                        </div>
                      </button>
                      {isDiffing && prev && (
                        <div className="bg-[#050505] font-mono text-[11px] max-h-64 overflow-y-auto p-2">
                          {computeLineDiff(prev.smartContractCode || "", entry.smartContractCode || "").map((line, li) => (
                            <div
                              key={li}
                              className={
                                line.type === "add"
                                  ? "bg-green-500/10 text-green-400"
                                  : line.type === "remove"
                                  ? "bg-red-500/10 text-red-400"
                                  : "text-[#888]"
                              }
                            >
                              <span className="select-none mr-2 opacity-60">{line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}</span>
                              {line.text || " "}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          ) : activeProject ? (
            <Editor
              height="100%"
              language={codeViewMode === "code" ? (activeProject.ecosystem === "EVM" ? "sol" : "rust") : (activeProject.ecosystem === "EVM" ? "sol" : "typescript")}
              theme="vs-dark"
              value={
                codeViewMode === "code"
                  ? activeProject.smartContractCode || "// Awaiting generation..."
                  : activeProject.testSuiteCode || "// Test suite not generated yet."
              }
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
        <div className="h-72 min-h-[18rem] bg-[#050505] flex flex-col font-mono text-xs">
          <div className="h-9 border-b border-border flex items-center px-5 justify-between bg-card/50">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isForging || isDeploying ? 'bg-primary animate-pulse shadow-[0_0_5px_var(--primary)]' : 'bg-muted-foreground'}`} />
              Terminal Output
            </span>
          </div>
          <ScrollArea className="flex-1 p-5 text-[#888]">
            {consoleLogs.map((log, i) => (
              <div key={i} className="mb-1.5 leading-relaxed flex gap-3">
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
      <div className="w-[360px] min-w-[360px] border-l border-border bg-card/30 backdrop-blur-md flex flex-col z-10 relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        {activeProject ? (
          <>
            <div className="p-7 border-b border-border flex flex-col items-center justify-center bg-black/20">
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

              {activeProject.gasNotes && (
                <div className="mt-3 w-full bg-black/40 border border-white/5 rounded p-3 space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Gas &amp; Efficiency{activeProject.ecosystem === "SOLANA" ? " (estimated)" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{activeProject.gasNotes}</p>
                  {activeProject.gasEstimates && (
                    <div className="max-h-28 overflow-y-auto space-y-0.5 pt-1 border-t border-white/5">
                      {(JSON.parse(activeProject.gasEstimates) as { functionSignature: string; gas: string }[]).map((g) => (
                        <div key={g.functionSignature} className="flex justify-between text-[10px] font-mono text-[#999]">
                          <span className="truncate mr-2">{g.functionSignature}</span>
                          <span className="text-primary/70 shrink-0">{g.gas}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeProject.securityContextQuestion && (
                <div className="mt-3 w-full bg-amber-500/10 border border-amber-500/20 rounded p-3 space-y-2">
                  <p className="text-[11px] text-amber-400 font-mono leading-relaxed">
                    Providing more detail would improve this recommendation: {activeProject.securityContextQuestion}
                  </p>
                  <Textarea
                    value={hardenContext}
                    onChange={(e) => setHardenContext(e.target.value)}
                    placeholder="Answer here..."
                    disabled={isForging || isDeploying || isImprovingSecurity}
                    className="font-mono text-xs bg-background/50 min-h-16"
                  />
                  <Button
                    onClick={() => handleImproveSecurity(hardenContext)}
                    disabled={activeProject.status !== "success" || isForging || isDeploying || isImprovingSecurity || !hardenContext.trim()}
                    className="w-full h-8 font-mono text-[11px] uppercase tracking-widest"
                  >
                    {isImprovingSecurity ? <Icons.Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Icons.Shield className="w-3.5 h-3.5 mr-2" />}
                    Use This Info & Re-Harden
                  </Button>
                </div>
              )}

              <Button
                onClick={() => handleImproveSecurity()}
                disabled={activeProject.status !== "success" || isForging || isDeploying || isImprovingSecurity}
                variant="outline"
                className="w-full h-9 mt-4 font-mono text-xs uppercase tracking-widest border-primary/40 text-primary hover:bg-primary/10"
              >
                {isImprovingSecurity ? <Icons.Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Icons.Shield className="w-3.5 h-3.5 mr-2" />}
                Improve Security
              </Button>

              <Button
                onClick={() => handleDownloadProject()}
                disabled={activeProject.status !== "success" || isForging || isDeploying || isDownloading}
                variant="outline"
                className="w-full h-9 mt-2 font-mono text-xs uppercase tracking-widest border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {isDownloading ? <Icons.Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Icons.Download className="w-3.5 h-3.5 mr-2" />}
                Download Project
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
                      <SelectGroup>
                        <SelectLabel>Testnets</SelectLabel>
                        {networksToUse.filter(net => !net.isMainnet).map(net => (
                          <SelectItem key={net.label} value={net.label}>{net.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel className="text-amber-500/80">⚠ Mainnet (real funds)</SelectLabel>
                        {networksToUse.filter(net => net.isMainnet).map(net => (
                          <SelectItem key={net.label} value={net.label}>{net.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isTargetNetworkMainnet && (
                    <p className="text-[10px] font-mono text-amber-500/80">
                      This is a mainnet network — deploying will cost real funds.
                    </p>
                  )}
                </div>

                {activeProject.ecosystem === "SOLANA" ? (
                  <p className="text-[10px] font-mono text-muted-foreground text-center px-2 py-2 bg-amber-500/10 text-amber-500/80 rounded border border-amber-500/20 leading-relaxed">
                    Browser wallets can't push a compiled Solana program — that needs a local Anchor/Solana CLI build. Download the project, run <code>anchor deploy</code> yourself, then record the result below.
                  </p>
                ) : (
                  <Button
                    onClick={handleDeployClick}
                    disabled={isDeploying || activeProject.status !== "success" || isForging}
                    className="w-full h-12 font-mono uppercase tracking-widest text-sm relative group overflow-hidden border border-primary/50"
                    variant="outline"
                  >
                    <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay" />
                    <span className="relative flex items-center text-primary group-hover:text-white transition-colors">
                      {isDeploying ? <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icons.Zap className="w-4 h-4 mr-2" />}
                      Connect Wallet & Deploy
                    </span>
                  </Button>
                )}

                {!isManualDeployOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsManualDeployOpen(true)}
                    disabled={isForging}
                    className="w-full text-[10px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest text-center underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {activeProject.ecosystem === "SOLANA" ? "Record a deployment" : "Deployed elsewhere? Enter it manually"}
                  </button>
                ) : (
                  <div className="space-y-2 bg-black/30 border border-white/5 rounded p-3">
                    <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      {activeProject.ecosystem === "SOLANA" ? "Program deploy signature & program ID" : "Transaction hash & contract address"}
                    </Label>
                    <Input
                      value={manualTxHash}
                      onChange={(e) => setManualTxHash(e.target.value)}
                      placeholder={activeProject.ecosystem === "SOLANA" ? "Deploy transaction signature" : "0x transaction hash"}
                      disabled={isSavingManualDeploy}
                      className="h-8 font-mono text-[11px] bg-background/50"
                    />
                    <Input
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder={activeProject.ecosystem === "SOLANA" ? "Program ID" : "0x contract address"}
                      disabled={isSavingManualDeploy}
                      className="h-8 font-mono text-[11px] bg-background/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 font-mono text-[10px] uppercase tracking-widest flex-1"
                        onClick={handleSaveManualDeploy}
                        disabled={isSavingManualDeploy}
                      >
                        {isSavingManualDeploy ? <Icons.Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 font-mono text-[10px] uppercase tracking-widest"
                        onClick={() => { setIsManualDeployOpen(false); setManualTxHash(""); setManualAddress("") }}
                        disabled={isSavingManualDeploy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {activeProject.liveDeployedAddress && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Deployment Status</Label>
                    <div className="mt-2 bg-black/40 p-2 rounded border border-primary/20 flex flex-col gap-1 overflow-hidden">
                      <span className="text-[10px] text-primary/70 uppercase">Address / ID</span>
                      <span className="text-[11px] font-mono truncate text-foreground select-all">{activeProject.liveDeployedAddress}</span>
                    </div>

                    {activeProject.ecosystem === "EVM" && activeProject.verificationStatus && (
                      <div className="mt-2 flex items-center gap-2">
                        {activeProject.verificationStatus === "verified" && (
                          <>
                            <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified ✅</span>
                            {activeProject.verificationUrl && (
                              <a href={activeProject.verificationUrl} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-primary hover:underline">
                                View source ↗
                              </a>
                            )}
                          </>
                        )}
                        {activeProject.verificationStatus === "pending" && (
                          <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Icons.Loader2 className="w-3 h-3 animate-spin" /> Verification pending
                          </span>
                        )}
                        {activeProject.verificationStatus === "failed" && (
                          <span
                            className="text-[10px] font-mono px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                            title={activeProject.verificationError ?? undefined}
                          >
                            Verification failed{activeProject.verificationError ? `: ${activeProject.verificationError}` : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {activeProject.ecosystem === "EVM" && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Activity Monitoring</Label>
                          {activeProject.monitoringEnabled && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">On</span>
                          )}
                        </div>

                        {activeProject.monitoringEnabled ? (
                          <div className="mt-2 flex flex-col gap-1">
                            <span className="text-[10px] font-mono text-muted-foreground truncate">
                              {activeProject.monitoringWebhookUrl ? `Webhook: ${activeProject.monitoringWebhookUrl}` : "No webhook set"}
                              {activeProject.monitoringEmailAlertsEnabled ? " · Email alerts on" : ""}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Last checked: {activeProject.monitoringLastCheckedAt ? new Date(activeProject.monitoringLastCheckedAt).toLocaleString() : "not yet"}
                              {" · "}
                              Last alert: {activeProject.monitoringLastAlertAt ? new Date(activeProject.monitoringLastAlertAt).toLocaleString() : "none"}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1 h-7 font-mono text-[10px] uppercase tracking-widest w-fit"
                              onClick={handleDisableMonitoring}
                              disabled={updateMonitoringConfig.isPending}
                            >
                              Turn off
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-col gap-2">
                            <Input
                              value={monitoringWebhookInput}
                              onChange={(e) => setMonitoringWebhookInput(e.target.value)}
                              placeholder="https://your-webhook-endpoint.com/hook"
                              className="h-8 font-mono text-[11px] bg-background/50"
                            />
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="monitoring-email-alerts"
                                checked={monitoringEmailAlertsInput}
                                onCheckedChange={(v) => setMonitoringEmailAlertsInput(v === true)}
                              />
                              <Label htmlFor="monitoring-email-alerts" className="text-[10px] font-mono text-muted-foreground">
                                Email alerts (requires an email provider to be connected)
                              </Label>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 font-mono text-[10px] uppercase tracking-widest w-fit"
                              onClick={handleEnableMonitoring}
                              disabled={updateMonitoringConfig.isPending}
                            >
                              Turn on monitoring
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
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

      <AlertDialog open={pendingMainnetNetwork !== null} onOpenChange={(open) => { if (!open) setPendingMainnetNetwork(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy to {pendingMainnetNetwork}?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a mainnet network. Broadcasting this deployment will cost real funds and cannot be undone. Make sure you've reviewed the contract and are ready to deploy for real.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMainnetDeploy}>Deploy to Mainnet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
