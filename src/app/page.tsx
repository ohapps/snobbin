import { getLastGroupId } from "@/server/utils/user/get-last-group-id";
import { redirect } from "next/navigation";

export default async function Home() {
  const lastGroupId = await getLastGroupId();
  if (lastGroupId) {
    redirect(`/groups/${lastGroupId}`);
  }
  redirect("/activity");
}
