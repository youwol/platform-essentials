import {
    combineLatest,
    forkJoin,
    Observable,
    of,
    ReplaySubject,
    Subject,
} from 'rxjs'
import { RequestsExecutor } from './requests-executot'
import { map, mergeMap, shareReplay, take, tap } from 'rxjs/operators'
import {
    AssetsGateway,
    raiseHTTPErrors,
    TreedbBackend,
} from '@youwol/http-clients'

export interface Favorite {
    id: string
}
export interface FavoriteGroup extends Favorite {}
export interface FavoriteFolder extends Favorite {}
export interface FavoriteDesktopItem extends Favorite {
    type: string
}

type Target = 'groups$' | 'folders$' | 'desktopItems$'
type TargetBody = 'favoriteGroups' | 'favoriteFolders' | 'favoriteDesktopItems'

export interface GetGroupResponse {
    id: string
    path: string
}
type GetFolderResponse = TreedbBackend.GetFolderResponse
type GetEntityResponse = TreedbBackend.GetEntityResponse

export class Favorites {
    static initialFavorites$: Observable<{
        favoriteGroups: FavoriteGroup[]
        favoriteDesktopItems: FavoriteDesktopItem[]
        favoriteFolders: FavoriteFolder[]
    }>

    static toBodyName: Record<Target, TargetBody> = {
        groups$: 'favoriteGroups',
        folders$: 'favoriteFolders',
        desktopItems$: 'favoriteDesktopItems',
    }
    static folders$: ReplaySubject<GetFolderResponse[]>
    static groups$: ReplaySubject<GetGroupResponse[]>
    static desktopItems$: ReplaySubject<GetEntityResponse[]>

    static latest: {
        folders$: FavoriteFolder[]
        groups$: FavoriteGroup[]
        desktopItems$: FavoriteDesktopItem[]
    } = { folders$: undefined, groups$: undefined, desktopItems$: undefined }

    static getFolders$() {
        return Favorites._get$<GetFolderResponse>('folders$')
    }
    static getGroups$() {
        return Favorites._get$<GetGroupResponse>('groups$')
    }
    static getDesktopItems$() {
        return Favorites._get$<GetEntityResponse>('desktopItems$')
    }

    static _get$<T>(target: Target): ReplaySubject<T[]> {
        if (Favorites[target]) {
            return Favorites[target] as unknown as ReplaySubject<T[]>
        }
        if (!Favorites.initialFavorites$) {
            Favorites.initialFavorites$ = RequestsExecutor.getFavorites().pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                tap(
                    ({
                        favoriteGroups,
                        favoriteDesktopItems,
                        favoriteFolders,
                    }) => {
                        this.latest.desktopItems$ = favoriteDesktopItems
                        this.latest.folders$ = favoriteFolders
                        this.latest.groups$ = favoriteGroups
                    },
                ),
            )
        }
        Favorites[target as string] = new ReplaySubject(1)
        Favorites[target as string].subscribe((items) => {
            Favorites.latest[target] = items.map((i) => ({
                id: getId(target, i),
            }))
        })
        Favorites.initialFavorites$
            .pipe(
                map((resp) => resp[Favorites.toBodyName[target]]),
                mergeMap((items: unknown[]) => {
                    if (items.length == 0) {
                        return of([])
                    }
                    return forkJoin(
                        items.map((item: Favorite) =>
                            getFavoriteResponse$(target, item.id),
                        ),
                    )
                }),
            )
            .subscribe((favorites) => {
                Favorites[target].next(favorites)
            })
        return Favorites[target] as unknown as ReplaySubject<T[]>
    }

    static refresh(modifiedId: string) {
        function updateIfNeeded<TResp>(
            target: Target,
            elements: TResp[],
            getFunction$: () => Subject<TResp[]>,
        ) {
            if (!elements.find((g) => getId(target, g) == modifiedId)) {
                return
            }
            getFavoriteResponse$<TResp>(target, modifiedId).subscribe(
                (group) => {
                    const filtered = elements.filter(
                        (f) => getId(target, f) != modifiedId,
                    )
                    getFunction$().next(filtered.concat(group))
                },
            )
        }
        combineLatest([
            Favorites.getGroups$(),
            Favorites.getFolders$(),
            Favorites.getDesktopItems$(),
        ])
            .pipe(take(1))
            .subscribe(([groups, folders, items]) => {
                updateIfNeeded<GetGroupResponse>(
                    'groups$',
                    groups,
                    Favorites.getGroups$,
                )
                updateIfNeeded<GetFolderResponse>(
                    'folders$',
                    folders,
                    Favorites.getFolders$,
                )
                updateIfNeeded<GetEntityResponse>(
                    'desktopItems$',
                    items,
                    Favorites.getDesktopItems$,
                )
            })
    }

    static remove(deletedId: string) {
        combineLatest([
            Favorites.getGroups$(),
            Favorites.getFolders$(),
            Favorites.getDesktopItems$(),
        ])
            .pipe(take(1))
            .subscribe(([groups, folders, items]) => {
                if (groups.find((g) => g.id == deletedId)) {
                    this.toggleFavoriteGroup(deletedId)
                }
                if (folders.find((f) => getId('folders$', f) == deletedId)) {
                    this.toggleFavoriteFolder(deletedId)
                }
                if (items.find((i) => getId('desktopItems$', i) == deletedId)) {
                    this.toggleFavoriteDesktopItem(deletedId)
                }
            })
    }

    static toggleFavoriteFolder(folderId: string) {
        Favorites.toggleFavorites('folders$', { id: folderId })
    }

    static toggleFavoriteGroup(id: string) {
        Favorites.toggleFavorites('groups$', { id })
    }

    static toggleFavoriteDesktopItem(treeId: string) {
        Favorites.toggleFavorites('desktopItems$', { id: treeId })
    }

    static toggleFavorites(target: Target, newElement: Favorite) {
        let actualFavorites = []
        let others = {}
        combineLatest([
            Favorites.getGroups$(),
            Favorites.getFolders$(),
            Favorites.getDesktopItems$(),
        ])
            .pipe(take(1))
            .subscribe(([favoriteGroups, favoriteFolders, favoriteItems]) => {
                if (target == 'groups$') {
                    actualFavorites = favoriteGroups
                    others = {
                        favoriteItems: favoriteItems.map((i) => ({
                            id: getId('desktopItems$', i),
                        })),
                        favoriteFolders: favoriteFolders.map((i) => ({
                            id: getId('folders$', i),
                        })),
                    }
                }
                if (target == 'folders$') {
                    actualFavorites = favoriteFolders
                    others = {
                        favoriteItems: favoriteItems.map((i) => ({
                            id: getId('desktopItems$', i),
                        })),
                        favoriteGroups: favoriteGroups.map((i) => ({
                            id: getId('groups$', i),
                        })),
                    }
                }
                if (target == 'desktopItems$') {
                    actualFavorites = favoriteItems
                    others = {
                        favoriteFolders: favoriteFolders.map((i) => ({
                            id: getId('folders$', i),
                        })),
                        favoriteGroups: favoriteGroups.map((i) => ({
                            id: getId('groups$', i),
                        })),
                    }
                }
                const filtered = actualFavorites.filter(
                    (item) => getId(target, item) != newElement.id,
                )
                if (filtered.length != actualFavorites.length) {
                    const items = filtered
                    RequestsExecutor.saveFavorites({
                        ...others,
                        [Favorites.toBodyName[target]]: items.map((item) => ({
                            id: getId(target, item),
                        })),
                    } as any).subscribe()
                    Favorites[target].next(items)
                    return
                }
                getFavoriteResponse$(target, newElement.id).subscribe(
                    (resp) => {
                        const items = [...actualFavorites, resp]
                        RequestsExecutor.saveFavorites({
                            ...others,
                            [Favorites.toBodyName[target]]: items.map(
                                (item) => ({
                                    id: getId(target, item),
                                }),
                            ),
                        } as any).subscribe()
                        Favorites[target].next(items)
                    },
                )
            })
    }
}

function getFavoriteResponse$<T>(target: Target, id: string): Observable<T> {
    const client = new AssetsGateway.Client().treedb
    switch (target) {
        case 'desktopItems$':
            return client
                .getEntity$({ entityId: id })
                .pipe(raiseHTTPErrors()) as Observable<T>
        case 'folders$':
            return client
                .getFolder$({ folderId: id })
                .pipe(raiseHTTPErrors()) as Observable<T>
        case 'groups$':
            return of({ id, path: atob(id) } as unknown) as Observable<T>
    }
    return of(undefined)
}

function getId(target: Target, item: any) {
    if (target == 'desktopItems$') {
        return item.entity.itemId || this.entity.folderId
    }
    if (target == 'folders$') {
        return item.folderId
    }
    if (target == 'groups$') {
        return item.id
    }
}
