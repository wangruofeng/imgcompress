import type { SVGProps } from 'react';

// A 24-unit grid keeps the symbols aligned at toolbar and caption sizes.
const symbols = {
  add: <path d="M12 4.5v15M4.5 12h15"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  next: <path d="M3.5 12h16m-6-6 6 6-6 6"/>,
  done: <path d="m4 12 5 5L20 6"/>,
  stop: <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" stroke="none"/>,
  image: <>
    <path d="M14 3.5H6A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-7M4 16l5-5 4.5 4.5 2-2 4.5 4.5"/>
    <circle cx="8" cy="7.5" r="1.3" fill="currentColor" stroke="none"/><path d="M19 2v6m-3-3h6"/>
  </>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M3.5 16v2a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2"/></>,
  export: <path d="M12 3v13m-6-6 6 6 6-6M4.5 21h15"/>,
  folder: <><path d="M3 18V6a2 2 0 0 1 2-2h4l2.5 3h6a2 2 0 0 1 2 2"/><path d="m3 18 2.5-7h16L19 19a2 2 0 0 1-2 1.5H5A2 2 0 0 1 3 18Z" fill="currentColor" fillOpacity=".14"/></>,
  trash: <><path d="M3.5 6.5h17m-12 0V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M6 9l.8 10a2 2 0 0 0 2 1.8h6.4a2 2 0 0 0 2-1.8L18 9M10 10.5l.3 6m3.7-6-.3 6"/></>,
  privacy: <><path d="M12 2.5c2.7 2 5 2.7 8 3v6.2c0 4.5-3.4 7.8-8 10-4.6-2.2-8-5.5-8-10V5.5c3-.3 5.3-1 8-3Z" fill="currentColor" fillOpacity=".1"/><path d="m8.5 12 2.4 2.4 4.7-5"/></>,
  sun: <><circle cx="12" cy="12" r="4.3" fill="currentColor" fillOpacity=".16"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon: <path d="M19.9 15.2A9 9 0 0 1 8.7 3.8a8.8 8.8 0 1 0 11.2 11.4Z" fill="currentColor" fillOpacity=".16"/>,
  settings: <><path d="M3 7h5m5 0h8M3 17h10m5 0h3"/><rect x="8" y="4" width="5" height="6" rx="2"/><rect x="13" y="14" width="5" height="6" rx="2"/></>,
  select: <path d="m7 9 5-5 5 5M7 15l5 5 5-5"/>,
  compare: <path d="M12 3v18M7.5 8 3.5 12l4 4m9-8 4 4-4 4"/>,
  view: <><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></>,
  alert: <><path d="m10 4.5-8 13.8A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.7-2.7L14 4.5a2.3 2.3 0 0 0-4 0Z"/><path d="M12 9v4.5m0 3.3v.2"/></>,
  processing: <><circle cx="12" cy="12" r="8" opacity=".22"/><path d="M12 4a8 8 0 0 1 8 8"/></>,
};

type Props = SVGProps<SVGSVGElement> & { name: keyof typeof symbols; size?: number };

export function Icon({ name, size = 20, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    {symbols[name]}
  </svg>;
}
