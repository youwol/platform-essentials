import { VirtualDOM } from '@youwol/flux-view'
import { AnyFolderNode, AnyItemNode, ExplorerState } from '../explorer'
import { AssetsBackend, AssetsGateway } from '@youwol/http-clients'
import { ReplaySubject } from 'rxjs'

type url = string

export function getEnvironmentSingleton(): IEnvironment {
    return parent['@youwol/platform-essentials'].Core.Environment != Environment
        ? parent['@youwol/platform-essentials'].Core.getEnvironmentSingleton()
        : Environment
}

export class IEnvironment {
    installManifest$: ReplaySubject<Manifest>
    applicationsInfo$: ReplaySubject<ApplicationInfo[]>
    preferences$: ReplaySubject<Preferences>
}

export class Environment {
    static installManifest$: ReplaySubject<Manifest>
    static applicationsInfo$: ReplaySubject<ApplicationInfo[]>
    static preferences$: ReplaySubject<Preferences>
}

export interface CdnClient {}

export interface FluxView {}

export interface Preferences {
    profile: Profile
    cssTheme: url
    desktop: Desktop
}

export interface Profile {
    avatar: VirtualDOM
}

export interface Desktop {
    backgroundView: VirtualDOM
    topBannerView: VirtualDOM
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

export interface OpeningApplication {
    cdnPackage: string
    parameters: { [k: string]: string }
    applicable: () => boolean | Promise<boolean>
}

export interface Application {
    cdnPackage: string
    version: string
    name: string
    standalone: boolean
    disabled?: boolean
    graphics?: {
        background?: VirtualDOM
        iconFile?: VirtualDOM
        iconApp?: VirtualDOM
    }
}

export type ApplicationDataValue = { [k: string]: unknown[] }

export interface Manifest {
    id: string | string[]

    contextMenuActions?: (params: {
        node: AnyItemNode | AnyFolderNode
        explorer: ExplorerState
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
    }) => ContextMenuAction[]

    assetPreviews?: (params: {
        asset: AssetsBackend.GetAssetResponse
        cdnClient: CdnClient
        assetsGtwClient: AssetsGateway.AssetsGatewayClient
        fluxView: FluxView
    }) => AssetPreview[]

    openWithApps?: (params: {
        node: AnyItemNode | AnyFolderNode
    }) => OpeningApplication[]

    applications?: string[]

    applicationsData?: {
        [k: string]: ApplicationDataValue
    }
}

export interface OpenWithParametrization {
    name?: string
    match: { [k: string]: string } | string
    parameters: { [k: string]: string } | string
}

export interface AppExecutionInfo {
    standalone: boolean
    parametrized: OpenWithParametrization[]
}

export interface ApplicationInfo {
    cdnPackage: string
    displayName: string
    graphics?: {
        background?: VirtualDOM
        fileIcon?: VirtualDOM
        appIcon?: VirtualDOM
    }
    execution: AppExecutionInfo
}
