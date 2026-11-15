# shellcheck shell=bash
# The Kev data jobs' GitHub access (push-data.sh, pull-kev-notes.sh). Sourced, never run.
#
# The token is KEV_DATA_GITHUB_TOKEN, from the Kev notes push's GitHub App (site.json's
# data.github_app). The token service (circlechat/github/token-service.mjs) writes the token to
# $CC_DIR/kev-data.env, with the app's bot identity for commits, and renews the token each hour.
# The token covers only data.repo. The file is read as text and never sourced, so a line in the
# file never runs. git gets the token in its environment, as an HTTP header, so the token never
# sits in a command line, which every account can read in ps, or in the clone's settings. No
# credential helper and no prompt.
KEV_DATA_ENV="${KEV_DATA_ENV:-$CC_DIR/kev-data.env}"
kev_env() { sed -n "s/^$1=//p" "$KEV_DATA_ENV" 2>/dev/null | tail -n 1; }
if [ -z "${KEV_DATA_GITHUB_TOKEN:-}" ] && [ -f "$KEV_DATA_ENV" ]; then
  KEV_DATA_GITHUB_TOKEN="$(kev_env KEV_DATA_GITHUB_TOKEN)"
  # The app's bot identity, for the push's commit.
  for k in GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL; do
    v="$(kev_env "$k")"; [ -z "$v" ] || export "$k=$v"
  done
fi
[ -n "${KEV_DATA_GITHUB_TOKEN:-}" ] || { echo "Refused: no KEV_DATA_GITHUB_TOKEN in $KEV_DATA_ENV. Set data.github_app in site.json, deploy the app's key and check the github-tokens service (circlechat/README.md, \"Kev's review data\"). Nothing was pushed." >&2; exit 1; }
GIT_AUTH="Authorization: Basic $(printf 'x-access-token:%s' "$KEV_DATA_GITHUB_TOKEN" | base64 | tr -d '\n')"
export KEV_DATA_GITHUB_TOKEN GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=2 \
  GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0='' \
  GIT_CONFIG_KEY_1=http.https://github.com/.extraheader GIT_CONFIG_VALUE_1="$GIT_AUTH"
