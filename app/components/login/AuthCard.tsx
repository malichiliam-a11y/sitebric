"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";
import { readReferralCode } from "@/lib/referral";
import { palette, metrics, easing } from "@/lib/design";
import { IconMail, IconEye, IconEyeOff, IconGoogle } from "./primitives";
import { Field, Affix, PrimaryButton, SecondaryButton, Checkbox, controlCss } from "./controls";

// "verify" is the step between signing up and having a session: Supabase
// mails a 6-digit code and will not issue a session until it comes back.
type Mode = "login" | "signup" | "forgot" | "verify";

export default function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState<string>(
    () => (typeof window !== "undefined" && window.localStorage.getItem("sitebric_email")) || ""
  );
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function switchMode(next: Mode) {
    setError("");
    setNotice("");
    setMode(next);
  }

  // Sends (or re-sends) the signup confirmation code. Used both when a
  // login turns out to be unconfirmed and from the "Resend it" link.
  async function sendCode(target: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: target });
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }

  async function resendCode() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (await sendCode(email)) setNotice(`New code sent to ${email}.`);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message || "Google sign-in isn't available right now. Try email instead.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (rememberMe) window.localStorage.setItem("sitebric_email", email);
      else window.localStorage.removeItem("sitebric_email");

      const supabase = createClient();

      if (mode === "verify") {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: code.trim(),
          type: "signup",
        });
        if (error) setError(error.message);
        else if (data.session) router.push("/dashboard");
        else setError("That code didn't work. Request a new one and try again.");
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(error.message);
        else setNotice("Check your email for a link to reset your password.");
        return;
      }

      if (mode === "signup") {
        const ref = readReferralCode();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: ref ? { ref } : undefined,
          },
        });
        if (error) setError(error.message);
        else if (data.session) router.push("/dashboard");
        else {
          // No session means confirmation is required. Supabase has just
          // mailed a code, so go collect it rather than leaving the user
          // on a dead-end "check your email" message.
          // Supabase also returns a session-less user when the address is
          // already registered (it will not confirm or deny that), and in
          // that case no code is sent — so point at logging in too.
          setCode("");
          setMode("verify");
          setNotice(
            `We sent a 6-digit code to ${email}. Already have an account? Log in instead.`
          );
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Someone who signed up before confirming lands here forever
        // otherwise — send a fresh code and take them to the code step.
        // Match on the message too: the typed `code` field is not present
        // on every supabase-js error shape, and being wrong here means
        // the user is bounced back to a plain "invalid credentials".
        const unconfirmed =
          (error as { code?: string }).code === "email_not_confirmed" ||
          /email\s+not\s+confirmed/i.test(error.message || "");
        if (unconfirmed) {
          setCode("");
          if (await sendCode(email)) {
            setMode("verify");
            setNotice(`Confirm your email first — we sent a 6-digit code to ${email}.`);
          }
        } else {
          setError(error.message);
        }
      } else router.push("/dashboard");
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "signup"
      ? "Create your account"
      : mode === "forgot"
      ? "Reset your password"
      : mode === "verify"
      ? "Check your email"
      : "Welcome back 👋";
  const subheading =
    mode === "signup"
      ? "Start building client sites in minutes"
      : mode === "forgot"
      ? "We'll email you a link to set a new one"
      : mode === "verify"
      ? "Enter the 6-digit code we sent you"
      : "Log in to your account to continue";
  const ctaLabel = loading
    ? mode === "signup"
      ? "Creating account"
      : mode === "forgot"
      ? "Sending"
      : mode === "verify"
      ? "Verifying"
      : "Logging in"
    : mode === "signup"
    ? "Create account"
    : mode === "forgot"
    ? "Send reset link"
    : mode === "verify"
    ? "Verify and continue"
    : "Log in";

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easing }}
      style={{
        width: "100%",
        maxWidth: metrics.cardWidth,
        boxSizing: "border-box",
        padding: `${metrics.cardPadTop}px ${metrics.cardPadX}px ${metrics.cardPadBottom}px`,
        borderRadius: metrics.cardRadius,
        border: `1px solid ${palette.hairline}`,
        background: `linear-gradient(180deg, ${palette.cardTop} 0%, ${palette.card} 46%, ${palette.card} 100%)`,
        // No backdrop-filter here on purpose. The card is 88% opaque
        // over near-black so the blur was contributing almost nothing
        // visually, but with an animated backdrop underneath it forced a
        // full re-blur every frame — measured at 33fps of the budget.
        boxShadow: "0 1px 1px rgba(0,0,0,0.55), 0 24px 70px rgba(0,0,0,0.5)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: controlCss }} />

      <div
        style={{
          fontSize: 40,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          textAlign: "center",
          color: palette.text,
          marginBottom: 38,
        }}
      >
        sitebric
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: easing }}
        >
          <div
            style={{
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              textAlign: "center",
              color: palette.text,
              marginBottom: 10,
            }}
          >
            {heading}
          </div>
          <div style={{ fontSize: 14.5, textAlign: "center", color: palette.textMuted, marginBottom: 51 }}>
            {subheading}
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        {mode === "verify" ? (
          <Field
            id="sb-code"
            label="Verification code"
            type="text"
            required
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            // Strip anything non-numeric so pasting "417 383" or a code
            // copied with stray whitespace still works.
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ letterSpacing: "0.4em", fontSize: 19, textAlign: "center" }}
          />
        ) : (
          <>
            <Field
              id="sb-email"
              label="Email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              affix={<Affix><IconMail size={17} /></Affix>}
            />

            {mode !== "forgot" && (
              <Field
                id="sb-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                affix={
                  <Affix
                    onClick={() => setShowPassword((v) => !v)}
                    label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </Affix>
                }
              />
            )}
          </>
        )}
      </div>

      {mode === "login" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 30px" }}>
          <Checkbox checked={rememberMe} onChange={setRememberMe}>
            Remember me
          </Checkbox>
          <span className="sb-link" style={{ fontSize: 13.5, whiteSpace: "nowrap" }} onClick={() => switchMode("forgot")}>
            Forgot password?
          </span>
        </div>
      )}

      <div style={{ marginTop: mode === "login" ? 0 : 28 }}>
        <PrimaryButton loading={loading}>{ctaLabel}</PrimaryButton>
      </div>

      <AnimatePresence>
        {(notice || error) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: easing }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                fontSize: 13.5,
                color: notice ? palette.positive : palette.negative,
                background: notice ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)",
                border: `1px solid ${notice ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)"}`,
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              {notice || error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode !== "forgot" && mode !== "verify" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "32px 0 26px", color: palette.textGhost, fontSize: 13.5 }}>
            <div style={{ flex: 1, height: 1, background: palette.hairline }} />
            or
            <div style={{ flex: 1, height: 1, background: palette.hairline }} />
          </div>

          <SecondaryButton onClick={signInWithGoogle}>
            <IconGoogle size={18} />
            Continue with Google
          </SecondaryButton>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 40, fontSize: 13.5, color: palette.textMuted }}>
        {mode === "login" && (
          <>
            Don&apos;t have an account?{" "}
            <span className="sb-link sb-link--strong" onClick={() => switchMode("signup")}>Sign up</span>
          </>
        )}
        {mode === "signup" && (
          <>
            Already have an account?{" "}
            <span className="sb-link sb-link--strong" onClick={() => switchMode("login")}>Log in</span>
          </>
        )}
        {mode === "forgot" && (
          <span className="sb-link sb-link--strong" onClick={() => switchMode("login")}>Back to log in</span>
        )}
        {mode === "verify" && (
          <>
            Didn&apos;t get it?{" "}
            <span className="sb-link sb-link--strong" onClick={resendCode}>Resend it</span>
            <div style={{ marginTop: 12 }}>
              <span className="sb-link" onClick={() => switchMode("login")}>Back to log in</span>
            </div>
          </>
        )}
      </div>
    </motion.form>
  );
}
