# Android implementation validation — 2026-10-21 (KST)

Issue: [#3](https://github.com/ogw07222-tech/mylab/issues/3). Base web revision: `406dec8ddd2dbb9e7efbe6e29431eeee72897e61`.

## Confirmed

| Check | Result |
| --- | --- |
| Production project / source | `ogw2/mylab`, latest main at investigation; Next.js source in repository root |
| Production URL | `https://mylab-phi-lemon.vercel.app/` returned HTTP 200 |
| Alternate aliases | `mylab-ogw2` and `mylab-git-main-ogw2` returned Vercel SSO redirects; app does not use them |
| Authentication design | Existing server password login + signed HttpOnly cookie, no OAuth in current Mylab |
| Clean Android build | `clean testDebugUnitTest lintRelease assembleRelease bundleRelease assembleDebug` passed |
| Navigation-policy tests | 3 tests passed, 0 skipped/failures/errors; checks exact HTTPS origin, ports, fragments, external routing, credentials, unsafe schemes and malformed URLs |
| Android release lint | Passed; no lint findings after removing an empty obsolete resource directory |
| Application identity | `com.vacode.mylab`, `1.0.0`, version code `1` |
| Platform / permissions | min API 26, target/compile API 36; only INTERNET permission |
| Release APK | `apksigner verify` passed, APK v2 signature, one RSA-3072 signer; release is not debuggable |
| Release AAB | `bundletool 1.18.2 validate` passed; JAR signature verified; version/SDK/manifest checked |
| AAB installation conversion | `bundletool build-apks --mode=universal` produced an APK; its signing certificate matched the standalone release APK |
| Upgrade signing identity | APK/AAB use the same persistent dedicated upload key; next releases must keep it and increase versionCode |
| Repository hygiene | No keystore/password/server tokens committed; Gradle distribution checksum pinned; `git diff --check` passed |
| Web scope | No changes to web/API/authentication implementation; web behavior is reused via WebView |

Public signing certificate SHA-256:

```text
d251fc826d9c49a17c24bb911188a370a1397493da39372dd5a9d2109c793ae8
```

`onBackPressed` is retained only for Android 8–12 compatibility. Android 13+ registers the native `OnBackInvokedDispatcher` callback; the lint suppression is limited to this legacy fallback method. The modern callback is the implemented path for Android 16 gestures. Monochrome launcher icons are defined in API-33 resource overrides; the older icon resources intentionally omit that newer element.

## Remaining device checks

No Android phone, emulator, or hardware acceleration device was available in this session, and the Mylab login password was not supplied. Consequently the following are **not verified**, and issue #3 remains open:

- Actual APK install/launch on a device and installation of an updated version over it.
- Password login, session persistence, logout and expiry within Android WebView.
- Authenticated board/Issue actions and direct-link detail Back behavior on a real WebView.
- External browser handoff, downloads, keyboard/insets and rotation across phone/tablet sizes.
- Runtime offline/reconnect, HTTP/TLS error screens, renderer recovery and process recreation.

No Play Console upload/release was performed. CI signed-release runs require the private signing secrets to be configured by the owner; the private backup is delivered separately.
