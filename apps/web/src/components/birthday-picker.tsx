"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@just1date/ui";
import { Sheet } from "./sheet";
export function BirthdayPicker({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(new Date().getFullYear() - 18, 0, 1);
  const [month, setMonth] = useState(parsed.getMonth()),
    [year, setYear] = useState(parsed.getFullYear()),
    [day, setDay] = useState(parsed.getDate());
  const days = new Date(year, month + 1, 0).getDate();
  const changeMonth = (delta: number) => {
    const date = new Date(year, month + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setDay((d) =>
      Math.min(
        d,
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      ),
    );
  };
  return (
    <>
      <button
        className="button secondary birthday-trigger"
        aria-label={value || "Choose birthday date"}
        type="button"
        onClick={() => setOpen(true)}
      >
        <CalendarDays size={22} />
        {value || "Choose birthday date"}
      </button>
      {open && (
        <Sheet title="Birthday" onClose={() => setOpen(false)}>
          <div className="calendar-controls">
            <button
              type="button"
              disabled={readOnly}
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <div>
              <select
                disabled={readOnly}
                aria-label="Birth year"
                value={year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYear(y);
                  setDay((d) =>
                    Math.min(d, new Date(y, month + 1, 0).getDate()),
                  );
                }}
              >
                {Array.from(
                  { length: 101 },
                  (_, i) => new Date().getFullYear() - i,
                ).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <p>
                {new Date(year, month).toLocaleDateString("en", {
                  month: "long",
                })}
              </p>
            </div>
            <button
              type="button"
              disabled={readOnly}
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
          <div className="calendar-days">
            {Array.from({ length: days }, (_, i) => (
              <button
                disabled={readOnly}
                className={day === i + 1 ? "selected" : ""}
                type="button"
                key={i}
                onClick={() => setDay(i + 1)}
                aria-label={`Day ${i + 1}`}
                aria-pressed={day === i + 1}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {readOnly && (
            <p className="legal-note">
              Your date of birth is fixed at registration. Contact support to
              request a correction.
            </p>
          )}
          <Button
            type="button"
            onClick={() => {
              onChange?.(
                `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
              );
              setOpen(false);
            }}
          >
            {readOnly ? "Done" : "Save"}
          </Button>
        </Sheet>
      )}
    </>
  );
}
