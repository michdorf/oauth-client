(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function randomString(length, characters) {
        length = length === undefined ? 32 : length;
        characters = characters === undefined ? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : characters;
        var maxIndex = characters.length - 1;
        var string = '';
        if (typeof window !== "undefined" && "crypto" in window) {
            var array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            return btoa(array.join(""));
        }
        for (var i = 0; i < length; i++) {
            string += characters[Math.random() * maxIndex];
        }
        return string;
    }
    exports.default = randomString;
});
