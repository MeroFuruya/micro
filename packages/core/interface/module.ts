import type { ProviderToken, Provider } from "./provider.js";

export type Module = symbol;

export interface ModuleDefinition {
  name: string;
  import?: Module[];
  provide?: Provider[];
  export?: (Module | ProviderToken)[];
}