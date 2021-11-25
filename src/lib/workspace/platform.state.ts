import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, Observable, of, ReplaySubject } from "rxjs"
import { distinctUntilChanged, map, mergeMap, share, shareReplay } from 'rxjs/operators'
import { RequestsExecutor } from './requests-executor'
import { ImmutableTree } from '@youwol/fv-tree'
import { FluxState } from './specific-assets/flux/flux.state'
import { RunningApp } from './views/main-panel/running-app.view'
import { StoryState } from './specific-assets/story/story.state'
import { DataState } from './specific-assets/data/data.state'
import { VirtualDOM } from '@youwol/flux-view'
import {
    AnyFolderNode, AnyItemNode, BrowserNode, DownloadNode, DriveNode, FolderNode,
    FutureNode, GroupNode, HomeNode, ItemNode, TrashNode
} from './nodes'
import { createTreeGroup, fetchCodeMirror$, processBorrowItem, processMoveFolder, processMoveItem } from './utils'
import { YouwolBannerState } from '..'

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


export class PlatformState {

    public flux: FluxState
    public story: StoryState
    public data: DataState

    public readonly topBannerState = new YouwolBannerState({ cmEditorModule$: fetchCodeMirror$() })

    public readonly selectedItem$ = new ReplaySubject<BrowserNode>(1)

    public readonly openFolder$ = new ReplaySubject<{ tree: TreeGroup, folder: AnyFolderNode | DriveNode }>(1)

    public readonly currentFolder$ = this.openFolder$.pipe(
        mergeMap(({ tree, folder }) => {
            // this next line is the one that actually 'trigger' the request to fetch the children
            tree.getChildren(folder)
            return tree.getChildren$(folder).pipe(map(() => ({ tree, folder })))
        }),
        distinctUntilChanged((a, b) => a.folder.id == b.folder.id),
        shareReplay(1)
    ) as Observable<{ tree: TreeGroup, folder: FolderNode<any> }>

    public readonly runningApplication$ = new BehaviorSubject<RunningApp>(undefined)
    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

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

    constructor() {

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
        window['@youwol/os'] = this
        this.createInstance({
            icon: "fas fa-shopping-cart",
            title: "Exhibition halls",
            appURL: `/ui/exhibition-halls/`
        })
    }

    openFolder(folder: FolderNode<any> | DriveNode) {
        this.openFolder$.next({ tree: this.groupsTree[folder.groupId], folder })
        this.runningApplication$.next(undefined)
    }

    selectItem(item: BrowserNode) {
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
            request: RequestsExecutor.newFolder(parentNode, { name: 'new folder', folderId: uuidv4() })
        })
        tree.addChild(parentNode.id, childFolder)
    }

    createInstance(appData: {
        icon: string,
        title: string,
        appURL: string
    }) {
        let instanceId = uuidv4()
        let url = appData.appURL.endsWith('/')
            ? appData.appURL + "?instance-id=" + instanceId
            : appData.appURL + "&instance-id=" + instanceId
        let app = new RunningApp({
            state: this,
            instanceId,
            icon: appData.icon,
            title: appData.title,
            appURL$: of(url)
        })
        this.runningApplications$.next([...this.runningApplications$.getValue(), app])
        return app
    }


    focus(app: RunningApp) {
        this.runningApplication$.next(app)
    }

    toggleNavigationMode() {
        this.runningApplication$.next(undefined)
    }

    setTopBannerViews(appId: string, { actionsView, badgesView }: { actionsView: VirtualDOM, badgesView: VirtualDOM }) {
        let app = this.runningApplications$.getValue().find(app => app.instanceId === appId)
        app.topBannerActions$.next(actionsView)
    }

    close(app: RunningApp) {
        app.terminateInstance()
        this.runningApplications$.next(this.runningApplications$.getValue().filter(d => d != app))
        this.runningApplication$.next(undefined)
    }

    minimize(preview: RunningApp) {

        this.runningApplication$.next(undefined)
        if (this.runningApplications$.getValue().includes(preview))
            return
        this.runningApplications$.next([...this.runningApplications$.getValue(), preview])
    }

    rename(node: FolderNode<'regular'> | AnyItemNode, newName: string, save: boolean = true) {

        node.removeStatus({ type: 'renaming' })
        this.groupsTree[node.groupId].replaceAttributes(node, { name: newName }, true, () => ({}), { toBeSaved: save })
    }

    deleteFolder(node: FolderNode<'regular'>) {
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
}



