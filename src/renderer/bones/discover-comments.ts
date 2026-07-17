/**
 * 评论列表示意骨架（手写 bones）。
 * 之后可跑 `npx boneyard-js build` 用真 DOM 覆盖，导入 registry 即可。
 *
 * 坐标约定（boneyard）：
 * - x / w：相对容器宽度的百分比
 * - y / h：像素（runtime 会按容器高度 / height 做 scaleY）
 * - r：圆角；'50%' 在接近正方形时当圆
 *
 * 设计目标：占满评论列表区域；每条正文 2～3 行、宽度错落，避免「一行小条」。
 */
import type { SkeletonResult } from 'boneyard-js';

type Bone = SkeletonResult['bones'][number];

/** 每条评论的内容行宽（%）与行数，制造参差感 */
const ROW_SPECS: { contentWidths: number[] }[] = [
  { contentWidths: [78, 68, 42] },
  { contentWidths: [72, 55] },
  { contentWidths: [80, 74, 58] },
  { contentWidths: [64, 48] },
  { contentWidths: [76, 70, 36] },
  { contentWidths: [70, 52] },
  { contentWidths: [82, 66, 50] },
  { contentWidths: [68, 44] }
];

const AVATAR = 40;
const LINE_H = 13;
const LINE_GAP = 8;
const NAME_H = 14;
const META_H = 11;
const ACTION_H = 12;
/** 行与行之间的空隙 */
const ROW_GAP = 22;
const PAD_TOP = 8;

function commentRowBones(rowIndex: number, top: number): { bones: Bone[]; height: number } {
  const spec = ROW_SPECS[rowIndex % ROW_SPECS.length];
  const bones: Bone[] = [];

  // 头像（约 size-11）
  bones.push([3, top, 9, AVATAR, '50%']);

  // 昵称 + 时间
  bones.push([15, top + 2, 26, NAME_H, 5]);
  bones.push([44, top + 4, 20, META_H, 4]);

  // 正文：2～3 行，宽度不等
  let y = top + 26;
  for (const w of spec.contentWidths) {
    bones.push([15, y, w, LINE_H, 4]);
    y += LINE_H + LINE_GAP;
  }

  // 点赞 / 回复
  bones.push([15, y + 4, 14, ACTION_H, 4]);
  bones.push([33, y + 4, 16, ACTION_H, 4]);

  const height = y + 4 + ACTION_H + ROW_GAP - top;
  return { bones, height };
}

function buildBones(): SkeletonResult {
  const bones: Bone[] = [];
  let y = PAD_TOP;
  for (let i = 0; i < ROW_SPECS.length; i++) {
    const row = commentRowBones(i, y);
    bones.push(...row.bones);
    y += row.height;
  }
  return {
    name: 'discover-comments',
    // width 用于圆头像判定（与 w% 换算）；略宽以贴合 560 面板内容区
    viewportWidth: 520,
    width: 500,
    height: y + 8,
    bones
  };
}

/** 约 8 条评论、多行正文的满屏骨架 */
export const discoverCommentsBones: SkeletonResult = buildBones();
