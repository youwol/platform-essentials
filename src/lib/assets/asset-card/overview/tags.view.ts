import {
    attr$,
    child$,
    children$,
    HTMLElement$,
    VirtualDOM,
} from '@youwol/flux-view'
import { BehaviorSubject, Observable, of } from 'rxjs'
import { skip } from 'rxjs/operators'
import { IconButtonView, TextEditableView } from '../misc.view'
import { AssetWithPermissions } from '../models'

export class AssetTagsView implements VirtualDOM {
    static ClassSelector = 'asset-tags-view'

    public readonly class = `${AssetTagsView.ClassSelector} w-100 d-flex justify-content-center`
    public readonly asset: AssetWithPermissions
    public readonly children: VirtualDOM[]
    public readonly tags$: BehaviorSubject<string[]>
    public readonly forceReadonly: boolean
    constructor(params: {
        tags$: BehaviorSubject<string[]>
        asset: AssetWithPermissions
        forceReadonly?: boolean
    }) {
        Object.assign(this, params)
        this.children = [
            child$(this.tags$, (tags) =>
                tags.length == 0
                    ? {
                          style: {
                              fontStyle: 'italic',
                          },
                          innerText: 'No tag has been provided yet.',
                      }
                    : {},
            ),
            this.asset.permissions.write && !this.forceReadonly
                ? new TagsEditableView({ tags$: this.tags$ })
                : AssetTagsView.readOnlyView(this.tags$),
        ]
    }

    static readOnlyView(tags$: BehaviorSubject<string[]>) {
        return {
            class: 'd-flex flex-wrap align-items-center',
            children: children$(tags$, (tags) =>
                tags.map((tag) => AssetTagsView.tagView(of(tag))),
            ),
        }
    }

    static tagView(tag$: Observable<string>) {
        return {
            class: 'border rounded p-2 mx-2',
            innerText: attr$(tag$, (tag) => tag),
        }
    }
}

class TagsEditableView implements VirtualDOM {
    static ClassSelector = 'tags-editable-view'
    public readonly class = `${TagsEditableView.ClassSelector}`
    public readonly children: VirtualDOM[]

    public readonly tags$: BehaviorSubject<string[]>

    constructor(params: { tags$: BehaviorSubject<string[]> }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center  flex-wrap',
                children: children$(this.tags$, (tags) => {
                    return [
                        ...tags.map(
                            (tag, i) =>
                                new EditableTagView({
                                    tags$: this.tags$,
                                    index: i,
                                }),
                        ),
                        new IconButtonView({
                            onclick: () =>
                                this.tags$.next([
                                    ...this.tags$.getValue(),
                                    'new tag',
                                ]),
                            icon: 'fa-user-tag',
                            withClasses: 'p-1',
                        }),
                    ]
                }),
            },
        ]
    }
}

class EditableTagView implements VirtualDOM {
    public readonly class = 'd-flex align-items-center'
    public readonly style = {
        fontWeight: 'bolder',
    }
    public readonly tag: string
    public readonly children: VirtualDOM[]

    public readonly tags$: BehaviorSubject<string[]>
    public readonly index: number

    connectedCallback: (elem: HTMLElement$ & HTMLDivElement) => void

    constructor(params: { index: number; tags$: BehaviorSubject<string[]> }) {
        Object.assign(this, params)
        const text$ = new BehaviorSubject(this.tags$.getValue()[this.index])

        this.children = [
            child$(this.tags$, () => ({
                class: 'd-flex align-items-center m-2',
                children: [
                    new TextEditableView({
                        text$,
                        regularView: (innerText$) => ({
                            innerText: attr$(innerText$, (t) => t),
                        }),
                        class: 'border rounded p-1 d-flex align-items-center',
                    }),
                    {
                        tag: 'i',
                        style: { height: 'fit-content' },
                        class: 'fas fa-times mx-1 fv-text-error fv-pointer fv-hover-xx-lighter',
                        onclick: () => {
                            const newTags = this.tags$
                                .getValue()
                                .filter((_, i) => i != this.index)
                            this.tags$.next(newTags)
                        },
                    },
                ],
            })),
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                text$.pipe(skip(1)).subscribe((text) => {
                    const newTags = this.tags$.getValue()
                    newTags[this.index] = text
                    this.tags$.next(newTags)
                }),
            )
        }
    }
}
