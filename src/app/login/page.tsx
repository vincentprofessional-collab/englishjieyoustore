"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getAuthErrorFeedback, reportAuthFailure } from "@/lib/supabase/auth-request";

type AuthMode = "login" | "register";

const AUTH_REDIRECT_URL = "https://www.englishjieyou.cn/login";

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
  const [showConfirmationResend, setShowConfirmationResend] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordRecoveryActive, setPasswordRecoveryActive] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const authRequestPending = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "PASSWORD_RECOVERY") return;
      setAuthMode("login");
      setShowForgotPassword(false);
      setPasswordRecoveryActive(true);
      setMessage("请设置新密码。");
    });

    const recoveryError = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_code");
    if (recoveryError) {
      setShowForgotPassword(true);
      setMessage("重置链接已失效或过期，请重新申请密码重置。");
    }

    return () => subscription.unsubscribe();
  }, []);

  function switchMode(nextMode: AuthMode) {
    if (authRequestPending.current) return;
    setAuthMode(nextMode);
    setShowForgotPassword(false);
    setPasswordRecoveryActive(false);
    setMessage("");
    setShowConfirmationResend(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestPending.current) return;
    authRequestPending.current = true;
    const startedAt = Date.now();
    setIsLoading(true);
    setMessage("");
    setShowConfirmationResend(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginAccount.trim(),
        password: loginPassword,
      });

      if (error) throw error;

      const redirectPath = getSafeRedirectPath();

      if (redirectPath) {
        window.location.assign(redirectPath);
        return;
      }

      setMessage("登录成功。");
    } catch (error) {
      const feedback = getAuthErrorFeedback(error);
      setMessage(`登录失败：${feedback.message}`);
      setShowConfirmationResend(feedback.kind === "unconfirmed");
      reportAuthFailure("login", error, startedAt);
    } finally {
      authRequestPending.current = false;
      setIsLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestPending.current) return;
    authRequestPending.current = true;
    const startedAt = Date.now();
    setIsLoading(true);
    setMessage("");

    try {
      if (registerPassword.length < 6) {
        setMessage("密码至少需要 6 位。");
        return;
      }

      const nickname = registerNickname.replace(/\s+/g, " ").trim();
      if (!nickname) {
        setMessage("请先填写昵称。");
        return;
      }
      if (registerPassword !== registerPasswordConfirm) {
        setMessage("两次输入的密码不一致。");
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
      if (error) throw error;

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
          : "注册已提交。请先到邮箱里点击确认链接，再返回登录。"),
      );
      setRegisterPassword("");
      setRegisterPasswordConfirm("");
    } catch (error) {
      setMessage(`注册失败：${getAuthErrorFeedback(error).message}`);
      reportAuthFailure("registration", error, startedAt);
    } finally {
      authRequestPending.current = false;
      setIsLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (authRequestPending.current) return;
    const email = (authMode === "login" ? loginAccount : registerEmail).trim();
    if (!email) {
      setMessage("请先填写邮箱，再重新发送确认邮件。");
      return;
    }

    authRequestPending.current = true;
    const startedAt = Date.now();
    setIsLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        email,
        options: { emailRedirectTo: getAuthRedirectUrl() },
        type: "signup",
      });
      if (error) throw error;
      setShowConfirmationResend(false);
      setMessage("确认邮件已重新发送。请检查收件箱、垃圾邮件或推广邮件，点击确认链接后再登录。");
    } catch (error) {
      setMessage(`发送失败：${getAuthErrorFeedback(error).message}`);
      reportAuthFailure("confirmation-email", error, startedAt);
    } finally {
      authRequestPending.current = false;
      setIsLoading(false);
    }
  }

  async function handleRequestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestPending.current) return;
    const email = resetEmail.trim();
    if (!email) {
      setMessage("请填写注册邮箱。");
      return;
    }

    authRequestPending.current = true;
    const startedAt = Date.now();
    setIsLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: AUTH_REDIRECT_URL });
      if (error) throw error;
      setShowForgotPassword(false);
      setMessage("如果该邮箱已注册，密码重置链接已发送。请检查收件箱和垃圾邮件，点击邮件链接后在此页设置新密码。");
    } catch (error) {
      setMessage(`发送失败：${getAuthErrorFeedback(error).message}`);
      reportAuthFailure("password-reset-request", error, startedAt);
    } finally {
      authRequestPending.current = false;
      setIsLoading(false);
    }
  }

  async function handleSetNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestPending.current) return;
    if (newPassword.length < 6) {
      setMessage("新密码至少需要 6 位。");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setMessage("两次输入的密码不一致。");
      return;
    }

    authRequestPending.current = true;
    const startedAt = Date.now();
    setIsLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordRecoveryActive(false);
      setNewPassword("");
      setNewPasswordConfirm("");
      setMessage("密码已更新，当前账号已登录。");
    } catch (error) {
      setMessage(`密码更新失败：${getAuthErrorFeedback(error).message}`);
      reportAuthFailure("password-reset-update", error, startedAt);
    } finally {
      authRequestPending.current = false;
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <aside className="auth-panel">
        {!passwordRecoveryActive && !showForgotPassword ? (
          <div className="auth-mode-tabs" role="tablist" aria-label="登录注册">
            <button
              className={authMode === "login" ? "active" : ""}
              disabled={isLoading}
              type="button"
              onClick={() => switchMode("login")}
            >
              登录
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              disabled={isLoading}
              type="button"
              onClick={() => switchMode("register")}
            >
              注册
            </button>
          </div>
        ) : null}

        {passwordRecoveryActive ? (
          <form className="auth-form" onSubmit={handleSetNewPassword}>
            <h2>设置新密码</h2>
            <label>
              <span>新密码</span>
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </label>
            <label>
              <span>确认新密码</span>
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                required
                type="password"
                value={newPasswordConfirm}
              />
            </label>
            <button className="button primary" disabled={isLoading} type="submit">
              {isLoading ? "更新中…" : "更新密码"}
            </button>
          </form>
        ) : showForgotPassword ? (
          <form className="auth-form" onSubmit={handleRequestPasswordReset}>
            <h2>重置密码</h2>
            <p>填写注册邮箱，我们会发送密码重置链接。</p>
            <label>
              <span>邮箱</span>
              <input
                autoComplete="email"
                onChange={(event) => setResetEmail(event.target.value)}
                required
                type="email"
                value={resetEmail}
              />
            </label>
            <button className="button primary" disabled={isLoading} type="submit">
              {isLoading ? "发送中…" : "发送重置邮件"}
            </button>
            <button className="auth-text-button" disabled={isLoading} type="button" onClick={() => { setShowForgotPassword(false); setMessage(""); }}>
              返回登录
            </button>
          </form>
        ) : authMode === "login" ? (
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
            <button className="auth-text-button" disabled={isLoading} type="button" onClick={() => { setResetEmail(loginAccount.trim()); setShowForgotPassword(true); setMessage(""); }}>
              忘记密码？
            </button>
            {showConfirmationResend ? (
              <button className="auth-text-button" disabled={isLoading} type="button" onClick={handleResendConfirmation}>
                重新发送确认邮件
              </button>
            ) : null}
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
          <p role="status" aria-live="polite" className={`auth-message ${message.includes("失败") ? "error" : ""}`}>{message}</p>
        ) : null}
      </aside>
    </section>
  );
}
