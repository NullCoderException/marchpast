/**
 * A throwaway look at the marks on their own, so the geometry can be judged
 * before the canvas goes out. Serves one page on 5199; not part of the canvas.
 */
import { createServer } from "node:http";
import { INK, MARKS, PARCHMENT, HAIR, SERIF, markSvg } from "./marks.mjs";

const rows = MARKS.map(
  (mark) => `<tr>
    <td style="width: 150px; font-size: 15px; vertical-align: middle;">${mark.key} · ${mark.name}</td>
    ${[96, 64, 48, 32, 16]
      .map(
        (s) =>
          `<td style="text-align: center; padding: 10px;"><div style="display:inline-flex;align-items:center;justify-content:center;width:110px;height:110px;border:1px solid ${HAIR};">${markSvg(mark, s)}</div><div style="font-size:11px;font-style:italic;">${s} scaled</div></td>`,
      )
      .join("")}
    <td style="text-align: center; padding: 10px;"><div style="display:inline-flex;align-items:center;justify-content:center;width:110px;height:110px;border:1px solid ${HAIR};">${markSvg(mark, 16, { small: true })}</div><div style="font-size:11px;font-style:italic;">16 redrawn</div></td>
    <td style="text-align: center; padding: 10px;"><div style="display:inline-flex;align-items:center;justify-content:center;width:110px;height:110px;background:${INK};">${markSvg(mark, 72, { ink: PARCHMENT })}</div><div style="font-size:11px;font-style:italic;">reversed</div></td>
    <td style="padding: 10px;"><div style="display:flex;align-items:center;gap:14px;">${markSvg(mark, 40)}<span style="font-size:30px;letter-spacing:0.02em;">Marchpast</span></div></td>
  </tr>`,
).join("\n");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap" rel="stylesheet">
<style>body{margin:0;padding:28px;background:${PARCHMENT};color:${INK};font-family:${SERIF};}
table{border-collapse:collapse;} td{border-bottom:1px solid ${HAIR};}</style>
</head><body><table>${rows}</table></body></html>`;

createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(5199, "127.0.0.1", () => console.log("marks preview on http://127.0.0.1:5199/"));
