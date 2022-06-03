import { AnyItemNode } from '../explorer'
import { AssetsGateway } from '@youwol/http-clients'
import { install } from '@youwol/cdn-client'
import * as cdnClient from '@youwol/cdn-client'
import { forkJoin, from, Observable, of, ReplaySubject } from 'rxjs'
import { RequestsExecutor } from './requests-executot'
import { map, mergeMap, shareReplay, take } from 'rxjs/operators'
import { ChildApplicationAPI } from './platform.state'

import {
    ApplicationDataValue,
    ApplicationInfo,
    getEnvironmentSingleton,
    Manifest,
    OpenWithParametrization,
} from './environment'

type TInstaller = (installer: Installer) => Promise<Installer>

export function evaluateMatch(
    node: AnyItemNode,
    parametrization: OpenWithParametrization,
) {
    if (typeof parametrization.match == 'string') {
        return new Function(parametrization.match)()(node)
    }
    return Object.entries(parametrization.match).reduce((acc, [k, v]) => {
        return acc && node[k] == v
    }, true)
}

export function evaluateParameters(
    node: AnyItemNode,
    parametrization: OpenWithParametrization,
) {
    if (typeof parametrization.parameters == 'string') {
        return new Function(parametrization.parameters)()(node)
    }
    return Object.entries(parametrization.parameters).reduce((acc, [k, v]) => {
        return { ...acc, [k]: node[v] }
    }, {})
}

export class Installer {
    public readonly libraryManifests = new Set<string>()
    public readonly generatorManifests = new Set<TInstaller>()
    public readonly resolvedManifests = new Set<Manifest>()
    public readonly cdnClient = cdnClient

    static defaultInstallJsScript = `
async function install(installer){
    return installer.with({
        fromLibraries:["@youwol/installers-youwol.youwolDev"]
    })
}
return install
`
    static defaultInstallTsScript = `
import {Installer} from './installer'

async function install(installer: Installer): Promise<Installer> {
    return installer.with({
        fromLibraries:["@youwol/installers-youwol.youwolDev"]
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

    static getInstallerScript$() {
        return RequestsExecutor.getInstallerScript().pipe(
            map(({ jsSrc, tsSrc }) =>
                jsSrc
                    ? { jsSrc, tsSrc }
                    : {
                          jsSrc: Installer.defaultInstallJsScript,
                          tsSrc: Installer.defaultInstallTsScript,
                      },
            ),
        )
    }

    static getInstallManifest$() {
        if (getEnvironmentSingleton().installManifest$) {
            return getEnvironmentSingleton().installManifest$
        }
        getEnvironmentSingleton().installManifest$ =
            new ReplaySubject<Manifest>(1)

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
                console.log('Manifest install', manifest)
                getEnvironmentSingleton().installManifest$.next(manifest)
            })
        return getEnvironmentSingleton().installManifest$
    }

    static getApplicationsInfo$() {
        if (getEnvironmentSingleton().applicationsInfo$) {
            return getEnvironmentSingleton().applicationsInfo$
        }
        getEnvironmentSingleton().applicationsInfo$ = new ReplaySubject<
            ApplicationInfo[]
        >(1)
        this.getInstallManifest$()
            .pipe(
                mergeMap((manifest) => {
                    const client = new AssetsGateway.Client().cdn
                    console.log('Installed Applications', manifest.applications)
                    if (manifest.applications.length == 0) {
                        return of([])
                    }
                    return forkJoin(
                        manifest.applications.map((cdnPackage) => {
                            return client
                                .getResource$({
                                    libraryId: btoa(cdnPackage),
                                    version: 'latest',
                                    restOfPath: '.yw_metadata.json',
                                })
                                .pipe(
                                    map((resp: any) => {
                                        return {
                                            ...resp,
                                            cdnPackage,
                                        } as unknown as ApplicationInfo
                                    }),
                                )
                        }),
                    )
                }),
            )
            .subscribe((d) => {
                getEnvironmentSingleton().applicationsInfo$.next(d)
            })
        return getEnvironmentSingleton().applicationsInfo$
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

    async resolve(
        depth = 0,
        installed: unknown[] = [],
    ): Promise<Manifest | Manifest[]> {
        if (depth == 100) {
            throw Error(
                "Maximum recursion depth reached during installer's resolution",
            )
        }
        // we need to install only first layer => all inner dependencies are fetched by design
        if (depth == 0)
            await install({
                modules: [...this.libraryManifests].map(
                    (path) => path.split('.')[0],
                ),
            })

        const generatorsFromLibs = await Promise.all(
            [...this.libraryManifests].map((libraryPath) => {
                const libraryName = libraryPath.split('.')[0]
                const parent = libraryPath
                    .split('.')
                    .slice(1)
                    .reduce((acc, e) => acc[e], window[libraryName])
                return parent.install
            }),
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
        const resolved = [...this.resolvedManifests, ...generatorManifests]
            .filter((g) => g != undefined)
            .flat()

        if (depth != 0) {
            return resolved
        }
        const resolvedSet = [...new Set(resolved)].filter(
            (value, index, self) =>
                self.map((s) => s.id).indexOf(value.id) === index,
        )
        const id = resolvedSet.map((r) => r.id)
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

function getFlatParametrizationList(appsInfo: ApplicationInfo[]) {
    return appsInfo
        .map((appInfo) =>
            appInfo.execution.parametrized.map((parametrization) => {
                return { appInfo, parametrization }
            }),
        )
        .flat()
}

export function defaultOpeningApp$<T>(assetNode: AnyItemNode): Observable<
    | {
          appInfo: ApplicationInfo
          parametrization: OpenWithParametrization
      }
    | undefined
> {
    return Installer.getApplicationsInfo$().pipe(
        map((appsInfo) => {
            return getFlatParametrizationList(appsInfo).find(
                ({ appInfo, parametrization }) =>
                    evaluateMatch(assetNode, parametrization),
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
}

export function openingApps$<T>(assetNode: AnyItemNode): Observable<
    {
        appInfo: ApplicationInfo
        parametrization: OpenWithParametrization
    }[]
> {
    return Installer.getApplicationsInfo$().pipe(
        map((appsInfo) => {
            return getFlatParametrizationList(appsInfo).filter(
                ({ appInfo, parametrization }) =>
                    evaluateMatch(assetNode, parametrization),
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
}

export function tryOpenWithDefault$(assetNode: AnyItemNode) {
    return defaultOpeningApp$(assetNode).pipe(
        take(1),
        mergeMap((info: { appInfo; parametrization } | undefined) => {
            return info
                ? ChildApplicationAPI.getOsInstance().createInstance$({
                      cdnPackage: info.appInfo.cdnPackage,
                      parameters: evaluateParameters(
                          assetNode,
                          info.parametrization,
                      ),
                      focus: true,
                      version: 'latest',
                  })
                : of(undefined)
        }),
    )
}
