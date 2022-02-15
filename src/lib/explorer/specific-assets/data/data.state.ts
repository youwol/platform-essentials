import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject } from 'rxjs'
import { filter } from 'rxjs/operators'
import { TreeGroup } from '../../explorer.state'
import {
    AnyFolderNode,
    ItemNode,
    ProgressMessage,
    ProgressNode,
    UploadStep,
} from '../../nodes'

export class DataState {
    constructor(public readonly userTree: TreeGroup) {}

    static uploadFile$(node: AnyFolderNode, file: File) {
        const url = `/api/assets-gateway/assets/data/location/${node.id}?group-id=${node.groupId}`
        const progress$ = new BehaviorSubject(
            new ProgressMessage(file.name, UploadStep.START),
        )
        const formData = new FormData()
        formData.append('file', file)
        const request = new XMLHttpRequest()

        request.upload.onprogress = (event) => {
            console.log(
                'on-progress',
                file.name,
                (100 * event.loaded) / event.total,
            )
            const message =
                event.loaded == event.total
                    ? new ProgressMessage(
                          file.name,
                          UploadStep.PROCESSING,
                          Math.floor((100 * event.loaded) / event.total),
                      )
                    : new ProgressMessage(
                          file.name,
                          UploadStep.SENDING,
                          Math.floor((100 * event.loaded) / event.total),
                      )
            progress$.next(message)
        }

        request.open('PUT', url, true)

        request.onload = (_e) => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    const resp = JSON.parse(request.responseText)
                    setTimeout(
                        () =>
                            progress$.next(
                                new ProgressMessage(
                                    file.name,
                                    UploadStep.FINISHED,
                                    100,
                                    resp,
                                ),
                            ),
                        500,
                    )
                } else {
                    console.error(request.statusText)
                }
            }
        }
        request.send(formData)
        return progress$
    }

    import(folder: AnyFolderNode, input: HTMLInputElement) {
        const uid = uuidv4()
        folder.addStatus({ type: 'request-pending', id: uid })

        const allProgresses = Array.from(input.files).map((file) => {
            return DataState.uploadFile$(folder, file)
        })
        allProgresses.forEach((progress$, i) => {
            const progressNode = new ProgressNode({
                name: input.files[i].name,
                id: 'progress_' + input.files[i].name,
                progress$,
            })
            this.userTree.addChild(folder.id, progressNode)
        })
        allProgresses.forEach((request) => {
            request
                .pipe(
                    filter((progress) => progress.step == UploadStep.FINISHED),
                )
                .subscribe((progress) => {
                    const uploadNode = this.userTree.getNode(
                        'progress_' + progress.fileName,
                    )
                    this.userTree.removeNode(uploadNode)
                    const child = new ItemNode({
                        treeId: progress.result.treeId,
                        kind: 'data',
                        driveId: folder.driveId,
                        groupId: folder.groupId,
                        name: progress.result.name,
                        assetId: progress.result.assetId,
                        rawId: progress.result.rawId,
                        borrowed: progress.result.borrowed,
                        origin: progress.result.origin,
                    })
                    this.userTree.addChild(folder.id, child)
                })
        })
    }
}
