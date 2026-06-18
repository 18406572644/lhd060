const ThemeSystem = (() => {
  const THEME_STORAGE_KEY = 'pomodoro_theme_config';

  const THEME_KEYS = [
    'primary', 'accent', 'sidebarBg', 'sidebarText', 'sidebarTextMuted',
    'contentBg', 'contentText', 'contentTextMuted', 'border', 'success'
  ];

  const THEME_KEY_LABELS = {
    primary: '主色',
    accent: '强调色',
    sidebarBg: '侧栏背景',
    sidebarText: '侧栏文字',
    sidebarTextMuted: '侧栏次要文字',
    contentBg: '内容区背景',
    contentText: '内容区文字',
    contentTextMuted: '内容区次要文字',
    border: '边框色',
    success: '成功色'
  };

  const BUILTIN_THEMES = {
    classic: {
      id: 'classic',
      name: '经典深色',
      description: '深蓝侧栏 + 白色内容区',
      vars: {
        primary: '#22c55e',
        accent: '#16a34a',
        sidebarBg: '#1a1a2e',
        sidebarText: '#ffffff',
        sidebarTextMuted: 'rgba(255,255,255,0.5)',
        contentBg: '#ffffff',
        contentText: '#1a1a2e',
        contentTextMuted: '#999999',
        border: '#f0f0f0',
        success: '#22c55e'
      },
      font: null,
      preview: { sidebar: '#1a1a2e', content: '#ffffff', accent: '#22c55e' }
    },
    dark: {
      id: 'dark',
      name: '全暗模式',
      description: '全局深色背景，夜间护眼',
      vars: {
        primary: '#22c55e',
        accent: '#4ade80',
        sidebarBg: '#0f0f1a',
        sidebarText: '#e5e5e5',
        sidebarTextMuted: 'rgba(255,255,255,0.4)',
        contentBg: '#181825',
        contentText: '#e5e5e5',
        contentTextMuted: '#737373',
        border: '#2a2a3a',
        success: '#22c55e'
      },
      font: null,
      preview: { sidebar: '#0f0f1a', content: '#181825', accent: '#22c55e' }
    },
    light: {
      id: 'light',
      name: '浅色极简',
      description: '全局浅色，Notion 风格',
      vars: {
        primary: '#3b82f6',
        accent: '#2563eb',
        sidebarBg: '#f7f6f3',
        sidebarText: '#37352f',
        sidebarTextMuted: 'rgba(55,53,47,0.5)',
        contentBg: '#ffffff',
        contentText: '#37352f',
        contentTextMuted: '#9b9a97',
        border: '#e9e9e7',
        success: '#22c55e'
      },
      font: null,
      preview: { sidebar: '#f7f6f3', content: '#ffffff', accent: '#3b82f6' }
    },
    contrast: {
      id: 'contrast',
      name: '高对比度',
      description: '黑白配色，WCAG AAA 标准',
      vars: {
        primary: '#000000',
        accent: '#000000',
        sidebarBg: '#000000',
        sidebarText: '#ffffff',
        sidebarTextMuted: '#ffffff',
        contentBg: '#ffffff',
        contentText: '#000000',
        contentTextMuted: '#000000',
        border: '#000000',
        success: '#006600'
      },
      font: null,
      preview: { sidebar: '#000000', content: '#ffffff', accent: '#000000' }
    },
    eyeCare: {
      id: 'eyeCare',
      name: '护眼绿',
      description: '淡绿色背景，长时间使用友好',
      vars: {
        primary: '#16a34a',
        accent: '#15803d',
        sidebarBg: '#a8d5ba',
        sidebarText: '#1a472a',
        sidebarTextMuted: 'rgba(26,71,42,0.6)',
        contentBg: '#C7EDCC',
        contentText: '#1a472a',
        contentTextMuted: '#5a8a6a',
        border: '#a8d5ba',
        success: '#16a34a'
      },
      font: null,
      preview: { sidebar: '#a8d5ba', content: '#C7EDCC', accent: '#16a34a' }
    },
    sakura: {
      id: 'sakura',
      name: '樱花粉',
      description: '粉色调，女生向',
      vars: {
        primary: '#ec4899',
        accent: '#db2777',
        sidebarBg: '#fce7f3',
        sidebarText: '#831843',
        sidebarTextMuted: 'rgba(131,24,67,0.6)',
        contentBg: '#fdf2f8',
        contentText: '#831843',
        contentTextMuted: '#be7d99',
        border: '#fbcfe8',
        success: '#f472b6'
      },
      font: null,
      preview: { sidebar: '#fce7f3', content: '#fdf2f8', accent: '#ec4899' }
    },
    terminal: {
      id: 'terminal',
      name: '代码风',
      description: '黑色背景 + 等宽字体 + 绿色文字',
      vars: {
        primary: '#00ff00',
        accent: '#00cc00',
        sidebarBg: '#0d0d0d',
        sidebarText: '#00ff00',
        sidebarTextMuted: 'rgba(0,255,0,0.5)',
        contentBg: '#1a1a1a',
        contentText: '#00ff00',
        contentTextMuted: '#008800',
        border: '#333333',
        success: '#00ff00'
      },
      font: "'DM Mono', 'Courier New', monospace",
      preview: { sidebar: '#0d0d0d', content: '#1a1a1a', accent: '#00ff00' }
    },
    sunset: {
      id: 'sunset',
      name: '夕阳橙',
      description: '暖橙色调，适合傍晚',
      vars: {
        primary: '#f97316',
        accent: '#ea580c',
        sidebarBg: '#2d1b0e',
        sidebarText: '#fed7aa',
        sidebarTextMuted: 'rgba(254,215,170,0.5)',
        contentBg: '#fff7ed',
        contentText: '#431407',
        contentTextMuted: '#9a6a55',
        border: '#fed7aa',
        success: '#f97316'
      },
      font: null,
      preview: { sidebar: '#2d1b0e', content: '#fff7ed', accent: '#f97316' }
    }
  };

  const SYSTEM_DARK_THEMES = ['dark', 'terminal'];
  const SYSTEM_LIGHT_THEMES = ['light', 'eyeCare', 'sakura', 'sunset', 'contrast', 'classic'];

  let config = {
    mode: 'builtin',
    themeId: 'classic',
    followSystem: false,
    customTheme: null
  };

  let systemDarkListener = null;
  let currentAppliedTheme = null;
  let pomodoroDynamicActive = false;
  let dynamicProgress = 0;

  function loadConfig() {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        config = { ...config, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('加载主题配置失败:', e);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('保存主题配置失败:', e);
    }
  }

  function getSystemPrefersDark() {
    if (!window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolveThemeId() {
    if (config.followSystem) {
      return getSystemPrefersDark() ? 'dark' : 'light';
    }
    if (config.mode === 'custom' && config.customTheme) {
      return '__custom__';
    }
    return config.themeId;
  }

  function getEffectiveTheme() {
    const id = resolveThemeId();
    if (id === '__custom__') {
      return {
        id: '__custom__',
        ...config.customTheme
      };
    }
    return { id, ...BUILTIN_THEMES[id] };
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
      return hex;
    }).join('');
  }

  function getBrightness(hexOrRgb) {
    let rgb;
    if (typeof hexOrRgb === 'string') {
      rgb = hexToRgb(hexOrRgb);
      if (!rgb) {
        const m = hexOrRgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return 128;
        rgb = { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
      }
    } else {
      rgb = hexOrRgb;
    }
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  }

  function pickContrastText(bgHex) {
    return getBrightness(bgHex) > 140 ? '#000000' : '#ffffff';
  }

  function darkenHex(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(
      rgb.r * (1 - amount),
      rgb.g * (1 - amount),
      rgb.b * (1 - amount)
    );
  }

  function lightenHex(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(
      rgb.r + (255 - rgb.r) * amount,
      rgb.g + (255 - rgb.g) * amount,
      rgb.b + (255 - rgb.b) * amount
    );
  }

  function rgbaFromHex(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      const m = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return `rgba(128, 128, 128, ${alpha})`;
      return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function lerpColor(color1, color2, t) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1;
    return rgbToHex(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    );
  }

  function applyTheme(themeOverride) {
    const theme = themeOverride || getEffectiveTheme();
    currentAppliedTheme = theme;

    const root = document.documentElement;
    let vars = { ...theme.vars };

    if (pomodoroDynamicActive) {
      applyPomodoroDynamic(vars);
    }

    root.style.setProperty('--color-primary', vars.primary);
    root.style.setProperty('--color-accent', vars.accent);
    root.style.setProperty('--color-sidebar-bg', vars.sidebarBg);
    root.style.setProperty('--color-sidebar-text', vars.sidebarText);
    root.style.setProperty('--color-sidebar-text-muted', vars.sidebarTextMuted);
    root.style.setProperty('--color-content-bg', vars.contentBg);
    root.style.setProperty('--color-content-text', vars.contentText);
    root.style.setProperty('--color-content-text-muted', vars.contentTextMuted);
    root.style.setProperty('--color-border', vars.border);
    root.style.setProperty('--color-success', vars.success);

    const btnPrimaryText = pickContrastText(vars.primary);
    const btnPrimaryHover = getBrightness(vars.accent) > 140
      ? darkenHex(vars.accent, 0.08)
      : lightenHex(vars.accent, 0.12);
    root.style.setProperty('--btn-primary-bg', vars.primary);
    root.style.setProperty('--btn-primary-text', btnPrimaryText);
    root.style.setProperty('--btn-primary-hover', btnPrimaryHover);

    const contentBright = getBrightness(vars.contentBg);
    const isContentLight = contentBright > 140;

    const btnCancelBg = isContentLight
      ? rgbaFromHex(vars.contentText, 0.03)
      : rgbaFromHex(vars.contentText, 0.05);
    const btnCancelHoverBg = isContentLight
      ? rgbaFromHex(vars.contentText, 0.07)
      : rgbaFromHex(vars.contentText, 0.12);
    root.style.setProperty('--btn-cancel-bg', btnCancelBg);
    root.style.setProperty('--btn-cancel-text', vars.contentTextMuted);
    root.style.setProperty('--btn-cancel-hover-bg', btnCancelHoverBg);

    root.style.setProperty('--btn-secondary-bg', 'transparent');
    root.style.setProperty('--btn-secondary-text', vars.contentText);
    root.style.setProperty('--btn-secondary-border', vars.border);
    root.style.setProperty('--btn-secondary-hover-bg', rgbaFromHex(vars.primary, 0.06));
    root.style.setProperty('--btn-secondary-hover-border', vars.primary);
    root.style.setProperty('--btn-secondary-hover-text', vars.primary);

    root.style.setProperty('--primary-light-50', rgbaFromHex(vars.primary, 0.04));
    root.style.setProperty('--primary-light-100', rgbaFromHex(vars.primary, 0.06));
    root.style.setProperty('--primary-light-200', rgbaFromHex(vars.primary, 0.2));

    const cardBg = isContentLight
      ? vars.contentBg
      : rgbaFromHex('#ffffff', 0.03);
    const cardHoverBg = isContentLight
      ? rgbaFromHex(vars.contentText, 0.02)
      : rgbaFromHex('#ffffff', 0.05);
    root.style.setProperty('--content-card-bg', cardBg);
    root.style.setProperty('--content-card-bg-hover', cardHoverBg);

    if (theme.font) {
      root.style.setProperty('--font-family-base', theme.font);
    } else {
      root.style.setProperty('--font-family-base', "'DM Sans', sans-serif");
    }

    const sidebarRgb = hexToRgb(vars.sidebarBg);
    if (sidebarRgb) {
      const brightness = (sidebarRgb.r * 299 + sidebarRgb.g * 587 + sidebarRgb.b * 114) / 1000;
      root.style.setProperty('--sidebar-overlay-opacity', brightness > 128 ? '0.05' : '0.08');
      root.style.setProperty('--sidebar-border-opacity', brightness > 128 ? '0.12' : '0.06');
    }

    const contentRgb = hexToRgb(vars.contentBg);
    if (contentRgb) {
      const brightness = (contentRgb.r * 299 + contentRgb.g * 587 + contentRgb.b * 114) / 1000;
      root.style.setProperty('--content-overlay-opacity', brightness > 128 ? '0.03' : '0.05');
    }

    root.setAttribute('data-theme', theme.id);

    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: theme.id } }));
    }
  }

  function applyPomodoroDynamic(vars) {
    if (dynamicProgress <= 0.33) {
      return vars;
    }
    const colorStages = [
      { at: 0, color: vars.primary },
      { at: 0.5, color: '#f59e0b' },
      { at: 0.85, color: '#ef4444' }
    ];
    let dynamicPrimary = vars.primary;
    for (let i = 0; i < colorStages.length - 1; i++) {
      const start = colorStages[i];
      end = colorStages[i + 1];
      if (dynamicProgress >= start.at && dynamicProgress <= end.at) {
        const localT = (dynamicProgress - start.at) / (end.at - start.at);
        dynamicPrimary = lerpColor(start.color, end.color, localT);
        break;
      }
    }
    if (dynamicProgress > colorStages[colorStages.length - 1].at) {
      dynamicPrimary = colorStages[colorStages.length - 1].color;
    }
    vars.primary = dynamicPrimary;
    vars.accent = dynamicPrimary;
    vars.success = dynamicPrimary;
    return vars;
  }

  function setPomodoroDynamic(active, progress) {
    pomodoroDynamicActive = active;
    dynamicProgress = progress || 0;
    applyTheme();
    if (active && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('theme-dynamic-updated', { detail: { active, progress: dynamicProgress } }));
    }
  }

  function switchTheme(themeId) {
    config.mode = 'builtin';
    config.themeId = themeId;
    config.followSystem = false;
    saveConfig();
    applyTheme();
  }

  function setFollowSystem(enabled) {
    config.followSystem = enabled;
    saveConfig();
    applyTheme();
    if (enabled) {
      setupSystemListener();
    } else {
      removeSystemListener();
    }
  }

  function setupSystemListener() {
    if (!window.matchMedia) return;
    removeSystemListener();
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    systemDarkListener = (e) => {
      if (config.followSystem) {
        applyTheme();
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', systemDarkListener);
    } else if (mql.addListener) {
      mql.addListener(systemDarkListener);
    }
  }

  function removeSystemListener() {
    if (!window.matchMedia && systemDarkListener) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      if (mql.removeEventListener) {
        mql.removeEventListener('change', systemDarkListener);
      } else if (mql.removeListener) {
        mql.removeListener(systemDarkListener);
      }
      systemDarkListener = null;
    }
  }

  function saveCustomTheme(name, vars, font) {
    config.mode = 'custom';
    config.customTheme = {
      id: 'custom',
      name: name || '我的主题',
      vars,
      font: font || null,
      preview: {
        sidebar: vars.sidebarBg, content: vars.contentBg, accent: vars.primary
      }
    };
    config.followSystem = false;
    saveConfig();
    applyTheme();
  }

  function resetToBuiltin(themeId) {
    config.mode = 'builtin';
    config.themeId = themeId || 'classic';
    config.customTheme = null;
    config.followSystem = false;
    saveConfig();
    applyTheme();
  }

  function exportTheme() {
    if (config.customTheme) {
      return JSON.stringify(config.customTheme, null, 2);
    }
    return null;
  }

  function importTheme(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.vars || typeof parsed.vars !== 'object') {
        throw new Error('缺少 vars 字段');
      }
      const missingKeys = THEME_KEYS.filter(k => !parsed.vars[k]);
      if (missingKeys.length > 0) {
        throw new Error('缺少字段: ' + missingKeys.join(', '));
      }
      saveCustomTheme(parsed.name || '导入主题', parsed.vars, parsed.font || null);
      return true;
    } catch (e) {
      console.error('导入主题失败:', e);
      return e.message;
    }
  }

  function getBuiltinThemes() {
    return Object.values(BUILTIN_THEMES);
  }

  function getThemeKeys() {
    return THEME_KEYS.map(k => ({ key: k, label: THEME_KEY_LABELS[k] }));
  }

  function getDefaultVars() {
    return { ...BUILTIN_THEMES.classic.vars };
  }

  function getConfig() {
    return { ...config };
  }

  function init() {
    loadConfig();
    if (config.followSystem) {
      setupSystemListener();
    }
    applyTheme();
  }

  return {
    init,
    switchTheme,
    setFollowSystem,
    saveCustomTheme,
    resetToBuiltin,
    exportTheme,
    importTheme,
    getBuiltinThemes,
    getThemeKeys,
    getDefaultVars,
    getConfig,
    getEffectiveTheme,
    setPomodoroDynamic,
    THEME_KEYS,
    THEME_KEY_LABELS
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeSystem;
}
