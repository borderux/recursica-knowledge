// Agent controls in Slack, for each stack on this computer:
//
//   - Each approval waiting in CircleChat (an action held by the approval gate) gets one post in
//     the stack's channel, so no agent waits unnoticed.
//   - A controls message lists the stack's agents with "Stop <agent>", "Stop all agents" and the
//     matching "Resume" buttons. Stop pauses the agent in CircleChat (the same pause as
//     CircleChat's own button) and ends any turn in progress. Resume needs an authenticator code.
//     The message is posted again whenever the stack's agents change.
import fs from "node:fs";

const SAFE = /^[a-z0-9][a-z0-9_-]*$/;

export function controlBlocks(stack, computer, agents) {
  const btn = (action, label, handle, style) => ({ type: "button", action_id: `${action}:${handle}`, text: { type: "plain_text", text: label },
    value: JSON.stringify({ c: computer, r: `${stack}|${handle}` }), ...(style ? { style } : {}) });
  const rows = [];
  for (let i = 0; i < agents.length; i += 5) rows.push({ type: "actions", elements: agents.slice(i, i + 5).map((a) => btn("agents-stop", `Stop ${a.name}`, a.handle, "danger")) });
  return [
    { type: "section", text: { type: "mrkdwn", text: `*Agent controls for stack ${stack}.* "Stop" pauses the agent and ends a turn in progress. "Resume" needs an authenticator code.` } },
    ...rows,
    { type: "actions", elements: [btn("agents-stop", "Stop all agents", "*", "danger"), btn("agents-resume", "Resume all agents", "*")] },
  ];
}

export class AgentControls {
  // stacks: () => [{ name, channel, hermesHomes }]; sql(stack, query) -> rows of tab-separated
  // fields; docker(stack, args) -> stdout; post(channel, text, blocks?)
  constructor({ stacks, sql, docker, post, stateFile, computer }) {
    Object.assign(this, { stacks, sql, docker, post, stateFile, computer });
  }
  read() { try { return JSON.parse(fs.readFileSync(this.stateFile, "utf8")); } catch { return { approvals: {}, agents: {} }; } }
  write(s) { fs.writeFileSync(this.stateFile, JSON.stringify(s), { mode: 0o600 }); }

  async tick() {
    const s = this.read();
    for (const st of await this.stacks()) {
      const pending = await this.sql(st, "select a.id, g.handle, a.action, a.scope from approvals a join agents g on g.id = a.agent_id where a.status = 'pending' order by a.created_at");
      for (const [id, handle, action, scope] of pending) {
        if (s.approvals[id]) continue;
        s.approvals[id] = Date.now();
        await this.post(st.channel, `:hourglass_flowing_sand: ${handle} on stack ${st.name} waits for approval: \`${action}\` (${scope}). Decide in CircleChat's approvals.`);
      }
      const agents = (await this.sql(st, "select handle, name from agents order by handle")).map(([handle, name]) => ({ handle, name }));
      const key = agents.map((a) => a.handle).join(",");
      if (agents.length && s.agents[st.name] !== key) {
        s.agents[st.name] = key;
        await this.post(st.channel, `Agent controls for stack ${st.name}`, controlBlocks(st.name, this.computer, agents));
      }
    }
    this.write(s);
  }

  async find(ref) {
    const [stack, handle] = String(ref).split("|");
    const st = (await this.stacks()).find((x) => x.name === stack);
    if (!st || !(handle === "*" || SAFE.test(handle ?? ""))) return {};
    return { st, handle };
  }

  async stop(ref, by) {
    const { st, handle } = await this.find(ref);
    if (!st) return { ok: false, message: "no such stack or agent on this computer" };
    const where = handle === "*" ? "" : ` and handle = '${handle}'`;
    await this.sql(st, `update agents set status = 'paused', pause_reason = 'manual' where status <> 'paused'${where}`);
    // End each turn in progress: the agent's container mounts the agent's home.
    const ids = (await this.docker(st, ["ps", "-q"])).split("\n").filter(Boolean);
    let ended = 0;
    for (const id of ids) {
      const mounts = await this.docker(st, ["inspect", "-f", "{{range .Mounts}}{{.Source}} {{end}}", id]);
      const hit = handle === "*" ? mounts.includes(`${st.hermesHomes}/.hermes-`) : mounts.includes(`${st.hermesHomes}/.hermes-${handle} `) || mounts.endsWith(`${st.hermesHomes}/.hermes-${handle}`);
      if (hit) { await this.docker(st, ["kill", id]); ended++; }
    }
    return { ok: true, message: `${handle === "*" ? "every agent" : handle} on stack ${st.name} paused by ${by}; ${ended} turn(s) in progress ended` };
  }

  async resume(ref, by) {
    const { st, handle } = await this.find(ref);
    if (!st) return { ok: false, message: "no such stack or agent on this computer" };
    const where = handle === "*" ? "" : ` and handle = '${handle}'`;
    await this.sql(st, `update agents set status = 'active', pause_reason = null where status = 'paused' and pause_reason = 'manual'${where}`);
    return { ok: true, message: `${handle === "*" ? "every agent" : handle} on stack ${st.name} resumed by ${by}` };
  }
}
