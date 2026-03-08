import sample1 from "@/assets/sample-1.jpg";
import sample2 from "@/assets/sample-2.jpg";
import sample3 from "@/assets/sample-3.jpg";
import sample4 from "@/assets/sample-4.jpg";
import sample5 from "@/assets/sample-5.jpg";
import sample6 from "@/assets/sample-6.jpg";
import type { Photo } from "@/types/photo";

export const samplePhotos: Photo[] = [
  { id: "1", src: sample1, name: "Mountain Lake Sunrise", date: new Date("2026-03-01"), size: "4.2 MB", favorite: true, album: "Nature" },
  { id: "2", src: sample2, name: "Coffee Shop Morning", date: new Date("2026-02-28"), size: "2.8 MB", favorite: false, album: "Lifestyle" },
  { id: "3", src: sample3, name: "Tropical Beach Aerial", date: new Date("2026-02-25"), size: "5.1 MB", favorite: true, album: "Travel" },
  { id: "4", src: sample4, name: "City Nights", date: new Date("2026-02-20"), size: "3.7 MB", favorite: false, album: "Urban" },
  { id: "5", src: sample5, name: "Autumn Leaves", date: new Date("2026-02-15"), size: "3.2 MB", favorite: true, album: "Nature" },
  { id: "6", src: sample6, name: "Gourmet Dinner", date: new Date("2026-02-10"), size: "2.5 MB", favorite: false, album: "Food" },
];
