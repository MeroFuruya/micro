import { runInInjectionContext } from "./inject.js";
import { Injector } from "./injector.js";
import type { AsyncHookName, Module, Provider, ProviderInstance, ProviderToken } from "./interface/index.js";
import { hasOwnProperty } from "./internal.js";
import { type ModuleDefinitionStore } from "./moduleDefinition.js";
import { isDynamicClassProvider, isDynamicFactoryProvider, isDynamicProvider, isDynamicValueProvider, providerIsToken } from "./provider.js";

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
  private map = new WeakMap<Module, WeakSet<ProviderToken>>()

  set(module: Module, token: ProviderToken) {
    if (!this.map.has(module)) {
      this.map.set(module, new Set());
    }
    const tokenSet = this.map.get(module)!;
    return tokenSet.has(token);
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

  private injectorMap = new WeakMap<Module, Injector>();
  getInjector(module: Module): Injector {
    if (!this.injectorMap.has(module)) {
      const injector = new Injector(this, module);
      this.injectorMap.set(module, injector);
    }
    return this.injectorMap.get(module)!;
  }

  private readonly instanceMap = new InstanceMap();

  isProviderBootstrapped(module: Module, token: ProviderToken): boolean {
    return this.instanceMap.hasToken(module, token);
  }
  
  private readonly currentlyBootstrappingProviderMap = new WeakModuleTokenMap();
  bootstrapProvider(module: Module, token: ProviderToken) {
    if (this.isProviderBootstrapped(module, token)) throw new Error("Providers cannot be bootstrapped twice");

    if (this.currentlyBootstrappingProviderMap.has(module, token)) {
      throw new Error(`Recursive dependency inside module ${String(module)}`)
    }

    const providers = this.moduleStore.getModuleProviders(module);

    this.currentlyBootstrappingProviderMap.set(module, token);
    
    for (const provider of providers) {
      if (!providerIsToken(provider, token)) continue;

      if (isDynamicValueProvider(provider)) {
        this.instanceMap.addInstance(module, token, provider.useValue);
        continue;
      }
      
      if (isDynamicClassProvider(provider)) {
        
        const injector = this.getInjector(module);
        const value = runInInjectionContext(injector, () => new provider.useClass())
        this.instanceMap.addInstance(module, token, value);
        
        continue;
      }
      
      if (isDynamicFactoryProvider(provider)) {
        const injector = this.getInjector(module);
        const value = runInInjectionContext(injector, () => provider.useFactory())
        this.instanceMap.addInstance(module, token, value);
        continue;
      }

      const injector = this.getInjector(module);
      const value = runInInjectionContext(injector, () => new provider())
      this.instanceMap.addInstance(module, token, value);
    }
    
    this.currentlyBootstrappingProviderMap.del(module, token);
  }

  getInstances(module: Module, token: ProviderToken): ReadonlyArray<ProviderInstance> {
    if (this.isProviderBootstrapped(module, token)) {
      return this.instanceMap.getInstances(module, token);
    }
    
    if (this.instanceMap.hasToken(module, token)) {
      return this.instanceMap.getInstances(module, token);
    }

    if (this.moduleStore.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      return this.instanceMap.getInstances(module, token);
    }

    throw new Error("Module does not provide Token") // TODO: Better error message
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
    for (const [module, token, instance] of this.instanceMap.allInstances()) {
      if (typeof instance !== 'object') continue;
      if (!hasOwnProperty(instance, name)) continue;
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