/* https://www.valentinog.com/blog/challenge/ */
import randomstring from "./randomstr";
import { encode as base64encode } from "base64-arraybuffer";

const code_verifier = randomstring(128);

export default async function generateCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64Digest = base64encode(digest);
  var tostring = new TextDecoder().decode(digest);
  // you can extract this replacing code to a function
  return base64Digest
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}