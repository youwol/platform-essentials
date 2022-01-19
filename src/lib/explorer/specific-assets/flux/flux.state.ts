import { createObservableFromFetch, uuidv4 } from "@youwol/flux-core"
import { AssetsGatewayClient } from "../../../clients/assets-gateway"
import { TreeGroup } from "../../explorer.state"
import { AnyFolderNode, FutureNode, ItemNode } from "../../nodes"

export class FluxState {

    constructor(public readonly userTree: TreeGroup) {

    }
    static newFluxProject$(node: AnyFolderNode) {

        let assetsGtwClient = new AssetsGatewayClient()
        return assetsGtwClient.assets.fluxProject.create$(node.id, { name: "new project", description: "" })
    }

    new(parentNode: AnyFolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new FutureNode({
            name: "new project",
            icon: "fas fa-play",
            request: FluxState.newFluxProject$(parentNode),
            onResponse: (resp, node) => {
                let projectNode = new ItemNode({
                    kind: 'flux-project',
                    treeId: resp.treeId,
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    rawId: resp.rawId,
                    borrowed: false,
                })
                this.userTree.replaceNode(node, projectNode)
            }
        })
        this.userTree.addChild(parentNode.id, node)
    }

}
