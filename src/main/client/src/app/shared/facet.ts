import { FacetRange } from "./facet-range"

export interface Facet {
  name: string, 
  type: string, 
  value: number,
  selected?: boolean 
}

export interface JSONFacet {
  val: string, 
  count: number,
  selected?: boolean,
  [subfacet: string]: any; 
}

export interface FacetFields {
  [key: string]: {buckets: JSONFacet[]}
}

export interface FacetCounts {
  facet_fields: FacetFields,
  facet_ranges: {[key: string]: FacetRange}
}