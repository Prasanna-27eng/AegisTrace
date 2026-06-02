import React, { useEffect, useRef } from 'react';

export default function WireframeBackground({ opacity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 3D helpers
    const rotX = (p, a) => ({ x: p.x, y: p.y * Math.cos(a) - p.z * Math.sin(a), z: p.y * Math.sin(a) + p.z * Math.cos(a) });
    const rotY = (p, a) => ({ x: p.x * Math.cos(a) + p.z * Math.sin(a), y: p.y, z: -p.x * Math.sin(a) + p.z * Math.cos(a) });
    const rotZ = (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a), z: p.z });

    const project = (p, cx, cy, fov) => {
      const s = fov / (fov + p.z + 600);
      return { x: cx + p.x * s, y: cy + p.y * s };
    };

    const makeCube = (size) => {
      const h = size / 2;
      return [
        { x: -h, y: -h, z: -h }, { x: h, y: -h, z: -h },
        { x:  h, y:  h, z: -h }, { x: -h, y:  h, z: -h },
        { x: -h, y: -h, z:  h }, { x: h, y: -h, z:  h },
        { x:  h, y:  h, z:  h }, { x: -h, y:  h, z:  h },
      ];
    };

    const edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];

    const diagonals = [[0,6],[1,7],[2,4],[3,5]];

    const CUBES = [
      { size: 280, rx: 0.0032, ry: 0.0048, rz: 0.0018, px: 0,   py: 0,   pz: 0   },
      { size: 170, rx: -0.005, ry: 0.0038, rz: -0.003, px: 1.2, py: 0.7, pz: 0.4 },
      { size:  95, rx: 0.008,  ry: -0.006, rz: 0.005,  px: 2.1, py: 1.5, pz: 1.1 },
      { size:  45, rx: -0.013, ry: 0.01,   rz: -0.007, px: 3.0, py: 2.4, pz: 1.9 },
    ];

    // Particles
    const particles = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      a: Math.random() * 0.3 + 0.05,
    }));

    const draw = () => {
      t += 0.012;
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      // Particles
      particles.forEach(p => {
        p.x = ((p.x + p.vx + 1) % 1);
        p.y = ((p.y + p.vy + 1) % 1);
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192,57,43,${p.a})`;
        ctx.fill();
      });

      const cx = W / 2, cy = H / 2, fov = 600;

      CUBES.forEach((c, i) => {
        const verts = makeCube(c.size).map(v => {
          let p = rotX(v, t * c.rx + c.px);
          p = rotY(p, t * c.ry + c.py);
          p = rotZ(p, t * c.rz + c.pz);
          return p;
        });
        const proj = verts.map(v => project(v, cx, cy, fov));

        const isAccent = i === 0 || i === 2;
        const alpha = isAccent
          ? Math.max(0.08, 0.55 - i * 0.08)
          : Math.max(0.03, 0.12 - i * 0.02);

        // Cube edges
        edges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(proj[a].x, proj[a].y);
          ctx.lineTo(proj[b].x, proj[b].y);
          ctx.strokeStyle = isAccent
            ? `rgba(192,57,43,${alpha})`
            : `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = isAccent ? 0.9 : 0.5;
          ctx.setLineDash([]);
          ctx.stroke();
        });

        // Diagonal traces on outermost cube
        if (i === 0) {
          diagonals.forEach(([a, b]) => {
            ctx.beginPath();
            ctx.moveTo(proj[a].x, proj[a].y);
            ctx.lineTo(proj[b].x, proj[b].y);
            ctx.strokeStyle = `rgba(192,57,43,${alpha * 0.5})`;
            ctx.lineWidth = 0.6;
            ctx.setLineDash([4, 7]);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }
      });

      // Cross-cube connector lines (outer → inner)
      const outer = makeCube(CUBES[0].size).map(v => {
        let p = rotX(v, t * CUBES[0].rx + CUBES[0].px);
        p = rotY(p, t * CUBES[0].ry + CUBES[0].py);
        p = rotZ(p, t * CUBES[0].rz + CUBES[0].pz);
        return project(p, cx, cy, fov);
      });
      const inner = makeCube(CUBES[2].size).map(v => {
        let p = rotX(v, t * CUBES[2].rx + CUBES[2].px);
        p = rotY(p, t * CUBES[2].ry + CUBES[2].py);
        p = rotZ(p, t * CUBES[2].rz + CUBES[2].pz);
        return project(p, cx, cy, fov);
      });
      [[0, 0], [1, 1], [6, 6], [7, 7]].forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(outer[a].x, outer[a].y);
        ctx.lineTo(inner[b].x, inner[b].y);
        ctx.strokeStyle = 'rgba(192,57,43,0.12)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        opacity, pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}
