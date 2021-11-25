import { attr$, child$, HTMLElement$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject, from, merge, Observable } from "rxjs";

import { IconButtonView } from "../misc.view";
import { filter, mapTo, mergeMap } from "rxjs/operators";
import { install } from "@youwol/cdn-client";
import { Asset } from "../../..";

export class AssetDescriptionView implements VirtualDOM {

    static ClassSelector = "asset-description-view"

    public readonly class = `${AssetDescriptionView.ClassSelector} w-100`
    public readonly asset: Asset
    public readonly children: VirtualDOM[]
    public readonly description$: BehaviorSubject<string>
    public readonly forceReadonly: boolean

    constructor(params: {
        description$: BehaviorSubject<string>,
        asset: Asset,
        forceReadonly?: boolean
    }) {

        Object.assign(this, params)
        this.children = [
            child$(this.description$,
                (description: string) => description.trim() == ""
                    ? {
                        style: {
                            fontStyle: 'italic'
                        },
                        innerText: "No description has been provided yet."
                    }
                    : {}),
            this.asset.permissions.write && !this.forceReadonly
                ? new DescriptionEditableView({ description$: this.description$ })
                : AssetDescriptionView.readOnlyView(this.description$)
        ]
    }

    static readOnlyView(description$: BehaviorSubject<string>) {
        return {
            tag: 'div',
            class: 'fv-text-primary',
            innerHTML: attr$(description$, d => d)
        }
    }
}

function fetchCodeMirror$(): Observable<any> {

    return from(
        install({
            modules: ['codemirror'],
            scripts: [
                "codemirror#5.52.0~mode/htmlmixed.min.js",
                "codemirror#5.52.0~mode/xml.min.js"
            ],
            css: [
                "codemirror#5.52.0~codemirror.min.css",
                "codemirror#5.52.0~theme/blackboard.min.css"
            ]
        })
    )
}

class DescriptionEditableView implements VirtualDOM {

    static ClassSelector = "description-editable-view"
    public readonly class = `${DescriptionEditableView.ClassSelector} `
    public readonly children: VirtualDOM[]
    public readonly editionMode$ = new BehaviorSubject(false)

    public readonly description$: BehaviorSubject<string>

    public readonly configurationCodeMirror = {
        value: "",
        mode: 'htmlmixed',
        lineNumbers: false,
        theme: 'blackboard',
        lineWrapping: true,
        indentUnit: 4
    }
    editor: any

    constructor(params: { description$: BehaviorSubject<string> }) {

        Object.assign(this, params)

        this.children = [
            child$(
                this.editionMode$.pipe(
                    mergeMap((editionMode) => fetchCodeMirror$().pipe(mapTo(editionMode)))
                ),
                (editionMode) => {
                    return editionMode ? {
                        class: 'h-100 w-100',
                        connectedCallback: (elem: HTMLDivElement & HTMLElement$) => {
                            let config = {
                                ...this.configurationCodeMirror,
                                value: this.description$.getValue()
                            }
                            this.editor = window['CodeMirror'](elem, config)
                        }
                    } : AssetDescriptionView.readOnlyView(this.description$)
                }
            ),
            child$(
                this.editionMode$,
                (edition) => edition
                    ? new IconButtonView({
                        onclick: () => {
                            this.editionMode$.next(false)
                            this.description$.next(this.editor.getValue())
                        },
                        icon: 'fa-check'
                    })
                    : new IconButtonView({
                        onclick: () => this.editionMode$.next(true),
                        icon: 'fa-edit'
                    })
            ),
        ]
    }
}

