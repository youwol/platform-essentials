import {Router} from "../../../../router"
import {RequestMonitoring} from "../../../../utils"


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

    getResource$(
        rawId: string,
        restOfPath: string,
        monitoring: RequestMonitoring = {}
    ) {
        return this.send$({
            command: 'query',
            path: `/${rawId}/${restOfPath}`,
            monitoring
        })
    }
}
