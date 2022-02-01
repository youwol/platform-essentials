const http = require('http')
const request = require('request')

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type Json = any

class MockRequest {
    constructor(
        public readonly url,
        public readonly options: {
            method: RequestMethod
            body: string
            headers: any
        } = { method: 'GET', body: '', headers: {} },
    ) {}
}

class RawResponse {
    constructor(public readonly body) {}

    json(): Promise<Json> {
        return Promise.resolve(
            typeof this.body == 'string' ? JSON.parse(this.body) : this.body,
        )
    }

    text(): Promise<string> {
        return undefined
    }

    blob(): Promise<Blob> {
        return undefined
    }
}

function mockFetch(req: MockRequest): Promise<any> {
    return new Promise((resolve, _reject) => {
        switch (req.options.method) {
            case 'GET': {
                request.get(
                    {
                        url: req.url,
                        headers: req.options.headers || {},
                    },
                    (err, response, body) => {
                        resolve(new RawResponse(body))
                    },
                )
                break
            }
            case 'POST': {
                request(
                    {
                        url: req.url,
                        method: req.options.method,
                        body: JSON.parse(req.options.body),
                        json: true,
                        headers: req.options.headers || {},
                    },
                    (err, response, body) => {
                        resolve(new RawResponse(body))
                    },
                )
                break
            }
            case 'PUT': {
                request(
                    {
                        url: req.url,
                        method: req.options.method,
                        body: req.options.body
                            ? JSON.parse(req.options.body)
                            : {},
                        json: true,
                        headers: req.options.headers || {},
                    },
                    (err, response, body) => {
                        resolve(new RawResponse(body))
                    },
                )
                break
            }
            case 'DELETE': {
                request(
                    {
                        url: req.url,
                        method: req.options.method,
                        json: true,
                        headers: req.options.headers || {},
                    },
                    (err, response, body) => {
                        resolve(new RawResponse(body))
                    },
                )
                break
            }
        }
    })
}

(window as any)['Request'] = MockRequest

;(window as any)['fetch'] = mockFetch

;(window as any)['@youwol/cdn-client'] = {}
