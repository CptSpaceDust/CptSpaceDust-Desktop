import { useEffect, useRef, useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Eye, EyeOff, KeyRound, Mail, Rocket, ShieldCheck, UserRound } from "lucide-react";
import { HCAPTCHA_HOST, HCAPTCHA_SITE_KEY, supabase } from "../lib/supabase";

export default function AuthScreen({ initialMode = "login", onModeChange, onMfaVerified }) {
  const [mode, setModeState] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const captchaRef = useRef(null);

  useEffect(()=>{if(mode!=="signup"||username.trim().length<3){setUsernameAvailable(false);setUsernameStatus(username?"Username must be at least 3 characters.":"");return}const value=username.trim();const timer=setTimeout(async()=>{const{data:allowed,error:allowedError}=await supabase.rpc("signup_identity_allowed",{candidate_email:email.trim(),candidate_username:value});if(username.trim()!==value)return;if(allowedError||allowed===false){setUsernameAvailable(false);setUsernameStatus("This account name cannot be used.");return}const{data,error}=await supabase.from("profiles").select("username").ilike("username",value);if(error||data?.length){setUsernameAvailable(false);setUsernameStatus("Username already taken.")}else{setUsernameAvailable(true);setUsernameStatus("Username available.")}},500);return()=>clearTimeout(timer)},[mode,username,email]);

  useEffect(()=>{if(mode!=="mfa")return;(async()=>{const{data,error}=await supabase.auth.mfa.listFactors();const factor=data?.totp?.find(item=>item.status==="verified");if(error||!factor){setMessage(error?.message||"No verified authenticator was found.");return}const result=await supabase.auth.mfa.challenge({factorId:factor.id});if(result.error)setMessage(result.error.message);else setMfaChallenge({factorId:factor.id,challengeId:result.data.id})})()},[mode]);

  function setMode(next) {
    setModeState(next); setMessage(""); setCaptchaToken(""); captchaRef.current?.resetCaptcha(); onModeChange?.(next);
  }

  async function submit(event) {
    event.preventDefault(); setMessage("");
    if(mode==="mfa"){
      if(!mfaChallenge||mfaCode.trim().length!==6)return setMessage("Enter the 6-digit code from your authenticator app.");
      setBusy(true);const{error}=await supabase.auth.mfa.verify({...mfaChallenge,code:mfaCode.trim()});setBusy(false);if(error)setMessage("Invalid MFA code.");else onMfaVerified?.();return;
    }
    if (mode === "reset") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "cptspacedust://reset-password" });
      setBusy(false); setMessage(error ? error.message : "Password reset email sent. Open its link on this computer."); return;
    }
    if (!captchaToken) return setMessage("Complete the captcha to continue.");
    if (mode === "signup" && !usernameAvailable) return setMessage("Please choose an available username.");
    if (mode === "signup" && password !== confirm) return setMessage("Those passwords do not match.");
    setBusy(true);
    let result;
    if(mode==="signup"){
      const{data:allowed,error:allowedError}=await supabase.rpc("signup_identity_allowed",{candidate_email:email.trim(),candidate_username:username.trim()});
      if(allowedError||allowed===false){setBusy(false);return setMessage("This email or username cannot be used.")}
      result=await supabase.auth.signUp({ email, password, options: { captchaToken, data: { username: username.trim() } } });
      if(!result.error&&result.data.user){const{error:profileError}=await supabase.from("profiles").insert({id:result.data.user.id,username:username.trim(),rank:"New Member",joined:new Date().getFullYear(),theme:"default",avatar:null,bio:"New explorer has entered space!",birthday:null,show_age:true,show_birthday:false,favorite_game:"Not Set",discord:"",youtube:"",twitch:"",vrchat:"",steam:"",online:false,last_seen:null,badges:["First time in space!"]});if(profileError&&!profileError.message?.toLowerCase().includes("duplicate"))result={...result,error:profileError}}
    }else{
      try{const response=await fetch("https://houyownfnnqgvhiokwow.supabase.co/functions/v1/log-login-attempt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim()})});const attempt=await response.json();if(attempt.blocked){setBusy(false);return setMessage("Too many failed attempts. Please wait a few minutes.")}}catch{}
      result=await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if(!result.error&&result.data.session){try{await fetch("https://houyownfnnqgvhiokwow.supabase.co/functions/v1/log-login-attempt",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${result.data.session.access_token}`},body:JSON.stringify({email:result.data.user.email,success:true,user_id:result.data.user.id,send_login_alert:true})})}catch{}await supabase.from("user_sessions").insert({user_id:result.data.user.id,session_id:crypto.randomUUID(),device:`Desktop app (${navigator.platform})`,browser:navigator.userAgent});}
    }
    setBusy(false); captchaRef.current?.resetCaptcha(); setCaptchaToken("");
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup") setMessage("Account created. Check your email if confirmation is required.");
  }

  return <main className="auth-layout">
    <section className="auth-story">
      <div className="brand-lockup"><span className="brand-orbit"><Rocket /></span><div><strong>CptSpaceDust</strong><small>Community Desktop</small></div></div>
      <div className="auth-copy"><span className="eyebrow">Crew communications online</span><h1>Your community.<br/><em>One private orbit.</em></h1>
      <p>Meet the crew, build ideas together, plan meetups, and keep every conversation close at hand.</p></div>
      <div className="auth-security"><ShieldCheck/><span><strong>Desktop-first privacy</strong><small>Protected by your account and optional local PIN lock.</small></span></div>
    </section>
    <section className="auth-panel"><div className="auth-card">
      <div className="auth-icon">{mode === "reset"||mode==="mfa" ? <KeyRound/> : mode === "signup" ? <UserRound/> : <Mail/>}</div>
      <span className="eyebrow">{mode === "signup" ? "Join the crew" : mode === "reset" ? "Account recovery" : mode==="mfa"?"Two-factor verification":"Welcome back"}</span>
      <h2>{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : mode==="mfa"?"Enter your authenticator code":"Sign in to continue"}</h2>
      <form onSubmit={submit}>
        {mode==="mfa"?<label className="field"><span>6-digit code</span><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,""))} autoFocus required/></label>:<>
        {mode === "signup" && <label className="field"><span>Username</span><input value={username} onChange={e=>setUsername(e.target.value)} minLength="3" maxLength="24" required />{usernameStatus&&<small>{usernameStatus}</small>}</label>}
        <label className="field"><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        {mode !== "reset" && <><label className="field"><span>Password</span><div className="password-field"><input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} minLength="6" required/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
        {mode === "signup" && <label className="field"><span>Confirm password</span><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength="6" required/></label>}
        <div className="captcha-wrap"><HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          host={HCAPTCHA_HOST}
          theme="dark"
          onVerify={setCaptchaToken}
          onExpire={()=>setCaptchaToken("")}
          onError={()=>{ setCaptchaToken(""); setMessage("Captcha could not load. Check your connection, then try again."); }}
        /></div></>}</>}
        {message && <p className="form-message">{message}</p>}
        <button className="button primary wide" disabled={busy}>{busy ? "Connecting…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset email" : mode==="mfa"?"Verify code":"Enter community"}</button>
      </form>
      <div className="auth-links">
        {mode === "login" && <><button onClick={()=>setMode("reset")}>Forgot password?</button><span>•</span><button onClick={()=>setMode("signup")}>Create account</button></>}
        {mode !== "login"&&mode!=="mfa" && <button onClick={()=>setMode("login")}>Back to sign in</button>}
      </div>
    </div></section>
  </main>;
}
