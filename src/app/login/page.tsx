"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { requestAuthCode, verifyAuthCode } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";
type Step = "email" | "code";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken, isAuthenticated, loading } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const nextPath = searchParams.get("next") || "/";
  const tokenFromLink = searchParams.get("token");
  const emailFromLink = searchParams.get("email");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    }
  }, [loading, isAuthenticated, nextPath, router]);

  useEffect(() => {
    if (emailFromLink) setEmail(emailFromLink);
  }, [emailFromLink]);

  useEffect(() => {
    if (!tokenFromLink || !emailFromLink || busy) return;

    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const result = await verifyAuthCode({
          email: emailFromLink,
          token: tokenFromLink,
        });
        if (cancelled) return;
        await loginWithToken(result.token);
        router.replace(nextPath.startsWith("/") ? nextPath : "/");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Magic link expired");
          setStep("email");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // intentionally run once when link params present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromLink, emailFromLink]);

  async function onRequestCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const data = await requestAuthCode(email.trim(), mode);
      setInfo(data.message || "Check your email for a code.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await verifyAuthCode({
        email: email.trim(),
        code: code.trim(),
      });
      await loginWithToken(result.token);
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(215,169,90,0.18),_transparent_55%),linear-gradient(180deg,#f7f3ec_0%,#efe7da_100%)]" />
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[-10%] h-72 w-72 rounded-full bg-black/5 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/brand/logo-mark-gold.png"
            alt="Plus One Promo"
            width={72}
            height={96}
            className="mx-auto h-16 w-auto"
            priority
            unoptimized
          />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Plus One Promo
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Admin access
          </h1>
          <p className="mt-2 text-sm text-muted">
            Passwordless sign-in for invited teammates only.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-background p-1">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Sign up"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setStep("email");
                  setError(null);
                  setInfo(null);
                  setCode("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === value
                    ? "bg-foreground text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {step === "email" ? (
            <form onSubmit={onRequestCode} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-foreground">
                  Work email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 outline-none transition focus:border-accent"
                  autoComplete="email"
                />
              </label>
              <p className="text-xs leading-relaxed text-muted">
                {mode === "signup"
                  ? "Sign up only works if your email is on the allowlist. We’ll email a one-time code."
                  : "We’ll email a magic link and a one-time code."}
              </p>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
              >
                {busy
                  ? "Sending…"
                  : mode === "signup"
                    ? "Create account"
                    : "Email me a code"}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerifyCode} className="space-y-4">
              <p className="text-sm text-muted">
                Code sent to <span className="font-medium text-foreground">{email}</span>
              </p>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-foreground">
                  6-digit code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-center text-2xl tracking-[0.35em] outline-none transition focus:border-accent"
                  autoComplete="one-time-code"
                />
              </label>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent-dark hover:text-white disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Continue"}
              </button>
              <button
                type="button"
                className="w-full text-sm text-muted hover:text-foreground"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                Use a different email
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && !error && (
            <p className="mt-4 rounded-xl border border-border bg-brand-cream/60 px-3 py-2 text-sm text-muted">
              {info}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
