export default function PetStyles() {
  return (
    <style jsx global>{`
      .penpen-pet {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 80;
        width: 112px;
        height: 112px;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        will-change: transform;
      }

      .penpen-pet--roaming {
        transition: transform var(--penpen-roaming-duration, 1800ms)
          cubic-bezier(0.35, 0.04, 0.28, 1);
      }

      .penpen-pet__button {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 104px;
        height: 104px;
        padding: 0;
        border: 0;
        border-radius: 30px;
        background: transparent;
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        animation: penpen-pet-float 5.2s ease-in-out infinite;
      }

      .penpen-pet--dragging .penpen-pet__button,
      .penpen-pet--roaming .penpen-pet__button {
        animation-play-state: paused;
      }

      .penpen-pet__button:focus-visible,
      .penpen-pet-restore:focus-visible,
      .penpen-pet__close:focus-visible,
      .penpen-pet__care-toggle:focus-visible,
      .penpen-pet__care-actions button:focus-visible {
        outline: 2px solid rgba(226, 139, 112, 0.78);
        outline-offset: 3px;
      }

      .penpen-pet__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        filter: drop-shadow(0 8px 14px rgba(76, 48, 34, 0.14));
        animation: penpen-pet-state-in 260ms ease-out both;
        transition:
          transform 180ms ease,
          filter 180ms ease;
      }

      .penpen-pet__button:hover .penpen-pet__image {
        transform: translateY(-2px) scale(1.035);
        filter: drop-shadow(0 10px 18px rgba(76, 48, 34, 0.2));
      }

      .penpen-pet__button:active .penpen-pet__image {
        transform: scale(0.96);
      }

      .penpen-pet__bubble {
        position: absolute;
        bottom: 78px;
        z-index: 3;
        width: max-content;
        max-width: 190px;
        padding: 8px 11px;
        border: 1px solid rgba(190, 160, 142, 0.32);
        background: rgba(255, 255, 255, 0.88);
        color: #60483a;
        box-shadow: 0 8px 24px rgba(72, 48, 36, 0.12);
        backdrop-filter: blur(12px) saturate(135%);
        -webkit-backdrop-filter: blur(12px) saturate(135%);
        font-size: 13px;
        line-height: 1.35;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(5px) scale(0.96);
        transition:
          opacity 180ms ease,
          transform 180ms ease;
        pointer-events: none;
      }

      .penpen-pet[data-side='left'] .penpen-pet__bubble {
        right: 92px;
        border-radius: 14px 14px 4px 14px;
        transform-origin: right bottom;
      }

      .penpen-pet[data-side='right'] .penpen-pet__bubble {
        left: 92px;
        border-radius: 14px 14px 14px 4px;
        transform-origin: left bottom;
      }

      .penpen-pet:hover .penpen-pet__bubble,
      .penpen-pet:focus-within .penpen-pet__bubble,
      .penpen-pet--speaking .penpen-pet__bubble {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .penpen-pet__care-panel {
        position: absolute;
        bottom: 2px;
        z-index: 4;
        width: 228px;
        padding: 12px;
        border: 1px solid rgba(190, 160, 142, 0.34);
        border-radius: 18px;
        background: rgba(255, 252, 248, 0.94);
        color: #60483a;
        box-shadow: 0 14px 36px rgba(72, 48, 36, 0.16);
        backdrop-filter: blur(16px) saturate(140%);
        -webkit-backdrop-filter: blur(16px) saturate(140%);
        opacity: 0;
        visibility: hidden;
        transform: translateY(7px) scale(0.96);
        transition:
          opacity 180ms ease,
          transform 180ms ease,
          visibility 180ms ease;
        pointer-events: none;
      }

      .penpen-pet[data-side='left'] .penpen-pet__care-panel {
        right: 100px;
        transform-origin: right bottom;
      }

      .penpen-pet[data-side='right'] .penpen-pet__care-panel {
        left: 100px;
        transform-origin: left bottom;
      }

      .penpen-pet__care-panel--open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .penpen-pet__care-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 9px;
      }

      .penpen-pet__care-header strong {
        font-size: 14px;
        letter-spacing: 0.02em;
      }

      .penpen-pet__care-header span {
        color: rgba(96, 72, 58, 0.68);
        font-size: 11px;
      }

      .penpen-pet__needs {
        display: grid;
        gap: 6px;
      }

      .penpen-pet__need {
        display: grid;
        grid-template-columns: 30px 1fr 24px;
        align-items: center;
        gap: 6px;
        font-size: 11px;
      }

      .penpen-pet__need > span:first-child {
        color: rgba(96, 72, 58, 0.74);
      }

      .penpen-pet__need b {
        color: rgba(96, 72, 58, 0.78);
        font-size: 10px;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      .penpen-pet__need-track {
        display: block;
        height: 6px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(137, 106, 86, 0.12);
      }

      .penpen-pet__need-track i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: #e9a47f;
        transition: width 280ms ease;
      }

      .penpen-pet__need:nth-child(2) .penpen-pet__need-track i {
        background: #e6a2ae;
      }

      .penpen-pet__need:nth-child(3) .penpen-pet__need-track i {
        background: #d8b36f;
      }

      .penpen-pet__need:nth-child(4) .penpen-pet__need-track i {
        background: #ce9fc5;
      }

      .penpen-pet__care-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-top: 11px;
      }

      .penpen-pet__care-actions button {
        min-height: 30px;
        padding: 5px 4px;
        border: 1px solid rgba(190, 160, 142, 0.28);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.76);
        color: #60483a;
        cursor: pointer;
        font-size: 11px;
        line-height: 1.1;
        transition:
          border-color 160ms ease,
          background 160ms ease,
          transform 160ms ease;
      }

      .penpen-pet__care-actions button:hover {
        border-color: rgba(206, 139, 104, 0.58);
        background: #fff9f3;
        transform: translateY(-1px);
      }

      .penpen-pet__care-toggle,
      .penpen-pet__close {
        position: absolute;
        z-index: 5;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(162, 132, 116, 0.25);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        color: rgba(85, 65, 55, 0.78);
        cursor: pointer;
        pointer-events: auto;
        opacity: 0;
        transform: scale(0.82);
        transition:
          opacity 160ms ease,
          transform 160ms ease,
          background 160ms ease;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .penpen-pet__care-toggle {
        left: 2px;
        bottom: 3px;
        width: 30px;
        height: 30px;
        font-size: 16px;
        line-height: 1;
      }

      .penpen-pet__care-toggle i {
        position: absolute;
        right: -1px;
        top: -1px;
        width: 8px;
        height: 8px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        border-radius: 999px;
        background: #e4776f;
        box-sizing: border-box;
      }

      .penpen-pet__close {
        top: 1px;
        right: 1px;
        width: 22px;
        height: 22px;
        padding-bottom: 2px;
        font-size: 16px;
        line-height: 18px;
      }

      .penpen-pet:hover .penpen-pet__care-toggle,
      .penpen-pet:hover .penpen-pet__close,
      .penpen-pet:focus-within .penpen-pet__care-toggle,
      .penpen-pet:focus-within .penpen-pet__close,
      .penpen-pet--dragging .penpen-pet__close,
      .penpen-pet[data-needs-attention='true'] .penpen-pet__care-toggle {
        opacity: 1;
        transform: scale(1);
      }

      .penpen-pet-restore {
        position: fixed;
        right: 18px;
        bottom: 82px;
        z-index: 80;
        width: 46px;
        height: 46px;
        overflow: hidden;
        padding: 2px;
        border: 1px solid rgba(190, 160, 142, 0.34);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 8px 22px rgba(72, 48, 36, 0.13);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .penpen-pet-restore img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
      }

      html.dark .penpen-pet__bubble,
      .dark .penpen-pet__bubble,
      [data-theme='dark'] .penpen-pet__bubble,
      html.dark .penpen-pet__care-panel,
      .dark .penpen-pet__care-panel,
      [data-theme='dark'] .penpen-pet__care-panel,
      html.dark .penpen-pet__care-toggle,
      .dark .penpen-pet__care-toggle,
      [data-theme='dark'] .penpen-pet__care-toggle,
      html.dark .penpen-pet__close,
      .dark .penpen-pet__close,
      [data-theme='dark'] .penpen-pet__close,
      html.dark .penpen-pet-restore,
      .dark .penpen-pet-restore,
      [data-theme='dark'] .penpen-pet-restore {
        border-color: rgba(255, 255, 255, 0.16);
        background: rgba(35, 34, 33, 0.82);
        color: rgba(255, 248, 241, 0.9);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
      }

      html.dark .penpen-pet__care-header span,
      .dark .penpen-pet__care-header span,
      [data-theme='dark'] .penpen-pet__care-header span,
      html.dark .penpen-pet__need > span:first-child,
      .dark .penpen-pet__need > span:first-child,
      [data-theme='dark'] .penpen-pet__need > span:first-child,
      html.dark .penpen-pet__need b,
      .dark .penpen-pet__need b,
      [data-theme='dark'] .penpen-pet__need b {
        color: rgba(255, 248, 241, 0.7);
      }

      html.dark .penpen-pet__care-actions button,
      .dark .penpen-pet__care-actions button,
      [data-theme='dark'] .penpen-pet__care-actions button {
        border-color: rgba(255, 255, 255, 0.13);
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 248, 241, 0.88);
      }

      @keyframes penpen-pet-float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px);
        }
      }

      @keyframes penpen-pet-state-in {
        from {
          opacity: 0.45;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @media (max-width: 768px) {
        .penpen-pet {
          width: 84px;
          height: 84px;
        }

        .penpen-pet__button {
          width: 78px;
          height: 78px;
          border-radius: 22px;
        }

        .penpen-pet__bubble {
          bottom: 57px;
          max-width: 150px;
          padding: 7px 9px;
          font-size: 12px;
        }

        .penpen-pet[data-side='left'] .penpen-pet__bubble {
          right: 68px;
        }

        .penpen-pet[data-side='right'] .penpen-pet__bubble {
          left: 68px;
        }

        .penpen-pet__care-panel {
          bottom: 0;
          width: min(218px, calc(100vw - 104px));
          padding: 10px;
        }

        .penpen-pet[data-side='left'] .penpen-pet__care-panel {
          right: 74px;
        }

        .penpen-pet[data-side='right'] .penpen-pet__care-panel {
          left: 74px;
        }

        .penpen-pet__care-toggle {
          left: -2px;
          bottom: 0;
          width: 27px;
          height: 27px;
          opacity: 0.94;
          transform: scale(1);
          font-size: 14px;
        }

        .penpen-pet__close {
          top: -2px;
          right: -1px;
          width: 20px;
          height: 20px;
          opacity: 0.9;
          transform: scale(1);
          font-size: 14px;
        }

        .penpen-pet-restore {
          right: 10px;
          bottom: 76px;
          width: 42px;
          height: 42px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .penpen-pet,
        .penpen-pet__button,
        .penpen-pet__image {
          animation: none !important;
          transition: none !important;
        }

        .penpen-pet__image,
        .penpen-pet__bubble,
        .penpen-pet__care-panel,
        .penpen-pet__care-toggle,
        .penpen-pet__close,
        .penpen-pet__need-track i {
          transition: none !important;
        }
      }
    `}</style>
  )
}
