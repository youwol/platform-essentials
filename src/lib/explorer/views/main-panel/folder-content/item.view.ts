import { attr$, child$, Stream$, VirtualDOM } from "@youwol/flux-view";
import {
    popupAssetModalView, ywSpinnerView, AssetActionsView,
    PackageInfoView, AssetPermissionsView, FluxDependenciesView, PlatformState
} from "../../../..";

import { Observable, of } from "rxjs";
import { distinct, filter, map, mergeMap, take } from "rxjs/operators";
import { ExplorerState } from "../../../explorer.state";
import { RequestsExecutor } from "../../../requests-executor";
import { BrowserNode, FolderNode, ItemNode } from "../../../nodes";
import { PlatformSettingsStore } from "../../../../platform-settings";


export class ItemView {

    baseClasses = 'd-flex align-items-center p-1 rounded m-3 fv-hover-bg-background-alt fv-pointer'
    class: Stream$<BrowserNode, string>
    children: VirtualDOM[]
    public readonly style: Stream$<{ type: string, id: string }[], { [key: string]: string }>
    public readonly onclick: any
    public readonly ondblclick: any
    public readonly state: ExplorerState
    public readonly item: BrowserNode
    public readonly hovered$: Observable<BrowserNode>


    public readonly platformState: PlatformState

    constructor(params: {
        state: ExplorerState,
        item: BrowserNode,
        hovered$?: Observable<BrowserNode>
    }) {
        Object.assign(this, params)
        this.platformState = PlatformState.getInstance()

        this.hovered$ = this.hovered$ || this.state.selectedItem$
        let baseClass = 'd-flex align-items-center p-1 rounded m-2 fv-pointer'
        this.class = attr$(
            this.state.selectedItem$,
            (node) => {
                return node && node.id == this.item.id ?
                    `${baseClass} fv-text-focus` :
                    `${baseClass}`
            },
            { untilFirst: baseClass }
        )

        this.style = attr$(
            this.item.status$,
            (statuses: { type, id }[]) => statuses.find(s => s.type == 'cut') != undefined
                ? { opacity: 0.3 }
                : {},
            {
                wrapper: (d) => ({ ...d, userSelect: 'none' })
            }
        )

        this.children = [
            this.originView(this.item),
            {
                class: `fas ${this.item.icon} mr-1`
            },
            child$(
                this.item.status$,
                statusList => statusList.find(s => s.type == 'renaming')
                    ? this.editView()
                    : { innerText: this.item.name }
            ),
            child$(
                this.item.status$,
                (status) => {
                    return status.find(s => s.type == 'request-pending')
                        ? ywSpinnerView({ classes: 'mx-auto my-auto', size: '15px', duration: 1.5 })
                        : {}
                }
            ),
            child$(
                this.hovered$,
                (node) => this.infosView(node)
            )
        ]
        this.onclick = () => this.state.selectItem(this.item)

        if (!this.platformState)
            return

        this.ondblclick = () => {
            PlatformSettingsStore.getOpeningApps$(this.item as any).pipe(
                take(1),
                filter(apps => apps.length > 0)
            ).subscribe((apps) => {

                let app = apps[0]
                /*let instance = this.platformState.createInstance({
                    icon: 'fas fa-play',
                    title: app.name + "#" + this.item.name,
                    appURL: app.url
                })
                this.platformState.focus(instance)
                */
            })
        }
    }

    originView(node: BrowserNode) {

        return {
            class: 'd-flex flex-column align-items-center mx-1',
            style: {
                transform: 'scale(0.7)',
            },
            children: [
                this.item instanceof ItemNode && this.item.borrowed
                    ? { class: 'fas fa-link pr-1 py-1' }
                    : undefined,
                node.origin && node.origin.local
                    ? { class: 'fas fa-laptop py-1' }
                    : undefined,
                node.origin && node.origin.remote
                    ? { class: 'fas fa-cloud py-1' }
                    : undefined,
            ]
        }
    }

    infosView(node: BrowserNode) {

        if (!(node instanceof ItemNode))
            return {}

        let asset$ = of(node).pipe(
            mergeMap(({ assetId }) => {
                return RequestsExecutor.getAsset(assetId)
            })
        )
        let infoView = {
            tag: 'button',
            class: 'fas fv-btn-secondary fa-info-circle fv-text-primary fv-pointer mx-4 rounded p-1',
            onclick: () => {
                let withTabs = {
                    Permissions: new AssetPermissionsView({ asset: node as any })
                }
                if (node.kind == "flux-project") {
                    withTabs['Dependencies'] = new FluxDependenciesView({ asset: node as any })
                }
                if (node.kind == "package") {
                    withTabs['Package Info'] = new PackageInfoView({ asset: node as any })
                }
                let assetUpdate$ = popupAssetModalView({
                    asset$,
                    actionsFactory: (asset) => {
                        return new AssetActionsView({ asset })
                    },
                    withTabs
                })

                assetUpdate$.pipe(
                    map(asset => asset.name),
                    distinct()
                ).subscribe((name) => {
                    this.state.rename(node, name, false)
                })
            }
        }
        return node.id == this.item.id ? infoView : {}
    }


    editView() {

        return {
            tag: 'input',
            type: 'text',
            autofocus: true,
            style: { "z-index": 200 },
            class: "mx-2",
            data: this.item.name,
            onclick: (ev) => ev.stopPropagation(),
            onkeydown: (ev) => {
                if (ev.key === 'Enter')
                    this.state.rename(this.item as any, ev.target.value)
            }
        }

    }
}
