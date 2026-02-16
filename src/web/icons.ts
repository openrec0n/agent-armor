// ========================================
// AgentArmor — Inline SVG Icon System
// Zero dependencies, currentColor-based
// ========================================

function svg(
  paths: string,
  size: number = 24,
  opts: { fill?: boolean; viewBox?: string } = {},
): string {
  // viewBox is always 0 0 24 24 because all icon paths use 24x24 coordinates.
  // The size parameter only controls the rendered width/height.
  const vb = opts.viewBox ?? '0 0 24 24';
  const fillAttr = opts.fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="${vb}" ${fillAttr} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

export function shieldIcon(size = 24): string {
  return svg(
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    size,
  );
}

export function shieldCheckIcon(size = 24): string {
  return svg(
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    size,
  );
}

export function targetIcon(size = 24): string {
  return svg(
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    size,
  );
}

export function layersIcon(size = 24): string {
  return svg(
    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    size,
  );
}

export function alertTriangleIcon(size = 24): string {
  return svg(
    '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    size,
  );
}

export function slidersIcon(size = 24): string {
  return svg(
    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    size,
  );
}

export function codeIcon(size = 24): string {
  return svg(
    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    size,
  );
}

export function clipboardIcon(size = 24): string {
  return svg(
    '<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
    size,
  );
}

export function downloadIcon(size = 24): string {
  return svg(
    '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    size,
  );
}

export function checkIcon(size = 24): string {
  return svg(
    '<polyline points="20 6 9 17 4 12"/>',
    size,
  );
}

export function chevronDownIcon(size = 24): string {
  return svg(
    '<polyline points="6 9 12 15 18 9"/>',
    size,
  );
}

export function xIcon(size = 24): string {
  return svg(
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    size,
  );
}

export function lockIcon(size = 24): string {
  return svg(
    '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    size,
  );
}

export function userIcon(size = 24): string {
  return svg(
    '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    size,
  );
}

export function folderIcon(size = 24): string {
  return svg(
    '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    size,
  );
}

export function laptopIcon(size = 24): string {
  return svg(
    '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/>',
    size,
  );
}

export function buildingIcon(size = 24): string {
  return svg(
    '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/>',
    size,
  );
}

export function gitMergeIcon(size = 24): string {
  return svg(
    '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 009 9"/>',
    size,
  );
}
