"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { appImageSlots, type AppImage } from "@just1date/config";
import { api, json, ClientError } from "../../../web/src/lib/client";
import { QueryState } from "../../../web/src/components/query-state";

function ImageEditor({ row }: { row: AppImage }) {
  const config = appImageSlots.find((s) => s.slot === row.slot)!;
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [alt, setAlt] = useState(row.alt_text || config.alt),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reset, setReset] = useState(false),
    [conflict, setConflict] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const expectedRevision = useRef(row.revision);
  const client = useQueryClient();
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function publish(restore = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!restore && !file)
        throw new Error("Choose a photo to preview first.");
      await api(
        `admin/app-media/${row.slot}${restore ? "/reset" : `?revision=${expectedRevision.current}&alt=${encodeURIComponent(alt.trim())}`}`,
        restore
          ? {
              method: "POST",
              body: json({ revision: expectedRevision.current }),
            }
          : {
              method: "POST",
              headers: { "Content-Type": file!.type },
              body: file!,
            },
      );
      setFile(null);
      if (input.current) input.current.value = "";
      setReset(false);
      setMessage(
        restore
          ? "Original photo restored."
          : "Published. The website and updated mobile app will load this photo.",
      );
      await client.invalidateQueries({ queryKey: ["admin-app-media"] });
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ClientError && e.status === 409) setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="app-image-card">
      <div className="app-image-preview">
        <img
          src={preview || row.url || config.fallback}
          alt={preview ? alt : row.alt_text || config.alt}
        />
        <span>
          {preview
            ? "Unpublished preview"
            : row.url
              ? "Published photo"
              : "Original photo"}
        </span>
      </div>
      <div className="app-image-controls">
        <h3>{config.title}</h3>
        <p>
          This is a photo only. The heading, copy, slide dots and buttons are
          rendered by the app.
        </p>
        <label>
          Choose replacement photo
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || conflict}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              setError("");
              setMessage("");
              setReset(false);
              if (!selected) {
                setFile(null);
                return;
              }
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  selected.type,
                ) ||
                selected.size > 4 * 1024 * 1024
              ) {
                setError("Choose a JPEG, PNG or WebP photo up to 4 MB.");
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(selected);
              expectedRevision.current = row.revision;
            }}
          />
        </label>
        <label>
          Photo description
          <input
            value={alt}
            maxLength={180}
            minLength={3}
            disabled={busy || conflict}
            onChange={(e) => setAlt(e.target.value)}
          />
        </label>
        <small>
          Use a portrait photo, at least 400 × 400 px, without captions or app
          controls. Only publish photos you have permission to use. Member
          profiles and match photos are managed by their owners.
        </small>
        <div className="app-image-actions">
          <button
            className="button"
            disabled={!file || busy || conflict || alt.trim().length < 3}
            onClick={() => publish()}
          >
            {busy ? "Please wait…" : "Publish photo"}
          </button>
          {file && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setFile(null);
                if (input.current) input.current.value = "";
              }}
            >
              Discard preview
            </button>
          )}
          {row.url && !reset && (
            <button
              className="text-button"
              disabled={busy || conflict}
              onClick={() => {
                expectedRevision.current = row.revision;
                setReset(true);
              }}
            >
              Restore original photo
            </button>
          )}
        </div>
        {reset && (
          <div className="app-image-reset">
            <p>
              Replace the published photo with the original reference photo?
            </p>
            <button
              className="button secondary"
              disabled={busy || conflict}
              onClick={() => publish(true)}
            >
              Confirm restore
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setReset(false)}
            >
              Keep current photo
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="error-inline">
            {error}
          </p>
        )}
        {conflict && (
          <button
            className="button secondary"
            onClick={async () => {
              await client.invalidateQueries({ queryKey: ["admin-app-media"] });
              const latest = client
                .getQueryData<AppImage[]>(["admin-app-media"])
                ?.find((p) => p.slot === row.slot);
              if (latest) {
                expectedRevision.current = latest.revision;
                setConflict(false);
                setError("");
                setMessage(
                  "Latest version loaded. Review your preview, then publish to replace it.",
                );
              }
            }}
          >
            Load latest version
          </button>
        )}
        {message && <p role="status">{message}</p>}
        <small>
          Revision {row.revision}
          {row.revision > 0
            ? ` · ${new Date(row.updated_at).toLocaleString()}`
            : ""}
        </small>
      </div>
    </article>
  );
}
export function AppImages() {
  const q = useQuery({
    queryKey: ["admin-app-media"],
    queryFn: () => api<AppImage[]>("admin/app-media"),
  });
  return (
    <section className="app-images">
      <h2>App photography</h2>
      <p>
        Preview and publish welcome, landing and date-planning photos. The
        welcome carousel updates on web, Android and iOS; date and landing
        images update wherever used. Changes are recorded in the staff audit
        trail.
      </p>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      <div className="app-images-grid">
        {q.data
          ?.filter((row) =>
            appImageSlots.some((config) => config.slot === row.slot),
          )
          .map((row) => (
            <ImageEditor key={row.slot} row={row} />
          ))}
      </div>
    </section>
  );
}
