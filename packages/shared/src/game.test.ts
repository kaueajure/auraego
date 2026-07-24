import { describe, expect, it } from "vitest";
import { applyInput, botDecision, collectAuraOrb, createGame, generateEvents, mmrDelta } from "./game.js";
import { rankForAura } from "./contracts.js";

const activeGame = () => {
  const game = createGame(67, [{ id: "p1", username: "Aura" }, { id: "p2", username: "Ego" }], 0);
  game.phase = "ROUND_ACTIVE";
  return game;
};

describe("authoritative game rules", () => {
  it("accepts a fast 6 then 7 pair as farming progress", () => {
    const g = activeGame();
    applyInput(g, { playerId: "p1", input: "SIX", sequence: 1, clientTimestamp: 1200 }, 1200);
    const result = applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 2, clientTimestamp: 1320 }, 1320);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("FARM_PROGRESS");
    expect(g.players.p1!.successfulActions).toBe(1);
    expect(g.players.p1!.combo).toBe(1);
  });
  it("rejects inverted order and duplicate packets", () => {
    const g = activeGame();
    expect(applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 1, clientTimestamp: 1200 }, 1200).evaluation).toBe("ERROU");
    expect(applyInput(g, { playerId: "p1", input: "SIX", sequence: 1, clientTimestamp: 1300 }, 1300).accepted).toBe(false);
  });
  it("rewards sustained rapid alternation instead of punishing it as spam", () => {
    const g = activeGame();
    for (let i = 1; i <= 20; i++) applyInput(g, { playerId: "p1", input: i % 2 ? "SIX" : "SEVEN", sequence: i, clientTimestamp: 1000 + i * 60 }, 1000 + i * 60);
    expect(g.players.p1!.aura).toBe(300);
    expect(g.players.p1!.ego).toBe(2);
    expect(g.players.p1!.spamViolations).toBe(0);
  });
  it("farms continuously even when there is no arena event", () => {
    const g = activeGame();
    applyInput(g, { playerId: "p1", input: "SIX", sequence: 1, clientTimestamp: 1200 }, 1200);
    const result = applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 2, clientTimestamp: 1300 }, 1300);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("FARM_PROGRESS");
  });
  it("converts sustained pairs into slowly rising aura and ego", () => {
    const g = activeGame();
    for (let pair = 0; pair < 15; pair++) {
      const start = 1000 + pair * 160;
      applyInput(g, { playerId: "p1", input: "SIX", sequence: pair * 2 + 1, clientTimestamp: start }, start);
      applyInput(g, { playerId: "p1", input: "SEVEN", sequence: pair * 2 + 2, clientTimestamp: start + 80 }, start + 80);
    }
    expect(g.players.p1!.aura).toBe(500);
    expect(g.players.p1!.ego).toBe(3);
    expect(g.players.p1!.aura % 100).toBe(0);
  });
  it("rejects physically impossible input without punishing legitimate speed", () => {
    const g = activeGame();
    applyInput(g, { playerId: "p1", input: "SIX", sequence: 1, clientTimestamp: 1200 }, 1200);
    const result = applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 2, clientTimestamp: 1210 }, 1210);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("IMPOSSIBLE_SPEED");
  });
  it("generates identical event timelines for a seed", () => expect(generateEvents(67, 100)).toEqual(generateEvents(67, 100)));
  it("keeps every bot human-delayed and fallible", () => {
    const event = generateEvents(3, 0, 1)[0]!;
    expect(botDecision(event, "INSANO", 9).delay).toBeGreaterThanOrEqual(190);
    expect(botDecision(event, "INICIANTE", 9).delay).toBeGreaterThanOrEqual(620);
  });
  it("uses opponent rating in MMR and penalizes abandonment", () => expect(mmrDelta(1000, 1200, 1)).toBeGreaterThan(mmrDelta(1000, 1200, 1, true)));
  it("maps patent from total aura with ×100 thresholds", () => {
    expect(rankForAura(0)).toBe("SEM_PRESENCA");
    expect(rankForAura(94_999)).toBe("SEM_PRESENCA");
    expect(rankForAura(95_000)).toBe("EGO_FRAGIL");
    expect(rankForAura(145_000)).toBe("SIX_SEVEN_CERTIFICADO");
    expect(rankForAura(190_000)).toBe("AURA_LENDARIA");
  });
  it("multiplies aura farm when a gigachad orb is collected", () => {
    const g = activeGame();
    const player = g.players.p1!;
    for (let pair = 0; pair < 50; pair++) {
      const start = 1000 + pair * 160;
      applyInput(g, { playerId: "p1", input: "SIX", sequence: pair * 2 + 1, clientTimestamp: start }, start);
      applyInput(g, { playerId: "p1", input: "SEVEN", sequence: pair * 2 + 2, clientTimestamp: start + 80 }, start + 80);
    }
    expect(player.combo).toBe(50);
    expect(collectAuraOrb(player)).toEqual({ accepted: true, multiplier: 1.1 });
    const start = 1000 + 50 * 160;
    applyInput(g, { playerId: "p1", input: "SIX", sequence: 101, clientTimestamp: start }, start);
    const tick = applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 102, clientTimestamp: start + 80 }, start + 80);
    expect(tick.auraDelta).toBe(110);
  });

  it("allows another orb after combo breaks and rebuilds to 50", () => {
    const g = activeGame();
    const player = g.players.p1!;
    for (let pair = 0; pair < 50; pair++) {
      const start = 1000 + pair * 160;
      applyInput(g, { playerId: "p1", input: "SIX", sequence: pair * 2 + 1, clientTimestamp: start }, start);
      applyInput(g, { playerId: "p1", input: "SEVEN", sequence: pair * 2 + 2, clientTimestamp: start + 80 }, start + 80);
    }
    expect(collectAuraOrb(player).accepted).toBe(true);
    applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 101, clientTimestamp: 9000 }, 9000);
    expect(player.combo).toBe(0);
    expect(player.orbClaims).toBe(0);
    expect(player.multiplier).toBe(1);
    for (let pair = 0; pair < 50; pair++) {
      const start = 10_000 + pair * 160;
      applyInput(g, { playerId: "p1", input: "SIX", sequence: 200 + pair * 2 + 1, clientTimestamp: start }, start);
      applyInput(g, { playerId: "p1", input: "SEVEN", sequence: 200 + pair * 2 + 2, clientTimestamp: start + 80 }, start + 80);
    }
    expect(collectAuraOrb(player)).toEqual({ accepted: true, multiplier: 1.1 });
  });
});
