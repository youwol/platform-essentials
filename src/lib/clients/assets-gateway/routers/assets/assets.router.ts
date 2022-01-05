import { Observable } from "rxjs"
import { } from "../.."
import { Router } from "../../../router"
import { RequestMonitoring } from "../../../utils"
import { AccessInfo, ExposingGroup, AccessPolicyBody, Asset, UpdateAssetBody } from "./interfaces"


export class AssetsRouter extends Router {

    constructor(params: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(params.headers, `${params.rootPath}/assets`)
    }


    get$(
        assetId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<Asset> {

        return this.send$({
            command: 'query',
            path: `/${assetId}`,
            monitoring
        })
    }

    getAccess$(
        assetId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<AccessInfo> {

        return this.send$({
            command: 'query',
            path: `/${assetId}/access`,
            monitoring
        })
    }

    updateAccess$(
        assetId: string,
        groupId: string,
        body: AccessPolicyBody,
        monitoring: RequestMonitoring = {}
    ): Observable<ExposingGroup> {

        return this.send$({
            command: 'update',
            path: `/${assetId}/access/${groupId}`,
            requestOptions: { method: 'PUT', json: body },
            monitoring
        })
    }

    update$(
        assetId: string,
        body: UpdateAssetBody,
        monitoring: RequestMonitoring = {}
    ): Observable<Asset> {

        return this.send$({
            command: 'update',
            path: `/${assetId}`,
            requestOptions: { json: body },
            monitoring
        })
    }

    addPicture$(
        assetId: string,
        picture: { id: string, file: File },
        monitoring: RequestMonitoring = {}
    ): Observable<Asset> {

        let formData = new FormData();
        formData.append('file', picture.file, picture.id)

        return this.send$({
            command: 'create',
            path: `/${assetId}`,
            requestOptions: { body: formData },
            monitoring
        })
    }

    removePicture$(
        assetId: string,
        pictureId: string,
        monitoring: RequestMonitoring = {}
    ): Observable<Asset> {

        return this.send$({
            command: 'delete',
            path: `/${assetId}/images/${pictureId}`,
            monitoring
        })
    }

}
