import { mergeMap } from 'rxjs/operators'
import {
    AssetsGatewayClient,
    ChildrenFolderResponse,
    DefaultDriveResponse,
    DriveResponse,
    DrivesResponse,
    FolderResponse,
    GroupsResponse,
    HealthzResponse,
} from '../../lib/clients/assets-gateway'
import { expectAttributes, resetPyYouwolDbs$ } from '../common'
import '../mock-requests'

const assetsGtw = new AssetsGatewayClient()

beforeAll(async (done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

const privateGrpPath = 'private'
let privateGrpId: string
let defaultDriveId: string
let homeFolderId: string
let newDriveId: string
let workingFolderId: string
const ywUsersGrpPath = '/youwol-users'

test('assetsGtw.getHealthz()', (done) => {
    assetsGtw.getHealthz().subscribe((resp: HealthzResponse) => {
        expect(resp.status).toBe('assets-gateway ok')
        done()
    })
})

test('assetsGtw.queryGroups()', (done) => {
    assetsGtw.queryGroups().subscribe((resp: GroupsResponse) => {
        expect(resp.groups).toHaveLength(2)
        const ywUsersGrp = resp.groups.find((g) => g.path == ywUsersGrpPath)
        expect(ywUsersGrp).toBeTruthy()
        const privateGrp = resp.groups.find((g) => g.path == privateGrpPath)
        expect(privateGrp).toBeTruthy()
        privateGrpId = privateGrp.id
        done()
    })
})

test('assetsGtw.explorer.groups.getDefaultDrive$', (done) => {
    assetsGtw.explorer.groups
        .getDefaultDrive$(privateGrpId)
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
            expect(resp.driveName).toBe('Default drive')
            defaultDriveId = resp.driveId
            homeFolderId = resp.homeFolderId
            done()
        })
})

test('assetsGtw.explorer.groups.queryDrives$', (done) => {
    assetsGtw.explorer.groups
        .queryDrives$(privateGrpId)
        .subscribe((resp: DrivesResponse) => {
            expect(resp.drives).toHaveLength(1)
            const defaultDrive = resp.drives[0]
            expectAttributes(defaultDrive, ['name', 'driveId'])
            expect(defaultDrive.driveId).toEqual(defaultDriveId)
            done()
        })
})

test('assetsGtw.explorer.drives.get$', (done) => {
    assetsGtw.explorer.drives
        .get$(defaultDriveId)
        .subscribe((resp: DriveResponse) => {
            expectAttributes(resp, ['name', 'driveId'])
            done()
        })
})

test('assetsGtw.explorer.folders.queryChildren$ => default folders in default drive', (done) => {
    assetsGtw.explorer.folders
        .queryChildren$(defaultDriveId)
        .subscribe((resp: ChildrenFolderResponse) => {
            expect(resp.folders).toHaveLength(4)
            expect(resp.items).toHaveLength(0)
            done()
        })
})

test('assetsGtw.explorer.groups.createDrive$', (done) => {
    assetsGtw.explorer.groups
        .createDrive$(privateGrpId, { name: 'test drive' })
        .subscribe((resp: DriveResponse) => {
            expectAttributes(resp, ['name', 'driveId', 'groupId'])
            expect(resp.name).toBe('test drive')
            newDriveId = resp.driveId
            done()
        })
})

test('assetsGtw.explorer.folders.create$', (done) => {
    const folderName = 'test folder'
    assetsGtw.explorer.folders
        .create$(homeFolderId, { name: folderName })
        .subscribe((resp: FolderResponse) => {
            expectAttributes(resp, [
                'name',
                'folderId',
                'parentFolderId',
                'driveId',
            ])
            workingFolderId = resp.folderId
            expect(resp.name).toEqual(folderName)
            done()
        })
})

test('assetsGtw.explorer.folders.queryChildren$', (done) => {
    assetsGtw.explorer.folders
        .queryChildren$(homeFolderId)
        .subscribe((resp: ChildrenFolderResponse) => {
            expect(resp.folders).toHaveLength(1)
            expect(resp.items).toHaveLength(0)
            expect(resp.folders[0].folderId).toEqual(workingFolderId)
            done()
        })
})

test('assetsGtw.explorer.folders.delete$', (done) => {
    assetsGtw.explorer.folders
        .delete$(workingFolderId)
        .pipe(
            mergeMap(() => {
                return assetsGtw.explorer.folders.queryChildren$(homeFolderId)
            }),
        )
        .subscribe((resp: ChildrenFolderResponse) => {
            expect(resp.folders).toHaveLength(0)
            expect(resp.items).toHaveLength(0)
            done()
        })
})

test('purge drive', (done) => {
    assetsGtw.explorer.drives.purge$(defaultDriveId).subscribe((resp) => {
        expect(resp.foldersCount).toBe(1)
        done()
    })
})

test('delete drive', (done) => {
    assetsGtw.explorer.drives
        .delete$(newDriveId)
        .pipe(
            mergeMap(() => {
                return assetsGtw.explorer.groups.queryDrives$(privateGrpId)
            }),
        )
        .subscribe((resp: DrivesResponse) => {
            expect(resp.drives.find((d) => d.driveId == newDriveId)).toBeFalsy()
            done()
        })
})
