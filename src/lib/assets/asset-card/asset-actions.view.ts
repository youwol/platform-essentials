import { attr$, children$, VirtualDOM } from "@youwol/flux-view"
import { Asset, AssetsGatewayClient, DefaultDriveResponse, PlatformSettingsStore, PlatformState } from "../.."
import { BehaviorSubject } from "rxjs"
import { map, mergeMap, take } from "rxjs/operators"
import { ButtonView } from "./misc.view"


export function runApplication(instance: {
    icon: string
    appName: string
    instanceName: string
    URL: string
}) {

    let youwolOS = PlatformState.getInstance()

    if (youwolOS) {
        let app = youwolOS.createInstance({
            title: instance.instanceName,
            icon: 'fas fa-play',
            appURL: instance.URL
        })
        youwolOS.focus(app)
        return
    }
    window.location.href = instance.URL
}


let btnClasses = 'd-flex align-items-center py-1 mr-5 fv-border-primary position-relative fv-pointer rounded fv-bg-secondary px-2 fv-hover-x-lighter'
let deployedMenuClasses = 'd-flex flex-column pt-1 px-1 rounded border fv-bg-background-alt fv-xx-lighter'

export class OpenWithView implements VirtualDOM {

    static ClassSelector = 'open-with-view'

    public readonly class = `${OpenWithView.ClassSelector} ${btnClasses}`
    public readonly children: VirtualDOM
    public readonly onclick: (ev: MouseEvent) => void
    public readonly onmouseleave: (ev: MouseEvent) => void
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly asset: Asset

    constructor(params: { asset: Asset }) {

        Object.assign(this, params)

        let options$ = PlatformSettingsStore.getOpeningApps$(this.asset).pipe(
            map((apps) => {
                return apps.map((app) => {
                    return {
                        icon: "fas fa-play",
                        appName: app.name,
                        instanceName: `${app.name}#${this.asset.name}`,
                        URL: app.url
                    }
                })
            })
        )

        this.children = [
            {
                innerText: 'Open with'
            },
            {
                class: 'fas fa-caret-down mx-1'
            },
            {
                class: attr$(
                    this.expanded$,
                    (expanded) => expanded ? 'position-absolute' : 'd-none'
                ),
                style: { top: '100%', right: '0%', zIndex: 100 },
                children: [
                    {
                        class: deployedMenuClasses,
                        style: {
                            whiteSpace: 'nowrap'
                        },
                        children: children$(
                            options$,
                            (options) => options.length > 0
                                ? options.map((option) => this.optionView(option))
                                : [{}]
                        )
                    }

                ]
            }
        ]
        this.onclick = () => this.expanded$.next(!this.expanded$.getValue())
        this.onmouseleave = () => this.expanded$.next(false)

    }

    optionView(option: {
        icon: string
        appName: string
        instanceName: string
        URL: string
    }) {
        let btn = new ButtonView({
            name: option.appName,
            icon: option.icon,
            withClass: 'mb-1 fv-border-primary',
            enabled: true
        })
        btn.state.click$.subscribe(() => runApplication(option))
        return btn
    }
}


class DownloadView implements VirtualDOM {

    static ClassSelector = 'download-view'

    public readonly class = `${DownloadView.ClassSelector} ${btnClasses}`
    public readonly children: VirtualDOM
    public readonly onclick: (ev: MouseEvent) => void
    public readonly onmouseleave: (ev: MouseEvent) => void
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly asset: Asset

    constructor(params: { asset: Asset }) {

        Object.assign(this, params)

        let options = [{
            icon: "fas fa-link",
            name: 'Symbolic link',
            download$: (asset, drive) => {
                return new AssetsGatewayClient().borrowItem(asset.assetId, drive.downloadFolderId).pipe(
                    map((item) => [item, drive])
                )
            }
        }]

        this.children = [
            {
                class: 'fas fa-cart-arrow-down mr-1'
            },
            {
                innerText: 'Download'
            },
            {
                class: 'fas fa-caret-down mx-1'
            },
            {
                class: attr$(
                    this.expanded$,
                    (expanded) => expanded ? 'position-absolute' : 'd-none'
                ),
                style: { top: '100%', right: '0%', zIndex: 100 },
                children: [
                    {
                        class: deployedMenuClasses,
                        style: {
                            whiteSpace: 'nowrap'
                        },
                        children: options.map((option) => this.optionView(option))
                    }
                ]
            }
        ]
        this.onclick = () => this.expanded$.next(!this.expanded$.getValue())
        this.onmouseleave = () => this.expanded$.next(false)

    }

    optionView(option: { icon: string, name: string, download$ }) {

        let youwolOS = PlatformState.getInstance()
        let btn = new ButtonView({
            name: option.name,
            icon: option.icon,
            withClass: 'mb-1 fv-border-primary',
            enabled: true
        })
        btn.state.click$.pipe(
            take(1),
            mergeMap(() => {
                return new AssetsGatewayClient().getDefaultUserDrive()
            }),
            mergeMap((drive: DefaultDriveResponse) => {
                return option.download$(this.asset, drive)
            })
        ).subscribe(([item, drive]: [any, DefaultDriveResponse]) => {
            if (youwolOS) {
                let tree = youwolOS.groupsTree[item.groupId]
                let node = new youwolOS.Nodes.ItemNode({
                    id: item.treeId, groupId: item.groupId, driveId: item.driveId, name: item.name,
                    assetId: item.assetId, rawId: item.rawId, borrowed: true,
                    icon: 'fas fa-play'
                })
                try {
                    tree.addChild(drive.downloadFolderId, node)
                }
                catch (e) {
                    console.log("Home's download node not already resolved", e)
                }
                tree.getNode(drive.downloadFolderId).events$.next({ type: 'item-added' })
            }
        })
        return btn
    }
}


export class AssetActionsView implements VirtualDOM {

    static ClassSelector = "asset-actions-view"
    public readonly class = `${AssetActionsView.ClassSelector} d-flex w-100 justify-content-around`
    public readonly children: VirtualDOM
    public readonly asset: Asset

    constructor(params: {
        asset: Asset
    }) {
        Object.assign(this, params)
        let openWithView = new OpenWithView({ asset: this.asset })
        let downloadView = new DownloadView({ asset: this.asset })
        this.children = [
            openWithView,
            downloadView,
        ]
    }
}
