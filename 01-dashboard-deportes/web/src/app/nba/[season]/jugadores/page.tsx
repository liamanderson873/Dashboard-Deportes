import { NbaPage } from "@/components/NbaPage";
export const dynamic = "force-dynamic";
export const metadata = { title: "Jugadores NBA · Marcador" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ season: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const initial = Object.fromEntries(
    Object.entries(search).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  return (
    <NbaPage
      params={params}
      section="jugadores"
      title="Jugadores NBA"
      initial={initial}
    />
  );
}
