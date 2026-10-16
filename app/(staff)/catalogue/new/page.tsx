import { NewPieceForm } from "@/components/NewPieceForm";
import { savePiece } from "../actions";

export default function NewPiecePage() {
  return (
    <>
      <h1 className="mb-4 text-2xl">New piece</h1>
      <NewPieceForm save={savePiece} destination="/catalogue/:id" />
    </>
  );
}
