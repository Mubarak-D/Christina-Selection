import { PieceForm } from "@/components/PieceForm";
import { savePieceAndOpen } from "../actions";

export default function NewPiecePage() {
  return (
    <>
      <h1 className="mb-4 text-2xl">New piece</h1>
      <p className="mb-4 text-sm opacity-70">Save the details first, then add photos and videos.</p>
      <PieceForm action={savePieceAndOpen} />
    </>
  );
}
