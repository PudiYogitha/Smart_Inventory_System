import { useParams } from "react-router-dom";
import ProductForm from "../components/ProductForm.jsx";

export default function EditProduct() {
  const { id } = useParams();
  return <ProductForm productId={id} />;
}
