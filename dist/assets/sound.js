const sweeps = {
  loading: [[.06, 258, 325, .25], [.36, 307, 385, .29], [.70, 381, 480, .25]],
  openWorld: [[0, 390, 720, .34]],
  concerned: [[0, 432, 312, .24]],
  accept: [[0, 370, 560, .18], [.22, 550, 735, .20]],
  retry: [[0, 405, 360, .19]],
  nav: [[0, 385, 493, .12]],
  begin: [[0, 350, 630, .16], [.18, 600, 940, .21], [.39, 820, 600, .19]],
  happy: [[0, 190, 470, .21], [.2, 560, 810, .16], [.34, 685, 535, .16]],
  wave: [[0, 390, 600, .17], [.16, 580, 720, .20]],
  shy: [[0, 575, 670, .20], [.23, 620, 415, .27]],
  surprised: [[0, 335, 840, .24], [.23, 765, 634, .18]],
  sad: [[0, 470, 345, .29], [.26, 392, 252, .37]],
  next: [[0, 465, 650, .17], [.17, 660, 850, .24]],
  gift: [[0, 285, 600, .26], [.23, 620, 935, .22], [.41, 830, 1170, .23]]
};
const bells = {
  loading: [60, 67, 72, 76, 79], openWorld: [67, 72, 76, 81],
  concerned: [62, 65], accept: [72, 76, 79], retry: [57], nav: [72],
  begin: [60, 67, 72, 76], happy: [72, 76, 79], wave: [77, 81],
  shy: [76, 79], surprised: [74, 81], sad: [69, 64],
  next: [62, 69, 74, 78], gift: [60, 67, 72, 76, 79, 84, 88]
};
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

export function createSound() {
  let context, bus;
  let alarmMeter, alarmSamples, alarmActive = false;
  let footstepsLoad, footstepsBuffer, footstepsSource, footstepsGain;
  let footstepsActive = false;
  const homeTracks = {
    dance: { file: 'cartoon-music.mp3', offline: typeof PIXI_OFFLINE_DANCE !== 'undefined' && PIXI_OFFLINE_DANCE, volume: .5 },
    snore: { file: 'snoring.mp3', offline: typeof PIXI_OFFLINE_SNORE !== 'undefined' && PIXI_OFFLINE_SNORE, volume: .9 },
    jump: { file: 'jump.mp3', offline: typeof PIXI_OFFLINE_JUMP !== 'undefined' && PIXI_OFFLINE_JUMP }
  };
  let homeTrack, homeSource, homeGain, homeStartedAt, homeOffset = 0;
  let jumpSource;
  const alarm = new Audio(typeof PIXI_OFFLINE_ALARM !== 'undefined'
    ? PIXI_OFFLINE_ALARM
    : new URL('./assets/emergency-alarm-69780.mp3', document.baseURI).href);
  alarm.loop = true;
  alarm.volume = .2;
  let enabled = true;
  try { enabled = localStorage.getItem('pixi-sound') !== 'off'; } catch {}

  function prepareAutomatic() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio || !enabled) return false;
    try {
      if (!context) {
        context = new Audio();
        bus = context.createGain();
        bus.gain.value = .56;
        bus.connect(context.destination);
      }
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (!prepareAutomatic()) return false;
    if (context.state !== 'running') context.resume().catch(() => {});
    return true;
  }

  function canPlayAutomatically() {
    return enabled && (context?.state === 'running' ||
      navigator.userActivation?.hasBeenActive ||
      navigator.getAutoplayPolicy?.('audiocontext') === 'allowed');
  }

  function sweep(when, from, to, length) {
    const source = context.createOscillator();
    const color = context.createBiquadFilter();
    const envelope = context.createGain();
    const flutter = context.createOscillator();
    const depth = context.createGain();
    source.type = 'triangle';
    source.frequency.setValueAtTime(from, when);
    source.frequency.exponentialRampToValueAtTime(to, when + length * .72);
    source.frequency.exponentialRampToValueAtTime(to * .88, when + length);
    color.type = 'lowpass';
    color.frequency.value = 1320;
    color.Q.value = .65;
    flutter.frequency.value = 16;
    depth.gain.value = 13;
    flutter.connect(depth).connect(source.frequency);
    envelope.gain.setValueAtTime(.0001, when);
    envelope.gain.exponentialRampToValueAtTime(.14, when + .024);
    envelope.gain.exponentialRampToValueAtTime(.079, when + length * .53);
    envelope.gain.exponentialRampToValueAtTime(.0001, when + length);
    source.connect(color).connect(envelope).connect(bus);
    source.start(when);
    flutter.start(when);
    source.stop(when + length);
    flutter.stop(when + length);
  }

  function bell(when, note, volume) {
    for (const [ratio, weight, length] of [[1, 1, .39], [2.006, .21, .19]]) {
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.frequency.value = hz(note) * ratio;
      envelope.gain.setValueAtTime(.0001, when);
      envelope.gain.exponentialRampToValueAtTime(volume * weight, when + .009);
      envelope.gain.exponentialRampToValueAtTime(.0001, when + length);
      tone.connect(envelope).connect(bus);
      tone.start(when);
      tone.stop(when + length);
    }
  }

  function setEnabled(value) {
    enabled = value;
    alarm.muted = !enabled;
    try { localStorage.setItem('pixi-sound', enabled ? 'on' : 'off'); } catch {}
    if (bus) bus.gain.setTargetAtTime(enabled ? .56 : 0, context.currentTime, .025);
    if (!enabled) {
      pauseHomeLoop();
      stopHomeJump();
    }
  }

  function prepareHomeAudio() {
    if (!prepareAutomatic()) return;
    for (const track of Object.values(homeTracks)) {
      if (track.load) continue;
      const url = track.offline || new URL('./assets/' + track.file, document.baseURI).href;
      track.load = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('Could not load ' + track.file);
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .then((buffer) => {
          track.buffer = buffer;
          if (track === homeTrack) playHomeLoop();
        })
        .catch(() => { track.load = undefined; });
    }
  }

  function homePlaybackTime() {
    return homeOffset + context.currentTime - homeStartedAt;
  }

  function stopHomeJump() {
    if (!jumpSource) return;
    jumpSource.stop();
    jumpSource.disconnect();
    jumpSource = undefined;
  }

  function playHomeJump() {
    const { buffer } = homeTracks.jump;
    if (!enabled || !buffer || context.state !== 'running' || jumpSource) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(bus);
    source.onended = () => {
      source.disconnect();
      if (jumpSource === source) jumpSource = undefined;
    };
    jumpSource = source;
    source.start();
  }

  function pauseHomeLoop() {
    if (!homeSource) return;
    homeOffset = homePlaybackTime();
    homeSource.stop();
    homeSource.disconnect();
    homeSource = undefined;
  }

  function playHomeLoop() {
    if (!homeTrack || homeSource || !unlock()) return;
    if (!homeTrack.buffer) {
      prepareHomeAudio();
      return;
    }
    if (!homeGain) {
      homeGain = context.createGain();
      homeGain.connect(bus);
    }
    homeGain.gain.value = homeTrack.volume;
    const source = context.createBufferSource();
    source.buffer = homeTrack.buffer;
    source.loop = true;
    source.connect(homeGain);
    homeStartedAt = context.currentTime;
    source.start(homeStartedAt, homeOffset % source.buffer.duration);
    homeSource = source;
  }

  function playEmergencyAlarm() {
    if (!alarmActive || !enabled) return;
    if (unlock() && !alarmMeter) {
      const source = context.createMediaElementSource(alarm);
      alarmMeter = context.createAnalyser();
      alarmMeter.fftSize = 2048;
      alarmSamples = new Float32Array(alarmMeter.fftSize);
      const volume = context.createGain();
      volume.gain.value = .36;
      source.connect(alarmMeter).connect(volume).connect(bus);
      alarm.volume = 1;
    }
    // Allow navigation and mute controls to keep working if autoplay is blocked.
    alarm.play().catch(() => {});
  }

  function stopEmergencyAlarm() {
    alarmActive = false;
    alarm.pause();
    alarm.currentTime = 0;
  }

  function prepareMazeFootsteps() {
    if (footstepsLoad || !prepareAutomatic()) return;
    const url = typeof PIXI_OFFLINE_FOOTSTEPS !== 'undefined'
      ? PIXI_OFFLINE_FOOTSTEPS
      : new URL('./assets/cartoon-fast-footsteps-mgwav-76186.mp3', document.baseURI).href;
    footstepsLoad = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load PIXI’s footsteps');
        return response.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes))
      .then((buffer) => {
        footstepsBuffer = buffer;
        playMazeFootsteps();
      })
      .catch(() => { footstepsLoad = undefined; });
  }

  function playMazeFootsteps() {
    if (!footstepsActive || footstepsSource || !unlock()) return;
    if (!footstepsBuffer) {
      prepareMazeFootsteps();
      return;
    }
    if (!footstepsGain) {
      footstepsGain = context.createGain();
      footstepsGain.gain.value = .24;
      footstepsGain.connect(bus);
    }
    const source = context.createBufferSource();
    source.buffer = footstepsBuffer;
    source.loop = true;
    // Loop the continuous run between quiet points in the supplied recording.
    source.loopStart = 1.17;
    source.loopEnd = 2.11;
    source.connect(footstepsGain);
    source.start(context.currentTime, source.loopStart);
    footstepsSource = source;
  }

  function stopMazeFootsteps() {
    footstepsActive = false;
    if (!footstepsSource) return;
    footstepsSource.stop();
    footstepsSource.disconnect();
    footstepsSource = undefined;
  }

  return {
    get enabled() { return enabled; },
    prepareAutomatic,
    canPlayAutomatically,
    startEmergencyAlarm() {
      if (alarmActive) return;
      alarm.muted = !enabled;
      alarmActive = true;
      playEmergencyAlarm();
    },
    playEmergencyAlarm,
    stopEmergencyAlarm,
    prepareMazeFootsteps,
    startMazeFootsteps() {
      footstepsActive = true;
      playMazeFootsteps();
    },
    stopMazeFootsteps,
    prepareHomeAudio,
    unlockHomeAudio: unlock,
    playHomeJump,
    stopHomeJump,
    setHomeLoop(cue) {
      const track = homeTracks[cue];
      if (track === homeTrack) return;
      pauseHomeLoop();
      homeOffset = 0;
      homeTrack = track;
      playHomeLoop();
    },
    danceTime() {
      if (homeTrack === homeTracks.dance && homeSource && context.state === 'running') {
        return homePlaybackTime();
      }
    },
    emergencyLevel() {
      if (!alarmMeter || alarm.paused || !enabled || context.state !== 'running') return 0;
      alarmMeter.getFloatTimeDomainData(alarmSamples);
      const power = alarmSamples.reduce((sum, sample) => sum + sample * sample, 0);
      return Math.min(1, Math.sqrt(power / alarmSamples.length) * 3);
    },
    prepareTyping: unlock,
    typingTick(index) {
      if (!context || !enabled) return;
      const at = context.currentTime + .012;
      const note = context.createOscillator();
      const envelope = context.createGain();
      note.type = 'triangle';
      note.frequency.setValueAtTime([880, 988, 1047][(index / 2) % 3], at);
      note.frequency.exponentialRampToValueAtTime(680, at + .065);
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.exponentialRampToValueAtTime(.064, at + .008);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + .066);
      note.connect(envelope).connect(bus);
      note.start(at);
      note.stop(at + .068);
    },
    play(cue) {
      if (!unlock()) return false;
      const time = context.currentTime + .015;
      for (const [at, from, to, length] of sweeps[cue]) sweep(time + at, from, to, length);
      bells[cue].forEach((note, index) => bell(time + .085 + index * .101, note, .044));
      return true;
    },
    toggle(chime = true) {
      setEnabled(!enabled);
      if (enabled) {
        playMazeFootsteps();
        playHomeLoop();
      }
      if (alarmActive) playEmergencyAlarm();
      else if (enabled && unlock() && chime) bell(context.currentTime + .016, 76, .09);
    }
  };
}

