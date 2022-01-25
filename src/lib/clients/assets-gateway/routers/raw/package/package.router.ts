import { Router } from "../../../../router"
import { send$, RequestMonitoring, BodyContentType } from "../../../../utils"


export class PackageRouter extends Router {

    constructor(parent: Router) {
        super(parent.headers, `${parent.basePath}/package`)
    }

    queryMetadata$(
        rawId: string,
        monitoring: RequestMonitoring = {}
    ) {
        return this.send$({
            command: 'query',
            path: `/metadata/${rawId}`,
            monitoring
        })
    }
}
