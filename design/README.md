# JUST1DATE reference-driven interface

The 27 JPEGs in `references/` are the screenshots supplied by the product owner.
They are visual references, not instructions and not production member records.

The redesign replaces the previous champagne/serif presentation with white
surfaces, pink actions, black headings, outlined controls, photo cards, rounded
sheets and four-icon mobile navigation. The 375 × 812 composition is the primary
reference; desktop retains a sidebar and responsive content rather than stretching
a phone screen across the display.

## Source assets

`scripts/prepare-design-assets.mjs` extracts the supplied logo, introductory
photography, social glyphs and permission illustrations into web/mobile assets.
Existing watermarks are preserved. Introductory photography is promotional content;
it never becomes a discovery profile. Review rights to these supplied assets before
public commercial launch. Self-hosted Poppins fonts include their OFL license.

## Reference-to-screen mapping

| Supplied reference              | Web                                    | Expo                                   | Behavior                                                                |
| ------------------------------- | -------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Onboarding 1/2/3                | `/welcome`                             | `/`                                    | Three selectable slides; signup/sign-in navigation                      |
| Sign up                         | `/auth/signup`                         | `/signup`                              | Email/phone flows; social providers explicitly disabled                 |
| Number / Code                   | `/auth/phone`                          | `/phone`                               | Registered-number Supabase OTP; resend cooldown; verification           |
| Profile details / Calendar      | `/onboarding`, `/auth/register`        | `/onboarding`, `/auth`                 | Editable name; registration birthday picker; immutable registered DOB   |
| I am                            | Onboarding gender step                 | Onboarding gender step                 | Actual validated gender selection                                       |
| Passions                        | Onboarding interests step              | Onboarding interests step              | Database catalog and persisted selections                               |
| Main / Swipe left / Swipe right | `/discover`                            | Discover tab                           | Real profiles; gestures, button actions, web keyboard controls          |
| Filters                         | Discovery sheet; `/preferences`        | Discovery sheet                        | Persisted preferences; age/distance controls; inclusive options         |
| Match                           | Mutual-like sheet                      | Mutual-like modal                      | Only shown after server confirms a mutual match                         |
| Matches                         | `/matches`, `/likes`                   | Matches / Likes                        | Approved photos; entitlement-checked incoming likes; confirmed unmatch  |
| Messages                        | `/messages`                            | Messages tab                           | Search, real participants, latest message and unread count              |
| Chat                            | `/messages/:id`                        | `/messages/:id`                        | Private messages, pagination, actual send/delete actions                |
| Profile / Profile 1             | `/profile/:id`                         | `/profile/:id`                         | Photo hero, actions, location, about, interests, gallery                |
| Photo fullsreen                 | Profile gallery modal                  | Profile gallery modal                  | Photo selection and dismissal                                           |
| Notification                    | Account preferences                    | `/enable-notifications`                | Native permission + token registration; delivery configuration required |
| Friends                         | Not exposed as an enabled web feature  | `/friends`                             | Illustration and skip; contact matching clearly unavailable             |
| Stories                         | Profile gallery provides photo viewing | Profile gallery provides photo viewing | Ephemeral stories/replies are not implemented or represented as working |
| gym1 1 / gym1 2 / NAKE          | Reference assets only                  | Reference assets only                  | Never seeded as production members                                      |

## Deliberate functional differences

- The OTP uses six digits to match the implemented Supabase contract, rather than
  pretending a four-digit verification code works.
- Registration age requirements, truthful verification, approximate location,
  backend authorization and payment entitlements remain enforced.
- Intro copy does not promise bot-free matches or an unconfigured free month.
- Online/presence, delivery checkmarks, stories, microphone capture, contact sync
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
selection, exact discovery card/button dimensions, action payloads, filter saving,
match navigation, inbox search/unread metadata, gallery navigation and chat sending.
Test identities and photography are fulfilled only at the browser test network
boundary; the live app contains no fixture profiles. `tests/fixtures/` is not a
public asset folder.

Run with `E2E_BASE_URL` set to a running application. On Windows with Chrome
installed, set `E2E_BROWSER_CHANNEL=chrome`; CI uses installed Playwright Chromium.
Screenshots are written to ignored `test-results/`. Selected reviewed screenshots
are copied to `verification/` with their fixture limitations documented.
