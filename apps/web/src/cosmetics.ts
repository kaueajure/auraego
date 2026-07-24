export interface WardrobeLook {
  id: string;
  name: string;
  collection: string;
  description: string;
  type: "emi" | "charlie" | "phil" | "classic" | "banana" | "cj" | "order67";
  rarity: "Lendária" | "Épica" | "Rara";
  color: string;
  accent: string;
  skin: string;
  hair: string;
  pants: string;
  shoes: string;
  swatches: string[];
}

export const DEFAULT_LOOK_ID = "emi";
/** @deprecated Mantida só para migrar valores antigos do navegador para o banco. */
export const EQUIPPED_LOOK_STORAGE_KEY = "aura-ego:selected-look";

export const WARDROBE_LOOKS: WardrobeLook[] = [
  {
    id: "emi",
    name: "Emi",
    collection: "Mini Royale",
    description: "Agilidade elétrica, olhar afiado e equipamento pronto para dominar a quadra.",
    type: "emi",
    rarity: "Lendária",
    color: "#18aab8",
    accent: "#f5bf25",
    skin: "#be8063",
    hair: "#191919",
    pants: "#26272b",
    shoes: "#edf0ee",
    swatches: ["#18aab8", "#f5bf25", "#ef6537"]
  },
  {
    id: "charlie-morningstar",
    name: "Charlie",
    collection: "Morningstar",
    description: "Elegância infernal, presença luminosa e um visual feito para comandar qualquer quadra.",
    type: "charlie",
    rarity: "Lendária",
    color: "#d74339",
    accent: "#f4d083",
    skin: "#f3ddd0",
    hair: "#f5dfbd",
    pants: "#281b25",
    shoes: "#20161b",
    swatches: ["#d74339", "#f4d083", "#281b25"]
  },
  {
    id: "phil",
    name: "Phil",
    collection: "Minion Rush",
    description: "Pequeno no tamanho, gigante na presença e sempre pronto para causar na quadra.",
    type: "phil",
    rarity: "Lendária",
    color: "#f4d21f",
    accent: "#2464a8",
    skin: "#f4d21f",
    hair: "#171717",
    pants: "#2464a8",
    shoes: "#202020",
    swatches: ["#f4d21f", "#2464a8", "#202020"]
  },
  {
    id: "banana-fortnite",
    name: "Banana",
    collection: "Lobby Emote",
    description: "A banana dançarina da lobby. Pronta para o Six Seven e o GigaChad com presença absurda.",
    type: "banana",
    rarity: "Lendária",
    color: "#f2c012",
    accent: "#2f6b3a",
    skin: "#f2c012",
    hair: "#1d3b24",
    pants: "#2f6b3a",
    shoes: "#1a1a1a",
    swatches: ["#f2c012", "#2f6b3a", "#f7e27a"]
  },
  {
    id: "carl-johnson",
    name: "CJ",
    collection: "Grove Street",
    description: "Carl Johnson na área. Respeito, atitude e farm de aura no estilo Los Santos.",
    type: "cj",
    rarity: "Lendária",
    color: "#2f7a3a",
    accent: "#c4a35a",
    skin: "#6b4428",
    hair: "#1a120e",
    pants: "#2a3d5c",
    shoes: "#ececec",
    swatches: ["#2f7a3a", "#c4a35a", "#2a3d5c"]
  },
  {
    id: "order-number-67",
    name: "67",
    collection: "Order Number",
    description: "O pedido chegou. Brainr 67 no estilo Six Seven — presença absurda e farm sem dó.",
    type: "order67",
    rarity: "Lendária",
    color: "#6b2fd6",
    accent: "#f0c41a",
    skin: "#c48a6a",
    hair: "#1a1a1a",
    pants: "#2a2438",
    shoes: "#111111",
    swatches: ["#6b2fd6", "#f0c41a", "#2a2438"]
  },
  {
    id: "meia-noite",
    name: "Meia-noite",
    collection: "Depois das onze",
    description: "Contraste frio, acabamento violeta e detalhes neon para partidas sem holofote.",
    type: "classic",
    rarity: "Épica",
    color: "#37324e",
    accent: "#9d7be9",
    skin: "#b77b5a",
    hair: "#141319",
    pants: "#191824",
    shoes: "#d8d4e1",
    swatches: ["#37324e", "#9d7be9", "#191824"]
  }
];

export function getLook(id: string | null | undefined): WardrobeLook {
  return WARDROBE_LOOKS.find(look => look.id === id) ?? WARDROBE_LOOKS[0];
}

export function lookIdFromCosmetics(cosmetics: Record<string, string> | null | undefined): string {
  const look = cosmetics?.look;
  return look && WARDROBE_LOOKS.some(entry => entry.id === look) ? look : DEFAULT_LOOK_ID;
}

export function getEquippedLook(cosmetics?: Record<string, string> | null): WardrobeLook {
  return getLook(lookIdFromCosmetics(cosmetics));
}

export function readLegacyLookId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(EQUIPPED_LOOK_STORAGE_KEY);
  return value && WARDROBE_LOOKS.some(look => look.id === value) ? value : null;
}

export function clearLegacyLookId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EQUIPPED_LOOK_STORAGE_KEY);
}
