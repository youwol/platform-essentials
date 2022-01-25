import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
AssetsGatewayClient.staticHeaders = { 'py-youwol-local-only': true }

import { FolderNode, ItemNode, StoryNode } from '../../lib/explorer/nodes'
import { take } from 'rxjs/operators'
import { mkDir, cd, shell$, mkStory, expectSnapshot, cut, paste, borrow } from './shell'



beforeEach(async (done) => {
    jest.setTimeout(90 * 1000)
    resetPyYouwolDbs().then(() => {
        done()
    })
})


test(`cut & paste`, (done) => {

    shell$().pipe(
        mkDir('source'),
        expectSnapshot(
            {
                items: (items) => {
                    expect(items.length).toEqual(1)
                    expect(items[0]).toBeInstanceOf(FolderNode)
                    expect(items[0].name).toEqual('source')
                }
            }
        ),
        cd('source'),
        expectSnapshot(
            {
                items: (items) => expect(items.length).toEqual(0)
            }
        ),
        mkStory('my story'),
        expectSnapshot(
            {
                items: (items) => {
                    expect(items.length).toEqual(1)
                    let storyNode = items[0] as StoryNode
                    expect(storyNode.kind).toEqual('story')
                    expect(storyNode.name).toEqual('my story')
                }
            }
        ),
        cut('my story'),
        expectSnapshot(
            {
                items: (items) => {
                    // let cutItemView = items.find( item => item instanceOf CutItemView)
                },
                explorerState: (state) => {
                    expect(state.itemCut.cutType).toEqual('move')
                    expect(state.itemCut.node.name).toEqual('my story')
                }
            }
        ),
        cd('..'),
        expectSnapshot(
            {
                explorerState: (state) => {
                    state.currentFolder$.pipe(
                        take(1),
                    ).subscribe(({ folder }) => {
                        expect(folder.name).toEqual('Home')
                    })
                }
            }
        ),
        paste(),
        expectSnapshot(
            {
                items: (items) => {
                    let pasteItem = items.find(item => item instanceof ItemNode) as StoryNode
                    expect(pasteItem.kind).toEqual('story')
                    expect(pasteItem.name).toEqual('my story')
                    expect(pasteItem.borrowed).toBeFalsy()
                },
                explorerState: (state) => {
                    expect(state.itemCut).toBeFalsy()
                }
            }
        ),
    ).subscribe((shell) => {
        done()
    })
})


test(`borrow & paste`, (done) => {

    shell$().pipe(
        mkDir('source'),
        cd('source'),
        mkStory('my story'),
        borrow('my story'),
        expectSnapshot(
            {
                items: (items) => {
                    // let cutItemView = items.find( item => item instanceOf CutItemView)
                },
                explorerState: (state) => {
                    expect(state.itemCut.cutType).toEqual('borrow')
                    expect(state.itemCut.node.name).toEqual('my story')
                }
            }
        ),
        cd('..'),
        paste(),
        expectSnapshot(
            {
                items: (items) => {
                    let pasteItem = items.find(item => item instanceof ItemNode) as StoryNode
                    expect(pasteItem.kind).toEqual('story')
                    expect(pasteItem.name).toEqual('my story')
                    expect(pasteItem.borrowed).toBeTruthy()
                },
                explorerState: (state) => {
                    expect(state.itemCut).toBeFalsy()
                }
            }
        ),
    ).subscribe((shell) => {
        done()
    })
})
