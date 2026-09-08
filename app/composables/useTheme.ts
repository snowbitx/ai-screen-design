export type ThemeName = 'shadcn' | 'classic'

/**
 * 编辑器主题切换：
 * - shadcn：默认浅色（Neutral），应用每次启动都使用默认浅色主题
 * - classic：经典暗色主题，工具栏手动切换，仅当前会话生效
 * 通过 html 上的 .theme-classic 类切换变量集
 */
export function useTheme() {
  const theme = useState<ThemeName>('editor-theme', () => 'shadcn')

  function apply(name: ThemeName) {
    theme.value = name
    if (import.meta.client) {
      document.documentElement.classList.toggle('theme-classic', name === 'classic')
    }
  }

  function toggle() {
    apply(theme.value === 'shadcn' ? 'classic' : 'shadcn')
  }

  return {
    theme,
    apply,
    toggle,
    isClassic: computed(() => theme.value === 'classic'),
  }
}
