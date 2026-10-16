"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  LayerCard,
} from "@cloudflare/kumo";
import {
  Kanban,
  User,
  EnvelopeSimple,
  LockSimple,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import GoogleButton from "@/components/GoogleButton";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If already logged in, automatically redirect to home
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated) {
          router.replace("/");
        }
      } catch (err) {
        // ignore
      }
    }
    checkAuth();
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed");
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
      setError(err.message || "Google signup failed to initialize");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-kumo-canvas px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[420px]">
        {/* Card Container */}
        <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
          {/* Brand / Logo Header inside Card */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-kumo-base ring-1 ring-kumo-line p-1">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-lg font-semibold text-kumo-default">Create your account</h1>
            <p className="mt-1 text-xs text-kumo-subtle">
              Start tracking and deploying your projects.
            </p>
          </div>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              <span className="h-lh flex items-center">
                <WarningCircle weight="thin" size={15} />
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Social Sign-In (Google) */}
          <div className="mb-4">
            <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
          </div>

          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-kumo-line" />
            </div>
            <span className="relative bg-kumo-base px-3 text-[11px] text-kumo-subtle">
              or register with email
            </span>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="grid gap-3.5">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-kumo-default">Full name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <User weight="thin" size={15} />
                </div>
                <input
                  type="text"
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-kumo-default">Email address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <EnvelopeSimple weight="thin" size={15} />
                </div>
                <input
                  type="email"
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-kumo-default">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <LockSimple weight="thin" size={15} />
                </div>
                <input
                  type="password"
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-medium text-kumo-default">Confirm password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <LockSimple weight="thin" size={15} />
                </div>
                <input
                  type="password"
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mt-1">
              <Button variant="primary" type="submit" disabled={loading} className="w-full justify-center">
                <span>{loading ? "Creating account..." : "Create account"}</span>
                <ArrowRight weight="thin" size={15} className="ml-1" />
              </Button>
            </div>
          </form>

          {/* Footer inside Card */}
          <div className="mt-5 border-t border-kumo-line pt-3.5 text-center text-xs text-kumo-subtle">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-kumo-brand hover:underline">
              Sign in
            </Link>
          </div>
        </LayerCard>
      </div>
    </div>
  );
}
