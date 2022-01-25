import { Json } from ".."

const http = require('http')
const request = require('request')

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'POST' | 'DELETE'

class MockRequest {

    constructor(
        public readonly url,
        public readonly options: {
            method: RequestMethod,
            body: string,
            headers: any
        } = { method: 'GET', body: '', headers: {} }) {

    }
}

class RawResponse {

    constructor(public readonly body) { }

    json(): Promise<Json> {
        return Promise.resolve(typeof (this.body) == 'string' ? JSON.parse(this.body) : this.body)
    }

    text(): Promise<string> {
        return undefined
    }

    blob(): Promise<Blob> {
        return undefined
    }
}

function mockFetch(req: MockRequest): Promise<any> {

    const promise = new Promise((resolve, reject) => {

        switch (req.options.method) {

            case 'GET': {
                request.get({
                    url: req.url,
                    headers: req.options.headers || {}
                }, (err, response, body) => {
                    resolve(new RawResponse(body))
                })
                break
            }
            case 'POST': {
                request({
                    url: req.url,
                    method: req.options.method,
                    body: JSON.parse(req.options.body),
                    json: true,
                    headers: req.options.headers || {}
                }, (err, response, body) => {
                    resolve(new RawResponse(body))
                })
                break
            }
            case 'PUT': {
                request({
                    url: req.url,
                    method: req.options.method,
                    body: req.options.body ? JSON.parse(req.options.body) : {},
                    json: true,
                    headers: req.options.headers || {}
                }, (err, response, body) => {
                    resolve(new RawResponse(body))
                })
                break
            }
            case 'DELETE': {
                request({
                    url: req.url,
                    method: req.options.method,
                    json: true,
                    headers: req.options.headers || {}
                }, (err, response, body) => {
                    resolve(new RawResponse(body))
                })
                break
            }
        }
    });
    return promise
}

(window as any)["Request"] = MockRequest;

(window as any)["fetch"] = mockFetch;

(window as any)["@youwol/cdn-client"] = {};


/*
            http.get(req.url, res => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    try {
                        resolve(new RawResponse(body))
                    } catch (error) {
                        console.error(error.message);
                    };
                });
            })
            */
/*
            let postData = req.options.body
            let postOptions = {
                host: 'http://localhost',
                port: '2000',
                path: `/${req.url.split('2000/')[1]}`,
                method: 'PUT',
                headers: {
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            http.request(req.url, postOptions, res => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    try {
                        resolve(new RawResponse(body))
                    } catch (error) {
                        console.error(error.message);
                    };
                });
            })*/
