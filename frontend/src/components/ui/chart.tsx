import { ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/utils";
// shadcn/ui chart composition: charts remain ordinary Recharts components.
export type ChartConfig = Record<string, { label: ReactNode; color: string }>;
export function ChartContainer({
  children,
  className,
  config,
}: ComponentProps<typeof ResponsiveContainer> & { config: ChartConfig }) {
  return (
    <div
      className={cn("chart-container", className)}
      style={Object.fromEntries(
        Object.entries(config).map(([key, value]) => [
          `--color-${key}`,
          value.color,
        ]),
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
export const ChartTooltip = Tooltip;
export const ChartLegend = Legend;
