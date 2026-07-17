# Con Edison — Steam Customer Drop-Off Predictor

*Source: Narrowed from the original "Gas & Steam Load Reduction Predictive Model" intake. Scope confirmed in email from David Caiafa, May 4, 2026 (Gmail thread `19df4b4ffb9f15e1`). Multi-utility forecasting and gas-side work are no longer in scope for this capstone.*

---

## 01. Partner Information

**Company:** Con Edison
**Primary Contact:** David Caiafa (caiafad@coned.com)
**Working partners:** Steam subject matter experts at Con Edison (introduced through David)

## 02. Project Overview

**Project Title:** Steam Customer Drop-Off Predictor

**Short Description:** A predictive analytics model that identifies early-warning signals for steam customers likely to experience significant usage drops without warning. Provides Con Edison's steam team with a proactive mechanism for adjusting forecasts and intervening before drop-offs cause downstream financial planning errors.

**Why this matters to Con Edison:** Sudden, unannounced reductions in customer steam usage cause meaningful forecasting errors. Predicting these drops in advance allows for better financial planning and resource management. Each utility commodity (electric, gas, steam) is meaningfully different, and the steam team has deep familiarity in this domain, so going deep on steam in a focused timeframe is more realistic than spreading across all three.

**Output of the Project:** A trained predictive model plus a risk dashboard that flags high-probability drop-off customers, with documentation of the underlying logic and accuracy.

## 03. Project Scope

**Suggested Deliverables:**
- Trained ML model predicting steam customer drop-off risk
- Risk dashboard / visualization of high-probability drop-off customers
- List of significant predictive flags / signals
- Documentation of the underlying logic and accuracy benchmarks

**Working partners:** Builders will work directly with Con Edison's steam subject matter experts during the build. The steam team has expressed strong interest in collaborating, which means less internal red tape than a typical external partnership.

**Data:** Con Edison has offered to provide either obfuscated real data or synthetic data. Real customer data under NDA is also a possibility, which Pursuit will work out with David before kickoff. Customer billing privacy is a hard constraint regardless of the path taken.

**Desired Tools/Tech:** Python (Scikit-learn / XGBoost), SQL, Tableau or PowerBI for the dashboard layer. ML and time-series experience is the relevant skill set.

**Constraints:**
- 6-week build window
- Customer billing data privacy
- Tool must be defensible to Con Ed steam SMEs

## 04. Success Criteria

**What success looks like:** A working model that flags meaningful steam customer drop-offs before they occur, with a clear dashboard the Con Ed steam team can use, plus documentation of which usage behaviors are the strongest predictors. Accuracy benchmark: identify at least 70% of major usage drops in back-tested data.

**Strategic upside:** David Caiafa told Pursuit that strong work here could open up additional opportunities for Pursuit and the Builder team beyond this capstone.

**Open questions Builders should explore:**
- Which usage behaviors are the strongest predictors (peak shifting vs. overall decline, seasonality patterns, etc.)?
- Can external market or economic data improve prediction accuracy?
- How should the model surface confidence levels so the steam team can prioritize follow-up?

## 05. Schedule

| Milestone | Date / Time |
|---|---|
| Builder/Partner Kickoff | Mon May 18, 5:30-6:30 PM ET |
| Midpoint Check-In | Wed June 3, 5:30-6:15 PM ET |
| Final Readout | Week of June 17-18 (TBD) |
| Demo Day | Wed June 24, 6 PM ET at Blackstone |
