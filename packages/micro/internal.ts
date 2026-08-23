export function hasOwnProperty<T extends object, K extends PropertyKey>(value: T, property: K): value is (T & {[P in K]: unknown}) {
  return Object.prototype.hasOwnProperty.call(value, property);
}