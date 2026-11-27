import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { mobileCards } from "./styles/mobileCards";
import { tables } from "./styles/tables";

export default function FixedTable({
  widths,
  flexibleColumn,
  label,
  cards = false,
  children,
}: {
  widths: readonly number[];
  flexibleColumn: number;
  label?: string;
  cards?: boolean;
  children: ReactNode;
}) {
  const minimumWidth = widths.reduce((total, width) => total + width, 0);

  return (
    <table
      {...stylex.props(
        tables.table,
        cards
          ? mobileCards.minimumWidth(`${minimumWidth}px`)
          : tables.minimumWidth(`${minimumWidth}px`),
        cards && mobileCards.table,
      )}
      role={cards ? "table" : undefined}
      aria-label={label}
    >
      <colgroup {...stylex.props(cards && mobileCards.columns)}>
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
