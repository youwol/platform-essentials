import { child$, children$, VirtualDOM } from '@youwol/flux-view'
import { merge, Observable } from 'rxjs'
import { ywSpinnerView } from '../../..'
import { ExplorerState, TreeGroup } from '../../explorer.state'
import { AnyFolderNode, BrowserNode } from '../../nodes'

export class HeaderPathView implements VirtualDOM {
    static ClassSelector = 'header-path-view'
    public readonly class = `${HeaderPathView.ClassSelector} w-100 d-flex justify-content-center p-2 fv-bg-background-alt`
    style = {
        height: '50px',
    }
    public readonly children: VirtualDOM[] // Stream$<Nodes.FolderNode, VirtualDOM[]>

    public readonly state: ExplorerState

    constructor(params: { state: ExplorerState; [k: string]: unknown }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex flex-grow-1 justify-content-center overflow-auto mr-1',
                style: {
                    'white-space': 'nowrap',
                    'overflow-x': 'auto',
                    'overflow-y': 'hidden',
                },
                children: children$(
                    this.state.openFolder$,
                    ({
                        tree,
                        folder,
                    }: {
                        tree: TreeGroup
                        folder: AnyFolderNode
                    }) => {
                        const path = tree.reducePath(folder.id, (node) => {
                            return node
                        })
                        const items: VirtualDOM[] = path.map((node) => [
                            new PathElementView({
                                state: this.state,
                                node: node as AnyFolderNode, // XXX : Review Type
                                selectedNode: folder,
                            }),
                            { class: 'px-2 my-auto', innerText: '/' },
                        ])
                        return items
                            .flat()
                            .slice(0, -1)
                            .concat([
                                new LoadingSpinnerView({
                                    isLoading$: merge(
                                        ...path.map((n) => n.status$),
                                    ),
                                }),
                            ])
                    },
                ),
            },
        ]
    }
}

export class LoadingSpinnerView implements VirtualDOM {
    public readonly class = `${LoadingSpinnerView} h-100 d-flex flex-column justify-content-center px-2`
    public readonly children: VirtualDOM[]

    public readonly isLoading$: Observable<{ type: string; id: string }[]>

    constructor(params: {
        isLoading$: Observable<{ type: string; id: string }[]>
    }) {
        Object.assign(this, params)

        this.children = [
            child$(
                this.isLoading$,
                (status: { type: string; id: string }[]) => {
                    return status.find((s) => s.type == 'request-pending')
                        ? ywSpinnerView({
                              classes: 'mx-auto',
                              size: '20px',
                              duration: 1.5,
                          })
                        : {}
                },
            ),
        ]
    }
}

export class PathElementView implements VirtualDOM {
    static ClassSelector = 'path-elem-view'
    public readonly baseClass = `${PathElementView.ClassSelector} rounded px-1 d-flex align-items-center fv-pointer fv-bg-background fv-hover-bg-background-alt`

    public readonly class: string
    public readonly children: VirtualDOM[]
    public readonly node: AnyFolderNode
    public readonly selectedNode: BrowserNode

    public readonly state: ExplorerState

    public readonly onclick = () => {
        this.state.openFolder(this.node)
    }

    constructor(params: {
        state: ExplorerState
        node: AnyFolderNode
        selectedNode: BrowserNode
    }) {
        Object.assign(this, params)

        this.class =
            this.node.id == this.selectedNode.id
                ? `${this.baseClass} fv-text-focus`
                : `${this.baseClass}`

        this.children = [
            {
                class: this.node.icon,
            },
            {
                class: 'px-1',
                innerText: this.node.name,
            },
        ]
    }
}
