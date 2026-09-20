import { NextResponse } from "next/server";
import { getCet4Entry } from "@/lib/cet4/library";

export async function POST(request: Request) {
  const entryId = new URL(request.url).searchParams.get("entryId") || "";
  const entry = getCet4Entry(entryId);
  if (!entry || entry.section === "知识点") return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ answers: entry.answers });
}
