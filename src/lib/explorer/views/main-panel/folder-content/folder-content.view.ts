import { child$, VirtualDOM } from '@youwol/flux-view'
import { Observable } from 'rxjs'
import { map, shareReplay, switchMap, take, tap } from 'rxjs/operators'
import { ExplorerState, TreeGroup } from '../../../explorer.state'
import {
    BrowserNode,
    DeletedItemNode,
    FutureItemNode,
    ItemNode,
    ProgressNode,
} from '../../../nodes'
import { DetailsContentView } from './details.view'
import { installContextMenu } from '../../../context-menu/context-menu'

export class FolderContentView implements VirtualDOM {
    static ClassSelector = 'folder-content-view'
    public readonly class = `${FolderContentView.ClassSelector} flex-grow-1 fv-text-primary w-100 h-100 px-3`

    public readonly state: ExplorerState
    public readonly folderId: string
    public readonly groupId: string

    public readonly children: VirtualDOM[]

    public readonly tree: TreeGroup
    public readonly items$: Observable<BrowserNode[]>

    public readonly onclick = () => this.state.selectedItem$.next(undefined)
    public readonly connectedCallback = (elem) => {
        installContextMenu({
            state: this.state,
            div: elem,
            node: this.tree.getNode(this.folderId),
        })
    }

    constructor(params: {
        state: ExplorerState
        folderId: string
        groupId: string
        [k: string]: unknown
    }) {
        Object.assign(this, params)
        this.tree = this.state.groupsTree[this.groupId]
        this.items$ = this.tree.root$.pipe(
            map(() => this.tree.getNode(this.folderId)),
            switchMap((node) => this.tree.getChildren$(node).pipe(take(1))),
            map((children) =>
                children.filter(
                    (c) =>
                        c instanceof ItemNode ||
                        c instanceof FutureItemNode ||
                        c instanceof DeletedItemNode ||
                        c instanceof ProgressNode,
                ),
            ),
            tap((children) => console.log('FolderContent', children)),
            shareReplay({ bufferSize: 1, refCount: true }),
        )

        this.children = [
            child$(this.items$, (items: BrowserNode[]) => {
                return new DetailsContentView({
                    state: this.state,
                    items,
                    folder: this.tree.getNode(this.folderId),
                })
            }),
        ]
    }
}
