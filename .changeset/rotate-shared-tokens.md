---
"@recursica/knowledge": minor
---

CircleChat host kit: `circlechat/deploy/rotate-tokens.sh` rotates the cluster's shared tokens. The tokens are `CLUSTER_TOKEN`, `JOBD_TOKEN` and `KEV_API_KEY`.

- **One token at a time.** The command makes a new random value. The command saves the value through stdin, as the secret in the stack's GitHub environment. The command then runs Deploy secrets for each computer that reads the token. A person pastes a one-day GitHub token, and no token or value ever shows.
- **kev-engine stops only for a key rotation, and only while Barb isn't running and the engine handles no request.** A check run on each computer with a kev-engine checks both before the first token changes. Each rotation run checks again, then restarts kev-engine once, with the new key. Every other deploy still never restarts kev-engine.
- **The cluster agent reports Barb's state.** On the control computer, `/status` reads Barb's state from the RecursicaChat server's database.
- **Kev moves on to the next engine when an engine refuses Kev's key.** During a rotation, one engine holds the new key while the next engine still holds the old key.
- **A changed value in the control computer's `.env` no longer recreates the model gateway.** The gateway reads none of the values in `.env`.
- **The Deploy secrets workflow has a new `kev_rotation` input.** Only the rotation sets the input.

**Upgrade:**

1. Copy `circlechat/deploy/deploy-secrets.yml` to `.github/workflows/` in the private repo of stacks.
2. Wait for the hourly update job on each computer. The update job installs the new secrets helper and restarts the cluster agent with the new kit. Until then, the rotation's check stops and names the computer that still runs the older helper.
