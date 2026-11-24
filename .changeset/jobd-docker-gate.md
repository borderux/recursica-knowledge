---
"@recursica/knowledge": minor
---

CircleChat host kit: on Linux, the cluster's own job runner runs as jobd's own account. jobd reaches Docker only through jobd's Docker filter. jobd ran as the computer's owner, in the docker group, while Docker runs as root. A flaw in jobd, which the cluster reaches on the jobs port, gave root on the computer.

- **jobd runs as `recursica-jobd`.** The account has no login shell and no home folder, and belongs to no docker group. jobd reads only jobd's own secrets, from `/etc/recursica-jobd/jobd.env`.
- **jobd's Docker filter passes only jobd's calls.** `jobd/docker-gate.mjs` creates a container from the job image only, with jobd's fixed settings. The filter starts, inspects, waits for, removes and reads the logs of the filter's own containers. Every other Docker call gets a 403 answer and a line in the filter's log.
- **Each job gets no-new-privileges and a 4096-process cap.** The filter adds both settings to every job.
- **The filter's socket is open to jobd's account only.** The filter runs as `recursica-jobd-gate`, with no network, and only the filter's service gets the docker group.
- **The move waits for running jobs.** `setup-node.sh` stops while a port job runs, and asks to wait until every port job ends.
- **jobd stops at the start on Linux when jobd can reach Docker directly.** Run `setup-node.sh` on the computer to finish the move.

A client or demo stack's job runner keeps direct Docker access until a later change. So does every job runner on macOS.
