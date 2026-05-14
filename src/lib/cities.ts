import type * as cityTimezones from "city-timezones";

interface RawCity {
    city: string;
    city_ascii: string;
    country: string;
    iso2: string;
    iso3: string;
    lat: number;
    lng: number;
    pop: number;
    province: string;
    timezone: string;
}

export interface CityOption {
    country: string;
    id: string;
    lat: number;
    lng: number;
    name: string;
}

const citiesMap = new Map<string, CityOption & { pop: number }>();
export const cities: CityOption[] = [];
let loaded = false;

export async function loadCities(): Promise<void> {
    if (loaded) return;
    const ct: typeof cityTimezones = await import("city-timezones");
    const mapping = ct.cityMapping as RawCity[];
    const regionNames = new Intl.DisplayNames("en", { type: "region" });

    for (const entry of mapping) {
        const id = `${entry.city_ascii}|${entry.iso2}`;
        const existing = citiesMap.get(id);
        if (!existing || entry.pop > existing.pop) {
            citiesMap.set(id, {
                country: regionNames.of(entry.iso2) ?? entry.country,
                id,
                lat: entry.lat,
                lng: entry.lng,
                name: entry.city,
                pop: entry.pop,
            });
        }
    }

    const resolved = Array.from(citiesMap.values())
        .map((c) => ({
            country: c.country,
            id: c.id,
            lat: c.lat,
            lng: c.lng,
            name: c.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    cities.length = 0;
    cities.push(...resolved);
    loaded = true;
}

export function getCityById(id: string): CityOption | undefined {
    const city = citiesMap.get(id);
    if (!city) return;
    return {
        country: city.country,
        id: city.id,
        lat: city.lat,
        lng: city.lng,
        name: city.name,
    };
}
