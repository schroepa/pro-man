/**
 * SQUIRCLE & CONCENTRIC RADII ENGINE
 *
 * Implements:
 * 1. Apple Continuous Curvature (G2 continuity / Superellipse approximation via Bézier)
 * 2. Concentric Nested Radius Formula: R_inner = max(0, R_outer - Padding)
 * 3. Native CSS corner-shape: squircle support & Houdini Paint API integration
 */

export interface SquircleParams {
  width: number;
  height: number;
  cornerRadius: number;
  cornerSmoothing?: number; // 0 (circle arc) to 1 (full superellipse). Apple iOS standard is 0.6.
}

/**
 * Calculates the mathematically exact concentric inner radius for a nested container.
 * Formula: R_inner = max(0, R_outer - Padding)
 * Ensures that the distance between outer and inner curve remains strictly constant (P)
 * across the entire corner curve.
 */
export function calculateConcentricRadius(outerRadius: number, padding: number): number {
  return Math.max(0, Math.round(outerRadius - padding));
}

/**
 * Calculates directional concentric radii when horizontal and vertical paddings differ.
 */
export function calculateConcentricRadii2D(
  outerRadius: number,
  paddingX: number,
  paddingY: number
): { rx: number; ry: number } {
  return {
    rx: Math.max(0, Math.round(outerRadius - paddingX)),
    ry: Math.max(0, Math.round(outerRadius - paddingY)),
  };
}

/**
 * Generates an SVG path string for an Apple-style squircle (Continuous Curvature / G2 Smoothing).
 * Uses cubic Bézier transition curves flanking a central circular arc (Figma/Apple algorithm).
 */
export function getSquircleSvgPath({
  width,
  height,
  cornerRadius,
  cornerSmoothing = 0.6,
}: SquircleParams): string {
  const maxRadius = Math.min(width, height) / 2;
  const radius = Math.min(Math.max(0, cornerRadius), maxRadius);
  const s = Math.min(Math.max(0, cornerSmoothing), 1);

  if (radius <= 0) {
    return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
  }

  // Length along each straight edge where the continuous curve begins
  let p = (1 + s) * radius;
  if (p > maxRadius) {
    p = maxRadius;
  }

  // Circular arc transition angles
  const alpha = (Math.PI / 4) * s;
  const sinAlpha = Math.sin(alpha);
  const cosAlpha = Math.cos(alpha);

  // Endpoint of the circular arc section
  const arcY = radius * (1 - sinAlpha);

  // Cubic Bézier handle lengths calibrated for G2 continuous curvature
  const d1 = (p - (radius - arcY)) * 0.55;
  const d2 = radius * Math.tan((Math.PI / 4 - alpha) / 2) * 0.55228;

  const fmt = (n: number) => Number(n.toFixed(3));

  // Construct closed path clockwise
  let d = `M ${fmt(p)} 0`;

  // --- Top Edge -> Top-Right Corner ---
  d += ` L ${fmt(width - p)} 0`;
  d += ` C ${fmt(width - p + d1)} 0, ${fmt(width - radius + radius * sinAlpha - d2 * cosAlpha)} ${fmt(radius - radius * cosAlpha - d2 * sinAlpha)}, ${fmt(width - radius + radius * sinAlpha)} ${fmt(radius - radius * cosAlpha)}`;
  if (s < 0.999) {
    d += ` A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(width - radius + radius * cosAlpha)} ${fmt(radius - radius * sinAlpha)}`;
  }
  d += ` C ${fmt(width - radius + radius * cosAlpha + d2 * sinAlpha)} ${fmt(radius - radius * sinAlpha + d2 * cosAlpha)}, ${fmt(width)} ${fmt(p - d1)}, ${fmt(width)} ${fmt(p)}`;

  // --- Right Edge -> Bottom-Right Corner ---
  d += ` L ${fmt(width)} ${fmt(height - p)}`;
  d += ` C ${fmt(width)} ${fmt(height - p + d1)}, ${fmt(width - radius + radius * cosAlpha + d2 * sinAlpha)} ${fmt(height - radius + radius * sinAlpha + d2 * cosAlpha)}, ${fmt(width - radius + radius * cosAlpha)} ${fmt(height - radius + radius * sinAlpha)}`;
  if (s < 0.999) {
    d += ` A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(width - radius + radius * sinAlpha)} ${fmt(height - radius + radius * cosAlpha)}`;
  }
  d += ` C ${fmt(width - radius + radius * sinAlpha - d2 * cosAlpha)} ${fmt(height - radius + radius * cosAlpha + d2 * sinAlpha)}, ${fmt(width - p + d1)} ${fmt(height)}, ${fmt(width - p)} ${fmt(height)}`;

  // --- Bottom Edge -> Bottom-Left Corner ---
  d += ` L ${fmt(p)} ${fmt(height)}`;
  d += ` C ${fmt(p - d1)} ${fmt(height)}, ${fmt(radius - radius * sinAlpha + d2 * cosAlpha)} ${fmt(height - radius + radius * cosAlpha + d2 * sinAlpha)}, ${fmt(radius - radius * sinAlpha)} ${fmt(height - radius + radius * cosAlpha)}`;
  if (s < 0.999) {
    d += ` A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(radius - radius * cosAlpha)} ${fmt(height - radius + radius * sinAlpha)}`;
  }
  d += ` C ${fmt(radius - radius * cosAlpha - d2 * sinAlpha)} ${fmt(height - radius + radius * sinAlpha + d2 * cosAlpha)}, 0 ${fmt(height - p + d1)}, 0 ${fmt(height - p)}`;

  // --- Left Edge -> Top-Left Corner ---
  d += ` L 0 ${fmt(p)}`;
  d += ` C 0 ${fmt(p - d1)}, ${fmt(radius - radius * cosAlpha - d2 * sinAlpha)} ${fmt(radius - radius * sinAlpha - d2 * cosAlpha)}, ${fmt(radius - radius * cosAlpha)} ${fmt(radius - radius * sinAlpha)}`;
  if (s < 0.999) {
    d += ` A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(radius - radius * sinAlpha)} ${fmt(radius - radius * cosAlpha)}`;
  }
  d += ` C ${fmt(radius - radius * sinAlpha + d2 * cosAlpha)} ${fmt(radius - radius * cosAlpha - d2 * sinAlpha)}, ${fmt(p - d1)} 0, ${fmt(p)} 0`;

  d += ` Z`;
  return d;
}

/**
 * Creates an inline SVG Data URI containing the squircle path for use with CSS mask-image.
 */
export function getSquircleSvgDataUri(
  width: number,
  height: number,
  cornerRadius: number,
  cornerSmoothing = 0.6
): string {
  const path = getSquircleSvgPath({ width, height, cornerRadius, cornerSmoothing });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${path}" fill="black"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Registers the CSS Houdini Paint Worklet for smooth-corners if supported by the browser engine.
 */
export function registerSquircleHoudini(): void {
  if (typeof window === "undefined") return;

  const CSSObj = (window as any).CSS;
  if (CSSObj && "paintWorklet" in CSSObj) {
    const workletCode = `
      registerPaint('smooth-corners', class {
        static get inputProperties() {
          return ['--smooth-corners', '--smooth-corners-radius'];
        }
        paint(ctx, geom, properties) {
          const n = parseFloat(properties.get('--smooth-corners').toString()) || 4.2;
          const w = geom.width;
          const h = geom.height;
          const a = w / 2;
          const b = h / 2;

          ctx.beginPath();
          for (let i = 0; i <= 360; i += 2) {
            const rad = (i * Math.PI) / 180;
            const cosT = Math.cos(rad);
            const sinT = Math.sin(rad);
            const x = a + Math.sign(cosT) * a * Math.pow(Math.abs(cosT), 2 / n);
            const y = b + Math.sign(sinT) * b * Math.pow(Math.abs(sinT), 2 / n);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = '#000';
          ctx.fill();
        }
      });
    `;

    try {
      const blob = new Blob([workletCode], { type: "text/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      CSSObj.paintWorklet.addModule(blobUrl).catch(() => {
        // Fallback gracefully to CSS corner-shape & border-radius
      });
    } catch {
      // Houdini registration optional
    }
  }
}

/**
 * Initializes the Squircle & Concentric Radii Engine.
 * Adds Houdini worklet, enables native corner-shape, and sets up dynamic concentric calculations.
 */
export function initSquircleEngine(): void {
  if (typeof document === "undefined") return;

  // 1. Register CSS Houdini if supported
  registerSquircleHoudini();

  // 2. Add squircle identification attribute to documentElement
  const supportsNativeCornerShape = typeof CSS !== "undefined" && CSS.supports && CSS.supports("corner-shape", "squircle");
  document.documentElement.dataset.supportsCornerShape = String(supportsNativeCornerShape);

  // 3. Inject CSS custom properties on root
  document.documentElement.style.setProperty("--squircle-smoothing", "0.6");
}
