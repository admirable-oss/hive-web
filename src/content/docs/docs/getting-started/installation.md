---
title: Install Hive
description: Install Hive on macOS or Linux, build it from source, and start your first session.
source: https://github.com/admirable-oss/hive#readme
---

Hive is a terminal workspace for running persistent agent sessions. Install a release for the quickest setup, or build the CLI from source if you want to work on Hive itself.

:::tip[◇ v1.0 release candidates]
Hive is built in public. The CLI, configuration, wire API, and Go SDK are frozen for the 1.x release series; see the [compatibility policy](/docs/ref/compatibility/).
:::

## Requirements

| Install method | Requirements |
| --- | --- |
| Release installer | macOS or Linux, a terminal, and `curl` |
| Build from source | macOS or Linux, Git, and Go 1.26 or later |

Hive is a terminal application, so it works with your usual terminal emulator. Truecolor provides the richest colors; 256-color terminals and `NO_COLOR` are also supported.

## Install a release

The install script downloads and installs the current Hive release for macOS or Linux:

```sh
curl -fsSL https://hive.admir-saheta.com/install.sh | sh
```

The command uses the installer served by this site, which in turn fetches the install script from the [Hive repository](https://github.com/admirable-oss/hive/tree/main/distribution). If the `hive` command is not found after installation, open a new terminal and check that the install location is on your `PATH`.

The installer places Hive in `~/.local/bin` by default. Set `HIVE_INSTALL_DIR` to choose another directory, `HIVE_CHANNEL=preview` to install release candidates, or `HIVE_VERSION` to select a release tag. Other options include Homebrew, Nix, and `go install`; see the [repository README](https://github.com/admirable-oss/hive#quick-start) for the current commands.

To inspect the available commands, run:

```sh
hive --help
```

## Build from source

Building from source is useful when contributing to Hive or when you want to run the code in a local checkout. Clone the repository and build the CLI:

```sh
git clone https://github.com/admirable-oss/hive.git
cd hive
make build
```

If you prefer to use Go directly, build the command package:

```sh
go build -o hive ./cmd/hive
```

The resulting `hive` executable is in the repository directory. Prefix commands with `./` to run that local build, or move it to a directory on your `PATH` to run it as `hive` from anywhere.

## Start Hive

Hive starts its daemon automatically when a command needs it. To open the multiplexer, run:

```sh
hive
```

If you built from source in the repository directory, use `./hive` instead.

To try Hive with four demo agents, run `hive demo` first, then open the workspace:

```sh
hive demo
hive
```

In the multiplexer, use <kbd>Ctrl</kbd>+<kbd>B</kbd> followed by <kbd>D</kbd> to detach. Detaching leaves the agents running, so you can return later by running `hive` again. To stop the runtime and all agents it manages, run:

```sh
hive stop
```

For a guided tour of panes, tabs, and the other keybindings, continue to [Quick Start](/docs/getting-started/quick-start/).

## Start the daemon at login (optional)

You can install Hive's daemon as a user service so it starts when you log in and restarts if it exits. Hive uses `launchd` on macOS and a `systemd` user service on Linux:

```sh
hive daemon install
```

The daemon is optional. Without a service, Hive starts it on demand when you run a command that needs it.

## Next steps

- [Quick Start](/docs/getting-started/quick-start/) — launch demo agents and learn the multiplexer.
- [Core concepts](/docs/getting-started/core-concepts/) — understand Hive's daemon, clients, and agent shims.
- [Configuration](/docs/config/configuration/) — customize your workspace and keybindings.
- [Hive on GitHub](https://github.com/admirable-oss/hive) — browse the source and releases.
