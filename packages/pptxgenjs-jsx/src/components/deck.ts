import { component } from "./factory";
import type { DeckProps } from "./types";

export const Deck = component<"Deck", DeckProps>("Deck");
export const Presentation = Deck;
