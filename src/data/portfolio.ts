export type MediaAspect = 'landscape' | 'portrait' | 'square' | 'panorama';

export type PortfolioItem = {
  id: string;
  title: string;
  caption: string;
  image: string;
  aspect: MediaAspect;
  series: string;
  model?: string;
};

export type PortfolioCategory = {
  id: string;
  title: string;
  english: string;
  description: string;
  items: PortfolioItem[];
};

export const profile = {
  name: '白龙海',
  role: '3D 建模 / 独立动画创作者',
  email: '2052130377@qq.com',
  wechat: 'blh2052130377',
  location: '电子科技大学成都学院',
  bio: '我专注于探索硬表面建模、机械结构设计与三维视觉创作，能够独立完成从概念分析、模型制作、材质灯光到动画呈现的完整流程。',
  bioSecondary: '在创作中，我关注的不只是模型的外形，也重视结构关系、功能逻辑与视觉节奏。希望通过准确的造型、克制的细节和富有氛围的动态表达，让每一件作品都拥有可信度与辨识度。',
  stats: [
    { value: '03+', label: '年创作经验' },
    { value: '58', label: '作品展示' },
    { value: '13+', label: '掌握软件数量' },
    { value: '∞', label: '持续探索' },
  ],
};

type MediaInput = [file: string, aspect: MediaAspect, series: string, title?: string, modelFile?: string];

const assetPath = (folder: string, file: string) =>
  `/portfolio-assets/${folder}/${file}`;

const createItems = (
  id: string,
  folder: string,
  label: string,
  caption: string,
  media: MediaInput[],
): PortfolioItem[] => media.map(([file, aspect, series, title, modelFile], index) => ({
  id: `${id}-${String(index + 1).padStart(2, '0')}`,
  title: title ?? `${label} ${String(index + 1).padStart(2, '0')}`,
  caption,
  image: assetPath(folder, file),
  aspect,
  series,
  ...(modelFile ? { model: assetPath('12-models', modelFile) } : {}),
}));

export const categories: PortfolioCategory[] = [
  {
    id: 'modeling',
    title: '建模展示',
    english: 'MODELING SHOWCASE',
    description: '呈现完整模型、材质、灯光与最终画面，重点探索机械结构、造型比例和整体视觉表现。',
    items: createItems('modeling', '01-modeling', '建模作品', '3D MODELING · PERSONAL WORK', [
      ['model-01.jpg', 'landscape', '战术机甲'], ['model-02.jpg', 'landscape', '战术机甲'],
      ['model-03.jpg', 'portrait', '人形机甲'], ['model-04.jpg', 'portrait', '人形机甲'],
      ['model-05.jpg', 'square', '自行车'], ['model-06.jpg', 'portrait', '野外通信器'],
      ['model-07.jpg', 'portrait', '野外通信器'], ['model-08.jpg', 'landscape', '科幻摩托'],
    ]),
  },
  {
    id: 'topology',
    title: '布线与拓扑',
    english: 'TOPOLOGY / SUBDIVISION',
    description: '展示细分曲面建模中的拓扑规划、边线控制与曲面处理，确保复杂结构在细分后依然保持干净、稳定的形态。',
    items: createItems('topology', '02-topology', '布线展示', 'TOPOLOGY · SUBDIVISION', [
      ['topology-01.jpg', 'portrait', '细分结构 A'], ['topology-02.jpg', 'panorama', '细分结构 A'],
      ['topology-03.jpg', 'portrait', '细分结构 A'], ['topology-04.jpg', 'portrait', '细分结构 B'],
      ['topology-05.jpg', 'portrait', '细分结构 B'], ['topology-06.jpg', 'landscape', '细分结构C'],
      ['topology-07.jpg', 'landscape', '细分结构C'], ['topology-08.jpg', 'landscape', '细分结构C'],
      ['topology-09.jpg', 'landscape', '细分结构C'], ['topology-10.jpg', 'portrait', '细分结构C'],
      ['topology-11.jpg', 'landscape', '细分结构C'], ['topology-12.jpg', 'square', '曲线建模'],
    ]),
  },
  {
    id: 'plasticity',
    title: 'Plasticity 建模',
    english: 'PLASTICITY / CAD MODELING',
    description: '运用 NURBS 与 CAD 建模逻辑塑造干净、锐利的工业曲面，探索硬朗结构与流畅轮廓之间的平衡。',
    items: createItems('plasticity', '03-plasticity', 'Plasticity', 'PLASTICITY · CAD SURFACE', [
      ['plasticity-01.jpg', 'portrait', '工业形体', undefined, 'pistol-blend-baked.glb'], ['plasticity-02.jpg', 'square', '装置系列'],
      ['plasticity-03.jpg', 'portrait', '装置系列'], ['plasticity-04.jpg', 'square', '装置系列'],
      ['plasticity-05.jpg', 'portrait', '装置系列'],
      ['plasticity-06.jpg', 'landscape', '战术手枪'], ['plasticity-07.jpg', 'landscape', '战术手枪'],
    ]),
  },
  {
    id: 'boolean',
    title: 'Blender NURBS建模',
    english: 'BOOLEAN MODELING / BLENDER',
    description: '基于非破坏式布尔工作流完成硬表面造型，通过倒角、法线与层级管理，提高复杂结构的制作效率和可编辑性。',
    items: createItems('boolean', '04-boolean', '布尔建模', 'BLENDER · BOOLEAN WORKFLOW', [
      ['boolean-01.jpg', 'landscape', '应急电源'], ['boolean-02.jpg', 'landscape', '应急电源'],
      ['boolean-03.jpg', 'landscape', '机械手'], ['boolean-04.jpg', 'landscape', '机械手'],
      ['boolean-05.jpg', 'landscape', '机械手'],
    ]),
  },
  {
    id: 'early',
    title: '早期作品',
    english: 'EARLY EXPLORATIONS',
    description: '记录创作早期对建模技术、视觉风格与表现方式的探索，也呈现个人创作思路逐步形成的过程。',
    items: createItems('early', '06-early', '早期作品', 'EARLY WORK · ARCHIVE', [
      ['early-01.jpg', 'landscape', '早期探索 A', '小吃摊场景'],
      ['early-02.jpg', 'landscape', '早期探索 A', '月球车'],
      ['early-03.jpg', 'panorama', '早期探索 A', '林间小道'],
      ['early-04.webp', 'landscape', '早期探索 B（DAZ+MD+BLENDER）', '角色01'],
      ['early-05.webp', 'landscape', '早期探索 B（DAZ+MD+BLENDER）', '角色02'],
      ['early-06.jpg', 'panorama', '早期探索 B（DAZ+MD+BLENDER）', '角色03'],
    ]),
  },
  {
    id: 'other',
    title: '其他创作',
    english: 'VISUAL EXPERIMENTS',
    description: '收录角色、场景、课程创作、材质测试与个人练习，尝试在不同主题和表现方式之间拓展三维创作的边界。',
    items: createItems('other', '07-other', '实验作品', 'STUDY · VISUAL EXPERIMENT', [
      ['other-01.webp', 'landscape', '小场景'], ['other-02.jpg', 'square', '小场景'],
      ['other-03.jpg', 'square', '氛围'], ['other-04.webp', 'landscape', '氛围'],
      ['other-05.webp', 'portrait', '雕刻'], ['other-06.webp', 'landscape', '雕刻'],
      ['other-07.webp', 'square', '绘画'], ['other-08.jpg', 'landscape', '绘画'],
    ]),
  },
];

export const riggingItems = createItems('rigging', '05-rigging', '绑定展示', 'RIGGING · CONTROLLER SETUP', [
  ['rigging-01.webp', 'portrait', '机械绑定'], ['rigging-02.webp', 'portrait', '机械绑定'],
  ['rigging-03.webp', 'portrait', '控制器展示'], ['rigging-04.webp', 'portrait', '控制器展示'],
]);

export const spinItems = createItems('spin', '08-spin', 'Spine', '360° TURNTABLE · WEB MOTION', [
  ['spin-01.webp', 'square', 'Spine'], ['spin-02.webp', 'square', 'Spine'],
  ['spin-03.webp', 'square', 'Spine'], ['spin-04.webp', 'square', 'Spine'],
  ['spin-05.webp', 'square', 'Spin', '场景动画01'], ['spin-06.webp', 'square', 'Spin', '场景动画02'],
  ['spin-07.webp', 'square', 'Spin', '场景动画03'], ['spin-08.webp', 'square', 'Spin', '场景动画04'],
]);

// Count all display slots, including the eight animation entries.
export const portfolioTotal = categories.reduce(
  (total, category) => total + category.items.length,
  0,
) + riggingItems.length + spinItems.length;

type FeaturedProject = {
  number: string;
  title: string;
  english: string;
  type: string;
  image: string;
  year: string;
};

export const featuredProjects: FeaturedProject[] = [
  { number: '01', title: '战术机甲', english: 'TACTICAL MECH', type: 'HARD SURFACE · LOOKDEV', image: assetPath('01-modeling', 'model-01.jpg'), year: '2026' },
  { number: '02', title: '人形机甲', english: 'MECH FORM STUDY', type: 'ROBOT DESIGN · 3D MODELING', image: assetPath('01-modeling', 'featured-mech.webp'), year: '2026' },
  { number: '03', title: '枪械制造', english: 'FIREARM MODELING', type: 'PLASTICITY · CAD SURFACE', image: assetPath('03-plasticity', 'plasticity-06.jpg'), year: '2025' },
];

export const strengths = [
  { number: '01', title: '硬表面建模', english: 'HARD SURFACE MODELING', text: '根据功能与结构关系拆分形体，在机械逻辑、造型比例和细节密度之间取得平衡。', tags: ['BLENDER', 'PLASTICITY', 'SUBDIVISION'] },
  { number: '02', title: '拓扑与布线', english: 'TOPOLOGY & EDGE FLOW', text: '针对细分、变形和动画需求规划拓扑，使复杂曲面保持干净、稳定，并便于后续调整。', tags: ['QUAD FLOW', 'RETOPOLOGY', 'UV'] },
  { number: '03', title: '全流程制作', english: 'FULL PIPELINE', text: '独立完成建模、拓扑、展 UV、材质直至渲染输出的全流程建模工作。', tags: ['PBR', 'CYCLES', 'COMPOSITING'] },
  { number: '04', title: '独立动画制作', english: 'INDEPENDENT ANIMATION', text: '独立完成分镜、动画、镜头设计、渲染与后期，让静态模型转化为完整、连贯的动态表达。', tags: ['ANIMATION', 'CAMERA', 'EDITING'] },
];
