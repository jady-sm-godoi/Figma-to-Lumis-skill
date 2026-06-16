#!/usr/bin/env node
/**
 * figma-fetch.js
 *
 * Fetches Figma node data via the REST API.
 * Usage: node figma-fetch.js <FILE_KEY> <NODE_IDS> <TOKEN>
 *
 * Example:
 *   node figma-fetch.js SEU_FILE_KEY_AQUI "123:456,789:012" SEU_FIGMA_TOKEN
 *
 * Outputs parsed JSON with:
 *   - metadata: file key, node count
 *   - nodes: array of { id, name, type, children, layout, styles, text }
 */

const FIGMA_API = "https://api.figma.com";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: node figma-fetch.js <FILE_KEY> <NODE_IDS> <TOKEN>");
    console.error("Example: node figma-fetch.js SEU_FILE_KEY_AQUI \"123:456\" SEU_FIGMA_TOKEN");
    process.exit(1);
  }

  const [fileKey, nodeIds, token] = args;
  const url = `${FIGMA_API}/v1/files/${fileKey}/nodes?ids=${nodeIds}`;

  console.error(`Fetching: ${url}`);

  const response = await fetch(url, {
    headers: { "X-Figma-Token": token },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`API error ${response.status}: ${text}`);
    process.exit(1);
  }

  const data = await response.json();

  if (data.err) {
    console.error(`Figma error: ${data.err} — ${data.message || ""}`);
    process.exit(1);
  }

  const nodes = data.nodes || {};
  const result = {
    metadata: {
      fileKey,
      nodeCount: Object.keys(nodes).length,
      name: data.name || "",
    },
    nodes: [],
  };

  for (const [nodeId, nodeData] of Object.entries(nodes)) {
    const doc = nodeData.document || {};
    const parsed = parseNode(doc, nodeId);
    parsed.components = nodeData.components
      ? Object.keys(nodeData.components).length
      : 0;
    result.nodes.push(parsed);
  }

  console.log(JSON.stringify(result, null, 2));
}

function parseNode(doc, nodeId) {
  const node = {
    id: nodeId,
    name: doc.name || "",
    type: doc.type || "",
    boundingBox: doc.absoluteBoundingBox
      ? { w: doc.absoluteBoundingBox.width, h: doc.absoluteBoundingBox.height }
      : null,
    layout: null,
    styles: {},
    fills: null,
    children: [],
  };

  if (doc.layoutMode) {
    node.layout = {
      direction: doc.layoutMode === "HORIZONTAL" ? "row" : "column",
      justifyContent: mapAlign(doc.primaryAxisAlignItems),
      alignItems: mapAlign(doc.counterAxisAlignItems),
      gap: doc.itemSpacing || 0,
      padding: {
        top: doc.paddingTop || 0,
        right: doc.paddingRight || 0,
        bottom: doc.paddingBottom || 0,
        left: doc.paddingLeft || 0,
      },
    };
  }

  if (doc.cornerRadius) node.styles.borderRadius = doc.cornerRadius;
  if (doc.opacity !== undefined) node.styles.opacity = doc.opacity;
  if (doc.strokeWeight) node.styles.strokeWeight = doc.strokeWeight;

  if (doc.fills && doc.fills.length > 0) {
    node.fills = doc.fills.map((f) => ({
      type: f.type,
      color: f.color
        ? {
            r: Math.round(f.color.r * 255),
            g: Math.round(f.color.g * 255),
            b: Math.round(f.color.b * 255),
            a: f.color.a ?? 1,
          }
        : null,
      opacity: f.opacity ?? 1,
    }));
  }

  if (doc.type === "TEXT") {
    node.text = {
      characters: doc.characters || "",
      fontFamily: doc.style?.fontFamily || "",
      fontSize: doc.style?.fontSize || 16,
      fontWeight: doc.style?.fontWeight || 400,
      lineHeight: doc.style?.lineHeightPx || null,
      letterSpacing: doc.style?.letterSpacing || 0,
      textAlign: (doc.style?.textAlignHorizontal || "LEFT").toLowerCase(),
      textCase: doc.style?.textCase || null,
      textDecoration: doc.style?.textDecoration || null,
      color: node.fills?.[0]?.color || null,
    };
  }

  if (doc.effects && doc.effects.length > 0) {
    node.styles.effects = doc.effects.map((e) => ({
      type: e.type,
      visible: e.visible,
      ...(e.offset ? { offset: e.offset } : {}),
      ...(e.radius ? { radius: e.radius } : {}),
      ...(e.color
        ? {
            color: {
              r: Math.round(e.color.r * 255),
              g: Math.round(e.color.g * 255),
              b: Math.round(e.color.b * 255),
              a: e.color.a ?? 1,
            },
          }
        : {}),
    }));
  }

  if (doc.children) {
    for (let i = 0; i < doc.children.length; i++) {
      node.children.push(parseNode(doc.children[i], `${nodeId}/${i}`));
    }
  }

  return node;
}

function mapAlign(val) {
  const map = {
    MIN: "flex-start",
    MAX: "flex-end",
    CENTER: "center",
    SPACE_BETWEEN: "space-between",
  };
  return map[val] || val?.toLowerCase() || null;
}

main();
