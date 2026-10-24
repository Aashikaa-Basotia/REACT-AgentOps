import React, { useEffect, useRef } from 'react';

interface NetworkBackgroundProps {
  opacity?: number; // 0.0 to 1.0 (defaults to 0.70)
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
  opacity = 0.70,
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
      { id: 'S1', name: 'Peenya Depot (S1)', type: 'supplier', x: 0.18, y: 0.24, pulseOffset: 0 },
      { id: 'S2', name: 'Hoskote Works (S2)', type: 'supplier', x: 0.35, y: 0.76, pulseOffset: 1.5 },
      { id: 'S3', name: 'Yelahanka Oxygen (S3)', type: 'supplier', x: 0.72, y: 0.16, pulseOffset: 3.0 },
      { id: 'S4', name: 'Kengeri Reserve (S4)', type: 'supplier', x: 0.14, y: 0.62, pulseOffset: 4.2 },
      { id: 'H1', name: 'Manipal ICU (H1)', type: 'hospital', x: 0.46, y: 0.40, pulseOffset: 0.8 },
      { id: 'H2', name: 'Sakra World (H2)', type: 'hospital', x: 0.80, y: 0.48, pulseOffset: 2.1 },
      { id: 'H3', name: 'Jayadeva Cardio (H3)', type: 'hospital', x: 0.60, y: 0.82, pulseOffset: 3.7 },
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
      const nx = (e.clientX / width - 0.5) * 12; // 6-12px parallax
      const ny = (e.clientY / height - 0.5) * 12;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    let t = 0;

    const render = () => {
      t += 0.014;

      // Parallax smoothing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // 1. Ambient soft organic background glow pools (High-Contrast Cyber-Emerald & Forest)
      const grad1 = ctx.createRadialGradient(
        width * 0.30 + px * 2,
        height * 0.30 + py * 2,
        60,
        width * 0.30,
        height * 0.30,
        width * 0.55
      );
      grad1.addColorStop(0, 'rgba(143, 209, 63, 0.30)');
      grad1.addColorStop(0.5, 'rgba(46, 125, 50, 0.16)');
      grad1.addColorStop(1, 'rgba(248, 249, 245, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.72 + px,
        height * 0.68 + py,
        90,
        width * 0.72,
        height * 0.68,
        width * 0.50
      );
      grad2.addColorStop(0, 'rgba(62, 107, 79, 0.25)');
      grad2.addColorStop(0.5, 'rgba(143, 209, 63, 0.14)');
      grad2.addColorStop(1, 'rgba(248, 249, 245, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Node map lookup with parallax applied
      const nodeMap = new Map<string, { x: number; y: number; node: NodePoint }>();
      nodes.forEach((n) => {
        const nx = n.x * width + px;
        const ny = n.y * height + py;
        nodeMap.set(n.id, { x: nx, y: ny, node: n });
      });

      // 2. Corridors with traveling vivid light pulses
      corridors.forEach((corr, idx) => {
        const src = nodeMap.get(corr.from);
        const tgt = nodeMap.get(corr.to);
        if (!src || !tgt) return;

        // Base corridor line (crisp high-contrast cyber emerald green)
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(46, 125, 50, 0.55)';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // Secondary corridor outer radiant halo
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(143, 209, 63, 0.32)';
        ctx.lineWidth = 6.5;
        ctx.stroke();

        // Primary Traveling pulse particle along corridor
        const cycle = ((t * corr.pulseSpeed * 100 + idx * 0.25) % 1 + 1) % 1;
        const pulseX = src.x + (tgt.x - src.x) * cycle;
        const pulseY = src.y + (tgt.y - src.y) * cycle;

        // Traveling pulse halo
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 6.0, 0, Math.PI * 2);
        ctx.fillStyle = '#8FD13F';
        ctx.shadowColor = '#4CAE0A';
        ctx.shadowBlur = 18;
        ctx.fill();

        // Secondary trailing sub-pulse (comet tail effect)
        const trailCycle = ((cycle - 0.08) % 1 + 1) % 1;
        const trailX = src.x + (tgt.x - src.x) * trailCycle;
        const trailY = src.y + (tgt.y - src.y) * trailCycle;
        ctx.beginPath();
        ctx.arc(trailX, trailY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(143, 209, 63, 0.65)';
        ctx.fill();

        ctx.shadowBlur = 0; // reset
      });

      // 3. Prominent Node Markers for H1-H3 and S1-S4
      nodes.forEach((n) => {
        const pt = nodeMap.get(n.id);
        if (!pt) return;

        const pulse = Math.sin(t * 2.0 + n.pulseOffset) * 0.5 + 0.5;
        const isSupplier = n.type === 'supplier';

        // Outer expanding radar pulse ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (isSupplier ? 16 : 14) + pulse * 10, 0, Math.PI * 2);
        ctx.strokeStyle = isSupplier
          ? `rgba(46, 125, 50, ${0.60 - pulse * 0.40})`
          : `rgba(217, 83, 79, ${0.65 - pulse * 0.45})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Mid glow circle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSupplier ? 12 : 11, 0, Math.PI * 2);
        ctx.fillStyle = isSupplier ? 'rgba(143, 209, 63, 0.45)' : 'rgba(217, 83, 79, 0.40)';
        ctx.fill();

        // Center solid core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSupplier ? 7.5 : 7.0, 0, Math.PI * 2);
        ctx.fillStyle = isSupplier ? '#2D5A1E' : '#D9534F';
        ctx.shadowColor = isSupplier ? '#8FD13F' : '#D9534F';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // High-contrast Node Tag Badge
        ctx.font = '900 13px "Outfit", sans-serif';
        const labelText = n.id;
        const textWidth = ctx.measureText(labelText).width;

        // Label pill background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(pt.x + 12, pt.y - 14, textWidth + 16, 24, 7);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = isSupplier ? 'rgba(46, 125, 50, 0.65)' : 'rgba(217, 83, 79, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Label text
        ctx.fillStyle = '#14170F';
        ctx.fillText(labelText, pt.x + 20, pt.y + 3);
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
