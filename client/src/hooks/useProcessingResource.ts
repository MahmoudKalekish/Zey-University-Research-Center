import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../services/api";
import {
  isProcessing,
  type ProcessingStatus,
} from "../types/publication-document";

// One request at a time; polling ends on completion and callbacks cannot update an unmounted screen.
export function useProcessingResource<T extends { status: ProcessingStatus }>(
  path: string,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);
  const [version, setVersion] = useState(0);
  const sequence = useRef(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const current = ++sequence.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!enabled) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const result = await api<T>(path);
        if (cancelled || current !== sequence.current) return;
        setData(result);
        setError("");
        if (isProcessing(result.status))
          timer = setTimeout(() => void load(), 2000);
      } catch (failure) {
        if (cancelled || current !== sequence.current) return;
        setData(null);
        setError(
          failure instanceof ApiError && failure.status === 404
            ? ""
            : failure instanceof Error
              ? failure.message
              : "Unable to load processing status.",
        );
      } finally {
        if (!cancelled && current === sequence.current) setLoading(false);
      }
    }
    setLoading(true);
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path, enabled, version]);
  return { data, setData, error, loading, refresh };
}
