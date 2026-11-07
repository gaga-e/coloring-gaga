// Lightweight, zero-dependency canvas confetti engine
export default function confetti(options: { particleCount?: number; spread?: number; origin?: { y?: number } } = {}) {
  if (typeof window === "undefined") return;

  const count = options.particleCount || 70;
  const originY = options.origin?.y ?? 0.6;
  const colors = ["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"];

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    tilt: number;
    tiltAngle: number;
    tiltAngleIncremental: number;
    alpha: number;
  }> = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI) - Math.PI / 2;
    const speed = 12 + Math.random() * 14;
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * originY,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: -Math.abs(Math.sin(angle) * speed) - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 6,
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
      alpha: 1,
    });
  }

  let animationFrameId: number;

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let activeParticles = 0;

    for (const p of particles) {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.tiltAngle) + 3 + p.size / 2) / 2 + p.vy;
      p.x += Math.sin(p.tiltAngle) * 2 + p.vx;
      p.vy += 0.4; // gravity
      p.vx *= 0.98; // drag
      p.alpha -= 0.008;

      if (p.alpha > 0 && p.y < canvas.height + 20) {
        activeParticles++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, p.tiltAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };

  render();
}
