import type {
  QueryParameters,
  TransactionExecutor,
  TransactionalDatabaseExecutor,
} from "./types";

export type SqlCall = {
  source: string;
  params?: QueryParameters;
};

export class FakeDatabase implements TransactionalDatabaseExecutor {
  getFirstRows: unknown[] = [];
  getAllRows: unknown[][] = [];
  runCalls: SqlCall[] = [];
  getFirstCalls: SqlCall[] = [];
  getAllCalls: SqlCall[] = [];
  transactionCount = 0;

  async getFirstAsync<T>(source: string, params?: QueryParameters) {
    this.getFirstCalls.push({ source, params });
    return (this.getFirstRows.shift() as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, params?: QueryParameters) {
    this.getAllCalls.push({ source, params });
    return (this.getAllRows.shift() as T[] | undefined) ?? [];
  }

  async runAsync(source: string, params?: QueryParameters) {
    this.runCalls.push({ source, params });
    return {};
  }

  async withExclusiveTransactionAsync<T>(
    task: (transaction: TransactionExecutor) => Promise<T>
  ) {
    this.transactionCount += 1;
    return task(this);
  }
}

export function fixedClock() {
  return new Date("2026-06-01T12:00:00Z");
}

export function createIncrementingIdFactory(prefix: string) {
  let count = 0;

  return () => {
    count += 1;
    return `${prefix}-${count}`;
  };
}
