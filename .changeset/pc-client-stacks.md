---
"@recursica/knowledge": minor
---

CircleChat host kit: client stacks run on Linux and in WSL with the same isolation as on a Mac. Each stack gets its own Colima VM, with QEMU and KVM, and its own LUKS image file with the client's key. The Unlock stack workflow opens and closes the image. `setup-pc.sh` prepares the computer, and `isolation-check.sh` prints the isolation table.

On every computer, the client's Docker VM now lives inside the disk image, including the disk that holds the containers and volumes. The VM mounts only the stack's folder, and never becomes the current Docker context.
