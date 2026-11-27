import * as stylex from "@stylexjs/stylex";
import { theme } from "./theme.stylex";

const mobile = "@media (max-width: 649px)";

export const mobileCards = stylex.create({
  table: {
    display: { default: null, [mobile]: "block" },
    whiteSpace: { default: "nowrap", [mobile]: "normal" },
  },
  minimumWidth: (width: string) => ({
    minWidth: { default: width, [mobile]: 0 },
  }),
  columns: { display: { default: null, [mobile]: "none" } },
  head: {
    position: { default: null, [mobile]: "absolute" },
    width: { default: null, [mobile]: 1 },
    height: { default: null, [mobile]: 1 },
    overflow: { default: null, [mobile]: "hidden" },
    clipPath: { default: null, [mobile]: "inset(50%)" },
  },
  list: {
    display: { default: null, [mobile]: "grid" },
    gap: { default: null, [mobile]: 10 },
    padding: { default: null, [mobile]: "0 10px" },
  },
  row: {
    display: { default: null, [mobile]: "grid" },
    gridTemplateColumns: {
      default: null,
      [mobile]: "24px repeat(4, minmax(0, 1fr)) 44px",
    },
    alignItems: { default: null, [mobile]: "start" },
    rowGap: { default: null, [mobile]: 8 },
    columnGap: { default: null, [mobile]: 6 },
    padding: { default: null, [mobile]: "11px 12px" },
    borderRadius: { default: null, [mobile]: 6 },
    borderWidth: { default: null, [mobile]: 1 },
    borderStyle: { default: null, [mobile]: "solid" },
    borderColor: { default: null, [mobile]: theme.line },
  },
  cell: {
    display: { default: null, [mobile]: "block" },
    padding: { default: "12px 16px", [mobile]: 0 },
    borderBottomWidth: { default: 1, [mobile]: 0 },
    minWidth: { default: null, [mobile]: 0 },
  },
  name: { gridColumn: { default: null, [mobile]: "2 / 5" } },
  score: {
    gridColumn: { default: null, [mobile]: "5 / -1" },
    textAlign: { default: null, [mobile]: "right" },
  },
  firstMetric: { gridColumn: { default: null, [mobile]: "1 / 3" } },
  secondMetric: { gridColumn: { default: null, [mobile]: "3 / 5" } },
  thirdMetric: { gridColumn: { default: null, [mobile]: "5 / -1" } },
  metric: {
    borderTopWidth: { default: null, [mobile]: 1 },
    borderTopStyle: { default: null, [mobile]: "solid" },
    borderTopColor: { default: null, [mobile]: theme.line },
    paddingTop: { default: null, [mobile]: 7 },
    fontSize: { default: null, [mobile]: 13 },
    overflowWrap: { default: null, [mobile]: "anywhere" },
  },
  metricLabel: {
    display: { default: "none", [mobile]: "block" },
    color: theme.muted,
    fontSize: 11,
    marginBottom: 3,
  },
  details: {
    gridColumn: { default: null, [mobile]: "1 / -1" },
    gridRow: { default: null, [mobile]: 3 },
  },
  desktopOnly: { display: { default: null, [mobile]: "none" } },
  identity: {
    display: { default: "flex", [mobile]: "grid" },
    justifyItems: { default: null, [mobile]: "start" },
    gap: { default: 7, [mobile]: 2 },
  },
  teamButton: {
    minHeight: { default: 0, [mobile]: 36 },
    paddingBlock: { default: 9, [mobile]: 0 },
    marginBlock: { default: null, [mobile]: -7 },
  },
  schoolName: {
    whiteSpace: { default: "nowrap", [mobile]: "normal" },
    overflowWrap: { default: null, [mobile]: "anywhere" },
  },
});
