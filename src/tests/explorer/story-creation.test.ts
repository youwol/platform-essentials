import { StoryNode } from '../../lib/explorer/nodes'
import { resetPyYouwolDbs$ } from '../common'
import '../mock-requests'
import {
    expectSnapshot,
    mkStory,
    popupInfo,
    rm,
    selectItem,
    shell$,
} from './shell'

beforeEach(async (done) => {
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
