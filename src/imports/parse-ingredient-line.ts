import type { ApiErrorPayload } from "src/common/api/api-response";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import type { Unit } from "src/recipes/units";
import { UNIT_SYNONYMS, UNKNOWN_UNITS } from "./unit-synonyms";

/**
 * Parses one ingredient line of an import into amount, unit, name and note.
 * Rules: guidelines projects/rezepte.md, "Recipe import" and "Standard text format".
 */

/** Why a line should be checked in the preview; message ID plus optional params, like API errors. */
export interface ImportIssue {
  message: MessageId;
  params?: NonNullable<ApiErrorPayload["params"]>;
}

export interface ParsedIngredientLine {
  original: string;
  /** Headings like "Für den Teig:" are skipped (shown greyed in the preview). */
  skipped: boolean;
  amount: number | null;
  unit: Unit | null;
  name: string;
  note: string | null;
  issues: ImportIssue[];
}

const UNSURE_MARKER = "?";
const FRACTION_CHARACTERS: Record<string, number> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
};
const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const FRACTION_CHARACTER = "[½¼¾⅓⅔]";
const RANGE = new RegExp(String.raw`^(${NUMBER})\s*[-–]\s*(${NUMBER})\s*`);
const MIXED_FRACTION = new RegExp(
  String.raw`^(\d+)\s*(${FRACTION_CHARACTER})\s*`,
);
const SLASH_FRACTION = /^(\d+)\s*\/\s*(\d+)\s*/;
const PLAIN_NUMBER = new RegExp(String.raw`^(${NUMBER})\s*`);
const ONLY_FRACTION_CHARACTER = new RegExp(
  String.raw`^(${FRACTION_CHARACTER})\s*`,
);
const UNIT_TOKEN = /^([A-Za-zÄÖÜäöüß]+)\.?(?=\s|$)\s*/;
const TRAILING_NOTE = /\s*\(([^)]*)\)\s*$/;
const HEADING = /:\s*$/;
const DECIMALS = 100;

/** Phrases meaning "no fixed amount"; they are removed from the name. */
const FREE_AMOUNT_PHRASES = [
  /\betwas\b/i,
  /\bnach geschmack\b/i,
  /\bnach bedarf\b/i,
  /\bzum abschmecken\b/i,
  /\bevtl\.?/i,
];
const SEVERAL_INGREDIENTS = /\s(und|&)\s/i;

/** Preparation hints after a comma ("Zwiebeln, fein gewürfelt") become the note; anything else stays in the name. */
const COMMA_NOTE =
  /,\s*((?:fein |grob |frisch )?(?:gewürfelt|gehackt|gerieben|geschält|gepresst|zerlassen|geschmolzen|zimmerwarm|weich|in scheiben|in ringen|in würfeln))$/i;

/** "etwas Butter für die Form": the purpose becomes the note. */
const PURPOSE_NOTE = /\s+(für (?:die|den|das) [A-Za-zÄÖÜäöüß]+)$/i;

/** "geriebener Gouda" -> note "gerieben", name "Gouda". */
const PREPARATION_PREFIXES: [RegExp, string][] = [
  [/^gerieben(?:e|er|es|en)?\s+/i, "gerieben"],
  [/^gehackt(?:e|er|es|en)?\s+/i, "gehackt"],
  [/^gewürfelt(?:e|er|es|en)?\s+/i, "gewürfelt"],
  [/^geschält(?:e|er|es|en)?\s+/i, "geschält"],
  [/^zerlassen(?:e|er|es|en)?\s+/i, "zerlassen"],
];

function toNumber(text: string): number {
  return Number(text.replace(",", "."));
}

function round(value: number): number {
  return Math.round(value * DECIMALS) / DECIMALS;
}

interface AmountResult {
  amount: number | null;
  rest: string;
  issue?: ImportIssue;
}

function readAmount(text: string): AmountResult {
  const range = RANGE.exec(text);

  if (range) {
    return {
      amount: toNumber(range[2] ?? ""),
      rest: text.slice(range[0].length),
      issue: {
        message: MESSAGE_ID.importRange,
        params: { from: range[1] ?? "", to: range[2] ?? "" },
      },
    };
  }

  const mixed = MIXED_FRACTION.exec(text);

  if (mixed) {
    const value = Number(mixed[1]) + (FRACTION_CHARACTERS[mixed[2] ?? ""] ?? 0);
    return { amount: round(value), rest: text.slice(mixed[0].length) };
  }

  const slash = SLASH_FRACTION.exec(text);

  if (slash && Number(slash[2])) {
    return {
      amount: round(Number(slash[1]) / Number(slash[2])),
      rest: text.slice(slash[0].length),
    };
  }

  const fractionCharacter = ONLY_FRACTION_CHARACTER.exec(text);

  if (fractionCharacter) {
    return {
      amount: round(FRACTION_CHARACTERS[fractionCharacter[1] ?? ""] ?? 0),
      rest: text.slice(fractionCharacter[0].length),
    };
  }

  const plain = PLAIN_NUMBER.exec(text);

  if (plain) {
    return {
      amount: toNumber(plain[1] ?? ""),
      rest: text.slice(plain[0].length),
    };
  }

  return { amount: null, rest: text };
}

interface UnitResult {
  unit: Unit | null;
  rest: string;
  issue?: ImportIssue;
}

/** Only directly after an amount: in "Salz" the first word is the name, not a unit. */
function readUnit(text: string): UnitResult {
  const token = UNIT_TOKEN.exec(text);

  if (!token) {
    return { unit: null, rest: text };
  }

  const word = (token[1] ?? "").toLowerCase();
  const unit = UNIT_SYNONYMS[word];

  if (unit) {
    return { unit, rest: text.slice(token[0].length) };
  }

  if (UNKNOWN_UNITS.includes(word)) {
    return {
      unit: null,
      rest: text.slice(token[0].length),
      issue: {
        message: MESSAGE_ID.importUnknownUnit,
        params: { unit: token[1] ?? "" },
      },
    };
  }

  return { unit: null, rest: text };
}

function withoutFreeAmountPhrases(text: string): {
  text: string;
  found: boolean;
} {
  let result = text;

  for (const phrase of FREE_AMOUNT_PHRASES) {
    result = result.replace(phrase, " ");
  }

  return { text: result.replace(/\s+/g, " ").trim(), found: result !== text };
}

/** Splits a preparation hint off the name: trailing comma hint or leading adjective. */
function splitNote(name: string): { name: string; note: string | null } {
  const comma = COMMA_NOTE.exec(name);

  if (comma) {
    return {
      name: name.slice(0, comma.index).trim(),
      note: (comma[1] ?? "").toLowerCase(),
    };
  }

  const purpose = PURPOSE_NOTE.exec(name);

  if (purpose) {
    return {
      name: name.slice(0, purpose.index).trim(),
      note: purpose[1] ?? null,
    };
  }

  for (const [prefix, note] of PREPARATION_PREFIXES) {
    if (prefix.test(name)) {
      return { name: name.replace(prefix, "").trim(), note };
    }
  }

  return { name, note: null };
}

function emptyLine(original: string): ParsedIngredientLine {
  return {
    original,
    skipped: false,
    amount: null,
    unit: null,
    name: "",
    note: null,
    issues: [],
  };
}

/** Plural endings in brackets right after a word, as Chefkoch writes them: "Zwiebel(n)", "Kürbis(se)". */
const PLURAL_MARKER = /(\p{L})\((?:n|en|e|s|se|er|ern|nen)\)/gu;

export function parseIngredientLine(raw: string): ParsedIngredientLine {
  const original = raw.trim();
  const line = emptyLine(original);
  // The singular is the registry name, so "Zwiebel(n)" becomes "Zwiebel".
  let text = original.replace(PLURAL_MARKER, "$1");

  if (text.startsWith(UNSURE_MARKER)) {
    line.issues.push({ message: MESSAGE_ID.importMarkedUnsure });
    text = text.slice(UNSURE_MARKER.length).trim();
  }

  if (HEADING.test(text)) {
    return { ...line, skipped: true };
  }

  const trailingNote = TRAILING_NOTE.exec(text);

  if (trailingNote) {
    line.note = (trailingNote[1] ?? "").trim() || null;
    text = text.slice(0, trailingNote.index).trim();
  }

  const amount = readAmount(text);
  line.amount = amount.amount;
  text = amount.rest;

  if (amount.issue) {
    line.issues.push(amount.issue);
  }

  if (line.amount !== null) {
    const unit = readUnit(text);
    line.unit = unit.unit;
    text = unit.rest;

    if (unit.issue) {
      line.issues.push(unit.issue);
    }
  }

  const freeAmount = withoutFreeAmountPhrases(text);
  text = freeAmount.text;

  if (freeAmount.found) {
    line.amount = null;
    line.unit = null;
  }

  const split = splitNote(text);
  line.name = split.name;
  line.note = line.note ?? split.note;

  if (line.amount === null && SEVERAL_INGREDIENTS.test(line.name)) {
    line.issues.push({ message: MESSAGE_ID.importSeveralIngredients });
  }

  if (!line.name) {
    line.issues.push({ message: MESSAGE_ID.importNameMissing });
  }

  return line;
}
