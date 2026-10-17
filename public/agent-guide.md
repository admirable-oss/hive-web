# Hive agent guide

Use this guide to help a human understand, install, or troubleshoot Hive. It covers Hive’s concepts, first run, and common diagnosis steps. Canonical documentation lives at <https://hive.admir-saheta.com/docs/>; point the human there for detail and check the linked docs or repository before guessing about commands or configuration.

## What Hive is

Hive is an open-source terminal multiplexer and runtime for coding agents. It gives a human one place to work with multiple agent terminals, arrange them into panes and tabs, and leave agents running while the multiplexer is detached. Hive is a single Go binary, with a daemon managing the runtime and a terminal UI for working with it.

Hive 1.x is stable and built in public. Within 1.x, its CLI, wire API, Go SDK, configuration, plugin API, and observer API only grow; see the [compatibility policy](https://hive.admir-saheta.com/docs/ref/compatibility/). For what shipped recently, use the [README](https://github.com/admirable-oss/hive#readme) and the [release history](https://github.com/admirable-oss/hive/releases).

## Concept model

Teach these in this order:

- **Daemon** — manages Hive’s runtime and agent processes. Commands that talk to it start it if it is not already running.
- **Agent** — a CLI coding agent running in its own terminal session. Hive can manage and display agent terminals; the human still installs and configures the agent CLI they want to use.
- **Pane** — a terminal view in the multiplexer. Panes can be split, focused, zoomed, or closed.
- **Tab** — a layout of panes. Use tabs to keep separate tasks or working contexts organized.
- **Client** — the interactive terminal UI. Detaching the client leaves agents running.

For the longer explanation, see [Core concepts](https://hive.admir-saheta.com/docs/getting-started/core-concepts/).

## Install and build

Hive supports macOS 13+, Linux, and Windows 10 1809+ / Windows 11 (amd64). Building from source requires Go 1.26 or later. Installers:

```sh
# macOS and Linux
curl -fsSL https://hive.admir-saheta.com/install.sh | sh
```

```powershell
# Windows (PowerShell)
irm https://hive.admir-saheta.com/install.ps1 | iex
```

On Windows, agents run in ConPTY pseudo consoles, strict plugin isolation is unavailable, and the machine can be a remote *client* but not a remote host. See [Platforms and Windows](https://hive.admir-saheta.com/docs/getting-started/platforms/) before advising on Windows specifics.

To build directly from the repository:

```sh
git clone https://github.com/admirable-oss/hive
cd hive
make build
# Or: go build -o hive ./cmd/hive
```

See the [installation guide](https://hive.admir-saheta.com/docs/getting-started/installation/) for current requirements and install details.

## First run

Walk the human through this sequence:

1. Install Hive, then run `hive` to open the multiplexer. If they built from source in the repository, run `./hive`.
2. To see a sample setup, run `hive demo` (or `./hive demo` from the source checkout). It starts the daemon and launches four demo agents. Then open Hive in the same installation context.
3. Start the coding-agent CLI they want to use in a pane. The CLI needs to be installed and authenticated in the environment where Hive runs. Check the [agent documentation](https://hive.admir-saheta.com/docs/use/ai-agents/) for current integration and support details; the list is evolving.
4. Start with the mouse: click to focus, drag pane borders to resize, select text to copy, and scroll through terminal history.
5. When they want to leave agents running, detach with `ctrl+b`, then `d`. Reopen Hive later to return to the multiplexer.
6. To stop the runtime and every agent it runs, use `hive stop` (or `./hive stop` from a source checkout). This is different from detaching.

Full walkthrough: [Quick start](https://hive.admir-saheta.com/docs/getting-started/quick-start/).

## Keyboard basics

The default prefix is `ctrl+b`: press it, release it, then press the action key. The mouse works too, so new users do not need to memorize bindings first.

- `prefix + %` splits right; `prefix + "` splits down.
- Arrow keys or `h`, `j`, `k`, `l` move between panes.
- `prefix + z` zooms a pane; `prefix + x` closes it.
- `prefix + c` creates a tab. `prefix + 1`–`9` selects one; `n` and `p` move next and previous.
- `prefix + w` opens a fuzzy chooser for agents and panes.
- `prefix + O` opens the agent overview.
- `prefix + [` enters copy mode; `prefix + ?` shows the live bindings.
- `prefix + I` pastes a clipboard image into the focused agent (agents that declare image input, such as Claude Code and Codex).
- `prefix + :` or `prefix + P` opens the plugin palette.
- `prefix + d` detaches while agents keep running.

See [Keystrokes](https://hive.admir-saheta.com/docs/getting-started/keystrokes/) for the current reference. If a binding behaves differently, use the live `prefix + ?` view as the source of truth.

## Keep the daemon available

Once the human is comfortable with Hive, `hive daemon install` installs an optional login service: launchd on macOS, a systemd user service on Linux, or a Task Scheduler task on Windows. This makes the daemon start at login and restart if it crashes. See the [installation guide](https://hive.admir-saheta.com/docs/getting-started/installation/#start-the-daemon-at-login-optional) before enabling it. `hive update` upgrades in place while agents keep running, and `hive update --rollback` restores the previous binary.

## Configuration

Hive’s config file is `~/.config/hive/config.toml` (`%APPDATA%\Hive\config.toml` on Windows); configuration is optional. Do not invent keys or copy settings from tmux. Check the [configuration reference](https://hive.admir-saheta.com/docs/config/config-reference/) and `hive config default` before advising on a specific option.

## Watching and extending Hive

- **Read-only access for dashboards, bots, or a browser:** use an observer credential (`hive observer create`), never the control socket. See [Observers](https://hive.admir-saheta.com/docs/use/observers/).
- **Check agents from a browser or phone:** `hive web runtime add`, `hive web serve`, then `hive web share` for a one-time link. It is read-only and needs HTTPS beyond localhost. See [Web Observer](https://hive.admir-saheta.com/docs/use/web-observer/) and [Hive on Your Phone](https://hive.admir-saheta.com/docs/use/mobile/).
- **Plugins:** install reviewed ones with `hive plugin search` and `hive plugin install <id>`. Plugins declare capabilities that the human grants; `hive plugin doctor <id>` diagnoses problems. See [Plugin API v1](https://hive.admir-saheta.com/docs/config/plugin-api/).

## Diagnosis recipes

- **Find running agents:** run `hive ps list` (or `./hive ps list` in a source checkout). Add `--json` to commands that support it when a script or agent needs machine-readable output.
- **Open one agent’s terminal:** run `hive terminal attach <id>` using an ID from `hive ps list`. Press `ctrl+]` to detach from that direct terminal attachment.
- **A coding agent is missing or its behavior is unclear:** confirm its CLI is installed and usable in the same environment, then consult [Agents](https://hive.admir-saheta.com/docs/use/ai-agents/) and the [repository](https://github.com/admirable-oss/hive/tree/main/internal). Agent support and integration behavior may change.
- **The UI disappeared but agents should continue:** reopen Hive. Detaching with `prefix + d` leaves the agents running; `hive stop` ends the runtime and all its agents.
- **The daemon should start with the user’s login:** check `hive daemon install` and the [installation guide](https://hive.admir-saheta.com/docs/getting-started/installation/#start-the-daemon-at-login-optional).
- **Questions about persistence or recovery:** consult [Persistence](https://hive.admir-saheta.com/docs/use/persistence/) and [Troubleshooting](https://hive.admir-saheta.com/docs/help/troubleshoot/).

## Rules for you

- Do not invent CLI flags, keybindings, agent integrations, or config keys. Check the current docs or repository when a detail is missing.
- Explain detach and stop accurately: detaching leaves agents running; `hive stop` stops the runtime and its agents.
- Hive has its own commands and configuration. Do not give tmux commands or `.tmux.conf` advice for Hive.
- For commands, architecture, or current support, prefer the [Hive documentation](https://hive.admir-saheta.com/docs/) and [GitHub repository](https://github.com/admirable-oss/hive).
