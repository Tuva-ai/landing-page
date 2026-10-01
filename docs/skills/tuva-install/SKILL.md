---
name: tuva-install
description: Install or repair the Tuva CLI (persistent memory and project context for coding agents) on this machine or on a remote HPC cluster, start its daemon, sign the user in, and wire it into Claude Code, Codex, or Cursor over MCP. Use when the user asks to install, set up, onboard, or fix Tuva, or says their agent "can't see tuva".
---

# Install Tuva

Tuva is a small daemon that runs on the user's machine (or on their cluster) and gives
their coding agent a persistent memory of each project through an MCP server called
`tuva-context`. Installing it means: get the `tuva` command, start the daemon, sign in,
initialise the user's project folders, turn on learning from agent sessions, point the
agent at the MCP server, and build the first index. The CLI has a guided `tuva onboard`
command for humans; this skill runs the same steps one at a time so you can verify
each one and recover from the failures seen in real onboardings.

**You do the work.** The user is an intelligent researcher with no software background.
Run every command yourself and ask only for what you cannot detect: their email, which
project folders to include, which agents to wire, and consent for ingesting their
transcripts. Only give the user commands to paste if your shell tool is unavailable or
every command is being denied. Explain what you are doing in one line per phase.

At the start, say once: you will run about a dozen commands, and if their agent asks
for approval, allowing `tuva` and `uv` commands for this session saves clicking through
each one. Never suggest disabling permissions globally.

Work through the phases in order. Every phase ends with a check. Do not move on until
the check passes. When something fails, the documented fixes are a starting point, not
a limit: keep working the problem as described in "When you are stuck", and only hand
off to a human once you have run out of things to try.

## Two routes, keyed on the CLI version

Some steps depend on flags that arrived after `tuva` 0.1.11. After Phase 2, run
`tuva --version` and remember which route you are on:

- **Route A (0.1.11):** the backfill prompt is answered by piping `yes`, and sign-in is
  handed to the user because it needs a terminal.
- **Route B (newer than 0.1.11):** `--yes` on the backfill, two-step sign-in you can
  drive, and `tuva feedback` for the install report.

Anything older than 0.1.11 is upgraded before continuing.

## Before you start

**Ask which of these four you are doing. Do not assume.** The only exception is when the
user's message already says it plainly ("install Tuva on my laptop", "set up Tuva on the
cluster"). Being on a laptop does not mean the install is for the laptop; many users run
their agent locally and want Tuva on their HPC.

1. First install on this machine.
2. First install on a cluster or other remote host (reached over SSH, or the user runs
   their agent on the cluster itself).
3. Repair or upgrade an existing install on this machine.
4. Repair or upgrade an existing install on a cluster.

Ask it as one short question listing the four options, and wait for the answer. If the
answer names a cluster, ask whether you are running on it now or reaching it over SSH,
and read "Remote target mode" at the end of this file before doing anything else. If
the answer is a repair, say what you are about to do before upgrading anything.

## Phase 1: Detect the environment

Run these and record the answers. On Windows use the PowerShell block.

```bash
uname -a; echo "shell=$SHELL"
python3 --version 2>&1; command -v uv && uv --version
command -v tuva && tuva --version
command -v module && module avail tuva 2>&1 | head
echo "SLURM_JOB_ID=$SLURM_JOB_ID PBS_JOBID=$PBS_JOBID"
```

```powershell
$PSVersionTable.PSVersion; python --version; Get-Command uv, tuva -ErrorAction SilentlyContinue
```

Then decide the install path. Only one applies.

- **Path A, pip install.** Default for laptops, workstations, and cluster login nodes
  that allow pip and have internet. Needs Python 3.10 or newer (uv can install one) and
  outbound network on first start.
- **Path B, cluster module.** If `module avail tuva` lists a module, the cluster admin
  has already packaged Tuva for this cluster. Use it and skip Path A entirely.

If the user says their cluster forbids pip installs or requires containers, and there
is no module, there is no supported install today. Do not try to work around it. Go
straight to "When you are stuck" and tell the user which cluster it is.

**If `tuva` is already installed on the target, this is a repair.** If the user said
"first install" and you find one anyway, say so and confirm before continuing; they may
be on the wrong machine. For a repair, upgrade first and say so, then continue through
every phase; each one is safe to re-run:

```bash
uv tool upgrade tuva && tuva --version
```

## Phase 2: Install

### Path A: pip install with uv

Install uv if missing, then put it on PATH **in the current shell**. Do not tell the
user to open a new terminal or re-SSH; that is the single most common complaint on
clusters.

```bash
command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
uv --version
```

Then install the CLI as a uv tool. The CLI works on Python 3.10 or newer, and the
daemon provisions its own Python 3.12 environment on first start, so nothing needs
pinning here:

```bash
uv tool install tuva
export PATH="$HOME/.local/bin:$PATH"
tuva --version
```

On Windows the same command works in PowerShell. Never use plain `pip install tuva`
on Windows: it leaves `tuva` off PATH so every command needs `python -m tuva.cli`, and
it does not install uv, which the daemon needs.

Make PATH persist: append `export PATH="$HOME/.local/bin:$PATH"` to the user's shell rc
file (`~/.zshrc` or `~/.bashrc`; on Windows, the PowerShell `$PROFILE`) if it is not
already there, and tell the user in one line what you added and where.

Check: `tuva --version` prints a version, and it is 0.1.11 or newer. If it is older,
`uv tool upgrade tuva`. Note which route you are on (see "Two routes").

### Path B: cluster module

```bash
module load tuva
tuva --version
```

Add `module load tuva` to the user's shell rc so it persists, and say so. On a Slurm
cluster, run Phase 3 onward **inside an allocation on a compute node** (`srun --pty
bash` or an interactive job), not on the login node; the daemon scopes its state per
node and job automatically. Everything from Phase 3 onward is otherwise identical.

### Install failures we have seen

- **`uv: command not found` right after installing it.** PATH in this shell does not
  include `~/.local/bin`. Export it as above. Do not ask the user to reconnect.
- **Build error mentioning Rust, cargo, or `libcst`.** The cluster has no compiler and
  pip tried to build from source, usually because the system Python is a version with
  no prebuilt wheels. Retry with `uv tool install --python 3.12 tuva`, which makes uv
  fetch its own Python. If it still builds from source, escalate; there is no supported
  install for this cluster yet.
- **`pip` or PyPI blocked, connection refused, or a firewall page.** Check for a
  required HTTP proxy in the user's environment (`env | grep -i proxy`) and retry with
  it set. If PyPI is still unreachable, escalate. If the CLI installed but
  `tuva doctor --json` shows only the Tuva proxy unreachable, see Phase 3.
- **Python older than 3.10.** `uv python install 3.12` then install as above; uv will
  use it without touching the system Python.
- **Windows: "invalid end of line" or errors pointing at `||`.** A bash one-liner was
  pasted into PowerShell. Use the PowerShell block.
- **Windows: `tuva` not recognised after install.** Either PATH is missing
  `%USERPROFILE%\.local\bin` in this window, or it was installed with pip rather than
  `uv tool install`. Reinstall with uv.

## Phase 3: Start the daemon and run doctor

```bash
tuva start
tuva status
tuva doctor --json
```

The **first** `tuva start` provisions a private virtual environment for the backend.
On a laptop this takes about a minute; on a cluster with slow package downloads it can
take several. Do not kill it and do not start a second one. If it seems stuck, run
`tuva logs -n 50` in parallel to watch progress. On Path B the environment is already
baked into the module, so start is fast.

Check: `tuva status` reports the daemon running with both backend ports healthy, and
`tuva doctor` has no `FAIL` lines you have not handled.

Read the doctor report like this:

- **Ignore.** A red `HTTPX` or "missing dependency" warning after onboard, a `tmpdir`
  failure on Windows, and a `WARN` on `egress:pypi` when everything else passes. These
  are known cosmetic issues; do not chase them.
- **`fs:*` shows a SQLite journal mode other than `wal`.** The state or data directory
  is on a network filesystem that cannot do write-ahead logging, and the daemon will
  misbehave. Point state at local disk and restart:
  `export XDG_STATE_HOME=/local/scratch/$USER/tuva-state` (use whatever local or
  scratch path the cluster provides), add it to the rc file, then `tuva restart`.
- **`creds:persistence` fails.** Credentials would be written somewhere that does not
  survive the job. Set `XDG_CONFIG_HOME` to a path under the user's persistent home.
- **`egress:supabase` or `egress:llm-proxy` unreachable.** Sign-in and chat will not
  work. Look for a proxy variable the cluster expects; if the user is on a VPN, note
  that VPNs have caused sign-in loading problems and suggest trying without it.
- **`uv` not found.** Only matters on Path A; the daemon needs it to provision its
  environment. Fix per Phase 2. A `python` warning about the CLI's own version is
  fine as long as it is 3.10 or newer.
- **`scheduler` warns "not in a batch job".** On a cluster this means you are on the
  login node. Move to a compute node for Path B; for Path A on a login node it is fine.
- **`harnesses` is INFO "not checked".** Normal before the daemon is up; ignore. Once
  the daemon is up, this section lists the coding agents detected on the machine; you
  will use it in Phase 7.

If `tuva start` fails with "daemon not running" or "backend not found", read
`tuva logs -n 200` before anything else: the usual causes are uv missing from PATH in
the shell that started the daemon, a package download that timed out, or a stale
daemon from an earlier attempt. Fix the cause, then `tuva stop` and `tuva start`
again. Launch the backend only through `tuva start`, never by hand.

## Phase 4: Sign in

Sign-in is an email one-time code. Ask the user for the email address they use with
Tuva and confirm it back in one line. Then:

**Route B (newer than 0.1.11):** send the code, ask the user to read it to you from
their inbox, and verify it. The code is single-use and expires in minutes.

```bash
tuva auth login --email "<email>" --no-prompt      # sends the code and exits
tuva auth verify --email "<email>" --code "<code>"
```

**Route A (0.1.11):** the command prompts for the code in a terminal you do not have.
Ask the user to run this in their own terminal on the machine where Tuva is installed
and type the code when asked:

```bash
tuva auth login
```

Then verify on either route:

```bash
tuva auth whoami
```

Check: `whoami` prints the user's email.

If the code never arrives, tell the user the three reasons we have seen, in order of
likelihood: the email went to spam; Tuva's mail provider rate-limits sign-in emails, so
wait ten minutes before requesting another rather than requesting several; or their
address is not yet on the alpha access list, in which case they should email
hello@tuva.ai with the address they used. If verification rejects a correct code,
retry once with a fresh code, then escalate.

## Phase 5: Initialise projects

Tuva's memory is per project, and it only knows which agent sessions belong to which
project once the project is initialised. Skipping this is why users have seen "0
sessions found".

**Route B (newer than 0.1.11):** ask Tuva which folders on this machine already have
agent sessions, and propose those:

```bash
tuva memory agent-sessions --list-projects --json
```

Show the user the list (folder, session count, last activity) and ask which to include,
defaulting to all of them that look like real projects. Entries with `"ready": false`
have no `.entropy/` yet, which is exactly why past sessions there were never counted;
`tuva init` below fixes that.

**Route A (0.1.11):** propose the current directory as the first project and ask, in
one line, whether there are other folders they work in with their agent.

Then, for each project:

```bash
cd /path/to/project && tuva init
```

Check: each `tuva init` prints the project title and id, or "already initialized".

## Phase 6: Enable learning from agent sessions

Before enabling, tell the user in one sentence what this does and get a yes: their past
Claude Code and Codex transcripts for these projects, going back 60 days, become part
of each project's memory and are sent to the model that writes memory summaries. If
they decline, skip this phase and note it in the final report.

Enabling is global; the backfill runs per project, so run it once per project:

```bash
# Route B
tuva memory agent-sessions --enable --yes -w /path/to/project

# Route A (0.1.11): the command asks "Continue?" and there is no terminal to answer
yes | tuva memory agent-sessions --enable -w /path/to/project
```

Check: the command reports ingestion enabled and how many sessions it found. Zero
sessions for a project the user actively works in means Phase 5 was skipped for that
folder.

## Phase 7: Wire the agents

Build the list of agents to offer: the ones `tuva doctor --json` detected under
`harnesses` (Claude Code, Codex), plus Cursor if `~/.cursor` exists. Show the list and
ask the user which to enable, defaulting to all of them. Never wire an agent nobody
asked for.

For each chosen agent:

```bash
tuva mcp configure claude     # or codex, or cursor
```

This writes a `tuva-context` entry into that agent's own config file
(`~/.claude.json`, `~/.codex/config.toml`, or `~/.cursor/mcp.json`). It must run on the
machine where that agent runs.

Check, per agent: `claude mcp list` or `codex mcp list` shows `tuva-context`; for
Cursor, confirm the entry exists in `~/.cursor/mcp.json`.

## Phase 8: Build the first index

For each project:

```bash
tuva index /path/to/project
```

Then show the user what Tuva has learned about their main project:

```bash
tuva memory graph -w /path/to/main/project
```

Relay the graph output in a couple of sentences. If it is sparse, say that it fills in
as they work; do not apologise for it.

## Phase 9: Report and offer an install report

Tell the user these are done, and only claim what you verified:

- `tuva --version` prints a version in a fresh shell (PATH persisted).
- `tuva status` shows the daemon running.
- `tuva doctor` has no unhandled FAIL lines.
- `tuva auth whoami` prints their email.
- Each project directory is initialised and indexed.
- Session ingestion is enabled (or the user declined).
- Each chosen agent's config lists `tuva-context`.

Tell the user to **start a new agent session** for the tools to appear; an existing
session will not pick them up. If Claude Code refuses to start in the project folder or
asks about trusting the folder, that is Claude Code's own folder-trust prompt: the user
should accept it once, then re-open.

Then offer, in one line, to send Tuva a short install report so the team learns which
platforms and clusters work. If the user says yes:

```bash
# Route B
tuva feedback --category general --comment "install ok" \
  --metadata-json '{"install_report":true,"platform":"<os>","cluster":<true|false>,"path":"<A|B>","version":"<tuva version>"}'
```

On Route A, or if the install did not complete, offer to draft an email to
hello@tuva.ai with the same facts instead. A failed install goes as `--category bug`
with the phase reached and `tuva doctor --json` included.

## Remote target mode

When Tuva is going onto a host you reach over SSH:

- Prefix every command with `ssh <host> '...'`, and remember that each SSH call is a
  fresh shell: re-export PATH and any `TUVA_*` or `XDG_*` variables in every call, or
  write them into the remote rc file first and rely on that.
- The agent being wired in Phase 7 is the one the user runs **on the cluster**, so
  `tuva mcp configure` runs over SSH and writes the cluster's config file. Wiring the
  agent on the laptop would point it at a daemon it cannot reach.
- On Route B every phase runs from here over SSH, including sign-in: send the code over
  SSH, get it from the user in chat, verify over SSH.
- On Route A, sign-in still needs a terminal on the cluster. Hand the user the exact
  `tuva auth login` command to run in an SSH session of their own, wait for them, then
  continue over SSH.
- If SSH prompts for a password, a one-time code, or Duo on every connection, you will
  not be able to script it. Say so plainly and give the user the command list instead.
- Never copy credentials between the two machines.

## When you are stuck

Your job is to get the user to a working Tuva. When a step fails, work the problem:
read the error, check `tuva logs`, re-run `tuva doctor --json`, look at what changed
between the last working command and this one, and try the documented fixes and any
reasonable variation of them. Fixing PATH, picking a different Python, moving state to
local disk, setting a proxy variable, and retrying a flaky download are all fair game.
Two things are off limits: launching the backend by hand instead of through `tuva
start`, and editing the agent's MCP config by hand instead of through `tuva mcp
configure`, because both leave the user with a setup the CLI cannot repair later.

Escalate only as a last resort, when you have genuinely run out of things to try or
the blocker is outside your reach (a cluster policy, an account not on the alpha
list, a network you cannot change). Collect the following and ask the user to email
it to hello@tuva.ai with one sentence about what they were doing:

```bash
tuva --version
tuva doctor --json
tuva status --json
tuva logs -n 200
```

Include the operating system, whether this is a cluster, and which install path you
used. Then tell the user what does work so far (for example, the CLI is installed and
the daemon runs, but sign-in is blocked) so they are not left with nothing.
