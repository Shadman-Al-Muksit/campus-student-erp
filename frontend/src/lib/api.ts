import i18n from "../i18n";
const base = "/api/v1/";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(base + path, {
    credentials: "same-origin",
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  const data = await response
    .json()
    .catch(() => ({ detail: "The service returned an unexpected response." }));
  if (!response.ok) {
    if (
      path !== "auth/me/" &&
      (response.status === 401 ||
        (response.status === 403 &&
          typeof data.detail === "string" &&
          /authentication credentials were not provided|session.*expired/i.test(
            data.detail,
          )))
    )
      window.dispatchEvent(new Event("campus-session-expired"));
    throw new ApiError(
      typeof data.detail === "string" ? data.detail : JSON.stringify(data),
      response.status,
    );
  }
  return data as T;
}
export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const { csrfToken } = await api<{ csrfToken: string }>("auth/csrf/");
  return api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    body: JSON.stringify(body),
  });
}
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (i18n.language === "en") return error.message;
    if (error.status === 401 || error.status === 403)
      return i18n.t("sessionError");
    const msg = error.message.toLowerCase();
    if (msg.includes("credential") || msg.includes("password"))
      return i18n.t("loginError");
    if (msg.includes("prerequisite")) return i18n.t("prereqError");
    if (msg.includes("capacity") || msg.includes("full"))
      return i18n.t("capacityError");
    if (msg.includes("clash") || msg.includes("conflict"))
      return i18n.t("clashError");
    if (msg.includes("credit")) return i18n.t("creditError");
    if (msg.includes("already") || msg.includes("duplicate"))
      return i18n.t("duplicateError");
    if (
      msg.includes("window") ||
      msg.includes("closed") ||
      msg.includes("deadline")
    )
      return i18n.t("windowError");
    return i18n.t("validationError");
  }
  return i18n.t("networkError");
}
