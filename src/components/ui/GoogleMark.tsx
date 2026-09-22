/** Google "G" in brand colours, drawn inline so nothing is fetched. */
export function GoogleMark({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84a10.1 10.1 0 0 1-4.4 6.63v5.52h7.12c4.16-3.83 6.56-9.47 6.56-16.16Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.34l-7.12-5.52c-1.97 1.32-4.49 2.1-7.44 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A22 22 0 0 0 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.17A13.2 13.2 0 0 1 11 24c0-1.45.25-2.85.69-4.17v-5.7H4.34A22 22 0 0 0 2 24c0 3.55.85 6.91 2.34 9.87l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.13l7.35 5.7c1.73-5.2 6.58-9.08 12.31-9.08Z"
      />
    </svg>
  );
}
