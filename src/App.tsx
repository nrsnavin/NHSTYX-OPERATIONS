import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, type ThemeConfig } from 'antd';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes';

// Instamart-inspired console theme: a warm orange accent on clean, soft-rounded
// light surfaces. Defined once here so every Ant Design component inherits it.
const BRAND = '#f2530a';
const BRAND_TINT = '#fff1e9';
const INK = '#1f2937';
const MUTED = '#6b7280';
const LINE = '#eef0f3';

const theme: ThemeConfig = {
  token: {
    colorPrimary: BRAND,
    colorInfo: BRAND,
    colorLink: BRAND,
    colorLinkHover: '#ff7a3c',
    colorTextBase: INK,
    colorBgLayout: '#f6f7f9',
    borderRadius: 10,
    borderRadiusLG: 14,
    controlHeight: 38,
    fontSize: 14,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      bodyBg: '#f6f7f9',
      siderBg: '#ffffff',
      lightSiderBg: '#ffffff',
      lightTriggerBg: '#ffffff',
      lightTriggerColor: MUTED,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: MUTED,
      itemHoverBg: '#f6f7f9',
      itemHoverColor: INK,
      itemSelectedBg: BRAND_TINT,
      itemSelectedColor: BRAND,
      itemActiveBg: BRAND_TINT,
      itemBorderRadius: 10,
      itemMarginInline: 12,
      itemMarginBlock: 4,
      itemHeight: 44,
      iconSize: 18,
      fontSize: 14,
    },
    Card: {
      borderRadiusLG: 16,
      headerFontSize: 16,
      colorBorderSecondary: LINE,
    },
    Button: {
      controlHeight: 38,
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 600,
    },
    Table: {
      headerBg: '#fafbfc',
      headerColor: MUTED,
      headerSplitColor: 'transparent',
      borderColor: LINE,
      rowHoverBg: '#fafbfc',
      cellPaddingBlock: 14,
      headerBorderRadius: 12,
    },
    Input: { controlHeight: 38 },
    Select: { controlHeight: 38 },
    Segmented: { trackBg: '#eef0f3', itemSelectedColor: BRAND },
    Tag: { borderRadiusSM: 6 },
    Statistic: { titleFontSize: 13 },
    Modal: { borderRadiusLG: 16 },
  },
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <AntApp>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
