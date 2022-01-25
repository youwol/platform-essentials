import '../mock-requests'
import {
    CdnSessionsStorageClient, HealthzResponse
} from '../../lib/clients/cdn-sessions-storage'

import { Json } from '../..'
import { getPyYouwolBasePath, resetPyYouwolDbs } from '../common'


let storage = new CdnSessionsStorageClient({
    basePath: `${getPyYouwolBasePath()}/api/cdn-sessions-storage`,
    headers: { 'py-youwol-local-only': true }
})


beforeAll(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})

let testData = {
    content: 'some content'
}

test('query healthz', (done) => {

    storage.getHealthz().subscribe((resp: HealthzResponse) => {
        expect(resp.status).toEqual('cdn-sessions-storage ok')
        done()
    })
})

test('get data', (done) => {

    storage.applications.getData(
        "@youwol/platform-essentials",
        "integration-tests"
    ).subscribe((resp: Json) => {
        expect(resp).toEqual({})
        done()
    })
})

test('post data', (done) => {

    storage.applications.postData(
        "@youwol/platform-essentials",
        "integration-tests",
        testData
    ).subscribe((resp: {}) => {
        expect(resp).toEqual({})
        done()
    })
})

test('get data', (done) => {

    storage.applications.getData(
        "@youwol/platform-essentials",
        "integration-tests"
    ).subscribe((resp: Json) => {
        expect(resp).toEqual(testData)
        done()
    })
})


