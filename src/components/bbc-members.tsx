"use client";

import { useEffect, useState } from "react";
import type { PublicBbcMember } from "@/lib/payment/granted-members";
type MemberPage = { total: number; page: number; pageSize: number; members: PublicBbcMember[] };

export function BbcMembers() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<MemberPage | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { setError("会员记录读取超时，请重试。"); controller.abort(); }, 15000);
    setError(""); setData(null);
    void fetch(`/api/bbc-members?page=${page}`, { signal: controller.signal }).then(async response => {
      const value = await response.json();
      if (!response.ok || !Array.isArray(value.members)) throw new Error("unavailable");
      if (!controller.signal.aborted) setData(value);
    }).catch(() => { if (!controller.signal.aborted) setError("会员记录暂时无法读取。"); })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [page, retry]);
  return <section aria-label="BBC 已开通会员" className="bbc-member-roster">
    <h3>{data ? <>已有 <strong>{data.total}</strong> 位 BBC 会员</> : "BBC 已开通会员"}</h3>
    {error ? <p role="status">{error} <button onClick={() => setRetry(value => value + 1)} type="button">重试</button></p> : !data ? <p role="status">正在读取会员人数……</p> : <>
      {data.total ? <table><thead><tr><th scope="col">用户</th><th scope="col">会员类型</th><th scope="col">开通日期</th></tr></thead>
        <tbody>{data.members.map((member, index) => <tr key={`${data.page}-${index}`}><td>{member.maskedAccount}</td><td>{member.plan}</td><td><time dateTime={member.startedAt}>{member.startedAt}</time></td></tr>)}</tbody>
      </table> : <p>目前还没有已确认的会员记录。</p>}
      {data.total > data.pageSize ? <nav aria-label="会员列表翻页"><button disabled={page === 0} onClick={() => setPage(value => value - 1)} type="button">上一页</button><span>{page + 1} / {Math.ceil(data.total / data.pageSize)}</span><button disabled={(page + 1) * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)} type="button">下一页</button></nav> : null}
    </>}
  </section>;
}
