import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getFromDocument, getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
AssetsGatewayClient.staticHeaders = { 'py-youwol-local-only': true }

import { render } from "@youwol/flux-view"
import { Subject } from "rxjs"
import { mergeMap, take } from "rxjs/operators"
import { Asset, AssetActionsView, AssetCardView, AssetOverview, AssetPermissionsView } from "../../lib"
import { AssetCardTabs } from '../../lib/assets/asset-card/asset-card.view'
import { GroupsPermissionsView, UserPermissionsView } from '../../lib/assets/asset-card/permissions/permissions.view'

beforeAll(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})

let asset: Asset


test('create story', (done) => {

    let client = new AssetsGatewayClient()
    client.explorer.getDefaultUserDrive$().pipe(
        mergeMap((drive) => client.assets.story.create$(drive.homeFolderId, { title: 'test' }))
    ).subscribe((resp) => {
        asset = resp
        done()
    })
})

test("create asset card view", (done) => {

    let assetOutput$ = new Subject<Asset>()
    let view = new AssetCardView({
        asset,
        actionsFactory: (asset) => {
            return new AssetActionsView({ asset })
        },
        assetOutput$,
        forceReadonly: false,
        withTabs: {
            Permissions: new AssetPermissionsView({ asset })
        }
    })
    document.body.appendChild(render(view))
    let elem = getFromDocument<AssetCardView>(`.${AssetCardView.ClassSelector}`)
    expect(elem).toBeTruthy()
    done()
})


test("test overview tab", (done) => {

    let overview = getFromDocument<AssetOverview>(`.${AssetOverview.ClassSelector}`)
    expect(overview).toBeTruthy()
    done()
})

test("test permission tab", (done) => {

    let elem = getFromDocument<AssetCardTabs>(`.${AssetCardTabs.ClassSelector}`)
    elem.state.selectedId$.next('Permissions')

    let permissionView = getFromDocument<AssetPermissionsView>(`.${AssetPermissionsView.ClassSelector}`)
    expect(permissionView).toBeTruthy()

    permissionView.accessInfo$.pipe(
        take(1)
    ).subscribe(() => {
        let userPermissionsView = getFromDocument<UserPermissionsView>(`.${UserPermissionsView.ClassSelector}`)
        expect(userPermissionsView).toBeTruthy()
        expect(userPermissionsView.accessInfo.consumerInfo.permissions).toEqual({
            read: true,
            write: true,
            share: true,
            expiration: null
        })
        expect(userPermissionsView.accessInfo.ownerInfo.defaultAccess).toEqual({
            read: 'forbidden',
            share: 'forbidden',
            expiration: null
        })
        expect(userPermissionsView.accessInfo.ownerInfo.defaultAccess).toEqual({
            read: 'forbidden',
            share: 'forbidden',
            expiration: null
        })
        expect(userPermissionsView.accessInfo.ownerInfo.exposingGroups.length).toEqual(0)

        let grpPermissionsView = getFromDocument<GroupsPermissionsView>(`.${GroupsPermissionsView.ClassSelector}`)
        expect(grpPermissionsView).toBeTruthy()

        done()
    })
})
