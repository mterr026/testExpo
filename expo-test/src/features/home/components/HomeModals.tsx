import { BillConfirmationModal } from "@/features/bills/BillConfirmationModal";
import { BillEntryModal } from "@/features/bills/BillEntryModal";
import { ImportSuggestionConfirmModal } from "@/features/import/ImportSuggestionConfirmModal";
import { OnboardingModal } from "@/features/onboarding/OnboardingModal";
import { PaycheckEntryModal } from "@/features/paychecks/PaycheckEntryModal";
import { PurchaseEntryModal } from "@/features/purchases/PurchaseEntryModal";
import {
  billAmountAccessoryId,
  billEntryAmountAccessoryId,
  paycheckAmountAccessoryId,
  purchaseAmountAccessoryId,
  settingsMoneyAccessoryId,
  openingBalanceAmountAccessoryId,
} from "@/shared/ui/keyboard";

import type { HomeScreenController } from "../useHomeScreenController";

type HomeModalsProps = {
  controller: HomeScreenController;
};

export function HomeModals({ controller }: HomeModalsProps) {
  const isOnboardingImportConfirm =
    controller.onboarding.visible &&
    controller.onboarding.step === "import" &&
    controller.importReview.confirmSuggestion.visible;

  return (
    <>
      <OnboardingModal
        visible={
          controller.onboarding.visible &&
          !controller.importReview.isFilePickerActive
        }
        step={controller.onboarding.step}
        balanceAmount={controller.onboarding.balanceAmount}
        reserveAmount={controller.onboarding.reserveAmount}
        error={controller.onboarding.error}
        isSaving={controller.onboarding.isSaving}
        amountAccessoryId={openingBalanceAmountAccessoryId}
        onBalanceAmountChange={controller.onboarding.setBalanceAmount}
        onReserveAmountChange={controller.onboarding.setReserveAmount}
        onContinue={controller.onboarding.continueOnboarding}
        onSkip={controller.onboarding.skipOnboarding}
        onDismiss={
          controller.importReview.isFilePickerActive
            ? controller.importReview.notifyOnboardingOverlayDismissed
            : undefined
        }
        importReview={{
          error: controller.importReview.error,
          importMessage: controller.importReview.importMessage,
          isClearing: controller.importReview.isClearing,
          isImporting: controller.importReview.isImporting,
          isLoading: controller.importReview.isLoading,
          onClearSuggestions: controller.importReview.clearSuggestions,
          onImportFile: controller.importReview.importStatementFileForOnboarding,
          onConfirmSuggestion: controller.importReview.openConfirmSuggestion,
          suggestions: controller.importReview.suggestions,
          onRejectSuggestion: controller.importReview.rejectSuggestion,
        }}
        confirmSuggestion={{
          amount: controller.importReview.confirmSuggestion.amount,
          amountAccessoryId: settingsMoneyAccessoryId,
          billType: controller.importReview.confirmSuggestion.billType,
          dueDate: controller.importReview.confirmSuggestion.dueDate,
          error: controller.importReview.confirmSuggestion.error,
          incomeRole: controller.importReview.confirmSuggestion.isPrimary
            ? "primary"
            : "secondary",
          isSaving: controller.importReview.confirmSuggestion.isSaving,
          name: controller.importReview.confirmSuggestion.name,
          recurrence: controller.importReview.confirmSuggestion.recurrence,
          suggestionKind: controller.importReview.confirmSuggestion.suggestionKind,
          visible: controller.importReview.confirmSuggestion.visible,
          onAmountChange: controller.importReview.confirmSuggestion.setAmount,
          onBillTypeChange: controller.importReview.confirmSuggestion.setBillType,
          onClose: controller.importReview.confirmSuggestion.close,
          onDueDateChange: controller.importReview.confirmSuggestion.setDueDate,
          onIncomeRoleChange: (role) =>
            controller.importReview.confirmSuggestion.setIsPrimary(
              role === "primary"
            ),
          onNameChange: controller.importReview.confirmSuggestion.setName,
          onRecurrenceChange: controller.importReview.confirmSuggestion.setRecurrence,
          onReject: controller.importReview.confirmSuggestion.reject,
          onSave: controller.importReview.confirmSuggestion.save,
        }}
      />

      <PurchaseEntryModal
        visible={controller.purchaseEntry.visible}
        mode={controller.purchaseEntry.mode}
        name={controller.purchaseEntry.name}
        amount={controller.purchaseEntry.amount}
        date={controller.purchaseEntry.date}
        status={controller.purchaseEntry.status}
        error={controller.purchaseEntry.error}
        amountAccessoryId={purchaseAmountAccessoryId}
        onNameChange={controller.purchaseEntry.setName}
        onAmountChange={controller.purchaseEntry.setAmount}
        onDateChange={controller.purchaseEntry.setDate}
        onStatusChange={controller.purchaseEntry.setStatus}
        onSave={controller.purchaseEntry.save}
        onClose={controller.purchaseEntry.close}
      />

      <BillConfirmationModal
        bill={controller.billConfirmation.bill}
        amountDraft={controller.billConfirmation.amountDraft}
        error={controller.billConfirmation.error}
        amountAccessoryId={billAmountAccessoryId}
        onAmountDraftChange={controller.billConfirmation.setAmountDraft}
        onSave={controller.billConfirmation.save}
        onClose={controller.billConfirmation.close}
      />

      <BillEntryModal
        visible={controller.billEntry.visible}
        mode={controller.billEntry.mode}
        name={controller.billEntry.name}
        amount={controller.billEntry.amount}
        dueDate={controller.billEntry.dueDate}
        repeatMode={controller.billEntry.repeatMode}
        billType={controller.billEntry.billType}
        error={controller.billEntry.error}
        amountAccessoryId={billEntryAmountAccessoryId}
        onNameChange={controller.billEntry.setName}
        onAmountChange={controller.billEntry.setAmount}
        onDueDateChange={controller.billEntry.setDueDate}
        onRepeatModeChange={controller.billEntry.setRepeatMode}
        onBillTypeChange={controller.billEntry.setBillType}
        onSave={controller.billEntry.save}
        onClose={controller.billEntry.close}
      />

      <PaycheckEntryModal
        visible={controller.paycheckEntry.visible}
        mode={controller.paycheckEntry.mode}
        label={controller.paycheckEntry.label}
        amount={controller.paycheckEntry.amount}
        expectedDate={controller.paycheckEntry.expectedDate}
        incomeRole={controller.paycheckEntry.incomeRole}
        recurrence={controller.paycheckEntry.recurrence}
        error={controller.paycheckEntry.error}
        amountAccessoryId={paycheckAmountAccessoryId}
        onLabelChange={controller.paycheckEntry.setLabel}
        onAmountChange={controller.paycheckEntry.setAmount}
        onExpectedDateChange={controller.paycheckEntry.setExpectedDate}
        onIncomeRoleChange={controller.paycheckEntry.setIncomeRole}
        onRecurrenceChange={controller.paycheckEntry.setRecurrence}
        onSave={controller.paycheckEntry.save}
        onClose={controller.paycheckEntry.close}
      />

      <ImportSuggestionConfirmModal
        visible={
          controller.importReview.confirmSuggestion.visible &&
          !isOnboardingImportConfirm
        }
        name={controller.importReview.confirmSuggestion.name}
        amount={controller.importReview.confirmSuggestion.amount}
        billType={controller.importReview.confirmSuggestion.billType}
        dueDate={controller.importReview.confirmSuggestion.dueDate}
        error={controller.importReview.confirmSuggestion.error}
        incomeRole={
          controller.importReview.confirmSuggestion.isPrimary
            ? "primary"
            : "secondary"
        }
        isSaving={controller.importReview.confirmSuggestion.isSaving}
        recurrence={controller.importReview.confirmSuggestion.recurrence}
        suggestionKind={controller.importReview.confirmSuggestion.suggestionKind}
        amountAccessoryId={settingsMoneyAccessoryId}
        onNameChange={controller.importReview.confirmSuggestion.setName}
        onAmountChange={controller.importReview.confirmSuggestion.setAmount}
        onBillTypeChange={controller.importReview.confirmSuggestion.setBillType}
        onDueDateChange={controller.importReview.confirmSuggestion.setDueDate}
        onIncomeRoleChange={(role) =>
          controller.importReview.confirmSuggestion.setIsPrimary(
            role === "primary"
          )
        }
        onRecurrenceChange={controller.importReview.confirmSuggestion.setRecurrence}
        onReject={controller.importReview.confirmSuggestion.reject}
        onSave={controller.importReview.confirmSuggestion.save}
        onClose={controller.importReview.confirmSuggestion.close}
      />
    </>
  );
}
