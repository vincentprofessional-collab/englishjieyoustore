import { NextResponse } from "next/server";
import { getReadingTest } from "@/lib/ielts/reading";

export async function GET(_request: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const test = getReadingTest(testId);
  if (!test) return NextResponse.json({ error: "IELTS reading test not found." }, { status: 404 });
  return NextResponse.json(test, { headers: { "Cache-Control": "no-store" } });
}
