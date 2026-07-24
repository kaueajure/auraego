import { create } from "zustand";
import type { GameState, ArenaEvent, BotDifficulty } from "@aura-ego/shared";

interface GameStore {
  roomId: string | null; state: GameState | null; event: ArenaEvent | null;
  status: "IDLE" | "SEARCHING" | "FOUND" | "PLAYING" | "ENDED";
  searchStartedAt: number; sequence: number; difficulty: BotDifficulty;
  setDifficulty: (value: BotDifficulty) => void;
  setRoom: (roomId: string) => void; setState: (state: GameState) => void;
  setEvent: (event: ArenaEvent | null) => void;
  setStatus: (status: GameStore["status"]) => void; nextSequence: () => number; reset: () => void;
}
export const useGame = create<GameStore>((set, get) => ({
  roomId: null, state: null, event: null, status: "IDLE",
  searchStartedAt: 0, sequence: 0, difficulty: "NORMAL",
  setDifficulty: difficulty => set({ difficulty }), setRoom: roomId => set({ roomId }),
  setState: state => set({ state }), setEvent: event => set({ event }),
  setStatus: status => set({ status, searchStartedAt: status === "SEARCHING" ? Date.now() : get().searchStartedAt }),
  nextSequence: () => { const sequence = get().sequence + 1; set({ sequence }); return sequence; },
  reset: () => set({ roomId: null, state: null, event: null, status: "IDLE", sequence: 0 })
}));
