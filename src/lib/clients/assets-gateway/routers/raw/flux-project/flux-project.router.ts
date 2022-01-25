import { Observable } from "rxjs"
import { RawId } from "../../.."
import { Router } from "../../../../router"
import { send$, RequestMonitoring, BodyContentType } from "../../../../utils"
import { Project } from "./interfaces"


export class FluxProjectRouter extends Router {

    constructor(parent: Router) {
        super(parent.headers, `${parent.basePath}/flux-project`)
    }

    queryProject$(
        rawId: RawId,
        monitoring: RequestMonitoring = {}
    ): Observable<Project> {

        return this.send$({
            command: 'query',
            path: `/${rawId}`,
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
            path: `/${rawId}/metadata`,
            requestOptions: { json: body },
            monitoring
        })
    }
}
