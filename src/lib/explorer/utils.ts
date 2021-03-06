import { ExplorerState, TreeGroup } from './explorer.state'
import {
    AnyFolderNode,
    AnyItemNode,
    DriveNode,
    FolderNode,
    FutureFolderNode,
    FutureItemNode,
    GroupNode,
    ItemNode,
    RegularFolderNode,
} from './nodes'

import { RequestsExecutor } from '../core'
import { applyUpdate } from './db-actions-factory'

export function createTreeGroup(
    explorerState: ExplorerState,
    groupName: string,
    respUserDrives,
    respDefaultDrive,
) {
    const homeFolderNode = new FolderNode<'home'>({
        ...respDefaultDrive,
        kind: 'home',
        name: respDefaultDrive.homeFolderName,
        folderId: respDefaultDrive.homeFolderId,
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getFolderChildren(
            respDefaultDrive.groupId,
            respDefaultDrive.driveId,
            respDefaultDrive.homeFolderId,
        ),
    })
    const downloadFolderNode = new FolderNode<'download'>({
        ...respDefaultDrive,
        kind: 'download',
        name: respDefaultDrive.downloadFolderName,
        folderId: respDefaultDrive.downloadFolderId,
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getFolderChildren(
            respDefaultDrive.groupId,
            respDefaultDrive.driveId,
            respDefaultDrive.downloadFolderId,
        ),
    })
    const trashFolderNode = new FolderNode<'trash'>({
        ...respDefaultDrive,
        kind: 'trash',
        name: 'Trash',
        folderId: 'trash',
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getDeletedItems(respDefaultDrive.driveId),
    })
    const systemFolderNode = new FolderNode<'system'>({
        ...respDefaultDrive,
        kind: 'system',
        name: 'System',
        folderId: respDefaultDrive.systemFolderId,
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getFolderChildren(
            respDefaultDrive.groupId,
            respDefaultDrive.driveId,
            respDefaultDrive.systemFolderId,
        ),
    })

    const defaultDrive = new DriveNode({
        ...respDefaultDrive,
        name: respDefaultDrive.driveName,
        children: [
            homeFolderNode,
            downloadFolderNode,
            trashFolderNode,
            systemFolderNode,
        ],
    })
    const userDrives = respUserDrives
        .filter((drive) => drive.id != defaultDrive.id)
        .map((drive) => {
            return new DriveNode({
                groupId: drive.groupId,
                driveId: drive.driveId,
                name: drive.name,
                children: RequestsExecutor.getFolderChildren(
                    drive.groupId,
                    drive.driveId,
                    drive.driveId,
                ),
            })
        })

    const userGroup = new GroupNode({
        id: respDefaultDrive.groupId,
        name: groupName,
        children: [defaultDrive, ...userDrives],
        kind: 'user',
    })
    const tree = new TreeGroup(userGroup, {
        explorerState,
        groupId: respDefaultDrive.groupId,
        homeFolderId: homeFolderNode.id,
        trashFolderId: trashFolderNode.id,
        defaultDriveId: defaultDrive.id,
        drivesId: userDrives.map((d) => d.id),
        downloadFolderId: downloadFolderNode.id,
    })
    tree.directUpdates$.subscribe((updates) => {
        updates.forEach((update) => applyUpdate(update))
    })
    return tree
}

export function processBorrowItem(
    nodeSelected: AnyItemNode,
    treeDestination: TreeGroup,
    destination: AnyFolderNode | DriveNode,
) {
    const childNode = new FutureItemNode({
        icon: ItemNode.iconsFactory[nodeSelected.kind],
        name: nodeSelected.name,
        onResponse: (resp) => {
            const node = new ItemNode({
                kind: nodeSelected.kind,
                ...resp,
            })
            treeDestination.replaceNode(childNode, node, true, () => ({}), {
                toBeSaved: false,
            })
        },
        request: RequestsExecutor.borrow(nodeSelected, destination),
    })
    treeDestination.addChild(destination.id, childNode)
}

export function processMoveItem(
    nodeSelected: AnyItemNode,
    treeOrigin: TreeGroup,
    treeDestination: TreeGroup,
    destination: AnyFolderNode | DriveNode,
) {
    const childNode = new FutureItemNode({
        icon: ItemNode.iconsFactory[nodeSelected.kind],
        name: nodeSelected.name,
        onResponse: (resp) => {
            const actualItem = resp.items.find(
                (item) => item.treeId == nodeSelected['treeId'],
            )
            const node = new ItemNode({
                kind: nodeSelected.kind,
                ...actualItem,
            })
            treeDestination.replaceNode(childNode.id, node, true, () => ({}), {
                toBeSaved: false,
            })
            if (treeOrigin != treeDestination) {
                treeOrigin.removeNode(nodeSelected, true, () => ({}), {
                    toBeSaved: false,
                })
            }
        },
        request: RequestsExecutor.move(nodeSelected, destination),
    })
    treeDestination.addChild(destination.id, childNode)
}

export function processMoveFolder(
    nodeSelected: RegularFolderNode,
    treeDestination: TreeGroup,
    destination: AnyFolderNode | DriveNode,
) {
    const childNode = new FutureFolderNode({
        icon: FolderNode.iconsFactory[nodeSelected.kind],
        name: nodeSelected.name,
        onResponse: (resp) => {
            const actualItem = resp.folders.find(
                (item) => item.folderId == nodeSelected['folderId'],
            )
            const node = new FolderNode({
                kind: nodeSelected.kind,
                ...actualItem,
                groupId: destination.groupId,
                children: RequestsExecutor.getFolderChildren(
                    destination.groupId,
                    destination.driveId,
                    actualItem.folderId,
                ),
            })
            treeDestination.replaceNode(childNode, node, true, () => ({}), {
                toBeSaved: false,
            })
        },
        request: RequestsExecutor.move(nodeSelected, destination),
    })
    treeDestination.addChild(destination.id, childNode)
}
