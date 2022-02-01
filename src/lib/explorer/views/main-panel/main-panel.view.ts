import { child$, HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject } from 'rxjs'
import { FolderContentView, SideBarView } from '../..'
import { ExplorerState } from '../../explorer.state'

export type DisplayMode = 'details'

export class MainPanelView implements VirtualDOM {
    static ClassSelector = 'main-panel-view'
    public readonly class = `${MainPanelView.ClassSelector} w-100 h-100 flex-grow-1 d-flex flex-column`
    public readonly style = {
        minHeight: '0px',
    }
    public readonly children: VirtualDOM[]

    public readonly state: ExplorerState

    cache = {}

    constructor(params: { state: ExplorerState }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'flex-grow-1 w-100 d-flex',
                style: { minHeight: '0px' },
                connectedCallback: (elem: HTMLElement$) => {
                    elem.ownSubscriptions(...this.state.subscriptions)
                },
                children: [
                    new SideBarView(this.state, new BehaviorSubject(false)),
                    {
                        class: 'w-100 h-100 d-flex',
                        children: [
                            child$(this.state.currentFolder$, ({ folder }) => {
                                return new FolderContentView({
                                    state: this.state,
                                    folderId: folder.id,
                                    groupId: folder.groupId,
                                })
                            }),
                        ],
                    },
                ],
            },
        ]
    }
}
