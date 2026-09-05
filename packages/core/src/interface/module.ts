import type { ProviderToken, Provider } from "./provider.js";

export type Module = symbol;

export interface ModuleDefinition {
  name: string;
  import?: ReadonlyArray<Module>;
  provide?: ReadonlyArray<Provider>;
  export?: ReadonlyArray<Module | ProviderToken>;
}