import type { Application } from "./application.js";
import type { Module, ProviderToken, Type } from "./interface/index.js";

const CurrentProvided = Symbol('CurrentProvided');
const CurrentExported = Symbol('CurrentExported');
const ImportedExported = Symbol('ImportedExported');
const ImportedExportedRecurse = Symbol('ImportedExportedRecurse');
const AnyProvided = Symbol('AnyProvided');
const AnyExported = Symbol('AnyExported');

export const ProviderSources = {
  /** Searches inside the providers of the current module. */
  CurrentProvided,
  
  /** Searches inside the exports of the current module. */
  CurrentExported,
  
  /** Searches inside the exports of an imported module of the current module. */
  ImportedExported,
  
  /** Searches inside the exports of an imported module and their exported modules recursively of the current module. */
  ImportedExportedRecurse,
  
  /** Searches inside the providers of any module starting with the root module. */
  AnyProvided,
  
  /** Searches inside the exports of any module starting with the root module. */
  AnyExported,
} as const;

export type ProviderSource =
  (typeof ProviderSources)[keyof typeof ProviderSources];

export interface InjectorOptions {
  source: ProviderSource[];
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
    const instances = this.application.getInstances(this.module, token);
    return instances[instances.length - 1];
  }

  // getFromModule<T extends any, S = ProviderToken>(module: Module, token: T | S, options: InjectorOptions): T {
  //   for (const source of options.source) {
  //     if (source === ProviderSources.CurrentExported) {
  //       this.application.getInstance(module, token);
  //     }
  //   }
  // }
}

