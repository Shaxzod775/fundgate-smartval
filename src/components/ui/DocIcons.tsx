import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PitchDeckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} aria-hidden="true" {...props}>
      <path d="M3 4h18" />
      <path d="M5 4v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4" />
      <path d="M12 15v3" />
      <path d="m8.5 21 3.5-3 3.5 3" />
      <path d="M8.5 11.5V9" />
      <path d="M12 11.5V6.5" />
      <path d="M15.5 11.5V8" />
    </svg>
  );
}

export function InvestMemoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} aria-hidden="true" {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m8.5 17.5 2.5-3 2 2 3-4" />
    </svg>
  );
}

export function UnsignedDocIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} aria-hidden="true" {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 12.5h4" />
      <path d="M8.5 17.5h7" />
    </svg>
  );
}

export function SignedDocIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} aria-hidden="true" {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 17.5h7" />
      <path d="M9 15c1.2-2.2 2.3-.4 3 .2s1.6-.2 2.5-1.7" />
    </svg>
  );
}
