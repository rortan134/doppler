import { createFileRoute } from "@tanstack/react-router";

import {
    MapArc,
    Map as MapComp,
    MapMarker,
    MarkerContent,
    MarkerLabel,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: App });

function App() {
    return (
        <main className="mx-auto max-w-xl px-4 pt-14 pb-8">
            <h1 className="text-4xl">hello world</h1>
            <div className="h-[420px] w-full">
                <MapComp
                    center={[hub.lng, hub.lat]}
                    projection={{ type: "globe" }}
                    zoom={1}
                >
                    <MapArc
                        data={arcs}
                        interactive={false}
                        paint={{
                            "line-color": "#3b82f6",
                            "line-dasharray": [2, 2],
                        }}
                    />

                    <MapMarker latitude={hub.lat} longitude={hub.lng}>
                        <MarkerContent>
                            <div className="size-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
                            <MarkerLabel
                                className="rounded-sm bg-background/80 px-1.5 py-0.5 font-semibold text-[11px] backdrop-blur"
                                position="top"
                            >
                                {hub.name}
                            </MarkerLabel>
                        </MarkerContent>
                    </MapMarker>
                    {destinations.map((dest) => (
                        <MapMarker
                            key={dest.name}
                            latitude={dest.lat}
                            longitude={dest.lng}
                        >
                            <MarkerContent>
                                <div
                                    className={cn(
                                        "size-2 rounded-full border-2 border-white",
                                        "bg-emerald-500 shadow"
                                    )}
                                />
                                <MarkerLabel position="top">
                                    {dest.name}
                                </MarkerLabel>
                            </MarkerContent>
                        </MapMarker>
                    ))}
                </MapComp>
            </div>
        </main>
    );
}

// Origin where all the lines will come out of visually
const hub = { lat: 51.5074, lng: -0.1276, name: "London" };

// Final destination connected to hub origin point
const destinations = [
    { lat: 40.7128, lng: -74.006, name: "New York" },
    { lat: -23.5505, lng: -46.6333, name: "São Paulo" },
    { lat: -33.9249, lng: 18.4241, name: "Cape Town" },
    { lat: 25.2048, lng: 55.2708, name: "Dubai" },
    { lat: 19.076, lng: 72.8777, name: "Mumbai" },
    { lat: 1.3521, lng: 103.8198, name: "Singapore" },
    { lat: 35.6895, lng: 139.6917, name: "Tokyo" },
    { lat: -33.8688, lng: 151.2093, name: "Sydney" },
];

// built data structure for relating the points
const arcs = destinations.map((dest) => ({
    from: [hub.lng, hub.lat] as [number, number],
    id: dest.name,
    to: [dest.lng, dest.lat] as [number, number],
}));
