import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [guiTheme, setGuiTheme] = useState(localStorage.getItem('cfi_gui_theme') || 'legacy');
  const [colorMode, setColorMode] = useState(localStorage.getItem('cfi_color_mode') || 'system');
  const [resolvedMode, setResolvedMode] = useState('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-legacy', 'theme-modern', 'light', 'dark');

    root.classList.add(`theme-${guiTheme}`);

    let activeMode = colorMode;
    if (colorMode === 'system') {
      activeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.add(activeMode);
    setResolvedMode(activeMode);

    localStorage.setItem('cfi_gui_theme', guiTheme);
    localStorage.setItem('cfi_color_mode', colorMode);
  }, [guiTheme, colorMode]);

  useEffect(() => {
    if (colorMode !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      const mode = e.matches ? 'dark' : 'light';
      root.classList.add(mode);
      setResolvedMode(mode);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [colorMode]);

  const isModernLight = guiTheme === 'modern' && resolvedMode === 'light';

  return (
    <ThemeContext.Provider value={{ guiTheme, setGuiTheme, colorMode, setColorMode, resolvedMode, isModernLight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
