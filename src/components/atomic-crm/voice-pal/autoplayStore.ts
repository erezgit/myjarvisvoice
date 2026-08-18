import { useEffect, useState } from "react";

/**
 * Autoplay is one setting with two owners now: the BUTTON that toggles it lives
 * in the bottom bar (Layout), and the FEED that obeys it lives in VoicePalPage.
 * Those are different subtrees, so the flag can't just be useState in one of
 * them — hence this tiny store rather than a context provider wrapping the whole
 * app for a single boolean.
 *
 * The localStorage key is unchanged, so Erez's existing preference carries over.
 */
const KEY = "mc-autoplay-enabled";

let enabled = localStorage.getItem(KEY) !== "false"; // default ON
const subscribers = new Set<(v: boolean) => void>();

export const getAutoplay = () => enabled;

export function setAutoplay(next: boolean) {
  enabled = next;
  localStorage.setItem(KEY, String(next));
  subscribers.forEach((fn) => fn(next));
}

export function useAutoplay(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(enabled);
  useEffect(() => {
    subscribers.add(setValue);
    return () => { subscribers.delete(setValue); };
  }, []);
  return [value, setAutoplay];
}
