(function () {
  'use strict';

  const canvas = document.getElementById('hero-network');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // --- Config ---
  const CONNECT_DIST = 160;
  const MOUSE_RADIUS = 160;
  const MOUSE_REPEL = 0.035;
  const BASE_SPEED = 0.25;
  const RETURN_SPEED = 0.008;

  // Brand colors: Teal #47C4C6, Pink #F4A0C4, Gold #D2BF3D
  const COLORS = {
    nodeFill: ['#47C4C6', '#F4A0C4', '#D2BF3D'],
    nodeStroke: ['#339a9c', '#c87da0', '#a89830'],
    lineLight: 'rgba(71, 196, 198, ',
    lineDark: 'rgba(244, 160, 196, ',
    glowColor: 'rgba(210, 191, 61, 0.2)',
  };

  // Pre-parsed RGB values for smooth color blending
  const FILL_RGB = [
    [71, 196, 198],   // teal
    [244, 160, 196],  // pink
    [210, 191, 61],   // gold
  ];
  const STROKE_RGB = [
    [51, 154, 156],   // teal dark
    [200, 125, 160],  // pink dark
    [168, 152, 48],   // gold dark
  ];
  const GOLD_FILL = FILL_RGB[2];
  const GOLD_STROKE = STROKE_RGB[2];

  // --- WAGMI Easter Egg ---
  const WAGMI_TRIGGER = 30;
  const WAGMI_FORM = 1.8;
  const WAGMI_HOLD = 4;
  const WAGMI_DISSOLVE = 1.8;

  // 3x5 pixel font (row-major)
  const FONT = {
    W: [
      1,0,1,
      1,0,1,
      1,0,1,
      1,1,1,
      0,1,0,
    ],
    A: [
      0,1,0,
      1,0,1,
      1,1,1,
      1,0,1,
      1,0,1,
    ],
    G: [
      1,1,1,
      1,0,0,
      1,0,1,
      1,0,1,
      1,1,1,
    ],
    M: [
      1,0,1,
      1,1,1,
      1,1,1,
      1,0,1,
      1,0,1,
    ],
    I: [
      1,1,1,
      0,1,0,
      0,1,0,
      0,1,0,
      1,1,1,
    ],
  };

  // Build WAGMI grid positions (in grid-unit coords, NOT normalized)
  const LW = 3, LH = 5, GAP = 2;
  const LETTERS = ['W', 'A', 'G', 'M', 'I'];
  const GRID_W = LETTERS.length * LW + (LETTERS.length - 1) * GAP;
  const GRID_H = LH;

  function buildWagmiTargets() {
    const positions = [];
    for (let li = 0; li < LETTERS.length; li++) {
      const grid = FONT[LETTERS[li]];
      const ox = li * (LW + GAP);
      for (let row = 0; row < LH; row++) {
        for (let col = 0; col < LW; col++) {
          if (grid[row * LW + col]) {
            positions.push({
              gx: ox + col + 0.5,  // grid x (center of cell)
              gy: row + 0.5,       // grid y (center of cell)
            });
          }
        }
      }
    }
    return positions;
  }

  const wagmiSlots = buildWagmiTargets(); // 52 filled cells
  const NODE_COUNT = Math.max(wagmiSlots.length + 3, 55);

  let W, H;
  let mouse = { x: -9999, y: -9999 };
  let nodes = [];
  let raf;

  // WAGMI state
  let hoverAccum = 0;
  let isHovering = false;
  let wagmiState = 'idle';       // idle | forming | holding | dissolving
  let wagmiTimer = 0;
  let lastTickTime = 0;

  // --- Lerp helper for RGB ---
  function lerpRGB(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function rgbStr(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

  // --- Node class ---
  class Node {
    constructor() {
      this.x = 0; this.y = 0;
      this.homeX = 0; this.homeY = 0;
      this.vx = 0; this.vy = 0;
      this.r = 0; this.origR = 0;
      this.colorIdx = 0; this.origColorIdx = 0;
      this.phase = 0; this.pulseSpeed = 0;
      this.rotation = 0; this.rotSpeed = 0;
      this.snapX = 0; this.snapY = 0;
      this.targetX = 0; this.targetY = 0;
      this.isLetter = false;
      this.goldBlend = 0;   // 0 = original color, 1 = gold
      this.reset();
    }

    reset() {
      this.x = Math.random() * (W || 500);
      this.y = Math.random() * (H || 400);
      this.homeX = this.x;
      this.homeY = this.y;
      this.vx = (Math.random() - 0.5) * BASE_SPEED;
      this.vy = (Math.random() - 0.5) * BASE_SPEED;
      this.r = 5 + Math.random() * 7;
      this.origR = this.r;
      this.colorIdx = Math.floor(Math.random() * COLORS.nodeFill.length);
      this.origColorIdx = this.colorIdx;
      this.phase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.01 + Math.random() * 0.02;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.008;
      this.goldBlend = 0;
    }
  }

  // --- Resize ---
  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (nodes.length === 0) {
      for (let i = 0; i < NODE_COUNT; i++) nodes.push(new Node());
    } else {
      for (const n of nodes) {
        n.homeX = Math.min(n.homeX, W);
        n.homeY = Math.min(n.homeY, H);
        n.x = Math.min(n.x, W);
        n.y = Math.min(n.y, H);
      }
    }
    computeWagmiTargets();
  }

  // Map grid positions → canvas positions, preserving the grid's aspect ratio
  function computeWagmiTargets() {
    const margin = 0.10; // 10% margin on each side
    const availW = W * (1 - margin * 2);
    const availH = H * (1 - margin * 2);

    // Grid natural aspect ratio
    const gridAspect = GRID_W / GRID_H; // ~19/5 = 3.8
    const canvasAspect = availW / availH;

    let cellSize;
    if (canvasAspect > gridAspect) {
      // Canvas is wider — height is the constraint
      cellSize = availH / GRID_H;
    } else {
      // Canvas is taller — width is the constraint
      cellSize = availW / GRID_W;
    }

    const totalPxW = GRID_W * cellSize;
    const totalPxH = GRID_H * cellSize;
    const offsetX = (W - totalPxW) / 2;  // center horizontally
    const offsetY = (H - totalPxH) / 2;  // center vertically

    for (let i = 0; i < nodes.length; i++) {
      if (i < wagmiSlots.length) {
        nodes[i].targetX = offsetX + wagmiSlots[i].gx * cellSize;
        nodes[i].targetY = offsetY + wagmiSlots[i].gy * cellSize;
        nodes[i].isLetter = true;
      } else {
        nodes[i].targetX = -60;
        nodes[i].targetY = H / 2;
        nodes[i].isLetter = false;
      }
    }
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // --- Trigger WAGMI ---
  function triggerWagmi() {
    wagmiState = 'forming';
    wagmiTimer = 0;
    for (const n of nodes) {
      n.snapX = n.x;
      n.snapY = n.y;
      n.origR = n.r;
      n.origColorIdx = n.colorIdx;
    }
  }

  // --- Begin dissolve ---
  function beginDissolve() {
    wagmiState = 'dissolving';
    wagmiTimer = 0;
    for (const n of nodes) {
      n.snapX = n.x;
      n.snapY = n.y;
    }
  }

  // --- Main tick ---
  function tick(time) {
    const dt = lastTickTime ? Math.min((time - lastTickTime) * 0.001, 0.1) : 0.016;
    lastTickTime = time;
    ctx.clearRect(0, 0, W, H);

    // --- Hover timer (resets on leave, accumulates on hover) ---
    if (isHovering && wagmiState === 'idle') {
      hoverAccum += dt;
      if (hoverAccum >= WAGMI_TRIGGER) {
        hoverAccum = 0;
        triggerWagmi();
      }
    }

    // --- WAGMI state machine ---
    let blend = 0;
    if (wagmiState === 'forming') {
      wagmiTimer += dt;
      blend = easeInOutCubic(Math.min(1, wagmiTimer / WAGMI_FORM));
      if (wagmiTimer >= WAGMI_FORM) {
        wagmiState = 'holding';
        wagmiTimer = 0;
      }
    } else if (wagmiState === 'holding') {
      wagmiTimer += dt;
      blend = 1;
      if (wagmiTimer >= WAGMI_HOLD) {
        beginDissolve();
      }
    } else if (wagmiState === 'dissolving') {
      wagmiTimer += dt;
      blend = 1 - easeInOutCubic(Math.min(1, wagmiTimer / WAGMI_DISSOLVE));
      if (wagmiTimer >= WAGMI_DISSOLVE) {
        wagmiState = 'idle';
        blend = 0;
        // Restore sizes (colors handled by goldBlend reaching 0)
        for (const n of nodes) {
          n.r = n.origR;
        }
      }
    }

    // --- Update node positions & color blend ---
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Smooth gold blend for letter nodes
      if (n.isLetter) {
        n.goldBlend += ((blend > 0 ? 1 : 0) - n.goldBlend) * 0.08;
        if (n.goldBlend < 0.005) n.goldBlend = 0;
      } else {
        n.goldBlend = 0;
      }

      if (blend > 0) {
        if (wagmiState === 'forming' || wagmiState === 'holding') {
          const tx = n.targetX + Math.sin(time * 0.0015 + i) * 2;
          const ty = n.targetY + Math.cos(time * 0.0012 + i * 0.7) * 2;
          n.x = n.snapX + (tx - n.snapX) * blend;
          n.y = n.snapY + (ty - n.snapY) * blend;
        } else {
          const progress = 1 - blend;
          n.x = n.snapX + (n.homeX - n.snapX) * progress;
          n.y = n.snapY + (n.homeY - n.snapY) * progress;
        }

        if (n.isLetter) {
          n.r = n.origR + (6 - n.origR) * blend;
        }
        n.rotation *= (1 - blend * 0.08);
      } else {
        // Normal physics
        n.x += n.vx;
        n.y += n.vy;
        n.x += (n.homeX - n.x) * RETURN_SPEED;
        n.y += (n.homeY - n.y) * RETURN_SPEED;

        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_REPEL;
          n.x += (dx / dist) * force * MOUSE_RADIUS;
          n.y += (dy / dist) * force * MOUSE_RADIUS;
        }
      }

      if (n.x < n.r) { n.x = n.r; n.vx *= -1; }
      if (n.x > W - n.r) { n.x = W - n.r; n.vx *= -1; }
      if (n.y < n.r) { n.y = n.r; n.vy *= -1; }
      if (n.y > H - n.r) { n.y = H - n.r; n.vy *= -1; }

      n.phase += n.pulseSpeed;
      n.rotation += n.rotSpeed;
    }

    // --- Draw connections (fade during WAGMI) ---
    const lineAlpha = 1 - blend * 0.8;
    if (lineAlpha > 0.01) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.55 * lineAlpha;
            if (alpha < 0.01) continue;
            const base = (i + j) % 3 === 0 ? COLORS.lineDark : COLORS.lineLight;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = base + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1 + alpha * 1.2;
            ctx.stroke();
          }
        }
      }
    }

    // --- Draw blocks ---
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Fade out extra (non-letter) nodes during WAGMI
      let nodeAlpha = 1;
      if (!n.isLetter && blend > 0.3) {
        nodeAlpha = Math.max(0, 1 - (blend - 0.3) * (1 / 0.7));
        if (nodeAlpha <= 0) continue;
      }

      // Compute blended fill & stroke colors
      const origFill = FILL_RGB[n.origColorIdx];
      const origStroke = STROKE_RGB[n.origColorIdx];
      const gb = n.goldBlend;
      const fillColor = gb > 0.001 ? rgbStr(lerpRGB(origFill, GOLD_FILL, gb)) : COLORS.nodeFill[n.origColorIdx];
      const strokeColor = gb > 0.001 ? rgbStr(lerpRGB(origStroke, GOLD_STROKE, gb)) : COLORS.nodeStroke[n.origColorIdx];

      const pulse = 1 + Math.sin(n.phase) * 0.15;
      const size = n.r * 2 * pulse;
      const half = size / 2;
      const corner = 3;

      ctx.save();
      ctx.globalAlpha = nodeAlpha;
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);

      // Outer glow
      ctx.beginPath();
      ctx.roundRect(-half - 3, -half - 3, size + 6, size + 6, corner + 2);
      if (gb > 0.001) {
        const ga = 0.2 + gb * 0.4;
        ctx.fillStyle = `rgba(210, 191, 61, ${ga.toFixed(2)})`;
      } else {
        ctx.fillStyle = COLORS.glowColor;
      }
      ctx.fill();

      // Main block
      ctx.beginPath();
      ctx.roundRect(-half, -half, size, size, corner);
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Inner block
      const inner = size * 0.45;
      const ih = inner / 2;
      ctx.beginPath();
      ctx.roundRect(-ih, -ih, inner, inner, 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();

      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Subtle gold shimmer while holding
    if (wagmiState === 'holding') {
      const shimmer = 0.04 + Math.sin(time * 0.003) * 0.03;
      ctx.fillStyle = `rgba(210, 191, 61, ${shimmer.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    raf = requestAnimationFrame(tick);
  }

  // --- Events ---
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    isHovering = true;
  }
  function onMouseLeave() {
    mouse.x = -9999; mouse.y = -9999;
    isHovering = false;
    hoverAccum = 0; // reset timer on leave
  }
  function onTouchMove(e) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    isHovering = true;
  }
  function onTouchEnd() {
    mouse.x = -9999; mouse.y = -9999;
    isHovering = false;
    hoverAccum = 0; // reset timer on leave
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }
  }, { threshold: 0.05 });
  observer.observe(canvas);

  resize();
  raf = requestAnimationFrame(tick);
})();
