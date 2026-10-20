# Mylab Android

Native Java WebView shell for the existing Next.js service. No GitHub token, login password or server secret is included in the app.

| Setting | Value |
| --- | --- |
| Application ID | `com.vacode.mylab` |
| Debug ID | `com.vacode.mylab.debug` |
| Version | `1.0.0` / code `1` |
| Android | 8.0+ (API 26), compile/target API 36 |
| JDK / Gradle / AGP | 17 / 8.13 / 8.13.0 |
| Production URL | `https://mylab-phi-lemon.vercel.app/` |

The production URL was verified against the Vercel project `ogw2/mylab`. The alternate `mylab-ogw2.vercel.app` and Git branch aliases redirect to Vercel SSO; they must not be embedded in a WebView or used as the app's start URL. This app does not bypass Vercel protection. If the production domain changes, update `BASE_URL` in `app/build.gradle` and rebuild.

## Behavior and security

- Only the exact configured HTTPS origin (default port or 443) stays inside the app. Other HTTP(S), email and telephone links go to the system handler. Unsupported schemes, credentials in URLs and malformed addresses are blocked.
- Opens user-initiated `target=_blank` links in the appropriate handler. Downloads go to the external browser, which has its own login session; private downloads can require browser login.
- First-party cookies persist in private app storage and flush on backgrounding; third-party cookies and Android backup are disabled. The existing password-based Mylab session works unchanged. Logging out uses the web's logout button. Clearing app storage logs out.
- Mylab currently has no OAuth flow. External browser cookies do not automatically transfer into WebView; adding OAuth requires a separate supported authentication handoff.
- JavaScript and DOM storage support Next.js. File/content access, mixed content, location and permission prompts are disabled. No native JavaScript bridge is exposed; TLS certificate errors are always cancelled. Debugging is enabled only in debug builds.
- Back first cancels an open HTML dialog (including direct-linked Issue details), then uses web history, then asks before closing. API 33+ uses the system back dispatcher.
- The native refresh button reloads the current page. Web data refresh remains manual. Full-page connection failures, HTTP failures, TLS errors and a 30-second page-load timeout show retry/home controls. API-level failures remain handled by the existing web UI.
- Rotation/process recreation saves web navigation history; native backgrounding flushes cookies without forcing refresh. Unsaved web form/React state after a full Activity/process recreation is not guaranteed. Android system bars, display cutouts and keyboard insets are applied to the content area.

## Build locally

Install JDK 17 and Android SDK `platforms;android-36` / `build-tools;36.0.0`, set `ANDROID_HOME` to the SDK, then:

```sh
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug
```

Debug APK: `app/build/outputs/apk/debug/app-debug.apk`. Debug builds use the standard debug key and the separate `.debug` application ID.

For signed release builds, configure these environment variables privately. Never commit the keystore or passwords:

```text
MYLAB_KEYSTORE_PATH=/absolute/path/to/mylab-upload.jks
MYLAB_KEYSTORE_PASSWORD=(private)
MYLAB_KEY_ALIAS=mylab-upload
MYLAB_KEY_PASSWORD=(private)
```

```sh
./gradlew testDebugUnitTest lintRelease assembleRelease bundleRelease
```

Outputs: `app/build/outputs/apk/release/app-release.apk` and `app/build/outputs/bundle/release/app-release.aab`.

Release tasks fail if signing is absent or only partially configured. Keep the **same key** and application ID for future APK updates and increase `versionCode` on every release. With Play App Signing, Google manages the install signing key and this key is used for uploads. An AAB is uploaded to a store; it cannot be installed directly on a device.

## GitHub Actions

`Android` runs debug compilation, unit tests and lint for Android PR changes and main pushes. Manual dispatch can also create signed release outputs from `main` after configuring repository secrets:

- `MYLAB_KEYSTORE_BASE64`: base64 representation of the private JKS (no line breaks).
- `MYLAB_KEYSTORE_PASSWORD`, `MYLAB_KEY_ALIAS`, `MYLAB_KEY_PASSWORD`.

Run the workflow with `release=true` to generate signed APK/AAB artifacts. No key is generated automatically on CI. Private key backups are delivered separately, not stored in the repository or published in artifacts. GitHub's normal artifact retention applies.

## Device verification checklist

- Fresh install opens the Mylab password login; login works and survives background/relaunch.
- Board, Issue detail/checklist, keyboard, scrolling and web manual refresh work at phone/tablet sizes.
- System Back closes a directly opened Issue dialog, returns through navigation and confirms exit at the root.
- GitHub links and attachments open outside the app; returning does not reload the dashboard.
- Offline/HTTP errors show retry; reconnecting recovers. Certificate errors never proceed.
- Rotation and process recreation keep trusted history; expired sessions return to web login.
- Install a higher-version APK signed with the same key over this build and confirm upgrade compatibility.

Build/security results and any unverified device behavior are recorded in `VALIDATION.md`. A successful build is not a real-device signoff. Issue #3 should remain open until the device checks are complete. No Play release is performed by this project.
