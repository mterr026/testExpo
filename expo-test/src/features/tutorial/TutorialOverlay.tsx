import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
  type LayoutRectangle,
} from "react-native";

import { colors, fontWeight, radius, spacing, styles } from "@/shared/ui/styles";

import { useTutorialContext } from "./TutorialContext";
import {
  buildDimRegions,
  buildHighlightRect,
  buildPointerLayout,
  resolveTooltipPlacement,
  resolveTooltipPosition,
} from "./tutorialLayout";
import { tutorialSteps } from "./tutorialSteps";

type TutorialOverlayProps = {
  visible: boolean;
  stepIndex: number;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
};

const TOOLTIP_ESTIMATED_HEIGHT = 200;

function TutorialPointer({
  layout,
}: {
  layout: ReturnType<typeof buildPointerLayout>;
}) {
  const headLeft = layout.centerX - 10;

  return (
    <View pointerEvents="none" style={tutorialStyles.pointerRoot}>
      <Text
        style={[
          tutorialStyles.pointerHead,
          {
            left: headLeft,
            top: layout.headTop,
            transform: [{ rotate: layout.direction === "up" ? "0deg" : "180deg" }],
          },
        ]}
      >
        ▲
      </Text>
      {layout.shaftHeight > 0 ? (
        <View
          style={[
            tutorialStyles.pointerShaft,
            {
              left: layout.centerX - 1.5,
              top: layout.shaftTop,
              height: layout.shaftHeight,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export function TutorialOverlay({
  visible,
  stepIndex,
  isSaving,
  onBack,
  onNext,
  onSkip,
}: TutorialOverlayProps) {
  const { measureTarget, scrollTargetIntoView } = useTutorialContext();
  const [highlightLayout, setHighlightLayout] = useState<LayoutRectangle | null>(
    null
  );
  const step = tutorialSteps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === tutorialSteps.length - 1;
  const stepNumber = stepIndex + 1;
  const windowSize = Dimensions.get("window");

  useEffect(() => {
    if (!visible || !step) {
      setHighlightLayout(null);
      return;
    }

    let cancelled = false;

    async function syncHighlight() {
      setHighlightLayout(null);
      await scrollTargetIntoView(step.targetId, step.screen);

      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, attempt === 0 ? 120 : 100);
        });

        const layout = await measureTarget(step.targetId);

        if (!cancelled && layout) {
          setHighlightLayout(layout);
          return;
        }
      }
    }

    void syncHighlight();

    return () => {
      cancelled = true;
    };
  }, [measureTarget, scrollTargetIntoView, step, visible]);

  if (!visible || !step) {
    return null;
  }

  const highlight = highlightLayout
    ? buildHighlightRect(highlightLayout)
    : null;
  const tooltipPlacement = highlight
    ? resolveTooltipPlacement(
        highlight,
        windowSize.height,
        step.placement ?? "auto"
      )
    : "below";
  const tooltipPosition = highlight
    ? resolveTooltipPosition({
        highlight,
        tooltipPlacement,
        windowHeight: windowSize.height,
      })
    : null;
  const tooltipTop =
    tooltipPosition?.top ??
    (tooltipPosition?.bottom != null
      ? windowSize.height - tooltipPosition.bottom - TOOLTIP_ESTIMATED_HEIGHT
      : windowSize.height * 0.34);
  const tooltipBottom =
    tooltipPosition?.bottom != null
      ? windowSize.height - tooltipPosition.bottom
      : tooltipTop + TOOLTIP_ESTIMATED_HEIGHT;
  const pointerLayout =
    highlight && tooltipPosition
      ? buildPointerLayout({
          highlight,
          tooltipPlacement,
          tooltipTop,
          tooltipBottom,
        })
      : null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tutorialStyles.root} pointerEvents="box-none">
        {highlight ? (
          <>
            {buildDimRegions(highlight, windowSize.width, windowSize.height).map(
              (region, index) => (
                <View
                  key={`dim-${index}`}
                  pointerEvents="none"
                  style={[
                    tutorialStyles.dimRegion,
                    {
                      left: region.left,
                      top: region.top,
                      width: region.width,
                      height: region.height,
                    },
                  ]}
                />
              )
            )}
            <View
              pointerEvents="none"
              style={[
                tutorialStyles.spotlightRing,
                {
                  left: highlight.x,
                  top: highlight.y,
                  width: highlight.width,
                  height: highlight.height,
                },
              ]}
            />
          </>
        ) : (
          <View pointerEvents="none" style={tutorialStyles.fullDim} />
        )}

        {pointerLayout ? <TutorialPointer layout={pointerLayout} /> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          style={({ pressed }) => [
            tutorialStyles.skipButton,
            pressed && styles.pressed,
          ]}
          onPress={onSkip}
        >
          <Text style={tutorialStyles.skipButtonText}>Skip tutorial</Text>
        </Pressable>

        <View
          style={[
            tutorialStyles.tooltip,
            tooltipPosition ?? tutorialStyles.tooltipCentered,
          ]}
        >
          <Text style={tutorialStyles.tooltipEyebrow}>
            {step.screen} · {stepNumber} of {tutorialSteps.length}
          </Text>
          <Text style={styles.sectionTitle}>{step.title}</Text>
          <Text style={styles.helpText}>{step.body}</Text>

          <View style={tutorialStyles.tooltipActions}>
            {!isFirstStep ? (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  tutorialStyles.backButton,
                  pressed && styles.pressed,
                ]}
                disabled={isSaving}
                onPress={onBack}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonTight,
                tutorialStyles.nextButton,
                !isFirstStep && tutorialStyles.nextButtonWithBack,
                pressed && styles.pressed,
              ]}
              disabled={isSaving}
              onPress={onNext}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? "Saving..." : isLastStep ? "Got it" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const absoluteFill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const tutorialStyles = {
  root: {
    flex: 1,
  },
  fullDim: {
    ...absoluteFill,
    backgroundColor: "rgba(11, 31, 51, 0.52)",
  },
  dimRegion: {
    position: "absolute" as const,
    backgroundColor: "rgba(11, 31, 51, 0.52)",
  },
  spotlightRing: {
    position: "absolute" as const,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accentLight,
    backgroundColor: "transparent",
    shadowColor: colors.accentLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  pointerRoot: {
    ...absoluteFill,
  },
  pointerHead: {
    position: "absolute" as const,
    width: 20,
    textAlign: "center" as const,
    fontSize: 18,
    lineHeight: 20,
    color: colors.accentLight,
  },
  pointerShaft: {
    position: "absolute" as const,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accentLight,
  },
  skipButton: {
    position: "absolute" as const,
    top: spacing.xxxl + spacing.sm,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 253, 247, 0.94)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  tooltip: {
    position: "absolute" as const,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
    gap: spacing.sm,
  },
  tooltipCentered: {
    top: "34%" as const,
  },
  tooltipEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: fontWeight.medium,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  nextButton: {
    marginTop: spacing.sm,
  },
  nextButtonWithBack: {
    flex: 1,
    marginTop: 0,
  },
  backButton: {
    flex: 1,
    marginTop: 0,
  },
  tooltipActions: {
    flexDirection: "row" as const,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
};
