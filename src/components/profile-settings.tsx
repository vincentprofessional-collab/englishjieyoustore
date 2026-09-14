"use client";

import { VocabularyAutoplaySettings } from "@/components/vocabulary-autoplay-settings";

export function ProfileSettings() {
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
        <section className="profile-settings-card profile-autoplay-card" aria-label="自动发音">
          <VocabularyAutoplaySettings />
        </section>
      </div>
    </section>
  );
}
