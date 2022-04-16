/** wwApp ajax module ; 22.08.2021 12:30 MD
* COPYRIGHT (C) 2021, AUTONIK AB
* SOURCE	;
*/
interface Setup {
    method?: "GET" | "POST";
    data?: Data | string;
    withCredentials?: boolean;
    headers?: ObjOfStrings;
    success?: (response: any, request: XMLHttpRequest) => void;
    run?: (response: any) => void;
    complete?: () => void;
    error?: (error: string, xhr: XMLHttpRequest) => void;
    formEncoded?: boolean;
}
interface Data {
    [key: string]: string | object;
}
declare type ObjOfStrings = {
    [key: string]: string;
};
declare function ajax(url: string, setup?: Setup): void;
declare function data2str(data: Data | string): string;
declare let ajax_503_warned: boolean;
declare function ajax_handle_error(status_code: number, req: XMLHttpRequest): void;
declare function funz(func: Function | undefined, fallback: Function, args?: Array<any>): void;
declare const code_verifier: string;
declare function sha256(plain: string): PromiseLike<ArrayBuffer>;
declare function base64urlencode(a: ArrayBuffer): string;
declare function generateCodeChallenge(v: string): Promise<string>;
declare function randomString(length?: number, characters?: string): string;
interface Configuration {
    authorization_url: string;
    token_url?: string;
    client_id: string;
    client_secret?: string;
    redirect_uri?: string;
}
interface OAuth2Request {
    type: 'code' | 'client_credentials';
    state: string;
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
declare class OAuthClient {
    private config;
    private requests;
    private storageKey;
    private accessToken;
    get authorization_url(): string;
    get token_url(): string;
    constructor(config: Configuration);
    test(): void;
    private store;
    private load;
    /**
     * Requests first authCode
     */
    authorizationCode(scopes: string, usePCKE?: boolean): void;
    clientCredentials(scopes: string, headers?: {
        [key: string]: string;
    }): Promise<unknown>;
    exchangeAuthCode(hashstring?: string): Promise<unknown>;
    getAccessToken(): string | false;
    getAccessTokenObject(): AccessToken | null;
    getRefreshToken(): string | null;
    hasRefreshToken(): boolean;
    refreshToken(): Promise<AccessToken>;
    getLastReqWithRefreshToken(): OAuth2Request | null;
    findLatestAccessToken(): AccessToken | null;
    parseHashstring(hashstring: string): {
        code: string;
        state: string;
    };
    loadRequest(stateId: string): OAuth2Request | null;
}
declare const OAUTHCLIENT_RUN_EXAMPLE: boolean | undefined;
/**
* Secure Hash Algorithm (SHA256)
* http://www.webtoolkit.info/
* Original code by Angel Marin, Paul Johnston
**/
declare function SHA256(s: string): string;
