import type { Application } from "./application.js";
import type { Module, ProviderToken, Type } from "./interface/index.js";
import { getTokenName } from "./provider.js";

const CurrentProvided = Symbol('CurrentProvided');
const CurrentExported = Symbol('CurrentExported');
const ImportedExported = Symbol('ImportedExported');
const AnyProvided = Symbol('AnyProvided');
const AnyExported = Symbol('AnyExported');

export const InjectorStrategy = {
  /** Searches inside the providers of the current module. */
  CurrentProvided,

  /** Searches inside the exports of the current module. */
  CurrentExported,

  /** Searches inside the exports of an imported module of the current module. */
  ImportedExported,

  /** Searches inside the providers of any module starting with the root module. */
  AnyProvided,

  /** Searches inside the exports of any module starting with the root module. */
  AnyExported,
} as const;

export type InjectorStrategy =
  (typeof InjectorStrategy)[keyof typeof InjectorStrategy];

export interface InjectorOptions {
  strategies: InjectorStrategy[];
}

export class Injector {
  constructor(
    readonly application: Application,
    readonly module: Module,
  ) {}


  get<T>(token: Type<T>, options: InjectorOptions): T;
  get<T = unknown>(token: symbol, options: InjectorOptions): T;
  get<T = unknown>(token: ProviderToken, options: InjectorOptions): T;
  get<T>(token: ProviderToken, options: InjectorOptions): T {
    for (const strategy of options.strategies) {
      if (strategy === InjectorStrategy.CurrentProvided) {
        if (!this.application.hasInstance(this.module, token)) continue;
        const instances = this.application.getInstances(this.module, token);
        return instances[instances.length - 1];
      }
      
      if (strategy === InjectorStrategy.CurrentExported) {
        const tokenExporter = this.application.moduleStore.getTokenExporter(this.module, token);
        if (tokenExporter === null) continue;
        const instances = this.application.getInstances(tokenExporter, token);
        return instances[instances.length - 1];
      }
      
      if (strategy === InjectorStrategy.ImportedExported) {
        const imports = this.application.moduleStore.getModuleImports(this.module);
        for (const moduleImport of imports) {
          const tokenExporter = this.application.moduleStore.getTokenExporter(moduleImport, token);
          if (tokenExporter === null) continue;
          const instances = this.application.getInstances(tokenExporter, token);
          return instances[instances.length - 1];
        }
      }
      
      if (strategy === InjectorStrategy.AnyExported) {
        throw new Error("Not implemented");
      }
      
      if (strategy === InjectorStrategy.AnyProvided) {
        throw new Error("Not implemented");
      }
    }

    throw new Error(`Instance for provider ${getTokenName(token)} could not be found.`)
  }

  // getFromModule<T extends any, S = ProviderToken>(module: Module, token: T | S, options: InjectorOptions): T {
  //   for (const source of options.source) {
  //     if (source === ProviderSources.CurrentExported) {
  //       this.application.getInstance(module, token);
  //     }
  //   }
  // }
}

