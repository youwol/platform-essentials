import { attr$, child$, VirtualDOM } from '@youwol/flux-view'
import { AnyItemNode, FolderContentView } from '../..'
import { ExplorerState } from '../../explorer.state'
import { filter, mergeMap } from 'rxjs/operators'
import { AssetsGateway, raiseHTTPErrors } from '@youwol/http-clients'
import { AssetView } from '../../../assets'

export class MainPanelView implements VirtualDOM {
    static ClassSelector = 'main-panel-view'
    public readonly class = `${MainPanelView.ClassSelector} w-100 h-100 d-flex`
    public readonly style = {
        minHeight: '0px',
    }
    public readonly children: VirtualDOM[]

    public readonly state: ExplorerState

    constructor(params: { state: ExplorerState }) {
        Object.assign(this, params)

        this.children = [
            {
                class: attr$(
                    this.state.selectedItem$,
                    (item): string => (item ? 'w-25' : 'w-50'),
                    { wrapper: (d) => `${d} h-100` },
                ),
                style: {
                    minWidth: '250px',
                    maxWidth: '400px',
                },
                children: [
                    child$(this.state.openFolder$, ({ folder }) => {
                        return new FolderContentView({
                            state: this.state,
                            folderId: folder.id,
                            groupId: folder.groupId,
                        })
                    }),
                ],
            },
            {
                class: attr$(this.state.selectedItem$, (item): string =>
                    item ? 'd-block w-75' : 'd-none',
                ),
                style: {
                    boxShadow: 'white 0px 0px 5px',
                },
                children: [
                    child$(
                        this.state.selectedItem$.pipe(
                            filter((d) => d != undefined),
                            mergeMap((node: AnyItemNode) =>
                                new AssetsGateway.Client().assets.getAsset$({
                                    assetId: node.assetId,
                                }),
                            ),
                            raiseHTTPErrors(),
                        ),
                        (asset) => {
                            return new AssetView({
                                asset,
                            })
                        },
                    ),
                ],
            },
        ]
    }
}
