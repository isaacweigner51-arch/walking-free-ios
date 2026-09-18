# Walking Free — Larger iPhone UI V7

This project was reconstructed from the `V5.aab` Android App Bundle. It contains the exact compiled Walking Free V5 web app and a Capacitor iOS wrapper.

## Guided Breathing upgrade

The recovered Guided Breathing screen has been upgraded for iPhone with:

- Calm, Box, Deep Relax, and 60-second Craving Reset patterns
- 1, 3, 5, and 10-minute timed sessions
- Native iPhone haptic cues at each breathing-phase transition
- Isaac's five cleaned and gently softened recorded breathing cues
- Recorded cues enabled by default, with native iPhone speech as a fallback
- Playback audio configured to remain audible when the iPhone silent switch is on
- Large countdown, remaining time, completed cycles, and session progress
- Pause, resume, reset, completion feedback, and saved preferences
- Screen wake-lock support where available
- Reduced-motion support and VoiceOver-friendly labels

## iPhone layout upgrade

V5 also corrects the recovered Android interface for iPhone:

- Forces WKWebView to use mobile presentation at the device's actual width
- Slightly enlarges the interface so it no longer appears zoomed out
- Handles the top and bottom iPhone safe areas explicitly
- Raises the bottom navigation above the home indicator
- Leaves the home-gesture strip clear of navigation buttons and horizontal scrolling
- Adds enough page padding to keep content visible above the raised navigation

## Privacy Policy fix

V6 replaces the incorrect external generator link with the complete Privacy
Policy already bundled inside Walking Free. The policy opens within the app,
works without an outside website, respects iPhone safe areas, and includes a
visible **Back to Walking Free** button.

## Larger iPhone presentation

V7 increases the complete mobile interface from a 17px to a 19px base size,
making cards, headings, controls, spacing, and ordinary text roughly 19% larger
than the original recovered layout. Tiny labels that were hard-coded at 8–11px
are overridden separately so they no longer remain unusually small.

The patch source is retained in `scripts/guided-breathing-snippet.js` and can be reapplied with `npm run patch:breathing`.

## What was recovered

- The complete compiled Walking Free interface and application logic
- Styling, icons, header artwork, privacy policy, data-safety page, and store artwork
- App identifier: `com.walkingfree.app`
- App name: `Walking Free`
- Capacitor Updater integration used by the Android build

The original editable React source files were not present in the AAB. The recovered app can be built and tested on iPhone, but editing its application logic will be more difficult than it would be with the original source.

## Open it on the Mac

The `ios` folder has already been generated. After unzipping this archive on the Mac:

1. Open Terminal.
2. Type `cd `, drag the unzipped `WalkingFree-iOS-Larger-UI-v7` folder into Terminal, and press Return.
3. Run `npm install`.
4. Run `npx cap sync ios`.
5. Run `npx cap open ios`.

## Configure it in Xcode

1. Select the blue **App** project in the left sidebar.
2. Select the **App** target.
3. Open **Signing & Capabilities**.
4. Choose your Apple developer team.
5. Keep `com.walkingfree.app` if it is available to your Apple account. If Xcode reports that it is unavailable, change it to a unique identifier such as `com.isaacweigner.walkingfree`.
6. Select an iPhone or simulator and press the Play button.

For App Store submission, update the version/build number, confirm the app icons, complete Apple's privacy questions, create the app record in App Store Connect, then archive the app from Xcode.

## Important recovery note

Do not delete or rename files inside `dist/public`. Those are the recovered application build. If any of those files are replaced, run `npx cap sync ios` again before opening or rebuilding the Xcode project.
