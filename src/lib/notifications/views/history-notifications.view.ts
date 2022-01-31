import { attr$, children$, Stream$, VirtualDOM } from '@youwol/flux-view'
import { Subject } from 'rxjs'
import { isCompleted } from '../models'
import { NotificationPresenter } from '../presenters'
import { HistoryPresenter } from '../presenters/stores/history-presenter'
import { factoryNotificationView } from './notification.view'

export class HistoryNotificationsView implements VirtualDOM {
    class: Stream$<boolean, string>
    children: Stream$<NotificationPresenter[], VirtualDOM[]>

    constructor(presenter: HistoryPresenter, showList$: Subject<boolean>) {
        const notifications$ = presenter.currentNotifications$
        notifications$.subscribe(
            (notifications) =>
                notifications.length === 0 && showList$.next(false),
        )
        this.class = attr$(showList$, (showList) =>
            showList ? 'running-notifications-list flex-column' : 'd-none',
        )
        this.children = children$(
            notifications$,
            (notifications: NotificationPresenter[]) =>
                notifications.map((notification) =>
                    factoryNotificationView(notification, {
                        action: () => {
                            if (notification.isRead) {
                                if (isCompleted(notification.getState())) {
                                    presenter.forget(notification)
                                }
                            } else {
                                notification.read()
                            }
                        },
                    }),
                ),
        )
    }
}
