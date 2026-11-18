// High-performance, zero-dependency dual-side canvas confetti engine
export interface ConfettiOptions {
  particleCount?: number;
  durationMs?: number;
}

export function shootDualConfetti(options: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;

  const totalCount = options.particleCount || 120;
  const colors = [
    "#F59E0B", // Amber
    "#EF4444", // Rose
    "#3B82F6", // Sky
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F97316", // Orange
    "#FBBF24", // Gold
    "#06B6D4", // Cyan
  ];

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

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    width: number;
    height: number;
    rotation: number;
    rotationSpeed: number;
    tiltAngle: number;
    tiltSpeed: number;
    alpha: number;
    shape: "rect" | "circle";
  }

  const particles: Particle[] = [];
  const halfCount = Math.floor(totalCount / 2);

  // Left Cannon: fires up-right from bottom-left corner
  for (let i = 0; i < halfCount; i++) {
    const angle = (Math.PI / 180) * (35 + Math.random() * 35); // 35° to 70° (up & right)
    const speed = 16 + Math.random() * 16;
    particles.push({
      x: Math.random() * (canvas.width * 0.08),
      y: canvas.height * (0.8 + Math.random() * 0.15),
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      width: 7 + Math.random() * 7,
      height: 12 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      tiltAngle: Math.random() * Math.PI,
      tiltSpeed: 0.06 + Math.random() * 0.08,
      alpha: 1,
      shape: Math.random() > 0.3 ? "rect" : "circle",
    });
  }

  // Right Cannon: fires up-left from bottom-right corner
  for (let i = 0; i < halfCount; i++) {
    const angle = (Math.PI / 180) * (35 + Math.random() * 35); // 35° to 70° (up & left)
    const speed = 16 + Math.random() * 16;
    particles.push({
      x: canvas.width - Math.random() * (canvas.width * 0.08),
      y: canvas.height * (0.8 + Math.random() * 0.15),
      vx: -Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      width: 7 + Math.random() * 7,
      height: 12 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      tiltAngle: Math.random() * Math.PI,
      tiltSpeed: 0.06 + Math.random() * 0.08,
      alpha: 1,
      shape: Math.random() > 0.3 ? "rect" : "circle",
    });
  }

  let animationFrameId: number;

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let activeParticles = 0;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Gravity
      p.vx *= 0.985; // Drag
      p.rotation += p.rotationSpeed;
      p.tiltAngle += p.tiltSpeed;
      p.alpha -= 0.007; // Fade

      if (p.alpha > 0 && p.y < canvas.height + 40) {
        activeParticles++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const currentWidth = p.width * Math.cos(p.tiltAngle);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-currentWidth / 2, -p.height / 2, currentWidth, p.height);
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, Math.abs(currentWidth) / 2, p.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }

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

// Default export triggers a two-wave dual-side confetti blast
export default function confetti(options: ConfettiOptions = {}) {
  shootDualConfetti(options);
  // Second celebratory wave 350ms later for extra fullness
  setTimeout(() => {
    shootDualConfetti({ particleCount: 80 });
  }, 350);
}
