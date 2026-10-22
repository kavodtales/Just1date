# JUST1DATE premium interface

The owner's premium transformation brief supersedes the earlier screenshot lock.
The original concept, logo and useful workflows remain; the interface is rendered
in React and React Native, with a shared plum/rose editorial identity.

Responsive desktop layouts, five-item mobile navigation, photographic discovery,
private conversations and Just One Date planning share the new visual system.
Current phone and staff renders are in `verification/current`; test identities
and messages are explicit fixtures, never seeded live members.

## Source assets

`scripts/prepare-brand-assets.mjs` derives platform assets from the owner’s
byte-preserved original PNG. `scripts/prepare-original-photography.mjs` optimizes
the six original generated photographs, with prompts and hashes recorded in
`photography/generation.json`. Old screenshot-derived photos and mockups are
removed. Fictional adults and illustrative venues are labeled; real profiles
remain member-owned. Permission artwork and interactive match compositions are
code. Poppins includes its OFL license.

## Screen and behavior mapping

| Supplied reference              | Web                             | Expo                      | Behavior                                                                              |
| ------------------------------- | ------------------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| Onboarding 1/2/3                | `/welcome`                      | `/`                       | Three selectable slides; signup/sign-in navigation                                    |
| Sign up                         | `/auth/signup`                  | `/signup`                 | Email/phone flows; social providers explicitly disabled                               |
| Number / Code                   | `/auth/phone`                   | `/phone`                  | Registered-number Supabase OTP; resend cooldown; verification                         |
| Profile details / Calendar      | `/onboarding`, `/auth/register` | `/onboarding`, `/auth`    | Editable name; registration birthday picker; immutable registered DOB                 |
| I am                            | Onboarding gender step          | Onboarding gender step    | Actual validated gender selection                                                     |
| Passions                        | Onboarding interests step       | Onboarding interests step | Database catalog and persisted selections                                             |
| Main / Swipe left / Swipe right | `/discover`                     | Discover tab              | Real profiles; gestures, button actions, web keyboard controls                        |
| Filters                         | Discovery sheet; `/preferences` | Discovery sheet           | Persisted preferences; age/distance controls; inclusive options                       |
| Match                           | Mutual-like sheet               | Mutual-like modal         | Only shown after server confirms a mutual match                                       |
| Matches                         | `/matches`, `/likes`            | Matches / Likes           | Approved photos; entitlement-checked incoming likes; confirmed unmatch                |
| Messages                        | `/messages`                     | Messages tab              | Search, real participants, latest message and unread count                            |
| Chat                            | `/messages/:id`                 | `/messages/:id`           | Private messages, pagination, actual send/delete actions                              |
| Profile / Profile 1             | `/profile/:id`                  | `/profile/:id`            | Photo hero, actions, location, about, interests, gallery                              |
| Photo fullsreen                 | Profile gallery modal           | Profile gallery modal     | Photo selection and dismissal                                                         |
| Notification                    | `/enable-notifications`         | `/enable-notifications`   | Native permission + token registration; delivery configuration required               |
| Friends                         | `/friends`                      | `/friends`                | Illustration and skip; contact matching clearly unavailable                           |
| Stories                         | `/stories/:id`                  | `/stories/:id`            | Full-photo viewer, photo navigation, optional playback and authorized matched replies |
| Retired small reference photos  | Not shipped                     | Not shipped               | Removed; never seeded as production members                                           |

## Deliberate functional differences

- The OTP uses six digits to match the implemented Supabase contract, rather than
  pretending a four-digit verification code works.
- Registration age requirements, truthful verification, approximate location,
  backend authorization and payment entitlements remain enforced.
- Intro copy does not promise bot-free matches or an unconfigured free month.
- Online/presence, delivery checkmarks, ephemeral story publishing, microphone capture, contact sync
  and social providers are not faked. The chat composer has a working Send action.
- DOB on an existing profile is read-only. Editing a display name through separate
  name fields still uses the existing public display-name schema.
- Actual names, photos, location ranges, dates and conversations depend on service
  data. Empty/error/loading states are intentional when services are unavailable.

The screenshots are not original font/layout/source files. The implemented
reference geometry is tested, but pixel identity across every supplied screen and
physical iOS/Android device has not been established. See `docs/STATUS.md`.

## Verification

`tests/e2e/reference-layout.spec.ts` checks welcome navigation, signup, birthday
selection, responsive card bounds and touch controls, action payloads, filter saving,
match navigation, inbox search/unread metadata, gallery navigation and chat sending.
Test identities and photography are fulfilled only at the browser test network
boundary; the live app contains no fixture profiles. `tests/fixtures/` is not a
public asset folder.

Run with `E2E_BASE_URL` set to a running application. On Windows with Chrome
installed, set `E2E_BROWSER_CHANNEL=chrome`; CI uses installed Playwright Chromium.
Screenshots are written to ignored `test-results/`. Selected reviewed screenshots
are copied to `verification/` with their fixture limitations documented.

## Completed screen pass — 20 October 2026

All supplied screen types now have web and native UI: three welcome slides, signup,
phone/code, profile details/calendar, gender, interests, both permission introductions,
discovery and both swipe states, filters, match celebration, connection grid, inbox,
chat, profile details/gallery and the full-photo story-style viewer. Both native
onboarding and phone verification were brought closer to the supplied composition.
The photo camera flow supports uploading before profile completion and returning
without losing entered names. Swipe underlays use actual next profiles, never seeded
placeholder members. The match celebration now fills the screen on mobile.

The story-style viewer is explicitly labelled Profile photos: it views approved
profile images, rather than claiming an unimplemented 24-hour publishing lifecycle.
Replies use the existing authorized conversation API only after the member presses
Send. Contact matching and social providers remain visibly unavailable; the web
notification screen saves real match/message preferences and does not request a
browser permission for a nonexistent web-push service.

Rendered review evidence is collected in [verification/current](verification/current/README.md).
These are real browser renders using test-boundary identities, not production member data.
