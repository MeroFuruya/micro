import type { DynamicClassProvider, DynamicFactoryProvider, DynamicProvider, DynamicValueProvider, Provider, ProviderToken } from "./interface/index.js";
import { hasOwnProperty } from "./internal.js";

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