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
    mapTo,
} from 'rxjs/operators'
import { readFileSync } from 'fs'
import path from 'path'
import { AssetCardView } from '../../lib/assets'
import { render, VirtualDOM } from '@youwol/flux-view'
import { getFromDocument, queryFromDocument } from '../common'
import {
    AssetCardTabsContent,
    AssetCardTabsHeader,
} from '../../lib/assets/asset-card/asset-card.view'
import {
    ExplorerView,
    FolderView,
    PathElementView,
} from '../../lib/assets/asset-card/asset-specific/package-explorer.view'

export class Shell {
    public readonly defaultUserDrive: AssetsGateway.DefaultDriveResponse
    public readonly assetsGtw: AssetsGateway.AssetsGatewayClient
    public readonly assetId?: string
    public readonly assetOutput$ = new Subject<AssetsGateway.Asset>()
    public readonly schedulers?: { [k: string]: Observable<unknown> }

    constructor(params: {
        defaultUserDrive: AssetsGateway.DefaultDriveResponse
        assetsGtw: AssetsGateway.AssetsGatewayClient
        assetId?: string
        schedulers?: { [k: string]: Observable<unknown> }
    }) {
        Object.assign(this, params)
    }
}

export function shell$() {
    const assetsGtw = new AssetsGateway.AssetsGatewayClient()

    return assetsGtw.explorerDeprecated.getDefaultUserDrive$().pipe(
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

                return shell.assetsGtw.assetsDeprecated.package
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
            map(([asset, shell]: [AssetsGateway.Asset, Shell]) => {
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
    withTabs: { [_key: string]: (asset: AssetsGateway.Asset) => VirtualDOM }
}) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            mergeMap((shell) => {
                return shell.assetsGtw.assetsDeprecated
                    .get$(shell.assetId)
                    .pipe(
                        raiseHTTPErrors(),
                        take(1),
                        map((asset) => [asset, shell]),
                    )
            }),
            map(([assetResp, shell]: [AssetsGateway.Asset, Shell]) => {
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

export function navigateCdnFolder(params: { path: string }) {
    return (source$: Observable<Shell>) => {
        return source$.pipe(
            mergeMap((shell: Shell) => {
                const explorerView = getFromDocument<ExplorerView>(
                    `.${ExplorerView.ClassSelector}`,
                )
                expect(explorerView).toBeTruthy()
                const folders = queryFromDocument<FolderView>(
                    `.${FolderView.ClassSelector}`,
                )
                if (params.path == '..') {
                    const pathElements = queryFromDocument<PathElementView>(
                        `.${PathElementView.ClassSelector}`,
                    )
                    const pathView = pathElements[pathElements.length - 2]
                    pathView.dispatchEvent(
                        new MouseEvent('click', { bubbles: true }),
                    )
                    return explorerView.state.items$.pipe(take(1), mapTo(shell))
                }
                const folderView = folders.find(
                    (f) => f.folder.path == params.path,
                )

                expect(folderView).toBeTruthy()
                folderView.dispatchEvent(
                    new MouseEvent('dblclick', { bubbles: true }),
                )
                return explorerView.state.items$.pipe(take(1), mapTo(shell))
            }),
            delay(0),
        )
    }
}
