import type { DynamicClassProvider, DynamicFactoryProvider, DynamicProvider, DynamicValueProvider, Provider, ProviderToken } from "./interface/index.js";

function objectHasProperty<T extends object, K extends PropertyKey>(value: T, property: K): value is (T & {[P in K]: unknown}) {
  return Object.prototype.hasOwnProperty.call(value, property);
}

export function isDynamicClassProvider(provider: Provider): provider is DynamicClassProvider {
  if (typeof provider !== "object") return false;
  if (!objectHasProperty(provider, 'for')) return false;
  return objectHasProperty(provider, 'useClass');
}

export function isDynamicValueProvider(provider: Provider): provider is DynamicValueProvider {
  if (typeof provider !== "object") return false;
  if (!objectHasProperty(provider, 'for')) return false;
  return objectHasProperty(provider, 'useValue');
}

export function isDynamicFactoryProvider(provider: Provider): provider is DynamicFactoryProvider {
  if (typeof provider !== "object") return false;
  if (!objectHasProperty(provider, 'for')) return false;
  return objectHasProperty(provider, 'useFactory');
}

export function isDynamicProvider(provider: Provider): provider is DynamicProvider {
  return (
    isDynamicClassProvider(provider) ||
    isDynamicValueProvider(provider) ||
    isDynamicFactoryProvider(provider)
  )
}

export function providerIsToken(provider: Provider, token: ProviderToken): boolean {
  if (token === provider) return true;
  if (!isDynamicProvider(provider)) return false;
  return provider.for === token;
}