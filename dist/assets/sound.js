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
    try { localStorage.setItem('pixi-sound', enabled ? 'on' : 'off'); } catch {}
    if (bus) bus.gain.setTargetAtTime(enabled ? .56 : 0, context.currentTime, .025);
  }

  function startEmergencyAlarm() {
    if (!unlock()) return () => {};
    const when = context.currentTime + .015;
    const volume = context.createGain();
    const sources = [];
    volume.gain.setValueAtTime(.34, when);
    volume.gain.setTargetAtTime(.0001, when + 1.65, .12);
    volume.connect(bus);
    for (let index = 0; index < 4; index++) {
      const start = when + index * .46;
      const length = .38;
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(420, start);
      tone.frequency.exponentialRampToValueAtTime(610, start + length * .52);
      tone.frequency.exponentialRampToValueAtTime(420, start + length);
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.exponentialRampToValueAtTime(.18, start + .025);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + length);
      tone.connect(envelope).connect(volume);
      tone.start(start);
      tone.stop(start + length);
      sources.push(tone);
    }
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const now = context.currentTime;
      volume.gain.cancelScheduledValues(now);
      volume.gain.setTargetAtTime(.0001, now, .025);
      for (const source of sources) {
        try { source.stop(now + .12); } catch {}
      }
    };
  }

  return {
    get enabled() { return enabled; },
    prepareAutomatic,
    canPlayAutomatically,
    startEmergencyAlarm,
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
      if (enabled && unlock() && chime) bell(context.currentTime + .016, 76, .09);
    }
  };
}

