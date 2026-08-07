# The message to send a new operator

Everything below the line is written **to** the new person, in plain language, ready to copy
and paste. Nothing above the line is.

Edit it here rather than rewriting it in chat each time — that is the whole point of it being
a file. [ONBOARD_AN_OPERATOR.md](ONBOARD_AN_OPERATOR.md) is the other half: what you send out
of band, what you must never send, and how to revoke access later. Read that first.

**Fill in before sending:**

| Placeholder                              | With                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `claire-acme-service-user.json`          | The real key filename for the client they are joining. It is the account's own name, which is **not** always `claire-<slug>-service-user` — check `client_email` first, and see ONBOARD_AN_OPERATOR.md |
| `Sam`                                    | Their first name, in the two example agent names                           |
| the channel name                         | Say which channel, by name, in step 3                                      |

Substitute the real values as you send. **Do not commit them back into this file** — this is
a public repo, and a client's key filename names the client.

Do not paste the service-account key into the message. It travels out of band, separately,
and the text below already says so.

---

Welcome aboard. You will run your own set of four agents on your own Mac. Budget about 20
minutes. **You need a Mac** — there is no Windows or Linux version.

Your agents are yours: they run on your machine, they are awake when it is, and they spend
your own AI budget, not mine.

### Step 1 — Check what you already have

Two of the three things you need may already be on your Mac. Open **Terminal** and paste this,
then press Return:

```
node --version 2>/dev/null || echo "NODE — MISSING, install it"; claude --version 2>/dev/null || echo "CLAUDE CODE — MISSING, install it"
```

Two lines come back. A version number like `v24.18.0` means that one is already installed and
you can skip it below. `MISSING` means you need it.

- **Node** — https://nodejs.org (take the "LTS" one)
- **Claude Code** — https://claude.com/claude-code

Then, whether or not it was already there:

- **Buzz Desktop** — https://buzz.xyz/

Finally, type `claude` in Terminal and sign in when it asks. If that works, you are set — that
is the only account setup needed. You are signing into your own account and spending your own
budget.

### Step 2 — The one file I send you separately

I will send you a file called `claire-acme-service-user.json` through a password manager
— **not** over chat. It is the key to the client's research data, so treat it like a password.
**Never paste its contents into a message**, including to an agent.

Once it is in your Downloads folder, paste this one line into Terminal and press Return:

```
mkdir -p ~/.buzz/.secrets && chmod 700 ~/.buzz/.secrets && mv ~/Downloads/claire-acme-service-user.json ~/.buzz/.secrets/ && chmod 600 ~/.buzz/.secrets/claire-acme-service-user.json && ls -l ~/.buzz/.secrets/
```

That makes the folder, moves the key in, and locks it down so only you can read it. You should
see one line ending in the file name and starting with `-rw-------`. That means it worked.

**If it says `No such file or directory`,** the file is somewhere other than Downloads. Type
`mv ` (with a space after it), then drag the file from Finder straight into the Terminal window
— that fills in the real location for you — then type ` ~/.buzz/.secrets/` and press Return.

The `.buzz` folder is invisible in Finder because its name starts with a dot. That is normal
and nothing is wrong. To see it, press **Cmd-Shift-.** in any Finder window.

### Step 3 — Add your Fizz to the channel

I will add you to the client channel. **You then add your own Fizz to that same channel.** She
is the assistant that comes with Buzz Desktop, and she does the whole setup for you. She cannot
see a private channel she is not a member of, so this step is not optional — and my being in it
does not cover her.

### Step 4 — Ask her to do it, and read this bit twice

> **This only works if the message actually mentions her.** Buzz agents do not read the room —
> a message that does not mention Fizz never reaches her, and nothing happens. No error, no
> reply. This is the single most common way people get stuck, and it looks exactly like the
> setup being broken.

So, in the channel:

1. Type the `@` character. A list of names pops up.
2. **Click your own Fizz in that list.** Her name has your name in brackets — `Fizz (Sam)`, not
   plain `Fizz`. Do not type or paste her name by hand; picking her from the list is what turns
   it into a real mention.
3. Then paste the rest of this after her name:

```
deploy the buzz agents: clone https://github.com/borderux/recursica-knowledge into ~/.buzz/REPOS/ and follow nest/.claude/skills/deploy-agents/SKILL.md
```

4. Before you send, check her name is **highlighted** rather than plain text.

It is a long line on purpose — the instructions she needs live inside that project, and on a
fresh install she cannot find them otherwise. After this first time, mentioning her plus
"deploy the agents" is enough.

#### How to tell she got it: watch for 👀

Within a few seconds she adds an **eyes emoji** to your message. That is the signal she
received it and is working — it is not a reply.

**The whole setup takes several minutes, so do not wait for a message.** She has a lot to do:
download things, install, run checks. The eyes are your confirmation; the message comes at the
end. The reaction clears once she has finished her turn.

**No eyes emoji at all means she never got it.** That is the mention not registering, not a
broken install. Send it again, typing the `@` and picking her from the list.

### Step 5 — The parts only you can do

5. **She will ask for your first name.** It goes in the agent names, so yours end up as
   `Claire (Sam)`, `Stu (Sam)` and so on. Several of us run our own Claire in the same room,
   and this is how anyone tells which is which.

6. **Four approval windows appear in Buzz Desktop.** Read each and click save. Nobody can do
   this for you — it is the deliberate checkpoint where a person reads an agent's instructions
   before it starts talking to people.

7. **Quit Buzz Desktop completely and reopen it.** Your agents load their tools only at
   startup, so until you do this they will look broken. This one catches everyone.

8. Check it worked — same mention rule, type `@` and pick Claire from the list:

```
what is in the dataset right now?
```

### Three things that look like problems and are not

- **A long silence after the eyes emoji** is the work happening. Minutes are normal.
- **Janice going quiet is good news.** She reviews the other agents' work and only speaks up
  when something is wrong. Silence means she found nothing.
- **A hidden `.buzz` folder you cannot see in Finder** is correct, not a failed install.

Anything unexpected, send me what you saw rather than trying to fix it — most of it is one
command on my end.
