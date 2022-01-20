import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
import { BrowserNode, FolderNode } from '../../lib/explorer/nodes'
import { cd, cdGroup, expectSnapshot, mkDir, rm, selectItem, shell$ } from './shell'


let FolderSelectedActions = [
    "new folder",
    "new app",
    "new story",
    "paste",
    "import data",
    "refresh",
    "rename",
    "delete",
    "cut",
    "refresh",
]

beforeEach(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})

test('navigation basics', (done) => {

    let newFolderName = 'new folder'
    let expectMyFolder = (item: BrowserNode) => {
        expect(item).toBeInstanceOf(FolderNode)
        expect(item.name).toEqual(newFolderName)
    }

    shell$().pipe(
        mkDir(newFolderName),
        expectSnapshot({
            items: (items) => {
                expect(items.length).toEqual(1)
                expectMyFolder(items[0])
            }
        }),
        selectItem(newFolderName),
        expectSnapshot({
            explorerState: (state) => {
                expect(state.selectedItem$.getValue().name).toEqual(newFolderName)
            },
            actions: (actions) => {
                expect(actions.map(a => a.name)).toEqual(FolderSelectedActions)
            }
        }),
        cd(newFolderName),
        expectSnapshot({
            items: (items) => {
                expect(items.length).toEqual(0)
            }
        }),
        cd('..'),
        expectSnapshot({
            items: (items) => {
                expect(items.length).toEqual(1)
                expectMyFolder(items[0])
            }
        }),
        rm(newFolderName),
        expectSnapshot({
            items: (items) => {
                expect(items.length).toEqual(0)
            }
        }),
        cdGroup('youwol-users')
    ).subscribe(() => {
        done()
    })
})
