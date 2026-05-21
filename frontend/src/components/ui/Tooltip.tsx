"use client";

import React, { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </div>

      {mounted && visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: coords.top - window.scrollY,
              left: coords.left - window.scrollX,
              transform: "translate(-50%, -100%) translateY(-8px)",
            }}
          >
            <div className="px-2.5 py-1.5 rounded-md bg-slate-900 text-slate-50 text-[11px] font-medium leading-tight shadow-lg whitespace-nowrap dark:bg-slate-100 dark:text-slate-900">
              {content}
            </div>
            <div className="flex justify-center">
              <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
