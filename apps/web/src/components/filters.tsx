"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@just1date/ui";
import { preferencesSchema } from "@just1date/validation";
import { Sheet } from "./sheet";
import { QueryState } from "./query-state";
import { Shell } from "./shell";
import { api, json } from "../lib/client";
export function Filters({ onClose }: { onClose?: () => void }) {
  const q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  const body = (
    <>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <FilterForm key={q.data.user_id} own={q.data} onClose={onClose} />
      )}
    </>
  );
  return onClose ? (
    <Sheet title="Filters" onClose={onClose}>
      {body}
    </Sheet>
  ) : (
    <Shell title="Filters">{body}</Shell>
  );
}
function FilterForm({ own, onClose }: { own: any; onClose?: () => void }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(own.preferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <form
      className="filters-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const p = preferencesSchema.parse({
            age_min: Number(value.age_min),
            age_max: Number(value.age_max),
            distance_km: Number(value.distance_km),
            genders: value.genders,
            goals: value.goals,
            deal_breakers: value.deal_breakers ?? {},
          });
          await api("profiles/me/preferences", {
            method: "PATCH",
            body: json(p),
          });
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["me"] }),
            qc.invalidateQueries({ queryKey: ["discover"] }),
          ]);
          setSaved(true);
          onClose?.();
        } catch (e) {
          setError(
            e instanceof Error && e.name === "ZodError"
              ? "Choose a valid age range and at least one preference."
              : (e as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <button
        className="pink-link filter-clear"
        type="button"
        onClick={() => {
          setValue({
            ...value,
            age_min: 18,
            age_max: 99,
            distance_km: 50,
            genders: ["woman", "man", "nonbinary", "self_described"],
            goals: [
              "serious",
              "marriage",
              "long_term",
              "dating",
              "friendship",
              "exploring",
            ],
            deal_breakers: {},
          });
          setSaved(false);
        }}
      >
        Clear
      </button>
      <h3>Interested in</h3>
      <div className="segmented-control">
        {[
          ["Girls", ["woman"]],
          ["Boys", ["man"]],
          ["Both", ["woman", "man"]],
        ].map(([label, genders]) => (
          <button
            type="button"
            key={String(label)}
            aria-pressed={
              JSON.stringify(value.genders) === JSON.stringify(genders)
            }
            className={
              JSON.stringify(value.genders) === JSON.stringify(genders)
                ? "selected"
                : ""
            }
            onClick={() => setValue({ ...value, genders })}
          >
            {label}
          </button>
        ))}
      </div>
      <details className="inclusive-preferences">
        <summary>More gender preferences</summary>
        {["woman", "man", "nonbinary", "self_described"].map((g) => (
          <label className="check-row" key={g}>
            <input
              type="checkbox"
              checked={value.genders.includes(g)}
              onChange={(e) =>
                setValue({
                  ...value,
                  genders: e.target.checked
                    ? [...value.genders, g]
                    : value.genders.filter((x: string) => x !== g),
                })
              }
            />
            {g.replace("_", " ")}
          </label>
        ))}
      </details>
      <label className="location-field">
        <span>Location</span>
        <input readOnly value={own.city || "Add your city in your profile"} />
        <a href="/onboarding" aria-label="Edit location">
          ›
        </a>
      </label>
      <label className="slider-label">
        Distance<span>{value.distance_km}km</span>
        <input
          type="range"
          min={1}
          max={500}
          value={value.distance_km}
          style={{
            background: `linear-gradient(to right,#df3594 ${((value.distance_km - 1) / 499) * 100}%,#e8e6ea ${((value.distance_km - 1) / 499) * 100}%)`,
          }}
          onChange={(e) =>
            setValue({ ...value, distance_km: Number(e.target.value) })
          }
        />
      </label>
      <fieldset className="age-slider">
        <legend>Age</legend>
        <span>
          {value.age_min}–{value.age_max}
        </span>
        <div className="dual-range">
          <div
            className="dual-range-track"
            style={{
              background: `linear-gradient(to right,#e8e6ea 0%,#e8e6ea ${((value.age_min - 18) / 81) * 100}%,#df3594 ${((value.age_min - 18) / 81) * 100}%,#df3594 ${((value.age_max - 18) / 81) * 100}%,#e8e6ea ${((value.age_max - 18) / 81) * 100}%,#e8e6ea 100%)`,
            }}
          />
          <label className="sr-only" htmlFor="age-min">
            Minimum age
          </label>
          <input
            id="age-min"
            type="range"
            min={18}
            max={99}
            value={value.age_min}
            onChange={(e) =>
              setValue({
                ...value,
                age_min: Math.min(
                  Number(e.target.value),
                  Number(value.age_max),
                ),
              })
            }
          />
          <label className="sr-only" htmlFor="age-max">
            Maximum age
          </label>
          <input
            id="age-max"
            type="range"
            min={18}
            max={99}
            value={value.age_max}
            onChange={(e) =>
              setValue({
                ...value,
                age_max: Math.max(
                  Number(e.target.value),
                  Number(value.age_min),
                ),
              })
            }
          />
        </div>
      </fieldset>
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="success-inline" role="status">
          Preferences saved.
        </p>
      )}
      <Button disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
    </form>
  );
}
