import { decryptData, encryptData, generateEncryptionKey } from "./encryption";

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
    const bytes =
        buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        const byte = bytes[i];
        if (byte === undefined) continue;
        binary += String.fromCharCode(byte);
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
    const padding = "=".repeat((4 - (str.length % 4)) % 4);
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function readAll(
    readable: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
    const reader = readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
    const stream = new CompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    writer.write(bytes as BufferSource);
    writer.close();
    return readAll(stream.readable);
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
    const stream = new DecompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    writer.write(bytes as BufferSource);
    writer.close();
    return readAll(stream.readable);
}

export interface Payload {
    c: string;
    e: number;
    m: string;
}

function getHashParts(
    hash: string
): { key: string; iv: string; ciphertext: string } | null {
    const withoutPrefix = hash.startsWith("#") ? hash.slice(1) : hash;
    const parts = withoutPrefix.split(":");
    if (parts.length !== 4) return null;
    const [version, key, iv, ciphertext] = parts;
    if (version !== "v1") return null;
    if (!(key && iv && ciphertext)) return null;
    return { ciphertext, iv, key };
}

export async function packPayload(payload: Payload): Promise<{
    urlHash: string;
    fullUrl: string;
}> {
    const json = JSON.stringify(payload);
    const encoded = new TextEncoder().encode(json);
    const compressed = await compress(encoded);
    const key = await generateEncryptionKey("cryptoKey");
    const { encryptedBuffer, iv } = await encryptData(
        key,
        compressed as Uint8Array<ArrayBuffer>
    );
    const jwk = await window.crypto.subtle.exportKey("jwk", key);
    if (!jwk.k) throw new Error("Failed to export key");
    const hash = `v1:${jwk.k}:${toBase64Url(iv)}:${toBase64Url(encryptedBuffer)}`;
    if (typeof window === "undefined") {
        return { fullUrl: hash, urlHash: hash };
    }
    const fullUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    return { fullUrl, urlHash: hash };
}

export async function unpackPayload(hash: string): Promise<Payload | null> {
    const parts = getHashParts(hash);
    if (!parts) return null;
    const iv = fromBase64Url(parts.iv);
    const ciphertext = fromBase64Url(parts.ciphertext);
    const decrypted = await decryptData(
        iv as Uint8Array<ArrayBuffer>,
        ciphertext as Uint8Array<ArrayBuffer>,
        parts.key
    );
    const decompressed = await decompress(new Uint8Array(decrypted));
    const json = new TextDecoder().decode(decompressed);
    return JSON.parse(json) as Payload;
}

export function estimateUrlLength(payload: Payload): number {
    if (typeof window === "undefined") return 0;
    const prefix = `${window.location.origin}${window.location.pathname}#v1:::`;
    const content = JSON.stringify(payload).length;
    // rough estimate: deflate ~0.5 ratio, base64 ~1.33 expansion
    const estimatedCiphertext = Math.ceil((content * 0.5 * 4) / 3);
    return prefix.length + 22 + 16 + estimatedCiphertext;
}
