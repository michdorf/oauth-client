import randomString from './randomstr'
import generateCodeChallenge from './codeverifier'
import ajax, {Setup} from './ajax'
/// <reference path="codeverifier.ts" />
/// <reference path="randomstr.ts" />

interface Configuration {
    storageKey?: string;
    authorization_url: string;
    revoke_url?: string;
    token_url?: string;
    client_id: string;
    client_secret?: string;
    redirect_uri?: string;
}

type TGrantType = 'code' | 'client_credentials' | 'password';
interface OAuth2Request {
    type: TGrantType;
    state: string; /* uuid which will be returned by server whenever ready - used to find request */
    metadata?: any;
    accessToken?: AccessToken;
    authorizationCode?: string;
    codeVerifier?: string;
}

export type AccessTokenResponse = {
    access_token: string;
    expires_in: number;
    token_type: "Bearer" | string;
    scope: string;
    refresh_token?: string;
}

type exchangeOptions = {
    jsonEncBody?: boolean;
    useGet?: boolean;
    basicAuth?: boolean;
};

interface AccessToken extends AccessTokenResponse {
    expires: Date /* calculated date object */
}

class Stoccaggio {
    storageKey = "ab-oauth-requests";
    constructor(storageKey?: string) {
        if (typeof storageKey !== "undefined") {
            this.storageKey = storageKey;
        }
    }

    setItem(valore: any) {
        if (typeof window != "undefined") {
            return localStorage.setItem(this.storageKey, valore);
        }
        return "";
    }

    getItem() {
        if (typeof window != "undefined") {
            return localStorage.getItem(this.storageKey);
        }
        return "";
    }
}

let _storListenerSet = false;
export default class OAuthClient {
    private stoccaggio: Stoccaggio;

    private config: Configuration;
    private requests: OAuth2Request[] = [];

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
        this.stoccaggio = new Stoccaggio(config.storageKey);

        if (!this.config.token_url) {
            this.config.token_url = this.config.authorization_url.replace("/authorize", "/token");
        }

        if (!_storListenerSet) {
            addEventListener("storage", this.handleUpdates.bind(this));
            _storListenerSet = true;
        }

        this.accessToken = {
            access_token: "",
            expires_in: 0,
            refresh_token: "",
            scope: "",
            token_type: "Bearer",
            expires: new Date()
        };
        this.load();
    }

    test() {
        debugger;
        console.log("Tester oauth client");
        if (window.location.hash.indexOf("code=")) {
            this.exchangeAuthCode();
        } else {
            this.authorizationCode("offline_access");
        }
    }

    private storeRequests() {
        this.stoccaggio.setItem(JSON.stringify(this.requests));
    }

    public registerAccessToken(state: string, access_token: AccessTokenResponse) {
        let request = this.loadRequests(state);
        if (request === null) {
            console.error("Could not find request for state", state);
            return;
        }
        const expires = new Date(Date.now() + (access_token.expires_in * 1000));
        request.accessToken = Object.assign({expires}, access_token);
        this.accessToken = request.accessToken as AccessToken;
        this.storeRequests();
    }

    private handleUpdates(event: StorageEvent) {
        if (event.key === this.stoccaggio.storageKey) {
            this.load();
        }
    }

    private load() {
        this.requests = JSON.parse(this.stoccaggio.getItem() || "[]");
    }

    /**
     * Should revoke the token
     */
    logout() {
      this.revoke(this.getAccessToken() || undefined);
      this.requests = [];
      this.storeRequests();
    }

    revoke(access_token?: string, refresh_token?: string) {
      access_token = access_token || this.getAccessToken() || '';
      refresh_token = refresh_token || this.getRefreshToken() || '';
      if (!access_token) {
        throw new Error("No token found in oauthclient.revoke()");
      }
      if (!this.config.revoke_url) {
        throw new Error("Missing revoke URL in oauth config.");
      }

      if (refresh_token) {
        fetch(this.config.revoke_url, {
          method: "POST",
          headers: {
            'Content-type': 'application/x-www-form-urlencoded'
          },
          body: `client_id=${this.config.client_id}&token_type_hint=refresh_token&token=${refresh_token}`,
        }).then(r => r);
      }

      return fetch(this.config.revoke_url, {
          method: "POST",
          headers: {
            'Content-type': 'application/x-www-form-urlencoded'
          },
          body: `client_id=${this.config.client_id}&token_type_hint=access_token&token=${access_token}`,
        });
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

        this.storeRequests();

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

            if (typeof window !== "undefined") {
                let w = window.open(endpoint, '', 'popup');
                if (w == null) {
                  window.location.href = endpoint;
                }
            }
        });
    }

    generalAjax(type: TGrantType, method: 'POST' | 'GET', url: string, scopes: string = '', post_parameters: string = '', headers?: {[key: string]: string}): Promise<AccessToken> {
        const stateID = randomString(12);
        this.requests.push({
            type: type,
            state: stateID,
            metadata: {author: "Michele"}
        });

        this.storeRequests();

        return new Promise((resolve, reject) => {
            if (typeof this.config.client_secret === "undefined") {
                reject('Client Secret must be defined');
                return;
            }

            post_parameters = "grant_type=" + type + "&client_id=" + this.config.client_id + "&client_secret=" + this.config.client_secret + "&scope=" + encodeURIComponent(scopes) + (post_parameters ? `${post_parameters.substring(0,1) === "&" ? post_parameters : "&" + post_parameters}` : "");

            let ajaxConfig: Setup = {
                method: method,
                success(d: string) {
                    try {
                        const parsed = JSON.parse(d) as AccessToken;

                        const oauth2req = me.loadRequests(stateID);
                        if (!oauth2req) {
                            reject(`Request not found for state ${stateID}`);
                            return;
                        }
                        oauth2req.accessToken = parsed;
                        me.storeRequests();
                        resolve(parsed);
                    } catch (e) {
                        reject(`Error parsing response ${d}`);
                    }
                },
                error: reject
            };

            if (method === "POST") {
                ajaxConfig.formEncoded = true;
                ajaxConfig.data = post_parameters;
            }

            if (typeof headers !== "undefined") {
                ajaxConfig.headers = headers;
            }

            let me = this;
            ajax(url, ajaxConfig);
        });
    }

    /**
     * NOTE: access token will not be saved in localstorage with client credentials flow
     * @param scopes
     * @param headers
     * @returns
     */
    clientCredentials(scopes?: string, headers?: {[key: string]: string} ): Promise<AccessToken> {
        return this.generalAjax('client_credentials', 'POST', this.token_url, scopes, '', headers);
    }

    /**
     * Resource Owner Password Credentials
     * @param scopes
     * @param url
     * @param headers
     * @returns
     */
    userCredentials(scopes: string, url: string, unome: string, codice: string, headers?: {[key: string]: string}) {
      return this.generalAjax('password', 'POST', url, scopes, `&unome=${unome}&codice=${codice}`, headers);
    }

    exchangeAuthCode(hashstring?: string, options: exchangeOptions = {}) {
        const USE_GET = options.useGet || false;

        return new Promise<AccessTokenResponse>((resolve, reject: (error: string, xhr?: XMLHttpRequest) => void) => {
            hashstring = hashstring || window.location.hash || window.location.search;
            let parsed = this.parseHashstring(hashstring);
            let authCode = parsed.code;
            let state = parsed.state;

            let request = this.loadRequests(state);
            if (request === null) {
                if (typeof window !== 'undefined') {
                    reject(`Request not saved correctly and not possible to load ${state}`);
                    return;
                } else {
                    request = {
                        authorizationCode: authCode,
                        type: 'code',
                        state: state,
                    };
                }
            }
            request.authorizationCode = authCode;

            if (typeof request === "undefined") {
                console.error(`Missing saved request for state (${state})`, "oauth");
                return false;
            }

            // Lav et POST request for at få token
            if (this.config.token_url) { // Assert true
                let postData = ``;
                if (options.jsonEncBody) {
                    postData = JSON.stringify({
                        "grant_type" : "authorization_code",
                        "code": authCode,
                        "redirect_uri" : this.config.redirect_uri
                    });
                } else {
                    postData = `grant_type=authorization_code`;
                    postData += `&client_id=${this.config.client_id}`;
                    if (!options.basicAuth) {
                        postData += `&client_secret=${this.config.client_secret}`;
                        postData += `&redirect_uri=${this.config.redirect_uri}`;
                    }
                    postData += `&code=${authCode}`;
                    postData += `&code_verifier=${request.codeVerifier}`;
                }

                let config: RequestInit = {
                    method: USE_GET ? "GET" : "POST",
                };

                let headers: {Authorization?: string, 'Content-Type'?: string} = {};
                if (options.basicAuth) {
                    headers['Authorization'] = 'Basic ' + btoa(this.config.client_id + ":" + this.config.client_secret);
                }
                if (options.jsonEncBody) {
                    headers['Content-Type'] = 'application/json';
                } else if (!USE_GET && !options.jsonEncBody) {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
                }
                if (!USE_GET) {
                    config.body = postData;
                }

                if ('Authorization' in headers || 'Content-Type' in headers) {
                    config.headers = headers;
                }
                // ajax(this.config.token_url + (USE_GET ? `?${postData}` : ""), config);
                fetch(this.config.token_url + (USE_GET ? `?${postData}` : ""), config).then(async (d) => {
                    var response = await d.json() as AccessTokenResponse;
                    if (request) { /* assert false */
                        const expires = new Date(Date.now() + (response.expires_in * 1000));
                        request.accessToken = Object.assign({expires}, response);
                        this.accessToken = request.accessToken;
                    }
                    this.storeRequests();
                    resolve(response);
                }).catch((e) => {
                    reject("Fetch error: " + typeof e === "string" ? e : typeof e + JSON.stringify(e));
                });
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
                run: (resp: string) => {
                    let respData = JSON.parse(resp) as AccessTokenResponse;
                    if (request === null) {
                        reject("Fatal error in oauthclient->refreshToken. Variable request is null in ajax callback.");
                        return;
                    }
                    // Update the existing request with new values
                    const defExpire = 60;
                    const expires = new Date(Date.now() + ((respData.expires_in || defExpire) * 1000));
                    request.accessToken = Object.assign({}, request.accessToken, respData, {expires});
                    this.accessToken = request.accessToken;
                    this.storeRequests();

                    resolve(request.accessToken);
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

    loadRequests(stateId: string): OAuth2Request | null {
        return this.requests.find((value: OAuth2Request) => value.state === stateId) || null;
    }
}
