import {uuidv4} from '@youwol/flux-core'
import {BehaviorSubject, combineLatest, Observable, of, ReplaySubject, Subscription} from "rxjs"
import {distinctUntilChanged, filter, map, mergeMap, share, shareReplay} from 'rxjs/operators'
import {RequestsExecutor} from './requests-executor'
import {ImmutableTree} from '@youwol/fv-tree'
import {FluxState} from './specific-assets/flux/flux.state'
import {StoryState} from './specific-assets/story/story.state'
import {DataState} from './specific-assets/data/data.state'
import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DownloadNode,
    DriveNode,
    FolderNode,
    FutureNode,
    GroupNode,
    HomeNode,
    ItemNode,
    RegularFolderNode,
    serialize,
    TrashNode
} from './nodes'
import {createTreeGroup, processBorrowItem, processMoveFolder, processMoveItem} from './utils'
import {PlatformSettingsStore, YouwolBannerState} from '..'
import {DisplayMode} from '.'
import {ChildApplicationAPI} from '../platform.state'
import {FileAddedEvent, PlatformEvent} from '../platform.events'
import {ItemResponse} from '../clients/assets-gateway'
import {Action, GENERIC_ACTIONS, getActions$, openWithActionFromExe} from './actions.factory'

/**
 * Ideally this concept should not exist.
 * A direct selection is: the user has clicked on an item in the view
 * The indirect selection is actually the current folder opened.
 * At any time there is at least on 'indirect' selection (the current folder opened),
 * in addition to which there may be on direct selection (e.g. if the user click on a file).
 */
export type SelectedItem = { node: BrowserNode, selection: 'direct' | 'indirect' }


export class TreeGroup extends ImmutableTree.State<BrowserNode> {

    public readonly homeFolderId: string
    public readonly trashFolderId: string
    public readonly defaultDriveId: string
    public readonly drivesId: string
    public readonly downloadFolderId?: string
    public readonly recentId?: string

    constructor(rootNode: GroupNode, params: {
        homeFolderId: string
        trashFolderId: string
        defaultDriveId: string
        drivesId: string
        downloadFolderId?: string
        recentId?: string
    }) {
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
}

export class ExplorerState {

    public flux: FluxState
    public story: StoryState
    public data: DataState

    public readonly topBannerState = new YouwolBannerState()

    public readonly selectedItem$ = new BehaviorSubject<BrowserNode>(undefined)

    public readonly openFolder$ = new ReplaySubject<{ tree: TreeGroup, folder: AnyFolderNode | DriveNode }>(1)

    public readonly currentFolder$ = this.openFolder$.pipe(
        mergeMap(({ tree, folder }) => {
            // this next line is the one that actually 'trigger' the request to fetch the children
            tree.getChildren(folder)
            return tree.getChildren$(folder).pipe(map(() => ({ tree, folder })))
        }),
        distinctUntilChanged((a, b) => {
            return serialize(a.folder) == serialize(b.folder)
        }),
        shareReplay(1)
    ) as Observable<{ tree: TreeGroup, folder: FolderNode<any> }>

    actions$ = combineLatest([
        this.selectedItem$,
        this.currentFolder$
    ]).pipe(
        mergeMap(([item, { folder }]) => {
            let a0 = getActions$(this, { node: folder, selection: 'indirect' }, Object.values(GENERIC_ACTIONS))
            let a1 = item
                ? getActions$(this, { node: item as any, selection: 'direct' }, Object.values(GENERIC_ACTIONS))
                : of([])
            let a2 = item
                ? PlatformSettingsStore.getOpeningApps$(item as any).pipe(
                    map((apps) => apps.map((app) => openWithActionFromExe(app)))
                )
                : of([])

            return combineLatest([a0, a1, a2]).pipe(
                map(([a0, a1, a2]) => {
                    return {
                        item: item,
                        folder: folder,
                        actions: [...a0, ...a1, ...a2] as Action[]
                    }
                }))
        })
    )

    public readonly displayMode$ = new BehaviorSubject<DisplayMode>('details')

    public readonly userInfo$ = RequestsExecutor.getUserInfo().pipe(
        share()
    )

    public readonly defaultUserDrive$ = this.userInfo$.pipe(
        mergeMap(({ groups }) => {
            let privateGrp = groups.find(grp => grp.path == 'private')
            return RequestsExecutor.getDefaultDrive(privateGrp.id)
        }),
        share()
    )

    public readonly userDrives$ = this.userInfo$.pipe(
        mergeMap(({ groups }) => {
            let privateGrp = groups.find(grp => grp.path == 'private')
            return RequestsExecutor.getDrivesChildren(privateGrp.id)
        })
    )

    groupsTree: { [key: string]: TreeGroup } = {}

    public itemCut: {
        cutType: 'borrow' | 'move',
        node: ItemNode<any> | FolderNode<any>
    }

    public readonly subscriptions: Subscription[] = []

    constructor() {

        this.subscriptions.push(
            combineLatest([
                this.userDrives$,
                this.defaultUserDrive$
            ]).subscribe(([respUserDrives, respDefaultDrive]: [any, any]) => {

                let tree = createTreeGroup('You', respUserDrives, respDefaultDrive)
                this.groupsTree[respDefaultDrive.groupId] = tree
                this.flux = new FluxState(tree)
                this.story = new StoryState(tree)
                this.data = new DataState(tree)
                this.openFolder(tree.getHomeNode())
                tree.directUpdates$.subscribe((updates) => {
                    updates.forEach(update => RequestsExecutor.execute(update))
                })
            })
        )
        let os = ChildApplicationAPI.getOsInstance()
        if (os) {
            this.subscriptions.push(
                os.broadcastedEvents$.pipe(
                    filter((event: PlatformEvent) => FileAddedEvent.isInstance(event)),
                    mergeMap((event: FileAddedEvent) => {
                        return RequestsExecutor.getItem(event.treeId)
                    }),
                ).subscribe((response: ItemResponse) => {
                    let tree = this.groupsTree[response.groupId]

                    let node = new ItemNode({
                        ...response,
                        kind: 'flux-project'
                    })
                    try {
                        tree.addChild(response.folderId, node)
                    }
                    catch (e) {
                        console.log("FileAddedEvent => Folder node not already resolved", { response })
                        return
                    }
                    tree.getNode(response.folderId).events$.next({ type: 'item-added' })
                })
            )
        }
    }

    openFolder(folder: FolderNode<any> | DriveNode) {
        this.openFolder$.next({ tree: this.groupsTree[folder.groupId], folder })
    }

    selectItem(item: BrowserNode) {
        if (this.selectedItem$.getValue() != item)
            this.selectedItem$.next(item)
    }

    selectGroup(group) {
        combineLatest([
            RequestsExecutor.getDefaultDrive(group.id),
            RequestsExecutor.getDrivesChildren(group.id)
        ]).subscribe(([defaultDrive, drives]: [any, any]) => {
            let tree = createTreeGroup(group.elements.slice(-1)[0], drives, defaultDrive)
            this.groupsTree[defaultDrive.groupId] = tree
            this.openFolder(tree.getHomeNode())
            tree.directUpdates$.subscribe((updates) => {
                updates.forEach(update => RequestsExecutor.execute(update))
            })
        })
    }

    newFolder(parentNode: DriveNode | FolderNode<any>) {

        let tree = this.groupsTree[parentNode.groupId]
        let childFolder = new FutureNode({
            icon: 'fas fa-folder',
            name: 'new folder',
            onResponse: (resp) => {
                let folderNode = new FolderNode({
                    kind: 'regular',
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: 'new folder',
                    folderId: resp.folderId,
                    parentFolderId: parentNode.id,
                    children: []
                })
                tree.replaceNode(childFolder.id, folderNode)
            },
            request: RequestsExecutor.createFolder(parentNode, { name: 'new folder', folderId: uuidv4() })
        })
        tree.addChild(parentNode.id, childFolder)
    }


    rename(node: FolderNode<'regular'> | AnyItemNode, newName: string, save: boolean = true) {

        node.removeStatus({ type: 'renaming' })
        this.groupsTree[node.groupId].replaceAttributes(node, { name: newName }, true, () => ({}), { toBeSaved: save })
    }

    deleteFolder(node: RegularFolderNode) {
        this.groupsTree[node.groupId].removeNode(node)
    }

    deleteDrive(node: DriveNode) {
        this.groupsTree[node.groupId].removeNode(node)
    }

    deleteItem(node: AnyItemNode) {
        this.groupsTree[node.groupId].removeNode(node)
    }

    purgeDrive(trashNode: TrashNode) {

        RequestsExecutor.purgeDrive(trashNode.driveId).pipe(
            mergeMap(() => {
                let tree = this.groupsTree[trashNode.groupId]
                return tree.getTrashNode().resolveChildren()
            })
        ).subscribe((children) => {

            children.forEach((deletedNode, i) => {
                this.groupsTree[trashNode.groupId].removeNode(deletedNode, i == children.length - 1)
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

        if (!this.itemCut)
            return

        let treeOrigin = this.groupsTree[this.itemCut.node.groupId]
        let treeDestination = this.groupsTree[destination.groupId]
        destination.addStatus({ type: 'request-pending', id: uuidv4() })

        let nodeSelected = this.itemCut.node

        if (nodeSelected instanceof ItemNode && this.itemCut.cutType == 'borrow')
            processBorrowItem(nodeSelected, treeDestination, destination)

        if (nodeSelected instanceof ItemNode && this.itemCut.cutType == 'move')
            processMoveItem(nodeSelected, treeOrigin, treeDestination, destination)

        if (nodeSelected instanceof FolderNode && this.itemCut.cutType == 'move')
            processMoveFolder(nodeSelected, treeDestination, destination)

        nodeSelected.removeStatus({ type: 'cut' })
        this.itemCut = undefined
    }

    refresh(folder: AnyFolderNode) {
        let tree = this.groupsTree[folder.groupId]
        let newFolder = new FolderNode({
            ...folder,
            children: RequestsExecutor.getFolderChildren(folder.groupId, folder.driveId, folder.folderId)
        })

        tree.replaceNode(folder.id, newFolder, true, () => ({}), { toBeSaved: false })
        this.openFolder(newFolder)
    }

    uploadAsset(node: AnyItemNode) {
        RequestsExecutor.uploadLocalAsset(node.assetId, node).subscribe()
    }
}

