/* export default */function randomString(length?: number, characters?: string): string {
    length = length === undefined ? 32 : length;
    characters = characters === undefined ? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : characters;

    var maxIndex = characters.length - 1;
    var string = '';

    if (typeof window !== "undefined" && "crypto" in window) {
        var array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return btoa(array.join(""));
    }

    for(var i = 0; i < length; i++) {
        string += characters[Math.random() * maxIndex];
    }

    return string;
}