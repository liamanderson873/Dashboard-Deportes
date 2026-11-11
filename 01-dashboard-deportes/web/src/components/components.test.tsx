import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { StandingRow } from "@/lib/standings";
import { EmptyState } from "./EmptyState";
import { FormDots } from "./FormDots";
import type { MatchRow } from "@/lib/matches";
import { LeagueNav } from "./LeagueNav";
import { MatchdayNav } from "./MatchdayNav";
import { MatchList } from "./MatchList";
import { PointsBar } from "./PointsBar";
import { SectionNav } from "./SectionNav";
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

function matchRow(id: number, over: Partial<MatchRow> = {}): MatchRow {
  const t = (n: number) => ({
    id: n,
    name: `Equipo ${n}`,
    shortName: `Eq${n}`,
    tla: null,
    crest: null,
  });
  return {
    id,
    matchday: 1,
    utcDate: new Date("2024-08-17T19:30:00Z"),
    status: "FINISHED",
    home: t(1),
    away: t(2),
    homeGoals: 2,
    awayGoals: 1,
    homeHtGoals: null,
    awayHtGoals: null,
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
    expect(html.match(/>D</g)).toHaveLength(1);
  });

  test("test_team_crest_without_url_shows_the_abbreviation", () => {
    const html = renderToStaticMarkup(
      <TeamCrest crest={null} tla="RMA" size={28} />,
    );
    expect(html).toContain("RMA");
    expect(html).not.toContain("<img");
  });

  test("test_standings_table_has_caption_headers_and_one_row_per_team", () => {
    const html = renderToStaticMarkup(<StandingsTable slug="pd" season={2024} rows={rows(3)} />);
    expect(html).toContain("<caption");
    expect(html).toContain("sr-only");
    for (const h of ["#", "Equipo", "PJ", "DG", "Forma", "Puntos"]) {
      expect(html).toContain(`>${h}<`);
    }
    const body = html.slice(html.indexOf("<tbody>"));
    expect(body.match(/<tr/g)).toHaveLength(3);
  });

  test("test_standings_table_marks_zones_in_big_tables", () => {
    const html = renderToStaticMarkup(<StandingsTable slug="pd" season={2024} rows={rows(20)} />);
    expect(html.match(/data-zone="top"/g)).toHaveLength(4);
    expect(html.match(/data-zone="bottom"/g)).toHaveLength(3);
  });

  test("standings_table_renders_rows_with_null_names_and_crest", () => {
    const html = renderToStaticMarkup(
      <StandingsTable
        slug="pd"
        season={2024}
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
      <LeagueNav
        activeSlug="pl"
        season={2024}
        seasonsByCompetition={{ PD: [2024], PL: [2024], SA: [2024], BL1: [2024], FL1: [2024] }}
      />,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('href="/pl/2024"');
    expect(html).toContain('href="/pd/2024"');
  });

  test("test_league_nav_links_to_latest_season_and_disables_leagues_without_data", () => {
    const html = renderToStaticMarkup(
      <LeagueNav
        activeSlug="pd"
        season={2024}
        seasonsByCompetition={{ PD: [2024, 2023], PL: [2023, 2022] }}
      />,
    );
    expect(html).toContain('href="/pd/2024"');
    expect(html).toContain('href="/pl/2023"');
    expect(html).not.toContain('href="/sa/');
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(3);
    expect(html).toContain("sin datos");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
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

  test("points_bar_with_zero_max_has_no_nan_and_zero_width", () => {
    const html = renderToStaticMarkup(<PointsBar points={0} max={0} />);
    expect(html).not.toContain("NaN");
    expect(html).toContain("width:0%");
  });

  test("season_nav_marks_only_the_active_season", () => {
    const html = renderToStaticMarkup(
      <SeasonNav slug="pd" seasons={[2024, 2023]} active={2023} />,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  test("empty_state_renders_title", () => {
    expect(renderToStaticMarkup(<EmptyState title="Vacío" />)).toContain(
      "Vacío",
    );
  });

  test("test_section_nav_marks_only_the_active_section", () => {
    const html = renderToStaticMarkup(
      <SectionNav slug="pd" season={2024} active="resultados" />,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('href="/pd/2024/resultados"');
    expect(html).toContain('href="/pd/2024"');
    expect(html).toContain('href="/pd/2024/goleadores"');
    expect(html).toContain('href="/pd/2024/comparar"');
    expect(html).toMatch(/aria-current="page"[^>]*>Resultados</);
  });

  test("test_section_nav_without_active_section_has_no_aria_current", () => {
    const html = renderToStaticMarkup(
      <SectionNav slug="pd" season={2024} active={null} />,
    );
    expect(html).not.toContain("aria-current");
  });

  test("test_league_and_season_nav_keep_the_section", () => {
    const leagues = renderToStaticMarkup(
      <LeagueNav
        activeSlug="pd"
        season={2024}
        section="goleadores"
        seasonsByCompetition={{ PD: [2024], PL: [2024] }}
      />,
    );
    expect(leagues).toContain('href="/pl/2024/goleadores"');
    const seasons = renderToStaticMarkup(
      <SeasonNav slug="pd" seasons={[2024, 2023]} active={2024} section="goleadores" />,
    );
    expect(seasons).toContain('href="/pd/2023/goleadores"');
  });

  test("test_standings_table_links_each_team_to_its_page", () => {
    const html = renderToStaticMarkup(
      <StandingsTable slug="pd" season={2024} rows={rows(2)} />,
    );
    expect(html).toContain('href="/pd/2024/equipo/1"');
    expect(html).toContain('href="/pd/2024/equipo/2"');
  });

  test("test_empty_state_level_one_renders_h1", () => {
    expect(renderToStaticMarkup(<EmptyState title="T" level={1} />)).toContain("<h1");
    expect(renderToStaticMarkup(<EmptyState title="T" />)).toContain("<h2");
  });

  test("test_match_list_shows_score_for_played_and_time_for_pending", () => {
    const html = renderToStaticMarkup(
      <MatchList
        slug="pd"
        season={2024}
        matches={[
          matchRow(1, { homeHtGoals: 1, awayHtGoals: 0 }),
          matchRow(2, { status: "TIMED", homeGoals: null, awayGoals: null }),
        ]}
      />,
    );
    expect(html).toContain("2 - 1");
    expect(html).toContain("(1-0)");
    expect(html).toContain("21:30");
    expect(html).toContain("sáb, 17 ago 2024");
    expect(html).toContain('href="/pd/2024/equipo/1"');
    expect(html).toContain("<h2");
  });

  test("test_match_list_shows_status_label_for_postponed", () => {
    const html = renderToStaticMarkup(
      <MatchList
        slug="pd"
        season={2024}
        matches={[matchRow(1, { status: "POSTPONED", homeGoals: null, awayGoals: null })]}
      />,
    );
    expect(html).toContain("Aplazado");
    expect(html).not.toContain("0 - 0");
  });

  test("test_matchday_nav_marks_active_and_links_previous_and_next", () => {
    const days = [1, 2, 3].map((matchday) => ({ matchday, total: 10, played: 10 }));
    const html = renderToStaticMarkup(
      <MatchdayNav slug="pd" season={2024} days={days} active={2} />,
    );
    expect(html).toContain('href="/pd/2024/resultados/1"');
    expect(html).toContain('href="/pd/2024/resultados/3"');
    expect(html).toContain("Jornada anterior");
    expect(html).toContain("Jornada siguiente");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    const first = renderToStaticMarkup(
      <MatchdayNav slug="pd" season={2024} days={days} active={1} />,
    );
    expect(first).not.toContain("Jornada anterior");
  });
});
