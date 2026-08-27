type PartialRecursiveKey<K extends [...any[]]> =
  K extends [infer K1, ...infer KRest]
    ? [K1] | [K1, ...PartialRecursiveKey<KRest>]
    : never;

type RecursiveMapType<K extends [...any[]], V extends any> =
  K extends [infer _K extends any, ...infer K1 extends any[]]
    ? K1 extends []
      ? Map<_K, V>
      : Map<_K, RecursiveMapType<K1, V>>
    : never;

type LastKeyElement<K extends [...any[]]> = 
  K extends [infer K1 extends any, ...infer KRest extends any[]]
    ? KRest extends []
      ? K1
      : LastKeyElement<KRest>
    : never;

export class NestedMap<K extends [...any[]], V extends any> {
  constructor(readonly depth: K['length']) {
    if (this.depth <= 0) throw new Error("Map must have at least depth 1");
  }

  readonly map = new Map() as RecursiveMapType<K, V>;

  get(key: K): V | undefined {
    if (key.length !== this.depth) throw new Error("Key invalid");

    let map = this.map;
    for (let i = 0; i < this.depth - 1; i++) {
      if (!map.has(key[i])) return undefined;
      map = map.get(key[i])!;
    }
    return map.get(key[this.depth - 1]);
  }

  set(key: K, value: V) {
    if (key.length !== this.depth) throw new Error("Key invalid");

    let map = this.map;
    for (let i = 0; i < this.depth - 1; i++) {
      if (!map.has(key[i])) map.set(key[i], new Map() as never);
      map = map.get(key[i])!;
    }
    map.set(key[this.depth - 1], value as never);
  }

  has(key: PartialRecursiveKey<K> | K): boolean {
    if (key.length <= 0 || key.length > this.depth) throw new Error("Key invalid");

    let map = this.map
    for (const k of key.slice(0, -1)) {
      if (!map.has(k)) return false;
      map = map.get(k)!;
    }
    return map.has(key[key.length - 1]);
  }

  delete(key: PartialRecursiveKey<K> | K) {
    if (key.length <= 0 || key.length > this.depth) throw new Error("Key invalid");

    let map = this.map
    for (const k of key.slice(0, -1)) {
      if (!map.has(k)) return;
      map = map.get(k)!;
    }
    map.delete(key[key.length - 1])
  }

  values(key: [] | PartialRecursiveKey<K> | K): V[] {
    if (key.length < 0 || key.length > this.depth) throw new Error("Key invalid");

    if (key.length >= this.depth) {
      if (this.has(key as K)) return [this.get(key as K)!];
      return []
    }

    let map = this.map
    for (const k of key) {
      if (!map.has(k)) return [];
      map = map.get(k)!;
    }
    
    if (key.length >= this.depth - 1) {
      return map.values().toArray();
    }
    
    let maps: Array<RecursiveMapType<K, V>> = [map];
    for (let i = key.length; i < this.depth - 1; i++) {
      maps = maps.flatMap((map) => map.values().toArray());
    }
    return maps.flatMap((map) => map.values().toArray());
  }
}

export interface ReadonlyNestedMap<K extends [...any[]], V extends any> {
  get(key: K): V | undefined;
  has(key: PartialRecursiveKey<K> | K): boolean;
  values(key: [] | PartialRecursiveKey<K> | K): V[];
}

export class NestedSet<K extends [...any[]]> {
  constructor(readonly depth: K['length']) {
    if (this.depth < 0) throw new Error("Set must have at least depth 1");
    this.map = new NestedMap<K, LastKeyElement<K>>(this.depth);
  }
  
  readonly map: NestedMap<K, any>;

  add(key: K) {
    this.map.set(key, key[this.depth - 1]);
  }

  has(key: PartialRecursiveKey<K> | K): boolean {
    return this.map.has(key);
  }

  delete(key: PartialRecursiveKey<K> | K) {
    this.map.delete(key)
  }

  values(key: [] | PartialRecursiveKey<K> | K): ReadonlyArray<LastKeyElement<K>> {
    return this.map.values(key);
  }
}

export interface ReadonlyNestedSet<K extends [...any[]]> {
  has(key: PartialRecursiveKey<K> | K): boolean;
  values(key: [] | PartialRecursiveKey<K> | K): ReadonlyArray<LastKeyElement<K>>;
}


type RecursiveWeakMapType<K extends [...WeakKey[]], V extends any> =
  K extends [infer _K extends WeakKey, ...infer K1 extends WeakKey[]]
    ? K1 extends []
      ? WeakMap<_K, V>
        : WeakMap<_K, RecursiveWeakMapType<K1, V>>
          : never;

export class NestedWeakMap<K extends [...WeakKey[]], V extends any> {
  constructor(readonly depth: K['length']) {
    if (this.depth <= 0) throw new Error("Map must have at least depth 1");
  }

  readonly map = new WeakMap() as RecursiveWeakMapType<K, V>;

  get(key: K): V | undefined {
    if (key.length !== this.depth) throw new Error("Key invalid");

    let map = this.map;
    for (let i = 0; i < this.depth - 1; i++) {
      if (!map.has(key[i]!)) return undefined;
      map = map.get(key[i]!)!;
    }
    return map.get(key[this.depth - 1]!);
  }

  set(key: K, value: V) {
    if (key.length !== this.depth) throw new Error("Key invalid");

    let map = this.map;
    for (let i = 0; i < this.depth - 1; i++) {
      if (!map.has(key[i]!)) map.set(key[i]!, new WeakMap() as never);
      map = map.get(key[i]!)!;
    }
    map.set(key[this.depth - 1]!, value as never);
  }

  has(key: PartialRecursiveKey<K> | K): boolean {
    if (key.length <= 0 || key.length > this.depth) throw new Error("Key invalid");

    let map = this.map
    for (const k of key.slice(0, -1)) {
      if (!map.has(k)) return false;
      map = map.get(k)!;
    }
    return map.has(key[key.length - 1]!);
  }

  delete(key: PartialRecursiveKey<K> | K) {
    if (key.length <= 0 || key.length > this.depth) throw new Error("Key invalid");

    let map = this.map
    for (const k of key.slice(0, -1)) {
      if (!map.has(k)) return;
      map = map.get(k)!;
    }
    map.delete(key[key.length - 1]!)
  }
}

export interface ReadonlyNestedWeakMap<K extends [...WeakKey[]], V extends any> {
  get(key: K): V | undefined;
  has(key: PartialRecursiveKey<K> | K): boolean;
}

export class NestedWeakSet<K extends [...WeakKey[]]> {
  constructor(readonly depth: K['length']) {
    if (this.depth < 0) throw new Error("Set must have at least depth 1");
    this.map = new NestedWeakMap<K, any>(this.depth);
  }
  
  readonly map: NestedWeakMap<K, any>;

  add(key: K) {
    this.map.set(key, key[this.depth - 1]);
  }

  has(key: PartialRecursiveKey<K> | K): boolean {
    return this.map.has(key);
  }

  delete(key: PartialRecursiveKey<K> | K) {
    this.map.delete(key)
  }
}

export interface ReadonlyNestedWeakSet<K extends [...WeakKey[]]> {
  has(key: PartialRecursiveKey<K> | K): boolean;
}

