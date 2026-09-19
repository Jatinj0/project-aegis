/* ==========================================================================
   1. PROCEDURAL AUDIO ENGINE (Resilient Context with Mac Autoplay Unlock)
   ========================================================================== */
let audioCtx = null;
let masterGain = null;
let droneGain = null;
let isPlayingAmbience = false;
let sfxEnabled = true;

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
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/* --- 1A. Suspicious Psychological Horror Soundscape --- */
function startSuspiciousMusic() {
  ensureAudioReady();

  // If already running, clean up first
  if (droneGain) {
    try {
      droneGain.disconnect();
    } catch(e) {}
  }

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

  // Subtle metallic screech every 8.5 seconds
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
  if (!audioCtx || !droneGain) return;
  droneGain.gain.setValueAtTime(droneGain.gain.value, audioCtx.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
  if (tensionTimer) clearInterval(tensionTimer);

  setTimeout(() => {
    try {
      if (oscRoot) oscRoot.stop();
      if (oscTritone) oscTritone.stop();
      if (oscShimmer) oscShimmer.stop();
      if (tapeLfo) tapeLfo.stop();
    } catch (e) {}
  }, 900);

  isPlayingAmbience = false;
  updateAmbienceUI(false);
}

/* --- 1B. Audible Terminal Keystroke Typing Sound --- */
function playTypingSound() {
  if (!sfxEnabled) return;
  try {
    ensureAudioReady();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Crisp metallic keystroke click with randomized pitch
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

    // Deep sub-drop
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

    // Eerie descending discordant chord
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
   4. CANVAS ASH & EMBER PARTICLES
   ========================================================================== */
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

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
      this.radius = Math.random() * 1.8 + 0.3;
      this.speedY = -Math.random() * 0.4 - 0.05;
      this.speedX = (Math.random() - 0.5) * 0.2;
      this.alpha = Math.random() * 0.35 + 0.08;
      this.color = Math.random() > 0.88 ? '225, 29, 72' : '100, 116, 139';
    }
    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
        this.y = height + 10;
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.shadowBlur = 3;
      ctx.shadowColor = `rgba(${this.color}, 0.3)`;
      ctx.fill();
    }
  }

  const particleCount = Math.min(Math.floor(window.innerWidth / 22), 60);
  for (let i = 0; i < particleCount; i++) {
    particles.push(new AshParticle());
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(renderParticles);
  }
  renderParticles();
}

/* ==========================================================================
   5. FORM SUBMISSION & GOOGLE APPS SCRIPT WEBHOOK
   ========================================================================== */
const GOOGLE_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbx44vRvB8utPOI03GMsfZFebb8PxefuHXRdTS78kuxpaQJfPhhVQ8FCuPg1PYWicjJP/exec";

function updateCount() {
  const reason = document.getElementById('reason');
  const charCounter = document.getElementById('charCounter');
  if (reason && charCounter) {
    charCounter.textContent = `${reason.value.length} characters logged`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const heroForm = document.getElementById('heroForm');
  const reason = document.getElementById('reason');
  if (reason) reason.addEventListener('input', updateCount);

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

      // Play dramatic demise stinger
      playSubmissionSound();

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

      // Read Feature Consent Checkbox directly before sending
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
      // Scroll smoothly back to top of form & focus name input
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