import type { PartyApplication, PartyApplicationStatus, PartyPost } from "@/domain/party";
import { getEnvironment } from "@/lib/env";
import { PrismaPartyRepository } from "@/lib/db/prisma-party-repository";

export abstract class PartyRepositoryError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PartyPostRepositoryNotFoundError extends PartyRepositoryError {
  constructor() {
    super("The party post was not found.");
  }
}

export class PartyPostRepositoryClosedError extends PartyRepositoryError {
  constructor() {
    super("The party post is closed.");
  }
}

export class DuplicatePartyApplicationError extends PartyRepositoryError {
  constructor() {
    super("This character has already applied to the party post.");
  }
}

export class PartyApplicationRepositoryNotFoundError extends PartyRepositoryError {
  constructor() {
    super("The party application was not found.");
  }
}

export class PartyApplicationRepositoryNotPendingError extends PartyRepositoryError {
  constructor() {
    super("The party application is no longer pending.");
  }
}

export interface PartyRepository {
  createPost(post: PartyPost): Promise<PartyPost>;
  findPostBySlug(slug: string): Promise<PartyPost | null>;
  listPosts(): Promise<PartyPost[]>;
  createApplication(application: PartyApplication): Promise<PartyApplication>;
  listApplications(postId: string): Promise<PartyApplication[]>;
  decideApplication(
    postId: string,
    applicationId: string,
    status: Extract<PartyApplicationStatus, "ACCEPTED" | "DECLINED">,
    decidedAt: string,
  ): Promise<PartyApplication>;
  closePost(postId: string, closedAt: string): Promise<PartyPost>;
  reset?(): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Keeps the in-memory implementation aligned with PostgreSQL's mutation
 * predicates: a post cannot accept a new application or decision at or after
 * its expiry timestamp, even when its status has not been materialized as
 * CLOSED yet.
 */
function isOpenForMutation(post: PartyPost, attemptedAt: string): boolean {
  return post.status === "OPEN" && Date.parse(post.expiresAt) > Date.parse(attemptedAt);
}

/** In-process party-board storage for mock development and isolated unit tests. */
export class InMemoryPartyRepository implements PartyRepository {
  private readonly postsBySlug = new Map<string, PartyPost>();
  private readonly postSlugById = new Map<string, string>();
  private readonly applicationsById = new Map<string, PartyApplication>();
  private readonly applicationIdByPostAndCharacter = new Map<string, string>();

  async createPost(post: PartyPost): Promise<PartyPost> {
    if (this.postsBySlug.has(post.slug)) {
      throw new Error("Duplicate party post slug.");
    }
    this.postsBySlug.set(post.slug, clone(post));
    this.postSlugById.set(post.id, post.slug);
    return clone(post);
  }

  async findPostBySlug(slug: string): Promise<PartyPost | null> {
    const post = this.postsBySlug.get(slug);
    return post ? clone(post) : null;
  }

  async listPosts(): Promise<PartyPost[]> {
    return [...this.postsBySlug.values()]
      .sort(
        (left, right) => right.createdAt.localeCompare(left.createdAt) || left.slug.localeCompare(right.slug),
      )
      .map(clone);
  }

  async createApplication(application: PartyApplication): Promise<PartyApplication> {
    const post = this.postsBySlug.get(this.postSlugById.get(application.postId) ?? "");
    if (!post) {
      throw new PartyPostRepositoryNotFoundError();
    }
    if (!isOpenForMutation(post, application.createdAt)) {
      throw new PartyPostRepositoryClosedError();
    }
    const key = `${application.postId}\u0000${application.applicantCharacterOcid}`;
    if (this.applicationIdByPostAndCharacter.has(key)) {
      throw new DuplicatePartyApplicationError();
    }
    if (this.applicationsById.has(application.id)) {
      throw new Error("Duplicate party application id.");
    }
    this.applicationsById.set(application.id, clone(application));
    this.applicationIdByPostAndCharacter.set(key, application.id);
    return clone(application);
  }

  async listApplications(postId: string): Promise<PartyApplication[]> {
    return [...this.applicationsById.values()]
      .filter((application) => application.postId === postId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
      .map(clone);
  }

  async decideApplication(
    postId: string,
    applicationId: string,
    status: Extract<PartyApplicationStatus, "ACCEPTED" | "DECLINED">,
    decidedAt: string,
  ): Promise<PartyApplication> {
    const post = this.postsBySlug.get(this.postSlugById.get(postId) ?? "");
    if (!post) {
      throw new PartyPostRepositoryNotFoundError();
    }
    if (!isOpenForMutation(post, decidedAt)) {
      throw new PartyPostRepositoryClosedError();
    }
    const application = this.applicationsById.get(applicationId);
    if (!application || application.postId !== postId) {
      throw new PartyApplicationRepositoryNotFoundError();
    }
    if (application.status !== "PENDING") {
      throw new PartyApplicationRepositoryNotPendingError();
    }
    const updated = { ...application, status, decidedAt };
    this.applicationsById.set(application.id, clone(updated));
    return clone(updated);
  }

  async closePost(postId: string, closedAt: string): Promise<PartyPost> {
    const post = this.postsBySlug.get(this.postSlugById.get(postId) ?? "");
    if (!post) {
      throw new PartyPostRepositoryNotFoundError();
    }
    if (post.status === "CLOSED") {
      return clone(post);
    }
    const updated = { ...post, status: "CLOSED" as const, updatedAt: closedAt, closedAt };
    this.postsBySlug.set(post.slug, clone(updated));
    return clone(updated);
  }

  reset(): void {
    this.postsBySlug.clear();
    this.postSlugById.clear();
    this.applicationsById.clear();
    this.applicationIdByPostAndCharacter.clear();
  }
}

declare global {
  var meyukbuPartyRepository: InMemoryPartyRepository | undefined;
  var meyukbuPrismaPartyRepository: PrismaPartyRepository | undefined;
}

/** Selects PostgreSQL persistence in deployment and memory storage in mock/test mode. */
export function getPartyRepository(): PartyRepository {
  const environment = getEnvironment();
  if (environment.MEYUKBU_STORAGE === "prisma") {
    if (!globalThis.meyukbuPrismaPartyRepository) {
      globalThis.meyukbuPrismaPartyRepository = new PrismaPartyRepository();
    }
    return globalThis.meyukbuPrismaPartyRepository;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production requires MEYUKBU_STORAGE=prisma.");
  }
  if (!globalThis.meyukbuPartyRepository) {
    globalThis.meyukbuPartyRepository = new InMemoryPartyRepository();
  }
  return globalThis.meyukbuPartyRepository;
}

export function resetInMemoryPartyRepository(): void {
  globalThis.meyukbuPartyRepository?.reset();
}
