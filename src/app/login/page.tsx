"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkExistingAdminSession() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted) {
        setIsAdmin(!profileError && profile?.role === "admin");
      }
    }

    void checkExistingAdminSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsAdmin(false);
    } else {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const nextIsAdmin = !profileError && profile?.role === "admin";

      setIsAdmin(nextIsAdmin);
      setMessage(nextIsAdmin ? "登录成功，可以进入内容后台。" : "登录成功。");
    }

    setIsLoading(false);
  }

  return (
    <section className="hero">
      <div className="hero-card">
        <div className="eyebrow">Auth</div>
        <h1>登录学习账号。</h1>
        <p className="lead">
          登录后会显示该账号可用的功能入口。
        </p>
      </div>

      <aside className="panel">
        <h2>邮箱登录</h2>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <button className="button primary" disabled={isLoading} type="submit">
            {isLoading ? "登录中..." : "登录"}
          </button>
          {isAdmin ? (
            <Link className="button secondary" href="/admin">
              进入内容后台
            </Link>
          ) : null}
          {message ? <p className="lead">{message}</p> : null}
        </form>
      </aside>
    </section>
  );
}
