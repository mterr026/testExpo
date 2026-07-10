import { EnvelopeEntryModal } from "@/features/budgeting/EnvelopeEntryModal";
import { DemoStoryModal } from "@/features/demo/DemoStoryModal";
import { DemoWelcomeModal } from "@/features/demo/DemoWelcomeModal";
import { BillConfirmationModal } from "@/features/bills/BillConfirmationModal";
import { BillEntryModal } from "@/features/bills/BillEntryModal";
import { ImportSuggestionConfirmModal } from "@/features/import/ImportSuggestionConfirmModal";
import { ImportLoadingModal } from "@/features/import/components/ImportLoadingModal";
import { OnboardingModal } from "@/features/onboarding/OnboardingModal";
import { PaycheckEntryModal } from "@/features/paychecks/PaycheckEntryModal";
import { PurchaseEntryModal } from "@/features/purchases/PurchaseEntryModal";
import { getRecentPurchaseDescriptions } from "@/features/purchases/recentPurchaseDescriptions";
import {
  billAmountAccessoryId,
  billEntryAmountAccessoryId,
  envelopeAmountAccessoryId,
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
  const showOnboardingImportLoading =
    controller.onboarding.visible &&
    controller.onboarding.step === "import" &&
    controller.importReview.isImporting;

  return (
    <>
      <DemoWelcomeModal
        visible={controller.demoPreview.showDemoWelcome}
        error={controller.demoPreview.error}
        isStarting={controller.demoPreview.isBusy}
        onStartTour={controller.demoPreview.startDemoStory}
        onSkip={controller.demoPreview.skipDemoWelcome}
      />
      <DemoStoryModal
        visible={controller.demoPreview.showDemoStory}
        error={controller.demoPreview.error}
        isFinishing={controller.demoPreview.isBusy}
        onBackToWelcome={controller.demoPreview.backToDemoWelcome}
        onComplete={controller.demoPreview.enterDemoExplore}
        onSkipToSample={controller.demoPreview.enterDemoExplore}
      />
      <ImportLoadingModal
        importPhase={controller.importReview.importPhase}
        visible={showOnboardingImportLoading}
      />
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
          importPhase: controller.importReview.importPhase,
          isLoading: controller.importReview.isLoading,
          onClearSuggestions: controller.importReview.clearSuggestions,
          onImportFile: controller.importReview.importStatementFileForOnboarding,
          onConfirmSuggestion: controller.importReview.openConfirmSuggestion,
          onRejectAllSuggestions: controller.importReview.rejectAllPendingSuggestions,
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
        addFormResetKey={controller.purchaseEntry.addFormResetKey}
        recentDescriptions={getRecentPurchaseDescriptions(
          controller.visiblePurchases
        )}
        envelopesEnabled={controller.budgetingPreferences?.envelopesEnabled ?? false}
        envelopes={(controller.dashboardSnapshot?.envelopes ?? [])
          .filter((envelope) => !envelope.isPaused && !envelope.deletedAt)
          .map((envelope) => ({
            id: envelope.id,
            name: envelope.name,
          }))}
        envelopeId={controller.purchaseEntry.envelopeId}
        onNameChange={controller.purchaseEntry.setName}
        onAmountChange={controller.purchaseEntry.setAmount}
        onDateChange={controller.purchaseEntry.setDate}
        onStatusChange={controller.purchaseEntry.setStatus}
        onEnvelopeChange={controller.purchaseEntry.setEnvelopeId}
        onSave={controller.purchaseEntry.save}
        onSaveAndAddAnother={controller.purchaseEntry.saveAndAddAnother}
        onClose={controller.purchaseEntry.close}
      />

      <EnvelopeEntryModal
        visible={controller.envelopeEntry.visible}
        mode={controller.envelopeEntry.mode}
        name={controller.envelopeEntry.name}
        allocation={controller.envelopeEntry.allocation}
        isPaused={controller.envelopeEntry.isPaused}
        error={controller.envelopeEntry.error}
        amountAccessoryId={envelopeAmountAccessoryId}
        onNameChange={controller.envelopeEntry.setName}
        onAllocationChange={controller.envelopeEntry.setAllocation}
        onIsPausedChange={controller.envelopeEntry.setIsPaused}
        onSave={controller.envelopeEntry.save}
        onClose={controller.envelopeEntry.close}
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
