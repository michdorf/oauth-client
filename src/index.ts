/* import ajax from "./ajax";
import OAuthClient from "./oauthclient"; */
/// <reference path="./ajax.ts" />
/// <reference path="./oauthclient.ts" />

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
        setTimeout(()=>{
            let accessToken = a.getAccessToken();
            console.log(accessToken);

            ajax(`https://dechiffre.dk/oauth2-demo-php/my-oauth2/resource.php`, {
                headers: {"Authorization": "Bearer " + accessToken},
                method: "POST",
                run(data) {
                    console.log("Du har ressourcen: ", data);
                }
            });
        }, 3000);
    }else {
        a.authorizationCode("testscope");
    }
}