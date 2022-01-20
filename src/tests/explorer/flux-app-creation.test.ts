import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getFromDocument, getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`

import { AssetCardView, ExplorerState, FolderContentView, HeaderPathView, MainPanelView } from '../../lib'
import { render } from '@youwol/flux-view'
import { InfoBtnView, ItemView } from '../../lib/explorer/views/main-panel/folder-content/item.view'
import { AnyItemNode, FluxProjectNode, FutureNode } from '../../lib/explorer/nodes'
import { filter, skip, take } from 'rxjs/operators'
import { RowView } from '../../lib/explorer/views/main-panel/folder-content/details.view'
import { ActionBtnView, ActionsView } from '../../lib/explorer/views/main-panel/actions.view'


beforeAll(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})

let state: ExplorerState


test('explorer state initialization', (done) => {

    state = new ExplorerState()

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

    let actionsContainer = getFromDocument<ActionsView>(`.${ActionsView.ClassSelector}`)
    expect(actionsContainer).toBeTruthy()

    actionsContainer.displayedActions$
        .pipe(take(1))
        .subscribe(() => {
            done()
        })
})


test('create flux app', (done) => {

    let actionNewApp = getFromDocument<ActionBtnView>(
        `.${ActionBtnView.ClassSelector}`,
        (view) => view.action.name == "new app"
    )
    expect(actionNewApp).toBeTruthy()

    actionNewApp.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    let folderContentView = getFromDocument<FolderContentView>(`.${FolderContentView.ClassSelector}`)

    folderContentView.items$.pipe(
        take(1)
    ).subscribe((items) => {
        expect(items.length).toEqual(1)
        expect(items[0]).toBeInstanceOf(FutureNode)
        expect(items[0].name).toEqual('new project')
    })

    folderContentView.items$.pipe(
        skip(1),
        take(1)
    ).subscribe((items) => {

        expect(items.length).toEqual(1)
        let fluxNode = items[0] as FluxProjectNode
        expect(fluxNode.kind).toEqual('flux-project')
        expect(fluxNode.name).toEqual('new project')
        done()
    })
})


test('select flux app', (done) => {

    let itemView = getFromDocument<ItemView>(
        `.${ItemView.ClassSelector}`,
        (view) => view.item.name == "new project"
    )
    expect(itemView).toBeTruthy()

    itemView.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    state.selectedItem$.pipe(
        take(1)
    ).subscribe((item) => {
        expect(item.name).toEqual('new project')
        done()
    })
})

test('popup info view', (done) => {

    let rowView = getFromDocument<RowView>(
        `.${RowView.ClassSelector}`,
        (row) => row.item.name == 'new project'
    )
    expect(rowView).toBeTruthy()
    rowView.onmouseenter()

    let infoBtn = getFromDocument<InfoBtnView>(
        `.${InfoBtnView.ClassSelector}`,
        (infoView) => infoView.node.name == 'new project'
    )
    expect(infoBtn).toBeTruthy()

    infoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    infoBtn.popupDisplayed$.pipe(
        filter((isDisplayed) => isDisplayed)
    ).subscribe(() => {
        let assetCardView = getFromDocument<AssetCardView>(
            `.${AssetCardView.ClassSelector}`
        )
        expect(assetCardView).toBeTruthy()
        expect(assetCardView.withTabs.Permissions).toBeTruthy()
        expect(assetCardView.withTabs.Dependencies).toBeTruthy()
        expect(assetCardView.asset.kind).toEqual('flux-project')
        expect(assetCardView.asset.name).toEqual('new project')
        done()
    })
})

