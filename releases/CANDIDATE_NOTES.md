Just1Date audited rebuild — v0.1.0-rc.4

This candidate includes the premium Just1Date interface, original illustrative
photography, Just One Date planning and repaired native recovery validation.
The matching web app adds explicit birthday errors, resilient service feedback,
a corrected mobile logo and signed staff-photo rendering.

LIVE SERVICE LIMIT: Supabase currently has no DNS response. The owner deferred
restoring the project and updating Auth callback URLs. Real sign-in, accounts,
member messaging, invitations and staff data operations require that restoration.
This is a prerelease for review, not a completed public launch.

At https://just1date.vercel.app/demo, choose the explicitly labeled device-only
preview during an outage. It uses four fictional adults, scripted replies and
simulated invitations, with tab-local activity for up to 24 hours. It contacts
no real members and makes no venue reservations. Real conversations are never
cached offline. Fictional generated adults are never verified real members.

Native source: efe7877f109a86f90f65180db651a0489f68e9ec.
APK version code 17 and AAB version code 18 retain the existing signing identity.
The exact files and independent verification are recorded in
`docs/security/mobile-candidate-2026-11-11.json`. SHA256SUMS.txt covers the APK,
Play bundle and iOS simulator archive. Google Play publication is separate from
bundle validation; no store approval is claimed.

The iOS simulator archive is for development on a Mac, not installation on an
iPhone. An iPhone IPA/TestFlight release requires Apple Developer signing.
The web app can be added to the home screen from Safari today.

Video calling still needs LiveKit and a continuously running worker, plus
explicit recipient consent. Verified SMTP/SMS delivery, payment acceptance,
legal/store review and owner MFA remain external gates. See
`docs/AUDIT_2026-11-11.md` for tested behavior and remaining work.
