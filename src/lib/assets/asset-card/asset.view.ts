import { child$, VirtualDOM } from '@youwol/flux-view'
import { AssetsBackend, AssetsGateway } from '@youwol/http-clients'
import { BehaviorSubject } from 'rxjs'
import { DockableTabs } from '@youwol/fv-tabs'
import { map } from 'rxjs/operators'
import * as cdnClient from '@youwol/cdn-client'
import * as fluxView from '@youwol/flux-view'
import { AssetOverview } from './overview/overview.view'
import { AssetPermissionsView } from './permissions/permissions.view'
import { defaultOpeningApp$, Installer } from '../../core'

export class AssetView implements VirtualDOM {
    public readonly class = 'h-100 w-100'
    public readonly style = {
        position: 'relative',
    }
    public readonly children: VirtualDOM[]
    public readonly asset: AssetsBackend.GetAssetResponse

    public readonly leftNavState: DockableTabs.State

    constructor(params: { asset: AssetsBackend.GetAssetResponse }) {
        Object.assign(this, params)
        let tabs$ = Installer.getInstallManifest$().pipe(
            map(({ assetPreviews }) => {
                return assetPreviews({
                    asset: this.asset,
                    cdnClient,
                    fluxView,
                    assetsGtwClient: new AssetsGateway.Client(),
                }).filter((preview) => preview.applicable())
            }),
            map((previews) => {
                return [
                    new GeneralTab({ asset: this.asset }),
                    new PermissionsTab({
                        asset: this.asset,
                    }),
                    ...previews.map(
                        (preview) =>
                            new CustomTab({
                                asset: this.asset,
                                preview: preview.exe(),
                                name: preview.name,
                                icon: preview.icon,
                            }),
                    ),
                ]
            }),
        )
        this.leftNavState = new DockableTabs.State({
            disposition: 'top',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$,
            selected$: new BehaviorSubject('Overview'),
            persistTabsView: false,
        })
        let sideNav = new DockableTabs.View({
            state: this.leftNavState,
            styleOptions: {
                initialPanelSize: '400px',
                wrapper: {
                    class: 'h-100 fv-bg-primary',
                },
            },
        })
        this.children = [sideNav]
    }
}

function getBackgroundChild$(asset: AssetsBackend.GetAssetResponse) {
    return child$(defaultOpeningApp$(asset as any), (info) => {
        return info && info.appInfo.graphics && info.appInfo.graphics.background
            ? {
                  class: 'w-100 h-100',
                  style: {
                      position: 'absolute',
                      zIndex: -1,
                  },
                  children: [info.appInfo.graphics.background],
              }
            : {}
    })
}
export class GeneralTab extends DockableTabs.Tab {
    constructor(params: { asset: AssetsBackend.GetAssetResponse }) {
        super({
            id: 'Overview',
            title: 'Overview',
            icon: 'fas fa-home',
            content: () => {
                return {
                    class: 'w-100 h-100 fv-bg-background fv-xx-lighter',
                    style: {
                        position: 'relative',
                    },
                    children: [
                        getBackgroundChild$(params.asset),
                        new AssetOverview({
                            asset: {
                                ...params.asset,
                                permissions: { read: true, write: true },
                            } as any,
                            actionsFactory: undefined,
                            assetOutput$: undefined,
                        }),
                    ],
                }
            },
        })
        Object.assign(this, params)
    }
}

export class PermissionsTab extends DockableTabs.Tab {
    constructor(params: { asset: AssetsBackend.GetAssetResponse }) {
        super({
            id: 'Permissions',
            title: 'Permissions',
            icon: 'fas fa-lock',
            content: () => {
                return {
                    class: 'w-100 h-100 fv-bg-background fv-xx-lighter',
                    style: {
                        position: 'relative',
                    },
                    children: [
                        getBackgroundChild$(params.asset),
                        new AssetPermissionsView({
                            asset: params.asset,
                        }),
                    ],
                }
            },
        })
        Object.assign(this, params)
    }
}

export class CustomTab extends DockableTabs.Tab {
    constructor(params: {
        asset: AssetsBackend.GetAssetResponse
        name: string
        preview: VirtualDOM
        icon: string
    }) {
        super({
            id: params.name,
            title: params.name,
            icon: params.icon,
            content: () => {
                return params.preview
            },
        })
        Object.assign(this, params)
    }
}
