---
title: "Trying to build an autonomous coding agent on my home server"
date: 2026-06-28T12:00:00-07:00
draft: false
categories: ["technology", "engineering"]
tags: ["agents", "automation", "self-hosting", "github", "llm"]
image: "agent-workflow.png"
---

I wanted a small engineering organization running on my home server.

The split I had in mind was important: I would use frontier models with strong
reasoning for architecture, planning, and technical specs, but the actual coding
work would be handled by local LLMs running on my own hardware. The goal was not
just autonomy. It was autonomy without a metered API bill ticking in the
background for every implementation task.

The idea was simple enough to say in one sentence: I write a spec, the spec gets
broken into pull-request-sized tasks, an AI builder implements each task, a
separate AI reviewer gives it a first pass, CI turns green, and then I or my
orchestrator reviews and merges the pull request.

![Autonomous coding agent workflow](/blog/autonomous-coding-agent-home-server/agent-workflow.png)

In my head the roles were clear:

- I work with frontier models and an orchestrator to design and decide.
- A builder agent uses local models to implement.
- A reviewer agent reviews with fresh context.
- GitHub is the coordination surface.
- Per-repository Obsidian docs are the durable knowledge layer.

It sounded like a fleet of junior engineers, each with their own laptop, working
through a queue while I stayed at the architecture and review layer.

I got surprisingly far. I also learned that the hard part is not the coding
model. The hard part is everything around the coding model.

## What I was trying to build

The workflow I wanted was:

1. I describe a product or engineering goal.
2. The orchestrator and I write a technical spec.
3. The spec is decomposed into small tasks.
4. Each task becomes a card for the agent.
5. The builder agent checks out the repository, reads the repo docs, implements
   the change, runs tests, commits, pushes, and opens a pull request.
6. A reviewer agent reviews the PR as a different GitHub identity.
7. The builder fixes reviewer comments or CI failures.
8. A deterministic controller waits until CI is green.
9. The PR is marked ready for orchestrator review.
10. The orchestrator reviews and merges, or requests changes.
11. The original task is complete only when the PR is merged.

The important constraint was that this had to work across multiple repositories.
A Laravel app, a Go CLI, a mobile app, and a frontend project should not all
have to pretend they share one development environment. Each repository has its
own dependencies, runtime services, secrets, tests, background workers, and
workflow.

That is where the project started to get more serious.

## Phase 1: get Hermes running

The first phase was basic infrastructure.

I deployed Hermes as its own Docker container on my home server. It was
unprivileged, did not get the host Docker socket, and only had its own data
directory mounted. I put it behind my internal network using SWAG and Pi-hole,
gave it a dashboard, added Telegram intake, created a GitHub bot account, wired
up a kanban board per repository, and wrote onboarding scripts so a new repo
could be attached with one command.

This part mostly worked.

The agent could receive work. It could keep state. It could talk to GitHub. It
could open pull requests. The repository docs acted as the knowledge layer, and
the task handoff process started to look real.

At this point it felt like the rest would be prompt design and a few scripts.

That was optimistic.

## Phase 2: find a local model backend that actually works

Hermes is tool-driven, so the model cannot merely be good at writing code. It
has to emit real structured tool calls that Hermes can parse and execute.

My first local attempt was qwen2.5-coder. It was a dead end. It could write code,
but it did not reliably produce native tool calls in the format Hermes needed.
It would dump JSON-shaped text into the message instead of making an actual tool
call. That is not a minor annoyance in an agent runtime. That is a fatal
integration failure.

Then I tried qwen3-coder locally on my GPU machine. This worked much better. It
could use tools and it was a plausible fallback, but it was slow and not
reliable enough for the full PR loop.

Then I tried a paid frontier model through an API. That worked beautifully. The
whole loop that had been clunky locally suddenly felt real. Tasks could move
from handoff to PR in about a minute.

But it was metered API usage. The cost model was exactly what I was trying to
avoid for a background autonomous system.

The next attempt was to use Codex through my ChatGPT subscription via OAuth.
Authentication worked, but the runtime became finicky. The provider path was
different from the plain API provider, model selection had to go through the
right validated picker, and the agent started returning unhelpful failures like
"no final response."

That was an early warning: model choice is not just about intelligence. It is
about tool calling, context length, authentication path, provider-specific
behavior, latency, failure modes, and cost.

## Phase 3: prove the GitHub loop on one real project

The first real target was a personal side project.

I built up repository docs: architecture notes, ADRs, phase plans, agent
conventions, and handoff notes. The agent was supposed to read those docs, take
a task, implement it, and open a pull request.

This did work in pieces.

Hermes could pick up cards, create branches, push commits, and open PRs. It
could use a GitHub bot account instead of my personal account. It could include
metadata in the PR body linking the PR back to the original card. It could be
nudged to follow Conventional Commits and repo-specific instructions.

But the moment I tried to make the loop autonomous, more state appeared:

- Is the agent still building?
- Is the PR waiting on CI?
- Has an internal reviewer looked at the latest head SHA?
- Did the reviewer leave comments?
- Did CI fail?
- Did the orchestrator request changes?
- Which original task should receive the feedback?
- When is the card actually done?

At first I wanted Hermes kanban to answer those questions. That was not the
right abstraction for the outside world. The orchestrator should not need to
read Hermes' internal board. GitHub had to become the external contract.

## Phase 4: split builder, reviewer, and babysitter

The next design was to create separate profiles:

- `builder`: implements tasks, opens PRs, fixes feedback.
- `reviewer`: reviews the PR with fresh context and a separate GitHub identity.
- `ci-babysitter`: watches CI and review state, then routes feedback or promotes
  the PR.

This clarified a lot.

The builder should not approve its own work. The reviewer should not push code.
The babysitter should not be an LLM loop. CI polling, label changes, readiness
checks, and routing should be deterministic automation.

The PR state contract became:

- Draft PR means Hermes is still working.
- A broad `hermes` label means this PR came from the agent workflow.
- `hermes:building` means the internal loop is not done.
- `hermes:needs-fix` means the builder should respond.
- `orchestrator:review` means the orchestrator can look at it.
- Merge means the original task is done.

I also learned that task IDs should not be GitHub labels. They are too narrow
and too noisy. Task linkage belongs in PR body metadata or hidden comments.

This phase exposed several implementation mistakes:

- The reviewer initially posted from the wrong GitHub account because identity
  boundaries were not strict enough.
- Hermes' built-in `review` kanban state conflicted with the GitHub-first flow.
- Feedback sometimes created new cards instead of updating the original task.
- A synchronous reviewer pass could block the whole babysitter loop.
- If a PR was merged, an open-PR poller would never see it again, so something
  else had to sweep merged PRs and close the original task.

These are not prompt problems. They are state machine problems.

## Phase 5: the real wall was the development environment

The biggest lesson came from a much more mundane place: missing binaries and
runtime setup.

The builder failed because the language runtime was missing. Then the package
manager mattered. Then private package authentication mattered. Then `.env`
setup mattered. Then SQLite and migrations mattered. Then Playwright and browser
dependencies mattered. Then background workers and app processes mattered.

That is when the simple mental model broke.

I cannot expect a builder to avoid installing project dependencies. If the task
requires a new billing library, the builder should be able to run `composer
require` or `npm install` and commit the lockfile. That is normal development
work.

But I also do not want an LLM improvising host infrastructure. It should not
install system packages into the agent host, modify Docker privileges, invent
service setup, or guess production secrets.

So there is a boundary:

- Project dependencies are builder work.
- Host and workspace infrastructure are orchestrator or operator work.

The problem is that I had not built the workspace infrastructure layer.

For a real multi-repo system, each repository needs a reproducible agent runtime.
Something like:

- a dev container or agent image
- a compose file for services
- a setup script for ignored local files
- database creation and migrations
- package-manager caches
- headless browser availability
- bounded verification commands
- health checks that say "this repo is ready for an agent"

Without that, the agent is not a junior engineer with a laptop. It is a junior
engineer dropped into a random empty shell and asked to infer the entire
development environment.

That does not scale.

## Phase 6: stop and remove the runtime

At this point I had enough working pieces to prove the concept, but not enough
confidence to leave it running.

I removed the Hermes runtime from my home server and kept the docs.

That felt like a step backward, but it was probably the right engineering
decision. The experiment had produced useful design constraints, and the next
version should be built from those constraints instead of from incremental
patches around a fragile loop.

## What worked

The overall workflow is plausible.

An agent can take a scoped task, edit code, commit, push a branch, and open a PR.
The GitHub PR is the right artifact. Separate builder and reviewer identities
make sense. Repo docs are valuable. Handoff notes are useful. A kanban board can
work as an internal queue.

Most importantly, the human workflow felt right when it worked. I do not want to
watch an agent type. I want to review finished pull requests with clear context,
tests, and a bounded diff.

That part still feels like the right target.

## What did not work

I underestimated the infrastructure around autonomous coding.

The first shortcoming was environment reproducibility. A coding agent needs a
working app, not just source code. It needs package managers, language runtimes,
local services, test databases, browsers, queues, and credentials or safe stubs.

The second shortcoming was workflow state. "Open a PR" is not the end of a task.
The task is done when the PR is merged. Everything between those two points
needs explicit state: review, CI, requested changes, retries, escalation, and
cleanup.

The third shortcoming was relying too much on the agent runtime's own concepts.
Hermes kanban is useful internally, but it should not be the external source of
truth. The orchestrator should be able to understand the world by reading
GitHub.

The fourth shortcoming was mixing deterministic automation with LLM work. Agents
can write code and review code. They should not be responsible for polling CI,
enforcing retry limits, deduplicating comments, or deciding when a PR becomes
externally reviewable. That belongs in a controller.

The fifth shortcoming was cost and model portability. A great hosted model made
the system feel alive, but metered usage changes the economics. Local models
reduce cost but introduce capability, latency, and tool-calling problems.
Subscription-backed models are attractive but have their own integration quirks.

## The architecture I would try next

If I restart this, I would not begin with "one Hermes container that can do
everything."

I would build four layers.

First, GitHub as the coordination contract:

- batch issue for the overall plan
- PRs linked to tasks
- broad labels for workflow state
- PR body metadata for machine-readable linkage
- comments and reviews as the feedback channel

Second, a deterministic PR controller, probably in Go:

- watches configured repositories
- parses PR metadata
- reads checks, reviews, comments, and labels
- enqueues reviewer jobs
- routes feedback to the original task
- marks PRs ready only when CI and reviewer pass
- tracks review rounds
- sweeps merged PRs and closes tasks
- emits logs and metrics

Third, a runner or workspace manager:

- creates isolated worktrees per task
- selects the repo's runtime capsule
- installs project dependencies
- starts services
- prepares ignored local state
- exposes browsers and test runners
- runs health checks before the builder starts

Fourth, repo-owned runtime contracts:

```text
docs/agents/runtime.yaml
.devcontainer/agent.json
compose.agent.yaml
docs/agents/scripts/prepare-env.sh
```

The exact filenames matter less than the contract. Each repo must explain how an
agent gets from "fresh checkout" to "working application I can test."

Hermes, or another agent runtime, would sit inside that system as the coding
worker. It would not own the whole system.

## Questions I still need to answer

The next design needs sharper answers to these questions:

- How much isolation does each task need: worktree, container, VM, or separate
  machine?
- Should there be one agent fleet per repository, or one shared fleet with
  repo-specific runtimes?
- What is the minimum runtime contract every repo must provide?
- How are secrets provided safely without giving agents production power?
- How do agents run browser tests without turning the host into a giant mutable
  workstation?
- How many review/fix rounds should be automatic before human escalation?
- Which failures should create a blocker instead of letting the builder keep
  trying?
- How do I measure agent productivity without creating a noisy dashboard?
- What is the fallback path when the preferred model backend is unavailable?

Those questions are more important than whether the next implementation uses
Hermes specifically.

## The main lesson

Autonomous coding is less like running a chatbot and more like running a small
CI platform with write access to your repositories.

The LLM is only one part of it. The rest is identity, isolation, reproducible
development environments, deterministic workflow state, observability, secrets,
retry limits, and human review boundaries.

I started by trying to give an agent a task queue.

I ended by realizing I need to build the office around the agents: laptops,
permissions, project setup, code review process, CI policy, and a manager that
knows when to stop them.

That is more challenging than I initially envisioned, but it is also a much
clearer problem now.
