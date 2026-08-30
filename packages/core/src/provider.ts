import type { DynamicClassProvider, DynamicFactoryProvider, DynamicProvider, DynamicProviderProvider, DynamicValueProvider, Provider, ProviderToken } from "./interface/index.js";

function hasOwnProperty<T extends object, K extends PropertyKey>(value: T, property: K): value is (T & {[P in K]: unknown}) {
  return Object.prototype.hasOwnProperty.call(value, property);
}

export function getTokenName(token: ProviderToken): string {
  if (typeof token === 'symbol') {
    return token.description ?? token.toString();
  }

  if (typeof token === 'string') {
    return token;
  }

  if (typeof token === 'function') {
    return token.name || '<anonymous>';
  }

  return String(token);
}

export function getProviderName(provider: Provider) {
  if (isDynamicProvider(provider)) return getTokenName(provider.for);
  return getTokenName(provider);
}

export function isDynamicClassProvider(provider: Provider): provider is DynamicClassProvider {
  if (typeof provider !== "object") return false;
  if (!hasOwnProperty(provider, 'for')) return false;
  return hasOwnProperty(provider, 'useClass');
}

export function isDynamicValueProvider(provider: Provider): provider is DynamicValueProvider {
  if (typeof provider !== "object") return false;
  if (!hasOwnProperty(provider, 'for')) return false;
  return hasOwnProperty(provider, 'useValue');
}

export function isDynamicFactoryProvider(provider: Provider): provider is DynamicFactoryProvider {
  if (typeof provider !== "object") return false;
  if (!hasOwnProperty(provider, 'for')) return false;
  return hasOwnProperty(provider, 'useFactory');
}

export function isDynamicProviderProvider(provider: Provider): provider is DynamicProviderProvider {
  if (typeof provider !== "object") return false;
  if (!hasOwnProperty(provider, 'for')) return false;
  return hasOwnProperty(provider, 'useProvider');
}

export function isDynamicProvider(provider: Provider): provider is DynamicProvider {
  return (
    isDynamicClassProvider(provider) ||
    isDynamicValueProvider(provider) ||
    isDynamicFactoryProvider(provider) ||
    isDynamicProviderProvider(provider)
  );
}
