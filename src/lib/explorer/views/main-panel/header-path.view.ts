import { attr$, child$, children$, VirtualDOM } from "@youwol/flux-view"
import { ywSpinnerView } from "../../.."
import { BehaviorSubject, merge, Observable, Subject } from "rxjs"
import { ExplorerState, TreeGroup } from "../../explorer.state"
import { AnyFolderNode, BrowserNode } from "../../nodes"
import { ActionsView } from "./actions.view"
import { DisplayMode } from "./main-panel.view"


class DisplayModesView implements VirtualDOM {

    public readonly class = 'd-flex py-1 border-bottom justify-content-around'
    public readonly children: VirtualDOM[]

    public readonly displayMode$: Subject<DisplayMode>

    constructor(params: { displayMode$: Subject<DisplayMode> }) {

        Object.assign(this, params)

        this.children = [
            this.itemView('details')
        ]
    }

    itemView(mode: DisplayMode) {
        let icons: Record<DisplayMode, string> = {
            //'cards': "fa-th-large",
            //'miniatures': "fa-th",
            'details': "fa-th-list",
        }
        let baseClass = `fv-pointer fv-hover-text-secondary fas ${icons[mode]} mx-2 p-1`
        let selectionClass = "fv-text-focus"
        return {
            class: attr$(
                this.displayMode$,
                (m) => m == mode ? `${baseClass} ${selectionClass}` : `${baseClass}`
            ),
            onclick: () => this.displayMode$.next(mode)
        }
    }
}

export class HeaderPathView implements VirtualDOM {

    static ClassSelector = "header-path-view"
    public readonly class = `${HeaderPathView.ClassSelector} w-100 d-flex p-2 fv-bg-background-alt`
    style = {
        height: '50px'
    }
    public readonly children: VirtualDOM[]// Stream$<Nodes.FolderNode, VirtualDOM[]>

    public readonly state: ExplorerState

    constructor(params: { state: ExplorerState }) {

        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex flex-grow-1 overflow-auto mr-1',
                style: {
                    'white-space': 'nowrap',
                    'overflow-x': 'auto',
                    'overflow-y': 'hidden'
                },
                children: children$(
                    this.state.currentFolder$,
                    ({ tree, folder }: { tree: TreeGroup, folder: AnyFolderNode }) => {

                        let path = tree.reducePath(folder.id, (node) => {
                            return node
                        })
                        let items: VirtualDOM[] = path.map((node) => [
                            new PathElementView({ state: this.state, node, selectedNode: folder }),
                            { class: "px-2 my-auto", innerText: '/' }
                        ])
                        return items.flat().slice(0, -1).concat([
                            new LoadingSpinnerView({ isLoading$: merge(...path.map(n => n.status$)) })
                        ])
                    }
                )
            },
            new ActionsMenuView({ state: this.state }),
            new DisplayModesView({ displayMode$: this.state.displayMode$ })
        ]
    }
}

export class LoadingSpinnerView implements VirtualDOM {

    public readonly class = `${LoadingSpinnerView} h-100 d-flex flex-column justify-content-center px-2`
    public readonly children: VirtualDOM[]

    public readonly isLoading$: Observable<{ type: string, id: string }[]>

    constructor(params: { isLoading$: Observable<{ type: string, id: string }[]> }) {

        Object.assign(this, params)

        this.children = [
            child$(
                this.isLoading$,
                (status: { type: string, id: string }[]) => {
                    return status.find(s => s.type == 'request-pending')
                        ? ywSpinnerView({ classes: 'mx-auto', size: '20px', duration: 1.5 })
                        : {}
                }
            )
        ]
    }

}

export class ActionsMenuView implements VirtualDOM {

    static ClassSelector = "actions-menu-view"
    public readonly class = `${ActionsMenuView.ClassSelector} d-flex align-items-center mr-5 fv-border-primary position-relative fv-pointer rounded fv-bg-secondary-alt px-2 fv-hover-bg-secondary`
    public readonly expanded$ = new BehaviorSubject(false)

    public readonly children: VirtualDOM[]
    public readonly onclick = () => this.expanded$.next(!this.expanded$.getValue())
    public readonly onmouseleave = () => this.expanded$.next(false)

    public readonly state: ExplorerState

    constructor(params: { state: ExplorerState }) {

        Object.assign(this, params)

        this.children = [
            {
                innerText: 'Actions'
            },
            {
                class: 'fas fa-caret-down mx-1'
            },
            {
                class: attr$(
                    this.expanded$,
                    (expanded) => expanded ? 'position-absolute' : 'd-none'
                ),
                style: { top: '100%', right: '0%', zIndex: 100 },
                children: [
                    new ActionsView({ state: this.state })
                ]
            }
        ]
    }
}

export class PathElementView implements VirtualDOM {

    static ClassSelector = "path-elem-view"
    public readonly baseClass = `${PathElementView.ClassSelector} p-1 rounded d-flex align-items-center fv-pointer fv-bg-background`

    public readonly class: string
    public readonly children: VirtualDOM[]
    public readonly node: AnyFolderNode
    public readonly selectedNode: BrowserNode

    public readonly state: ExplorerState

    public readonly onclick = () => {
        this.state.openFolder(this.node)
    }

    constructor(params: {
        state: ExplorerState,
        node: AnyFolderNode,
        selectedNode: BrowserNode
    }) {
        Object.assign(this, params)

        this.class = this.node.id == this.selectedNode.id
            ? `${this.baseClass} fv-border-focus fv-text-focus fv-hover-text-primary fv-hover-bg-secondary`
            : `${this.baseClass} fv-border-primary fv-hover-text-primary fv-hover-bg-secondary`

        this.children = [
            {
                class: this.node.icon
            },
            {
                class: "px-2",
                innerText: this.node.name
            }
        ]
    }

}
