import type { ClassProvider, DynamicProvider, Module, ModuleDefinition, Provider, ProviderToken, Type } from "./interface/index.js";
import { NestedMap, NestedSet, type ReadonlyNestedMap, type ReadonlyNestedSet } from "./map.js";
import { getTokenName, isDynamicProvider } from "./provider.js";

export interface DefineModuleFunction {
  (definition: Readonly<ModuleDefinition>): Module
}

export type ModuleDefinitionMap = Map<Module, Readonly<ModuleDefinition>>;

export function defineModuleFactory(
  storeReference: Map<Module, Readonly<ModuleDefinition>>,
): DefineModuleFunction {
  return function (definition: Readonly<ModuleDefinition>): Module {
    const module = Symbol(definition.name);
    storeReference.set(module, definition);
    return module;
  }
}

export const globalModuleMap: ModuleDefinitionMap = new Map();
export const defineModule = defineModuleFactory(globalModuleMap);

export interface ModuleDefinitionStore {
  readonly module: ReadonlySet<Module>;
  readonly name: ReadonlyMap<Module, string>;
  readonly importModule: ReadonlyNestedSet<[Module, Module]>;
  readonly provideClass: ReadonlyNestedSet<[Module, ClassProvider]>;
  readonly provideDynamic: ReadonlyNestedMap<[Module, ProviderToken], DynamicProvider>;
  readonly exportProvider: ReadonlyNestedSet<[Module, ProviderToken]>;
  readonly exportModule: ReadonlyNestedSet<[Module, Module]>;
}

export function buildModuleDefinitionStore(
  store: ReadonlyMap<Module, Readonly<ModuleDefinition>>,
  rootModule: Module,
): Readonly<ModuleDefinitionStore> {
  const moduleSet = new Set<Module>();
  const nameMap = new Map<Module, string>();
  const importModuleSet = new NestedSet<[Module, Module]>(2);
  const provideClassSet = new NestedSet<[Module, ClassProvider]>(2);
  const provideDynamicMap = new NestedMap<[Module, ProviderToken], DynamicProvider>(2);
  const exportProviderSet = new NestedSet<[Module, ProviderToken]>(2);
  const exportModuleSet = new NestedSet<[Module, Module]>(2);

  const currentlyVisitingModules = new Set<Module>([rootModule]);
  while (currentlyVisitingModules.size > 0) {
    const module = currentlyVisitingModules.values().next().value!;
    currentlyVisitingModules.delete(module);

    if (moduleSet.has(module)) continue;
    moduleSet.add(module);

    // Get Definition
    if (!store.has(module)) throw new Error(`Module not defined ${module.description}`);
    const moduleDefinition = store.get(module)!;

    // Set Name
    nameMap.set(module, moduleDefinition.name);

    // Imports
    for (const [importIndex, moduleImport] of (moduleDefinition.import ?? []).entries()) {
      // Validate Import
      if (!store.has(moduleImport)) {
        throw new Error(`Import at index ${importIndex} of Module ${nameMap.get(module)} not defined`);
      }
      
      // Set Import
      importModuleSet.add([module, moduleImport]);

      // Add Imported module to queue
      currentlyVisitingModules.add(moduleImport);
    }

    // Providers
    for (const [providerIndex, provider] of (moduleDefinition.provide ?? []).entries()) {
      if (isDynamicProvider(provider)) {
        provideDynamicMap.set([module, provider.for], provider);
        continue;
      }
      
      if (typeof provider === 'function') {
        provideClassSet.add([module, provider]);
        continue;
      }

      if (typeof provider === 'symbol' && store.has(provider)) {
        throw new Error(`Module cannot be used as Provider ${(provider as symbol).description}`)
      }

      throw new Error(`Provider at index ${providerIndex} of Module ${nameMap.get(module)} must be a Class or Dynamic Provider`);
    }

    // Exports
    for (const [exportIndex, exportToken] of (moduleDefinition.export ?? []).entries()) {
      if (provideDynamicMap.has([module, exportToken])) {
        exportProviderSet.add([module, exportToken]);
        continue;
      }
      
      if (typeof exportToken === 'function' && provideClassSet.has([module, exportToken])) {
        exportProviderSet.add([module, exportToken]);
        continue;
      }

      if (typeof exportToken === 'symbol' && importModuleSet.has([module, exportToken])) {
        exportModuleSet.add([module, exportToken]);
        continue;
      }

      throw new Error(`Export at ${exportIndex} of Module ${nameMap.get(module)} must be a Provided Class, Dynamic Provider Key or imported Module`);
    }
  }

  function detectCircularImports(
    module: Module,
    seen: ReadonlyArray<Module>,
  ): ReadonlyArray<Module> | null {
    const newSeen = [...seen, module];
    
    const imports = importModuleSet.values([module]);
    for (const moduleImport of imports) {
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

  const circularImport = detectCircularImports(rootModule, [])
  if (circularImport !== null) {
    const circularImportNames = circularImport.map((module) => nameMap.get(module));
    throw new Error(`Detected circular import ${circularImportNames.join(' -> ')}`)
  }

  return {
    module: moduleSet,
    name: nameMap,
    importModule: importModuleSet,
    provideClass: provideClassSet,
    provideDynamic: provideDynamicMap,
    exportProvider: exportProviderSet,
    exportModule: exportModuleSet,
  }
}
