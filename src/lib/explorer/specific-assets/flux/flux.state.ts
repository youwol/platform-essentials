import { v4 as uuidv4 } from 'uuid'
import { AssetsGateway } from '@youwol/http-clients'
import { ExplorerState } from '../../explorer.state'
import { AnyFolderNode, FutureItemNode, ItemNode } from '../../nodes'

export class FluxState {
    constructor(public readonly explorerState: ExplorerState) {}
    static newFluxProject$(node: AnyFolderNode) {
        const assetsGtwClient = new AssetsGateway.AssetsGatewayClient()
        return assetsGtwClient.assetsDeprecated.fluxProject.create$(node.id, {
            name: 'new project',
            description: '',
        })
    }

    new(parentNode: AnyFolderNode) {
        const uid = uuidv4()
        const treeState = this.explorerState.groupsTree[parentNode.groupId]
        parentNode.addStatus({ type: 'request-pending', id: uid })
        const node = new FutureItemNode({
            name: 'new project',
            icon: 'fas fa-play',
            request: FluxState.newFluxProject$(parentNode),
            onResponse: (resp, targetNode) => {
                const projectNode = new ItemNode({
                    kind: 'flux-project',
                    treeId: resp.treeId,
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    rawId: resp.rawId,
                    borrowed: false,
                    origin: resp.origin,
                })
                treeState.replaceNode(targetNode, projectNode)
            },
        })
        treeState.addChild(parentNode.id, node)
    }
}
