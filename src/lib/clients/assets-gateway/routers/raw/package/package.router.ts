import { Router } from "../../../../router"
import { send$, RequestMonitoring, BodyContentType } from "../../../../utils"


export class PackageRouter extends Router {

    constructor({ headers, rootPath }: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(headers, `${rootPath}/package`)
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
