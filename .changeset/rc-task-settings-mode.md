---
"@recursica/knowledge": patch
---

RecursicaChat 2.0 server kit: `recursicachat/install.sh` installs `/etc/recursicachat/task-settings.json` as `root:_recursicachat`, mode 440, the same as `gateway.key`. Before, the file was `root:wheel`, mode 644, so every account could read the file once the folder let them in. Only the server's account reads the task settings.

The check that skips an unchanged file now compares the owner, the group and the mode as well as the text, for both files. A file with the right text and a wrong mode is installed again, so the next `sudo circlechat/recursicachat/install.sh` puts a 644 file right. Before, the check compared only the text, and a wrong mode stayed until the text changed.
