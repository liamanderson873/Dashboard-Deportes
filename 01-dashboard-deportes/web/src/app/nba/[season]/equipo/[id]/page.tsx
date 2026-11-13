import { NbaProfile } from "@/components/NbaProfile";
export const dynamic = "force-dynamic";
export const metadata = { title: "NBA · Marcador" };
export default function Page({
  params,
}: {
  params: Promise<{ season: string; id: string }>;
}) {
  return <NbaProfile params={params} kind="team" />;
}
