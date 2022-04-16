"use strict";function e(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var t=e(require("moduli/moduli/ajax"));function o(e,t){e=void 0===e?32:e;var o=(t=void 0===t?"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789":t).length-1,n="";if("undefined"!=typeof window&&"crypto"in window){var i=new Uint8Array(e);return window.crypto.getRandomValues(i),btoa(i.join(""))}for(var r=0;r<e;r++)n+=t[Math.random()*o];return n}var n=function(e,t,o,n){return new(o||(o=Promise))((function(i,r){function s(e){try{a(n.next(e))}catch(e){r(e)}}function c(e){try{a(n.throw(e))}catch(e){r(e)}}function a(e){var t;e.done?i(e.value):(t=e.value,t instanceof o?t:new o((function(e){e(t)}))).then(s,c)}a((n=n.apply(e,t||[])).next())}))};function i(e){return n(this,void 0,void 0,(function*(){const t=function(e){return btoa(String.fromCharCode.apply(null,new Uint8Array(e))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}(yield function(e){const t=(new TextEncoder).encode(e);return window.crypto.subtle.digest("SHA-256",t)}(e));return t}))}o(128);class r{constructor(e){this.requests=[],this.storageKey="ab-oauth-requests",this.config=e,this.config.token_url||(this.config.token_url=this.config.authorization_url.replace("/authorize","/token")),this.accessToken={access_token:"",expires_in:0,refresh_token:"",scope:"",token_type:"Bearer"},this.load()}get authorization_url(){return this.config.authorization_url}get token_url(){if(this.config.token_url)return this.config.token_url;const e=this.authorization_url.split("/");return e.slice(0,e.length-1).join("/")+"/token"}test(){console.log("Tester oauth client"),window.location.hash.indexOf("code=")?this.exchangeAuthCode():this.authorizationCode("wwapp offline_access")}store(){localStorage.setItem(this.storageKey,JSON.stringify(this.requests))}load(){this.requests=JSON.parse(localStorage.getItem(this.storageKey)||"[]")}authorizationCode(e,t){t=void 0===t||!!t;const n=o(16);e=encodeURIComponent(e);let r=encodeURIComponent(this.config.redirect_uri||"");const s=t?o():"";this.requests.push({type:"code",state:n,metadata:{author:"Michele de Chiffre"},codeVerifier:s}),this.store(),i(s).then((o=>{let i=`${this.config.authorization_url}?`;i+="response_type=code",i+=`&client_id=${this.config.client_id}`,i+=`&redirect_uri=${r}`,i+=`&scope=${e}`,i+=`&state=${n}`,t&&(i+=`&code_challenge=${o}`,i+="&code_challenge_method=S256"),window.location.href=i}))}clientCredentials(e,n){const i=o(12);return this.requests.push({type:"client_credentials",state:i,metadata:{author:"Michele de Chiffre"}}),this.store(),new Promise(((o,r)=>{if(void 0===this.config.client_secret)return void r("Client Secret must be defined");let s={method:"POST",formEncoded:!0,data:"grant_type=client_credentials&client_id="+this.config.client_id+"&client_secret="+this.config.client_secret+"&scope="+e,success(e){try{const t=JSON.parse(e),n=c.loadRequest(i);if(!n)return void r(`Request not found for state ${i}`);n.accessToken=t,c.store(),o(t)}catch(t){r(`Error parsing response ${e}`)}},error:r};void 0!==n&&(s.headers=n);let c=this;t.default(this.token_url,s)}))}exchangeAuthCode(e){return new Promise(((o,n)=>{e=e||window.location.hash||window.location.search;let i=this.parseHashstring(e),r=i.code,s=i.state,c=this.loadRequest(s);if(null!==c){if(c.authorizationCode=r,void 0===c)return console.error(`Missing saved request for state (${s})`,"oauth"),!1;if(this.config.token_url){let e="grant_type=authorization_code";e+=`&client_id=${this.config.client_id}`,e+=`&client_secret=${this.config.client_secret}`,e+=`&redirect_uri=${this.config.redirect_uri}`,e+=`&code=${r}`,e+=`&code_verifier=${c.codeVerifier}`;let n=this,i={method:"POST",formEncoded:!0,success(e){var t=JSON.parse(e);c&&(c.accessToken=t),n.accessToken=t,n.store(),o(t)}};i.data=e,t.default(this.config.token_url+"",i)}}else n(`Request not saved correctly and not possible to load ${s}`)}))}getAccessToken(){var e;return(null===(e=this.getAccessTokenObject())||void 0===e?void 0:e.access_token)||!1}getAccessTokenObject(){if(!this.accessToken.access_token){let e=this.findLatestAccessToken();null!==e&&(this.accessToken=e)}return this.accessToken||null}getRefreshToken(){let e=this.getAccessTokenObject();return(null==e?void 0:e.refresh_token)||null}hasRefreshToken(){return!!this.getRefreshToken()}refreshToken(){return new Promise(((e,o)=>{var n;let i=this.getLastReqWithRefreshToken();if(null===i)return void o("Could not get refresh token");let r=null===(n=i.accessToken)||void 0===n?void 0:n.refresh_token;var s=this.config.token_url;void 0!==s?t.default(s,{method:"POST",data:`grant_type=refresh_token&client_id=${this.config.client_id}&client_secret=${this.config.client_secret}&refresh_token=${r}`,formEncoded:!0,run:t=>{i=i,i.accessToken=Object.assign(i.accessToken,t),e(t)},error:o}):o("uri not defined for oauth client")}))}getLastReqWithRefreshToken(){let e;for(let t=this.requests.length-1;t>=0;t--)if(e=this.requests[t].accessToken,void 0!==e&&""!==e.refresh_token)return this.requests[t];return null}findLatestAccessToken(){let e;for(let t=this.requests.length-1;t>=0;t--)if(e=this.requests[t].accessToken,void 0!==e&&""!==e.access_token)return e;return null}parseHashstring(e){let t,o,n=e.split("&"),i={code:"",state:""};for(var r=0;r<n.length;r++)t=n[r].split("="),o=t[0].replace(/^[#\?]/g,""),void 0!==i[o]&&(i[o]=decodeURIComponent(t[1]));return i}loadRequest(e){return this.requests.find((t=>t.state===e))||null}}if("undefined"!=typeof OAUTHCLIENT_RUN_EXAMPLE&&OAUTHCLIENT_RUN_EXAMPLE){var s=new r({authorization_url:"https://dechiffre.dk/oauth2-demo-php/my-oauth2/authorize.php",token_url:"https://dechiffre.dk/oauth2-demo-php/my-oauth2/token.php",client_id:"aclient",client_secret:"enlang9923123",redirect_uri:"http://localhost:8080/test/index.htm"});confirm("Er du klar?")&&(-1!==window.location.hash.indexOf("code=")||-1!==window.location.search.indexOf("code=")?(s.exchangeAuthCode(),setTimeout((()=>{let e=s.getAccessToken();console.log(e),t.default("https://dechiffre.dk/oauth2-demo-php/my-oauth2/resource.php",{headers:{Authorization:"Bearer "+e},method:"POST",run(e){console.log("Du har ressourcen: ",e)}})}),3e3)):s.authorizationCode("testscope"))}