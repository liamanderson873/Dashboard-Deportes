import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import { nbaSeasons } from "@/lib/queries/nba";
export const dynamic = "force-dynamic";
export default async function Page() {
  const seasons = await nbaSeasons(getSql());
  redirect(`/nba/${seasons[0] ?? new Date().getUTCFullYear()}`);
}
