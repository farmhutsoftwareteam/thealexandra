import type { LayoutMetrics } from "../engine/types";

type Props = {
  metrics: LayoutMetrics;
};

export function PerformanceDashboard({ metrics }: Props) {
  return (
    <div className="perf-dashboard">
      <div className="perf-row">
        <span className="perf-label">Layout</span>
        <span className="perf-value">{metrics.layoutTimeMs.toFixed(2)}ms</span>
      </div>
      <div className="perf-row">
        <span className="perf-label">DOM Nodes</span>
        <span className="perf-value">{metrics.domNodes}</span>
      </div>
      <div className="perf-row">
        <span className="perf-label">Reflows</span>
        <span className="perf-value">{metrics.reflowCount}</span>
      </div>
    </div>
  );
}
