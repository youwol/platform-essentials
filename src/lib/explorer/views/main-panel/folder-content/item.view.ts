import { attr$, child$, Stream$, VirtualDOM } from '@youwol/flux-view'

import { AssetsGateway } from '@youwol/http-clients'
import { BehaviorSubject, merge, Observable, of } from 'rxjs'
import { distinct, map, mergeMap, take } from 'rxjs/operators'
import {
    AssetActionsView,
    AssetPermissionsView,
    FluxDependenciesView,
    PackageInfoView,
    popupAssetModalView,
} from '../../../../assets'
import { ExplorerState } from '../../../explorer.state'
import {
    AnyItemNode,
    BrowserNode,
    ItemNode,
    RegularFolderNode,
} from '../../../nodes'
import { RequestsExecutor } from '../../../requests-executor'
import { ywSpinnerView } from '../../../../misc-views/youwol-spinner.view'

export class ItemView {
    static ClassSelector = 'item-view'
    baseClasses = `${ItemView.ClassSelector} d-flex align-items-center p-1 rounded m-3 fv-hover-bg-background-alt fv-pointer`
    class: Stream$<BrowserNode, string>
    children: VirtualDOM[]
    public readonly style: Stream$<
        { type: string; id: string }[],
        { [key: string]: string }
    >
    public readonly onclick: () => void

    public readonly state: ExplorerState
    public readonly item: RegularFolderNode | AnyItemNode
    public readonly hovered$: Observable<BrowserNode>

    constructor(params: {
        state: ExplorerState
        item: BrowserNode
        hovered$?: Observable<BrowserNode>
    }) {
        Object.assign(this, params)

        this.hovered$ = params.hovered$
            ? merge(params.hovered$, this.state.selectedItem$)
            : this.state.selectedItem$

        this.class = attr$(
            this.state.selectedItem$,
            (node) => {
                return node && node.id == this.item.id
                    ? `${this.baseClasses} fv-text-focus`
                    : `${this.baseClasses}`
            },
            { untilFirst: this.baseClasses },
        )

        this.style = attr$(
            this.item.status$,
            (statuses: { type; id }[]) =>
                statuses.find((s) => s.type == 'cut') != undefined
                    ? { opacity: 0.3 }
                    : {},
            {
                wrapper: (d) => ({ ...d, userSelect: 'none' }),
            },
        )

        this.children = [
            this.originView(this.item),
            {
                class: `fas ${this.item.icon} mr-1`,
            },
            child$(this.item.status$, (statusList) =>
                statusList.find((s) => s.type == 'renaming')
                    ? this.editView()
                    : { innerText: this.item.name },
            ),
            child$(this.item.status$, (status) => {
                return status.find((s) => s.type == 'request-pending')
                    ? ywSpinnerView({
                          classes: 'mx-auto my-auto',
                          size: '15px',
                          duration: 1.5,
                      })
                    : {}
            }),
            child$(this.hovered$, (node) => {
                return this.infosView(node)
            }),
        ]
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
            ],
        }
    }

    infosView(node: BrowserNode) {
        if (!(node instanceof ItemNode)) {
            return {}
        }

        return node.id == this.item.id
            ? new InfoBtnView({ state: this.state, node: node })
            : {}
    }

    editView() {
        return {
            tag: 'input',
            type: 'text',
            autofocus: true,
            style: { 'z-index': 200 },
            class: 'mx-2',
            data: this.item.name,
            onclick: (ev) => ev.stopPropagation(),
            onkeydown: (ev) => {
                if (ev.key === 'Enter') {
                    this.state.rename(this.item, ev.target.value)
                }
            },
        }
    }
}

export class InfoBtnView implements VirtualDOM {
    static ClassSelector = 'info-btn-view'

    public readonly tag = 'button'
    public readonly class = `${InfoBtnView.ClassSelector} fas fv-btn-secondary fa-info-circle fv-text-primary fv-pointer mx-4 rounded p-1`

    public readonly node: AnyItemNode
    public readonly asset$: Observable<AssetsGateway.Asset>
    public readonly state: ExplorerState

    public readonly popupDisplayed$ = new BehaviorSubject<boolean>(false)

    public readonly onclick = () => {
        const withTabs = {
            Permissions: new AssetPermissionsView({
                asset: this.node as unknown as AssetsGateway.Asset,
            }),
        }
        if (this.node.kind == 'flux-project') {
            withTabs['Dependencies'] = new FluxDependenciesView({
                asset: this.node as unknown as AssetsGateway.Asset,
            })
        }
        if (this.node.kind == 'package') {
            withTabs['Package Info'] = new PackageInfoView({
                asset: this.node as unknown as AssetsGateway.Asset,
            })
        }
        this.asset$.pipe(take(1)).subscribe((asset) => {
            const assetUpdate$ = popupAssetModalView({
                asset,
                actionsFactory: (targetAsset) => {
                    return new AssetActionsView({ asset: targetAsset })
                },
                withTabs,
            })
            assetUpdate$
                .pipe(
                    map(({ name }) => name),
                    distinct(),
                )
                .subscribe((name) => {
                    this.state.rename(this.node, name, false)
                })
            this.popupDisplayed$.next(true)
        })
    }

    constructor(params: { state: ExplorerState; node: AnyItemNode }) {
        Object.assign(this, params)

        this.asset$ = of(this.node).pipe(
            mergeMap(({ assetId }) => {
                return RequestsExecutor.getAsset(assetId)
            }),
        )
    }
}
