import { v4 as uuidv4 } from 'uuid'
import { AssetsGateway } from '@youwol/http-clients'
import { TreeGroup } from '../../explorer.state'
import { AnyFolderNode, FutureItemNode, ItemNode } from '../../nodes'

export class StoryState {
    constructor(public readonly userTree: TreeGroup) {}

    static newStory$(node: AnyFolderNode) {
        const assetsGtwClient = new AssetsGateway.AssetsGatewayClient()
        return assetsGtwClient.assetsDeprecated.story.create$(node.id, {
            title: 'new story',
        })
    }

    new(parentNode: AnyFolderNode) {
        const uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        const node = new FutureItemNode({
            name: 'new story',
            icon: 'fas fa-book',
            request: StoryState.newStory$(parentNode),
            onResponse: (resp, targetNode) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                const storyNode = new ItemNode({
                    treeId: resp.treeId,
                    kind: 'story',
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    rawId: resp.rawId,
                    borrowed: false,
                    origin: resp.origin,
                })
                this.userTree.replaceNode(targetNode, storyNode)
            },
        })
        this.userTree.addChild(parentNode.id, node)
    }
}
