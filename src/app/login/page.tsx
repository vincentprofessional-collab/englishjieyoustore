"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("登录成功。");
    }

    setIsLoading(false);
  }

  return (
    <section className="hero">
      <div className="hero-card">
        <div className="eyebrow">Auth</div>
        <h1>登录后台与学习记录。</h1>
        <p className="lead">
          这里先放邮箱密码登录入口。后面我们再补注册、管理员入口和会员状态展示。
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
          {message ? <p className="lead">{message}</p> : null}
        </form>
      </aside>
    </section>
  );
}
