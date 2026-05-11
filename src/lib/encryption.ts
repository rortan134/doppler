import { blobToArrayBuffer } from "./blob";

export const ENCRYPTION_KEY_BITS = 128;
export const IV_LENGTH_BYTES = 12;

export const createIV = (): Uint8Array<ArrayBuffer> => {
    const arr = new Uint8Array(IV_LENGTH_BYTES);
    return window.crypto.getRandomValues(arr);
};

export const generateEncryptionKey = async <
    T extends "string" | "cryptoKey" = "string",
>(
    returnAs?: T
): Promise<T extends "cryptoKey" ? CryptoKey : string> => {
    const key = await window.crypto.subtle.generateKey(
        {
            length: ENCRYPTION_KEY_BITS,
            name: "AES-GCM",
        },
        true, // extractable
        ["encrypt", "decrypt"]
    );
    return (
        returnAs === "cryptoKey"
            ? key
            : (await window.crypto.subtle.exportKey("jwk", key)).k
    ) as T extends "cryptoKey" ? CryptoKey : string;
};

export const getCryptoKey = (key: string, usage: KeyUsage) =>
    window.crypto.subtle.importKey(
        "jwk",
        {
            alg: "A128GCM",
            ext: true,
            k: key,
            key_ops: ["encrypt", "decrypt"],
            kty: "oct",
        },
        {
            length: ENCRYPTION_KEY_BITS,
            name: "AES-GCM",
        },
        false, // extractable
        [usage]
    );

export const encryptData = async (
    key: string | CryptoKey,
    data: Uint8Array<ArrayBuffer> | ArrayBuffer | Blob | File | string
): Promise<{ encryptedBuffer: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> => {
    const importedKey =
        typeof key === "string" ? await getCryptoKey(key, "encrypt") : key;
    const iv = createIV();
    const buffer: ArrayBuffer | Uint8Array<ArrayBuffer> =
        typeof data === "string"
            ? new TextEncoder().encode(data)
            : data instanceof Uint8Array
              ? data
              : data instanceof Blob
                ? await blobToArrayBuffer(data)
                : data;

    // We use symmetric encryption. AES-GCM is the recommended algorithm and
    // includes checks that the ciphertext has not been modified by an attacker.
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            iv,
            name: "AES-GCM",
        },
        importedKey,
        buffer
    );

    return { encryptedBuffer, iv };
};

export const decryptData = async (
    iv: Uint8Array<ArrayBuffer>,
    encrypted: Uint8Array<ArrayBuffer> | ArrayBuffer,
    privateKey: string
): Promise<ArrayBuffer> => {
    const key = await getCryptoKey(privateKey, "decrypt");
    return window.crypto.subtle.decrypt(
        {
            iv,
            name: "AES-GCM",
        },
        key,
        encrypted
    );
};
