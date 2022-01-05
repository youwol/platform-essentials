import { delay, map, tap } from 'rxjs/operators';
import {
    AnyFolderNode, AnyItemNode, BrowserNode, DeletedFolderNode, DeletedItemNode, DriveNode,
    FolderNode, FutureNode, ItemNode, RegularFolderNode
} from './nodes';

import { uuidv4 } from '@youwol/flux-core';
import { ImmutableTree } from "@youwol/fv-tree";
import { Asset, AssetsGatewayClient, DriveResponse, FolderResponse, ItemResponse } from '..';
import { Observable, of } from 'rxjs';
import { resolveRequest } from '../clients/utils';
import { isLocalYouwol } from './utils';

export let debugDelay = 0


function isToProcess({ update, targetCmd }) {

    if (!(update.command instanceof targetCmd))
        return false
    if (update.command.metadata && !update.command.metadata.toBeSaved)
        return false
    return true
}

let databaseActionsFactory = {
    renameFolder: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!isToProcess({ update, targetCmd: ImmutableTree.ReplaceAttributesCommand }))
                return false

            if (update.addedNodes.length != 1 || !(update.addedNodes[0] instanceof FolderNode))
                return false

            let node = update.addedNodes[0] as AnyFolderNode
            return node.kind == 'regular'
        },
        then: () => {
            let node = update.addedNodes[0] as RegularFolderNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.renameFolder(node.id, node.name).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    renameItem: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {

            if (!isToProcess({ update, targetCmd: ImmutableTree.ReplaceAttributesCommand }))
                return false

            return update.addedNodes.length == 1
                && update.addedNodes[0] instanceof ItemNode
        },
        then: () => {
            let node = update.addedNodes[0] as AnyItemNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.renameAsset(node.id, node.name).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteFolder: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!isToProcess({ update, targetCmd: ImmutableTree.RemoveNodeCommand }))
                return false

            if (update.removedNodes.length !== 1)
                return false

            let node = update.removedNodes[0]
            if (!(node instanceof FolderNode))
                return false
            return true// node.kind === 'regular'
        },
        then: () => {
            let node = update.removedNodes[0] as FolderNode<'regular'>
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<FolderNode<'regular'>>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.deleteFolder(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteDrive: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!isToProcess({ update, targetCmd: ImmutableTree.RemoveNodeCommand }))
                return false

            if (update.removedNodes.length !== 1)
                return false

            let node = update.removedNodes[0]

            return node instanceof DriveNode
        },
        then: () => {
            let node = update.removedNodes[0] as DriveNode
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<DriveNode>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.deleteDrive(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteItem: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!isToProcess({ update, targetCmd: ImmutableTree.RemoveNodeCommand }))
                return false

            return update.removedNodes.length == 1
                && update.removedNodes[0] instanceof ItemNode
        },
        then: () => {
            let node = update.removedNodes[0] as AnyItemNode
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<AnyItemNode>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            RequestsExecutor.deleteItem(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    newAsset: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!isToProcess({ update, targetCmd: ImmutableTree.AddChildCommand }))
                return false

            return update.addedNodes.length == 1
                && update.addedNodes[0] instanceof FutureNode
        },
        then: () => {
            let node = update.addedNodes[0] as FutureNode
            let cmd = update.command as ImmutableTree.AddChildCommand<BrowserNode>
            let parentNode = cmd.parentNode as AnyFolderNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            parentNode.addStatus({ type: 'request-pending', id: uid })
            node.request.pipe(
                delay(debugDelay)
            ).subscribe((resp: any) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                node.removeStatus({ type: 'request-pending', id: uid })
                node.onResponse(resp, node)
            })
        }
    }),
}


export class RequestsExecutor {

    static assetsGtwClient = new AssetsGatewayClient({ headers: { "tutu": 'tata' } })

    static execute(update: ImmutableTree.Updates<BrowserNode>) {

        let command = Object.values(databaseActionsFactory)
            .map(actionFactory => actionFactory(update))
            .find(action => action.when())
        command && command.then()
    }

    static renameFolder(folderId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.explorer.folders.rename$(folderId, { name: newName })
    }

    static renameAsset(itemId: string, newName: string) {
        return RequestsExecutor.assetsGtwClient.assets.update$(itemId, { name: newName })
    }

    static deleteItem(node: AnyItemNode) {
        return RequestsExecutor.assetsGtwClient.explorer.items.delete$(node.treeId)
    }

    static getItem(itemId: string) {
        return RequestsExecutor.assetsGtwClient.explorer.items.get$(itemId)
    }

    static deleteFolder(node: RegularFolderNode) {
        return RequestsExecutor.assetsGtwClient.explorer.folders.delete$(node.folderId)
    }

    static deleteDrive(node: DriveNode) {
        return RequestsExecutor.assetsGtwClient.explorer.drives.delete$(node.driveId)
    }

    static getUserInfo() {
        return RequestsExecutor.assetsGtwClient.getUserInfo()
    }

    static getDefaultDrive(groupId: string) {
        return RequestsExecutor.assetsGtwClient.explorer.groups.getDefaultDrive$(groupId)
    }

    static purgeDrive(driveId: string) {
        return RequestsExecutor.assetsGtwClient.explorer.drives.purge$(driveId)
    }

    static createFolder(node: DriveNode | AnyFolderNode, body: { name: string, folderId: string }) {
        return RequestsExecutor.assetsGtwClient.explorer.folders.create$(node.id, body)
    }

    static move(target: AnyItemNode | RegularFolderNode, folder: AnyFolderNode | DriveNode) {
        return RequestsExecutor.assetsGtwClient.explorer.move$(target.id, { destinationFolderId: folder.id })
    }

    static borrow(target: AnyItemNode | AnyFolderNode, folder: AnyFolderNode | DriveNode) {
        return RequestsExecutor.assetsGtwClient.explorer.borrowItem$(target.id, { destinationFolderId: folder.id })
    }

    static getDeletedItems(driveId: string) {

        return RequestsExecutor.assetsGtwClient.explorer.drives.queryDeletedItems$(driveId).pipe(
            map(({ items, folders }: { items: Array<any>, folders: Array<any> }) => {

                return [
                    ...folders.map((folder: any) => new DeletedFolderNode({ id: folder.folderId, name: folder.name, driveId })),
                    ...items.map((item: any) => new DeletedItemNode({ id: item.itemId, name: item.name, driveId, type: item.type }))
                ]
            })
        ) as Observable<Array<BrowserNode>>
    }

    static getFolderChildren(groupId: string, driveId: string, folderId: string) {

        return RequestsExecutor.assetsGtwClient.explorer.folders.queryChildren$(folderId).pipe(
            map(({ items, folders }: { items: Array<any>, folders: Array<any> }) => {
                return [
                    ...folders.map((folder: FolderResponse) => {
                        return new FolderNode({
                            folderId: folder.folderId, kind: 'regular', groupId, name: folder.name, driveId, parentFolderId: folderId,
                            origin: folder.origin,
                            children: RequestsExecutor.getFolderChildren(groupId, driveId, folder.folderId)
                        })
                    }),
                    ...items.map((item: ItemResponse) => {
                        let assetData = {
                            id: item.treeId,
                            groupId,
                            driveId,
                            ...item
                        }
                        return new ItemNode(assetData as any)
                    }),
                    ...driveId == folderId
                        ? [
                            new FolderNode<'trash'>({
                                groupId: groupId,
                                parentFolderId: driveId,
                                driveId: driveId,
                                kind: 'trash',
                                name: 'Trash',
                                folderId: 'trash',
                                children: RequestsExecutor.getDeletedItems(driveId)
                            })]
                        : []
                ]
            })
        ) as Observable<Array<BrowserNode>>
    }

    static getDrivesChildren(groupId: string) {

        return RequestsExecutor.assetsGtwClient.explorer.groups.queryDrives$(groupId).pipe(
            map(({ drives }) => {
                return drives.map((drive: DriveResponse) => {
                    return new DriveNode({
                        groupId: groupId, name: drive.name, driveId: drive.driveId,
                        children: RequestsExecutor.getFolderChildren(groupId, drive.driveId, drive.driveId)
                    })
                })
            })
        ) as Observable<Array<DriveNode>>
    }

    static getAsset(assetId: string): Observable<Asset> {
        return RequestsExecutor.assetsGtwClient.assets.get$(assetId)
    }

    static executeCommand(commandName: string, body: any, node?: BrowserNode) {

        if (!isLocalYouwol())
            return of(undefined)

        let uid = uuidv4()
        node && node.addStatus({ type: 'request-pending', id: uid })

        let request = new Request(
            `${window.location.origin}/admin/commands/${commandName}`,
            { method: 'POST', body: JSON.stringify(body) }
        );
        return resolveRequest(request, 'query', { requestId: "groups" }).pipe(
            delay(debugDelay),
            tap(() => node && node.removeStatus({ type: 'request-pending', id: uid }))
        )
    }
}
