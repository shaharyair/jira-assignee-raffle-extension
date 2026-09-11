/**
 * Full-page celebration bursts fired when the reels land. These live on
 * document.body, not inside the Vue container, so they survive Jira rebuilding
 * the filter row mid-animation. The winner's name is announced by the slot
 * machine's plate (machine.ts), not here.
 */
const CONFETTI_COUNT = 20;
const COLORS = ["#0c66e4", "#ffc400", "#ff5630", "#36b37e", "#8777d9", "#00b8d9"];

const CSS = `
@keyframes jr-confetti { to { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0 } }
@keyframes jr-shockwave { to { transform: translate(-50%,-50%) scale(9); opacity: 0 } }
.jr-fx { position: fixed; z-index: 2147483647; pointer-events: none }
`;

let injected = false;
function ensureStyles() {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
}

const spawn = (className: string, styles: Partial<CSSStyleDeclaration>, life: number) => {
  ensureStyles();
  const el = document.createElement("div");
  el.className = `jr-fx ${className}`;
  Object.assign(el.style, styles);
  document.body.append(el);
  setTimeout(() => el.remove(), life);
  return el;
};

export function confetti(x: number, y: number) {
  ensureStyles();
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + Math.random();
    const distance = 80 + Math.random() * 140;
    const piece = spawn(
      "",
      {
        left: `${x}px`,
        top: `${y}px`,
        width: "8px",
        height: `${6 + Math.random() * 8}px`,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        background: COLORS[i % COLORS.length]!,
        animation: `jr-confetti ${0.9 + Math.random() * 0.5}s cubic-bezier(.1,.7,.3,1) forwards`,
      },
      1600,
    );
    piece.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--ty", `${Math.sin(angle) * distance + 60}px`);
    piece.style.setProperty("--rot", `${Math.random() * 900 - 450}deg`);
  }
}

export const shockwave = (x: number, y: number) =>
  spawn(
    "",
    {
      left: `${x}px`,
      top: `${y}px`,
      width: "40px",
      height: "40px",
      marginLeft: "-20px",
      marginTop: "-20px",
      border: "2px solid #ffc400",
      borderRadius: "50%",
      transform: "translate(-50%,-50%)",
      animation: "jr-shockwave .7s ease-out forwards",
    },
    800,
  );


