---
"@recursica/knowledge": minor
---

CircleChat host kit: a check job tests the whole port-job path without touching a repository, and task keys end.

- **A check job.** jobd runs a new job type, `check`, in the port job's image and on the port job's network. The check job has three parts. Claude Code starts in the image. One tiny model request reaches the gateway with the task key. The token service confirms that the agent may get a token for the repository. A check job never clones, pushes or opens a pull request. A check job takes no slot, and one check job runs at a time on each job runner.
- **The token service confirms without making a token.** `POST /check` checks the task key, the agent's app, the repository and the private key. The service then reads the app's installation on the repository from GitHub with the app's JWT. The service never asks GitHub for a token.
- **The drill.** `circlechat/check-job.sh <node>` runs one check job on one node from the control computer. The drill makes a drill key with sudo, prints one PASS or FAIL line per part, and revokes the key at the end. A drill key works only for a check job and asks for 32 tokens at most. A drill key lasts 15 minutes by default, 4 hours at most.
- **A task key lasts 4 hours.** The running port job renews the key at the gateway, with `POST /task-key/renew`. Renewal keeps the same task, key id and job limit, and works only while the task is open and the key has not ended or been revoked.
- **A port job runs for 96 hours at most.** jobd stops the job at the limit. The job ends as `timed_out`, and the job's report says so. A restart of a job uses the newest key the job saved.
- **A key ends when the key's task closes.** Each minute, the gateway checks the task of each live key. A task that is done, cancelled, archived or deleted ends the task's keys.
- **An admin revokes one task's keys.** `keys.mjs revoke-task` ends every key a task has so far. `keys.mjs revoke-key` ends one key with every renewal of the key. The agent's key and the agent's other task keys keep working.
- **The hourly status.** Every hour, each job runner sends one status line per running port to the computer's cluster agent, over loopback. A line names the job, the node, the time the job has run, and the job's latest progress. The cluster agent posts each line as plain text in the cluster's Slack channel. The job runner holds no Slack token: the agent's status token only posts a status line. `setup-node.sh` stops when the node secrets file holds a Slack token.
- **Porter checks the job runners.** A person can ask Porter to check the job runners. Porter sends a check job to each job runner and posts the results in the task.

### Upgrading

1. Wait until no port job runs. Each job runner's `/health` shows `"running":0`. A restart of the gateway drops each model request that is running. Start no port job until step 4 is done on every node: an old job image never renews a key, so the job fails after 4 hours.
2. On the control computer, rerun `setup-host.sh`. The rerun grants the gateway's database role the tasks' `status` and `archived` columns, then restarts the gateway and the token service.
3. On each computer with a `jobs` block, rerun `install-cluster.sh`. The cluster agent then takes status lines, and writes the job runner's status token. Remove any Slack token from the node secrets file.
4. On each computer with a `jobs` block, rerun `setup-node.sh`. The rerun builds the job image with the check job and restarts jobd.
5. Rerun `setup-agent.sh porter`, so Porter gets the instructions for check jobs.
6. Run `./circlechat/check-job.sh <node>` on the control computer for each node with a `jobs` block. Each drill passes when every line says PASS.

A task key from before the upgrade keeps working for 4 hours after the upgraded gateway first starts. The key then ends, and a job that still holds the key fails. Before the database grant, each task counts as open, and each key still ends after 4 hours.

A computer whose kit updates out of order fails in a way the drill shows. An old job runner answers a check job with `unknown_job_type`. An old token service has no `/check`, and the check job says to upgrade the control computer. An old gateway makes keys with no end time, and a new port job uses such a key without renewal.
