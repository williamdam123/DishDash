(() => {
  const readVolume = (key, fallback) => {
    const stored = Number(localStorage.getItem(key) ?? fallback);
    return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored / 100)) : fallback / 100;
  };

  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392, 440, 523.25, 659.25, 523.25, 392, 440, 523.25, 392];
  const bass = [130.81, 0, 0, 0, 174.61, 0, 0, 0, 146.83, 0, 0, 0, 196, 0, 0, 0];

  const AudioManager = {
    enabled: localStorage.getItem("dishDashMuted") !== "true",
    soundVolume: readVolume("dishDashSoundVolume", 70),
    musicVolume: readVolume("dishDashMusicVolume", 55),
    context: null,
    soundGain: null,
    musicGain: null,
    musicTimer: null,
    musicWanted: false,
    musicPaused: false,
    musicStep: 0,
    nextMusicNote: 0,
    scheduledMusicNodes: new Set(),

    async initialize() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("Dish Dash audio is unavailable because this browser does not support Web Audio.");
        return false;
      }
      if (!this.context) {
        this.context = new AudioContextClass();
        this.soundGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.soundGain.gain.value = this.enabled ? this.soundVolume : 0;
        this.musicGain.gain.value = this.enabled ? this.musicVolume : 0;
        this.soundGain.connect(this.context.destination);
        this.musicGain.connect(this.context.destination);
      }
      if (this.context.state !== "running") {
        try {
          await this.context.resume();
        } catch (error) {
          console.warn("Dish Dash could not start audio playback.", error);
          return false;
        }
      }
      return this.context.state === "running";
    },

    setEnabled(enabled) {
      this.enabled = enabled;
      localStorage.setItem("dishDashMuted", String(!enabled));
      if (this.context) {
        const now = this.context.currentTime;
        this.soundGain.gain.setTargetAtTime(enabled ? this.soundVolume : 0, now, 0.025);
        this.musicGain.gain.setTargetAtTime(enabled && !this.musicPaused ? this.musicVolume : 0, now, 0.025);
      }
      if (enabled && this.musicWanted && !this.musicPaused && this.musicTimer === null) this.startMusic();
    },

    setSoundVolume(volume) {
      this.soundVolume = Math.max(0, Math.min(1, volume));
      localStorage.setItem("dishDashSoundVolume", String(Math.round(this.soundVolume * 100)));
      if (this.context && this.enabled) {
        this.soundGain.gain.setTargetAtTime(this.soundVolume, this.context.currentTime, 0.025);
      }
    },

    setMusicVolume(volume) {
      this.musicVolume = Math.max(0, Math.min(1, volume));
      localStorage.setItem("dishDashMusicVolume", String(Math.round(this.musicVolume * 100)));
      if (this.context && this.enabled) {
        this.musicGain.gain.setTargetAtTime(this.musicPaused ? 0 : this.musicVolume, this.context.currentTime, 0.025);
      }
      if (this.musicVolume === 0 && this.musicTimer !== null) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
        this.stopScheduledMusic();
      }
      if (this.musicVolume > 0 && this.enabled && this.musicTimer === null) this.startMusic();
    },

    async play(notes, type = "sine") {
      if (!this.enabled || this.soundVolume === 0 || !(await this.initialize())) return;
      const start = this.context.currentTime;
      notes.forEach(({ frequency, delay = 0, duration = 0.12, gain = 0.34, endFrequency }) => {
        const oscillator = this.context.createOscillator();
        const amplitude = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start + delay);
        if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + delay + duration);
        amplitude.gain.setValueAtTime(gain, start + delay);
        amplitude.gain.exponentialRampToValueAtTime(0.001, start + delay + duration);
        oscillator.connect(amplitude);
        amplitude.connect(this.soundGain);
        oscillator.start(start + delay);
        oscillator.stop(start + delay + duration);
      });
    },

    async playShatter() {
      if (!this.enabled || this.soundVolume === 0 || !(await this.initialize())) return;
      const duration = 0.24;
      const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
      const noise = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const amplitude = this.context.createGain();
      noise.buffer = buffer;
      filter.type = "highpass";
      filter.frequency.value = 1800;
      amplitude.gain.setValueAtTime(0.23, this.context.currentTime);
      amplitude.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      noise.connect(filter);
      filter.connect(amplitude);
      amplitude.connect(this.soundGain);
      noise.start();
      noise.stop(this.context.currentTime + duration);
    },

    async startMusic() {
      this.musicWanted = true;
      if (this.musicTimer !== null || this.musicPaused || !this.enabled || this.musicVolume === 0 || !(await this.initialize())) return;
      if (this.musicTimer !== null || this.musicPaused || !this.enabled || this.musicVolume === 0) return;
      this.musicStep = 0;
      this.nextMusicNote = this.context.currentTime + 0.04;
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 80);
      this.scheduleMusic();
    },

    scheduleMusic() {
      if (!this.context || this.context.state !== "running" || !this.enabled || this.musicVolume === 0) return;
      const now = this.context.currentTime;
      const beatLength = 0.34;
      while (this.nextMusicNote < now + 0.18) {
        const step = this.musicStep % melody.length;
        this.scheduleMusicTone(melody[step], this.nextMusicNote, 0.235, 0.24, "triangle");
        if (bass[step]) this.scheduleMusicTone(bass[step], this.nextMusicNote, 0.48, 0.15, "sine");
        this.musicStep += 1;
        this.nextMusicNote += beatLength;
      }
    },

    scheduleMusicTone(frequency, start, duration, volume, type) {
      const oscillator = this.context.createOscillator();
      const amplitude = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      amplitude.gain.setValueAtTime(0.001, start);
      amplitude.gain.linearRampToValueAtTime(volume, start + 0.025);
      amplitude.gain.setValueAtTime(volume * 0.65, start + duration * 0.55);
      amplitude.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(amplitude);
      amplitude.connect(this.musicGain);
      oscillator.onended = () => this.scheduledMusicNodes.delete(oscillator);
      this.scheduledMusicNodes.add(oscillator);
      oscillator.start(start);
      oscillator.stop(start + duration);
    },

    stopMusic() {
      if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
      this.musicTimer = null;
      this.musicWanted = false;
      this.musicPaused = false;
      this.stopScheduledMusic();
    },

    pauseMusic() {
      this.musicPaused = true;
      if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
      this.musicTimer = null;
      this.stopScheduledMusic();
      if (this.context) this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
    },

    resumeMusic() {
      this.musicPaused = false;
      if (this.context && this.enabled) this.musicGain.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.025);
      if (this.musicWanted && this.enabled && this.musicVolume > 0) this.startMusic();
    },

    stopScheduledMusic() {
      this.scheduledMusicNodes.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch (error) {
          if (!(error instanceof DOMException) || error.name !== "InvalidStateError") throw error;
        }
      });
      this.scheduledMusicNodes.clear();
    },

    save() {
      this.play([{ frequency: 690, duration: 0.11 }, { frequency: 970, delay: 0.065, duration: 0.16 }]);
    },

    break() {
      this.play([
        { frequency: 890, duration: 0.16, gain: 0.38, endFrequency: 310 },
        { frequency: 370, delay: 0.035, duration: 0.23, gain: 0.3, endFrequency: 125 }
      ], "triangle");
      this.playShatter();
    },

    start() {
      this.musicPaused = false;
      this.startMusic();
      this.play([{ frequency: 470, duration: 0.08 }, { frequency: 640, delay: 0.07, duration: 0.11 }]);
    },

    gameOver() {
      this.play([{ frequency: 330, duration: 0.18, gain: 0.3 }, { frequency: 245, delay: 0.15, duration: 0.28, gain: 0.3 }], "triangle");
    }
  };

  window.DishDashAudio = AudioManager;
})();
