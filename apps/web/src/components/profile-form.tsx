"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { profileSchema } from "@just1date/validation";
import { Camera, Check, Heart, ArrowRight, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
type Fields = z.infer<typeof profileSchema>;
const defaults: Fields = {
  display_name: "",
  gender: "self_described",
  city: "",
  bio: "",
  profession: "",
  education: "",
  goal: "serious",
  interests: [],
  values: [],
  lifestyle: {},
  communication: "",
  personality: [],
  prompts: [],
};
const goals = [
  ["serious", "Something meaningful"],
  ["marriage", "Marriage"],
  ["long_term", "A long-term relationship"],
  ["dating", "Dating"],
  ["friendship", "Friendship"],
  ["exploring", "Figuring it out"],
];
export function ProfileForm() {
  const q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  return (
    <div className="profile-editor-page">
      <header>
        <Brand />
        <Link href="/profile" className="quiet-link">
          Back to my profile
        </Link>
      </header>
      <main>
        <p className="premium-kicker">LET YOUR PERSONALITY THROUGH</p>
        <h1>Tell us your story.</h1>
        <p className="editor-intro">
          A thoughtful profile makes a better beginning. Start with the
          essentials and add a little of what makes you, you.
        </p>
        <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
        {q.data && <Editor key={q.data.user_id} own={q.data} />}
      </main>
    </div>
  );
}
function Editor({ own }: { own: any }) {
  const qc = useQueryClient(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [uploading, setUploading] = useState(false);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...defaults,
      ...Object.fromEntries(
        Object.keys(defaults).map((k) => [
          k,
          own[k] ?? defaults[k as keyof Fields],
        ]),
      ),
    },
  });
  const catalog = useQuery({
    queryKey: ["interests"],
    queryFn: () =>
      api<Array<{ code: string; name: string }>>("catalog/interests"),
  });
  const selected = watch("interests"),
    selectedValues = watch("values");
  const reviews = own.photo_review ?? [],
    occupied = new Set<number>(reviews.map((p: any) => p.position));
  const available = [0, 1, 2, 3, 4, 5].find(
    (position) => !occupied.has(position),
  );
  const approved = reviews
    .filter((p: any) => p.status === "approved")
    .sort((a: any, b: any) => a.position - b.position);
  return (
    <form
      className="premium-profile-editor"
      onSubmit={handleSubmit(
        async (fields) => {
          setError("");
          setMessage("");
          try {
            await api("profiles/me", { method: "PATCH", body: json(fields) });
            await qc.invalidateQueries({ queryKey: ["me"] });
            setMessage(
              "Your profile is saved. Once your email is confirmed and a photo is approved, you can discover real members.",
            );
          } catch (e) {
            setError((e as Error).message);
          }
        },
        () =>
          setError(
            "Check the highlighted fields. Add a short bio and at least three interests.",
          ),
      )}
    >
      <section className="editor-card editor-photos">
        <div className="editor-section-title">
          <span>01</span>
          <div>
            <h2>A face to your story.</h2>
            <p>Add a clear photo of yourself. Keep it natural.</p>
          </div>
        </div>
        <div className="editor-photo-grid">
          {[0, 1, 2, 3, 4, 5].map((position) => {
            const review = reviews.find((p: any) => p.position === position),
              url =
                own.photos?.[
                  approved.findIndex((p: any) => p.position === position)
                ];
            return (
              <div
                className={`editor-photo ${review ? "occupied" : ""}`}
                key={position}
              >
                {url ? (
                  <img src={url} alt={`Your approved photo ${position + 1}`} />
                ) : (
                  <Camera size={24} />
                )}
                <span>
                  {review
                    ? review.status === "approved"
                      ? "Approved"
                      : review.status === "pending"
                        ? "In review"
                        : "Not approved"
                    : `Photo ${position + 1}`}
                </span>
              </div>
            );
          })}
        </div>
        <label
          className={`editor-upload ${available === undefined ? "disabled" : ""}`}
        >
          <Camera size={16} />
          {uploading ? "Uploading your photo…" : "Choose a photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload your profile photo"
            disabled={uploading || isSubmitting || available === undefined}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || available === undefined) return;
              setUploading(true);
              setError("");
              setMessage("");
              try {
                if (file.size > 5242880)
                  throw new Error("Choose a photo smaller than 5 MB.");
                await api(`profiles/me/photos?position=${available}`, {
                  method: "POST",
                  headers: { "Content-Type": file.type },
                  body: file,
                });
                await qc.invalidateQueries({ queryKey: ["me"] });
                setMessage("Your photo is uploaded and waiting for review.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        <p className="editor-photo-help">
          JPG, PNG or WebP · Up to 5 MB · At least 200 × 200 pixels. Photos stay
          private until approved.
        </p>
        <div className="editor-review-note">
          <ShieldCheck size={18} />
          <p>
            A moderator reviews photos before they appear in discovery. Photo
            approval does not verify someone’s identity.
          </p>
        </div>
      </section>
      <section className="editor-card">
        <div className="editor-section-title">
          <span>02</span>
          <div>
            <h2>The essentials.</h2>
            <p>Help someone get to know the real you.</p>
          </div>
        </div>
        <div className="editor-field-grid">
          <label>
            Display name
            <input
              autoComplete="nickname"
              maxLength={50}
              {...register("display_name")}
            />
            <small className="field-error">
              {errors.display_name?.message}
            </small>
          </label>
          <label>
            City
            <input
              autoComplete="address-level2"
              maxLength={100}
              placeholder="e.g. Lagos"
              {...register("city")}
            />
            <small className="field-error">{errors.city?.message}</small>
          </label>
          <label>
            I identify as
            <select {...register("gender")}>
              <option value="self_described">Self-described</option>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
              <option value="nonbinary">Nonbinary</option>
            </select>
          </label>
          <label>
            I’m looking for
            <select {...register("goal")}>
              {goals.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Profession <span className="optional">optional</span>
            <input
              placeholder="What keeps you inspired?"
              maxLength={100}
              {...register("profession")}
            />
          </label>
          <label>
            Education <span className="optional">optional</span>
            <input maxLength={100} {...register("education")} />
          </label>
        </div>
        <label>
          A little about me
          <textarea
            aria-label="A little about me"
            aria-describedby="profile-bio-help profile-bio-error"
            aria-invalid={Boolean(errors.bio)}
            rows={4}
            placeholder="Your everyday joys, your kind of connection, or a story worth sharing…"
            minLength={20}
            maxLength={1000}
            {...register("bio")}
          />
          <small id="profile-bio-error" className="field-error">
            {errors.bio?.message}
          </small>
          <small id="profile-bio-help">
            {watch("bio").length}/1000 · At least 20 characters
          </small>
        </label>
        <p className="editor-private-note">
          Your date of birth stays private. Only your age appears on your
          profile.
        </p>
      </section>
      <section className="editor-card">
        <div className="editor-section-title">
          <span>03</span>
          <div>
            <h2>A little common ground.</h2>
            <p>
              Choose at least 3 interests and the values that matter to you.
            </p>
          </div>
        </div>
        <QueryState
          pending={catalog.isPending}
          error={catalog.error}
          retry={catalog.refetch}
        />
        <div className="editor-interest-grid">
          {catalog.data?.map((i) => (
            <button
              type="button"
              key={i.code}
              aria-pressed={selected.includes(i.code)}
              className={selected.includes(i.code) ? "selected" : ""}
              onClick={() =>
                setValue(
                  "interests",
                  selected.includes(i.code)
                    ? selected.filter((c) => c !== i.code)
                    : selected.length < 20
                      ? [...selected, i.code]
                      : selected,
                  { shouldValidate: true },
                )
              }
            >
              {i.name}
              {selected.includes(i.code) && <Check size={13} />}
            </button>
          ))}
        </div>
        <small className="field-error">{errors.interests?.message}</small>
        <p className="editor-selected-count">
          {selected.length} interests selected · Choose 3–20
        </p>
        <h3>
          What matters to me <span className="optional">optional</span>
        </h3>
        <div className="editor-interest-grid">
          {[
            "Kindness",
            "Honesty",
            "Family",
            "Growth",
            "Ambition",
            "Creativity",
            "Adventure",
            "Balance",
          ].map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={selectedValues.includes(v)}
              className={selectedValues.includes(v) ? "selected" : ""}
              onClick={() =>
                setValue(
                  "values",
                  selectedValues.includes(v)
                    ? selectedValues.filter((x) => x !== v)
                    : selectedValues.length < 10
                      ? [...selectedValues, v]
                      : selectedValues,
                )
              }
            >
              {v}
            </button>
          ))}
        </div>
        <label>
          My perfect Sunday <span className="optional">optional</span>
          <textarea
            rows={2}
            maxLength={500}
            placeholder="Give someone a good conversation starter…"
            defaultValue={
              own.prompts?.find((p: any) => p.question === "My perfect Sunday")
                ?.answer ?? ""
            }
            onChange={(e) => {
              const other = watch("prompts").filter(
                (p) => p.question !== "My perfect Sunday",
              );
              setValue(
                "prompts",
                e.target.value.trim()
                  ? [
                      ...other.slice(0, 2),
                      { question: "My perfect Sunday", answer: e.target.value },
                    ]
                  : other,
                { shouldValidate: true },
              );
            }}
          />
          <small className="field-error">
            {errors.prompts && "Use at least 5 characters for your answer."}
          </small>
        </label>
      </section>
      {error && (
        <p className="premium-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-inline editor-success" role="status">
          {message}
        </p>
      )}
      <div className="editor-save-bar">
        <div>
          <Heart size={18} />
          <p>Make room for a real connection.</p>
        </div>
        <button className="premium-button" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Saving…" : "Save my profile"}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="editor-next-links">
        <Link className="quiet-link" href="/preferences">
          Set discovery preferences →
        </Link>
        <Link className="quiet-link" href="/discover">
          Go to discovery →
        </Link>
      </div>
    </form>
  );
}
