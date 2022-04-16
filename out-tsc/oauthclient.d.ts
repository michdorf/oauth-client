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
export default class OAuthClient {
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
export {};
