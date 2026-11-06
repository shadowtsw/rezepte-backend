import type { Unit } from "src/recipes/units";

/**
 * How units are written in recipes, mapped to the fixed unit list. Keys are lower case, without a trailing dot.
 * Must cover every unit itself, so "EL" and "Prise" are found too.
 */
export const UNIT_SYNONYMS: Record<string, Unit> = {
  g: "g",
  gr: "g",
  gramm: "g",
  kg: "kg",
  kilo: "kg",
  kilogramm: "kg",
  ml: "ml",
  milliliter: "ml",
  l: "l",
  liter: "l",
  tl: "TL",
  teelöffel: "TL",
  teeloeffel: "TL",
  el: "EL",
  esslöffel: "EL",
  essloeffel: "EL",
  stück: "Stück",
  stk: "Stück",
  st: "Stück",
  zehe: "Zehe",
  zehen: "Zehe",
  scheibe: "Scheibe",
  scheiben: "Scheibe",
  bund: "Bund",
  dose: "Dose",
  dosen: "Dose",
  packung: "Packung",
  packungen: "Packung",
  pck: "Packung",
  pkg: "Packung",
  päckchen: "Packung",
  becher: "Becher",
  prise: "Prise",
  prisen: "Prise",
  messerspitze: "Messerspitze",
  msp: "Messerspitze",
};

/** Units that recipes use but the app does not have; such lines are marked unsure, nothing is converted. */
export const UNKNOWN_UNITS = [
  "tasse",
  "tassen",
  "handvoll",
  "schuss",
  "spritzer",
  "glas",
  "gläser",
  "stange",
  "stangen",
  "zweig",
  "zweige",
  "blatt",
  "blätter",
  "würfel",
  "tropfen",
];
