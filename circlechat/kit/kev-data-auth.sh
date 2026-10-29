# shellcheck shell=bash
# The Kev data jobs' GitHub access (push-data.sh, pull-kev-notes.sh). Sourced, never run.
#
# The token is KEV_DATA_GITHUB_PAT, read from $CC_DIR/kev-data.env as text: the file is never
# sourced, so a line in it never runs. git gets the token in its environment, as an HTTP header,
# so the token never sits in a command line, which every account can read in ps, or in the
# clone's settings. No credential helper and no prompt.
KEV_DATA_ENV="${KEV_DATA_ENV:-$CC_DIR/kev-data.env}"
if [ -z "${KEV_DATA_GITHUB_PAT:-}" ] && [ -f "$KEV_DATA_ENV" ]; then
  KEV_DATA_GITHUB_PAT="$(sed -n 's/^KEV_DATA_GITHUB_PAT=//p' "$KEV_DATA_ENV" | tail -n 1)"
fi
[ -n "${KEV_DATA_GITHUB_PAT:-}" ] || { echo "Refused: no KEV_DATA_GITHUB_PAT in $KEV_DATA_ENV. Deploy the job's token first (circlechat/README.md, \"Kev's review data\"). Nothing was pushed." >&2; exit 1; }
GIT_AUTH="Authorization: Basic $(printf 'x-access-token:%s' "$KEV_DATA_GITHUB_PAT" | base64 | tr -d '\n')"
export KEV_DATA_GITHUB_PAT GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=2 \
  GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0='' \
  GIT_CONFIG_KEY_1=http.https://github.com/.extraheader GIT_CONFIG_VALUE_1="$GIT_AUTH"
