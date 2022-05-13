import { ExplorerState, AnyFolderNode, AnyItemNode } from '../explorer'
import { AssetsBackend, AssetsGateway } from '@youwol/http-clients'
import { VirtualDOM } from '@youwol/flux-view'
import { install } from '@youwol/cdn-client'
import * as cdnClient from '@youwol/cdn-client'
import { from, ReplaySubject } from 'rxjs'
import { RequestsExecutor } from './requests-executot'
import { map, mergeMap } from 'rxjs/operators'

type Json = any

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

export interface OpeningApplication {
    cdnPackage: string
    parameters: { [k: string]: string }
    applicable: () => boolean | Promise<boolean>
}

export interface Application {
    cdnPackage: string
    version: string
    name: string
    graphics?: {
        background?: VirtualDOM
        iconFile?: VirtualDOM
        iconApp?: VirtualDOM
    }
}

type ApplicationDataValue = { [k: string]: Json[] }

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

    applications?: Application[]

    applicationsData?: {
        [k: string]: ApplicationDataValue
    }
}

type TInstaller = (installer: Installer) => Promise<Installer>

export class Installer {
    public readonly libraryManifests = new Set<string>()
    public readonly generatorManifests = new Set<TInstaller>()
    public readonly resolvedManifests = new Set<Manifest>()
    public readonly cdnClient = cdnClient

    static installManifest$: ReplaySubject<Manifest>

    static defaultInstallJsScript = `
async function install(installer){
    return installer.with({
        fromLibraries:["@youwol/installer-youwol-dev"]
    })
}
return install
`
    static setInstallerScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        RequestsExecutor.saveInstallerScript({ tsSrc, jsSrc }).subscribe()
        new Function(jsSrc)()(new Installer())
            .then((installer) => installer.resolve())
            .then((manifest: Manifest) => {
                Installer.getInstallManifest$().next(manifest)
            })
    }

    static getInstallManifest$() {
        if (Installer.installManifest$) {
            return Installer.installManifest$
        }
        Installer.installManifest$ = new ReplaySubject<Manifest>(1)

        RequestsExecutor.getInstallerScript()
            .pipe(
                map(({ jsSrc }) =>
                    jsSrc
                        ? { jsSrc }
                        : { jsSrc: Installer.defaultInstallJsScript },
                ),
                mergeMap(({ jsSrc }) =>
                    from(Function(jsSrc)()(new Installer())),
                ),
                mergeMap((installer: Installer) => from(installer.resolve())),
            )
            .subscribe((manifest: Manifest) => {
                Installer.installManifest$.next(manifest)
            })
        return Installer.installManifest$
    }

    constructor(
        params: {
            libraryManifests?
            generatorManifests?
            resolvedManifests?
        } = {},
    ) {
        Object.assign(this, params)
    }

    with(resolvableManifests: {
        fromLibraries?: string[]
        fromInstallingFunctions?: TInstaller[]
        fromManifests?: Manifest[]
    }) {
        const libraries = resolvableManifests.fromLibraries || []
        const generators = resolvableManifests.fromInstallingFunctions || []
        const manifests = resolvableManifests.fromManifests || []

        return new Installer({
            libraryManifests: new Set([...this.libraryManifests, ...libraries]),
            generatorManifests: new Set([
                ...this.generatorManifests,
                ...generators,
            ]),
            resolvedManifests: new Set([
                ...this.resolvedManifests,
                ...manifests,
            ]),
        })
    }

    async resolve(depth = 0, installed: unknown[] = []): Promise<Manifest> {
        if (depth == 100) {
            throw Error(
                "Maximum recursion depth reached during installer's resolution",
            )
        }
        // we need to install only first layer => all inner dependencies are fetched by design
        if (depth == 0) await install({ modules: [...this.libraryManifests] })

        const generatorsFromLibs = await Promise.all(
            [...this.libraryManifests].map(
                (libraryName) => window[libraryName].install,
            ),
        )
        const allGenerators = [
            ...this.generatorManifests,
            ...generatorsFromLibs,
        ]
        const generatorManifests = await Promise.all(
            [...new Set(allGenerators)].map((generator) => {
                if (installed.includes(generator)) {
                    return Promise.resolve(undefined)
                }
                installed.push(generator)
                return generator(new Installer()).then((installer) =>
                    installer.resolve(depth + 1, installed),
                )
            }),
        )
        const resolved = [
            ...this.resolvedManifests,
            ...generatorManifests,
        ].filter((g) => g != undefined)

        const resolvedSet = [...new Set(resolved)].filter(
            (value, index, self) =>
                self.map((s) => s.id).indexOf(value.id) === index,
        )

        const id = resolvedSet.map((r) => r.id).flat()

        return {
            id,
            contextMenuActions: (p) =>
                resolvedSet
                    .filter((s) => s.contextMenuActions)
                    .map((s) => s.contextMenuActions(p))
                    .flat(),
            assetPreviews: (p) =>
                resolvedSet
                    .filter((s) => s.assetPreviews)
                    .map((s) => s.assetPreviews(p))
                    .flat(),
            applications: resolvedSet
                .filter((s) => s.applications)
                .map((s) => s.applications)
                .flat(),
            openWithApps: (p) =>
                resolvedSet
                    .filter((s) => s.openWithApps)
                    .map((s) => s.openWithApps(p))
                    .flat(),
            applicationsData: mergeApplicationsData(
                resolvedSet
                    .filter((s) => s.applicationsData)
                    .map((s) => s.applicationsData),
            ),
        }
    }
}

function mergeApplicationsData(data: { [k: string]: ApplicationDataValue }[]) {
    type PackageId = string
    const allPackages = data.map((d) => Object.keys(d)).flat()

    return allPackages.reduce((acc, id: PackageId) => {
        const matchingPackageValues = data
            .filter((d) => d[id] != undefined)
            .map((d) => d[id])
        const allKeys = matchingPackageValues.map((d) => Object.keys(d)).flat()
        const uniques = (d) => {
            return [
                ...new Map(d.map((obj) => [JSON.stringify(obj), obj])).values(),
            ]
        }
        const mergedPackageData = allKeys.reduce((acc2, key) => {
            return {
                ...acc2,
                [key]: uniques(
                    matchingPackageValues
                        .map((pack) => pack[key])
                        .filter((value) => value != undefined)
                        .reduce((acc3, e) => [...acc3, ...e], []),
                ),
            }
        }, {})
        return { ...acc, [id]: mergedPackageData }
    }, {})
}
