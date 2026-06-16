# Figma → LumisXP

<p align="center">
  <strong>Fetch · Generate · Transform</strong>
</p>

<p align="center">
  Convert Figma designs into dynamic LumisXP templates using XML data.
</p>

<p align="center">
  <em>An OpenCode skill for CMS template developers. From design to deploy, in one session.</em>
</p>

<p align="center">
  <a href="#installation">Install</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#example">Example</a>
</p>

---

## What This Does

Building LumisXP templates is repetitive. Open Figma, inspect each layer, copy CSS values, map XML fields, write scriptlets by hand, repeat. One change in the design means redoing half the work.

**Figma → LumisXP automates the pipeline:**

1. **Fetch** — Extracts the full component tree from Figma via REST API (structure, styles, text, layout, colors)
2. **Generate** — Converts the Figma tree into clean HTML/CSS with proper BEM naming and responsive breakpoints
3. **Transform** — Reads your LumisXP XML data, maps fields to the HTML, and outputs a dynamic template with `lum_xpath.getMaps()`, `<% %>` scriptlets, `<%= %>` interpolation, and `lum_out.print()` for rich content

**Result:** A production-ready LumisXP template in minutes, not hours.

---

## Before & After

| Without figma-to-lumis | With figma-to-lumis |
|---|---|
| Inspect Figma layer by layer | One API call fetches the full tree |
| Copy CSS values manually (colors, spacing, fonts) | Styles extracted automatically |
| Guess field names from the XML | XML is read and mapped exactly |
| Write `<% for %>` loops by hand | Loops generated from repeated elements |
| Rich text markup容易出错 | `lum_out.print()` applied to HTML-escaped fields |
| Template drifts from design over time | Template mirrors the Figma source of truth |

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                   STAGE 1: Figma → HTML                  │
│                                                          │
│  Figma URL + Token                                       │
│       │                                                  │
│       ▼                                                  │
│  GET api.figma.com/v1/files/{key}/nodes?ids={node}       │
│       │                                                  │
│       ▼                                                  │
│  Parse JSON tree: types, styles, layout, text, colors    │
│       │                                                  │
│       ▼                                                  │
│  Generate HTML/CSS: BEM naming, responsive breakpoints,  │
│  light/dark theme variables, interactive JS              │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│               STAGE 2: HTML + XML → LumisXP              │
│                                                          │
│  HTML/CSS + XML data file                                │
│       │                                                  │
│       ▼                                                  │
│  Extract fields from XML: names, hierarchy, rich text,   │
│  sorting, filters                                         │
│       │                                                  │
│       ▼                                                  │
│  Replace static content:                                 │
│    · Text → <%= row.title %>                             │
│    · Images → <%= row.image.href %>                      │
│    · Rich HTML → <% lum_out.print(row.linkContent) %>    │
│    · Lists → <% for (var i in rows) { %> ... <% } %>     │
│    · Hierarchy → lum_xpath.getMaps("//data/row[...]")    │
│       │                                                  │
│       ▼                                                  │
│  Output: production-ready LumisXP template (.html)       │
└──────────────────────────────────────────────────────────┘
```

### Stage 1: Figma REST API → HTML/CSS

The skill calls the Figma API with your token and extracts the complete document tree for the specified node:

- **Structure** — Frames, groups, text layers, vectors, images
- **Layout** — Flex direction (`HORIZONTAL`/`VERTICAL`), gap, padding, alignment
- **Styles** — Font family, size, weight, line-height, letter-spacing, text alignment
- **Colors** — RGB fills, strokes, effects (shadows), opacity
- **Borders** — Stroke weight, corner radius

The output is clean HTML/CSS with the CSS convention of your choice (BEM, camelCase, or kebab-case).

### Stage 2: HTML + XML → Template LumisXP

The skill reads your XML data file and identifies:

- **Field names** — Every tag inside `<row>` becomes an accessible field
- **Complex types** — Tags with `lumIsComplexType="true"` map to nested access (`row.image.href`)
- **Rich text** — Fields with HTML-escaped content use `lum_out.print()` or `<%print()%>`
- **Hierarchy** — If `<parentContentId>` exists, the template uses a two-level parent-child pattern
- **Sorting** — Fields like `<position>` drive array ordering
- **Filters** — Fields like `<hidden>`, `<type>` generate conditional logic

The static HTML is then transformed: content becomes `<%= row.field %>`, repeated sections become `<% for %>` loops, and the LumisXP data query is injected at the top.

---

## Installation

### For OpenCode

**Option A — Clone and copy (recommended):**

```bash
git clone https://github.com/YOUR_USER/figma-to-lumis.git
cd figma-to-lumis
cp -R .opencode/skills/figma-to-lumis ~/.opencode/skills/
```

Then add the permission to `~/.config/opencode/opencode.json`:

```json
{
  "permission": {
    "skill": {
      "figma-to-lumis": "allow"
    }
  }
}
```

**Option B — Manual:**

```bash
mkdir -p ~/.opencode/skills/figma-to-lumis/scripts
# Copy SKILL.md and scripts/figma-fetch.js to the directory above
```

Restart OpenCode after installation. The skill appears in the available skills list on the next session.

### Requirements

- **OpenCode** (any version with skill support)
- **Node.js** 18+ (for the `figma-fetch.js` helper script)
- **Figma token** — Generate one at Figma Settings → Personal Access Tokens
- **LumisXP XML data** — Export from your LumisXP content structure

---

## Usage

### Automatic invocation

The skill auto-triggers when you mention Figma + LumisXP in context:

> "converte esse Figma pra LumisXP"
> "implementa este design do Figma como template"
> "faz a adequação deste componente @url com @dados.xml"

### Manual invocation

Force the skill with `@figma-to-lumis`:

> `@figma-to-lumis`

### What to provide

The skill expects three things in the conversation:

| Input | How to provide | Example |
|---|---|---|
| Figma URL | Paste the URL with `node-id` | `https://www.figma.com/design/abc123/...?node-id=123-456` |
| Figma token | Paste or reference | `SEU_FIGMA_TOKEN_AQUI` |
| XML data | Reference the file | `@dados.xml` |

### Optional parameters

You can also specify design system preferences:

| Parameter | Default | Options |
|---|---|---|
| `design_system.font` | (extracted from Figma) | Any font family |
| `design_system.primary_color` | (extracted from Figma) | Any hex/rgb color |
| `design_system.container_max_width` | `1320px` | Any CSS width |
| `convencao_css` | `BEM` | `BEM` / `camelCase` / `kebab-case` |
| `tema_light_dark` | `true` | `true` / `false` |
| `header_template_path` | `none` | Path to a global header HTML file |

---

## Example

**User input:**

```
@figma-to-lumis
URL: https://www.figma.com/design/abc123/Meu-Projeto?node-id=123-456&m=dev
Token: SEU_FIGMA_TOKEN_AQUI
XML: @dados.xml
```

**What the skill does:**

1. Calls `GET https://api.figma.com/v1/files/abc123/nodes?ids=123:456` with the token
2. Parses the JSON tree — extracts structure, styles, text layers, and layout
3. Generates HTML/CSS with BEM naming (e.g. `.componente__titulo`, `.componente__descricao`, `.componente__cta`)
4. Reads `@dados.xml` — identifies fields: `titulo`, `descricao`, `imagem`, `link`, `cta`
5. Detects hierarchy pattern or flat list based on XML structure
6. Checks for rich text fields to apply `lum_out.print()`
7. Transforms the HTML:

```html
<%-- ANTES (estático) --%>
<h1>Título do Componente</h1>
<p>Descrição do componente</p>
<a href="/exemplo" class="componente__cta">Saiba mais</a>

<%-- DEPOIS (LumisXP) --%>
<%
var rows = lum_xpath.getMaps("//data/row");
var row = rows[0];
%>
<h1><%= row.titulo %></h1>
<p><%= row.descricao %></p>
<a href="<%= row.link %>" class="componente__cta"><%= row.cta %></a>
```

8. Outputs `componente.html` as a complete LumisXP template

---

## Requirements

| Requirement | Why |
|---|---|
| **Figma Personal Access Token** | Required to call the Figma REST API. Generate at `Figma Settings → Account → Personal Access Tokens` |
| **LumisXP XML export** | The skill reads the actual data structure to map fields correctly. Export from your LumisXP content structure |
| **Node.js 18+** | The `figma-fetch.js` helper uses native `fetch()` |
| **OpenCode** | The skill is designed for OpenCode's skill system |

---

## Parameters Reference

```yaml
figma_url: "https://www.figma.com/design/..."    # Required — with node-id parameter
figma_token: "figd_..."                          # Required — personal access token
xml: "@data-conteudo.xml"                        # Required — referenced XML file

design_system:
  font: "Inter, sans-serif"                      # Optional — overrides Figma font
  primary_color: "#00A300"                       # Optional — overrides Figma primary
  container_max_width: "1320px"                  # Optional — default 1320px
  breakpoints: [620, 768, 1124, 1364]            # Optional — default fixed values

convencao_css: "BEM"                             # Optional — BEM | camelCase | kebab-case
tema_light_dark: true                            # Optional — true | false
header_template_path: "header.html"              # Optional — wrap with global header
```

---

## License

MIT — See [LICENSE](LICENSE)

---

<p align="center">
  <a href="#installation">Install</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#example">Example</a>
</p>
