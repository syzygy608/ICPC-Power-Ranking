import * as stylex from "@stylexjs/stylex";
import { theme } from "./theme.stylex";

const mobile = "@media (max-width: 649px)";

export const tables = stylex.create({
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    padding: { default: "0 24px 18px", [mobile]: "0 16px 16px" },
  },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    flex: "1 1 240px",
    maxWidth: { default: 340, [mobile]: "none" },
    paddingInline: 11,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.controlLine,
    borderRadius: 3,
    backgroundColor: theme.field,
    color: theme.muted,
    outline: { default: null, ":focus-within": `2px solid ${theme.accent}` },
    outlineOffset: 2,
  },
  searchInput: {
    width: "100%",
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    outline: { default: "none", ":focus-visible": "none" },
  },
  filter: {
    maxWidth: { default: 205, [mobile]: "100%" },
    flexGrow: { default: 0, [mobile]: 1 },
  },
  clearFilters: {
    whiteSpace: "nowrap",
    width: { default: "auto", [mobile]: "100%" },
  },
  scroll: { overflow: "auto" },
  table: {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "collapse",
    whiteSpace: "nowrap",
    textAlign: "left",
    fontSize: 14,
  },
  minimumWidth: (minWidth: string) => ({ minWidth }),
  columnWidth: (width: string) => ({ width }),
  ellipsis: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  teamHeading: { display: "flex", alignItems: "center", gap: 7 },
  head: {
    padding: "12px 16px",
    borderBlockWidth: 1,
    borderBlockStyle: "solid",
    borderBlockColor: theme.line,
    backgroundColor: theme.raised,
    color: theme.muted,
    fontWeight: 600,
  },
  cell: {
    padding: "12px 16px",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: theme.line,
  },
  cellSmall: {
    display: "block",
    marginTop: 4,
    color: theme.muted,
    fontSize: 12,
  },
  row: { backgroundColor: { default: "transparent", ":hover": theme.hover } },
  highlighted: {
    backgroundColor: {
      default: theme.accentWash,
      ":hover": theme.accentWashHover,
    },
  },
  rankNumber: {
    fontFamily: theme.display,
    fontSize: 17,
    color: theme.accent,
    fontVariantNumeric: "tabular-nums",
  },
  teamButton: {
    display: "inline-block",
    minHeight: 0,
    minWidth: 0,
    maxWidth: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
    textAlign: "left",
    fontWeight: 700,
  },
  rating: {
    color: theme.accent,
    fontFamily: theme.display,
    fontSize: 20,
    fontVariantNumeric: "tabular-nums",
  },
  numeric: { fontVariantNumeric: "tabular-nums" },
  dirtyPill: {
    display: "inline-block",
    minWidth: 42,
    padding: "4px 8px",
    borderRadius: 3,
    backgroundColor: theme.accentWash,
    color: theme.accent,
    textAlign: "center",
    fontSize: 12,
  },
  positive: { backgroundColor: theme.successWash, color: theme.success },
  negative: { backgroundColor: theme.dangerWash, color: theme.danger },
  confidence: {
    display: "block",
    width: 72,
    height: 8,
    accentColor: theme.accent,
  },
  scoreboardCell: { padding: "9px 10px", textAlign: "center" },
  scoreboardTeam: { textAlign: "left" },
  preview: {
    maxHeight: 320,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.line,
  },
  previewHead: { position: "sticky", top: 0, zIndex: 1 },
  footer: {
    display: "flex",
    flexDirection: { default: "row", [mobile]: "column" },
    flexWrap: "wrap",
    alignItems: { default: "center", [mobile]: "flex-start" },
    justifyContent: "space-between",
    gap: 12,
    padding: { default: "14px 24px", [mobile]: "14px 16px" },
    color: theme.muted,
    fontSize: 12,
  },
  pagination: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  pageButton: {
    minWidth: { default: 44, [mobile]: 36 },
    paddingInline: { default: 12, [mobile]: 8 },
  },
});

const countryStyles = stylex.create({
  taiwan: { boxShadow: "inset 2px 0 #6aa58d" },
  japan: { boxShadow: "inset 2px 0 #bc7589" },
  korea: { boxShadow: "inset 2px 0 #738fbe" },
  china: { boxShadow: "inset 2px 0 #bc7f60" },
  hongKong: { boxShadow: "inset 2px 0 #bd769d" },
  singapore: { boxShadow: "inset 2px 0 #a382bb" },
  vietnam: { boxShadow: "inset 2px 0 #bb9556" },
  northAmerica: { boxShadow: "inset 2px 0 #74a8b9" },
});

const countryTints = new Map<string, stylex.StyleXStyles>([
  ["TW", countryStyles.taiwan],
  ["JP", countryStyles.japan],
  ["KR", countryStyles.korea],
  ["CN", countryStyles.china],
  ["HK", countryStyles.hongKong],
  ["SG", countryStyles.singapore],
  ["VN", countryStyles.vietnam],
  ["US", countryStyles.northAmerica],
  ["CA", countryStyles.northAmerica],
]);

export function countryTint(country: string) {
  return countryTints.get(country);
}
