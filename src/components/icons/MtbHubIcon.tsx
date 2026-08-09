import type { SVGProps } from 'react';

export function MtbHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 9v6" />
      <path d="M2 12h6" />
      <path d="M5 8v8" />
      <path d="M8 3v18" />
      <path d="m8 7 11 2v6L8 17" />
      <path d="M19 3v18" />
      <path d="M19 12h3" />
      <path d="M22 9v6" />
    </svg>
  );
}
