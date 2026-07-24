export interface ControlBindings {
  six: string;
  seven: string;
}

export const CONTROLS_STORAGE_KEY = "aura-ego:controls";

export const DEFAULT_CONTROLS: ControlBindings = {
  six: "Digit6",
  seven: "Digit7"
};

/** Teclas possíveis para o desafio da bola GigaChad. */
export const ORB_CHALLENGE_CODES = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown"
] as const;

export type OrbChallengeCode = (typeof ORB_CHALLENGE_CODES)[number];

export function readControls(): ControlBindings {
  if (typeof window === "undefined") return { ...DEFAULT_CONTROLS };
  try {
    const raw = window.localStorage.getItem(CONTROLS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONTROLS };
    const parsed = JSON.parse(raw) as Partial<ControlBindings>;
    const six = typeof parsed.six === "string" && parsed.six ? parsed.six : DEFAULT_CONTROLS.six;
    const seven = typeof parsed.seven === "string" && parsed.seven ? parsed.seven : DEFAULT_CONTROLS.seven;
    if (six === seven) return { ...DEFAULT_CONTROLS };
    return { six, seven };
  } catch {
    return { ...DEFAULT_CONTROLS };
  }
}

export function writeControls(bindings: ControlBindings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(bindings));
  window.dispatchEvent(new Event("aura-ego:controls"));
}

export function labelForCode(code: string): string {
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Numpad")) return `N${code.slice(6)}`;
  switch (code) {
    case "ArrowLeft": return "←";
    case "ArrowRight": return "→";
    case "ArrowUp": return "↑";
    case "ArrowDown": return "↓";
    case "Space": return "SPC";
    case "ShiftLeft": case "ShiftRight": return "⇧";
    case "ControlLeft": case "ControlRight": return "Ctrl";
    case "AltLeft": case "AltRight": return "Alt";
    default: return code.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
}

export function randomOrbChallenge(avoid: string[] = []): [OrbChallengeCode, OrbChallengeCode] {
  const pool = ORB_CHALLENGE_CODES.filter(code => !avoid.includes(code));
  const source = [...(pool.length >= 2 ? pool : ORB_CHALLENGE_CODES)];
  const firstIndex = Math.floor(Math.random() * source.length);
  const first = source[firstIndex]!;
  source.splice(firstIndex, 1);
  const second = source[Math.floor(Math.random() * source.length)]!;
  return [first, second];
}
