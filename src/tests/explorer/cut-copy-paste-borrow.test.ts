// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { take } from 'rxjs/operators'
import { FolderNode, ItemNode, StoryNode } from '../../lib/explorer/nodes'
import { resetPyYouwolDbs$ } from '../common'
import {
    borrow,
    cd,
    cut,
    expectSnapshot,
    mkDir,
    mkStory,
    paste,
    shell$,
} from './shell'

beforeEach(async (done) => {
    jest.setTimeout(90 * 1000)
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

test(`cut & paste`, (done) => {
    shell$()
        .pipe(
            mkDir('source'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    expect(items[0]).toBeInstanceOf(FolderNode)
                    expect(items[0].name).toBe('source')
                },
            }),
            cd('source'),
            expectSnapshot({
                items: (items) => expect(items).toHaveLength(0),
            }),
            mkStory('my story'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    const storyNode = items[0] as StoryNode
                    expect(storyNode.kind).toBe('story')
                    expect(storyNode.name).toBe('my story')
                },
            }),
            cut('my story'),
            expectSnapshot({
                items: () => {
                    // let cutItemView = items.find( item => item instanceOf CutItemView)
                },
                explorerState: (state) => {
                    expect(state.itemCut.cutType).toBe('move')
                    expect(state.itemCut.node.name).toBe('my story')
                },
            }),
            cd('..'),
            expectSnapshot({
                explorerState: (state) => {
                    state.currentFolder$
                        .pipe(take(1))
                        .subscribe(({ folder }) => {
                            expect(folder.name).toBe('Home')
                        })
                },
            }),
            paste(),
            expectSnapshot({
                items: (items) => {
                    const pasteItem = items.find(
                        (item) => item instanceof ItemNode,
                    ) as StoryNode
                    expect(pasteItem.kind).toBe('story')
                    expect(pasteItem.name).toBe('my story')
                    expect(pasteItem.borrowed).toBeFalsy()
                },
                explorerState: (state) => {
                    expect(state.itemCut).toBeFalsy()
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})

test(`borrow & paste`, (done) => {
    shell$()
        .pipe(
            mkDir('source'),
            cd('source'),
            mkStory('my story'),
            borrow('my story'),
            expectSnapshot({
                items: () => {
                    // let cutItemView = items.find( item => item instanceOf CutItemView)
                },
                explorerState: (state) => {
                    expect(state.itemCut.cutType).toBe('borrow')
                    expect(state.itemCut.node.name).toBe('my story')
                },
            }),
            cd('..'),
            paste(),
            expectSnapshot({
                items: (items) => {
                    const pasteItem = items.find(
                        (item) => item instanceof ItemNode,
                    ) as StoryNode
                    expect(pasteItem.kind).toBe('story')
                    expect(pasteItem.name).toBe('my story')
                    expect(pasteItem.borrowed).toBeTruthy()
                },
                explorerState: (state) => {
                    expect(state.itemCut).toBeFalsy()
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})
