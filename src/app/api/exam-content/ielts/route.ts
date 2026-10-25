import { NextResponse } from "next/server";
import { READING_TESTS } from "@/lib/ielts/reading";

export function GET() {
  const entries = READING_TESTS.map((test) => ({
    id: test.id,
    title: test.title,
    bookCode: test.bookCode,
    bookTitle: test.bookTitle,
    testNo: test.testNo,
    displayTestNo: test.displayTestNo,
  }));
  return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
}
