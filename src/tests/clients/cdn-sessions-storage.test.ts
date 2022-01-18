import '../mock-requests'
import {
    CdnSessionsStorageClient, HealthzResponse
} from '../../lib/clients/cdn-sessions-storage'
import { mergeMap, tap } from 'rxjs/operators'
import { Json } from '../..'
import { send$ } from '../../lib/clients/utils'


let pyYouwolBasePath = "http://localhost:2001"

CdnSessionsStorageClient.staticBasePath = `${pyYouwolBasePath}/api/cdn-sessions-storage`

let storage = new CdnSessionsStorageClient()


beforeAll(async (done) => {

    fetch(new Request(
        `${pyYouwolBasePath}/admin/custom-commands/reset-db`
    )).then(() => {
        done()
    })
})

function expectAttributes(resp, attributes: Array<string | [string, any]>) {

    attributes.forEach((att) => {
        if (Array.isArray(att))
            expect(resp[att[0]]).toEqual(att[1])
        else
            expect(resp[att]).toBeTruthy()
    })
}

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

