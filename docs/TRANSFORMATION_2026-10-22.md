# Just1Date transformation

The existing app now has an original photographic identity, a responsive romantic
editorial design and functional Just One Date invitations on web and native.
The earlier screenshot contract is superseded; the original logo and useful
service workflows remain.

## What changed

- Original generated rooftop/couple, four adult portraits and courtyard imagery;
  optimized WebP files, recorded prompts and hashes, no old watermarked photos.
- Consistent landing, auth, onboarding, discovery, matches, profile, messages,
  settings, safety, membership and download surfaces. Five-item mobile navigation.
- Coded profile/reaction/match interactions, private real-member messages,
  conversation starters that fill the composer and require an explicit send.
- Activity, public meeting place, date/time and note proposals; recipient
  acceptance/decline, participant cancellation and cancellation after unmatch.
- Separate labeled demo profiles, scripted replies and simulated date responses.
- Staff preview, publishing, conflict handling and restoration for five
  promotional photo slots. Private member images remain owner-managed.

## Verification and practical limits

The SQL/API/unit suite passes 68 tests. Member-browser acceptance passes 87
applicable tests at desktop, Pixel and 375-pixel sizes; eight staff-browser tests
pass. Three staging journeys need prepared real-member credentials and are
skipped. Production web/admin/API builds, lint and workspace typechecks pass;
both native Hermes bundles export. Current browser evidence uses explicit
test-only fictional fixtures, never seeded live members.

The hosted schema has migration 013. The updated source and any newly verified
native release are tracked separately from deployment and store publication.
See STATUS.md and the native release manifest for their exact status.

Calling already has consent and revocation controls, but live media requires an
owner-controlled LiveKit provider and running worker. SMTP, social providers,
payment acceptance, final legal review, store signing/submission and real-device
acceptance still depend on the corresponding services or credentials. The
existing iOS simulator artifact is not an installable iPhone IPA. No fictional
adult is presented as a verified member, and no date venue is actually booked.
