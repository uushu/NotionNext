export default function PetStyles() {
  return (
    <style jsx global>{`
      .utto-pet {
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

      .utto-pet__button {
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
        animation: utto-pet-float 5.2s ease-in-out infinite;
      }

      .utto-pet--dragging .utto-pet__button {
        cursor: grabbing;
        animation-play-state: paused;
      }

      .utto-pet__button:focus-visible,
      .utto-pet-restore:focus-visible,
      .utto-pet__close:focus-visible {
        outline: 2px solid rgba(226, 139, 112, 0.78);
        outline-offset: 3px;
      }

      .utto-pet__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        filter: drop-shadow(0 8px 14px rgba(76, 48, 34, 0.14));
        animation: utto-pet-state-in 260ms ease-out both;
        transition:
          transform 180ms ease,
          filter 180ms ease;
      }

      .utto-pet__button:hover .utto-pet__image {
        transform: translateY(-2px) scale(1.035);
        filter: drop-shadow(0 10px 18px rgba(76, 48, 34, 0.2));
      }

      .utto-pet__button:active .utto-pet__image {
        transform: scale(0.96);
      }

      .utto-pet__bubble {
        position: absolute;
        bottom: 72px;
        width: max-content;
        max-width: 176px;
        padding: 8px 11px;
        border: 1px solid rgba(190, 160, 142, 0.32);
        background: rgba(255, 255, 255, 0.84);
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

      .utto-pet[data-side='left'] .utto-pet__bubble {
        right: 92px;
        border-radius: 14px 14px 4px 14px;
        transform-origin: right bottom;
      }

      .utto-pet[data-side='right'] .utto-pet__bubble {
        left: 92px;
        border-radius: 14px 14px 14px 4px;
        transform-origin: left bottom;
      }

      .utto-pet:hover .utto-pet__bubble,
      .utto-pet:focus-within .utto-pet__bubble,
      .utto-pet--speaking .utto-pet__bubble {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .utto-pet__close {
        position: absolute;
        top: 1px;
        right: 1px;
        z-index: 2;
        width: 22px;
        height: 22px;
        padding: 0 0 2px;
        border: 1px solid rgba(162, 132, 116, 0.25);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        color: rgba(85, 65, 55, 0.74);
        font-size: 16px;
        line-height: 18px;
        cursor: pointer;
        pointer-events: auto;
        opacity: 0;
        transform: scale(0.82);
        transition:
          opacity 160ms ease,
          transform 160ms ease;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .utto-pet:hover .utto-pet__close,
      .utto-pet:focus-within .utto-pet__close,
      .utto-pet--dragging .utto-pet__close {
        opacity: 1;
        transform: scale(1);
      }

      .utto-pet-restore {
        position: fixed;
        right: 18px;
        bottom: 82px;
        z-index: 80;
        width: 42px;
        height: 42px;
        padding: 0;
        border: 1px solid rgba(190, 160, 142, 0.34);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 8px 22px rgba(72, 48, 36, 0.13);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        cursor: pointer;
        font-size: 21px;
        line-height: 1;
        -webkit-tap-highlight-color: transparent;
      }

      html.dark .utto-pet__bubble,
      .dark .utto-pet__bubble,
      [data-theme='dark'] .utto-pet__bubble,
      html.dark .utto-pet__close,
      .dark .utto-pet__close,
      [data-theme='dark'] .utto-pet__close,
      html.dark .utto-pet-restore,
      .dark .utto-pet-restore,
      [data-theme='dark'] .utto-pet-restore {
        border-color: rgba(255, 255, 255, 0.16);
        background: rgba(35, 34, 33, 0.76);
        color: rgba(255, 248, 241, 0.88);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
      }

      @keyframes utto-pet-float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px);
        }
      }

      @keyframes utto-pet-state-in {
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
        .utto-pet {
          width: 84px;
          height: 84px;
        }

        .utto-pet__button {
          width: 78px;
          height: 78px;
          border-radius: 22px;
        }

        .utto-pet__bubble {
          bottom: 53px;
          max-width: 136px;
          padding: 7px 9px;
          font-size: 12px;
        }

        .utto-pet[data-side='left'] .utto-pet__bubble {
          right: 68px;
        }

        .utto-pet[data-side='right'] .utto-pet__bubble {
          left: 68px;
        }

        .utto-pet__close {
          top: -2px;
          right: -1px;
          width: 20px;
          height: 20px;
          opacity: 0.9;
          transform: scale(1);
          font-size: 14px;
        }

        .utto-pet-restore {
          right: 10px;
          bottom: 76px;
          width: 38px;
          height: 38px;
          font-size: 19px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .utto-pet__button,
        .utto-pet__image {
          animation: none !important;
        }

        .utto-pet__image,
        .utto-pet__bubble,
        .utto-pet__close {
          transition: none !important;
        }
      }
    `}</style>
  )
}
