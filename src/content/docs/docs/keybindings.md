---
title: Keybindings
description: Every binding by mode, and how to rebind it.
---

The prefix is <kbd>ctrl+b</kbd>, like tmux. Press it, then a key. Every binding can be changed in `config.toml`, and <kbd>ctrl+b</kbd> <kbd>?</kbd> lists them all, with a filter.

## The prefix

| after ctrl+b | does |
| --- | --- |
| <kbd>%</kbd> <kbd>"</kbd> | Split the pane right · down |
| <kbd>← ↓ ↑ →</kbd> <kbd>h j k l</kbd> | Move between panes (space: sticky navigate mode, r: resize mode) |
| <kbd>z</kbd> <kbd>x</kbd> | Zoom the pane · close it |
| <kbd>c</kbd> <kbd>1–9</kbd> <kbd>n</kbd> <kbd>p</kbd> | New tab · go to a tab · next, previous |
| <kbd>w</kbd> | Go to any agent or pane (fuzzy) |
| <kbd>O</kbd> | The Overview: every agent, with a live preview |
| <kbd>[</kbd> | Copy mode: vim keys, / search, v select, y copy |
| <kbd>?</kbd> | Every binding, with a filter |
| <kbd>d</kbd> | Detach. Agents keep running. |

:::note[being written]
The per-mode reference and the rebinding guide are being written in the open. Until they land, <kbd>ctrl+b</kbd> <kbd>?</kbd> inside Hive is the source of truth.
:::
