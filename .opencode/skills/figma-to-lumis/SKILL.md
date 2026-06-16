---
name: figma-to-lumis
description: >
  Convert Figma designs into dynamic LumisXP templates using XML data.
  Fetches design from Figma API, generates HTML/CSS, then converts to
  LumisXP template with scriptlets, data queries, and XML field mapping.
  Use when user says "convert this Figma to Lumis", "implement this Figma design",
  "create Lumis template from Figma", or provides a Figma URL with XML context.
---

# figma-to-lumis

Convert Figma designs into dynamic LumisXP templates using XML data.

## Trigger

Use when user says:
- "convert this Figma design to Lumis"
- "implement this component from Figma"
- "create a Lumis template from this design"
- "transformar esse Figma para LumisXP"
- "fazer a adequação do Figma para o Lumis"
- mentions Figma URL with LumisXP/XML context

## Input

User must provide:
1. **Figma URL** (with `node-id` parameter)
2. **Figma token** (`X-Figma-Token`)
3. **XML data file** (referenced as `@arquivo.xml`)

Optional parameters (ask if not given):
- `design_system`: font, primary_color, container_max_width, breakpoints
- `convencao_css`: BEM (default) | camelCase | kebab-case
- `tema_light_dark`: true (default) | false
- `header_template_path`: path to global header or "none"

## Workflow

### Step 1 — Extract file key and node IDs from URL

Given: `https://www.figma.com/design/{FILE_KEY}/...?node-id={NODE_IDS}&...`

Extract:
- `FILE_KEY` = hash between `/design/` and `?node-id=`
- `NODE_IDS` = node-id value, replace `-` with `:` (e.g. `2462-22589` → `2462:22589`)

### Step 2 — Fetch design data from Figma API

Use the script at `scripts/figma-fetch.js`:
```bash
node .opencode/skills/figma-to-lumis/scripts/figma-fetch.js {FILE_KEY} {NODE_IDS} {TOKEN}
```

This returns the full JSON tree. Key fields to extract from `data.nodes[nodeId].document`:
- `type`, `name`, `children` — structure
- `absoluteBoundingBox` — `{width, height}`
- `layoutMode` — `HORIZONTAL` / `VERTICAL` (flex direction)
- `paddingLeft/Right/Top/Bottom`, `itemSpacing` — spacing
- `cornerRadius` — border-radius
- `effects` — shadows
- `fills[].color` — RGB values (0-1, multiply by 255)
- For `TEXT` nodes: `characters`, `style.fontFamily`, `style.fontSize`, `style.fontWeight`, `style.textAlignHorizontal`
- `strokeWeight`, `strokes` — borders

### Step 3 — Generate static HTML/CSS

**Node mapping:**

| Figma Type | HTML |
|---|---|
| `FRAME`, `GROUP` | `<div>` |
| `TEXT` | `<p>`, `<h1>`-`<h6>`, `<span>` |
| `RECTANGLE` | `<div>` or `<img>` |
| `VECTOR` | `<svg>` inline |
| `ELLIPSE` | `<div>` with `border-radius: 50%` |
| `IMAGE` | `<img>` |

**CSS conventions (from params):**

| Param | Result |
|---|---|
| BEM | `bloco__container__elemento` |
| camelCase | `blocoContainerElemento` |
| kebab-case | `bloco-container-elemento` |

Default breakpoints if none given: `620px / 768px / 1124px / 1364px`.

If `header_template_path` is provided, read that file and wrap the component with it. Otherwise generate the component standalone.

### Step 4 — Read XML data file

Read the referenced XML file. Extract from `<data><row>`:
- **Field names** — every child tag name
- **Complex types** — tags with `lumIsComplexType="true"` (sub-objects, accessed as `row.campo.subcampo`)
- **Rich text** — fields containing HTML-escaped content (`&lt;`, `&gt;`) → use `lum_out.print()`
- **Hierarchy** — if `<parentContentId>` exists, use 2-level pattern
- **Sorting** — `<position>` field for ordering
- **Filters** — `<hidden>`, `<type>` for conditional logic

### Step 5 — Generate LumisXP template

Replace static content with LumisXP scriptlets:

| Static | LumisXP |
|---|---|
| Static text | `<%= row.{campo} %>` |
| Repeated blocks | `<% for %>` loop |
| Data query | `var rows = lum_xpath.getMaps("//data/row")` |
| Parent-child query | `lum_xpath.getMaps("//data/row[parentContentId = '" + id + "']")` |
| Rich HTML | `<% lum_out.print(row.linkContent) %>` |

**Normalization pattern** (always use — `lum_xpath.getMaps` can return Java array or single object):
```javascript
var rowsRaw = lum_xpath.getMaps("//data/row");
var rows = [];
if (rowsRaw) {
    if (typeof rowsRaw.length !== 'undefined') {
        for (var i = 0; i < rowsRaw.length; i++) { rows.push(rowsRaw[i]); }
    } else { rows.push(rowsRaw); }
}
```

**Sorting pattern:**
```javascript
rows.sort(function(a, b) { return Number(a.position) - Number(b.position); });
```

**Filtering pattern:**
```
<% if (row.hidden !== "true") { %>
<% if (row.type === "1") { %>   // 1 = external link
```

## Checklist

- Figma API called with correct FILE_KEY, NODE_IDS, token
- Document tree extracted: types, names, layout, styles
- HTML/CSS generated using specified CSS convention
- Breakpoints applied (default or custom)
- Header wrapped if path provided
- XML read and fields extracted (names, complex types, rich text, hierarchy)
- Static content replaced with `<%= row.{exact_xml_field} %>`
- Rich text fields using `lum_out.print()`
- Repeated blocks inside `<% for %>`
- Hierarchical data using `parentContentId` pattern
- Array normalization applied
- Sorting by position
- Filters for hidden/type
- CSS/JS preserved
- Light/dark theme applied if enabled
