import { NextResponse } from "next/server";
export async function POST() {
  // Reviewed question payloads are the sole public answer source. The legacy
  // endpoint must never expose uncleaned document extracts.
  return NextResponse.json({ error: "请在对应试题页面提交作答后查看答案与解析。" }, { status: 410 });
}
