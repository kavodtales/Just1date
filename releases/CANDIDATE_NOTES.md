Just1Date premium redesign and Just One Date — v0.1.0-rc.3

This candidate adds a romantic plum/rose identity, original generated illustrative
photography and a native Just One Date tab. Date plans support activity, public
meeting place, time and a note; real proposals need an active mutual match and
the recipient's acceptance. Neither demo nor real plans book a venue.

IMPORTANT ROLLOUT STATUS: The matching web/API/admin source is uploaded to both
repositories and migrations 013–014 are installed. Deployment is awaiting access
to the existing Vercel team or the owner's destination choice. Until that API
rollout completes, the newly added real date endpoints are unavailable on the
current production service. This is a prerelease candidate, not a public-launch
approval. See docs/TRANSFORMATION_2026-10-22.md for verification and integration
limits. Fictional generated adults are never verified real members.

The exact Android source is 5f9399f57c1df1a2b66edaafb577542b1a856a54.
APK code 13 and AAB code 14 retain the existing signing certificate. The exact
files have independent digest checks; APK signature/API/16 KiB alignment and
real-emulator signup checks, and AAB Google bundletool checks passed.

Updated iOS simulator build (not installable on an iPhone):
https://expo.dev/artifacts/eas/wRntWq7olXtdsZnbZBWH-wpjzUN8DvB3CZoN0bdGBNs.tar.gz

## Continuing capabilities and launch requirements

Welcome photography can be previewed, published and restored by authorized staff
through App images. Updated web, Android and iOS apps read the same published
photos without a new build for each image change. Permission artwork and social
glyphs are code. The match celebration composes actual member photos after a
server-confirmed mutual like from discovery or profile detail; Say hi opens that
specific conversation. Owner activation requires completed authenticator setup.

The original owner logo is preserved across the refreshed welcome, signup,
phone/code, profile/calendar, interests, discovery, filters, matches, inbox/chat,
gallery and permission flows. The full-photo viewer uses approved member photos
and explicitly sent matched replies.

APK: installable Android candidate. AAB: signed Google Play upload bundle.
Checksums identify the exact independently verified files. Android verification
includes the existing signing certificate, target API 36, 16 KiB alignment,
emulator startup and signup validation. This is not Google Play approval.

The installable web app is available at https://just1date-vert.vercel.app/download.
An iOS simulator build does not install on iPhone; Apple Developer signing and
TestFlight/App Store review are still required for device distribution.

Public-launch gates remain: media provider and persistent cleanup worker, verified
email sender, real staff operations, full account/device acceptance, remaining
product/security/privacy/legal work and store review. Contact matching and social
providers are visibly unavailable. Calls stay disabled until configured and
verified; no two-device media test or commercial launch approval is claimed.
