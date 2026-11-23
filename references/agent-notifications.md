# Notifying the Agent

Applies to every component type (communication, capability, utility) that tells
the agent something on its own initiative: a status change, a reminder, an
instruction to act. Replies to user messages are covered by
[communication.md](./communication.md).

Source of truth: zylos-core `skills/comm-bridge/references/c4-receive.md` and
`skills/comm-bridge/references/c4-control.md`.

## Ordinary message or control

Ask one question: **should this notice become part of the agent's memory?**

| Answer | Send it as | Why |
|---|---|---|
| Yes: something the agent should remember later (for example, the owner changed) | Ordinary message, `c4-receive.js` | Memory Sync reads conversation records |
| No: a one-time operational prompt (for example, "check unread messages in this chat", "stop the current step") | Control, `c4-control.js enqueue` | Controls are not conversation records and Memory Sync never reads them |

## Ordinary messages without a reply address

A notice that nobody replies to does not need a reply address. Call
`c4-receive.js` with `--no-reply` and no `--channel`; Core files it under the
`system` channel, and in multi-session mode it goes to the `origin` session.
The scheduler sends its notices this way.

```javascript
import { execFile } from 'node:child_process';
import { getC4ReceivePath } from './lib/c4.js';

execFile(process.execPath,
  [getC4ReceivePath(), '--no-reply', '--json', '--content', '[My Component] Owner changed to alice'],
  (err, stdout) => { /* parse the JSON result; on rejection log the code */ });
```

## Controls must name their target session

Once `<ZYLOS_DIR>/.zylos/config.json` contains `session_mode` (multi mode, or
single mode after migration), Core rejects a control without `--group` with
`CONTROL_TARGET_REQUIRED` and queues nothing. Only an install whose config has
no `session_mode` accepts a control without `--group`; do not pass `--group`
there. Read the config at send time, not once at startup: the owner can switch
modes while the component runs.

**Which session.** A control goes to the session it relates to, because a
control usually only makes sense in one specific conversation:

- browser-remote's Escape interrupt goes to the session the user is
  interrupting;
- openmax's "unread DM" reminder goes to the session of that DM
  (`openmax:dm-<conversation id>`).

Use `origin` only for a notice that genuinely belongs to no session. In single
mode after migration the only target is `origin`.

**Full group name.** `--group` takes the complete name, including your
component namespace: `<component>:<name>` for a conversation's group, or
`<component>` for your overall group. Unlike `c4-receive --session-group`, Core
adds no prefix. Get `<name>` from the same mapping the receiver uses
(`sessionGroupFromEndpoint`, see communication.md "Session Groups").

**Acknowledgement deadline.** A targeted control that keeps the ack suffix must
pass `--ack-deadline <seconds>`; otherwise Core rejects it with
`ACK_DEADLINE_REQUIRED`. Use `--no-ack-suffix` only for clean slash commands.

**Delivery is not guaranteed.** Controls are delivered only to a running
session. A control for a session that is not running stays pending until that
session next starts, and that start marks it `timeout` without delivering it.
Do not assume a control arrived; if the outcome matters, read it with
`c4-control.js get --id <id>`, or send an ordinary message instead.

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { getC4ReceivePath } from './lib/c4.js';

const zylosDir = process.env.ZYLOS_DIR || path.join(process.env.HOME, 'zylos');
const config = JSON.parse(fs.readFileSync(path.join(zylosDir, '.zylos/config.json'), 'utf8'));
const args = [path.join(path.dirname(getC4ReceivePath()), 'c4-control.js'), 'enqueue',
  '--content', '[My Component] New unread messages in this chat; check them.',
  '--ack-deadline', '600', '--json'];
if (Object.hasOwn(config, 'session_mode')) args.push('--group', `my-component:${groupName}`);
execFile(process.execPath, args, (err, stdout, stderr) => { /* log rejections with their code */ });
```

## Acceptance

- Every `c4-control.js enqueue` call passes `--group` whenever config has
  `session_mode`, with the session the control relates to.
- On a multi-session test instance, each control appears in `control_queue`
  under the intended `session_group`, and no call fails with
  `CONTROL_TARGET_REQUIRED` or `ACK_DEADLINE_REQUIRED` in the component's logs.
- Notices the agent must remember arrive as conversation records, not controls.
