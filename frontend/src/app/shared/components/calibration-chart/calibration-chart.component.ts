import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  effect,
  input,
} from '@angular/core'
import { Chart } from 'chart.js/auto'

export interface CalibrationBucket {
  predicted: number
  actual: number
}

@Component({
  selector: 'app-calibration-chart',
  standalone: true,
  template: `
    <div [style.height.px]="height()">
      <canvas #chartCanvas></canvas>
    </div>
  `,
})
export class CalibrationChartComponent implements AfterViewInit, OnDestroy {
  buckets = input.required<Record<string, CalibrationBucket>>()
  label = input<string>('Your Calibration')
  showPerfectLine = input<boolean>(true)
  height = input<number>(300)

  @ViewChild('chartCanvas', { static: false })
  private canvasRef!: ElementRef<HTMLCanvasElement>

  private chart: Chart | null = null
  private initialized = false

  constructor() {
    effect(() => {
      const data = this.buckets()
      const lbl = this.label()
      const perfect = this.showPerfectLine()
      if (this.initialized) {
        this.updateChart(data, lbl, perfect)
      }
    })
  }

  ngAfterViewInit(): void {
    this.createChart()
    this.initialized = true
  }

  ngOnDestroy(): void {
    this.chart?.destroy()
    this.chart = null
  }

  private createChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')
    if (!ctx) return

    const { labels, predicted, actual } = this.extractData(this.buckets())

    const datasets: Chart['data']['datasets'] = []

    if (this.showPerfectLine()) {
      datasets.push({
        label: 'Perfect Calibration',
        data: predicted,
        borderColor: '#d1d5db',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0,
      })
    }

    datasets.push({
      label: this.label(),
      data: actual,
      borderColor: '#fb7185',
      backgroundColor: 'rgba(251, 113, 133, 0.1)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#fb7185',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.3,
    })

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Predicted Probability Bucket',
              color: '#6b7280',
              font: { size: 12, family: 'Inter' },
            },
            grid: {
              color: '#f3f4f6',
            },
            ticks: {
              color: '#9ca3af',
              font: { size: 11, family: 'Inter' },
            },
          },
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Actual Outcome Frequency (%)',
              color: '#6b7280',
              font: { size: 12, family: 'Inter' },
            },
            grid: {
              color: '#f3f4f6',
            },
            ticks: {
              color: '#9ca3af',
              font: { size: 11, family: 'Inter' },
              callback: (value) => `${value}%`,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#6b7280',
              font: { size: 12, family: 'Inter' },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleFont: { size: 12, family: 'Inter' },
            bodyFont: { size: 12, family: 'Inter' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const datasetLabel = context.dataset.label ?? ''
                const value = context.parsed.y ?? 0
                return `${datasetLabel}: ${value.toFixed(1)}%`
              },
            },
          },
        },
      },
    })
  }

  private updateChart(
    buckets: Record<string, CalibrationBucket>,
    label: string,
    showPerfect: boolean,
  ): void {
    if (!this.chart) return

    const { labels, predicted, actual } = this.extractData(buckets)

    this.chart.data.labels = labels

    const datasets: Chart['data']['datasets'] = []
    let idx = 0

    if (showPerfect) {
      datasets.push({
        label: 'Perfect Calibration',
        data: predicted,
        borderColor: '#d1d5db',
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0,
      })
      idx++
    }

    datasets.push({
      label,
      data: actual,
      borderColor: '#fb7185',
      backgroundColor: 'rgba(251, 113, 133, 0.1)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#fb7185',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.3,
    })

    this.chart.data.datasets = datasets
    this.chart.update()
  }

  private extractData(buckets: Record<string, CalibrationBucket>): {
    labels: string[]
    predicted: number[]
    actual: number[]
  } {
    const entries = Object.entries(buckets)
    const labels = entries.map(([key]) => key)
    const predicted = entries.map(([, v]) => v.predicted)
    const actual = entries.map(([, v]) => v.actual)
    return { labels, predicted, actual }
  }
}
