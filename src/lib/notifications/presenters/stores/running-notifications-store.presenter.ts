import { RunningNotificationPresenter } from '../running-notification-presenter'
import { AbstractNotificationsStorePresenter } from './abstract-notifications-store-presenter'

export class RunningNotificationsStorePresenter extends AbstractNotificationsStorePresenter<RunningNotificationPresenter> {
    public addRunningNotification(
        notificationPresenter: RunningNotificationPresenter,
    ) {
        this.add(notificationPresenter)
        notificationPresenter.completed$.subscribe(() =>
            this.remove(notificationPresenter),
        )
    }
}
