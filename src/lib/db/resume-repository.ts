import type { ResumeRecord } from "@/domain/resume";
import { getEnvironment } from "@/lib/env";
import { PrismaResumeRepository } from "@/lib/db/prisma-resume-repository";

export interface ResumeRepository {
  create(record: ResumeRecord): Promise<ResumeRecord>;
  findBySlug(slug: string): Promise<ResumeRecord | null>;
  slugExists(slug: string): Promise<boolean>;
  save(record: ResumeRecord): Promise<ResumeRecord>;
  reset?(): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class InMemoryResumeRepository implements ResumeRepository {
  private readonly records = new Map<string, ResumeRecord>();

  async create(record: ResumeRecord): Promise<ResumeRecord> {
    if (this.records.has(record.slug)) {
      throw new Error("Duplicate public slug.");
    }
    this.records.set(record.slug, clone(record));
    return clone(record);
  }

  async findBySlug(slug: string): Promise<ResumeRecord | null> {
    const record = this.records.get(slug);
    return record ? clone(record) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return this.records.has(slug);
  }

  async save(record: ResumeRecord): Promise<ResumeRecord> {
    this.records.set(record.slug, clone(record));
    return clone(record);
  }

  reset(): void {
    this.records.clear();
  }
}

declare global {
  var meyukbuResumeRepository: InMemoryResumeRepository | undefined;
  var meyukbuPrismaResumeRepository: PrismaResumeRepository | undefined;
}

export function getResumeRepository(): ResumeRepository {
  const environment = getEnvironment();
  if (environment.MEYUKBU_STORAGE === "prisma") {
    if (!globalThis.meyukbuPrismaResumeRepository) {
      globalThis.meyukbuPrismaResumeRepository = new PrismaResumeRepository();
    }
    return globalThis.meyukbuPrismaResumeRepository;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production requires MEYUKBU_STORAGE=prisma.");
  }
  if (!globalThis.meyukbuResumeRepository) {
    globalThis.meyukbuResumeRepository = new InMemoryResumeRepository();
  }
  return globalThis.meyukbuResumeRepository;
}

export function resetInMemoryResumeRepository(): void {
  globalThis.meyukbuResumeRepository?.reset();
}
