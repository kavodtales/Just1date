"use client";
import { useEffect, useState } from "react";
type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let deferredInstall: InstallPrompt | null = null;
export function PwaRegistration() {
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      deferredInstall = event as InstallPrompt;
      window.dispatchEvent(new Event("just1date:install-ready"));
    };
    window.addEventListener("beforeinstallprompt", capture);
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  return null;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(
        media.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const capture = () => setPrompt(deferredInstall);
    capture();
    update();
    media.addEventListener("change", update);
    window.addEventListener("just1date:install-ready", capture);
    window.addEventListener("appinstalled", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("just1date:install-ready", capture);
      window.removeEventListener("appinstalled", update);
    };
  }, []);
  return (
    <section className="download-card" aria-labelledby="install-heading">
      <span className="download-platform">
        WEB APP · ANDROID, IPHONE & DESKTOP
      </span>
      <h2 id="install-heading">Keep a little possibility close.</h2>
      <p>
        Add Just1date to your home screen. Open your conversations in an app
        window, with a secure connection and a helpful offline page.
      </p>
      {installed ? (
        <p className="install-success" role="status">
          You’re already using the installed web app.
        </p>
      ) : prompt ? (
        <button
          className="premium-button"
          onClick={async () => {
            try {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              if (choice.outcome === "accepted") setInstalled(true);
              setPrompt(null);
              deferredInstall = null;
            } catch {
              setError(
                "Open your browser’s menu and choose Install app or Add to Home Screen.",
              );
            }
          }}
        >
          Install Just1date
        </button>
      ) : (
        <div className="install-instructions">
          <h3>How to install</h3>
          <p>
            <strong>iPhone / iPad:</strong> Open this site in Safari, tap Share,
            then Add to Home Screen.
          </p>
          <p>
            <strong>Android:</strong> Open your browser menu, then Install app
            or Add to Home Screen.
          </p>
          <p>
            <strong>Desktop:</strong> Use your browser’s install icon or app
            menu when it’s available.
          </p>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
