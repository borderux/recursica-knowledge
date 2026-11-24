---
"@recursica/knowledge": patch
---

CircleChat kit: the update job never refuses the kit checkout after the job's own update. The cluster's channel also hears about each refusal.

- **git with umask 022.** On Ubuntu, sudo's session can set umask 002, so a fast-forward by the update job left group-writable files. The next hour, the kit check refused the checkout, and each later hour refused the checkout too. Each of the job's git commands now runs with umask 022.
- **No group or other write after a fast-forward.** After each fast-forward, the job runs `chmod -R go-w` on the checkout as the owner.
- **A post for each refusal.** Before, the job stopped on a refused checkout without a post. Now the cluster's channel hears the reason and the command that fixes the checkout. The job posts from the job's own file, and loads no other module from the refused checkout.
- **Each post about a wait or a refusal repeats after 24 hours.** The rule covers five posts:
  - a refusal
  - a stop
  - an update that waits until RecursicaChat is quiet
  - held network changes
  - waiting image pins

  Each post goes out once. The post repeats for a new reason, or 24 hours after the last post.

Two more kit check refusals now name the command that fixes the problem. One refusal is for a file another account owns. The other is for a folder above the checkout.
