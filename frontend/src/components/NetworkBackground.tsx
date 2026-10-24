import React, { useEffect, useRef } from 'react';

interface NetworkBackgroundProps {
  opacity?: number; // 0.0 to 1.0 (defaults to 0.18)
  interactive?: boolean;
}

interface NodePoint {
  id: string;
  name: string;
  type: 'hospital' | 'supplier';
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  pulseOffset: number;
}

interface Corridor {
  from: string;
  to: string;
  pulseSpeed: number;
}

export const NetworkBackground: React.FC<NetworkBackgroundProps> = ({
  opacity = 0.20,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Relative Bengaluru Network Topology
    const nodes: NodePoint[] = [
      { id: 'S1', name: 'Peenya Depot (S1)', type: 'supplier', x: 0.22, y: 0.28, pulseOffset: 0 },
      { id: 'S2', name: 'Bommasandra Works (S2)', type: 'supplier', x: 0.32, y: 0.74, pulseOffset: 1.5 },
      { id: 'S3', name: 'Yelahanka Oxygen (S3)', type: 'supplier', x: 0.68, y: 0.18, pulseOffset: 3.0 },
      { id: 'S4', name: 'Kengeri Reserve (S4)', type: 'supplier', x: 0.16, y: 0.60, pulseOffset: 4.2 },
      { id: 'H1', name: 'Victoria Metropolitan (H1)', type: 'hospital', x: 0.48, y: 0.44, pulseOffset: 0.8 },
      { id: 'H2', name: 'St. Jude General (H2)', type: 'hospital', x: 0.78, y: 0.52, pulseOffset: 2.1 },
      { id: 'H3', name: 'County Emergency Clinic (H3)', type: 'hospital', x: 0.62, y: 0.82, pulseOffset: 3.7 },
    ];

    const corridors: Corridor[] = [
      { from: 'S1', to: 'H1', pulseSpeed: 0.0035 },
      { from: 'S1', to: 'H2', pulseSpeed: 0.0028 },
      { from: 'S2', to: 'H1', pulseSpeed: 0.0032 },
      { from: 'S2', to: 'H2', pulseSpeed: 0.0022 },
      { from: 'S2', to: 'H3', pulseSpeed: 0.0030 },
      { from: 'S3', to: 'H1', pulseSpeed: 0.0025 },
      { from: 'S3', to: 'H2', pulseSpeed: 0.0038 },
      { from: 'S4', to: 'H1', pulseSpeed: 0.0029 },
      { from: 'S4', to: 'H3', pulseSpeed: 0.0020 },
      { from: 'H1', to: 'H2', pulseSpeed: 0.0018 },
    ];

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const nx = (e.clientX / width - 0.5) * 8; // subtle 2-6px max
      const ny = (e.clientY / height - 0.5) * 8;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    let t = 0;

    const render = () => {
      t += 0.012;

      // Parallax smoothing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // 1. Ambient soft organic background glow pools
      const grad1 = ctx.createRadialGradient(
        width * 0.35 + px * 2,
        height * 0.35 + py * 2,
        50,
        width * 0.35,
        height * 0.35,
        width * 0.5
      );
      grad1.addColorStop(0, 'rgba(143, 209, 63, 0.08)');
      grad1.addColorStop(1, 'rgba(243, 244, 240, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.7 + px,
        height * 0.65 + py,
        80,
        width * 0.7,
        height * 0.65,
        width * 0.45
      );
      grad2.addColorStop(0, 'rgba(62, 107, 79, 0.06)');
      grad2.addColorStop(1, 'rgba(243, 244, 240, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Node map lookup with parallax applied
      const nodeMap = new Map<string, { x: number; y: number; node: NodePoint }>();
      nodes.forEach((n) => {
        const nx = n.x * width + px;
        const ny = n.y * height + py;
        nodeMap.set(n.id, { x: nx, y: ny, node: n });
      });

      // 2. Corridors with traveling light pulses
      corridors.forEach((corr, idx) => {
        const src = nodeMap.get(corr.from);
        const tgt = nodeMap.get(corr.to);
        if (!src || !tgt) return;

        // Base corridor line
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(62, 107, 79, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Traveling pulse particle along corridor
        const cycle = ((t * corr.pulseSpeed * 100 + idx * 0.25) % 1 + 1) % 1;
        const pulseX = src.x + (tgt.x - src.x) * cycle;
        const pulseY = src.y + (tgt.y - src.y) * cycle;

        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(143, 209, 63, 0.65)';
        ctx.shadowColor = 'rgba(143, 209, 63, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // 3. Faint Dot Markers for H1-H3 and S1-S4
      nodes.forEach((n) => {
        const pt = nodeMap.get(n.id);
        if (!pt) return;

        const pulse = Math.sin(t * 1.5 + n.pulseOffset) * 0.5 + 0.5;
        const isSupplier = n.type === 'supplier';

        // Outer faint ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (isSupplier ? 10 : 8) + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = isSupplier
          ? `rgba(62, 107, 79, ${0.12 + pulse * 0.15})`
          : `rgba(143, 209, 63, ${0.15 + pulse * 0.20})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Center solid core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSupplier ? 4.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isSupplier ? 'rgba(62, 107, 79, 0.65)' : 'rgba(143, 209, 63, 0.9)';
        ctx.fill();

        // Label caption
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(20, 23, 15, 0.40)';
        ctx.fillText(n.id, pt.x + 8, pt.y + 3);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-out"
    />
  );
};
