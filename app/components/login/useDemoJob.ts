"use client";

import { useEffect, useRef, useState } from "react";

// Polls /api/demo-status for a job kicked off by /api/demo-generate.
// The generation itself keeps running server-side via waitUntil even if
// nobody's watching, so this hook is purely about the UI catching up to
// whatever state the job is actually in — including picking up a job
// that finished while the tab was closed.
export function useDemoJob(jobId: string | null) {
  const [status, setStatus] = useState<"pending" | "done" | "error" | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }

    setStatus("pending");
    setCode("");
    setError("");
    setClientName("");
    startRef.current = Date.now();
    setElapsed(0);

    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout>;

    const tickInterval = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    async function poll() {
      try {
        const res = await fetch(`/api/demo-status?jobId=${jobId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.clientName) setClientName(data.clientName);

        if (data.status === "done") {
          setStatus("done");
          setCode(data.code || "");
          return;
        }
        if (data.status === "error") {
          setStatus("error");
          setError(data.error || "Something went wrong.");
          return;
        }
        pollTimeout = setTimeout(poll, 3000);
      } catch {
        if (!cancelled) pollTimeout = setTimeout(poll, 3000);
      }
    }
    poll();

    return () => {
      cancelled = true;
      clearInterval(tickInterval);
      clearTimeout(pollTimeout);
    };
  }, [jobId]);

  return { status, code, error, elapsed, clientName };
}
