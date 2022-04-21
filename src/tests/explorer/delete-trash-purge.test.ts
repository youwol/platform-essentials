// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { resetPyYouwolDbs$ } from '../common'

import {
    cd,
    deleteDrive,
    expectSnapshot,
    mkDir,
    mkFluxApp,
    purgeTrash,
    refresh,
    rm,
    selectItem,
    Shell,
    shell$,
} from './shell'
import { AnyItemNode } from '../../lib/explorer/nodes'
import { mapTo, mergeMap } from 'rxjs/operators'
import { RequestsExecutor } from '../../lib/explorer/requests-executor'

beforeEach((done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

// eslint-disable-next-line jest/expect-expect -- eslint-comment there are tests in each step
test('delete drive', (done) => {
    shell$()
        .pipe(cd('..'), cd('..'), selectItem('Default drive'), deleteDrive())
        .subscribe(() => {
            done()
        })
})

// eslint-disable-next-line jest/expect-expect -- eslint-comment there are tests in each step
test('Create, delete, clear trash & purge drive', (done) => {
    const projectName = 'my flux-app'
    shell$()
        .pipe(
            mkDir('test folder'),
            cd('test folder'),
            mkFluxApp(projectName),
            cd('..'),
            rm('test folder'),
            cd('..'),
            cd('Trash'),
            purgeTrash(),
            cd('..'),
            cd('..'),
            selectItem('Default drive'),
            deleteDrive(),
        )
        .subscribe(() => {
            done()
        })
})

test('delete after trash already visited', (done) => {
    const projectName = 'my flux-app'

    class ShellData {
        constructor(public readonly deletedAsset: AnyItemNode) {}
    }
    shell$()
        .pipe(
            cd('..'),
            cd('Trash'),
            cd('..'),
            cd('Home'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
            mkFluxApp(projectName, (shell, asset) => {
                return new ShellData(asset)
            }),
            rm(projectName),
            cd('..'),
            cd('Trash'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})

test('refresh', (done) => {
    const projectName = 'my flux-app'

    class ShellData {
        constructor(public readonly deletedAsset: AnyItemNode) {}
    }
    function expectEmptyTrashSnapShot() {
        return expectSnapshot({
            items: (items) => {
                expect(items).toHaveLength(0)
            },
            actions: (actions) => {
                expect(actions).toHaveLength(2)
                expect(
                    actions.map((a) => a.name).includes('clear trash'),
                ).toBeTruthy()
                expect(
                    actions.map((a) => a.name).includes('refresh'),
                ).toBeTruthy()
            },
        })
    }
    shell$<ShellData>()
        .pipe(
            cd('..'),
            cd('Trash'),
            expectEmptyTrashSnapShot(),
            cd('..'),
            cd('Home'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
            mkFluxApp(projectName, (shell, asset) => {
                return new ShellData(asset)
            }),
            // selection to make sure actions from this item is not leaking afterward
            selectItem(projectName),
            mergeMap((shell: Shell<ShellData>) => {
                // This request is to delete 'silently' one item
                return RequestsExecutor.deleteItem(
                    shell.context.deletedAsset,
                ).pipe(mapTo(shell))
            }),
            cd('..'),
            cd('Trash'),
            expectEmptyTrashSnapShot(),
            refresh(),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})
