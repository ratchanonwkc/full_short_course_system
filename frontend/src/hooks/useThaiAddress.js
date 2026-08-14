import { useEffect, useRef, useState, useCallback } from "react";

const DATA_URL = "https://raw.githubusercontent.com/earthmie/thailand-geolocation-data/main/thailand_address.json";
const CACHE_KEY = "__thai_address_cache_v1";

// Module-level cache: survives across component instances/remounts within the session,
// so the ~3-8MB JSON is only ever fetched once per page load.
let memoryCache = null;
let inFlightPromise = null;

async function loadData() {
    if (memoryCache) return memoryCache;
    if (inFlightPromise) return inFlightPromise;

    inFlightPromise = (async () => {
        // Try sessionStorage first to survive route changes without re-fetching.
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                memoryCache = parsed;
                return parsed;
            }
        } catch {
            /* storage unavailable / quota — fall through to network */
        }

        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error("Failed to load Thai address dataset");
        const json = await res.json();
        memoryCache = json;
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(json));
        } catch {
            /* quota exceeded — memory cache still works for this session */
        }
        return json;
    })();

    return inFlightPromise;
}

/**
 * useThaiAddress
 * -------------------------------------------------------------------------
 * Fetches and caches the Thai address dataset client-side (zero DB overhead).
 * Provides an instant, in-memory postal-code lookup.
 *
 * Returns:
 *   - ready: boolean            -> dataset loaded and indexed
 *   - loading: boolean
 *   - error: Error | null
 *   - lookupByPostalCode(code): Array<{ subdistrict, district, province, postal_code }>
 */
export default function useThaiAddress() {
    const [ready, setReady] = useState(Boolean(memoryCache));
    const [loading, setLoading] = useState(!memoryCache);
    const [error, setError] = useState(null);
    const indexRef = useRef(null); // Map<postal_code, Array<row>>

    const buildIndex = useCallback((rows) => {
        const idx = new Map();
        for (const row of rows) {
            const code = String(row.zipcode ?? row.postal_code ?? "");
            if (!code) continue;
            if (!idx.has(code)) idx.set(code, []);
            idx.get(code).push({
                postal_code: code,
                subdistrict: row.district ?? row.subdistrict ?? "",
                district: row.amphoe ?? row.district_name ?? row.district ?? "",
                province: row.province ?? "",
            });
        }
        return idx;
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (indexRef.current) {
            setReady(true);
            setLoading(false);
            return;
        }
        setLoading(true);
        loadData()
            .then((rows) => {
                if (cancelled) return;
                indexRef.current = buildIndex(Array.isArray(rows) ? rows : rows.data || []);
                setReady(true);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [buildIndex]);

    const lookupByPostalCode = useCallback((code) => {
        if (!indexRef.current || !code) return [];
        return indexRef.current.get(String(code)) || [];
    }, []);

    return { ready, loading, error, lookupByPostalCode };
}
