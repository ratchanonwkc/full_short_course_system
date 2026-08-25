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

/**
 * Strip common Thai geographic administrative prefixes so searches like "ต.หมากแข้ง" or "ตำบลหมากแข้ง" match "หมากแข้ง"
 */
export function cleanThaiAddressPrefix(text = "") {
    if (!text) return "";
    return text
        .trim()
        .replace(/^(ต\.|ตำบล|แขวง)/, "")
        .replace(/^(อ\.|อำเภอ|เขต)/, "")
        .replace(/^(จ\.|จังหวัด)/, "")
        .trim();
}

/**
 * Extract tokens for multi-keyword searching
 */
export function parseSearchTokens(query = "") {
    if (!query) return [];
    return query
        .trim()
        .split(/\s+/)
        .map((t) => {
            const raw = t.trim().toLowerCase();
            const clean = cleanThaiAddressPrefix(raw).toLowerCase();
            return { raw, clean };
        })
        .filter((t) => t.raw.length > 0);
}

/**
 * Core search implementation with Subdistrict (ตำบล) priority
 */
export function searchAddressData(data, rawQuery, { limit = 25 } = {}) {
    if (!data || !Array.isArray(data) || !rawQuery) return [];

    const queryTrimmed = rawQuery.trim();
    if (queryTrimmed.length < 2) return [];

    const tokens = parseSearchTokens(queryTrimmed);
    if (tokens.length === 0) return [];

    const primaryToken = tokens[0];
    const scoredList = [];
    const seen = new Set();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const sub = (row.subdistrict || "").toLowerCase();
        const dist = (row.district || "").toLowerCase();
        const prov = (row.province || "").toLowerCase();
        const zip = (row.postalCode || row.postal_code || "").toLowerCase();

        // Check if ALL tokens match at least one field
        let matchesAllTokens = true;
        for (let j = 0; j < tokens.length; j++) {
            const { raw, clean } = tokens[j];
            const tokenMatches =
                (clean && (sub.includes(clean) || dist.includes(clean) || prov.includes(clean))) ||
                (raw && (sub.includes(raw) || dist.includes(raw) || prov.includes(raw) || zip.includes(raw)));

            if (!tokenMatches) {
                matchesAllTokens = false;
                break;
            }
        }

        if (!matchesAllTokens) continue;

        // Deduplication key
        const uniqueKey = `${row.subdistrict}|${row.district}|${row.province}|${zip}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);

        // Scoring algorithm — heavily prioritizes Subdistrict (ตำบล)
        let score = 0;
        const pClean = primaryToken.clean;
        const pRaw = primaryToken.raw;

        // 1. Subdistrict matches (Primary Priority)
        if (pClean && sub === pClean) {
            score += 1000;
        } else if (pClean && sub.startsWith(pClean)) {
            score += 800;
        } else if (pClean && sub.includes(pClean)) {
            score += 600;
        } else if (pRaw && sub.includes(pRaw)) {
            score += 550;
        }

        // 2. District matches (Secondary Priority)
        if (pClean && dist === pClean) {
            score += 450;
        } else if (pClean && dist.startsWith(pClean)) {
            score += 400;
        } else if (pClean && dist.includes(pClean)) {
            score += 300;
        }

        // 3. Postal code matches
        if (pRaw && zip === pRaw) {
            score += 350;
        } else if (pRaw && zip.startsWith(pRaw)) {
            score += 250;
        } else if (pRaw && zip.includes(pRaw)) {
            score += 150;
        }

        // 4. Province matches
        if (pClean && prov === pClean) {
            score += 200;
        } else if (pClean && prov.startsWith(pClean)) {
            score += 180;
        } else if (pClean && prov.includes(pClean)) {
            score += 120;
        }

        // Add small bonus for shorter subdistrict names when matching
        if (sub.includes(pClean || pRaw)) {
            score += Math.max(0, 30 - sub.length);
        }

        scoredList.push({ row, score });
    }

    // Sort descending by score, then subdistrict length
    scoredList.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.row.subdistrict || "").length - (b.row.subdistrict || "").length;
    });

    return scoredList.slice(0, limit).map((item) => item.row);
}

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
 * Provides instant in-memory lookup by subdistrict, district, province, or postal code.
 *
 * Returns:
 *   - ready: boolean
 *   - loading: boolean
 *   - error: Error | null
 *   - searchAddress(query, options): Array<{ subdistrict, district, province, postalCode, ... }>
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

    const searchAddress = useCallback(
        (query, options) => {
            if (!memoryCache) return [];
            return searchAddressData(memoryCache, query, options);
        },
        []
    );

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
        searchAddress,
        searchByZipcode,
        lookupByPostalCode,
        data: memoryCache || [],
    };
}
