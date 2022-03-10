import { render, Stream$, VirtualDOM } from '@youwol/flux-view'
import { Observable } from 'rxjs'
import { DismissibleNotificationPresenter } from '../presenters/notification.presenter'
import { factoryNotificationView } from './notification.view'

const idToasterList = 'toaster-list'

export class ToasterListView implements VirtualDOM {
    id = idToasterList
    class: Stream$<boolean, string> | string
    style: {
        width: '50px'
    }

    constructor(
        toastedNotification$: Observable<DismissibleNotificationPresenter>,
    ) {
        this.class =
            'justify-content-center align-items-center' + ' flex-column'
        toastedNotification$.subscribe((notificationPresenter) => {
            const toasterHtmlElement$ = render(
                factoryNotificationView(notificationPresenter, {
                    action: () => notificationPresenter.read(),
                    additionalClasses: 'toaster',
                }),
            )
            document.getElementById(idToasterList).append(toasterHtmlElement$)
            notificationPresenter.progress$.subscribe(
                (v) => v === 'stop' && toasterHtmlElement$.remove(),
            )
        })
    }
}
