import { Suspense } from "react";
import { NewConceptHome } from "@/components/new-concept-home";
import { NEW_CONCEPT_BOOK } from "@/lib/new-concept";

export const revalidate = 60;

export default function NewConceptPage() {
  return (
    <Suspense fallback={null}>
      <NewConceptHome book={NEW_CONCEPT_BOOK} />
    </Suspense>
  );
}
