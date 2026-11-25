import { scaleLinear } from 'd3';
import { predictors } from './model';
import type { Predictor } from '../types/model';

export const WORLD = { width: 1080, height: 700 };
export const HUB = { x: 540, y: 337 };
export const MOBILE_WORLD = { width: 560, height: 720 };
export const MOBILE_HUB = { x: 280, y: 337 };
export const mobilePositions: typeof positions = {
  prom: {x:140,y:148}, adv:{x:420,y:148},
  prom_lag1:{x:100,y:365}, adv_lag1:{x:460,y:365},
  index:{x:160,y:566}, cold:{x:400,y:566},
};
// Spatial arrangement is aesthetic. Only the six hub links encode model associations.
export const positions: Record<Predictor, { x: number; y: number }> = {
  prom: { x: 275, y: 158 }, adv: { x: 805, y: 158 },
  prom_lag1: { x: 185, y: 362 }, adv_lag1: { x: 895, y: 362 },
  index: { x: 317, y: 558 }, cold: { x: 763, y: 558 },
};
export const edgeWidth = scaleLinear().domain([0, Math.max(...predictors.map(c => Math.abs(c.standardizedBeta)))]).range([0.6, 3.3]).clamp(true);
export function particlePosition(key: Predictor, observation: number, time: number, reduced: boolean, compact = false) {
  const c = (compact ? mobilePositions : positions)[key];
  const n = observation - 2;
  const angle = n * Math.PI * (3 - Math.sqrt(5)) + (reduced ? 0 : Math.sin(time * .00013 + n) * .025);
  const radius = compact ? 12 + Math.sqrt(n / 22) * 34 : 18 + Math.sqrt(n / 22) * 49;
  return { x: c.x + Math.cos(angle) * radius, y: c.y + Math.sin(angle) * radius * .72 + (reduced ? 0 : Math.sin(time * .0005 + n) * 1.6) };
}
