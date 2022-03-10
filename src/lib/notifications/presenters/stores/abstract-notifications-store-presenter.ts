import { BehaviorSubject } from 'rxjs'
import { NotificationReference } from '../../models'
import { NotificationPresenter } from '../notification.presenter'

export abstract class AbstractNotificationsStorePresenter<
    T extends NotificationPresenter,
> {
    private notifications: Map<NotificationReference, T> = new Map()
    public currentNotifications$: BehaviorSubject<T[]> = new BehaviorSubject([])

    protected add(notification: T) {
        if (!this.notifications.has(notification.getRef())) {
            this.notifications.set(notification.getRef(), notification)
            this.currentNotifications$.next([...this.notifications.values()])
        }
    }

    protected remove(notification: T) {
        if (this.notifications.has(notification.getRef())) {
            this.notifications.delete(notification.getRef())
            this.currentNotifications$.next([...this.notifications.values()])
        }
    }

    protected removeAll() {
        this.notifications.clear()
        this.currentNotifications$.next([])
    }
}
