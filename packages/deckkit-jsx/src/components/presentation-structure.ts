import { component } from "./factory";
import type { LayoutProps, MasterProps, PlaceholderProps, SectionProps } from "./types";

export const Layout = component<"Layout", LayoutProps>("Layout");
export const Section = component<"Section", SectionProps>("Section");
export const Master = component<"Master", MasterProps>("Master");
export const Placeholder = component<"Placeholder", PlaceholderProps>("Placeholder");
