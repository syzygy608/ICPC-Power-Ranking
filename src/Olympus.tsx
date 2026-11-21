/** Decorative, code-native Greek temple and laurel illustration. */
export default function Olympus() {
  return (
    <svg className="olympus" viewBox="0 0 420 320" fill="none" aria-hidden="true">
      <circle cx="210" cy="145" r="114" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="210" cy="145" r="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 7" />
      <path d="M70 280h280M88 268h244M105 254h210M104 112l106-59 106 59H104Zm15 12h182M122 137h176M120 239h180" stroke="currentColor" strokeWidth="3" />
      <path d="m137 101 73-39 73 39H137Z" stroke="currentColor" />
      {[133, 177, 221, 265].map((x) => (
        <g key={x} stroke="currentColor">
          <path d={`M${x} 139v96m16-96v96m-20-98h24m-24 100h24`} strokeWidth="3" />
          <path d={`M${x + 5} 146v82m6-82v82`} strokeWidth="0.8" />
        </g>
      ))}
      <path d="M91 246C28 210 26 129 73 88M329 246c63-36 65-117 18-158" stroke="currentColor" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} transform={`rotate(${i * 13} 210 160)`}>
          <path d="M62 169q-28-12-18-35 25 6 18 35Zm0 0q1-29 23-32 8 24-23 32Z" fill="currentColor" opacity="0.6" />
          <path d="M358 169q28-12 18-35-25 6-18 35Zm0 0q-1-29-23-32-8 24 23 32Z" fill="currentColor" opacity="0.6" />
        </g>
      ))}
      <path d="m210 24 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="currentColor" />
    </svg>
  );
}
