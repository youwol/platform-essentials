import { Observable } from "rxjs"
import { DeletedEntityResponse } from "."
import { ChildrenFolderResponse, DefaultDriveResponse, DriveResponse, DrivesResponse, FolderResponse } from "./interfaces/tree"
import { send, RequestOptions } from "./utils"



export class TreeRouter {

    static dedicatedPathDomain = "tree"
    public readonly rootPath: string
    public readonly basePath: string
    public readonly headers: { [key: string]: string }

    constructor(params: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        Object.assign(this, params)
        this.basePath = `${this.rootPath}/${TreeRouter.dedicatedPathDomain}`
    }

    getHeaders(headers = {}) {
        return new Headers({ ...this.headers, ...headers })
    }

    //-------------------------------------------------------
    // Drives
    //-------------------------------------------------------

    /**
     * Drives registered for a particular group
     * @param groupId id of the group
     * @param options
     * @returns response
     */
    queryDrives(
        groupId: string,
        options: RequestOptions = {}
    ): Observable<DrivesResponse> {

        return send(
            'query',
            `${this.basePath}/groups/${groupId}/drives`,
            { method: 'GET', headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * Default drive of a particular group
     * @param groupId id of the group
     * @param options
     * @returns response
     */
    queryDefaultDrive(
        groupId: string,
        options: RequestOptions = {}
    ): Observable<DefaultDriveResponse> {

        return send(
            'query',
            `${this.basePath}/groups/${groupId}/default-drive`,
            { method: 'GET', headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * Drive of particular id
     * @param driveId id of the drive
     * @param options
     * @returns response
     */
    queryDrive(
        driveId: string,
        options: RequestOptions = {}
    ): Observable<DriveResponse> {

        return send(
            'query',
            `${this.basePath}/drives/${driveId}`,
            { method: 'GET', headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * Create a drive
     * @param driveId id of the drive
     * @param options
     * @returns response
     */
    uploadDrive(
        groupId: string,
        body: { name: string },
        options: RequestOptions = {}
    ): Observable<DriveResponse> {

        return send(
            'upload',
            `${this.basePath}/groups/${groupId}/drives`,
            { method: 'PUT', body: JSON.stringify(body), headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * delete a drive
     * @param driveId id of the drive
     * @param options
     * @returns response
     */
    deleteDrive(
        driveId: string,
        options: RequestOptions = {}
    ): Observable<{}> {

        return send(
            'delete',
            `${this.basePath}/drives/${driveId}`,
            { method: 'DELETE', headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * Purge all items of a drive 
     * 
     * @param driveId id of the drive
     * @param options 
     * @returns 
     */
    purgeDrive(
        driveId: string,
        options: RequestOptions = {}
    ): Observable<{ foldersCount: number }> {

        return send(
            'delete',
            `${this.basePath}/drives/${driveId}/purge`,
            { method: 'DELETE', headers: this.getHeaders(options.headers) },
            options
        )
    }

    //-------------------------------------------------------
    // Folders
    //-------------------------------------------------------


    getFolderChildren(
        folderId: string,
        options: RequestOptions = {}
    ): Observable<ChildrenFolderResponse> {
        return send(
            'upload',
            `${this.basePath}/folders/${folderId}/children`,
            { method: 'GET', headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * create a folder
     * @param parentFolderId parent folder id
     * @param options.name name of the folder
     * @returns response
     */
    putFolder(
        parentFolderId: string,
        body: { name: string },
        options: RequestOptions = {}
    ): Observable<FolderResponse> {

        return send(
            'upload',
            `${this.basePath}/folders/${parentFolderId}`,
            { method: 'PUT', body: JSON.stringify(body), headers: this.getHeaders(options.headers) },
            options
        )
    }

    /**
     * delete a folder
     * @param folderId id of the folder
     * @param options
     * @returns response
     */
    deleteFolder(
        folderId: string,
        options: RequestOptions = {}
    ): Observable<{}> {

        return send(
            'delete',
            `${this.basePath}/folders/${folderId}`,
            { method: 'DELETE', headers: this.getHeaders(options.headers) },
            options
        )
    }
}
