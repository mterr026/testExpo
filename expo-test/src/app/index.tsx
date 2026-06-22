import { HomeScreen } from "@/features/home/HomeScreen";
import { useHomeScreenController } from "@/features/home/useHomeScreenController";

export default function Index() {
  const controller = useHomeScreenController();

  return <HomeScreen controller={controller} />;
}
