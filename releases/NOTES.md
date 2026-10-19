# Just1date Android preview 0.1.0

Real native Android APK, package `com.just1date.app`, version code 1. This is an
internal/testing preview, not a Google Play-approved or public-launch release.

Download `just1date-0.1.0-preview.apk` and check SHA256SUMS.txt. The same APK is
available from the public Expo build artifact:
https://expo.dev/artifacts/eas/FwKNN7vA2CKoA4ck85BHfYPmV0O-nnR488bmZHt98TQ.apk

EAS build: 8e5d5ab7-6cd4-4b98-a138-16bd8790748f. Production API and Supabase public
runtime settings are embedded. Private service/database keys are not in its
Hermes bundle. The native source was uploaded as the working-tree build snapshot
before release-source commit 6d6e205; later backend/documentation changes do not
rebuild this binary.

Independent GitHub run 39245490013 passed official APK signature verification,
Android target/compile API 36, 16 KB zip/native alignment, emulator installation,
process startup and welcome UI detection. This is boot evidence, not a complete
physical-device member journey or proof of Play acceptance.

Video clients and authenticated call APIs are implemented, but live calling
remains disabled until the owner configures LiveKit Cloud, a continuous cleanup
worker and live two-device acceptance. iOS device distribution requires Apple
Developer signing; no IPA or App Store approval is included.

Before public launch, complete SMTP/staff setup, outstanding product workflows,
full account deletion, store billing/privacy/legal review, dependency remediation,
device/provider/security/load acceptance and operational readiness. See
docs/STATUS.md and docs/RELEASE_2026-10-18.md. No million-user capacity is claimed.
