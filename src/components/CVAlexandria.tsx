import { useEffect, useRef } from "react";
import {
  prepareWithSegments,
  layoutNextLine,
  layoutWithLines,
  walkLineRanges,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

// ─── Typography Constants ──────────────────────────────────────────

const BODY_FONT_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif';
const BODY_FONT = `17px ${BODY_FONT_FAMILY}`;
const BODY_FONT_NARROW = `14px ${BODY_FONT_FAMILY}`;
const BODY_LINE_HEIGHT = 28;
const BODY_LINE_HEIGHT_NARROW = 22;
const HEADLINE_FONT_FAMILY = BODY_FONT_FAMILY;
const GUTTER = 48;
const COL_GAP = 44;
const BOTTOM_GAP = 20;
const MIN_SLOT_WIDTH = 50;
const NARROW_BP = 760;
const NARROW_GUTTER = 16;
const NARROW_COL_GAP = 16;
const NARROW_BOTTOM_GAP = 12;
const NARROW_ORB_SCALE = 0.4;
const NARROW_ACTIVE_ORBS = 2;
const DROP_CAP_LINES = 3;

// ─── CV Text ───────────────────────────────────────────────────────

const HEADLINE_TEXT = "MUNYARADZI MAKOSA";

const BODY_TEXT = `Product Architect and software engineer with six years shipping mobile apps, SaaS platforms, and AI-powered tools used across Africa and globally. Co-founder of Farmhut Africa, which won the Hult Prize — a one hundred thousand dollar global startup competition — in 2021, making it one of only eleven winners selected from thirty-three finalists worldwide. Recognized as an Anzisha Prize Fellow, placing among the top twenty-six young African entrepreneurs, and awarded the UN75 "Future We Want" prize at the University World Cup of Startups.

Currently co-leading Studio 82, a creative technology studio shipping native iOS applications and web products from Cape Town. The studio has four apps on the App Store: Terrace H4 for live football match narration, Ten-S for interactive digital art, Nurvy for AI-powered nail design previews, and Nomm for smart food inventory with voice AI. Also built AgentBrowser, a macOS desktop application powered by Claude Code, pushing the boundary of what AI-native software looks like.

Maintains Top Rated Plus status on Upwork — the platform's highest freelance tier — with over one hundred thousand dollars in billed earnings since 2019. The largest single engagement was the Byrna point-of-sale system: a twelve-month, thirty-two thousand dollar contract spanning sixteen hundred hours. Specializes in React Native, Next.js, TypeScript, Supabase, and Expo, with deep expertise in iOS and Android app store submissions and the entire mobile release lifecycle.

Co-founded Farmhut Africa in 2019, building an AI-powered agricultural marketplace connecting smallholder farmers in Zimbabwe to buyers and real-time market information. Built a WhatsApp chatbot that served thousands of farmers through a partnership with the Zimbabwe Farmers Union. Revenue came from subscriptions, produce sales, and advertising. The platform was recognized by MIT Solve and earned a Green Innovation Award for agricultural sustainability in 2020.

Co-founded Kwingy, a UK-registered technology services company focused on digital transformation, leading technical strategy and product delivery from 2022 to 2024 using Next.js, React Native, Supabase, and Hono. Previously served as Lead Developer at Raysun Capital, designing and building an internal loan management system with automated credit workflows, risk assessment, and reporting dashboards in React and Node.js.

Career began at Zimbabwe Yellow Pages in 2018, contributing to the migration of the national business directory from print to digital — a project that sparked a deep interest in how information flows through systems. Studied Chemical Engineering at the National University of Science and Technology in Bulawayo, a background that instilled systematic thinking and process optimization skills that carry through every product built today.

Currently building Menyu.pro, a SaaS menu studio for restaurants, and serving as Creative Director and Tech Lead for Freyt365, a finance and fuel management platform for transporters across Southern Africa. Technical range spans mobile development with React Native, Expo, Swift, and SwiftUI; frontend with Next.js, React, TypeScript, and Tailwind CSS; backend with Hono, Node.js, Python, Django, Supabase, and PostgreSQL; AI integration with LLMs, LangChain, OpenAI API, and Claude API; and DevOps across Docker, Vercel, Cloudflare, and GitHub Actions.

Speaks English fluently, Shona natively, and conversational Ndebele. Based in Cape Town, South Africa, working remotely with teams and clients across four continents. Driven by the belief that great software should feel inevitable — as if it could not have been built any other way.`;

const BODY_TEXT_MOBILE = `Product Architect and software engineer with six years shipping mobile apps, SaaS platforms, and AI-powered tools across Africa and globally. Co-founder of Farmhut Africa — winner of the $100K Hult Prize in 2021, Anzisha Prize Fellow, and UN75 Award recipient.

Currently co-leading Studio 82, a creative technology studio with four iOS apps on the App Store: Terrace H4, Ten-S, Nurvy, and Nomm. Also built AgentBrowser, a macOS app powered by Claude Code.

Top Rated Plus on Upwork with $100K+ billed since 2019. Largest engagement: the Byrna POS system — $32K over twelve months. Specializes in React Native, Next.js, TypeScript, Supabase, Swift, and AI integration.

Previously co-founded Kwingy (UK, digital transformation) and built loan management systems at Raysun Capital. Career started at Zimbabwe Yellow Pages. BSc Chemical Engineering from NUST, Bulawayo.

Currently building Menyu.pro for restaurants and leading Freyt365 for transporters. Based in Cape Town, working remotely across four continents.`;

const PULLQUOTE_TEXTS = [
  '"One of eleven global winners — $100,000 from the Hult Prize Foundation. Top 26 Anzisha Fellow. UN75 Award. MIT Solve recognition."',
  '"Top Rated Plus on Upwork since 2019 — $100K+ billed, 1,600-hour engagements, shipping across React Native, Next.js, Swift, and AI."',
];

const SUBHEAD_TEXT =
  "Product Architect · Software Engineer · Indie Founder · Cape Town";

// ─── Types ─────────────────────────────────────────────────────────

type Interval = { left: number; right: number };
type PositionedLine = { x: number; y: number; width: number; text: string };

type OrbColor = [number, number, number];
type OrbDef = {
  fx: number;
  fy: number;
  r: number;
  vx: number;
  vy: number;
  color: OrbColor;
  label: string;
};
type Orb = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  paused: boolean;
};

type CircleObstacle = {
  cx: number;
  cy: number;
  r: number;
  hPad: number;
  vPad: number;
};
type RectObstacle = { x: number; y: number; w: number; h: number };

type DragState = {
  orbIndex: number;
  startPx: number;
  startPy: number;
  startOx: number;
  startOy: number;
};

type PullquoteRect = RectObstacle & {
  lines: PositionedLine[];
  colIdx: number;
};

// ─── Geometry Helpers ──────────────────────────────────────────────

function carveSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base];
  for (const b of blocked) {
    const next: Interval[] = [];
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) {
        next.push(s);
        continue;
      }
      if (b.left > s.left) next.push({ left: s.left, right: b.left });
      if (b.right < s.right) next.push({ left: b.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT_WIDTH);
}

function circleInterval(
  cx: number,
  cy: number,
  r: number,
  bandTop: number,
  bandBottom: number,
  hPad: number,
  vPad: number
): Interval | null {
  const top = bandTop - vPad;
  const bottom = bandBottom + vPad;
  if (top >= cy + r || bottom <= cy - r) return null;
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom;
  if (minDy >= r) return null;
  const maxDx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}

function hitTestOrbs(
  orbs: Orb[],
  px: number,
  py: number,
  count: number,
  scale: number
): number {
  for (let i = count - 1; i >= 0; i--) {
    const o = orbs[i]!;
    const r = o.r * scale;
    const dx = px - o.x;
    const dy = py - o.y;
    if (dx * dx + dy * dy <= r * r) return i;
  }
  return -1;
}

// ─── Layout Column (from reference) ───────────────────────────────

function layoutColumn(
  prepared: PreparedTextWithSegments,
  startCursor: LayoutCursor,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
  lineHeight: number,
  circles: CircleObstacle[],
  rects: RectObstacle[],
  singleSlotOnly: boolean
): { lines: PositionedLine[]; cursor: LayoutCursor } {
  let cursor = startCursor;
  let lineTop = regionY;
  const lines: PositionedLine[] = [];
  let exhausted = false;

  while (lineTop + lineHeight <= regionY + regionH && !exhausted) {
    const bandTop = lineTop;
    const bandBottom = lineTop + lineHeight;
    const blocked: Interval[] = [];

    for (const c of circles) {
      const iv = circleInterval(
        c.cx,
        c.cy,
        c.r,
        bandTop,
        bandBottom,
        c.hPad,
        c.vPad
      );
      if (iv) blocked.push(iv);
    }
    for (const r of rects) {
      if (bandBottom <= r.y || bandTop >= r.y + r.h) continue;
      blocked.push({ left: r.x, right: r.x + r.w });
    }

    const slots = carveSlots(
      { left: regionX, right: regionX + regionW },
      blocked
    );
    if (slots.length === 0) {
      lineTop += lineHeight;
      continue;
    }

    const ordered = singleSlotOnly
      ? [
          slots.reduce((best, s) => {
            const bw = best.right - best.left;
            const sw = s.right - s.left;
            if (sw > bw) return s;
            if (sw < bw) return best;
            return s.left < best.left ? s : best;
          }),
        ]
      : [...slots].sort((a, b) => a.left - b.left);

    for (const slot of ordered) {
      const w = slot.right - slot.left;
      const line = layoutNextLine(prepared, cursor, w);
      if (line === null) {
        exhausted = true;
        break;
      }
      lines.push({
        x: Math.round(slot.left),
        y: Math.round(lineTop),
        text: line.text,
        width: line.width,
      });
      cursor = line.end;
    }
    lineTop += lineHeight;
  }
  return { lines, cursor };
}

// ─── DOM Pool ──────────────────────────────────────────────────────

function syncPool(
  pool: HTMLDivElement[],
  count: number,
  className: string,
  parent: HTMLElement
) {
  while (pool.length < count) {
    const el = document.createElement("div");
    el.className = className;
    parent.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) {
    pool[i]!.style.display = i < count ? "" : "none";
  }
}

// ─── Orb Definitions ──────────────────────────────────────────────

const orbDefs: (OrbDef & { url: string })[] = [
  { fx: 0.48, fy: 0.2, r: 95, vx: 3.5, vy: 2, color: [196, 163, 90], label: "Farmhut\nAfrica", url: "https://farmhut.africa" },
  { fx: 0.2, fy: 0.5, r: 80, vx: -2.5, vy: 3.5, color: [100, 140, 255], label: "Menyu.pro\nSaaS", url: "https://menyu.pro" },
  { fx: 0.72, fy: 0.55, r: 85, vx: 2, vy: -3, color: [232, 100, 130], label: "Nurvy\niOS App", url: "https://s82.studio" },
  { fx: 0.35, fy: 0.75, r: 75, vx: -3.5, vy: -1.5, color: [80, 200, 140], label: "Freyt365\nFintech", url: "https://freyt365.com" },
  { fx: 0.82, fy: 0.2, r: 65, vx: -1.5, vy: 2.5, color: [170, 120, 230], label: "Agent\nBrowser", url: "https://s82.studio" },
];

// ─── The Component ─────────────────────────────────────────────────

export function CVAlexandria() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Wait for fonts
    document.fonts.ready.then(() => {
      init(stage);
    });
  }, []);

  return (
    <div className="cv-fullpage">
      <div ref={stageRef} className="cv-stage-full" id="cv-stage" />
    </div>
  );
}

function init(stage: HTMLDivElement) {
  // ── Prepare text — use condensed version on mobile ──
  const isInitNarrow = window.innerWidth < NARROW_BP;
  const bodyFont = isInitNarrow ? BODY_FONT_NARROW : BODY_FONT;
  const bodyLineHeight = isInitNarrow ? BODY_LINE_HEIGHT_NARROW : BODY_LINE_HEIGHT;
  const bodyText = isInitNarrow ? BODY_TEXT_MOBILE : BODY_TEXT;
  const preparedBody = prepareWithSegments(bodyText, bodyFont);
  const PQ_FONT = `italic ${isInitNarrow ? 14 : 18}px ${BODY_FONT_FAMILY}`;
  const PQ_LINE_HEIGHT = isInitNarrow ? 20 : 26;
  const preparedPullquotes = PULLQUOTE_TEXTS.map((t) =>
    prepareWithSegments(t, PQ_FONT)
  );

  const DROP_CAP_SIZE = bodyLineHeight * DROP_CAP_LINES - 4;
  const DROP_CAP_FONT = `700 ${DROP_CAP_SIZE}px ${BODY_FONT_FAMILY}`;
  const DROP_CAP_CHAR = bodyText[0]!;
  const preparedDropCap = prepareWithSegments(DROP_CAP_CHAR, DROP_CAP_FONT);

  let dropCapWidth = 0;
  walkLineRanges(preparedDropCap, 9999, (line) => {
    dropCapWidth = line.width;
  });
  const DROP_CAP_W = Math.ceil(dropCapWidth) + 10;

  // ── Create static DOM ──
  const dropCapEl = document.createElement("div");
  dropCapEl.className = "cv-drop-cap";
  dropCapEl.textContent = DROP_CAP_CHAR;
  dropCapEl.style.font = DROP_CAP_FONT;
  dropCapEl.style.lineHeight = `${DROP_CAP_SIZE}px`;
  stage.appendChild(dropCapEl);

  // Subhead
  const subheadEl = document.createElement("div");
  subheadEl.className = "cv-subhead";
  subheadEl.textContent = SUBHEAD_TEXT;
  stage.appendChild(subheadEl);

  // Contact bar
  const contactEl = document.createElement("div");
  contactEl.className = "cv-contact-bar";
  contactEl.innerHTML = [
    '<a href="mailto:munya@munyamakosa.com">munya@munyamakosa.com</a>',
    '<a href="https://munyamakosa.com" target="_blank">munyamakosa.com</a>',
    '<a href="https://github.com/farmhutsoftwareteam" target="_blank">GitHub</a>',
    '<a href="https://linkedin.com/in/makosa-munya" target="_blank">LinkedIn</a>',
    '<a href="https://www.upwork.com/freelancers/munyaradzilloydm" target="_blank">Upwork</a>',
  ].join(' <span class="cv-dot">&middot;</span> ');
  stage.appendChild(contactEl);

  // Perf overlay
  const perfEl = document.createElement("div");
  perfEl.className = "cv-perf";
  stage.appendChild(perfEl);

  // ── Create orbs ──
  const orbEls = orbDefs.map((def) => {
    const el = document.createElement("div");
    el.className = "cv-orb";
    const [r, g, b] = def.color;
    el.style.background = `radial-gradient(circle at 38% 38%, rgba(${r},${g},${b},0.7), rgba(${r},${g},${b},0.3) 50%, rgba(${r},${g},${b},0.08) 72%, transparent 85%)`;
    el.style.boxShadow = `0 0 50px 10px rgba(${r},${g},${b},0.25), 0 0 100px 30px rgba(${r},${g},${b},0.1)`;

    const link = document.createElement("a");
    link.className = "cv-orb-label";
    link.href = def.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = def.label;
    // Prevent link click when dragging
    link.addEventListener("click", (e) => {
      if (orbDragMoved) e.preventDefault();
    });
    el.appendChild(link);

    stage.appendChild(el);
    return el;
  });

  let orbDragMoved = false;

  // ── DOM pools ──
  const headlinePool: HTMLDivElement[] = [];
  const bodyPool: HTMLDivElement[] = [];
  const pqBoxPool: HTMLDivElement[] = [];
  const pqLinePool: HTMLDivElement[] = [];

  // ── State ──
  const W0 = window.innerWidth;
  const H0 = window.innerHeight;

  const orbs: Orb[] = orbDefs.map((d) => ({
    x: d.fx * W0,
    y: d.fy * H0,
    r: d.r,
    vx: d.vx,
    vy: d.vy,
    paused: false,
  }));

  let pointer = { x: -9999, y: -9999 };
  let drag: DragState | null = null;
  let lastFrameTime: number | null = null;
  let selecting = false;

  // ── Events ──
  let evDown: { x: number; y: number } | null = null;
  let evMove: { x: number; y: number } | null = null;
  let evUp: { x: number; y: number } | null = null;

  let scheduledRaf: number | null = null;
  function scheduleRender() {
    if (scheduledRaf !== null) return;
    scheduledRaf = requestAnimationFrame((now) => {
      scheduledRaf = null;
      if (render(now)) scheduleRender();
    });
  }

  stage.addEventListener("pointerdown", (e) => {
    const isNarrow = window.innerWidth < NARROW_BP;
    const activeCount = isNarrow ? NARROW_ACTIVE_ORBS : orbs.length;
    const scale = isNarrow ? NARROW_ORB_SCALE : 1;
    const hit = hitTestOrbs(orbs, e.clientX, e.clientY, activeCount, scale);
    if (hit !== -1) e.preventDefault();
    evDown = { x: e.clientX, y: e.clientY };
    scheduleRender();
  });

  window.addEventListener("pointermove", (e) => {
    if (selecting && drag === null) return;
    evMove = { x: e.clientX, y: e.clientY };
    scheduleRender();
  });

  window.addEventListener("pointerup", (e) => {
    evUp = { x: e.clientX, y: e.clientY };
    scheduleRender();
  });

  window.addEventListener("resize", scheduleRender);

  // On mobile, only block scroll when actively dragging an orb
  stage.addEventListener(
    "touchmove",
    (e) => {
      if (drag !== null) e.preventDefault();
    },
    { passive: false }
  );

  // ── Headline cache ──
  let cachedHW = -1,
    cachedHH = -1,
    cachedHMax = -1;
  let cachedHSize = 24;
  let cachedHLines: PositionedLine[] = [];

  function fitHeadline(
    maxW: number,
    maxH: number,
    maxSize = 92
  ): { fontSize: number; lines: PositionedLine[] } {
    if (maxW === cachedHW && maxH === cachedHH && maxSize === cachedHMax)
      return { fontSize: cachedHSize, lines: cachedHLines };
    cachedHW = maxW;
    cachedHH = maxH;
    cachedHMax = maxSize;
    let lo = 20,
      hi = maxSize,
      best = lo;
    let bestLines: PositionedLine[] = [];

    while (lo <= hi) {
      const sz = Math.floor((lo + hi) / 2);
      const font = `700 ${sz}px ${HEADLINE_FONT_FAMILY}`;
      const lh = Math.round(sz * 0.93);
      const p = prepareWithSegments(HEADLINE_TEXT, font);
      let breaksWord = false;
      let count = 0;
      walkLineRanges(p, maxW, (line) => {
        count++;
        if (line.end.graphemeIndex !== 0) breaksWord = true;
      });
      if (!breaksWord && count * lh <= maxH) {
        best = sz;
        const result = layoutWithLines(p, maxW, lh);
        bestLines = result.lines.map((l, i) => ({
          x: 0,
          y: i * lh,
          text: l.text,
          width: l.width,
        }));
        lo = sz + 1;
      } else {
        hi = sz - 1;
      }
    }
    cachedHSize = best;
    cachedHLines = bestLines;
    return { fontSize: best, lines: bestLines };
  }

  // ── Render ──
  function render(now: number): boolean {
    if (selecting && drag === null) return false;

    const pw = document.documentElement.clientWidth;
    const ph = document.documentElement.clientHeight;
    const isNarrow = pw < NARROW_BP;
    const gutter = isNarrow ? NARROW_GUTTER : GUTTER;
    const colGap = isNarrow ? NARROW_COL_GAP : COL_GAP;
    const bottomGap = isNarrow ? NARROW_BOTTOM_GAP : BOTTOM_GAP;
    const orbScale = isNarrow ? NARROW_ORB_SCALE : 1;
    const activeCount = isNarrow
      ? Math.min(NARROW_ACTIVE_ORBS, orbs.length)
      : orbs.length;

    // ── Process events ──
    if (evDown) {
      pointer = evDown;
      if (drag === null) {
        const idx = hitTestOrbs(
          orbs,
          evDown.x,
          evDown.y,
          activeCount,
          orbScale
        );
        if (idx !== -1) {
          drag = {
            orbIndex: idx,
            startPx: evDown.x,
            startPy: evDown.y,
            startOx: orbs[idx]!.x,
            startOy: orbs[idx]!.y,
          };
        }
      }
    }
    if (evMove) {
      pointer = evMove;
      if (drag) {
        orbs[drag.orbIndex]!.x =
          drag.startOx + (evMove.x - drag.startPx);
        orbs[drag.orbIndex]!.y =
          drag.startOy + (evMove.y - drag.startPy);
      }
    }
    if (evUp) {
      pointer = evUp;
      if (drag) {
        const dx = evUp.x - drag.startPx;
        const dy = evUp.y - drag.startPy;
        orbDragMoved = dx * dx + dy * dy >= 16;
        if (!orbDragMoved) {
          // Small move = click — let the link handle navigation
          orbs[drag.orbIndex]!.paused = !orbs[drag.orbIndex]!.paused;
        }
        drag = null;
      }
    }
    evDown = evMove = evUp = null;

    // ── Physics ──
    const prevTime = lastFrameTime ?? now;
    const dt = Math.min((now - prevTime) / 1000, 0.05);
    let animating = false;
    const dragIdx = drag?.orbIndex ?? -1;

    for (let i = 0; i < activeCount; i++) {
      const o = orbs[i]!;
      const r = o.r * orbScale;
      if (o.paused || i === dragIdx) continue;
      animating = true;
      o.x += o.vx * dt;
      o.y += o.vy * dt;

      if (o.x - r < 0) {
        o.x = r;
        o.vx = Math.abs(o.vx);
      }
      if (o.x + r > pw) {
        o.x = pw - r;
        o.vx = -Math.abs(o.vx);
      }
      if (o.y - r < gutter * 0.5) {
        o.y = r + gutter * 0.5;
        o.vy = Math.abs(o.vy);
      }
      const maxY = isNarrow ? ph * 0.6 : ph - bottomGap;
      if (o.y + r > maxY) {
        o.y = maxY - r;
        o.vy = -Math.abs(o.vy);
      }
    }

    // Orb-orb collision
    for (let i = 0; i < activeCount; i++) {
      const a = orbs[i]!;
      const ar = a.r * orbScale;
      for (let j = i + 1; j < activeCount; j++) {
        const b = orbs[j]!;
        const br = b.r * orbScale;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ar + br + (isNarrow ? 12 : 20);
        if (dist >= minDist || dist <= 0.1) continue;
        const force = (minDist - dist) * 0.8;
        const nx = dx / dist;
        const ny = dy / dist;
        if (!a.paused && i !== dragIdx) {
          a.vx -= nx * force * dt;
          a.vy -= ny * force * dt;
        }
        if (!b.paused && j !== dragIdx) {
          b.vx += nx * force * dt;
          b.vy += ny * force * dt;
        }
      }
    }

    lastFrameTime = animating ? now : null;

    // ── Layout ──
    const t0 = performance.now();

    const circleObs: CircleObstacle[] = orbs
      .slice(0, activeCount)
      .map((o) => ({
        cx: o.x,
        cy: o.y,
        r: o.r * orbScale,
        hPad: isNarrow ? 10 : 14,
        vPad: isNarrow ? 2 : 4,
      }));

    // Headline — fit font size, then lay out through obstacle system
    const headW = Math.min(pw - gutter * 2, 1000);
    const maxHH = Math.floor(ph * (isNarrow ? 0.18 : 0.22));
    const { fontSize: hSize } = fitHeadline(
      headW,
      maxHH,
      isNarrow ? 36 : 92
    );
    const hLH = Math.round(hSize * 0.93);
    const hFont = `700 ${hSize}px ${HEADLINE_FONT_FAMILY}`;

    // Re-layout headline through the obstacle-aware column system
    const preparedHeadline = prepareWithSegments(HEADLINE_TEXT, hFont);
    const headlineResult = layoutColumn(
      preparedHeadline,
      { segmentIndex: 0, graphemeIndex: 0 },
      gutter,
      gutter,
      headW,
      maxHH,
      hLH,
      circleObs,
      [],
      isNarrow
    );
    const hLines = headlineResult.lines;
    const hHeight = hLines.length > 0
      ? hLines[hLines.length - 1]!.y - gutter + hLH
      : hLH;

    // Subhead
    const subheadH = isNarrow ? 18 : 22;
    const contactH = 16;
    const bodyTop =
      gutter + hHeight + subheadH + contactH + (isNarrow ? 14 : 24);
    const bodyHeight = ph - bodyTop - bottomGap;
    const colCount = pw > 1000 ? 3 : pw > 640 ? 2 : 1;
    const totalGutter = gutter * 2 + colGap * (colCount - 1);
    const maxCW = Math.min(pw, 1500);
    const colW = Math.floor((maxCW - totalGutter) / colCount);
    const contentLeft = Math.round(
      (pw - (colCount * colW + (colCount - 1) * colGap)) / 2
    );

    // Drop cap rect
    const dropCapRect: RectObstacle = {
      x: contentLeft - 2,
      y: bodyTop - 2,
      w: DROP_CAP_W,
      h: DROP_CAP_LINES * bodyLineHeight + 2,
    };

    // Pullquotes
    const pqRects: PullquoteRect[] = [];
    const pqSpecs = [
      { prepared: preparedPullquotes[0]!, colIdx: 0, yFrac: 0.45, wFrac: 0.52, side: "right" as const },
      { prepared: preparedPullquotes[1]!, colIdx: 1, yFrac: 0.3, wFrac: 0.5, side: "left" as const },
    ];

    for (const spec of pqSpecs) {
      if (isNarrow || spec.colIdx >= colCount) continue;
      const pqW = Math.round(colW * spec.wFrac);
      const colX = contentLeft + spec.colIdx * (colW + colGap);
      const px = spec.side === "right" ? colX + colW - pqW : colX;
      const py = Math.round(bodyTop + bodyHeight * spec.yFrac);

      // Pullquotes use fixed layout — they're styled boxes, not flowing text
      const pqLines = layoutWithLines(
        spec.prepared,
        pqW - 20,
        PQ_LINE_HEIGHT
      ).lines;
      const pqH = pqLines.length * PQ_LINE_HEIGHT + 16;
      pqRects.push({
        x: px,
        y: py,
        w: pqW,
        h: pqH,
        colIdx: spec.colIdx,
        lines: pqLines.map((l, i) => ({
          x: px + 20,
          y: py + 8 + i * PQ_LINE_HEIGHT,
          text: l.text,
          width: l.width,
        })),
      });
    }

    // Body text
    const allBodyLines: PositionedLine[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 1 };
    for (let ci = 0; ci < colCount; ci++) {
      const cx = contentLeft + ci * (colW + colGap);
      const rects: RectObstacle[] = [];
      if (ci === 0) rects.push(dropCapRect);
      for (const pq of pqRects) {
        if (pq.colIdx === ci) rects.push({ x: pq.x, y: pq.y, w: pq.w, h: pq.h });
      }
      const result = layoutColumn(
        preparedBody,
        cursor,
        cx,
        bodyTop,
        colW,
        bodyHeight,
        bodyLineHeight,
        circleObs,
        rects,
        isNarrow
      );
      allBodyLines.push(...result.lines);
      cursor = result.cursor;
    }

    const layoutMs = performance.now() - t0;

    // ── DOM Writes ──

    // Headline
    syncPool(headlinePool, hLines.length, "cv-headline-line", stage);
    for (let i = 0; i < hLines.length; i++) {
      const el = headlinePool[i]!;
      const l = hLines[i]!;
      el.textContent = l.text;
      el.style.left = `${l.x}px`;
      el.style.top = `${l.y}px`;
      el.style.font = hFont;
      el.style.lineHeight = `${hLH}px`;
    }

    // Subhead
    subheadEl.style.left = `${gutter}px`;
    subheadEl.style.top = `${gutter + hHeight + 6}px`;

    // Contact
    contactEl.style.left = `${gutter}px`;
    contactEl.style.top = `${gutter + hHeight + subheadH + 8}px`;

    // Drop cap
    dropCapEl.style.left = `${contentLeft}px`;
    dropCapEl.style.top = `${bodyTop}px`;

    // Body lines
    syncPool(bodyPool, allBodyLines.length, "cv-body-line", stage);
    for (let i = 0; i < allBodyLines.length; i++) {
      const el = bodyPool[i]!;
      const l = allBodyLines[i]!;
      el.textContent = l.text;
      el.style.left = `${l.x}px`;
      el.style.top = `${l.y}px`;
      el.style.font = bodyFont;
      el.style.lineHeight = `${bodyLineHeight}px`;
    }

    // Pullquote boxes + lines
    let totalPqLines = 0;
    for (const pq of pqRects) totalPqLines += pq.lines.length;

    syncPool(pqBoxPool, pqRects.length, "cv-pq-box", stage);
    syncPool(pqLinePool, totalPqLines, "cv-pq-line", stage);

    let pqLi = 0;
    for (let i = 0; i < pqRects.length; i++) {
      const pq = pqRects[i]!;
      const box = pqBoxPool[i]!;
      box.style.left = `${pq.x}px`;
      box.style.top = `${pq.y}px`;
      box.style.width = `${pq.w}px`;
      box.style.height = `${pq.h}px`;
      for (const l of pq.lines) {
        const el = pqLinePool[pqLi]!;
        el.textContent = l.text;
        el.style.left = `${l.x}px`;
        el.style.top = `${l.y}px`;
        el.style.font = PQ_FONT;
        el.style.lineHeight = `${PQ_LINE_HEIGHT}px`;
        pqLi++;
      }
    }

    // Orbs
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i]!;
      const el = orbEls[i]!;
      if (i >= activeCount) {
        el.style.display = "none";
        continue;
      }
      const r = o.r * orbScale;
      el.style.display = "";
      el.style.left = `${o.x - r}px`;
      el.style.top = `${o.y - r}px`;
      el.style.width = `${r * 2}px`;
      el.style.height = `${r * 2}px`;
      el.style.opacity = o.paused ? "0.4" : "1";
    }

    // Cursor
    const hovered = hitTestOrbs(orbs, pointer.x, pointer.y, activeCount, orbScale);
    document.body.style.cursor =
      drag !== null ? "grabbing" : hovered !== -1 ? "grab" : "";
    stage.style.userSelect = drag !== null ? "none" : "";

    // Perf
    perfEl.textContent = `Layout: ${layoutMs.toFixed(2)}ms · Lines: ${allBodyLines.length} · Reflows: 0`;

    return animating;
  }

  scheduleRender();
}
