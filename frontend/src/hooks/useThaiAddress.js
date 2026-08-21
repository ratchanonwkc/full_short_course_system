import { useEffect, useRef, useState, useCallback } from "react";

const SUBDISTRICTS_URL =
    "https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src/subdistricts.json";
const DISTRICTS_URL =
    "https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src/districts.json";
const PROVINCES_URL =
    "https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src/provinces.json";

const CACHE_KEY = "__thai_geography_cache_v2";

// Module-level memory cache: survives component remounts and route transitions.
// Ensures dataset is downloaded only once per session.
let memoryCache = null;
let memoryIndex = null;
let inFlightPromise = null;

async function loadData() {
    if (memoryCache && memoryIndex) {
        return { data: memoryCache, index: memoryIndex };
    }
    if (inFlightPromise) {
        return inFlightPromise;
    }

    inFlightPromise = (async () => {
        // Try reading from sessionStorage first
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    memoryCache = parsed;
                    memoryIndex = buildIndexMap(parsed);
                    return { data: memoryCache, index: memoryIndex };
                }
            }
        } catch {
            // sessionStorage disabled / quota exceeded — fall through to network
        }

        const [subdistrictsRes, districtsRes, provincesRes] = await Promise.all([
            fetch(SUBDISTRICTS_URL),
            fetch(DISTRICTS_URL).catch(() => null),
            fetch(PROVINCES_URL).catch(() => null),
        ]);

        if (!subdistrictsRes.ok) {
            throw new Error("Failed to load Thai geography subdistricts dataset");
        }

        const subdistricts = await subdistrictsRes.json();
        const districts = districtsRes && districtsRes.ok ? await districtsRes.json() : [];
        const provinces = provincesRes && provincesRes.ok ? await provincesRes.json() : [];

        const districtMap = new Map();
        for (const d of districts) {
            if (d.districtCode != null) {
                districtMap.set(d.districtCode, d.districtNameTh || d.districtName || "");
            }
        }

        const provinceMap = new Map();
        for (const p of provinces) {
            if (p.provinceCode != null) {
                provinceMap.set(p.provinceCode, p.provinceNameTh || p.provinceName || "");
            }
        }

        const normalizedData = subdistricts.map((row) => {
            const subdistrict = row.subdistrictNameTh || row.subdistrict || "";
            const district =
                row.districtNameTh ||
                districtMap.get(row.districtCode) ||
                row.district ||
                "";
            const province =
                row.provinceNameTh ||
                provinceMap.get(row.provinceCode) ||
                row.province ||
                "";
            const postalCode = String(row.postalCode ?? row.postal_code ?? row.zipcode ?? "").trim();

            return {
                id: row.id,
                subdistrict,
                district,
                province,
                postalCode,
                postal_code: postalCode,
                subdistrictNameTh: subdistrict,
                districtNameTh: district,
                provinceNameTh: province,
                provinceCode: row.provinceCode,
                districtCode: row.districtCode,
                subdistrictCode: row.subdistrictCode,
            };
        });

        memoryCache = normalizedData;
        memoryIndex = buildIndexMap(normalizedData);

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(normalizedData));
        } catch {
            // Quota exceeded: in-memory cache remains active for this session
        }

        return { data: memoryCache, index: memoryIndex };
    })();

    return inFlightPromise;
}

function buildIndexMap(rows) {
    const map = new Map();
    for (const row of rows) {
        const code = String(row.postalCode || row.postal_code || "").trim();
        if (!code) continue;
        if (!map.has(code)) {
            map.set(code, []);
        }
        map.get(code).push(row);
    }
    return map;
}

/**
 * useThaiAddress
 * -------------------------------------------------------------------------
 * Fetches and caches thailand-geography-json dataset client-side.
 * Provides instant in-memory lookup by postal code (zipcode).
 *
 * Returns:
 *   - ready: boolean
 *   - loading: boolean
 *   - error: Error | null
 *   - searchByZipcode(zipcode): Array<{ subdistrict, district, province, postalCode, ... }>
 *   - lookupByPostalCode(code): alias to searchByZipcode
 *   - data: Array<all address records>
 */
export default function useThaiAddress() {
    const [ready, setReady] = useState(Boolean(memoryCache && memoryIndex));
    const [loading, setLoading] = useState(!memoryCache);
    const [error, setError] = useState(null);
    const indexRef = useRef(memoryIndex);

    useEffect(() => {
        let cancelled = false;

        if (memoryCache && memoryIndex) {
            indexRef.current = memoryIndex;
            setReady(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        loadData()
            .then(({ index }) => {
                if (cancelled) return;
                indexRef.current = index;
                setReady(true);
                setError(null);
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
    }, []);

    const searchByZipcode = useCallback((code) => {
        if (!code) return [];
        const cleanCode = String(code).replace(/\D/g, "").slice(0, 5);
        if (cleanCode.length !== 5) return [];

        const activeIndex = indexRef.current || memoryIndex;
        if (activeIndex) {
            return activeIndex.get(cleanCode) || [];
        }

        if (memoryCache) {
            return memoryCache.filter(
                (item) => String(item.postalCode) === cleanCode || String(item.postal_code) === cleanCode
            );
        }

        return [];
    }, []);

    // lookupByPostalCode is an alias for searchByZipcode for backward compatibility
    const lookupByPostalCode = searchByZipcode;

    return {
        ready,
        loading,
        error,
        searchByZipcode,
        lookupByPostalCode,
        data: memoryCache || [],
    };
}
