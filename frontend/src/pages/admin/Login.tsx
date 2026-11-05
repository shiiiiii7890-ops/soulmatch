import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { apiPost, errMsg } from "@/lib/api";
import { useAdminMe } from "@/lib/hooks";
import { beginSession } from "@/lib/session";
import type { AdminOut } from "@/lib/types";

export default function AdminLogin() {
  const nav = useNavigate();
  const me = useAdminMe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const m = useMutation({
    mutationFn: () => apiPost<AdminOut>("/auth/login", { email: email.trim(), password }),
    onSuccess: () => { beginSession(); nav("/admin", { replace: true }); },
    onError: (e) => toast.error(errMsg(e, "Login failed")),
  });
  if (me.data) return <Navigate to="/admin" replace />;
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-wine-deep p-12 text-ivory md:flex">
        <Logo light className="text-3xl" />
        <div>
          <p className="font-display text-5xl leading-tight tracking-tight">Every match is<br /><em className="text-rose-light">hand-picked.</em></p>
          <p className="mt-4 max-w-sm text-[#D6C1CA]">See all entries, match people and copy the result emails.</p>
        </div>
        <p className="text-xs text-[#8E7480]">Authorised administrators only.</p>
      </div>
      <div className="flex items-center justify-center bg-ivory p-6">
        <form className="w-full max-w-sm space-y-5" onSubmit={(e) => { e.preventDefault(); m.mutate(); }} data-testid="admin-login-form">
          <div className="md:hidden"><Logo /></div>
          <div>
            <p className="overline text-rose">Team login</p>
            <h1 className="mt-2 text-3xl tracking-tight text-wine-deep">Welcome back</h1>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad-email">Email</Label>
            <Input id="ad-email" type="email" autoComplete="username" className="h-11 bg-white" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-login-email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad-pw">Password</Label>
            <Input id="ad-pw" type="password" autoComplete="current-password" className="h-11 bg-white" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-login-password" />
          </div>
          <Button type="submit" className="h-12 w-full rounded-full" disabled={!email || !password || m.isPending} data-testid="admin-login-submit">
            {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
