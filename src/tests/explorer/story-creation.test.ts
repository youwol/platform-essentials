// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { StoryNode } from '../../lib/explorer/nodes'
import { resetPyYouwolDbs$ } from '../common'
import {
    expectSnapshot,
    mkStory,
    popupInfo,
    rm,
    selectItem,
    shell$,
} from './shell'

beforeEach((done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

test('Create, info & delete flux application', (done) => {
    const storyName = 'my story'
    shell$()
        .pipe(
            mkStory(storyName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    const fluxNode = items[0] as StoryNode
                    expect(fluxNode.kind).toBe('story')
                    expect(fluxNode.name).toEqual(storyName)
                },
            }),
            selectItem(storyName),
            popupInfo(),
            expectSnapshot({
                assetCardView: (assetCardView) => {
                    expect(assetCardView).toBeTruthy()
                    expect(assetCardView.withTabs.Permissions).toBeTruthy()
                    expect(assetCardView.asset.kind).toBe('story')
                    expect(assetCardView.asset.name).toEqual(storyName)
                },
            }),
            rm(storyName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})
