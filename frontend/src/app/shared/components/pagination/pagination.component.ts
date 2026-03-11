import { Component, computed, input, output } from '@angular/core'
import { IconButtonComponent } from '@shared/components/buttons/icon-button/icon-button.component'

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [IconButtonComponent],
  template: `
    <nav aria-label="Pagination" class="flex items-center justify-center gap-1">
      <!-- Previous button -->
      <app-icon-button
        icon="chevron-left"
        size="sm"
        background="transparent"
        [disabled]="currentPage() <= 1"
        ariaLabel="Previous page"
        data-testid="pagination-prev"
        (clicked)="goToPage(currentPage() - 1)"
      />

      <!-- Page numbers -->
      @for (page of visiblePages(); track page) {
        @if (page === -1) {
          <span class="px-1 text-sm text-gray-400">...</span>
        } @else {
          <button
            class="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors"
            [class]="page === currentPage()
              ? 'bg-rose-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'"
            [attr.aria-current]="page === currentPage() ? 'page' : null"
            [attr.data-testid]="'pagination-page-' + page"
            (click)="goToPage(page)"
          >
            {{ page }}
          </button>
        }
      }

      <!-- Next button -->
      <app-icon-button
        icon="chevron-right"
        size="sm"
        background="transparent"
        [disabled]="currentPage() >= totalPages()"
        ariaLabel="Next page"
        data-testid="pagination-next"
        (clicked)="goToPage(currentPage() + 1)"
      />
    </nav>
  `,
})
export class PaginationComponent {
  currentPage = input.required<number>()
  totalPages = input.required<number>()
  pageSize = input<number>(10)

  pageChange = output<number>()

  visiblePages = computed(() => {
    const total = this.totalPages()
    const current = this.currentPage()

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages: number[] = []

    // Always show first page
    pages.push(1)

    if (current > 3) {
      pages.push(-1) // ellipsis
    }

    // Pages around current
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (current < total - 2) {
      pages.push(-1) // ellipsis
    }

    // Always show last page
    pages.push(total)

    return pages
  })

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return
    }
    this.pageChange.emit(page)
  }
}
