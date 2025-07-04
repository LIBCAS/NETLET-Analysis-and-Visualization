
export interface Sort { label: string; field: string; dir: string; entity?: string[]};


export class Configuration {
  context: string;
  defaultLang: string;
  excluded_identities: {[tenant: string]: string[]};
  colors: {[key: string]: string};
}
