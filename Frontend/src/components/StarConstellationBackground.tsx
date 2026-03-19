import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  twinkleOffset: number;
};

const STAR_COUNT = 120;
const LINE_DISTANCE = 120;

export default function StarConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const starsRef = useRef<Star[]>([]);

  const initStars = (width: number, height: number): Star[] => {
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 1.3 + 0.7;
      const velocityX = (Math.random() - 0.5) * 0.02;
      const velocityY = (Math.random() - 0.5) * 0.02;
      const twinkleOffset = Math.random() * Math.PI * 2;
      stars.push({ x, y, radius, velocityX, velocityY, twinkleOffset });
    }
    return stars;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      starsRef.current = initStars(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
      mouseRef.current.active = true;
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    const draw = () => {
      const { innerWidth: width, innerHeight: height } = window;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      const stars = starsRef.current;
      const mouse = mouseRef.current;

      // draw connecting lines
      for (let i = 0; i < stars.length; i++) {
        const starA = stars[i];

        for (let j = i + 1; j < stars.length; j++) {
          const starB = stars[j];
          const dx = starA.x - starB.x;
          const dy = starA.y - starB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < LINE_DISTANCE) {
            const alpha = 1 - dist / LINE_DISTANCE;
            ctx.strokeStyle = `rgba(130, 180, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(starA.x, starA.y);
            ctx.lineTo(starB.x, starB.y);
            ctx.stroke();
          }
        }

        if (mouse.active) {
          const dx = starA.x - mouse.x;
          const dy = starA.y - mouse.y;
          const mdist = Math.sqrt(dx * dx + dy * dy);
          if (mdist < LINE_DISTANCE) {
            const alpha = 1 - mdist / LINE_DISTANCE;
            ctx.strokeStyle = `rgba(250, 250, 255, ${alpha * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(starA.x, starA.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            const attraction = (LINE_DISTANCE - mdist) * 0.0008;
            starA.x += (mouse.x - starA.x) * attraction;
            starA.y += (mouse.y - starA.y) * attraction;
          }
        }
      }

      // draw stars
      for (const star of stars) {
        star.x += star.velocityX;
        star.y += star.velocityY;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        const glow =
          0.5 + Math.sin(Date.now() * 0.005 + star.twinkleOffset) * 0.4;
        const alpha = 0.6 + 0.4 * glow;

        const gradient = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          star.radius * 3,
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(160, 210, 255, ${alpha * 0.7})`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
