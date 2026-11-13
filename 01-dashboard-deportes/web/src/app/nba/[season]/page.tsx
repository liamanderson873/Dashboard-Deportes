import { NbaPage } from "@/components/NbaPage";
export const dynamic = "force-dynamic";
export const metadata = { title: "NBA en perspectiva · Marcador" };
export default function Page({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  return <NbaPage params={params} section="liga" title="NBA en perspectiva" />;
}
