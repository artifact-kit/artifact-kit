import { component } from "./factory";
import type { NotesProps, TextProps, TextRunProps } from "./types";

export const Text = component<"Text", TextProps>("Text");
export const TextRun = component<"TextRun", TextRunProps>("TextRun");
export const Notes = component<"Notes", NotesProps>("Notes");
