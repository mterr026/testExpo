import { useEffect, useRef } from "react";
import { View } from "react-native";

import { useOptionalTutorialContext } from "./TutorialContext";
import type { TutorialTargetId } from "./tutorialTargets";

type TutorialTargetProps = {
  id: TutorialTargetId;
  children: React.ReactNode;
};

export function TutorialTarget({ id, children }: TutorialTargetProps) {
  const context = useOptionalTutorialContext();
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.registerTarget(id, ref);

    return () => {
      context.unregisterTarget(id);
    };
  }, [context, id]);

  if (!context) {
    return <>{children}</>;
  }

  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}
