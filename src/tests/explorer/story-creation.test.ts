import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
import { StoryNode } from '../../lib/explorer/nodes'
import { expectSnapshot, mkStory, popupInfo, rm, selectItem, shell$ } from './shell'


beforeEach(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})


test('Create, info & delete flux application', (done) => {

    let storyName = 'my story'
    shell$().pipe(
        mkStory(storyName),
        expectSnapshot(
            {
                items: (items) => {
                    expect(items.length).toEqual(1)
                    let fluxNode = items[0] as StoryNode
                    expect(fluxNode.kind).toEqual('story')
                    expect(fluxNode.name).toEqual(storyName)
                }
            }
        ),
        selectItem(storyName),
        popupInfo(),
        expectSnapshot(
            {
                assetCardView: (assetCardView) => {
                    expect(assetCardView).toBeTruthy()
                    expect(assetCardView.withTabs.Permissions).toBeTruthy()
                    expect(assetCardView.asset.kind).toEqual('story')
                    expect(assetCardView.asset.name).toEqual(storyName)
                }
            }
        ),
        rm(storyName),
        expectSnapshot(
            {
                items: (items) => {
                    expect(items.length).toEqual(0)
                }
            }
        ),
    ).subscribe(() => {
        done()
    })
})
