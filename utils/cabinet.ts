/**
 * Cabinet artwork: one inline SVG, drawn once behind the live reels.
 *
 * A vintage Vegas one-armed bandit — chrome shell, red enamel panels, a
 * bulb-lit crown, gold JACKPOT plate, arrow payline and a coin tray. The frame
 * is illustration, not CSS gradients pretending to be metal.
 *
 * The three reel windows are left empty here and the real, animated reels are
 * positioned over them by machine.ts, so the coordinates below are the
 * contract: change a WINDOW_* value and the CSS must move with it.
 */

/** Cabinet artboard. 1 SVG unit == 1 CSS px, so overlays can use these directly. */
export const CAB_W = 380;
export const CAB_H = 470;

/** Reel window geometry, shared with the CSS that positions the live reels. */
export const WINDOW_X = 40;
export const WINDOW_Y = 176;
export const WINDOW_GAP = 6;

/** Award plate and credit strip, where machine.ts drops its live text. */
export const PANEL_Y = 316;
export const PANEL_H = 52;
export const LED_Y = 386;
export const LED_H = 24;

/** Crown bulbs, laid along the arch. */
const BULBS = Array.from({ length: 13 }, (_, i) => {
  const angle = Math.PI * (0.06 + (i / 12) * 0.88);
  return { x: 190 - Math.cos(angle) * 150, y: 128 - Math.sin(angle) * 86 };
})
  .map(
    (p, i) =>
      `<circle class="jr-bulb" style="animation-delay:${(i % 3) * 0.28}s" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.2" fill="#ffd85e" stroke="#a8761b" stroke-width="1.4"/>`,
  )
  .join("");

export const CABINET_SVG = `
<svg class="jr-art" viewBox="0 0 ${CAB_W} ${CAB_H}" width="${CAB_W}" height="${CAB_H}" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="jr-chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5d646e"/><stop offset=".08" stop-color="#aeb6c1"/>
      <stop offset=".2" stop-color="#f6f8fa"/><stop offset=".34" stop-color="#c2c9d3"/>
      <stop offset=".5" stop-color="#8d95a1"/><stop offset=".68" stop-color="#e8ecf1"/>
      <stop offset=".86" stop-color="#9aa2ae"/><stop offset="1" stop-color="#525963"/>
    </linearGradient>
    <linearGradient id="jr-chrome-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbfcfd"/><stop offset=".45" stop-color="#c0c7d1"/>
      <stop offset=".55" stop-color="#79818d"/><stop offset="1" stop-color="#dfe4ea"/>
    </linearGradient>
    <linearGradient id="jr-enamel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e03b3b"/><stop offset=".45" stop-color="#c1121f"/>
      <stop offset="1" stop-color="#7c0a13"/>
    </linearGradient>
    <linearGradient id="jr-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#e0b23c"/>
      <stop offset="1" stop-color="#9a6f14"/>
    </linearGradient>
    <linearGradient id="jr-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".5"/>
      <stop offset=".42" stop-color="#fff" stop-opacity=".07"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>
    <radialGradient id="jr-tray" cx=".5" cy="0" r="1">
      <stop offset="0" stop-color="#05070a"/><stop offset="1" stop-color="#2b3038"/>
    </radialGradient>
    <filter id="jr-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="jr-drop" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".5"/>
    </filter>
  </defs>

  <!-- Chrome shell: domed crown over a straight cabinet -->
  <path d="M20 132C20 66 96 26 190 26s170 40 170 106v296a16 16 0 0 1-16 16H36a16 16 0 0 1-16-16z"
        fill="url(#jr-chrome)" filter="url(#jr-drop)"/>
  <path d="M20 132C20 66 96 26 190 26s170 40 170 106v296a16 16 0 0 1-16 16H36a16 16 0 0 1-16-16z"
        fill="none" stroke="#4a515b" stroke-width="2"/>

  <!-- Red enamel crown face, ringed by bulbs -->
  <path d="M44 136c0-52 66-86 146-86s146 34 146 86v26H44z" fill="url(#jr-enamel)"/>
  <path d="M44 136c0-52 66-86 146-86s146 34 146 86v26H44z" fill="none"
        stroke="url(#jr-chrome-v)" stroke-width="5"/>
  ${BULBS}

  <!-- JACKPOT plate on the crown -->
  <rect x="104" y="84" width="172" height="38" rx="8" fill="url(#jr-gold)" filter="url(#jr-drop)"/>
  <rect x="109" y="89" width="162" height="28" rx="5" fill="#2b0d0d"/>
  <text x="190" y="110" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-weight="700" font-size="21" letter-spacing="5" fill="#ffd85e" filter="url(#jr-glow)">JACKPOT</text>

  <!-- Chrome reel bezel; the three windows are cut dark, live reels sit on top -->
  <rect x="28" y="166" width="324" height="116" rx="12" fill="url(#jr-chrome-v)" filter="url(#jr-drop)"/>
  <rect x="34" y="172" width="312" height="104" rx="8" fill="#1c1a17"/>

  <!-- Payline arrows, pointing at the centre line -->
  <path d="M24 224l14-9v18z" fill="#ffd85e" stroke="#7c0a13" stroke-width="1.5"/>
  <path d="M356 224l-14-9v18z" fill="#ffd85e" stroke="#7c0a13" stroke-width="1.5"/>

  <!-- Coin head, centred between the reels and the award plate -->
  <rect x="168" y="288" width="44" height="20" rx="5" fill="url(#jr-chrome-v)"/>
  <rect x="184" y="293" width="12" height="10" rx="2" fill="#14171c"/>

  <!-- Award plate: gold frame, black face (winner name is HTML over this) -->
  <rect x="${WINDOW_X - 8}" y="${PANEL_Y - 8}" width="${CAB_W - 2 * (WINDOW_X - 8)}" height="${PANEL_H + 16}"
        rx="8" fill="url(#jr-gold)" filter="url(#jr-drop)"/>
  <rect x="${WINDOW_X - 2}" y="${PANEL_Y - 2}" width="${CAB_W - 2 * (WINDOW_X - 2)}" height="${PANEL_H + 4}"
        rx="5" fill="#160b0b"/>

  <!-- Credit strip -->
  <rect x="96" y="${LED_Y - 4}" width="188" height="${LED_H + 8}" rx="5" fill="#07090d"
        stroke="url(#jr-chrome-v)" stroke-width="3"/>

  <!-- Coin tray across the foot -->
  <rect x="40" y="424" width="300" height="26" rx="7" fill="url(#jr-tray)"/>
  <rect x="40" y="424" width="300" height="26" rx="7" fill="none" stroke="url(#jr-chrome-v)" stroke-width="3"/>
</svg>
`;

/** Glass sheen laid over the reel windows, so they read as behind glass. */
export const GLASS_SVG = `
<svg class="jr-glass" viewBox="0 0 ${CAB_W} ${CAB_H}" width="${CAB_W}" height="${CAB_H}" aria-hidden="true" focusable="false">
  <rect x="34" y="172" width="312" height="104" rx="8" fill="url(#jr-glass)"/>
</svg>
`;
