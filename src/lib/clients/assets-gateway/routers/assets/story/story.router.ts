import { Observable } from "rxjs"
import { Asset } from "../../.."
import { Router } from "../../../../router"
import { RequestMonitoring } from "../../../../utils"
import { FolderId } from "../../explorer"


export class StoryRouter extends Router {

    constructor(parent: Router) {
        super(parent.headers, `${parent.basePath}/story`)
    }

    create$(
        folderId: FolderId,
        body: { storyId?: string, title: string },
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
