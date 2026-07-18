import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import {
  useGetCurrentUser,
  useLogin,
  useSignup,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"

export default function AuthPage() {
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  // retry: false so a 401 (not logged in) resolves immediately instead of
  // retrying 3x with backoff and showing a stuck spinner for several seconds.
  const { data: user, isLoading } = useGetCurrentUser({ query: { retry: false } })
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const loginMutation = useLogin()
  const signupMutation = useSignup()

  useEffect(() => {
    if (user) {
      setLocation("/dashboard")
    }
  }, [user, setLocation])

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Icons.Loader2 className="animate-spin text-primary w-8 h-8" /></div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      if (isLogin) {
        await loginMutation.mutateAsync({ data: { email, password } })
        toast.success("Welcome back to AURA Forge")
      } else {
        await signupMutation.mutateAsync({ data: { email, password } })
        toast.success("Account created successfully")
      }
      // Clear the stale pre-login user cache so the dashboard's useGetCurrentUser
      // does a fresh fetch and sees the authenticated session. Without this, the
      // dashboard reads the cached 401-error state from before login, triggers its
      // userError guard, and immediately bounces back to the auth page.
      queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() })
      setLocation("/dashboard")
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Authentication failed")
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 pointer-events-none" />
      </div>

      <div className="z-10 w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Icons.Zap className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-mono uppercase text-foreground">AURA<span className="text-primary">FORGE</span></h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-widest">Multi-chain Smart Contract Forge</p>
        </div>

        <Card className="border-primary/20 bg-card/40 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle>{isLogin ? "System Access" : "Initialize Identity"}</CardTitle>
            <CardDescription>
              {isLogin ? "Authenticate to access the forge." : "Create a new engineer profile."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Sequence</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="engineer@aura.network"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border-white/10 focus:border-primary/50 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passkey</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-white/10 focus:border-primary/50 font-mono"
                  minLength={8}
                />
                {!isLogin && (
                  <p className="text-xs text-muted-foreground font-mono">Minimum 8 characters</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full font-mono uppercase tracking-wider" 
                disabled={loginMutation.isPending || signupMutation.isPending}
              >
                {loginMutation.isPending || signupMutation.isPending ? (
                  <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Icons.Terminal className="w-4 h-4 mr-2" />
                )}
                {isLogin ? "Execute Login" : "Execute Registration"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              >
                {isLogin ? "New engineer? Initialize profile →" : "Existing engineer? Execute login →"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
