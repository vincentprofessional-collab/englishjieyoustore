import { Suspense } from "react";
import { JuniorHighDemo } from "@/components/junior-high/junior-high-demo";

export default function JuniorHighPage() {
  return <Suspense fallback={null}><JuniorHighDemo /></Suspense>;
}
