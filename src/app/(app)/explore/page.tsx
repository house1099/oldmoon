import ExploreClient from "@/components/explore/ExploreClient";
import { getVillageUsersAction } from "@/services/village.service";

export default async function ExplorePage() {
  const villageData = await getVillageUsersAction();

  return (
    <ExploreClient initialVillageUsers={villageData.users ?? []} />
  );
}
