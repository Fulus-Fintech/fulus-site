// Beat windows verbatim from the prototype frame loop:
//   hero: prog < .15 | mid: .26 < prog < .46 | open: .46 < prog < .64 | end: k > .75
export function beatStates(prog: number, k: number): { hero: boolean; mid: boolean; open: boolean; end: boolean } {
  return {
    hero: prog < 0.15,
    mid: prog > 0.26 && prog < 0.46,
    open: prog > 0.46 && prog < 0.64,
    end: k > 0.75,
  };
}

export interface BeatUI {
  setMeter(p: number): void;
  setWash(o: number): void;
  setScrim(o: number): void;
  setBeats(s: ReturnType<typeof beatStates>): void;
}

// Required DOM (ids fixed): #beat-hero #beat-mid #beat-open, and #beat-end
// (dev harness) with production fallback #walk-in (the production end section's
// id — fixed contract) — class 'on' toggles visibility; #mfill (meter fill
// width), #wash (crossing wash opacity). The legibility scrim (body::before,
// production styles.css) listens to the --scrim custom property; pages
// without the scrim simply carry an unused variable.
export function createBeatUI(): BeatUI {
  const el = (id: string): HTMLElement | null => document.getElementById(id);
  const beats = { hero: el('beat-hero'), mid: el('beat-mid'), open: el('beat-open'), end: el('beat-end') ?? el('walk-in') };
  const mfill = el('mfill');
  const wash = el('wash');
  return {
    setMeter(p: number): void {
      if (mfill) mfill.style.width = `${(p * 100).toFixed(2)}%`;
    },
    setWash(o: number): void {
      if (wash) wash.style.opacity = o.toFixed(3);
    },
    setScrim(o: number): void {
      document.documentElement.style.setProperty('--scrim', o.toFixed(3));
    },
    setBeats(s: ReturnType<typeof beatStates>): void {
      beats.hero?.classList.toggle('on', s.hero);
      beats.mid?.classList.toggle('on', s.mid);
      beats.open?.classList.toggle('on', s.open);
      beats.end?.classList.toggle('on', s.end);
    },
  };
}
