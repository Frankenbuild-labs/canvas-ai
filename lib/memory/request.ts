import { cookies, headers } from "next/headers";

export function getUserAndSession() {
  const hdrs = headers();
  const cks = cookies();
  // Try explicit headers first
  const userId =
    hdrs.get("x-user-id") ||
    cks.get("user_id")?.value ||
    hdrs.get("x-pegasus-device-id") ||
    cks.get("pegasus_device_id")?.value ||
    "anonymous";
  const sessionId =
    hdrs.get("x-session-id") ||
    cks.get("session_id")?.value ||
    hdrs.get("x-pegasus-session-id") ||
    cks.get("pegasus_session_id")?.value ||
    undefined;
  return { userId, sessionId } as { userId: string; sessionId?: string };
}
