---
title: "My home server is my personal edge cloud"
date: 2026-05-29T13:00:00-07:00
draft: false
categories: ["technology", "engineering"]
tags: ["homelab", "self-hosting", "infrastructure", "ai", "devops"]
image: "home-server-rack.jpeg"
---

I do not think of my home server as a hobby box anymore.

It started like a lot of self-hosting projects start: a machine in the house,
some Docker containers, a few services I wanted to own instead of rent, and the
kind of curiosity that makes you ask "what if I just ran this myself?"

But the goal changed as the setup grew. I was not trying to build a museum of
containers. I was trying to build a personal platform: a small, always-on,
programmable cloud close to my data, my tools, my side projects, and eventually
my AI workflows.

![Home server rack](/blog/personal-edge-cloud-home-server/home-server-rack.jpeg)

The simplest version of the thesis is:

> This is not just a server in my house. It is my personal developer platform:
> small enough to understand, powerful enough to matter.

Cloud made developers powerful because it gave us programmable infrastructure on
demand. AI is making local, private, programmable infrastructure interesting
again. Not because the cloud is going away, and not because a home server can
compete with hyperscalers. It cannot. The value is different.

A home server is cheap to leave running. It is close to personal data. It can
host tools that are too private, too experimental, too weird, or too small to
justify a cloud bill. It can be a deployment target, a monitoring lab, a media
system, a local AI runtime, and a place where side projects become real deployed
software instead of folders on a laptop.

That is what I wanted.

## The Shape Of The System

The important part is not the number of machines. The important part is the
separation of concerns.

![Home server network architecture](/blog/personal-edge-cloud-home-server/network-architecture.svg)

The setup is split across a few purpose-built hosts:

- `andromon` is the main service box: storage, media, self-hosted apps, SWAG,
  monitoring, and most Docker services.
- `tentomon` is the small network control plane: Pi-hole, local DNS, Cloudflare
  DDNS, and uptime checks.
- `greymon` is the local AI and GPU workstation: Ollama, Open WebUI, image/video
  generation, and heavier compute.
- `wormmon` is the app hosting lane: Coolify, side projects, preview
  deployments, and Docker Compose based app runtimes.

Those names are silly, but the split is serious. Each machine has a job. That
keeps the system understandable and makes failures easier to reason about.

Public traffic lands through Cloudflare DNS and my router, then reaches SWAG on
`andromon`. SWAG decides which services are exposed. Internal names resolve
through Pi-hole, so home devices can use clean names without hairpinning through
the public internet. Tailscale is the private administration path.

That gives me a tiny version of a real platform:

- DNS
- ingress
- storage
- deployment
- observability
- private services
- public services
- local AI runtime

It is not enterprise scale. That is the point. It is small enough that I can
own the whole thing end to end.

## Self-Hosting As Practical Infrastructure

The most obvious layer is the self-hosted apps.

![Home dashboard](/blog/personal-edge-cloud-home-server/home-dashboard.png)

I run the usual categories:

- Media through Plex, Jellyfin, Navidrome, and automation around the *arr stack.
- Files and personal data through Nextcloud, Immich, and Paperless.
- Friend-facing request flows through Seerr.
- Operations through Grafana, Prometheus, cAdvisor, node exporters, and Uptime
  Kuma.

There is a tempting way to talk about self-hosting where the entire argument is
"I can replace SaaS." That is partly true, but it is not the best reason.

The better reason is that I can inspect, automate, back up, and integrate the
services I use every day. The system becomes mine in a practical way. If
something is slow, I can see why. If something fails, I can learn from it. If I
want two services to talk to each other, I do not have to wait for a product
roadmap.

Self-hosting turned my house into a small production environment.

That sounds like overkill, but it is also how you learn operations. You learn
where secrets live. You learn how DNS breaks. You learn why backups matter. You
learn why observability should exist before the outage. You learn the difference
between "the container is running" and "the service is healthy."

## Treating Home Like Production

I did not want this to become a fragile stack of snowflake containers.

The home-server repo is Ansible-based. Secrets are in encrypted vault files.
Host variables define what should run where. SWAG proxy configs, DNS records,
Pi-hole records, monitoring targets, storage expectations, and service roles
are all meant to be repeatable.

![Grafana dashboard](/blog/personal-edge-cloud-home-server/grafana-dashboard.png)

Grafana is not there because a home server needs enterprise cosplay. Grafana is
there because boring visibility is useful.

I want to know:

- Are the hosts up?
- Are disks healthy?
- Did backups run?
- Are containers consuming strange amounts of CPU or memory?
- Is the public status page seeing outages?
- Are drive temperatures normal?

When the audience is only me, it is easy to skip this. But that is exactly why
it is useful. There is no operations team coming to save me. The system either
tells me what is wrong, or I am guessing.

The recovery docs matter for the same reason. A home server is fun when it is
working. It becomes real infrastructure when you ask, "Can I rebuild this from a
fresh laptop if something goes wrong?"

That forced me to write down where the vault files live, how to recover the
operator environment, how to restore from backups, and which manual steps still
exist. Documentation is not decoration here. It is part of the infrastructure.

## Coolify As My Personal PaaS

One of the most important pieces is `wormmon`, the app hosting lane.

The idea is simple: I wanted something that felt like Heroku for myself, on my
own hardware.

Coolify gives me that shape:

- push code to a repo
- deploy through Docker or Docker Compose
- attach environment variables
- create app-local databases
- expose a domain
- get logs, redeploys, and rollback paths

For side projects, that matters more than it sounds. A project that only runs on
my laptop is easy to abandon. A project with a URL, logs, a database, and a
repeatable deployment path becomes a real thing much sooner.

The deployment path I want is:

1. Start with an idea.
2. Generate or scaffold the first version.
3. Standardize the app shape with deployment metadata.
4. Push to Git.
5. Let Coolify deploy it on my own hardware.
6. Observe, iterate, and throw it away if it is not worth keeping.

That loop is the developer platform version of the home server. It is not just
about running apps. It is about making deployment a habit instead of an event.

## Local AI Needs A Place To Operate

The AI part is where the home server started to feel newly relevant.

![Local AI stack](/blog/personal-edge-cloud-home-server/local-ai-stack.svg)

Frontier models are not going away. I still want them for architecture, hard
reasoning, planning, and review. But local models have a different advantage:
they can sit close to private tools and private data.

That is what `greymon` is for.

It gives me a local AI lane for:

- Ollama and local LLM inference
- Open WebUI as a familiar chat surface
- image and video generation experiments
- private data experiments
- tools that can see the home platform without sending everything elsewhere

The model is only part of the system. An agent also needs tools, permissions,
memory, logs, sandboxes, deployment targets, and safe operating boundaries.

That was one of the biggest lessons from trying to build autonomous coding
agents. A model answering a prompt is useful. A model operating against a real
platform is a different problem. It needs a place to work.

My home server gives AI that place. Not unlimited power. Not direct access to
everything. A bounded environment close to my data, my deploys, my dashboards,
and my experiments.

## What I Actually Wanted To Own

The project is not really about saving money.

It is also not about avoiding cloud providers. I still use cloud services. I
still use GitHub, Cloudflare, hosted models, managed email, and plenty of SaaS.

What I wanted to own was the middle layer:

- the place where private data lives
- the place where personal services run
- the place where side projects can deploy
- the place where local AI can use tools
- the place where I can practice production-shaped operations at a human scale

That middle layer is valuable because it compounds. Every service teaches me
something. Every outage improves the runbook. Every dashboard adds context.
Every app deployment improves the platform. Every local AI experiment gets a
little closer to being useful because the surrounding tools already exist.

At work, infrastructure is usually divided across teams, vendors, permissions,
and risk boundaries. At home, the blast radius is small enough that I can hold
the whole system in my head.

That is rare and useful.

## The Tradeoffs

Running your own infrastructure is not free just because the server is in your
house.

You pay in maintenance. You pay in attention. You pay in replacement parts,
drive health, backups, power, DNS mistakes, certificate issues, container
updates, and the occasional evening where you wanted to build a product but
ended up debugging networking.

There is also a security responsibility. Exposing services from home means I
need to be deliberate about what is public, what is internal-only, how secrets
are stored, and what happens when something is compromised.

So the right lesson is not "everyone should self-host everything."

The lesson is more specific:

> Own a small piece of programmable infrastructure if it gives you leverage.

For me, the leverage is learning, privacy, side-project velocity, local AI, and
control over my daily tools.

## The Takeaway

The cloud is not going away. Frontier models are not going away. SaaS is not
going away.

But there is a useful space between "everything lives on my laptop" and
"everything lives in someone else's cloud." That space is personal
infrastructure.

My home server sits in that space.

It gives me compute I control, services I can inspect, data that stays close,
deployments that feel real, observability that teaches me, and a platform where
AI agents can eventually do more than chat.

In the AI era, owning programmable infrastructure is leverage.
