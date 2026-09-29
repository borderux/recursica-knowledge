# Kev evals

Kev is only useful if it doesn't miss what a full Barb review finds. These files are the
labels: full Barb's surviving findings per screen, in the format `eval.mjs` reads.

```sh
node bin/kev.mjs --json --root <app> <app>/<screen> > kev.json
node eval.mjs --kev kev.json --barb evals/<screen>.barb.json
```

The number that matters is **MISSED (Kev said clear)**. The second is how many leads were real.

## Results so far

Kev-engine: `jaredpalmer/kev-4b` on a 16 GB RTX 5070 Ti. Screens from the builder's prototype repo.

| Screen | Lines | Barb run | Barb findings | Kev lead | Kev unsure | Missed | Leads real |
|---|---|---|---|---|---|---|---|
| delivery-customer-profile | 214 | single-pass¹ | 2 | 2 | 0 | 0 | 2 / 5 |
| delivery-customer-profile | 214 | full (checker + feisty) | 4 | 2 | 2 | 0 | 2 / 5 |
| delivery-manager | 637 | single-pass¹ | 6 | 0 | 5 | 1 | 0 / 41 |

¹ Before the Hermes delegation cap was lifted (see `agents/barb/runtime/hermes.md`), so these
findings were never challenged by feisty. The full-review row is the trustworthy one.

On delivery-manager, Barb's findings ranked 42nd to 478th of 535 by Kev's score: some signal,
not enough to be useful. That is why Barb only runs Kev on files under 300 lines.

## What would improve it, in order

1. **More full-review labels.** Every full review Barb runs is one; her refuted findings are
   just as useful, as known false positives. `kev-disagreements.md` in her reviews folder
   collects both.
2. **Thresholds from those labels.** `KEV_FLAG` / `KEV_PASS` are guesses from two screens.
3. **Fine-tuning Kev-engine on Barb's verdicts** once there are a few hundred labels. Its trainer
   runs on a Mac (MPS); 4B may also fit 16 GB with bf16 weights and checkpointing.
4. **A larger engine.** 9B runs on a Mac via MLX; 27B needs an 80 GB NVIDIA card.
