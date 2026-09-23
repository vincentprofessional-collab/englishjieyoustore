"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

const AUTH_REDIRECT_URL = "https://www.englishjieyou.cn/login";
const SESSION_ID_KEY = "ielts-platform.analytics.sessionId";
const SESSION_STARTED_KEY = "ielts-platform.analytics.startedAt";
const SESSION_FIRST_PATH_KEY = "ielts-platform.analytics.firstPath";

function getSafeRedirectPath() {
  const searchParams = new URLSearchParams(window.location.search);
  const redirect = searchParams.get("redirect");

  if (!redirect?.startsWith("/") || redirect.startsWith("//")) {
    return "";
  }

  return redirect;
}

function getAuthRedirectUrl() {
  const redirectPath = getSafeRedirectPath();

  if (!redirectPath) {
    return AUTH_REDIRECT_URL;
  }

  return `${window.location.origin}/login?redirect=${encodeURIComponent(redirectPath)}`;
}

function getSessionId() {
  const existingId = window.sessionStorage.getItem(SESSION_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.sessionStorage.setItem(SESSION_ID_KEY, nextId);
  window.sessionStorage.setItem(SESSION_STARTED_KEY, new Date().toISOString());
  return nextId;
}

function getStartedAt() {
  const value = window.sessionStorage.getItem(SESSION_STARTED_KEY);

  if (value) {
    return value;
  }

  const nextValue = new Date().toISOString();
  window.sessionStorage.setItem(SESSION_STARTED_KEY, nextValue);
  return nextValue;
}

function getFirstPath(path: string) {
  const existingPath = window.sessionStorage.getItem(SESSION_FIRST_PATH_KEY);

  if (existingPath) {
    return existingPath;
  }

  window.sessionStorage.setItem(SESSION_FIRST_PATH_KEY, path);
  return path;
}

function getDurationSeconds(startedAt: string) {
  return Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
}

async function recordAuthEvent(eventType: "login" | "registration") {
  try {
    const startedAt = getStartedAt();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    await fetch("/api/site-activity", {
      body: JSON.stringify({
        durationSeconds: getDurationSeconds(startedAt),
        eventType,
        firstPath: getFirstPath("/login"),
        pageTitle: document.title,
        path: "/login",
        referrer: document.referrer || null,
        sessionId: getSessionId(),
        startedAt,
      }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // 统计失败不能影响登录或注册。
  }
}

async function uploadProfileAvatar(file: File, accessToken: string) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/profile-avatar-upload", {
    body: formData,
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as { avatarUrl?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error || "头像上传失败");
  }

  return payload?.avatarUrl ?? "";
}

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginAccount, setLoginAccount] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerNickname, setRegisterNickname] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [registerAvatarFile, setRegisterAvatarFile] = useState<File | null>(null);
  const [registerAvatarPreview, setRegisterAvatarPreview] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setMessage("");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginAccount.trim(),
      password: loginPassword,
    });

    if (error) {
      setMessage(`登录失败：${error.message}`);
      setIsLoading(false);
      return;
    }

    await recordAuthEvent("login");

    const redirectPath = getSafeRedirectPath();

    if (redirectPath) {
      window.location.assign(redirectPath);
      return;
    }

    setMessage("登录成功。");
    setIsLoading(false);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    if (registerPassword.length < 6) {
      setMessage("密码至少需要 6 位。");
      setIsLoading(false);
      return;
    }

    const nickname = registerNickname.replace(/\s+/g, " ").trim();

    if (!nickname) {
      setMessage("请先填写昵称。 ");
      setIsLoading(false);
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      setMessage("两次输入的密码不一致。");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: registerEmail.trim(),
      options: {
        data: { display_name: nickname },
        emailRedirectTo: getAuthRedirectUrl(),
      },
      password: registerPassword,
    });

    if (error) {
      setMessage(`注册失败：${error.message}`);
      setIsLoading(false);
      return;
    }

    if (data.user && data.session) {
      await recordAuthEvent("registration");
    }

    let avatarMessage = "";

    if (data.session && registerAvatarFile) {
      try {
        await uploadProfileAvatar(registerAvatarFile, data.session.access_token);
      } catch (avatarError) {
        avatarMessage = `头像上传失败：${avatarError instanceof Error ? avatarError.message : "请登录后重试"}`;
      }
    }

    if (data.session) {
      const redirectPath = getSafeRedirectPath();

      if (redirectPath) {
        window.location.assign(redirectPath);
        return;
      }
    }

    setMessage(
      avatarMessage || (data.session
        ? "注册成功，已自动登录。"
        : "注册已提交。若系统开启邮箱确认，请先到邮箱里点击确认链接。"),
    );
    setRegisterPassword("");
    setRegisterPasswordConfirm("");
    setIsLoading(false);
  }

  async function handleResendConfirmation() {
    const email = registerEmail.trim();

    if (!email) {
      setMessage("请先填写邮箱，再重新发送确认邮件。");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resend({
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
      type: "signup",
    });

    if (error) {
      setMessage(`发送失败：${error.message}`);
    } else {
      setMessage("确认邮件已重新发送。请检查收件箱、垃圾邮件或推广邮件。");
    }

    setIsLoading(false);
  }

  return (
    <section className="auth-page">
      <aside className="auth-panel">
        <div className="auth-mode-tabs" role="tablist" aria-label="登录注册">
          <button
            className={authMode === "login" ? "active" : ""}
            type="button"
            onClick={() => switchMode("login")}
          >
            登录
          </button>
          <button
            className={authMode === "register" ? "active" : ""}
            type="button"
            onClick={() => switchMode("register")}
          >
            注册
          </button>
        </div>

        {authMode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2>账号登录</h2>
            <label>
              <span>邮箱</span>
              <input
                autoComplete="email"
                onChange={(event) => setLoginAccount(event.target.value)}
                required
                type="email"
                value={loginAccount}
              />
            </label>
            <label>
              <span>密码</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setLoginPassword(event.target.value)}
                required
                type="password"
                value={loginPassword}
              />
            </label>
            <button className="button primary" disabled={isLoading} type="submit">
              {isLoading ? "登录中…" : "登录"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2>注册账号</h2>
            <label>
              <span>昵称</span>
              <input
                autoComplete="nickname"
                maxLength={24}
                onChange={(event) => setRegisterNickname(event.target.value)}
                required
                value={registerNickname}
              />
            </label>
            <label>
              <span>邮箱</span>
              <input
                autoComplete="email"
                onChange={(event) => setRegisterEmail(event.target.value)}
                required
                type="email"
                value={registerEmail}
              />
            </label>
            <label className="auth-avatar-field">
              <span>头像（可选）</span>
              <input
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setRegisterAvatarFile(file);
                  setRegisterAvatarPreview(file ? URL.createObjectURL(file) : "");
                }}
                type="file"
              />
              {registerAvatarPreview ? (
                // The selected local file is only a registration preview.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="头像预览" src={registerAvatarPreview} />
              ) : null}
            </label>
            <label>
              <span>密码</span>
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setRegisterPassword(event.target.value)}
                required
                type="password"
                value={registerPassword}
              />
            </label>
            <label>
              <span>确认密码</span>
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                required
                type="password"
                value={registerPasswordConfirm}
              />
            </label>
            <button className="button primary" disabled={isLoading} type="submit">
              {isLoading ? "注册中…" : "注册"}
            </button>
            <button
              className="auth-text-button"
              disabled={isLoading}
              type="button"
              onClick={handleResendConfirmation}
            >
              没收到邮件？重新发送确认邮件
            </button>
          </form>
        )}

        {message ? (
          <p className={`auth-message ${message.includes("失败") ? "error" : ""}`}>{message}</p>
        ) : null}
      </aside>
    </section>
  );
}
