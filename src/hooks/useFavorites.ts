import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'erp-favorites';

export interface FavoritePage {
  url: string;
  title: string;
  icon: string;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoritePage[]>(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((page: FavoritePage) => {
    setFavorites(prev => {
      if (prev.some(f => f.url === page.url)) return prev;
      return [...prev, page];
    });
  }, []);

  const removeFavorite = useCallback((url: string) => {
    setFavorites(prev => prev.filter(f => f.url !== url));
  }, []);

  const isFavorite = useCallback((url: string) => {
    return favorites.some(f => f.url === url);
  }, [favorites]);

  const toggleFavorite = useCallback((page: FavoritePage) => {
    if (isFavorite(page.url)) {
      removeFavorite(page.url);
    } else {
      addFavorite(page);
    }
  }, [isFavorite, removeFavorite, addFavorite]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
};
