const ContextParentSymbol = Symbol('Parent');
const ContextKeySymbol = Symbol('Key');
const ContextValueSymbol = Symbol('Value');

type UntypedContextKey = symbol | string | number;
declare const ContextKeyType: unique symbol;
export type TypedContextKey<T> = symbol & { readonly [ContextKeyType]: T };

type ContextKey<T> = UntypedContextKey | TypedContextKey<T>;

const ContextIdentifierSymbol = Symbol('Context');
type ContextNode = {
  readonly [ContextIdentifierSymbol]: typeof ContextIdentifierSymbol;
  readonly [ContextParentSymbol]: Context;
  readonly [ContextKeySymbol]: ContextKey<unknown>;
  readonly [ContextValueSymbol]: unknown;
};

export type Context = ContextNode | undefined;

export const EmptyContext: Context = undefined;

export function createTypedContextKey<V>(name?: string): TypedContextKey<V> {
  return Symbol(name) as TypedContextKey<V>;
}

export function isContext(context: unknown): context is Context {
  if (typeof context === 'undefined' && context === undefined) return true;
  if (typeof context !== 'object') return false;
  if (context === null) return false;
  if (!(ContextIdentifierSymbol in context)) return false;
  if (context[ContextIdentifierSymbol] !== ContextIdentifierSymbol)
    return false;
  return true;
}

export function assertIsContext(context: Context) {
  if (!isContext(context))
    throw new Error('Provided value is not of type Context');
}

export function setContextValue<V>(
  context: Context,
  key: ContextKey<V>,
  value: V,
): Context {
  assertIsContext(context);

  return {
    [ContextIdentifierSymbol]: ContextIdentifierSymbol,
    [ContextParentSymbol]: context,
    [ContextKeySymbol]: key,
    [ContextValueSymbol]: value,
  };
}

export function getContextValueOr<V, D>(
  context: Context,
  key: ContextKey<V>,
  defaultValue: D,
): V | D {
  assertIsContext(context);

  let currentContext = context;
  while (currentContext !== undefined) {
    if (currentContext[ContextKeySymbol] === key) {
      return currentContext[ContextValueSymbol] as V;
    }
    currentContext = currentContext[ContextParentSymbol];
  }
  return defaultValue;
}

export function getContextValue<V>(context: Context, key: ContextKey<V>): V {
  assertIsContext(context);

  let currentContext = context;
  while (currentContext !== undefined) {
    if (currentContext[ContextKeySymbol] === key) {
      return currentContext[ContextValueSymbol] as V;
    }
    currentContext = currentContext[ContextParentSymbol];
  }

  throw new Error(`Not found ${String(key)}`);
}

export function hasContext(context: Context, key: ContextKey<unknown>): boolean {
  assertIsContext(context);

  let currentContext = context;
  while (currentContext !== undefined) {
    if (currentContext[ContextKeySymbol] === key) return true;
    currentContext = currentContext[ContextParentSymbol];
  }

  return false;
}

function createContextSet<V>(key: ContextKey<V>) {
  return function (context: Context, value: V) {
    return setContextValue(context, key, value);
  };
}

function createContextGet<V>(key: ContextKey<V>) {
  return function (context: Context) {
    return getContextValue<V>(context, key);
  };
}

function createContextGetOr<V>(key: ContextKey<V>) {
  return function <D>(context: Context, defaultValue: D) {
    return getContextValueOr<V, D>(context, key, defaultValue);
  };
}

function createContextHas<V>(key: ContextKey<V>) {
  return function <D>(context: Context) {
    return hasContext(context, key);
  };
}

export function createContextHelpers<V>(key: ContextKey<V>) {
  return [
    createContextSet<V>(key),
    createContextGet<V>(key),
    createContextGetOr<V>(key),
    createContextHas(key),
  ] as const;
}

export function createTypedContextGetterAndSetter<V>(name?: string) {
  const key = createTypedContextKey<V>(name);
  return createContextHelpers(key);
}

export function debugContext(context: Context): Array<[string, unknown]> {
  const result: Array<[string, unknown]> = [];

  let currentContext = context;
  while (currentContext !== undefined) {
    const key = currentContext[ContextKeySymbol];
    const value = currentContext[ContextValueSymbol];
    result.push([String(key), value]);
    currentContext = currentContext[ContextParentSymbol];
  }

  return result;
}
