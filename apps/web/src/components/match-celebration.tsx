"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@just1date/types";
import { api } from "../lib/client";
import { Sheet } from "./sheet";
import { QueryState } from "./query-state";

// Call only with a confirmed mutual-match response and its conversation ID.
export function MatchCelebration({
  profile,
  conversation,
  onClose,
}: {
  profile: Profile;
  conversation: string;
  onClose: () => void;
}) {
  const own = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Profile>("profiles/me"),
  });
  return (
    <Sheet title="It’s a match!" variant="match" onClose={onClose}>
      <div className="match-celebration">
        <QueryState
          pending={own.isPending}
          error={own.error}
          retry={own.refetch}
        />
        {own.data && (
          <div className="match-photos">
            {own.data.photos?.[0] ? (
              <img src={own.data.photos[0]} alt="Your profile photo" />
            ) : (
              <div
                className="match-photo-placeholder"
                aria-label="Your profile"
              >
                {own.data.display_name?.[0]}
              </div>
            )}
            {profile.photos?.[0] ? (
              <img src={profile.photos[0]} alt={profile.display_name} />
            ) : (
              <div
                className="match-photo-placeholder"
                aria-label={profile.display_name}
              >
                {profile.display_name?.[0]}
              </div>
            )}
            <span className="match-heart match-heart-top" aria-hidden="true">
              <Heart fill="currentColor" size={28} />
            </span>
            <span className="match-heart match-heart-bottom" aria-hidden="true">
              <Heart fill="currentColor" size={28} />
            </span>
          </div>
        )}
        <h3>It’s a match, Yes!</h3>
        <p>You and {profile.display_name} liked each other.</p>
        <Link className="button" href={`/messages/${conversation}`}>
          Say hi
        </Link>
        <button className="button secondary" onClick={onClose}>
          Keep swiping
        </button>
      </div>
    </Sheet>
  );
}
