/**
 * Claude 首页 README 动画。
 *
 * 仅使用 CSS 揭示首个标题：
 * - 不等待 React hydration
 * - 不遍历或清空 README 文本节点
 * - README 正文从首屏开始保持可见
 * - 不影响灵宠、贡献图和首页布局
 */
export default function ReadmeTypewriter({ enabled = true }) {
  if (!enabled) return null

  return (
    <style jsx global>{`
      @media (prefers-reduced-motion: no-preference) {
        @supports (clip-path: inset(0 0 0 0)) {
          #theme-claude
            .claude-readme-card
            .claude-readme-notion
            .notion-h:first-of-type
            .notion-h-title {
            display: inline-block;
            max-width: 100%;
            white-space: nowrap;
            clip-path: inset(0 100% 0 0);
            animation: claude-readme-title-reveal 1.1s steps(18, end)
              0s forwards;
            will-change: clip-path;
          }

          #theme-claude
            .claude-readme-card
            .claude-readme-notion
            .notion-h:first-of-type
            .notion-h-title::after {
            content: '';
            display: inline-block;
            width: 2px;
            height: 0.95em;
            margin-left: 4px;
            vertical-align: -0.08em;
            background: currentColor;
            opacity: 0;
            animation: claude-readme-title-cursor-blink 0.8s steps(1, end)
              1.1s infinite;
          }
        }
      }

      @keyframes claude-readme-title-reveal {
        from {
          clip-path: inset(0 100% 0 0);
        }
        to {
          clip-path: inset(0 0 0 0);
        }
      }

      @keyframes claude-readme-title-cursor-blink {
        0%,
        48% {
          opacity: 1;
        }
        49%,
        100% {
          opacity: 0;
        }
      }

      @media (max-width: 420px) {
        #theme-claude
          .claude-readme-card
          .claude-readme-notion
          .notion-h:first-of-type
          .notion-h-title {
          white-space: normal;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #theme-claude
          .claude-readme-card
          .claude-readme-notion
          .notion-h:first-of-type
          .notion-h-title {
          clip-path: none;
          animation: none;
        }

        #theme-claude
          .claude-readme-card
          .claude-readme-notion
          .notion-h:first-of-type
          .notion-h-title::after {
          display: none;
          animation: none;
        }
      }
    `}</style>
  )
}
