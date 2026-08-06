"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

function Logo() {
  return <span className="sb-logo" aria-hidden="true"><i /><i /></span>;
}

function Icon({ name }) {
  if (name === "bolt") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7z" fill="currentColor" /></svg>;
  if (name === "edit") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.1-1L19.2 7.9a2.1 2.1 0 0 0-3-3L5.1 16zM14.7 6.4l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "rocket") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5c2.7-2.6 5.7-2.8 6.5-2.7.1.9 0 3.9-2.7 6.6L12.5 14l-4-4zM12.5 14l-2.1 2.1M8.5 9.9 5 8.7l-2 2 4 2M14.1 15.5l1.2 4 2-2-1.1-3.5M5.5 15.5c-1.5 1.1-2 3-2 5 2 0 3.9-.5 5-2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "mail") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

const features = [
  ["bolt", "AI-Powered", "Generate complete websites with a simple prompt."],
  ["edit", "Fully Customizable", "Edit and personalize every detail to match your brand."],
  ["rocket", "Launch Instantly", "Publish your website in one click and go live."],
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("login");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await createClient().auth.getSession();
      if (session) router.push("/dashboard");
    })();
  }, [router]);

  async function signInWithGoogle() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const supabase = createClient();
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) setError(result.error.message || "That email or password didn't work.");
      else router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  const welcome = mode === "login" ? "Welcome back" : "Create your account";

  return <main className="sb-page">
    <div className="sb-background" aria-hidden="true"><div className="sb-beams" /><div className="sb-terrain" /><div className="sb-grain" /></div>
    <section className="sb-left">
      <a className="sb-brand" href="/"><Logo />sitebric</a>
      <div className="sb-marketing">
        <span className="sb-pill"><b />AI-POWERED PLATFORM</span>
        <h1>Build stunning<br />websites in<br /><em>seconds.</em></h1>
        <p className="sb-intro">Sitebric is the AI-powered platform that helps you generate stunning websites, and launch professional websites — faster than ever.</p>
        <div className="sb-features">{features.map(([icon, title, description]) => <div className="sb-feature" key={title}><span className="sb-feature-icon"><Icon name={icon} /></span><p><strong>{title}</strong><span>{description}</span></p></div>)}</div>
        <div className="sb-trust"><div className="sb-avatars"><i className="sb-avatar a1" /><i className="sb-avatar a2" /><i className="sb-avatar a3" /><i className="sb-avatar a4" /></div><div><div className="sb-stars">★★★★★</div><p>Trusted by creators and businesses<br />to build the future of the web.</p></div></div>
      </div>
    </section>

    <section className="sb-right">
      <nav className="sb-nav"><a href="/pricing">Documentation</a><a href="mailto:supportsitebric@gmail.com">Contact</a><button type="button" aria-label="Theme settings">☼</button></nav>
      <form className="sb-card" onSubmit={handleSubmit}>
        <h2>sitebric</h2><div className="sb-welcome"><h3>{welcome} <span>{mode === "login" ? "👋" : "🚀"}</span></h3><p>{mode === "login" ? "Log in to your account to continue" : "Start building client sites today"}</p></div>
        <label className="sb-label">Email<span className="sb-field"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" /><Icon name="mail" /></span></label>
        <label className="sb-label">Password<span className="sb-field"><input type={showPassword ? "text" : "password"} required minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show or hide password"><Icon name="eye" /></button></span></label>
        {mode === "login" && <div className="sb-options"><label><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span />Remember me</label><a href="/reset-password">Forgot password?</a></div>}
        {error && <p className="sb-error">{error}</p>}
        <button className="sb-submit" type="submit" disabled={loading}><span>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</span><b>→</b></button>
        <div className="sb-divider"><i />or<i /></div>
        <button className="sb-google" type="button" onClick={signInWithGoogle}><b>G</b>Continue with Google</button>
        <p className="sb-switch">{mode === "login" ? "Don’t have an account?" : "Already have an account?"}<button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Sign up" : "Log in"}</button></p>
      </form>
    </section>
    <footer><span>© 2026 Sitebric. All rights reserved.</span><nav><a href="/terms">Terms of Service</a><a href="/privacy">Privacy Policy</a><a href="mailto:supportsitebric@gmail.com">Contact Us</a></nav><div><span>𝕏</span><span>♟</span><span>◉</span></div></footer>
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box}.sb-page{min-height:768px;height:100vh;position:relative;overflow:hidden;isolation:isolate;background:#050505;color:#f2f2f2;font-family:Inter,Arial,sans-serif;font-size:12px;-webkit-font-smoothing:antialiased}.sb-page a{color:inherit;text-decoration:none}.sb-background,.sb-background>div{position:absolute;inset:0;pointer-events:none}.sb-background{z-index:-1}.sb-beams{opacity:.52;background:linear-gradient(90deg,transparent 0 31.9%,rgba(255,255,255,.045) 32%,transparent 32.1% 41.3%,rgba(255,255,255,.08) 41.4%,transparent 41.5% 47.4%,rgba(255,255,255,.045) 47.5%,transparent 47.6%)}.sb-beams:after{content:'';position:absolute;width:20%;height:57%;left:36%;top:30%;background:radial-gradient(ellipse,rgba(255,255,255,.18),transparent 69%);filter:blur(18px);opacity:.42}.sb-terrain{top:50%;left:6%;width:52%;height:35%;opacity:.42;transform:perspective(310px) rotateX(51deg);transform-origin:bottom center;background-image:linear-gradient(rgba(230,230,230,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(230,230,230,.14) 1px,transparent 1px);background-size:100% 14px,15px 100%;mask-image:radial-gradient(ellipse 63% 68% at 51% 57%,#000 15%,transparent 76%)}.sb-terrain:before{content:'';position:absolute;left:22%;bottom:17%;height:83%;width:57%;border-radius:50% 50% 13% 13% / 55% 55% 15% 15%;border-top:1px solid rgba(255,255,255,.25);background:repeating-radial-gradient(ellipse 85% 32% at 50% 100%,transparent 0 11px,rgba(255,255,255,.16) 12px 13px)}.sb-grain{opacity:.075;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E");mix-blend-mode:screen}.sb-left{position:absolute;left:0;top:0;width:47.2%;height:100%;border-right:1px solid rgba(255,255,255,.035)}.sb-brand{position:absolute;left:30px;top:23px;display:flex;align-items:center;gap:11px;font-size:21px;font-weight:600;letter-spacing:-.9px}.sb-logo{width:19px;height:22px;position:relative;display:block;transform:skewX(-28deg)}.sb-logo i{display:block;position:absolute;left:1px;width:17px;height:8px;background:#f1f1f1}.sb-logo i:first-child{top:1px;clip-path:polygon(25% 0,100% 0,75% 100%,0 100%)}.sb-logo i:last-child{bottom:1px;clip-path:polygon(25% 0,100% 0,75% 100%,0 100%)}.sb-marketing{position:absolute;top:102px;left:61px;width:285px}.sb-pill{height:27px;display:inline-flex;align-items:center;gap:7px;padding:0 11px;border:1px solid rgba(255,255,255,.15);border-radius:999px;color:#c1c1c1;font-size:9px}.sb-pill b{width:4px;height:4px;border-radius:50%;background:#b6b6b6}.sb-marketing h1{margin:17px 0 14px;font-size:40px;line-height:1.04;letter-spacing:-2.1px;font-weight:500}.sb-marketing h1 em{font-style:normal;color:#888}.sb-intro{margin:0;width:281px;color:#b5b5b5;font-size:12px;line-height:19px;letter-spacing:-.16px}.sb-features{margin-top:19px;display:grid;gap:18px}.sb-feature{display:flex;align-items:flex-start;gap:15px}.sb-feature-icon{display:grid;place-items:center;width:40px;height:40px;flex:none;border:1px solid rgba(255,255,255,.105);border-radius:10px;background:rgba(255,255,255,.045);box-shadow:inset 0 1px rgba(255,255,255,.06),0 4px 15px rgba(0,0,0,.25)}.sb-feature-icon svg{width:17px;height:17px}.sb-feature p{display:grid;gap:3px;margin:0}.sb-feature strong{font-size:11px;line-height:14px;font-weight:500}.sb-feature p span{color:#a6a6a6;font-size:10px;line-height:14px}.sb-trust{width:285px;height:79px;display:flex;align-items:center;gap:17px;margin-top:25px;padding:0 19px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(255,255,255,.025);box-shadow:0 12px 30px rgba(0,0,0,.23)}.sb-avatars{display:flex}.sb-avatar{width:29px;height:29px;margin-left:-6px;border:1.5px solid #d1d1d1;border-radius:50%;box-shadow:0 0 0 1px #171717}.sb-avatar:first-child{margin-left:0}.a1{background:radial-gradient(circle at 55% 26%,#e0c3af 0 21%,#372925 23% 31%,#a8775c 33% 55%,#202020 57%)}.a2{background:radial-gradient(circle at 47% 29%,#d4a47e 0 20%,#25201e 22% 34%,#805f49 35% 53%,#131313 55%)}.a3{background:radial-gradient(circle at 51% 29%,#e3b596 0 21%,#53332b 23% 32%,#966a57 34% 55%,#272727 57%)}.a4{background:radial-gradient(circle at 48% 28%,#c5916a 0 21%,#171514 23% 32%,#704d3e 34% 55%,#202020 57%)}.sb-stars{height:14px;color:#f4f4f4;font-size:12px;letter-spacing:1px}.sb-trust p{margin:2px 0 0;color:#a7a7a7;font-size:9px;line-height:14px;white-space:nowrap}.sb-right{position:absolute;left:47.2%;right:0;height:100%}.sb-nav{position:absolute;right:29px;top:19px;display:flex;align-items:center;gap:31px;color:#c4c4c4;font-size:10px}.sb-nav button{width:32px;height:32px;border:1px solid rgba(255,255,255,.13);border-radius:8px;background:transparent;color:#bbb;font-size:17px;cursor:pointer}.sb-card{position:absolute;top:74px;left:50%;width:446px;min-height:594px;transform:translateX(-50%);padding:35px 34px 29px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(10,10,10,.82);box-shadow:0 18px 60px rgba(0,0,0,.22)}.sb-card h2{margin:0;text-align:center;font-size:30px;line-height:37px;letter-spacing:-1.6px;font-weight:600}.sb-welcome{text-align:center;margin:21px 0 33px}.sb-welcome h3{margin:0;font-size:16px;font-weight:500;letter-spacing:-.55px}.sb-welcome h3 span{font-size:15px}.sb-welcome p{margin:11px 0 0;color:#a9a9a9;font-size:12px}.sb-label{display:grid;gap:8px;margin-top:21px;color:#eee;font-size:12px}.sb-label:first-of-type{margin-top:0}.sb-field{position:relative;display:flex;align-items:center;height:42px;border:1px solid rgba(255,255,255,.09);border-radius:6px;background:#101010;transition:border-color .2s ease}.sb-field:focus-within{border-color:rgba(255,255,255,.24)}.sb-field input{width:100%;min-width:0;padding:0 42px 0 14px;border:0;outline:0;background:transparent;color:#eee;font-size:12px}.sb-field input::placeholder{color:#888}.sb-field>svg,.sb-field button{position:absolute;right:13px;color:#aaa}.sb-field>svg{width:17px;height:17px}.sb-field button{display:grid;place-items:center;padding:0;border:0;background:transparent;cursor:pointer}.sb-field button svg{width:17px;height:17px}.sb-options{display:flex;align-items:center;justify-content:space-between;height:45px;color:#b9b9b9;font-size:10px}.sb-options label{display:flex;align-items:center;gap:8px;cursor:pointer}.sb-options input{position:absolute;opacity:0}.sb-options label span{width:14px;height:14px;border:1px solid rgba(255,255,255,.2);border-radius:3px;background:#0c0c0c}.sb-options input:checked+span{background:#fff}.sb-options a{color:#dedede}.sb-error{margin:0 0 13px;padding:9px 10px;border:1px solid rgba(220,38,38,.3);border-radius:6px;background:rgba(220,38,38,.1);color:#fca5a5;font-size:11px}.sb-submit,.sb-google{width:100%;height:45px;cursor:pointer;transition:transform .2s ease,background .2s ease}.sb-submit{display:flex;align-items:center;justify-content:center;gap:126px;border:0;border-radius:6px;background:#f5f5f5;color:#111;font-size:12px;font-weight:600;box-shadow:0 6px 18px rgba(255,255,255,.08)}.sb-submit:hover:not(:disabled){transform:translateY(-1px);background:#fff}.sb-submit:disabled{opacity:.7}.sb-submit b{font-size:19px;font-weight:400}.sb-divider{display:grid;grid-template-columns:1fr 18px 1fr;align-items:center;gap:9px;height:46px;color:#aaa;font-size:10px;text-align:center}.sb-divider i{height:1px;background:rgba(255,255,255,.1)}.sb-google{border:1px solid rgba(255,255,255,.17);border-radius:6px;background:rgba(255,255,255,.02);color:#e8e8e8;font-size:12px}.sb-google:hover{background:rgba(255,255,255,.07)}.sb-google b{margin-right:13px;font-size:19px;vertical-align:-2px}.sb-switch{margin:28px 0 0;text-align:center;color:#aaa;font-size:12px}.sb-switch button{margin-left:5px;padding:0;border:0;background:transparent;color:#f3f3f3;font-weight:600;cursor:pointer}footer{position:absolute;bottom:41px;left:45px;right:87px;display:flex;align-items:center;justify-content:space-between;color:#aaa;font-size:9px}footer nav{display:flex;gap:62px;margin-left:56px}footer>div{display:flex;gap:23px;font-size:16px}@media(max-width:900px){.sb-page{height:auto;min-height:100vh;overflow:auto;padding-bottom:40px}.sb-left,.sb-right{position:relative;width:100%;left:auto;right:auto}.sb-left{height:620px;border:0}.sb-marketing{top:128px;left:max(30px,calc((100vw - 700px)/2))}.sb-right{height:685px}.sb-nav{top:-601px}.sb-card{top:20px}.sb-terrain{width:80%}footer{position:relative;left:auto;right:auto;bottom:auto;width:calc(100% - 60px);margin:0 30px}}@media(max-width:520px){.sb-left{height:640px}.sb-marketing{left:30px;transform:scale(.95);transform-origin:top left}.sb-nav{right:20px;gap:18px}.sb-card{width:calc(100% - 32px);padding:30px 20px}.sb-submit{gap:min(32vw,126px)}footer{flex-direction:column;gap:16px;align-items:flex-start}footer nav{margin:0;gap:20px}footer>div{display:none}}
    `}</style>
  </main>;
}
