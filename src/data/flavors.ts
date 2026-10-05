export type Flavor = {
  id: string
  /** Full name, as printed on the can. */
  name: string
  /** Can and section colour. */
  base: string
  /** Deep shade for gradients and the can's lower half. */
  dark: string
  /** Wordmark / tag colour on the can. */
  accent: string
  /** Text colour on `base`. */
  ink: string
  /** Seasoning specks on the chips. */
  season: string
  tagline: string
  /** Two playful meters, 1–5. */
  salt: number
  nerve: number
  notes: string[]
}

// Lineup follows the reference cans: Original, Cheese, Cheese & Onion, Salt & Vinegar, Texas BBQ.
export const FLAVORS: Flavor[] = [
  {
    id: "original",
    name: "Оригинальный",
    base: "#d4102b",
    dark: "#7a0515",
    accent: "#ffd23f",
    ink: "#fff6e3",
    season: "#fff3d9",
    tagline: "Картофель, соль и спокойная уверенность. Классика, которая не оправдывается.",
    salt: 3,
    nerve: 2,
    notes: ["соль", "хруст", "без лишнего"],
  },
  {
    id: "cheese",
    name: "Сыр",
    base: "#f4a21c",
    dark: "#a85a06",
    accent: "#fff3c4",
    ink: "#231100",
    season: "#ff9f0a",
    tagline: "Сыра больше, чем вопросов. Пальцы потом можно не мыть — можно облизать.",
    salt: 3,
    nerve: 3,
    notes: ["чеддер", "сливочно", "липкие пальцы"],
  },
  {
    id: "cheese-onion",
    name: "Сыр и лук",
    base: "#1d6a3a",
    dark: "#0a361b",
    accent: "#f6e14b",
    ink: "#f4ffe8",
    season: "#a7d84a",
    tagline: "Лук плачет за вас. Сыр делает вид, что ничего не было.",
    salt: 3,
    nerve: 4,
    notes: ["зелёный лук", "сыр", "свежесть"],
  },
  {
    id: "salt-vinegar",
    name: "Соль и уксус",
    base: "#1b78d8",
    dark: "#0a3a82",
    accent: "#eaf5ff",
    ink: "#ffffff",
    season: "#f4f9ff",
    tagline: "Кислинка, от которой щурятся глаза. Всё остальное — улыбается.",
    salt: 5,
    nerve: 5,
    notes: ["уксус", "морская соль", "щуриться"],
  },
  {
    id: "bbq",
    name: "Техасский BBQ",
    base: "#6c2a8c",
    dark: "#300e47",
    accent: "#ff8a3d",
    ink: "#fff0fb",
    season: "#c4461d",
    tagline: "Дымок, как будто вы умеете жарить мясо. Никто не узнает, что не умеете.",
    salt: 2,
    nerve: 4,
    notes: ["дымок", "томат", "паприка"],
  },
]
