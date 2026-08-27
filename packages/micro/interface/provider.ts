export interface Type<T = any> extends Function {
  new (): T;
}

export type ProviderToken = symbol | Type;
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

export interface DynamicProviderProvider {
  for: ProviderToken;
  useProvider: ProviderToken;
}

export type DynamicProvider<T = unknown> = DynamicClassProvider<T> | DynamicValueProvider<T> | DynamicFactoryProvider<T> | DynamicProviderProvider;
export type ClassProvider<T = unknown> = Type<T>;

export type Provider = DynamicProvider | ClassProvider;

export type ProviderInstanceToken = symbol;
export type ProviderInstance = any;