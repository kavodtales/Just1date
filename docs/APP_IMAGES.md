# Editing Just1date app photography

The screens are React/React Native components. Mockups in `design/references`
and browser captures in `design/verification` are design and test evidence;
they are never rendered as full app screens.

## Staff workflow

1. Sign into the operations app at https://just1date-admin.vercel.app using an
   active ADMIN or SUPER_ADMIN account and complete authenticator verification.
2. Choose **App images** in the sidebar.
3. Select a welcome photo for Algorithm, Matches or Premium. A local preview
   appears before anything is uploaded or published.
4. Add a short description for screen readers and choose **Publish photo**.
   Use a portrait photograph without captions or app controls. JPEG, PNG and
   WebP are supported, up to 4 MB and at least 400 × 400 pixels.
5. Use **Restore original photo**, then **Confirm restore**, to return a slot
   to its original reference photography.

The web and updated native welcome screens fetch the same published slots.
They refresh every minute while mounted and retain bundled originals when the
service or an image is unavailable. Updating a published photo does not require
a new app build. Earlier APKs predating this feature need the updated release.
The original owner logo stays unchanged. Headings, descriptions, carousel dots,
navigation, forms, permission artwork, swipe feedback and hearts are code.

Selecting an image does not publish it. Failed uploads keep the live photo.
Publication uses a revision check; a stale editor must load the latest version
and deliberately publish again. Changes are recorded in `audit_logs`. Access
is checked by both the API and database. Moderators cannot publish app images.
Public consumers receive only published promotional photo URLs and descriptions;
private member and verification storage remains separate.

## Mutual-match behavior

The welcome carousel's **Matches** heading describes the product. The actual
celebration is a separate reusable component: `match-celebration.tsx` in both
web and mobile. Discovery and profile likes call the server. Only a response
with `matched: true` and a conversation ID opens the celebration. It composes
the two actual profile photos and coded heart elements. **Say hi** opens that
specific conversation; **Keep swiping** dismisses the celebration. A one-sided
like does not display a match.

Promotional image controls cannot replace member photos or manufacture matches.
Members upload their own profile photos through the existing reviewed workflow.

## Operations

Migration `202610200012_app_media.sql` adds the three-slot, RLS-protected table
and private `app-images` storage bucket. Anonymous reads use the API's limited
published projection, with one-hour signed URLs and no HTTP response caching.
Uploads decode the bytes, reject animation/invalid formats/oversized pixel
counts, rotate orientation, resize and re-encode JPEG without source metadata.
Failed publications clean up their unused uploads. Replaced images are removed
after the database commits; cleanup errors are logged for operations follow-up.
No direct client storage access or database write privileges are granted.

The application does not create a staff account automatically. An account owner
must complete the existing MFA-checked staff bootstrap process; no password or
staff role is exposed in public source.
