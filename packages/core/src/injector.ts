import type { Application } from "./application.js";
import type { Module, ProviderInstance, ProviderInstanceToken, ProviderToken, Type } from "./interface/index.js";
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
  optional?: boolean;
}

export class Injector {
  constructor(
    readonly application: Application,
    readonly module: Module,
    readonly instanceToken: ProviderInstanceToken,
  ) {}

  *getAll(token: ProviderToken, strategy: InjectorStrategy): IterableIterator<ProviderInstance> {
    if (strategy === InjectorStrategy.CurrentProvided) {
      if (!this.application.hasInstance(this.module, token)) return;
      yield* this.application.getInstances(this.module, token, this.instanceToken);
    }
    
    if (strategy === InjectorStrategy.CurrentExported) {
      for (const moduleExport of this.application.enumerateModuleExportTree(this.module)) {
        if (!this.application.hasInstance(moduleExport, token)) continue;
        yield* this.application.getInstances(moduleExport, token, this.instanceToken);
      }
    }
    
    if (strategy === InjectorStrategy.ImportedExported) {
      const imports = this.application.moduleStore.importModule.values([this.module]);
      for (const moduleImport of imports) {
        for (const moduleExport of this.application.enumerateModuleExportTree(moduleImport)) {
          if (!this.application.hasInstance(moduleExport, token)) continue;
          yield* this.application.getInstances(moduleExport, token, this.instanceToken);
        }
      }
    }
    
    if (strategy === InjectorStrategy.AnyExported) {
      for (const moduleImport of this.application.enumerateModuleImportTreeGlobal(this.module)) {
        if (!this.application.hasExportedInstance(moduleImport, token)) continue;
        yield* this.application.getInstances(moduleImport, token, this.instanceToken);
      }
    }
    
    if (strategy === InjectorStrategy.AnyProvided) {
      for (const moduleImport of this.application.enumerateModuleImportTreeGlobal(this.module)) {
        if (!this.application.hasInstance(moduleImport, token)) continue;
        yield* this.application.getInstances(moduleImport, token, this.instanceToken);
      }
    }
  }


  get<T, O extends InjectorOptions = InjectorOptions>(token: ProviderToken<T>, options: O): O extends { optional: true } ? T | undefined : T;
  get<T>(token: ProviderToken, options: InjectorOptions): T | undefined {
    for (const strategy of options.strategies) {
      if (strategy === InjectorStrategy.CurrentProvided) {
        if (!this.application.hasInstance(this.module, token)) continue;
        return this.application.getInstance(this.module, token, this.instanceToken);
      }
      
      if (strategy === InjectorStrategy.CurrentExported) {
        for (const moduleExport of this.application.enumerateModuleExportTree(this.module)) {
          if (!this.application.hasExportedInstance(moduleExport, token)) continue;
          return this.application.getInstance(moduleExport, token, this.instanceToken);
        }
      }
      
      if (strategy === InjectorStrategy.ImportedExported) {
        const imports = this.application.moduleStore.importModule.values([this.module]);
        for (const moduleImport of imports) {
          for (const moduleExport of this.application.enumerateModuleExportTree(moduleImport)) {
            if (!this.application.hasExportedInstance(moduleExport, token)) continue;
            return this.application.getInstance(moduleExport, token, this.instanceToken);
          }
        }
      }
      
      if (strategy === InjectorStrategy.AnyExported) {
        for (const moduleImport of this.application.enumerateModuleImportTreeGlobal(this.module)) {
          if (!this.application.hasExportedInstance(moduleImport, token)) continue;
          return this.application.getInstance(moduleImport, token, this.instanceToken);
        }
      }
      
      if (strategy === InjectorStrategy.AnyProvided) {
        for (const moduleImport of this.application.enumerateModuleImportTreeGlobal(this.module)) {
          if (!this.application.hasInstance(moduleImport, token)) continue;
          return this.application.getInstance(moduleImport, token, this.instanceToken);
        }
      }
    }

    if (options.optional === true) return undefined;

    throw new Error(`Instance for provider ${getTokenName(token)} could not be found.`)
  }
}

