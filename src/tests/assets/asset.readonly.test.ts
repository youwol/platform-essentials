// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { render } from '@youwol/flux-view'
import { Subject } from 'rxjs'
import { AssetCardView, AssetOverview, PackageInfoView } from '../../lib/assets'
import { AssetsGateway } from '@youwol/http-clients'
import {
    createStory,
    getFromDocument,
    queryFromDocument,
    resetPyYouwolDbs$,
} from '../common'

import { distinctUntilChanged } from 'rxjs/operators'
import {
    instrumentSchedulers,
    click,
    expectSnapshot,
    installPackage,
    popupAssetCardView,
    selectTab,
    shell$,
    wait,
} from './shell'
import {
    AssetCardTabsContent,
    AssetCardTabsHeader,
} from '../../lib/assets/asset-card/asset-card.view'
import {
    PackageLinkSelect,
    PackageVersionSelect,
} from '../../lib/assets/asset-card/asset-specific/package-info.view'
import { ExplorerView } from '../../lib/assets/asset-card/asset-specific/package-explorer.view'

let asset: AssetsGateway.Asset
jest.setTimeout(90 * 100000)
beforeAll((done) => {
    resetPyYouwolDbs$()
        .pipe(createStory('test'))
        .subscribe((a) => {
            asset = a
            done()
        })
})

test('create asset card view', (done) => {
    const assetOutput$ = new Subject<AssetsGateway.Asset>()
    const view = new AssetCardView({
        asset,
        actionsFactory: () => ({}),
        assetOutput$,
        forceReadonly: true,
    })
    document.body.appendChild(render(view))
    const elem = getFromDocument<AssetCardView>(
        `.${AssetCardView.ClassSelector}`,
    )
    expect(elem).toBeTruthy()
    done()
})

function expectVersions(parent: HTMLElement, data: { name; selected }[]) {
    const versions = queryFromDocument<HTMLOptionElement>(
        `.${PackageVersionSelect.ClassSelector} option`,
        () => true,
        parent,
    )
    expect(versions).toHaveLength(data.length)
    versions.forEach((v, i) => {
        expect(v.innerText).toBe(data[i].name)
        expect(v.selected).toBe(data[i].selected)
    })
}

function expectReports(parent: HTMLElement, data: { name; selected }[]) {
    const versions = queryFromDocument<HTMLOptionElement>(
        `.${PackageLinkSelect.ClassSelector} option`,
        () => true,
        parent,
    )
    expect(versions).toHaveLength(data.length)
    versions.forEach((v, i) => {
        expect(v.innerText).toBe(data[i].name)
        expect(v.selected).toBe(data[i].selected)
    })
}

function expectContent(parent: HTMLElement, url: string) {
    const iframe = getFromDocument<HTMLIFrameElement>(
        `iframe`,
        () => true,
        parent,
    )

    expect(iframe.src.includes('/api/assets-gateway/raw/package')).toBeTruthy()
    expect(iframe.src.endsWith(url)).toBeTruthy()
}

test('packages & version tab', (done) => {
    shell$()
        .pipe(
            installPackage({ zipPath: './data/a/a_2.0.0.zip' }),
            installPackage({ zipPath: './data/a/a_1.0.0.zip' }),
            popupAssetCardView({
                withTabs: { info: (asset) => new PackageInfoView({ asset }) },
            }),
            expectSnapshot({
                headers: (headers: AssetCardTabsHeader[]) => {
                    expect(headers).toHaveLength(2)
                },
                content: (content: AssetCardTabsContent) => {
                    expect(content.view).toBeInstanceOf(AssetOverview)
                },
            }),
            selectTab({ tabId: 'info' }),
            expectSnapshot({
                content: (content: AssetCardTabsContent) => {
                    expect(content.view).toBeInstanceOf(PackageInfoView)
                },
            }),
            instrumentSchedulers(() => {
                const infoView = getFromDocument<PackageInfoView>(
                    `.${PackageInfoView.ClassSelector}`,
                )
                return {
                    links$: infoView.state.links$.pipe(distinctUntilChanged()),
                }
            }),
            wait('links$'),
            expectSnapshot({
                content: (parent: AssetCardTabsContent & HTMLDivElement) => {
                    expectVersions(parent, [
                        { name: '2.0.0', selected: true },
                        { name: '1.0.0', selected: false },
                    ])
                    expectReports(parent, [
                        { name: 'Explorer', selected: true },
                        { name: 'coverage', selected: false },
                        { name: 'bundle-analysis', selected: false },
                    ])
                    const explorer = getFromDocument(
                        `.${ExplorerView.ClassSelector}`,
                        () => true,
                        parent,
                    )
                    expect(explorer).toBeTruthy()
                },
            }),
            click(`.${PackageLinkSelect.ClassSelector} option:last-child`),
            expectSnapshot({
                content: (parent: AssetCardTabsContent & HTMLDivElement) => {
                    expectReports(parent, [
                        { name: 'Explorer', selected: false },
                        { name: 'coverage', selected: false },
                        { name: 'bundle-analysis', selected: true },
                    ])
                    expectContent(parent, 'reports/bundle-analysis.html')
                },
            }),
            click(`.${PackageVersionSelect.ClassSelector} option:last-child`),
            expectSnapshot({
                content: (parent: AssetCardTabsContent & HTMLDivElement) => {
                    expectVersions(parent, [
                        { name: '2.0.0', selected: false },
                        { name: '1.0.0', selected: true },
                    ])
                },
            }),
            wait('links$'),
            expectSnapshot({
                content: (parent: AssetCardTabsContent & HTMLDivElement) => {
                    expectReports(parent, [
                        { name: 'Explorer', selected: true },
                    ])
                    const iframe = getFromDocument<HTMLIFrameElement>(
                        `iframe`,
                        () => true,
                        parent,
                    )
                    expect(iframe).toBeFalsy()
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})
