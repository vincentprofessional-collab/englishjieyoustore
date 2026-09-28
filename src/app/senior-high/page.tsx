import { Suspense } from "react";
import { SeniorHighLibrary } from "@/components/senior-high/senior-high-library";

export default function SeniorHighPage() {
  return <Suspense fallback={null}><SeniorHighLibrary /></Suspense>;
}
