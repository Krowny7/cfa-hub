import { metaDunJour, pageDunJour } from "@/components/defi/pages";

type PageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ revue?: string | string[] }>;
};

export async function generateMetadata(props: PageProps) {
  return metaDunJour("cinq", props);
}

// Un jour des 5 du jour : ma copie, sa revue, le classement figé.
export default async function CinqDayPage(props: PageProps) {
  return pageDunJour("cinq", props);
}
