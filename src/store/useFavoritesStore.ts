import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lecture } from '@/types/lecture';

interface FavoritesState {
    favorites: Lecture[];
    addFavorite: (lecture: Lecture) => void;
    removeFavorite: (lectureId: string) => void;
    isFavorite: (lectureId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favorites: [],
            addFavorite: (lecture) =>
                set((state) => {
                    if (!state.favorites.some((fav) => fav.id === lecture.id)) {
                        return { favorites: [...state.favorites, lecture] };
                    }
                    return state;
                }),
            removeFavorite: (lectureId) =>
                set((state) => ({
                    favorites: state.favorites.filter((fav) => String(fav.id) !== String(lectureId)),
                })),
            isFavorite: (lectureId) => get().favorites.some((fav) => String(fav.id) === String(lectureId)),
        }),
        {
            name: 'local-leaning-favorites', // name of the item in the storage (must be unique)
        }
    )
);
