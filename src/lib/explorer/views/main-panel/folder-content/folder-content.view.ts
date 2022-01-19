import { child$, VirtualDOM } from "@youwol/flux-view";
import { combineLatest } from "rxjs";
import { filter, map } from "rxjs/operators";
import { ExplorerState, TreeGroup } from "../../../explorer.state";
import { BrowserNode } from "../../../nodes";
import { DisplayMode } from "../main-panel.view";
import { DetailsContentView } from "./details.view";
import { MiniaturesContentView } from "./miniatures.view";

function unreachable(mode: never) {

}

export class FolderContentView implements VirtualDOM {

    static ClassSelector = "folder-content-view"
    public readonly class = `${FolderContentView.ClassSelector} flex-grow-1 fv-text-primary h-100 px-3`

    public readonly state: ExplorerState
    public readonly folderId: string
    public readonly groupId: string

    public readonly children: VirtualDOM[]

    public readonly tree: TreeGroup
    public readonly items$: any

    constructor(params: { state: ExplorerState, folderId: string, groupId: string }) {

        Object.assign(this, params)
        this.tree = this.state.groupsTree[this.groupId]
        this.items$ = this.tree.root$.pipe(
            map((root) => {
                return root.id == this.folderId
                    ? root
                    : this.tree.getNode(this.folderId)
            }),
            map(node => node.children),
            // When dble-clicking on side-bar this prevent error (an observable is actually reaching here)
            filter(children => Array.isArray(children))
        )

        this.children = [
            child$(
                combineLatest([this.state.displayMode$, items$]),
                ([mode, items]: [DisplayMode, BrowserNode[]]) => {
                    switch (mode) {
                        case 'cards':
                            return this.cardsView(items)
                        case 'miniatures':
                            return new MiniaturesContentView({ state: this.state, items })
                        case 'details':
                            return new DetailsContentView({ state: this.state, items })
                        default:
                            unreachable(mode)
                    }
                })
        ]
    }

    cardsView(items: BrowserNode[]): VirtualDOM {
        return {
            children: items.map((child) => {
                return { innerText: child.name }
            })
        }
    }

}
