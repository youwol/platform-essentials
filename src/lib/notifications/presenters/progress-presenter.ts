import { Observable } from 'rxjs'

export interface ProgressPresenter {
    progress$: Observable<ProgressValue>
}

export type ProgressValue =
    | 'stop'
    | 'indeterminate'
    | { value: number; max: number }
