/**
 * Full-page celebration overlays. These live on document.body, not inside the
 * Vue container, so they survive Jira rebuilding the filter row mid-animation.
 */
const CONFETTI_COUNT = 20;
const COLORS = ["#0c66e4", "#ffc400", "#ff5630", "#36b37e", "#8777d9", "#00b8d9"];

const CSS = `
@keyframes jr-confetti { to { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0 } }
@keyframes jr-shockwave { to { transform: translate(-50%,-50%) scale(9); opacity: 0 } }
@keyframes jr-shake {
  10%,90% { transform: translate(-2px,1px) }
  30%,70% { transform: translate(3px,-2px) }
  50% { transform: translate(-3px,2px) }
}
@keyframes jr-toast {
  0% { transform: translateY(120%) scale(.8); opacity: 0 }
  12%,86% { transform: none; opacity: 1 }
  100% { transform: translateY(120%) scale(.8); opacity: 0 }
}
.jr-fx { position: fixed; z-index: 2147483647; pointer-events: none }
.jr-toast {
  right: 24px; bottom: 24px; display: flex; align-items: center; gap: 12px;
  padding: 12px 18px 12px 12px; border-radius: 999px; color: #fff;
  font: 600 14px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: linear-gradient(120deg, #0c66e4, #8777d9);
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  animation: jr-toast 3.2s cubic-bezier(.2,.9,.2,1) forwards;
}
.jr-toast img { width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 0 0 2px #ffc400 }
.jr-toast small { display: block; font-weight: 500; opacity: .75; font-size: 11px; letter-spacing: .08em }
@media (prefers-reduced-motion: reduce) { .jr-toast { animation-duration: 2.4s; animation-timing-function: ease } }
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

export function shake() {
  document.body.style.animation = "jr-shake .2s ease-in-out";
  setTimeout(() => (document.body.style.animation = ""), 220);
}

export function winnerToast(name: string, avatar: string) {
  const el = spawn("jr-toast", {}, 3400);
  el.setAttribute("role", "status");
  const img = document.createElement("img");
  img.src = avatar;
  img.alt = "";
  const text = document.createElement("div");
  text.innerHTML = "<small>🎉 RAFFLE WINNER</small>";
  text.append(name);
  if (avatar) el.append(img);
  el.append(text);
}
