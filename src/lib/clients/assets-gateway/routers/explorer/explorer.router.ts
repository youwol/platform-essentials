import { Observable } from "rxjs"
import { DeletedEntityResponse } from "../.."
import { ChildrenFolderResponse, DefaultDriveResponse, DriveId, DriveResponse, DrivesResponse, FolderId, FolderResponse, ItemId, ItemResponse } from "./interfaces"
import { RequestMonitoring } from "../../../utils"
import { Router } from "../../../router"


export class GroupsRouter extends Router {

    constructor(params: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(params.headers, `${params.rootPath}/groups`)
    }

    /**
     * Drives registered for a particular group
     * @param groupId id of the group
     * @param options
     * @returns response
     */
    queryDrives$(
        groupId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<DrivesResponse> {

        return this.send$({
            command: 'query',
            path: `/${groupId}/drives`,
            monitoring
        })
    }


    /**
     * Default drive of a particular group
     * @param groupId id of the group
     * @param options
     * @returns response
     */
    getDefaultDrive$(
        groupId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<DefaultDriveResponse> {

        return this.send$({
            command: 'query',
            path: `/${groupId}/default-drive`,
            monitoring
        })
    }

    /**
     * Create a drive
     * @param driveId id of the drive
     * @param options
     * @returns response
     */
    createDrive$(
        groupId: string,
        body: { name: string },
        monitoring: RequestMonitoring = {}
    ): Observable<DriveResponse> {

        return this.send$({
            command: 'create',
            path: `/${groupId}/drives`,
            requestOptions: { json: body },
            monitoring
        })
    }


}


export class DrivesRouter extends Router {

    constructor(params: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(params.headers, `${params.rootPath}/drives`)
    }

    /**
     * Drive of particular id
     * @param driveId id of the drive
     * @param options
     * @returns response
     */
    get$(
        driveId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<DriveResponse> {

        return this.send$({
            command: 'query',
            path: `/${driveId}`,
            monitoring
        })
    }


    /**
     * delete a drive
     * @param driveId id of the drive
     * @param options
     * @returns response
     */
    delete$(
        driveId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<{}> {

        return this.send$({
            command: 'delete',
            path: `/${driveId}`,
            monitoring
        })
    }

    /**
     * Purge all items of a drive 
     * 
     * @param driveId id of the drive
     * @param options 
     * @returns 
     */
    purge$(
        driveId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<{ foldersCount: number }> {

        return this.send$({
            command: 'delete',
            path: `/${driveId}/purge`,
            monitoring
        })
    }


    rename$(
        driveId: string,
        body: { name: string },
        monitoring: RequestMonitoring = {}
    ): Observable<DriveResponse> {

        return this.send$({
            command: 'update',
            path: `/${driveId}`,
            requestOptions: { json: body },
            monitoring
        })
    }

    queryDeletedItems$(
        driveId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<ChildrenFolderResponse> {

        return this.send$({
            command: 'query',
            path: `/${driveId}/deleted`,
            monitoring
        })
    }

}


export class FoldersRouter extends Router {

    constructor(params: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(params.headers, `${params.rootPath}/folders`)
    }

    queryChildren$(
        folderId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<ChildrenFolderResponse> {

        return this.send$({
            command: 'query',
            path: `/${folderId}/children`,
            monitoring
        })
    }

    /**
     * create a folder
     * @param parentFolderId parent folder id
     * @param options.name name of the folder
     * @returns response
     */
    create$(
        parentFolderId: string,
        body: { name: string },
        monitoring: RequestMonitoring = {}
    ): Observable<FolderResponse> {

        return this.send$({
            command: 'create',
            path: `/${parentFolderId}`,
            requestOptions: { json: body },
            monitoring
        })
    }

    /**
     * delete a folder
     * @param folderId id of the folder
     * @param options
     * @returns response
     */
    delete$(
        folderId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<{}> {

        return this.send$({
            command: 'delete',
            path: `/${folderId}`,
            monitoring
        })
    }

    rename$(
        folderId: FolderId,
        body: { name: string },
        monitoring: RequestMonitoring = {}
    ): Observable<FolderResponse> {

        return this.send$({
            command: 'update',
            path: `/${folderId}`,
            requestOptions: { json: body },
            monitoring
        })
    }
}


export class ItemsRouter extends Router {

    constructor({ headers, rootPath }: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(headers, `${rootPath}/items`)
    }


    /**
     * Retrieve item of particular id
     * @param itemId id of the item
     * @param options
     * @returns response
     */
    get$(
        itemId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<ItemResponse> {

        return this.send$({
            command: 'query',
            path: `/${itemId}`,
            monitoring
        })
    }


    delete$(
        itemId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<DeletedEntityResponse> {

        return this.send$({
            command: 'delete',
            path: `/${itemId}`,
            monitoring
        })
    }
}

export class ExplorerRouter extends Router {

    public readonly groups: GroupsRouter
    public readonly drives: DrivesRouter
    public readonly folders: FoldersRouter
    public readonly items: ItemsRouter


    constructor({ headers, rootPath }: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(headers, `${rootPath}/tree`)
        this.groups = new GroupsRouter({ headers, rootPath: this.basePath })
        this.drives = new DrivesRouter({ headers, rootPath: this.basePath })
        this.folders = new FoldersRouter({ headers, rootPath: this.basePath })
        this.items = new ItemsRouter({ headers, rootPath: this.basePath })
    }

    /**
     * Query the default drive of the user.
     * 
     * @param options 
     * @returns 
     */
    getDefaultUserDrive$(
        monitoring: RequestMonitoring = {}
    ): Observable<DefaultDriveResponse> {

        return this.send$({
            command: 'query',
            path: `/default-drive`,
            monitoring
        })
    }

    /**
     * Create a symbolic link of folder or item
     * @param targetId id of the item of the folder
     * @param body.destination id of the destination folder/drive
     * @param options
     * @returns response
     */
    borrowItem$(
        targetId: ItemId | FolderId,
        body: { destinationFolderId: FolderId | DriveId },
        monitoring: RequestMonitoring = {}
    ): Observable<ItemResponse> {

        return this.send$({
            command: 'create',
            path: `/${targetId}/borrow`,
            requestOptions: { method: 'POST', json: body },
            monitoring
        })
    }

    getPermissions$(
        treeId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<ItemResponse> {


        return this.send$({
            command: 'query',
            path: `/${treeId}/permissions`,
            monitoring
        })
    }

    move$(
        targetId: ItemId | FolderId,
        body: { destinationFolderId: FolderId | DriveId },
        monitoring: RequestMonitoring = {}
    ): Observable<ChildrenFolderResponse> {

        return this.send$({
            command: 'update',
            path: `/${targetId}/move`,
            requestOptions: { json: body },
            monitoring
        })
    }
}
