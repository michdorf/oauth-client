define(["require", "exports", "moduli/moduli/ajax", "./oauthclient"], function (require, exports, ajax_1, oauthclient_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    if (typeof (OAUTHCLIENT_RUN_EXAMPLE) != "undefined" && OAUTHCLIENT_RUN_EXAMPLE) {
        var a = new oauthclient_1.default({
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
                    (0, ajax_1.default)(`https://dechiffre.dk/oauth2-demo-php/my-oauth2/resource.php`, {
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
});
