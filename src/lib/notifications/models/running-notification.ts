import {
    AbstractNotification,
    getMessageAsVirtualDom,
    NotificationMessage,
    NotificationProperties,
    YouwolNotification,
} from './notification'
import { isCompleted, NotificationState } from './running-state'

export interface RunningNotification extends YouwolNotification {
    state: Exclude<NotificationState, 'immutable'>
    readonly duration: number
    readonly stopDate: Date
    progress(arg: Progress): void
    done(): void
    error(message: string): void
}

export interface RunningNotificationFlags {
    autoComplete: boolean
}

export const defaultRunningNotificationFlags: RunningNotificationFlags = {
    autoComplete: false,
}

export function factoryRunningNotification(
    arg: NotificationProperties,
    autoComplete = false,
) {
    return new ImplRunningNotification(arg, autoComplete)
}

export class ImplRunningNotification
    extends AbstractNotification
    implements RunningNotification
{
    private _state: Exclude<NotificationState, 'immutable'>
    private _stopDate: Date
    private currentProgress = 0
    private maxProgress = 0

    public constructor(
        args: NotificationProperties,
        private readonly autoComplete: boolean,
    ) {
        super(args)
        this._state = 'running'
    }

    progress(arg: Progress): void {
        if (isCompleted(this._state)) {
            return
        }
        console.log('RunningNotification#progress', arg)
        let nextProgress
        if (isPercent(arg)) {
            this.maxProgress = 100
            nextProgress = arg.percent ?? this.currentProgress
        } else {
            this.maxProgress = arg.max ?? this.maxProgress
        }
        if (isAbsolute(arg)) {
            nextProgress = arg.value ?? this.currentProgress
        }
        if (isRelative(arg)) {
            nextProgress = this.currentProgress + (arg.add ?? 0)
        }
        if (this.autoComplete && nextProgress == this.maxProgress) {
            this.done()
        } else {
            this.setProgression(nextProgress)
        }
    }

    private setProgression(nextProgress: number) {
        // Next progress is greater or equal to zero
        nextProgress = nextProgress >= 0 ? nextProgress : 0
        // Next progress is lesser or equal to maxProgress
        this.currentProgress =
            nextProgress <= this.maxProgress ? nextProgress : this.maxProgress

        this._state = {
            kind: 'progress',
            progress: this.currentProgress,
            goal: this.maxProgress,
        }
    }

    public get duration(): number {
        if (this._stopDate === undefined) {
            return undefined
        }
        return (
            Math.round(
                (this._stopDate.getTime() - this.creationDate.getTime()) / 500,
            ) / 2
        )
    }

    public get state(): Exclude<NotificationState, 'immutable'> {
        return this._state
    }

    public get stopDate(): Date {
        return this._stopDate
    }

    error(message: NotificationMessage): void {
        this._stopDate = new Date(Date.now())
        this._state = {
            kind: 'error',
            errorMessage: getMessageAsVirtualDom({ message }),
        }
        this.level = 'error'
    }

    done(): void {
        this._stopDate = new Date(Date.now())
        this._state = 'done'
    }
}

export type Progress =
    | ProgressRelative
    | ProgressAbsolute
    | ProgressPercent
    | ProgressGoal

export interface ProgressPercent {
    percent: number
    max?: never
    add?: never
    value?: never
}

function isPercent(v: Progress): v is ProgressPercent {
    return Object.prototype.hasOwnProperty.call(v, 'percent')
}

export interface ProgressAbsolute {
    value: number
    max?: number
    add?: never
    percent?: never
}

function isAbsolute(v: Progress): v is ProgressAbsolute {
    return Object.prototype.hasOwnProperty.call(v, 'value')
}

export interface ProgressRelative {
    add: number
    max?: number
    value?: never
    percent?: never
}

export interface ProgressGoal {
    max: number
    percent?: never
}

function isRelative(v: Progress): v is ProgressRelative {
    return Object.prototype.hasOwnProperty.call(v, 'add')
}
