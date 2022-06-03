import { VirtualDOM } from '@youwol/flux-view'

import { Tabs } from '@youwol/fv-tabs'
import { AssetsGateway } from '@youwol/http-clients'
import { Subject } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'

import { AssetOverview } from './overview/overview.view'
import { AssetWithPermissions } from './models'

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
    public readonly asset: AssetWithPermissions

    public readonly withTabs: { [key: string]: VirtualDOM } = {}
    public readonly forceReadonly: boolean = false

    public readonly assetOutput$: Subject<AssetWithPermissions>

    constructor(params: {
        asset: AssetsGateway.Asset
        assetOutput$: Subject<AssetsGateway.Asset>
        withTabs?: { [key: string]: VirtualDOM }
        forceReadonly?: boolean
    }) {
        Object.assign(this, params)

        this.children = [
            Object.keys(this.withTabs).length > 0
                ? new AssetCardTabs({
                      asset: this.asset,
                      assetOutput$: this.assetOutput$,
                      forceReadonly: this.forceReadonly,
                      withTabs: this.withTabs,
                  })
                : new AssetOverview({
                      asset: this.asset,
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
        asset: AssetWithPermissions
        assetOutput$
        forceReadonly
        withTabs
    }) {
        const { asset, assetOutput$, forceReadonly, withTabs } = params

        const mainView = new AssetOverview({
            asset,
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
                let view = tabData.id == overViewUid ? mainView : tabData.view
                return new AssetCardTabsContent({ view, id: tabData.id })
            },
            headerView: (_, tabData) =>
                new AssetCardTabsHeader({
                    name: tabData.name,
                    id: tabData.id,
                }),
            class: `${AssetCardTabs.ClassSelector} d-flex flex-column h-100`,
        })
    }
}

export class AssetCardTabsContent implements VirtualDOM {
    static ClassSelector = 'asset-card-tabs-content'
    public readonly class = `${AssetCardTabsContent.ClassSelector} h-100 w-100`
    public readonly children: VirtualDOM[]
    public readonly view: VirtualDOM
    constructor(params: { view: VirtualDOM; id: string }) {
        Object.assign(this, params)
        this.children = [this.view]
    }
}

export class AssetCardTabsHeader implements VirtualDOM {
    static ClassSelector = 'asset-card-tabs-header'
    public readonly class: string = `${AssetCardTabsHeader.ClassSelector} px-2 rounded border`
    public readonly children: VirtualDOM[]
    public readonly name: string
    public readonly id: string
    constructor(params: { name: string; id: string }) {
        Object.assign(this, params)
        this.children = [
            {
                innerText: this.name,
            },
        ]
    }
}
