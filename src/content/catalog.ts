import rawCatalog from "./countries.json";
import type { Catalog } from "../game/types";
import { resolveCatalog } from "./requirements";

export const catalog = resolveCatalog(rawCatalog as Catalog);
