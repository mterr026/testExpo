import * as SQLite from "expo-sqlite";

import { DATABASE_VERSION, schemaV1, schemaV2, schemaV3, schemaV4, schemaV5 } from "./schema";

const DATABASE_NAME = "budget-flow.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openAndMigrateDatabase();
  }

  return databasePromise;
}

async function openAndMigrateDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync("PRAGMA foreign_keys = ON;");
  await migrateDatabase(db);

  return db;
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase) {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(schemaV1);
      await transaction.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });
    return;
  }

  if (currentVersion === 1) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(schemaV2);
      await transaction.execAsync(schemaV3);
      await transaction.execAsync(schemaV4);
      await transaction.execAsync(schemaV5);
      await transaction.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });
    return;
  }

  if (currentVersion === 2) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(schemaV3);
      await transaction.execAsync(schemaV4);
      await transaction.execAsync(schemaV5);
      await transaction.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });
    return;
  }

  if (currentVersion === 3) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(schemaV4);
      await transaction.execAsync(schemaV5);
      await transaction.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });
    return;
  }

  if (currentVersion === 4) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(schemaV5);
      await transaction.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });
    return;
  }

  throw new Error(`Unsupported database version: ${currentVersion}`);
}
