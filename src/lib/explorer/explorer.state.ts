import { ImmutableTree } from '@youwol/fv-tree'

import { AssetsGateway, raiseHTTPErrors } from '@youwol/http-clients'
import {
    BehaviorSubject,
    combineLatest,
    ReplaySubject,
    Subscription,
} from 'rxjs'
import { filter, mergeMap, share, take } from 'rxjs/operators'
import { v4 as uuidv4 } from 'uuid'
import { FutureFolderNode } from '.'
import { ChildApplicationAPI } from '../core'
import { FileAddedEvent, PlatformEvent } from '../core/platform.events'

import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DownloadNode,
    DriveNode,
    FolderNode,
    GroupNode,
    HomeNode,
    instanceOfTrashFolder,
    ItemNode,
    RegularFolderNode,
    TrashNode,
} from './nodes'
import { RequestsExecutor } from './requests-executor'
import { DataState } from './specific-assets/data/data.state'
import { FluxState } from './specific-assets/flux/flux.state'
import { StoryState } from './specific-assets/story/story.state'
import {
    createTreeGroup,
    processBorrowItem,
    processMoveFolder,
    processMoveItem,
} from './utils'

export class TreeGroup extends ImmutableTree.State<BrowserNode> {
    public readonly explorerState: ExplorerState
    public readonly homeFolderId: string
    public readonly trashFolderId: string
    public readonly groupId: string
    public readonly drivesId: string
    public readonly defaultDriveId: string
    public readonly downloadFolderId?: string

    constructor(
        rootNode: GroupNode,
        params: {
            explorerState: ExplorerState
            groupId: string
            homeFolderId: string
            trashFolderId: string
            defaultDriveId: string
            drivesId: string
            downloadFolderId?: string
            recentId?: string
        },
    ) {
        super({ rootNode, expandedNodes: [rootNode.id] })
        Object.assign(this, params)
    }

    getHomeNode(): HomeNode {
        return this.getNode(this.homeFolderId)
    }
    getDownloadNode(): DownloadNode {
        return this.getNode(this.downloadFolderId)
    }
    getTrashNode(): TrashNode {
        return this.getNode(this.trashFolderId)
    }
    getDefaultDriveNode(): DriveNode {
        return this.getNode(this.defaultDriveId)
    }
}

export type OpenFolder = {
    tree: TreeGroup
    folder: AnyFolderNode | DriveNode
}

export interface FavoriteFolder extends TreedbBackend.GetFolderResponse {}

export class ExplorerState {
    public flux: FluxState
    public story: StoryState
    public data: DataState

    public readonly selectedItem$ = new BehaviorSubject<BrowserNode>(undefined)

    public readonly openFolder$ = new ReplaySubject<OpenFolder>(1)

    public readonly favoriteFolders$ = new BehaviorSubject<FavoriteFolder[]>([])

    public readonly userInfo$ = RequestsExecutor.getUserInfo().pipe(
        raiseHTTPErrors(),
        shareReplay({ bufferSize: 1, refCount: true }),
    )

    public readonly defaultUserDrive$ = this.userInfo$.pipe(
        raiseHTTPErrors(),
        mergeMap(({ groups }) => {
            const privateGrp = groups.find((grp) => grp.path == 'private')
            return RequestsExecutor.getDefaultDrive(privateGrp.id)
        }),
        share(),
    )

    public readonly userDrives$ = this.userInfo$.pipe(
        raiseHTTPErrors(),
        mergeMap(({ groups }) => {
            const privateGrp = groups.find((grp) => grp.path == 'private')
            return RequestsExecutor.getDrivesChildren(privateGrp.id)
        }),
    )

    groupsTree: { [key: string]: TreeGroup } = {}

    public itemCut: {
        cutType: 'borrow' | 'move'
        node: AnyItemNode | AnyFolderNode
    }

    public readonly subscriptions: Subscription[] = []

    constructor() {
        this.subscriptions.push(
            combineLatest([this.userDrives$, this.defaultUserDrive$]).subscribe(
                ([respUserDrives, respDefaultDrive]) => {
                    const tree = createTreeGroup(
                        this,
                        'You',
                        respUserDrives,
                        respDefaultDrive,
                    )
                    this.groupsTree[respDefaultDrive.groupId] = tree
                    this.flux = new FluxState(tree)
                    this.story = new StoryState(tree)
                    this.data = new DataState(tree)
                    this.openFolder(tree.getHomeNode())
                },
            ),
            this.openFolder$.subscribe(() => {
                this.selectedItem$.next(undefined)
            }),
        )
        new CdnSessionsStorage.CdnSessionsStorageClient()
            .getData$({
                packageName: '@youwol/platform-essentials',
                dataName: 'explorer',
            })
            .pipe(
                raiseHTTPErrors(),
                take(1),
                filter((explorerData) =>
                    Array.isArray(explorerData['favoriteFolders']),
                ),
                mergeMap((explorerData) =>
                    from(
                        explorerData['favoriteFolders'] as FavoriteFolder[],
                    ).pipe(
                        mergeMap(({ folderId }) => {
                            return new AssetsGateway.AssetsGatewayClient().treedb.getFolder$(
                                { folderId },
                            )
                        }),
                        raiseHTTPErrors(),
                    ),
                ),
                reduce((acc, e) => [...acc, e], []),
            )
            .subscribe((favorites) => {
                this.favoriteFolders$.next(favorites)
            })

        const os = ChildApplicationAPI.getOsInstance()
        if (os) {
            this.subscriptions.push(
                os.broadcastEvents$
                    .pipe(
                        filter((event: PlatformEvent) =>
                            FileAddedEvent.isInstance(event),
                        ),
                        mergeMap((event: FileAddedEvent) => {
                            return RequestsExecutor.getItem(event.treeId)
                        }),
                    )
                    .subscribe((response: AssetsGateway.ItemResponse) => {
                        const tree = this.groupsTree[response.groupId]

                        const node = new ItemNode({
                            ...response,
                            kind: 'flux-project',
                        })
                        try {
                            tree.addChild(response.folderId, node)
                        } catch (e) {
                            console.log(
                                'FileAddedEvent => Folder node not already resolved',
                                { response },
                            )
                            return
                        }
                        tree.getNode(response.folderId).events$.next({
                            type: 'item-added',
                        })
                    }),
            )
        }
    }

    openFolder(folder: AnyFolderNode | DriveNode) {
        this.openFolder$.next({ tree: this.groupsTree[folder.groupId], folder })
        const treeGroup = this.groupsTree[folder.groupId]
        treeGroup && treeGroup.selectedNode$.next(treeGroup.getNode(folder.id))
    }

    navigateTo(folderId: string) {
        new AssetsGateway.AssetsGatewayClient().treedb
            .getFolder$({ folderId })
            .pipe(
                raiseHTTPErrors(),
                mergeMap((folder) => this.selectGroup$(folder.groupId)),
                mergeMap((treeGroupState) => {
                    return RequestsExecutor.getPath(folderId).pipe(
                        map((path) => ({ path, treeGroupState })),
                    )
                }),
                mergeMap(({ path, treeGroupState }) => {
                    return treeGroupState
                        .resolvePath(path.folders.map((f) => f.folderId))
                        .pipe(
                            map((nodes) => {
                                return { nodes, treeGroupState }
                            }),
                        )
                }),
            )
            .subscribe(({ nodes, treeGroupState }) => {
                const nodeIds = nodes.map((n) => n.id)
                const expanded = [
                    ...treeGroupState.expandedNodes$
                        .getValue()
                        .filter((expandedId) => !nodeIds.includes(expandedId)),
                    ...nodeIds,
                ]
                treeGroupState.expandedNodes$.next(expanded)
                this.openFolder(nodes.slice(-1)[0] as AnyFolderNode)
            })
    }

    selectItem(item: BrowserNode) {
        if (this.selectedItem$.getValue() != item) {
            this.selectedItem$.next(item)
        }
    }

    selectGroup$(groupId: string): Observable<TreeGroup> {
        if (this.groupsTree[groupId]) {
            return of(this.groupsTree[groupId])
        }
        return combineLatest([
            RequestsExecutor.getDefaultDrive(groupId),
            RequestsExecutor.getDrivesChildren(groupId),
            this.userInfo$,
        ]).pipe(
            map(([defaultDrive, drives, userInfo]) =>
                createTreeGroup(
                    this,
                    userInfo.groups
                        .find((g) => g.id == groupId)
                        .path.split('/')
                        .slice(-1)[0],
                    drives,
                    defaultDrive,
                ),
            ),
            tap((tree) => {
                this.groupsTree[tree.groupId] = tree
            }),
        )
    }

    newFolder(parentNode: DriveNode | AnyFolderNode) {
        const tree = this.groupsTree[parentNode.groupId]
        const childFolder = new FutureFolderNode({
            icon: 'fas fa-folder',
            name: 'new folder',
            onResponse: (resp) => {
                const folderNode = new FolderNode({
                    kind: 'regular',
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: 'new folder',
                    folderId: resp.folderId,
                    parentFolderId: parentNode.id,
                    children: [],
                })
                tree.replaceNode(childFolder.id, folderNode)
            },
            request: RequestsExecutor.createFolder(parentNode, {
                name: 'new folder',
                folderId: uuidv4(),
            }),
        })
        tree.addChild(parentNode.id, childFolder)
    }

    rename(
        node: FolderNode<'regular'> | AnyItemNode,
        newName: string,
        save = true,
    ) {
        node.removeStatus({ type: 'renaming' })
        renameFavoriteIfNeeded(this.favoriteFolders$, {
            folderId: node.id,
            newName,
        })
        this.groupsTree[node.groupId].replaceAttributes(
            node,
            { name: newName },
            true,
            () => ({}),
            { toBeSaved: save },
        )
    }

    deleteItemOrFolder(node: RegularFolderNode | AnyItemNode) {
        this.groupsTree[node.groupId].removeNode(node.id)
        const trashNode = this.groupsTree[node.groupId].getTrashNode()
        if (trashNode) {
            this.refresh(trashNode, false)
        }
        if (node instanceof FolderNode) {
            this.openFolder(
                this.groupsTree[node.groupId].getNode(node.parentFolderId),
            )
        }
    }

    deleteDrive(node: DriveNode) {
        this.groupsTree[node.groupId].removeNode(node)
    }

    purgeDrive(trashNode: TrashNode) {
        RequestsExecutor.purgeDrive(trashNode.driveId)
            .pipe(
                mergeMap(() => {
                    const tree = this.groupsTree[trashNode.groupId]
                    return tree.getTrashNode().resolveChildren()
                }),
            )
            .subscribe((children) => {
                children.forEach((deletedNode, i) => {
                    this.groupsTree[trashNode.groupId].removeNode(
                        deletedNode,
                        i == children.length - 1,
                    )
                })
            })
    }

    cutItem(node: AnyItemNode | FolderNode<'regular'>) {
        node.addStatus({ type: 'cut' })
        this.itemCut = { cutType: 'move', node }
    }

    borrowItem(node: AnyItemNode) {
        node.addStatus({ type: 'cut' })
        this.itemCut = { cutType: 'borrow', node }
    }

    pasteItem(destination: AnyFolderNode | DriveNode) {
        if (!this.itemCut) {
            return
        }

        const treeOrigin = this.groupsTree[this.itemCut.node.groupId]
        const treeDestination = this.groupsTree[destination.groupId]
        destination.addStatus({ type: 'request-pending', id: uuidv4() })

        const nodeSelected = this.itemCut.node

        if (
            nodeSelected instanceof ItemNode &&
            this.itemCut.cutType == 'borrow'
        ) {
            processBorrowItem(nodeSelected, treeDestination, destination)
        }

        if (
            nodeSelected instanceof ItemNode &&
            this.itemCut.cutType == 'move'
        ) {
            processMoveItem(
                nodeSelected,
                treeOrigin,
                treeDestination,
                destination,
            )
        }

        if (
            nodeSelected instanceof FolderNode &&
            nodeSelected.kind == 'regular' &&
            this.itemCut.cutType == 'move'
        ) {
            processMoveFolder(
                nodeSelected as RegularFolderNode,
                treeDestination,
                destination,
            )
        }

        nodeSelected.removeStatus({ type: 'cut' })
        this.itemCut = undefined
    }

    refresh(folder: AnyFolderNode, openFolder: boolean = true) {
        const tree = this.groupsTree[folder.groupId]
        const newFolder = instanceOfTrashFolder(folder)
            ? new FolderNode({
                  ...folder,
                  children: RequestsExecutor.getDeletedItems(folder.driveId),
              })
            : new FolderNode({
                  ...folder,
                  children: RequestsExecutor.getFolderChildren(
                      folder.groupId,
                      folder.driveId,
                      folder.folderId,
                  ),
              })

        tree.replaceNode(folder.id, newFolder, true, () => ({}), {
            toBeSaved: false,
        })
        openFolder && this.openFolder(newFolder)
    }

    uploadAsset(node: AnyItemNode) {
        RequestsExecutor.uploadLocalAsset(node.assetId, node)
            .pipe(
                mergeMap(() => this.openFolder$),
                take(1),
            )
            .subscribe(({ folder }) => {
                if (folder instanceof FolderNode) {
                    this.refresh(folder)
                }
            })
    }

    addFavoriteFolder(folder: AnyFolderNode) {
        const favorites = [...this.favoriteFolders$.getValue(), folder]
        new CdnSessionsStorage.CdnSessionsStorageClient()
            .postData$({
                packageName: '@youwol/platform-essentials',
                dataName: 'explorer',
                body: {
                    favoriteFolders: favorites.map((f) => ({
                        folderId: f.folderId,
                    })),
                },
            })
            .subscribe()
        this.favoriteFolders$.next(favorites)
    }
}
