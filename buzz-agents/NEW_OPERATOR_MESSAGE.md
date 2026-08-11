# The message to send a new operator

Everything below the line is written **to** the new person, in plain language, ready to copy
and paste. Nothing above the line is.

Edit it here rather than rewriting it in chat each time — that is the whole point of it being
a file. [ONBOARD_AN_OPERATOR.md](ONBOARD_AN_OPERATOR.md) is the other half: what you send out
of band, what you must never send, and how to revoke access later. Read that first.

**Nothing to fill in. Send it as it stands.**

That is deliberate, and it is the second thing this file is for. Every value that differs per
person — which client, which channel, what the key file is called — is now something the new
operator **asks you for**, in the channel, once they are in it. Nothing client-specific travels
in the forwarded message.

Three reasons it is built that way:

1. **A client's key filename names the client.** Substituting it put a client name into a chat
   message, and from there into anything anyone pasted onward. Removing the substitution
   removes the whole path.
2. **The filename was the easiest thing to get wrong, and it is not predictable.** A service
   account keeps whatever name it was created with, and a key downloaded straight from Google
   is named after the project and key id — `someproject-1a2b3c4d.json` — which says nothing
   about which identity it holds. So the steps below never mention a filename: the reader
   drags whatever file they were sent, and **you** confirm it is the right identity in the
   channel afterwards, by its `client_email` rather than its name.
3. **One channel is one client.** Which channel a person joins depends on the work, so a
   pre-filled channel name is wrong for everyone except the first reader.

`Sam` appears twice below as an **example** of how agent names come out. It is illustrative,
not a blank — leave it alone.

Still send out of band and never in the message: the key file itself. The text below says so
too.

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

I will send you a **key file** — a `.json` — through a password manager, **not** over chat. It
is the key to one client's research data, so treat it like a password. **Never paste its
contents into a message**, including to an agent.

Its name varies. Some are named after the account, some come straight out of Google with a
name like `someproject-1a2b3c4d.json`. **The name does not tell you whether it is the right
key**, so do not try to read anything into it — I will confirm that with you in the channel
afterwards. These three steps work whatever it is called.

**Do these in Terminal yourself rather than asking an agent to do them.** You want to see the
output with your own eyes; an agent will summarise it, and the summary is the thing you are
trying to check.

**1.** Make the folder. Paste this and press Return:

```
mkdir -p ~/.buzz/.secrets && chmod 700 ~/.buzz/.secrets
```

**2.** Move the key in. Type `mv ` — the two letters and a space — then **drag the key file
from Finder straight into the Terminal window**. That fills in its real location for you,
whatever it is called and wherever it is. Then type a space, then ` ~/.buzz/.secrets/` and
press Return.

**3.** Lock it down and look at it:

```
chmod 600 ~/.buzz/.secrets/*.json && ls -l ~/.buzz/.secrets/
```

You should see one line for your key, starting with `-rw-------`. That is the whole check: the
dashes mean nobody but you can read it. If it starts with anything else, tell me before going
further.

If instead you get `no matches found` or `No such file or directory`, the key never arrived and
step 2 did not take — nothing is broken, and the file is still wherever it was. Do step 2 again,
and this time **drag** the file in rather than typing its name.

The `.buzz` folder is invisible in Finder because its name starts with a dot. That is normal
and nothing is wrong. To see it, press **Cmd-Shift-.** in any Finder window.

### Step 3 — Add your Fizz to the channel

I will add you to a client channel and tell you which one — there is more than one, each is a
different client, and which you get depends on the work you are joining. If you are not sure
which channel is yours, ask me rather than guessing; joining the wrong one is a client-data
problem, not an inconvenience.

**You then add your own Fizz to that same channel.** She is the assistant that comes with Buzz
Desktop, and she does the whole setup for you. She cannot see a private channel she is not a
member of, so this step is not optional — and my being in it does not cover her.

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
