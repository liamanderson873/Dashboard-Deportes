import { renderToStaticMarkup } from "react-dom/server";
import type { Series } from "@/lib/chart";
import { LineChart } from "./LineChart";
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
import { ScorersTable } from "./ScorersTable";
import type { ScorerRow } from "@/lib/queries/scorers";
import { SeasonNav } from "./SeasonNav";
import { StandingsTable } from "./StandingsTable";
import { TeamCrest } from "./TeamCrest";
import { TeamHeader } from "./TeamHeader";
import { StatGrid } from "./StatGrid";
import { SquadList } from "./SquadList";
import { TeamMatchList } from "./TeamMatchList";
import { TeamSeasonsTable } from "./TeamSeasonsTable";
import { CompareForm } from "./CompareForm";
import { CompareTable } from "./CompareTable";
import { toTeamMatches } from "@/lib/team";
import type { SquadPlayer, TeamProfile } from "@/lib/queries/team";

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
    expect(html).toContain("Sáb, 17 ago 2024");
    expect(html).toContain('href="/pd/2024/equipo/1"');
    expect(html).toContain("<h2");
  });

  test("test_match_list_heading_level_and_capitalised_day_and_sr_score", () => {
    const m = [matchRow(1)];
    const h2 = renderToStaticMarkup(<MatchList slug="pd" season={2024} matches={m} />);
    expect(h2).toContain("<h2");
    expect(h2).toContain(">Sáb, 17 ago 2024<");
    expect(h2).not.toContain("capitalize");
    expect(h2).toContain("Eq1 2, Eq2 1");
    const h3 = renderToStaticMarkup(
      <MatchList slug="pd" season={2024} matches={m} headingLevel={3} />,
    );
    expect(h3).toContain("<h3");
    expect(h3).not.toContain("<h2");
  });

  test("test_match_list_scheduled_shows_time_to_be_confirmed", () => {
    const html = renderToStaticMarkup(
      <MatchList
        slug="pd"
        season={2024}
        matches={[matchRow(1, { status: "SCHEDULED", homeGoals: null, awayGoals: null })]}
      />,
    );
    expect(html).toContain("Hora por confirmar");
    expect(html).not.toContain("21:30");
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

function scorer(rank: number, over: Partial<ScorerRow> = {}): ScorerRow {
  return {
    rank,
    playerId: rank,
    player: `Jugador ${rank}`,
    position: null,
    nationality: null,
    team: { id: 7, name: "Equipo 7", shortName: "Eq7", tla: null, crest: null },
    goals: 10 - rank,
    assists: 3,
    penalties: 1,
    playedMatches: 20,
    ...over,
  };
}

describe("ScorersTable", () => {
  test("test_scorers_table_shows_dash_for_missing_values", () => {
    const html = renderToStaticMarkup(
      <ScorersTable
        slug="pd"
        season={2024}
        rows={[scorer(1, { assists: null, penalties: null, playedMatches: null, team: null })]}
      />,
    );
    expect((html.match(/—/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
  });

  test("test_scorers_table_links_team", () => {
    const html = renderToStaticMarkup(
      <ScorersTable slug="pd" season={2024} rows={[scorer(1)]} />,
    );
    expect(html).toContain('href="/pd/2024/equipo/7"');
    expect(html).toContain("Eq7");
  });
});

describe("team components", () => {
  const profile: TeamProfile = {
    id: 1,
    name: "Equipo Uno",
    shortName: "Eq1",
    tla: "EQ1",
    crest: null,
    founded: 1902,
    venue: "Estadio Uno",
    clubColors: null,
    website: null,
    coach: "Ana Gómez",
  };

  test("test_team_header_labels_coach_as_current_and_omits_missing_fields", () => {
    const html = renderToStaticMarkup(<TeamHeader profile={profile} />);
    expect(html).toContain("Entrenador actual");
    expect(html).toContain("Ana Gómez");
    expect(html).toContain("Estadio Uno");
    expect(html).toContain("1902");
    expect(html).not.toContain("Colores");
    expect(html).not.toContain("<h1");
  });

  test("test_stat_grid_renders_value_and_hint", () => {
    const html = renderToStaticMarkup(
      <StatGrid
        items={[
          { label: "xG a favor", value: "1,50", hint: "por partido" },
          { label: "Córners", value: "No disponible" },
        ]}
      />,
    );
    expect(html).toContain("xG a favor");
    expect(html).toContain("1,50");
    expect(html).toContain("por partido");
    expect(html).toContain("No disponible");
  });

  const player = (id: number, over: Partial<SquadPlayer> = {}): SquadPlayer => ({
    id,
    name: `Jugador ${id}`,
    position: "Goalkeeper",
    nationality: "España",
    dateOfBirth: new Date("2000-06-15T00:00:00Z"),
    ...over,
  });

  test("test_squad_list_groups_by_position_and_shows_dash_for_missing", () => {
    const html = renderToStaticMarkup(
      <SquadList
        on={new Date("2025-01-01T00:00:00Z")}
        players={[
          player(1),
          player(2, { position: "Centre-Back" }),
          player(3, { position: "Central Midfield", nationality: null, dateOfBirth: null }),
          player(4, { position: "Centre-Forward" }),
        ]}
      />,
    );
    for (const g of ["Porteros", "Defensas", "Centrocampistas", "Delanteros"]) {
      expect(html).toContain(`>${g}</h3>`);
    }
    expect(html).toContain("24");
    expect(html).toContain("España");
    expect(html).toContain("—");
  });

  test("test_squad_list_hides_unknown_group_when_empty", () => {
    const html = renderToStaticMarkup(
      <SquadList on={new Date("2025-01-01T00:00:00Z")} players={[player(1)]} />,
    );
    expect(html).not.toContain("Sin posición");
    const withUnknown = renderToStaticMarkup(
      <SquadList
        on={new Date("2025-01-01T00:00:00Z")}
        players={[player(1, { position: null })]}
      />,
    );
    expect(withUnknown).toContain("Sin posición");
  });

  test("test_team_match_list_shows_result_letter_for_played_and_status_for_pending", () => {
    const tm = toTeamMatches(
      [
        matchRow(1),
        matchRow(2, { status: "POSTPONED", homeGoals: null, awayGoals: null }),
      ],
      1,
    );
    const html = renderToStaticMarkup(
      <TeamMatchList slug="pd" season={2024} matches={tm} />,
    );
    expect(html).toContain("2 - 1");
    expect(html).toContain(">V<");
    expect(html).toContain("victoria");
    expect(html).toContain("Aplazado");
    expect(html).toContain('href="/pd/2024/equipo/2"');
    expect(html).toContain("vs");
  });

  test("test_team_match_list_pending_group_scheduled_tbd_and_awarded_label", () => {
    const tm = toTeamMatches(
      [
        matchRow(1, { status: "AWARDED" }),
        matchRow(2, { status: "SCHEDULED", homeGoals: null, awayGoals: null }),
      ],
      1,
    );
    const html = renderToStaticMarkup(
      <TeamMatchList slug="pd" season={2024} matches={tm} />,
    );
    expect(html).toContain("Pendientes");
    expect(html).not.toContain("Próximos");
    expect(html).toContain("Hora por confirmar");
    expect(html).toContain("Resuelto en los despachos");
  });

  test("test_season_nav_uses_custom_href", () => {
    const html = renderToStaticMarkup(
      <SeasonNav
        slug="pd"
        seasons={[2024, 2023]}
        active={2024}
        hrefFor={(s) => `/pd/${s}/equipo/9`}
      />,
    );
    expect(html).toContain('href="/pd/2023/equipo/9"');
    expect(html).not.toContain('href="/pd/2023"');
  });
});

describe("LineChart", () => {
  const series: Series[] = [
    {
      id: "2024",
      label: "2024/25",
      highlight: true,
      points: [
        { x: 1, y: 3 },
        { x: 2, y: 4 },
      ],
    },
    {
      id: "2023",
      label: "2023/24",
      highlight: false,
      points: [
        { x: 1, y: 0 },
        { x: 2, y: 3 },
      ],
    },
  ];
  const render = () =>
    renderToStaticMarkup(
      <LineChart series={series} ariaLabel="Evolución" xLabel="Partido" yLabel="Puntos" />,
    );

  test("test_line_chart_has_role_img_label_and_one_path_per_series", () => {
    const html = render();
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Evolución"');
    expect(html.match(/data-series="/g)).toHaveLength(2);
    expect(html).toContain("Partido");
    expect(html).toContain("Puntos");
  });

  test("test_line_chart_single_point_series_renders_a_marker", () => {
    const html = renderToStaticMarkup(
      <LineChart
        series={[{ id: "2024", label: "2024/25", highlight: true, points: [{ x: 1, y: 3 }] }]}
        ariaLabel="Evolución"
        xLabel="Partido"
        yLabel="Puntos"
      />,
    );
    expect(html).toContain("<circle");
  });

  test("test_line_chart_legend_names_every_series", () => {
    const html = render();
    expect(html).toContain("2024/25");
    expect(html).toContain("2023/24");
    expect(html).toContain("temporada mostrada");
    expect(html.match(/temporada mostrada/g)).toHaveLength(1);
  });
});

describe("comparator components", () => {
  const teams = [
    { id: 1, name: "Alfa" },
    { id: 2, name: "Beta" },
    { id: 3, name: "Gamma" },
  ];

  test("test_compare_form_has_labels_selects_and_preselected_values", () => {
    const html = renderToStaticMarkup(
      <CompareForm slug="pd" season={2024} teams={teams} a={1} b={null} />,
    );
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/pd/2024/comparar"');
    expect(html).toContain('name="a"');
    expect(html).toContain('name="b"');
    expect(html.match(/<label/g)).toHaveLength(2);
    expect(html).toContain("Elige un equipo");
    expect(html).toMatch(/<option value="1" selected="">Alfa<\/option>/);
    expect(html).toMatch(/<option value="" selected="">Elige un equipo/);
    expect(html.match(/selected=""/g)).toHaveLength(2);
    expect(html).toContain(">Comparar<");
  });

  test("test_compare_table_marks_better_side_for_screen_readers", () => {
    const html = renderToStaticMarkup(
      <CompareTable
        a={row(1)}
        b={row(2)}
        rows={[
          { label: "Puntos", a: "30", b: "20", better: "a" },
          { label: "Faltas por partido", a: "10,00", b: "10,00", better: null },
        ]}
      />,
    );
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html.match(/sr-only">mejor</g)).toHaveLength(1);
    expect(html).toMatch(/font-bold[^>]*>30/);
  });
});

describe("Spanish data and current season row", () => {
  test("test_scorers_table_translates_position", () => {
    const html = renderToStaticMarkup(
      <ScorersTable slug="pd" season={2024} rows={[scorer(1, { position: "Centre-Forward" })]} />,
    );
    expect(html).toContain("Delantero centro");
    expect(html).not.toContain("Centre-Forward");
  });

  test("test_squad_list_translates_nationality", () => {
    const html = renderToStaticMarkup(
      <SquadList
        on={new Date("2024-09-01T00:00:00Z")}
        players={[
          {
            id: 1,
            name: "J",
            position: "Goalkeeper",
            nationality: "Ivory Coast",
            dateOfBirth: null,
          },
        ]}
      />,
    );
    expect(html).toContain("Costa de Marfil");
  });

  test("test_team_header_translates_club_colours", () => {
    const html = renderToStaticMarkup(
      <TeamHeader
        profile={{
          id: 1,
          name: "E",
          shortName: "E",
          tla: null,
          crest: null,
          founded: null,
          venue: null,
          clubColors: "Red / Navy Blue",
          website: null,
          coach: null,
        }}
      />,
    );
    expect(html).toContain("Rojo / Azul marino");
  });

  test("test_team_seasons_table_current_row_has_sr_only_text", () => {
    const row = (season: number, current: boolean) => ({
      season,
      label: `${season}/${season + 1}`,
      href: `/pd/${season}/equipo/1`,
      current,
      position: 1,
      played: 38,
      points: 80,
      goalsFor: 70,
      goalsAgainst: 30,
    });
    const html = renderToStaticMarkup(
      <TeamSeasonsTable rows={[row(2024, true), row(2023, false)]} />,
    );
    expect(html.match(/\(temporada mostrada\)/g)).toHaveLength(1);
  });
});
