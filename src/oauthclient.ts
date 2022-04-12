import randomString from './randomstr'
import generateCodeChallenge from './codeverifier'
import ajax, {Setup} from 'moduli/moduli/ajax'
/// <reference path="codeverifier.ts" />
/// <reference path="randomstr.ts" />

interface Configuration {
    authorization_url: string;
    token_url?: string;
    client_id: string;
    client_secret?: string;
    redirect_uri?: string;
}

interface OAuth2Request {
    type: 'code' | 'client_credentials';
    state: string; /* uuid which will be returned by server whenever ready - used to find request */
    metadata?: any;
    accessToken?: AccessToken;
    authorizationCode?: string;
    codeVerifier?: string;
}

interface AccessToken {
    access_token: string;
    expires_in: number;
    token_type: "Bearer" | string;
    scope: string;
    refresh_token?: string;
}

export default class OAuthClient {
    private config: Configuration;
    private requests: OAuth2Request[] = [];
    private storageKey = "ab-oauth-requests";
    private accessToken: AccessToken;

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

    constructor(config: Configuration) {
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

    test() {
        debugger;
        console.log("Tester oauth client");
        if (window.location.hash.indexOf("code=")) {
            this.exchangeAuthCode();
        } else {
            this.authorizationCode("wwapp offline_access");
        }
    }

    private store() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.requests));
    }

    private load() {
        this.requests = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
    }

    /**
     * Requests first authCode
     */
    authorizationCode(scopes: string, usePCKE?: boolean) {
        usePCKE = typeof usePCKE === "undefined" ? true : !!usePCKE;
        const stateId = randomString(16);
        scopes = encodeURIComponent(scopes);
        let redirectUri = encodeURIComponent(this.config.redirect_uri || "");
        const codeVerifier = usePCKE ? randomString() : "";
        this.requests.push({
            type: 'code',
            state: stateId, /* uuid which will be returned by server whenever ready */
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

    clientCredentials(scopes: string, headers?: {[key: string]: string}) {
        const stateID = randomString(12);
        this.requests.push({
            type: 'client_credentials',
            state: stateID,
            metadata: {author: "Michele de Chiffre"}
        });

        this.store();

        return new Promise((resolve, reject) => {
            if (typeof this.config.client_secret === "undefined") {
                reject('Client Secret must be defined');
                return;
            }

            let ajaxConfig: Setup = {
                method: "POST",
                formEncoded: true,
                data: "grant_type=client_credentials&client_id=" + this.config.client_id + "&client_secret=" + this.config.client_secret + "&scope=" + scopes,
                success(d: string) {
                    try {
                        const parsed = JSON.parse(d) as AccessToken;

                        const oauth2req = me.loadRequest(stateID);
                        if (!oauth2req) {
                            reject(`Request not found for state ${stateID}`);
                            return;
                        }
                        oauth2req.accessToken = parsed;
                        me.store();
                        resolve(parsed);
                    } catch (e) {
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

    exchangeAuthCode(hashstring?: string) {
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

                let config: Setup = {
                    method: USE_GET ? "GET" : "POST",
                    formEncoded: !USE_GET,
                    success(d: any) {
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

    getAccessToken(): string | false {
        return this.getAccessTokenObject()?.access_token || false;
    }

    getAccessTokenObject(): AccessToken | null {
        if (!this.accessToken.access_token) {
            let tmp = this.findLatestAccessToken();
            if (tmp !== null) {
                this.accessToken = tmp;
            }
        }

        return this.accessToken || null;
    }

    getRefreshToken(): string | null {
        let access_token = this.getAccessTokenObject();
        return access_token?.refresh_token || null;
    }
    hasRefreshToken(): boolean {
        return !!this.getRefreshToken();
    }

    refreshToken(): Promise<AccessToken> {
        return new Promise((resolve, reject) => {
            let request = this.getLastReqWithRefreshToken();
            if (request === null) {
                reject("Could not get refresh token");
                return;
            }
            let refresh_token = request.accessToken?.refresh_token;
            var uri = this.config.token_url;
            if (typeof uri === "undefined") {
                reject("uri not defined for oauth client");
                return;
            }
            ajax(uri, {
                method: "POST",
                data: `grant_type=refresh_token&client_id=${this.config.client_id}&client_secret=${this.config.client_secret}&refresh_token=${refresh_token}`,
                formEncoded:true,
                run: (resp: AccessToken) => {
                    // Update the existing request with new values
                    request = request as OAuth2Request;
                    request.accessToken = Object.assign(request.accessToken, resp);
                    
                    resolve(resp);
                },
                error: reject
            });
        });
    }

    getLastReqWithRefreshToken(): OAuth2Request | null {
        let accessToken: AccessToken | undefined;
        for (let i = this.requests.length - 1; i >= 0; i--) {
            accessToken = this.requests[i].accessToken;
            if (typeof accessToken !== "undefined" && accessToken.refresh_token !== "") {
                return this.requests[i];
            }
        }

        return null;
    }

    findLatestAccessToken(): AccessToken | null {
        let accessToken: AccessToken | undefined;
        for (let i = this.requests.length - 1; i >= 0; i--) {
            accessToken = this.requests[i].accessToken;
            if (typeof accessToken !== "undefined" && accessToken.access_token !== "") {
                return accessToken;
            }
        }

        return null;
    }

    parseHashstring(hashstring: string) {
        type acceptedKeys = "code" | "state";
        const keys = ["code", "state"];
        let s = hashstring.split("&");
        let m, r = { code: "", state: "" }, key: acceptedKeys;
        for (var i = 0; i < s.length; i++) {
            m = s[i].split("=");
            key = (m[0].replace(/^[#\?]/g, "") as acceptedKeys);
            if (typeof r[key] !== "undefined") {
                r[key] = decodeURIComponent(m[1]);
            }
        }

        return r;
    }

    loadRequest(stateId: string): OAuth2Request | null {
        return this.requests.find((value: OAuth2Request) => value.state === stateId) || null;
    }
}

// export default OAuthClient;