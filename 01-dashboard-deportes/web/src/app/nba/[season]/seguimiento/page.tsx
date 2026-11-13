import { NbaPage } from "@/components/NbaPage";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tu seguimiento NBA · Marcador" };
export default function Page({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  return (
    <NbaPage params={params} section="personal" title="Tu seguimiento NBA" />
  );
}
