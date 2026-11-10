"use client";

import { useEffect, useState } from "react";

/**
 * Connectivity state for the offline read experience.
 *
 * "Offline" is deliberately more than `navigator.onLine === false` (see
 * docs/OFFLINE_PLAN.md › Connectivity): the API can be down while the network is up. The
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
  // Start as online on both server and client, then read the real value after
  // mounting. Reading `navigator.onLine` during render breaks hydration: Node
  // 21+ has a global `navigator` without `onLine`, so the server would render
  // the offline (read-only) UI while the browser renders the online one.
  const [browserOnline, setBrowserOnline] = useState(true);
  const [apiReachable, setApiReachable] = useState(true);
  const [ready, setReady] = useState(false);
  // Bumped to re-run the probe immediately (don't wait for the next interval).
  const [probeToken, setProbeToken] = useState(0);

  useEffect(() => {
    const update = () => {
      setBrowserOnline(navigator.onLine);
      if (navigator.onLine) setProbeToken((token) => token + 1);
    };
    setBrowserOnline(navigator.onLine);
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
