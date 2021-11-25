import { install } from "@youwol/cdn-client";
import { from, Observable } from "rxjs";
import { TreeGroup } from "./platform.state";
import { RequestsExecutor } from "./requests-executor";
import { AnyFolderNode, AnyItemNode, DriveNode, FolderNode, FutureNode, GroupNode, ItemNode, RegularFolderNode } from "./nodes";

export function fetchCodeMirror$(): Observable<any> {

    return from(
        install({
            modules: ['codemirror'],
            scripts: [
                "codemirror#5.52.0~mode/javascript.min.js"
            ],
            css: [
                "codemirror#5.52.0~codemirror.min.css",
                "codemirror#5.52.0~theme/blackboard.min.css"
            ]
        })
    )
}


export function createTreeGroup(groupName: string, respUserDrives, respDefaultDrive) {

    let homeFolderNode = new FolderNode<'home'>({
        ...respDefaultDrive,
        kind: 'home',
        name: respDefaultDrive.homeFolderName,
        folderId: respDefaultDrive.homeFolderId,
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getFolderChildren(respDefaultDrive.groupId, respDefaultDrive.driveId, respDefaultDrive.homeFolderId)
    })
    let downloadFolderNode = new FolderNode<'download'>({
        ...respDefaultDrive,
        kind: 'download',
        name: respDefaultDrive.downloadFolderName,
        folderId: respDefaultDrive.downloadFolderId,
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getFolderChildren(respDefaultDrive.groupId, respDefaultDrive.driveId, respDefaultDrive.downloadFolderId)
    })
    let trashFolderNode = new FolderNode<'trash'>({
        ...respDefaultDrive,
        kind: 'trash',
        name: 'Trash',
        folderId: 'trash',
        parentFolderId: respDefaultDrive.driveId,
        children: RequestsExecutor.getDeletedChildren(respDefaultDrive.groupId, respDefaultDrive.driveId)
    })
    let defaultDrive = new DriveNode({
        ...respDefaultDrive,
        name: respDefaultDrive.driveName,
        children: [homeFolderNode, downloadFolderNode, trashFolderNode]
    })
    let userDrives = respUserDrives
        .filter(drive => drive.id != defaultDrive.id)
        .map((drive) => {
            return new DriveNode({
                groupId: drive.groupId,
                driveId: drive.driveId,
                name: drive.name,
                children: RequestsExecutor.getFolderChildren(drive.groupId, drive.driveId, drive.driveId)
            })
        })
    let userGroup = new GroupNode({
        id: respDefaultDrive.groupId,
        name: groupName,
        children: [defaultDrive, ...userDrives],
        kind: 'user'
    })

    return new TreeGroup(userGroup, {
        homeFolderId: homeFolderNode.id,
        trashFolderId: trashFolderNode.id,
        defaultDriveId: defaultDrive.id,
        drivesId: userDrives.map(d => d.id),
        downloadFolderId: downloadFolderNode.id
    })
}


export function processBorrowItem(
    nodeSelected: AnyItemNode,
    treeDestination: TreeGroup,
    destination: AnyFolderNode | DriveNode
) {

    let childNode = new FutureNode({
        icon: ItemNode.iconsFactory[nodeSelected.kind],
        name: nodeSelected.name,
        onResponse: (resp) => {
            let node = new ItemNode({
                kind: nodeSelected.kind,
                ...resp
            })
            treeDestination.replaceNode(childNode, node, true, () => ({}), { toBeSaved: false })
        },
        request: RequestsExecutor.borrow(nodeSelected, destination)
    })
    treeDestination.addChild(destination.id, childNode)
}

export function processMoveItem(
    nodeSelected: AnyItemNode,
    treeOrigin: TreeGroup,
    treeDestination: TreeGroup,
    destination: AnyFolderNode | DriveNode) {

    let childNode = new FutureNode({
        icon: ItemNode.iconsFactory[nodeSelected.kind],
        name: nodeSelected.name,
        onResponse: (resp) => {
            let actualItem = resp.items.find((item) => item.treeId == nodeSelected['treeId'])
            let node = new ItemNode({
                kind: nodeSelected.kind,
                ...actualItem
            })
            treeDestination.replaceNode(childNode.id, node, true, () => ({}), { toBeSaved: false })
            treeOrigin.removeNode(nodeSelected, true, () => ({}), { toBeSaved: false })
        },
        request: RequestsExecutor.move(nodeSelected, destination)
    })
    treeDestination.addChild(destination.id, childNode)
}

export function processMoveFolder(
    nodeSelected: RegularFolderNode,
    treeDestination: TreeGroup,
    destination: AnyFolderNode | DriveNode) {

    let childNode = new FutureNode({
        icon: FolderNode.iconsFactory[nodeSelected.kind],
        name: nodeSelected.name,
        onResponse: (resp) => {
            let actualItem = resp.folders.find((item) => item.folderId == nodeSelected['folderId'])
            let node = new FolderNode({
                kind: nodeSelected.kind,
                ...actualItem,
                groupId: destination.groupId,
                children: RequestsExecutor.getFolderChildren(destination.groupId, destination.driveId,
                    actualItem.folderId)
            })
            treeDestination.replaceNode(childNode, node, true, () => ({}), { toBeSaved: false })
        },
        request: RequestsExecutor.move(nodeSelected, destination)
    })
    treeDestination.addChild(destination.id, childNode)
}

