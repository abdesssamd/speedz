export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4100").replace(/\/$/, "");
export const WS_URL = API_URL.replace(/^http/i, "ws");
const COOKIE_SESSION_SENTINEL = "__cookie_session__";

export async function apiRequest(path, options = {}, token) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== COOKIE_SESSION_SENTINEL ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    const networkError = new Error(`Impossible de joindre l'API (${API_URL}). Verifiez que le backend est accessible.`);
    networkError.cause = error;
    throw networkError;
  }

  const rawBody = await response.text();
  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message =
      payload.message ||
      payload.error ||
      (rawBody && !/^<!doctype html/i.test(rawBody.trim()) ? rawBody.trim() : "") ||
      `Erreur API (${response.status})`;
    if (
      typeof window !== "undefined" &&
      (response.status === 401 ||
        response.status === 403 ||
        String(message).toLowerCase().includes("token"))
    ) {
      window.dispatchEvent(
        new CustomEvent("admin-auth-invalid", {
          detail: { message: "Session admin invalide ou expiree. Merci de vous reconnecter." },
        })
      );
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}
