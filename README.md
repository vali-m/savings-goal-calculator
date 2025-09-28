# Savings Goal Calculator
This small app as well as this README is entirely vibecoded using chatgpt 5 thinking. It took me about 5-10 minutes to write the requirements and generate the code.

Single-file web page to compute one missing savings-planning variable and show an annual projection table.

## What it does

* Inputs: **Initial portfolio**, **Yearly expected rate of return (%)**, **Years to save**, **Yearly saved amount**, **Financial objective**.
* The first two are required. Leave **exactly one** of the last three blank. On submit, the app computes the blank one, then renders a table with year-by-year balances using annual compounding with contributions at year end.

## How to run

1. Open `Savings Goal Calculator — single file HTML` in any modern browser. No build step.
2. Enter values. Defaults: Initial = `0`, RoR = `7`.
3. Leave **one** of: Years, Yearly Saved, or Objective blank.
4. Click **Submit**. Use **Reset** to clear.

## Assumptions and conventions

* Annual compounding. Contributions occur **at the end of each year**.
* Years are treated as **integers**. If you input a fraction it is **floored**.
* Rate is a percentage (e.g., `7` means `7% = 0.07`). Minimum allowed rate is `>-100%`.
* Number formatting shows two decimals in your browser locale. No currency symbol is enforced.

## Projection formula

For year `k` (starting at `k = 1`), with end‑of‑year contribution `S` and constant annual rate `r`:

```
A_0 = P0
A_k = A_{k-1} * (1 + r) + S
```

The table lists `(year, A_year)` from `0` to `N`.

## Closed-form relations

Using `g = (1 + r)^N` and `r ≠ 0`:

* **Future value (objective) after N years**

  `F = P0 * g + S * ((g - 1) / r)`

  If `r = 0`: `F = P0 + S * N`.

* **Solve for yearly savings S** given `F, N, P0, r`:

  `S = (F - P0 * g) / ((g - 1) / r)`  (for `r ≠ 0`)

  If `r = 0`: `S = (F - P0) / N`.

* **Solve for years N** given `F, S, P0, r`:

  Exact integer solution is not closed-form with the end-of-year integer constraint. The app simulates year-by-year and returns the **smallest integer N** with `A_N ≥ F`. If not reachable by 10,000 years, it reports an error.

## Field behavior

* **Computing Objective**: requires `Years` and `Yearly saved`. Uses the projection to `N` and sets Objective to `A_N`.
* **Computing Years**: requires `Yearly saved` and `Objective`. Iterates annually until target is met; writes that integer into `Years`.
* **Computing Yearly saved**: requires `Years` and `Objective`. Uses the closed form above. Handles `r = 0` exactly.

The field that was computed is highlighted.

## Validation and edge cases

* Exactly one of the last three fields must be blank. Otherwise an error is shown.
* Negative yearly savings are permitted mathematically but flagged with a warning.
* `Years < 0` is rejected. `r ≤ -100%` is rejected.
* With `N=0`, only `F = P0` is feasible; otherwise an error is shown.

## Example scenarios

* **Find objective**: `P0=10,000`, `r=7%`, `N=10`, `S=5,000` → Objective computed, table shows years `0..10`.
* **Find years**: `P0=0`, `r=7%`, `S=3,000`, `F=50,000` → Years computed as the smallest `N` such that `A_N ≥ 50,000`.
* **Find yearly saved**: `P0=20,000`, `r=5%`, `N=15`, `F=150,000` → Yearly saved computed using closed form.

## File list

* `Savings Goal Calculator — single file HTML` — the entire app.
* `README.md — Savings Goal Calculator` — this document.

## Notes for customization

* Default values are set in the HTML inputs. Adjust as needed.
* Rate input accepts decimals (e.g., `6.5`).
* All calculations are client-side. No data leaves the browser.
