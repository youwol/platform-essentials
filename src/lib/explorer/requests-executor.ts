import { ImmutableTree } from '@youwol/fv-tree'
import { Observable, of, Subject } from 'rxjs'
import { delay, map, tap } from 'rxjs/operators'
import { v4 as uuidv4 } from 'uuid'
import {
    AssetsGateway,
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
    FutureNode,
    ItemKind,
    ItemNode,
    RegularFolderNode,
} from './nodes'
import { isLocalYouwol } from './utils'

export const debugDelay = 0

function isToProcess({ update, targetCmd }) {
    if (!(update.command instanceof targetCmd)) {
        return false
    }
    return !(update.command.metadata && !update.command.metadata.toBeSaved)
}

export const databaseActionsFactory = {
    renameFolder: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (
                !isToProcess({
                    update,
                    targetCmd: ImmutableTree.ReplaceAttributesCommand,
                })
            ) {
                return false
            }

            if (
                update.addedNodes.length != 1 ||
                !(update.addedNodes[0] instanceof FolderNode)
            ) {
                return false
            }

            const node = update.addedNodes[0] as AnyFolderNode
            return node.kind == 'regular'
        },
        then: () => {
            const node = update.addedNodes[0] as RegularFolderNode
            const uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.renameFolder(node.id, node.name)
                .pipe(delay(debugDelay))
                .subscribe(() => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        },
    }),
    renameItem: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (
                !isToProcess({
                    update,
                    targetCmd: ImmutableTree.ReplaceAttributesCommand,
                })
            ) {
                return false
            }

            return (
                update.addedNodes.length == 1 &&
                update.addedNodes[0] instanceof ItemNode
            )
        },
        then: () => {
            const node = update.addedNodes[0] as AnyItemNode
            const uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.renameAsset(node.id, node.name)
                .pipe(delay(debugDelay))
                .subscribe(() => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        },
    }),
    deleteFolder: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (
                !isToProcess({
                    update,
                    targetCmd: ImmutableTree.RemoveNodeCommand,
                })
            ) {
                return false
            }

            if (update.removedNodes.length !== 1) {
                return false
            }

            const node = update.removedNodes[0]
            return node instanceof FolderNode
        },
        then: () => {
            const node = update.removedNodes[0] as FolderNode<'regular'>
            const cmd = update.command as ImmutableTree.RemoveNodeCommand<
                FolderNode<'regular'>
            >
            const parent = cmd.parentNode
            const uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.deleteFolder(node)
                .pipe(delay(debugDelay))
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        },
    }),
    deleteDrive: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (
                !isToProcess({
                    update,
                    targetCmd: ImmutableTree.RemoveNodeCommand,
                })
            ) {
                return false
            }

            if (update.removedNodes.length !== 1) {
                return false
            }

            const node = update.removedNodes[0]

            return node instanceof DriveNode
        },
        then: () => {
            const node = update.removedNodes[0] as DriveNode
            const cmd =
                update.command as ImmutableTree.RemoveNodeCommand<DriveNode>
            const parent = cmd.parentNode
            const uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.deleteDrive(node)
                .pipe(delay(debugDelay))
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        },
    }),
    deleteItem: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (
                !isToProcess({
                    update,
                    targetCmd: ImmutableTree.RemoveNodeCommand,
                })
            ) {
                return false
            }

            return (
                update.removedNodes.length == 1 &&
                update.removedNodes[0] instanceof ItemNode
            )
        },
        then: () => {
            const node = update.removedNodes[0] as AnyItemNode
            const cmd =
                update.command as ImmutableTree.RemoveNodeCommand<AnyItemNode>
            const parent = cmd.parentNode
            const uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.deleteItem(node)
                .pipe(delay(debugDelay))
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        },
    }),
    newAsset: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (
                !isToProcess({
                    update,
                    targetCmd: ImmutableTree.AddChildCommand,
                })
            ) {
                return false
            }

            return (
                update.addedNodes.length == 1 &&
                update.addedNodes[0] instanceof FutureNode
            )
        },
        then: () => {
            const node = update.addedNodes[0] as FutureNode
            const cmd =
                update.command as ImmutableTree.AddChildCommand<BrowserNode>
            const parentNode = cmd.parentNode as AnyFolderNode
            const uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            parentNode.addStatus({ type: 'request-pending', id: uid })
            node.request.pipe(delay(debugDelay)).subscribe((resp) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                node.removeStatus({ type: 'request-pending', id: uid })
                node.onResponse(resp, node)
            })
        },
    }),
}

export class RequestsExecutor {
    static error$ = new Subject<HTTPError>()
    static assetsGtwClient = new AssetsGateway.AssetsGatewayClient()

    static execute(update: ImmutableTree.Updates<BrowserNode>) {
        const command = Object.values(databaseActionsFactory)
            .map((actionFactory) => actionFactory(update))
            .find((action) => action.when())
        command && command.then()
    }

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
        return RequestsExecutor.assetsGtwClient.explorerDeprecated.drives
            .purge$(driveId)
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
}
