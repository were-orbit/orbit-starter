import type { DomainEvent, EventBus } from "@/kernel/events.ts";
import type { TxContext, TxEventCollector, UnitOfWork } from "@/kernel/uow.ts";

type RepoContext = Omit<TxContext, "events">;

const READ_ONLY_EVENT_COLLECTOR: TxEventCollector = {
  add: () => {
    throw new Error(
      "uow.read(): events.add() is forbidden — domain events may only be " +
        "emitted from uow.run(). Move the mutation into uow.run().",
    );
  },
  addMany: () => {
    throw new Error(
      "uow.read(): events.addMany() is forbidden — domain events may only " +
        "be emitted from uow.run(). Move the mutation into uow.run().",
    );
  },
};

const WRITE_METHODS = new Set(["save", "delete", "record"]);

function makeReadOnly<T extends object>(repo: T, repoName: string): T {
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function" && typeof prop === "string" && WRITE_METHODS.has(prop)) {
        return () => {
          throw new Error(
            `uow.read(): forbidden write on "${repoName}.${prop}()". ` +
              `Move this call into uow.run() — read() does not open a transaction.`,
          );
        };
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/**
 * Shared implementation of `run()` / `read()` semantics so every ORM
 * adapter gets identical event dispatch, read-only proxying, and
 * error-on-write-under-read behavior. Subclasses only provide three
 * hooks: how to open a transaction, how to build a fresh repo context
 * from a transactional handle, and how to return a non-transactional
 * handle for reads.
 */
export abstract class BaseUnitOfWork<TxHandle> implements UnitOfWork {
  private cachedReadCtx: TxContext | null = null;

  constructor(protected readonly bus: EventBus) {}

  protected abstract openTransaction<T>(
    fn: (handle: TxHandle) => Promise<T>,
  ): Promise<T>;

  protected abstract buildContext(handle: TxHandle): RepoContext;

  protected abstract readHandle(): TxHandle;

  async run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    const pending: DomainEvent[] = [];
    const collector: TxEventCollector = {
      add: (event) => {
        pending.push(event);
      },
      addMany: (events) => {
        for (const event of events) pending.push(event);
      },
    };

    const result = await this.openTransaction(async (handle) => {
      const ctx: TxContext = { ...this.buildContext(handle), events: collector };
      return fn(ctx);
    });

    if (pending.length > 0) {
      await this.bus.publishMany(pending);
    }
    return result;
  }

  async read<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    if (!this.cachedReadCtx) {
      const ctx = this.buildContext(this.readHandle());
      const guarded: Record<string, unknown> = {};
      for (const [key, repo] of Object.entries(ctx)) {
        guarded[key] = makeReadOnly(repo as object, key);
      }
      guarded.events = READ_ONLY_EVENT_COLLECTOR;
      this.cachedReadCtx = guarded as unknown as TxContext;
    }
    return fn(this.cachedReadCtx);
  }
}
