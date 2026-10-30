---
"@recursica/knowledge": minor
---

CircleChat host kit: a new kit release installs only after an approver approves the release in Slack. The approval needs an authenticator code.

- **One post per release.** Each hour, the update job on the cluster's control computer looks for a new kit release. The job posts the release once in the cluster's Slack channel, with the version, the release notes and an "Install" button.
- **One approval for the whole cluster.** "Install" needs an approver and a 6-digit authenticator code, like "Resume". The Slack app sends the approval to the cluster agent on every computer. Each computer installs the release at the next hourly check.
- **Held until approved.** Until an approval, every computer holds the release, and nothing installs. The job posts a reminder once a day.
- **A new major version still asks first.** "Upgrade now" now needs an authenticator code, and counts as the release's approval.
- **A log of each approval.** Each computer logs the release, the approver, the time and the computer in `/var/lib/agent-cluster/release-approvals.log`.

Every other update keeps the same rules. Such updates include images, Ollama, the operating system and the CircleChat fork's commits.

### Upgrading

The update job holds each kit release after this release. To install a release, an approver presses "Install" in the cluster's Slack channel. Each approver needs an authenticator code from `enroll.mjs`.
