// Sonnerie « nouvelles courses » : rejoue le bip toutes les RING_INTERVAL_MS,
// pendant au plus RING_MAX_MS, jusqu'à stopRingtone() (le livreur a vu/pris la course).
//
// expo-av est chargé de façon PARESSEUSE (require au premier usage) et entièrement
// protégé : si le module natif est absent/instable dans le build, l'app ne plante
// jamais au démarrage — la sonnerie est simplement désactivée.
const RING_INTERVAL_MS = 1500;
const RING_MAX_MS = 30000;

let sound: any = null;
let audioModule: any = null;
let audioUnavailable = false;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function getAudio(): any {
  if (audioUnavailable) return null;
  if (audioModule) return audioModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    audioModule = require("expo-av").Audio;
    return audioModule;
  } catch {
    audioUnavailable = true;
    return null;
  }
}

async function ensureSound(): Promise<any> {
  if (sound) return sound;
  const Audio = getAudio();
  if (!Audio) return null;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
    const created = await Audio.Sound.createAsync(require("../assets/beep.wav"));
    sound = created.sound;
    return sound;
  } catch {
    return null;
  }
}

export async function startRingtone() {
  if (ringTimer) return; // déjà en train de sonner
  try {
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
  } catch {
    // audio indisponible : on ignore silencieusement
  }
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
  try {
    sound?.stopAsync?.().catch(() => undefined);
  } catch {
    // ignore
  }
}
