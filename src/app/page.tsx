import { repo } from "@/lib/repo";
import { SpotBrowser } from "@/components/SpotBrowser";

export const dynamic = "force-dynamic";

export default async function Home() {
  const spots = await repo.listSpots();
  return <SpotBrowser spots={spots} />;
}
