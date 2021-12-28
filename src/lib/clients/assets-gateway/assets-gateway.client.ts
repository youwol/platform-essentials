import { createObservableFromFetch } from '@youwol/flux-core';
import { Observable, of, Subject } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { Interfaces } from '@youwol/flux-files'
import { DeletedEntityResponse, GroupsResponse, HealthzResponse } from './interfaces';
import { RequestOptions, resolveRequest } from './utils';
import { TreeRouter } from './tree.router';
import { DefaultDriveResponse, DriveId, DriveResponse, DrivesResponse, FolderId, FolderResponse, ItemId, ItemResponse } from './interfaces/tree';




export interface Permissions {
    read: boolean
    write: boolean
}


export interface Asset {

    readonly assetId: string
    readonly rawId: string
    readonly kind: string
    readonly name: string
    readonly groupId: string
    readonly description: string
    readonly images: Array<string>
    readonly thumbnails: Array<string>
    readonly tags: Array<string>
    readonly permissions: Permissions
}

export interface UpdateAssetBody {
    name: string
    tags: string[]
    description: string
}

export interface AccessPolicyBody {
    read: 'forbidden' | 'authorized' | 'expiration-date' | 'owning'
    share: 'forbidden' | 'authorized'
    parameters?: { [key: string]: any }
}

export const UploadStep = {
    START: 'start',
    SENDING: 'sending',
    PROCESSING: 'processing',
    FINISHED: 'finished'
}

export class ProgressMessage {

    fileName: string
    step: string
    percentSent: number
    constructor({ fileName, step, percentSent }: { fileName: string, step: string, percentSent: number }) {
        this.fileName = fileName
        this.step = step
        this.percentSent = percentSent
    }
}

export class EntityNotFoundByName extends Error {

    constructor(
        public readonly entityName: string,
        ...params) {

        super(...params)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, EntityNotFoundByName);
        }
        this.name = 'GroupNotFound';
    }
}

export class AssetsGatewayClient {

    static staticBasePath = "/api/assets-gateway"

    public readonly treeRouter: TreeRouter


    dynamicBasePath: string
    headers = {}

    constructor({
        basePath,
        headers
    }:
        {
            basePath?: string,
            headers?: { [key: string]: string }
        } = {}) {

        this.headers = headers || {}
        this.dynamicBasePath = basePath

        this.treeRouter = new TreeRouter({ rootPath: this.basePath, headers })
    }

    get basePath() {
        return this.dynamicBasePath || AssetsGatewayClient.staticBasePath
    }

    getHeaders(headers = {}) {
        return new Headers({ ...this.headers, ...headers })
    }

    /**
     * Healthz of the service, return "{status:'assets-gateway ok'}" if everything's fine
     * @param events$ optional request's followers
     * @returns response
     */
    queryHealthz(options: RequestOptions = {}): Observable<HealthzResponse> {

        let request = new Request(
            `${this.basePath}/healthz`,
            { method: 'GET', headers: this.getHeaders(options.headers) }
        );
        return resolveRequest(request, 'query', { requestId: "healthz", ...options })
    }

    /**
     * Groups in which the user belong
     * @param options options of the request
     * @returns response
     */
    queryGroups(options: RequestOptions = {}): Observable<GroupsResponse> {

        let request = new Request(
            `${this.basePath}/groups`,
            { method: 'GET', headers: this.getHeaders(options.headers) }
        );
        return resolveRequest(request, 'query', { requestId: "groups", ...options })
    }

    //------------------------------------------
    //  BELOW THIS LINE, METHODS ARE DEPRECATED
    //------------------------------------------

    getGroups(events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>): Observable<GroupsResponse> {

        return this.queryGroups()
    }

    getDrives(
        groupId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<DrivesResponse> {

        let requestGroups = new Request(
            `${this.basePath}/tree/groups/${groupId}/drives`,
            { method: 'GET', headers: this.getHeaders() }
        );

        let follower = new Interfaces.RequestFollower({
            targetId: `${groupId}`,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.QUERY
        })

        return of({}).pipe(
            tap(() => follower.start(1)),
            mergeMap(() => createObservableFromFetch(requestGroups)),
            tap(() => follower.end())
        ) as Observable<DrivesResponse>
    }


    getDefaultUserDrive(): Observable<DefaultDriveResponse> {

        let request = new Request(
            `${this.basePath}/tree/default-drive`,
            { method: 'GET', headers: this.getHeaders() }
        );

        return createObservableFromFetch(request) as Observable<DefaultDriveResponse>
    }

    getDrive(
        groupName: string,
        driveName: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<DriveResponse> {

        let requestGroups = new Request(
            `${this.basePath}/groups`,
            { method: 'GET', headers: this.getHeaders() }
        );

        let follower = new Interfaces.RequestFollower({
            targetId: `${groupName}/${driveName}`,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.DOWNLOAD
        })

        return of({}).pipe(
            tap(() => follower.start(1)),
            mergeMap(() => createObservableFromFetch(requestGroups)),
            map((resp: any) => {
                return resp.groups.find(g => g.path == groupName)
            }),
            tap((grp) => {
                if (!grp)
                    throw new EntityNotFoundByName(groupName, `Can not find the group ${groupName} in user's groups list`)
            }),
            mergeMap((group: any) => {
                let req = new Request(
                    `${this.basePath}/tree/groups/${group.id}/drives`,
                    { method: 'GET', headers: this.getHeaders() }
                );
                return createObservableFromFetch(req)
            }),
            map((resp: { drives: Array<DriveResponse> }) => {
                let drive = resp.drives.find(d => d.name == driveName)
                if (drive) {
                    return drive
                }
                throw new EntityNotFoundByName(driveName, `Drive '${driveName}' not found`)
            }),
            tap(() => follower.end())
        )
    }

    postDrive(
        { name, groupId }: { name: string, groupId: string },
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<DriveResponse> {

        let url = `${this.basePath}/tree/groups/${groupId}/drives`
        let request = new Request(url, { method: 'PUT', body: JSON.stringify({ name }), headers: this.getHeaders() });

        let follower = new Interfaces.RequestFollower({
            targetId: groupId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })
        return of({}).pipe(
            tap(() => follower.start(1)),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => follower.end())
        ) as Observable<DriveResponse>
    }

    postFolder(
        { name, parentFolderId }: { name: string, parentFolderId: string },
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<FolderResponse> {

        let url = `${this.basePath}/tree/folders/${parentFolderId}`
        let request = new Request(url, { method: 'PUT', body: JSON.stringify({ name }), headers: this.getHeaders() });

        let follower = new Interfaces.RequestFollower({
            targetId: parentFolderId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })

        return of({}).pipe(
            tap(() => follower.start(1)),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => follower.end())
        ) as Observable<FolderResponse>
    }

    deleteFolder(
        folderId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<DeletedEntityResponse> {

        let url = `${this.basePath}/tree/folders/${folderId}`
        let request = new Request(url, { method: 'DELETE', headers: this.getHeaders() });
        let follower = new Interfaces.RequestFollower({
            targetId: folderId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.DELETE
        })
        follower.start()

        return createObservableFromFetch(request).pipe(
            map((resp: any) => new DeletedEntityResponse(resp)),
            tap(() => follower.end())
        )
    }

    renameItem(
        itemId: string,
        newName: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<ItemResponse> {

        let url = `${this.basePath}/assets/${itemId}`

        let follower = new Interfaces.RequestFollower({
            targetId: itemId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })

        let request = new Request(url, { method: 'POST', body: JSON.stringify({ name: newName }), headers: this.getHeaders() })

        return of({}).pipe(
            tap(() => follower.start()),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => follower.end())
        ) as Observable<ItemResponse>
    }

    renameFolder(
        itemId: string,
        newName: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>):
        Observable<any> {

        let url = `${this.basePath}/tree/folders/${itemId}`
        let request = new Request(url, { method: 'POST', body: JSON.stringify({ name: newName }), headers: this.getHeaders() })
        let follower = new Interfaces.RequestFollower({
            targetId: itemId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })

        return of({}).pipe(
            tap(() => follower.start()),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => follower.end())
        )
    }

    renameDrive(
        driveId: string,
        newName: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<any> {

        let url = `${this.basePath}/tree/drives/${driveId}`
        let request = new Request(url, { method: 'POST', body: JSON.stringify({ name: newName }), headers: this.getHeaders() })

        let follower = new Interfaces.RequestFollower({
            targetId: driveId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })
        return of({}).pipe(
            tap(() => follower.start()),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => follower.end())
        )
    }

    deleteItem(
        driveId: string,
        itemId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<DeletedEntityResponse> {

        let url = `${this.basePath}/tree/items/${itemId}`
        let request = new Request(url, { method: 'DELETE', headers: this.getHeaders() });

        let follower = new Interfaces.RequestFollower({
            targetId: driveId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.DELETE
        })

        return of({}).pipe(
            tap(() => follower.start()),
            mergeMap(() => createObservableFromFetch(request)),
            map((resp: any) => new DeletedEntityResponse(resp)),
            tap(() => follower.end())
        )
    }

    postFile(
        folderId: string,
        fileName: string,
        blob: Blob,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<{ itemId: string, name: string, folderId: string }> {

        return Interfaces.uploadBlob(
            `${this.basePath}/assets/data/location/${folderId}`,
            fileName, blob, {}, undefined, events$
        ).pipe(
            map(resp => ({ itemId: resp.itemId, name: resp.name, folderId: resp.folderId })
            )
        )
    }

    updateFile(
        driveId: string,
        fileId: string,
        blob: Blob,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<{ itemId: string, name: string, folderId: string }> {

        return Interfaces.uploadBlob(
            `${this.basePath}/drives/${driveId}/files/${fileId}`,
            "name does not matter", blob, {}, fileId, events$
        ).pipe(
            map(resp => ({ itemId: resp.itemId, name: resp.name, folderId: resp.folderId })
            )
        )
    }

    getContent(
        itemId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>,
        useCache = true
    ): Observable<Blob> {

        return Interfaces.downloadBlob(
            `${this.basePath}/raw/data/${itemId}`,
            itemId, {}, events$, undefined, useCache)
    }

    getItem(
        itemId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>,
    ): Observable<ItemResponse> {

        let url = `${this.basePath}/tree/items/${itemId}`
        let request = new Request(url, { method: 'GET', headers: this.getHeaders() });

        let follower = new Interfaces.RequestFollower({
            targetId: itemId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.DOWNLOAD
        })

        return of({}).pipe(
            tap(() => follower.start()),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => follower.end())
        ) as Observable<ItemResponse>
    }

    getItems(
        folderId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ): Observable<{ folders: Array<FolderResponse>, items: Array<ItemResponse> }> {

        let url = `${this.basePath}/tree/folders/${folderId}/children`
        let request = new Request(url, { method: 'GET', headers: this.getHeaders() });

        let follower = new Interfaces.RequestFollower({
            targetId: folderId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.QUERY
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    getAsset(assetId: string): Observable<Asset> {

        let url = `${this.basePath}/assets/${assetId}`
        let request = new Request(url)
        return createObservableFromFetch(request)
    }


    borrowItem(targetTreeId: ItemId | FolderId, destinationTreeId: FolderId | DriveId) {

        let url = `${this.basePath}/tree/${targetTreeId}/borrow`
        let body = { destinationFolderId: destinationTreeId }

        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: this.headers })
        return createObservableFromFetch(request)
    }

    permissions$(
        treeId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>) {

        let url = `/api/assets-gateway/tree/${treeId}/permissions`
        let request = new Request(url, { headers: this.headers })
        let follower = new Interfaces.RequestFollower({
            targetId: treeId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.QUERY
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    accessInfo$(
        assetId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ) {

        let url = `/api/assets-gateway/assets/${assetId}/access`
        let request = new Request(url, { headers: this.headers })
        let follower = new Interfaces.RequestFollower({
            targetId: assetId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.QUERY
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    updateAccess$(
        assetId: string,
        groupId: string,
        body: AccessPolicyBody,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>) {

        let url = `/api/assets-gateway/assets/${assetId}/access/${groupId}`
        let request = new Request(url, { method: 'PUT', body: JSON.stringify(body), headers: this.headers })
        let follower = new Interfaces.RequestFollower({
            targetId: assetId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }


    updateFluxProjectMetadata$(
        rawId: string,
        body,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>) {

        let request = new Request(`/api/assets-gateway/raw/flux-project/${rawId}/metadata`,
            { method: 'POST', body: JSON.stringify(body), headers: this.headers })

        let follower = new Interfaces.RequestFollower({
            targetId: rawId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    getPackageMetadata$(
        rawId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ) {

        let request = new Request(`/api/assets-gateway/raw/package/metadata/${rawId}`, { headers: this.headers })
        let follower = new Interfaces.RequestFollower({
            targetId: rawId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.QUERY
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    getFluxProject$(
        rawId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ) {
        let request = new Request(`/api/assets-gateway/raw/flux-project/${rawId}`, { headers: this.headers })
        let follower = new Interfaces.RequestFollower({
            targetId: rawId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.QUERY
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }


    updateAsset$(
        assetId: string,
        attributes: UpdateAssetBody,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>): Observable<Asset> {

        let body = Object.assign(attributes)
        let url = `/api/assets-gateway/assets/${assetId}`
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: this.headers })
        let follower = new Interfaces.RequestFollower({
            targetId: assetId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    addPicture$(
        assetId: string,
        picture: { id: string, file: File },
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ) {

        var formData = new FormData();
        formData.append('file', picture.file, picture.id)
        let url = `/api/assets-gateway/assets/${assetId}/images/${picture.id}`
        let request = new Request(url, { method: 'POST', body: formData, headers: this.headers })

        let follower = new Interfaces.RequestFollower({
            targetId: assetId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.UPLOAD
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }

    removePicture$(
        assetId: string,
        pictureId: string,
        events$?: Subject<Interfaces.Event> | Array<Subject<Interfaces.Event>>
    ) {

        let url = `/api/assets-gateway/assets/${assetId}/images/${pictureId}`
        let request = new Request(url, { method: 'DELETE', headers: this.headers })

        let follower = new Interfaces.RequestFollower({
            targetId: assetId,
            channels$: events$ ? events$ : [],
            method: Interfaces.Method.DELETE
        })
        return of({}).pipe(
            tap(() => {
                follower.start(1)
            }),
            mergeMap(() => createObservableFromFetch(request)),
            tap(() => {
                follower.end()
            })
        ) as any
    }



    getFolderChildren(groupId: string, driveId: string, folderId: string) {

        let url = `/api/assets-gateway/tree/folders/${folderId}/children`
        let request = new Request(url, { headers: this.headers })

        return createObservableFromFetch(request) as Observable<any>
    }


    getDeletedChildren(groupId: string, driveId: string) {

        let url = `/api/assets-gateway/tree/drives/${driveId}/deleted`
        let request = new Request(url, { headers: this.headers })

        return createObservableFromFetch(request) as Observable<any>

    }

    getUserInfo() {
        let url = `/api/assets-gateway/user-info`
        let request = new Request(url, { headers: this.headers })
        return createObservableFromFetch(request)
    }


    getDefaultDrive(groupId: string) {
        let url = `/api/assets-gateway/tree/groups/${groupId}/default-drive`
        let request = new Request(url, { headers: this.headers })
        return createObservableFromFetch(request)
    }


    purgeDrive(driveId: string) {

        let url = `/api/assets-gateway/tree/drives/${driveId}/purge`
        let request = new Request(url, { method: 'DELETE', headers: this.headers })
        return createObservableFromFetch(request)
    }

    newFolder(nodeId: string, body: { name: string, folderId: string }) {

        let url = `/api/assets-gateway/tree/folders/${nodeId}`

        let request = new Request(url, {
            method: 'PUT', body: JSON.stringify(body),
            headers: this.headers
        })
        return createObservableFromFetch(request)
    }

    move(targetId: string, destinationFolderId: string) {

        let url = `/api/assets-gateway/tree/${targetId}/move`
        let body = { destinationFolderId }

        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: this.headers })
        return createObservableFromFetch(request)
    }

}
