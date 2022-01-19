import '../mock-requests'
import {
    AssetsGatewayClient, DriveResponse, DrivesResponse, GroupsResponse, HealthzResponse,
    ChildrenFolderResponse, DefaultDriveResponse, FolderResponse, Asset
} from '../../lib/clients'
import { mergeMap } from 'rxjs/operators'
import { expectAttributes, getPyYouwolBasePath, resetPyYouwolDbs } from '../common'
import { expectAttribute } from '@youwol/flux-core'


let assetsGtw = new AssetsGatewayClient({
    basePath: `${getPyYouwolBasePath()}/api/assets-gateway`
})


beforeAll(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})

let privateGrpPath = "private"
let privateGrpId: string
let defaultDriveId: string
let homeFolderId: string
let newDriveId: string
let workingFolderId: string
let ywUsersGrpPath = "/youwol-users"

test('assetsGtw.getHealthz()', (done) => {

    assetsGtw.getHealthz().subscribe((resp: HealthzResponse) => {
        expect(resp.status).toEqual('assets-gateway ok')
        done()
    })
})

test('assetsGtw.queryGroups()', (done) => {

    assetsGtw.queryGroups()
        .subscribe((resp: GroupsResponse) => {
            let privateGrp = resp.groups.find(g => g.path == privateGrpPath)
            expect(privateGrp).toBeTruthy()
            privateGrpId = privateGrp.id
            done()
        })
})

test('assetsGtw.explorer.groups.getDefaultDrive$', (done) => {

    assetsGtw.explorer.groups.getDefaultDrive$(privateGrpId)
        .subscribe((resp: DefaultDriveResponse) => {

            homeFolderId = resp.homeFolderId
            done()
        })
})

test('assetsGtw.assets.fluxProject.create$', (done) => {

    assetsGtw.assets.fluxProject.create$(
        homeFolderId,
        {
            name: "test",
            description: "platform-essentials integration test"
        })
        .subscribe((resp: Asset) => {
            expectAttributes(resp, [
                'assetId',
                'rawId',
                'treeId',
                'description',
                'name',
                'kind',
                'groupId',
                'images',
                'thumbnails',
                'tags',
                //'permissions'
            ])
            expect(resp.name).toEqual("test")
            expect(resp.description).toEqual("platform-essentials integration test")
            done()
        })
})


test('assetsGtw.assets.story.create$', (done) => {

    assetsGtw.assets.story.create$(
        homeFolderId,
        {
            title: "test-story"
        })
        .subscribe((resp: Asset) => {
            expectAttributes(resp, [
                'assetId',
                'rawId',
                'treeId',
                //'description',
                'name',
                'kind',
                'groupId',
                'images',
                'thumbnails',
                'tags',
                //'permissions'
            ])
            expect(resp.name).toEqual("test-story")
            done()
        })
})
