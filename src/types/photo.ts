export interface Photo {
  id: string;
  src: string;
  name: string;
  date: Date;
  size: string;
  favorite: boolean;
  album?: string;
  storagePath?: string;
}

export interface Album {
  id: string;
  name: string;
  coverPhoto?: string;
  photoCount: number;
}

export type ViewMode = "grid" | "list";
export type SidebarSection = "photos" | "favorites" | "albums" | "recent" | "trash";
