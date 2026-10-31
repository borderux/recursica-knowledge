---
"@recursica/knowledge": minor
---

CircleChat host kit: cloud-model requests in Slack. In CircleChat, a person who is not an approver asks to move a task off "Cluster only". An approver answers the request in the stack's Slack channel.

- **`cloud_approvers` in site.json.** Each entry holds the person's CircleChat email and Slack user ID.
- **A receiver on the stack's own network.** `cc-cloud-requests` takes CircleChat's request webhook and checks the webhook's signature. The receiver then posts the request in the stack's channel, with an Approve and a Deny button. The post mentions each approver. The receiver has no published port.
- **Only a cloud approver presses either button.** "Approve" needs the person's authenticator code, like "Resume". "Deny" needs no code. The cluster agent on the stack's control computer checks the person again. The agent then calls CircleChat's answer API with the service token and the approver's email. The Slack app replies in the thread with the result.
- **Two secrets in root-only files.** `setup-host.sh` makes `CLOUD_APPROVAL_TOKEN` and `CLOUD_REQUEST_WEBHOOK_SECRET` once, in `cloud-approvals/` in the stack's folder. CircleChat's api reads both from the files, and gets `CLOUD_APPROVERS` and `CLOUD_REQUEST_WEBHOOK_URL`.

A stack with no `cloud_approvers` keeps working as before. The requests need the CircleChat fork's cloud-model requests.

### Upgrading

1. Add `cloud_approvers` and `site.slack_channel_id` to the stack's site.json.
2. Enroll each approver who is not on `APPROVERS`: `node circlechat/cluster/enroll.mjs <slack user id, lowercase>`. Save each secret as `TOTP_SECRET_<SLACK USER ID>`, and deploy the cluster's secrets.
3. Rerun `setup-host.sh` in a terminal, so the setup can make the two secret files.
