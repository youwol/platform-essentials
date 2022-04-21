import { attr$, child$, children$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject } from 'rxjs'
import { map, mergeMap, take } from 'rxjs/operators'
import {
    ChildApplicationAPI,
    Executable,
    PlatformSettingsStore,
} from '../../core'

import { getExeUrl } from '../../core/platform-settings'
import { FileAddedEvent } from '../../core/platform.events'
import { ButtonView } from './misc.view'
import { AnyItemNode, BrowserNode } from '../../explorer/nodes'

import { AssetsGateway } from '@youwol/http-clients'

export function runApplication(instance: Executable, title) {
    const youwolOS = ChildApplicationAPI.getOsInstance()

    if (youwolOS) {
        youwolOS
            .createInstance$({
                ...instance,
                title,
                focus: true,
            })
            .subscribe()
        return
    }
    window.location.href = getExeUrl(instance)
}

const btnClasses =
    'd-flex align-items-center py-1 mb-1 fv-border-primary position-relative fv-pointer rounded fv-bg-secondary px-2 fv-hover-x-lighter'
const deployedMenuClasses =
    'd-flex flex-column pt-1 px-1 rounded border fv-bg-background-alt'

export class OpenWithView implements VirtualDOM {
    static ClassSelector = 'open-with-view'

    public readonly class = `${OpenWithView.ClassSelector} ${btnClasses}`
    public readonly children: VirtualDOM
    public readonly onclick: (ev: MouseEvent) => void
    public readonly onmouseleave: (ev: MouseEvent) => void
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly asset: AssetsGateway.Asset

    constructor(params: { asset: AssetsGateway.Asset }) {
        Object.assign(this, params)

        this.children = [
            {
                innerText: 'Open with',
            },
            {
                class: 'fas fa-caret-down mx-1',
            },
            {
                class: attr$(this.expanded$, (expanded) =>
                    expanded ? 'position-absolute' : 'd-none',
                ),
                style: { top: '100%', right: '0%', zIndex: 100 },
                children: [
                    {
                        class: deployedMenuClasses,
                        style: {
                            whiteSpace: 'nowrap',
                        },
                        children: children$(
                            PlatformSettingsStore.getOpeningApps$(
                                this.asset as unknown as BrowserNode,
                            ),
                            (openWithOptions) =>
                                openWithOptions.length > 0
                                    ? openWithOptions.map((option) =>
                                          this.openWithView(
                                              option,
                                              this.asset.name,
                                          ),
                                      )
                                    : [{}],
                        ),
                    },
                ],
            },
        ]
        this.onclick = () => this.expanded$.next(!this.expanded$.getValue())
        this.onmouseleave = () => this.expanded$.next(false)
    }

    openWithView(executable: Executable, title: string) {
        return {
            class: btnClasses,
            children: [
                child$(executable.appMetadata$, (d) => d.icon),
                {
                    class: 'ml-1',
                    innerText: attr$(executable.appMetadata$, (d) => d.name),
                },
            ],
            onclick: () => runApplication(executable, title),
        }
    }
}

class DownloadView implements VirtualDOM {
    static ClassSelector = 'download-view'

    public readonly class = `${DownloadView.ClassSelector} ${btnClasses}`
    public readonly children: VirtualDOM
    public readonly onclick: (ev: MouseEvent) => void
    public readonly onmouseleave: (ev: MouseEvent) => void
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly asset: AssetsGateway.Asset

    constructor(params: { asset: AssetsGateway.Asset }) {
        Object.assign(this, params)

        const options = [
            {
                icon: 'fas fa-link',
                name: 'Symbolic link',
                download$: (asset, drive) => {
                    return new AssetsGateway.AssetsGatewayClient().explorerDeprecated
                        .borrowItem$(asset.assetId, {
                            destinationFolderId: drive.downloadFolderId,
                        })
                        .pipe(map((item) => [item, drive]))
                },
            },
        ]

        this.children = [
            {
                class: 'fas fa-cart-arrow-down mr-1',
            },
            {
                innerText: 'Download',
            },
            {
                class: 'fas fa-caret-down mx-1',
            },
            {
                class: attr$(this.expanded$, (expanded) =>
                    expanded ? 'position-absolute' : 'd-none',
                ),
                style: { top: '100%', right: '0%', zIndex: 100 },
                children: [
                    {
                        class: deployedMenuClasses,
                        style: {
                            whiteSpace: 'nowrap',
                        },
                        children: options.map((option) =>
                            this.optionView(option),
                        ),
                    },
                ],
            },
        ]
        this.onclick = () => this.expanded$.next(!this.expanded$.getValue())
        this.onmouseleave = () => this.expanded$.next(false)
    }

    optionView(option: { icon: string; name: string; download$ }) {
        const youwolOS = ChildApplicationAPI.getOsInstance()
        const btn = new ButtonView({
            name: option.name,
            icon: option.icon,
            withClass: 'mb-1 fv-border-primary',
            enabled: true,
        })
        btn.state.click$
            .pipe(
                take(1),
                mergeMap(() => {
                    return new AssetsGateway.AssetsGatewayClient().explorerDeprecated.getDefaultUserDrive$()
                }),
                mergeMap((drive: AssetsGateway.DefaultDriveResponse) => {
                    return option.download$(this.asset, drive)
                }),
            )
            .subscribe(
                ([item, drive]: [
                    AnyItemNode,
                    AssetsGateway.DefaultDriveResponse,
                ]) => {
                    if (youwolOS) {
                        youwolOS.broadcastEvent(
                            new FileAddedEvent(
                                {
                                    treeId: item.treeId,
                                    groupId: item.groupId,
                                    driveId: item.driveId,
                                    folderId: drive.downloadFolderId,
                                },
                                {
                                    originId:
                                        ChildApplicationAPI.getAppInstanceId(),
                                },
                            ),
                        )
                    }
                },
            )
        return btn
    }
}

export class AssetActionsView implements VirtualDOM {
    static ClassSelector = 'asset-actions-view'
    public readonly class = `${AssetActionsView.ClassSelector} d-flex w-100 justify-content-around`
    public readonly children: VirtualDOM
    public readonly asset: AssetsGateway.Asset

    constructor(params: { asset: AssetsGateway.Asset }) {
        Object.assign(this, params)
        const openWithView = new OpenWithView({ asset: this.asset })
        const downloadView = new DownloadView({ asset: this.asset })
        this.children = [openWithView, downloadView]
    }
}
