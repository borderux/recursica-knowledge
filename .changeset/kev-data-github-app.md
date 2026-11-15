---
"@recursica/knowledge": minor
---

CircleChat host kit: the Kev notes push has a GitHub App of the push's own. The app replaces the personal access token `KEV_DATA_GITHUB_PAT`.

- **`data.github_app` in site.json.** The block holds the app ID, the installation ID and the slug. The app's one repo is `data.repo`, the private notes repo.
- **The permissions are fixed in the kit.** The app has Contents and Pull requests, both read and write, and Metadata read. site.json can't add a permission or a repo.
- **The token service makes the push's token.** The token covers only `data.repo`, and lasts at most one hour. The service writes the token to `$CC_DIR/kev-data.env` as `KEV_DATA_GITHUB_TOKEN`, with mode 600, and never writes through a symlink.
- **The private key stays with root.** The key is the GitHub environment secret `APP_KEY_KEV_DATA`. The secrets helper writes the key to `kev-data.pem`, next to the agents' keys.
- **Each notes commit uses the app's bot identity,** `<app-slug>[bot]`.
- **The old token is retired.** The secrets helper removes `KEV_DATA_GITHUB_PAT` from `kev-data.env`, and asks to delete the secret.
- **A manifest for the app.** `node circlechat/github/manifest.mjs kev-data` prints the app's manifest and the steps to create the app.

### Upgrading

1. Protect the notes repo with `bash circlechat/github/protect-repo.sh <owner>/<repo>`, so only a repo admin merges a pull request.
2. Create the push's app, as "Kev's review data" in `circlechat/README.md` describes. Install the app on the notes repo only.
3. Save the app's private key as `APP_KEY_KEV_DATA`. Send the key to `gh secret set` on stdin, then delete the key file with `shred`.
4. Add `data.github_app` to site.json.
5. Copy `circlechat/deploy/deploy-secrets.yml` to the private repo again. The new workflow no longer passes `KEV_DATA_GITHUB_PAT`.
6. Deploy the secrets, and rerun `setup-host.sh`.
7. Delete `KEV_DATA_GITHUB_PAT` from each GitHub environment, and revoke the token on GitHub.
