import { component } from "./factory";
import type { ImageProps, MediaProps } from "./types";

export const Image = component<"Image", ImageProps>("Image");
export const Media = component<"Media", MediaProps>("Media");
