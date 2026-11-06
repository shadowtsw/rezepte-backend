/**
 * Fixed units for ingredient usages (see guidelines projects/rezepte.md, "Recipes").
 * Units of the same kind convert into each other; the factor is relative to the kind's base unit.
 */
export const UNIT_KINDS = {
  mass: { g: 1, kg: 1000 },
  volume: { ml: 1, l: 1000 },
  spoon: { TL: 1, EL: 3 },
} as const;

/** Units that are counted as they are (no conversion between them). */
export const COUNTED_UNITS = [
  "Stück",
  "Zehe",
  "Scheibe",
  "Bund",
  "Dose",
  "Packung",
  "Becher",
  "Prise",
  "Messerspitze",
] as const;

export type ConvertibleKind = keyof typeof UNIT_KINDS;
export type ConvertibleUnit = {
  [Kind in ConvertibleKind]: keyof (typeof UNIT_KINDS)[Kind];
}[ConvertibleKind];
export type CountedUnit = (typeof COUNTED_UNITS)[number];
export type Unit = ConvertibleUnit | CountedUnit;

export const UNITS: readonly Unit[] = [
  ...(Object.values(UNIT_KINDS).flatMap((units) =>
    Object.keys(units),
  ) as ConvertibleUnit[]),
  ...COUNTED_UNITS,
];

export function isUnit(value: unknown): value is Unit {
  return (
    typeof value === "string" && (UNITS as readonly string[]).includes(value)
  );
}

/** Kind and factor of a convertible unit, or undefined for counted units and no unit. */
export function conversionOf(
  unit: string | undefined,
): { kind: ConvertibleKind; factor: number } | undefined {
  for (const [kind, units] of Object.entries(UNIT_KINDS) as [
    ConvertibleKind,
    Record<string, number>,
  ][]) {
    const factor = unit ? units[unit] : undefined;

    if (factor !== undefined) {
      return { kind, factor };
    }
  }

  return undefined;
}
