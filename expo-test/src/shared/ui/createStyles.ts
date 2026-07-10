import { createShadows } from "./shadows";
import type { AppTheme } from "./theme";
import { createActionStyles } from "./styleSheets/actions";
import { createBillsStyles } from "./styleSheets/bills";
import { createChromeStyles } from "./styleSheets/chrome";
import { createDashboardStyles } from "./styleSheets/dashboard";
import { createFormStyles } from "./styleSheets/forms";
import { createImportStyles } from "./styleSheets/importStyles";
import { createPaychecksStyles } from "./styleSheets/paychecks";
import { createPurchasesStyles } from "./styleSheets/purchases";
import { createSettingsStyles } from "./styleSheets/settings";
import { createStatusStyles } from "./styleSheets/status";

export function createStyles(theme: AppTheme) {
  const { colors, surfaces } = theme;
  const shadows = createShadows(theme);
  const input = { colors, surfaces, shadows };

  return {
    ...createChromeStyles(input),
    ...createDashboardStyles(input),
    ...createBillsStyles(input),
    ...createPaychecksStyles(input),
    ...createPurchasesStyles(input),
    ...createSettingsStyles(input),
    ...createImportStyles(input),
    ...createFormStyles(input),
    ...createActionStyles(input),
    ...createStatusStyles(input),
  };
}

export type AppStyles = ReturnType<typeof createStyles>;
