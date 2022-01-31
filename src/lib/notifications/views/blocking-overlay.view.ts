import { attr$, children$, Stream$, VirtualDOM } from '@youwol/flux-view'
import { RunningNotificationPresenter } from '../presenters'
import { RunningNotificationsStorePresenter } from '../presenters/stores/running-notifications-store.presenter'
import { factoryNotificationView } from './notification.view'

export class BlockingOverlayView implements VirtualDOM {
    id = 'blocking-overlay'
    class: Stream$<RunningNotificationPresenter[], string>
    children: Stream$<RunningNotificationPresenter[], VirtualDOM[]>

    constructor(presenter: RunningNotificationsStorePresenter) {
        this.class = attr$(
            presenter.currentNotifications$,
            (currentNotifications) =>
                currentNotifications.length !== 0
                    ? 'justify-content-center align-items-center flex-column'
                    : 'd-none',
            { untilFirst: 'd-none' },
        )
        this.children = children$(
            presenter.currentNotifications$,
            (notifications: RunningNotificationPresenter[]) =>
                notifications.map((notification) =>
                    factoryNotificationView(notification),
                ),
        )
    }
}
