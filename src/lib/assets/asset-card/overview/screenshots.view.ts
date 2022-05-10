import { child$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, ReplaySubject } from 'rxjs'
import { AssetWithPermissions } from '../models'

export class ImagesCarouselView implements VirtualDOM {
    static ClassSelector = 'images-carousel-view'
    public class: string
    public readonly style: Record<string, string>

    public readonly children: VirtualDOM[]
    public readonly selectedSnippet$ = new BehaviorSubject(0)
    public readonly imagesURL: string[]
    public readonly imageView: (url) => VirtualDOM

    constructor(parameters: {
        imagesURL: string[]
        legend?: string
        onDelete?: (index: number) => void
        imageView: (url) => VirtualDOM
        class?
        style?
    }) {
        Object.assign(this, parameters)
        this.class = `${ImagesCarouselView.ClassSelector} ${this.class}`
        const legendView = {
            style: {
                fontStyle: 'italic',
            },
            class: 'mt-2',
            innerText: parameters.legend || '',
        }

        if (this.imagesURL.length == 0) {
            this.children = [legendView]
            return
        }
        this.children = [
            {
                class: 'd-flex align-items-center w-100 h-100',
                children: [
                    child$(this.selectedSnippet$, (index) =>
                        this.handleView(index, 'fa-chevron-left ml-auto', -1),
                    ),
                    child$(this.selectedSnippet$, (index) => ({
                        class: 'd-flex position-relative',
                        children: [
                            this.imageView(this.imagesURL[index]),
                            parameters.onDelete
                                ? {
                                      style: {
                                          left: '100%',
                                      },
                                      class: 'fas fa-times fv-hover-xx-lighter fv-text-error position-absolute fv-pointer',
                                      onclick: () => parameters.onDelete(index),
                                  }
                                : {},
                        ],
                    })),
                    child$(this.selectedSnippet$, (index) =>
                        this.handleView(index, 'fa-chevron-right mr-auto', 1),
                    ),
                ],
            },
            legendView,
        ]
    }

    handleView(index, icon, increment) {
        return (increment == -1 && index > 0) ||
            (increment == 1 && index < this.imagesURL.length - 1)
            ? {
                  style: { width: '50px' },
                  class: `fas ${icon} my-auto fa-2x fv-pointer fv-text-primary fv-hover-text-focus handle-${
                      increment > 0 ? 'next' : 'previous'
                  }`,
                  onclick: () =>
                      this.selectedSnippet$.next(
                          this.selectedSnippet$.getValue() + increment,
                      ),
              }
            : {
                  style: { width: '50px' },
                  class:
                      increment > 0
                          ? 'handle-right-none mr-auto'
                          : 'handle-left-none ml-auto',
              }
    }
}

export class AssetScreenShotsView implements VirtualDOM {
    static ClassSelector = 'asset-screenshots-view'

    public readonly class = `${AssetScreenShotsView.ClassSelector} w-100 my-3`
    public readonly asset: AssetWithPermissions
    public readonly children: VirtualDOM[]
    public readonly images$: BehaviorSubject<string[]>
    public readonly forceReadonly: boolean

    public readonly fileUploaded$ = new ReplaySubject<{
        file: File
        src: string
    }>(1)
    public readonly fileRemoved$ = new ReplaySubject<{ imageId: string }>(1)

    disconnectedCallback: () => void

    constructor(params: {
        images$: BehaviorSubject<string[]>
        asset: AssetWithPermissions
        forceReadonly?: boolean
    }) {
        Object.assign(this, params)
        const pasteCb = (pasteEvent) => {
            this.addImageFromClipboard(pasteEvent)
        }

        if (this.asset.permissions.write && !this.forceReadonly) {
            window.addEventListener('paste', pasteCb, false)
        }

        this.disconnectedCallback = () => {
            window.removeEventListener('paste', pasteCb, false)
        }
        const editable = this.asset.permissions.write && !this.forceReadonly

        const imageView = (url) => {
            return {
                class: 'px-2',
                tag: 'img',
                style: {
                    height: '25vh',
                    width: '25vw',
                },
                src: url,
            }
        }

        this.children = [
            child$(this.images$, (images) =>
                images.length == 0
                    ? {
                          style: {
                              fontStyle: 'italic',
                          },
                          innerText: 'No screenshot has been provided yet.',
                      }
                    : {},
            ),
            child$(
                this.images$,
                (images) =>
                    new ImagesCarouselView({
                        imagesURL: images,
                        class: 'd-flex flex-column align-items-center mx-auto',
                        imageView,
                        legend: editable
                            ? 'Paste from clipboard to add images'
                            : '',
                        onDelete:
                            this.asset.permissions.write && !this.forceReadonly
                                ? (index) => {
                                      const imageId = this.images$
                                          .getValue()
                                          [index].split('/')
                                          .slice(-1)[0]
                                      this.fileRemoved$.next({ imageId })
                                      const nextImages = this.images$
                                          .getValue()
                                          .filter((_, i) => i != index)
                                      this.images$.next(nextImages)
                                  }
                                : undefined,
                    }),
            ),
        ]
    }

    validImageFile(file: File) {
        return [
            'image/apng',
            'image/bmp',
            'image/gif',
            'image/jpeg',
            'image/pjpeg',
            'image/png',
            'image/svg+xml',
            'image/tiff',
            'image/webp',
            'image/x-icon',
        ].includes(file.type)
    }

    addImageFromClipboard(pasteEvent) {
        const files = pasteEvent.clipboardData.files
        if (
            files.length == 1 &&
            files[0].type.indexOf('image') === 0 &&
            this.validImageFile(files[0])
        ) {
            const file = files[0]
            const url = URL.createObjectURL(file)
            this.fileUploaded$.next({ file, src: url })
            this.images$.next([...this.images$.getValue(), url])
        }
    }
}
