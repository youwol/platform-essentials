import { uuidv4 } from '@youwol/flux-core'
import { AssetsGatewayClient } from '../../../clients/assets-gateway'
import { TreeGroup } from '../../explorer.state'
import { AnyFolderNode, FutureNode, ItemNode } from '../../nodes'

export class StoryState {
    constructor(public readonly userTree: TreeGroup) {}

    static newStory$(node: AnyFolderNode) {
        const assetsGtwClient = new AssetsGatewayClient()
        return assetsGtwClient.assets.story.create$(node.id, {
            title: 'new story',
        })
    }

    new(parentNode: AnyFolderNode) {
        const uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        const node = new FutureNode({
            name: 'new story',
            icon: 'fas fa-book',
            request: StoryState.newStory$(parentNode),
            onResponse: (resp, node) => {
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
                })
                this.userTree.replaceNode(node, storyNode)
            },
        })
        this.userTree.addChild(parentNode.id, node)
    }
}
