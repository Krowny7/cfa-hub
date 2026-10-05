import { metaDunJour, pageDunJour } from "@/components/defi/pages";

type PageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ revue?: string | string[] }>;
};

export async function generateMetadata(props: PageProps) {
  return metaDunJour("trente", props);
}

// Un jour des 30 du jour : ma copie et le classement (figé une fois le jour
// passé) ; ?revue=1 (ou ?revue=tout) : la revue de ma copie (components/defi/pages).
export default async function DefiDayPage(props: PageProps) {
  return pageDunJour("trente", props);
}
