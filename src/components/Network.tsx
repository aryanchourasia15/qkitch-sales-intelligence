import { useEffect, useRef, useState } from 'react';
import { select, zoom, zoomIdentity, type ZoomTransform } from 'd3';
import { baseline, meta, money, predictors, rows, signed } from '../lib/model';
import { edgeWidth, HUB as DESKTOP_HUB, MOBILE_HUB, MOBILE_WORLD, mobilePositions, particlePosition, positions as desktopPositions, WORLD as DESKTOP_WORLD } from '../lib/network';
import type { Predictor } from '../types/model';

interface Props {
  selected: Predictor; onSelect: (key: Predictor) => void;
  quarter: number; onQuarter: (obs: number) => void;
  onHover: (obs: number | null) => void; activeQuarter: number;
  reduced: boolean;
}

export default function Network(props: Props) {
  const { selected, onSelect, onQuarter, onHover, activeQuarter, reduced } = props;
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [size, setSize] = useState({ width: 1000, height: 650 });
  const compact = size.width < 600;
  const WORLD = compact ? MOBILE_WORLD : DESKTOP_WORLD;
  const HUB = compact ? MOBILE_HUB : DESKTOP_HUB;
  const positions = compact ? mobilePositions : desktopPositions;
  // 27–28% larger than the original 69 / 88 radii; this changes no data encoding.
  const hubRadius = compact ? 88 : 112;
  const [over, setOver] = useState<{ key: Predictor; obs: number } | null>(null);
  const current = useRef({ selected, activeQuarter, transform, reduced });
  current.current = { selected, activeQuarter, transform, reduced };
  const lastTime = useRef(0);
  const zoomControl = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null);
  const fitted = rows.find(r => r.obs === activeQuarter)?.fitted ?? baseline.fitted;

  useEffect(() => {
    const node = container.current!;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact]);

  useEffect(() => {
    const behavior = zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [WORLD.width, WORLD.height]])
      .scaleExtent([.75, 2.8])
      .translateExtent([[-400, -250], [1480, 950]])
      .filter(event => event.type === 'wheel' || event.target === svg.current)
      .on('zoom', event => setTransform(event.transform));
    zoomControl.current = behavior;
    const surface = select(svg.current!);
    surface.call(behavior).call(behavior.transform, zoomIdentity).on('dblclick.zoom', null);
    return () => { surface.on('.zoom', null); };
  }, [compact]);

  useEffect(() => {
    const context = canvas.current!.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.current!.width = Math.round(size.width * dpr);
    canvas.current!.height = Math.round(size.height * dpr);
    let raf = 0;
    let inView = true;
    let previousTime = 0;
    const emphasis = Object.fromEntries(predictors.map(p => [p.key, p.key === selected ? 1 : .5]));
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    observer.observe(container.current!);
    function draw(time: number) {
      const state = current.current;
      if (inView && !document.hidden) {
        lastTime.current = state.reduced ? 0 : time;
        const t = lastTime.current;
        const blend = state.reduced ? 1 : Math.min(1, (time - previousTime) / 170);
        previousTime = time;
        // Reserve a footer lane for zoom/instructions so labels never collide with them.
        const drawingHeight = size.height - (compact ? 48 : 32);
        const scale = Math.min(size.width / WORLD.width, drawingHeight / WORLD.height);
        const ox = (size.width - WORLD.width * scale) / 2;
        const oy = (drawingHeight - WORLD.height * scale) / 2;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, size.width, size.height);
        context.translate(ox, oy);
        context.scale(scale, scale);
        context.translate(state.transform.x, state.transform.y);
        context.scale(state.transform.k, state.transform.k);

        // Understated orbit guides are decoration, never inter-variable links.
        context.save();
        context.strokeStyle = '#748ba910';
        context.lineWidth = 1;
        for (const radius of [130, 235, 355]) {
          context.beginPath();
          context.ellipse(HUB.x, HUB.y, radius * (compact ? .72 : 1.25), radius * .8, 0, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();

        for (const p of predictors) {
          const center = positions[p.key];
          const color = meta[p.key].color;
          const active = state.selected === p.key;
          emphasis[p.key] += ((active ? 1 : .5) - emphasis[p.key]) * blend;
          const prominence = emphasis[p.key];
          context.save();
          context.globalAlpha = .55 + prominence * .45;
          const halo = context.createRadialGradient(center.x, center.y, 2, center.x, center.y, 125);
          halo.addColorStop(0, color + (active ? '32' : '1c'));
          halo.addColorStop(.45, color + '12');
          halo.addColorStop(1, color + '00');
          context.fillStyle = halo;
          context.fillRect(center.x - 130, center.y - 130, 260, 260);
          // Exactly six model connections, from predictor centers to the fitted-sales hub.
          const theta = Math.atan2(center.y-HUB.y, center.x-HUB.x);
          const start = { x: HUB.x + Math.cos(theta)*(hubRadius+4), y: HUB.y + Math.sin(theta)*(hubRadius+4) };
          const end = { x: center.x - Math.cos(theta)*(compact ? 38 : 54), y: center.y - Math.sin(theta)*(compact ? 38 : 54) };

          // Decorative light filaments follow the existing spoke. They carry no statistical
          // weight, create no new predictor links, and never connect predictors to each other.
          // On mobile, draw only the linked quarter plus every fourth particle to limit work.
          const particles = rows.map(row => ({ row, pos: particlePosition(p.key, row.obs, t, state.reduced, compact) }));
          context.lineWidth = .55;
          context.strokeStyle = color;
          for (const { row, pos } of particles) {
            const highlighted = row.obs === state.activeQuarter;
            if (!highlighted && row.obs % (compact ? 4 : active ? 1 : 3) !== 0) continue;
            context.globalAlpha = highlighted ? .18 : .025 + prominence * .045;
            context.beginPath();
            context.moveTo(pos.x, pos.y);
            context.bezierCurveTo(
              center.x + (HUB.x-center.x)*.27 + (pos.x-center.x)*.35,
              center.y + (HUB.y-center.y)*.27 + (pos.y-center.y)*.35,
              start.x + (center.x-start.x)*.3,
              start.y + (center.y-start.y)*.3,
              start.x, start.y,
            );
            context.stroke();
          }
          // These six central strokes are the actual model-association connections.
          context.globalAlpha = .4 + prominence * .6;
          const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
          gradient.addColorStop(0, color + '55'); gradient.addColorStop(1, color + 'c0');
          context.strokeStyle = gradient;
          context.lineWidth = edgeWidth(Math.abs(p.standardizedBeta));
          context.shadowColor = color;
          context.shadowBlur = prominence * 9;
          context.setLineDash(p.coefficient < 0 ? [5, 7] : []);
          context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
          context.setLineDash([]);
          context.shadowBlur = 0;

          for (const { row, pos } of particles) {
            const highlighted = row.obs === state.activeQuarter;
            const brightness = state.reduced ? .8 : .7 + Math.sin(t * .0007 + row.obs * 1.8) * .15;
            context.globalAlpha = highlighted ? 1 : brightness * (.4 + prominence * .6);
            context.fillStyle = color;
            context.shadowColor = color;
            context.shadowBlur = highlighted ? 22 : 8 + prominence * 5;
            context.beginPath(); context.arc(pos.x, pos.y, highlighted ? 4.6 : 1.3 + (row.obs % 5)*.39, 0, Math.PI*2); context.fill();
            // A small bright core gives depth without adding any observation particles.
            if (row.obs % 3 === 0 || highlighted) {
              context.fillStyle = '#edfbff';
              context.beginPath(); context.arc(pos.x, pos.y, highlighted ? 1.8 : .65, 0, Math.PI*2); context.fill();
            }
            context.shadowBlur = 0;
            if (highlighted) {
              context.globalAlpha = .8;
              context.strokeStyle = color;
              context.lineWidth = 1;
              context.beginPath(); context.arc(pos.x, pos.y, 9, 0, Math.PI*2); context.stroke();
              context.fillStyle = '#eff8ff';
              context.font = '11px "DM Sans", sans-serif';
              context.fillText(`Q${row.obs}`, pos.x + 13, pos.y - 10);
            }
          }
          context.restore();
        }
        const pulse = state.reduced ? .5 : .5 + .5 * Math.sin(t * .00065);
        const glowExtent = hubRadius + 75;
        const glow = context.createRadialGradient(HUB.x, HUB.y, hubRadius*.4, HUB.x, HUB.y, glowExtent);
        glow.addColorStop(0, '#73d6ff20'); glow.addColorStop(.5, '#73d6ff12'); glow.addColorStop(1, '#73d6ff00');
        context.fillStyle = glow;
        context.globalAlpha = .8 + pulse * .2;
        context.fillRect(HUB.x-glowExtent, HUB.y-glowExtent, glowExtent*2, glowExtent*2);
        for (const offset of [10, 23, 35]) {
          context.strokeStyle = '#82d6ff';
          context.globalAlpha = (.11 - offset*.002) * (.7 + pulse*.3);
          context.lineWidth = .8;
          context.beginPath(); context.arc(HUB.x,HUB.y,hubRadius+offset+(state.reduced?0:pulse*2),0,Math.PI*2); context.stroke();
        }
        context.globalAlpha = 1;
        const face = context.createRadialGradient(HUB.x-25,HUB.y-35,8,HUB.x,HUB.y,hubRadius);
        face.addColorStop(0,'#142333'); face.addColorStop(1,'#0a111c');
        context.fillStyle = face;
        context.strokeStyle = '#8ac8e55c'; context.lineWidth = 1;
        context.beginPath(); context.arc(HUB.x,HUB.y,hubRadius,0,Math.PI*2); context.fill(); context.stroke();
        context.strokeStyle = '#9bdfff33';
        context.beginPath(); context.arc(HUB.x,HUB.y,hubRadius-7,-Math.PI*.8,-Math.PI*.1); context.stroke();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }
    draw(performance.now());
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [size, reduced, reduced ? activeQuarter : null, reduced ? selected : null, reduced ? transform : null]);

  function hitTest(event: React.PointerEvent<SVGSVGElement>) {
    if (event.buttons && event.pointerType !== 'touch') return;
    const box = svg.current!.getBoundingClientRect();
    const scale = Math.min(box.width / WORLD.width, box.height / WORLD.height);
    const point = transform.invert([(event.clientX-box.left-(box.width-WORLD.width*scale)/2)/scale, (event.clientY-box.top-(box.height-WORLD.height*scale)/2)/scale]);
    let hit: typeof over = null;
    let distance = 13 / Math.sqrt(transform.k);
    for (const p of predictors) for (const r of rows) {
      const pos = particlePosition(p.key, r.obs, lastTime.current, reduced, compact);
      const d = Math.hypot(pos.x-point[0], pos.y-point[1]);
      if (d < distance) { distance = d; hit = { key: p.key, obs: r.obs }; }
    }
    setOver(previous => previous?.key === hit?.key && previous?.obs === hit?.obs ? previous : hit);
    onHover(hit?.obs ?? null);
    if (hit) onSelect(hit.key);
  }
  function changeZoom(factor: number) {
    if (zoomControl.current) select(svg.current!).call(zoomControl.current.scaleBy, factor);
  }

  return <div className={`network-stage ${compact ? 'compact-network' : ''}`} ref={container} data-testid="network-stage">
    <div className="network-vignette" />
    <canvas ref={canvas} aria-hidden="true" />
    <svg ref={svg} className={over ? 'network-overlay is-over' : 'network-overlay'} viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} role="group" aria-label="Six predictor clusters connected to fitted sales. Each cluster has 23 quarter particles. Use the quarter selector for keyboard exploration."
      onPointerMove={hitTest} onPointerDown={event=>{if(event.pointerType==='touch') hitTest(event);}} onPointerLeave={() => { setOver(null); onHover(null); }}
      onClick={() => { if (over) { onQuarter(over.obs); onSelect(over.key); } }}>
      <g transform={transform.toString()}>
        <g className="hub-text" pointerEvents="none">
          <text x={HUB.x} y={HUB.y-38} className="svg-eyebrow">MODEL-PREDICTED SALES</text>
          <text x={HUB.x} y={HUB.y+13} className="hub-value">{money(fitted)}</text>
          <text x={HUB.x} y={HUB.y+43} className="hub-sub">QUARTER {activeQuarter}</text>
        </g>
        {predictors.map(p => {
          const pos = positions[p.key];
          return <g key={p.key} className={`cluster-label ${selected === p.key ? 'selected' : ''}`} role="button" tabIndex={0}
            aria-label={`${meta[p.key].label}, coefficient ${p.coefficient}, ${p.coefficient > 0 ? 'positive' : 'negative'} association`}
            aria-pressed={selected === p.key} data-testid={`cluster-${p.key}`}
            onPointerEnter={()=>onSelect(p.key)}
            onFocus={()=>onSelect(p.key)}
            onClick={event => { event.stopPropagation(); onSelect(p.key); }}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(p.key); } }}>
            <title>{meta[p.key].label}: regression coefficient b = {p.coefficient}; standardized link scale β* = {p.standardizedBeta}. Conditional association, not causal importance.</title>
            <rect x={pos.x-105} y={pos.y+58} width={210} height={compact ? 60 : 78} rx={6} fill="transparent" />
            <text x={pos.x} y={pos.y+78} fill={meta[p.key].color} className="cluster-name">{meta[p.key].short}</text>
            <text x={pos.x} y={pos.y+101} className="cluster-coefficient">b {signed(p.coefficient, 4)}</text>
            {!compact && <text x={pos.x} y={pos.y+123} className="cluster-beta">LINK SCALE · β* {signed(p.standardizedBeta, 3)}</text>}
          </g>;
        })}
      </g>
    </svg>
    <div className="network-topline"><span>23 QUARTERS / SIX MODEL ASSOCIATIONS</span><span>LIGHT TRAILS ARE DECORATIVE</span></div>
    <div className="zoom-tools" aria-label="Network zoom controls">
      <button onClick={() => changeZoom(1.25)} aria-label="Zoom in">+</button>
      <button onClick={() => changeZoom(.8)} aria-label="Zoom out">−</button>
      <button onClick={() => zoomControl.current && select(svg.current!).call(zoomControl.current.transform, zoomIdentity)} aria-label="Reset network zoom">Reset</button>
    </div>
    <span className="network-instruction">{over ? `Quarter ${over.obs} · ${meta[over.key].short} · click to pin` : 'Hover a particle to connect a quarter. Scroll to zoom.'}</span>
  </div>;
}
