# Hive agent guide

Use this guide to help a human understand, install, or troubleshoot Hive. It covers Hive’s concepts, first run, and common diagnosis steps. Canonical documentation lives at <https://hive.admir-saheta.com/docs/>; point the human there for detail and check the linked docs or repository before guessing about commands or configuration.

## What Hive is

Hive is an open-source terminal multiplexer and runtime for coding agents. It gives a human one place to work with multiple agent terminals, arrange them into panes and tabs, and leave agents running while the multiplexer is detached. Hive is a single Go binary, with a daemon managing the runtime and a terminal UI for working with it.

Hive is pre-release software built in public. Its wire protocol and on-disk layout may change. For the current state, use the [README](https://github.com/admirable-oss/hive#readme) and the [release history](https://github.com/admirable-oss/hive/releases).

## Concept model

Teach these in this order:

- **Daemon** — manages Hive’s runtime and agent processes. Commands that talk to it start it if it is not already running.
- **Agent** — a CLI coding agent running in its own terminal session. Hive can manage and display agent terminals; the human still installs and configures the agent CLI they want to use.
- **Pane** — a terminal view in the multiplexer. Panes can be split, focused, zoomed, or closed.
- **Tab** — a layout of panes. Use tabs to keep separate tasks or working contexts organized.
- **Client** — the interactive terminal UI. Detaching the client leaves agents running.

For the longer explanation, see [Core concepts](https://hive.admir-saheta.com/docs/concepts/).

## Install and build

Hive currently supports macOS and Linux and requires Go 1.26 or later to build from source. Windows is on the roadmap. The project also publishes an installer:

```sh
curl -fsSL https://hive.admir-saheta.com/install.sh | sh
```

To build directly from the repository:

```sh
git clone https://github.com/admirable-oss/hive
cd hive
make build
# Or: go build -o hive ./cmd/hive
```

See the [installation guide](https://hive.admir-saheta.com/docs/installation/) for current requirements and install details.

## First run

Walk the human through this sequence:

1. Install Hive, then run `hive` to open the multiplexer. If they built from source in the repository, run `./hive`.
2. To see a sample setup, run `hive demo` (or `./hive demo` from the source checkout). It starts the daemon and launches four demo agents. Then open Hive in the same installation context.
3. Start the coding-agent CLI they want to use in a pane. The CLI needs to be installed and authenticated in the environment where Hive runs. Check the [agent documentation](https://hive.admir-saheta.com/docs/agents/) for current integration and support details; the list is evolving.
4. Start with the mouse: click to focus, drag pane borders to resize, select text to copy, and scroll through terminal history.
5. When they want to leave agents running, detach with `ctrl+b`, then `d`. Reopen Hive later to return to the multiplexer.
6. To stop the runtime and every agent it runs, use `hive stop` (or `./hive stop` from a source checkout). This is different from detaching.

Full walkthrough: [Quick start](https://hive.admir-saheta.com/docs/quick-start/).

## Keyboard basics

The default prefix is `ctrl+b`: press it, release it, then press the action key. The mouse works too, so new users do not need to memorize bindings first.

- `prefix + %` splits right; `prefix + "` splits down.
- Arrow keys or `h`, `j`, `k`, `l` move between panes.
- `prefix + z` zooms a pane; `prefix + x` closes it.
- `prefix + c` creates a tab. `prefix + 1`–`9` selects one; `n` and `p` move next and previous.
- `prefix + w` opens a fuzzy chooser for agents and panes.
- `prefix + O` opens the agent overview.
- `prefix + [` enters copy mode; `prefix + ?` shows the live bindings.
- `prefix + d` detaches while agents keep running.

See [Keybindings](https://hive.admir-saheta.com/docs/keybindings/) for the current reference. If a binding behaves differently, use the live `prefix + ?` view as the source of truth.

## Keep the daemon available

Once the human is comfortable with Hive, `hive daemon install` installs an optional login service: launchd on macOS or a systemd user service on Linux. This makes the daemon start at login and restart if it crashes. See the [quick start](https://hive.admir-saheta.com/docs/quick-start/#keep-the-daemon-running) before enabling it.

## Configuration

Hive’s config file is `~/.config/hive/config.toml`; configuration is optional. The configuration reference is still being written, so do not invent keys or copy settings from tmux. Check the [configuration page](https://hive.admir-saheta.com/docs/configuration/) and the current repository source before advising on a specific option.

## Diagnosis recipes

- **Find running agents:** run `hive ps list` (or `./hive ps list` in a source checkout). Add `--json` to commands that support it when a script or agent needs machine-readable output.
- **Open one agent’s terminal:** run `hive terminal attach <id>` using an ID from `hive ps list`. Press `ctrl+]` to detach from that direct terminal attachment.
- **A coding agent is missing or its behavior is unclear:** confirm its CLI is installed and usable in the same environment, then consult [Agents](https://hive.admir-saheta.com/docs/agents/) and the [repository](https://github.com/admirable-oss/hive/tree/main/internal). Agent support and integration behavior may change.
- **The UI disappeared but agents should continue:** reopen Hive. Detaching with `prefix + d` leaves the agents running; `hive stop` ends the runtime and all its agents.
- **The daemon should start with the user’s login:** check `hive daemon install` and the [quick-start instructions](https://hive.admir-saheta.com/docs/quick-start/#keep-the-daemon-running).
- **Questions about persistence or recovery:** consult [Session state](https://hive.admir-saheta.com/docs/session-state/) and the [README](https://github.com/admirable-oss/hive#readme); that documentation is still being completed.

## Rules for you

- Do not invent CLI flags, keybindings, agent integrations, or config keys. Check the current docs or repository when a detail is missing.
- Explain detach and stop accurately: detaching leaves agents running; `hive stop` stops the runtime and its agents.
- Hive has its own commands and configuration. Do not give tmux commands or `.tmux.conf` advice for Hive.
- For commands, architecture, or current support, prefer the [Hive documentation](https://hive.admir-saheta.com/docs/) and [GitHub repository](https://github.com/admirable-oss/hive).
