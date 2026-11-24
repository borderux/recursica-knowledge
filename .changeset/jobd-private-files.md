---
"@recursica/knowledge": patch
---

CircleChat host kit: a job's container can no longer change jobd's files, or reach a file outside the job. jobd mounted the job's whole folder as the container's `/work`, with mode 777, and kept jobd's own files in that folder. jobd then wrote `job.log` and read `report.md` through any link the job left there. On Linux, the container's user can have the owner's account number. The container could then change jobd's files directly.

- **Each job has two folders.** `<job>/`, mode 700, holds `meta.json`, `gateway.env` and `job.log`. `<job>/work/` is the container's `/work`, with `package.md` and `report.md`.
- **jobd never follows a link in a job's folder.** jobd opens `report.md` and `meta.json` with `O_NOFOLLOW`, and writes each file as a new file that replaces the old name. A named pipe counts as no report.
- **A report has a size cap.** `GET /jobs/:id/report` answers 413 for a report over 1 MB (`JOBD_REPORT_MAX_BYTES`).
- **A job that an older jobd started still ends cleanly.** jobd reads and writes that job's single folder without following a link. A restart after an interruption gives the job a work folder. The job's repository must still be on the allowlist.

The change holds on Linux and macOS. `jobd.files.test.mjs` checks four cases:

- A link at `job.log` or `report.md` is never followed.
- A `meta.json` in the work folder changes nothing.
- A report over the size cap gets a 413 answer.
- A named pipe at `report.md` never blocks jobd.
