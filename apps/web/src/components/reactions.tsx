"use client";
import { Heart, Star, X } from "lucide-react";
export type Reaction = "likes" | "passes" | "super-likes";
export function Reactions({
  onAction,
  disabled,
}: {
  onAction: (action: Reaction) => void;
  disabled?: boolean;
}) {
  return (
    <div className="card-actions">
      <button
        className="reaction-button pass"
        disabled={disabled}
        aria-label="Pass on this profile"
        onClick={() => onAction("passes")}
      >
        <X size={27} strokeWidth={4} />
      </button>
      <button
        className="reaction-button like"
        disabled={disabled}
        aria-label="Like this profile"
        onClick={() => onAction("likes")}
      >
        <Heart size={52} />
      </button>
      <button
        className="reaction-button super"
        disabled={disabled}
        aria-label="Super Like this profile"
        onClick={() => onAction("super-likes")}
      >
        <Star size={31} />
      </button>
    </div>
  );
}
