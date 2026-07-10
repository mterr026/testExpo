import { getDatabase } from "@/database/connection";
import type {
  QueryParameters,
  TransactionExecutor,
  TransactionalDatabaseExecutor,
} from "@/database/repositories/types";
import { SimpleFinancialEventBus } from "@/shared/events/SimpleFinancialEventBus";

import {
  createAppServices,
  type AppServiceContainer,
} from "./createAppServices";

export type AppRuntime = AppServiceContainer & {
  database: TransactionalDatabaseExecutor;
  eventBus: SimpleFinancialEventBus;
};

let runtimePromise: Promise<AppRuntime> | null = null;

export async function getAppRuntime(): Promise<AppRuntime> {
  if (!runtimePromise) {
    runtimePromise = createRuntime();
  }

  return runtimePromise;
}

async function createRuntime() {
  const db = await getDatabase();
  const eventBus = new SimpleFinancialEventBus();
  const container = createAppServices(
    createQueuedRepositoryExecutor(db),
    eventBus
  );

  return {
    ...container,
    database: createQueuedRepositoryExecutor(db),
    eventBus,
  };
}

function createQueuedRepositoryExecutor(
  db: Awaited<ReturnType<typeof getDatabase>>
): TransactionalDatabaseExecutor {
  const queue = createAsyncQueue();

  return {
    getFirstAsync<T>(source: string, params?: QueryParameters) {
      return queue(() => db.getFirstAsync<T>(source, toBindParams(params)));
    },
    getAllAsync<T>(source: string, params?: QueryParameters) {
      return queue(() => db.getAllAsync<T>(source, toBindParams(params)));
    },
    runAsync(source: string, params?: QueryParameters) {
      return queue(() => db.runAsync(source, toBindParams(params)));
    },
    async withExclusiveTransactionAsync<T>(
      task: (transaction: TransactionExecutor) => Promise<T>
    ) {
      return queue(async () => {
        let result: T | undefined;

        await db.withExclusiveTransactionAsync(async (transaction) => {
          result = await task(createDirectRepositoryExecutor(transaction));
        });

        return result as T;
      });
    },
  };
}

function createDirectRepositoryExecutor(db: {
  getFirstAsync<T>(source: string, params?: unknown): Promise<T | null>;
  getAllAsync<T>(source: string, params?: unknown): Promise<T[]>;
  runAsync(source: string, params?: unknown): Promise<unknown>;
}): TransactionExecutor {
  return {
    getFirstAsync<T>(source: string, params?: QueryParameters) {
      return db.getFirstAsync<T>(source, toBindParams(params));
    },
    getAllAsync<T>(source: string, params?: QueryParameters) {
      return db.getAllAsync<T>(source, toBindParams(params));
    },
    runAsync(source: string, params?: QueryParameters) {
      return db.runAsync(source, toBindParams(params));
    },
  };
}

function createAsyncQueue() {
  let current: Promise<unknown> = Promise.resolve();

  return async function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = current.then(task, task);

    current = next.catch(() => undefined);

    return next;
  };
}

type SQLiteBindValue = string | number | boolean | null | Uint8Array;

function toBindParams(params?: QueryParameters): SQLiteBindValue[] {
  return [...(params ?? [])] as SQLiteBindValue[];
}
