import { ContextMenu } from '@youwol/fv-context-menu'
import { fromEvent, Observable } from 'rxjs'
import { shareReplay, tap } from 'rxjs/operators'
import { VirtualDOM, HTMLElement$, children$, attr$ } from '@youwol/flux-view'
import * as _ from 'lodash'
import { ExplorerState } from '../explorer.state'
import { BrowserNode } from '../nodes'
import { Action, getActions$ } from '../actions.factory'

/**
 * Logic side of [[ContextMenuView]]
 */
export class ContextMenuState extends ContextMenu.State {
    public readonly appState: ExplorerState
    public readonly div: HTMLElement
    public readonly node: BrowserNode
    constructor(params: {
        appState: ExplorerState
        node: BrowserNode
        div: HTMLElement
    }) {
        super(
            fromEvent(params.div, 'contextmenu').pipe(
                tap((ev: Event) => ev.preventDefault()),
            ) as Observable<MouseEvent>,
        )
        Object.assign(this, params)
    }

    dispatch(_ev: MouseEvent): VirtualDOM {
        return {
            style: {
                zIndex: 1,
            },
            children: [
                new ContextMenuInnerView({
                    state: this,
                    selectedNode: this.node,
                }),
            ],
        }
    }
}

export function installContextMenu({
    node,
    state,
    div,
}: {
    node: BrowserNode
    state: ExplorerState
    div: HTMLElement
}) {
    return new ContextMenu.View({
        state: new ContextMenuState({
            appState: state,
            div: div,
            node: node,
        }),
        class: 'fv-bg-background border fv-color-primary fv-text-primary',
        style: {
            zIndex: 20,
        },
    })
}

/**
 * Context-menu view
 */
export class ContextMenuInnerView implements VirtualDOM {
    public readonly class =
        'fv-bg-background fv-x-lighter fv-text-primary py-1 container'
    public readonly style = {
        boxShadow: '0px 0px 3px white',
        fontFamily: 'serif',
        width: '300px',
    }
    public readonly id = 'context-menu-view'
    public readonly children //: Array<VirtualDOM>

    public readonly connectedCallback: (
        element: HTMLElement$ & HTMLDivElement,
    ) => void

    public readonly state: ContextMenuState
    public readonly selectedNode: BrowserNode

    constructor(params: {
        state: ContextMenuState
        selectedNode: BrowserNode
    }) {
        Object.assign(this, params)
        const actions$ = getActions$(
            this.state.appState,
            this.selectedNode,
        ).pipe(shareReplay({ bufferSize: 1, refCount: true }))

        this.children = [
            {
                class: attr$(actions$, () => 'd-none', {
                    untilFirst: 'w-100 text-center fas fa-spinner fa-spin',
                }),
            },
            {
                class: 'w-100 h-100',
                children: children$(actions$, (actions) => {
                    return Object.entries(_.groupBy(actions, (d) => d.section))
                        .map(([section, groupActions]) => {
                            return [
                                new ContextSplitterView(),
                                new ContextSectionView({
                                    section,
                                    actions: groupActions as any,
                                }),
                            ]
                        })
                        .flat()
                        .slice(1)
                }),
            },
        ]
    }
}

export class ContextSplitterView implements VirtualDOM {
    public readonly class = 'fv-border-bottom-background-alt mx-auto my-1 w-100'
}

export class ContextSectionView implements VirtualDOM {
    public readonly children: VirtualDOM[]
    public readonly actions: Action[]

    constructor(params: { section: string; actions: Action[] }) {
        Object.assign(this, params)
        this.children = this.actions.map((action) => {
            return new ContextItemView({ action })
        })
    }
}

export class ContextItemView implements VirtualDOM {
    public readonly class

    public readonly children: VirtualDOM[]
    public readonly action: Action
    public readonly onclick = () => {
        this.action.exe()
    }
    constructor(params: { action: Action }) {
        Object.assign(this, params)
        const baseClass = `d-flex align-items-center row`
        this.class = this.action.authorized
            ? `${baseClass}  fv-hover-bg-secondary fv-hover-x-lighter  fv-pointer`
            : `${baseClass} fv-text-disabled`
        this.children = [
            {
                class: `${this.action.icon} col-2 text-center px-1`,
            },
            { class: `col-6`, innerText: this.action.name },
            { class: `col-4`, innerText: 'shortcut' },
        ]
    }
}
