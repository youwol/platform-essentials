import { child$, VirtualDOM } from "@youwol/flux-view"
import { Observable, Subject } from "rxjs"
import { uuidv4 } from "@youwol/flux-core"

import { Tabs } from '@youwol/fv-tabs'

import { AssetOverview } from "./overview/overview.view"
import { Asset, PlatformSettingsStore, ywSpinnerView } from "../.."
import { map, mergeMap } from "rxjs/operators"


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
    public readonly asset$: Observable<Asset>
    public readonly actionsFactory: (asset: Asset) => VirtualDOM

    public readonly withTabs: { [key: string]: VirtualDOM } = {}
    public readonly forceReadonly: boolean = false

    public readonly assetOutput$: Subject<Asset>

    constructor(params: {
        asset$: Observable<Asset>,
        actionsFactory: (asset: Asset) => VirtualDOM,
        assetOutput$: Subject<Asset>,
        withTabs?: { [key: string]: VirtualDOM },
        forceReadonly?: boolean
    }) {

        Object.assign(this, params)

        this.children = [
            child$(
                this.asset$.pipe(
                    mergeMap((asset) =>
                        PlatformSettingsStore.getOpeningApps$(asset).pipe(map((apps) => [asset, apps])))
                ),
                ([asset, apps]: [Asset, { name, url }[]]) => this.presentationView({
                    asset,
                    defaultApplications: apps
                }),
                {
                    untilFirst: ywSpinnerView({ classes: 'mx-auto', size: '50px', duration: 1.5 }) as any
                }
            )
        ]
    }

    presentationView(parameters: {
        asset: Asset,
        defaultApplications: { name, url }[]
    }): VirtualDOM {

        let { asset } = parameters

        let mainView = new AssetOverview({
            asset,
            actionsFactory: this.actionsFactory,
            assetOutput$: this.assetOutput$,
            forceReadonly: this.forceReadonly,
            class: 'overflow-auto h-100 p-3',
        } as any)

        if (Object.keys(this.withTabs).length == 0)
            return mainView

        let previews = Object.entries(this.withTabs)
            .map(([name, view]) => new AssetTab(name, view))

        let overViewUid = uuidv4()
        let state = new Tabs.State([new Tabs.TabData(overViewUid, "Overview"), ...previews])
        let view = new Tabs.View({
            state,
            contentView: (_, tabData: AssetTab) => tabData.id == overViewUid
                ? mainView
                : tabData.view,
            headerView: (_, tabData) => ({
                class: `px-2 rounded border ${(tabData.id == overViewUid) ? 'overview' : 'default-app'}`,
                innerText: tabData.name
            }),
            class: "d-flex flex-column h-100"
        } as any)
        return view
    }
}
