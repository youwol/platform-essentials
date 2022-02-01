import { render } from '@youwol/flux-view'
import { Subject } from 'rxjs'
import { mergeMap, take } from 'rxjs/operators'
import {
    AssetActionsView,
    AssetCardView,
    AssetOverview,
    AssetPermissionsView,
} from '../../lib/'
import { AssetCardTabs } from '../../lib/assets/asset-card/asset-card.view'
import {
    GroupsPermissionsView,
    UserPermissionsView,
} from '../../lib/assets/asset-card/permissions/permissions.view'
import { Asset, AssetsGatewayClient } from '../../lib/clients/assets-gateway'

import { getFromDocument, resetPyYouwolDbs$ } from '../common'
import '../mock-requests'

beforeAll(async (done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

let asset: Asset

test('create story', (done) => {
    const client = new AssetsGatewayClient()
    client.explorer
        .getDefaultUserDrive$()
        .pipe(
            mergeMap((drive) =>
                client.assets.story.create$(drive.homeFolderId, {
                    title: 'test',
                }),
            ),
        )
        .subscribe((resp) => {
            asset = resp
            done()
        })
})

test('create asset card view', (done) => {
    const assetOutput$ = new Subject<Asset>()
    const view = new AssetCardView({
        asset,
        actionsFactory: (asset) => {
            return new AssetActionsView({ asset })
        },
        assetOutput$,
        forceReadonly: false,
        withTabs: {
            Permissions: new AssetPermissionsView({ asset }),
        },
    })
    document.body.appendChild(render(view))
    const elem = getFromDocument<AssetCardView>(
        `.${AssetCardView.ClassSelector}`,
    )
    expect(elem).toBeTruthy()
    done()
})

test('overview tab', (done) => {
    const overview = getFromDocument<AssetOverview>(
        `.${AssetOverview.ClassSelector}`,
    )
    expect(overview).toBeTruthy()
    done()
})

test('permission tab', (done) => {
    const elem = getFromDocument<AssetCardTabs>(
        `.${AssetCardTabs.ClassSelector}`,
    )
    elem.state.selectedId$.next('Permissions')

    const permissionView = getFromDocument<AssetPermissionsView>(
        `.${AssetPermissionsView.ClassSelector}`,
    )
    expect(permissionView).toBeTruthy()

    permissionView.accessInfo$.pipe(take(1)).subscribe(() => {
        const userPermissionsView = getFromDocument<UserPermissionsView>(
            `.${UserPermissionsView.ClassSelector}`,
        )
        expect(userPermissionsView).toBeTruthy()
        expect(userPermissionsView.accessInfo.consumerInfo.permissions).toEqual(
            {
                read: true,
                write: true,
                share: true,
                expiration: null,
            },
        )
        expect(userPermissionsView.accessInfo.ownerInfo.defaultAccess).toEqual({
            read: 'forbidden',
            share: 'forbidden',
            expiration: null,
        })
        expect(userPermissionsView.accessInfo.ownerInfo.defaultAccess).toEqual({
            read: 'forbidden',
            share: 'forbidden',
            expiration: null,
        })
        expect(
            userPermissionsView.accessInfo.ownerInfo.exposingGroups,
        ).toHaveLength(0)

        const grpPermissionsView = getFromDocument<GroupsPermissionsView>(
            `.${GroupsPermissionsView.ClassSelector}`,
        )
        expect(grpPermissionsView).toBeTruthy()

        done()
    })
})
