export class Cache<KEY extends string | number, VALUE> {
  private store: Map<KEY, VALUE> = new Map();

  get(key: KEY): VALUE | undefined {
    return this.store.get(key);
  }

  set(key: KEY, value: VALUE): void {
    this.store.set(key, value);
  }

  has(key: KEY): boolean {
    return this.store.has(key);
  }
}
