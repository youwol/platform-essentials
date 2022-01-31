import {
    attr$,
    child$,
    children$,
    Stream$,
    VirtualDOM,
} from '@youwol/flux-view'
import { combineLatest } from 'rxjs'
import { CompletedState, NotificationLevel } from '../models'
import {
    NotificationPresenter,
    RunningNotificationPresenter,
} from '../presenters'
import { DismissibleNotificationPresenter } from '../presenters/notification.presenter'
import { ProgressBarView } from './status-bar.view'

export function factoryNotificationView(
    notification: NotificationPresenter,
    {
        action,
        additionalClasses,
    }: { action?: () => void; additionalClasses?: string } = {
        action: () => undefined,
        additionalClasses: '',
    },
) {
    switch (notification.kind) {
        case 'dismissible':
            return new DismissibleNotificationView(
                notification,
                action,
                additionalClasses ?? '',
            )
        case 'running':
            return new RunningNotificationView(
                notification,
                action,
                additionalClasses ?? '',
            )
        default:
            return {} as never
    }
}

const LevelToClasses: Record<NotificationLevel, string> = {
    error: 'fv-bg-error fv-text-on-error',
    notice: '',
}

class RunningNotificationView {
    class: Stream$<[CompletedState, boolean], string>
    children: Stream$<CompletedState, VirtualDOM[]>
    onclick: () => void
    style

    constructor(
        presenter: RunningNotificationPresenter,
        action: () => void,
        additionalClasses: string,
    ) {
        const defaultClasses = 'border my-1 ' + additionalClasses
        this.style = {
            'font-size': 'small',
        }
        this.class = attr$(
            combineLatest([presenter.completed$, presenter.read$]),
            ([completed, read]: [CompletedState, boolean]) =>
                `${
                    completed === 'done'
                        ? LevelToClasses.notice
                        : LevelToClasses.error
                } ${read ? '' : 'fv-text-secondary'}`,
            {
                untilFirst: `${
                    LevelToClasses[presenter.getLevel()]
                } ${defaultClasses} ${
                    presenter.isRead ? '' : 'fv-text-secondary'
                }`,
                wrapper: (v) => `${v} ${defaultClasses}`,
            },
        )

        this.children = children$(
            presenter.completed$,
            (completed: CompletedState): VirtualDOM[] =>
                completed === 'done'
                    ? [
                          {
                              class: 'text-right font-italic',
                              innerText: `ran in ${presenter.duration} second(s)`,
                          },
                      ]
                    : [
                          {
                              class: 'text-right font-weight-bold',
                              innerText: `failed after ${presenter.duration} second(s)`,
                          },
                          completed.errorMessage,
                      ],
            {
                untilFirst: [
                    new ProgressBarView(presenter) as VirtualDOM,
                    child$(presenter.message$, (message) => message),
                ],
                wrapper: (dynamicChildren: VirtualDOM[]) => [
                    getHeader(presenter),
                    ...dynamicChildren,
                ],
            },
        )

        this.onclick = action
    }
}

class DismissibleNotificationView {
    class: Stream$<boolean, string>
    children: VirtualDOM[]
    onclick: () => void
    style

    constructor(
        presenter: DismissibleNotificationPresenter,
        action: () => void,
        additionalClasses: string,
    ) {
        const defaultClasses =
            LevelToClasses[presenter.getLevel()] +
            ' border my-1 ' +
            additionalClasses
        this.style = {
            'font-size': 'small',
        }

        this.class = attr$(
            presenter.read$,
            (read) => (read ? '' : 'fv-text-secondary'),
            {
                untilFirst: presenter.isRead ? '' : 'fv-text-secondary',
                wrapper: (v) => `${v} ${defaultClasses}`,
            },
        )

        this.children = [
            {
                class: 'border',
                children: [
                    new ProgressBarView(presenter, { height: 3 }),
                    getHeader(presenter),
                    {
                        children: [
                            child$(
                                presenter.message$,
                                (message: VirtualDOM) => message,
                            ),
                        ],
                    },
                ],
            },
        ]
        this.onclick = action
    }
}

function getHeader(presenter: NotificationPresenter): VirtualDOM {
    return {
        class: 'd-flex flex-row justify-content-between align-items-center border-bottom rounded-bottom$',
        children: [
            {
                class: attr$(presenter.read$, (read) =>
                    read ? 'far fa-flag ' : 'fas fa-flag',
                ),
            },
            {
                class: 'mx-1',
                style: {
                    'font-size': 'medium',
                },
                innerText: presenter.getTitle(),
            },
            {
                style: {
                    'font-size': 'x-small',
                },
                innerText: presenter
                    .getCreationDate()
                    .toISOString()
                    .substr(11, 8),
            },
        ],
    }
}
