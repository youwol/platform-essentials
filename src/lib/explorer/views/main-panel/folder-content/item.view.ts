import { attr$, child$, Stream$, VirtualDOM } from '@youwol/flux-view'

import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs'
import { filter, map, mergeMap, take } from 'rxjs/operators'

import { ywSpinnerView } from '../../../../misc-views/youwol-spinner.view'
import { ExplorerState } from '../../../explorer.state'
import {
    AnyItemNode,
    BrowserNode,
    ItemNode,
    ProgressNode,
    RegularFolderNode,
} from '../../../nodes'
import { installContextMenu } from '../../../context-menu/context-menu'
import { ChildApplicationAPI } from '../../../../core'
import { defaultOpeningApp$ } from '../../../utils'

export class ProgressItemView {
    static ClassSelector = 'progress-item-view'
    public readonly class = `${ProgressItemView.ClassSelector} d-flex flex-column p-1 rounded m-3 fv-hover-bg-background-alt fv-pointer`
    public readonly children: VirtualDOM[]
    public readonly item: ProgressNode

    constructor(params: {
        state: ExplorerState
        item: ProgressNode
        hovered$?: Observable<BrowserNode>
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center',
                children: [
                    {
                        class:
                            this.item.direction == 'download'
                                ? 'fas fa-arrow-alt-circle-down px-2 fv-blink'
                                : 'fas fa-arrow-alt-circle-up px-2 fv-blink',
                    },
                    {
                        innerText: this.item.name,
                    },
                ],
            },
            {
                class: 'w-100',
                children: [
                    {
                        style: attr$(
                            this.item.progress$.pipe(
                                filter((progress) => progress.totalCount > 0),
                                map((progress) =>
                                    Math.floor(
                                        (100 * progress.transferredCount) /
                                            progress.totalCount,
                                    ),
                                ),
                            ),
                            (progress) => ({
                                backgroundColor: 'green',
                                width: `${progress}%`,
                                height: '5px',
                            }),
                        ),
                    },
                ],
            },
        ]
    }
}

export class ItemView {
    static ClassSelector = 'item-view'
    public readonly baseClasses = `${ItemView.ClassSelector} d-flex align-items-center p-1 rounded fv-hover-bg-background-alt fv-pointer`
    public readonly class: Stream$<[BrowserNode, boolean], string>
    public readonly children: VirtualDOM[]
    public readonly style: Stream$<
        { type: string; id: string }[],
        { [key: string]: string }
    >
    public readonly contextMenuSelection$ = new BehaviorSubject(false)
    public readonly onclick = (ev: PointerEvent) => {
        this.state.selectItem(this.item)
        ev.stopPropagation()
    }
    public readonly ondblclick = (ev: PointerEvent) => {
        defaultOpeningApp$(this.item as any)
            .pipe(
                take(1),
                mergeMap((application) => {
                    return application
                        ? ChildApplicationAPI.getOsInstance().createInstance$({
                              cdnPackage: application.cdnPackage,
                              parameters: application.parameters,
                              focus: true,
                              version: 'latest',
                          })
                        : of(undefined)
                }),
            )
            .subscribe()
        this.state.selectItem(this.item)
        ev.stopPropagation()
    }
    public readonly state: ExplorerState
    public readonly item: RegularFolderNode | AnyItemNode

    public readonly oncontextmenu = (ev) => {
        ev.stopPropagation()
    }

    public readonly connectedCallback = (elem) => {
        const view = installContextMenu({
            state: this.state,
            div: elem,
            node: this.item,
        })
        view.state.event$
            .pipe(filter((event) => event == 'displayed'))
            .subscribe(() => this.contextMenuSelection$.next(true))
        view.state.event$
            .pipe(filter((event) => event == 'removed'))
            .subscribe(() => this.contextMenuSelection$.next(false))
    }

    constructor(params: { state: ExplorerState; item: BrowserNode }) {
        Object.assign(this, params)

        this.class = attr$(
            combineLatest([
                this.state.selectedItem$,
                this.contextMenuSelection$,
            ]),
            ([node, rightClick]): string => {
                const base = `${this.baseClasses} ${
                    rightClick ? 'fv-bg-background-alt' : ''
                }`
                return node && node.id == this.item.id
                    ? `${base} fv-text-focus`
                    : `${base}`
            },
            { untilFirst: this.baseClasses },
        )

        this.style = attr$(
            this.item.status$,
            (statuses: { type; id }[]) =>
                statuses.find((s) => s.type == 'cut') != undefined
                    ? { opacity: '0.3' }
                    : {},
            {
                wrapper: (d) => ({ ...d, userSelect: 'none' }),
            },
        )

        this.children = [
            {
                class: 'col-10 d-flex align-items-center',
                children: [
                    {
                        class: `fas ${this.item.icon} mr-1`,
                    },
                    child$(this.item.status$, (statusList) =>
                        statusList.find((s) => s.type == 'renaming')
                            ? this.editView()
                            : { innerText: this.item.name, class: 'pr-3' },
                    ),
                ],
            },
            this.originView(this.item),
            child$(this.item.status$, (status) => {
                return status.find((s) => s.type == 'request-pending')
                    ? ywSpinnerView({
                          classes: 'mx-auto my-auto',
                          size: '15px',
                          duration: 1.5,
                      })
                    : {}
            }),
        ]
    }

    originView(node: BrowserNode) {
        return {
            class: 'd-flex align-items-center mx-1',
            children: [
                this.item instanceof ItemNode && this.item.borrowed
                    ? { class: 'fas fa-link pr-1 py-1' }
                    : undefined,
                node.origin && node.origin.local
                    ? { class: 'fas fa-laptop py-1' }
                    : undefined,
                node.origin && node.origin.remote
                    ? { class: 'fas fa-cloud py-1' }
                    : undefined,
            ],
        }
    }

    editView() {
        return {
            tag: 'input',
            type: 'text',
            autofocus: true,
            style: { 'z-index': 200 },
            class: 'mx-2',
            data: this.item.name,
            onclick: (ev) => ev.stopPropagation(),
            onkeydown: (ev) => {
                if (ev.key === 'Enter') {
                    this.state.rename(this.item, ev.target.value)
                }
            },
        }
    }
}
