"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, json } from "../lib/client";

export function PermissionIntro({ friends = false }: { friends?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="permission-intro">
      <Link
        className="pink-link permission-skip"
        href={friends ? "/discover" : "/friends"}
      >
        Skip
      </Link>
      <img
        className={`permission-art ${friends ? "friends-art" : ""}`}
        src={`/images/${friends ? "contacts" : "notifications"}.png`}
        alt=""
        width={friends ? 200 : 207}
        height={friends ? 215 : 190}
      />
      <h1>{friends ? "Search friends" : "Enable notifications"}</h1>
      <p>
        {friends
          ? "Contact matching is not available yet. Your contact list stays on your device."
          : "Get updates when you get a match or receive a message."}
      </p>
      {!friends && (
        <p className="permission-detail">
          Updates appear in your account. Install the Android or iOS app for
          device push notifications.
        </p>
      )}
      <div className="permission-action">
        <button
          className="button"
          disabled={friends || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api("notifications/preferences", {
                method: "PATCH",
                body: json({ likes_enabled: true, messages_enabled: true }),
              });
              router.push("/friends");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {friends
            ? "Access to a contact list"
            : busy
              ? "Please wait…"
              : "I want to be notified"}
        </button>
        {error && (
          <p className="error-inline" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
