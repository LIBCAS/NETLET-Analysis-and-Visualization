
export interface Sort { label: string; field: string; dir: string; entity?: string[]};


export class Configuration {
  context: string;
  defaultLang: string;
  excluded_identities: {[tenant: string]: string[]};
  colors: {[key: string]: string};
  tenant_colors: {[tenant: string]: string};
  
  hikoUrl: string;
  isTest: boolean;
  test_mappings: {[tenant: string]: string};
}
