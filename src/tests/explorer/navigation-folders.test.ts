import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { expectAttributes, getFromDocument, getPyYouwolBasePath, queryFromDocument, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`

import { ExplorerState, FolderContentView, HeaderPathView, MainPanelView } from '../../lib'
import { render } from '@youwol/flux-view'
import { combineLatest } from 'rxjs'
import { ItemView } from '../../lib/explorer/views/main-panel/folder-content/item.view'
import { DriveNode, FolderNode, FutureNode, GroupNode } from '../../lib/explorer/nodes'
import { mergeMap, skip, skipWhile, take } from 'rxjs/operators'
import { RowView } from '../../lib/explorer/views/main-panel/folder-content/details.view'
import { ActionsMenuView, PathElementView } from '../../lib/explorer/views/main-panel/header-path.view'
import { ActionBtnView, ActionsView } from '../../lib/explorer/views/main-panel/actions.view'


beforeAll(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})

let state: ExplorerState


test('explorer state initialization', (done) => {

    state = new ExplorerState()

    combineLatest([
        state.userInfo$,
        state.userDrives$,
        state.defaultUserDrive$
    ]).subscribe(([userInfo, drives, defaults]) => {
        expect(userInfo.name).toEqual("int_tests_yw-users@test-user")
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
    })
    state.currentFolder$
        .pipe(take(1))
        .subscribe(({ folder }) => {
            expect(folder.name).toEqual('Home')
            done()
        })
})

test('explorer view initialization', (done) => {

    document.body.appendChild(render({
        children: [
            new HeaderPathView({
                state
            }),
            new MainPanelView({
                state
            })
        ]
    }))

    let headerView = getFromDocument<HeaderPathView>(`.${HeaderPathView.ClassSelector}`)
    expect(headerView).toBeTruthy()

    let mainView = getFromDocument<MainPanelView>(`.${MainPanelView.ClassSelector}`)
    expect(mainView).toBeTruthy()

    let folderContentView = getFromDocument<FolderContentView>(`.${FolderContentView.ClassSelector}`)
    expect(folderContentView).toBeTruthy()

    let items = queryFromDocument<ItemView>(`.${ItemView.ClassSelector}`)
    expect(items.length).toEqual(0)

    let pathElements = queryFromDocument<PathElementView>(`.${PathElementView.ClassSelector}`)
    expect(pathElements[0].node).toBeInstanceOf(GroupNode)
    expect(pathElements[1].node).toBeInstanceOf(DriveNode)
    expect(pathElements[2].node).toBeInstanceOf(FolderNode)
    expect(pathElements[2].node.kind).toEqual("home")

    let actionsMenuView = getFromDocument<ActionsMenuView>(`.${ActionsMenuView.ClassSelector}`)
    expect(actionsMenuView).toBeTruthy()
    actionsMenuView.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    let actionsContainer = getFromDocument<ActionsView>(`.${ActionsView.ClassSelector}`)
    expect(actionsContainer).toBeTruthy()

    actionsContainer.displayedActions$
        .pipe(take(1))
        .subscribe(({ item, folder, actions }) => {

            let actionsView = queryFromDocument<ActionBtnView>(`.${ActionBtnView.ClassSelector}`)
            let actionNames = actionsView.map(a => a.action.name)

            expect(actionNames).toEqual([
                "new folder",
                "new app",
                "new story",
                "paste",
                "import data",
                "refresh",
            ])
            done()
        })
})

test('create a folder', (done) => {

    let actionNewFolder = getFromDocument<ActionBtnView>(
        `.${ActionBtnView.ClassSelector}`,
        (view) => view.action.name == "new folder"
    )
    expect(actionNewFolder).toBeTruthy()

    actionNewFolder.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    let folderContentView = getFromDocument<FolderContentView>(`.${FolderContentView.ClassSelector}`)

    folderContentView.items$.pipe(
        take(1)
    ).subscribe((items) => {
        expect(items.length).toEqual(1)
        expect(items[0]).toBeInstanceOf(FutureNode)
    })

    folderContentView.items$.pipe(
        skip(1),
        take(1)
    ).subscribe((items) => {

        expect(items.length).toEqual(1)
        expect(items[0]).toBeInstanceOf(FolderNode)

        let itemsView = queryFromDocument<RowView>(`.${RowView.ClassSelector}`)
        expect(itemsView.length).toEqual(1)
        expect(itemsView[0].item.name).toEqual('new folder')
        done()
    })
})

test('select folder', (done) => {

    let rowView = getFromDocument<RowView>(
        `.${RowView.ClassSelector}`,
        (row) => row.item.name == 'new folder'
    )
    expect(rowView).toBeTruthy()

    rowView.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    state.selectedItem$.pipe(
        take(1)
    ).subscribe((folder) => {
        expect(folder.id).toEqual(rowView.item.id)
        done()
    })
})

test('open folder', (done) => {

    let rowView = getFromDocument<RowView>(
        `.${RowView.ClassSelector}`,
        (row) => row.item.name == 'new folder'
    )
    expect(rowView).toBeTruthy()

    rowView.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))

    state.currentFolder$.subscribe(({ folder }) => {
        expect(folder.name).toEqual('new folder')
        let folderContentView = getFromDocument<FolderContentView>(`.${FolderContentView.ClassSelector}`)
        expect(folderContentView.folderId).toEqual(folder.id)
    })

    // Wait for actions menu view to be updated
    state.currentFolder$.pipe(
        mergeMap(() => {
            let actionsContainer = getFromDocument<ActionsView>(`.${ActionsView.ClassSelector}`)
            return actionsContainer.displayedActions$
        }),
        skipWhile(({ folder }) => folder.name != 'new folder'),
        take(1)
    ).subscribe((actions) => {
        let actionBtnsView = queryFromDocument<ActionBtnView>(`.${ActionBtnView.ClassSelector}`)
        actionBtnsView.forEach(node => {
            expect(node.action.sourceEventNode.name).toEqual('new folder')
        })
        done()
    })
})

