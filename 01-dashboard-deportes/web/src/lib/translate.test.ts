import { describe, expect, test } from "vitest";
import {
  CLUB_COLORS_ES,
  NATIONALITIES_ES,
  clubColorsLabel,
  nationalityLabel,
  positionLabel,
} from "@/lib/translate";

const NATIONALITIES = [
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Belgium",
  "Benin",
  "Bosnia-Herzegovina",
  "Brazil",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cameroon",
  "Canada",
  "Cape Verde Islands",
  "Central African Republic",
  "Chile",
  "China PR",
  "Colombia",
  "Comoros",
  "Congo",
  "Congo DR",
  "Costa Rica",
  "Croatia",
  "Curaçao",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Dominican Republic",
  "DR Congo",
  "Ecuador",
  "Egypt",
  "England",
  "Equatorial Guinea",
  "Estonia",
  "Faeroe Islands",
  "Finland",
  "France",
  "French Guiana",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Guadeloupe",
  "Guinea",
  "Guinea-Bissau",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "Indonesia",
  "Iran",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kenya",
  "Korea, South",
  "Kosovo",
  "Latvia",
  "Libya",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malaysia",
  "Mali",
  "Malta",
  "Martinique",
  "Mauritania",
  "Mexico",
  "Moldova",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Netherlands",
  "New Zealand",
  "Niger",
  "Nigeria",
  "Northern Ireland",
  "North Macedonia",
  "Norway",
  "Panama",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Republic of Ireland",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "Scotland",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Slovakia",
  "Slovenia",
  "South Africa",
  "South Korea",
  "Spain",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Tanzania",
  "Thailand",
  "Togo",
  "Trinidad & Tobago",
  "Tunisia",
  "Turkey",
  "UA Emirates",
  "Ukraine",
  "United States",
  "Uruguay",
  "USA",
  "Uzbekistan",
  "Venezuela",
  "Wales",
  "Zambia",
  "Zimbabwe",
];

const COLOURS = [
  "Black",
  "Blue",
  "Brown",
  "Claret",
  "Crimson",
  "Cyan",
  "Gold",
  "Green",
  "Grey",
  "Maroon",
  "Navy Blue",
  "Orange",
  "Purple",
  "Red",
  "Royal Blue",
  "Sky Blue",
  "Violet",
  "White",
  "Yellow",
];

const POSITIONS: [string, string][] = [
  ["Goalkeeper", "Portero"],
  ["Centre-Back", "Central"],
  ["Left-Back", "Lateral izquierdo"],
  ["Right-Back", "Lateral derecho"],
  ["Defence", "Defensa"],
  ["Defensive Midfield", "Mediocentro defensivo"],
  ["Central Midfield", "Mediocentro"],
  ["Attacking Midfield", "Mediapunta"],
  ["Left Midfield", "Interior izquierdo"],
  ["Right Midfield", "Interior derecho"],
  ["Midfield", "Centrocampista"],
  ["Left Winger", "Extremo izquierdo"],
  ["Right Winger", "Extremo derecho"],
  ["Centre-Forward", "Delantero centro"],
  ["Offence", "Delantero"],
];

describe("positionLabel", () => {
  test("test_position_label_translates_the_15_known_values", () => {
    for (const [en, es] of POSITIONS) expect(positionLabel(en)).toBe(es);
  });

  test("test_position_label_null_stays_null", () => {
    expect(positionLabel(null)).toBeNull();
  });

  test("test_position_label_unknown_uses_group_singular_or_raw", () => {
    expect(positionLabel("Sweeper Back")).toBe("Defensa");
    expect(positionLabel("Second Forward")).toBe("Delantero");
    expect(positionLabel("Mystery")).toBe("Mystery");
  });
});

describe("nationalityLabel", () => {
  test("test_every_real_nationality_has_a_map_entry", () => {
    for (const n of NATIONALITIES) expect(NATIONALITIES_ES).toHaveProperty([n]);
    expect(NATIONALITIES).toHaveLength(128);
  });

  test("test_nationality_label_examples", () => {
    expect(nationalityLabel("Spain")).toBe("España");
    expect(nationalityLabel("England")).toBe("Inglaterra");
    expect(nationalityLabel("Ivory Coast")).toBe("Costa de Marfil");
    expect(nationalityLabel("South Korea")).toBe("Corea del Sur");
    expect(nationalityLabel("Congo DR")).toBe("R. D. del Congo");
    expect(nationalityLabel(null)).toBeNull();
    expect(nationalityLabel("Atlantis")).toBe("Atlantis");
  });
});

describe("clubColorsLabel", () => {
  test("test_every_real_colour_has_a_map_entry", () => {
    for (const c of COLOURS) expect(CLUB_COLORS_ES).toHaveProperty([c]);
  });

  test("test_club_colors_label_splits_translates_and_joins", () => {
    expect(clubColorsLabel("Red / Navy Blue")).toBe("Rojo / Azul marino");
    expect(clubColorsLabel("Claret/Sky Blue")).toBe("Granate / Celeste");
    expect(clubColorsLabel("Red / Mauve")).toBe("Rojo / Mauve");
    expect(clubColorsLabel(null)).toBeNull();
  });
});
