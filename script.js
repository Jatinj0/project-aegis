/* ==========================================================================
   1. PROCEDURAL AUDIO ENGINE (Resilient Context with Clean Stop & Reactivity)
   ========================================================================== */
let audioCtx = null;
let masterGain = null;
let droneGain = null;
let isPlayingAmbience = false;
let sfxEnabled = true;

// Real-time Audio Analyser for particle visual reactivity
let analyser = null;
let audioDataArray = null;

// Drone components
let oscRoot = null, oscTritone = null, oscShimmer = null;
let tapeLfo = null, tapeLfoGain = null, filterNode = null, tensionTimer = null;

// Ensure audio context is unlocked on modern browsers
function ensureAudioReady() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

    // Attach real-time frequency analyser
    try {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      audioDataArray = new Uint8Array(analyser.frequencyBinCount);
      masterGain.connect(analyser);
    } catch (e) {
      console.warn('Analyser setup skipped:', e);
    }

    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/* --- 1A. Suspicious Psychological Horror Soundscape (Clean Stop & Restart) --- */
function startSuspiciousMusic() {
  ensureAudioReady();
  stopSuspiciousMusic();

  droneGain = audioCtx.createGain();
  droneGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 2.0);
  droneGain.connect(masterGain);

  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(280, audioCtx.currentTime);

  // 1. Root Drone (36.71 Hz)
  oscRoot = audioCtx.createOscillator();
  oscRoot.type = 'sawtooth';
  oscRoot.frequency.setValueAtTime(36.71, audioCtx.currentTime);

  // 2. Unsettling Tritone (51.91 Hz)
  oscTritone = audioCtx.createOscillator();
  oscTritone.type = 'triangle';
  oscTritone.frequency.setValueAtTime(51.91, audioCtx.currentTime);

  // 3. Eerie Waterphone / Ghost Shimmer (584 Hz)
  oscShimmer = audioCtx.createOscillator();
  oscShimmer.type = 'sine';
  oscShimmer.frequency.setValueAtTime(584.2, audioCtx.currentTime);
  const shimmerGain = audioCtx.createGain();
  shimmerGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
  oscShimmer.connect(shimmerGain);
  shimmerGain.connect(filterNode);

  // 4. Detuning Tape Warble LFO
  tapeLfo = audioCtx.createOscillator();
  tapeLfo.frequency.setValueAtTime(0.2, audioCtx.currentTime);
  tapeLfoGain = audioCtx.createGain();
  tapeLfoGain.gain.setValueAtTime(2.2, audioCtx.currentTime);
  tapeLfo.connect(tapeLfoGain);
  tapeLfoGain.connect(oscTritone.frequency);

  oscRoot.connect(filterNode);
  oscTritone.connect(filterNode);
  filterNode.connect(droneGain);

  oscRoot.start();
  oscTritone.start();
  oscShimmer.start();
  tapeLfo.start();

  // Reset tension timer
  if (tensionTimer) clearInterval(tensionTimer);
  tensionTimer = setInterval(() => {
    if (isPlayingAmbience && audioCtx && audioCtx.state === 'running') {
      playTensionCreak();
    }
  }, 8500);

  isPlayingAmbience = true;
  updateAmbienceUI(true);
}

function playTensionCreak() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const creakOsc = audioCtx.createOscillator();
  const creakGain = audioCtx.createGain();
  const creakFilter = audioCtx.createBiquadFilter();

  creakFilter.type = 'bandpass';
  creakFilter.frequency.setValueAtTime(850 + Math.random() * 500, now);
  creakFilter.Q.setValueAtTime(5.0, now);

  creakOsc.type = 'sawtooth';
  creakOsc.frequency.setValueAtTime(130 + Math.random() * 30, now);
  creakOsc.frequency.exponentialRampToValueAtTime(310 + Math.random() * 60, now + 1.8);

  creakGain.gain.setValueAtTime(0.001, now);
  creakGain.gain.exponentialRampToValueAtTime(0.03, now + 0.5);
  creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

  creakOsc.connect(creakFilter);
  creakFilter.connect(creakGain);
  creakGain.connect(masterGain);

  creakOsc.start(now);
  creakOsc.stop(now + 2.0);
}

function stopSuspiciousMusic() {
  if (tensionTimer) {
    clearInterval(tensionTimer);
    tensionTimer = null;
  }

  isPlayingAmbience = false;
  updateAmbienceUI(false);

  if (!audioCtx || !droneGain) return;

  try {
    const now = audioCtx.currentTime;
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setValueAtTime(droneGain.gain.value, now);
    droneGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
  } catch (e) {
    droneGain.gain.value = 0;
  }

  setTimeout(() => {
    try {
      if (oscRoot) { oscRoot.stop(); oscRoot.disconnect(); oscRoot = null; }
      if (oscTritone) { oscTritone.stop(); oscTritone.disconnect(); oscTritone = null; }
      if (oscShimmer) { oscShimmer.stop(); oscShimmer.disconnect(); oscShimmer = null; }
      if (tapeLfo) { tapeLfo.stop(); tapeLfo.disconnect(); tapeLfo = null; }
      if (droneGain) { droneGain.disconnect(); droneGain = null; }
    } catch (e) {}
  }, 350);
}

/* --- 1B. Audible Terminal Keystroke Typing Sound --- */
function playTypingSound() {
  if (!sfxEnabled) return;
  try {
    ensureAudioReady();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const freq = 1400 + Math.random() * 900;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}

/* --- 1C. Tactile Button Click Sound --- */
function playButtonClickSound() {
  if (!sfxEnabled) return;
  try {
    ensureAudioReady();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
}

/* --- 1D. Suspicious Submission Stinger --- */
function playSubmissionSound() {
  try {
    ensureAudioReady();
    const now = audioCtx.currentTime;

    const boomOsc = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(95, now);
    boomOsc.frequency.exponentialRampToValueAtTime(20, now + 1.5);

    boomGain.gain.setValueAtTime(0.35, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    boomOsc.connect(boomGain);
    boomGain.connect(masterGain);
    boomOsc.start(now);
    boomOsc.stop(now + 1.6);

    const chimeOsc = audioCtx.createOscillator();
    const chimeGain = audioCtx.createGain();
    chimeOsc.type = 'sawtooth';
    chimeOsc.frequency.setValueAtTime(587.33, now);
    chimeOsc.frequency.exponentialRampToValueAtTime(130.81, now + 1.9);

    const chimeFilter = audioCtx.createBiquadFilter();
    chimeFilter.type = 'lowpass';
    chimeFilter.frequency.setValueAtTime(450, now);

    chimeGain.gain.setValueAtTime(0.12, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

    chimeOsc.connect(chimeFilter);
    chimeFilter.connect(chimeGain);
    chimeGain.connect(masterGain);

    chimeOsc.start(now);
    chimeOsc.stop(now + 1.9);
  } catch (e) {}
}

/* ==========================================================================
   2. UI CONTROLS & AUTO-UNLOCK
   ========================================================================== */
function updateAmbienceUI(active) {
  const audioDot = document.getElementById('audioDot');
  const audioText = document.getElementById('audioText');
  if (!audioDot || !audioText) return;

  if (active) {
    audioDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-pulse pointer-events-none';
    audioText.textContent = 'AMBIENCE: ON';
    audioText.classList.add('text-rose-400');
  } else {
    audioDot.className = 'w-2 h-2 rounded-full bg-slate-600 pointer-events-none';
    audioText.textContent = 'AMBIENCE: OFF';
    audioText.classList.remove('text-rose-400');
  }
}

// Global click and typing audio hooks
document.addEventListener('keydown', (e) => {
  ensureAudioReady();
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    playTypingSound();
    if (typeof triggerShockwave === 'function') {
      triggerShockwave(window.innerWidth / 2, window.innerHeight * 0.75, 0.25);
    }
  }
});

// Auto-start Suspicious Music on the very first user interaction
function autoStartAudioOnFirstInteraction() {
  ensureAudioReady();
  if (!isPlayingAmbience) {
    startSuspiciousMusic();
  }
  window.removeEventListener('click', autoStartAudioOnFirstInteraction);
  window.removeEventListener('keydown', autoStartAudioOnFirstInteraction);
  window.removeEventListener('scroll', autoStartAudioOnFirstInteraction);
}
window.addEventListener('click', autoStartAudioOnFirstInteraction, { once: true });
window.addEventListener('keydown', autoStartAudioOnFirstInteraction, { once: true });
window.addEventListener('scroll', autoStartAudioOnFirstInteraction, { once: true });

// Setup interactive button handlers
document.addEventListener('DOMContentLoaded', () => {
  const audioToggle = document.getElementById('audioToggle');
  const sfxToggle = document.getElementById('sfxToggle');

  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      ensureAudioReady();
      playButtonClickSound();
      if (!isPlayingAmbience) {
        startSuspiciousMusic();
      } else {
        stopSuspiciousMusic();
      }
    });
  }

  if (sfxToggle) {
    sfxToggle.addEventListener('click', () => {
      ensureAudioReady();
      sfxEnabled = !sfxEnabled;
      const sfxDot = document.getElementById('sfxDot');
      const sfxText = document.getElementById('sfxText');

      if (sfxEnabled) {
        if (sfxDot) sfxDot.className = 'w-2 h-2 rounded-full bg-emerald-500 pointer-events-none';
        if (sfxText) {
          sfxText.textContent = 'SFX: ON';
          sfxText.classList.add('text-emerald-400');
        }
        playButtonClickSound();
      } else {
        if (sfxDot) sfxDot.className = 'w-2 h-2 rounded-full bg-slate-600 pointer-events-none';
        if (sfxText) {
          sfxText.textContent = 'SFX: OFF';
          sfxText.classList.remove('text-emerald-400');
        }
      }
    });
  }

  // Click sounds for all interactive buttons & selects
  document.querySelectorAll('button, select').forEach(el => {
    if (el.id !== 'audioToggle' && el.id !== 'sfxToggle') {
      el.addEventListener('click', () => {
        playButtonClickSound();
      });
    }
  });

  // Archetype preset injectors
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const insertText = btn.getAttribute('data-text');
      const reasonEl = document.getElementById('reason');
      if (reasonEl) {
        if (!reasonEl.value.trim()) {
          reasonEl.value = insertText;
        } else {
          reasonEl.value += ' ' + insertText;
        }
        updateCount();
        if (typeof updateThreatVector === 'function') {
          updateThreatVector(reasonEl.value);
        }
        reasonEl.focus();
      }
    });
  });
});

/* ==========================================================================
   3. POPULATE DAY & YEAR DROPDOWNS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const dobDaySelect = document.getElementById('dobDay');
  if (dobDaySelect) {
    dobDaySelect.innerHTML = '<option value="" class="bg-panel text-slate-400">Day</option>';
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      const val = d < 10 ? '0' + d : String(d);
      opt.value = val;
      opt.textContent = val;
      opt.className = 'bg-panel text-slate-200';
      dobDaySelect.appendChild(opt);
    }
  }

  const dobYearSelect = document.getElementById('dobYear');
  if (dobYearSelect) {
    dobYearSelect.innerHTML = '<option value="" class="bg-panel text-slate-400">Year</option>';
    for (let y = 2026; y >= 1935; y--) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      opt.className = 'bg-panel text-slate-200';
      dobYearSelect.appendChild(opt);
    }
    const optOlder = document.createElement('option');
    optOlder.value = 'Before 1935';
    optOlder.textContent = 'Before 1935';
    optOlder.className = 'bg-panel text-slate-200';
    dobYearSelect.appendChild(optOlder);
  }
});

/* ==========================================================================
   4. AUDIO-REACTIVE CANVAS ASH, EMBER & SHOCKWAVE ENGINE
   ========================================================================== */
let shockwaveActive = false;
let shockwaveRadius = 0;
let shockwaveOrigin = { x: 0, y: 0 };
let particles = [];

function triggerShockwave(originX, originY, intensity = 1.0) {
  shockwaveActive = true;
  shockwaveRadius = 10;
  shockwaveOrigin = {
    x: originX || window.innerWidth / 2,
    y: originY || window.innerHeight / 2
  };

  particles.forEach(p => {
    const dx = p.x - shockwaveOrigin.x;
    const dy = p.y - shockwaveOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (Math.max(0, 600 - dist) / 600) * 14 * intensity;
    p.vx = (dx / dist) * force + (Math.random() - 0.5) * 2;
    p.vy = (dy / dist) * force - Math.random() * 3;
    p.radius = Math.min(p.baseRadius * 2.5, 6);
  });
}
window.triggerShockwave = triggerShockwave;

const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  class AshParticle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.baseRadius = Math.random() * 1.8 + 0.4;
      this.radius = this.baseRadius;
      this.speedY = -Math.random() * 0.4 - 0.08;
      this.speedX = (Math.random() - 0.5) * 0.2;
      this.vx = 0;
      this.vy = 0;
      this.alpha = Math.random() * 0.35 + 0.08;
      this.color = Math.random() > 0.85 ? '225, 29, 72' : '100, 116, 139';
    }
    update(audioBoost) {
      this.y += (this.speedY + this.vy) - (audioBoost * 1.8);
      this.x += (this.speedX + this.vx);

      if (this.vx) this.vx *= 0.94;
      if (this.vy) this.vy *= 0.94;

      if (this.y < -10 || this.x < -20 || this.x > width + 20) {
        this.reset();
        this.y = height + 10;
      }
    }
    draw(audioBoost) {
      const reactiveRadius = Math.max(0.2, this.radius * (1 + audioBoost * 0.8));
      const reactiveAlpha = Math.min(1.0, this.alpha + (audioBoost * 0.25));

      ctx.beginPath();
      ctx.arc(this.x, this.y, reactiveRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${reactiveAlpha})`;
      ctx.shadowBlur = 4 + (audioBoost * 12);
      ctx.shadowColor = `rgba(${this.color}, ${0.4 + audioBoost * 0.4})`;
      ctx.fill();
    }
  }

  const particleCount = Math.min(Math.floor(window.innerWidth / 20), 65);
  for (let i = 0; i < particleCount; i++) {
    particles.push(new AshParticle());
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);

    let audioBoost = 0;
    if (analyser && audioDataArray) {
      analyser.getByteFrequencyData(audioDataArray);
      const lowFreqSum = audioDataArray[1] + audioDataArray[2] + audioDataArray[3];
      audioBoost = (lowFreqSum / 3) / 255;
    }

    if (shockwaveActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(shockwaveOrigin.x, shockwaveOrigin.y, shockwaveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(225, 29, 72, ${Math.max(0, 1 - shockwaveRadius / 600)})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(225, 29, 72, 0.8)';
      ctx.stroke();
      ctx.restore();

      shockwaveRadius += 18;
      if (shockwaveRadius > 600) {
        shockwaveActive = false;
      }
    }

    for (let i = 0; i < particles.length; i++) {
      particles[i].update(audioBoost);
      particles[i].draw(audioBoost);
    }

    requestAnimationFrame(renderParticles);
  }
  renderParticles();
}

/* ==========================================================================
   5. FORM SUBMISSION, DOSSIER GENERATOR & GOOGLE APPS SCRIPT WEBHOOK
   ========================================================================== */
const GOOGLE_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbx44vRvB8utPOI03GMsfZFebb8PxefuHXRdTS78kuxpaQJfPhhVQ8FCuPg1PYWicjJP/exec";

function updateCount() {
  const reason = document.getElementById('reason');
  const charCounter = document.getElementById('charCounter');
  if (reason && charCounter) {
    charCounter.textContent = `${reason.value.length} characters logged`;
  }
}

// Procedural Dossier Token Generator
function generateDossierToken(name) {
  const sectors = ['ALPHA', 'SIGMA', 'DELTA', 'OMEGA', 'NEXUS', 'VOID', 'EPSILON'];
  const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString().replace('T', ' // ').slice(0, 22) + ' UTC';

  return {
    subjectId: `AEGIS-SUB-${randomNum}//${randomSector}`,
    timestamp: now,
    formattedText: `[PROJECT AEGIS // ARCHIVED DOSSIER]\nSUBJECT: ${name.toUpperCase()}\nID: AEGIS-SUB-${randomNum}//${randomSector}\nTIMESTAMP: ${now}\nCLEARANCE: COMMITTED TO EXPERIMENTAL CORE`
  };
}

// Threat Vector Classification Engine
const threatClassifications = [
  {
    regex: /(sacrifice|shield|protect|save|fall for|give life|martyr)/i,
    label: "MARTYRDOM DIRECTIVE",
    color: "#f43f5e",
    dot: "bg-rose-500"
  },
  {
    regex: /(time|age|old|forgotten|decay|slow|rot|entropy)/i,
    label: "ENTROPIC OBSOLESCENCE",
    color: "#eab308",
    dot: "bg-yellow-500"
  },
  {
    regex: /(void|singularity|abyss|crush|black hole|vacuum|oblivion)/i,
    label: "GRAVITATIONAL SINGULARITY",
    color: "#a855f7",
    dot: "bg-purple-500"
  },
  {
    regex: /(blast|burn|fire|explosion|ashes|incinerat|vaporiz|nuke)/i,
    label: "CATASTROPHIC INCINERATION",
    color: "#f97316",
    dot: "bg-orange-500"
  },
  {
    regex: /(peace|sleep|quiet|rest|settle|tired|exhaust|walk away)/i,
    label: "VOLUNTARY TERMINATION",
    color: "#38bdf8",
    dot: "bg-sky-400"
  }
];

function updateThreatVector(text) {
  const labelEl = document.getElementById("threatClassification");
  const dotEl = document.getElementById("threatDot");
  if (!labelEl || !dotEl) return;

  if (!text.trim() || text.length < 5) {
    labelEl.textContent = "AWAITING TELEMETRY...";
    labelEl.style.color = "#94a3b8";
    dotEl.className = "w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse";
    return;
  }

  const matched = threatClassifications.find(item => item.regex.test(text));

  if (matched) {
    labelEl.textContent = matched.label;
    labelEl.style.color = matched.color;
    dotEl.className = `w-1.5 h-1.5 rounded-full ${matched.dot} animate-ping`;
    setTimeout(() => {
      dotEl.className = `w-1.5 h-1.5 rounded-full ${matched.dot}`;
    }, 400);
  } else {
    labelEl.textContent = "ANOMALOUS PATHWAY";
    labelEl.style.color = "#34d399";
    dotEl.className = "w-1.5 h-1.5 rounded-full bg-emerald-400";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const heroForm = document.getElementById('heroForm');
  const reason = document.getElementById('reason');

  if (reason) {
    reason.addEventListener('input', () => {
      updateCount();
      updateThreatVector(reason.value);
    });

    // Quick Submit Shortcut (Cmd/Ctrl + Enter) from narrative field
    reason.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (heroForm) {
          heroForm.requestSubmit();
        }
      }
    });
  }

  if (heroForm) {
    heroForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName');
      const email = document.getElementById('email');
      const reasonEl = document.getElementById('reason');
      const nameError = document.getElementById('nameError');
      const emailError = document.getElementById('emailError');
      const reasonError = document.getElementById('reasonError');
      const submitBtn = document.getElementById('submitBtn');
      const btnSpinner = document.getElementById('btnSpinner');
      const btnText = document.getElementById('btnText');
      const successModal = document.getElementById('successModal');
      const successSubject = document.getElementById('successSubject');
      const welcomeBtnText = document.getElementById('welcomeBtnText');

      let isValid = true;

      // Validate name
      if (!fullName.value.trim()) {
        if (nameError) nameError.classList.remove('hidden');
        fullName.classList.add('border-rose-500');
        isValid = false;
      } else {
        if (nameError) nameError.classList.add('hidden');
        fullName.classList.remove('border-rose-500');
      }

      // Validate email (if filled)
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        if (emailError) emailError.classList.remove('hidden');
        email.classList.add('border-rose-500');
        isValid = false;
      } else {
        if (emailError) emailError.classList.add('hidden');
        email.classList.remove('border-rose-500');
      }

      // Validate reason
      if (!reasonEl.value.trim()) {
        if (reasonError) reasonError.classList.remove('hidden');
        reasonEl.classList.add('border-rose-500');
        isValid = false;
      } else {
        if (reasonError) reasonError.classList.add('hidden');
        reasonEl.classList.remove('border-rose-500');
      }

      if (!isValid) return;

      // Play submission sound & blast shockwave
      playSubmissionSound();
      if (typeof triggerShockwave === 'function') {
        triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, 2.2);
      }

      // Trigger CRT Screen Glitch Transition
      document.body.classList.add('glitch-active');
      setTimeout(() => document.body.classList.remove('glitch-active'), 450);

      // Assemble Date of Genesis
      const selectedDay = document.getElementById('dobDay')?.value || '';
      const selectedMonth = document.getElementById('dobMonth')?.value || '';
      const selectedYear = document.getElementById('dobYear')?.value || '';

      let combinedDob = 'Unspecified';
      if (selectedYear === 'Before 1935') {
        combinedDob = (selectedMonth && selectedDay)
          ? `${selectedMonth}-${selectedDay} (Before 1935)`
          : 'Before 1935';
      } else if (selectedYear && selectedMonth && selectedDay) {
        combinedDob = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      } else if (selectedYear || selectedMonth || selectedDay) {
        combinedDob = [selectedDay, selectedMonth, selectedYear].filter(Boolean).join('/');
      }

      // Read Feature Consent Checkbox
      const featureCheckbox = document.getElementById('featureConsent');
      const isFeatureApproved = featureCheckbox ? featureCheckbox.checked : false;
      const consentString = isFeatureApproved ? 'Yes' : 'No';

      const payload = {
        fullName: fullName.value.trim(),
        email: email.value.trim() || 'N/A',
        phone: document.getElementById('phone')?.value.trim() || 'N/A',
        dob: combinedDob,
        city: document.getElementById('city')?.value.trim() || 'Unspecified Sector',
        employment: document.getElementById('employment')?.value || 'Unspecified',
        reason: reasonEl.value.trim(),
        featureConsent: consentString
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        if (btnText) btnText.textContent = 'COMMITTING DEMISE TELEMETRY...';
      }

      try {
        await fetch(GOOGLE_SCRIPT_WEBHOOK, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Transmission note:', err);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (btnText) btnText.textContent = 'TRANSMIT TO EXPERIMENTAL CORE';
      }

      // Generate & populate Cryptographic Dossier Token
      const dossier = generateDossierToken(payload.fullName);
      const tokenSubjectId = document.getElementById('tokenSubjectId');
      const tokenTimestamp = document.getElementById('tokenTimestamp');
      const copyTokenBtn = document.getElementById('copyTokenBtn');
      const copyTokenText = document.getElementById('copyTokenText');

      if (tokenSubjectId) tokenSubjectId.textContent = dossier.subjectId;
      if (tokenTimestamp) tokenTimestamp.textContent = dossier.timestamp;

      if (copyTokenBtn) {
        copyTokenBtn.onclick = () => {
          navigator.clipboard.writeText(dossier.formattedText).then(() => {
            playButtonClickSound();
            if (copyTokenText) copyTokenText.textContent = '✓ TOKEN COPIED TO CLIPBOARD';
            setTimeout(() => {
              if (copyTokenText) copyTokenText.textContent = '📋 Copy Dossier Token';
            }, 2500);
          });
        };
      }

      // Update modal text with user's name
      if (successSubject) successSubject.textContent = payload.fullName;
      if (welcomeBtnText) {
        welcomeBtnText.textContent = `${payload.fullName}, Welcome to the World`;
      }

      // Reveal modal
      if (successModal) successModal.classList.remove('hidden');
    });
  }

  // Handle "Welcome to the World" Button Click
  const welcomeUserBtn = document.getElementById('welcomeUserBtn');
  if (welcomeUserBtn) {
    welcomeUserBtn.addEventListener('click', () => {
      playButtonClickSound();
      const successModal = document.getElementById('successModal');
      if (successModal) successModal.classList.add('hidden');
      heroForm.reset();
      updateCount();
      if (typeof updateThreatVector === 'function') {
        updateThreatVector('');
      }
    });
  }

  // Handle "Submit Another Demise" Button Click
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');
  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      playButtonClickSound();
      const successModal = document.getElementById('successModal');
      if (successModal) successModal.classList.add('hidden');
      heroForm.reset();
      updateCount();
      if (typeof updateThreatVector === 'function') {
        updateThreatVector('');
      }
      document.getElementById('fullName')?.focus();
      window.scrollTo({ top: 180, behavior: 'smooth' });
    });
  }
});

/* ==========================================================================
   6. SYSTEM CLOCK
   ========================================================================== */
function tickClock() {
  const clockEl = document.getElementById('liveClock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = 'SYSTEM TIME: ' + now.toUTCString().slice(17, 25) + ' UTC';
  }
}
setInterval(tickClock, 1000);
tickClock();