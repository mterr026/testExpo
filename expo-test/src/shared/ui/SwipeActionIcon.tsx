import { ActionIcon, type ActionIconName } from "./ActionIcon";

export function SwipeActionIcon({
  destructive = false,
  name,
}: {
  destructive?: boolean;
  name: ActionIconName;
}) {
  return <ActionIcon color="#FFFFFF" destructive={destructive} name={name} size={22} />;
}
