import { Subject } from 'rxjs'
import { NotificationProperties, Progress } from '../models'
import {
    DismissibleNotificationPresenter,
    propertiesToNotificationPresenter,
} from './notification.presenter'
import {
    propertiesToRunningNotificationPresenter,
    RunningNotificationPresenter,
} from './running-notification-presenter'
import { HistoryPresenter } from './stores/history-presenter'
import { RunningNotificationsStorePresenter } from './stores/running-notifications-store.presenter'

export interface NotifyFlag {
    history: boolean
    toastTimeout: number
}

interface CreateRunningNotificationFlag extends NotifyFlag {
    blocking: boolean
    autoComplete: boolean
    runningTimeout: number
    initProgress: 'indeterminate' | 'zero' | Progress
}

const defaultNotifyFlag: NotifyFlag = {
    history: true,
    toastTimeout: 7500,
}
const defaultCreateRunningNotificationFlag: CreateRunningNotificationFlag = {
    blocking: false,
    autoComplete: false,
    runningTimeout: 0,
    initProgress: 'indeterminate',
    ...defaultNotifyFlag,
}

export class NotificationCenter {
    private static instance: NotificationCenter = undefined
    public readonly toastedNotification$: Subject<DismissibleNotificationPresenter>
    public readonly blockingOverlayPresenter: RunningNotificationsStorePresenter
    public readonly runningNotificationsPresenter: RunningNotificationsStorePresenter
    public readonly historyPresenter: HistoryPresenter

    private constructor() {
        this.toastedNotification$ = new Subject()
        this.historyPresenter = new HistoryPresenter()
        this.blockingOverlayPresenter = new RunningNotificationsStorePresenter()
        this.runningNotificationsPresenter =
            new RunningNotificationsStorePresenter()
    }

    public static get(): NotificationCenter {
        if (!NotificationCenter.instance) {
            NotificationCenter.instance = new NotificationCenter()
        }

        return NotificationCenter.instance
    }

    public notify(
        arg: NotificationProperties,
        f: Partial<NotifyFlag> = defaultNotifyFlag,
    ) {
        const flags: NotifyFlag = { ...defaultNotifyFlag, ...f }
        const notificationPresenter = propertiesToNotificationPresenter(
            arg,
            flags.toastTimeout,
        )
        if (flags.history) {
            this.historyPresenter.remember(notificationPresenter)
        }
        this.toastedNotification$.next(notificationPresenter)
        return notificationPresenter
    }

    public createRunningNotification(
        arg: NotificationProperties,
        f: Partial<CreateRunningNotificationFlag> = defaultCreateRunningNotificationFlag,
    ): RunningNotificationPresenter {
        const flags: CreateRunningNotificationFlag = {
            ...defaultCreateRunningNotificationFlag,
            ...f,
        }
        let notifyCompletion = (
            _notificationProperties: NotificationProperties,
            _notifyFlag: NotifyFlag,
        ) => undefined
        if (flags.toastTimeout > 0) {
            notifyCompletion = (_notificationProperties, _notifyFlag) => {
                const notifyFlag = {
                    ...flags,
                    ..._notifyFlag,
                }
                return this.notify(_notificationProperties, notifyFlag)
            }
        }
        const notificationPresenter = propertiesToRunningNotificationPresenter(
            arg,
            notifyCompletion,
            flags.autoComplete,
            flags.runningTimeout,
        )
        if (flags.initProgress !== 'indeterminate') {
            notificationPresenter.update({
                progression:
                    flags.initProgress === 'zero'
                        ? { value: 0 }
                        : flags.initProgress,
            })
        }
        this.historyPresenter.remember(notificationPresenter)
        if (flags.blocking) {
            this.blockingOverlayPresenter.addRunningNotification(
                notificationPresenter,
            )
        } else {
            this.runningNotificationsPresenter.addRunningNotification(
                notificationPresenter,
            )
        }
        return notificationPresenter
    }
}
