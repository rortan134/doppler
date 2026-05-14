import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useHash } from "@/hooks/use-hash";
import { cities, getCityById, loadCities } from "@/lib/cities";
import {
    estimateUrlLength,
    packPayload,
    unpackPayload,
    type Payload,
} from "@/lib/pack";
import { RadialIcon } from "@/components/radial-icon";
import {
    MapArc,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerLabel,
    Map as MapComp,
    type MapRef,
} from "@/components/ui/map";
import {
    Combobox,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    AlertCircle,
    Check,
    Copy,
    Globe,
    Lock,
    MapPin,
    Trash2,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
    const { hash, removeHash } = useHash();
    const hasHash = hash.length > 1;

    return (
        <main className="mx-auto max-w-xl px-4 pt-10 pb-8">
            {hasHash ? (
                <ReadView hash={hash} onClear={removeHash} />
            ) : (
                <ComposeView />
            )}
        </main>
    );
}

/* ------------------------------------------------------------------ */
/*  Compose                                                            */
/* ------------------------------------------------------------------ */

function ComposeView() {
    const [message, setMessage] = React.useState("");
    const [cityId, setCityId] = React.useState("");
    const [citySearch, setCitySearch] = React.useState("");
    const [expiresAt, setExpiresAt] = React.useState("");
    const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
    const [copying, setCopying] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [citiesReady, setCitiesReady] = React.useState(false);

    React.useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 60);
        setExpiresAt(now.toISOString().slice(0, 16));
    }, []);

    React.useEffect(() => {
        loadCities().then(() => setCitiesReady(true));
    }, []);

    const selectedCity = cityId ? getCityById(cityId) : null;

    const filteredCities = React.useMemo(() => {
        if (!citiesReady) return [];
        const q = citySearch.trim().toLowerCase();
        if (!q) {
            return cities.slice(0, 100);
        }
        return cities
            .filter((c) => `${c.name}, ${c.country}`.toLowerCase().includes(q))
            .slice(0, 200);
    }, [citySearch, citiesReady]);

    const payloadForEstimate: Payload = {
        c: cityId,
        e: new Date(expiresAt || Date.now()).getTime(),
        m: message,
    };
    const estimatedLen = estimateUrlLength(payloadForEstimate);
    const capacityPct = Math.min((estimatedLen / 2000) * 100, 100);
    const overLimit = estimatedLen > 2000;

    const handleGenerate = React.useCallback(async () => {
        if (!(message.trim() && cityId && expiresAt) || overLimit) {
            return;
        }
        setIsGenerating(true);
        try {
            const result = await packPayload({
                c: cityId,
                e: new Date(expiresAt).getTime(),
                m: message.trim(),
            });
            setGeneratedUrl(result.fullUrl);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    }, [message, cityId, expiresAt, overLimit]);

    const handleCopy = React.useCallback(async () => {
        if (!generatedUrl) {
            return;
        }
        await navigator.clipboard.writeText(generatedUrl);
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
    }, [generatedUrl]);

    const minDate = React.useMemo(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    }, []);

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl tracking-tight">
                    Send a private message
                </h1>
                <p className="text-muted-foreground text-sm">
                    End-to-end encrypted. The server never sees your message.
                </p>
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="message">
                    Message
                </label>
                <Textarea
                    id="message"
                    onChange={(e) => {
                        setMessage(e.target.value);
                        setGeneratedUrl(null);
                    }}
                    placeholder="Type your sensitive message here..."
                    rows={5}
                    value={message}
                />
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <RadialIcon
                        height={16}
                        size={8}
                        value={capacityPct}
                        width={16}
                    />
                    <span>{estimatedLen.toLocaleString()} / 2,000 bytes</span>
                    {overLimit && (
                        <span className="font-medium text-destructive">
                            Over limit
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm">Origin city</label>
                {!citiesReady ? (
                    <div className="flex h-10 items-center gap-2 rounded-lg border bg-muted px-3 text-muted-foreground text-sm">
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading cities…
                    </div>
                ) : (
                    <Combobox
                        inputValue={citySearch}
                        onInputValueChange={(inputValue: string) => {
                            setCitySearch(inputValue);
                            if (
                                selectedCity &&
                                !`${selectedCity.name}, ${selectedCity.country}`
                                    .toLowerCase()
                                    .includes(inputValue.toLowerCase())
                            ) {
                                setCityId("");
                            }
                        }}
                        onValueChange={(v: string | null) => {
                            const id = v ?? "";
                            setCityId(id);
                            const city = id ? getCityById(id) : null;
                            setCitySearch(
                                city ? `${city.name}, ${city.country}` : ""
                            );
                            setGeneratedUrl(null);
                        }}
                        value={cityId}
                    >
                        <ComboboxInput
                            placeholder="Search city..."
                            showClear
                            startAddon={
                                <MapPin className="size-4 text-muted-foreground" />
                            }
                        />
                        <ComboboxPopup>
                            <ComboboxList>
                                {filteredCities.map((city) => (
                                    <ComboboxItem key={city.id} value={city.id}>
                                        {city.name}, {city.country}
                                    </ComboboxItem>
                                ))}
                            </ComboboxList>
                        </ComboboxPopup>
                    </Combobox>
                )}
            </div>

            <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="expires">
                    Expires at
                </label>
                <Input
                    id="expires"
                    min={minDate}
                    nativeInput
                    onChange={(e) => {
                        setExpiresAt(e.target.value);
                        setGeneratedUrl(null);
                    }}
                    required
                    type="datetime-local"
                    value={expiresAt}
                />
                <p className="text-muted-foreground text-xs">
                    The message will be permanently unreadable after this time.
                </p>
            </div>

            <div className="h-[240px] w-full overflow-hidden rounded-lg border">
                <MapComp
                    center={
                        selectedCity
                            ? [selectedCity.lng, selectedCity.lat]
                            : [0, 20]
                    }
                    projection={{ type: "globe" }}
                    zoom={selectedCity ? 4 : 1}
                >
                    <MapControls showLocate={false} showZoom />
                    {selectedCity && (
                        <MapMarker
                            latitude={selectedCity.lat}
                            longitude={selectedCity.lng}
                        >
                            <MarkerContent>
                                <div className="size-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
                                <MarkerLabel
                                    className="rounded-sm bg-background/80 px-1.5 py-0.5 font-semibold text-[11px] backdrop-blur"
                                    position="top"
                                >
                                    {selectedCity.name}
                                </MarkerLabel>
                            </MarkerContent>
                        </MapMarker>
                    )}
                </MapComp>
            </div>

            <button
                className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors",
                    !(message.trim() && cityId && expiresAt) ||
                        overLimit ||
                        isGenerating
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                disabled={
                    !(message.trim() && cityId && expiresAt) ||
                    overLimit ||
                    isGenerating
                }
                onClick={handleGenerate}
                type="button"
            >
                {isGenerating ? (
                    "Encrypting..."
                ) : (
                    <>
                        <Lock className="size-4" />
                        Generate secure link
                    </>
                )}
            </button>

            {generatedUrl && (
                <div className="space-y-2">
                    <label className="font-medium text-sm">
                        Share this link
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
                        <input
                            className="flex-1 bg-transparent text-sm outline-none"
                            readOnly
                            value={generatedUrl}
                        />
                        <button
                            className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1.5 font-medium text-xs shadow-sm hover:bg-accent"
                            onClick={handleCopy}
                            type="button"
                        >
                            {copying ? (
                                <Check className="size-3.5" />
                            ) : (
                                <Copy className="size-3.5" />
                            )}
                            {copying ? "Copied" : "Copy"}
                        </button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Anyone with this link can read the message until it
                        expires.
                    </p>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

type ReadState =
    | { status: "loading" }
    | { status: "error" }
    | { status: "expired" }
    | { status: "success"; payload: Payload };

function ReadView({ hash, onClear }: { hash: string; onClear: () => void }) {
    const [readState, setReadState] = React.useState<ReadState>({
        status: "loading",
    });
    const [senderCity, setSenderCity] = React.useState<{
        lat: number;
        lng: number;
        name: string;
    } | null>(null);
    const [receiverPos, setReceiverPos] = React.useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const mapRef = React.useRef<MapRef>(null);

    React.useEffect(() => {
        let cancelled = false;
        async function run() {
            try {
                const payload = await unpackPayload(hash);
                if (cancelled) {
                    return;
                }
                if (!payload) {
                    setReadState({ status: "error" });
                    return;
                }
                if (Date.now() > payload.e) {
                    setReadState({ status: "expired" });
                    return;
                }
                setReadState({ payload, status: "success" });
                const city = getCityById(payload.c);
                if (city) {
                    setSenderCity({
                        lat: city.lat,
                        lng: city.lng,
                        name: city.name,
                    });
                }
            } catch {
                if (!cancelled) {
                    setReadState({ status: "error" });
                }
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [hash]);

    React.useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) =>
                setReceiverPos({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }),
            () => {},
            { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
        );
    }, []);

    React.useEffect(() => {
        const map = mapRef.current;
        if (!(map && senderCity)) {
            return;
        }
        if (receiverPos) {
            const minLng = Math.min(senderCity.lng, receiverPos.lng);
            const maxLng = Math.max(senderCity.lng, receiverPos.lng);
            const minLat = Math.min(senderCity.lat, receiverPos.lat);
            const maxLat = Math.max(senderCity.lat, receiverPos.lat);
            map.fitBounds(
                [
                    [minLng, minLat],
                    [maxLng, maxLat],
                ],
                { padding: 60 }
            );
        } else {
            map.flyTo({
                center: [senderCity.lng, senderCity.lat],
                zoom: 3,
            });
        }
    }, [senderCity, receiverPos]);

    if (readState.status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Lock className="size-6 animate-pulse" />
                <p className="text-sm">Unlocking message...</p>
            </div>
        );
    }

    if (readState.status === "error") {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-destructive/36 bg-destructive/8 p-6 text-center">
                    <AlertCircle className="mx-auto mb-3 size-8 text-destructive" />
                    <h2 className="font-semibold text-lg">
                        Invalid or corrupted link
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm">
                        The message could not be decrypted. It may have been
                        tampered with or the URL is incomplete.
                    </p>
                </div>
                <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-medium text-sm hover:bg-accent"
                    onClick={onClear}
                    type="button"
                >
                    <Trash2 className="size-4" /> Clear link
                </button>
            </div>
        );
    }

    if (readState.status === "expired") {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-destructive/36 bg-destructive/8 p-6 text-center">
                    <Trash2 className="mx-auto mb-3 size-8 text-destructive" />
                    <h2 className="font-semibold text-lg">
                        This message has self-destructed
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm">
                        The expiration date has passed and the message is gone
                        forever.
                    </p>
                </div>
                <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-medium text-sm hover:bg-accent"
                    onClick={onClear}
                    type="button"
                >
                    <Trash2 className="size-4" /> Clear link
                </button>
            </div>
        );
    }

    const payload = readState.payload;
    const city = getCityById(payload.c);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Lock className="size-4" />
                <span className="font-medium text-sm">
                    Decrypted locally in your browser
                </span>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {payload.m}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {city
                        ? `${city.name}, ${city.country}`
                        : "Unknown location"}
                </span>
                <span className="flex items-center gap-1.5">
                    <Globe className="size-4" />
                    Expires {new Date(payload.e).toLocaleString()}
                </span>
            </div>

            <div className="h-[320px] w-full overflow-hidden rounded-lg border">
                <MapComp
                    center={
                        senderCity ? [senderCity.lng, senderCity.lat] : [0, 20]
                    }
                    projection={{ type: "globe" }}
                    ref={mapRef}
                    zoom={2}
                >
                    <MapControls showLocate={false} showZoom />
                    {senderCity && (
                        <MapMarker
                            latitude={senderCity.lat}
                            longitude={senderCity.lng}
                        >
                            <MarkerContent>
                                <div className="size-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
                                <MarkerLabel
                                    className="rounded-sm bg-background/80 px-1.5 py-0.5 font-semibold text-[11px] backdrop-blur"
                                    position="top"
                                >
                                    {senderCity.name}
                                </MarkerLabel>
                            </MarkerContent>
                        </MapMarker>
                    )}
                    {receiverPos && (
                        <MapMarker
                            latitude={receiverPos.lat}
                            longitude={receiverPos.lng}
                        >
                            <MarkerContent>
                                <div className="size-3 rounded-full border-2 border-white bg-emerald-500 shadow-md" />
                                <MarkerLabel
                                    className="rounded-sm bg-background/80 px-1.5 py-0.5 font-semibold text-[11px] backdrop-blur"
                                    position="top"
                                >
                                    You
                                </MarkerLabel>
                            </MarkerContent>
                        </MapMarker>
                    )}
                    {senderCity && receiverPos && (
                        <MapArc
                            data={[
                                {
                                    from: [senderCity.lng, senderCity.lat],
                                    id: "arc",
                                    to: [receiverPos.lng, receiverPos.lat],
                                },
                            ]}
                            interactive={false}
                            paint={{
                                "line-color": "#3b82f6",
                                "line-dasharray": [2, 2],
                            }}
                        />
                    )}
                </MapComp>
            </div>

            <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 font-medium text-sm hover:bg-accent"
                onClick={onClear}
                type="button"
            >
                <Trash2 className="size-4" /> Clear link and return to composer
            </button>
        </div>
    );
}
