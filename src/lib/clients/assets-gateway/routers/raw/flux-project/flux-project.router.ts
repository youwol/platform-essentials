import { Observable } from "rxjs"
import { RawId } from "../../.."
import { Router } from "../../../../router"
import { send$, RequestMonitoring, BodyContentType } from "../../../../utils"
import { Project } from "./interfaces"


export class FluxProjectRouter extends Router {

    constructor({ headers, rootPath }: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(headers, `${rootPath}/flux-project`)
    }

    queryProject$(
        rawId: RawId,
        monitoring: RequestMonitoring = {}
    ): Observable<Project> {

        return this.send$({
            command: 'query',
            path: `${this.basePath}/${rawId}`,
            monitoring
        })
    }

    updateMetadata$(
        rawId: string,
        body,
        monitoring: RequestMonitoring = {}
    ): Observable<{}> {

        return this.send$({
            command: 'update',
            path: `${this.basePath}/${rawId}/metadata`,
            requestOptions: { json: body },
            monitoring
        })
    }
}
