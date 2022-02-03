import { uuidv4 } from '@youwol/flux-core'
import { VirtualDOM } from '@youwol/flux-view'

import { Tabs } from '@youwol/fv-tabs'
import { Subject } from 'rxjs'
import { AssetsGateway } from '@youwol/http-clients'

import { AssetOverview } from './overview/overview.view'

class AssetTab extends Tabs.TabData {
    public readonly view: VirtualDOM

    constructor(name: string, view: VirtualDOM) {
        super(name, name)
        this.view = view
    }
}

export class AssetCardView implements VirtualDOM {
    static ClassSelector = 'asset-card-view'
    public readonly class = `${AssetCardView.ClassSelector} p-3 rounded fv-color-focus fv-bg-background w-100 fv-text-primary`
    public readonly style = {
        maxWidth: '1000px',
        height: '75vh',
    }
    public readonly children: VirtualDOM[]
    public readonly asset: AssetsGateway.Asset
    public readonly actionsFactory: (asset: AssetsGateway.Asset) => VirtualDOM

    public readonly withTabs: { [key: string]: VirtualDOM } = {}
    public readonly forceReadonly: boolean = false

    public readonly assetOutput$: Subject<AssetsGateway.Asset>

    constructor(params: {
        asset: AssetsGateway.Asset
        actionsFactory: (asset: AssetsGateway.Asset) => VirtualDOM
        assetOutput$: Subject<AssetsGateway.Asset>
        withTabs?: { [key: string]: VirtualDOM }
        forceReadonly?: boolean
    }) {
        Object.assign(this, params)

        this.children = [
            Object.keys(this.withTabs).length > 0
                ? new AssetCardTabs({
                      asset: this.asset,
                      actionsFactory: this.actionsFactory,
                      assetOutput$: this.assetOutput$,
                      forceReadonly: this.forceReadonly,
                      withTabs: this.withTabs,
                  })
                : new AssetOverview({
                      asset: this.asset,
                      actionsFactory: this.actionsFactory,
                      assetOutput$: this.assetOutput$,
                      forceReadonly: this.forceReadonly,
                      class: 'overflow-auto h-100 p-3',
                  }),
        ]
    }
}

export class AssetCardTabs extends Tabs.View {
    static ClassSelector = 'asset-card-tabs'
    public readonly asset: AssetsGateway.Asset

    constructor(params: {
        asset: AssetsGateway.Asset
        actionsFactory
        assetOutput$
        forceReadonly
        withTabs
    }) {
        const { asset, actionsFactory, assetOutput$, forceReadonly, withTabs } =
            params

        const mainView = new AssetOverview({
            asset,
            actionsFactory: actionsFactory,
            assetOutput$: assetOutput$,
            forceReadonly: forceReadonly,
            class: `${AssetOverview.ClassSelector} overflow-auto h-100 p-3`,
        })

        const previews = Object.entries(withTabs).map(
            ([name, view]) => new AssetTab(name, view),
        )

        const overViewUid = uuidv4()
        const state = new Tabs.State([
            new Tabs.TabData(overViewUid, 'Overview'),
            ...previews,
        ])

        super({
            state,
            contentView: (_, tabData: AssetTab) => {
                return tabData.id == overViewUid ? mainView : tabData.view
            },
            headerView: (_, tabData) => ({
                class: `px-2 rounded border ${
                    tabData.id == overViewUid ? 'overview' : 'default-app'
                }`,
                innerText: tabData.name,
            }),
            class: `${AssetCardTabs.ClassSelector} d-flex flex-column h-100`,
        } as any)
    }
}
