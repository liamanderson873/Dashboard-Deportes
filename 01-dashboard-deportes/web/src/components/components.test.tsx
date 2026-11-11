import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { StandingRow } from "@/lib/standings";
import { EmptyState } from "./EmptyState";
import { FormDots } from "./FormDots";
import { LeagueNav } from "./LeagueNav";
import { PointsBar } from "./PointsBar";
import { SeasonNav } from "./SeasonNav";
import { StandingsTable } from "./StandingsTable";
import { TeamCrest } from "./TeamCrest";

function row(position: number, over: Partial<StandingRow> = {}): StandingRow {
  return {
    position,
    teamId: position,
    team: `Equipo ${position}`,
    shortName: `Eq${position}`,
    tla: `E${String(position).padStart(2, "0")}`,
    crest: `https://crests.football-data.org/${position}.png`,
    played: 10,
    won: 5,
    drawn: 3,
    lost: 2,
    goalsFor: 15,
    goalsAgainst: 10,
    goalDifference: 5,
    points: 40 - position,
    form: ["W", "D", "L", "W", "W"],
    ...over,
  };
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));

describe("components", () => {
  test("test_form_dots_has_spanish_aria_label_and_letters", () => {
    const html = renderToStaticMarkup(<FormDots form={["W", "D", "L"]} />);
    expect(html).toContain('role="img"');
    expect(html).toContain("victoria");
    expect(html).toMatch(/>V</);
    expect(html).toMatch(/>E</);
    expect(html).toMatch(/>D</);
  });

  test("test_team_crest_without_url_shows_the_abbreviation", () => {
    const html = renderToStaticMarkup(
      <TeamCrest crest={null} tla="RMA" size={28} />,
    );
    expect(html).toContain("RMA");
    expect(html).not.toContain("<img");
  });

  test("test_standings_table_has_caption_headers_and_one_row_per_team", () => {
    const html = renderToStaticMarkup(<StandingsTable rows={rows(3)} />);
    expect(html).toContain("<caption");
    expect(html).toContain("sr-only");
    for (const h of ["#", "Equipo", "PJ", "DG", "Forma", "Puntos"]) {
      expect(html).toContain(`>${h}<`);
    }
    const body = html.slice(html.indexOf("<tbody>"));
    expect(body.match(/<tr/g)).toHaveLength(3);
  });

  test("test_standings_table_marks_zones_in_big_tables", () => {
    const html = renderToStaticMarkup(<StandingsTable rows={rows(20)} />);
    expect(html.match(/data-zone="top"/g)).toHaveLength(4);
    expect(html.match(/data-zone="bottom"/g)).toHaveLength(3);
  });

  test("standings_table_renders_rows_with_null_names_and_crest", () => {
    const html = renderToStaticMarkup(
      <StandingsTable
        rows={[
          row(1, {
            shortName: null as unknown as string,
            tla: null,
            crest: null,
          }),
        ]}
      />,
    );
    expect(html).toContain("Equipo 1");
  });

  test("test_league_nav_marks_only_the_active_league", () => {
    const html = renderToStaticMarkup(
      <LeagueNav activeSlug="pl" season={2024} />,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('href="/pl/2024"');
    expect(html).toContain('href="/pd/2024"');
  });

  test("test_season_nav_labels_seasons_as_start_dash_end", () => {
    const html = renderToStaticMarkup(
      <SeasonNav slug="pd" seasons={[2024, 2023]} active={2024} />,
    );
    expect(html).toContain("2024-25");
    expect(html).toContain("2023-24");
    expect(html).toContain('href="/pd/2023"');
  });

  test("test_points_bar_width_is_proportional_to_the_leader", () => {
    const html = renderToStaticMarkup(<PointsBar points={50} max={100} />);
    expect(html).toContain("width:50%");
    expect(html).toContain(">50<");
  });

  test("empty_state_renders_title", () => {
    expect(renderToStaticMarkup(<EmptyState title="Vacío" />)).toContain(
      "Vacío",
    );
  });
});
