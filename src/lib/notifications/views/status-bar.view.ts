import { attr$, children$, Stream$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, combineLatest, of } from 'rxjs'
import {
    NotificationCenter,
    NotificationPresenter,
    RunningNotificationPresenter,
} from '../presenters'
import {
    ProgressPresenter,
    ProgressValue,
} from '../presenters/progress-presenter'
import { BlockingOverlayView } from './blocking-overlay.view'
import { HistoryNotificationsView } from './history-notifications.view'
import { ToasterListView } from './toaster-list-view'

export class StatusBarView implements VirtualDOM {
    children: VirtualDOM[]

    constructor() {
        const presenter = NotificationCenter.get()
        const showList$ = new BehaviorSubject(false)
        this.children = [
            new ToasterListView(presenter.toastedNotification$),
            new BlockingOverlayView(presenter.blockingOverlayPresenter),
            new HistoryNotificationsView(presenter.historyPresenter, showList$),
            {
                id: 'status-bar',
                class: 'justify-content-between',
                children: [
                    {
                        class: attr$(showList$, (showList) =>
                            showList
                                ? 'fv-pointer d-flex justify-content-around'
                                : 'd-none',
                        ),
                        style: {
                            width: '248px',
                        },
                        children: [
                            {
                                class: 'fas fa-times',
                                onclick: () => showList$.next(false),
                            },
                            {
                                class: 'fas fa-trash',
                                onclick: () =>
                                    presenter.historyPresenter.forgetAll(),
                            },
                            {
                                class: 'fas fa-check',
                                onclick: () =>
                                    presenter.historyPresenter.readAll(),
                            },
                        ],
                    },
                    {
                        class: attr$(showList$, (showList) =>
                            showList ? 'd-none' : 'fv-pointer',
                        ),
                        children: children$(
                            combineLatest([
                                presenter.historyPresenter.unreadNotifications$,
                                presenter.historyPresenter
                                    .currentNotifications$,
                                presenter.runningNotificationsPresenter
                                    .currentNotifications$,
                            ]),
                            ([unread, all, running]: [
                                number,
                                NotificationPresenter[],
                                RunningNotificationPresenter[],
                            ]) => {
                                switch (running.length) {
                                    case 0:
                                        switch (all.length) {
                                            case 0:
                                                return []
                                            case 1:
                                                return [
                                                    {
                                                        innerText: `one ${
                                                            unread !== 0
                                                                ? 'unread'
                                                                : ''
                                                        } notification`,
                                                    },
                                                ]
                                            default:
                                                return [
                                                    {
                                                        innerText: `${
                                                            all.length
                                                        } notifications${
                                                            unread !== 0
                                                                ? ` (${unread} unread)`
                                                                : ''
                                                        }`,
                                                    },
                                                ]
                                        }
                                    case 1:
                                        return [
                                            new OneRunningNotificationSummaryView(
                                                running[0],
                                            ),
                                        ]
                                    default:
                                        return [
                                            new RunningNotificationsSummaryView(
                                                running,
                                            ),
                                        ]
                                }
                            },
                        ),
                        onclick: () => showList$.next(true),
                    },
                    // child$(showList$, (showList) => {
                    //     if (showList) {
                    //         return new ManageRunningNotificationsListView(
                    //             showList$,
                    //             presenter.historyPresenter
                    //         );
                    //     } else {
                    //         return {
                    //             class: "fv-pointer",
                    //             innerText: attr$(
                    //                 presenter.historyPresenter.unreadNotifications$,
                    //                 (unread) => {
                    //                     switch (unread) {
                    //                         case 0:
                    //                             return "no unread notification";
                    //                         case 1:
                    //                             return "one unread notification";
                    //                         default:
                    //                             return `${unread} unread notifications`;
                    //                     }
                    //                 }
                    //             ),
                    //             onclick: () => showList$.next(!showList$.getValue()),
                    //         };
                    //     }
                    // }),
                    //
                    // child$(
                    //     presenter.runningNotificationsPresenter.currentNotifications$,
                    //     (runningNotifications) => {
                    //       switch (runningNotifications.length) {
                    //         case 0:
                    //           return new NoRunningNotificationSummaryView();
                    //         case 1:
                    //           return new OneRunningNotificationSummaryView(
                    //               runningNotifications[0]
                    //           );
                    //         default:
                    //           return new RunningNotificationsSummaryView(
                    //               runningNotifications
                    //           );
                    //       }
                    //     }
                    // ),
                ],
            },
        ]
    }
}

class OneRunningNotificationSummaryView implements VirtualDOM {
    /*
    <div is="fv-div" class="d-flex flex-row align-items-center" >
      <div is="fv-div" style="">Configuration loading</div>
      <div is="fv-div" class="mx-1 progress  align-center" style="width:128px;height:16px">
        <div is="fv-div" class="progress-bar" style="width: 100%;"></div>
      </div>
    </div>
    * */
    class = 'd-flex flex-row align-items-center'
    children: VirtualDOM[]

    constructor(presenter: RunningNotificationPresenter) {
        this.children = [
            {
                class: 'mx-1',
                innerText: presenter.getTitle(),
            },
            new ProgressBarView(presenter, { width: 128, height: 16 }),
        ]
    }
}

class RunningNotificationsSummaryView implements VirtualDOM {
    class = 'd-flex flex-row align-items-center'
    children: VirtualDOM[]

    constructor(presenters: RunningNotificationPresenter[]) {
        this.children = [
            {
                class: 'mx-1',
                innerText: `${presenters.length} running notifications`,
            },
            new ProgressBarView(
                { progress$: of('indeterminate') },
                { width: 128, height: 16 },
            ),
        ]
    }
}

export class ProgressBarView implements VirtualDOM {
    children: VirtualDOM[]
    class: Stream$<ProgressValue, string>
    style: Partial<CSSStyleDeclaration>

    constructor(
        presenter: ProgressPresenter,
        dimensions: { width?: number; height?: number } = {},
        action: () => void = () => {
            /* NOOP */
        },
    ) {
        this.class = attr$(presenter.progress$, (progress: ProgressValue) =>
            progress === 'stop' ? 'd-none' : 'progress',
        )
        this.style = {
            width: `${dimensions.width}px` ?? '',
            height: `${dimensions.height}px` ?? '',
        }
        this.children = [
            {
                class: attr$(
                    presenter.progress$,
                    (progress: ProgressValue) =>
                        progress === 'indeterminate'
                            ? 'progress-bar-animated progress-bar-striped'
                            : '',
                    {
                        untilFirst:
                            'progress-bar-animated progress-bar-striped',
                        wrapper: (v) =>
                            `${v} progress-bar fv-bg-background-alt`,
                    },
                ),
                style: attr$(
                    presenter.progress$,
                    (progress: ProgressValue) => ({
                        width:
                            progress === 'stop' || progress === 'indeterminate'
                                ? '100%'
                                : progress.max === 0
                                ? '0%'
                                : `${Math.round(
                                      (progress.value / progress.max) * 100,
                                  )}%`,
                    }),
                    { untilFirst: { width: '100%' } },
                ),
                onclick: action,
            },
        ]
    }
}
