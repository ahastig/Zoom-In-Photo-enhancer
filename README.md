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
