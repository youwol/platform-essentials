import { AnyFolderNode, AnyItemNode } from './nodes'
import { ExplorerState } from './explorer.state'
import { AssetsBackend } from '@youwol/http-clients'
import { VirtualDOM } from '@youwol/flux-view'

export interface CdnClient {
    install: unknown
}

export interface FluxView {
    child$
    children$
    attr$
}

export interface ContextMenuAction {
    icon: string
    name: string
    authorized: boolean
    exe: () => void | Promise<void>
    applicable: () => boolean | Promise<boolean>
}

export interface AssetPreview {
    icon: string
    name: string
    exe: () => VirtualDOM | Promise<VirtualDOM>
    applicable: () => boolean | Promise<boolean>
}

export interface Application {
    cdnPackage: string
    version: string
    parameters: { [k: string]: string }
    background: VirtualDOM | Promise<VirtualDOM>
    applicable: () => boolean | Promise<boolean>
}

export interface ExplorerSettings {
    contextMenuActions: (params: {
        node: AnyItemNode | AnyFolderNode
        explorer: ExplorerState
        cdnClient: CdnClient
    }) => ContextMenuAction[]

    assetPreviews: (params: {
        asset: AssetsBackend.GetAssetResponse
        cdnClient: CdnClient
        fluxView: FluxView
    }) => AssetPreview[]

    applications: (params: {
        asset: AssetsBackend.GetAssetResponse
        cdnClient: CdnClient
        fluxView: FluxView
    }) => Application[]
}
