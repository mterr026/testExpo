import type { BillCycleWindow } from "@/engine";
import {
  findNextDistinctPaycheck,
  resolvePaycheckCycleWindow,
} from "@/engine";
import { clearProfileFinancialData } from "@/features/backup/services/BackupRestoreWriter";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";
import { getAppRuntime } from "@/shared/services/appRuntime";

import { demoDateFromToday } from "./demoSeedDates";

export async function seedDemoFinancialData(profileId: string): Promise<void> {
  const runtime = await getAppRuntime();
  const existingPaychecks =
    await runtime.repositories.paycheckRepository.findAll(profileId);

  if (existingPaychecks.length > 0) {
    return;
  }

  const today = demoDateFromToday(0);

  await runtime.repositories.profileRepository.update(profileId, {
    openingBalanceCents: 245_000,
    essentialReserveCents: 20_000,
    openingBalanceAsOfDate: today,
  });

  const primaryPaycheck = await runtime.services.paycheckService.createPaycheck({
    profileId,
    label: "Main job",
    amountCents: 185_000,
    expectedDate: demoDateFromToday(5),
    isRecurring: true,
    recurrenceInterval: "biweekly",
    isPrimary: true,
  });

  const paychecks = await runtime.repositories.paycheckRepository.findAll(profileId);
  const nextPaycheck = findNextDistinctPaycheck(paychecks, primaryPaycheck);
  const cycleBoundary = resolvePaycheckCycleWindow({
    expectedDate: primaryPaycheck.expectedDate,
    recurrenceInterval: primaryPaycheck.recurrenceInterval,
    nextPaycheckExpectedDate: nextPaycheck?.expectedDate ?? null,
  });
  const cycle: BillCycleWindow = {
    paycheckCycleId: primaryPaycheck.id,
    startDate: cycleBoundary.startDate,
    nextStartDate: cycleBoundary.nextStartDate,
  };

  const billSeeds = [
    { name: "Electric", amountCents: 12_800, dueDate: demoDateFromToday(3) },
    { name: "Phone", amountCents: 8_500, dueDate: demoDateFromToday(4) },
    { name: "Netflix", amountCents: 1_599, dueDate: demoDateFromToday(6) },
    { name: "Rent", amountCents: 95_000, dueDate: demoDateFromToday(8) },
  ] as const;

  for (const billSeed of billSeeds) {
    await runtime.services.billService.createBillForCycle(
      {
        profileId,
        name: billSeed.name,
        billType: "fixed",
        defaultAmountCents: billSeed.amountCents,
        recurrenceInterval: "monthly",
        dueDateAbsolute: billSeed.dueDate,
      },
      cycle
    );
  }

  const purchaseSeeds = [
    {
      description: "Coffee",
      amountCents: 450,
      purchaseDate: demoDateFromToday(-1),
      state: "charged" as const,
    },
    {
      description: "Groceries",
      amountCents: 6_723,
      purchaseDate: demoDateFromToday(-2),
      state: "charged" as const,
    },
    {
      description: "Gas",
      amountCents: 4_500,
      purchaseDate: demoDateFromToday(0),
      state: "pending" as const,
    },
  ] as const;

  for (const purchaseSeed of purchaseSeeds) {
    await runtime.services.purchaseService.createPurchase({
      profileId,
      description: purchaseSeed.description,
      amountCents: purchaseSeed.amountCents,
      purchaseDate: purchaseSeed.purchaseDate,
      state: purchaseSeed.state,
    });
  }

  runtime.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);
}

export async function clearDemoFinancialData(profileId: string): Promise<void> {
  const runtime = await getAppRuntime();

  await clearProfileFinancialData(runtime.database, profileId);
  await runtime.repositories.profileRepository.update(profileId, {
    openingBalanceCents: 0,
    essentialReserveCents: 0,
    openingBalanceAsOfDate: null,
  });
  runtime.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);
}
