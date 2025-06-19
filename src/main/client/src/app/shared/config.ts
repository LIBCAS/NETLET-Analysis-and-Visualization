
export interface Sort { label: string; field: string; dir: string; entity?: string[]};


export class Configuration {
  context: string;
  defaultLang: string;
  tenants_identities: {[tenant: string]: string[]}
}
