import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { tables } from "./styles/tables";

export default function FixedTable({
  widths,
  flexibleColumn,
  label,
  children,
}: {
  widths: readonly number[];
  flexibleColumn: number;
  label?: string;
  children: ReactNode;
}) {
  const minimumWidth = widths.reduce((total, width) => total + width, 0);

  return (
    <table
      {...stylex.props(tables.table, tables.minimumWidth(`${minimumWidth}px`))}
      aria-label={label}
    >
      <colgroup>
        {widths.map((width, index) => (
          <col
            key={index}
            {...stylex.props(
              index !== flexibleColumn && tables.columnWidth(`${width}px`),
            )}
          />
        ))}
      </colgroup>
      {children}
    </table>
  );
}
