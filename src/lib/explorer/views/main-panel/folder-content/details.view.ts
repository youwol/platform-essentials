import { VirtualDOM } from '@youwol/flux-view'
import { ChildApplicationAPI } from '../../../../core'
import { IPlatformHandler } from '../../../../core/platform.state'
import { ExplorerState } from '../../../explorer.state'
import {
    AnyFolderNode,
    BrowserNode,
    DriveNode,
    FolderNode,
    ProgressNode,
} from '../../../nodes'
import { ItemView, ProgressItemView } from './item.view'
import { installContextMenu } from '../../../context-menu/context-menu'

export class DetailsContentView {
    public readonly class =
        'fv-text-primary w-100 h-100 d-flex flex-column text-center overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly folder: AnyFolderNode
    public readonly items: BrowserNode[]

    public readonly state: ExplorerState
    public readonly onclick = () => this.state.selectedItem$.next(undefined)
    public readonly oncontextmenu = () =>
        this.state.selectedItem$.next(undefined)

    public readonly connectedCallback = (elem) => {
        installContextMenu({
            state: this.state,
            div: elem,
            node: this.folder,
        })
    }

    constructor(params: {
        state: ExplorerState
        items: BrowserNode[]
        folder: AnyFolderNode
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'flex-grow-1 overflow-auto',
                children: this.items.map((item: BrowserNode) =>
                    item instanceof ProgressNode
                        ? new ProgressItemView({ state: this.state, item })
                        : new RowView({ state: this.state, item }),
                ),
            },
        ]
    }
}

export class RowView implements VirtualDOM {
    static ClassSelector = 'row-view'
    public readonly class = `${RowView.ClassSelector} justify-content-between rounded`
    public readonly children: VirtualDOM[]

    public readonly state: ExplorerState
    public readonly item: BrowserNode
    public readonly platformHandler: IPlatformHandler

    public readonly ondblclick = (ev) => {
        ev.stopPropagation()
        if (this.item instanceof FolderNode || this.item instanceof DriveNode) {
            this.state.openFolder(this.item)
        }
    }

    constructor(params: { state: ExplorerState; item: BrowserNode }) {
        Object.assign(this, params)

        this.platformHandler = ChildApplicationAPI.getOsInstance()

        this.children = [
            {
                children: [
                    new ItemView({
                        state: this.state,
                        item: this.item,
                    }),
                ],
            },
        ]
    }
}
