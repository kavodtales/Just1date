import Link from "next/link";
import { Brand } from "../../components/brand";
import { InstallApp } from "../../components/install-app";
import { androidPreview } from "../../lib/native-release";
import { Smartphone, ShieldCheck, Video } from "lucide-react";
export const metadata = { title: "Get Just1date — Web, Android and iPhone" };
function httpsLink(value: string | undefined, allowedHost?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!allowedHost || url.hostname === allowedHost)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export default function DownloadPage() {
  const apkSha = process.env.ANDROID_APK_SHA256 ?? androidPreview.sha256;
  const apk = apkSha.match(/^[a-f0-9]{64}$/i)
    ? httpsLink(process.env.ANDROID_APK_URL ?? androidPreview.url)
    : null;
  const play = httpsLink(process.env.GOOGLE_PLAY_URL, "play.google.com"),
    ios = httpsLink(process.env.APP_STORE_URL, "apps.apple.com"),
    testflight = httpsLink(
      process.env.IOS_TESTFLIGHT_URL,
      "testflight.apple.com",
    );
  return (
    <div className="download-page">
      <header>
        <Brand />
        <Link href="/discover">Open web app ↗</Link>
      </header>
      <main>
        <div className="download-intro">
          <p className="premium-kicker">TAKE THE FIRST STEP</p>
          <h1>
            Your next chapter.
            <br />
            <em>Wherever you are.</em>
          </h1>
          <p>Meaningful connections deserve a place in your everyday life.</p>
        </div>
        <InstallApp />
        <div className="native-downloads">
          <section className="download-card">
            <Smartphone />
            <span className="download-platform">ANDROID</span>
            <h2>Just1date for Android.</h2>
            <p>
              A native experience with secure sign-in, thoughtful discovery and
              private conversations.
            </p>
            {play && (
              <a className="premium-button" href={play}>
                Get it on Google Play
              </a>
            )}
            {apk ? (
              <>
                <a className="premium-button" href={apk}>
                  Download Android APK
                </a>
                <p className="release-pending">
                  Android preview · {androidPreview.version} · 151 MB. Google
                  Play release is pending.
                </p>
                <details>
                  <summary>Verify your download</summary>
                  <p>SHA-256</p>
                  <code>{apkSha}</code>
                </details>
              </>
            ) : (
              <p className="release-pending">
                The signed Android download is being prepared. You can install
                the web app above now.
              </p>
            )}
          </section>
          <section className="download-card">
            <Smartphone />
            <span className="download-platform">IPHONE & IPAD</span>
            <h2>A little more intentional.</h2>
            <p>
              Keep your connections close on iPhone. The web app works in Safari
              today.
            </p>
            {ios ? (
              <a className="premium-button" href={ios}>
                Download on the App Store
              </a>
            ) : testflight ? (
              <a className="premium-button" href={testflight}>
                Join the TestFlight beta
              </a>
            ) : (
              <p className="release-pending">
                The iOS store release is being prepared. Add the web app to your
                home screen while you wait.
              </p>
            )}
          </section>
        </div>
        <div className="download-principles">
          <p>
            <ShieldCheck /> Private sessions. No offline storage of
            conversations.
          </p>
          <p>
            <Video /> Video dates between consenting matched members when the
            calling service is available.
          </p>
        </div>
        <footer>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/safety">Safety Center</Link>
        </footer>
      </main>
    </div>
  );
}
