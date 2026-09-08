import React, { useLayoutEffect, useId } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

export interface ChartDataPoint {
  period: string;
  scheduledAmount: number;
  collectedAmount: number;
  rate: number;
}

interface Am5RevenueTrendChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export const Am5RevenueTrendChart: React.FC<Am5RevenueTrendChartProps> = ({ data, height = 280 }) => {
  const chartId = useId().replace(/:/g, '_') + '_am5_chart';

  useLayoutEffect(() => {
    if (!document.getElementById(chartId)) return;

    // Create root element
    const root = am5.Root.new(chartId);

    // Apply smooth animated theme
    root.setThemes([am5themes_Animated.new(root)]);

    // Hide amCharts default logo
    if (root._logo) {
      root._logo.dispose();
    }

    // Create XY Chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: 'none',
        wheelY: 'none',
        layout: root.verticalLayout,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 0,
      })
    );

    // Add Cursor for hover inspections
    const cursor = chart.set('cursor', am5xy.XYCursor.new(root, {
      behavior: 'none',
    }));
    cursor.lineY.set('visible', false);
    cursor.lineX.set('stroke', am5.color(0x6366f1));
    cursor.lineX.set('strokeWidth', 1.5);
    cursor.lineX.set('strokeDasharray', [4, 4]);

    // X-Axis (Category / Period)
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 30,
      cellStartLocation: 0.15,
      cellEndLocation: 0.85,
    });

    xRenderer.labels.template.setAll({
      fontSize: 12,
      fontWeight: '700',
      fill: am5.color(0x64748b),
      paddingTop: 8,
    });

    xRenderer.grid.template.setAll({
      stroke: am5.color(0xf1f5f9),
      strokeWidth: 1,
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: 'period',
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {
          themeTags: ['axis'],
        }),
      })
    );
    xAxis.data.setAll(data);

    // Y-Axis (Values in INR Lakhs / Crores)
    const yRenderer = am5xy.AxisRendererY.new(root, {
      strokeOpacity: 0.1,
    });

    yRenderer.labels.template.setAll({
      fontSize: 11,
      fontWeight: '600',
      fill: am5.color(0x94a3b8),
      paddingRight: 8,
    });

    yRenderer.labels.template.adapters.add('text', (_text, target) => {
      const val = target.dataItem?.get('value' as never) as unknown as number;
      if (typeof val === 'number' && !isNaN(val)) {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
        return `₹${val}`;
      }
      return '';
    });

    yRenderer.grid.template.setAll({
      stroke: am5.color(0xf1f5f9),
      strokeDasharray: [3, 3],
    });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: yRenderer,
        min: 0,
        extraMax: 0.15,
      })
    );

    // 1. Tooltip for Scheduled Demand with Forced Dark Slate Background & High-Contrast Typography
    const tooltipScheduled = am5.Tooltip.new(root, {
      labelText: '[bold #ffffff fontSize: 12px]Scheduled Demand[/]\n[bold #38bdf8 fontSize: 15px]₹{valueY.formatNumber("#,###")}[/]',
      pointerOrientation: 'vertical',
      autoTextColor: false,
    });

    tooltipScheduled.label.setAll({
      fill: am5.color(0xffffff),
    });

    // Adapters guarantee the dark background and high contrast cannot be overridden by am5 column theme
    tooltipScheduled.get('background')?.adapters.add('fill', () => am5.color(0x0f172a));
    tooltipScheduled.get('background')?.adapters.add('stroke', () => am5.color(0x38bdf8));
    tooltipScheduled.get('background')?.setAll({
      fillOpacity: 1,
      strokeWidth: 1.5,
      shadowColor: am5.color(0x000000),
      shadowBlur: 12,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowOpacity: 0.4,
    });

    const seriesScheduled = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Scheduled Demand',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'scheduledAmount',
        categoryXField: 'period',
        clustered: true,
        tooltip: tooltipScheduled,
      })
    );

    seriesScheduled.columns.template.setAll({
      fill: am5.color(0xe0e7ff),
      stroke: am5.color(0xc7d2fe),
      strokeWidth: 1,
      cornerRadiusTL: 6,
      cornerRadiusTR: 6,
      width: am5.percent(80),
      tooltipY: 0,
      shadowColor: am5.color(0x000000),
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 2,
      shadowOpacity: 0.04,
    });

    seriesScheduled.columns.template.states.create('hover', {
      fill: am5.color(0xc7d2fe),
    });

    seriesScheduled.data.setAll(data);

    // 2. Tooltip for Actual Collected with Forced Dark Slate Background & Vivid Emerald Typography
    const tooltipCollected = am5.Tooltip.new(root, {
      labelText: '[bold #ffffff fontSize: 12px]Actual Collected ({rate}%)[/]\n[bold #4ade80 fontSize: 15px]₹{valueY.formatNumber("#,###")}[/]',
      pointerOrientation: 'vertical',
      autoTextColor: false,
    });

    tooltipCollected.label.setAll({
      fill: am5.color(0xffffff),
    });

    tooltipCollected.get('background')?.adapters.add('fill', () => am5.color(0x0f172a));
    tooltipCollected.get('background')?.adapters.add('stroke', () => am5.color(0x4ade80));
    tooltipCollected.get('background')?.setAll({
      fillOpacity: 1,
      strokeWidth: 1.5,
      shadowColor: am5.color(0x000000),
      shadowBlur: 12,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowOpacity: 0.4,
    });

    const seriesCollected = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Actual Collected',
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'collectedAmount',
        categoryXField: 'period',
        clustered: true,
        tooltip: tooltipCollected,
      })
    );

    seriesCollected.columns.template.setAll({
      fill: am5.color(0x4f46e5),
      stroke: am5.color(0x4338ca),
      strokeWidth: 1,
      cornerRadiusTL: 6,
      cornerRadiusTR: 6,
      width: am5.percent(80),
      tooltipY: 0,
      shadowColor: am5.color(0x4f46e5),
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowOpacity: 0.2,
    });

    seriesCollected.columns.template.states.create('hover', {
      fill: am5.color(0x6366f1),
    });

    seriesCollected.data.setAll(data);

    // 3. Add Legend at Bottom
    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.p50,
        x: am5.p50,
        paddingTop: 12,
        paddingBottom: 0,
      })
    );

    legend.labels.template.setAll({
      fontSize: 12,
      fontWeight: '700',
      fill: am5.color(0x475569),
    });

    legend.markers.template.setAll({
      width: 14,
      height: 14,
    });

    legend.data.setAll(chart.series.values);

    // Entrance Animations
    seriesScheduled.appear(800);
    seriesCollected.appear(800);
    chart.appear(800, 100);

    return () => {
      root.dispose();
    };
  }, [data, chartId]);

  return (
    <div
      id={chartId}
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
      }}
    />
  );
};
