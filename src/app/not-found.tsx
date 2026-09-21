import { EmptyState } from "@/components/ui/EmptyState";
export default function NotFound() {
  return <div className="posto-page"><h1 className="posto-title mb-6">Page introuvable</h1><EmptyState title="Cette adresse n’est plus disponible" description="Le lien a peut-être changé ou ce contenu a été retiré. D’autres sorties vous attendent." href="/" action="Découvrir Posto" /></div>;
}
