import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

let cached: Promise<{ google: boolean }> | null = null;

/** Whether "Sign in with Google" is configured on the server (hidden otherwise). */
export function useGoogleLoginEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    cached ??= fetch(`${API_BASE_URL}/api/auth/providers/`)
      .then((r) => (r.ok ? r.json() : { google: false }))
      .catch(() => ({ google: false }));
    let alive = true;
    cached.then((p) => alive && setEnabled(Boolean(p.google)));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
