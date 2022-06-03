import { AssetsGateway, PyYouwol, raiseHTTPErrors } from '@youwol/http-clients'
import { map, mergeMap } from 'rxjs/operators'
import { forkJoin, Observable } from 'rxjs'

export function getPyYouwolBasePath() {
    return 'http://localhost:2001'
}

export function resetPyYouwolDbs$() {
    const youwol = new PyYouwol.Client()
    const gtw = new AssetsGateway.Client()
    return youwol.admin.environment
        .login$({ body: { email: 'int_tests_yw-users@test-user' } })
        .pipe(
            mergeMap(() =>
                forkJoin([
                    youwol.admin.customCommands.doGet$({ name: 'reset' }),
                    gtw.explorerDeprecated
                        .getDefaultUserDrive$()
                        .pipe(raiseHTTPErrors()),
                ]),
            ),
            map(([_, userDrive]) => {
                return userDrive
            }),
        )
}

export function createStory(
    title: string,
): (src: Observable<unknown>) => Observable<AssetsGateway.Asset> {
    const client = new AssetsGateway.Client()
    return (source$: Observable<unknown>) => {
        return source$.pipe(
            mergeMap(() => client.explorerDeprecated.getDefaultUserDrive$()),
            raiseHTTPErrors(),
            mergeMap((drive: AssetsGateway.DefaultDriveResponse) =>
                client.assetsDeprecated.story
                    .create$(drive.homeFolderId, {
                        title,
                    })
                    .pipe(raiseHTTPErrors()),
            ),
        )
    }
}

export function expectAttributes(
    resp,
    attributes: Array<string | [string, unknown]>,
) {
    attributes.forEach((att) => {
        if (Array.isArray(att)) {
            expect(resp[att[0]]).toEqual(att[1])
        } else {
            expect(resp[att]).toBeTruthy()
        }
    })
}

type VDomType<U, T> = U & T & { vDom: T }

export function getFromDocument<T, U = HTMLDivElement>(
    selector: string,
    findFct: (d: VDomType<U, T>) => boolean = () => true,
    parent?: HTMLElement | Document,
): VDomType<U, T> {
    parent = parent || document
    const views = parent.querySelectorAll(selector) as unknown as VDomType<
        U,
        T
    >[]
    return Array.from(views).find((t) => findFct(t)) as unknown as VDomType<
        U,
        T
    >
}

export function queryFromDocument<T, U = HTMLDivElement>(
    selector: string,
    filterFct: (d: VDomType<U, T>) => boolean = () => true,
    parent?: HTMLElement | Document,
): VDomType<U, T>[] {
    parent = parent || document
    const views = parent.querySelectorAll(selector) as unknown as VDomType<
        U,
        T
    >[]
    return Array.from(views).filter((v: VDomType<U, T>) =>
        filterFct(v),
    ) as unknown as VDomType<U, T>[]
}

export function createRemoteFolder$(youwolClient, parentFolderId, name) {
    return youwolClient.admin.customCommands.doPost$('create-remote-folder', {
        parentFolderId: parentFolderId,
        name: name,
        folderId: name,
    })
}
