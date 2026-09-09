# ai-screen-design

基于 Nuxt 4 的低代码大屏搭建工具。左侧拖拽物料到画布，右侧配置属性和数据源，完成后发布为独立访问的大屏页面。

## 功能

- **编辑器**：物料拖入画布，支持框选、多选、拖拽移动、缩放、右键菜单（复制/移除/置顶/置底/锁定）、标尺缩放、撤销重做
- **物料**：基于 ECharts 的 15 种图表（柱状/面积/折线/饼/散点/雷达/K线/漏斗/仪表盘/热力/箱线/旭日/树/矩形树图/桑基图）+ 文本物料。物料通过 `install(register)` 注册，新增图表只需一个定义文件
- **属性面板**：按物料动态生成表单（输入/颜色/下拉/数字/勾选），支持 JSON 模式直接编辑节点 DSL
- **数据源**：静态数据或 API 拉取，支持轮询间隔、响应路径取值、同请求去重
- **事件系统**：物料可绑定点击/双击等事件，用户写的代码在 Proxy 沙箱中执行，支持跨物料调用
- **发布**：页面 schema 存到服务端（Nitro useStorage），发布后通过 `/screen?id=xxx` 访问，服务端渲染出首屏
- **主题**：编辑器支持 shadcn 风格浅色 / 经典暗色两套主题，切换即时生效并持久化

## 技术栈

- [Nuxt 4](https://nuxt.com)（Nitro 服务端 + Vite）
- Vue 3.5 / Pinia / TypeScript
- Element Plus（`@element-plus/nuxt` 按需引入）
- Tailwind CSS 4 + 自定义 CSS 变量主题体系
- ECharts 6 / Monaco Editor / vue3-moveable / vue3-selecto / vue3-sketch-ruler

## 目录结构

```
app/                  # Nuxt 应用层（Nuxt 4 约定的 srcDir）
├── pages/            # 路由：editor 编辑器 / preview 预览 / screen 发布页
├── editor/           # 编辑器主体：canvas 画布、toolbar 工具栏、panels 各面板
├── materials/        # 物料注册表与物料定义（charts/ 15 种图表 + text/）
├── components/       # 通用组件（ScreenRenderer 渲染器、MonacoEditor）
├── composables/      # useUndoRedo（命令模式撤销重做）、useDataSource、useTheme
├── stores/           # Pinia：编辑器状态与页面 DSL
├── runtime/          # 事件沙箱与运行时上下文
└── assets/           # 主题变量（themes.css 双主题）与样式
server/               # Nitro 服务端
├── api/pages/        # 发布页面的存取接口
└── api/data.get.ts   # 数据源示例接口
shared/schema/        # 前后端共用的页面/物料类型定义
```

## 快速开始

```bash
pnpm install

# 开发
pnpm dev              # http://localhost:3000

# 类型检查 / 代码检查
pnpm type-check
pnpm lint

# 生产构建
pnpm build
pnpm preview
```

Node.js 要求 `^22.18.0 || >=24.12.0`。

## 使用流程

1. 访问 `/editor` 进入编辑器
2. 从左侧物料面板拖拽图表到画布，拖入即可选中和缩放
3. 右侧属性面板调整样式，「数据源」Tab 绑定静态数据或 API
4. 工具栏「预览」查看效果，「发布」后得到 `/screen?id=xxx` 链接
5. 数据源填 `/api/data?date=2026-01-01` 体验接口轮询（内置示例接口）

## 发布数据存储

发布接口使用 Nitro 的 `useStorage('data')`，默认写入项目根目录 `.data/`（已 gitignore）。该抽象与驱动解耦，需要多实例共享时在 `nuxt.config.ts` 里换 Redis 等驱动即可，业务代码不用动。

## 文档

- [架构设计](./docs/architecture-design.md)
- [学习笔记](./docs/project-learning-guide.md)
