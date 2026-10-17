'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PerfAccumulator {
  windowStartMs: number;
  rafCount: number;
  lastRafMs: number;
  frameGapsMs: number[];
  engineTickCount: number;
  engineTickTotalMs: number;
  engineTickMaxMs: number;
  reactCommitCount: number;
  reactActualTotalMs: number;
  reactBaseTotalMs: number;
  reactMaxCommitMs: number;
}

function createAccumulator(now: number): PerfAccumulator {
  return {
    windowStartMs: now,
    rafCount: 0,
    lastRafMs: 0,
    frameGapsMs: [],
    engineTickCount: 0,
    engineTickTotalMs: 0,
    engineTickMaxMs: 0,
    reactCommitCount: 0,
    reactActualTotalMs: 0,
    reactBaseTotalMs: 0,
    reactMaxCommitMs: 0,
  };
}

/**
 * 画面UIを一切汚さず、バックグラウンドで4秒ごとにiPad/ブラウザの描画・計算負荷メトリクスを
 * `/api/perf` (perf-metrics.log) へ送信する不可視テレメトリフック。
 */
export function usePerfTelemetry(params: {
  unitsCount: number;
  is3DMode: boolean;
  gameResult: string;
}) {
  const accRef = useRef<PerfAccumulator>(createAccumulator(typeof performance !== 'undefined' ? performance.now() : 0));
  const latestParamsRef = useRef(params);
  latestParamsRef.current = params;

  const recordRaf = useCallback((timestamp: number) => {
    const acc = accRef.current;
    acc.rafCount += 1;
    if (acc.lastRafMs > 0) {
      const gap = timestamp - acc.lastRafMs;
      if (gap > 0 && gap < 1000) {
        acc.frameGapsMs.push(gap);
      }
    }
    acc.lastRafMs = timestamp;
  }, []);

  const recordEngineTick = useCallback((durationMs: number) => {
    const acc = accRef.current;
    acc.engineTickCount += 1;
    acc.engineTickTotalMs += durationMs;
    if (durationMs > acc.engineTickMaxMs) {
      acc.engineTickMaxMs = durationMs;
    }
  }, []);

  const onProfilerRender = useCallback(
    (
      _id: string,
      _phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
      baseDuration: number
    ) => {
      const acc = accRef.current;
      acc.reactCommitCount += 1;
      acc.reactActualTotalMs += actualDuration;
      acc.reactBaseTotalMs += baseDuration;
      if (actualDuration > acc.reactMaxCommitMs) {
        acc.reactMaxCommitMs = actualDuration;
      }
    },
    []
  );

  useEffect(() => {
    const REPORT_INTERVAL_MS = 4000;

    const timer = setInterval(() => {
      if (typeof window === 'undefined' || typeof performance === 'undefined') return;
      const now = performance.now();
      const acc = accRef.current;
      const elapsedSec = Math.max(0.1, (now - acc.windowStartMs) / 1000);

      const sortedGaps = [...acc.frameGapsMs].sort((a, b) => a - b);
      const p95Gap =
        sortedGaps.length > 0
          ? sortedGaps[Math.min(sortedGaps.length - 1, Math.floor(sortedGaps.length * 0.95))]
          : 0;
      const maxGap = sortedGaps.length > 0 ? sortedGaps[sortedGaps.length - 1] : 0;
      const longFramesOver25ms = sortedGaps.filter((g) => g > 25).length;

      // DOM & SVG & CSS Animation 集計
      const domNodes = document.getElementsByTagName('*').length;
      const svgNodes = document.querySelectorAll('svg, svg *').length;

      let totalCssAnimations = 0;
      let svgElementAnimations = 0;
      const animNamesSample: Record<string, number> = {};

      if (typeof document.getAnimations === 'function') {
        const anims = document.getAnimations();
        totalCssAnimations = anims.length;
        for (const anim of anims) {
          const target = (anim.effect as KeyframeEffect | null)?.target as Element | null;
          if (target && target instanceof SVGElement) {
            svgElementAnimations += 1;
          }
          const name = (anim as CSSAnimation).animationName || anim.id || 'unnamed';
          animNamesSample[name] = (animNamesSample[name] || 0) + 1;
        }
      }

      const payload = {
        ua: navigator.userAgent,
        viewport: {
          w: window.innerWidth,
          h: window.innerHeight,
          dpr: window.devicePixelRatio,
          touchPoints: navigator.maxTouchPoints,
        },
        mode: latestParamsRef.current.is3DMode ? '3D' : '2D',
        unitsCount: latestParamsRef.current.unitsCount,
        gameResult: latestParamsRef.current.gameResult,
        rafHz: Number((acc.rafCount / elapsedSec).toFixed(1)),
        frameGapP95Ms: Number(p95Gap.toFixed(2)),
        frameGapMaxMs: Number(maxGap.toFixed(2)),
        longFramesOver25ms,
        engineTicksPerSec: Number((acc.engineTickCount / elapsedSec).toFixed(1)),
        engineTickAvgMs:
          acc.engineTickCount > 0
            ? Number((acc.engineTickTotalMs / acc.engineTickCount).toFixed(3))
            : 0,
        engineTickMaxMs: Number(acc.engineTickMaxMs.toFixed(3)),
        reactCommitsPerSec: Number((acc.reactCommitCount / elapsedSec).toFixed(1)),
        reactActualMsPerSec: Number((acc.reactActualTotalMs / elapsedSec).toFixed(2)),
        reactBaseMsPerSec: Number((acc.reactBaseTotalMs / elapsedSec).toFixed(2)),
        reactMaxCommitMs: Number(acc.reactMaxCommitMs.toFixed(2)),
        domNodes,
        svgNodes,
        totalCssAnimations,
        svgElementAnimations,
        topAnimations: animNamesSample,
      };

      // 次の計測ウィンドウへリセット
      const prevLastRaf = acc.lastRafMs;
      accRef.current = createAccumulator(now);
      accRef.current.lastRafMs = prevLastRaf;

      fetch('/api/perf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // ネットワークエラー時は無視
      });
    }, REPORT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return {
    recordRaf,
    recordEngineTick,
    onProfilerRender,
  };
}
