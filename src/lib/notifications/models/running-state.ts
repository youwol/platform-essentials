import { VirtualDOM } from '@youwol/flux-view'

export type NotificationState = 'immutable' | RunningState | CompletedState

export type RunningState = 'running' | RunningStateProgress

export type CompletedState = CompletedStateError | 'done'

export function isCompleted(v: NotificationState): v is CompletedState {
    return v === 'immutable' || v === 'done' || v['kind'] === 'error'
}

export interface RunningStateProgress {
    kind: 'progress'
    progress: number
    goal: number
}

export function isProgress(v: NotificationState): v is RunningStateProgress {
    return v['kind'] === 'progress'
}

export interface CompletedStateError {
    kind: 'error'
    errorMessage: VirtualDOM
}
