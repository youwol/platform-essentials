import '../mock-requests'
import {
    getFromDocument,
    queryFromDocument,
    resetPyYouwolDbs$,
} from '../common'
import {
    PackageInfoView,
    PackageLinkSelect,
    PackageVersionSelect,
} from '../../lib/assets/asset-card/asset-specific/package-info.view'
import {
    click,
    expectSnapshot,
    installPackage,
    instrumentSchedulers,
    popupAssetCardView,
    navigateCdnFolder,
    selectTab,
    shell$,
    wait,
} from './shell'
import {
    AssetCardTabsContent,
    AssetCardTabsHeader,
} from '../../lib/assets/asset-card/asset-card.view'
import { AssetOverview } from '../../lib/assets'
import { delay, distinctUntilChanged } from 'rxjs/operators'
import {
    ExplorerView,
    FileView,
    FolderView,
    PathElementView,
} from '../../lib/assets/asset-card/asset-specific/package-explorer.view'

beforeEach((done) => {
    resetPyYouwolDbs$().subscribe(() => {
        document.body.innerHTML = ''
        done()
    })
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

test('packages & version & external reports', (done) => {
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

test('packages & explorer view', (done) => {
    shell$()
        .pipe(
            installPackage({ zipPath: './data/a/a_2.0.0.zip' }),
            popupAssetCardView({
                withTabs: { info: (asset) => new PackageInfoView({ asset }) },
            }),
            selectTab({ tabId: 'info' }),
            instrumentSchedulers(() => {
                const infoView = getFromDocument<PackageInfoView>(
                    `.${PackageInfoView.ClassSelector}`,
                )
                return {
                    links$: infoView.state.links$.pipe(distinctUntilChanged()),
                }
            }),
            wait('links$'),
            delay(0),
            expectSnapshot({
                content: (parent: AssetCardTabsContent & HTMLDivElement) => {
                    expectVersions(parent, [{ name: '2.0.0', selected: true }])
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
            instrumentSchedulers(() => {
                const explorer = getFromDocument<ExplorerView>(
                    `.${ExplorerView.ClassSelector}`,
                )
                return {
                    items$: explorer.state.items$,
                }
            }),
            wait('items$'),
            expectSnapshot({
                content: () => {
                    const files = queryFromDocument<FileView>(
                        `.${FileView.ClassSelector}`,
                    )
                    const folders = queryFromDocument<FolderView>(
                        `.${FolderView.ClassSelector}`,
                    )
                    expect(files).toHaveLength(5)
                    expect(folders).toHaveLength(2)
                },
            }),
            navigateCdnFolder({ path: 'reports' }),
            delay(0),
            expectSnapshot({
                content: () => {
                    const files = queryFromDocument<FileView>(
                        `.${FileView.ClassSelector}`,
                    )
                    const folders = queryFromDocument<FolderView>(
                        `.${FolderView.ClassSelector}`,
                    )
                    expect(files).toHaveLength(2)
                    expect(files.map((f) => f.file)).toEqual([
                        {
                            name: 'bundle-analysis.html',
                            size: 39,
                            encoding: 'identity',
                        },
                        {
                            name: 'coverage.html',
                            size: 32,
                            encoding: 'identity',
                        },
                    ])
                    expect(folders).toHaveLength(0)
                    const pathElements = queryFromDocument<PathElementView>(
                        `.${PathElementView.ClassSelector}`,
                    )
                    expect(pathElements).toHaveLength(2)
                    expect(pathElements[0].name).toEqual('a@2.0.0')
                    expect(pathElements[0].folderPath).toEqual('')
                    expect(pathElements[1].name).toEqual('reports')
                    expect(pathElements[1].folderPath).toEqual('reports')
                },
            }),
            navigateCdnFolder({ path: '..' }),
            delay(0),
            expectSnapshot({
                content: () => {
                    const files = queryFromDocument<FileView>(
                        `.${FileView.ClassSelector}`,
                    )
                    const folders = queryFromDocument<FolderView>(
                        `.${FolderView.ClassSelector}`,
                    )
                    expect(files).toHaveLength(5)
                    expect(folders).toHaveLength(2)

                    const pathElements = queryFromDocument<PathElementView>(
                        `.${PathElementView.ClassSelector}`,
                    )
                    expect(pathElements).toHaveLength(1)
                    expect(pathElements[0].name).toEqual('a@2.0.0')
                    expect(pathElements[0].folderPath).toEqual('')
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})
