---
"@recursica/knowledge": minor
---

CircleChat host kit: `setup-node.sh` warns when a Mac's Docker VM is bigger than its port jobs at their caps (`jobs.slots` × `jobs.memory_gb`) plus 8 GB for the stack's containers. The VM keeps the memory its guest has used, so a bigger VM holds memory the models could use. The setup goes on after the warning. Linux, with Docker on the host, is not checked. The README's new section "The Docker VM's size" gives the steps to shrink the VM in place, and how to check that it kept its disks.
