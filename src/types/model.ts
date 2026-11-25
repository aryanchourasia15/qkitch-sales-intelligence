export const predictorKeys = ['prom', 'adv', 'prom_lag1', 'adv_lag1', 'index', 'cold'] as const;
export type Predictor = typeof predictorKeys[number];
export type Inputs = Record<Predictor, number>;
export type RegressionRow = Inputs & { obs: number; sales: number; fitted: number; residual: number };
export interface Coefficient {
  key: string; coefficient: number; standardError: number; tStatistic: number;
  pValue: number; lower95: number; upper95: number; source: string;
  standardizedBeta?: number; sampleSD?: number; min?: number; max?: number;
}
