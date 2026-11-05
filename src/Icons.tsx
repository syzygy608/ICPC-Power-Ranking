const paths: Record<string, string> = {
  chart: "M4 19V5m0 14h16M8 15v-4m5 4V7m5 8v-6",
  trophy:
    "M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-10 0h12",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5",
  download: "M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18m-9-9c4 4 4 14 0 18-4-4-4-14 0-18Z",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  calendar: "M5 4h14v17H5V4Zm3-2v5m8-5v5M5 10h14",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  info: "M12 11v6m0-10v1m9 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  users:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-4M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-3a4 4 0 0 1 0 7",
};
export default function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.chart} />
    </svg>
  );
}
