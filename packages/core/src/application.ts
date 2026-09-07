import { runInInjectionContext } from "./inject.js";
import { Injector } from "./injector.js";
import type { Module, ProviderInstance, ProviderInstanceToken, ProviderToken } from "./interface/index.js";
import { NestedSet, NestedWeakMap, NestedWeakSet } from "./map.js";
import { type ModuleDefinitionStore } from "./definition.js";
import { getTokenName, isDynamicClassProvider, isDynamicFactoryProvider, isDynamicProviderProvider, isDynamicValueProvider } from "./provider.js";
import { OnApplicationStart, OnApplicationStop } from "./hooks.js";

export type ApplicationState = 'created' | 'bootstrapped' | 'starting' | 'running' | 'stopping' | 'stopped';

export interface InstanceStore {
  readonly value: Map<ProviderInstanceToken, ProviderInstance>;
  readonly priority: WeakMap<ProviderInstanceToken, number>;
  readonly provider: NestedSet<[Module, ProviderToken, ProviderInstanceToken]>;
  readonly dependency: NestedSet<[ProviderInstanceToken, Module, ProviderToken]>;
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

  private readonly instanceStore: InstanceStore = {
    value: new Map<ProviderInstanceToken, ProviderInstance>(),
    priority: new WeakMap<ProviderInstanceToken, number>(),
    provider: new NestedSet<[Module, ProviderToken, ProviderInstanceToken]>(3),
    dependency: new NestedSet<[ProviderInstanceToken, Module, ProviderToken]>(3),
  }

  setInstance(module: Module, token: ProviderToken, instanceToken: ProviderInstanceToken, value: ProviderInstance): ProviderInstanceToken {
    this.instanceStore.value.set(instanceToken, value);
    this.instanceStore.priority.set(instanceToken, this.instanceStore.provider.size([module, token]));
    this.instanceStore.provider.add([module, token, instanceToken]);
    return instanceToken;
  }

  addInstanceDependency(instanceToken: ProviderInstanceToken, module: Module, token: ProviderToken) {
    this.instanceStore.dependency.add([instanceToken, module, token]);
  }

  hasModuleProvider(module: Module, token: ProviderToken): boolean {
    if (typeof token === 'function' && this.moduleStore.provideClass.has([module, token])) return true;
    return this.moduleStore.provideDynamic.has([module, token]);
  }

  *enumerateModuleExportTree(module: Module): IterableIterator<Module> {
    const currentlyVisitingModules = new Set<Module>([module]);
    const visitedModules = new Set<Module>();

    while (currentlyVisitingModules.size > 0) {
      for (const visitModule of currentlyVisitingModules.values().toArray()) {
        currentlyVisitingModules.delete(visitModule);

        if (visitedModules.has(visitModule)) continue;
        visitedModules.add(visitModule);

        yield visitModule;

        for (const moduleExport of this.moduleStore.exportModule.values([visitModule])) {
          currentlyVisitingModules.add(moduleExport);
        }
      }
    }
  }

  *enumerateModuleImportTree(module: Module): IterableIterator<Module> {
    const visitedModules = new Set<Module>();
    const currentlyVisitingModules = new Set<Module>([module]);

    while (currentlyVisitingModules.size > 0) {
      for (const visitModule of currentlyVisitingModules.values().toArray()) {
        currentlyVisitingModules.delete(visitModule);

        if (visitedModules.has(visitModule)) continue;
        visitedModules.add(visitModule);

        yield visitModule;

        for (const moduleImport of this.moduleStore.importModule.values([visitModule])) {
          currentlyVisitingModules.add(moduleImport);
        }
      }
    }
  }
  
  *enumerateModuleImportTreeGlobal(module: Module): IterableIterator<Module> {
    const reverseImportModule = new NestedSet<[Module, Module]>(2);
    for (const [importingModule, importedModule] of this.moduleStore.importModule.enumerate([])) {
      reverseImportModule.add([importedModule, importingModule]);
    }

    const visitedModules = new Set<Module>();
    const currentlyVisitingModulesUp = new Set<Module>([module]);
    while (currentlyVisitingModulesUp.size > 0) {
      for (const visitModuleUp of currentlyVisitingModulesUp.values().toArray()) {
        currentlyVisitingModulesUp.delete(visitModuleUp);

        const currentlyVisitingModulesDown = new Set<Module>([visitModuleUp]);
        while (currentlyVisitingModulesDown.size > 0) {
          for (const visitModuleDown of currentlyVisitingModulesDown.values().toArray()) {
            currentlyVisitingModulesDown.delete(visitModuleDown);
    
            if (visitedModules.has(visitModuleDown)) continue;
            visitedModules.add(visitModuleDown);
    
            yield visitModuleDown;
    
            for (const moduleImport of this.moduleStore.importModule.values([visitModuleDown])) {
              currentlyVisitingModulesDown.add(moduleImport);
            }
          }
        }

        for (const moduleImport of reverseImportModule.values([visitModuleUp])) {
          currentlyVisitingModulesUp.add(moduleImport);
        }
      }
    }
  }

  private readonly currentlyBootstrappingProvider = new NestedWeakSet<[Module, ProviderToken]>(2);
  bootstrapProvider(module: Module, token: ProviderToken) {
    if (this.instanceStore.provider.has([module, token]))
      throw new Error(`Error while bootstrapping ${getTokenName(token)} of ${this.moduleStore.name.get(module)}: Providers cannot be bootstrapped twice`);

    if (this.currentlyBootstrappingProvider.has([module, token])) {
      throw new Error(`Recursive dependency inside ${this.moduleStore.name.get(module)}`)
    }
    
    if (typeof token === 'function' && this.moduleStore.provideClass.has([module, token])) {
      this.currentlyBootstrappingProvider.add([module, token]);
      try {
        const instanceToken = Symbol(`Instance.${this.moduleStore.name.get(module)}.${getTokenName(token)}`);

        const injector = this.getInjector(module, instanceToken);
        const value = runInInjectionContext(injector, () => new token())
        this.setInstance(module, token, instanceToken, value);
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
          this.setInstance(module, token, instanceToken, provider.useValue);
          return;
        }
        
        if (isDynamicClassProvider(provider)) {
          const injector = this.getInjector(module, instanceToken);
          const value = runInInjectionContext(injector, () => new provider.useClass())
          this.setInstance(module, token, instanceToken, value);
          return;
        }
        
        if (isDynamicFactoryProvider(provider)) {
          const injector = this.getInjector(module, instanceToken);
          const value = runInInjectionContext(injector, () => provider.useFactory())
          this.setInstance(module, token, instanceToken, value);
          return;
        }

        throw new Error(`Could not instantiate Dynamic Provider ${getTokenName(token)} in Module ${this.moduleStore.name.get(module)}`)
      } finally {
        this.currentlyBootstrappingProvider.delete([module, token]);
      }
    }

    throw new Error("Could not instantiate provider");
  }

  *getInstances(module: Module, token: ProviderToken, forInstance: ProviderInstanceToken): IterableIterator<ProviderInstance> {
    this.addInstanceDependency(forInstance, module, token);
    
    if (this.instanceStore.provider.has([module, token])) {
      this.instanceStore.priority
      for (const instance of this.instanceStore.provider.values([module, token])) {
        yield this.instanceStore.value.get(instance);
      }
      return;
    }
    
    if (this.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      for (const instance of this.instanceStore.provider.values([module, token])) {
        yield this.instanceStore.value.get(instance);
      }
      return;
    }

    throw new Error(`Module ${this.moduleStore.name.get(module)} does not provide ${getTokenName(token)}`)
  }

  getInstance(module: Module, token: ProviderToken, forInstance: ProviderInstanceToken): ProviderInstance {
    this.addInstanceDependency(forInstance, module, token);

    if (this.instanceStore.provider.has([module, token])) {
      let primaryInstance: ProviderInstanceToken | undefined;
      for (const instanceToken of this.instanceStore.provider.values([module, token])) {
        if (
          primaryInstance === undefined ||
          this.instanceStore.priority.get(instanceToken)! >
          this.instanceStore.priority.get(primaryInstance)!
        )
          primaryInstance = instanceToken;
      }
      return this.instanceStore.value.get(primaryInstance!)!;
    }

    if (this.hasModuleProvider(module, token)) {
      this.bootstrapProvider(module, token);
      let primaryInstance: ProviderInstanceToken | undefined;
      for (const instanceToken of this.instanceStore.provider.values([module, token])) {
        if (
          primaryInstance === undefined ||
          this.instanceStore.priority.get(instanceToken)! >
          this.instanceStore.priority.get(primaryInstance)!
        )
          primaryInstance = instanceToken;
      }
      return this.instanceStore.value.get(primaryInstance!)!;
    }

    throw new Error(`Module ${this.moduleStore.name.get(module)} does not provide ${getTokenName(token)}`)
  }

  /**
   * @returns `true` if an instance for the `token` in `module` exists or could be bootstrapped on injection
   */
  hasInstance(module: Module, token: ProviderToken): boolean {
    if (this.instanceStore.provider.has([module, token])) return true;
    return this.hasModuleProvider(module, token);
  }
  
  /**
   * @returns `true` if an exported instance for the `token` in `module` exists or could be bootstrapped on injection
   */
  hasExportedInstance(module: Module, token: ProviderToken): boolean {
    if (!this.moduleStore.exportProvider.has([module, token])) return false;
    if (this.instanceStore.provider.has([module, token])) return true;
    return this.hasModuleProvider(module, token);
  }

  bootstrapModule(module: Module) {
    for (const token of this.moduleStore.provideClass.values([module])) {
      if (this.instanceStore.provider.has([module, token])) continue;
      this.bootstrapProvider(module, token);
    }

    for (const token of this.moduleStore.provideDynamic.values([module])) {
      if (this.instanceStore.provider.has([module, token.for])) continue;
      this.bootstrapProvider(module, token.for);
    }
  }

  *enumerateInstances(): IterableIterator<[Module, ProviderToken, ProviderInstanceToken]> {
    const waitingInstanceMap = new Map<ProviderInstanceToken, [Module, ProviderToken]>();
    for (const [module, token, instance] of this.instanceStore.provider.enumerate([])) {
      waitingInstanceMap.set(instance, [module, token]);
    }

    while (waitingInstanceMap.size > 0) {
      waitingInstances: for (const [instance, [module, token]] of waitingInstanceMap.entries()) {

        for (const [_, dependencyModule, dependencyToken] of this.instanceStore.dependency.enumerate([instance])) {
          const instanceDependencies = this.instanceStore.provider.values([dependencyModule, dependencyToken])
          const dependenciesWaiting = instanceDependencies.some((dependency) => waitingInstanceMap.has(dependency));
          if (dependenciesWaiting) continue waitingInstances;
        }

        waitingInstanceMap.delete(instance);
        yield [module, token, instance];
      }
    }
  }

  runHook(instanceToken: ProviderInstanceToken, name: string | number | symbol, args?: any[]): any {
    const value = this.instanceStore.value.get(instanceToken);
    if (typeof value !== 'object') return;
    if (!(name in value)) return;
    const callback: unknown = value[name];
    if (typeof callback !== 'function') return;
    return callback.call(value, ...args ?? []);
  }

  async runAsyncHook(instanceToken: ProviderInstanceToken, name: string | number | symbol, args?: any[]): Promise<any> {
    return await this.runHook(instanceToken, name, args);
  }

  // Lifecycle

  private applicationState: ApplicationState = 'created';
  getApplicationState(): ApplicationState {
    return this.applicationState;
  }
  
  private setApplicationState(applicationState: ApplicationState) {
    this.applicationState = applicationState;
  }

  bootstrap() {
    if (this.getApplicationState() !== 'created') throw new Error("Application state must be 'created' when bootstrapping");
    
    try {
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
    } catch (e) {
      this.setApplicationState('stopped');
      throw e;
    }

    this.setApplicationState('bootstrapped');
  }

  async start() {
    if (this.getApplicationState() !== 'bootstrapped') throw new Error("Application state must be 'bootstrapped' when starting");
    this.setApplicationState('starting');

    const startedInstances = new Set<ProviderInstanceToken>();

    try {
      for (const [,,instanceToken] of this.enumerateInstances()) {
        await this.runAsyncHook(instanceToken, OnApplicationStart);
        startedInstances.add(instanceToken);
      }
    } catch (e) {
      for (const [,,instanceToken] of this.enumerateInstances()) {
        if (!startedInstances.has(instanceToken)) continue;
        await this.runAsyncHook(instanceToken, OnApplicationStop);
      }
      
      this.setApplicationState('stopped');
      throw e;
    }

    this.setApplicationState('running');
  }
  
  async stop() {
    if (this.getApplicationState() !== 'running') throw new Error("Application state must be 'running' when stopping");
    this.setApplicationState('stopping');

    for (const [,,instanceToken] of this.enumerateInstances()) {
      await this.runAsyncHook(instanceToken, OnApplicationStop);
    }

    this.setApplicationState('stopped');
  }
}