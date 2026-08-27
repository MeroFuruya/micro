import { NestedWeakMap } from "../micro/index.js";


export type MetadataTarget = object;
export type MetadataToken = symbol;
export type Metadata = unknown;

export const metadataMap = new NestedWeakMap<[MetadataTarget, MetadataToken], Metadata>(2);

export function defineMetadata() {
  
}

