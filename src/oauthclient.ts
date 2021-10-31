import randomString from './randomstr'
import generateCodeChallenge from './valentinog'
import ajax, {Setup} from './ajax'

export async function _generateCodeChallenge(codeVerifier?: string) {
    let stateSecret = codeVerifier || randomString();
    return await generateCodeChallenge(stateSecret);// btoa(sha256(stateSecret));
}

interface Configuration {
    authorization_url: string;
    token_url?: string;
    client_id: string;
    client_secret: string;
    redirect_uri?: string;
}

interface Request {
    state: string; /* uuid which will be returned by server whenever ready */
    metadata: any;
    accessToken?: AccessToken;
    authorizationCode?: string;
    codeVerifier: string;
}

interface AccessToken {
    access_token: string; 
    expires_in: number;
    token_type: "Bearer" | string; 
    scope: string; 
    refresh_token: string;
}

class OAuthClient {
    private config: Configuration;
    private requests: any[] = [];
    private storageKey = "ab-oauth-requests";
    private accessToken: AccessToken;

    get authorization_url() {
        return this.config.authorization_url;
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
            this.requestToken("wwapp offline_access");
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
    requestToken(scopes: string) {
        const stateId = randomString(16);
        scopes = encodeURIComponent(scopes);
        let redirectUri = encodeURIComponent(this.config.redirect_uri || "");
        const codeVerifier = randomString();
        this.requests.push({
            state: stateId, /* uuid which will be returned by server whenever ready */
            metadata: {navn: "Michele"},
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
            endpoint += `&code_challenge=${codeChallenge}`;
            endpoint += `&code_challenge_method=S256`;

            debugger;
            window.location.href = endpoint;
        });
    }

    exchangeAuthCode(hashstring?: string) {
        const USE_GET = false;

        hashstring = hashstring || window.location.hash || window.location.search;
        let parsed = this.parseHashstring(hashstring);
        let authCode = parsed.code;
        let state = parsed.state;

        let request = this.loadRequest(state);
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
                success(d) {
                    var response = JSON.parse(d);
                    request.accessToken = response;
                    me.accessToken = response;
                }
            };
            if (!USE_GET) {
                config.data = postData;
            }

            ajax(this.config.token_url + (USE_GET ? `?${postData}` : ""), config);
        }
    }

    getAccessToken() {
        if (!this.accessToken.access_token) {
            this.accessToken = this.findLatestAccessToken();
        }

        return this.accessToken.access_token || undefined;
    }

    findLatestAccessToken(): AccessToken {
        return this.requests.reverse().find((v) => typeof v.accessToken !== "undefined" && v.accessToken.access_token !== "").map((v: Request) => v.accessToken);
    }

    parseHashstring(hashstring: string) {
        type acceptedKeys = "code" | "state";
        const keys = ["code", "state"];
        let s = hashstring.split("&");
        let m, r = {code: "", state: ""}, key: acceptedKeys;
        for (var i = 0; i < s.length; i++) {
            m = s[i].split("=");
            key = (m[0].replace(/^[#\?]/g,"") as acceptedKeys);
            if (typeof r[key] !== "undefined") {
                r[key] = decodeURIComponent(m[1]);
            }
        }

        return r;
    }

    loadRequest(stateId: string): Request {
        return this.requests.find((value) => value.state === stateId);
    }
}

export default OAuthClient;