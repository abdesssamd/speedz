import { useEffect, useState } from "react";

/**
 * Connectivité globale, sans dépendance native.
 *
 * L'état est piloté par la couche API : chaque requête réussie signale "online",
 * chaque échec réseau (fetch qui throw / timeout) signale "offline". Un composant
 * peut s'abonner via `useConnectivity()` pour afficher une bannière hors-ligne.
 */

type Listener = (online: boolean) => void;

let isOnline = true;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(isOnline));
}

/** Appelé par la couche API quand une requête aboutit. */
export function reportOnline() {
  if (!isOnline) {
    isOnline = true;
    emit();
  }
}

/** Appelé par la couche API quand une requête échoue pour cause réseau. */
export function reportOffline() {
  if (isOnline) {
    isOnline = false;
    emit();
  }
}

export function getIsOnline() {
  return isOnline;
}

/** Hook React : renvoie `true` tant que la connexion au serveur fonctionne. */
export function useConnectivity() {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const listener: Listener = (next) => setOnline(next);
    listeners.add(listener);
    // Synchronise en cas de changement entre le render et l'abonnement.
    setOnline(isOnline);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return online;
}
