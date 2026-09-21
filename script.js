/* ==========================================================================
   PROJECT AEGIS // MOTOR-COGNITION TERMINAL ENGINE v4.3
   Phase 2 Complete: Deep-Link Intercept & Matrix Decrypt System
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     1. STATE & CONSTANTS
     ========================================================================== */
  const GOOGLE_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbx44vRvB8utPOI03GMsfZFebb8PxefuHXRdTS78kuxpaQJfPhhVQ8FCuPg1PYWicjJP/exec";
  const STORAGE_KEY_AMBIENCE = 'aegis_ambience_pref';
  const STORAGE_KEY_SFX = 'aegis_sfx_pref';
  const STORAGE_KEY_COOLDOWN = 'aegis_submission_cooldown';

  let audioCtx = null;
  let masterGain = null;
  let droneGain = null;
  let isPlayingAmbience = false;
  let sfxEnabled = true;

  let analyser = null;
  let audioDataArray = null;

  let oscRoot = null;
  let oscTritone = null;
  let oscShimmer = null;
  let tapeLfo = null;
  let tapeLfoGain = null;
  let filterNode = null;
  let tensionTimer = null;

  let shockwaveActive = false;
  let shockwaveRadius = 0;
  let shockwaveOrigin = { x: 0, y: 0 };
  let particles = [];
  let purgeShockInterval = null;
  let cooldownTimerInterval = null;

  const commandHistory = [];
  let historyIndex = -1;
  const KNOWN_COMMANDS = ['help', 'feed', 'lore', 'stats', 'diagnostics', 'purge', 'clear'];

  const threatClassifications = [
    {
      regex: /(sacrifice|shield|protect|save|fall for|give life|martyr)/i,
      label: "MARTYRDOM DIRECTIVE",
      tag: "martyrdom",
      color: "#f43f5e",
      dot: "bg-rose-500"
    },
    {
      regex: /(time|age|old|forgotten|decay|slow|rot|entropy)/i,
      label: "ENTROPIC OBSOLESCENCE",
      tag: "entropy",
      color: "#eab308",
      dot: "bg-yellow-500"
    },
    {
      regex: /(void|singularity|abyss|crush|black hole|vacuum|oblivion)/i,
      label: "GRAVITATIONAL SINGULARITY",
      tag: "void",
      color: "#a855f7",
      dot: "bg-purple-500"
    },
    {
      regex: /(blast|burn|fire|explosion|ashes|incinerat|vaporiz|nuke)/i,
      label: "CATASTROPHIC INCINERATION",
      tag: "incineration",
      color: "#f97316",
      dot: "bg-orange-500"
    },
    {
      regex: /(peace|sleep|quiet|rest|settle|tired|exhaust|walk away)/i,
      label: "VOLUNTARY TERMINATION",
      tag: "voluntary",
      color: "#38bdf8",
      dot: "bg-sky-400"
    }
  ];

  const FALLBACK_ARCHIVE = [
    {
      sector: "SECTOR-ALPHA",
      subject: "AEGIS-SUB-1084",
      demise: "Holding the collapsing perimeter gate alone so non-combatants can board the final extraction vessel."
    },
    {
      sector: "SECTOR-DELTA",
      subject: "AEGIS-SUB-2940",
      demise: "Surviving every battle and dying peacefully of old age watching the civilization they defended prosper."
    },
    {
      sector: "SECTOR-OMEGA",
      subject: "AEGIS-SUB-9112",
      demise: "Choosing voluntary oblivion to permanently deactivate a world-eating machine."
    }
  ];

  /* ==========================================================================
     2. AUDIO ENGINE
     ========================================================================== */
  function ensureAudioReady() {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

        try {
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          audioDataArray = new Uint8Array(analyser.frequencyBinCount);
          masterGain.connect(analyser);
        } catch (e) {}

        masterGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (err) {
      console.warn('Audio Context unlock notice:', err);
    }
  }

  function startSuspiciousMusic() {
    try {
      ensureAudioReady();
      if (!audioCtx) return;
      stopSuspiciousMusic();

      droneGain = audioCtx.createGain();
      droneGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      droneGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 2.0);
      droneGain.connect(masterGain);

      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(280, audioCtx.currentTime);

      oscRoot = audioCtx.createOscillator();
      oscRoot.type = 'sawtooth';
      oscRoot.frequency.setValueAtTime(36.71, audioCtx.currentTime);

      oscTritone = audioCtx.createOscillator();
      oscTritone.type = 'triangle';
      oscTritone.frequency.setValueAtTime(51.91, audioCtx.currentTime);

      oscShimmer = audioCtx.createOscillator();
      oscShimmer.type = 'sine';
      oscShimmer.frequency.setValueAtTime(584.2, audioCtx.currentTime);
      const shimmerGain = audioCtx.createGain();
      shimmerGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      oscShimmer.connect(shimmerGain);
      shimmerGain.connect(filterNode);

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

      if (tensionTimer) clearInterval(tensionTimer);
      tensionTimer = setInterval(() => {
        if (isPlayingAmbience && audioCtx && audioCtx.state === 'running') {
          playTensionCreak();
        }
      }, 8500);

      isPlayingAmbience = true;
      updateAmbienceUI(true);
    } catch (e) {}
  }

  function playTensionCreak() {
    if (!audioCtx) return;
    try {
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
    } catch (e) {}
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
      if (droneGain) droneGain.gain.value = 0;
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

  function playTypingSound() {
    if (!sfxEnabled) return;
    try {
      ensureAudioReady();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 + Math.random() * 900, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  function playButtonClickSound() {
    if (!sfxEnabled) return;
    try {
      ensureAudioReady();
      if (!audioCtx) return;
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

  function playSubmissionSound() {
    try {
      ensureAudioReady();
      if (!audioCtx) return;
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
     3. UI CONTROLS & HEADER VISUALIZER
     ========================================================================== */
  function updateAmbienceUI(active) {
    const audioDot = document.getElementById('audioDot');
    const audioText = document.getElementById('audioText');
    if (!audioDot || !audioText) return;

    if (active) {
      audioDot.className = 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-pulse pointer-events-none';
      audioText.textContent = 'AMBIENCE: ON';
      audioText.classList.add('text-rose-400');
    } else {
      audioDot.className = 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-600 pointer-events-none';
      audioText.textContent = 'AMBIENCE: OFF';
      audioText.classList.remove('text-rose-400');
    }
  }

  function updateSfxUI(active) {
    const sfxDot = document.getElementById('sfxDot');
    const sfxText = document.getElementById('sfxText');
    if (!sfxDot || !sfxText) return;

    if (active) {
      sfxDot.className = 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 pointer-events-none';
      sfxText.textContent = 'SFX: ON';
      sfxText.classList.add('text-emerald-400');
    } else {
      sfxDot.className = 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-600 pointer-events-none';
      sfxText.textContent = 'SFX: OFF';
      sfxText.classList.remove('text-emerald-400');
    }
  }

  function initHeaderVisualizer() {
    const visCanvas = document.getElementById('audioVisualizer');
    if (!visCanvas) return;
    const visCtx = visCanvas.getContext('2d');
    if (!visCtx) return;

    function draw() {
      requestAnimationFrame(draw);
      visCtx.clearRect(0, 0, visCanvas.width, visCanvas.height);

      if (!isPlayingAmbience || !analyser || !audioDataArray) {
        visCtx.fillStyle = 'rgba(100, 116, 139, 0.4)';
        visCtx.fillRect(0, visCanvas.height / 2 - 0.5, visCanvas.width, 1);
        return;
      }

      analyser.getByteFrequencyData(audioDataArray);
      const barWidth = 3;
      const barGap = 2;
      const totalBars = 8;
      let x = 0;

      for (let i = 0; i < totalBars; i++) {
        const val = audioDataArray[i * 2] || 0;
        const barHeight = Math.max(1, (val / 255) * visCanvas.height);
        const y = visCanvas.height - barHeight;

        visCtx.fillStyle = '#f43f5e';
        visCtx.fillRect(x, y, barWidth, barHeight);
        x += barWidth + barGap;
      }
    }
    draw();
  }

  /* ==========================================================================
     4. PARTICLES & SHOCKWAVE CANVAS
     ========================================================================== */
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

  function initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

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
        ctx.fillStyle = `rgba(${this.color},${reactiveAlpha})`;
        ctx.shadowBlur = 4 + (audioBoost * 12);
        ctx.shadowColor = `rgba(${this.color},${0.4 + audioBoost * 0.4})`;
        ctx.fill();
      }
    }

    particles = [];
    const count = Math.min(Math.floor(window.innerWidth / 20), 65);
    for (let i = 0; i < count; i++) {
      particles.push(new AshParticle());
    }

    function render() {
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

      requestAnimationFrame(render);
    }
    render();
  }

  /* ==========================================================================
     5. DOSSIER BADGE BUILDER & DIAGNOSTICS
     ========================================================================== */
  function updateCount() {
    const reason = document.getElementById('reason');
    const charCounter = document.getElementById('charCounter');
    if (reason && charCounter) {
      charCounter.textContent = `${reason.value.length} logged`;
    }
  }

  function updateThreatVector(text) {
    const labelEl = document.getElementById("threatClassification");
    const dotEl = document.getElementById("threatDot");
    if (!labelEl || !dotEl) return;

    if (!text || !text.trim() || text.length < 5) {
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

  function generateDossierToken(name) {
    const sectors = ['ALPHA', 'SIGMA', 'DELTA', 'OMEGA', 'NEXUS', 'VOID', 'EPSILON'];
    const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const now = new Date().toISOString().replace('T', ' // ').slice(0, 22) + ' UTC';

    return {
      subjectId: `AEGIS-SUB-${randomNum}//${randomSector}`,
      timestamp: now,
      formattedText: `[PROJECT AEGIS // ARCHIVED DOSSIER]\nSUBJECT: ${name.toUpperCase()}\nID: AEGIS-SUB-${randomNum}//${randomSector}\nTIMESTAMP:${now}\nCLEARANCE: COMMITTED TO EXPERIMENTAL CORE`
    };
  }

  function generateDossierPNG(name, designation, timestamp, reason, vector) {
    const exportCanvas = document.getElementById('dossierExportCanvas');
    if (!exportCanvas) return;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    const w = exportCanvas.width;
    const h = exportCanvas.height;

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#04060b');
    bgGrad.addColorStop(1, '#0c101d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = 'rgba(225, 29, 72, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 40; i < h - 40; i += 24) {
      ctx.beginPath();
      ctx.moveTo(32, i);
      ctx.lineTo(w - 32, i);
      ctx.stroke();
    }

    ctx.fillStyle = '#e11d48';
    ctx.fillRect(32, 32, w - 64, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('PROJECT AEGIS // CLASSIFIED MORTALITY DOSSIER', 48, 56);

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(w - 180, 36, 130, 28);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SECTOR LOGGED', w - 165, 54);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('SUBJECT DESIGNATION:', 48, 110);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(name.toUpperCase(), 48, 136);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('IDENTITY CODE:', 48, 175);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(designation, 48, 195);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('THREAT VECTOR:', 420, 175);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(vector.toUpperCase(), 420, 195);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('TELEMETRY TIMESTAMP:', 48, 235);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px monospace';
    ctx.fillText(timestamp, 48, 255);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(48, 280, w - 96, 75);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(48, 280, w - 96, 75);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'italic 13px monospace';
    const cleanReason = (reason && reason.length > 90) ? reason.substring(0, 87) + '...' : (reason || '');
    ctx.fillText(`"${cleanReason}"`, 64, 322);

    const barY = h - 42;
    ctx.fillStyle = '#e11d48';
    for (let bx = w - 240; bx < w - 48; bx += Math.random() > 0.4 ? 4 : 8) {
      ctx.fillRect(bx, barY - 14, 2, 20);
    }

    try {
      const link = document.createElement('a');
      link.download = `${designation.replace(/[\/\\]/g, '_')}_DOSSIER.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    } catch (e) {}
  }

  function activateSubmissionCooldown(durationSeconds = 60) {
    try {
      const expiryTime = Date.now() + durationSeconds * 1000;
      localStorage.setItem(STORAGE_KEY_COOLDOWN, String(expiryTime));
      startCooldownCountdown(durationSeconds);
    } catch (e) {}
  }

  function startCooldownCountdown(secondsRemaining) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    if (!submitBtn || !btnText) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

    let remaining = secondsRemaining;
    btnText.textContent = `CORE RE-CALIBRATING: ${remaining}s`;

    if (cooldownTimerInterval) clearInterval(cooldownTimerInterval);

    cooldownTimerInterval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        btnText.textContent = `CORE RE-CALIBRATING: ${remaining}s`;
      } else {
        clearInterval(cooldownTimerInterval);
        cooldownTimerInterval = null;
        try { localStorage.removeItem(STORAGE_KEY_COOLDOWN); } catch (e) {}
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        btnText.textContent = 'TRANSMIT TO EXPERIMENTAL CORE';
      }
    }, 1000);
  }

  function checkSubmissionCooldown() {
    try {
      const storedExpiry = localStorage.getItem(STORAGE_KEY_COOLDOWN);
      if (!storedExpiry) return;

      const diffMs = parseInt(storedExpiry, 10) - Date.now();
      if (diffMs > 0) {
        startCooldownCountdown(Math.ceil(diffMs / 1000));
      } else {
        localStorage.removeItem(STORAGE_KEY_COOLDOWN);
      }
    } catch (e) {}
  }

  /* ==========================================================================
     6. PHASE 2: DEEP-LINK ENCODER & MATRIX SCRAMBLE DECRYPTER
     ========================================================================== */
  function generateShareableDossierURL(name, tokenId, vector, reason) {
    const base = window.location.origin + window.location.pathname;
    const cleanReason = (reason && reason.length > 120) ? reason.slice(0, 120) + '...' : (reason || '');
    const params = new URLSearchParams({
      token: tokenId,
      subject: name,
      vector: vector,
      reason: cleanReason
    });
    return `${base}?${params.toString()}`;
  }

  function scrambleDecodeText(element, finalString, durationMs = 1200) {
    if (!element) return;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789//<>[]!@#$%^&*';
    const startTime = Date.now();
    const length = finalString.length;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const revealedCount = Math.floor(progress * length);

      let output = '';
      for (let i = 0; i < length; i++) {
        if (i < revealedCount) {
          output += finalString[i];
        } else {
          output += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      element.textContent = output;

      if (progress >= 1) {
        clearInterval(interval);
        element.textContent = finalString;
      }
    }, 40);
  }

  function checkAndHandleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    const subject = params.get('subject') || 'CLASSIFIED AGENT';
    const vector = params.get('vector') || 'ANOMALOUS PATHWAY';
    const reason = params.get('reason') || 'Mortality directives locked under high-tier clearance protocol.';

    const interceptModal = document.getElementById('interceptModal');
    const interceptSubject = document.getElementById('interceptSubject');
    const interceptTokenId = document.getElementById('interceptTokenId');
    const interceptVector = document.getElementById('interceptVector');
    const interceptReason = document.getElementById('interceptReason');
    const interceptCloseBtn = document.getElementById('interceptCloseBtn');
    const interceptExportBtn = document.getElementById('interceptExportBtn');

    if (!interceptModal) return;

    interceptModal.classList.remove('hidden');
    playSubmissionSound();
    triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, 1.8);

    scrambleDecodeText(interceptSubject, subject.toUpperCase(), 1400);
    scrambleDecodeText(interceptTokenId, token, 1000);
    scrambleDecodeText(interceptVector, vector.toUpperCase(), 1200);
    scrambleDecodeText(interceptReason, `"${reason}"`, 1600);

    if (interceptCloseBtn) {
      interceptCloseBtn.onclick = () => {
        playButtonClickSound();
        interceptModal.classList.add('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
      };
    }

    if (interceptExportBtn) {
      interceptExportBtn.onclick = () => {
        playButtonClickSound();
        const now = new Date().toISOString().replace('T', ' // ').slice(0, 22) + ' UTC';
        generateDossierPNG(subject, token, now, reason, vector);
      };
    }
  }

  /* ==========================================================================
     7. PURGE CONTROLLER
     ========================================================================== */
  function startContinuousShockwave() {
    document.body.classList.add('purge-active');
    if (purgeShockInterval) clearInterval(purgeShockInterval);

    purgeShockInterval = setInterval(() => {
      const rx = Math.random() * window.innerWidth;
      const ry = Math.random() * window.innerHeight;
      triggerShockwave(rx, ry, 2.5);
    }, 280);
  }

  function stopContinuousShockwave() {
    document.body.classList.remove('purge-active');
    if (purgeShockInterval) {
      clearInterval(purgeShockInterval);
      purgeShockInterval = null;
    }
  }

  /* ==========================================================================
     8. CODEX CLI & LIVE FEED ENGINE
     ========================================================================== */
  function toggleCodex(show) {
    const codexDrawer = document.getElementById('codexDrawer');
    const codexInput = document.getElementById('codexInput');
    if (!codexDrawer) return;

    const isHidden = codexDrawer.classList.contains('hidden');
    const shouldOpen = show !== undefined ? show : isHidden;

    if (shouldOpen) {
      codexDrawer.classList.remove('hidden');
      playButtonClickSound();
      if (codexInput) codexInput.focus();
      loadLiveDemiseFeed();
    } else {
      codexDrawer.classList.add('hidden');
      playButtonClickSound();
    }
  }

  async function loadLiveDemiseFeed(filterQuery = '') {
    const feedStream = document.getElementById('feedStream');
    if (!feedStream) return;

    const queryTag = (filterQuery || '').toLowerCase().trim();
    const filterNotice = queryTag ? ` // FILTER: [${queryTag.toUpperCase()}]` : '';
    feedStream.innerHTML = `<div class="text-slate-500 animate-pulse">> INTERCEPTING TELEMETRY STREAMS${filterNotice}...</div>`;

    let dataToRender = FALLBACK_ARCHIVE;

    try {
      const res = await fetch(GOOGLE_SCRIPT_WEBHOOK);
      if (res.ok) {
        const result = await res.json();
        if (result && result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
          dataToRender = result.data;
        }
      }
    } catch (err) {}

    if (queryTag) {
      dataToRender = dataToRender.filter(item => {
        const demiseText = (item.demise || '').toLowerCase();
        const sectorText = (item.sector || '').toLowerCase();
        const subjectText = (item.subject || '').toLowerCase();

        const vectorMatch = threatClassifications.find(t => t.tag === queryTag);
        const regexMatches = vectorMatch ? vectorMatch.regex.test(demiseText) : false;

        return demiseText.includes(queryTag) ||
               sectorText.includes(queryTag) ||
               subjectText.includes(queryTag) ||
               regexMatches;
      });
    }

    if (dataToRender.length === 0) {
      feedStream.innerHTML = `<div class="text-yellow-500/90">> NO ARCHIVED DOSSIERS MATCH CRITERIA: "${queryTag.toUpperCase()}". TYPE 'feed' TO RESET.</div>`;
      return;
    }

    feedStream.innerHTML = '';
    dataToRender.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] font-mono transition hover:border-rose-900/60';

      const matchedVector = threatClassifications.find(t => t.regex.test(item.demise || ''));
      const vectorLabel = matchedVector ? matchedVector.label : 'ANOMALOUS PATHWAY';
      const vectorColor = matchedVector ? matchedVector.color : '#34d399';

      itemEl.innerHTML = `
        <div class="flex flex-wrap justify-between text-slate-400 mb-1 text-[10px] gap-1">
          <span class="text-rose-400 font-bold">[${(item.sector || 'SECTOR_CLASSIFIED').toUpperCase()}]</span>
          <span style="color: ${vectorColor};" class="font-semibold text-[9px] uppercase tracking-wider">${vectorLabel}</span>
          <span class="text-slate-500">ID: ${item.subject || '---'}</span>
        </div>
        <p class="text-slate-300 italic leading-relaxed">"${item.demise || ''}"</p>
      `;
      feedStream.appendChild(itemEl);
    });
  }

  function handleCommand(rawInput) {
    const codexOutput = document.getElementById('codexOutput');
    if (!codexOutput) return;

    const tokens = rawInput.trim().split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const arg = tokens.slice(1).join(' ').toLowerCase();

    const reply = document.createElement('div');
    reply.className = 'text-slate-300 mb-2 font-mono';

    switch (cmd) {
      case 'help':
        reply.className = 'p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 font-mono text-xs';
        reply.innerHTML = `
          <div class="text-rose-400 font-bold mb-1.5 tracking-wider">[SYS_COMMAND_MATRIX // AEGIS]</div>
          <div class="space-y-1 text-[11px] text-slate-300">
            <div><strong class="text-white">feed [filter]</strong> — Ingest telemetries (e.g. 'feed martyrdom', 'feed void', 'feed alpha').</div>
            <div><strong class="text-white">lore</strong> — Read classified Project Aegis genesis charter.</div>
            <div><strong class="text-white">stats</strong> — Inspect real-time engine heuristic state.</div>
            <div><strong class="text-white">diagnostics</strong> — Ingest system audio, rate limiter & buffer telemetry.</div>
            <div><strong class="text-white">purge</strong> — Execute localized protocol boundary override.</div>
            <div><strong class="text-white">clear</strong> — Flush console screen buffer.</div>
          </div>
        `;
        break;

      case 'feed':
        if (arg) {
          reply.innerHTML = `<span class="text-emerald-400">> Filtering dossiers matching query:</span> <span class="text-white font-bold">[${arg.toUpperCase()}]</span>`;
          loadLiveDemiseFeed(arg);
        } else {
          reply.textContent = '> Synchronizing classified sector telemetry feed...';
          loadLiveDemiseFeed();
        }
        break;

      case 'lore':
        reply.innerHTML = `
          <span class="text-rose-400 font-bold">[CLASSIFIED DIRECTIVE AEGIS-0]</span><br>
          The mortality of mythic archetypes cannot be prevented through conventional triage.
          Project Aegis was instituted to catalog anomalous failure pathways of heroic agents
          before biological erasure, preserving systemic resilience for subsequent iterations.
        `;
        break;

      case 'stats':
        let cooldownActive = false;
        try { cooldownActive = !!localStorage.getItem(STORAGE_KEY_COOLDOWN); } catch (e) {}
        reply.innerHTML = `
          <div>AUDIO ENGINE: <span class="text-emerald-400">${isPlayingAmbience ? 'ACTIVE' : 'STANDBY'}</span></div>
          <div>SFX BUS: <span class="text-emerald-400">${sfxEnabled ? 'SYNTHESIZED' : 'MUTED'}</span></div>
          <div>PARTICLE CORES: <span class="text-emerald-400">${particles.length} ACTIVE ASH PARTICLES</span></div>
          <div>COOLDOWN STATUS: <span class="text-emerald-400">${cooldownActive ? 'ARMED' : 'CLEAR'}</span></div>
        `;
        break;

      case 'diagnostics':
        const sampleRate = audioCtx ? audioCtx.sampleRate + ' Hz' : 'UNINITIALIZED';
        let remainingCooldown = '0s (CLEAR)';
        try {
          const cooldownRaw = localStorage.getItem(STORAGE_KEY_COOLDOWN);
          if (cooldownRaw) {
            remainingCooldown = Math.max(0, Math.ceil((parseInt(cooldownRaw, 10) - Date.now()) / 1000)) + 's';
          }
        } catch (e) {}

        reply.innerHTML = `
          <div class="text-rose-400 font-bold mb-1">[CORE SYSTEM DIAGNOSTIC RUN]</div>
          <div class="text-[11px] text-slate-300 space-y-0.5">
            <div>AUDIO SAMPLE RATE: <span class="text-slate-100">${sampleRate}</span></div>
            <div>ANALYSER BINS: <span class="text-slate-100">${analyser ? analyser.frequencyBinCount : 'N/A'}</span></div>
            <div>RATE LIMITER: <span class="text-slate-100">${remainingCooldown}</span></div>
            <div>COMMAND HISTORY: <span class="text-slate-100">${commandHistory.length} ENTRIES</span></div>
          </div>
        `;
        break;

      case 'purge':
        reply.className = 'text-rose-500 font-bold tracking-widest animate-pulse';
        reply.textContent = '> [CRITICAL] PURGE PROTOCOL ENGAGED. LOCKING BOUNDARY MATRICES...';

        playSubmissionSound();
        startContinuousShockwave();

        setTimeout(() => {
          const purgeModal = document.getElementById('purgeDecisionModal');
          const drawer = document.getElementById('codexDrawer');
          if (drawer) drawer.classList.add('hidden');

          document.body.classList.remove('purge-active');

          if (purgeModal) {
            if (purgeModal.parentElement !== document.documentElement) {
              document.documentElement.appendChild(purgeModal);
            }
            purgeModal.style.display = 'flex';
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        }, 5000);
        break;

      case 'clear':
        codexOutput.innerHTML = '';
        return;

      default:
        reply.className = 'text-rose-400';
        reply.textContent = `Command '${cmd}' not recognized. Type 'help' for command matrix.`;
    }

    codexOutput.appendChild(reply);
    codexOutput.scrollTop = codexOutput.scrollHeight;
  }

  /* ==========================================================================
     9. DOM INITIALIZATION
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Populate Dropdowns
    const dobDaySelect = document.getElementById('dobDay');
    if (dobDaySelect) {
      dobDaySelect.innerHTML = '<option value="" class="bg-panel text-slate-400">Day</option>';
      for (let d = 1; d <= 31; d++) {
        const val = d < 10 ? '0' + d : String(d);
        const opt = document.createElement('option');
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

    // 2. Initialize Visualizers & Particles
    initHeaderVisualizer();
    initParticleCanvas();

    // 3. Audio & SFX Toggles
    try {
      const savedSfx = localStorage.getItem(STORAGE_KEY_SFX);
      if (savedSfx !== null) sfxEnabled = savedSfx === 'true';
    } catch (e) {}

    updateAmbienceUI(false);
    updateSfxUI(sfxEnabled);

    const audioToggle = document.getElementById('audioToggle');
    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        ensureAudioReady();
        playButtonClickSound();
        if (!isPlayingAmbience) {
          startSuspiciousMusic();
          try { localStorage.setItem(STORAGE_KEY_AMBIENCE, 'true'); } catch (e) {}
        } else {
          stopSuspiciousMusic();
          try { localStorage.setItem(STORAGE_KEY_AMBIENCE, 'false'); } catch (e) {}
        }
      });
    }

    const sfxToggle = document.getElementById('sfxToggle');
    if (sfxToggle) {
      sfxToggle.addEventListener('click', () => {
        ensureAudioReady();
        sfxEnabled = !sfxEnabled;
        try { localStorage.setItem(STORAGE_KEY_SFX, String(sfxEnabled)); } catch (e) {}
        updateSfxUI(sfxEnabled);
        if (sfxEnabled) playButtonClickSound();
      });
    }

    // 4. Form Textarea & Presets
    const reasonEl = document.getElementById('reason');
    if (reasonEl) {
      reasonEl.addEventListener('input', () => {
        updateCount();
        updateThreatVector(reasonEl.value);
      });
      reasonEl.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          const form = document.getElementById('heroForm');
          if (form) form.requestSubmit();
        }
      });
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const insertText = btn.getAttribute('data-text');
        if (reasonEl && insertText) {
          reasonEl.value = reasonEl.value.trim() ? `${reasonEl.value}${insertText}` : insertText;
          updateCount();
          updateThreatVector(reasonEl.value);
          reasonEl.focus();
        }
      });
    });

    // 5. Form Submission
    const heroForm = document.getElementById('heroForm');
    if (heroForm) {
      heroForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');
        const reason = document.getElementById('reason');
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

        if (!fullName || !fullName.value.trim()) {
          if (nameError) nameError.classList.remove('hidden');
          if (fullName) fullName.classList.add('border-rose-500');
          isValid = false;
        } else {
          if (nameError) nameError.classList.add('hidden');
          if (fullName) fullName.classList.remove('border-rose-500');
        }

        if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
          if (emailError) emailError.classList.remove('hidden');
          email.classList.add('border-rose-500');
          isValid = false;
        } else {
          if (emailError) emailError.classList.add('hidden');
          if (email) email.classList.remove('border-rose-500');
        }

        if (!reason || !reason.value.trim()) {
          if (reasonError) reasonError.classList.remove('hidden');
          if (reason) reason.classList.add('border-rose-500');
          isValid = false;
        } else {
          if (reasonError) reasonError.classList.add('hidden');
          if (reason) reason.classList.remove('border-rose-500');
        }

        if (!isValid) return;

        playSubmissionSound();
        triggerShockwave(window.innerWidth / 2, window.innerHeight / 2, 2.2);

        document.body.classList.add('glitch-active');
        setTimeout(() => document.body.classList.remove('glitch-active'), 450);

        const selectedDay = document.getElementById('dobDay')?.value || '';
        const selectedMonth = document.getElementById('dobMonth')?.value || '';
        const selectedYear = document.getElementById('dobYear')?.value || '';

        let combinedDob = 'Unspecified';
        if (selectedYear === 'Before 1935') {
          combinedDob = (selectedMonth && selectedDay) ? `${selectedMonth}-${selectedDay} (Before 1935)` : 'Before 1935';
        } else if (selectedYear && selectedMonth && selectedDay) {
          combinedDob = `${selectedYear}-${selectedMonth}-${selectedDay}`;
        } else if (selectedYear || selectedMonth || selectedDay) {
          combinedDob = [selectedDay, selectedMonth, selectedYear].filter(Boolean).join('/');
        }

        const featureCheckbox = document.getElementById('featureConsent');
        const payload = {
          fullName: fullName.value.trim(),
          email: email?.value.trim() || 'N/A',
          phone: document.getElementById('phone')?.value.trim() || 'N/A',
          dob: combinedDob,
          city: document.getElementById('city')?.value.trim() || 'Unspecified Sector',
          employment: document.getElementById('employment')?.value || 'Unspecified',
          reason: reason.value.trim(),
          featureConsent: featureCheckbox?.checked ? 'Yes' : 'No'
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (err) {}

        if (submitBtn) {
          submitBtn.disabled = false;
          if (btnSpinner) btnSpinner.classList.add('hidden');
          btnText.textContent = 'TRANSMIT TO EXPERIMENTAL CORE';
        }

        const dossier = generateDossierToken(payload.fullName);
        const tokenSubjectId = document.getElementById('tokenSubjectId');
        const tokenTimestamp = document.getElementById('tokenTimestamp');
        const copyTokenBtn = document.getElementById('copyTokenBtn');
        const copyTokenText = document.getElementById('copyTokenText');
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        const copyLinkText = document.getElementById('copyLinkText');
        const exportCardBtn = document.getElementById('exportCardBtn');
        const exportCardText = document.getElementById('exportCardText');
        const currentVector = document.getElementById('threatClassification')?.textContent || 'ANOMALOUS';

        if (tokenSubjectId) tokenSubjectId.textContent = dossier.subjectId;
        if (tokenTimestamp) tokenTimestamp.textContent = dossier.timestamp;

        // Copy Raw Token
        if (copyTokenBtn) {
          copyTokenBtn.onclick = () => {
            navigator.clipboard.writeText(dossier.formattedText).then(() => {
              playButtonClickSound();
              if (copyTokenText) copyTokenText.textContent = '✓ COPIED';
              setTimeout(() => {
                if (copyTokenText) copyTokenText.textContent = '📋 Token';
              }, 2500);
            });
          };
        }

        // Copy Shareable Deep-Link (Phase 2)
        if (copyLinkBtn) {
          copyLinkBtn.onclick = () => {
            const shareUrl = generateShareableDossierURL(
              payload.fullName,
              dossier.subjectId,
              currentVector,
              payload.reason
            );
            navigator.clipboard.writeText(shareUrl).then(() => {
              playButtonClickSound();
              if (copyLinkText) copyLinkText.textContent = '✓ LINK COPIED';
              setTimeout(() => {
                if (copyLinkText) copyLinkText.textContent = '🔗 Link';
              }, 2500);
            });
          };
        }

        // Export PNG Card
        if (exportCardBtn) {
          exportCardBtn.onclick = () => {
            playButtonClickSound();
            if (exportCardText) exportCardText.textContent = '⚡ RENDERING...';

            generateDossierPNG(
              payload.fullName,
              dossier.subjectId,
              dossier.timestamp,
              payload.reason,
              currentVector
            );

            setTimeout(() => {
              if (exportCardText) exportCardText.textContent = '✓ EXPORTED';
              setTimeout(() => {
                if (exportCardText) exportCardText.textContent = '💾 .PNG';
              }, 2500);
            }, 800);
          };
        }

        if (successSubject) successSubject.textContent = payload.fullName;
        if (welcomeBtnText) welcomeBtnText.textContent = `${payload.fullName}, Welcome to the World`;

        activateSubmissionCooldown(60);

        if (successModal) successModal.classList.remove('hidden');
      });
    }

    const welcomeUserBtn = document.getElementById('welcomeUserBtn');
    if (welcomeUserBtn) {
      welcomeUserBtn.addEventListener('click', () => {
        playButtonClickSound();
        const successModal = document.getElementById('successModal');
        if (successModal) successModal.classList.add('hidden');
        if (heroForm) heroForm.reset();
        updateCount();
        updateThreatVector('');
      });
    }

    const submitAnotherBtn = document.getElementById('submitAnotherBtn');
    if (submitAnotherBtn) {
      submitAnotherBtn.addEventListener('click', () => {
        playButtonClickSound();
        const successModal = document.getElementById('successModal');
        if (successModal) successModal.classList.add('hidden');
        if (heroForm) heroForm.reset();
        updateCount();
        updateThreatVector('');
        document.getElementById('fullName')?.focus();
        window.scrollTo({ top: 180, behavior: 'smooth' });
      });
    }

    // 6. Purge Overlay Handlers
    const purgeModal = document.getElementById('purgeDecisionModal');
    const purgeAcceptBtn = document.getElementById('purgeAcceptBtn');
    const purgeDestroyBtn = document.getElementById('purgeDestroyBtn');
    const purgeLoadingState = document.getElementById('purgeLoadingState');
    const purgeActionButtons = document.getElementById('purgeActionButtons');
    const shutdownScreen = document.getElementById('shutdownScreen');

    if (purgeAcceptBtn) {
      purgeAcceptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        playButtonClickSound();
        stopContinuousShockwave();

        if (purgeActionButtons) purgeActionButtons.style.display = 'none';
        if (purgeLoadingState) purgeLoadingState.style.display = 'flex';

        setTimeout(() => {
          if (purgeModal) purgeModal.style.display = 'none';
          if (purgeActionButtons) purgeActionButtons.style.display = 'grid';
          if (purgeLoadingState) purgeLoadingState.style.display = 'none';
          toggleCodex(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 2000);
      });
    }

    if (purgeDestroyBtn) {
      purgeDestroyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        playSubmissionSound();
        if (purgeModal) purgeModal.style.display = 'none';

        if (shutdownScreen) shutdownScreen.style.display = 'block';

        setTimeout(() => {
          if (shutdownScreen) shutdownScreen.style.display = 'none';
          startContinuousShockwave();
          setTimeout(() => {
            stopContinuousShockwave();
          }, 60000);
        }, 10000);
      });
    }

    // 7. CODEX Console Terminal Handlers
    const codexDrawer = document.getElementById('codexDrawer');
    const codexToggleBtn = document.getElementById('terminalToggleBtn');
    const closeCodexBtn = document.getElementById('closeCodexBtn');
    const codexInput = document.getElementById('codexInput');
    const codexOutput = document.getElementById('codexOutput');
    const codexHelpHint = document.getElementById('codexHelpHint');

    if (codexToggleBtn) {
      codexToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleCodex(true);
      });
    }

    if (closeCodexBtn) {
      closeCodexBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleCodex(false);
      });
    }

    if (codexHelpHint) {
      codexHelpHint.addEventListener('click', (e) => {
        e.preventDefault();
        playButtonClickSound();
        if (codexOutput) {
          const userLine = document.createElement('div');
          userLine.className = 'text-rose-400 font-semibold font-mono';
          userLine.textContent = 'AEGIS> help';
          codexOutput.appendChild(userLine);
        }
        handleCommand('help');
      });
    }

    if (codexDrawer) {
      codexDrawer.addEventListener('click', (e) => {
        if (e.target === codexDrawer) toggleCodex(false);
      });
    }

    if (codexInput) {
      codexInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const fullCmd = codexInput.value.trim();
          if (!fullCmd) return;
          playTypingSound();

          commandHistory.push(fullCmd);
          historyIndex = commandHistory.length;

          if (codexOutput) {
            const userLine = document.createElement('div');
            userLine.className = 'text-rose-400 font-semibold font-mono';
            userLine.textContent = `AEGIS> ${fullCmd}`;
            codexOutput.appendChild(userLine);
          }

          handleCommand(fullCmd);
          codexInput.value = '';
          if (codexOutput) codexOutput.scrollTop = codexOutput.scrollHeight;
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (commandHistory.length > 0 && historyIndex > 0) {
            historyIndex--;
            codexInput.value = commandHistory[historyIndex];
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            codexInput.value = commandHistory[historyIndex];
          } else {
            historyIndex = commandHistory.length;
            codexInput.value = '';
          }
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          const currentVal = codexInput.value.trim().toLowerCase();
          if (!currentVal) return;

          const match = KNOWN_COMMANDS.find(c => c.startsWith(currentVal));
          if (match) {
            codexInput.value = match + ' ';
            playTypingSound();
          }
        }
      });
    }

    // 8. Execute Phase 2 Intercept Check & Rate Limit Status
    checkAndHandleDeepLink();
    checkSubmissionCooldown();
  });

  // Global Interaction & Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    ensureAudioReady();
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      playTypingSound();
      triggerShockwave(window.innerWidth / 2, window.innerHeight * 0.75, 0.25);
    }

    if (e.key === '`' || e.key === '~') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.id === 'reason' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'codexInput') {
        return;
      }
      e.preventDefault();
      toggleCodex();
    } else if (e.key === 'Escape') {
      const codexDrawer = document.getElementById('codexDrawer');
      if (codexDrawer && !codexDrawer.classList.contains('hidden')) {
        toggleCodex(false);
      }
    }
  });

  function autoStartAudioOnGesture() {
    ensureAudioReady();
    try {
      if (localStorage.getItem(STORAGE_KEY_AMBIENCE) === 'true' && !isPlayingAmbience) {
        startSuspiciousMusic();
      }
    } catch (e) {}
    window.removeEventListener('click', autoStartAudioOnGesture);
    window.removeEventListener('keydown', autoStartAudioOnGesture);
    window.removeEventListener('scroll', autoStartAudioOnGesture);
  }
  window.addEventListener('click', autoStartAudioOnGesture, { once: true });
  window.addEventListener('keydown', autoStartAudioOnGesture, { once: true });
  window.addEventListener('scroll', autoStartAudioOnGesture, { once: true });

  // Clock
  setInterval(() => {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
      clockEl.textContent = 'SYSTEM TIME: ' + new Date().toUTCString().slice(17, 25) + ' UTC';
    }
  }, 1000);

})();