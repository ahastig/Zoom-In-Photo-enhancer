const video = document.querySelector("#cameraFeed");
const startCameraButton = document.querySelector("#startCamera");
const switchCameraButton = document.querySelector("#switchCamera");
const startBoothButton = document.querySelector("#startBooth");
const retakeButton = document.querySelector("#retakeStrip");
const shotCount = document.querySelector("#shotCount");
const countdownLength = document.querySelector("#countdownLength");
const filterSelect = document.querySelector("#filterSelect");
const frameColor = document.querySelector("#frameColor");
const borderStyle = document.querySelector("#borderStyle");
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
    css: "grayscale(1) contrast(1.18) brightness(1.03)",
    canvas: "grayscale(1) contrast(1.18) brightness(1.03)",
    label: "Black and white",
  },
  warm: {
    css: "sepia(0.18) saturate(1.22) contrast(1.08) brightness(1.04)",
    canvas: "sepia(0.18) saturate(1.22) contrast(1.08) brightness(1.04)",
    label: "Warm glow",
  },
  cool: {
    css: "saturate(1.12) hue-rotate(178deg) contrast(1.05) brightness(1.03)",
    canvas: "saturate(1.12) hue-rotate(178deg) contrast(1.05) brightness(1.03)",
    label: "Cool flash",
  },
  vintage: {
    css: "sepia(0.48) contrast(1.1) brightness(1.05) saturate(0.86)",
    canvas: "sepia(0.48) contrast(1.1) brightness(1.05) saturate(0.86)",
    label: "Vintage film",
  },
  pop: {
    css: "saturate(1.65) contrast(1.18) brightness(1.05)",
    canvas: "saturate(1.65) contrast(1.18) brightness(1.05)",
    label: "Color pop",
  },
  noir: {
    css: "grayscale(1) contrast(1.42) brightness(0.95)",
    canvas: "grayscale(1) contrast(1.42) brightness(0.95)",
    label: "Noir booth",
  },
  blush: {
    css: "sepia(0.12) saturate(1.35) hue-rotate(315deg) brightness(1.07)",
    canvas: "sepia(0.12) saturate(1.35) hue-rotate(315deg) brightness(1.07)",
    label: "Blush pink",
  },
  sunset: {
    css: "sepia(0.28) saturate(1.55) hue-rotate(340deg) contrast(1.12)",
    canvas: "sepia(0.28) saturate(1.55) hue-rotate(340deg) contrast(1.12)",
    label: "Sunset",
  },
  dream: {
    css: "brightness(1.1) contrast(0.92) saturate(1.25)",
    canvas: "brightness(1.1) contrast(0.92) saturate(1.25)",
    label: "Dreamy soft",
  },
};

const borderStyles = {
  classic: "Classic clean",
  dotted: "Dotted lights",
  film: "Film strip",
  hearts: "Hearts",
  sparkle: "Sparkle frame",
  confetti: "Confetti",
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

const drawCoverVideo = (ctx, targetWidth, targetHeight, filterValue = "none") => {
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
  ctx.filter = filters[filterValue].canvas;
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

const getFrameInk = (background) => (background === "#111827" ? "#ffffff" : "#111827");

const drawHeart = (ctx, x, y, size, color) => {
  const top = size * 0.3;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + top);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + top);
  ctx.bezierCurveTo(x - size / 2, y + size * 0.62, x, y + size * 0.82, x, y + size);
  ctx.bezierCurveTo(x, y + size * 0.82, x + size / 2, y + size * 0.62, x + size / 2, y + top);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + top);
  ctx.fill();
  ctx.restore();
};

const drawStar = (ctx, x, y, outer, inner, color) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (point === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawBorderDecoration = (ctx, width, height, padding, style, ink) => {
  const accent = "#f43f5e";
  const gold = "#f59e0b";
  const blue = "#38bdf8";

  if (style === "dotted") {
    ctx.save();
    for (let x = 36; x < width; x += 58) {
      ctx.fillStyle = x % 116 === 36 ? accent : gold;
      ctx.beginPath();
      ctx.arc(x, 34, 12, 0, Math.PI * 2);
      ctx.arc(x, height - 34, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let y = 94; y < height - 94; y += 58) {
      ctx.fillStyle = y % 116 === 94 ? blue : accent;
      ctx.beginPath();
      ctx.arc(34, y, 10, 0, Math.PI * 2);
      ctx.arc(width - 34, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (style === "film") {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.fillRect(18, 18, 46, height - 36);
    ctx.fillRect(width - 64, 18, 46, height - 36);
    ctx.fillStyle = ink === "#ffffff" ? "#111827" : "#ffffff";
    for (let y = 42; y < height - 42; y += 72) {
      ctx.fillRect(31, y, 20, 34);
      ctx.fillRect(width - 51, y, 20, 34);
    }
    ctx.restore();
    return;
  }

  if (style === "hearts") {
    for (let x = padding / 2; x < width; x += 120) {
      drawHeart(ctx, x, 24, 30, accent);
      drawHeart(ctx, width - x, height - 54, 30, gold);
    }
    for (let y = 150; y < height - 150; y += 180) {
      drawHeart(ctx, 30, y, 28, accent);
      drawHeart(ctx, width - 30, y + 64, 28, gold);
    }
    return;
  }

  if (style === "sparkle") {
    for (let x = 52; x < width; x += 128) {
      drawStar(ctx, x, 42, 22, 9, gold);
      drawStar(ctx, width - x, height - 42, 20, 8, accent);
    }
    for (let y = 140; y < height - 140; y += 170) {
      drawStar(ctx, 34, y, 18, 7, blue);
      drawStar(ctx, width - 34, y + 60, 18, 7, gold);
    }
    return;
  }

  if (style === "confetti") {
    const colors = [accent, gold, blue, "#22c55e", "#a855f7"];
    ctx.save();
    for (let i = 0; i < 80; i += 1) {
      const edge = i % 4;
      const x = edge < 2 ? 32 + ((i * 71) % (width - 64)) : edge === 2 ? 36 : width - 36;
      const y = edge < 2 ? (edge === 0 ? 36 : height - 36) : 80 + ((i * 97) % (height - 160));
      ctx.translate(x, y);
      ctx.rotate((i * 29 * Math.PI) / 180);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-10, -4, 20, 8);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }
};

const drawImageWithFilter = (ctx, image, x, y, width, height, filterValue) => {
  ctx.save();
  ctx.filter = filters[filterValue].canvas;
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
};

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
  const filterValue = filterSelect.value;
  const filterLabel = filters[filterValue].label;
  const borderLabel = borderStyles[borderStyle.value];
  const ink = getFrameInk(frameColor.value);

  stripCanvas.width = width;
  stripCanvas.height = height;
  ctx.fillStyle = frameColor.value;
  ctx.fillRect(0, 0, width, height);
  drawBorderDecoration(ctx, width, height, padding, borderStyle.value, ink);

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 58px system-ui, sans-serif";
  ctx.fillText("POCKET PHOTO BOOTH", width / 2, padding + 38);
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleDateString(), width / 2, padding + 88);

  let y = padding + header;
  for (const shot of shots) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(padding + 10, y + 10, PHOTO_WIDTH, PHOTO_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(padding - 10, y - 10, PHOTO_WIDTH + 20, PHOTO_HEIGHT + 20);
    drawImageWithFilter(ctx, shot, padding, y, PHOTO_WIDTH, PHOTO_HEIGHT, filterValue);
    y += PHOTO_HEIGHT + gap;
  }

  ctx.fillStyle = "#f43f5e";
  drawRoundedLabel(ctx, filterLabel.toUpperCase(), width / 2 - 160, height - padding - 76, 320, 52);
  ctx.fillStyle = ink;
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText(borderLabel, width / 2, height - padding - 18);

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
  stripSummary.textContent = `${shots.length} shots - ${filterLabel} - ${borderLabel}`;
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
  borderStyle.disabled = running;
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

const renderExistingStrip = async () => {
  if (state.isRunning || state.captures.length === 0) {
    return;
  }

  stripSummary.textContent = "Updating style...";
  await renderStrip();
  setStatus("Photo strip updated", true);
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
filterSelect.addEventListener("change", () => {
  applyLiveFilter();
  renderExistingStrip();
});
frameColor.addEventListener("change", renderExistingStrip);
borderStyle.addEventListener("change", renderExistingStrip);
shareStripButton.addEventListener("click", shareStrip);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
