const video = document.querySelector("#cameraFeed");
const canvas = document.querySelector("#captureCanvas");
const startButton = document.querySelector("#startCamera");
const switchButton = document.querySelector("#switchCamera");
const captureButton = document.querySelector("#capturePhoto");
const zoomControl = document.querySelector("#zoomControl");
const zoomValue = document.querySelector("#zoomValue");
const autoEnhance = document.querySelector("#autoEnhance");
const superResolution = document.querySelector("#superResolution");
const preview = document.querySelector("#enhancedPreview");
const previewFrame = document.querySelector(".preview-frame");
const downloadLink = document.querySelector("#downloadPhoto");
const shareButton = document.querySelector("#sharePhoto");
const statusText = document.querySelector("#cameraStatus");
const statusDot = document.querySelector("#cameraStatusDot");
const qualitySummary = document.querySelector("#qualitySummary");
const supportHint = document.querySelector("#supportHint");

const state = {
  facingMode: "environment",
  fallbackZoom: 1,
  imageBlob: null,
  imageFile: null,
  imageUrl: null,
  stream: null,
  supportsHardwareZoom: false,
  track: null,
};

const MAX_ENHANCED_PIXELS = 12000000;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const setStatus = (message, ready = false) => {
  statusText.textContent = message;
  statusDot.classList.toggle("ready", ready);
};

const stopCamera = () => {
  if (!state.stream) {
    return;
  }

  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  state.track = null;
};

const resetSavedImage = () => {
  if (state.imageUrl) {
    URL.revokeObjectURL(state.imageUrl);
  }

  state.imageBlob = null;
  state.imageFile = null;
  state.imageUrl = null;
  downloadLink.removeAttribute("href");
  downloadLink.classList.add("disabled");
  shareButton.disabled = true;
};

const updateZoomLabel = (value) => {
  zoomValue.value = `${Number(value).toFixed(1)}x`;
};

const applyFallbackZoom = (zoom) => {
  state.fallbackZoom = Number(zoom);
  video.style.transform = `scale(${state.fallbackZoom})`;
};

const setupZoomControl = () => {
  const capabilities = state.track?.getCapabilities?.() ?? {};
  const settings = state.track?.getSettings?.() ?? {};
  const hasHardwareZoom = Boolean(capabilities.zoom);
  state.supportsHardwareZoom = hasHardwareZoom;

  zoomControl.disabled = false;
  zoomControl.min = hasHardwareZoom ? capabilities.zoom.min : 1;
  zoomControl.max = hasHardwareZoom ? capabilities.zoom.max : 4;
  zoomControl.step = hasHardwareZoom ? capabilities.zoom.step || 0.1 : 0.1;
  zoomControl.value = hasHardwareZoom ? settings.zoom || capabilities.zoom.min : 1;
  updateZoomLabel(zoomControl.value);
  applyFallbackZoom(hasHardwareZoom ? 1 : zoomControl.value);
};

const startCamera = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("This browser does not support camera access");
    supportHint.textContent =
      "Try opening the app in a current mobile browser over HTTPS or localhost.";
    return;
  }

  stopCamera();
  resetSavedImage();
  setStatus("Requesting camera permission...");

  try {
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: state.facingMode },
        height: { ideal: 2160 },
        width: { ideal: 3840 },
      },
    };

    state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = state.stream;
    state.track = state.stream.getVideoTracks()[0];
    await video.play();

    setupZoomControl();
    captureButton.disabled = false;
    switchButton.disabled = false;
    setStatus("Camera ready", true);
  } catch (error) {
    console.error(error);
    setStatus("Camera could not be started");
    supportHint.textContent =
      "Check camera permission, then reload. Camera access also requires HTTPS outside localhost.";
  }
};

const switchCamera = async () => {
  state.facingMode = state.facingMode === "environment" ? "user" : "environment";
  await startCamera();
};

const setZoom = async (event) => {
  const zoom = Number(event.target.value);
  updateZoomLabel(zoom);

  if (state.supportsHardwareZoom) {
    try {
      await state.track.applyConstraints({ advanced: [{ zoom }] });
      video.style.transform = "scale(1)";
      return;
    } catch (error) {
      console.warn("Hardware zoom failed, using visual crop instead.", error);
      state.supportsHardwareZoom = false;
    }
  }

  applyFallbackZoom(zoom);
};

const drawZoomedFrame = (targetCanvas) => {
  const width = video.videoWidth || 1920;
  const height = video.videoHeight || 1080;
  const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
  const zoom = state.supportsHardwareZoom ? 1 : state.fallbackZoom;
  const sourceWidth = width / zoom;
  const sourceHeight = height / zoom;
  const sourceX = (width - sourceWidth) / 2;
  const sourceY = (height - sourceHeight) / 2;
  const requestedScale = superResolution.checked ? 2 : 1;
  const requestedPixels = sourceWidth * requestedScale * sourceHeight * requestedScale;
  const safeScale =
    requestedPixels > MAX_ENHANCED_PIXELS
      ? Math.sqrt(MAX_ENHANCED_PIXELS / (sourceWidth * sourceHeight))
      : requestedScale;

  targetCanvas.width = Math.round(sourceWidth * safeScale);
  targetCanvas.height = Math.round(sourceHeight * safeScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetCanvas.width,
    targetCanvas.height,
  );

  return ctx;
};

const enhanceImage = (ctx, width, height) => {
  const frame = ctx.getImageData(0, 0, width, height);
  const { data } = frame;
  const original = new Uint8ClampedArray(data);
  const amount = 0.62;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const center = original[index + channel] * (1 + 4 * amount);
        const top = original[((y - 1) * width + x) * 4 + channel] * amount;
        const bottom = original[((y + 1) * width + x) * 4 + channel] * amount;
        const left = original[(y * width + x - 1) * 4 + channel] * amount;
        const right = original[(y * width + x + 1) * 4 + channel] * amount;
        data[index + channel] = clamp(center - top - bottom - left - right, 0, 255);
      }
    }
  }

  for (let index = 0; index < data.length; index += 4) {
    let red = data[index];
    let green = data[index + 1];
    let blue = data[index + 2];
    const gray = red * 0.299 + green * 0.587 + blue * 0.114;

    red = gray + (red - gray) * 1.16;
    green = gray + (green - gray) * 1.16;
    blue = gray + (blue - gray) * 1.16;

    data[index] = clamp((red - 128) * 1.12 + 138, 0, 255);
    data[index + 1] = clamp((green - 128) * 1.12 + 138, 0, 255);
    data[index + 2] = clamp((blue - 128) * 1.12 + 138, 0, 255);
  }

  ctx.putImageData(frame, 0, 0);
};

const canvasToBlob = (targetCanvas) =>
  new Promise((resolve) => {
    targetCanvas.toBlob(resolve, "image/jpeg", 0.94);
  });

const captureAndEnhance = async () => {
  if (!state.stream) {
    return;
  }

  captureButton.disabled = true;
  captureButton.textContent = "Enhancing...";
  resetSavedImage();

  const ctx = drawZoomedFrame(canvas);

  if (autoEnhance.checked) {
    enhanceImage(ctx, canvas.width, canvas.height);
  }

  const blob = await canvasToBlob(canvas);
  if (!blob) {
    setStatus("Could not create the enhanced photo");
    captureButton.disabled = false;
    captureButton.textContent = "Capture & enhance";
    return;
  }

  state.imageBlob = blob;
  state.imageFile = new File([blob], "enhanced-photo.jpg", { type: "image/jpeg" });
  state.imageUrl = URL.createObjectURL(blob);

  preview.src = state.imageUrl;
  previewFrame.classList.add("has-image");
  downloadLink.href = state.imageUrl;
  downloadLink.classList.remove("disabled");
  shareButton.disabled = !navigator.canShare?.({ files: [state.imageFile] });
  qualitySummary.textContent = `${canvas.width} x ${canvas.height}px`;
  setStatus("Enhanced photo ready to save", true);
  captureButton.disabled = false;
  captureButton.textContent = "Capture & enhance";
};

const sharePhoto = async () => {
  if (!state.imageFile || !navigator.canShare?.({ files: [state.imageFile] })) {
    return;
  }

  try {
    await navigator.share({
      files: [state.imageFile],
      text: "Enhanced with Zoom Photo Enhancer",
      title: "Enhanced photo",
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      setStatus("Sharing failed. Try Save photo instead.", true);
    }
  }
};

startButton.addEventListener("click", startCamera);
switchButton.addEventListener("click", switchCamera);
captureButton.addEventListener("click", captureAndEnhance);
zoomControl.addEventListener("input", setZoom);
shareButton.addEventListener("click", sharePhoto);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
