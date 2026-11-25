# QKitch — Sales, connected.

An interactive sales intelligence presentation with a luminous D3 particle network, historical model validation and a transparent marketing scenario simulator. React, TypeScript, Vite, Tailwind CSS and Recharts. All calculations run in the browser; fonts and model data are bundled locally. No backend or API keys are required.

## GitHub Pages hosting

The workflow in `.github/workflows/pages.yml` installs the committed dependency versions, runs the numerical tests, builds the app and deploys `dist/` to GitHub Pages after each push to `main`.

In **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The published URL appears in that settings page and in the deployment workflow. Hosting runs on GitHub; your computer can be turned off. Relative Vite asset paths support a repository URL such as `https://USERNAME.github.io/qkitch-sales-intelligence/` and custom domains.

If no deployment starts after enabling Pages, open **Actions → Validate and deploy QKitch to GitHub Pages → Run workflow**.

## Local development

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The original, previously validated application is preserved. Hosting-specific changes are limited to relative asset URLs and the GitHub Actions workflow. No statistical equations, inputs, coefficients or predictions were changed.

## Experience

- **Sales Network:** exactly six regression associations; 23 linked quarter particles in each cluster. Hover to compare the same observation across all variables, click to pin, or use the quarter selector. Zoom, pan and reset the graph. Cluster labels distinguish the signed regression coefficient `b` from the standardized link scale `β*`. Fine light trails, particle positions, glow and motion are decorative, not extra relationships.
- **Model Validation:** actual and fitted sales for quarters 2–24, in-sample fit statistics, two residual plots, source references and a historical data table.
- **Decision Simulator:** current spending decisions, lagged historical inputs and external conditions are separated. Full-precision predictions are compared with Q24's model prediction, with an additive contribution breakdown. The workbook's two-quarter sales associations and break-even gross margins are explained separately.
- **Presentation and accessibility:** full-screen chapters, keyboard navigation, focus indicators, reduced-motion rendering, manual animation pause and responsive layouts. Use Left/Right or 1/2/3 for chapters, F for presentation and Escape to exit when focus is outside form controls.

## Data and numerical integrity

`src/data/qkitch.json` contains the extracted workbook values, full-precision coefficients, diagnostics, source-cell references and workbook SHA-256. `src/data/validation-report.json` records 407 successful extraction checks, including all 383 cached formulas, historical fitted/residual reconstruction and independent OLS validation. `tests/model.test.ts` verifies historical predictions, the scenario baseline and decomposition, decision metrics and standardized network encoding.

The source was `Group3_QKitch_model.xlsx`. The original workbook is **not included in this public repository**; neither are unrelated workspace documents, local tunnel tools, credentials or the original hosting-provider identity. Existing structured JSON is sufficient to build and host the app. If you possess an updated source workbook, place it at the repository root, install `requirements.txt`, run `python scripts/extract_workbook.py`, then run tests and rebuild. The extractor reads the workbook without modifying it and requires valid Excel formula caches.

Source map:

| Workbook range | Content |
|---|---|
| Data!A2:L25 | 24 observations, spending, index, seasonal flags and lag formulas |
| Regression input!A2:J24 | 23 usable observations, model inputs, fitted sales and residuals |
| Model output!B5:B13 | Regression fit statistics and degrees of freedom |
| Model output!B16:G22 | Coefficients, standard errors, t-statistics, p-values and 95% intervals |
| Model output!B26:B31 | Two-quarter effects, break-even margins and Q23/Q24 fitted values |

## Interpretation

The observational model is fitted on 23 quarters with six predictors and an intercept, leaving 16 residual degrees of freedom. Reported fit is **in-sample**, not out-of-sample predictive accuracy. Coefficients are conditional associations, not causal returns. Standardized coefficients are neither causal importance nor percentages of variance explained. Potential serial dependence, multicollinearity, omitted variables, spending endogeneity and model-selection uncertainty remain unresolved.

The simulator computes the precise Excel equation. Its baseline uses Q24 inputs: promotion 11.4, advertising 39, prior promotion 42.3, prior advertising 36, index 114 and cold 1. Baseline fitted sales are 386.231693806404 ($k); observed sales are 342.81 ($k). Individual observed input ranges do not guarantee historical support for every combination.

Two-quarter effects sum current and lagged spending coefficients for a one-quarter increment, holding other inputs fixed. Break-even gross margin is the reciprocal of that net sales association, assuming margin times incremental sales minus spending, no additional incremental costs and no discounting. The workbook supplies no actual gross margin, so the app claims no profit, ROI or optimal budget. Coefficient intervals are not sales prediction intervals; uncertainty for combined two-quarter effects is not supplied.
