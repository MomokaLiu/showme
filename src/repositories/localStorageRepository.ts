export interface Repository<T extends { id: string }> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(item: T): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  replaceAll(items: T[]): Promise<void>;
}

export class LocalStorageRepository<T extends { id: string }> implements Repository<T> {
  constructor(private readonly key: string) {}

  async getAll(): Promise<T[]> {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<T | undefined> {
    const items = await this.getAll();
    return items.find((item) => item.id === id);
  }

  async create(item: T): Promise<void> {
    const items = await this.getAll();
    await this.replaceAll([item, ...items]);
  }

  async update(id: string, patch: Partial<T>): Promise<void> {
    const items = await this.getAll();
    await this.replaceAll(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    await this.replaceAll(items.filter((item) => item.id !== id));
  }

  async replaceAll(items: T[]): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(items));
  }
}
