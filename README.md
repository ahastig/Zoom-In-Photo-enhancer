# Pocket Photo Booth

A mobile-friendly web photo booth that uses the device camera to take a timed
set of photos, turns them into a classic photo strip, and lets you save or share
the finished image on your phone.

## Features

- Live camera preview with front/back camera switching.
- Countdown before every shot.
- 3, 4, or 6-photo booth sessions.
- Edit filters that can be changed after capture: clean, black and white, warm glow, cool flash, vintage film, color pop, noir booth, blush pink, sunset, and dreamy soft.
- Custom border styles: classic clean, dotted lights, film strip, hearts, sparkle frame, and confetti.
- Frame color choices for the finished strip.
- Thumbnail previews of each captured shot.
- Re-render the finished strip when the filter, frame color, or custom border changes.
- Save the finished strip as a JPEG.
- Share the strip through the mobile share sheet when supported.
- Progressive web app manifest and service worker for an installable app shell.

## Run locally

Because camera access requires a secure context, use `localhost` during local
development:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

For phone testing, deploy the files to any HTTPS static host or use a secure
tunnel to your local server.

## Free deployment

This repository includes a GitHub Pages workflow. After the changes are merged
to `main`, GitHub Actions publishes the app at:

```text
https://ahastig.github.io/Zoom-In-Photo-enhancer/
```

If the first deployment does not start automatically, open the repository
settings in GitHub, enable Pages with **GitHub Actions** as the source, and run
the **Deploy to GitHub Pages** workflow.

## Immediate free hosted URL

While GitHub Pages is waiting to be enabled or merged, the same static app is
available as a pinned free RawCDN copy at:

```text
https://rawcdn.githack.com/ahastig/Zoom-In-Photo-enhancer/305cdaa9540cf62d260be86f29e5d96e0f535c05/index.html
```
