const video = document.querySelector("#cameraFeed");
const startCameraButton = document.querySelector("#startCamera");
const switchCameraButton = document.querySelector("#switchCamera");
const startBoothButton = document.querySelector("#startBooth");
const retakeButton = document.querySelector("#retakeStrip");
const shotCount = document.querySelector("#shotCount");
const countdownLength = document.querySelector("#countdownLength");
const filterSelect = document.querySelector("#filterSelect");
const frameColor = document.querySelector("#frameColor");
const countdown = document.querySelector("#countdown");
const flash = document.querySelector("#flash");
const captureCanvas = document.querySelector("#captureCanvas");
const stripCanvas = document.querySelector("#stripCanvas");
const thumbnailRow = document.querySelector("#thumbnailRow");
const stripPreview = document.querySelector("#stripPreview");
const stripImage = document.querySelector("#stripImage");
const downloadStrip = document.querySelector("#downloadStrip");
const shareStripButton = document.querySelector("#shareStrip");
const statusText = document.querySelector("#cameraStatus");
const statusDot = document.querySelector("#cameraStatusDot");
const stripSummary = document.querySelector("#stripSummary");

const state = {
  captures: [],
  facingMode: "user",
  imageFile: null,
  imageUrl: null,
  isRunning: false,
  stream: null,
};

const PHOTO_WIDTH = 900;
const PHOTO_HEIGHT = 675;
const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const filters = {
  none: {
    css: "none",
    canvas: "none",
    label: "Clean",
  },
  mono: {
    css: "grayscale(1) contrast(1.15)",
    canvas: "grayscale(1) contrast(1.15)",
    label: "Black and white",
  },
  warm: {
    css: "sepia(0.18) saturate(1.22) contrast(1.08) brightness(1.04)",
    canvas: "sepia(0.18) saturate(1.22) contrast(1.08) brightness(1.04)",
    label: "Warm",
  },
  cool: {
    css: "saturate(1.12) hue-rotate(178deg) contrast(1.05)",
    canvas: "saturate(1.12) hue-rotate(178deg) contrast(1.05)",
    label: "Cool",
  },
  vintage: {
    css: "sepia(0.45) contrast(1.08) brightness(1.04) saturate(0.9)",
    canvas: "sepia(0.45) contrast(1.08) brightness(1.04) saturate(0.9)",
    label: "Vintage",
  },
  pop: {
    css: "saturate(1.55) contrast(1.16) brightness(1.04)",
    canvas: "saturate(1.55) contrast(1.16) brightness(1.04)",
    label: "Color pop",
  },
};

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
};

const clearStripUrl = () => {
  if (state.imageUrl) {
    URL.revokeObjectURL(state.imageUrl);
  }

  state.imageFile = null;
  state.imageUrl = null;
  downloadStrip.removeAttribute("href");
  downloadStrip.classList.add("disabled");
  shareStripButton.disabled = true;
};

const resetStrip = () => {
  clearStripUrl();
  state.captures = [];
  thumbnailRow.innerHTML = "";
  stripImage.removeAttribute("src");
  stripPreview.classList.remove("has-strip");
  stripSummary.textContent = "No strip yet";
  retakeButton.disabled = true;
};

const applyLiveFilter = () => {
  video.style.filter = filters[filterSelect.value].css;
};

const startCamera = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("This browser does not support camera access");
    return;
  }

  stopCamera();
  setStatus("Requesting camera permission...");

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: state.facingMode },
        height: { ideal: 1440 },
        width: { ideal: 1920 },
      },
    });
    video.srcObject = state.stream;
    await video.play();

    applyLiveFilter();
    startBoothButton.disabled = false;
    switchCameraButton.disabled = false;
    setStatus("Camera ready", true);
  } catch (error) {
    console.error(error);
    setStatus("Camera could not be started");
  }
};

const switchCamera = async () => {
  state.facingMode = state.facingMode === "user" ? "environment" : "user";
  await startCamera();
};

const drawCoverVideo = (ctx, targetWidth, targetHeight) => {
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 960;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
  } else {
    cropHeight = sourceWidth / targetRatio;
  }

  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;

  ctx.save();
  ctx.filter = filters[filterSelect.value].canvas;
  if (state.facingMode === "user") {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    video,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  ctx.restore();
};

const flashScreen = async () => {
  flash.classList.remove("active");
  void flash.offsetWidth;
  flash.classList.add("active");
  await sleep(180);
};

const showCountdown = async (seconds) => {
  for (let remaining = seconds; remaining > 0; remaining -= 1) {
    countdown.textContent = String(remaining);
    await sleep(850);
  }
  countdown.textContent = "Pose";
  await sleep(250);
  countdown.textContent = "";
};

const capturePhoto = async () => {
  captureCanvas.width = PHOTO_WIDTH;
  captureCanvas.height = PHOTO_HEIGHT;
  const ctx = captureCanvas.getContext("2d");
  drawCoverVideo(ctx, PHOTO_WIDTH, PHOTO_HEIGHT);
  await flashScreen();
  return captureCanvas.toDataURL("image/jpeg", 0.94);
};

const addThumbnail = (src, index) => {
  const img = document.createElement("img");
  img.src = src;
  img.alt = `Photo booth shot ${index + 1}`;
  thumbnailRow.appendChild(img);
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const drawRoundedLabel = (ctx, text, x, y, width, height) => {
  const radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
};

const canvasToBlob = (targetCanvas) =>
  new Promise((resolve) => targetCanvas.toBlob(resolve, "image/jpeg", 0.94));

const renderStrip = async () => {
  const shots = await Promise.all(state.captures.map((src) => loadImage(src)));
  const padding = 62;
  const gap = 34;
  const header = 130;
  const footer = 118;
  const width = PHOTO_WIDTH + padding * 2;
  const height = padding + header + shots.length * PHOTO_HEIGHT + (shots.length - 1) * gap + footer;
  const ctx = stripCanvas.getContext("2d");

  stripCanvas.width = width;
  stripCanvas.height = height;
  ctx.fillStyle = frameColor.value;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = frameColor.value === "#111827" ? "#ffffff" : "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 58px system-ui, sans-serif";
  ctx.fillText("POCKET PHOTO BOOTH", width / 2, padding + 38);
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleDateString(), width / 2, padding + 88);

  let y = padding + header;
  for (const shot of shots) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(padding + 10, y + 10, PHOTO_WIDTH, PHOTO_HEIGHT);
    ctx.drawImage(shot, padding, y, PHOTO_WIDTH, PHOTO_HEIGHT);
    y += PHOTO_HEIGHT + gap;
  }

  const filterLabel = filters[filterSelect.value].label;
  ctx.fillStyle = "#f43f5e";
  drawRoundedLabel(ctx, filterLabel.toUpperCase(), width / 2 - 160, height - padding - 68, 320, 58);

  const blob = await canvasToBlob(stripCanvas);
  if (!blob) {
    throw new Error("Could not render photo strip");
  }

  clearStripUrl();
  state.imageFile = new File([blob], "photo-booth-strip.jpg", { type: "image/jpeg" });
  state.imageUrl = URL.createObjectURL(blob);
  stripImage.src = state.imageUrl;
  stripPreview.classList.add("has-strip");
  downloadStrip.href = state.imageUrl;
  downloadStrip.classList.remove("disabled");
  shareStripButton.disabled = !navigator.canShare?.({ files: [state.imageFile] });
  stripSummary.textContent = `${shots.length} shots - ${filterLabel}`;
  retakeButton.disabled = false;
};

const setControlsRunning = (running) => {
  state.isRunning = running;
  startBoothButton.disabled = running || !state.stream;
  startCameraButton.disabled = running;
  switchCameraButton.disabled = running || !state.stream;
  retakeButton.disabled = running || state.captures.length === 0;
  shotCount.disabled = running;
  countdownLength.disabled = running;
  filterSelect.disabled = running;
  frameColor.disabled = running;
};

const runBooth = async () => {
  if (!state.stream || state.isRunning) {
    return;
  }

  resetStrip();
  setControlsRunning(true);
  setStatus("Photo booth is running", true);

  try {
    const shots = Number(shotCount.value);
    const seconds = Number(countdownLength.value);

    for (let index = 0; index < shots; index += 1) {
      stripSummary.textContent = `Taking shot ${index + 1} of ${shots}`;
      await showCountdown(seconds);
      const src = await capturePhoto();
      state.captures.push(src);
      addThumbnail(src, index);
      await sleep(450);
    }

    stripSummary.textContent = "Building strip...";
    await renderStrip();
    setStatus("Photo strip ready", true);
  } catch (error) {
    console.error(error);
    setStatus("Photo booth failed. Try again.", Boolean(state.stream));
  } finally {
    countdown.textContent = "";
    setControlsRunning(false);
  }
};

const shareStrip = async () => {
  if (!state.imageFile || !navigator.canShare?.({ files: [state.imageFile] })) {
    return;
  }

  try {
    await navigator.share({
      files: [state.imageFile],
      text: "Made with Pocket Photo Booth",
      title: "Photo booth strip",
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      setStatus("Sharing failed. Try Save strip instead.", true);
    }
  }
};

startCameraButton.addEventListener("click", startCamera);
switchCameraButton.addEventListener("click", switchCamera);
startBoothButton.addEventListener("click", runBooth);
retakeButton.addEventListener("click", resetStrip);
filterSelect.addEventListener("change", applyLiveFilter);
shareStripButton.addEventListener("click", shareStrip);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
