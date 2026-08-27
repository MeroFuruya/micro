import { runInInjectionContext } from "./inject.js";
import { Injector } from "./injector.js";
import type { AsyncHookName, Module, Provider, ProviderInstance, ProviderInstanceToken, ProviderToken } from "./interface/index.js";
import { NestedSet, NestedWeakMap, NestedWeakSet } from "./internal.js";
import { type ModuleDefinitionStore } from "./moduleDefinition.js";
import { getTokenName, isDynamicClassProvider, isDynamicFactoryProvider, isDynamicProvider, isDynamicProviderProvider, isDynamicValueProvider, providerIsToken } from "./provider.js";

export class Application {
  constructor(
    readonly moduleStore: ModuleDefinitionStore,
  ) {}

  private readonly injectorMap = new NestedWeakMap<[Module, ProviderInstanceToken], Injector>(2);
  getInjector(module: Module, instance: ProviderInstanceToken): Injector {
    if (!this.injectorMap.has([module, instance])) {
      const injector = new Injector(this, module, instance);
      this.injectorMap.set([module, instance], injector);
      return injector;
    }
    return this.injectorMap.get([module, instance])!;
  }

  private readonly instanceStore = new WeakMap<ProviderInstanceToken, ProviderInstance>();
  private readonly instanceMap = new NestedSet<[Module, ProviderToken, ProviderInstanceToken]>(3)
  private readonly primaryInstanceMap = new NestedWeakMap<[Module, ProviderToken], ProviderInstanceToken>(2)
  private readonly instanceDependencyMap = new NestedSet<[Module, ProviderToken, ProviderInstanceToken]>(3)


  isProviderBootstrapped(module: Module, token: ProviderToken): boolean {
    return this.instanceMap.has([module, token]);
  }

  hasModuleProvider(module: Module, token: ProviderToken): boolean {
    if (typeof token === 'function' && this.moduleStore.provideClass.has([module, token])) return true;
    return this.moduleStore.provideDynamic.has([module, token]);
  }

  getTokenExporter(module: Module, token: ProviderToken): Module | null {
    const currentlyVisitingModules = new Set<Module>([module]);
    const visitedModules = new Set<Module>();

    while (currentlyVisitingModules.size > 0) {
      for (const visitModule of currentlyVisitingModules.values().toArray()) {
        currentlyVisitingModules.delete(visitModule);

        if (visitedModules.has(visitModule)) continue;
        visitedModules.add(visitModule);

        if (this.moduleStore.exportProvider.has([visitModule, token])) return visitModule;

        for (const moduleExport of this.moduleStore.exportModule.values([visitModule])) {
          currentlyVisitingModules.add(moduleExport);
        }
      }
    }

    return null;
  }

  private readonly currentlyBootstrappingProvider = new NestedWeakSet<[Module, ProviderToken]>(2);
  bootstrapProvider(module: Module, token: ProviderToken) {
    if (this.isProviderBootstrapped(module, token)) throw new Error("Providers cannot be bootstrapped twice");

    if (this.currentlyBootstrappingProvider.has([module, token])) {
      throw new Error(`Recursive dependency inside ${this.moduleStore.name.get(module)}`)
    }
    
    if (typeof token === 'function' && this.moduleStore.provideClass.has([module, token])) {
      this.currentlyBootstrappingProvider.add([module, token]);
      try {
        const instanceToken = Symbol(`Instance.${this.moduleStore.name.get(module)}.${getTokenName(token)}`);

        const injector = this.getInjector(module, instanceToken);
        const value = runInInjectionContext(injector, () => new token())
        this.instanceStore.set(instanceToken, value);
        this.instanceMap.add([module, token, instanceToken]);
        this.primaryInstanceMap.set([module, token], instanceToken);
      } finally {
        this.currentlyBootstrappingProvider.delete([module, token]);
      }
      return;
    }

    if (this.moduleStore.provideDynamic.has([module, token])) {
      this.currentlyBootstrappingProvider.add([module, token]);

      try {
        const provider = this.moduleStore.provideDynamic.get([module, token])!

        if (isDynamicProviderProvider(provider)) throw new Error("Cannot instantiate Dynamic ProviderProviders");

        const instanceToken = Symbol(`Instance.${this.moduleStore.name.get(module)}.${getTokenName(token)}`);

        if (isDynamicValueProvider(provider)) {
          this.instanceStore.set(instanceToken, provider.useValue);
          this.instanceMap.add([module, token, instanceToken]);
          this.primaryInstanceMap.set([module, token], instanceToken);
          return;
        }
        
        if (isDynamicClassProvider(provider)) {
          const injector = this.getInjector(module, instanceToken);
          const value = runInInjectionContext(injector, () => new provider.useClass())
          this.instanceStore.set(instanceToken, value);
          this.instanceMap.add([module, token, instanceToken]);
          this.primaryInstanceMap.set([module, token], instanceToken);
          return;
        }
        
        if (isDynamicFactoryProvider(provider)) {
          const injector = this.getInjector(module, instanceToken);
          const value = runInInjectionContext(injector, () => provider.useFactory())
          this.instanceStore.set(instanceToken, value);
          this.instanceMap.add([module, token, instanceToken]);
          this.primaryInstanceMap.set([module, token], instanceToken);
          return;
        }

        throw new Error(`Could not instantiate Dynamic Provider ${getTokenName(token)} in Module ${this.moduleStore.name.get(module)}`)
      } finally {
        this.currentlyBootstrappingProvider.delete([module, token]);
      }
    }

    throw new Error("Could not instantiate provider");
  }

  getInstances(module: Module, token: ProviderToken, forInstance: ProviderInstanceToken): ReadonlyArray<ProviderInstance> {
    this.instanceDependencyMap.add([module, token, forInstance]);

    if (this.isProviderBootstrapped(module, token)) {
      const instances = this.instanceMap.values([module, token]);
      return instances.map((instance) => this.instanceStore.get(instance)!);
    }
    
    if (this.instanceMap.has([module, token])) {
      const instances = this.instanceMap.values([module, token]);
      return instances.map((instance) => this.instanceStore.get(instance));
    }

    if (this.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      const instances = this.instanceMap.values([module, token]);
      return instances.map((instance) => this.instanceStore.get(instance));
    }

    throw new Error(`Module ${this.moduleStore.name.get(module)} does not provide ${getTokenName(token)}`)
  }

  getInstance(module: Module, token: ProviderToken, forInstance: ProviderInstanceToken): ProviderInstance {
    this.instanceDependencyMap.add([module, token, forInstance]);

    if (this.isProviderBootstrapped(module, token)) {
      const instance = this.primaryInstanceMap.get([module, token])!;
      return this.instanceStore.get(instance);
    }
    
    if (this.instanceMap.has([module, token])) {
      const instance = this.primaryInstanceMap.get([module, token])!;
      return this.instanceStore.get(instance);
    }

    if (this.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      const instance = this.primaryInstanceMap.get([module, token])!;
      return this.instanceStore.get(instance);
    }

    throw new Error(`Module ${this.moduleStore.name.get(module)} does not provide ${getTokenName(token)}`)
  }

  hasInstance(module: Module, token: ProviderToken): boolean {
    if (this.instanceMap.has([module, token])) return true;
    return this.hasModuleProvider(module, token);
  }

  bootstrapModule(module: Module) {
    for (const token of this.moduleStore.provideClass.values([module])) {
      if (this.isProviderBootstrapped(module, token)) continue;
      this.bootstrapProvider(module, token);
    }

    for (const token of this.moduleStore.provideDynamic.values([module])) {
      if (this.isProviderBootstrapped(module, token.for)) continue;
      this.bootstrapProvider(module, token.for);
    }
  }

  bootstrap(module: Module) {
    const waitingModules = new Set(this.moduleStore.module);
    while (waitingModules.size > 0) {
      for (const module of waitingModules.values()) {
        const moduleImports = this.moduleStore.importModule.values([module]);
        const allImportsReady = moduleImports.every((moduleImport) => !waitingModules.has(moduleImport));
        if (!allImportsReady) continue;

        this.bootstrapModule(module);
        waitingModules.delete(module);
      }
    }
  }

  async runAsyncHook(name: AsyncHookName) {
    for (const instanceKey of this.instanceMap.values([])) {
      const instance = this.instanceStore.get(instanceKey);
      if (typeof instance !== 'object') continue;
      if (!(name in instance)) continue;
      const callback: unknown = instance[name];
      if (typeof callback !== 'function') continue;
      await callback.call(instance);
    }
  }

  async start() {
    await this.runAsyncHook('onApplicationStart')
  }
  
  async stop() {
    await this.runAsyncHook('onApplicationStop')
  }
}