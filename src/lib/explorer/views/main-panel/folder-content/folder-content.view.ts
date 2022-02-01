import { child$, VirtualDOM } from '@youwol/flux-view'
import { combineLatest, Observable } from 'rxjs'
import { filter, map, shareReplay } from 'rxjs/operators'
import { ExplorerState, TreeGroup } from '../../../explorer.state'
import { BrowserNode } from '../../../nodes'
import { DisplayMode } from '../main-panel.view'
import { DetailsContentView } from './details.view'

function unreachable(_mode: never) {
    /* NOOP */
}

export class FolderContentView implements VirtualDOM {
    static ClassSelector = 'folder-content-view'
    public readonly class = `${FolderContentView.ClassSelector} flex-grow-1 fv-text-primary h-100 px-3`

    public readonly state: ExplorerState
    public readonly folderId: string
    public readonly groupId: string

    public readonly children: VirtualDOM[]

    public readonly tree: TreeGroup
    public readonly items$: Observable<BrowserNode[]>

    constructor(params: {
        state: ExplorerState
        folderId: string
        groupId: string
    }) {
        Object.assign(this, params)
        this.tree = this.state.groupsTree[this.groupId]
        this.items$ = this.tree.root$.pipe(
            map((root) => {
                return root.id == this.folderId
                    ? root
                    : this.tree.getNode(this.folderId)
            }),
            map((node) => node.children as BrowserNode[]),
            // When double-clicking on sidebar this prevents error (an observable is actually reaching here)
            filter((children) => Array.isArray(children)),
            shareReplay(1),
        )

        this.children = [
            child$(
                combineLatest([this.state.displayMode$, this.items$]),
                ([mode, items]: [DisplayMode, BrowserNode[]]) =>
                    mode === 'details'
                        ? new DetailsContentView({
                              state: this.state,
                              items,
                          })
                        : unreachable(mode),
            ),
        ]
    }
}
