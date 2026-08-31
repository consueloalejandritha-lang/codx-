# 3D Artist Portfolio

面向 3D 建模师与独立动画工作者的响应式单页作品集。采用 React + TypeScript + Vite，视觉以黑白、技术网格和大编号为核心。

## 项目结构

```text
src/
  App.tsx                 页面结构
  data/portfolio.ts       个人资料、精选项目、分类和图片清单
  data/software.ts        页尾软件名称、顺序和图标取景位置
  styles.css              设计系统与响应式样式
public/
  portfolio-assets/       网站实际读取的轻量素材区
scripts/
  optimize_portfolio_assets.py  将原始 PNG / GIF 生成网页版本
```

页面代码不引用 `J:` 盘或其他本机绝对路径；发布时只需要上传构建产物。

## 内容修改

- 姓名、联系方式和个人介绍：修改 `src/data/portfolio.ts` 中的 `profile`。
- 个人介绍形象：`public/portfolio-assets/09-profile/` 中的原图 `avatar-original.png` 和跳跃挥手图集 `avatar-poses-v2.png`。人物保持放大后的尺寸；窗口至少45%进入视野、素材就绪且页面在前台时，才播放一次入场/问好，之后显示完整原图并保持静止。已取消鼠标、触屏、键盘跟随及相关提示，旧视线图集不再加载。返回、一键回顶部不重播，刷新才重置。现有入场仍为图片动作帧，未生成新视频。实现位于 `src/components/ProfileAvatar.tsx`，测试为 `node scripts/test_avatar_motion.mjs`。
- 打开与刷新位置：`src/startAtHome.ts` 在React挂载前回到首页，保留路径/查询参数与历史状态；用户开始滚动或点击导航后不再强制回顶。同一页面内的章节导航不受影响。测试为 `node scripts/test_start_at_home.mjs`。素材说明及历史生成提示词见 `scripts/AVATAR_ASSETS.md`。
- 作品图片：直接覆盖 `public/portfolio-assets/` 对应分类中的同名文件。
- 作品分组：为相同物件填写相同的 `series` 名称，页面会自动相邻排列。
- 绑定展示：覆盖 `public/portfolio-assets/05-rigging/` 中的 `rigging-01.webp` 至 `rigging-04.webp`。
- Spin 动图：网站读取 `public/portfolio-assets/08-spin/` 中的同名 WebP；GIF 原图可通过素材处理脚本生成网页版本。
- 精选项目：修改 `featuredProjects`。
- 精选第03项「枪械制造」保持静态图片 `03-plasticity/plasticity-06.jpg`。
- 交互模型位于作品归档「03 Plasticity 建模 → 工业形体 → Plasticity 01」，读取 `12-models/pistol-blend-baked.glb`，备用图为 `03-plasticity/plasticity-01.jpg`。模型由新提供的打包 Blender 工程重新生成，不复用旧 GLB。
- 3D 交互：鼠标跟随/移开回正、触屏拖动/松手回正、按视口加载和静态图兜底。旋转范围约水平±39°、垂直±17°；保留工程第7帧实际生成的火焰、烟雾、弹壳和弹头，是静态三维展示而非原工程动画。
- 模型解码资源保存在 `public/vendor/draco/`，无需外部 CDN；发布时一起保留。转换说明见 `scripts/PISTOL_PIPELINE.md`。
- 首页视频：替换 `public/portfolio-assets/00-hero/` 中的 WebM 与 MP4。优先保留透明 WebM，MP4 用于兼容回退。只有首页可见时播放，离开首页或切到后台暂停；循环保留700ms渐隐再渐显，播放失败显示封面。逻辑位于 `src/components/heroPlayback.ts`。
- 首页视频封面：替换 `public/portfolio-assets/00-hero/hero-poster.jpg`。
- 页尾软件图标：原始图集保存在 `public/portfolio-assets/11-software/software-icons.png`，名称与排列顺序在 `src/data/software.ts`。按实际可用宽度判断是否溢出：放不下时自动无缝循环，放得下时静止；手机/iPad横竖屏变化会重新判断。支持手动横滑，悬停/键盘聚焦暂停，触摸结束3秒后继续；离开视野、后台或系统减少动态效果时不自动滚动。逻辑在 `src/components/SoftwareTools.tsx` 和 `softwareLoop.ts`。

只替换同名、同扩展名的网页素材时不需要修改代码，完整步骤见根目录的 `图片快速替换指南.md`。

图片建议使用英文小写文件名，最长边不超过 2400px。透明视频保留带alpha的WebM；H.264 MP4不承载透明通道，只作兼容背景版本。Safari实际显示应在发布前用真机复核，不能以桌面浏览器缩小窗口替代。不要把GIF/WebP动图转成只有一帧的静态图。

## 本地运行

```bash
pnpm install
pnpm dev
```

访问 `http://127.0.0.1:5173/`。关闭终端或结束本地服务后，地址会暂时无法打开，再次运行 `pnpm dev` 即可。

## 发布前检查

```bash
pnpm test
pnpm build
pnpm preview
```

正式构建输出在 `dist/`，可用于后续静态网站托管。当前未执行发布。

资源链接检查：`node scripts/check_assets.mjs --url=http://127.0.0.1:5173`。除文件存在，还会检查实际HTTP类型和大小，防止错误路径返回HTML却被误判正常。

## GitHub 源码准备（尚未上传）

- 保留 `src/`、`public/portfolio-assets/`、`public/vendor/draco/`、脚本、配置、文档及 `pnpm-lock.yaml`。
- `.gitignore` 已排除 `node_modules/`、`dist/`、`.local-backups/`、`scripts/_vendor/`、环境文件、日志及编译缓存。不要把整个文件夹打包后通过GitHub网页上传；打包不会自动遵守这些排除规则。
- 素材处理脚本需要本机Python/Pillow，模型流程还需要Blender；这些工具不是运行网站的依赖。FFmpeg可使用本机PATH安装或原来的本地工具副本，不纳入Git。
- 2026-08-31的清理备份在 `.local-backups/prepublish-2026-08-31/`，不参与运行和构建，可手动恢复对应文件。
- 当前资源URL以站点根目录为基准。将来若选GitHub Pages的仓库子路径，需要在确定仓库名后统一配置Vite base及素材路径；本次不猜测仓库名、不创建仓库、不发布。
- 待审文案和兼容性边界见 `文案校对待确认.md` 与 `发布前检查报告.md`。
