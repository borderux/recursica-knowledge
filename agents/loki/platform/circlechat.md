<!--
Platform fragments for Loki on CircleChat, running on the Hermes Agent runtime.

Loki's instructions name no platform, because Loki runs on several, so this file's one fragment,
"languages", is empty: only RecursicaChat 2.0's harness writes interviews in a language other than
English. CircleChat builds Loki's persona from SKILL.md alone. Loki's settings on CircleChat are
in ../runtime/hermes.md.

An earlier version told Loki, step by step, to write each file with `write_file`, check the file,
and attach the file with a `share_to_task` action. On gpt-oss that procedure failed: Loki wrote the
tool calls as action entries, called a tool that does not exist, and never wrote a file. See
../runtime/hermes.md.
-->

## languages
