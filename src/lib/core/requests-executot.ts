import { from, Observable, of, Subject } from 'rxjs'
import {
    AssetsGateway,
    CdnSessionsStorage,
    dispatchHTTPErrors,
    HTTPError,
    send$,
    TreedbBackend,
} from '@youwol/http-clients'

import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DeletedFolderNode,
    DeletedItemNode,
    DriveNode,
    FolderNode,
    ItemKind,
    ItemNode,
    RegularFolderNode,
} from '../explorer'
import { delay, map, mergeMap, reduce, shareReplay, tap } from 'rxjs/operators'

import { v4 as uuidv4 } from 'uuid'

export const debugDelay = 0

export function isLocalYouwol() {
    return window.location.hostname == 'localhost'
}

export class RequestsExecutor {
    static error$ = new Subject<HTTPError>()
    static assetsGtwClient = new AssetsGateway.AssetsGatewayClient()

    static renameFolder(folderId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.folders.rename$(
            folderId,
            { name: newName },
        )
    }

    static renameAsset(itemId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.assetsDeprecated.update$(
            itemId,
            {
                name: newName,
            },
        )
    }

    static deleteItem(node: AnyItemNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.items.delete$(
            node.treeId,
        )
    }

    static getItem(itemId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.items.get$(
            itemId,
        )
    }

    static deleteFolder(node: RegularFolderNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.folders.delete$(
            node.folderId,
        )
    }

    static deleteDrive(node: DriveNode) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.drives.delete$(
            node.driveId,
        )
    }

    static getUserInfo() {
        return RequestsExecutor.assetsGtwClient.getUserInfo$()
    }

    static getDefaultDrive(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.groups
            .getDefaultDrive$(groupId)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static purgeDrive(driveId: string) {
        return RequestsExecutor.assetsGtwClient.treedb
            .purgeDrive$({ driveId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static createFolder(
        node: DriveNode | AnyFolderNode,
        body: { name: string; folderId: string },
    ) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.folders
            .create$(node.id, body)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static move(
        target: AnyItemNode | RegularFolderNode,
        folder: AnyFolderNode | DriveNode,
    ) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated
            .move$(target.id, {
                destinationFolderId: folder.id,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static borrow(
        target: AnyItemNode | AnyFolderNode,
        folder: AnyFolderNode | DriveNode,
    ) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated
            .borrowItem$(target.id, { destinationFolderId: folder.id })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getDeletedItems(driveId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.drives
            .queryDeletedItems$(driveId)
            .pipe(
                dispatchHTTPErrors(this.error$),
                map(({ items, folders }) => {
                    return [
                        ...folders.map(
                            (folder) =>
                                new DeletedFolderNode({
                                    id: folder.folderId,
                                    name: folder.name,
                                    driveId,
                                }),
                        ),
                        ...items.map(
                            (item) =>
                                new DeletedItemNode({
                                    id: item.itemId,
                                    name: item.name,
                                    driveId,
                                    type: item.type,
                                }),
                        ),
                    ]
                }),
            ) as Observable<Array<BrowserNode>>
    }

    static getPath(folderId: string) {
        return new AssetsGateway.AssetsGatewayClient().treedb
            .getPathFolder$({
                folderId,
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static createFolderNode(folder: TreedbBackend.GetFolderResponse) {
        return new FolderNode({
            folderId: folder.folderId,
            kind: 'regular',
            groupId: folder.groupId,
            name: folder.name,
            type: folder.type,
            metadata: folder.metadata,
            driveId: folder.driveId,
            parentFolderId: folder.parentFolderId,
            origin: folder['origin'],
            children: RequestsExecutor.getFolderChildren(
                folder.groupId,
                folder.driveId,
                folder.folderId,
            ),
        })
    }
    static getFolderChildren(
        groupId: string,
        driveId: string,
        folderId: string,
    ) {
        return RequestsExecutor.assetsGtwClient.treedb
            .queryChildren$({ parentId: folderId })
            .pipe(
                dispatchHTTPErrors(this.error$),
                map(({ items, folders }) => {
                    return [
                        ...folders.map(
                            (folder: TreedbBackend.GetFolderResponse) => {
                                return RequestsExecutor.createFolderNode(folder)
                            },
                        ),
                        ...items.map((item: TreedbBackend.GetItemResponse) => {
                            const assetData = {
                                id: item.itemId,
                                groupId,
                                driveId,
                                assetId: item.relatedId,
                                rawId: atob(item.relatedId),
                                treeId: item.itemId,
                                origin: item['origin'],
                                borrowed: JSON.parse(item.metadata).borrowed,
                                kind: item.type as ItemKind,
                                name: item.name,
                            }
                            return new ItemNode(assetData)
                        }),
                        ...(driveId == folderId
                            ? [
                                  new FolderNode<'trash'>({
                                      groupId: groupId,
                                      parentFolderId: driveId,
                                      driveId: driveId,
                                      kind: 'trash',
                                      name: 'Trash',
                                      folderId: 'trash',
                                      type: '',
                                      metadata: '',
                                      children:
                                          RequestsExecutor.getDeletedItems(
                                              driveId,
                                          ),
                                  }),
                              ]
                            : []),
                    ]
                }),
            ) as Observable<Array<BrowserNode>>
    }

    static getDrivesChildren(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.groups
            .queryDrives$(groupId)
            .pipe(
                dispatchHTTPErrors(this.error$),
                map(({ drives }) => {
                    return drives.map((drive: AssetsGateway.DriveResponse) => {
                        return new DriveNode({
                            groupId: groupId,
                            name: drive.name,
                            driveId: drive.driveId,
                            children: RequestsExecutor.getFolderChildren(
                                groupId,
                                drive.driveId,
                                drive.driveId,
                            ),
                        })
                    })
                }),
            )
    }

    static getAsset(assetId: string): Observable<AssetsGateway.Asset> {
        return RequestsExecutor.assetsGtwClient.assetsDeprecated
            .get$(assetId)
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static uploadLocalAsset(assetId: string, node?: BrowserNode) {
        if (!isLocalYouwol()) {
            return of(undefined)
        }

        const uid = uuidv4()
        node && node.addStatus({ type: 'request-pending', id: uid })

        return send$(
            'upload',
            `${window.location.origin}/admin/environment/upload/${assetId}`,
            { method: 'POST' },
        ).pipe(
            dispatchHTTPErrors(this.error$),
            delay(debugDelay),
            tap(
                () =>
                    node &&
                    node.removeStatus({ type: 'request-pending', id: uid }),
            ),
        )
    }

    static getFolder(folderId: string) {
        return RequestsExecutor.assetsGtwClient.treedb
            .getFolder$({ folderId })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static favorites = new CdnSessionsStorage.CdnSessionsStorageClient()
        .getData$({
            packageName: '@youwol/platform-essentials',
            dataName: 'explorer',
        })
        .pipe(
            dispatchHTTPErrors(RequestsExecutor.error$),
            shareReplay({ bufferSize: 1, refCount: true }),
        )

    static getFavoriteFolders() {
        return RequestsExecutor.favorites.pipe(
            map((explorerData) =>
                Array.isArray(explorerData['favoriteFolders'])
                    ? explorerData['favoriteFolders']
                    : [],
            ),
            mergeMap((favoriteFolders: { folderId: string }[]) =>
                from(favoriteFolders).pipe(
                    mergeMap(({ folderId }) =>
                        RequestsExecutor.getFolder(folderId),
                    ),
                ),
            ),
            reduce((acc, e) => [...acc, e], []),
        )
    }

    static saveFavorites({
        favoriteGroups,
        favoriteFolders,
    }: {
        favoriteGroups: { id: string }[]
        favoriteFolders: { folderId: string }[]
    }) {
        return new CdnSessionsStorage.CdnSessionsStorageClient()
            .postData$({
                packageName: '@youwol/platform-essentials',
                dataName: 'explorer',
                body: {
                    favoriteGroups: favoriteGroups.map((g) => ({
                        id: g.id,
                    })),
                    favoriteFolders: favoriteFolders.map((f) => ({
                        folderId: f.folderId,
                    })),
                },
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getFavoriteGroups() {
        return RequestsExecutor.favorites.pipe(
            map((explorerData) =>
                Array.isArray(explorerData['favoriteGroups'])
                    ? explorerData['favoriteGroups']
                    : [],
            ),
            map((groups: { id: string }[]) => {
                return groups.map(({ id }) => {
                    return { id, path: atob(id) }
                })
            }),
        )
    }

    static saveInstallerScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        return new CdnSessionsStorage.CdnSessionsStorageClient()
            .postData$({
                packageName: '@youwol/platform-essentials',
                dataName: 'explorerSettings',
                body: { tsSrc, jsSrc },
            })
            .pipe(dispatchHTTPErrors(this.error$))
    }

    static getExplorerSettings(): Observable<{ tsSrc: string; jsSrc: string }> {
        return new CdnSessionsStorage.CdnSessionsStorageClient()
            .getData$({
                packageName: '@youwol/platform-essentials',
                dataName: 'explorerSettings',
            })
            .pipe(dispatchHTTPErrors(this.error$)) as Observable<{
            tsSrc: string
            jsSrc: string
        }>
    }
}
