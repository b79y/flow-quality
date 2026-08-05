import { app } from "electron";
import crypto from "node:crypto";
import os from "node:os";
import { store } from "./store";
import type { LicenseStatus } from "../shared/types";

/**
 * FLOW Quality licensing — offline, one-device license.
 *
 * Key format:  FF2-XXXX-XXXX-XXXX-XXXX
 * The last block is a checksum derived from the first four blocks plus the
 * device fingerprint, so a key only validates on the device it was issued
 * for. Server validation / seat management can be layered on later without
 * changing this module's interface.
 */

export function deviceFingerprint(): string {
  const cpus = os.cpus().map((c) => c.model).join("|");
  const raw = [
    os.hostname(),
    os.arch(),
    cpus,
    app.getVersion(),
  ].join("::");
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function checksum(prefix: string, fp: string): string {
  const body = prefix + "|" + fp;
  const h = crypto.createHash("sha256").update(body).digest("hex");
  let num = 0;
  for (let i = 0; i < 8; i++) num = (num * 31 + h.charCodeAt(i)) % 0x7fffffff;
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += LETTERS[num % 32];
    num = Math.floor(num / 32);
  }
  return out;
}

function normalizeKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateKey(key: string): boolean {
  const k = normalizeKey(key);
  if (k.length !== 20 || !k.startsWith("FF2")) return false;
  const prefix = k.slice(0, 16);
  const given = k.slice(16, 20);
  const fp = deviceFingerprint();
  return given === checksum(prefix, fp);
}

export function getLicense(): LicenseStatus {
  const lic = store.get("license");
  if (!lic.activated) return lic;
  // re-validate on each read to catch key cloning across devices
  if (!validateKey(lic.key)) {
    store.set("license", { ...lic, activated: false });
    return { ...lic, activated: false };
  }
  return lic;
}

export function activateLicense(key: string, email: string): { ok: boolean; error?: string } {
  if (!validateKey(key)) {
    return { ok: false, error: "invalid" };
  }
  store.set("license", {
    activated: true,
    key: normalizeKey(key),
    email: email.trim(),
    plan: "pro",
    deviceId: deviceFingerprint(),
    activatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export function deactivateLicense(): void {
  const lic = store.get("license");
  store.set("license", { ...lic, activated: false, key: "", email: "" });
}
