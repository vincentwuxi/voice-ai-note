# Pinokio selected skills

This file is generated for this terminal session.

## pinokio
Source: 879b8c7da6ed3446

# Pinokio Runtime Skill (pterm-first)

Use this skill for runtime control of Pinokio apps.
Do not ask users to manually install, launch, or call APIs when `pterm` can do it.

## Control Plane

Assume `pterm` is preinstalled and up to date.

### pterm Resolution (External Clients)

If running outside Pinokio's own shell, do not assume `pterm` is on `PATH`.

If `pterm` is not already executable, use the first executable match from these sources:

- Pinokio-managed path from `~/.pinokio/config.json` file's `home` attribute:
  macOS/Linux: `<home>/bin/npm/bin/pterm`
  Windows: `<home>\\bin\\npm\\pterm`
  Optional fallback: `<home>/bin/pterm`

- Control-plane path lookup:
  `GET http://127.0.0.1:42000/pinokio/path/pterm`
  If loopback is unreachable and `access` exists in `~/.pinokio/config.json`, retry the same request against `<protocol>://<host>:<port>`.

- Generic local lookup:
  `which pterm` / `where pterm`

Normalize whichever path you resolve before use.
- On Windows, if the resolved path has no executable Windows extension, prefer a sibling `.cmd` or `.ps1`.

Failure handling:
- `EPERM` / `EACCES` / sandbox denial: treat as a client permission problem, ask for permission first when possible, and rerun the same probe or `pterm` command after permission is granted.
- timeout / connection refused / DNS failure: report that the Pinokio control plane is unreachable rather than claiming `pterm` is uninstalled.
- Only report "`pterm` unavailable" when the config/home-derived path, control-plane path resolution, and local path checks all fail.

Use direct `pterm` commands for control-plane operations:

`pterm search`, `pterm status`, `pterm run`, `pterm open`, `pterm logs`, `pterm upload`, `pterm which`, `pterm stars`, `pterm star` / `pterm unstar`, `pterm registry search`, `pterm download`

Do not run update commands from this skill.
Once a Pinokio-managed app is selected, treat `pterm` and the launcher-managed interfaces as the source of truth for lifecycle and execution. Do not switch to repo-local CLIs or bundled app binaries unless the user explicitly asks for CLI mode.

## How to use

Follow these sections in order:
1. Use Search App first.
2. Only use Registry Fallback if Search App found no suitable installed app and the user approved it.
3. Then use Launch App.
4. Then use Using Apps if the app exposes an automatable API.
5. Only use Parallel Mode when the user explicitly asks to use multiple apps or multiple machines in parallel.

### 1. Search App

- Resolve by `pterm search`.
- Build one primary query from user intent:
  - explicit app name/vendor if user provided one
  - otherwise 2-4 high-signal capability tokens (example: `tts speech synthesis`)
- Query hygiene:
  - remove duplicate/filler words (`to`, `for`, `use`, `app`, `tool`, `service`)
  - do not send full sentences
- Run primary lookup:
  - if query has 3+ terms: `pterm search "<query>" --mode balanced --min-match 2 --limit 8`
  - if query has 1-2 terms: `pterm search "<query>" --mode balanced --min-match 1 --limit 8`
- If user provided a git URL, extract owner/repo tokens and run `pterm search` with those tokens first.
- Useful-hit threshold:
  - for 3+ term queries: candidate has `matched_terms_count >= 2` (if available)
  - for 1-2 term queries: candidate has `matched_terms_count >= 1` or clear top score
- If no useful hits, run one fallback:
  - `pterm search "<query>" --mode broad --limit 8`
- Deterministic ranking:
  - First, rank by runtime tier:
    - relevant apps with `ready=true`
    - otherwise relevant apps with `running=true`
    - otherwise relevant offline apps
  - This runtime priority applies across all relevant candidates, not just the same app on different machines.
  - If multiple different apps can satisfy the request, prefer the already-ready one over launching another offline app.
  - Within the selected runtime tier, rank by user preference:
    - exact `app_id`/title match (for explicit app requests)
    - `starred=true`
  - Within that same tier, use the remaining tiebreakers:
    - higher `matched_terms_count` (if available)
    - higher `launch_count_total` (if available)
    - more recent `last_launch_at` (if available)
    - higher `score`
- If the top candidate is not clearly better than alternatives, ask user once with top 3 candidates.
- If a suitable installed app is found, select it and continue to Launch App.
- Search results may include apps from other reachable Pinokio machines:
  - prefer the canonical `ref` field when it exists
  - `ref` uses the form `pinokio://<host>:<port>/<scope>/<id>`
  - `source.local=false` means the result is from another machine
  - treat remote results as separate apps; do not merge them with the local app of the same name

### 2. Registry Fallback

- Only use this section if Search App found no suitable installed app.
- Ask the user once whether to search the Pinokio registry for installable apps.
- Only after the user says yes:
  - run `pterm registry search "<query>"`
  - present the best candidates
  - after the user selects one, run `pterm download <uri>`
  - if `pterm download <uri>` fails with `already exists`, ask the user for a local folder name and retry with `pterm download <uri> <name>`
  - if the user wants a specific local folder name or another copy of the same repo, use `pterm download <uri> <name>`
  - then run the downloaded app with `pterm run <local_app_path_or_name>`
- Do not use `pterm run <url>` for the registry flow.

### 3. Launch App

- Once you have a selected app, use `pterm status`.
- Poll every 2s.
- Use status fields from pterm output:
  - `path`: absolute app path to use with `pterm run`
  - `ref`: canonical Pinokio resource reference in the form `pinokio://<host>:<port>/<scope>/<id>`
  - `running`: script is running
  - `ready`: app is reachable/ready
  - `ready_url`: default base URL for API calls when available
  - `external_ready_urls`: optional ordered non-loopback app URLs for caller-side access; use them only when `ready_url` is missing or unusable due to loopback restrictions
  - `state`: `offline | starting | online`
  - `source`: machine identity for results from other reachable Pinokio machines
- Use `--probe` only for readiness confirmation before first API call (or when status is uncertain).
- Use `--timeout=<ms>` only when you need a non-default probe timeout.
- Treat `offline` as expected before first run.
- If `ref` points to another machine or `source.local=false`, the app is remote:
  - treat `path` and `ready_url` as source-local fields, not caller-usable local paths/URLs
  - use `external_ready_urls` in order for caller-side API access when available
  - use `pterm run <ref>` for remote launch; do not use a remote machine's `path` value as a local path
  - for remote path-based tasks:
    - this applies only when the task expects filesystem paths such as `/path/to/file`
    - do not pass local paths from this machine to the remote app
    - first run `pterm upload <ref> <file...>`
    - then use the returned remote `path` values
- If app is offline or not ready, run it:
  - If `ref` exists, run `pterm run <ref>`.
  - Otherwise run `pterm run <app_path>`.
  - If the launcher has no explicit default item or the launch action depends on current menu state, infer one or more ordered selectors from the launcher's current menu and pass them via repeated `--default`.
  - Prefer stable launcher selectors such as `run.js?mode=Default`, then broader fallbacks like `run.js`, then installation fallback like `install.js`.
  - Continue polling with `pterm status <ref>` when `ref` exists, otherwise `pterm status <app_id>`.
  - Default startup timeout: 180s.
- Success criteria:
  - `state=online` and `ready=true`
  - use `ready_url` by default when it exists and is caller-usable
  - if `ready_url` is missing, or it fails because the client cannot access loopback, and `external_ready_urls` exists, try those URLs in order
  - missing `external_ready_urls` is normal; it usually means network sharing is off
- If the user explicitly wants to open the app UI or open a web page in a browser or popup window:
  - use `pterm open`
  - only do this for explicit viewing/manual interaction requests, not for normal API automation
  - syntax:
    - `pterm open <url>`
    - `pterm open <url> --peer <peer>`
    - `pterm open <url> --surface browser`
    - `pterm open <url> --preset center-small|center-medium|center-large|fullscreen`
    - `pterm open <url> --peer <peer> --surface browser`
  - choose the URL based on where the window should open:
    - if the window should open on the current machine where `pterm` is running, use a caller-usable app URL:
      - `ready_url` when it exists and the current machine can reach it
      - otherwise the first usable entry from `external_ready_urls`
    - if the window should open on a remote peer node, add `--peer <peer>` and use the app's source-local URL on that peer:
      - prefer `ready_url` from that peer's point of view
      - if needed, use the source-local URL in `local_entries[].local.url`
  - do not invent raw `http://<peer_host>:<internal_port>` URLs from port numbers or local entries
  - default behavior should be popup-preferred:
    - on a desktop Pinokio node, it opens a Pinokio popup window
    - on a server-only or minimal node, it falls back to the system browser automatically
  - use `--surface browser` only when the user explicitly wants the system browser instead of the default popup-preferred behavior
  - popup size presets:
    - `center-small`
    - `center-medium`
    - `center-large`
    - `fullscreen`
  - if popup sizing matters and the user does not specify one, default to `--preset center-medium`
  - examples:
    - open on the current machine with the default popup-preferred behavior:
      - `pterm open http://192.168.86.26:42011`
    - open on the current machine in the system browser:
      - `pterm open http://192.168.86.26:42011 --surface browser`
    - open on peer `192.168.86.26` using that peer's local app URL:
      - `pterm open http://127.0.0.1:7860 --peer 192.168.86.26`
    - open on peer `192.168.86.26` in that peer's system browser:
      - `pterm open http://127.0.0.1:7860 --peer 192.168.86.26 --surface browser`
    - open on peer `192.168.86.26` as a large popup:
      - `pterm open http://127.0.0.1:7860 --peer 192.168.86.26 --preset center-large`
- Failure criteria:
  - timeout before success
  - app drops back to `offline` during startup after a run attempt
  - `pterm run` terminates and status never reaches ready
  - on failure, fetch `pterm logs <ref> --tail 200` when `ref` exists, otherwise `pterm logs <app_id> --tail 200`, and return:
    - raw log tail
    - short diagnosis
- After successful task completion:
  - do not stop or shut down the app unless the user explicitly asks
  - prefer leaving a successfully running app online for reuse

### 4. Using Apps
- Create or reuse one app-specific skill folder for the selected app:
  - local default: `<current_working_directory>/pinokio_agent/skills/<scope>/<app_id>/`
  - fallback: `<PINOKIO_HOME>/agents/skills/<scope>/<app_id>/`
- App-specific skill folder structure:
  - `SKILL.md`: short instructions for how to use this app
    - include frontmatter with only:
      - `name`: short stable app-specific skill name using lowercase letters, digits, and hyphens only; derive it from a normalized app identity such as `<scope>-<app_id>` and keep it under 64 characters
      - `description`: one clear sentence describing what this app-specific skill does and when it should be used
  - optional `clients/`: reusable local client files
  - optional `references/`: saved API artifacts such as OpenAPI specs, Gradio config, or concise notes
  - outputs: `<app_skill_folder>/output/<target_host>/...`

- Reuse an existing app-specific skill when possible:
  - if `<app_skill_folder>/SKILL.md` exists and still describes the app's current API correctly, read it first and follow it
  - if the folder already contains a reusable client for the needed operation and it still works against the current app API, reuse that client
  - if the folder has no `SKILL.md`, or the saved instructions or saved client no longer match the current API, rediscover the app interface and rewrite the app-specific skill folder

- If rediscovery is needed, choose exactly one usage mode:
  - Mode A: use the app directly
  - Mode B: reuse or generate a reusable client
- Use Mode A only if all of these are true:
  - the running app already exposes a documented HTTP API you can call directly
  - the task is simple enough to complete with one or a few direct requests
  - saving a client file would not make later work meaningfully easier
- Standard callable API examples:
  - OpenAPI / Swagger endpoints
  - FastAPI docs
  - Gradio API
  - other documented standard HTTP interfaces
- Otherwise use Mode B.

- Shared rules for both modes:
  - prefer documented/public APIs exposed by the running launcher
  - choose a base URL that the current machine can actually reach:
    - use `ready_url` when it exists and the current machine can reach it
    - otherwise use `external_ready_urls` in order
  - if the task needs remote filesystem paths, first run `pterm upload <ref> <file...>` and use the returned remote paths for that target only
  - never reuse a remote uploaded path from one target on another target
  - keep `<app_skill_folder>/SKILL.md` concise and operational
  - put bulky raw artifacts in `references/` instead of bloating `SKILL.md`

- Mode A: use the app directly
  - execute the needed requests directly from the current machine
  - update `<app_skill_folder>/SKILL.md` to record:
    - what callable API surface exists
    - how to choose the base URL
    - required request inputs and outputs
    - whether remote upload is needed for path-based tasks
  - do not create a reusable client in this mode unless the workflow later becomes repetitive or multi-step enough to justify Mode B

- Mode B: reuse or generate a reusable client
  - if no matching client exists under `<app_skill_folder>/clients/` for the needed operation, generate one
  - if a client exists but the contract no longer matches, regenerate it only for:
    - 404/405 endpoint mismatch
    - 400/422 payload/schema mismatch
    - auth/header mismatch
  - inspect docs/code to infer endpoint + payload
  - generate a minimal cross-platform HTTP client in `py` or `js`
  - do not use Bash, PowerShell, or other machine-specific shell scripts for reusable clients unless the user explicitly asks for a machine-local one-off script
  - generated clients run on the current machine; do not copy or write them onto the remote machine
  - organize clients by app and operation, not by host
    - example: if local Cropper and remote Cropper use the same endpoint and payload shape for `trim`, reuse one client such as `clients/trim.py`
  - do not create a second client file only because the target host changed
  - pass per-run values into the client at execution time:
    - a base URL that the current machine can actually reach
    - uploaded remote file paths when needed
    - per-run auth headers/cookies if required
  - never hardcode per-run values into the saved client:
    - `ref`
    - base URL / host / port
    - uploaded temp file paths
    - per-run auth tokens or cookies
  - update `<app_skill_folder>/SKILL.md` to record:
    - which client file to use for each operation
    - required runtime arguments
    - expected outputs
    - when the client should be regenerated

- Do not execute the app's internal Python/Node/bundled CLI as a fallback when `pterm` has already selected a launcher-managed app.
- If no automatable API exists after the app is running, report that clearly instead of bypassing the launcher with an internal CLI.

### 5. Parallel Mode (explicit only)

- Use this section only when the user explicitly asks to:
  - run on multiple machines
  - use multiple apps in parallel
  - compare multiple relevant apps side by side
  - generate multiple outputs concurrently
- Do not use this mode by default.
- Keep each selected app as a separate target. Prefer `ref` as the target identifier when it exists.
- Selection rules:
  - if the user asks for all relevant apps, use all relevant search results that can perform the task
  - if the user asks for a specific count, use the top N relevant search results after normal search ranking
  - if the user asks for parallel use but does not specify how many apps or machines to use, ask once
- Ranking still applies in this mode:
  - prefer `ready` apps first
  - then `running` apps
  - then offline apps if more targets are still needed
- Run and monitor each selected target independently.
- Keep outputs labeled by target `ref` when it exists, otherwise `app_id`.
- For remote path-based tasks, run `pterm upload <ref> <file...>` separately for each remote target when `ref` exists, otherwise fall back to `app_id`.
- Do not reuse one target's uploaded remote file path for another target.

## Behavior Rules

- Do not add app-specific hardcoding when user gave only capability (for example "tts").
- Do not guess hidden endpoints when docs/code are unclear; ask one targeted question.
- Do not rewrite launcher files unless user explicitly asked.
- When a task needs a local executable such as `python`, prefer resolving it with `pterm which <command>` before falling back to generic shell discovery.
- Prefer returning full logs over brittle deterministic error parsing.
- Pinokio control-plane REST endpoints may be used for diagnostics only when `pterm` is unavailable; do not claim full install/launch lifecycle completion without compatible `pterm` commands.
- Do not keep searching after app selection; move to Launch App.
- Do not assume `external_ready_urls` exists; localhost-only apps are normal.
- Do not conflate loopback access failure, sandbox denial, or missing permission with "Pinokio is not running" or "`pterm` is not installed."
- On `pterm` permission failure, prefer asking for permission over asking the user to manually run commands.
- If `pterm` exists locally but cannot reach the control plane, explicitly tell the user this looks like a client permission/sandbox issue.

## Example

User: "Launch FaceFusion"

1. Use Search App and then Launch App as usual.
2. If launcher menu has no explicit default item, infer ordered selectors from the current launcher menu.
3. Run:
   - if `ref` exists:
     `pterm run <ref> --default 'run.js?mode=Default' --default run.js --default install.js`
   - otherwise:
     `pterm run <app_path> --default 'run.js?mode=Default' --default run.js --default install.js`
4. Poll:
   - `pterm status <ref>` when `ref` exists
   - otherwise `pterm status <app_id>`
   until ready.

## gepeto
Source: ab426ea0b5d96a2d

# Development Guide for Pinokio Projects

## Non-Negotiable Execution Workflow

To guarantee every contribution follows this guide precisely, obey this checklist **before any edits** and **again before finalizing**. Do not skip or reorder.
1. **AGENTS Snapshot:** Re-open this file and write down (in your working notes or response draft) the exact sections relevant to the requested task. No work begins until this snapshot exists.
2. **Example Lock-in:** Identify the closest matching script in `/Users/wenyun/pinokio/prototype/system/examples`. Record its path and keep it open while editing. Every launcher change must mirror that reference unless the user explicitly instructs otherwise.
3. **Pre-flight Checklist:** Convert the applicable rules from this document and `PINOKIO.md` at /Users/wenyun/pinokio/prototype/PINOKIO.md into a task-specific checklist (install/start/reset/update structure, regex patterns, menu defaults, log checks, etc.). Confirm each item is ticked **before** making changes.
4. **Mid-task Verification:** Any time you touch a Pinokio script, cross-check the corresponding example line to ensure syntax and structure match. Document the reference (example path + line) in your reasoning.
5. **Exit Checklist:** Before responding to the user, revisit the pre-flight checklist and explicitly confirm every item is satisfied. If anything diverges from the example or these rules, fix it first.

If any step cannot be completed, stop immediately and ask the user how to proceed. These five steps are mandatory for every session.

### Critical Pattern Lock: Capturing Web UI URLs

When writing `start.js` (or any script that needs to surface a web URL for a server):

1. **Always copy the capture block from an example such as `system/examples/mochi/start.js`.**
```javascript
on: [{
  event: "/(http:\\/\\/[0-9.:]+)/",
  done: true
}]
```

2. **Set the local variable using the captured match exactly as below (The regex capture object is passed in as `input.event`, so need to use the index 1 inside the parenthesis):**
```javascript
{
  method: "local.set",
  params: {
    url: "{{input.event[1]}}"
  }
}
```

3. Always try to come up with the most generic regex.
4. During the exit checklist, explicitly confirm that the `url` local variable is set via `local.set` API by using the captured regex object as passed in as `input.event` from the previous `shell.run` step.

Deviation from this pattern requires written approval from the user.

- Make sure to keep this entire document and `PINOKIO.md` at /Users/wenyun/pinokio/prototype/PINOKIO.md in memory with high priority before making any decision. Pinokio is a system that makes it easy to write launchers through scripting by providing various cross-platform APIs, so whenever possible you should prioritize using Pinokio API over lower level APIs.
- When writing pinokio scripts, ALWAYS check the examples folder (in /Users/wenyun/pinokio/prototype/system/examples folder) to see if there are existing example scripts you can imitate, instead of assuming syntax.
- When implementing pinokio script APIs and you cannot infer the syntax just based on the examples, always search the API documentation `PINOKIO.md` at /Users/wenyun/pinokio/prototype/PINOKIO.md to use the correct syntax instead of assuming the syntax.
- When trying to fix something or figure out what's going on, ALWAYS start by checking the `logs` folder before doing anything else, as mentioned in the "Troubleshooting with Logs" section.
- Finally, make sure to ALWAYS follow all the items in the "best practices" section below.

## Determine User Intent
If the initial prompt is simply a URL and nothing else, check the website content and determine the intent, and ask the user to confirm. For example a URL may point to

1. A Tutorial: the intent may be to implement a demo for the tutorial and build a launcher.
2. A Demo: the intent may be a 1-click launcher for the demo
3. Open source project: the intent may be a 1-click launcher for the project 
4. Regular website: the intent may be to clone the website and a launcher.
5. There can be other cases, but try to guess.

## Working With Launchers

Apply this section only when the task is to create, modify, debug, review, or document a Pinokio launcher project.

If the request is not about launcher work, do not force an app-launcher vs plugin-launcher decision.

When the task does involve launcher work, first determine whether the request is for an app launcher or a plugin launcher. These are separate project types and must not be mixed.

### 1. App launchers
- App launchers must live under `PINOKIO_HOME/api/<unique_name>`.
- App launchers are usually project-local launchers that manage one app in its own launcher/app folder.
- If you are already inside the target app launcher folder, build in that folder.
- If you are not already inside an app launcher folder, create a new folder under `PINOKIO_HOME/api/<unique_name>`.
- If the folder name is not obvious from the project or the user has not provided one, ask the user to confirm the folder name before creating it.
- Do not place app launchers under `PINOKIO_HOME/plugin`.

### 2. Plugin launchers
- Plugin launchers must live under `PINOKIO_HOME/plugin/<unique_name>`.
- Plugin launchers are reusable shared tools that are installed once and then used across many different folders.
- If you are already inside the target plugin launcher folder, build in that folder.
- If you are not already inside a plugin launcher folder, create a new folder under `PINOKIO_HOME/plugin/<unique_name>`.
- If the folder name is not obvious from the project or the user has not provided one, ask the user to confirm the folder name before creating it.
- Do not place plugin launchers under `PINOKIO_HOME/api`.
- When a plugin is meant to operate on the user's current project, its `run` step should target the caller's folder with `{{args.cwd}}` instead of the plugin folder itself.

### 3. Apply structure rules only after choosing the launcher type
- App launchers and plugin launchers are peers. Do not treat a plugin launcher as a special case of an app launcher, or vice versa.
- Decide the launcher type and destination folder first, then apply the project structure and script rules below.

## Project Structure

Pinokio projects normally follow a standardized structure with app logic separated from launcher scripts:

Pinokio projects follow a standardized structure with app logic separated from launcher scripts:

```
project-root/
├── app/                 # Self-contained app logic (can be standalone repo)
│   ├── package.json     # Node.js projects
│   ├── requirements.txt # Python projects
│   └── ...              # Other language-specific files
├── README.md            # Documentation
├── install.js           # Installation script
├── start.js             # Launch script
├── update.js            # Update script (for updating the scripts and app logic to the latest)
├── reset.js             # Reset dependencies script
├── pinokio.js           # UI generator script
└── pinokio.json         # Metadata (title, description, icon)
```

- Keep app code in `/app` folder only (never in root)
- Store all launcher files in project root (never in `/app`)
- `/app` folder should be self-contained and publishable


The only exceptions are serverless web apps---purely frontend only web applications that do NOT have a server component and connect to 3rd party API endpoints--in which case the folder structure looks like the following (No need for launcher scripts since the index.html will automatically launch. The only thing needed is the metadata file named pinokio.json):

```
project-root/
├── index.html           # The serverless web app entry point
├── ...
├── README.md            # Documentation
└── pinokio.json         # Metadata (title, description, icon)
```

IMPORTANT: ALWAYS try to follow the best practices in the examples folder (/Users/wenyun/pinokio/prototype/system/examples) instead of trying to come up with your own structure. The examples have been optimized for the best user experience.

## Launcher Project Working Directory

- The project working directory for a script is always the same directory as the script location.
- For example, when you run `shell.run` API inside `pinokio/start.js`, the default path for shell execution is `pinokio`.
- If the launcher files are in the project root path, then the default path for shell execution is the project root.
- Therefore, it is important to specify the correct `path` attribute when running `shell.run` API commands.

Example: in the following project structure:

```
project-root/
├── pinokio/                 # Pinokio launcher folder
│    ├── start.js             # Launch script
│    ├── pinokio.js           # UI generator script
│    └── pinokio.json         # Metadata (title, description, icon)
└─── backend/
     ├── requirements.txt          # App dependencies
     └── app.py                    # App code
```

The `pinokio/start.js` should use the correct path `../backend` as the `path` attribute, as follows:

```
{
  run: [{
    ...
  }, {
    method: "shell.run",
    params: {
      message: "python app.py",
      venv: "env",
      path: "../backend"
    }
  }, {
    ...
  }]
}
```

## Development Workflow

### 1. Understanding the Project
- Check `SPEC.md` in project root. If the file exists, use that to learn about the project details (what and how to build)
- If no `SPEC.md` exists, build based on user requirements
### 2. Modifying Existing Launcher Projects
If we are starting with existing launcher script files, work with the existing files instead of coming up with your own.
- **Preserve existing functionality:** Only modify necessary parts
- **Don't touch working scripts:** Unless adding/updating specific commands
- **Follow existing conventions:** Match the style and structure already present
### 3. Try to adopt from examples as much as possible
- If starting from scratch, first determine what type of project you will be building, and then check the examples folder (/Users/wenyun/pinokio/prototype/system/examples) to see if you can adopt them instead of coming up everything from scratch.
- Even if there are no relevant examples, check the examples to get inspiration for how you would structure the script files even if you have to write from scratch.
### 4. Writing from scratch as a last resort
If there are relevant examples to adopt from, write the scripts from scratch, but just make sure to follow the requirements in the next section.
### 5. Debugging
When the user reports something is not working, ALWAYS inspect the logs folder to get all the execution logs. For more info on how this works, check the "Troubleshooting with Logs" section below.

## Script Requirements

### 1. 1-click launchable
- The main purpose of Pinokio is to provide an easy interface to invoke commands, which may include launching servers, installing programs, etc. Make sure the final product provides ways to install, launch, reset, and update whatever is needed.

### 2. Write Documentation
- ALWAYS write a documentation. A documentation must be stored as `README.md` in the project root folder, along with the rest of the pinokio launcher script files. A documentation file must contain:
  - What the app does
  - How to use the app
  - API documentation for programmatically accessing the app's main features (Javascript, Python, and Curl)

## Types of launchers
## 1. Launching servers
- When an app requires launching a server, here are the commonly used scripts:
  - `install.js`: a script to install the app
  - `start.js`: a script to start the app
  - `reset.js`: a script to reset all the dependencies installed in the `install.js` step. used if the user wants to restart from scratch
  - `update.js`: a script to update the launcher AND the app in case there are new updates. Involves pulling in the relevant git repositories installed through `install.js` (often it's the script repo and some git repositories cloned through the install steps if any)
  - `pinokio.js`: the launcher script that ties all of the above scripts together by providing a UI that links to these scripts.
  - `pinokio.json`: For metadata

Here's a basic server launcher script example (`start.js`). Unless there's a special reason you need to use another pattern, this is the most recommended pattern. Use this or adopt it as needed, but NEVER try something else unless there's a good reason you should not take this approach:

```javascript
module.exports = {
  // By setting daemon: true, the script keeps running even after all items in the `run` array finishes running. Mandatory for launching servers, since otherwise the shells running the server process will get killed after the scripts finish running.
  daemon: true,
  run: [
    {
      // The "shell.run" API for running a shell session
      method: "shell.run",
      params: {
        // Edit 'venv' to customize the venv folder path
        venv: "env",
        // Edit 'env' to customize environment variables (see documentation)
        env: { },
        // Edit 'path' to customize the path to start the shell from
        path: "app",
        // Edit 'message' to customize the commands, or to run multiple commands
        message: [
          "python app.py",
        ],
        on: [{
          // The regular expression pattern to monitor.
          // Whenever each "event" pattern occurs in the shell terminal, the shell will return,
          // and the script will go onto the next step.
          // The regular expression match object will be passed on to the next step as `input.event`
          // Useful for capturing the URL at which the server is running (in case the server prints some message about where the server is running)
          "event": "/(http:\/\/\\S+)/", 

          // Use "done": true to move to the next step while keeping the shell alive.
          // Use "kill": true to move to the next step after killing the shell.
          "done": true
        }]
      }
    },
    {
      // This step sets the local variable 'url'.
      // This local variable will be used in pinokio.js to display the "Open WebUI" tab when the value is set.
      method: "local.set",
      params: {
        // the input.event is the regular expression match object from the previous step
        // In this example, since the pattern was "/(http:\/\/\\S+)/", input.event[1] will include the exact http url match caputred by the parenthesis.
        // Therefore setting the local variable 'url'
        url: "{{input.event[1]}}"
      }
    }
  ]
}
```

## 2. Launching serverless web apps

- In case of purely static web apps WITHOUT servers or backends (for example an HTML based app that connects to 3rd party servers--either remote or localhost), we do NOT need the launcher scripts.
- In these cases, simply include `index.html` in the project root folder and everything should automatically work. No need for any of the pinokio launcher scripts. (Do 
- You still need to include the metadata file so they show up properly on pinokio:
  - `pinokio.json`: For metadata

## 3. Launching quick scripts without web UI

- In many cases, we may not even need a web UI, but instead just a simple way to run scripts.
- This may include TUI (Terminal User Interface) apps, a simple launcher 
- In these cases, all we need is the launcher file `pinokio.js`, which may link to multiple scripts. In this case, there are no web apps (no serverless apsp, no servers), but instead just the default pinokio launcher UI that calls a bunch of scripts.
- Here are some examples:
  - A pinokio script to toggle the desktop theme between dark and light
    - Write some code (python or javascript or whatever)
    - Write a `toggle.js` pinokio script that executes the code
    - Write a `pinokio.js` launcher script to create a sidebar UI that displays the `toggle.js` so the user can simply click the "toggle" button to toggle back and forth between desktop themes
  - A pinokio script to fetch some file
    - Write some code (python or javascript or whatever)
    - Write a `fetch.js` pinokio script that executes the code
    - Write a `pinokio.js` launcher script to create a sidebar UI that displays the `fetch.js` so the user can simply click the "fetch" button to fetch some data.
- You still need to include the metadata file so they show up properly on pinokio:
  - `pinokio.json`: For metadata

## API

This section lists all the script APIs available on Pinokio. To learn the details of how they are used, you can:
1. Check the examples in the /Users/wenyun/pinokio/prototype/system/examples folder
2. Read the `PINOKIO.md` at /Users/wenyun/pinokio/prototype/PINOKIO.md further documentation on the full syntax

### Script API

These APIs can be used to describe each step in a pinokio script:
- shell.run: run shell commands
- input: accept user input
- filepicker: accept file upload
- fs.write: write to file
- fs.read: read from file
- fs.copy: copy files
- fs.download: download files
- fs.link: create a symbolic link (or junction on windows) for folders
- fs.open: open the system file explorer at a given path
- fs.cat: print file contents
- jump: jump to a specific step
- local.set: set local variables for the currently running script
- json.set: update a json file
- json.rm: remove keys from a json file
- json.get: get values from a json file
- log: print to the web terminal
- net: make network requests
- notify: display a notification
- script.download: download a script from a git uri
- script.start: start a script
- script.stop: stop a script
- script.return: return values if the current script was called by a caller script, so the caller script can utilize the return value as `input`
- web.open: open a url in web browser
- hf.download: huggingfac-cli download API
### Template variables
The following variables are accessible inside template expressions (example `{{args.command}` in scripts, resulting in dynamic behaviors of scripts:
- input: An input is a variable that gets passed from one RPC call to the next
- args: args is the parameter object that gets passed into the script (via pinokio.js `params`). Unlike `input` which takes the value passed in from the immediately previous step, `args` is a global value that is the same through out the entire script execution.
- local: local variable object that can be set with `local.set` API
- self: refers to the script file itself (which is JSON or JavaScript). For example if `start.js` that's currently running has `daemon: true` set, `{{self.daemon}}` will evaluate to true.
- uri: The current script uri
- port: The next available port. Very useful when you need to launch an app at a specific port without port conflicts.
- cwd: The current script execution folder path
- platform: The current operating system. May be one of the following: `darwin`, `win32`, `linux`
- arch: The current system architecture. May be one of the following: x32, x64, arm, arm64, s390, s390x, mipsel, ia32, mips, ppc, ppc64
- gpus: array of available GPUs on the machine (example: `['apple']`, `['nvidia']`)
- gpu: the first available GPU (example: `nvidia`)
- current: The current variable points to the index of the currently executing instruction within the run array.
- next: The next variable points to the index of the next instruction to be executed. (null if the current instruction is the final instruction in the run array)
- envs: You can access the environment variables of the currently running process with envs object.
- which: Check whether a command exists and return its absolute path (example: `{{which('winget')}}`). This is the correct way to resolve command paths inside reproducible Pinokio scripts, including custom shell selection such as `shell: "{{which('bash')}}"`. If you are outside a Pinokio-managed shell and only need to inspect Pinokio's environment manually, use `pterm which <command>`, but do NOT copy that user-specific absolute path into launcher scripts.
- exists: Check whether a file or folder exists at the specified relative path (example: `"when": "{{!exists('app')}}"`). Can be used with the `when` attribute to determine a path's existence and trigger custom logic. Use relative paths and it will resolve automatically to the current execution folder. 
- running: Check whether a script file is running (example: `"when": "{{!running('start.js')}}"`). Can be used with the `when` attribute to determine a path's existence and trigger custom logic. Use relative paths and it will resolve automatically to the current execution folder. 
- os: Pinokio exposes the node.js os module through the os variable.
- path: Pinokio exposes the node.js path module through the os variable (example: `{{path.resolve(...)}}`

## System Capabilities
### Package Management (Use in Order of Preference)
The following package managers come pre-installed with Pinokio, so whenever you need to install a 3rd party binary, remember that these are available. Also, you can assume these are available and include the following package manager commands in Pinokio scripts:
1. **UV** - For Python packages (preferred over pip)
2. **NPM** - For Node.js packages  
3. **Conda** - For cross-platform 3rd party binaries
4. **Brew** - Mac-only fallback when other options unavailable
5. **Git** - Full access to git is available.
6. **Bun** - For managing bun packages
**Important:** Include all install commands in the install script for reproducibility.
### HTTPS Proxy Support
- All HTTP servers automatically get HTTPS endpoints
- Convention: `http://localhost:<PORT>` → `https://<PORT>.localhost`
- Full proxy list available at: `http://localhost:2019/config/`
### Pterm Features:
- **Clipboard Access:** Read from or Write to system clipboard via pinokio Pterm CLI (`pterm clipboard` command.)
- **Notifications:** Send desktop alerts via pinokio pterm CLI (`pterm push` command.)
- **Script Testing:** Run launcher scripts via pinokio pterm CLI (`pterm start` command.)
- **File Selection:** Use built-in filepicker for user file/folder input (`pterm filepicker` command.)
- **Command Path Resolution:** Inspect the absolute path of any command as seen by Pinokio via `pterm which <command>`. Use this for debugging or external local tooling, especially when a helper process did not inherit Pinokio's `PATH`, for example `pterm which bash` on Windows. Do NOT hardcode the returned absolute path into launcher scripts; use `which()` or `kernel.which()` in the script itself instead.
- **Git Operations:** Clone repositories, push to GitHub
- **GitHub Integration:** Full GitHub CLI support (`gh` commands)

## Troubleshooting with Logs
Pinokio stores the logs for everything that happened in terminal at the following locations, so you can make use of them to determine what's going on:

### Log Structure
In case there is a `pinokio` folder in the project root folder, you should be able to find the logs folder here:

```
pinokio/
└── logs/   # Direct user interaction logs
    ├── api/     # Launcher script logs (install.js, start.js, etc.)
    ├── dev/     # AI coding tool logs (organized by tool)
    └── shell/   # Direct user interaction logs
```

Otherwise, the `logs` folder should be found at project root:

```
logs/
├── api/     # Launcher script logs (install.js, start.js, etc.)
├── dev/     # AI coding tool logs (organized by tool)
└── shell/   # Direct user interaction logs
```

### Log File Naming
- Unix timestamps for each session
- Special "latest" file contains most recent session logs
- **Default:** Use "latest" files for current issues
- **Historical:** Use timestamped files for pattern analysis and the full history.

## Best practices
### 0. Always reference the logs when debugging
- When the user asks to fix something, ALWAYS check the logs folder first to check what went wrong. Check the "Troubleshooting with Logs" section.
### 1. Shell commands for launching programs
- Launch flags related
  - Try as hard as possible to minimize launch flags and parameters when launching an app. For example, instead of `python app.py --port 8610`, try to do `python app.py` unless really necessary. The only exception is when the only way to launch the app is to specify the flags.
- Launch IP related
  - Always try to find a way to launch servers at 127.0.0.1 or localhost, often by specifying launch flags or using environment variables. Some apps launch apps at 0.0.0.0 by default but we do not want this.
- Launch Port related
  - In case the app itself automatically launches at the next available port by default (for example Gradio does this), do NOT specify port, since it's taken care of by the app itself. Always try to minimize the amount of code.
  - If the install instruction says to launch at a specific port, don't use the hardcoded port they suggest since there's a risk of port conflicts. Instead, use Pinokio's `{{port}}` template expression to automatically get the next available port.
  - For example, if the instruction says `python app.py --port 7860`, don't use that hardcoded port since there might be another app running at that port. Instead, automatically assign the next available port like this: `python app.py --port {{port}}`
  - Note that the `{{port}}` expression always returns the next immediately available port for each step, so if you have multiple steps in a script and use `{{port}}` in multiple steps, the value will be different. So if you want to launch at the next available port and then later reuse that port, you will need to first use `{{port}}` to get the next available port, and save the value in local variable using `local.set`, and then use the `{{local.<variable_name>}}` expression later.
### 2. shell.run API
- When writing `shell.run` API requests, always use relative paths (no absolute paths) for the `path` field. For example, if you need to run a command from `app` folder, the `path` attribute should simply be `app`, instead of its full absolute path.
- If a launcher needs to use a command that Pinokio already provides, prefer resolving it with `{{which('command')}}` inside the script instead of assuming the command name will always be on `PATH`.
- Do NOT automatically avoid `bash`-based install commands on Windows. Pinokio's Windows environment includes `bash` through its bundled toolchain, so commands such as `curl -fsSL ... | bash` are acceptable when they run inside a Pinokio-managed shell and there is no simpler cross-platform alternative.
- If a Windows launcher needs to run the shell itself in bash instead of the default `cmd.exe`, set `shell: "{{which('bash')}}"` on the `shell.run` step.
- If a separate debugging process or external local tool did not inherit Pinokio's environment, you may use `pterm which <command>` to inspect what Pinokio would resolve. Do NOT turn that result into a hardcoded script path; for launcher scripts, always use `which()` or `kernel.which()` so the script stays reproducible across machines.
### 2. Package managers
- When installing python packages, try best to use `uv` instead of `pip` even if the install instruction says to use pip. Instead of `pip install -r requirements.txt`, you can simply use `uv pip install -r requirements.txt` for example. Even if the project's own README says use pip or poetry, first check if there's a way to use uv instead.
- When you need to install some global package, try to use `conda` as much as possible. Even on macs, `brew` should be only used if there are no `conda` options.
### 3. Minimal Always
- If you are starting with existing script files, before modifying, creating, or removing any script files, first look at `pinokio.js` to understand which script files are actually used in the launcher. The only script files used are the ones mentioned in the `pinokio.js` file. The `pinokio.js` file is the file that constructs the UI dynamically.
- Do not create a redundant script file that does something that already exists. Instead modify the existing script file for the feature. For example, do not create an `install.json` file for installation if `install.js` already exists. Instead, modify the `install.js` file.
- Pinokio accepts both JSON and JS script files, so when determining whether a script for a specific purpose already exists, check both JSON and JS files mentioned in the `pinokio.js` file. Do not create script files for rendundant purpose.
- When building launchers for existing projects cloned from a repository, try to stay away from modifying the project folder (the `/Users/wenyun/pinokio` folder), even if installations are failing. Instead, try to work around it by creating additional files in the launcher folder, and using those files IN ADDITION to the default project.
  - The only exception when you may need to make changes to the project folder is when the user explicitly wants to modify the existing project. Otherwise if the purpose is to simply write a launcher, the app logic folder should never be touched.
- When running shell commands, take full advantage of the Pinokio `shell.run` API, which provides features like `env`, `venv`, `input`, `path`, `sudo`, `on`, etc. which can greatly reduce the amount of script code.
  - Python apps: Always use virtual environments via `venv` attribute. This attribute automatically creates a venv or uses if it already exists.
### 4. Try to support Cross-platform as much as possible
- Use cross-platform shell commands only.
- This means, prefer to use commands that work on all platforms instead of the current platform.
- If there are no cross platform commands, use Pinokio's template expressions to conditionally use commands depending on `platform`, `arch`, etc.
- Also try to utilize Pinokio Pterm APIs for various cross-platform system features.
- If it is impossible to implement a cross platform solution (due to the nature of the project itself), set the `platform`, `arch`, and/or `gpu` attributes of the `pinokio.json` file to declare the limitation.
- Pinokio provides various APIs for cross-platform way of calling commonly used system functions, or lets you selectively run commands depending on `platform`, `arch`, etc.
### 5. Do not make assumptions about Pinokio API
- Do NOT make assumptions about which Pinokio APIs exist. Check the documentation.
- Do NOT make assumptions about the Pinokio API syntax. Follow the documentation.
### 6. Scripts must be able to replicate install and launch steps 100%
- The whole point of the scripts is for others to easily download and invoke them via Pinokio interface with one click. Therefore, do not assume the end user's system state, and make everything self-contained.
- When a 3rd party package needs to be installed, or a 3rd party repository needs to be downloaded, include them in the scripts.
### 7 Dynamic UI rendering
- The `pinokio.js` launcher script can change dynamically depending on the current state of the script execution. Which means, depending on what the file returns, it can determine what the sidebar looks like at any given moment of the script cycle.
  - `info.exists(relative_path)`: The `info.exists` can be used to check whether a relative path (relative to the script root path) exists. The `pinokio.js` file can determine which menu items to return based on this value at any given moment.
  - `info.running(relative_path)`: The `info.running` can be used to check whether a script at a relative path is currently running (relative to the script root path) exists. The `pinokio.js` file can determine which menu items to return based on this value at any given moment.
  - `info.local(relative_path)`: The `info.local` can be used to return all the local variables tied to a script that's currently running. The `pinokio.js` file can determine which menu items to return based on this value at any given moment.
  - `default`: set the `default` attribute on any menu item for whichever menu needs to be selected by default at a given step. Some example scenarios:
    - during the install process, the `install.js` menu item needs to be set as the `default`, so it automatically executes the script
    - when launching the `start.js` menu item needs to be set as the `default`, so it automatically executes the script
    - after the app has launched, the `default` needs to be set on the web UI URL, so the user is sent to the actual app automatically.
  - Check the examples in the /Users/wenyun/pinokio/prototype/system/examples folder to see how these are being used.
### 8. No need for stop scripts
- `pinokio.js` does NOT need a separate `stop` script. Every script that can be started can also be natively stopped through the Pinokio UI, therefore you do not need a separate stop script for start script
### 9. Writing launchers for existing projects
- When writing or modifying pinokio launcher scripts, figure out the install/launch steps by reading the project folder `app`.
- In most cases, the `README.md` file in the `/Users/wenyun/pinokio` folder contains the instructions needed to install and run the app, but if not, figure out by scanning the rest of the project files.
- Install scripts should work for each specific operating system, so ignore Docker related instructions. Instead use install/launch instructions for each platform.
### 10. Don't use Docker unless really necessary
- Some projects suggest docker as installation options. But even in these cases, try to find "development" options to launch the app without relying on Docker, as much as possible. We do not need Docker since we can automatically install and launch apps specifically for the user's platform, since we can write scripts that run cross platform.
### 11. pinokio.json
- Do not touch the `version` field since the version is the script schema version and the one pre-set in `pinokio.js` must be used.
- `icon`: It's best if we have a user friendly icon to represent the app, so try to get an image and link it from `pinokio.json`.
  - If the git repository for the `/Users/wenyun/pinokio` folder points to GitHub (for example https://github.com/<USERNAME>/<REPO_NAME>`, ask the user if they want to download the icon from GitHub, and if approved, get the `avatar_url` by fetching `https://api.github.com/users/<USERNAME>`, and then download the image to the root folder as `icon.png`, and set `icon.png` as the `icon` field of the `pinokio.json`. 
### 12. Gitignore
- When a launcher involves cloning 3rd party repositories, downloading files dynamically, or some files to be generated, these need to be included in the .gitignore file. This may include things like:
  - Cloning git repositories
  - Downloading files
  - Dynamically creating files during installation or running, such as Sqlite Databases, or environment variables, or anything specific to the user.
- Make sure these file paths are included in the .gitignore file, and if not, include them in .gitignore.

## AI Libraries (Pytorch, Xformers, Triton, Sageattention, etc.)
If the launcher has a dedicated built-in script named `torch.js`, it can be used as follows:

```
// install.js
module.exports = {
  run: [
    // Edit this step with your custom install commands
    {
      method: "shell.run",
      params: {
        venv: "venv",                // Edit this to customize the venv folder path
        path: "app",
        message: [
          "uv pip install -r requirements.txt"
        ],
      }
    },
    // Delete this step if your project does not use torch
    {
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          path: "app",
          venv: "venv",                // Edit this to customize the venv folder path
          // xformers: true   // uncomment this line if your project requires xformers
          // triton: true   // uncomment this line if your project requires triton
          // sageattention: true   // uncomment this line if your project requires sageattention
          // flashattention: true   // uncomment this line if your project requires flashattention
        }
      }
    },
  ]
}
```

The `torch.js` script also includes ways to install pytorch dependent libraries such as xformers, triton, sagetattention. If any of these libraries need to be installed, use the torch.js to install in order to install them cross platform.


## Quick Reference
### Essential Documentation
- **Pinokio Programming:** See `PINOKIO.md` at /Users/wenyun/pinokio/prototype/PINOKIO.md → "Programming Pinokio" section
- **Dynamic Menus:** See `PINOKIO.md` at /Users/wenyun/pinokio/prototype/PINOKIO.md → "Dynamic menu rendering" section  
- **CLI Commands:** See `PTERM.md` at /Users/wenyun/pinokio/prototype/PTERM.md
### Common Patterns
- **Python Virtual Env:** `shell.run` with `venv` attribute
- **Cross-platform Commands:** Always test on multiple platforms
- **Error Handling:** Check logs/api for launcher issues
- **GitHub Operations:** Use `gh` CLI for advanced GitHub features
## Development Principles
1. **Minimize Shell Usage:** Leverage API parameters instead of raw commands
2. **Maintain Separation:** Keep app logic and launchers separate
3. **Follow Conventions:** Match existing project patterns
4. **Test Thoroughly:** Use CLI to verify launcher functionality
5. **Document Changes:** Update relevant metadata and documentation
