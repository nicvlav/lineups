import LZString from "lz-string";
import { Player } from "@/data/types"; 

export const decodeStateFromURL = (search : string) => {
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

export const encodeStateToURL = (players : Player[]) => {
    const stateObject = { players };
    const jsonString = JSON.stringify(stateObject);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
  
    // IMPORTANT: This is to work specifically with github pages
    // not sure how this would work with a different service
    const baseUrl = `${window.location.origin}/lineups/`;
  
    // Return the final URL with the compressed state
    return `${baseUrl}?state=${compressed}`;
  };
