# Zoom Photo Enhancer

A mobile-friendly web app that uses the device camera to zoom in on an object,
captures the frame, enhances the image quality, and lets you save or share the
result on your phone.

## Features

- Live camera preview with back/front camera switching.
- Hardware camera zoom when the browser supports it, with a visual zoom fallback.
- Automatic enhancement for captured photos:
  - high-quality 2x upscaling,
  - sharpening,
  - contrast and brightness correction,
  - color boost.
- Save the enhanced photo as a JPEG.
- Share the enhanced photo through the phone share sheet when supported.
- Progressive web app manifest and service worker for installable/offline shell.

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


### Immediate free hosted URL

While GitHub Pages is waiting to be enabled or merged, the same static app is
available as a pinned free RawCDN-hosted copy at:

```text
https://rawcdn.githack.com/ahastig/Zoom-In-Photo-enhancer/f485fed91933d417530b42e110a52a753f64c2bd/index.html
```

Use this HTTPS URL on your phone to test camera access right away.


If the change is too subtle on a photo, move **Enhance strength** closer to
100%. Browser enhancement can sharpen, rebalance, and upscale the capture, but
it cannot recover detail that the camera sensor never captured.
