import type { Module, ModuleDefinition, Provider, ProviderToken } from "./interface/index.js";
import { isDynamicProvider } from "./provider.js";



export class ModuleDefinitionStore {
  private static instance?: ModuleDefinitionStore;
  static getGlobalModuleStore(): ModuleDefinitionStore {
    if (ModuleDefinitionStore.instance === undefined) {
      ModuleDefinitionStore.instance = new ModuleDefinitionStore();
    }
    return ModuleDefinitionStore.instance
  }

  private readonly store = new Map<Module, Readonly<ModuleDefinition>>();

  defineModule(definition: Readonly<ModuleDefinition>): Module {
    const module = Symbol(definition.name);
    this.store.set(module, definition);
    return module;
  }

  getDefinition(module: Module): Readonly<ModuleDefinition> {
    if (!this.store.has(module)) throw new Error(`Module not defined ${String(module)}`);
    return this.store.get(module)!;
  }

  hasModule(module: Module): boolean {
    return this.store.has(module);
  }

  getModules(): ReadonlyArray<Module> {
    return [...this.store.keys()]
  }

  getModuleImports(module: Module): ReadonlyArray<Module> {
    return this.getDefinition(module).import ?? [];
  }
  
  getModuleName(module: Module): string {
    return this.getDefinition(module).name;
  }

  getModuleProviders(module: Module): ReadonlyArray<Provider> {
    return this.getDefinition(module).provide ?? [];
  }
  
  getModuleProviderTokens(module: Module): ReadonlyArray<ProviderToken> {
    const providers = this.getModuleProviders(module);
    const providerTokens: ProviderToken[] = [];
    for (const provider of providers) {
      if (isDynamicProvider(provider)) {
        providerTokens.push(provider.for);
      } else {
        providerTokens.push(provider);
      }
    }
    return providerTokens
  }

  hasModuleProvider(module: Module, token: ProviderToken): boolean {
    const providers = this.getModuleProviders(module);
    for (const provider of providers) {
      if (isDynamicProvider(provider) && provider.for === token) return true;
      else if (provider === token) return true;
    }
    return false;
  }
  
  getModuleExports(module: Module): ReadonlyArray<ProviderToken | Module> {
    return this.getDefinition(module).export ?? [];
  }

  // detectCircularImports(module: Module, seen?: ReadonlyArray<Module>): ReadonlyArray<Module>[] {
  //   seen ??= [];
  //   const imports = this.getModuleImports(module);

  //   const circularImports: ReadonlyArray<Module>[] = [];
  //   for (const moduleImport of imports) {
  //     const newSeen = [...seen, module];
      
  //     if (seen.includes(moduleImport)) {
  //       const seenIndex = seen.indexOf(moduleImport);
  //       circularImports.push(newSeen.slice(seenIndex));
  //       continue;
  //     }
      
  //     const importedCircularImports = this.detectCircularImports(moduleImport, newSeen);
  //     circularImports.push(...importedCircularImports)
  //   }

  //   return circularImports;
  // }

  detectModuleIssue(rootModule: Module): Error | null {
    const modules = this.getModules();

    for (const module of modules) {
      const imports = this.getModuleImports(module);
      const providerTokens = this.getModuleProviderTokens(module);
      const exports = this.getModuleExports(module);

      // Validate imports
      for (const importedModule of imports) {
        if (!this.hasModule(importedModule)) {
          return new Error(`Imported module ${String(importedModule)} not defined`)
        }
      }

      // Validate Providers
      for (const providerToken of providerTokens) {
        if (typeof providerToken === 'symbol' && this.hasModule(providerToken)) {
          return new Error(`Module cannot be used as Provider Token ${String(providerToken)}`)
        }
      }

      // Validate Exports
      for (const exportedToken of exports) {
        const isProvided = providerTokens.includes(exportedToken);
        if (isProvided) continue;
        
        if (typeof exportedToken === 'symbol') {
          const isImportedModule = imports.includes(exportedToken);
          if (isImportedModule) continue;
  
          const isModule = this.hasModule(exportedToken);
          if (isModule) return new Error(`Exported module ${String(exportedToken)} was not imported`);
        }

        return new Error(`Exported provider token ${String(exportedToken)} not provided in module`);
      }
    }

    const detectCircularImports = (module: Module, seen?: ReadonlyArray<Module>): ReadonlyArray<Module> | null => {
      seen ??= [];
      const imports = this.getModuleImports(module);

      for (const moduleImport of imports) {
        const newSeen = [...seen, module];
        
        if (seen.includes(moduleImport)) {
          const seenIndex = seen.indexOf(moduleImport);
          return newSeen.slice(seenIndex)
        }
        
        const importedCircularImports = detectCircularImports(moduleImport, newSeen);
        if (importedCircularImports !== null) {
          return importedCircularImports;
        }
      }
      return null;
    }

    const circularImport = detectCircularImports(rootModule)
    if (circularImport !== null) {
      const circularImportNames = circularImport.map((module) => this.getModuleName(module));
      return new Error(`Detected circular import ${circularImportNames.join(' -> ')}`)
    }

    return null;
  }
}

export function defineModule(definition: Readonly<ModuleDefinition>): Module {
  return ModuleDefinitionStore.getGlobalModuleStore().defineModule(definition);
}