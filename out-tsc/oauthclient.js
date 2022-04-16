(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./randomstr", "./codeverifier", "./ajax"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const randomstr_1 = require("./randomstr");
    const codeverifier_1 = require("./codeverifier");
    const ajax_1 = require("./ajax");
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
            const stateId = (0, randomstr_1.default)(16);
            scopes = encodeURIComponent(scopes);
            let redirectUri = encodeURIComponent(this.config.redirect_uri || "");
            const codeVerifier = usePCKE ? (0, randomstr_1.default)() : "";
            this.requests.push({
                type: 'code',
                state: stateId,
                metadata: { author: "Michele de Chiffre" },
                codeVerifier: codeVerifier
            });
            this.store();
            (0, codeverifier_1.default)(codeVerifier).then((codeChallenge) => {
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
            const stateID = (0, randomstr_1.default)(12);
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
                (0, ajax_1.default)(this.token_url, ajaxConfig);
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
                    (0, ajax_1.default)(this.config.token_url + (USE_GET ? `?${postData}` : ""), config);
                }
            });
        }
        getAccessToken() {
            var _a;
            return ((_a = this.getAccessTokenObject()) === null || _a === void 0 ? void 0 : _a.access_token) || false;
        }
        getAccessTokenObject() {
            if (!this.accessToken.access_token) {
                let tmp = this.findLatestAccessToken();
                if (tmp !== null) {
                    this.accessToken = tmp;
                }
            }
            return this.accessToken || null;
        }
        getRefreshToken() {
            let access_token = this.getAccessTokenObject();
            return (access_token === null || access_token === void 0 ? void 0 : access_token.refresh_token) || null;
        }
        hasRefreshToken() {
            return !!this.getRefreshToken();
        }
        refreshToken() {
            return new Promise((resolve, reject) => {
                var _a;
                let request = this.getLastReqWithRefreshToken();
                if (request === null) {
                    reject("Could not get refresh token");
                    return;
                }
                let refresh_token = (_a = request.accessToken) === null || _a === void 0 ? void 0 : _a.refresh_token;
                var uri = this.config.token_url;
                if (typeof uri === "undefined") {
                    reject("uri not defined for oauth client");
                    return;
                }
                (0, ajax_1.default)(uri, {
                    method: "POST",
                    data: `grant_type=refresh_token&client_id=${this.config.client_id}&client_secret=${this.config.client_secret}&refresh_token=${refresh_token}`,
                    formEncoded: true,
                    run: (resp) => {
                        // Update the existing request with new values
                        request = request;
                        request.accessToken = Object.assign(request.accessToken, resp);
                        resolve(resp);
                    },
                    error: reject
                });
            });
        }
        getLastReqWithRefreshToken() {
            let accessToken;
            for (let i = this.requests.length - 1; i >= 0; i--) {
                accessToken = this.requests[i].accessToken;
                if (typeof accessToken !== "undefined" && accessToken.refresh_token !== "") {
                    return this.requests[i];
                }
            }
            return null;
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
    exports.default = OAuthClient;
});
