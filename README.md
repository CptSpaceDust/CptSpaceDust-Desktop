# CptSpaceDust Community Desktop

A fully custom Windows desktop client for the CptSpaceDust community. The interface is built with React and Electron; it does not embed or package the website. It connects directly to the existing Supabase backend and LiveKit voice service.

## Community features

- Custom login, signup, hCaptcha, email recovery, and password reset flow
- Introductions, ideas and voting, collaborations, crew directory, birthdays, and guidelines
- Meetup requests and personal meetup timeline
- Support the Captain checkout flow and supporter wall
- Profile editing and avatar upload
- Realtime direct and group messages, message requests, native desktop notifications, and LiveKit voice calls
- Optional 4–8 digit app-lock PIN, startup/minimize locking, attempt throttling, and background timeout

## Development

Requires Node.js 22 or newer.

```text
npm install
npm start
```

`npm start` builds the React renderer and starts Electron. `npm run dev` starts the live development client. Run `npm test` for the local app-lock checks. Build the Windows installer and portable executable with `npm run dist`.

## Required dashboard setup

Before distributing the app:

1. Add `cptspacedust://reset-password` to Supabase Auth's allowed redirect URLs.
2. Keep `cptspacedust-info.onrender.com` on the hCaptcha site's allowed hostnames. The desktop webview explicitly identifies itself with that existing community hostname.
3. Keep the existing Realtime publication enabled for the community, messaging, call, and notification tables.

The app uses the project's public anonymous client key. Never add a service-role or secret key to the renderer.

## Publishing updates

Automatic updates use public GitHub Releases at `CptSpaceDust/CptSpaceDust-Desktop`. The installed **Setup** edition checks after startup and every four hours, downloads an available update, and offers **Restart & install** in Desktop Settings. The portable edition intentionally does not self-update.

Before the first release, create that public repository and push this project, including `.github/workflows/release.yml`. For every later release:

1. Increase `version` in `package.json` and `package-lock.json`.
2. Commit and push the change.
3. Push a matching version tag such as `v1.1.0`.

The release workflow runs the tests and publishes the installer, blockmap, and `latest.yml`. GitHub draft releases must not be used because installed apps cannot see them.

The current Windows binaries are not Authenticode signed. Add a Windows code-signing certificate to the release process before broad public distribution to avoid SmartScreen warnings and give users a verifiable publisher identity.
