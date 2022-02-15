// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import '../allow-remote'
import { PyYouwol } from '@youwol/http-clients'
import {
    createRemoteFolder$,
    expectAttributes,
    resetPyYouwolDbs$,
} from '../common'

import { mapTo, mergeMap } from 'rxjs/operators'
import {
    cd,
    cut,
    expectSnapshot,
    mkStory,
    paste,
    shell$,
    uploadAsset,
} from './shell'
import { forkJoin } from 'rxjs'
import { RequestsExecutor } from '../../lib/explorer/requests-executor'

beforeEach(async (done) => {
    jest.setTimeout(90 * 1000)

    const youwolClient = new PyYouwol.PyYouwolClient()
    resetPyYouwolDbs$()
        .pipe(
            mergeMap((defaultDrive) => {
                return youwolClient.admin.customCommands
                    .doDelete$('purge-downloads')
                    .pipe(mapTo(defaultDrive))
            }),
            mergeMap((defaultDrive) => {
                return forkJoin([
                    createRemoteFolder$(
                        youwolClient,
                        defaultDrive.downloadFolderId,
                        'platform-essentials_remote-folder0',
                    ),
                    createRemoteFolder$(
                        youwolClient,
                        defaultDrive.downloadFolderId,
                        'platform-essentials_remote-folder1',
                    ),
                ])
            }),
        )
        .subscribe(() => {
            done()
        })
})

test('create asset (story)', (done) => {
    const folderName = 'platform-essentials_remote-folder0'
    const storyName = 'test-story'
    shell$()
        .pipe(
            cd('..'),
            cd('Download'),
            expectSnapshot({
                items: (items) => {
                    const item = items.find((it) => it.name == folderName)
                    expect(item.id).toBe(folderName)
                    expect(item).toBeTruthy()
                },
            }),
            cd(folderName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
            mkStory(storyName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    expectAttributes(items[0], [
                        'treeId',
                        'assetId',
                        'rawId',
                        'name',
                    ])
                    expect(items[0].name).toBe(storyName)
                },
            }),
            uploadAsset(storyName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    expectAttributes(items[0], [
                        'treeId',
                        'assetId',
                        'rawId',
                        'name',
                    ])
                    expect(items[0].origin).toEqual({
                        remote: true,
                        local: true,
                    })
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})

test('move asset (story)', (done) => {
    const folderName = 'platform-essentials_remote-folder1'
    const storyName = 'test-story'
    RequestsExecutor.error$.subscribe((e) => {
        throw e
    })

    shell$()
        .pipe(
            cd('..'),
            cd('Download'),
            mkStory(storyName),
            expectSnapshot({
                items: (items) => {
                    const item = items.find((it) => it.name == storyName)
                    expect(item).toBeTruthy()
                    const folder = items.find((it) => it.name == folderName)
                    expect(folder.id).toBe(folderName)
                },
            }),
            cut(storyName),
            cd(folderName),
            paste(),
        )
        .subscribe(() => {
            done()
        })
})
