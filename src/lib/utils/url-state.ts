/**
 * URL State Management
 *
 * Utilities for encoding/decoding game state in URL parameters.
 * Uses LZ-String compression for compact URLs.
 */

import LZString from "lz-string";
import type { GamePlayer } from "@/types/players";

/**
 * Decode game state from URL search params
 */
export const decodeStateFromURL = (search: string) => {
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

/**
 * Encode game state to URL
 */
export const encodeStateToURL = (gamePlayers: Record<string, GamePlayer>) => {
  const stateObject = { gamePlayers };
  const jsonString = JSON.stringify(stateObject);
  const compressed = LZString.compressToEncodedURIComponent(jsonString);

  // Build URL with compressed state
  const baseUrl = `${window.location.origin}/`;
  return `${baseUrl}?state=${compressed}`;
};
