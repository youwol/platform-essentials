import {VirtualDOM} from "@youwol/flux-view"
import {Subject} from "rxjs"
import {uuidv4} from "@youwol/flux-core"

import {Tabs} from '@youwol/fv-tabs'

import {AssetOverview} from "./overview/overview.view"
import {Asset} from "../../clients/assets-gateway";


class AssetTab extends Tabs.TabData {

    public readonly view: VirtualDOM

    constructor(name: string, view: VirtualDOM) {
        super(name, name)
        this.view = view
    }
}


export class AssetCardView implements VirtualDOM {

    static ClassSelector = "asset-card-view"
    public readonly class = `${AssetCardView.ClassSelector} p-3 rounded fv-color-focus fv-bg-background w-100 fv-text-primary`
    public readonly style = {
        maxWidth: '1000px',
        height: '75vh'
    }
    public readonly children: VirtualDOM[]
    public readonly asset: Asset
    public readonly actionsFactory: (asset: Asset) => VirtualDOM

    public readonly withTabs: { [key: string]: VirtualDOM } = {}
    public readonly forceReadonly: boolean = false

    public readonly assetOutput$: Subject<Asset>

    constructor(params: {
        asset: Asset,
        actionsFactory: (asset: Asset) => VirtualDOM,
        assetOutput$: Subject<Asset>,
        withTabs?: { [key: string]: VirtualDOM },
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
                    withTabs: this.withTabs
                })
                : new AssetOverview({
                    asset: this.asset,
                    actionsFactory: this.actionsFactory,
                    assetOutput$: this.assetOutput$,
                    forceReadonly: this.forceReadonly,
                    class: 'overflow-auto h-100 p-3',
                } as any)
        ]
    }
}


export class AssetCardTabs extends Tabs.View {

    static ClassSelector = "asset-card-tabs"
    public readonly asset: Asset

    constructor(params: {
        asset: Asset,
        actionsFactory,
        assetOutput$,
        forceReadonly,
        withTabs
    }) {
        let { asset, actionsFactory, assetOutput$, forceReadonly, withTabs } = params

        let mainView = new AssetOverview({
            asset,
            actionsFactory: actionsFactory,
            assetOutput$: assetOutput$,
            forceReadonly: forceReadonly,
            class: `${AssetOverview.ClassSelector} overflow-auto h-100 p-3`,
        } as any)

        let previews = Object.entries(withTabs)
            .map(([name, view]) => new AssetTab(name, view))

        let overViewUid = uuidv4()
        let state = new Tabs.State([new Tabs.TabData(overViewUid, "Overview"), ...previews])

        super({
            state,
            contentView: (_, tabData: AssetTab) => {
                return tabData.id == overViewUid
                    ? mainView
                    : tabData.view
            },
            headerView: (_, tabData) => ({
                class: `px-2 rounded border ${(tabData.id == overViewUid) ? 'overview' : 'default-app'}`,
                innerText: tabData.name
            }),
            class: `${AssetCardTabs.ClassSelector} d-flex flex-column h-100`
        } as any)
    }
}
