"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/** wwApp ajax module ; 22.08.2021 12:30 MD
* COPYRIGHT (C) 2021, AUTONIK AB
* SOURCE	;
*/
function ajax(url, setup = {}) {
    var xhr = new XMLHttpRequest();
    var method = setup.method || "GET";
    var data = data2str(setup.data || '');
    if ('cache' in xhr) {
        xhr.cache = false; // For IE
    }
    if (typeof setup.withCredentials !== "undefined") {
        xhr.withCredentials = !!setup.withCredentials;
    }
    xhr.open(method, url);
    if (setup.formEncoded) {
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    if (typeof setup.headers === "object") {
        for (var key in setup.headers) {
            xhr.setRequestHeader(key, setup.headers[key]);
        }
    }
    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var response = xhr.responseType === 'json' ? xhr.response : xhr.responseText;
                if (typeof setup.success === "function") {
                    setup.success(response, xhr);
                }
                if (typeof setup.run === "function") {
                    setup.run(response);
                }
                if (typeof setup.complete === "function") {
                    setup.complete();
                }
            }
            else {
                funz(setup.error, ajax_handle_error, [xhr.status, xhr]);
                if (typeof setup.complete === "function") {
                    setup.complete();
                }
            }
        }
    };
    xhr.onerror = function (e) {
        funz(setup.error, ajax_handle_error, [xhr.status, xhr]);
        if (typeof setup.complete === "function") {
            setup.complete();
        }
    };
    try {
        xhr.send(setup.method === "POST" ? data : null);
    }
    catch (e) {
        console.error("Der skete en fejl med send():\n" + JSON.stringify(e));
    }
}
function data2str(data) {
    if (typeof data === "string") {
        return data;
    }
    var r = '';
    for (let k in data) {
        if (typeof data[k] === "object") {
            data[k] = JSON.stringify(data[k]);
        }
        r += "&" + k + "=" + data[k];
    }
    return r.substr(1);
}
let ajax_503_warned = false; // Wether the user has been noticed about "Service Unavailable"
function ajax_handle_error(status_code, req) {
    // status_code 503 = "Service Unavailable"
    if (status_code == 503 && !ajax_503_warned) {
        alert("Service Unavailable.\nIt seems like too many licenses are in use");
        ajax_503_warned = true;
    }
    console.error("Fejl i ajax laredo login.js\nStatus code: " + status_code, req);
}
function funz(func, fallback, args) {
    if (typeof func === "function") {
        func.apply(null, args);
    }
    else {
        fallback.apply(null, args);
    }
}
/* https://www.valentinog.com/blog/challenge/ */
// import randomstring from "./randomstr";
const code_verifier = randomString(128);
function sha256(plain) {
    // returns promise ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}
function base64urlencode(a) {
    // Convert the ArrayBuffer to string using Uint8 array.
    // btoa takes chars from 0-255 and base64 encodes.
    // Then convert the base64 encoded to base64url encoded.
    // (replace + with -, replace / with _, trim trailing =)
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function generateCodeChallenge(v) {
    return __awaiter(this, void 0, void 0, function* () {
        const hashed = yield sha256(v);
        const base64encoded = base64urlencode(hashed);
        return base64encoded;
    });
}
function randomString(length, characters) {
    length = length === undefined ? 32 : length;
    characters = characters === undefined ? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : characters;
    var maxIndex = characters.length - 1;
    var string = '';
    if ("crypto" in window) {
        var array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return btoa(array.join(""));
    }
    for (var i = 0; i < length; i++) {
        string += characters[Math.random() * maxIndex];
    }
    return string;
}
/// <reference path="codeverifier.ts" />
/// <reference path="randomstr.ts" />
if (typeof log === "undefined") {
    log = {
        warn(txt, appzone) {
            console.warn(`${txt} [${appzone}]`);
        }
    };
}
class OAuthClient {
    constructor(config) {
        this.requests = [];
        this.storageKey = "ab-oauth-requests";
        this.config = config;
        if (!this.config.token_url) {
            this.config.token_url = this.config.authorization_url.replace("/authorize", "/token");
        }
        this.accessToken = {
            access_token: "",
            expires_in: 0,
            refresh_token: "",
            scope: "",
            token_type: "Bearer"
        };
        this.load();
    }
    get authorization_url() {
        return this.config.authorization_url;
    }
    get token_url() {
        if (this.config.token_url) {
            return this.config.token_url;
        }
        const splitted = this.authorization_url.split("/");
        return splitted.slice(0, splitted.length - 1).join("/") + "/token";
    }
    test() {
        debugger;
        console.log("Tester oauth client");
        if (window.location.hash.indexOf("code=")) {
            this.exchangeAuthCode();
        }
        else {
            this.authorizationCode("wwapp offline_access");
        }
    }
    store() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.requests));
    }
    load() {
        this.requests = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
    }
    /**
     * Requests first authCode
     */
    authorizationCode(scopes, usePCKE) {
        usePCKE = typeof usePCKE === "undefined" ? true : !!usePCKE;
        const stateId = randomString(16);
        scopes = encodeURIComponent(scopes);
        let redirectUri = encodeURIComponent(this.config.redirect_uri || "");
        const codeVerifier = usePCKE ? randomString() : "";
        this.requests.push({
            type: 'code',
            state: stateId,
            metadata: { author: "Michele de Chiffre" },
            codeVerifier: codeVerifier
        });
        this.store();
        generateCodeChallenge(codeVerifier).then((codeChallenge) => {
            let endpoint = `${this.config.authorization_url}?`;
            endpoint += `response_type=code`;
            endpoint += `&client_id=${this.config.client_id}`;
            endpoint += `&redirect_uri=${redirectUri}`;
            endpoint += `&scope=${scopes}`;
            endpoint += `&state=${stateId}`;
            if (usePCKE) {
                endpoint += `&code_challenge=${codeChallenge}`;
                endpoint += `&code_challenge_method=S256`;
            }
            window.location.href = endpoint;
        });
    }
    clientCredentials(scopes, headers) {
        const stateID = randomString(12);
        this.requests.push({
            type: 'client_credentials',
            state: stateID,
            metadata: { author: "Michele de Chiffre" }
        });
        this.store();
        return new Promise((resolve, reject) => {
            if (typeof this.config.client_secret === "undefined") {
                reject('Client Secret must be defined');
                return;
            }
            let ajaxConfig = {
                method: "POST",
                formEncoded: true,
                data: "grant_type=client_credentials&client_id=" + this.config.client_id + "&client_secret=" + this.config.client_secret + "&scope=" + scopes,
                success(d) {
                    try {
                        const parsed = JSON.parse(d);
                        const oauth2req = me.loadRequest(stateID);
                        if (!oauth2req) {
                            reject(`Request not found for state ${stateID}`);
                            return;
                        }
                        oauth2req.accessToken = parsed;
                        me.store();
                        resolve(parsed);
                    }
                    catch (e) {
                        reject(`Error parsing response ${d}`);
                    }
                },
                error: reject
            };
            if (typeof headers !== "undefined") {
                ajaxConfig.headers = headers;
            }
            let me = this;
            ajax(this.token_url, ajaxConfig);
        });
    }
    exchangeAuthCode(hashstring) {
        const USE_GET = false;
        return new Promise((resolve, reject) => {
            hashstring = hashstring || window.location.hash || window.location.search;
            let parsed = this.parseHashstring(hashstring);
            let authCode = parsed.code;
            let state = parsed.state;
            let request = this.loadRequest(state);
            if (request === null) {
                reject(`Request not saved correctly and not possible to load ${state}`);
                return;
            }
            request.authorizationCode = authCode;
            if (typeof request === "undefined") {
                console.error(`Missing saved request for state (${state})`, "oauth");
                return false;
            }
            // Lav et POST request for at få token
            if (this.config.token_url) { // Assert true
                let postData = `grant_type=authorization_code`;
                postData += `&client_id=${this.config.client_id}`;
                postData += `&client_secret=${this.config.client_secret}`;
                postData += `&redirect_uri=${this.config.redirect_uri}`;
                postData += `&code=${authCode}`;
                postData += `&code_verifier=${request.codeVerifier}`;
                let me = this;
                let config = {
                    method: USE_GET ? "GET" : "POST",
                    formEncoded: !USE_GET,
                    success(d) {
                        var response = JSON.parse(d);
                        if (request) {
                            request.accessToken = response;
                        }
                        me.accessToken = response;
                        me.store();
                        resolve(response);
                    }
                };
                if (!USE_GET) {
                    config.data = postData;
                }
                ajax(this.config.token_url + (USE_GET ? `?${postData}` : ""), config);
            }
        });
    }
    getAccessToken() {
        if (!this.accessToken.access_token) {
            let tmp = this.findLatestAccessToken();
            if (tmp !== null) {
                this.accessToken = tmp;
            }
        }
        return this.accessToken.access_token || false;
    }
    hasRefreshToken() {
        log.warn("hasRefreshToken() not implemented yet", "oauth");
        return false;
    }
    refreshToken() {
        log.warn("refreshToken() not implemented yet", "oauth");
        return new Promise((resolve, reject) => {
            var uri = this.config.token_url;
            if (typeof uri === "undefined") {
                reject(false);
                return;
            }
            ajax(uri, {
                run: (resp) => {
                    resolve(resp);
                }
            });
            reject(false);
        });
    }
    findLatestAccessToken() {
        let accessToken;
        for (let i = this.requests.length - 1; i >= 0; i--) {
            accessToken = this.requests[i].accessToken;
            if (typeof accessToken !== "undefined" && accessToken.access_token !== "") {
                return accessToken;
            }
        }
        return null;
    }
    parseHashstring(hashstring) {
        const keys = ["code", "state"];
        let s = hashstring.split("&");
        let m, r = { code: "", state: "" }, key;
        for (var i = 0; i < s.length; i++) {
            m = s[i].split("=");
            key = m[0].replace(/^[#\?]/g, "");
            if (typeof r[key] !== "undefined") {
                r[key] = decodeURIComponent(m[1]);
            }
        }
        return r;
    }
    loadRequest(stateId) {
        return this.requests.find((value) => value.state === stateId) || null;
    }
}
// export default OAuthClient;
/* import ajax from "./ajax";
import OAuthClient from "./oauthclient"; */
/// <reference path="./ajax.ts" />
/// <reference path="./oauthclient.ts" />
if (typeof (OAUTHCLIENT_RUN_EXAMPLE) != "undefined" && OAUTHCLIENT_RUN_EXAMPLE) {
    var a = new OAuthClient({
        authorization_url: "https://dechiffre.dk/oauth2-demo-php/my-oauth2/authorize.php",
        token_url: "https://dechiffre.dk/oauth2-demo-php/my-oauth2/token.php",
        client_id: "localvue",
        client_secret: "enlang9923123",
        redirect_uri: "http://localhost:8080/test/index.htm"
    });
    if (confirm("Er du klar?")) {
        debugger;
        if (window.location.hash.indexOf("code=") !== -1 || window.location.search.indexOf("code=") !== -1) {
            a.exchangeAuthCode();
            setTimeout(() => {
                let accessToken = a.getAccessToken();
                console.log(accessToken);
                ajax(`https://dechiffre.dk/oauth2-demo-php/my-oauth2/resource.php`, {
                    headers: { "Authorization": "Bearer " + accessToken },
                    method: "POST",
                    run(data) {
                        console.log("Du har ressourcen: ", data);
                    }
                });
            }, 3000);
        }
        else {
            a.authorizationCode("testscope");
        }
    }
}
/**
* Secure Hash Algorithm (SHA256)
* http://www.webtoolkit.info/
* Original code by Angel Marin, Paul Johnston
**/
function SHA256(s) {
    var chrsz = 8;
    var hexcase = 0;
    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
    function S(X, n) { return (X >>> n) | (X << (32 - n)); }
    function R(X, n) { return (X >>> n); }
    function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
    function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
    function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
    function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
    function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
    function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }
    function core_sha256(m, l) {
        var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);
        var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
        var W = new Array(64);
        var a, b, c, d, e, f, g, h, i, j;
        var T1, T2;
        m[l >> 5] |= 0x80 << (24 - l % 32);
        m[((l + 64 >> 9) << 4) + 15] = l;
        for (var i = 0; i < m.length; i += 16) {
            a = HASH[0];
            b = HASH[1];
            c = HASH[2];
            d = HASH[3];
            e = HASH[4];
            f = HASH[5];
            g = HASH[6];
            h = HASH[7];
            for (var j = 0; j < 64; j++) {
                if (j < 16)
                    W[j] = m[j + i];
                else
                    W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
                T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
                T2 = safe_add(Sigma0256(a), Maj(a, b, c));
                h = g;
                g = f;
                f = e;
                e = safe_add(d, T1);
                d = c;
                c = b;
                b = a;
                a = safe_add(T1, T2);
            }
            HASH[0] = safe_add(a, HASH[0]);
            HASH[1] = safe_add(b, HASH[1]);
            HASH[2] = safe_add(c, HASH[2]);
            HASH[3] = safe_add(d, HASH[3]);
            HASH[4] = safe_add(e, HASH[4]);
            HASH[5] = safe_add(f, HASH[5]);
            HASH[6] = safe_add(g, HASH[6]);
            HASH[7] = safe_add(h, HASH[7]);
        }
        return HASH;
    }
    function str2binb(str) {
        var bin = Array();
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < str.length * chrsz; i += chrsz) {
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
        }
        return bin;
    }
    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, '\n');
        var utftext = '';
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    }
    function binb2hex(binarray) {
        var hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
        var str = '';
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
        }
        return str;
    }
    s = Utf8Encode(s);
    return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
}
// export default SHA256;
