"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { profileSchema } from "@just1date/validation";
import { onboardingSteps } from "@just1date/config";
import { Button } from "@just1date/ui";
import { QueryState } from "./query-state";
import { api, json } from "../lib/client";
import { BirthdayPicker } from "./birthday-picker";
import {
  Check,
  Camera,
  Music,
  Plane,
  ShoppingBag,
  Dumbbell,
  Heart,
  UserRound,
  ChevronLeft,
} from "lucide-react";
type Fields = z.infer<typeof profileSchema>;
const initial: Fields = {
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
export function ProfileForm() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  return (
    <main className="onboarding-screen">
      <header className="onboarding-header"><Link className="square-control" href="/profile" aria-label="Back to profile"><ChevronLeft size={23} /></Link><Link className="pink-link" href="/profile">Skip</Link></header>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <Editor
          key={q.data.user_id}
          own={q.data}
          done={() => client.invalidateQueries({ queryKey: ["me"] })}
        />
      )}
    </main>
  );
}
function Editor({ own, done }: { own: any; done: () => unknown }) {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    register,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...initial,
      ...Object.fromEntries(
        Object.keys(initial).map((k) => [
          k,
          own[k] ?? initial[k as keyof Fields],
        ]),
      ),
    },
  });
  const [prefs, setPrefs] = useState(own.preferences);
  const [firstName,setFirstName] = useState((own.display_name ?? "").split(/\s+/)[0]);
  const [lastName,setLastName] = useState((own.display_name ?? "").split(/\s+/).slice(1).join(" "));
  const interests = useQuery({
    queryKey: ["interests"],
    queryFn: () => api<{ code: string; name: string }[]>("catalog/interests"),
  });
  const selected = watch("interests");
  const field = (key: keyof Fields, label: string, type = "text") => (
    <label>
      {label}
      {key === "bio" ? (
        <textarea rows={4} maxLength={1000} {...register("bio")} />
      ) : (
        <input type={type} {...register(key as any)} />
      )}
      <small className="field-error">{errors[key]?.message as string}</small>
    </label>
  );
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!(await trigger())) {
        setError("Check your profile details before saving.");
        return;
      }
      await api("profiles/me", { method: "PATCH", body: json(getValues()) });
      await api("profiles/me/preferences", {
        method: "PATCH",
        body: json({
          age_min: Number(prefs.age_min),
          age_max: Number(prefs.age_max),
          distance_km: Number(prefs.distance_km),
          genders: prefs.genders,
          goals: prefs.goals,
          deal_breakers: prefs.deal_breakers ?? {},
        }),
      });
      setMessage(
        "Profile and preferences saved. Photos need moderation before discovery.",
      );
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const stepFields: Partial<Record<number, (keyof Fields)[]>> = {
    1: ["display_name"],
    3: ["gender"],
    5: ["goal"],
    6: ["city"],
    7: ["interests"],
    8: ["lifestyle"],
    9: ["profession", "education"],
    10: ["bio", "prompts"],
  };
  return (
    <div className="form-card">
      <div className="onboarding-top">
        <p className="eyebrow">STEP {step + 1} OF 15</p>
        <span>{own.completion}% complete</span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${((step + 1) / 15) * 100}%` }} />
      </div>
      <h1>
        {step === 3
          ? "I am a"
          : step === 1 ? "Profile details" : step === 7
            ? "Your interests"
            : onboardingSteps[step]}
      </h1>
      <div className="form-grid">
        {step === 0 && (
          <p>
            Bring your whole self. Your intentions, interests and everyday life
            help us introduce people worth getting to know.
          </p>
        )}
        {step === 1 && <div className="onboarding-name"><div className="onboarding-avatar">{own.photos?.[0] ? <img src={own.photos[0]} alt="Your profile" /> : <UserRound size={44} />}<button type="button" aria-label="Add a profile photo" onClick={() => setStep(11)}><Camera size={17} /></button></div><label className="floating-label">First name<input autoComplete="given-name" value={firstName} onChange={e => { setFirstName(e.target.value); setValue("display_name", [e.target.value,lastName].filter(Boolean).join(" ")); }} /></label><label className="floating-label">Last name<input autoComplete="family-name" value={lastName} onChange={e => { setLastName(e.target.value); setValue("display_name", [firstName,e.target.value].filter(Boolean).join(" ")); }} /></label><BirthdayPicker value={own.date_of_birth ?? ""} readOnly /><small className="field-error">{errors.display_name?.message}</small></div>}
        {step === 2 && (
          <div>
            <label>
              Date of birth
              <BirthdayPicker value={own.date_of_birth ?? ""} readOnly />
            </label>
            <p>
              Your registration date of birth determines your age. Contact
              support if it is incorrect.
            </p>
          </div>
        )}
        {step === 3 && (
          <div className="gender-options">
            {[
              ["woman", "Woman"],
              ["man", "Man"],
              ["nonbinary", "Nonbinary"],
              ["self_described", "Choose another"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={watch("gender") === value}
                className={watch("gender") === value ? "selected" : ""}
                onClick={() => setValue("gender", value as Fields["gender"])}
              >
                {label}
                <Check size={20} />
              </button>
            ))}
          </div>
        )}
        {step === 4 && (
          <fieldset>
            <legend>Who are you interested in?</legend>
            {["woman", "man", "nonbinary", "self_described"].map((g) => (
              <label className="check-row" key={g}>
                <input
                  type="checkbox"
                  checked={prefs.genders.includes(g)}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      genders: e.target.checked
                        ? [...prefs.genders, g]
                        : prefs.genders.filter((x: string) => x !== g),
                    })
                  }
                />
                {g.replace("_", " ")}
              </label>
            ))}
          </fieldset>
        )}
        {step === 5 && (
          <label>
            Relationship intention
            <select {...register("goal")}>
              <option value="serious">Serious relationship</option>
              <option value="marriage">Marriage</option>
              <option value="long_term">Long-term dating</option>
              <option value="dating">Dating</option>
              <option value="friendship">Friendship</option>
              <option value="exploring">Still figuring it out</option>
            </select>
          </label>
        )}
        {step === 6 && (
          <>
            {field("city", "Your city")}
            <p>
              Discovery uses your city. Your home address is never requested or
              shown.
            </p>
          </>
        )}
        {step === 7 && (
          <>
            <p>Select at least three things that make you, you.</p>
            {interests.isPending ? (
              <p role="status">Loading interests…</p>
            ) : interests.error ? (
              <p role="alert">{interests.error.message}</p>
            ) : (
              <div className="interest-grid">
                {interests.data?.map((i) => (
                  <button
                    type="button"
                    aria-pressed={selected.includes(i.code)}
                    className={
                      selected.includes(i.code) ? "chip selected" : "chip"
                    }
                    key={i.code}
                    onClick={() =>
                      setValue(
                        "interests",
                        selected.includes(i.code)
                          ? selected.filter((x) => x !== i.code)
                          : [...selected, i.code],
                      )
                    }
                  >
                    {(() => {
                      const Icon =
                        (
                          {
                            photography: Camera,
                            music: Music,
                            travel: Plane,
                            shopping: ShoppingBag,
                            fitness: Dumbbell,
                          } as Record<string, typeof Heart>
                        )[i.code] ?? Heart;
                      return <Icon size={20} />;
                    })()}
                    {i.name}
                  </button>
                ))}
              </div>
            )}
            <span className="field-error">{errors.interests?.message}</span>
          </>
        )}
        {step === 8 && (
          <>
            {[
              "smoking",
              "drinking",
              "exercise",
              "children",
              "pets",
              "social",
            ].map((k) => (
              <label key={k}>
                {k}
                <select {...register(`lifestyle.${k}` as any)}>
                  <option value="">Prefer not to share</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="sometimes">Sometimes</option>
                </select>
              </label>
            ))}
            <label>
              Values (comma separated)
              <input
                defaultValue={own.values?.join(", ")}
                onChange={(e) =>
                  setValue(
                    "values",
                    e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                      .slice(0, 10),
                  )
                }
              />
            </label>
          </>
        )}
        {step === 9 && (
          <>
            {field("profession", "Profession")}
            {field("education", "Education")}
          </>
        )}
        {step === 10 && (
          <>
            {field("bio", "About me")}
            <label>
              A prompt that says a little more
              <input
                placeholder="A perfect Sunday looks like…"
                {...register("prompts.0.question")}
              />
            </label>
            <label>
              Your answer
              <textarea {...register("prompts.0.answer")} />
            </label>
            <label>
              How do you like to communicate?
              <select {...register("communication")}>
                <option value="">Choose, if you like</option>
                <option value="thoughtful">Thoughtful messages</option>
                <option value="playful">Playful conversation</option>
                <option value="direct">Direct and open</option>
                <option value="calls">Prefer a call</option>
              </select>
            </label>
          </>
        )}
        {step === 11 && (
          <>
            <p>
              Use a clear photo of yourself. It is checked before other members
              can see it. A moderated photo is separate from identity
              verification.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              aria-label="Upload profile photo"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  const values = getValues();
                  if (!(await trigger()))
                    throw new Error("Complete your profile details first.");
                  await api("profiles/me", {
                    method: "PATCH",
                    body: json(values),
                  });
                  const positions = (own.photo_review ?? []).map(
                    (x: any) => x.position,
                  );
                  const position = [0, 1, 2, 3, 4, 5].find(
                    (v) => !positions.includes(v),
                  );
                  if (position === undefined)
                    throw new Error(
                      "Your six photo slots are occupied. Photo replacement is pending implementation.",
                    );
                  await api(`profiles/me/photos?position=${position}`, {
                    method: "POST",
                    body: file,
                    headers: { "Content-Type": file.type },
                  });
                  setMessage("Photo uploaded and awaiting review.");
                  done();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            {own.photo_review?.map((p: any) => (
              <p key={p.id}>
                Photo {p.position + 1}: {p.status}
              </p>
            ))}
          </>
        )}
        {step === 12 && (
          <>
            <label>
              Minimum age
              <input
                type="number"
                min={18}
                max={100}
                value={prefs.age_min}
                onChange={(e) =>
                  setPrefs({ ...prefs, age_min: e.target.value })
                }
              />
            </label>
            <label>
              Maximum age
              <input
                type="number"
                min={18}
                max={100}
                value={prefs.age_max}
                onChange={(e) =>
                  setPrefs({ ...prefs, age_max: e.target.value })
                }
              />
            </label>
            <label>
              Distance preference (km)
              <input
                type="number"
                min={1}
                max={500}
                value={prefs.distance_km}
                onChange={(e) =>
                  setPrefs({ ...prefs, distance_km: e.target.value })
                }
              />
            </label>
            <p>
              Until optional approximate coordinates are configured, matching
              uses your city.
            </p>
          </>
        )}
        {step === 13 && (
          <>
            <p>
              Email verification happens through your confirmation email. Photos
              are reviewed by a moderator. Selfie identity verification is not
              yet connected and no identity badge is granted without that
              process.
            </p>
            <Link className="text-link" href="/verification">
              See verification status
            </Link>
          </>
        )}
        {step === 14 && (
          <>
            <p>
              You’re ready to save your story. Discovery becomes available after
              email confirmation and approval of at least one photo.
            </p>
            <Button disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save my profile"}
            </Button>
            <Link className="text-link" href="/discover">
              Go to discovery
            </Link>
          </>
        )}
      </div>
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-inline" role="status">
          {message}
        </p>
      )}
      <div className="form-actions">
        <Button
          disabled={step === 0 || busy}
          onClick={() => {
            setError("");
            setStep((s) => s - 1);
          }}
        >
          Back
        </Button>
        {step < 14 && (
          <Button
            disabled={busy}
            onClick={async () => {
              setError("");
              if (stepFields[step] && !(await trigger(stepFields[step])))
                return;
              if (step === 4 && !prefs.genders.length) {
                setError("Choose at least one preference.");
                return;
              }
              setStep((s) => s + 1);
            }}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
