# SH9 Start Page · Outlook Agenda & Időpontütközések · Add-on 1/3

## Scope and first-release status
- SH9's existing third **NAPTÁR** info-strip cell is now a tappable status button.
- Pressing the cell opens a Premium Glass, S24 Ultra-friendly **Agenda** drawer, grouped by local Budapest dates with a scrollable 14-day event timeline.
- Once authorized, it displays the next upcoming program and signals **overlapping blocked/tentative calendar intervals** with amber emphasis. An interval ending at 10:00 and another starting at 10:00 is **not** considered a conflict.
- Only the signed-in Outlook **primary Calendar** is queried; the separate birthdays calendar is not automatically combined.
- Private events are displayed as `Privát esemény`, with no private subject text.
- No event data is committed to a public repository, sent to Dropbox, exported, or stored as analytics. The token is stored in this browser tab's sessionStorage only and automatically expires; no refresh token is requested.

## Authentication and privacy (important)
SH9 GitHub Pages is a public static website and **cannot inherit the Outlook Calendar connection from ChatGPT**. This add-on includes a browser-only, read-only Microsoft Graph SPA Authorization Code + PKCE connection workflow. It does not include any Microsoft app client ID, email account or secret in source code.

Before the calendar can become **live**:
1. Register an application on the [Microsoft Entra admin center](https://entra.microsoft.com/) that supports **personal Microsoft accounts**.
2. Add a **Single-page application (SPA)** redirect URI exactly: `https://zsoltandmonika-cloud.github.io/berlet-app/sh9/`
3. Allow delegated permissions `Calendars.Read` and `User.Read` (plus standard `openid profile`). Do NOT generate, store or paste a client secret into the website.
4. Open the SH9 **NAPTÁR** tile on the website in Chrome/Edge/Samsung Internet, provide the **Application (client) ID** and the intended Outlook e-mail **locally on that browser**, and tap `Microsoft-belépés`.
5. Sign in and approve read-only consent. The client checks the signed-in account against the locally configured intended Outlook address before displaying events.
6. Verify the Agenda and conflict indicator on the actual device.

Do not paste a password, secret or raw OAuth token into ChatGPT, GitHub, or the SH9 settings. The application Client ID is a *public identifier*, not a secret.

## APK / S24 Ultra boundary
The current SH9 Light Browser packages the launcher HTML in the APK and intercepts the original URL. Its WebView opens external HTTPS auth pages in the system browser and **does not pass the resulting browser login back to its own WebView**. It would be misleading to claim the Outlook calendar is live inside that native container.

When `?sh9native=1`, this add-on keeps the calendar in honest *not connected* mode and shows the secure-native-auth bridge requirement; it provides a direct link to Outlook's Agenda in the external browser. For an integrated in-APK live calendar, implement and test native **MSAL Android + secure WebView bridge** or a private authenticated sync service before the next signed APK. This is one of three planned Start Page additions; no APK is built or released by this branch.

The old static `sh9/index.html` inside the installed test APK will not change until a new APK is built. The project CI bundling process copies the current launcher HTML and allows the new same-origin JS/CSS modules to load live.

## QA
- `node --test healthhub/tests/sh9-outlook-agenda.test.cjs`
- Existing SH9 Golden Standard tiles (9), nav (5), weather, namedays and Smart Travel tile routing remain unchanged.
- New workflow `.github/workflows/sh9-outlook-agenda-qa.yml` runs JS syntax and regression checks.
- Synthetic test events only; never publish real calendar records in GitHub.
