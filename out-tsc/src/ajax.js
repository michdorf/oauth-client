"use strict";
/** wwApp ajax module ; 22.08.2021 12:30 MD
* COPYRIGHT (C) 2021, AUTONIK AB
* SOURCE	;
*/
function ajax(url, setup = {}) {
    var xhr = new XMLHttpRequest();
    var method = setup.method || "GET";
    var data = data2str(setup.data || '');
    if ('cache' in xhr) {
        xhr.cache = false; // For IE
    }
    if (typeof setup.withCredentials !== "undefined") {
        xhr.withCredentials = !!setup.withCredentials;
    }
    xhr.open(method, url);
    if (setup.formEncoded) {
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    if (typeof setup.headers === "object") {
        for (var key in setup.headers) {
            xhr.setRequestHeader(key, setup.headers[key]);
        }
    }
    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var response = xhr.responseType === 'json' ? xhr.response : xhr.responseText;
                if (typeof setup.success === "function") {
                    setup.success(response, xhr);
                }
                if (typeof setup.run === "function") {
                    setup.run(response);
                }
                if (typeof setup.complete === "function") {
                    setup.complete();
                }
            }
            else {
                funz(setup.error, ajax_handle_error, [xhr.status, xhr]);
                if (typeof setup.complete === "function") {
                    setup.complete();
                }
            }
        }
    };
    xhr.onerror = function (e) {
        funz(setup.error, ajax_handle_error, [xhr.status, xhr]);
        if (typeof setup.complete === "function") {
            setup.complete();
        }
    };
    try {
        xhr.send(setup.method === "POST" ? data : null);
    }
    catch (e) {
        console.error("Der skete en fejl med send():\n" + JSON.stringify(e));
    }
}
function data2str(data) {
    if (typeof data === "string") {
        return data;
    }
    var r = '';
    for (let k in data) {
        if (typeof data[k] === "object") {
            data[k] = JSON.stringify(data[k]);
        }
        r += "&" + k + "=" + data[k];
    }
    return r.substr(1);
}
let ajax_503_warned = false; // Wether the user has been noticed about "Service Unavailable"
function ajax_handle_error(status_code, req) {
    // status_code 503 = "Service Unavailable"
    if (status_code == 503 && !ajax_503_warned) {
        alert("Service Unavailable.\nIt seems like too many licenses are in use");
        ajax_503_warned = true;
    }
    console.error("Fejl i ajax laredo login.js\nStatus code: " + status_code, req);
}
function funz(func, fallback, args) {
    if (typeof func === "function") {
        func.apply(null, args);
    }
    else {
        fallback.apply(null, args);
    }
}
