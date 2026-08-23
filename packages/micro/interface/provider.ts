export interface Type<T = any> extends Function {
  new (): T;
}

export type ProviderToken = symbol | Type;

export type Provider = DynamicProvider | Type;

export type ProviderInstance = any;

export interface DynamicClassProvider<T = unknown> {
  for: ProviderToken;
  useClass: Type<T>;
}

export interface DynamicValueProvider<T = unknown> {
  for: ProviderToken;
  useValue: T;
}

export interface DynamicFactoryProvider<T = unknown> {
  for: ProviderToken;
  useFactory: () => T;
}

export type DynamicProvider<T = unknown> = DynamicClassProvider<T> | DynamicValueProvider<T> | DynamicFactoryProvider<T>;