import { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { Router } from "../../../../router"
import { RequestMonitoring, uploadBlob, downloadBlob } from "../../../../utils"


export class DataRouter extends Router {


    constructor(parent: Router) {
        super(parent.headers, `${parent.basePath}/data`)
    }

    upload(
        folderId: string,
        fileName: string,
        blob: Blob,
        monitoring: RequestMonitoring = {}
    ): Observable<{ itemId: string, name: string, folderId: string }> {

        return uploadBlob(
            `${this.basePath}/assets/data/location/${folderId}`,
            fileName, blob, {}, monitoring
        ).pipe(
            map(resp => ({ itemId: resp.itemId, name: resp.name, folderId: resp.folderId })
            )
        )
    }

    download(
        itemId: string,
        monitoring: RequestMonitoring = {},
        useCache = true
    ): Observable<Blob> {

        return downloadBlob(
            `${this.basePath}/raw/data/${itemId}`,
            itemId, {}, monitoring, undefined, useCache)
    }
    /*
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
    }*/
}
