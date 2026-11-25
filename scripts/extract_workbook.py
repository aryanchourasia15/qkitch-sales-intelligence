"""Extract authoritative Excel caches; independently validate the model without modifying it."""
from pathlib import Path
import hashlib
import json
import math
import statistics
import numpy as np
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'Group3_QKitch_model.xlsx'
KEYS = ['prom', 'adv', 'prom_lag1', 'adv_lag1', 'index', 'cold']


def extract():
    before = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    formulas = openpyxl.load_workbook(SOURCE, data_only=False)
    book = openpyxl.load_workbook(SOURCE, data_only=True)
    checks = []

    def check(name, condition, detail=None):
        checks.append({'name': name, 'passed': bool(condition), 'detail': detail})
        if not condition:
            raise ValueError(f'Validation failed: {name}: {detail}')

    cells = {}
    for sheet in formulas:
        for row in sheet:
            for cell in row:
                if cell.value is None:
                    continue
                cached = book[sheet.title][cell.coordinate].value
                if cell.data_type == 'f':
                    check(f'Cached formula {sheet.title}!{cell.coordinate}', isinstance(cached, (int, float)) and math.isfinite(cached))
                cells[f"'{sheet.title}'!{cell.coordinate}"] = {
                    'value': cached, 'formula': cell.value if cell.data_type == 'f' else None,
                    'numberFormat': cell.number_format,
                }

    def records(sheet, names, start, end):
        return [{name: book[sheet].cell(r, i + 1).value for i, name in enumerate(names)} for r in range(start, end + 1)]

    observations = records('Data', ['obs', 'sales', 'prom', 'adv', 'index', 'q1', 'q2', 'q3', 'q4', 'prom_lag1', 'adv_lag1', 'cold'], 2, 25)
    regression = records('Regression input', ['obs', 'sales', *KEYS, 'fitted', 'residual'], 2, 24)
    check('24 raw and 23 usable observations', len(observations) == 24 and len(regression) == 23)
    check('Sequential observation IDs', [r['obs'] for r in observations] == list(range(1, 25)))
    check('Only first observation has missing lags', all((r[k] is None) == (r['obs'] == 1) for r in observations for k in ['prom_lag1', 'adv_lag1']))
    check('Quarter indicators and cold definition', all(sum(r[k] for k in ['q1', 'q2', 'q3', 'q4']) == 1 and r['cold'] == r['q1'] + r['q4'] and all(r[k] in [0, 1] for k in ['q1', 'q2', 'q3', 'q4']) for r in observations))
    check('Lag identities', all(observations[i]['prom_lag1'] == observations[i-1]['prom'] and observations[i]['adv_lag1'] == observations[i-1]['adv'] for i in range(1, 24)))
    check('Regression rows match raw observations', all(all(r[k] == observations[r['obs']-1][k] for k in ['obs', 'sales', *KEYS]) for r in regression))

    model = book['Model output']
    coefficients = []
    y = [r['sales'] for r in regression]
    for row, key in enumerate(['intercept', *KEYS], 16):
        c = {'key': key, 'source': f"'Model output'!B{row}:G{row}"}
        c.update({name: model.cell(row, col).value for col, name in enumerate(['coefficient', 'standardError', 'tStatistic', 'pValue', 'lower95', 'upper95'], 2)})
        if key != 'intercept':
            x = [r[key] for r in regression]
            c.update({'standardizedBeta': c['coefficient'] * statistics.stdev(x) / statistics.stdev(y), 'sampleSD': statistics.stdev(x), 'min': min(x), 'max': max(x)})
        coefficients.append(c)

    stat_rows = {'multipleR': 5, 'rSquared': 6, 'adjustedRSquared': 7, 'residualStandardError': 8, 'observations': 9, 'predictors': 10, 'residualDF': 11, 'fStatistic': 12, 'significanceF': 13}
    stats = {key: model.cell(row, 2).value for key, row in stat_rows.items()}
    stats.update({'regressionSS': model['J9'].value, 'residualSS': model['K9'].value})
    decision = {key: model.cell(row, 2).value for key, row in {'advertisingTwoQuarter': 26, 'promotionTwoQuarter': 27, 'advertisingBreakEvenMargin': 28, 'promotionBreakEvenMargin': 29, 'fittedQuarter23': 30, 'fittedQuarter24': 31}.items()}
    b = np.array([c['coefficient'] for c in coefficients])
    X = np.array([[1, *[r[k] for k in KEYS]] for r in regression])
    Y = np.array(y)
    fitted = X @ b
    error = float(max(abs(fitted - np.array([r['fitted'] for r in regression]))))
    check('All fitted values reproduce Excel', error < 1e-8, error)
    check('All residuals reproduce Excel', all(abs(r['sales'] - r['fitted'] - r['residual']) < 1e-8 for r in regression))
    ols = np.linalg.lstsq(X, Y, rcond=None)[0]
    check('Independent OLS coefficients', np.max(abs(ols-b)) < 1e-8, float(np.max(abs(ols-b))))
    sse = float(np.sum((Y-fitted)**2))
    sst = float(np.sum((Y-Y.mean())**2))
    df = len(Y) - X.shape[1]
    check('R squared', abs(1-sse/sst-stats['rSquared']) < 1e-10)
    check('Adjusted R squared', abs(1-(sse/df)/(sst/(len(Y)-1))-stats['adjustedRSquared']) < 1e-10)
    check('Residual standard error', abs(math.sqrt(sse/df)-stats['residualStandardError']) < 1e-8)
    check('Residual degrees of freedom', df == stats['residualDF'])
    check('Sums of squares', abs(sse-stats['residualSS']) < 1e-6 and abs(sst-sse-stats['regressionSS']) < 1e-6)
    check('F statistic', abs(((sst-sse)/6)/(sse/df)-stats['fStatistic']) < 1e-8)
    se = np.sqrt(np.diag(np.linalg.inv(X.T@X))*sse/df)
    check('Independent coefficient standard errors', max(abs(se[i]-c['standardError']) for i,c in enumerate(coefficients)) < 1e-7)
    check('t statistics', all(abs(c['coefficient']/c['standardError']-c['tStatistic']) < 1e-8 for c in coefficients))
    check('Confidence interval symmetry', all(abs((c['lower95']+c['upper95'])/2-c['coefficient']) < 1e-8 for c in coefficients))
    # Cached p-values and confidence limits remain authoritative; no rounded substitutes.
    for name, current, lag in [('advertising', 2, 4), ('promotion', 1, 3)]:
        check(f'{name} two-quarter effect', abs(b[current]+b[lag]-decision[name+'TwoQuarter']) < 1e-10)
        check(f'{name} break-even margin', abs(1/decision[name+'TwoQuarter']-decision[name+'BreakEvenMargin']) < 1e-10)
    check('Quarter 23 and 24 fitted decision references', abs(regression[-2]['fitted']-decision['fittedQuarter23']) < 1e-8 and abs(regression[-1]['fitted']-decision['fittedQuarter24']) < 1e-8)
    check('Workbook unchanged', hashlib.sha256(SOURCE.read_bytes()).hexdigest() == before)
    result = {'schemaVersion': 1, 'source': {'file': SOURCE.name, 'sha256': before, 'units': {'sales': '$k', 'spending': '$k', 'index': 'points', 'cold': '0 or 1'}, 'coefficientOrder': KEYS, 'standardization': 'b * sampleSD(X) / sampleSD(sales), using observations 2-24; not causal importance or variance explained'}, 'observations': observations, 'regression': regression, 'coefficients': coefficients, 'stats': stats, 'decision': decision, 'cells': cells}
    dest = ROOT / 'src' / 'data'
    dest.mkdir(parents=True, exist_ok=True)
    (dest/'qkitch.json').write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False)+'\n', encoding='utf-8')
    report = {'passed': True, 'workbookSHA256': before, 'checks': checks, 'maxFittedDiscrepancy': error, 'formulaCellsValidated': sum(c['formula'] is not None for c in cells.values())}
    (dest/'validation-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(f"PASS: {len(checks)} checks; {report['formulaCellsValidated']} formula caches; max fitted discrepancy {error:.3g}. Workbook unchanged.")


if __name__ == '__main__':
    extract()
