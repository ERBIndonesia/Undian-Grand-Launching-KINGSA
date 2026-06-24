const MIN_NAMES = 1000;
const MAX_NAMES = 10000;
const STORAGE_KEY = "kingsa-slot-undian-v2";
const ROWS_IN_REEL = 7;

const state = {
  participants: [],
  availablePool: [],
  winners: [],
  rolling: false,
  stopping: false,
  reelTimer: null,
  audioContext: null,
  theme: localStorage.getItem("kingsa-theme") || "gold",
};

const el = {
  body: document.body,
  fileInput: document.getElementById("fileInput"),
  chooseFileBtn: document.getElementById("chooseFileBtn"),
  dropZone: document.getElementById("dropZone"),
  manualInput: document.getElementById("manualInput"),
  loadManualBtn: document.getElementById("loadManualBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  uniqueNames: document.getElementById("uniqueNames"),
  noRepeatWinner: document.getElementById("noRepeatWinner"),
  soundToggle: document.getElementById("soundToggle"),
  totalParticipants: document.getElementById("totalParticipants"),
  availableParticipants: document.getElementById("availableParticipants"),
  winnerCount: document.getElementById("winnerCount"),
  dataMessage: document.getElementById("dataMessage"),
  storageStatus: document.getElementById("storageStatus"),
  drawCount: document.getElementById("drawCount"),
  reelList: document.getElementById("reelList"),
  slotPanel: document.querySelector(".slot-panel"),
  winnerShowcase: document.getElementById("winnerShowcase"),
  winnerName: document.getElementById("winnerName"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  quickDrawBtn: document.getElementById("quickDrawBtn"),
  resetWinnersBtn: document.getElementById("resetWinnersBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  exportBtn: document.getElementById("exportBtn"),
  winnerList: document.getElementById("winnerList"),
  lastDrawTime: document.getElementById("lastDrawTime"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  themeBtn: document.getElementById("themeBtn"),
  confettiCanvas: document.getElementById("confettiCanvas"),
  winnerItemTemplate: document.getElementById("winnerItemTemplate"),
};

function init() {
  applyTheme();
  restoreState();
  bindEvents();
  updateUI();
  renderReel(state.participants.length ? randomNamesForReel() : defaultReelNames());
}

function bindEvents() {
  el.chooseFileBtn.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", handleFileInput);
  el.loadManualBtn.addEventListener("click", loadManualData);
  el.sampleBtn.addEventListener("click", loadSampleData);
  el.startBtn.addEventListener("click", startRolling);
  el.stopBtn.addEventListener("click", stopAndDraw);
  el.quickDrawBtn.addEventListener("click", quickDraw);
  el.resetWinnersBtn.addEventListener("click", resetWinners);
  el.clearAllBtn.addEventListener("click", clearAllData);
  el.exportBtn.addEventListener("click", exportWinners);
  el.fullscreenBtn.addEventListener("click", toggleFullscreenMode);
  el.themeBtn.addEventListener("click", toggleTheme);
  el.drawCount.addEventListener("input", updateDrawLimitMessage);
  el.noRepeatWinner.addEventListener("change", () => {
    syncAvailablePoolWithWinners(false);
    updateUI();
    renderReel(state.participants.length ? randomNamesForReel() : defaultReelNames());
    saveState();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    el.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      el.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    el.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      el.dropZone.classList.remove("dragging");
    });
  });

  el.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files?.[0];
    if (file) readUploadedFile(file);
  });

  window.addEventListener("beforeunload", saveState);
}

function applyTheme() {
  if (state.theme === "royal") {
    document.documentElement.setAttribute("data-theme", "royal");
    el.themeBtn.textContent = "Tema Royal";
  } else {
    document.documentElement.removeAttribute("data-theme");
    el.themeBtn.textContent = "Tema Gold";
  }
}

function toggleTheme() {
  state.theme = state.theme === "gold" ? "royal" : "gold";
  localStorage.setItem("kingsa-theme", state.theme);
  applyTheme();
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    state.participants = Array.isArray(saved.participants) ? saved.participants : [];
    state.winners = Array.isArray(saved.winners) ? saved.winners : [];
    if (Array.isArray(saved.availablePool)) {
      state.availablePool = saved.availablePool;
    } else {
      const winnerNames = new Set(state.winners.map((winner) => normalizeName(winner.name)));
      state.availablePool = state.participants.filter((name) => !winnerNames.has(normalizeName(name)));
    }
    el.noRepeatWinner.checked = saved.noRepeatWinner ?? true;
    el.uniqueNames.checked = saved.uniqueNames ?? true;
    el.soundToggle.checked = saved.soundToggle ?? true;
    el.drawCount.value = saved.drawCount || 1;
    syncAvailablePoolWithWinners(false);
  } catch (error) {
    console.warn("Gagal membaca localStorage", error);
  }
}

function saveState() {
  const payload = {
    participants: state.participants,
    availablePool: state.availablePool,
    winners: state.winners,
    noRepeatWinner: el.noRepeatWinner.checked,
    uniqueNames: el.uniqueNames.checked,
    soundToggle: el.soundToggle.checked,
    drawCount: Number(el.drawCount.value) || 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function handleFileInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  readUploadedFile(file);
  event.target.value = "";
}

function readUploadedFile(file) {
  const isSupported = /\.(csv|txt)$/i.test(file.name) || ["text/csv", "text/plain", "application/vnd.ms-excel"].includes(file.type);
  if (!isSupported) {
    setMessage("Format belum didukung. Gunakan file CSV atau TXT.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    importParticipants(text, `File berhasil dibaca: ${file.name}`);
  };
  reader.onerror = () => setMessage("File gagal dibaca. Coba file lain ya.", "error");
  reader.readAsText(file);
}

function loadManualData() {
  const text = el.manualInput.value.trim();
  if (!text) {
    setMessage("Paste nama dulu, minimal 1.000 baris.", "warning");
    return;
  }
  importParticipants(text, "Data manual berhasil dimuat.");
}

async function loadSampleData() {
  try {
    const response = await fetch("sample-names-1000.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("Sample file not found");
    const text = await response.text();
    importParticipants(text, "Sample 1.000 nama berhasil dimuat.");
  } catch (error) {
    const generated = generateSampleNames(1000).join("\n");
    importParticipants(generated, "Sample 1.000 nama berhasil dibuat otomatis.");
  }
}

function importParticipants(rawText, successMessage) {
  let names = parseNames(rawText);

  if (el.uniqueNames.checked) {
    names = uniqueByNormalizedName(names);
  }

  const validation = validateNames(names);
  if (!validation.ok) {
    state.participants = names;
    state.availablePool = names.slice();
    state.winners = [];
    saveState();
    updateUI();
    setMessage(validation.message, "error");
    return;
  }

  state.participants = names;
  state.availablePool = names.slice();
  state.winners = [];
  saveState();
  updateUI();
  renderReel(randomNamesForReel());
  setMessage(`${successMessage} Total data aktif: ${formatNumber(names.length)} nama.`, "success");
}

function parseNames(text) {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const firstRow = parseCsvLine(lines[0]);
  const headerIndex = firstRow.findIndex((cell) => normalizeName(cell) === "nama" || normalizeName(cell) === "name" || normalizeName(cell) === "peserta");
  const hasHeader = headerIndex >= 0;

  return lines
    .slice(hasHeader ? 1 : 0)
    .map((line) => {
      if (line.includes(",") || line.includes(";") || line.includes("\t")) {
        const columns = parseCsvLine(line);
        return (columns[hasHeader ? headerIndex : 0] || "").trim();
      }
      return line.trim();
    })
    .map(cleanName)
    .filter(Boolean);
}

function parseCsvLine(line) {
  const delimiter = detectDelimiter(line);
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    result.push;
    current += char;
  }

  result.push(current.trim());
  return result;
}

function detectDelimiter(line) {
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function cleanName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .replace(/^[\d.)\-\s]+/, "")
    .trim();
}

function normalizeName(name) {
  return cleanName(name).toLowerCase();
}

function uniqueByNormalizedName(names) {
  const seen = new Set();
  const unique = [];

  names.forEach((name) => {
    const key = normalizeName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(name);
  });

  return unique;
}

function validateNames(names) {
  if (names.length < MIN_NAMES) {
    return {
      ok: false,
      message: `Data masih kurang. Minimal ${formatNumber(MIN_NAMES)} nama, data terbaca ${formatNumber(names.length)} nama.`,
    };
  }

  if (names.length > MAX_NAMES) {
    return {
      ok: false,
      message: `Data terlalu banyak. Maksimal ${formatNumber(MAX_NAMES)} nama, data terbaca ${formatNumber(names.length)} nama.`,
    };
  }

  return { ok: true, message: "OK" };
}

function availableNames() {
  if (el.noRepeatWinner.checked) {
    return Array.isArray(state.availablePool) ? [...state.availablePool] : [];
  }
  return [...state.participants];
}

function syncAvailablePoolWithWinners(shouldSave = true) {
  const picked = new Set(state.winners.map((winner) => normalizeName(winner.name)));
  state.availablePool = state.participants.filter((name) => !picked.has(normalizeName(name)));
  if (shouldSave) saveState();
}

function canDraw() {
  return validateNames(state.participants).ok && availableNames().length > 0 && !state.rolling && !state.stopping;
}

function startRolling() {
  if (!validateNames(state.participants).ok) {
    setMessage(`Data peserta harus ${formatNumber(MIN_NAMES)}–${formatNumber(MAX_NAMES)} nama dulu.`, "error");
    return;
  }

  if (availableNames().length <= 0) {
    setMessage("Semua peserta sudah menang. Reset pemenang untuk mulai lagi.", "warning");
    return;
  }

  state.rolling = true;
  state.stopping = false;
  el.slotPanel.classList.add("rolling");
  el.startBtn.disabled = true;
  el.stopBtn.disabled = false;
  el.quickDrawBtn.disabled = true;
  el.winnerName.textContent = "ROLLING...";
  el.winnerShowcase.querySelector("p").textContent = "Slot sedang berjalan";
  setMessage("Slot berjalan. Tekan Stop & Pilih untuk menentukan pemenang.", "info");
  playTickLoop();

  clearInterval(state.reelTimer);
  state.reelTimer = setInterval(() => {
    renderReel(randomNamesForReel());
  }, 66);
}

async function stopAndDraw() {
  if (!state.rolling || state.stopping) return;
  state.stopping = true;
  state.rolling = false;
  clearInterval(state.reelTimer);
  el.stopBtn.disabled = true;
  el.slotPanel.classList.remove("rolling");

  const winners = selectWinners(getRequestedDrawCount());
  if (!winners.length) {
    setMessage("Tidak ada peserta tersedia untuk diundi.", "warning");
    updateUI();
    return;
  }

  await decelerateToWinner(winners[0]);
  registerWinners(winners);
  celebrate(winners[0]);
}

async function quickDraw() {
  if (!canDraw()) return;
  const winners = selectWinners(getRequestedDrawCount());
  if (!winners.length) return;

  state.stopping = true;
  el.startBtn.disabled = true;
  el.quickDrawBtn.disabled = true;
  el.stopBtn.disabled = true;

  await decelerateToWinner(winners[0], true);
  registerWinners(winners);
  celebrate(winners[0]);
}

function getRequestedDrawCount() {
  const raw = Number(el.drawCount.value) || 1;
  const available = availableNames().length;
  const count = Math.max(1, Math.min(raw, 100, available));
  el.drawCount.value = count;
  return count;
}

function selectWinners(count) {
  const pool = availableNames();
  const selected = [];

  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const winnerIndex = randomInt(pool.length);
    selected.push(pool[winnerIndex]);
    pool.splice(winnerIndex, 1);
  }

  return selected;
}

async function decelerateToWinner(finalWinner, isQuick = false) {
  const steps = isQuick ? 22 : 38;
  const baseDelay = isQuick ? 28 : 38;

  for (let index = 0; index < steps; index += 1) {
    const progress = index / steps;
    const delay = baseDelay + Math.pow(progress, 2.7) * 210;
    renderReel(randomNamesForReel(finalWinner, index === steps - 1));
    playBeep(280 + index * 8, 0.025, 0.035);
    await wait(delay);
  }

  renderReel(reelWithCenterWinner(finalWinner));
}

function registerWinners(winnerNames) {
  const timestamp = new Date();
  const records = winnerNames.map((name) => ({
    name,
    time: timestamp.toISOString(),
  }));

  state.winners.push(...records);
  syncAvailablePoolWithWinners(false);
  state.stopping = false;
  saveState();
  updateUI();
  renderWinners();

  const title = winnerNames.length === 1 ? "Pemenang Terpilih" : `${winnerNames.length} Pemenang Terpilih`;
  el.winnerShowcase.querySelector("p").textContent = title;
  el.winnerName.textContent = winnerNames[0];
  el.lastDrawTime.textContent = formatDateTime(timestamp);

  if (winnerNames.length > 1) {
    setMessage(`Berhasil memilih ${winnerNames.length} pemenang. Pemenang utama yang tampil di slot: ${winnerNames[0]}.`, "success");
  } else {
    setMessage(`Selamat untuk ${winnerNames[0]}!`, "success");
  }
}

function updateDrawLimitMessage() {
  const requested = Number(el.drawCount.value) || 1;
  const available = availableNames().length;
  if (requested > available && available > 0) {
    setMessage(`Jumlah pemenang disesuaikan dengan sisa peserta: ${formatNumber(available)} nama.`, "warning");
  }
}

function resetWinners() {
  if (!state.winners.length) {
    setMessage("Belum ada pemenang yang perlu di-reset.", "info");
    return;
  }

  const confirmed = confirm("Reset semua riwayat pemenang? Data peserta tetap aman.");
  if (!confirmed) return;

  state.winners = [];
  state.availablePool = state.participants.slice();
  saveState();
  updateUI();
  renderWinners();
  renderReel(randomNamesForReel());
  el.winnerName.textContent = "-";
  el.winnerShowcase.querySelector("p").textContent = "Pemenang akan tampil di sini";
  el.lastDrawTime.textContent = "Belum ada undian";
  setMessage("Riwayat pemenang berhasil di-reset.", "success");
}

function clearAllData() {
  const confirmed = confirm("Hapus semua data peserta dan riwayat pemenang dari browser ini?");
  if (!confirmed) return;

  state.participants = [];
  state.availablePool = [];
  state.winners = [];
  state.rolling = false;
  state.stopping = false;
  clearInterval(state.reelTimer);
  localStorage.removeItem(STORAGE_KEY);
  updateUI();
  renderWinners();
  renderReel(defaultReelNames());
  el.winnerName.textContent = "-";
  el.manualInput.value = "";
  el.lastDrawTime.textContent = "Belum ada undian";
  setMessage("Semua data sudah dihapus dari browser ini.", "success");
}

function exportWinners() {
  if (!state.winners.length) return;
  const rows = [["no", "nama", "waktu"]];
  state.winners.forEach((winner, index) => {
    rows.push([index + 1, winner.name, formatDateTime(new Date(winner.time))]);
  });

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pemenang-undian-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function getReelOffset() {
  const centerIndex = Math.floor(ROWS_IN_REEL / 2) + 1;
  const targetItem = el.reelList.querySelector(`li:nth-child(${centerIndex})`);
  const marker = el.slotPanel.querySelector(".center-marker");
  const mask = el.slotPanel.querySelector(".reel-mask");
  if (!targetItem || !marker || !mask) return 0;

  const targetCenter = targetItem.offsetTop + targetItem.offsetHeight / 2;
  const maskRect = mask.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const markerCenter = markerRect.top - maskRect.top + markerRect.height / 2;

  return Math.round(markerCenter - targetCenter);
}

function positionReel(offset, animate = true) {
  el.reelList.style.transition = animate ? "transform 0.08s linear" : "none";
  el.reelList.style.transform = `translateY(${offset}px)`;
}

function renderReel(names) {
  const safeNames = names.slice(0, ROWS_IN_REEL);
  while (safeNames.length < ROWS_IN_REEL) safeNames.push("KINGSA");

  el.reelList.innerHTML = safeNames
    .map((name) => `<li title="${escapeHtml(name)}">${escapeHtml(name)}</li>`)
    .join("");

  const baseOffset = getReelOffset();
  positionReel(baseOffset - 12, false);
  requestAnimationFrame(() => {
    positionReel(baseOffset, true);
  });
}

function randomNamesForReel(finalWinner = null, forceFinal = false) {
  if (forceFinal && finalWinner) return reelWithCenterWinner(finalWinner);

  const pool = namesForActiveReel();
  const names = [];
  for (let index = 0; index < ROWS_IN_REEL; index += 1) {
    names.push(pool[randomInt(pool.length)] || "KINGSA");
  }
  return names;
}

function reelWithCenterWinner(winner) {
  const pool = namesForActiveReel(winner);
  const names = [];
  for (let index = 0; index < ROWS_IN_REEL; index += 1) {
    names.push(pool[randomInt(pool.length)] || "KINGSA");
  }
  names[Math.floor(ROWS_IN_REEL / 2)] = winner;
  return names;
}

function namesForActiveReel(temporaryWinner = null) {
  if (!state.participants.length) return defaultReelNames();

  const pool = availableNames().filter((name) => normalizeName(name) !== normalizeName(temporaryWinner));
  if (pool.length) return pool;

  return temporaryWinner ? [temporaryWinner] : defaultReelNames();
}

function defaultReelNames() {
  return ["UPLOAD DATA DULU", "KINGSA", "HEBAT MULIA SEJAHTERA", "SIAP UNDIAN", "GOOD LUCK", "KLIK MULAI", "KLIK STOP"];
}

function renderWinners() {
  if (!state.winners.length) {
    el.winnerList.className = "winner-list empty";
    el.winnerList.innerHTML = "<p>Belum ada pemenang.</p>";
    return;
  }

  el.winnerList.className = "winner-list";
  el.winnerList.innerHTML = "";

  state.winners.forEach((winner, index) => {
    const node = el.winnerItemTemplate.content.cloneNode(true);
    node.querySelector(".winner-number").textContent = String(index + 1).padStart(2, "0");
    node.querySelector(".winner-person").textContent = winner.name;
    node.querySelector(".winner-time").textContent = formatDateTime(new Date(winner.time));
    el.winnerList.prepend(node);
  });
}

function updateUI() {
  const validation = validateNames(state.participants);
  const available = availableNames().length;
  const hasValidData = validation.ok;

  el.totalParticipants.textContent = formatNumber(state.participants.length);
  el.availableParticipants.textContent = formatNumber(available);
  el.winnerCount.textContent = formatNumber(state.winners.length);
  el.startBtn.disabled = !hasValidData || available <= 0 || state.rolling || state.stopping;
  el.quickDrawBtn.disabled = !hasValidData || available <= 0 || state.rolling || state.stopping;
  el.stopBtn.disabled = !state.rolling || state.stopping;
  el.exportBtn.disabled = state.winners.length <= 0;
  el.storageStatus.textContent = state.participants.length ? "Data Tersimpan" : "Local Ready";

  const maxDraw = Math.max(1, Math.min(100, available || 100));
  el.drawCount.max = String(maxDraw);

  if (!state.participants.length) {
    setMessage("Belum ada data peserta. Upload minimal 1.000 nama.", "info", false);
  } else if (!validation.ok) {
    setMessage(validation.message, "error", false);
  } else if (available <= 0) {
    setMessage("Semua peserta sudah masuk riwayat pemenang. Reset pemenang untuk mengundi lagi.", "warning", false);
  }

  renderWinners();
}

function setMessage(message, type = "info", shouldSave = true) {
  el.dataMessage.textContent = message;
  el.dataMessage.className = `message-box ${type}`;
  if (shouldSave) saveState();
}

function randomInt(max) {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let value;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  return value % max;
}

function formatNumber(number) {
  return new Intl.NumberFormat("id-ID").format(number || 0);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toggleFullscreenMode() {
  document.body.classList.toggle("fullscreen-mode");
  el.fullscreenBtn.textContent = document.body.classList.contains("fullscreen-mode") ? "Keluar Fullscreen" : "Mode Fullscreen";

  if (!document.fullscreenElement && document.body.classList.contains("fullscreen-mode")) {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  } else if (document.fullscreenElement && !document.body.classList.contains("fullscreen-mode")) {
    document.exitFullscreen?.().catch(() => undefined);
  }
}

function playTickLoop() {
  if (!el.soundToggle.checked) return;
  playBeep(420, 0.035, 0.025);
}

function getAudioContext() {
  if (!el.soundToggle.checked) return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!state.audioContext) state.audioContext = new AudioContext();
  return state.audioContext;
}

function playBeep(frequency = 440, duration = 0.05, volume = 0.04) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function celebrate(winner) {
  el.winnerName.textContent = winner;
  playBeep(620, 0.12, 0.075);
  setTimeout(() => playBeep(780, 0.14, 0.075), 140);
  setTimeout(() => playBeep(980, 0.18, 0.08), 280);
  launchConfetti();
}

function launchConfetti() {
  const canvas = el.confettiCanvas;
  const context = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  context.scale(dpr, dpr);

  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.25,
    size: 5 + Math.random() * 9,
    speedY: 2 + Math.random() * 5,
    speedX: -2 + Math.random() * 4,
    rotation: Math.random() * Math.PI,
    rotationSpeed: -0.2 + Math.random() * 0.4,
    life: 1,
  }));

  let frame = 0;
  function animate() {
    frame += 1;
    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.rotation += particle.rotationSpeed;
      particle.life -= 0.005;

      context.save();
      context.globalAlpha = Math.max(particle.life, 0);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      const gradient = context.createLinearGradient(-particle.size, -particle.size, particle.size, particle.size);
      gradient.addColorStop(0, "#fff3b0");
      gradient.addColorStop(0.5, "#f7d57d");
      gradient.addColorStop(1, "#b7832d");
      context.fillStyle = gradient;
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.65);
      context.restore();
    });

    if (frame < 240) {
      requestAnimationFrame(animate);
    } else {
      context.clearRect(0, 0, width, height);
    }
  }

  animate();
}

function generateSampleNames(count) {
  const firstNames = [
    "Ahmad", "Budi", "Citra", "Dewi", "Eko", "Fajar", "Galih", "Hana", "Indra", "Joko",
    "Kartika", "Laras", "Maya", "Nanda", "Putri", "Rizky", "Sari", "Teguh", "Utami", "Wahyu",
    "Yusuf", "Zahra", "Aulia", "Bagas", "Cahya", "Dimas", "Elsa", "Farhan", "Gita", "Hendra",
  ];
  const lastNames = [
    "Pratama", "Santoso", "Lestari", "Saputra", "Wibowo", "Hidayat", "Ramadhan", "Permata", "Nugroho", "Setiawan",
    "Anggraini", "Wijaya", "Maulana", "Kusuma", "Purnama", "Suryani", "Firmansyah", "Hermawan", "Saputri", "Kurniawan",
    "Mahardika", "Ananda", "Febriani", "Susanto", "Prasetyo", "Rahmawati", "Salsabila", "Gunawan", "Cahyono", "Aminah",
  ];

  const names = [];
  for (let index = 1; index <= count; index += 1) {
    const first = firstNames[(index - 1) % firstNames.length];
    const last = lastNames[Math.floor((index - 1) / firstNames.length) % lastNames.length];
    names.push(`${first} ${last} ${String(index).padStart(4, "0")}`);
  }
  return names;
}

init();
