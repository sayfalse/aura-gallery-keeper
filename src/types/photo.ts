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
  description?: string;
  coverPhotoUrl?: string;
  photoCount: number;
  createdAt: Date;
}

export type ViewMode = "grid" | "list";
export type SidebarSection = "photos" | "favorites" | "albums" | "recent" | "trash";
