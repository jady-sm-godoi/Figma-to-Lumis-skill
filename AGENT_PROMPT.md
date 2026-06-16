# Prompt para Agente AI: Figma + XML → Template Dinâmico LumisXP

## Parâmetros de Entrada (fornecer antes de começar)

```yaml
# Obrigatórios
figma_url: "https://www.figma.com/design/..."
figma_token: "figd_..."
xml_path: "data-row-hierarquico.xml"          # arquivo XML com dados do Lumis

# Design System (opcional - se não informado, usa estilos extraídos do Figma)
design_system:
  font: "Inter, sans-serif"
  primary_color: "#00A300"
  container_max_width: "1320px"
  breakpoints: [620, 768, 1124, 1364]         # default fixo

# Template
convencao_css: "BEM"                           # BEM | camelCase | kebab-case
tema_light_dark: true                          # true | false
header_template_path: "header.html"            # caminho ou "nenhum"
```

---

## Visão Geral

Processo de **duas etapas**:

```
ETAPA 1: Figma REST API → HTML/CSS estático
ETAPA 2: HTML/CSS estático + XML → Template LumisXP dinâmico
```

Os dados XML fornecidos pelo usuário são usados na Etapa 2 para:
- Identificar os campos reais do formulário LumisXP
- Determinar se a estrutura é plana ou hierárquica (via `parentContentId`)
- Identificar campos de rich text (via conteúdo HTML escapado em `linkContent`)
- Servir como referência para os valores de exemplo nas interpolações

---

## ETAPA 1: Figma → HTML/CSS Estático

### 1.1 Chamar a API REST do Figma

URL base: `https://api.figma.com/v1/files/{FILE_KEY}/nodes?ids={NODE_IDS}`

Onde:
- `FILE_KEY` = hash entre `/design/` e `?node-id=` na URL
- `NODE_IDS` = valor de `node-id` com `-` → `:` (ex: `2462-22589` → `2462:22589`)

**Headers:**
```
X-Figma-Token: {figma_token}
```

**Endpoint (múltiplos nodes de uma vez):**
```
GET https://api.figma.com/v1/files/{FILE_KEY}/nodes?ids=NODE_1,NODE_2
```

### 1.2 Extrair Estrutura do JSON

O JSON retorna em `data.nodes[nodeId].document`:
- `document.type` → `FRAME`, `TEXT`, `RECTANGLE`, `VECTOR`, `INSTANCE`, `GROUP`, `ELLIPSE`, `LINE`, `IMAGE`
- `document.name` → nome do layer
- `document.children` → array de filhos
- `document.absoluteBoundingBox` → `{ x, y, width, height }`
- `document.layoutMode` → `"HORIZONTAL"` ou `"VERTICAL"`
- `document.primaryAxisAlignItems` / `document.counterAxisAlignItems`
- `document.paddingLeft` / `paddingRight` / `paddingTop` / `paddingBottom`
- `document.itemSpacing` → gap
- `document.cornerRadius` / `document.rectangleCornerRadii`
- `document.effects` → sombras, blur
- `document.strokeWeight` / `document.strokes` → bordas
- `document.fills` → preenchimentos
- `document.background` → cor de fundo
- `document.opacity`

### 1.3 Mapear Nodes para HTML

| Figma Node Type | Elemento HTML |
|---|---|
| `FRAME`, `GROUP` | `<div>` |
| `TEXT` | `<p>`, `<h1>`-`<h6>`, `<span>` (conforme tamanho/peso) |
| `RECTANGLE` | `<div>` com bordas ou `<img>` (se imagem) |
| `VECTOR` | `<svg>` inline ou `<img>` |
| `LINE` | `<div>` com `border-top` ou `<hr>` |
| `INSTANCE` | `<div>` |
| `ELLIPSE` | `<div>` com `border-radius: 50%` |
| `IMAGE` | `<img>` |

### 1.4 Extrair Estilos de Texto

Para `TEXT`:
- `document.characters` → texto
- `document.style.fontFamily` → fonte
- `document.style.fontSize` → tamanho
- `document.style.fontWeight` → peso (400, 700)
- `document.style.lineHeightPx` / `document.style.lineHeightPercentFontSize`
- `document.style.letterSpacing`
- `document.style.textAlignHorizontal` → `LEFT`, `CENTER`, `RIGHT`
- `document.style.textCase` → `UPPER`, `LOWER`, `TITLE`
- `document.style.textDecoration` → `UNDERLINE`, `STRIKETHROUGH`
- `document.fills[0].color` → `{ r, g, b, a }` (0-1)

### 1.5 Extrair Cores

Converter RGB 0-1 para CSS:
```javascript
function rgbToString(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a ?? 1;
  return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}
```

- `fills[i].type === "SOLID"` → cor sólida
- `fills[i].type === "IMAGE"` → `url(${fill.imageRef})`
- `fills[i].type === "GRADIENT_LINEAR"` → `linear-gradient()`

### 1.6 Extrair Imagens

Para nodes com imagem, a URL requer segunda chamada:
```
GET https://api.figma.com/v1/images/{FILE_KEY}?ids={NODE_ID}&format=svg|png|jpg
```

**Simplificação:** Use placeholders (`assets/images/[nome-do-node].webp`) e documente quais imagens precisam ser exportadas.

### 1.7 Extrair Layout (Flexbox)

- `layoutMode === "HORIZONTAL"` → `display: flex; flex-direction: row`
- `layoutMode === "VERTICAL"` → `display: flex; flex-direction: column`
- `itemSpacing` → `gap`
- `paddingLeft/Right/Top/Bottom` → `padding`
- `primaryAxisAlignItems` → `justify-content` (`MIN`=flex-start, `MAX`=flex-end, `CENTER`=center, `SPACE_BETWEEN`=space-between)
- `counterAxisAlignItems` → `align-items`
- `cornerRadius` → `border-radius`

### 1.8 Montar HTML/CSS

Usar a convenção CSS informada nos parâmetros:

**Se BEM:** `bloco__container__elemento__modificador`
**Se camelCase:** `blocoContainerElementoModificador`
**Se kebab-case:** `bloco-container-elemento-modificador`

```html
<section class="nome-componente" id="NomeComponente">
  <div class="nome-componente__container">
    <div class="max-width-container">
      <!-- Hierarquia da árvore Figma -->
      <div class="nome-componente__container__row">
        ...
      </div>
    </div>
  </div>
</section>

<style>
  .nome-componente {
    --primary: {primary_color};
    font-family: {font};
    max-width: {container_max_width};
  }

  @media (max-width: 620px) { ... }
  @media (max-width: 768px) { ... }
  @media (max-width: 1124px) { ... }
  @media (min-width: 1364px) { ... }
</style>

<script>
  // JS interativo (se houver)
</script>
```

### 1.9 Header Global (opcional)

Se `header_template_path` for fornecido, ler o arquivo e embrulhar o componente com ele. O header deve ficar **fora** da `<section>` do componente.

Se não for fornecido, gerar apenas o componente isolado.

---

## ETAPA 2: HTML/CSS + XML → Template LumisXP Dinâmico

### 2.1 Ler o XML de Dados

O arquivo XML fornecido em `xml_path` contém a estrutura real dos dados que o template consumirá em runtime via `lum_xpath.getMaps()`.

Extraia do XML:
- **Campos disponíveis:** cada `<row>` contém os campos do formulário LumisXP. Liste todos os nomes de tags filhas (`<title>`, `<contentId>`, `<parentContentId>`, `<position>`, `<image>`, `<linkContent>`, etc.)
- **Campos complexos:** tags com atributo `lumIsComplexType="true"` contêm sub-objetos (ex: `<image><href>url.jpg</href></image>` → acessado como `row.image.href`)
- **Rich text:** campos como `<linkContent>` que contêm HTML escapado (`&lt;`, `&gt;`) → usam `lum_out.print()` ou `<%print()%>`
- **Estrutura hierárquica:** se existir `<parentContentId>`, o template tem 2 níveis (pai-filho)
- **Ordem:** campos como `<position>` indicam ordenação
- **Filtros:** campos como `<hidden>`, `<type>` indicam lógica condicional

### 2.2 Mapeamento HTML → LumisXP

Use os campos reais extraídos do XML para substituir conteúdo estático:

| HTML Estático | LumisXP |
|---|---|
| Texto fixo | `<%= row.{campo_do_xml} %>` |
| Lista/seção repetida | `<% for (var i in rows) { %> ... <% } %>` |
| Query de dados | `var rows = lum_xpath.getMaps("//data/row")` |
| Hierarquia pai-filho | `lum_xpath.getMaps("//data/row[parentContentId = '" + id + "']")` |
| Rich text (campo com HTML escapado) | `<% lum_out.print(row.{campo}) %>` ou `<%print(row.{campo})%>` |
| Atributo (src, href, id) | `<%= row.{campo} %>` ou `<%= row.{objeto}.{propriedade} %>` |
| CSS | Manter intacto |
| JS | Manter intacto |

### 2.3 Padrões de Template

#### Lista Simples (loop único)

Use quando o XML não tiver `parentContentId` (apenas uma lista plana de `<row>`).

```html
<%
var rows = lum_xpath.getMaps("//data/row");
for (var i in rows) {
  var row = rows[i];
%>
  <a href="<%=row.linkUrl%>" class="card">
    <img src="<%=row.image.href%>" alt="<%=row.title%>">
    <h3><%=row.title%></h3>
  </a>
<% } %>
```

#### Hierarquia Pai-Filho (2 níveis)

Use quando o XML tiver `parentContentId`. Pais = `parentContentId` vazio. Filhos = vinculados pelo `contentId` do pai.

```html
<%
var parents = lum_xpath.getMaps("//data/row[parentContentId = '']");
for (var i = 0; i < parents.length; i++) {
  var parent = parents[i];
  var children = lum_xpath.getMaps("//data/row[parentContentId = '" + parent.contentId + "']");
%>
  <button><%= parent.title %></button>
  <div>
  <% for (var j = 0; j < children.length; j++) { %>
    <% lum_out.print(children[j].linkContent) %>
  <% } %>
  </div>
<% } %>
```

#### Carrossel
Radio buttons + CSS `:checked` + `margin-left` negativo. Loops geram CSS dinâmico conforme quantidade de registros.

#### Menu/Drawer
Filtra por `hidden`, ordena por `position`. Desktop horizontal, mobile drawer.

#### Conteúdo Único
Primeira (ou única) row do array. Acessa campos diretamente.

### 2.4 Regras de Conversão

1. **Nome dos campos:** Usar **exatamente** os nomes de tag do XML. Ex: se o XML tem `<titulo>`, usar `row.titulo`; se tem `<title>`, usar `row.title`.
2. **Campos complexos:** Se `<imagem_desktop lumIsComplexType="true"><href>url</href></imagem_desktop>`, usar `row.imagem_desktop.href`.
3. **Rich text:** Campos que no XML contêm HTML escapado (`&lt;` → `<`, `&gt;` → `>`) usam `<% lum_out.print() %>` ou `<%print()%>`.
4. **IDs únicos:** Usar `<%= row.contentId %>` ou o índice `i+1` para elementos que se repetem.
5. **Ordenação:**
   ```javascript
   var rowsRaw = lum_xpath.getMaps("//data/row");
   var rows = [];
   if (rowsRaw) {
       if (typeof rowsRaw.length !== 'undefined') {
           for (var i = 0; i < rowsRaw.length; i++) { rows.push(rowsRaw[i]); }
       } else { rows.push(rowsRaw); }
   }
   rows.sort(function(a, b) { return Number(a.position) - Number(b.position); });
   ```
6. **Filtros:** Usar `<% if (row.hidden !== "true") { %>`, `<% if (row.type === "1") { %>`.
7. **CSS:** Manter intacto. Se tema light/dark ativo, usar classes `.light`/`.dark` com variáveis CSS.
8. **JS:** Manter intacto.

### 2.5 Tema Light/Dark (se ativo)

```css
:root, .light {
  --bg: #ffffff;
  --text: #1F1F1F;
}

.dark {
  --bg: #1F1F1F;
  --text: #F5F5F5;
}
```

---

## Exemplo de Uso

**Input:**
```yaml
figma_url: "https://www.figma.com/design/abc123/MeuProjeto?node-id=123-456"
figma_token: "figd_token..."
xml_path: "data-conteudo.xml"
design_system:
  font: "Inter, sans-serif"
  primary_color: "#0055FF"
convencao_css: "BEM"
tema_light_dark: true
header_template_path: "header.html"
```

**O que o agente faz:**

1. Chama API Figma com token e node ID
2. Extrai árvore JSON → gera HTML/CSS estático do componente
3. Lê `data-conteudo.xml` → extrai campos reais (`title`, `image.href`, `linkContent`, `position`, `hidden`, etc.)
4. Identifica se é hierárquico ou plano (checa `parentContentId`)
5. Se `header_template_path` informado, lê o header e embrulha
6. Casa os campos do XML com os elementos do HTML gerado do Figma
7. Converte: dados estáticos → `lum_xpath.getMaps()`, loops, `<%= %>`, `lum_out.print()`
8. Entrega `.html` final como template LumisXP

---

## Checklist Final

- [ ] ETAPA 1: Chamou API Figma com token e node IDs
- [ ] ETAPA 1: Extraiu `document` e `styles` do JSON
- [ ] ETAPA 1: Mapeou Figma nodes → HTML com convenção CSS informada
- [ ] ETAPA 1: Aplicou breakpoints default (620/768/1124/1364)
- [ ] ETAPA 1: Incluiu header opcional se caminho fornecido
- [ ] ETAPA 2: Leu XML e identificou todos os campos reais
- [ ] ETAPA 2: Dados substituídos por `lum_xpath.getMaps()`
- [ ] ETAPA 2: Loops `<% for %>` em blocos repetidos
- [ ] ETAPA 2: `<%= row.campo %>` com nomes **exatos** do XML
- [ ] ETAPA 2: Rich text via `<% lum_out.print() %>` (campos com HTML escapado)
- [ ] ETAPA 2: Hierarquia pai-filho se `parentContentId` existir
- [ ] ETAPA 2: IDs únicos via `contentId` ou índice
- [ ] ETAPA 2: Ordenação com `sort()` pelo campo de posição
- [ ] ETAPA 2: Filtros para `hidden`, `type`
- [ ] ETAPA 2: Tema light/dark (se ativo)
- [ ] ETAPA 2: JS interativo preservado
- [ ] ETAPA 2: Normalização do array (`rowsRaw.length` check)
