import { Observable, Subject } from 'rxjs'
import { AssetsGateway, raiseHTTPErrors } from '@youwol/http-clients'
import {
    map,
    mergeMap,
    take,
    tap,
    skip,
    skipWhile,
    delay,
} from 'rxjs/operators'
import { readFileSync } from 'fs'
import path from 'path'
import {
    Asset,
    AssetsGatewayClient,
    DefaultDriveResponse,
} from '@youwol/http-clients/dist/lib/assets-gateway'
import { AssetCardView } from '../../lib/assets'
import { render, VirtualDOM } from '@youwol/flux-view'
import { getFromDocument, queryFromDocument } from '../common'
import {
    AssetCardTabsContent,
    AssetCardTabsHeader,
} from '../../lib/assets/asset-card/asset-card.view'

export class Shell {
    public readonly defaultUserDrive: DefaultDriveResponse
    public readonly assetsGtw: AssetsGatewayClient
    public readonly assetId?: string
    public readonly assetOutput$ = new Subject<AssetsGateway.Asset>()
    public readonly schedulers?: { [k: string]: Observable<unknown> }

    constructor(params: {
        defaultUserDrive: DefaultDriveResponse
        assetsGtw: AssetsGatewayClient
        assetId?: string
        schedulers?: { [k: string]: Observable<unknown> }
    }) {
        Object.assign(this, params)
    }
}

export function shell$() {
    const assetsGtw = new AssetsGateway.AssetsGatewayClient()

    return assetsGtw.explorer.getDefaultUserDrive$().pipe(
        raiseHTTPErrors(),
        map((drive) => {
            return new Shell({ assetsGtw, defaultUserDrive: drive })
        }),
    )
}

export function expectSnapshot(params: {
    headers?: (tabs: AssetCardTabsHeader[]) => void
    content?: (tab: AssetCardTabsContent) => void
}) {
    const expectHeaders = params.headers
    const expectContent = params.content

    return (source$: Observable<Shell>) => {
        return source$.pipe(
            tap(() => {
                let headers = queryFromDocument<AssetCardTabsHeader>(
                    `.${AssetCardTabsHeader.ClassSelector}`,
                )
                expectHeaders && expectHeaders(headers)
                let content = getFromDocument<AssetCardTabsContent>(
                    `.${AssetCardTabsContent.ClassSelector}`,
                )
                expectContent && expectContent(content)
            }),
        )
    }
}

export function installPackage({ zipPath }: { zipPath: string }) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            mergeMap((shell: Shell) => {
                const buffer = readFileSync(path.resolve(__dirname, zipPath))
                const arraybuffer = Uint8Array.from(buffer).buffer

                return shell.assetsGtw.assets.package
                    .upload$(
                        shell.defaultUserDrive.homeFolderId,
                        zipPath,
                        new Blob([arraybuffer]),
                    )
                    .pipe(
                        raiseHTTPErrors(),
                        take(1),
                        map((asset) => [asset, shell]),
                    )
            }),
            map(([asset, shell]: [Asset, Shell]) => {
                return new Shell({
                    defaultUserDrive: shell.defaultUserDrive,
                    assetsGtw: shell.assetsGtw,
                    assetId: asset.assetId,
                })
            }),
        )
    }
}

export function popupAssetCardView({
    withTabs,
}: {
    withTabs: { [_key: string]: (asset: Asset) => VirtualDOM }
}) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            mergeMap((shell) => {
                return shell.assetsGtw.assets.get$(shell.assetId).pipe(
                    raiseHTTPErrors(),
                    take(1),
                    map((asset) => [asset, shell]),
                )
            }),
            map(([assetResp, shell]: [Asset, Shell]) => {
                const view = new AssetCardView({
                    asset: assetResp,
                    actionsFactory: () => ({}),
                    assetOutput$: shell.assetOutput$,
                    forceReadonly: true,
                    withTabs: Object.entries(withTabs).reduce(
                        (acc, [k, V]) => ({ ...acc, [k]: V(assetResp) }),
                        {},
                    ),
                })
                document.body.appendChild(render(view))
                const elem = getFromDocument<AssetCardView>(
                    `.${AssetCardView.ClassSelector}`,
                )
                expect(elem).toBeTruthy()
                return shell
                // expect general + permission
            }),
        )
    }
}

export function selectTab({ tabId }: { tabId: string }) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            map((shell: Shell) => {
                const header = queryFromDocument<AssetCardTabsHeader>(
                    `.${AssetCardTabsHeader.ClassSelector}`,
                ).find((h) => h.id == tabId)

                expect(header).toBeTruthy()
                header.dispatchEvent(new MouseEvent('click', { bubbles: true }))

                const panel = getFromDocument<AssetCardTabsContent>(
                    `.${AssetCardTabsContent.ClassSelector}`,
                )
                expect(panel).toBeTruthy()
                expect(panel.id).toEqual(tabId)
                return shell
            }),
        )
    }
}

export function instrumentSchedulers(
    fct: () => { [k: string]: Observable<unknown> },
) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            map((shell: Shell) => {
                const schedulers = { ...shell.schedulers, ...fct() }
                return new Shell({ ...shell, schedulers })
            }),
        )
    }
}

export function wait(
    obs$: string,
    options?: { skip?: number; skipWhile?: (d: unknown) => boolean },
) {
    return (source$: Observable<Shell>) => {
        const skipCount = options && options.skip ? options.skip : 0
        const skipWhileFct =
            options && options.skipWhile ? options.skipWhile : () => false
        return source$.pipe(
            mergeMap((shell: Shell) => {
                return shell.schedulers[obs$].pipe(
                    skip(skipCount),
                    skipWhile(skipWhileFct),
                    take(1),
                    delay(0),
                    map((_) => {
                        return shell
                    }),
                )
            }),
        )
    }
}

export function click(selector: string) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            tap((_shell: Shell) => {
                const elem = document.querySelector(selector)
                elem.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            }),
        )
    }
}
