import { BehaviorSubject } from 'rxjs'
import { NotificationPresenter } from '../notification.presenter'
import { AbstractNotificationsStorePresenter } from './abstract-notifications-store-presenter'

export class HistoryPresenter extends AbstractNotificationsStorePresenter<NotificationPresenter> {
    public unreadNotifications$: BehaviorSubject<number>
    constructor() {
        super()
        this.unreadNotifications$ = new BehaviorSubject(0)
        this.currentNotifications$.subscribe((notifications) =>
            this.reload(notifications),
        )
    }

    public remember(notification: NotificationPresenter) {
        this.add(notification)
        if (notification.kind === 'dismissible') {
            notification.read$.subscribe((_) =>
                this.reload(this.currentNotifications$.getValue()),
            )
        }
    }

    public forget(notification: NotificationPresenter) {
        notification.kind === 'dismissible' && notification.read()
        this.remove(notification)
    }

    public forgetAll() {
        this.removeAll()
    }

    public readAll() {
        this.currentNotifications$
            .getValue()
            .forEach(
                (notification) =>
                    notification.kind === 'dismissible' && notification.read(),
            )
    }

    private reload(notifications: NotificationPresenter[]) {
        this.unreadNotifications$.next(
            notifications.filter(
                (notification) =>
                    notification.kind === 'dismissible' && !notification.isRead,
            ).length,
        )
    }
}
