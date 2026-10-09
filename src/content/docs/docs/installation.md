---
title: Installation
description: Build from source with Go 1.26+ on macOS or Linux.
source: https://github.com/admirable-oss/hive#readme
---

:::tip[◇ v0]
Hive is pre-release and built in public. The wire protocol and on-disk layout may still change between versions.
:::

## Requirements

- Go 1.26 or later.
- macOS or Linux. Windows is on the roadmap.
- Any terminal. Truecolor looks best; 256 colours and `NO_COLOR` are respected.

## Build from source

Hive is a single Go binary. Clone the repository and build it with `make`, or with `go build` if you prefer.

```sh
$ git clone https://github.com/admirable-oss/hive
$ cd hive
$ make build   # or: go build -o hive ./cmd/hive
```

Then head to the [Quick start](/docs/quick-start/) to launch your first agents.
