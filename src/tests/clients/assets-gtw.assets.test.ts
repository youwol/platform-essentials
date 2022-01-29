import '../mock-requests'
import {
    Asset,
    AssetsGatewayClient,
    DefaultDriveResponse,
    GroupsResponse,
    HealthzResponse
} from '../../lib/clients/assets-gateway'
import {expectAttributes, resetPyYouwolDbs$} from '../common'


let assetsGtw = new AssetsGatewayClient()


beforeAll(async (done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

let privateGrpPath = "private"
let privateGrpId: string
let homeFolderId: string

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
