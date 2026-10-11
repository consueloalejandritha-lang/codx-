import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET = path.join(ROOT, 'public', 'portfolio-assets');
const OUT = path.join(ROOT, 'portfolio-summary');
const WIDTH = 1440;
const HEIGHT = 5200;

const artwork = [
  ['hero', '01-modeling/model-01.jpg', 355, 120, 1005, 835, 'contain', 'centre'],
  ['avatar', '09-profile/avatar-original.png', 945, 1140, 370, 650, 'cover', 'centre'],
  ['mech', '01-modeling/featured-mech.webp', 75, 2025, 1290, 780, 'contain', 'centre'],
  ['gun', '03-plasticity/plasticity-06.jpg', 75, 2935, 820, 525, 'cover', 'centre'],
  ['topology', '02-topology/topology-02.jpg', 930, 2935, 435, 525, 'cover', 'centre'],
  ['rigging', '05-rigging/rigging-02.webp', 75, 3570, 620, 650, 'cover', 'centre'],
  ['motorcycle', '01-modeling/model-08.jpg', 730, 3570, 635, 310, 'cover', 'centre'],
  ['study', '07-other/other-03.jpg', 730, 3910, 635, 310, 'cover', 'centre'],
  ['brand', '10-brand/brand-app-icon.png', 75, 64, 70, 70, 'contain', 'centre'],
];

const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size, options = {}) => {
  const { fill = '#f1f1ed', weight = 700, family = "'Microsoft YaHei','PingFang SC',Arial,sans-serif", anchor = 'start', spacing = 0, opacity = 1, stroke = 'none', strokeWidth = 0 } = options;
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}" stroke="${stroke}" stroke-width="${strokeWidth}">${esc(value)}</text>`;
};
const mono = { family: "Consolas,'Microsoft YaHei',monospace", spacing: 3 };
const rule = (x1, y1, x2, y2, opacity = .3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f1f1ed" stroke-opacity="${opacity}" stroke-width="1"/>`;
const frame = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#f1f1ed" stroke-opacity=".25"/>`;

const background = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="#fff" stroke-opacity=".025"/></pattern></defs>
  <rect width="100%" height="100%" fill="#050505"/><rect width="100%" height="100%" fill="url(#grid)"/>
  <path d="M1100 -100L350 1200M1530 420L820 1560M-150 3400L730 2780M1600 3750L810 4380" stroke="#fff" stroke-opacity=".035" stroke-width="90"/>
</svg>`);

async function layer([, relative, left, top, width, height, fit, position]) {
  const input = path.join(ASSET, ...relative.split('/'));
  const buffer = await sharp(input, { animated: false, limitInputPixels: false })
    .resize({ width, height, fit, position, background: '#050505', withoutEnlargement: false })
    .flatten({ background: '#050505' })
    .png()
    .toBuffer();
  return { input: buffer, left, top };
}

const overlay = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heroFade" x1="0" x2="1"><stop offset="0" stop-color="#050505"/><stop offset=".44" stop-color="#050505" stop-opacity=".72"/><stop offset=".8" stop-color="#050505" stop-opacity="0"/></linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#050505" stop-opacity="0"/><stop offset="1" stop-color="#050505" stop-opacity=".92"/></linearGradient>
  </defs>
  <rect x="0" y="100" width="760" height="870" fill="url(#heroFade)"/>
  ${rule(75, 158, 1365, 158, .28)}
  ${text(172, 105, 'BAILONGHAI / PORTFOLIO', 17, { ...mono, weight: 650 })}
  ${text(75, 245, '3D MODELER · INDEPENDENT ANIMATOR', 19, { ...mono, fill: '#a8a8a5', weight: 600 })}
  ${text(65, 505, '数字造物', 194, { weight: 900, spacing: -12 })}
  ${text(65, 705, '作品集', 244, { weight: 900, spacing: -16 })}
  ${text(75, 810, 'SELECTED WORKS / 2023—2026', 19, { ...mono, fill: '#a8a8a5' })}
  ${text(75, 915, '58', 82, { weight: 900 })}${text(182, 913, 'WORKS ARCHIVED', 15, { ...mono, fill: '#91918e' })}
  ${text(1365, 1000, '01 / 05', 15, { ...mono, anchor: 'end', fill: '#92928f' })}

  ${rule(75, 1060, 1365, 1060, .45)}
  ${text(75, 1110, 'ABOUT / 个人介绍', 16, { ...mono, fill: '#9a9a97' })}
  ${text(75, 1230, 'HELLO! 我是白龙海', 41, { weight: 650 })}
  ${text(75, 1360, '专注于建模、技术与动态表达的', 38, { fill: '#aaa', weight: 420 })}
  ${text(75, 1468, '3D 创作者', 103, { weight: 850, spacing: -5 })}
  ${text(75, 1575, '以硬表面建模、机械结构和三维视觉为核心，', 25, { fill: '#aaa', weight: 400 })}
  ${text(75, 1618, '独立完成从概念分析、模型制作到动画呈现的完整流程。', 25, { fill: '#aaa', weight: 400 })}
  ${frame(925, 1120, 410, 690)}
  ${text(75, 1770, '03+', 48, { weight: 800 })}${text(75, 1810, '年创作经验', 14, { ...mono, fill: '#888' })}
  ${text(305, 1770, '58', 48, { weight: 800 })}${text(305, 1810, '作品展示', 14, { ...mono, fill: '#888' })}
  ${text(505, 1770, '13+', 48, { weight: 800 })}${text(505, 1810, '掌握软件', 14, { ...mono, fill: '#888' })}
  ${text(725, 1770, '∞', 48, { weight: 800 })}${text(725, 1810, '持续探索', 14, { ...mono, fill: '#888' })}

  ${rule(75, 1930, 1365, 1930, .45)}
  ${text(75, 1985, 'SELECTED / 精选项目', 16, { ...mono, fill: '#9a9a97' })}
  ${frame(75, 2025, 1290, 780)}
  <rect x="75" y="2400" width="1290" height="405" fill="url(#bottomFade)"/>
  ${text(108, 2690, '01', 18, { ...mono, fill: '#aaa' })}
  ${text(108, 2760, '人形机甲', 72, { weight: 800 })}
  ${text(1328, 2760, 'MECH FORM STUDY · 2026', 16, { ...mono, anchor: 'end', fill: '#aaa' })}

  ${text(75, 2890, 'PROCESS / 造型、结构与技术过程', 16, { ...mono, fill: '#9a9a97' })}
  ${frame(75, 2935, 820, 525)}${frame(930, 2935, 435, 525)}
  ${text(105, 3405, '02 / 枪械制造', 26, { weight: 700 })}${text(865, 3405, 'PLASTICITY · CAD SURFACE', 14, { ...mono, anchor: 'end', fill: '#999' })}
  ${text(960, 3405, '03 / 拓扑', 26, { weight: 700 })}${text(1335, 3405, 'SUBDIVISION', 14, { ...mono, anchor: 'end', fill: '#999' })}

  ${rule(75, 3520, 1365, 3520, .45)}
  ${frame(75, 3570, 620, 650)}${frame(730, 3570, 635, 310)}${frame(730, 3910, 635, 310)}
  <rect x="75" y="4020" width="620" height="200" fill="url(#bottomFade)"/>
  ${text(105, 4160, '04 / 绑定与控制', 28, { weight: 700 })}${text(665, 4160, 'RIGGING', 14, { ...mono, anchor: 'end', fill: '#999' })}
  ${text(755, 3845, '05 / 科幻摩托', 23, { weight: 700 })}${text(1335, 3845, 'SCI-FI MOTORCYCLE', 13, { ...mono, anchor: 'end', fill: '#999' })}
  ${text(755, 4185, '06 / 视觉练习', 23, { weight: 700 })}${text(1335, 4185, 'MATERIAL STUDY', 13, { ...mono, anchor: 'end', fill: '#999' })}

  ${rule(75, 4330, 1365, 4330, .45)}
  ${text(75, 4385, 'CAPABILITIES / 核心能力', 16, { ...mono, fill: '#9a9a97' })}
  ${text(75, 4500, '01', 18, { ...mono, fill: '#888' })}${text(150, 4500, '硬表面建模', 36, { weight: 700 })}${text(785, 4500, 'HARD SURFACE MODELING', 15, { ...mono, fill: '#888' })}
  ${rule(75, 4540, 1365, 4540, .18)}
  ${text(75, 4620, '02', 18, { ...mono, fill: '#888' })}${text(150, 4620, '拓扑与布线', 36, { weight: 700 })}${text(785, 4620, 'TOPOLOGY & EDGE FLOW', 15, { ...mono, fill: '#888' })}
  ${rule(75, 4660, 1365, 4660, .18)}
  ${text(75, 4740, '03', 18, { ...mono, fill: '#888' })}${text(150, 4740, '全流程制作', 36, { weight: 700 })}${text(785, 4740, 'FULL PIPELINE', 15, { ...mono, fill: '#888' })}
  ${rule(75, 4780, 1365, 4780, .18)}
  ${text(75, 4860, '04', 18, { ...mono, fill: '#888' })}${text(150, 4860, '独立动画制作', 36, { weight: 700 })}${text(785, 4860, 'INDEPENDENT ANIMATION', 15, { ...mono, fill: '#888' })}

  ${rule(75, 4960, 1365, 4960, .5)}
  ${text(75, 5075, "LET'S CREATE", 102, { weight: 900, spacing: -4 })}
  ${text(1365, 5020, 'CONTACT', 15, { ...mono, anchor: 'end', fill: '#888' })}
  ${text(1365, 5070, '2052130377@qq.com', 20, { ...mono, anchor: 'end' })}
  ${text(1365, 5110, 'WECHAT / blh2052130377', 15, { ...mono, anchor: 'end', fill: '#aaa' })}
  ${text(75, 5160, '3D MODELING · RIGGING · ANIMATION · VISUAL DESIGN', 13, { ...mono, fill: '#777' })}
</svg>`);

await fs.mkdir(OUT, { recursive: true });
const layers = await Promise.all(artwork.map(layer));
const output = path.join(OUT, '白龙海-作品集简要长图.png');
await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#050505' } })
  .composite([{ input: background, left: 0, top: 0 }, ...layers, { input: overlay, left: 0, top: 0 }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);
const metadata = await sharp(output).metadata();
console.log(JSON.stringify({ output, width: metadata.width, height: metadata.height, bytes: (await fs.stat(output)).size }, null, 2));
