import { VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, Observable, ReplaySubject, timer } from 'rxjs'
import { filter, finalize, map, take, takeUntil } from 'rxjs/operators'
import {
    NotificationLevel,
    NotificationProperties,
    NotificationState,
    YouwolNotification,
} from '../models'
import {
    DismissibleNotification,
    factoryYouwolNotification,
    getMessageAsVirtualDom,
} from '../models/notification'
import { ProgressPresenter, ProgressValue } from './progress-presenter'
import { RunningNotificationPresenter } from './running-notification-presenter'

export type NotificationPresenter =
    | DismissibleNotificationPresenter
    | RunningNotificationPresenter

export interface CommonNotificationPresenter {
    readonly message$: Observable<VirtualDOM>
    readonly read$: Observable<boolean>
    read(): void
    readonly isRead: boolean

    getLevel(): NotificationLevel

    getRef(): string

    getTitle(): string

    getCreationDate(): Date

    getState(): NotificationState
}

export interface DismissibleNotificationPresenter
    extends CommonNotificationPresenter,
        ProgressPresenter {
    readonly kind: 'dismissible'
    readonly dismissed: boolean

    dismiss(): void
}

export function propertiesToNotificationPresenter(
    args: NotificationProperties,
    autoDismissTimeout: number,
): DismissibleNotificationPresenter {
    return new ImplDismissibleNotificationPresenter(
        factoryYouwolNotification(args),
        autoDismissTimeout,
    )
}

export abstract class AbstractNotificationPresenter<
    T extends YouwolNotification,
> implements CommonNotificationPresenter
{
    message$: BehaviorSubject<VirtualDOM>
    public readonly state$: BehaviorSubject<NotificationState>
    public readonly read$: ReplaySubject<boolean>

    protected constructor(protected notification: T) {
        this.message$ = new BehaviorSubject(
            getMessageAsVirtualDom(notification),
        )
        this.state$ = new BehaviorSubject('immutable')
        this.read$ = new ReplaySubject(1)
        this.read$.next(notification.read)
    }

    public read() {
        if (!this.notification.read) {
            this.notification.read = true
            this.read$.next(true)
        }
    }

    public get isRead() {
        return this.notification.read
    }

    protected resetUnread() {
        if (this.notification.read) {
            this.notification.read = false
            this.read$.next(false)
        }
    }

    getLevel(): NotificationLevel {
        return this.notification.level
    }

    getRef(): string {
        return this.notification.ref
    }

    getTitle(): string {
        return this.notification.title
    }

    getCreationDate(): Date {
        return this.notification.creationDate
    }

    getState(): NotificationState {
        return this.notification.state
    }
}

export class ImplDismissibleNotificationPresenter
    extends AbstractNotificationPresenter<DismissibleNotification>
    implements DismissibleNotificationPresenter
{
    public readonly kind = 'dismissible'
    public readonly progress$: ReplaySubject<ProgressValue>
    private _dismissed = false

    constructor(
        notification: DismissibleNotification,
        autoDismissTimeout: number,
    ) {
        super(notification)
        this.progress$ = new ReplaySubject(1)
        if (autoDismissTimeout > 0) {
            timer(0, 100)
                .pipe(
                    take(Math.round(autoDismissTimeout / 100) + 1),
                    takeUntil(
                        this.progress$.pipe(
                            filter(
                                (v) => v === 'stop' || v === 'indeterminate',
                            ),
                        ),
                    ),
                    finalize(() => this.dismiss()),
                    map((current) => ({
                        value: autoDismissTimeout - current * 100,
                        max: autoDismissTimeout,
                    })),
                )
                .subscribe((v) => this.progress$.next(v))
        } else {
            this.dismiss()
        }
    }

    public read() {
        this.dismiss()
        super.read()
    }

    public dismiss() {
        if (!this._dismissed) {
            this._dismissed = true
            this.progress$.next('stop')
        }
    }

    public get dismissed(): boolean {
        return this._dismissed
    }
}
