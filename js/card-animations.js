(function () {
  'use strict';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const TEAL  = '#0d9488';
  const BLUE  = '#1565a0';
  const CYAN  = '#22a7a7';
  const DARK  = '#0f5a6a';
  const LIGHT = '#a7f3d0';

  // ─── Utility ──────────────────────────────────
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

  // ─── 1. FRICTION — fast-spinning clock with orbiting labels ────
  function frictionAnim(canvas) {
    let { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.28;
    const labels = ['DevOps', 'Legal', 'HR', 'Ops', 'Admin'];

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const s = t * 0.001;

      // Clock face
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner fill
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(13, 148, 136, 0.06)';
      ctx.fill();

      // Tick marks
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = radius * 0.85;
        const outer = radius * 0.95;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Hour hand (spins fast = wasted time)
      const hourAngle = s * 1.2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hourAngle) * radius * 0.5, cy + Math.sin(hourAngle) * radius * 0.5);
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Minute hand (spins very fast)
      const minAngle = s * 4.5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(minAngle) * radius * 0.72, cy + Math.sin(minAngle) * radius * 0.72);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = DARK;
      ctx.fill();

      // Orbiting labels
      ctx.font = `600 ${Math.max(10, w * 0.055)}px Satoshi, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < labels.length; i++) {
        const angle = s * 0.5 + (i / labels.length) * Math.PI * 2;
        const orbitR = radius + 22 + Math.sin(s * 2 + i) * 6;
        const lx = cx + Math.cos(angle) * orbitR;
        const ly = cy + Math.sin(angle) * orbitR;
        const alpha = 0.45 + Math.sin(s * 3 + i * 1.5) * 0.25;
        ctx.fillStyle = `rgba(21, 101, 160, ${alpha.toFixed(2)})`;
        ctx.fillText(labels[i], lx, ly);
      }
    }
    return draw;
  }

  // ─── 2. FAILURE RATE — 10 bars, 9 collapse ────
  function failureAnim(canvas) {
    let { ctx, w, h } = setupCanvas(canvas);
    const barCount = 10;
    const gap = w * 0.02;
    const barW = (w - gap * (barCount + 1)) / barCount;
    const maxH = h * 0.65;
    const baseY = h * 0.85;
    // Each bar has a collapse delay and state
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const survive = i === 4; // the 5th bar survives
      bars.push({
        x: gap + i * (barW + gap),
        targetH: maxH * (0.6 + Math.random() * 0.4),
        survive,
        collapseDelay: survive ? 999 : 2 + Math.random() * 2, // seconds before collapse
        collapsed: 0, // 0-1
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const s = t * 0.001;
      const cycle = s % 8; // 8 second cycle

      for (const bar of bars) {
        // Rise phase (0-2s)
        let rise = Math.min(1, cycle / 1.5);
        rise = easeOutCubic(rise);
        let barH = bar.targetH * rise;

        // Collapse phase
        if (!bar.survive && cycle > bar.collapseDelay) {
          const ct = Math.min(1, (cycle - bar.collapseDelay) / 0.8);
          bar.collapsed = easeOutCubic(ct);
          barH *= (1 - bar.collapsed);
        } else if (cycle < 1) {
          bar.collapsed = 0;
        }

        if (barH < 1) continue;

        const color = bar.survive ? TEAL : `rgba(21, 101, 160, ${(0.7 - bar.collapsed * 0.5).toFixed(2)})`;

        // Bar
        const rx = bar.x;
        const ry = baseY - barH;
        const rr = 4;
        ctx.beginPath();
        ctx.moveTo(rx + rr, ry);
        ctx.lineTo(rx + barW - rr, ry);
        ctx.quadraticCurveTo(rx + barW, ry, rx + barW, ry + rr);
        ctx.lineTo(rx + barW, baseY);
        ctx.lineTo(rx, baseY);
        ctx.lineTo(rx, ry + rr);
        ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Glow on surviving bar
        if (bar.survive && cycle > 3) {
          ctx.shadowColor = TEAL;
          ctx.shadowBlur = 12 + Math.sin(s * 4) * 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Crumble particles
        if (!bar.survive && bar.collapsed > 0.1 && bar.collapsed < 1) {
          for (let p = 0; p < 3; p++) {
            const px = rx + Math.random() * barW;
            const py = baseY - Math.random() * 15 * (1 - bar.collapsed);
            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(21, 101, 160, ${(0.3 * (1 - bar.collapsed)).toFixed(2)})`;
            ctx.fill();
          }
        }
      }

      // Baseline
      ctx.beginPath();
      ctx.moveTo(gap, baseY + 1);
      ctx.lineTo(w - gap, baseY + 1);
      ctx.strokeStyle = 'rgba(15, 90, 106, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // "1 in 10" label appears after collapse
      if (cycle > 4.5) {
        const alpha = Math.min(1, (cycle - 4.5) / 1);
        ctx.font = `700 ${Math.max(11, w * 0.065)}px Satoshi, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(13, 148, 136, ${alpha.toFixed(2)})`;
        ctx.fillText('1 in 10', w / 2, h * 0.15);
      }
    }
    return draw;
  }

  // ─── 3. RESOURCE GAP — two platforms, items falling into gap ────
  function resourceGapAnim(canvas) {
    let { ctx, w, h } = setupCanvas(canvas);
    const platH = 12;
    const platY = h * 0.55;
    const gapW = w * 0.28;
    const leftEnd = (w - gapW) / 2;
    const rightStart = leftEnd + gapW;

    // Falling objects
    const items = [];
    const symbols = ['$', '</>', '@', '%', '{}'];
    for (let i = 0; i < 6; i++) {
      items.push({
        x: leftEnd + Math.random() * gapW,
        y: platY - 10 - Math.random() * 30,
        vy: 0,
        symbol: symbols[i % symbols.length],
        delay: i * 0.7,
        fallen: false,
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const s = t * 0.001;
      const cycle = s % 6;

      // Left platform
      ctx.fillStyle = TEAL;
      roundRect(ctx, 12, platY, leftEnd - 18, platH, 4);
      ctx.fill();

      // Right platform
      ctx.fillStyle = BLUE;
      roundRect(ctx, rightStart + 6, platY, w - rightStart - 18, platH, 4);
      ctx.fill();

      // Gap area (dashed lines to show the void)
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(leftEnd, platY + platH / 2);
      ctx.lineTo(rightStart, platY + platH / 2);
      ctx.strokeStyle = 'rgba(15, 90, 106, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Items falling
      ctx.font = `700 ${Math.max(12, w * 0.07)}px Satoshi, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const item of items) {
        const itemT = cycle - item.delay;
        if (itemT < 0) {
          // Show sitting on edge
          ctx.fillStyle = `rgba(21, 101, 160, 0.6)`;
          ctx.fillText(item.symbol, item.x, platY - 14);
          continue;
        }

        // Fall with gravity
        const fallT = Math.min(itemT, 2.5);
        const fallY = platY - 14 + 0.5 * 280 * fallT * fallT * 0.04;
        const alpha = Math.max(0, 1 - fallT / 2.5);

        if (alpha > 0) {
          ctx.fillStyle = `rgba(21, 101, 160, ${alpha.toFixed(2)})`;
          ctx.fillText(item.symbol, item.x + Math.sin(fallT * 3) * 5, fallY);
        }
      }

      // Arrow showing gap
      const arrowAlpha = 0.3 + Math.sin(s * 3) * 0.15;
      ctx.beginPath();
      const arrowY = platY + platH + 20;
      ctx.moveTo(leftEnd + 5, arrowY);
      ctx.lineTo(rightStart - 5, arrowY);
      ctx.strokeStyle = `rgba(220, 38, 38, ${arrowAlpha.toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Arrow heads
      ctx.beginPath();
      ctx.moveTo(leftEnd + 12, arrowY - 4);
      ctx.lineTo(leftEnd + 5, arrowY);
      ctx.lineTo(leftEnd + 12, arrowY + 4);
      ctx.moveTo(rightStart - 12, arrowY - 4);
      ctx.lineTo(rightStart - 5, arrowY);
      ctx.lineTo(rightStart - 12, arrowY + 4);
      ctx.strokeStyle = `rgba(220, 38, 38, ${arrowAlpha.toFixed(2)})`;
      ctx.stroke();

      // People icons on left platform
      for (let i = 0; i < 3; i++) {
        const px = 30 + i * 25;
        const py = platY - 18;
        ctx.beginPath();
        ctx.arc(px, py - 6, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(13, 148, 136, ${0.5 + Math.sin(s * 2 + i) * 0.2})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + 10);
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    return draw;
  }

  // ─── 4. IDEATION — pulsing lightbulb with converging particles ────
  function ideationAnim(canvas) {
    let { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2, cy = h * 0.4;
    const bulbR = Math.min(w, h) * 0.18;

    // Orbiting particles
    const particles = [];
    for (let i = 0; i < 12; i++) {
      particles.push({
        angle: (i / 12) * Math.PI * 2,
        dist: bulbR * 2.5 + Math.random() * bulbR,
        speed: 0.3 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const s = t * 0.001;
      const pulse = 1 + Math.sin(s * 2.5) * 0.08;

      // Glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bulbR * 2.2);
      grad.addColorStop(0, `rgba(34, 167, 167, ${(0.15 + Math.sin(s * 2.5) * 0.08).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(34, 167, 167, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, bulbR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bulb shape (rounded top + flat bottom)
      ctx.beginPath();
      ctx.arc(cx, cy, bulbR * pulse, 0, Math.PI, true);
      // Neck
      const neckW = bulbR * 0.45;
      const neckH = bulbR * 0.5;
      ctx.lineTo(cx - neckW, cy);
      ctx.lineTo(cx - neckW, cy + neckH);
      ctx.lineTo(cx + neckW, cy + neckH);
      ctx.lineTo(cx + neckW, cy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(13, 148, 136, 0.12)';
      ctx.fill();
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Base lines
      for (let i = 0; i < 3; i++) {
        const by = cy + bulbR * 0.5 + 4 + i * 5;
        ctx.beginPath();
        ctx.moveTo(cx - bulbR * 0.38, by);
        ctx.lineTo(cx + bulbR * 0.38, by);
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Filament (inner glow lines)
      ctx.beginPath();
      ctx.moveTo(cx - bulbR * 0.2, cy);
      ctx.quadraticCurveTo(cx - bulbR * 0.1, cy - bulbR * 0.5, cx, cy - bulbR * 0.15);
      ctx.quadraticCurveTo(cx + bulbR * 0.1, cy - bulbR * 0.5, cx + bulbR * 0.2, cy);
      ctx.strokeStyle = `rgba(34, 167, 167, ${(0.5 + Math.sin(s * 4) * 0.3).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Converging particles
      for (const p of particles) {
        p.angle += p.speed * 0.016;
        const breathe = Math.sin(s * 2 + p.phase) * 0.3;
        const d = p.dist * (0.6 + breathe * 0.4);
        const px = cx + Math.cos(p.angle) * d;
        const py = cy + Math.sin(p.angle) * d * 0.65;

        // Trail line to center
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = `rgba(34, 167, 167, ${(0.08 + breathe * 0.05).toFixed(2)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.8 + Math.sin(s * 3 + p.phase) * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(21, 101, 160, ${(0.5 + breathe * 0.3).toFixed(2)})`;
        ctx.fill();
      }
    }
    return draw;
  }

  // ─── 5. INFRASTRUCTURE — blocks assembling tetris-style ────
  function infrastructureAnim(canvas) {
    let { ctx, w, h } = setupCanvas(canvas);
    const blockW = w * 0.14;
    const blockH = h * 0.11;
    const baseY = h * 0.88;
    const startX = w * 0.15;

    // Grid of blocks that fall into place
    const blocks = [
      // row 0 (bottom)
      { col: 0, row: 0, color: TEAL },
      { col: 1, row: 0, color: BLUE },
      { col: 2, row: 0, color: DARK },
      { col: 3, row: 0, color: CYAN },
      // row 1
      { col: 0.5, row: 1, color: BLUE },
      { col: 1.5, row: 1, color: TEAL },
      { col: 2.5, row: 1, color: CYAN },
      // row 2
      { col: 1, row: 2, color: DARK },
      { col: 2, row: 2, color: TEAL },
      // row 3 (top)
      { col: 1.5, row: 3, color: BLUE },
    ];

    blocks.forEach((b, i) => {
      b.delay = i * 0.35;
      b.targetX = startX + b.col * (blockW + 4);
      b.targetY = baseY - b.row * (blockH + 4) - blockH;
    });

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const s = t * 0.001;
      const cycle = s % 7;

      for (const b of blocks) {
        const bt = cycle - b.delay;
        if (bt < 0) continue;

        const progress = Math.min(1, bt / 0.6);
        const ease = easeOutCubic(progress);

        const fromY = -blockH - 20;
        const x = b.targetX;
        const y = fromY + (b.targetY - fromY) * ease;

        // Block shadow
        if (progress > 0.5) {
          ctx.fillStyle = `rgba(0,0,0,${(0.06 * progress).toFixed(2)})`;
          roundRect(ctx, x + 3, y + 3, blockW, blockH, 4);
          ctx.fill();
        }

        // Block
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.15 + ease * 0.85;
        roundRect(ctx, x, y, blockW, blockH, 4);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        roundRect(ctx, x + 2, y + 2, blockW - 4, blockH * 0.4, 3);
        ctx.fill();

        ctx.globalAlpha = 1;

        // Connection dots when settled
        if (progress >= 1 && Math.sin(s * 3 + b.delay) > 0.3) {
          ctx.beginPath();
          ctx.arc(x + blockW / 2, y + blockH / 2, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fill();
        }
      }

      // Connector lines between settled blocks
      const settled = blocks.filter((b) => (cycle - b.delay) >= 0.6);
      ctx.strokeStyle = 'rgba(34, 167, 167, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < settled.length; i++) {
        for (let j = i + 1; j < settled.length; j++) {
          const a = settled[i], b = settled[j];
          if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
            ctx.beginPath();
            ctx.moveTo(a.targetX + blockW / 2, a.targetY + blockH / 2);
            ctx.lineTo(b.targetX + blockW / 2, b.targetY + blockH / 2);
            ctx.stroke();
          }
        }
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    return draw;
  }

  // ─── 6. SCALE — upward growth arrow with trailing particles ────
  function scaleAnim(canvas) {
    let { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2;

    // Growth curve control points
    const curvePoints = [
      { x: w * 0.1, y: h * 0.82 },
      { x: w * 0.3, y: h * 0.7 },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * 0.65, y: h * 0.35 },
      { x: w * 0.8, y: h * 0.15 },
    ];

    // Trailing particles
    const trails = [];
    for (let i = 0; i < 20; i++) {
      trails.push({
        offset: Math.random(),
        size: 1.5 + Math.random() * 3,
        drift: (Math.random() - 0.5) * 20,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }

    function getPointOnCurve(t) {
      // Interpolate through points
      const idx = t * (curvePoints.length - 1);
      const i = Math.floor(idx);
      const frac = idx - i;
      if (i >= curvePoints.length - 1) return curvePoints[curvePoints.length - 1];
      const a = curvePoints[i];
      const b = curvePoints[i + 1];
      return {
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
      };
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const s = t * 0.001;
      const cycle = s % 5;
      const progress = Math.min(1, cycle / 2.5);
      const ease = easeInOutCubic(progress);

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(15, 90, 106, 0.08)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) {
        const gy = h * 0.15 + i * (h * 0.7 / 4);
        ctx.beginPath();
        ctx.moveTo(w * 0.08, gy);
        ctx.lineTo(w * 0.92, gy);
        ctx.stroke();
      }

      // Draw curve up to progress
      const drawTo = ease;
      ctx.beginPath();
      const first = getPointOnCurve(0);
      ctx.moveTo(first.x, first.y);
      const steps = 50;
      for (let i = 1; i <= steps; i++) {
        const ct = (i / steps) * drawTo;
        const pt = getPointOnCurve(ct);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Area fill under curve
      const lastPt = getPointOnCurve(drawTo);
      ctx.lineTo(lastPt.x, h * 0.85);
      ctx.lineTo(first.x, h * 0.85);
      ctx.closePath();
      const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
      areaGrad.addColorStop(0, 'rgba(13, 148, 136, 0.15)');
      areaGrad.addColorStop(1, 'rgba(13, 148, 136, 0.02)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Arrow tip at the leading edge
      if (drawTo > 0.1) {
        const tip = getPointOnCurve(drawTo);
        const prev = getPointOnCurve(Math.max(0, drawTo - 0.05));
        const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - 12 * Math.cos(angle - 0.4), tip.y - 12 * Math.sin(angle - 0.4));
        ctx.lineTo(tip.x - 12 * Math.cos(angle + 0.4), tip.y - 12 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = TEAL;
        ctx.fill();

        // Glow at tip
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8 + Math.sin(s * 4) * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 167, 167, 0.2)';
        ctx.fill();
      }

      // Trailing particles
      for (const tr of trails) {
        const pt = (tr.offset * drawTo);
        if (pt > drawTo) continue;
        const pos = getPointOnCurve(pt);
        const px = pos.x + tr.drift + Math.sin(s * 2 + tr.offset * 10) * 8;
        const py = pos.y + Math.cos(s * 3 + tr.offset * 5) * 6;
        ctx.beginPath();
        ctx.arc(px, py, tr.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(21, 101, 160, ${(tr.alpha * ease).toFixed(2)})`;
        ctx.fill();
      }

      // Milestone dots on curve
      if (ease > 0.3) {
        const milestones = [0.25, 0.5, 0.75, 1.0];
        for (const m of milestones) {
          if (m > drawTo) break;
          const mp = getPointOnCurve(m);
          const pulse = 1 + Math.sin(s * 3 + m * 5) * 0.2;
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 5 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = BLUE;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        }
      }
    }
    return draw;
  }

  // ─── Animation loop manager ────────────────────
  const animMap = {
    'friction': frictionAnim,
    'failure': failureAnim,
    'resource-gap': resourceGapAnim,
    'ideation': ideationAnim,
    'infrastructure': infrastructureAnim,
    'scale': scaleAnim,
  };

  const canvases = document.querySelectorAll('.card-canvas[data-anim]');
  const activeDraw = new Map();
  let rafs = new Map();

  function startLoop(canvas, drawFn) {
    function loop(t) {
      drawFn(t);
      rafs.set(canvas, requestAnimationFrame(loop));
    }
    rafs.set(canvas, requestAnimationFrame(loop));
  }

  function stopLoop(canvas) {
    const id = rafs.get(canvas);
    if (id) cancelAnimationFrame(id);
    rafs.delete(canvas);
  }

  // Observe visibility
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target;
      if (entry.isIntersecting) {
        if (!activeDraw.has(canvas)) {
          const type = canvas.getAttribute('data-anim');
          const factory = animMap[type];
          if (factory) {
            activeDraw.set(canvas, factory(canvas));
          }
        }
        const draw = activeDraw.get(canvas);
        if (draw && !rafs.has(canvas)) {
          startLoop(canvas, draw);
        }
      } else {
        stopLoop(canvas);
      }
    }
  }, { threshold: 0.05 });

  canvases.forEach(c => observer.observe(c));

  // Handle resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Re-initialize all active canvases
      activeDraw.clear();
      canvases.forEach(canvas => {
        stopLoop(canvas);
        const type = canvas.getAttribute('data-anim');
        const factory = animMap[type];
        if (factory) {
          const draw = factory(canvas);
          activeDraw.set(canvas, draw);
          startLoop(canvas, draw);
        }
      });
    }, 200);
  });

})();
