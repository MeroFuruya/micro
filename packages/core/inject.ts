import { Injector, InjectorStrategy } from "./injector.js";
import type { ProviderToken, Type } from "./interface/index.js";


let _currentInjector: Injector | undefined;
export function hasCurrentInjector(): boolean {
  return _currentInjector !== undefined;
}

export function setCurrentInjector(injector: Injector) {
  if (hasCurrentInjector()) throw new Error('Current injector already set');
  _currentInjector = injector;
}

export function unsetCurrentInjector() {
  _currentInjector = undefined;
}

export function getCurrentInjector(): Injector {
  if (!hasCurrentInjector()) throw new Error('No injector currently set');
  return _currentInjector!;
}

export function runInInjectionContext<R>(injector: Injector, callback: () => R): R {
  let previousInjector: Injector | undefined;
  if (hasCurrentInjector()) {
    previousInjector= getCurrentInjector();
    unsetCurrentInjector();
  }
  
  setCurrentInjector(injector);
  try {
    return callback();
  } finally {
    unsetCurrentInjector();
    if (previousInjector !== undefined) {
      setCurrentInjector(previousInjector);
    }
  }
}

export function assertInjectionContext() {
  if (hasCurrentInjector()) return;
  throw new Error("Currently not running inside an injection context");
}

const injectorStrategy: InjectorStrategy[] = [InjectorStrategy.CurrentProvided, InjectorStrategy.ImportedExported]

export function inject<T>(token: Type<T>): T;
export function inject<T = unknown>(injectionToken: symbol): T;
export function inject<T>(token: ProviderToken): T {
  assertInjectionContext();
  const injector = getCurrentInjector();

  if (token === Injector) {
    return injector as T;
  }

  return injector.get<T>(token, { strategies: injectorStrategy });
}