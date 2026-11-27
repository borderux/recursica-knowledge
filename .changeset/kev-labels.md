---
"@recursica/knowledge": minor
---

CircleChat host kit: every real design review feeds Kev, and no eval run ever can. The review harnesses' Kev labels go to the private notes repo, for a person to review, beside Barb's notes.

- **`kev_labels` in a `recursicachat.services` entry** names the folder where that review harness writes its Kev labels, one JSON line each (Kev labels, version 1). The config check takes a full path only, on the cluster's own stack with `data.repo` set, outside the server's folders, the entry's `state`, another entry's folder, and every checkout and stack folder.
- **The hourly push gathers every `*.jsonl` file in every label folder** and merges the new lines into `kev-labels.jsonl` on its notes branch: main's file, then each new line once, in order, so a person's later decision stays after the earlier line. The visibility check before each push, the single pull request and the bot identity stay as they were.
- **The push refuses a folder** that is a symlink, belongs to another account than the entry's, is writable by its group or others, or sits in a git checkout, **and a file** that is a symlink, has a second hard link, belongs to another account or is writable by its group or others. One line names each refused path. Nothing from it is pushed, the rest still is, and the job exits 1.
- **A file with any eval label, or any line that isn't a label, is refused whole,** with the file's name and the count of such lines.
- **The nightly pull writes `$CC_DIR/kev-reviewed/kev-labels.jsonl`** from the repo's `main` branch only, keeps only the labels with `"run": "review"`, and prints the count it dropped. So an eval label can't reach training, even if a person merged one.

### Upgrading

1. Have each review harness's installer make its label folder: the service's account, the group `staff`, mode 0750, each file 0640.
2. Add `kev_labels` to the harness's entry in `recursicachat.services`, and rerun `setup-host.sh`.
