import { beforeEach, describe, expect, it } from "vitest";
import { useGame } from "./store";

describe("game client store", () => {
  beforeEach(() => useGame.getState().reset());
  it("keeps input sequences strictly increasing", () => {
    expect(useGame.getState().nextSequence()).toBe(1);
    expect(useGame.getState().nextSequence()).toBe(2);
  });
  it("clears transient match state without changing selected difficulty", () => {
    useGame.getState().setDifficulty("DIFICIL");
    useGame.getState().setRoom("room-67");
    useGame.getState().reset();
    expect(useGame.getState().roomId).toBeNull();
    expect(useGame.getState().difficulty).toBe("DIFICIL");
  });
});
