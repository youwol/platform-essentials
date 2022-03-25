// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { render } from '@youwol/flux-view'
import { Subject } from 'rxjs'
import { take } from 'rxjs/operators'
import {
    AssetActionsView,
    AssetCardView,
    AssetOverview,
    AssetPermissionsView,
} from '../../lib/assets'
import { AssetCardTabs } from '../../lib/assets/asset-card/asset-card.view'
import {
    GroupsPermissionsView,
    UserPermissionsView,
} from '../../lib/assets/asset-card/permissions/permissions.view'

import { AssetsGateway } from '@youwol/http-clients'
import { createStory, getFromDocument, resetPyYouwolDbs$ } from '../common'

let asset: AssetsGateway.Asset

beforeAll((done) => {
    resetPyYouwolDbs$()
        .pipe(createStory('test'))
        .subscribe((a) => {
            asset = a
            done()
        })
})

test('create asset card view', (done) => {
    const assetOutput$ = new Subject<AssetsGateway.Asset>()
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
