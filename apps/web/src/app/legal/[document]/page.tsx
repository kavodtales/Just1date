import Link from "next/link";
import { legalDocuments as documents } from "@just1date/config";
export default async function Page({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const d = documents[(await params).document];
  return (
    <main className="legal-page">
      <Link className="wordmark" href="/discover">
        JUST<span>1</span>DATE<i>✦</i>
      </Link>
      <p className="legal-review">
        LEGAL REVIEW REQUIRED — NOT FINAL LAUNCH DOCUMENTS
      </p>
      <h1>{d?.title ?? "Document unavailable"}</h1>
      {d?.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <nav aria-label="Legal documents">
        {Object.entries(documents).map(([k, v]) => (
          <Link key={k} href={`/legal/${k}`}>
            {v.title.replace(" — draft", "")}
          </Link>
        ))}
      </nav>
    </main>
  );
}
