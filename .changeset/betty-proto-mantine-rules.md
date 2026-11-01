---
"@recursica/knowledge": patch
---

Betty on CircleChat: a plain request is enough for a prototype in the prototype repository. After her interview and design brief, which stay first, she imports every UI component from `@recursica/adapter-mantine-v8` and never from `@mantine/core`, looks each component up with the knowledge server's `component_api` tool, wraps each page in `<Prototype>` from `../../Prototype` as the demo prototype does, puts each page at `src/routes/prototypes/<slug>/index.tsx`, and writes each file with `write_file`. A prototype there is never pushed and gets no pull request; she checks the page and replies with the preview route first. A page built from `@mantine/core` without the wrapper had looked like stock Mantine. A test checks the built persona.
