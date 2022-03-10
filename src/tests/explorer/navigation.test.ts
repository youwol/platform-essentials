// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { BrowserNode, FolderNode } from '../../lib/explorer/nodes'
import { resetPyYouwolDbs$ } from '../common'
import {
    cd,
    cdGroup,
    expectSnapshot,
    mkDir,
    rm,
    selectItem,
    shell$,
} from './shell'

const FolderSelectedActions = [
    'new folder',
    'new app',
    'new story',
    'paste',
    'import data',
    'refresh',
    'rename',
    'delete',
    'cut',
    'refresh',
]

beforeEach(async (done) => {
    jest.setTimeout(90 * 1000)
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

test('navigation basics', (done) => {
    const newFolderName = 'new folder'
    const expectMyFolder = (item: BrowserNode) => {
        expect(item).toBeInstanceOf(FolderNode)
        expect(item.name).toEqual(newFolderName)
    }

    shell$()
        .pipe(
            mkDir(newFolderName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    expectMyFolder(items[0])
                },
            }),
            selectItem(newFolderName),
            expectSnapshot({
                explorerState: (state) => {
                    expect(state.selectedItem$.getValue().name).toEqual(
                        newFolderName,
                    )
                },
                actions: (actions) => {
                    expect(actions.map((a) => a.name)).toEqual(
                        FolderSelectedActions,
                    )
                },
            }),
            cd(newFolderName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
            cd('..'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    expectMyFolder(items[0])
                },
            }),
            rm(newFolderName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
            cdGroup('youwol-users'),
        )
        .subscribe(() => {
            done()
        })
})
