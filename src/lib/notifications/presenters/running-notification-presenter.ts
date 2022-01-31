import { Observable, ReplaySubject, timer } from 'rxjs'
import { filter, finalize, take } from 'rxjs/operators'
import {
    CompletedState,
    isCompleted,
    isProgress,
    NotificationProperties,
    Progress,
    RunningNotification,
} from '../models'
import { getMessageAsVirtualDom } from '../models/notification'
import { factoryRunningNotification } from '../models/running-notification'
import { NotifyFlag } from './notification-center'
import {
    AbstractNotificationPresenter,
    CommonNotificationPresenter,
    DismissibleNotificationPresenter,
} from './notification.presenter'
import { ProgressPresenter, ProgressValue } from './progress-presenter'

export type UpdateArgs = {
    message?: string
    progression?: Progress
    unread?: boolean
}

export interface RunningNotificationPresenter
    extends CommonNotificationPresenter,
        ProgressPresenter {
    readonly kind: 'running'
    readonly completed$: Observable<CompletedState>
    readonly duration: number

    update({ message, progression }: UpdateArgs): void

    done()

    error(message: string)
}

export function propertiesToRunningNotificationPresenter(
    arg: NotificationProperties,
    notifyCompletion: (
        arg: NotificationProperties,
        f?: Partial<NotifyFlag>,
    ) => DismissibleNotificationPresenter,
    autoComplete: boolean,
    runningTimeout: number,
): RunningNotificationPresenter {
    return new ImplRunningNotificationPresenter(
        factoryRunningNotification(arg, autoComplete),
        notifyCompletion,
        runningTimeout,
    )
}

class ImplRunningNotificationPresenter
    extends AbstractNotificationPresenter<RunningNotification>
    implements RunningNotificationPresenter
{
    public readonly kind = 'running'
    public readonly completed$: ReplaySubject<CompletedState>
    public readonly progress$: ReplaySubject<ProgressValue>
    private readonly notifyCompletion: (
        arg: NotificationProperties,
        notifyFlag?: Partial<NotifyFlag>,
    ) => DismissibleNotificationPresenter
    private associateNotification: DismissibleNotificationPresenter

    public constructor(
        args: RunningNotification,
        notifyCompletion: (
            arg: NotificationProperties,
            notifyFlag?: Partial<NotifyFlag>,
        ) => DismissibleNotificationPresenter,
        runningTimeout: number,
    ) {
        super(args)
        this.completed$ = new ReplaySubject(1)
        this.progress$ = new ReplaySubject(1)
        this.progress$.next('indeterminate')
        this.notifyCompletion = notifyCompletion
        if (runningTimeout > 0) {
            timer(new Date(Date.now() + runningTimeout)).pipe(
                take(1),
                finalize(
                    () =>
                        !isCompleted(this.notification.state) &&
                        this.error('Notification timeout'),
                ),
            )
        }
    }

    update({ message, progression, unread }: UpdateArgs) {
        if (isCompleted(this.notification.state)) {
            return
        }
        if (message !== undefined) {
            this.message$.next(getMessageAsVirtualDom({ message }))
        }
        if (progression !== undefined) {
            this.notification.progress(progression)
            this.updateState()
        }
        if (unread !== undefined && unread) {
            this.resetUnread()
        }
    }

    done(): void {
        if (isCompleted(this.notification.state)) {
            return
        }
        this.notification.done()
        this.updateState()
    }

    error(message: string) {
        if (isCompleted(this.notification.state)) {
            return
        }
        this.notification.error(message)
        this.updateState()
    }

    private updateState() {
        const state = this.notification.state
        if (isProgress(state)) {
            this.progress$.next({ value: state.progress, max: state.goal })
        }
        if (isCompleted(state)) {
            this.completed$.next(state)
            this.progress$.next('stop')
            this.resetUnread()
            if (state === 'done') {
                this.associateNotification = this.notifyCompletion(
                    {
                        title: this.notification.title,
                        message: `completed in ${this.notification.duration} seconds`,
                    },
                    { history: false },
                )
            } else {
                this.associateNotification = this.notifyCompletion(
                    {
                        title: this.notification.title,
                        message: state.errorMessage,
                        level: 'error',
                    },
                    { history: false },
                )
            }
            this.associateNotification.read$
                .pipe(filter((v) => v))
                .subscribe(() => this.read())
        }
        this.state$.next(state)
    }

    public read() {
        this.associateNotification?.dismiss()
        super.read()
    }

    public get duration() {
        return this.notification.duration
    }
}
