// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAgent } from "@ui-sdk/react/agent";
import { ExploreNav } from "./ExploreNav";
import { PageTrail } from "./PageTrail";

vi.mock("next/navigation", () => ({
  usePathname: () => "/nba/2026/jugador/201939",
}));
vi.mock("next/link", () => ({
  default: ({
    prefetch: _prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    prefetch?: boolean;
  }) => {
    void _prefetch;
    return <a {...props} />;
  },
}));
const agent = createAgent();
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollIntoView = function () {};
  Element.prototype.checkVisibility = () => true;
  document.elementFromPoint = () => null;
  document.elementsFromPoint = () => [];
  document.head.append(
    Object.assign(document.createElement("style"), {
      textContent: "[popover] { display: block !important }",
    }),
  );
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(cleanup);

it("opens the NBA tools, searches without accents and offers contextual links", async () => {
  const user = userEvent.setup();
  render(<ExploreNav sport="nba" />);
  await user.click(screen.getByRole("button", { name: "Explorar" }));
  await screen.findByRole("dialog", { name: "Explora la NBA" });
  expect(
    screen
      .getByRole("link", { name: /Mapa de jugadores/ })
      .getAttribute("href"),
  ).toBe("/nba/2026/jugadores?tab=chart");
  await user.type(screen.getByLabelText("Buscar un apartado"), "simulador");
  expect(
    screen.getByRole("link", { name: /Simulador y modelos/ }),
  ).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Mapa de jugadores/ })).toBeNull();
  await user.clear(screen.getByLabelText("Buscar un apartado"));
  await user.type(screen.getByLabelText("Buscar un apartado"), "clasificacion");
  expect(
    screen.getByRole("link", { name: /Clasificación y equipos/ }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Cerrar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("exposes the named explorer to the UI SDK agent", async () => {
  render(<ExploreNav sport="football" />);
  const entry = agent.snapshot().find((item) => item.label === "Explorar");
  expect(entry).toBeTruthy();
  const result = await agent.act({
    steps: [{ ref: entry!.ref, action: "press", args: [] }],
  });
  expect(result.ok, result.error?.message).toBe(true);
  await screen.findByRole("dialog", { name: "Explora el fútbol" });
  expect(
    screen
      .getByRole("link", { name: /Comparar jugadores/ })
      .getAttribute("href"),
  ).toBe("/pd/2026/jugadores?tab=comparar");
});

it("shows a route back to players and marks only the current profile", () => {
  render(
    <PageTrail
      base="/nba/2026"
      sport="NBA"
      league="NBA · 2026-27"
      title="Stephen Curry"
      section="Jugadores"
      sectionPath="/jugadores"
    />,
  );
  expect(
    screen.getByRole("link", { name: "Jugadores" }).getAttribute("href"),
  ).toBe("/nba/2026/jugadores");
  expect(screen.getByText("Stephen Curry").getAttribute("aria-current")).toBe(
    "page",
  );
  expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
});
