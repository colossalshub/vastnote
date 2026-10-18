export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path fill="currentColor" d="M16 3.2 29.2 28H21.6L16 16.4 10.4 28H2.8L16 3.2Z" />
    </svg>
  );
}
