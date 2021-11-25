import { createObservableFromFetch, uuidv4 } from "@youwol/flux-core"
import { TreeGroup } from "../../platform.state"
import { AnyFolderNode, DataNode, FutureNode, ItemNode } from "../../nodes"


export class StoryState {

    constructor(public readonly userTree: TreeGroup) {
    }

    static newStory$(node: AnyFolderNode) {

        let url = `/api/assets-gateway/assets/story/location/${node.id}`
        let request = new Request(url, { method: 'PUT', headers: {} })
        return createObservableFromFetch(request)
    }

    new(parentNode: AnyFolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new FutureNode({
            name: "new story",
            icon: "fas fa-book",
            request: StoryState.newStory$(parentNode),
            onResponse: (resp, node) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                let storyNode = new ItemNode({
                    treeId: resp.treeId,
                    kind: 'story',
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    rawId: resp.rawId,
                    borrowed: false,
                })
                this.userTree.replaceNode(node, storyNode)
            }
        })
        this.userTree.addChild(parentNode.id, node)
    }

    read(node: DataNode) {
        window.open(`/ui/stories/?id=${node.rawId}`, '_blank').focus();
    }

}
