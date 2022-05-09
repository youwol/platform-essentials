import { merge, ReplaySubject } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { ExplorerState } from '../../explorer.state'
import { AnyFolderNode, ItemNode, ProgressNode } from '../../nodes'
import {
    AssetsGateway,
    raiseHTTPErrors,
    RequestEvent,
    FilesBackend,
} from '@youwol/http-clients'

import { reduce, take, tap } from 'rxjs/operators'

type NewAssetResponse =
    AssetsGateway.NewAssetResponse<FilesBackend.UploadResponse>

export class DataState {
    constructor(public readonly explorerState: ExplorerState) {}

    static uploadFile$(node: AnyFolderNode, file: File) {
        const progress$ = new ReplaySubject<RequestEvent>(1)
        const response$ = new ReplaySubject<NewAssetResponse>(1)

        const client = new AssetsGateway.AssetsGatewayClient().files
        client
            .upload$({
                body: { fileName: file.name, content: file },
                queryParameters: { folderId: node.id },
                callerOptions: {
                    monitoring: {
                        channels$: [progress$],
                        requestId: file.name,
                    },
                },
            })
            .pipe(raiseHTTPErrors())
            .subscribe((resp) => {
                response$.next(resp as NewAssetResponse)
            })

        return {
            response$,
            progress$,
        }
    }

    import(folder: AnyFolderNode, input: HTMLInputElement) {
        const uid = uuidv4()
        folder.addStatus({ type: 'request-pending', id: uid })
        const treeState = this.explorerState.groupsTree[folder.groupId]
        const allProgresses = Array.from(input.files).map((file) => {
            return DataState.uploadFile$(folder, file)
        })
        allProgresses.forEach(({ progress$, response$ }, i) => {
            const progressNode = new ProgressNode({
                name: input.files[i].name,
                id: input.files[i].name,
                progress$,
                direction: 'download',
            })
            treeState.addChild(folder.id, progressNode)
        })
        const responses$ = allProgresses.map(({ response$ }) => response$)
        merge(...responses$)
            .pipe(
                tap((response) => {
                    const uploadNode = treeState.getNode(response.name)
                    treeState.removeNode(uploadNode)
                    const child = new ItemNode({
                        ...response,
                        kind: 'data',
                        driveId: folder.driveId,
                        borrowed: false,
                    })
                    treeState.addChild(folder.id, child)
                }),
                take(responses$.length),
                reduce((acc, e) => {
                    return [...acc, e]
                }, []),
            )
            .subscribe((_response) => {
                folder.removeStatus({ type: 'request-pending', id: uid })
            })
    }
}
