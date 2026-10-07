/**
 * TABLER ICONS CATALOG (MIT License)
 * Standardized 24x24 SVG vectors with accessible attributes.
 * Best Practice: aria-hidden="true" by default, stroke="currentColor".
 */

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

function createSvg(content: string, props: IconProps = {}): string {
  const size = props.size || 16;
  const stroke = props.strokeWidth || 1.75;
  const cls = props.className ? ` class="${props.className}"` : "";
  const a11y = props.ariaLabel
    ? ` role="img" aria-label="${props.ariaLabel}"`
    : ` aria-hidden="true"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"${cls}${a11y}>${content}</svg>`;
}

export const TablerIcon = {
  // Navigation & Views
  layoutKanban: (props?: IconProps) =>
    createSvg('<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M10 4l0 16" /><path d="M14 4l0 16" />', props),

  layoutDashboard: (props?: IconProps) =>
    createSvg('<path d="M4 4h6v8h-6z" /><path d="M4 16h6v4h-6z" /><path d="M14 12h6v8h-6z" /><path d="M14 4h6v4h-6z" />', props),

  timeline: (props?: IconProps) =>
    createSvg('<path d="M4 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 20m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M20 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M20 8m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M4 8m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M4 9v6" /><path d="M12 5v14" /><path d="M20 9v6" />', props),

  fileText: (props?: IconProps) =>
    createSvg('<path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 9l1 0" /><path d="M9 13l6 0" /><path d="M9 17l6 0" />', props),

  // Backoffice / Admin
  settings: (props?: IconProps) =>
    createSvg('<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />', props),

  buildingStore: (props?: IconProps) =>
    createSvg('<path d="M3 21l18 0" /><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4" /><path d="M5 21l0 -10.15" /><path d="M19 21l0 -10.15" /><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4" />', props),

  briefcase: (props?: IconProps) =>
    createSvg('<path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /><path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" /><path d="M12 12l0 .01" /><path d="M3 13a20 20 0 0 0 18 0" />', props),

  folder: (props?: IconProps) =>
    createSvg('<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />', props),

  menu: (props?: IconProps) =>
    createSvg('<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />', props),

  layoutSidebarLeftCollapse: (props?: IconProps) =>
    createSvg('<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 4v16" /><path d="M15 10l-2 2l2 2" />', props),

  layoutSidebarLeftExpand: (props?: IconProps) =>
    createSvg('<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 4v16" /><path d="M14 10l2 2l-2 2" />', props),

  // Search & Actions
  search: (props?: IconProps) =>
    createSvg('<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" />', props),

  plus: (props?: IconProps) =>
    createSvg('<path d="M12 5l0 14" /><path d="M5 12l14 0" />', props),

  arrowBackUp: (props?: IconProps) =>
    createSvg('<path d="M9 14l-4 -4l4 -4" /><path d="M5 10h11a4 4 0 1 1 0 8h-1" />', props),

  archive: (props?: IconProps) =>
    createSvg('<path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10" /><path d="M10 12l4 0" />', props),

  arrowForwardUp: (props?: IconProps) =>
    createSvg('<path d="M15 14l4 -4l-4 -4" /><path d="M19 10h-11a4 4 0 1 0 0 8h1" />', props),

  // Quick Filter Icons (Replacing Emojis with Semantic Tabler Vectors)
  clockAlert: (props?: IconProps) =>
    createSvg('<path d="M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M12 10l0 3l2 0" /><path d="M12 3v1" /><path d="M12 20v1" /><path d="M4 13h1" /><path d="M19 13h1" />', props),

  calendarDue: (props?: IconProps) =>
    createSvg('<path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" /><path d="M10 16l4 0" />', props),

  lockBlocked: (props?: IconProps) =>
    createSvg('<path d="M5 11m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" /><path d="M8 11v-4a4 4 0 0 1 8 0v4" />', props),

  calendarOff: (props?: IconProps) =>
    createSvg('<path d="M19.823 19.824a2 2 0 0 1 -1.823 1.176h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 1.175 -1.823m3.825 -.177h9a2 2 0 0 1 2 2v9" /><path d="M16 3v4" /><path d="M8 3v1" /><path d="M4 11h7m4 0h5" /><path d="M3 3l18 18" />', props),

  // UI Controls
  dotsVertical: (props?: IconProps) =>
    createSvg('<path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />', props),

  sun: (props?: IconProps) =>
    createSvg('<path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />', props),

  moon: (props?: IconProps) =>
    createSvg('<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />', props),

  check: (props?: IconProps) =>
    createSvg('<path d="M5 12l5 5l10 -10" />', props),

  chevronDown: (props?: IconProps) =>
    createSvg('<path d="M6 9l6 6l6 -6" />', props),

  chevronLeft: (props?: IconProps) =>
    createSvg('<path d="M15 6l-6 6l6 6" />', props),

  chevronRight: (props?: IconProps) =>
    createSvg('<path d="M9 6l6 6l-6 6" />', props),

  star: (props?: IconProps) =>
    createSvg('<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />', props),

  starFilled: (props?: IconProps) =>
    createSvg('<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" fill="currentColor" stroke="none" />', props),

  calendar: (props?: IconProps) =>
    createSvg('<path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" />', props),

  download: (props?: IconProps) =>
    createSvg('<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" />', props),

  x: (props?: IconProps) =>
    createSvg('<path d="M18 6l-12 12" /><path d="M6 6l12 12" />', props),

  trash: (props?: IconProps) =>
    createSvg('<path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />', props),

  edit: (props?: IconProps) =>
    createSvg('<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" />', props),

  hash: (props?: IconProps) =>
    createSvg('<path d="M5 9l14 0" /><path d="M5 15l14 0" /><path d="M11 4l-4 16" /><path d="M17 4l-4 16" />', props),

  // Semantic Priority Icons (Redundant Encoding)
  alertTriangle: (props?: IconProps) =>
    createSvg('<path d="M12 9v4" /><path d="M12 16h.01" /><path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75" />', props),

  arrowUp: (props?: IconProps) =>
    createSvg('<path d="M12 5l0 14" /><path d="M18 11l-6 -6" /><path d="M6 11l6 -6" />', props),

  minus: (props?: IconProps) =>
    createSvg('<path d="M5 12l14 0" />', props),

  arrowDown: (props?: IconProps) =>
    createSvg('<path d="M12 5l0 14" /><path d="M18 13l-6 6" /><path d="M6 13l6 6" />', props),

  // Semantic Status Icons (Redundant Encoding)
  circle: (props?: IconProps) =>
    createSvg('<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />', props),

  loader: (props?: IconProps) =>
    createSvg('<path d="M12 3a9 9 0 1 0 9 9" />', props),

  eye: (props?: IconProps) =>
    createSvg('<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />', props),

  circleCheck: (props?: IconProps) =>
    createSvg('<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l2 2l4 -4" />', props),

  // Operational Dashboard KPI & Trend Icons
  trendingUp: (props?: IconProps) =>
    createSvg('<path d="M3 17l6 -6l4 4l8 -8" /><path d="M14 7l7 0l0 7" />', props),

  trendingDown: (props?: IconProps) =>
    createSvg('<path d="M3 7l6 6l4 -4l8 8" /><path d="M21 10l0 7l-7 0" />', props),

  listCheck: (props?: IconProps) =>
    createSvg('<path d="M3.5 5.5l1.5 1.5l2.5 -2.5" /><path d="M3.5 11.5l1.5 1.5l2.5 -2.5" /><path d="M3.5 17.5l1.5 1.5l2.5 -2.5" /><path d="M11 6l9 0" /><path d="M11 12l9 0" /><path d="M11 18l9 0" />', props),

  listDetails: (props?: IconProps) =>
    createSvg('<path d="M13 5h8" /><path d="M13 9h5" /><path d="M13 15h8" /><path d="M13 19h5" /><path d="M3 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M3 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />', props),

  pencil: (props?: IconProps) =>
    createSvg('<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" />', props),

  clock: (props?: IconProps) =>
    createSvg('<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 7v5l3 3" />', props),

  filter: (props?: IconProps) =>
    createSvg('<path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-9l-4.414 -4.414a2 2 0 0 1 -.586 -1.414v-2.172z" />', props),

  refresh: (props?: IconProps) =>
    createSvg('<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -5v5h5" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 5v-5h-5" />', props),

  copy: (props?: IconProps) =>
    createSvg('<path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />', props),

  palette: (props?: IconProps) =>
    createSvg('<path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" /><path d="M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />', props),

  sparkles: (props?: IconProps) =>
    createSvg('<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 7a5 5 0 0 1 5 5a5 5 0 0 1 -5 5a5 5 0 0 1 -5 -5a5 5 0 0 1 5 -5z" />', props),

  externalLink: (props?: IconProps) =>
    createSvg('<path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" /><path d="M11 13l9 -9" /><path d="M15 4h5v5" />', props),

  users: (props?: IconProps) =>
    createSvg('<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />', props),

  diamond: (props?: IconProps) =>
    createSvg('<path d="M6 5h12l3 5l-9 11l-9 -11z" /><path d="M10 10l2 2l2 -2" />', props),

  mail: (props?: IconProps) =>
    createSvg('<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" />', props),

  phone: (props?: IconProps) =>
    createSvg('<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />', props),

  world: (props?: IconProps) =>
    createSvg('<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a17 17 0 0 1 0 18" />', props),

  userCheck: (props?: IconProps) =>
    createSvg('<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4" /><path d="M15 19l2 2l4 -4" />', props),

  arrowLeft: (props?: IconProps) =>
    createSvg('<path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" />', props),

  clockPlay: (props?: IconProps) =>
    createSvg('<path d="M12 7v5l2 2" /><path d="M17 22l5 -3l-5 -3z" /><path d="M13.017 20.943a9 9 0 1 1 7.831 -7.292" />', props),

  gripVertical: (props?: IconProps) =>
    createSvg('<path d="M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />', props),
};
