import { lightTheme } from "./theme";
import { createShadows } from "./shadows";
import { createStyles } from "./createStyles";

export {
  spacing,
  radius,
  fontSize,
  fontFamily,
  fontWeight,
  fontStyle,
  lineHeight,
  homeChrome,
  getBottomNavHeight,
  getFabBottom,
  getFabScrollPadding,
} from "./tokens";

export { createShadows, type ThemeShadows } from "./shadows";
export { createStyles, type AppStyles } from "./createStyles";

/** Static light-theme exports for tests and non-React modules. */
export const colors = lightTheme.colors;
export const surfaces = lightTheme.surfaces;
export const shadows = createShadows(lightTheme);
export const styles = createStyles(lightTheme);
