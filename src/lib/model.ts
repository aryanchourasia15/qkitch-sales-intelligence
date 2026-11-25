import raw from '../data/qkitch.json';
import { predictorKeys, type Coefficient, type Inputs, type Predictor, type RegressionRow } from '../types/model';

export const data = raw;
export const rows: RegressionRow[] = raw.regression;
export const coefficients: Coefficient[] = raw.coefficients;
export const intercept = coefficients[0];
export const predictors = predictorKeys.map(key => coefficients.find(c => c.key === key)! as Coefficient & { key: Predictor; standardizedBeta: number; min: number; max: number });
export const baseline = rows[rows.length - 1];
export function predict(inputs: Inputs): number {
  if (predictorKeys.some(k => !Number.isFinite(inputs[k])) || ![0, 1].includes(inputs.cold)) throw new Error('All predictors must be finite; cold must be 0 or 1.');
  return intercept.coefficient + predictors.reduce((sum, c) => sum + c.coefficient * inputs[c.key], 0);
}
export function contributions(inputs: Inputs, reference: Inputs = baseline) {
  return predictors.map(c => ({ key: c.key, delta: c.coefficient * (inputs[c.key] - reference[c.key]) }));
}
export const format = (value: number, digits = 2) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const money = (value: number, digits = 1) => `$${format(value, digits)}k`;
export const signed = (value: number, digits = 2) => `${value < 0 ? '−' : '+'}${format(Math.abs(value), digits)}`;
export const pValue = (value: number) => value < 0.0001 ? value.toExponential(4) : value.toFixed(6);

export const meta: Record<Predictor, { label: string; short: string; color: string; unit: string; group: string; interpretation: string }> = {
  prom: { label: 'Current promotion', short: 'Promotion', color: '#61e4f0', unit: '$k', group: 'Management input', interpretation: 'An additional $1k of current promotion is associated with $6.544k higher current sales, holding the other five predictors fixed.' },
  adv: { label: 'Current advertising', short: 'Advertising', color: '#ae95ff', unit: '$k', group: 'Management input', interpretation: 'An additional $1k of current advertising is associated with $2.521k higher current sales, holding the other five predictors fixed.' },
  prom_lag1: { label: 'Prior-quarter promotion', short: 'Prior promotion', color: '#ff927f', unit: '$k', group: 'Historical input', interpretation: 'An additional $1k of prior-quarter promotion is associated with $3.493k lower current sales, conditional on the other predictors. Sales displacement is a hypothesis to test, not an established mechanism.' },
  adv_lag1: { label: 'Prior-quarter advertising', short: 'Prior advertising', color: '#78e8ba', unit: '$k', group: 'Historical input', interpretation: 'An additional $1k of prior-quarter advertising is associated with $2.870k higher current sales, conditional on the other predictors. This is consistent with persistence but does not establish causality.' },
  index: { label: 'Market index', short: 'Market index', color: '#f4c475', unit: 'points', group: 'External condition', interpretation: 'One additional market-index point is associated with $4.953k lower sales, holding the other predictors fixed. This coefficient does not establish that stronger markets reduce sales.' },
  cold: { label: 'Cold quarter', short: 'Seasonality', color: '#91aeff', unit: '0 / 1', group: 'External condition', interpretation: 'Q1 or Q4 is associated with $66.624k higher sales than Q2 or Q3, conditional on the spending inputs and index. The workbook assumes Q1 is January–March.' },
};
