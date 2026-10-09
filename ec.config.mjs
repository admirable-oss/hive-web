// @ts-check
import {
  defineEcConfig,
  ExpressiveCodeAnnotation,
  ExpressiveCodeTheme,
} from '@astrojs/starlight/expressive-code';
import { addClassName, select } from '@astrojs/starlight/expressive-code/hast';

/** Hive code palette: bone on shell, honey for keywords, ash comments. */
const hive = new ExpressiveCodeTheme({
  name: 'hive',
  type: 'dark',
  colors: {
    'editor.background': '#121211',
    'editor.foreground': '#EDEAE3',
    'editor.selectionBackground': '#F5B9424D',
    'titleBar.activeBackground': '#121211',
    'titleBar.activeForeground': '#8F8B82',
    'titleBar.border': '#1C1C1A',
    'editorGroupHeader.tabsBackground': '#121211',
    'tab.activeBackground': '#121211',
    'tab.activeForeground': '#8F8B82',
    'scrollbarSlider.background': '#2A2926',
    'scrollbarSlider.hoverBackground': '#3A3934',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#77736A' } },
    { scope: ['string', 'string.quoted', 'markup.inline.raw'], settings: { foreground: '#FFD58A' } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control'], settings: { foreground: '#F5B942' } },
    { scope: ['keyword.operator', 'punctuation', 'meta.brace'], settings: { foreground: '#8F8B82' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#A99EFF' } },
    { scope: ['entity.name.function', 'support.function', 'variable', 'variable.other'], settings: { foreground: '#EDEAE3' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type'], settings: { foreground: '#FFD58A' } },
    {
      scope: ['support.type.property-name', 'meta.object-literal.key', 'entity.other.attribute-name', 'entity.name.tag'],
      settings: { foreground: '#B5B1A8' },
    },
    { scope: ['entity.name.section', 'entity.name.table', 'support.type.property-name.table'], settings: { foreground: '#F5B942' } },
    // Shell: commands and their arguments read as plain bone text, like a real prompt.
    { scope: ['string.unquoted.argument', 'entity.name.command'], settings: { foreground: '#EDEAE3' } },
  ],
});

/** Full-line annotation that only tags the rendered line with a class. */
class LineClass extends ExpressiveCodeAnnotation {
  /** @param {string} className */
  constructor(className) {
    super({});
    this.className = className;
  }
  /** @param {{ nodesToTransform: import('@astrojs/starlight/expressive-code/hast').Parents[] }} options */
  render({ nodesToTransform }) {
    return nodesToTransform.map((node) => {
      if (node.type === 'element') addClassName(node, this.className);
      return node;
    });
  }
}

const SHELLS = new Set(['sh', 'bash', 'shell', 'shellscript', 'zsh', 'console']);

/**
 * Docs-wide code block conventions:
 * - every framed block gets a header label (its language, e.g. `sh`) unless it has a title;
 * - in shell blocks, `$ ` marks a command: the prompt is drawn (not selectable or copied),
 *   other lines are dimmed output, and Copy takes only the commands, minus trailing comments.
 * @returns {import('@astrojs/starlight/expressive-code').ExpressiveCodePlugin}
 */
function pluginHiveCode() {
  /** @type {WeakMap<object, string>} */
  const commands = new WeakMap();
  return {
    name: 'hive-code',
    hooks: {
      preprocessCode: ({ codeBlock }) => {
        const { props, language } = codeBlock;
        if (props.title === undefined && props.frame !== 'none') props.title = language;
        if (!SHELLS.has(language)) return;
        const lines = codeBlock.getLines();
        if (!lines.some((line) => line.text.startsWith('$ '))) return;
        const copy = [];
        for (const line of lines) {
          if (line.text.startsWith('$ ')) {
            line.editText(0, 2, '');
            line.addAnnotation(new LineClass('hv-cmd'));
            copy.push(line.text.replace(/\s+#.*$/, ''));
          } else {
            line.addAnnotation(new LineClass('hv-out'));
          }
        }
        commands.set(codeBlock, copy.join('\n'));
      },
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        const text = commands.get(codeBlock);
        if (text === undefined) return;
        const button = select('.copy button', renderData.blockAst);
        if (button) button.properties.dataCode = text.replace(/\n/g, '\u007f');
      },
    },
  };
}

export default defineEcConfig({
  themes: [hive],
  useStarlightUiThemeColors: false,
  plugins: [pluginHiveCode()],
  frames: { removeCommentsWhenCopyingTerminalFrames: true },
  styleOverrides: {
    borderRadius: '0',
    borderWidth: '0',
    borderColor: '#1C1C1A',
    codeBackground: '#121211',
    codeFontFamily: 'var(--sl-font-mono)',
    codeFontSize: '14px',
    codeLineHeight: '1.75',
    codePaddingBlock: '16px',
    codePaddingInline: '16px',
    uiFontFamily: 'var(--sl-font-mono)',
    uiFontSize: '12px',
    uiFontWeight: '400',
    uiPaddingBlock: '0',
    uiPaddingInline: '16px',
    focusBorder: '#F5B942',
    scrollbarThumbColor: '#2A2926',
    scrollbarThumbHoverColor: '#3A3934',
    frames: {
      shadowColor: 'transparent',
      frameBoxShadowCssValue: 'none',
      editorBackground: '#121211',
      terminalBackground: '#121211',
      editorTabBarBackground: '#121211',
      editorTabBarBorderColor: 'transparent',
      editorTabBarBorderBottomColor: '#1C1C1A',
      editorActiveTabBackground: 'transparent',
      editorActiveTabForeground: '#8F8B82',
      editorActiveTabBorderColor: 'transparent',
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'transparent',
      terminalTitlebarBackground: '#121211',
      terminalTitlebarForeground: '#8F8B82',
      terminalTitlebarBorderBottomColor: '#1C1C1A',
      terminalTitlebarDotsOpacity: '0',
      inlineButtonBackground: '#1C1C1A',
      inlineButtonForeground: '#B5B1A8',
      inlineButtonBorder: 'transparent',
      tooltipSuccessBackground: '#1C1C1A',
      tooltipSuccessForeground: '#F5B942',
    },
  },
});
