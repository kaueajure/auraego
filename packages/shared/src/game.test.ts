import { describe, expect, it } from "vitest";
import { applyInput, botDecision, createGame, generateEvents, mmrDelta } from "./game.js";

const activeGame = () => {
  const game = createGame(67, [{ id: "p1", username: "Aura" }, { id: "p2", username: "Ego" }], 0);
  game.phase = "ROUND_ACTIVE";
  game.currentEvent = { ...generateEvents(67, 0, 1)[0]!, startsAt: 1000, hitWindow: [0, 2000], perfectWindow: [150, 500], shouldAct: true };
  return game;
};

describe("authoritative game rules", () => {
  it("accepts a correct 6 then 7 pair", () => {
    const g = activeGame();
    applyInput(g, { playerId: "p1", input: "SIX", sequence: 1, clientTimestamp: 1200 }, 1200);
    const result = applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 2, clientTimestamp: 1430 }, 1430);
    expect(result.auraDelta).toBeGreaterThan(0);
    expect(g.players.p1!.combo).toBe(1);
  });
  it("rejects inverted order and duplicate packets", () => {
    const g = activeGame();
    expect(applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 1, clientTimestamp: 1200 }, 1200).evaluation).toBe("ERROU");
    expect(applyInput(g, { playerId: "p1", input: "SIX", sequence: 1, clientTimestamp: 1300 }, 1300).accepted).toBe(false);
  });
  it("detects spam server-side", () => {
    const g = activeGame();
    let result;
    for (let i = 1; i <= 10; i++) result = applyInput(g, { playerId: "p1", input: i % 2 ? "SIX" : "SEVEN", sequence: i, clientTimestamp: 1000 + i * 50 }, 1000 + i * 50);
    expect(result?.evaluation).toBe("FORCADO");
    expect(g.players.p1!.spamViolations).toBeGreaterThan(0);
  });
  it("generates identical event timelines for a seed", () => expect(generateEvents(67, 100)).toEqual(generateEvents(67, 100)));
  it("keeps every bot human-delayed and fallible", () => {
    const event = generateEvents(3, 0, 1)[0]!;
    expect(botDecision(event, "INSANO", 9).delay).toBeGreaterThanOrEqual(260);
    expect(botDecision(event, "INICIANTE", 9).delay).toBeGreaterThanOrEqual(900);
  });
  it("uses opponent rating in MMR and penalizes abandonment", () => expect(mmrDelta(1000, 1200, 1)).toBeGreaterThan(mmrDelta(1000, 1200, 1, true)));
});
