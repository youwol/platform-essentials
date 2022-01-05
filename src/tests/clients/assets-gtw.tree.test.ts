import '../mock-requests'
import {
    AssetsGatewayClient, DriveResponse, DrivesResponse, GroupsResponse, HealthzResponse,
    ChildrenFolderResponse, DefaultDriveResponse, FolderResponse
} from '../../lib/clients'
import { mergeMap, tap } from 'rxjs/operators'


let pyYouwolBasePath = "http://localhost:3000"

AssetsGatewayClient.staticBasePath = `${pyYouwolBasePath}/api/assets-gateway`

let assetsGtw = new AssetsGatewayClient()

let postmanGroupId: string
let defaultDriveId: string
let workingDriveId: string
let workingFolderId: string

beforeAll(async (done) => {

    fetch(new Request(
        `${pyYouwolBasePath}/admin/environment/configuration/profile`,
        {
            method: "POST",
            body: JSON.stringify({ profile: undefined })
        }
    )).then((resp) => {
        done()
    })
})

function expectAttributes(resp, attributes: Array<string | [string, any]>) {

    attributes.forEach((att) => {
        if (Array.isArray(att))
            expect(resp[att[0]]).toEqual(att[1])
        else
            expect(resp[att]).toBeTruthy()
    })
}

test('query healthz', (done) => {

    assetsGtw.getHealthz().subscribe((resp: HealthzResponse) => {
        expect(resp.status).toEqual('assets-gateway ok')
        done()
    })
})

test('query groups', (done) => {

    let requiredGroups = [
        '/youwol-users/postman-tester'
    ]
    assetsGtw.queryGroups().pipe(
        tap((resp: GroupsResponse) => {
            postmanGroupId = resp.groups.find(g => g.path == requiredGroups[0]).id
        })
    ).subscribe((resp: GroupsResponse) => {

        let filtered = resp.groups.map(g => g.path).filter(p => requiredGroups.includes(p))

        expect(filtered.length).toEqual(requiredGroups.length)
        done()
    })
})

test('query default drive', (done) => {

    assetsGtw.explorer.groups.getDefaultDrive$(postmanGroupId)
        .subscribe((resp: DefaultDriveResponse) => {

            expectAttributes(resp, ['downloadFolderId', 'downloadFolderName', 'driveId', 'driveName', 'groupId', 'homeFolderId', 'homeFolderName'])
            expect(resp.driveName).toEqual('Default drive')
            defaultDriveId = resp.driveId

            done()
        })
})


test('query drives', (done) => {

    assetsGtw.explorer.groups.queryDrives$(postmanGroupId)
        .subscribe((resp: DrivesResponse) => {
            resp.drives.forEach((drive) => {
                expectAttributes(drive, ['name', 'driveId'])
            })
            let drive = resp.drives.find(drive => drive.driveId == defaultDriveId)
            //expect(drive).toBeTruthy()
            done()
        })
})

test('query drive', (done) => {

    assetsGtw.explorer.drives.get$(defaultDriveId)
        .subscribe((resp: DriveResponse) => {
            expectAttributes(resp, ['name', 'driveId'])
            done()
        })
})

test('upload drive', (done) => {

    assetsGtw.explorer.groups
        .createDrive$(postmanGroupId, { name: 'test drive' })
        .subscribe((resp: DriveResponse) => {
            expectAttributes(resp, ['name', 'driveId', 'groupId'])
            workingDriveId = resp.driveId
            expect(resp.name).toEqual('test drive')
            done()
        })
})

test('create folder', (done) => {

    let folderName = 'test folder'
    assetsGtw.explorer.folders
        .create$(workingDriveId, { name: folderName })
        .subscribe((resp: FolderResponse) => {
            expectAttributes(resp, ['name', 'folderId', 'parentFolderId', 'driveId'])
            workingFolderId = resp.folderId
            expect(resp.name).toEqual(folderName)
            done()
        })
})

test('delete folder', (done) => {

    assetsGtw.explorer.folders
        .delete$(workingFolderId).pipe(
            mergeMap(() => {
                // what about eventual consistency
                return assetsGtw.explorer.folders.queryChildren$(workingDriveId)
            })
        )
        .subscribe((resp: ChildrenFolderResponse) => {
            expect(resp.folders.length).toEqual(0)
            expect(resp.items.length).toEqual(0)
            done()
        })
})


test('purge drive', (done) => {

    assetsGtw.explorer.drives
        .purge$(workingDriveId)
        .subscribe((resp) => {
            expect(resp.foldersCount).toEqual(1)
            done()
        })
})


test('delete drive', (done) => {

    assetsGtw.explorer.drives
        .delete$(workingDriveId).pipe(
            mergeMap((resp) => {
                // what about eventual consistency
                return assetsGtw.explorer.groups.queryDrives$(postmanGroupId)
            })
        )
        .subscribe((resp: DrivesResponse) => {
            expect(resp.drives.find(d => d.driveId == workingDriveId)).toBeFalsy()
            done()
        })
})
