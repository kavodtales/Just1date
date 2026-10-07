# Reviewed browser captures

These captures were produced on 2026-10-07 by the repository's Playwright suite
against the production Next.js build in local Chrome. `mobile/` uses the supplied
375×812 browser viewport; `desktop/` uses Desktop Chrome's 1280×720 viewport.
Full-page captures can be taller than the viewport where scrolling is appropriate.

Welcome/signup use the supplied introductory/brand artwork. Discovery, matches,
messages, chat, profile and match captures use explicit test-only network fixtures.
Those identities and message histories are not live members or seeded production
data. The test portrait is a crop from the supplied Main reference and contains its
original embedded distance badge; that embedded text is part of the fixture image,
not the application's authorized distance data.

The suite verifies navigation, exact discovery card/action dimensions at 375px,
validated action/filter payloads, confirmed-match navigation, actual inbox search
and unread rendering, gallery controls, birthday selection, chat sending and OTP
entry/resend timing. SQL/REST tests verify the backend separately.

These captures are manual visual review evidence, not a pixel-diff baseline or
proof of live-provider, signed-native-build or physical-device acceptance. Full
pixel identity for every supplied screen remains unverified. See
[reference mapping](../README.md) and [release status](../../docs/STATUS.md).
