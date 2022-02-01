import { render } from '@youwol/flux-view'
import { combineLatest, Observable, of } from 'rxjs'
import {
    filter,
    map,
    mapTo,
    mergeMap,
    skip,
    skipWhile,
    take,
    tap,
} from 'rxjs/operators'
import {
    AssetCardView,
    FolderContentView,
    MainPanelView,
    SideBarView,
} from '../../lib'
import { ExplorerState } from '../../lib/explorer'
import { Action } from '../../lib/explorer/actions.factory'
import { OpenFolder } from '../../lib/explorer/explorer.state'
import {
    AnyFolderNode,
    AnyItemNode,
    BrowserNode,
    DriveNode,
    FolderNode,
    FutureNode,
    GroupNode,
} from '../../lib/explorer/nodes'
import {
    ActionBtnView,
    ActionsView,
    DisplayedActions,
} from '../../lib/explorer/views/main-panel/actions.view'
import { RowView } from '../../lib/explorer/views/main-panel/folder-content/details.view'
import {
    InfoBtnView,
    ItemView,
} from '../../lib/explorer/views/main-panel/folder-content/item.view'
import {
    ActionsMenuView,
    HeaderPathView,
    PathElementView,
} from '../../lib/explorer/views/main-panel/header-path.view'
import {
    GroupsView,
    GroupView,
} from '../../lib/explorer/views/sidebar/sidebar.view'
import { expectAttributes, getFromDocument, queryFromDocument } from '../common'

export class Shell {
    folder: AnyFolderNode | DriveNode | GroupNode
    item?: BrowserNode
    actions: Action[]
    explorerState: ExplorerState
    assetCardView?: AssetCardView

    constructor(params: {
        folder: AnyFolderNode | DriveNode | GroupNode
        item?: BrowserNode
        actions: Action[]
        explorerState: ExplorerState
        assetCardView?: AssetCardView
    }) {
        Object.assign(this, params)
    }
}

export function shell$() {
    const state = new ExplorerState()
    document.body.innerHTML = ''
    return combineLatest([
        state.userInfo$,
        state.userDrives$,
        state.defaultUserDrive$,
    ]).pipe(
        tap(([userInfo, drives, defaults]) => {
            expect(userInfo.name).toEqual('int_tests_yw-users@test-user')
            expect(drives.length).toEqual(0)
            expectAttributes(defaults, [
                'driveId',
                'driveName',
                'groupId',
                'homeFolderId',
                'homeFolderName',
                'downloadFolderId',
                'downloadFolderName',
                'systemFolderId',
                'systemFolderName',
                'systemPackagesFolderId',
                'systemPackagesFolderName',
                'desktopFolderId',
                'desktopFolderName',
            ])
        }),
        mergeMap(() => state.currentFolder$),
        take(1),
        tap(({ folder }) => {
            expect(folder.name).toEqual('Home')
        }),
        mergeMap(({ folder }) => {
            document.body.appendChild(
                render({
                    children: [
                        new HeaderPathView({ state }),
                        new MainPanelView({ state }),
                    ],
                }),
            )
            const headerView = getFromDocument<HeaderPathView>(
                `.${HeaderPathView.ClassSelector}`,
            )
            expect(headerView).toBeTruthy()

            const mainView = getFromDocument<MainPanelView>(
                `.${MainPanelView.ClassSelector}`,
            )
            expect(mainView).toBeTruthy()

            const folderContentView = getFromDocument<FolderContentView>(
                `.${FolderContentView.ClassSelector}`,
            )
            expect(folderContentView).toBeTruthy()

            const items = queryFromDocument<ItemView>(
                `.${ItemView.ClassSelector}`,
            )
            expect(items.length).toEqual(0)

            const pathElements = queryFromDocument<PathElementView>(
                `.${PathElementView.ClassSelector}`,
            )
            expect(pathElements[0].node).toBeInstanceOf(GroupNode)
            expect(pathElements[1].node).toBeInstanceOf(DriveNode)
            expect(pathElements[2].node).toBeInstanceOf(FolderNode)
            expect(pathElements[2].node.kind).toEqual('home')

            const actionsMenuView = getFromDocument<ActionsMenuView>(
                `.${ActionsMenuView.ClassSelector}`,
            )
            expect(actionsMenuView).toBeTruthy()
            actionsMenuView.dispatchEvent(
                new MouseEvent('click', { bubbles: true }),
            )

            const actionsContainer = getFromDocument<ActionsView>(
                `.${ActionsView.ClassSelector}`,
            )
            expect(actionsContainer).toBeTruthy()
            return actionsContainer.displayedActions$.pipe(
                take(1),
                tap(() => {
                    const actionsView = queryFromDocument<ActionBtnView>(
                        `.${ActionBtnView.ClassSelector}`,
                    )
                    const actionNames = actionsView.map((a) => a.action.name)

                    expect(actionNames).toEqual([
                        'new folder',
                        'new app',
                        'new story',
                        'paste',
                        'import data',
                        'refresh',
                    ])
                }),
                map(
                    ({ folder, actions, item }) =>
                        new Shell({
                            folder,
                            item,
                            actions,
                            explorerState: state,
                        }),
                ),
            )
        }),
    )
}

export function rename(fromName: string, toName: string) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell: Shell) => {
                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )
                return folderContentView.items$.pipe(
                    take(1),
                    map((items) => [
                        items.find(
                            (node: BrowserNode) => node.name == fromName,
                        ),
                        shell,
                    ]),
                )
            }),
            mergeMap(([target, shell]: [BrowserNode, Shell]) => {
                shell.explorerState.rename(target as any, toName)

                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )
                return folderContentView.items$.pipe(
                    take(1),
                    tap((items) => {
                        const target = items.find((item) => item.name == toName)
                        expect(target).toBeTruthy()
                    }),
                    map(() => {
                        return new Shell({
                            explorerState: shell.explorerState,
                            folder: shell.folder,
                            item: shell.explorerState.selectedItem$.getValue(),
                            actions: [],
                        })
                    }),
                )
            }),
        )
}

export function mkDir(folderName) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell: Shell) => {
                const actionNewFolder = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'new folder',
                )
                expect(actionNewFolder).toBeTruthy()

                actionNewFolder.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )
                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )

                folderContentView.items$.pipe(take(1)).subscribe((items) => {
                    const target = items.filter(
                        (item) => item.name == 'new folder',
                    )
                    expect(target.length).toEqual(1)
                    expect(target[0]).toBeInstanceOf(FutureNode)
                })

                return folderContentView.items$.pipe(
                    skip(1),
                    take(1),
                    tap((items) => {
                        expect(items.length).toEqual(1)
                        expect(items[0]).toBeInstanceOf(FolderNode)

                        const itemsView = queryFromDocument<RowView>(
                            `.${RowView.ClassSelector}`,
                        )
                        expect(itemsView.length).toEqual(1)
                        expect(itemsView[0].item.name).toEqual('new folder')
                    }),
                    mapTo(shell),
                )
            }),
            rename('new folder', folderName),
            mergeMap((shell) => {
                const actionsContainer = getFromDocument<ActionsView>(
                    `.${ActionsView.ClassSelector}`,
                )
                return actionsContainer.displayedActions$.pipe(
                    take(1),
                    map(
                        (actions) =>
                            new Shell({
                                ...actions,
                                explorerState: shell.explorerState,
                            }),
                    ),
                )
            }),
        )
}

export function rm(itemName) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            selectItem(itemName),
            mergeMap((shell) => {
                const actionDelete = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'delete',
                )
                actionDelete.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )

                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )

                return folderContentView.items$.pipe(
                    take(1),
                    tap((items) => {
                        const target = items.find(
                            (item) => item.name == itemName,
                        )
                        expect(target).toBeFalsy()
                    }),
                    mergeMap(() => {
                        const actionsContainer = getFromDocument<ActionsView>(
                            `.${ActionsView.ClassSelector}`,
                        )

                        return actionsContainer.displayedActions$.pipe(
                            skipWhile(({ folder }) => {
                                return folder.id != folderContentView.folderId
                            }),
                            take(1),
                            map(() => shell),
                        )
                    }),
                )
            }),
        )
}

export function mkAsset({
    actionName,
    defaultInstanceName,
    instanceName,
    kind,
}: {
    actionName: string
    defaultInstanceName: string
    instanceName: string
    kind: 'story' | 'flux-project'
}) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell: Shell) => {
                const actionNewAsset = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == actionName,
                )
                expect(actionNewAsset).toBeTruthy()

                actionNewAsset.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )

                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )

                folderContentView.items$.pipe(take(1)).subscribe((items) => {
                    expect(items.length).toEqual(1)
                    expect(items[0]).toBeInstanceOf(FutureNode)
                    expect(items[0].name).toEqual(defaultInstanceName)
                })

                return folderContentView.items$.pipe(
                    skip(1),
                    take(1),
                    tap((items) => {
                        const assetNode = items.find(
                            (item) => item.name == defaultInstanceName,
                        ) as AnyItemNode
                        expect(assetNode).toBeTruthy()
                        expect(assetNode.kind).toEqual(kind)
                    }),
                    mapTo(shell),
                )
            }),
            rename(defaultInstanceName, instanceName),
        )
}
export function mkStory(storyName) {
    return mkAsset({
        actionName: 'new story',
        defaultInstanceName: 'new story',
        instanceName: storyName,
        kind: 'story',
    })
}

export function mkFluxApp(appName) {
    return mkAsset({
        actionName: 'new app',
        defaultInstanceName: 'new project',
        instanceName: appName,
        kind: 'flux-project',
    })
}

export function navigateStepBack() {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell: Shell) => {
                const pathElements0 = queryFromDocument<PathElementView>(
                    `.${PathElementView.ClassSelector}`,
                )
                const count0 = pathElements0.length
                pathElements0
                    .slice(-2)[0]
                    .dispatchEvent(new MouseEvent('click', { bubbles: true }))

                return shell.explorerState.currentFolder$.pipe(
                    take(1),
                    map(({ folder }) => {
                        const pathElements = queryFromDocument<PathElementView>(
                            `.${PathElementView.ClassSelector}`,
                        )
                        const target = pathElements.slice(-1)[0].node
                        expect(pathElements.length).toEqual(count0 - 1)
                        expect(target.id).toEqual(folder.id)
                        return folder
                    }),
                    mergeMap((folder) => {
                        const actionsContainer = getFromDocument<ActionsView>(
                            `.${ActionsView.ClassSelector}`,
                        )
                        return actionsContainer.displayedActions$.pipe(
                            map((actions) => ({
                                actions,
                                targetFolder: folder,
                            })),
                        )
                    }),
                    skipWhile(({ actions, targetFolder }) => {
                        /**
                         * The next is a hack: when selecting a GroupNode =>
                         * displayedActions$ never fire with actions.folder == groupNode.
                         */
                        if (targetFolder instanceof GroupNode) {
                            return false
                        }

                        return !(
                            (actions.folder instanceof FolderNode ||
                                actions.folder instanceof DriveNode) &&
                            actions.folder.name == targetFolder.name
                        )
                    }),
                    take(1),
                    map(({ actions, targetFolder }) => {
                        return new Shell({ ...shell, folder: targetFolder })
                    }),
                )
            }),
        )
}

export function cd(folderName: string) {
    if (folderName == '..') {
        return navigateStepBack()
    }
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell: Shell) => {
                const rowView = getFromDocument<RowView>(
                    `.${RowView.ClassSelector}`,
                    (row) => row.item.name == folderName,
                )
                expect(rowView).toBeTruthy()

                rowView.dispatchEvent(
                    new MouseEvent('dblclick', { bubbles: true }),
                )

                // Wait for actions menu view to be updated
                return shell.explorerState.currentFolder$.pipe(
                    skipWhile(({ folder }) => {
                        return !(
                            folder instanceof FolderNode &&
                            folder.name == folderName
                        )
                    }),
                    take(1),
                    tap(({ folder }) => {
                        expect(folder.name).toEqual(folderName)
                        const folderContentView =
                            getFromDocument<FolderContentView>(
                                `.${FolderContentView.ClassSelector}`,
                            )
                        expect(folderContentView.folderId).toEqual(folder.id)
                    }),
                    mergeMap(() => {
                        const folderContentView =
                            getFromDocument<FolderContentView>(
                                `.${FolderContentView.ClassSelector}`,
                            )
                        return folderContentView.items$
                    }),
                    mergeMap(() => {
                        const actionsContainer = getFromDocument<ActionsView>(
                            `.${ActionsView.ClassSelector}`,
                        )
                        return actionsContainer.displayedActions$
                    }),
                    skipWhile(({ folder }) => {
                        return !(
                            folder instanceof FolderNode &&
                            folder.name == folderName
                        )
                    }),
                    take(1),
                    map(({ item, folder, actions }) => {
                        /*let actionBtnsView = queryFromDocument<ActionBtnView>(`.${ActionBtnView.ClassSelector}`)
                        actionBtnsView.forEach(node => {
                            expect(node.action.sourceEventNode.name).toEqual(folderName)
                        })*/
                        return new Shell({
                            explorerState: shell.explorerState,
                            item,
                            folder,
                            actions,
                        })
                    }),
                    take(1),
                )
            }),
        )
}

export function cdGroup(name: string) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const targetGroupId = window.btoa(
                    unescape(encodeURIComponent(`/${name}`)),
                )
                const sidebar = getFromDocument<SideBarView>(
                    `.${SideBarView.ClassSelector}`,
                )
                expect(sidebar).toBeTruthy()
                sidebar.extended$.next(true)
                const grpContaineView = getFromDocument<GroupsView>(
                    `.${GroupsView.ClassSelector}`,
                )
                expect(grpContaineView).toBeTruthy()
                grpContaineView.groupsExpanded$.next(true)
                const groupsView = queryFromDocument<GroupView>(
                    `.${GroupView.ClassSelector}`,
                )
                const targetGrp = groupsView.find(
                    (view) => view.group.name == name,
                )
                expect(targetGrp).toBeTruthy()
                targetGrp.onclick()
                return shell.explorerState.openFolder$.pipe(
                    skipWhile(({ folder }: OpenFolder) => {
                        return folder.groupId != targetGroupId
                    }),
                    take(1),
                    mergeMap(() => {
                        const actionsContainer = getFromDocument<ActionsView>(
                            `.${ActionsView.ClassSelector}`,
                        )
                        return actionsContainer.displayedActions$
                    }),
                    skipWhile(({ folder }: DisplayedActions) => {
                        return folder.groupId != targetGroupId
                    }),
                    take(1),
                    map(({ folder, actions }) => {
                        return new Shell({
                            folder,
                            actions,
                            explorerState: shell.explorerState,
                        })
                    }),
                )
            }),
        )
}

export function selectItem(itemName: string) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const rowView = getFromDocument<RowView>(
                    `.${RowView.ClassSelector}`,
                    (row) => row.item.name == itemName,
                )
                expect(rowView).toBeTruthy()

                rowView.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )

                return shell.explorerState.selectedItem$.pipe(
                    take(1),
                    tap((item) => {
                        expect(item.id).toEqual(rowView.item.id)
                    }),
                    mergeMap((item) => {
                        const actionsContainer = getFromDocument<ActionsView>(
                            `.${ActionsView.ClassSelector}`,
                        )
                        return actionsContainer.displayedActions$.pipe(
                            skipWhile(({ item }) => {
                                return !(item && item.name == itemName)
                            }),
                            take(1),
                            map(() => {
                                return new Shell({
                                    ...shell,
                                    item: item,
                                })
                            }),
                        )
                    }),
                )
            }),
        )
}

export function cut(itemName: string) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            selectItem(itemName),
            mergeMap((shell) => {
                const actionCut = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'cut',
                )
                expect(actionCut).toBeDefined()
                actionCut.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )
                expect(shell.explorerState.itemCut).toEqual({
                    cutType: 'move',
                    node: shell.item,
                })

                return of(shell)
            }),
        )
}

export function borrow(itemName: string) {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            selectItem(itemName),
            mergeMap((shell) => {
                const actionBorrow = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'borrow item',
                )
                expect(actionBorrow).toBeDefined()
                actionBorrow.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )
                expect(shell.explorerState.itemCut).toEqual({
                    cutType: 'borrow',
                    node: shell.item,
                })
                return of(shell)
            }),
        )
}

export function paste() {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const actionPaste = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'paste',
                )
                const nodeCut = shell.explorerState.itemCut.node as AnyItemNode
                expect(actionPaste).toBeDefined()
                actionPaste.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )

                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )

                folderContentView.items$.pipe(take(1)).subscribe((items) => {
                    const targets = items.filter(
                        (item) => item instanceof FutureNode,
                    )
                    expect(targets.length).toEqual(1)
                    expect(targets[0].name).toEqual(nodeCut.name)
                })

                return folderContentView.items$.pipe(
                    skip(1), // It skips the FutureNode
                    take(1),
                    tap((items) => {
                        const target = items.find(
                            (item: AnyItemNode) =>
                                item.assetId == nodeCut.assetId,
                        )
                        expect(target).toBeTruthy()
                    }),
                    map(() => {
                        return new Shell({ ...shell })
                    }),
                )
            }),
        )
}

export function popupInfo() {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const selected = shell.explorerState.selectedItem$.getValue()
                const infoBtn = getFromDocument<InfoBtnView>(
                    `.${InfoBtnView.ClassSelector}`,
                    (infoView) => infoView.node.name == selected.name,
                )
                expect(infoBtn).toBeTruthy()
                infoBtn.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )

                return infoBtn.popupDisplayed$.pipe(
                    filter((isDisplayed) => isDisplayed),
                    map(() => {
                        const assetCardView = getFromDocument<AssetCardView>(
                            `.${AssetCardView.ClassSelector}`,
                        )
                        return new Shell({
                            ...shell,
                            assetCardView,
                        })
                    }),
                )
            }),
        )
}

export function purgeTrash() {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const actionPurge = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'clear trash',
                )
                expect(actionPurge).toBeDefined()
                actionPurge.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )
                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )
                expect(folderContentView).toBeTruthy()
                return folderContentView.items$.pipe(
                    skipWhile((items) => {
                        return items.length != 0
                    }),
                    take(1),
                    mergeMap((items) => {
                        expect(items.length).toEqual(0)
                        return of(new Shell({ ...shell }))
                    }),
                )
            }),
        )
}

export function deleteDrive() {
    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const actionDelete = getFromDocument<ActionBtnView>(
                    `.${ActionBtnView.ClassSelector}`,
                    (view) => view.action.name == 'delete drive',
                )
                expect(actionDelete).toBeDefined()
                actionDelete.dispatchEvent(
                    new MouseEvent('click', { bubbles: true }),
                )
                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )
                expect(folderContentView).toBeTruthy()

                return folderContentView.items$.pipe(
                    skipWhile((items) => {
                        return items.length != 0
                    }),
                    take(1),
                    mergeMap((items) => {
                        expect(items.length).toEqual(0)
                        return of(new Shell({ ...shell }))
                    }),
                )
            }),
        )
}

export function expectSnapshot({
    items,
    explorerState,
    actions,
    assetCardView,
}: {
    items?: (items: BrowserNode[]) => void
    explorerState?: (state: ExplorerState) => void
    actions?: (actions: Action[]) => void
    assetCardView?: (assetCardView: AssetCardView) => void
}) {
    const expectItems = items
    const expectExplorerState = explorerState
    const expectActions = actions
    const expectAssetCardView = assetCardView

    return (source$: Observable<Shell>) =>
        source$.pipe(
            take(1),
            mergeMap((shell) => {
                const folderContentView = getFromDocument<FolderContentView>(
                    `.${FolderContentView.ClassSelector}`,
                )
                expect(folderContentView).toBeTruthy()

                const actionsContainer = getFromDocument<ActionsView>(
                    `.${ActionsView.ClassSelector}`,
                )
                expect(actionsContainer).toBeTruthy()

                return combineLatest([
                    folderContentView.items$,
                    actionsContainer.displayedActions$,
                ]).pipe(
                    take(1),
                    tap(([items, { actions }]) => {
                        expectExplorerState &&
                            expectExplorerState(shell.explorerState)
                        expectItems && expectItems(items)
                        expectActions && expectActions(actions)
                        expectAssetCardView &&
                            expectAssetCardView(shell.assetCardView)
                    }),
                    mapTo(shell),
                )
            }),
        )
}
