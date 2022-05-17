import { ImmutableTree } from '@youwol/fv-tree'
import { delay } from 'rxjs/operators'

import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DriveNode,
    FolderNode,
    FutureNode,
    ItemNode,
    RegularFolderNode,
} from './nodes'

import { debugDelay, RequestsExecutor } from '../core/requests-executot'
import { v4 as uuidv4 } from 'uuid'
import { Favorites } from '../core'

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
                    Favorites.refresh(node.id)
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
                    Favorites.refresh(node.id)
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
                    Favorites.remove(node.id)
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
                    Favorites.remove(node.id)
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

export function applyUpdate(update: ImmutableTree.Updates<BrowserNode>) {
    const command = Object.values(databaseActionsFactory)
        .map((actionFactory) => actionFactory(update))
        .find((action) => action.when())
    command && command.then()
}
