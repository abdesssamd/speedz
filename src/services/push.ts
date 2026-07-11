import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Enregistrement des notifications push (Expo).
 *
 * Tout est encapsulé dans des try/catch : si les permissions sont refusées, si
 * on est sur un émulateur, ou si le module n'est pas disponible, on renvoie
 * simplement `null` sans jamais casser le flux d'authentification.
 */

// Affiche les notifications même quand l'app est au premier plan.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // no-op : module indisponible (ex: web)
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    undefined
  );
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    if (!Device.isDevice) return null; // les push ne marchent pas sur émulateur

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Commandes",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF7622",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResponse?.data ?? null;
  } catch {
    return null;
  }
}

/** Abonne un handler au tap sur une notification. Renvoie une fonction de désabonnement. */
export function addNotificationResponseListener(
  handler: (data: Record<string, unknown>) => void
): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data || {};
      handler(data as Record<string, unknown>);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
