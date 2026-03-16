# Next.js Dashboard

基于 [Next.js 官方教程](https://nextjs.org/learn) 构建的全栈财务仪表盘应用，涵盖了 Next.js App Router 的核心功能实践。

## 功能特性

- **用户认证**：基于 NextAuth.js 的 Credentials 登录，密码通过 bcrypt 加密校验
- **仪表盘概览**：展示收入图表、最新发票及汇总卡片，支持流式渲染（Streaming）
- **发票管理**：创建、编辑、删除发票，表单含服务端验证与无障碍访问支持
- **客户列表**：查看所有客户信息
- **搜索与分页**：基于 URL 搜索参数实现的发票搜索与分页
- **错误处理**：`error.tsx` 捕获路由错误，`not-found.tsx` 处理 404

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js (App Router, Turbopack) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | PostgreSQL（Neon） |
| ORM | postgres.js |
| 认证 | NextAuth.js v5 |
| 表单验证 | Zod |
| UI 图标 | Heroicons |

## 快速开始

### 前置要求

- Node.js 18+
- pnpm
- PostgreSQL 数据库（推荐使用 [Neon](https://neon.tech)）

### 安装

```bash
pnpm install
```

### 环境变量

在项目根目录创建 `.env` 文件，填入以下变量：

```env
POSTGRES_URL=your_postgres_connection_string
AUTH_SECRET=your_nextauth_secret
```

生成 `AUTH_SECRET` 可以使用：

```bash
openssl rand -base64 32
```

### 数据库初始化

访问 `/seed` 路由可以初始化数据库并写入示例数据。

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
app/
├── dashboard/
│   ├── (overview)/       # 仪表盘首页（收入图表、最新发票）
│   ├── invoices/         # 发票列表、创建、编辑
│   └── customers/        # 客户列表
├── login/                # 登录页
├── lib/
│   ├── actions.ts        # Server Actions（CRUD + 认证）
│   ├── data.ts           # 数据查询函数
│   └── definitions.ts    # 类型定义
└── ui/                   # 可复用 UI 组件
auth.ts                   # NextAuth 配置
auth.config.ts            # 路由守卫中间件配置
```

## 测试账号

| 字段 | 值 |
|------|----|
| Email | user@nextmail.com |
| Password | 123456 |

## 学习要点

本项目实践了以下 Next.js 核心概念：

- App Router 文件系统路由
- Server Components 与 Client Components
- Server Actions 处理表单提交
- Streaming 与 Suspense 实现渐进式加载
- 基于 URL 参数的搜索与分页
- 使用 `error.tsx` 和 `not-found.tsx` 处理错误
- NextAuth.js 中间件路由保护
- Zod 服务端表单验证
- React `useActionState` 与 `useFormStatus`
