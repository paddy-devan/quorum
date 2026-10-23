import type { Attribute, Catalog, Entity, Fact, Measurement, Metric, Place } from "../game/types";

const unknown = (): Fact => ({
  value: null,
  explanation: "This relationship has not been verified for the pinned data snapshot.",
  sourceIds: [],
});
const regimeNames = ["closed autocracy", "electoral autocracy", "electoral democracy", "liberal democracy"];

function evidence(catalog: Catalog, ids: string[]) {
  if (!ids.length || ids.some((id) => !catalog.sources.some((source) => source.id === id)))
    throw new Error("Derived requirements need recognised source references.");
  return [...new Set(ids)];
}

function coordinate(place: Omit<Place, "id">) {
  if (!Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90 ||
      !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180)
    throw new Error(`Invalid coordinates: ${place.name}`);
}

/** Great-circle miles between fixed city points, using the mean Earth radius. */
export function distanceMiles(a: Omit<Place, "id">, b: Omit<Place, "id">): number {
  coordinate(a);
  coordinate(b);
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(b.latitude - a.latitude);
  const longitude = radians(b.longitude - a.longitude);
  const haversine = Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

function measurement(entity: Entity, metric: Metric, year: number): Measurement | null {
  if (metric === "gdpPerPerson" || metric === "density") {
    const population = measurement(entity, "population", year);
    const other = measurement(entity, metric === "density" ? "surfaceAreaKm2" : "gdpUsd", year);
    if (!population || !other) return null;
    return {
      value: metric === "density" ? population.value! / other.value! : other.value! / population.value!,
      year,
      sourceIds: [...population.sourceIds, ...other.sourceIds],
    };
  }
  const observation = entity.statistics?.[metric];
  if (!observation || observation.value === null || observation.year !== year) return null;
  if (!Number.isFinite(observation.value) || observation.value <= 0)
    throw new Error(`Invalid ${metric}: ${entity.id}`);
  return observation;
}

function metricText(metric: Metric, value: number) {
  const number = (n: number, digits = 0) => n.toLocaleString("en-GB", { maximumFractionDigits: digits });
  if (metric === "population") return `${number(value)} people`;
  if (metric === "surfaceAreaKm2") return `${number(value)} km² of surface area`;
  if (metric === "density") return `${number(value, 1)} people per km² of surface area`;
  if (metric === "gdpPerPerson") return `US$${number(value)} GDP per person`;
  return `US$${number(value / 1e9, 2)} billion GDP`;
}

export function resolveRequirement(catalog: Catalog, entity: Entity, attribute: Attribute): Fact {
  const rule = attribute.rule;
  if (!rule) return entity.facts[attribute.id] ?? unknown();
  if (rule.kind === "comparison") {
    const reference = catalog.entities.find((candidate) => candidate.id === rule.referenceId);
    if (!reference) throw new Error(`Missing comparison country: ${rule.referenceId}`);
    if (!["greater", "less"].includes(rule.operator)) throw new Error("Invalid comparison operator.");
    const left = measurement(entity, rule.metric, rule.year);
    const right = measurement(reference, rule.metric, rule.year);
    if (!left || !right) return unknown();
    return {
      value: rule.operator === "greater" ? left.value! > right.value! : left.value! < right.value!,
      explanation: `In ${rule.year}, ${entity.name} had ${metricText(rule.metric, left.value!)}; ${reference.name} had ${metricText(rule.metric, right.value!)}. The comparison uses unrounded values from the same World Bank snapshot.`,
      sourceIds: evidence(catalog, [...left.sourceIds, ...right.sourceIds]),
    };
  }
  if (rule.kind === "distance" || rule.kind === "closer") {
    const place = (id: string) => {
      const found = catalog.places?.find((candidate) => candidate.id === id);
      if (!found) throw new Error(`Missing reference place: ${id}`);
      return found;
    };
    const first = place(rule.kind === "distance" ? rule.placeId : rule.firstPlaceId);
    const second = rule.kind === "closer" ? place(rule.secondPlaceId) : null;
    if (rule.kind === "distance" && (!Number.isFinite(rule.maxMiles) || rule.maxMiles <= 0))
      throw new Error("Distance limits must be positive.");
    if (!entity.capital) return unknown();
    const miles = distanceMiles(entity.capital, first);
    const otherMiles = second ? distanceMiles(entity.capital, second) : null;
    const rounded = (n: number) => Math.round(n).toLocaleString("en-GB");
    return {
      value: rule.kind === "distance" ? miles <= rule.maxMiles : miles < otherMiles!,
      explanation: `${entity.name} uses ${entity.capital.name} as its capital point. It is about ${rounded(miles)} miles from ${first.name}${second ? ` and ${rounded(otherMiles!)} miles from ${second.name}` : `; the limit is ${rounded((rule as { maxMiles: number }).maxMiles)} miles`}. Distances follow a great circle, not roads or national borders; answers use unrounded distances.`,
      sourceIds: evidence(catalog, [...entity.capital.sourceIds, ...first.sourceIds, ...(second?.sourceIds ?? [])]),
    };
  }
  if (rule.kind === "event") {
    const collection = catalog.eventCollections?.find((candidate) => candidate.id === rule.collectionId);
    if (!collection) throw new Error(`Missing event collection: ${rule.collectionId}`);
    if (!Number.isInteger(rule.fromYear) || !Number.isInteger(rule.toYear) || rule.fromYear > rule.toYear)
      throw new Error("Invalid event date range.");
    // An absent event proves nothing unless this country and the entire period were reviewed.
    if (!collection.reviewedEntityIds.includes(entity.id) ||
        rule.fromYear < collection.fromYear || rule.toYear > collection.toYear) return unknown();
    const events = collection.events.filter((event) => event.entityId === entity.id &&
      event.year >= rule.fromYear && event.year <= rule.toYear);
    return {
      value: events.length > 0,
      explanation: events.length
        ? `${entity.name}: ${events.map((event) => `${event.description} (${event.year})`).join("; ")}.`
        : `${entity.name} has no qualifying entry in the reviewed ${collection.name} records for ${rule.fromYear}–${rule.toYear}.`,
      sourceIds: evidence(catalog, collection.sourceIds),
    };
  }
  if (rule.kind === "regime") {
    if (!rule.categories.length || rule.categories.some((category) => !Number.isInteger(category) || category < 0 || category > 3))
      throw new Error("Invalid political regime categories.");
    const observation = entity.regimes?.find((candidate) => candidate.year === rule.year);
    if (!observation) return unknown();
    if (!Number.isInteger(observation.category) || observation.category < 0 || observation.category > 3)
      throw new Error(`Invalid political regime: ${entity.id}`);
    return {
      value: rule.categories.includes(observation.category),
      explanation: `V-Dem’s Regimes of the World, as processed by Our World in Data, classifies ${entity.name} as a ${regimeNames[observation.category]} in ${rule.year}. This is a sourced regime classification, rather than a judgement about a named leader.`,
      sourceIds: evidence(catalog, observation.sourceIds),
    };
  }
  throw new Error("Unknown requirement format.");
}

/** Compile reusable source observations to the same yes/no facts the game already consumes. */
export function resolveCatalog(input: Catalog): Catalog {
  return {
    ...input,
    entities: input.entities.map((entity) => ({
      ...entity,
      facts: Object.fromEntries(input.attributes.map((attribute) => [
        attribute.id, resolveRequirement(input, entity, attribute),
      ])),
    })),
  };
}
