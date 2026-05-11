import { component } from "./factory";
import type { TableCellProps, TableProps, TableRowProps, TableToSlidesProps } from "./types";

export const Table = component<"Table", TableProps>("Table");
export const TableRow = component<"TableRow", TableRowProps>("TableRow");
export const TableCell = component<"TableCell", TableCellProps>("TableCell");
export const TableToSlides = component<"TableToSlides", TableToSlidesProps>("TableToSlides");
