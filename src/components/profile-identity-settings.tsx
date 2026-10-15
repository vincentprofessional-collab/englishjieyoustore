"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export function ProfileIdentitySettings() {
  const [loaded, setLoaded] = useState(false);
  const [identityOwnerId, setIdentityOwnerId] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return;
        const profile = await supabase.from("profiles").select("display_name,avatar_url").eq("id", data.user.id).maybeSingle();
        if (!active) return;
        if (profile.error) throw new Error("个人资料暂时无法读取，请刷新重试。");
        const name = String(profile.data?.display_name ?? data.user.user_metadata?.display_name ?? "");
        setSignedIn(true); setIdentityOwnerId(data.user.id); setDisplayName(name); setSavedName(name);
        setAvatarUrl(String(profile.data?.avatar_url ?? data.user.user_metadata?.avatar_url ?? ""));
      } catch (cause) { if (active) { setError(true); setMessage(cause instanceof Error ? cause.message : "个人资料暂时无法读取。"); } }
      finally { if (active) setLoaded(true); }
    }
    void load();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const name = displayName.trim();
    if (!name || name.length > 30) { setError(true); setMessage("昵称请填写 1–30 个字符。"); return; }
    setBusy(true); setError(false); setMessage("");
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error("请重新登录后保存。");
      if (data.session.user.id !== identityOwnerId) throw new Error("账号已切换，请刷新个人设置后再修改资料。");
      const payload = new FormData(); payload.set("displayName", name); if (file) payload.set("file", file);
      const response = await fetch("/api/profile-avatar-upload", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` }, body: payload });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "个人资料保存失败，请稍后重试。");
      setDisplayName(result.displayName ?? name); setSavedName(result.displayName ?? name);
      if (result.avatarUrl) setAvatarUrl(result.avatarUrl);
      setFile(null); setMessage(result.notice || "昵称和头像已保存，各设备登录后均可使用。");
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "个人资料保存失败。"); }
    finally { setBusy(false); }
  }
  const picture = previewUrl || avatarUrl;
  return <section className="profile-settings-card profile-identity-card" aria-label="昵称和头像">
    <div><span>个人资料</span><h2>昵称和头像</h2></div>
    {!loaded ? <p aria-live="polite">正在读取个人资料…</p> : signedIn ? <form onSubmit={save}>
      <div className="profile-identity-avatar">
        {picture ? <img alt="头像预览" src={picture} /> : <span aria-label="默认头像">{displayName.trim().slice(0, 1) || "我"}</span>}
        <label><span>更换头像</span><input accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={event => {
          const chosen = event.target.files?.[0]; event.target.value = "";
          if (!chosen) return;
          if (!chosen.type.startsWith("image/") || chosen.size > 2 * 1024 * 1024) { setError(true); setMessage("请选择 2 MB 以内的图片。"); return; }
          setFile(chosen); setMessage("");
        }} type="file" /><small>JPG、PNG、WebP 或 GIF，2 MB 以内</small></label>
      </div>
      <label className="profile-identity-name"><span>昵称</span><input autoComplete="nickname" disabled={busy} maxLength={30} onChange={event => setDisplayName(event.target.value)} required value={displayName} /></label>
      <div className="profile-identity-actions"><button className="button primary" disabled={busy || !displayName.trim() || (displayName.trim() === savedName && !file)} type="submit">{busy ? "保存中…" : "保存昵称和头像"}</button></div>
    </form> : !error ? <p>登录后可以修改昵称和头像。<Link href="/login?redirect=%2Fme%2Fsettings">登录 / 注册</Link></p> : null}
    {message ? <p aria-live="polite" className={`profile-identity-message ${error ? "is-error" : ""}`}>{message}</p> : null}
  </section>;
}
