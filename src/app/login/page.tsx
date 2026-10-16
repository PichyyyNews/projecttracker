"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  LayerCard,
} from "@cloudflare/kumo";
import {
  Kanban,
  EnvelopeSimple,
  LockSimple,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import GoogleButton from "@/components/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await fetch(`/api/auth/google?origin=${encodeURIComponent(window.location.origin)}`);
      const data = await res.json();

      if (!res.ok || !data.configured || !data.url) {
        throw new Error(data.error || "Google login is not configured yet. Configure in /admin");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Google login failed to initialize");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-kumo-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-sm sm:max-w-md">
        {/* Brand / Logo Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-kumo-brand text-white shadow-sm">
            <Kanban weight="thin" size={24} />
          </div>
          <h1 className="text-xl font-semibold text-kumo-default">Sign in to Project Tracker</h1>
          <p className="mt-1 text-sm text-kumo-subtle">
            Enter your credentials to access your workspace.
          </p>
        </div>

        {/* Card Container */}
        <LayerCard className="p-6 ring ring-kumo-line sm:p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              <span className="h-lh flex items-center">
                <WarningCircle weight="thin" size={16} />
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Social Sign-In (Google) */}
          <div className="mb-5">
            <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
          </div>

          <div className="relative mb-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-kumo-line" />
            </div>
            <span className="relative bg-kumo-base px-3 text-xs text-kumo-subtle">
              or continue with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-kumo-default">Email address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                  <EnvelopeSimple weight="thin" size={16} />
                </div>
                <input
                  type="email"
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 pl-9 pr-3 text-sm text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-kumo-default">Password</label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                  <LockSimple weight="thin" size={16} />
                </div>
                <input
                  type="password"
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 pl-9 pr-3 text-sm text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button variant="primary" type="submit" disabled={loading} className="w-full justify-center">
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <ArrowRight weight="thin" size={16} className="ml-1" />
            </Button>
          </form>

          {/* Footer inside Card */}
          <div className="mt-6 border-t border-kumo-line pt-4 text-center text-xs text-kumo-subtle">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-kumo-brand hover:underline">
              Create an account
            </Link>
          </div>
        </LayerCard>
      </div>
    </div>
  );
}
