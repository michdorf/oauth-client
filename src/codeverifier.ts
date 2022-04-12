/* https://www.valentinog.com/blog/challenge/ */
import randomstring from "./randomstr";

const code_verifier = randomstring(128);

function sha256(plain: string) { 
  // returns promise ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer) {
  // Convert the ArrayBuffer to string using Uint8 array.
  // btoa takes chars from 0-255 and base64 encodes.
  // Then convert the base64 encoded to base64url encoded.
  // (replace + with -, replace / with _, trim trailing =)
  return btoa(String.fromCharCode.apply(null, (new Uint8Array(a) as unknown as number[])))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default async function generateCodeChallenge(v: string) {
  const hashed = await sha256(v);
  const base64encoded = base64urlencode(hashed);
  return base64encoded;
}
