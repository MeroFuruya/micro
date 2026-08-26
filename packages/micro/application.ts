import { runInInjectionContext } from "./inject.js";
import { Injector } from "./injector.js";
import type { AsyncHookName, Module, Provider, ProviderInstance, ProviderInstanceToken, ProviderToken } from "./interface/index.js";
import { NestedSet, NestedWeakMap, NestedWeakSet } from "./internal.js";
import { type ModuleDefinitionStore } from "./moduleDefinition.js";
import { getTokenName, isDynamicClassProvider, isDynamicFactoryProvider, isDynamicValueProvider, providerIsToken } from "./provider.js";

class InstanceMap {
  readonly map = new Map<Module, Map<ProviderToken, ProviderInstance[]>>();
  
  hasModule(module: Module) {
    return this.map.has(module);
  }

  hasToken(module: Module, token: ProviderToken) {
    if (!this.map.has(module)) return false;
    const instanceMap = this.map.get(module)!;
    if (!instanceMap.has(token)) return false;
    return true;
  }
  
  hasInstance(module: Module, token: ProviderToken) {
    if (!this.map.has(module)) return false;
    const instanceMap = this.map.get(module)!;
    if (!instanceMap.has(token)) return false;
    const instances = instanceMap.get(token)!;
    return instances.length > 0;
  }

  addInstance(module: Module, token: ProviderToken, instance: ProviderInstance) {
    if (!this.map.has(module)) this.map.set(module, new Map());
    const instanceMap = this.map.get(module)!;
    if (!instanceMap.has(token)) instanceMap.set(token, []);
    const instances = instanceMap.get(token)!;
    instances.push(instance);
  }

  getInstances(module: Module, token: ProviderToken): ReadonlyArray<ProviderInstance> {
    if (!this.map.has(module)) return [];
    const instanceMap = this.map.get(module)!;
    if (!instanceMap.has(token)) return [];
    const instances = instanceMap.get(token)!;
    return instances;
  }

  public* allInstances(): IterableIterator<[Module, ProviderToken, ProviderInstance]> {
    for (const [module, instanceMap] of this.map.entries()) {
      for (const [token, instances] of instanceMap.entries()) {
        for (const instance of instances) {
          yield [module, token, instance];
        }
      }
    }
  }
}

class WeakModuleTokenMap {
  map = new Map<Module, Set<ProviderToken>>()

  set(module: Module, token: ProviderToken) {
    if (!this.map.has(module)) {
      this.map.set(module, new Set());
    }
    const tokenSet = this.map.get(module)!;
    tokenSet.add(token);
  }
  
  has(module: Module, token: ProviderToken): boolean {
    if (!this.map.has(module)) return false;
    const tokenSet = this.map.get(module)!;
    return tokenSet.has(token);
  }
  
  del(module: Module, token: ProviderToken) {
    if (!this.map.has(module)) return;
    const tokenSet = this.map.get(module)!;
    return tokenSet.has(token);
  }
}

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
  
  private readonly currentlyBootstrappingProvider = new NestedWeakSet<[Module, ProviderToken]>(2);
  bootstrapProvider(module: Module, token: ProviderToken) {
    if (this.isProviderBootstrapped(module, token)) throw new Error("Providers cannot be bootstrapped twice");

    if (this.currentlyBootstrappingProvider.has([module, token])) {
      throw new Error(`Recursive dependency inside ${this.moduleStore.getModuleName(module)}`)
    }

    const providers = this.moduleStore.getModuleProviders(module);

    this.currentlyBootstrappingProvider.add([module, token]);

    try {
      for (const [providerIndex, provider] of providers.entries()) {
        if (!providerIsToken(provider, token)) continue;

        const instanceToken = Symbol(`Instance.${getTokenName(token)}.${providerIndex}`);

        if (isDynamicValueProvider(provider)) {
          this.instanceStore.set(instanceToken, provider.useValue);
          this.instanceMap.add([module, token, instanceToken]);
          this.primaryInstanceMap.set([module, token], instanceToken);
          continue;
        }
        
        if (isDynamicClassProvider(provider)) {
          const injector = this.getInjector(module, instanceToken);
          const value = runInInjectionContext(injector, () => new provider.useClass())
          this.instanceStore.set(instanceToken, value);
          this.instanceMap.add([module, token, instanceToken]);
          this.primaryInstanceMap.set([module, token], instanceToken);
          continue;
        }
        
        if (isDynamicFactoryProvider(provider)) {
          const injector = this.getInjector(module, instanceToken);
          const value = runInInjectionContext(injector, () => provider.useFactory())
          this.instanceStore.set(instanceToken, value);
          this.instanceMap.add([module, token, instanceToken]);
          this.primaryInstanceMap.set([module, token], instanceToken);
          continue;
        }

        const injector = this.getInjector(module, instanceToken);
        const value = runInInjectionContext(injector, () => new provider())
        this.instanceStore.set(instanceToken, value);
        this.instanceMap.add([module, token, instanceToken]);
        this.primaryInstanceMap.set([module, token], instanceToken);
      }
    } finally {
      this.currentlyBootstrappingProvider.delete([module, token]);
    }
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

    if (this.moduleStore.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      const instances = this.instanceMap.values([module, token]);
      return instances.map((instance) => this.instanceStore.get(instance));
    }

    throw new Error(`Module ${this.moduleStore.getModuleName(module)} does not provide ${getTokenName(token)}`)
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

    if (this.moduleStore.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      const instance = this.primaryInstanceMap.get([module, token])!;
      return this.instanceStore.get(instance);
    }

    throw new Error(`Module ${this.moduleStore.getModuleName(module)} does not provide ${getTokenName(token)}`)
  }

  hasInstance(module: Module, token: ProviderToken): boolean {
    if (this.instanceMap.has([module, token])) return true;
    return this.moduleStore.hasModuleProvider(module, token);
  }

  bootstrapModule(module: Module) {
    const tokens = this.moduleStore.getModuleProviderTokens(module);
    for (const token of tokens) {
      if (this.isProviderBootstrapped(module, token)) continue;
      this.bootstrapProvider(module, token);
    }
  }

  bootstrap(module: Module) {
    const waitingModules = this.moduleStore.getModulesInTree(module);
    while (waitingModules.size > 0) {
      for (const module of waitingModules.values()) {
        const moduleImports = this.moduleStore.getModuleImports(module);
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