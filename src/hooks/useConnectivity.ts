"use client";

import { useEffect, useState } from "react";

/**
 * Connectivity state for the offline read experience.
 *
 * "Offline" is deliberately more than `navigator.onLine === false` (see
 * docs/OFFLINE_PLAN.md §3): the API can be down while the network is up. The
 * app treats itself as offline when the browser reports offline OR a lightweight
 * health probe fails. The probe is cheap and debounced.
 */
export interface Connectivity {
  online: boolean;
  /** True once the initial probe has completed (avoids flashing the banner). */
  ready: boolean;
  /** Manually mark connectivity (e.g. after a data request 5xx). */
  reportFailure: () => void;
  /** Manually mark recovery (e.g. after a successful request). */
  reportSuccess: () => void;
}

const PROBE_URL = "/api/health";
const PROBE_INTERVAL_MS = 30_000;

export function useConnectivity(): Connectivity {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [apiReachable, setApiReachable] = useState(true);
  const [ready, setReady] = useState(false);
  // Bumped to re-run the probe immediately (don't wait for the next interval).
  const [probeToken, setProbeToken] = useState(0);

  useEffect(() => {
    const update = () => {
      setBrowserOnline(navigator.onLine);
      if (navigator.onLine) setProbeToken((token) => token + 1);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cancelled) {
          setApiReachable(false);
          setReady(true);
        }
        return;
      }
      try {
        const response = await fetch(PROBE_URL, {
          method: "GET",
          cache: "no-store",
        });
        if (!cancelled) setApiReachable(response.ok);
      } catch {
        if (!cancelled) setApiReachable(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    probe();
    const timer = setInterval(probe, PROBE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [probeToken]);

  return {
    online: browserOnline && apiReachable,
    ready,
    reportFailure: () => setApiReachable(false),
    reportSuccess: () => setApiReachable(true),
  };
}
