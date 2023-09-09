import OAuthClient from "../oauthclient";

export default class AiiaClient {
    private oauthClient: OAuthClient;
    private clientId: string;
    private redirectUrl: string;

    constructor(clientId: string, clientSecret: string, redirectUrl: string) {
        this.clientId = clientId;
        this.redirectUrl = redirectUrl;
        this.oauthClient = new OAuthClient({
            client_id: clientId,
            client_secret: clientSecret,
            authorization_url: 'https://api-sandbox.aiia.eu/v1/oauth/connect'
        });
    }

    authenticate() {
        fetch(`https://api-sandbox.aiia.eu/v1/oauth/connect?client_id=${this.clientId}&redirect_uri=${this.redirectUrl}&scope=accounts%20offline_access&response_type=code`).then((response) => {
            const headers = response.headers;
            const url = headers.get('Location');
            if (url) {
                window.open(url);
            }
        });
    }

    handleCallback() {
        this.oauthClient.exchangeAuthCode();
    }
}