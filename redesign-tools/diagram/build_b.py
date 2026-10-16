"""Rao research brain diagram: sources -> brain -> two branches (Rao agents, your tools).

Writes two SVGs: a wide one for desktop and a stacked one for phones.
"""
import json
import math
import sys

OUT = sys.argv[1]
P = json.load(open(sys.argv[2]))
CLAUDE, OPENAI = P["CLAUDE_PATH"], P["OPENAI_PATH"]

# Each source gets a unique (color, shape) marker, used in its card and inside the brain.
SRC = [("Code & scripts", "c1", "sq"), ("Notebooks", "c4", "ci"), ("Papers & PDFs", "c3", "tr"),
       ("Data files", "c4", "sq"), ("Past AI sessions", "c2", "ci"),
       ("Notion", "c3", "ci"), ("GitHub", "c5", "sq"), ("Google Docs", "c1", "tr"), ("Google Sheets", "c2", "tr")]
LOCAL, APPS = SRC[:5], SRC[5:]
APP_LOGO = {"Notion": "logos/notion-logo.png", "GitHub": "logos/github.svg",
            "Google Docs": "logos/gdocs.svg", "Google Sheets": "logos/gsheets.svg"}
AGENTS = ["Digest", "Ideas on Slack", "Report generation"]
TOOLS = ["Claude Code", "Codex", "Cursor", "Claude Science"]


def esc(t):
    return t.replace("&", "&amp;")


def mark(kind, c, x, y, r):
    if kind == "ci":
        return f'<circle class="nd {c}" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>'
    if kind == "sq":
        return f'<rect class="nd {c}" x="{x - r:.1f}" y="{y - r:.1f}" width="{2 * r:.1f}" height="{2 * r:.1f}"/>'
    h = r * 1.2
    return f'<path class="nd {c}" d="M{x:.1f} {y - h:.1f} L{x + h:.1f} {y + h * .8:.1f} L{x - h:.1f} {y + h * .8:.1f} Z"/>'


# Simple white glyphs on indigo tiles for Rao's own agents.
GLYPH = {
    "Digest": 'M7 6h10M7 10h10M7 14h6',
    "Ideas on Slack": None,  # uses the Slack mark
    "Report generation": 'M8 5h6l3 3v11H8zM14 5v3h3M10 12h5M10 15h5',
    "Delegated agents": 'M6 12h9M12 8l4 4-4 4M18 6v12',
}


def icon(name, x, y):
    if name == "Ideas on Slack":
        return f'<rect x="{x}" y="{y}" width="22" height="22" rx="5" class="ic-bg-w"/><image href="logos/slack.svg" x="{x + 4}" y="{y + 4}" width="14" height="14"/>'
    if name in GLYPH:
        return (f'<rect x="{x}" y="{y}" width="22" height="22" rx="5" class="ic-bg-i"/>'
                f'<g transform="translate({x - 1},{y - 1})"><path d="{GLYPH[name]}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>')
    if name in ("Claude Code", "Claude Science"):
        return f'<rect x="{x}" y="{y}" width="22" height="22" rx="5" fill="#d97757"/><g transform="translate({x + 4},{y + 4}) scale(0.5833)"><path fill="#fff" d="{CLAUDE}"/></g>'
    if name == "Codex":
        return f'<rect x="{x}" y="{y}" width="22" height="22" rx="5" fill="#16161a"/><g transform="translate({x + 4},{y + 4}) scale(0.5833)"><path fill="#fff" d="{OPENAI}"/></g>'
    return f'<image href="logos/cursor.svg" x="{x}" y="{y}" width="22" height="22"/>'


def graph(cx, cy, scale):
    inner_t = [0, 1, 2, 4, 7]
    outer_t = [0, 3, 2, 5, 6, 1, 4, 8, 7, 0]
    nodes = []
    for i, t in enumerate(inner_t):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        nodes.append((cx + 48 * scale * math.cos(a), cy + 48 * scale * math.sin(a), t))
    for i, t in enumerate(outer_t):
        a = -math.pi / 2 + (i + 0.5) * 2 * math.pi / 10
        nodes.append((cx + 104 * scale * math.cos(a), cy + 104 * scale * math.sin(a), t))
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (0, 2), (1, 3)]
    for i in range(10):
        o = 5 + i
        edges.append((o, (i // 2) % 5))
        if i % 2 == 0:
            edges.append((o, 5 + (i + 1) % 10))
        if i % 3 == 0:
            edges.append((o, ((i // 2) + 1) % 5))
    out = [f'<line class="edge" x1="{nodes[a][0]:.1f}" y1="{nodes[a][1]:.1f}" x2="{nodes[b][0]:.1f}" y2="{nodes[b][1]:.1f}"/>' for a, b in edges]
    for x, y, t in nodes:
        _, c, k = SRC[t]
        out.append(mark(k, c, x, y, 8 * max(scale, 0.8)))
    return out


def app_card(name, x, y, w, c, k):
    """A connected app: its brain marker on the left, name, and its logo at the far right."""
    return (f'<rect class="card" x="{x}" y="{y}" width="{w}" height="34"/>{mark(k, c, x + 16, y + 17, 6)}'
            f'<text class="lb lbs" x="{x + 32}" y="{y + 22}">{esc(name)}</text>'
            f'<image href="{APP_LOGO[name]}" x="{x + w - 28}" y="{y + 8}" width="18" height="18"/>')


def group(x, y, w, title, items, cls):
    """A labelled box holding a 2x2 grid of items."""
    cols = 1 if len(items) % 2 else 2
    rows = (len(items) + cols - 1) // cols
    step = 50 if cols == 2 else 44
    h = 40 + rows * step + (10 if cols == 2 else 12)
    o = [f'<rect class="grp {cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="4"/>',
         f'<text class="gt" x="{x + 16}" y="{y + 26}">{title}</text>']
    cw = (w - 16 * 2 - 10 * (cols - 1)) / cols
    for i, name in enumerate(items):
        cx = x + 16 + (i % cols) * (cw + 10)
        cy = y + 40 + (i // cols) * step
        o.append(f'<rect class="card" x="{cx:.1f}" y="{cy}" width="{cw:.1f}" height="38"/>{icon(name, cx + 10, cy + 8)}'
                 f'<text class="lb lbs" x="{cx + 40:.1f}" y="{cy + 24}">{esc(name)}</text>')
    return o, h


def wide():
    CX, CY, R = 540, 265, 140
    H = 506
    o = [f'<svg class="rd-brain-svg" viewBox="0 24 1200 {H - 24}" role="img" aria-labelledby="rdBrainTitle" xmlns="http://www.w3.org/2000/svg">',
         '<title id="rdBrainTitle">Rao reads your code, notebooks, papers, data files, and past AI sessions, plus the Notion, GitHub, Google Docs, and Google Sheets you connect, and connects them into the Rao research brain. The research brain powers Rao\'s own agents (the digest, ideas on Slack, and report generation) and makes your tools smarter: Claude Code, Codex, Cursor, and Claude Science.</title>',]
    lw = 250
    ly = [44 + i * 44 for i in range(len(LOCAL))]
    gy = ly[-1] + 34 + 22
    ay = [gy + 38 + i * 42 for i in range(len(APPS))]
    for y in ly:
        o.append(f'<path class="flow" d="M{20 + lw} {y + 17} C {lw + 90} {y + 17}, {CX - R - 80} {CY}, {CX - R} {CY}"/>')
    gmid = gy + (38 + len(APPS) * 42) / 2
    o.append(f'<path class="flow strong" d="M{20 + lw} {gmid} C {lw + 90} {gmid}, {CX - R - 80} {CY}, {CX - R} {CY}"/>')
    gx, gw = 790, 390
    ty, by = 44, 338
    ga, _ = group(gx, ty, gw, "RAO AGENTS", AGENTS, "agents")
    gtl, gth = group(gx, by, gw, "YOUR TOOLS, SMARTER", TOOLS, "tools")
    by = 486 - gth
    o.append(f'<path class="flow strong" d="M{CX + R} {CY} C {CX + R + 70} {CY}, {gx - 70} {ty + 74}, {gx} {ty + 74}"/>')
    o.append(f'<path class="flow strong" d="M{CX + R} {CY} C {CX + R + 70} {CY}, {gx - 70} {by + 74}, {gx} {by + 74}"/>')
    o.append(f'<text class="rao" x="{CX}" y="{CY - R - 16}" text-anchor="middle">Rao</text>')
    o.append(f'<circle class="core" cx="{CX}" cy="{CY}" r="{R}"/>')
    o += graph(CX, CY + 4, R / 150)
    o.append(f'<text class="cap" x="{CX}" y="{CY + R + 32}" text-anchor="middle">Research brain</text>')
    for (t, c, k), y in zip(LOCAL, ly):
        o.append(f'<rect class="card" x="20" y="{y}" width="{lw}" height="34"/>{mark(k, c, 38, y + 17, 6)}<text class="lb" x="56" y="{y + 22}">{esc(t)}</text>')
    gh = 38 + len(APPS) * 42 + 4
    o.append(f'<rect class="grp" x="20" y="{gy}" width="{lw}" height="{gh}" rx="4"/>')
    o.append(f'<text class="gt" x="36" y="{gy + 24}">CONNECTED APPS</text>')
    for (t, c, k), y in zip(APPS, ay):
        o.append(app_card(t, 32, y, lw - 24, c, k))
    g, _ = group(gx, ty, gw, "RAO AGENTS", AGENTS, "agents")
    o += g
    g, _ = group(gx, by, gw, "YOUR TOOLS, SMARTER", TOOLS, "tools")
    o += g
    o.append('</svg>')
    return "\n".join(o)


def tall():
    W, CX, R = 600, 300, 118
    o = []
    for i, (t, c, k) in enumerate(LOCAL):
        x = 20 + (i % 2) * 290
        y = 40 + (i // 2) * 46
        o.append(f'<rect class="card" x="{x}" y="{y}" width="270" height="36"/>{mark(k, c, x + 18, y + 18, 6)}<text class="lb" x="{x + 36}" y="{y + 23}">{esc(t)}</text>')
    gy = 40 + 3 * 46 + 6
    o.append(f'<rect class="grp" x="20" y="{gy}" width="560" height="{38 + 2 * 44 + 6}" rx="4"/>')
    o.append(f'<text class="gt" x="36" y="{gy + 24}">CONNECTED APPS</text>')
    for i, (t, c, k) in enumerate(APPS):
        x = 32 + (i % 2) * 274
        y = gy + 36 + (i // 2) * 44
        o.append(app_card(t, x, y, 262, c, k))
    top = gy + 38 + 2 * 44 + 6
    CY = top + 60 + R + 30
    ends = CY - R - 38
    o.append(f'<path class="flow strong" d="M{CX} {top} L {CX} {ends}"/>')
    o.append(f'<text class="rao" x="{CX}" y="{CY - R - 14}" text-anchor="middle">Rao</text>')
    o.append(f'<circle class="core" cx="{CX}" cy="{CY}" r="{R}"/>')
    o += graph(CX, CY + 4, R / 150)
    o.append(f'<text class="cap" x="{CX}" y="{CY + R + 30}" text-anchor="middle">Research brain</text>')
    y0 = CY + R + 56
    o.append(f'<path class="flow strong" d="M{CX} {y0 - 8} C {CX} {y0 + 14}, 150 {y0 + 6}, 150 {y0 + 30}"/>')
    o.append(f'<path class="flow strong" d="M{CX} {y0 - 8} C {CX} {y0 + 14}, 450 {y0 + 6}, 450 {y0 + 30}"/>')
    g, h = group(20, y0 + 32, 560, "RAO AGENTS", AGENTS, "agents")
    o += g
    g, h2 = group(20, y0 + 32 + h + 16, 560, "YOUR TOOLS, SMARTER", TOOLS, "tools")
    o += g
    H = y0 + 32 + h + 16 + h2 + 10
    head = (f'<svg class="rd-brain-svg rd-brain-v" viewBox="0 20 {W} {H - 20}" role="img" aria-label="Rao reads your project sources and connected apps, connects them into the Rao research brain, '
            f'and uses it to power Rao\'s agents and make your tools smarter." xmlns="http://www.w3.org/2000/svg">')
    return head + "\n" + "\n".join(o) + "\n</svg>"


open(OUT + "/brain-wide.svg", "w").write(wide())
open(OUT + "/brain-tall.svg", "w").write(tall())
print("ok")
