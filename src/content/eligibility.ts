import type { Attribute } from "../game/types";

/** Eligibility is separate from whether a country's factual answer is true. */
export function excludedCountries(attributes: Attribute[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const attribute of attributes) {
    const exclusions = [...(attribute.excludedEntityIds ?? [])];
    if (attribute.rule?.kind === "comparison") exclusions.push(attribute.rule.referenceId);
    for (const id of new Set(exclusions)) {
      const reason = attribute.rule?.kind === "comparison" && id === attribute.rule.referenceId
        ? `reference country for “${attribute.label}”`
        : `excluded by “${attribute.label}”`;
      result.set(id, [...(result.get(id) ?? []), reason]);
    }
  }
  return result;
}
