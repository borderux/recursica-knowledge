# The container one porter job runs in. Built on each job-runner machine by setup-node.sh:
#   docker build -t recursica/porter-job -f circlechat/jobd/porter-job/Dockerfile <knowledge checkout>
# The build context is the knowledge checkout, so the porter-adapter prompt is copied in as built.
#
# Playwright's image already has Node and the browsers adapter-tester drives. Each adapter
# repository still installs its own pinned Playwright, and run.sh lets the porter-adapter run
# `npx playwright install` when the versions differ.
FROM mcr.microsoft.com/playwright:v1.50.1-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends git gh ca-certificates jq \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g @anthropic-ai/claude-code

COPY portable/claude-code/agents/porter-adapter.md /porter/porter-adapter.md
COPY circlechat/jobd/porter-job/run.sh /porter/run.sh

# Claude Code refuses to skip its permission prompts as root, and a job has no one to answer them.
USER pwuser
WORKDIR /work
ENTRYPOINT ["/porter/run.sh"]
