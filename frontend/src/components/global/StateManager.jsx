import LZString from "lz-string";

export const decodeStateFromURL = (search) => {
    const urlParams = new URLSearchParams(search);
    const encodedState = urlParams.get("state");
    if (encodedState) {
        try {
            return JSON.parse(LZString.decompressFromEncodedURIComponent(encodedState));
        } catch (e) {
            console.error("Invalid URL state", e);
        }
    }
    return null;
};

export const encodeStateToURL = (players) => {
    const stateObject = { players};

    console.log("SAVED BUTTON STATE OBJ ", stateObject);
    const jsonString = JSON.stringify(stateObject);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);

    // Update URL with compressed state
    return `${window.location.origin}?state=${compressed}`;

};

