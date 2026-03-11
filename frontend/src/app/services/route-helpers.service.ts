import { Injectable, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

@Injectable({ providedIn: 'root' })
export class RouteHelpersService {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  useQueryState<T extends string | number>(
    key: string,
    defaultValue: T,
  ): {
    value: ReturnType<typeof signal<T>>
    set: (val: T) => void
  } {
    const params = this.route.snapshot.queryParams
    const raw = params[key]
    const initial =
      raw !== undefined
        ? (typeof defaultValue === 'number'
            ? Number(raw)
            : raw) as T
        : defaultValue

    const state = signal<T>(initial)

    const set = (val: T) => {
      state.set(val)
      const queryParams: Record<string, string | null> = {}
      if (val === defaultValue) {
        queryParams[key] = null
      } else {
        queryParams[key] = String(val)
      }
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
    }

    return { value: state, set }
  }
}
