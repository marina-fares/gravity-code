import { createTheme } from '@mui/material/styles';

// ── Gravity Code Design System ─────────────────────────────
// Exact logo colours:
//   #00AEEF  Sky Blue  (GRAVITY text)  → primary
//   #1B3A6B  Deep Navy (CODE text)     → secondary / navbar
//   #F7941D  Orange    (triangle)      → warning / CTA
//   #E91E8C  Magenta   (dot)           → error / accent
//
// SINGLE SOURCE OF TRUTH:
//   Change palette values here → MUI components + CSS vars + Bootstrap overrides ALL update

const theme = createTheme({
  palette: {
    primary: {
      main: '#00AEEF',
      dark: '#0091C7',
      light: '#33BEFF',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1B3A6B',
      dark: '#122850',
      light: '#2D5499',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#F7941D',
      dark: '#D4780A',
      light: '#FFB347',
      contrastText: '#ffffff',
    },
    error: {
      main: '#E91E8C',
      dark: '#C4006F',
      light: '#FF5BAB',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10B981',
      dark: '#059669',
      light: '#34D399',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F4FBFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0D2137',
      secondary: '#5A7A8F',
      disabled: '#9CB3C0',
    },
    divider: '#C8E8F8',
    action: {
      hover: 'rgba(0, 174, 239, 0.06)',
      selected: 'rgba(0, 174, 239, 0.10)',
      disabledBackground: 'rgba(0,0,0,0.06)',
    },
  },

  typography: {
    fontFamily: '"Outfit", "Segoe UI", "Roboto", sans-serif',
    h1: { fontWeight: 800, lineHeight: 1.2 },
    h2: { fontWeight: 700, lineHeight: 1.3 },
    h3: { fontWeight: 700, lineHeight: 1.3 },
    h4: { fontWeight: 600, lineHeight: 1.4 },
    h5: { fontWeight: 600, lineHeight: 1.4 },
    h6: { fontWeight: 600, lineHeight: 1.5 },
    subtitle1: { fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, lineHeight: 1.5 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.02em' },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
  },

  shape: { borderRadius: 10 },

  components: {
    // ── CSS Baseline: inject CSS vars from palette (SINGLE SOURCE OF TRUTH) ──
    MuiCssBaseline: {
      styleOverrides: (t) => `
        :root {
          --gc-blue:       ${t.palette.primary.main};
          --gc-blue-dark:  ${t.palette.primary.dark};
          --gc-blue-light: ${t.palette.primary.light};
          --gc-navy:       ${t.palette.secondary.main};
          --gc-navy-dark:  ${t.palette.secondary.dark};
          --gc-navy-light: ${t.palette.secondary.light};
          --gc-orange:     ${t.palette.warning.main};
          --gc-pink:       ${t.palette.error.main};
          --gc-green:      ${t.palette.success.main};
          --gc-bg:         ${t.palette.background.default};
          --gc-bg2:        #E8F6FD;
          --gc-surface:    ${t.palette.background.paper};
          --gc-border:     ${t.palette.divider};
          --gc-border2:    #E0F3FC;
          --gc-text:       ${t.palette.text.primary};
          --gc-muted:      ${t.palette.text.secondary};
          --gc-blue-rgb:   0, 174, 239;
          --gc-navy-rgb:   27, 58, 107;
          --gc-pink-rgb:   233, 30, 140;
          --gc-shadow:     0 2px 12px rgba(0, 174, 239, 0.10);
          --gc-shadow-lg:  0 8px 32px rgba(27, 58, 107, 0.14);
        }
        body {
          background-color: ${t.palette.background.default};
          font-family: 'Outfit', 'Segoe UI', 'Roboto', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: ${t.palette.text.primary};
          scrollbar-width: thin;
          scrollbar-color: ${t.palette.divider} ${t.palette.background.default};
        }
        body::-webkit-scrollbar { width: 6px; height: 6px; }
        body::-webkit-scrollbar-track { background: ${t.palette.background.default}; }
        body::-webkit-scrollbar-thumb { background-color: ${t.palette.divider}; border-radius: 3px; }
        body::-webkit-scrollbar-thumb:hover { background-color: ${t.palette.primary.main}; }
      `,
    },

    // ── Buttons ──────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          padding: '8px 18px',
          transition: 'all 0.2s ease',
        },
        containedPrimary: ({ theme: t }) => ({
          background: `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
            boxShadow: '0 4px 14px rgba(var(--gc-blue-rgb), 0.35)',
          },
        }),
        containedSecondary: ({ theme: t }) => ({
          background: `linear-gradient(135deg, ${t.palette.secondary.main} 0%, ${t.palette.secondary.light} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${t.palette.secondary.light} 0%, ${t.palette.secondary.main} 100%)`,
            boxShadow: '0 4px 14px rgba(var(--gc-navy-rgb), 0.35)',
          },
        }),
        outlinedPrimary: ({ theme: t }) => ({
          borderColor: t.palette.primary.main,
          '&:hover': {
            backgroundColor: t.palette.action.hover,
            boxShadow: '0 2px 8px rgba(var(--gc-blue-rgb), 0.15)',
          },
        }),
        outlinedSecondary: ({ theme: t }) => ({
          borderColor: t.palette.secondary.main,
          '&:hover': { backgroundColor: 'rgba(27,58,107,0.04)' },
        }),
        textPrimary: ({ theme: t }) => ({
          '&:hover': { backgroundColor: t.palette.action.hover },
        }),
        sizeSmall: { padding: '5px 12px', fontSize: '0.8125rem' },
        sizeLarge: { padding: '10px 24px', fontSize: '1rem' },
      },
    },

    // ── Paper ────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 12 },
        elevation0: { border: '1px solid var(--gc-border2)' },
        elevation1: { boxShadow: '0 2px 12px rgba(var(--gc-blue-rgb), 0.10)', border: '1px solid var(--gc-border2)' },
        elevation2: { boxShadow: '0 4px 20px rgba(var(--gc-blue-rgb), 0.13)' },
        elevation3: { boxShadow: '0 8px 32px rgba(var(--gc-navy-rgb), 0.14)' },
        elevation4: { boxShadow: '0 12px 40px rgba(var(--gc-navy-rgb), 0.18)' },
      },
    },

    // ── MUI Card ─────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(var(--gc-blue-rgb), 0.10)',
          border: '1px solid var(--gc-border2)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': { boxShadow: '0 4px 20px rgba(var(--gc-blue-rgb), 0.15)' },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--gc-bg)',
          borderBottom: '1px solid var(--gc-border)',
          padding: '14px 20px',
        },
        title: ({ theme: t }) => ({ fontWeight: 600, color: t.palette.secondary.main, fontSize: '1rem' }),
        subheader: ({ theme: t }) => ({ color: t.palette.text.secondary, fontSize: '0.8125rem' }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': { paddingBottom: '20px' },
        },
      },
    },

    // ── Text Fields & Inputs ─────────────────────────────────
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': { borderColor: 'var(--gc-border)', transition: 'border-color 0.15s ease' },
          '&:hover fieldset': { borderColor: 'var(--gc-blue)' },
          '&.Mui-focused fieldset': { borderColor: 'var(--gc-blue)', borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          '&.Mui-focused': { color: 'var(--gc-blue)' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: { outlined: { borderRadius: 8 } },
    },

    // ── Autocomplete ─────────────────────────────────────────
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(var(--gc-navy-rgb), 0.15)',
          border: '1px solid var(--gc-border)',
        },
        option: {
          borderRadius: 6,
          margin: '2px 6px',
          '&[aria-selected="true"]': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.10)' },
          '&:hover': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.06)' },
        },
      },
    },

    // ── AppBar / Navbar ──────────────────────────────────────
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--gc-border)',
          boxShadow: '0 2px 16px rgba(var(--gc-navy-rgb), 0.08)',
          borderRadius: 16,
          overflow: 'hidden',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: '64px !important' } },
    },

    // ── Dialogs ──────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(var(--gc-navy-rgb), 0.20)',
          border: '1px solid var(--gc-border2)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontWeight: 700,
          color: t.palette.secondary.main,
          fontSize: '1.05rem',
          paddingBottom: 8,
          borderBottom: '1px solid var(--gc-border2)',
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: '16px !important' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 24px', borderTop: '1px solid var(--gc-border2)' } },
    },

    // ── Chips ────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6, fontSize: '0.8rem' },
        colorPrimary: { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.12)', color: 'var(--gc-blue-dark)' },
        colorSecondary: { backgroundColor: 'rgba(var(--gc-navy-rgb), 0.10)', color: 'var(--gc-navy)' },
        colorWarning: { backgroundColor: 'rgba(247,148,29,0.12)', color: 'var(--gc-orange)' },
        colorError: { backgroundColor: 'rgba(var(--gc-pink-rgb), 0.12)', color: 'var(--gc-pink)' },
        colorSuccess: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#059669' },
      },
    },

    // ── Menus ────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(var(--gc-navy-rgb), 0.15)',
          border: '1px solid var(--gc-border)',
          padding: '4px 0',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '2px 6px',
          padding: '8px 12px',
          fontSize: '0.9rem',
          '&:hover': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.08)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(var(--gc-blue-rgb), 0.12)',
            '&:hover': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.16)' },
          },
        },
      },
    },

    // ── Backdrop / Loading ───────────────────────────────────
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 33, 55, 0.65)',
          backdropFilter: 'blur(4px)',
        },
      },
    },

    // ── Tables ───────────────────────────────────────────────
    MuiTableContainer: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid var(--gc-border2)' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'var(--gc-bg)',
            color: 'var(--gc-navy)',
            fontWeight: 700,
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: '2px solid var(--gc-border)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.025)' },
          '&:hover': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.05)' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'var(--gc-border2)', fontSize: '0.875rem' },
      },
    },

    // ── Misc ─────────────────────────────────────────────────
    MuiAvatar: {
      styleOverrides: {
        root: ({ theme: t }) => ({ backgroundColor: t.palette.primary.main, color: '#ffffff', fontWeight: 700 }),
        colorDefault: { backgroundColor: 'var(--gc-bg2)', color: 'var(--gc-blue-dark)' },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10, fontWeight: 500 } },
    },
    MuiFormControlLabel: {
      styleOverrides: { label: ({ theme: t }) => ({ fontSize: '0.9rem', color: t.palette.text.primary }) },
    },
    MuiRadio: {
      styleOverrides: {
        root: ({ theme: t }) => ({ color: t.palette.divider, '&.Mui-checked': { color: t.palette.primary.main } }),
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: ({ theme: t }) => ({ color: t.palette.divider, '&.Mui-checked': { color: t.palette.primary.main } }),
      },
    },
    MuiDivider: {
      styleOverrides: { root: ({ theme: t }) => ({ borderColor: t.palette.divider }) },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: t.palette.secondary.main,
          borderRadius: 6,
          fontSize: '0.8rem',
          fontWeight: 500,
          padding: '6px 12px',
        }),
        arrow: ({ theme: t }) => ({ color: t.palette.secondary.main }),
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: 'var(--gc-border2)', height: 6 },
        bar: { borderRadius: 4 },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': { backgroundColor: 'rgba(var(--gc-blue-rgb), 0.04)' },
        },
      },
    },
  },
});

export default theme;
