import { Observable } from "rxjs"
import { Asset } from "../../.."
import { Router } from "../../../../router"
import { RequestMonitoring } from "../../../../utils"
import { FolderId } from "../../explorer"


export class FluxProjectRouter extends Router {

    constructor({ headers, rootPath }: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(headers, `${rootPath}/flux-project`)
    }

    create$(
        folderId: FolderId,
        body: { name: string, description: string },
        monitoring: RequestMonitoring = {}
    ): Observable<Asset> {

        return this.send$({
            command: 'create',
            path: `/location/${folderId}`,
            requestOptions: { json: body },
            monitoring
        })
    }
}
