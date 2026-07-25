"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VocabularyAutoplaySettings } from "@/components/vocabulary-autoplay-settings";

type ProfileState = {
  avatarDataUrl: string;
  nickname: string;
};

const PROFILE_STORAGE_KEY = "ielts-platform.profile";
const defaultProfile: ProfileState = {
  avatarDataUrl: "",
  nickname: "英语学习者",
};

function readProfile(): ProfileState {
  if (typeof window === "undefined") {
    return defaultProfile;
  }

  try {
    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!savedProfile) {
      return defaultProfile;
    }

    return { ...defaultProfile, ...JSON.parse(savedProfile) };
  } catch {
    return defaultProfile;
  }
}

export function ProfileSettings() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [nicknameDraft, setNicknameDraft] = useState(defaultProfile.nickname);
  const [status, setStatus] = useState("");
  const initials = useMemo(() => {
    const firstCharacter = nicknameDraft.trim().slice(0, 1);
    return firstCharacter || "英";
  }, [nicknameDraft]);

  useEffect(() => {
    const savedProfile = readProfile();
    setProfile(savedProfile);
    setNicknameDraft(savedProfile.nickname);
  }, []);

  function persistProfile(nextProfile: ProfileState, message: string) {
    setProfile(nextProfile);
    setNicknameDraft(nextProfile.nickname);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setStatus(message);
    window.setTimeout(() => setStatus(""), 1800);
  }

  function saveNickname() {
    const normalizedNickname = nicknameDraft.replace(/\s+/g, " ").trim() || defaultProfile.nickname;
    persistProfile({ ...profile, nickname: normalizedNickname }, "昵称已保存");
  }

  function removeAvatar() {
    persistProfile({ ...profile, avatarDataUrl: "" }, "头像已移除");
  }

  function handleAvatarUpload(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("请选择图片文件");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatus("图片请控制在 2MB 内");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setStatus("头像读取失败");
        return;
      }

      persistProfile({ ...profile, avatarDataUrl: reader.result }, "头像已保存");
    };
    reader.onerror = () => setStatus("头像读取失败");
    reader.readAsDataURL(file);
  }

  return (
    <section className="profile-settings-page stack" aria-label="个人设置">
      <div className="profile-settings-head">
        <a className="back-link" href="/me/favorites">
          ← 返回
        </a>
        <div>
          <span>MY SETTINGS</span>
          <h1>个人设置</h1>
        </div>
      </div>

      <div className="profile-settings-grid">
        <section className="profile-settings-card profile-identity-card" aria-label="头像与昵称">
          <div className="profile-avatar-preview" aria-label="当前头像">
            {profile.avatarDataUrl ? <img alt="" src={profile.avatarDataUrl} /> : <span>{initials}</span>}
          </div>
          <div className="profile-field-group">
            <label htmlFor="profile-nickname">昵称</label>
            <div className="profile-inline-control">
              <input
                id="profile-nickname"
                maxLength={24}
                onChange={(event) => setNicknameDraft(event.target.value)}
                value={nicknameDraft}
              />
              <button className="button primary" onClick={saveNickname} type="button">
                保存
              </button>
            </div>
          </div>
          <div className="profile-avatar-actions">
            <input
              accept="image/*"
              className="profile-avatar-input"
              onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
              ref={fileInputRef}
              type="file"
            />
            <button className="button ghost" onClick={() => fileInputRef.current?.click()} type="button">
              上传头像
            </button>
            <button className="button subtle" disabled={!profile.avatarDataUrl} onClick={removeAvatar} type="button">
              移除头像
            </button>
          </div>
          {status ? <p className="profile-settings-status">{status}</p> : null}
        </section>

        <section className="profile-settings-card" aria-label="自动发音">
          <VocabularyAutoplaySettings />
        </section>
      </div>
    </section>
  );
}
