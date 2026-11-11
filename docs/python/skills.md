---
title: "Skills"
sidebar_position: 5
description: "Add user skills from code or from folders of SKILL.md files, and send them to the engine on every session."
---

# Skills

Skills are markdown knowledge documents the agent discovers (`list_skills`) and loads
(`load_skill`) on demand. Partner skills uploaded in the dashboard need no SDK code.
`t2v.skills` manages the **user** skills a host adds — from code or from folders of
`SKILL.md` files — and sends them to the engine on every session.

```python
from talk2view import Skill

t2v.skills.add(Skill(
    name="measure-volume",
    description="How to measure a segment's volume",
    content="# Measuring\n1. ...",
    allowed_tools=["measure_segment_volumes"],   # optional: gate the client tools
))
t2v.skills.load_directory("~/Talk2View/skills", label="user")  # SKILL.md files
t2v.skills.set_enabled("measure-volume", False)
t2v.skills.remove("measure-volume")
t2v.skills.get_all()          # every local Skill, enabled or not
t2v.skills.state()            # the SkillsState slice (also in ChatController snapshots)
t2v.skills.save(); t2v.skills.load()   # persist code-added skills in data_storage
t2v.skills.list_platform()    # partner/built-in catalogue, or None on an older engine
```

`load()` always sends the saved set with the next register call, even an empty one; a
host that stops using skills calls `skills.clear()` once.

Local edits are sent as ONE `POST /v1/skills/register` after 500 ms of quiet (the
route allows 10 calls a minute per signed-in user); `t2v.skills.register()` sends now,
and `chat()` sends a pending edit before each turn. Every call carries `replace: true`:
an engine that honours it makes the session's user skills exactly the enabled set, so a
removed or disabled skill is gone after the next call. An older engine ignores the flag
and merges, never removing a skill; there, removing or disabling a registered skill sets
`needsSessionReset`: a `ChatController` recycles the session as soon as it is idle
(history is kept), and a plain `chat()` does so before its next turn. On an engine that
honours `replace`, a replace that fails falls back to the same session recycle (see
**Compatibility** below for what an older engine cannot guarantee). A failed register
on a new session that may be one the engine kept falls back to it too
(`POST /v1/sessions` is get-or-create, so after a restart the SDK cannot know what
that session holds): `chat()` recycles once before the turn. A session created right
after this client's own confirmed `DELETE` is known to be empty, and a failed register
there only leaves the edit pending. `t2v.skills.replace_honoured()` tells which kind of
engine answered (None until the first call).

`replace: true` is last-writer-wins for the whole (partner key, account) session: two
apps signed in to the same account with the same partner key overwrite each other's user
skills, exactly as they do each other's client tools.

`list_platform()` (`GET /v1/skills`, 60 calls a minute) returns the partner and built-in
skills the session can see, one entry per name, with the engine's `source`; a local
skill with the same name is marked `overridesPlatform` in `state()`. It returns `None`
when the engine is older than that route (a 404: the catalogue is unavailable) or skills
are disabled for the session.

Limits mirror the engine's units: a name is 1..255 Unicode code points, a body is
non-empty, and the whole request is under 8 MB of JSON **bytes** —
`SkillValidationError` is raised before any request. A skill over ~100k characters is
accepted with a warning.

**On-disk format.** `load_directory(dir)` reads `<dir>/<skill>/SKILL.md` and
`<dir>/<skill>.md`, parsed exactly as the engine and the dashboard parse them:

```markdown
---
name: measure-volume
description: How to measure a segment's volume
allowed-tools: measure_segment_volumes set_segment_display
---
# Measuring a volume
...
```

The frontmatter is line-wise `key: value` (no YAML lists or multi-line values — they
are warned about and ignored); `allowed-tools` is space- or comma-separated; `name`
defaults to the folder or file stem and must be a safe file name; only `SKILL.md` is
sent (sibling files are ignored with a warning). By name, a skill added from code wins
over a directory, and a directory loaded later wins over one loaded earlier. Calling
`load_directory` again with the same `label` rescans it.

A symlink inside a skills directory that resolves outside it, and a skill file over the
8 MB request cap, are both skipped with a warning rather than sent to the engine.

**Compatibility.** Removing or disabling a skill without a session recycle needs an
engine that honours `replace` (the engine's skills routes). On an older engine the SDK
falls back to recycling the session, and a skill removed while the app was closed can
survive a restart until the next recycle — so reliable skill removal with this SDK
version requires a Talk2View engine with skills `replace` support.

`load_directory()` trusts the people who can write to the directory: a symlink that
resolves outside it is refused, but each file is checked and then read, so a file
swapped in between is read as it is then. Load directories the end-user controls.
