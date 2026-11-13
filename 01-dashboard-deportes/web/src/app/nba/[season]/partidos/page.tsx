import { NbaPage } from "@/components/NbaPage";
export const dynamic = "force-dynamic";
export const metadata = { title: "Partidos NBA · Marcador" };
export default function Page({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  return <NbaPage params={params} section="partidos" title="Partidos NBA" />;
}
