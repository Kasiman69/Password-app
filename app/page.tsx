"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, KeyRound, LockKeyhole, Eye, EyeOff, LogOut, LoaderCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { appHomeUrl } from "@/lib/app-url";
import { createAutoLock } from "@/lib/auto-lock";
import { deriveKey, newSalt, seal, unseal, type Vault } from "@/lib/vault-crypto";
import { createVault, readVault, type VaultRow } from "@/lib/vault-store";
import { VaultWorkbench } from "./vault-workbench";

export function Brand(){return <a href="./" className="brand" aria-label="Pöhner Passwords home"><span className="brand-mark"><KeyRound size={22}/></span>Pöhner Passwords</a>;}
export function PasswordInput({label,placeholder,autoComplete="current-password",minLength,onChange,value,required=true}:{label:string;placeholder?:string;autoComplete?:string;minLength?:number;onChange?:(value:string)=>void;value?:string;required?:boolean}){
 const [visible,setVisible]=useState(false);
 return <label>{label}<span className="password-input"><input aria-label={label} type={visible?"text":"password"} placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} maxLength={512} value={value} onChange={e=>onChange?.(e.target.value)} required={required}/><button type="button" aria-label={visible?`Hide ${label.toLowerCase()}`:`Show ${label.toLowerCase()}`} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>;
}
function AuthShell({children}:{children:React.ReactNode}){return <main className="auth-shell minimal-auth"><header className="auth-brand"><Brand/></header><section className="auth-main"><div className="auth-card">{children}</div></section></main>;}
const errorText=(error:unknown)=>error instanceof Error?error.message:"Something went wrong. Please try again.";

function AuthForm({recovery,onRecovered}:{recovery:boolean;onRecovered:()=>void}){
 const [mode,setMode]=useState("signin"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[isError,setIsError]=useState(false);
 const activeMode=recovery?"reset":mode;
 function switchMode(value:string){setMode(value);setPassword("");setConfirm("");setMessage("");}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");setIsError(false);
  try{
   if((activeMode==="signup"||activeMode==="reset")&&password!==confirm)throw new Error("The passwords do not match.");
   if(activeMode==="signin"){
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw new Error(error.message);setPassword("");
   }else if(activeMode==="signup"){
    const {error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:appHomeUrl()}});if(error)throw new Error(error.message);
    setPassword("");setConfirm("");setMessage("Check your email for a confirmation link, then return here to sign in.");
   }else if(activeMode==="forgot"){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:appHomeUrl()+"?recovery=1"});if(error)throw new Error(error.message);
    setMessage("If an account exists for this email, a reset link is on its way. Your vault passphrase stays the same.");
   }else{
    const {error}=await supabase.auth.updateUser({password});if(error)throw new Error(error.message);setPassword("");setConfirm("");onRecovered();
   }
  }catch(error){setIsError(true);setMessage(errorText(error));}finally{setBusy(false);}
 }
 return <AuthShell><h2>{activeMode==="forgot"?"Reset password":activeMode==="reset"?"New password":"Password vault"}</h2><p className="muted intro">{activeMode==="forgot"?"Reset your account password by email.":activeMode==="reset"?"Choose a new account password.":activeMode==="signup"?"Create your account.":"Sign in to your vault."}</p>
 {(activeMode==="signin"||activeMode==="signup")&&<Tabs value={mode} onValueChange={switchMode}><TabsList className="auth-tabs"><TabsTrigger value="signin" disabled={busy}>Sign in</TabsTrigger><TabsTrigger value="signup" disabled={busy}>Create account</TabsTrigger></TabsList></Tabs>}
 <form className="form-stack" onSubmit={submit}><fieldset disabled={busy} className="form-stack">
 {activeMode!=="reset"&&<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254}/></label>}
 {activeMode!=="forgot"&&<PasswordInput label="Account password" value={password} onChange={setPassword} placeholder={activeMode==="signin"?"Enter your password":"At least 12 characters"} minLength={activeMode==="signin"?undefined:12} autoComplete={activeMode==="signin"?"current-password":"new-password"}/>}
 {(activeMode==="signup"||activeMode==="reset")&&<PasswordInput label="Confirm password" value={confirm} onChange={setConfirm} placeholder="Enter it once more" autoComplete="new-password"/>}
 {activeMode==="signin"&&<button className="text-btn forgot-link" type="button" onClick={()=>switchMode("forgot")}>Forgot password?</button>}
 {message&&<p role="status" className={`notice ${isError?"error":""}`}>{message}</p>}
 <button className="btn primary full" type="submit">{busy?<><LoaderCircle className="spin" size={18}/>Please wait…</>:<>{activeMode==="signin"?"Sign in":activeMode==="signup"?"Create account":activeMode==="forgot"?"Send reset link":"Save new password"}<ArrowRight size={18}/></>}</button>
 </fieldset></form>
 {activeMode==="forgot"&&<button className="text-btn full" onClick={()=>switchMode("signin")}>Back to sign in</button>}
 </AuthShell>;
}
function VaultSession({user}:{user:User}){
 const [row,setRow]=useState<VaultRow|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(""),[passphrase,setPassphrase]=useState(""),[confirmation,setConfirmation]=useState(""),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[unlocked,setUnlocked]=useState<{key:CryptoKey;vault:Vault}|null>(null);
 const epoch=useRef(0);const busyRef=useRef(false);
 const lock=useCallback(()=>{epoch.current++;setUnlocked(null);setPassphrase("");setConfirmation("");setError("");setBusy(false);busyRef.current=false;},[]);
 const autoLock=useRef<ReturnType<typeof createAutoLock>|null>(null);
 if(!autoLock.current)autoLock.current=createAutoLock(lock);
 const load=useCallback(async()=>{setError("");setLoaded(false);const current=epoch.current;try{const latest=await readVault(user.id);if(current===epoch.current){setRow(latest);setLoaded(true);}}catch(e){if(current===epoch.current)setError(errorText(e));}},[user.id]);
 useEffect(()=>{void load();return()=>{epoch.current++;};},[load]);
 useEffect(()=>{
  const activity=(event:Event)=>{if(autoLock.current!.activity()){event.preventDefault();event.stopImmediatePropagation();}};
  const leave=()=>autoLock.current!.leave();
  const resume=()=>{if(document.hidden)return;autoLock.current!.resume();if(!loaded)void load();};
  const visibility=()=>{if(document.hidden)leave();else resume();};
  const timer=setInterval(()=>autoLock.current!.check(),1000);
  window.addEventListener("pointerdown",activity,true);window.addEventListener("keydown",activity,true);window.addEventListener("click",activity,true);document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",leave);window.addEventListener("pageshow",resume);
  return()=>{clearInterval(timer);window.removeEventListener("pointerdown",activity,true);window.removeEventListener("keydown",activity,true);window.removeEventListener("click",activity,true);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",leave);window.removeEventListener("pageshow",resume);};
 },[lock,loaded,load]);
 async function unlock(e:React.FormEvent){e.preventDefault();if(busyRef.current)return;busyRef.current=true;setBusy(true);setError("");const current=epoch.current;const phrase=passphrase;setPassphrase("");setConfirmation("");
  try{
   if(!row&&(phrase.length<16||phrase!==confirmation||!ack))throw new Error("Use at least 16 characters, confirm the passphrase, and acknowledge the recovery notice.");
   const latest=await readVault(user.id);
   if(current!==epoch.current)return;
   if(!row&&latest){setRow(latest);throw new Error("Your vault already exists. Enter its passphrase to unlock it.");}
   if(row&&!latest)throw new Error("Your vault could not be found. Sign out and try again.");
   const salt=latest?.salt??newSalt();const key=await deriveKey(phrase,salt);
   if(current!==epoch.current||document.hidden)return;
   let vault:Vault={version:1,entries:[]};
   if(latest){try{vault=await unseal(latest,key,user.id);}catch{throw new Error("That passphrase did not unlock the vault, or the vault data is damaged. Please try again.");}}
   const saved=latest??await createVault(user.id,salt,await seal(vault,key,user.id));
   if(current!==epoch.current||document.hidden)return;
   setRow(saved);setUnlocked({key,vault});autoLock.current!.reset();
  }catch(e){if(current===epoch.current)setError(errorText(e));}finally{if(current===epoch.current){setBusy(false);busyRef.current=false;}}
 }
 if(unlocked&&row)return <VaultWorkbench key={epoch.current} initialVault={unlocked.vault} cryptoKey={unlocked.key} initialRow={row} email={user.email??"Your account"} onLock={lock}/>;
 return <AuthShell><span className="gate-icon"><LockKeyhole size={28}/></span><span className="section-kicker">{loaded?(row?"WELCOME BACK":"CREATE YOUR VAULT"):"CONNECTING TO YOUR VAULT"}</span><h2>{loaded?(row?"Your vault is locked.":"Your vault. Your key."):"One moment…"}</h2><p className="muted intro account-email">{user.email}</p>
 {loaded?<form className="form-stack" onSubmit={unlock}><fieldset disabled={busy} className="form-stack"><p className="muted small">{row?"Enter your vault passphrase to access your passwords.":"Choose a separate passphrase to encrypt your vault. Use something long and different from your account password."}</p><PasswordInput label="Vault passphrase" value={passphrase} onChange={setPassphrase} autoComplete="off" minLength={row?undefined:16} placeholder={row?"Enter your vault passphrase":"At least 16 characters"}/>{!row&&<><PasswordInput label="Confirm vault passphrase" value={confirmation} onChange={setConfirmation} autoComplete="off" placeholder="Enter it once more"/><div className="check-line"><Checkbox id="recovery-ack" checked={ack} onCheckedChange={v=>setAck(v===true)}/><label htmlFor="recovery-ack">I’ve saved this passphrase somewhere safe. If I lose it, my vault cannot be recovered.</label></div></>}{error&&<p className="notice error" role="alert">{error}</p>}<button className="btn primary full" type="submit">{busy?<LoaderCircle className="spin" size={18}/>:<LockKeyhole size={18}/>} {busy?"Opening your vault…":row?"Unlock vault":"Create my vault"}</button></fieldset></form>:error?<><p className="notice error" role="alert">{error}</p><button className="btn full" onClick={()=>void load()}>Try again</button></>:<LoaderCircle className="spin"/>}
 <button className="text-btn full demo-link" onClick={()=>{lock();void supabase.auth.signOut({scope:"local"});}}><LogOut size={15}/> Sign out</button><p className="small muted center">Your vault locks after 5 minutes away or 5 minutes of inactivity.</p></AuthShell>;
}
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[recovery,setRecovery]=useState(false);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{setUser(session?.user??null);setReady(true);if(event==="PASSWORD_RECOVERY")setRecovery(true);if(event==="SIGNED_OUT")setRecovery(false);});
  return()=>subscription.unsubscribe();
 },[]);
 return <>{!ready?<AuthShell><h2>Pöhner Passwords</h2><p className="muted intro">Opening your app…</p><LoaderCircle className="spin"/></AuthShell>:recovery?<AuthForm recovery onRecovered={()=>{setRecovery(false);history.replaceState(null,"",appHomeUrl());}}/>:user?<VaultSession key={user.id} user={user}/>:<AuthForm recovery={false} onRecovered={()=>{}}/>}<Toaster position="top-center"/></>;
}




