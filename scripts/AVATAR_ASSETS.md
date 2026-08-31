# 人物动作素材 v2（已取消鼠标跟随）

## 当前播放规则

- 首次打开/完整刷新从首页开始；直到个人介绍的人物窗口至少45%可见、素材就绪且标签页在前台，才消耗本次入场机会。
- 入场与问好后保持完整原图静止。返回该页或一键回顶部不重播；刷新才重置。
- 已取消所有人物鼠标、触屏和键盘跟随及相关提示。站定图不再拆分头部。
- 旧视线图集保留作历史素材，网页不再引用/加载；下面的生成提示词仅作历史记录。
- 沿用现有入场图集，本次没有生成或接入新视频。
- 检查：scripts/test_avatar_motion.mjs 与 scripts/test_start_at_home.mjs。

## 素材与实现边界

- 工具：内置 image_gen，动作图集与视线图集各生成一次，未使用API/CLI。
- 站定原图：public/portfolio-assets/09-profile/avatar-original.png，931×1690，原始像素保留。
- 动作：public/portfolio-assets/09-profile/avatar-poses-v2.png，1254×1254，8个姿势。
- 历史视线素材（停用）：已移至 `.local-backups/prepublish-2026-08-31/public/portfolio-assets/09-profile/avatar-gaze-v2.png`，1254×1254，3×3图集，不上传、不打包。
- 两张生成图均为RGB暖象牙白背景，没有alpha；网站不引用生成目录的本机路径。
- 入场属于短动作帧序列，不是带骨骼的实时3D模型，也不是AI视频。
- 图片人工检查了肢体连接与挥手手指。部分斜向视线不准确，未采用；原始人物细节与生成帧并非像素级一致。
- 不做破坏性切图：组件内通过SVG视口显示动作图集，单独校准每帧位置。第一行在y645截断，避免切掉首帧靴底。
- 窗口沿用原大小，内部人物较v1放大约18–20%；所有动作裁切在窗口内。
- 入场1100ms，问好1400ms，之后人物整体静止。模块内存记录本次文档已播放；离开视野/隐藏标签取消动作，回来不重播；刷新重置。不用sessionStorage或localStorage。
- 保留减少动态效果与图片失败回退；不存在人物键盘/触屏跟随。
- 校验：scripts/test_avatar_motion.mjs。预览新增素材时Vite可能因忽略public文件监听而需重启，必须检查image/png，不能只看HTTP200。

## 完整生成提示词（顺序：动作、视线）

```text
Use case: identity-preserve.
Asset type: one production 3D mascot animation sprite atlas, for slicing into eight portrait frames.
Input image 1 is the exact character identity reference. Preserve this same character, not a redesign.
Primary request: render this exact chibi mascot doing a small hop and a friendly one-handed wave as a single square 2048 x 2048 atlas, precisely FOUR equal columns and TWO equal rows. This creates eight 512 x 1024 portrait cells. The cell borders are invisible: NO grid lines, NO labels, NO text.

Backdrop: completely flat solid warm ivory #faf7f5 throughout the entire atlas, no checkerboard and no simulated transparency. Soft studio character lighting matching the reference. At most a very subtle contact shadow immediately under the boots; no background gradients.
Character invariants: same large wavy centrally parted black hair silhouette, black rectangular glasses with silver hinges, big brown eyes, warm skin, small friendly closed-mouth smile, small facial beauty marks, the same oversized head to small body proportions. Same black chunky knit cardigan, ochre cable-knit sweater, brown corduroy cuffed shorts, brown ribbed socks and brown worn lace-up leather boots. Maintain detailed knit and leather textures and original face identity.
Camera invariants: exact same front-facing camera and scale in all eight cells; full body always visible, centered in each cell with small clean padding. Do not change focal length, head size, glasses size, or body proportions across cells. Upright poses must have identical local head, shoulders and foot positions, with feet on the same local baseline around y=955 pixels. Hair top around local y=95. Keep every limb and hand wholly inside its cell with margin. This is a tightly registered animation sheet, not a loose contact sheet.

Exact pose order, left to right on row 1 then left to right on row 2:
1. Idle: the original relaxed pose with both hands in shorts pockets, gentle original head tilt and smile; very close to the provided reference.
2. Hop anticipation: slight crouch, knees visibly flexed, body lowering a little and leaning forward just slightly, arms coming naturally out of pockets to balance.
3. Airborne hop pose: knees flexed, boots tucked upward a little, both arms in a natural compact balancing position, joyful but still original gentle expression. No dramatic leap or flying. Website will animate overall vertical motion, so preserve the same character scale and horizontal center.
4. Landing: knees bent absorbing the impact, both feet restored to the common ground baseline, arms relaxing close to body.
5. Return upright: original standing head, shoulders, and boot placement; one hand remains in pocket and the other starts emerging naturally from its pocket, elbow low.
6. Wave center: same upright standing pose, one hand in pocket; other arm raised with elbow bent, open palm beside the head/shoulder, friendly greeting. Anatomically correct hand, exactly FIVE digits total: four distinct fingers plus one thumb, naturally separated. Keep hand clear of face and wholly inside cell.
7. Wave outward: same standing pose, same arm/elbow and shoulder, only wrist gently tilted outward, open palm, same five fingers, subtle friendly waving movement.
8. Wave inward: same standing pose, same arm/elbow and shoulder, only wrist gently tilted inward, open palm, same five fingers. This must connect smoothly back to frame 6 and later lower to frame 5 then idle.

Critical constraints: all eight copies must be the SAME exact character model and outfit, no restyling, no altered face, no extra arms or hands, no six fingers, no mitten hands, no disconnected fingers, no fused palms. Compact sensible arm anatomy with upper arm, elbow, forearm, wrist and hand correctly connected. Absolutely no props, windows, furniture, motion lines, speech bubbles, arrows, cell numbers, or decorative elements. Precise equal 4-column by 2-row alignment, seamless solid ivory background.

Use case: identity-preserve.
Asset type: a single production 3-by-3 head-only sprite atlas for a cursor-following mascot, composited over the existing STATIC body.
Input image 1: exact character identity, facial geometry, head tilt, hairstyle, glasses, eye color, materials and lighting reference. Do not redraw the body.

Create ONE square image approximately 2048 by 2048 pixels, partitioned into exactly NINE equally sized square cells in a regular 3 columns by 3 rows grid. The cells have no drawn borders, no text, no labels, no numbers, no arrows and no checkerboard. The whole canvas background is a perfectly flat solid warm ivory #faf7f5, including around and between all heads. No gradient, floor, ambient background shadow or fake transparency.

Every cell contains ONLY THE SAME CHARACTER'S FULL HEAD AND SHORT NECK, ending exactly at the mustard sweater neckline. Include complete black wavy parted hair silhouette, BOTH ears, face, eyeglasses and neck. A very narrow mustard collar rim may mark the end of the neck, but NO shoulders, NO coat, NO arms, NO torso and NO other body parts. These must be clean head-and-neck sprites, not bust portraits.

Identity must match the supplied image as closely as possible: oversized friendly chibi head, elaborate black center-parted wavy hair, thick black rounded-rectangular eyeglasses with the same little metallic temple accents, very large expressive brown eyes with exactly one iris and pupil per eye, warm peach skin, same small nose, identical gentle closed-mouth smile and small mole beneath the left side of the mouth as seen in the image. Preserve the original relaxed friendly head tilt. Match the reference's detailed stylized 3D rendering, hair strands, soft studio illumination, colors, proportions and cheerful personality. Do not simplify the hair or redesign the face.

CRITICAL ALIGNMENT: All nine heads have the exact same overall scale and camera distance. Each head and neck is about 85 percent of its square cell's height. Keep full hair and ears inside its own cell, with similar padding in every cell. The base-of-neck pivot is fixed at exactly 50 percent of cell width and 90 percent of cell height in ALL nine cells. Do not move or translate the neck anchor. No size changes, wandering centers, alternative crops, detached necks, or uneven rows. The sprites are nine views of ONE consistent rig. This exact common neck anchor allows swapping heads while the separately composited original body remains perfectly still.

DIRECTIONS ARE SCREEN/VIEWER DIRECTIONS, NOT THE CHARACTER'S LEFT/RIGHT. Make the eye gaze genuinely different and anatomically natural, with the two pupils focused together toward the specified offscreen cursor direction. Both pupils shift naturally within their existing eyes. Head orientation changes only modestly, approximately 6 to 10 degrees in yaw and/or pitch around the fixed neck pivot. Keep the reference's gentle head roll rather than adding a different tilt to each sprite. Do not over-rotate. Eye gaze must be visibly directional rather than looking at the camera in every cell.

Exact reading order:
Top-left cell: gaze UPPER-LEFT, head subtly yawed toward screen-left and pitched upward.
Top-middle cell: gaze UP, head subtly pitched upward.
Top-right cell: gaze UPPER-RIGHT, head subtly yawed toward screen-right and pitched upward.
Middle-left cell: gaze LEFT, head subtly yawed toward screen-left.
Middle-middle cell: NEUTRAL, near-exact original reference head, eyes forward, preserving its original friendly tilt and smile.
Middle-right cell: gaze RIGHT, head subtly yawed toward screen-right.
Bottom-left cell: gaze LOWER-LEFT, head subtly yawed toward screen-left and pitched downward.
Bottom-middle cell: gaze DOWN, head subtly pitched downward.
Bottom-right cell: gaze LOWER-RIGHT, head subtly yawed toward screen-right and pitched downward.

Change ONLY the subtle head yaw/pitch and pupil direction between cells. Keep identity, hairstyle, eyeglass design, warm expression, lighting, scale, neck attachment and cell geometry consistent. Anatomically correct: no duplicated pupils, crossed eyes, extra eyeglasses, floating glass fragments, disjointed necks, clipped hair, altered expressions, body parts, lettering or watermarks.
```
