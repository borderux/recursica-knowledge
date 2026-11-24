# shellcheck shell=bash
# jobd on Linux, for the cluster's own stack: jobd runs as the account recursica-jobd, outside the
# docker group, and reaches Docker only through jobd's Docker filter (docker-gate.mjs).
# setup-node.sh sources this file in the jobs block, with NODE, HERE, ROOT, SECRETS, JNET,
# JOBS_NET_ARGS, JOBD_HOST, GATEWAY_URL and jget set. A client or demo stack's job runner keeps
# the older setup in setup-node.sh until a later change.
#
#   recursica-jobd       jobd's account: no login shell, no home folder, outside the docker group
#   recursica-jobd-gate  the filter's account. Only the jobd-gate service gets the docker group.
#   /etc/recursica-jobd/jobd.env    the secrets jobd uses, from the secrets file, mode 640
#   /etc/recursica-jobd/gate.json   the filter's settings: the image, the network and the caps
#   /usr/local/lib/recursica-jobd/  a copy of jobd.mjs and docker-gate.mjs, owned by root
#   /var/lib/recursica-jobd/        jobd's folder, mode 700: each job's meta.json, gateway.env, job.log
#   /var/lib/recursica-jobd-work/   the work folders, owned by the filter, mode 2750
#   /run/recursica-jobd-gate/       the filter's socket, open to the filter's and jobd's accounts only
#
# The switch from jobd under the computer's owner waits until no port job runs: the switch never
# moves a running job. The building of the job image stays in setup-node.sh, which a person runs.
# JOBD_SETUP_ROOT puts every system folder under a test folder, for the tests.
R="${JOBD_SETUP_ROOT:-}"
JD_ETC="$R/etc/recursica-jobd" JD_LIB="$R/usr/local/lib/recursica-jobd"
JD_STATE="$R/var/lib/recursica-jobd" JD_WORK="$R/var/lib/recursica-jobd-work" JD_RUN="$R/run/recursica-jobd-gate"
JD_ACCOUNT=recursica-jobd JD_GATE=recursica-jobd-gate
JD_PIDS_LIMIT=4096

[ -n "${JNET:-}" ] || { echo "$NODE runs jobs: jobd's Docker filter needs the jobs' closed network. Turn on the outgoing filter (EGRESS) in site.json, then rerun."; exit 1; }
[ -z "${DOCKER_CONTEXT:-}" ] || [ "$DOCKER_CONTEXT" = default ] || { echo "$NODE runs jobs with the Docker context $DOCKER_CONTEXT. jobd's Docker filter uses Docker's own socket. Unset DOCKER_CONTEXT, then rerun."; exit 1; }
NODE_BIN="$(command -v node)"
case "$NODE_BIN" in
  /home/*|/root/*|"$HOME"/*) echo "Node.js is at $NODE_BIN, in a home folder, where jobd's account cannot run Node.js. Install Node.js for every account, such as at /usr/bin/node, then rerun."; exit 1 ;;
esac

# The switch from jobd under the owner waits until no port job runs.
if [ "$(systemctl show -p User --value jobd 2>/dev/null)" != "$JD_ACCOUNT" ]; then
  running="$(docker ps -q --filter 'name=^job-' | wc -l | tr -d ' ')"
  if [ "$running" != 0 ]; then
    echo "$NODE: $running port job(s) run on this computer. jobd moves to the account $JD_ACCOUNT only when no port job runs. Wait until every port job ends, then run setup-node.sh again."
    exit 1
  fi
fi

for a in "$JD_ACCOUNT" "$JD_GATE"; do
  getent passwd "$a" >/dev/null || sudo useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$a"
  # Neither account belongs to the docker group. The jobd-gate service alone gets the group.
  case " $(id -nG "$a" 2>/dev/null) " in *" docker "*) sudo gpasswd -d "$a" docker >/dev/null ;; esac
done
JD_GID="$(getent group "$JD_ACCOUNT" | cut -d: -f3 || true)"
[ -n "$JD_GID" ] || { echo "The group $JD_ACCOUNT does not exist after useradd."; exit 1; }

# Each folder is a real folder, never a link, with the owner and mode above.
jd_folder() {
  local dir="$1" owner="$2" group="$3" mode="$4"
  [ -L "$dir" ] && { echo "$dir is a link. Replace the link with a folder, then rerun."; exit 1; }
  sudo mkdir -p "$dir"
  sudo chown -h "$owner:$group" "$dir"
  sudo chmod "$mode" "$dir"
}
jd_folder "$JD_ETC" root root 755
jd_folder "$JD_LIB" root root 755
jd_folder "$JD_STATE" "$JD_ACCOUNT" "$JD_ACCOUNT" 700
jd_folder "$JD_WORK" "$JD_GATE" "$JD_ACCOUNT" 2750
sudo install -o root -g root -m 644 "$HERE/jobd/jobd.mjs" "$HERE/jobd/docker-gate.mjs" "$JD_LIB/"

# The secrets jobd uses, and nothing else from the secrets file.
# shellcheck source=/dev/null  # the secrets file of this computer
JD_PASS="$( set -a; . "$SECRETS"; set +a; printf '%s' "${JOBD_PASS_ENV:-PORTER_MODEL}" | tr ',' ' ' )"
for n in $JD_PASS; do [[ "$n" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || { echo "JOBD_PASS_ENV in $SECRETS names \"$n\", which is not a setting's name."; exit 1; }; done
# shellcheck disable=SC2086,SC1090  # JD_PASS is a list of checked names, and SECRETS the secrets file
JD_ENV="$( set -a; . "$SECRETS"; set +a
  for n in JOBD_TOKEN PORTER_HOOK_URL PORTER_HOOK_SECRET JOBD_PASS_ENV $JD_PASS; do
    if [ -n "${!n+x}" ]; then printf '%s=%q\n' "$n" "${!n}"; fi
  done )"
sudo install -o root -g "$JD_ACCOUNT" -m 640 /dev/null "$JD_ETC/jobd.env"
printf '%s\n' "$JD_ENV" | sudo tee "$JD_ETC/jobd.env" >/dev/null

# The filter's settings. A job gets the settings jobd sends: the repository, the report's path, the
# gateway's address and key, the token service's address, the outgoing filter and JOBD_PASS_ENV.
# shellcheck disable=SC2086
node -e '
  const [listen, image, network, memGb, cpus, pids, workRoot, gid, proxy, ...pass] = process.argv.slice(1);
  const names = ["TARGET_REPO", "PORTER_REPORT", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "GITHUB_TOKEN_URL", ...pass];
  if (proxy) names.push("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "NODE_USE_ENV_PROXY", "NO_PROXY", "no_proxy");
  process.stdout.write(JSON.stringify({ listen, docker: "/var/run/docker.sock", image, network,
    memoryBytes: Math.floor(Number(memGb) * 2 ** 30), nanoCpus: cpus ? Math.round(Number(cpus) * 1e9) : 0, pidsLimit: Number(pids),
    workRoot, groupId: Number(gid), envNames: names }, null, 2) + "\n");
' "$JD_RUN/docker.sock" "recursica/porter-job" "$JNET" "$(jget memory_gb)" "$(jget cpus)" "$JD_PIDS_LIMIT" "$JD_WORK" "$JD_GID" \
  "$(case "$JOBS_NET_ARGS" in *JOBD_PROXY=*) echo on ;; esac)" $JD_PASS | sudo tee "$JD_ETC/gate.json" >/dev/null

JD_HARDEN="NoNewPrivileges=yes
CapabilityBoundingSet=
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
SystemCallFilter=@system-service
SystemCallArchitectures=native"

# The filter: the filter's account, with the docker group for this service only, no network, and
# write access to the work folders only. The filter's socket sits in the service's own folder in
# /run, mode 750, of the filter's account and jobd's group.
UNIT_EXTRA="Group=$JD_ACCOUNT
SupplementaryGroups=docker
RuntimeDirectory=recursica-jobd-gate
RuntimeDirectoryMode=0750
PrivateNetwork=yes
RestrictAddressFamilies=AF_UNIX
ReadWritePaths=$JD_WORK
$JD_HARDEN" UNIT_SETTINGS="$JD_ETC/gate.json $JD_LIB/docker-gate.mjs" \
  install_unit jobd-gate "exec $NODE_BIN $JD_LIB/docker-gate.mjs $JD_ETC/gate.json" / "$JD_GATE"

# jobd: jobd's account, with write access to jobd's folder and the work folders only.
UNIT_EXTRA="RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
ReadWritePaths=$JD_STATE $JD_WORK
$JD_HARDEN" UNIT_SETTINGS="$JD_ETC/jobd.env $JD_LIB/jobd.mjs $ROOT/package.json" \
  install_unit jobd "set -a; . $JD_ETC/jobd.env; set +a; HOME=$JD_STATE DOCKER_CONFIG=$JD_STATE/.docker DOCKER_HOST=unix://$JD_RUN/docker.sock ${JOBS_NET_ARGS}JOBD_HOST=$JOBD_HOST JOBD_PORT=$(jget port) JOBD_SLOTS=$(jget slots) JOBD_MEMORY_GB=$(jget memory_gb) JOBD_CPUS=$(jget cpus) JOBD_NODE_NAME=$NODE JOBD_GATEWAY_URL=$GATEWAY_URL JOBD_GITHUB_TOKEN_URL=$(jget github_token_url) JOBD_ALLOWED_REPOS=${JOBD_ALLOWED_REPOS:-} JOBD_DIR=$JD_STATE/jobs JOBD_WORK_ROOT=$JD_WORK exec $NODE_BIN $JD_LIB/jobd.mjs" "$JD_STATE" "$JD_ACCOUNT"
[ -d "$HOME/.recursica-jobs" ] && echo "jobd keeps jobs in $JD_STATE/jobs now. The old job folder $HOME/.recursica-jobs stays, with the reports of earlier jobs."
true
