import { findIp } from "@arcjet/ip";

export function getIp(headers: Headers) {
    return findIp({ headers }, { platform: "vercel" });
}
