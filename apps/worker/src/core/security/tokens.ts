type UserClaims = { id: string; role: string; email: string; exp: number };

function b64u(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function ub64u(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64u(sig);
}

export async function signToken(secret: string, claims: Omit<UserClaims, "exp">, ttlSec: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = JSON.stringify({ ...claims, exp });
  const payloadB64 = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const sig = await hmac(secret, payloadB64);
  return `v1.${payloadB64}.${sig}`;
}

export async function verifyToken(secret: string, token: string): Promise<UserClaims> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("bad_token");
  const payloadB64 = parts[1];
  const sig = parts[2];
  const expected = await hmac(secret, payloadB64);
  if (expected !== sig) throw new Error("bad_sig");

  const payloadJson = new TextDecoder().decode(ub64u(payloadB64));
  const claims = JSON.parse(payloadJson) as UserClaims;
  if (!claims.exp || Math.floor(Date.now() / 1000) > claims.exp) throw new Error("expired");
  return claims;
}
