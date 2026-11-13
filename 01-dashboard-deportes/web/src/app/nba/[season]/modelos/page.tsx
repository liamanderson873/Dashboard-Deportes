import { NbaPage } from "@/components/NbaPage";
export const dynamic = "force-dynamic";
export const metadata = { title: "Modelos y playoffs · Marcador" };
export default function Page({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  return (
    <NbaPage params={params} section="modelos" title="Modelos y playoffs" />
  );
}
