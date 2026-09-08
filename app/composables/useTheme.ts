export type ThemeName = 'shadcn' | 'classic'

const THEME_KEY = 'editor-theme'

/**
 * 编辑器主题切换：
 * - shadcn：默认浅色（Neutral）
 * - classic：原暗色主题
 * 状态持久化在 localStorage，通过 html 上的 .theme-classic 类切换变量集
 */
export function useTheme() {
  const theme = useState<ThemeName>('editor-theme', () => 'shadcn')

  function apply(name: ThemeName) {
    theme.value = name
    if (import.meta.client) {
      document.documentElement.classList.toggle('theme-classic', name === 'classic')
      localStorage.setItem(THEME_KEY, name)
    }
  }

  function toggle() {
    apply(theme.value === 'shadcn' ? 'classic' : 'shadcn')
  }

  // 首次客户端挂载时恢复上次选择
  if (import.meta.client) {
    const saved = localStorage.getItem(THEME_KEY) as ThemeName | null
    if (saved && saved !== theme.value) apply(saved)
  }

  return {
    theme,
    apply,
    toggle,
    isClassic: computed(() => theme.value === 'classic'),
  }
}
