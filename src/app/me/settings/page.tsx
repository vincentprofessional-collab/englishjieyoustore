import type { Metadata } from "next";
import { ProfileSettings } from "@/components/profile-settings";

export const metadata: Metadata = {
  title: "个人设置 | 英文解忧杂货铺",
};

export default function PersonalSettingsPage() {
  return <ProfileSettings />;
}
