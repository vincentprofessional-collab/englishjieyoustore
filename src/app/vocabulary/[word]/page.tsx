import { VocabularyLookupEntry } from "@/components/vocabulary-lookup-entry";
import { VocabularySearchAutocomplete } from "@/components/vocabulary-search-autocomplete";

export const dynamic = "force-dynamic";

export default async function VocabularyWordPage({
  params,
  searchParams,
}: {
  params: Promise<{ word: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { word } = await params;
  const query = searchParams ? await searchParams : {};
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  let backHref = "/vocabulary";
  if (requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")) {
    const returnUrl = new URL(requestedReturnTo, "https://local.invalid");
    const isAllowedPath = returnUrl.pathname === "/vocabulary/books"
      || /^\/(?:articles|new-concept)\/[A-Za-z0-9_-]+$/.test(returnUrl.pathname);
    if (returnUrl.origin === "https://local.invalid" && isAllowedPath) {
      backHref = `${returnUrl.pathname}${returnUrl.search}`;
    }
  }
  return <section className="stack vocabulary-page vocabulary-lookup-landing">
    <div className="vocabulary-hero"><VocabularySearchAutocomplete initialQuery="" autoFocus={false} /></div>
    <VocabularyLookupEntry word={word} backHref={backHref} />
  </section>;
}
