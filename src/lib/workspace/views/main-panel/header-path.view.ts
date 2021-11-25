import { attr$, child$, children$, VirtualDOM } from "@youwol/flux-view"
import { ywSpinnerView } from "../../.."
import { BehaviorSubject, merge, Subject } from "rxjs"
import { PlatformState, TreeGroup } from "../../platform.state"
import { AnyFolderNode } from "../../nodes"
import { ActionsView } from "./actions.view"
import { DisplayMode } from "./main-panel.view"


class DisplayModesView implements VirtualDOM {

    public readonly class = 'd-flex py-1 border-bottom justify-content-around'
    public readonly children: VirtualDOM[]

    public readonly displayMode$: Subject<DisplayMode>

    constructor(params: { displayMode$: Subject<DisplayMode> }) {

        Object.assign(this, params)

        this.children = [
            this.itemView('cards'),
            this.itemView('miniatures'),
            this.itemView('details')
        ]
    }

    itemView(mode: DisplayMode) {
        let icons: Record<DisplayMode, string> = {
            'cards': "fa-th-large",
            'miniatures': "fa-th",
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

    public readonly class = "w-100 d-flex p-2 fv-bg-background-alt"
    style = {
        height: '50px'
    }
    public readonly children: VirtualDOM[]// Stream$<Nodes.FolderNode, VirtualDOM[]>

    public readonly state: PlatformState
    public readonly displayMode$: Subject<DisplayMode>

    constructor(params: { state: PlatformState, displayMode$: Subject<DisplayMode> }) {

        Object.assign(this, params)
        console.log("HeaderPathView")
        this.children = [
            {
                class: 'd-flex flex-grow-1',
                children: children$(
                    this.state.currentFolder$,
                    ({ tree, folder }: { tree: TreeGroup, folder: AnyFolderNode }) => {

                        let path = tree.reducePath(folder.id, (node) => {
                            return node
                        })
                        let isLoading$ = merge(...path.map(n => n.status$))
                        let items = path.map((node) => [this.pathElemView(node, folder), { class: "px-2 my-auto", innerText: '/' }])
                        return items.flat().slice(0, -1).concat([this.loadingSpinner(isLoading$)])
                    }
                )
            },
            this.actionsMenuView(),
            new DisplayModesView({ displayMode$: this.displayMode$ })
        ]
    }

    actionsMenuView() {
        let expanded$ = new BehaviorSubject(false)
        return {
            class: 'd-flex align-items-center mr-5 fv-border-primary position-relative fv-pointer rounded fv-bg-secondary-alt px-2 fv-hover-bg-secondary',
            children: [
                {
                    innerText: 'Actions'
                },
                {
                    class: 'fas fa-caret-down mx-1'
                },
                {
                    class: attr$(
                        expanded$,
                        (expanded) => expanded ? 'position-absolute' : 'd-none'
                    ),
                    style: { top: '100%', right: '0%', zIndex: 100 },
                    children: [
                        new ActionsView({ state: this.state })
                    ]
                }
            ],
            onclick: () => expanded$.next(!expanded$.getValue()),
            onmouseleave: () => expanded$.next(false),
        }
    }

    loadingSpinner(isLoading$/*selectedNode: Nodes.FolderNode*/) {

        return {
            class: 'h-100 d-flex flex-column justify-content-center px-2',
            children: [
                child$(isLoading$,
                    (status) => {
                        return status.find(s => s.type == 'request-pending')
                            ? ywSpinnerView({ classes: 'mx-auto', size: '20px', duration: 1.5 })
                            : {}
                    }
                )
            ]
        }
    }

    pathElemView(node: AnyFolderNode, selectedNode: AnyFolderNode): VirtualDOM {
        let baseClass = 'p-1 rounded d-flex align-items-center fv-pointer fv-bg-background'
        return {
            class: node.id == selectedNode.id
                ? `${baseClass} fv-border-focus fv-text-focus fv-hover-text-primary fv-hover-bg-secondary`
                : `${baseClass} fv-border-primary fv-hover-text-primary fv-hover-bg-secondary`,
            children: [
                {
                    class: node.icon
                },
                {
                    class: "px-2",
                    innerText: node.name
                }
            ],
            onclick: () => this.state.openFolder(node)
        }
    }
}
