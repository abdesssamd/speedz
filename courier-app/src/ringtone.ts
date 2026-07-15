import { Audio } from "expo-av";

// Sonnerie « nouvelles courses » : rejoue le bip toutes les RING_INTERVAL_MS,
// pendant au plus RING_MAX_MS, jusqu'à stopRingtone() (le livreur a vu/pris la course).
const RING_INTERVAL_MS = 1500;
const RING_MAX_MS = 30000;

let sound: Audio.Sound | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureSound(): Promise<Audio.Sound | null> {
  if (sound) return sound;
  try {
    // playsInSilentModeIOS : la sonnerie doit passer même téléphone en silencieux,
    // comme un appel entrant — c'est le signal de travail du livreur.
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
    const created = await Audio.Sound.createAsync(require("../assets/beep.wav"));
    sound = created.sound;
    return sound;
  } catch {
    return null; // audio indisponible (permissions web avant interaction, etc.)
  }
}

export async function startRingtone() {
  if (ringTimer) return; // déjà en train de sonner
  const s = await ensureSound();
  if (!s) return;

  const ring = async () => {
    try {
      await s.replayAsync();
    } catch {
      // ignore : ne jamais faire planter l'app pour un bip
    }
  };

  await ring();
  ringTimer = setInterval(ring, RING_INTERVAL_MS);
  stopTimer = setTimeout(stopRingtone, RING_MAX_MS);
}

export function stopRingtone() {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  sound?.stopAsync().catch(() => undefined);
}
