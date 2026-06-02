import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: "MengDe's Blog",
  description: '记录个人开源项目与技术知识分享',

  themeDir: '.vitepress',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'author', content: 'MengDe' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Noto+Serif+SC:wght@400;500;600;700&display=swap' }],
  ],

  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/posts/' },
      { text: 'Rudder 文档', link: '/rudder/' },
      { text: '笔记', link: '/notes/' },
      { text: '关于', link: '/about' },
    ],

    editLink: {
      pattern: 'https://github.com/MengDe1231/mengde-blog/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    sidebar: {
      '/rudder/': [
        {
          text: '入门',
          collapsed: false,
          items: [
            { text: '快速开始', link: '/rudder/01-入门/快速开始' },
            { text: '核心概念', link: '/rudder/01-入门/核心概念' },
          ],
        },
        {
          text: '使用指南',
          collapsed: false,
          items: [
            { text: '日常使用指南', link: '/rudder/02-使用指南/日常使用指南' },
            { text: '工作流', link: '/rudder/02-使用指南/工作流' },
            { text: '任务系统', link: '/rudder/02-使用指南/任务系统' },
            { text: '工作区系统', link: '/rudder/02-使用指南/工作区系统' },
            { text: 'PRD 编写指南', link: '/rudder/02-使用指南/PRD编写指南' },
          ],
        },
        {
          text: '配置与定制',
          collapsed: false,
          items: [
            { text: '平台配置', link: '/rudder/03-配置与定制/平台配置' },
            { text: '配置指南', link: '/rudder/03-配置与定制/配置指南' },
            { text: '自定义工作流', link: '/rudder/03-配置与定制/自定义工作流' },
            { text: 'Monorepo 指南', link: '/rudder/03-配置与定制/Monorepo指南' },
          ],
        },
        {
          text: '参考',
          collapsed: false,
          items: [
            { text: 'Spec 系统', link: '/rudder/04-参考/Spec系统' },
            { text: 'Spec Bootstarp', link: '/rudder/04-参考/SpecBootstarp' },
            { text: '脚本参考', link: '/rudder/04-参考/脚本参考' },
            { text: '速查表', link: '/rudder/04-参考/速查表' },
            { text: 'FAQ', link: '/rudder/04-参考/FAQ' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/MengDe1231' },
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: { noResultsText: '无法找到相关结果', displayFooter: true, footer: { selectText: '选择', navigateText: '切换' } },
            },
          },
        },
      },
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 MengDe',
    },
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'material-theme-palenight',
    },
  },
})
