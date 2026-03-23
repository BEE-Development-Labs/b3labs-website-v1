(function () {
  'use strict';

  const canvas = document.getElementById('hero-network');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // --- Config ---
  const NODE_COUNT = 28;
  const CONNECT_DIST = 180;      // px – max distance to draw a line
  const MOUSE_RADIUS = 160;      // px – cursor interaction radius
  const MOUSE_REPEL = 0.035;     // strength of repulsion
  const BASE_SPEED = 0.25;       // drift speed
  const RETURN_SPEED = 0.008;    // how fast nodes drift back to home

  // Colors matching the original image
  const COLORS = {
    nodeFill: ['#1a7a8a', '#1b6b9e', '#22a7a7', '#1565a0', '#0d9488'],
    nodeStroke: ['#0f5a6a', '#0e4a7a', '#148585', '#0e4a7a', '#0a7a70'],
    lineLight: 'rgba(34, 186, 186, ',   // teal lines (close alpha)
    lineDark: 'rgba(21, 101, 160, ',     // blue lines
    glowColor: 'rgba(34, 186, 186, 0.25)',
  };

  let W, H;
  let mouse = { x: -9999, y: -9999 };
  let nodes = [];
  let raf;

  // --- Node class ---
  class Node {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.homeX = this.x;
      this.homeY = this.y;
      this.vx = (Math.random() - 0.5) * BASE_SPEED;
      this.vy = (Math.random() - 0.5) * BASE_SPEED;
      this.r = 3 + Math.random() * 5;              // radius 3-8
      this.colorIdx = Math.floor(Math.random() * COLORS.nodeFill.length);
      this.phase = Math.random() * Math.PI * 2;     // for pulsing
      this.pulseSpeed = 0.01 + Math.random() * 0.02;
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reinit nodes if first time or canvas changed significantly
    if (nodes.length === 0) {
      for (let i = 0; i < NODE_COUNT; i++) nodes.push(new Node());
    } else {
      nodes.forEach(n => {
        // Keep nodes in bounds
        n.homeX = Math.min(n.homeX, W);
        n.homeY = Math.min(n.homeY, H);
        n.x = Math.min(n.x, W);
        n.y = Math.min(n.y, H);
      });
    }
  }

  function tick(time) {
    ctx.clearRect(0, 0, W, H);

    const t = time * 0.001; // seconds

    // Update positions
    for (const n of nodes) {
      // Gentle drift
      n.x += n.vx;
      n.y += n.vy;

      // Drift back towards home
      n.x += (n.homeX - n.x) * RETURN_SPEED;
      n.y += (n.homeY - n.y) * RETURN_SPEED;

      // Mouse repulsion
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (1 - dist / MOUSE_RADIUS) * MOUSE_REPEL;
        n.x += (dx / dist) * force * MOUSE_RADIUS;
        n.y += (dy / dist) * force * MOUSE_RADIUS;
      }

      // Bounce off edges (soft)
      if (n.x < n.r) { n.x = n.r; n.vx *= -1; }
      if (n.x > W - n.r) { n.x = W - n.r; n.vx *= -1; }
      if (n.y < n.r) { n.y = n.r; n.vy *= -1; }
      if (n.y > H - n.r) { n.y = H - n.r; n.vy *= -1; }

      // Pulse phase
      n.phase += n.pulseSpeed;
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.55;
          const useBlue = (i + j) % 3 === 0;
          const base = useBlue ? COLORS.lineDark : COLORS.lineLight;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = base + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1 + alpha * 1.2;
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const n of nodes) {
      const pulse = 1 + Math.sin(n.phase) * 0.2;
      const r = n.r * pulse;

      // Outer glow
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.glowColor;
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.nodeFill[n.colorIdx];
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.nodeStroke[n.colorIdx];
      ctx.fill();
    }

    raf = requestAnimationFrame(tick);
  }

  // --- Events ---
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onMouseLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  function onTouchMove(e) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onMouseLeave);

  // Resize handling
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Pause when off-screen
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }
  }, { threshold: 0.05 });

  observer.observe(canvas);

  // Init
  resize();
  raf = requestAnimationFrame(tick);
})();
