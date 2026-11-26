import { ST_BREAD } from "./constants.js";

export const fmt = (s) => {
  s = Math.max(0, Math.round(s));
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
};
export const el = (id) => document.getElementById(id);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const routeLabels = (direct, sep) =>
  Object.keys(direct)
    .map((k) => (k === ST_BREAD ? "BREADING" : k.toUpperCase()))
    .join(sep);
