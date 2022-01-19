import '../mock-requests'
import {
    AssetsGatewayClient, DriveResponse, DrivesResponse, GroupsResponse, HealthzResponse,
    ChildrenFolderResponse, DefaultDriveResponse, FolderResponse
} from '../../lib/clients'
import { mergeMap } from 'rxjs/operators'
import { expectAttributes, getPyYouwolBasePath, resetPyYouwolDbs } from '../common'


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

            expect(resp.groups.length).toEqual(2)
            let ywUsersGrp = resp.groups.find(g => g.path == ywUsersGrpPath)
            expect(ywUsersGrp).toBeTruthy()
            let privateGrp = resp.groups.find(g => g.path == privateGrpPath)
            expect(privateGrp).toBeTruthy()
            privateGrpId = privateGrp.id
            done()
        })
})


test('assetsGtw.explorer.groups.getDefaultDrive$', (done) => {

    assetsGtw.explorer.groups.getDefaultDrive$(privateGrpId)
        .subscribe((resp: DefaultDriveResponse) => {

            expectAttributes(resp, [
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
            expect(resp.driveName).toEqual('Default drive')
            defaultDriveId = resp.driveId
            homeFolderId = resp.homeFolderId
            done()
        })
})


test('assetsGtw.explorer.groups.queryDrives$', (done) => {

    assetsGtw.explorer.groups.queryDrives$(privateGrpId)
        .subscribe((resp: DrivesResponse) => {
            expect(resp.drives.length).toEqual(1)
            let defaultDrive = resp.drives[0]
            expectAttributes(defaultDrive, ['name', 'driveId'])
            expect(defaultDrive.driveId).toEqual(defaultDriveId)
            done()
        })
})


test('assetsGtw.explorer.drives.get$', (done) => {

    assetsGtw.explorer.drives.get$(defaultDriveId)
        .subscribe((resp: DriveResponse) => {
            expectAttributes(resp, ['name', 'driveId'])
            done()
        })
})



test('assetsGtw.explorer.folders.queryChildren$ => default folders in default drive', (done) => {

    assetsGtw.explorer.folders.queryChildren$(defaultDriveId)
        .subscribe((resp: ChildrenFolderResponse) => {
            expect(resp.folders.length).toEqual(4)
            expect(resp.items.length).toEqual(0)
            done()
        })
})


test('assetsGtw.explorer.groups.createDrive$', (done) => {

    assetsGtw.explorer.groups.createDrive$(privateGrpId, { name: 'test drive' })
        .subscribe((resp: DriveResponse) => {
            expectAttributes(resp, ['name', 'driveId', 'groupId'])
            expect(resp.name).toEqual('test drive')
            newDriveId = resp.driveId
            done()
        })
})

test('assetsGtw.explorer.folders.create$', (done) => {

    let folderName = 'test folder'
    assetsGtw.explorer.folders.create$(homeFolderId, { name: folderName })
        .subscribe((resp: FolderResponse) => {
            expectAttributes(resp, ['name', 'folderId', 'parentFolderId', 'driveId'])
            workingFolderId = resp.folderId
            expect(resp.name).toEqual(folderName)
            done()
        })
})


test('assetsGtw.explorer.folders.queryChildren$', (done) => {

    assetsGtw.explorer.folders.queryChildren$(homeFolderId)
        .subscribe((resp: ChildrenFolderResponse) => {
            expect(resp.folders.length).toEqual(1)
            expect(resp.items.length).toEqual(0)
            expect(resp.folders[0].folderId).toEqual(workingFolderId)
            done()
        })
})

test('assetsGtw.explorer.folders.delete$', (done) => {

    assetsGtw.explorer.folders.delete$(workingFolderId).pipe(
        mergeMap(() => {
            return assetsGtw.explorer.folders.queryChildren$(homeFolderId)
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
        .purge$(defaultDriveId)
        .subscribe((resp) => {
            expect(resp.foldersCount).toEqual(1)
            done()
        })
})


test('delete drive', (done) => {

    assetsGtw.explorer.drives
        .delete$(newDriveId).pipe(
            mergeMap(() => {
                return assetsGtw.explorer.groups.queryDrives$(privateGrpId)
            })
        )
        .subscribe((resp: DrivesResponse) => {
            expect(resp.drives.find(d => d.driveId == newDriveId)).toBeFalsy()
            done()
        })
})


