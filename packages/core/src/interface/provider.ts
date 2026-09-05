export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

export type ProviderToken<T = unknown> = symbol | Type<T>;
export interface DynamicClassProvider<T = unknown> {
  for: ProviderToken<T>;
  useClass: Type<T>;
}

export interface DynamicValueProvider<T = unknown> {
  for: ProviderToken<T>;
  useValue: T;
}

export interface DynamicFactoryProvider<T = unknown> {
  for: ProviderToken<T>;
  useFactory: () => T;
}

export interface DynamicProviderProvider<T = unknown> {
  for: ProviderToken<T>;
  useProvider: ProviderToken<T>;
}

export type DynamicProvider<T = unknown> = DynamicClassProvider<T> | DynamicValueProvider<T> | DynamicFactoryProvider<T> | DynamicProviderProvider;
export type ClassProvider<T = unknown> = Type<T>;

export type Provider = DynamicProvider | ClassProvider;

export type ProviderInstanceToken = symbol;
export type ProviderInstance = any;