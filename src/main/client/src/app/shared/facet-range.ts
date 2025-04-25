import { Facet } from "./facet";

export interface FacetRange {
  start: number;
  end: number;
  gap: number;
  counts: Facet[];
}